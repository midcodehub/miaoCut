-- =============================================================================
-- MiaoCut Pro —— 上线前加固迁移（2026-10-11）
-- -----------------------------------------------------------------------------
-- ⚠️ 执行顺序（重要）：先在 Supabase SQL Editor 执行本文件，再部署新版 pro-gateway Worker。
--    新版 Worker 会调用本文件新增的参数 / 函数 / 列；如果先部署 Worker，
--    充值回调和新用户注册会因为找不到函数 / 列而报错。
--
-- 本文件可重复执行（幂等）：全部使用 if not exists / create or replace / drop if exists。
--
-- 内容：
--   1. 【安全】数据库函数只允许服务端（service_role）调用
--   2. 【修 bug】注册积分只发给已验证邮箱（旧版钱包无论是否验证都会写入 100）
--   3. 【防薅】同一邮箱的别名（a+1@gmail.com、a.b@gmail.com）只发一次注册积分
--   4. 【退款】Stripe 退款 / 争议（拒付）时扣回对应积分
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. 函数执行权限：只给 service_role
-- -----------------------------------------------------------------------------
-- 背景：Postgres 里函数默认对 PUBLIC 开放执行权限，Supabase 又会把 public schema 的函数
-- 通过 /rest/v1/rpc/<函数名> 暴露出去。这些函数都是 security definer（以函数所有者身份运行，
-- 绕过 RLS），所以任何拿到页面里公开 key（publishable / anon key）的人，都能直接调用
-- grant_topup 给自己加积分、调用 consume_credits 扣别人的分。
--
-- 前端只用 Supabase 做登录，所有积分操作都经 pro-gateway Worker（用 service_role key），
-- 所以收回 anon / authenticated 的执行权限不影响任何功能。
--
-- 注意：放在文件最后统一执行（见第 5 节），确保本文件新建的函数也被覆盖。


-- -----------------------------------------------------------------------------
-- 2 & 3. users 增加规范化邮箱列，ensure_user 修正注册积分发放
-- -----------------------------------------------------------------------------
alter table public.users add column if not exists email_normalized text;
create index if not exists users_email_normalized_idx on public.users (email_normalized);

-- 旧签名（4 个参数）删掉，换成带 p_email_normalized 的新签名。
-- 不删的话会形成两个重载，PostgREST 按参数名匹配时可能报「函数不唯一」。
drop function if exists public.ensure_user(uuid, text, boolean, int);

create or replace function public.ensure_user(
  p_auth_user_id     uuid,
  p_email            text,
  p_email_verified   boolean,
  p_signup_bonus     int,
  p_email_normalized text default null   -- Worker 计算：小写、去掉 +后缀、gmail 去点
) returns public.users
language plpgsql security definer
set search_path = public
as $$
declare
  v_user     public.users;
  v_bonus    int := 0;
  v_inserted int := 0;
  v_after    int;
begin
  -- 已存在直接返回（注册积分只在首次创建时考虑）
  select * into v_user from public.users where auth_user_id = p_auth_user_id;
  if found then
    return v_user;
  end if;

  insert into public.users(auth_user_id, email, email_verified, email_normalized)
    values (p_auth_user_id, p_email, coalesce(p_email_verified, false), p_email_normalized)
    on conflict (auth_user_id) do update set email = excluded.email
    returning * into v_user;

  -- 注册积分发放条件（任一不满足就是 0，账户照常创建）：
  --   a) 邮箱已验证（邮箱登录链接点过 / Google 登录）
  --   b) Worker 传入的奖励 > 0（Worker 已排除一次性邮箱、同 IP 当天超限）
  --   c) 同一个规范化邮箱以前没有别的账户（防 a+1@gmail.com 这类别名反复薅）
  if coalesce(p_email_verified, false)
     and coalesce(p_signup_bonus, 0) > 0
     and not exists (
       select 1 from public.users u
        where p_email_normalized is not null
          and u.email_normalized = p_email_normalized
          and u.id <> v_user.id
     )
  then
    v_bonus := p_signup_bonus;
  end if;

  -- 旧版 bug：这里无论是否验证都写入 p_signup_bonus，只有流水是有条件的。现在钱包和流水一致。
  insert into public.wallets(user_id, topup_credits)
    values (v_user.id, v_bonus)
    on conflict (user_id) do nothing;
  get diagnostics v_inserted = row_count;

  -- 只有钱包真的是这次新建的才记流水：两个并发请求同时首登时，
  -- 第二个的钱包插入会冲突（row_count = 0），不会重复记一条注册奖励。
  if v_inserted = 1 and v_bonus > 0 then
    select subscription_credits + topup_credits into v_after
      from public.wallets where user_id = v_user.id;
    insert into public.credit_ledger(user_id, delta, bucket, reason, balance_after)
      values (v_user.id, v_bonus, 'topup', 'signup_bonus', coalesce(v_after, 0));
  end if;

  return v_user;
end $$;


-- -----------------------------------------------------------------------------
-- 4. 退款 / 争议：orders 记录 payment_intent 与已扣回积分
-- -----------------------------------------------------------------------------
-- Stripe 的退款（charge.refunded）和争议（charge.dispute.created）事件里只有 payment_intent，
-- 没有 checkout session id，所以下单入账时要把 payment_intent 存下来用于反查订单。
alter table public.orders add column if not exists payment_intent  text;
alter table public.orders add column if not exists credits_revoked int not null default 0;
create unique index if not exists orders_payment_intent_key
  on public.orders (payment_intent) where payment_intent is not null;
-- orders.status 取值扩展为：pending | paid | partially_refunded | refunded | disputed

-- 扣回订单积分（幂等）
--   p_refunded_amount / p_total_amount：Stripe charge 的 amount_refunded / amount（单位：分）
--   p_reason：'refund'（按退款比例扣回）| 'dispute'（争议，扣回全部剩余）
--   p_ref：Stripe event id，写进流水便于对账
--
-- 幂等做法：orders.credits_revoked 记录「应扣回总数」。每次只扣「本次应扣回总数 - 已记录」的差额，
-- 所以同一事件重复投递、或多次部分退款，都不会重复扣。
-- 用户已经把积分用掉时，余额最多扣到 0（不出现负数），差额记在返回值 shortfall 里便于人工跟进。
create or replace function public.revoke_order_credits(
  p_payment_intent  text,
  p_refunded_amount int,
  p_total_amount    int,
  p_reason          text,
  p_ref             text
) returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_order    public.orders;
  v_target   int;
  v_delta    int;
  v_balance  int;
  v_take     int;
  v_after    int;
  v_status   text;
begin
  -- 行锁：同一订单的多个退款 / 争议事件并发到达时串行处理，防止重复扣回
  select * into v_order from public.orders
    where payment_intent = p_payment_intent
    for update;
  if not found then
    return json_build_object('status', 'order_not_found');
  end if;

  if p_reason = 'dispute' then
    v_target := v_order.credits;
    v_status := 'disputed';
  else
    -- 按退款金额比例扣回；全额退款时比例为 1
    v_target := least(
      v_order.credits,
      round(v_order.credits::numeric * greatest(p_refunded_amount, 0)
            / greatest(coalesce(nullif(p_total_amount, 0), v_order.amount_cents, 1), 1))::int
    );
    v_status := case when v_target >= v_order.credits then 'refunded' else 'partially_refunded' end;
  end if;

  v_delta := v_target - v_order.credits_revoked;
  if v_delta <= 0 then
    return json_build_object('status', 'noop', 'revoked_total', v_order.credits_revoked);
  end if;

  -- 钱包行锁 + 最多扣到 0
  select topup_credits into v_balance from public.wallets
    where user_id = v_order.user_id
    for update;
  v_take := least(v_delta, greatest(coalesce(v_balance, 0), 0));

  update public.wallets
    set topup_credits = topup_credits - v_take, updated_at = now()
    where user_id = v_order.user_id
    returning subscription_credits + topup_credits into v_after;

  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    values (v_order.user_id, -v_take, 'topup', p_reason, p_ref, coalesce(v_after, 0));

  update public.orders
    set credits_revoked = v_target, status = v_status
    where id = v_order.id;

  return json_build_object(
    'status', v_status,
    'revoked', v_take,
    'shortfall', v_delta - v_take,   -- 用户已用掉、没能扣回的积分
    'revoked_total', v_target
  );
end $$;


-- -----------------------------------------------------------------------------
-- 5. 执行第 1 节：收回所有函数的公开执行权限，只给 service_role
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant  execute on all functions in schema public to service_role;
-- 以后新建的函数也默认不对外开放
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public grant  execute on functions to service_role;
