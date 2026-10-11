-- =============================================================================
-- MiaoCut Pro — 月度订阅（2026-10-12）
--
-- 执行顺序：schema.sql → schema-batch.sql → 2026-10-11-launch-hardening.sql → 本文件。
-- 幂等：可以重复执行（add column if not exists / create or replace / drop function if exists）。
-- ⚠️ 必须在部署带订阅功能的 pro-gateway 之前执行（新网关会调用这里的函数）。
--
-- 订阅规则（产品决策 2026-10-11，见 .impeccable/brief-pro-redesign.md）：
--   · 三档：basic 300 / pro 1500 / business 5000 积分每月（档位与价格在网关 SUBSCRIPTION_PLANS 里）
--   · 每期续费：未用完的订阅积分最多结转「一个月额度」，超出部分作废（记 subscription_expired 流水）
--   · 升级：立即补发新旧档位的差额；降级：Stripe 在本期结束时生效，下一期按新档位发
--   · 订阅结束（取消到期 / 欠费终止）：剩余订阅积分作废；充值积分不受影响
--   · 扣分顺序不变：先扣订阅积分，再扣充值积分
--   · 批量失败退回：从哪个积分桶冻结的就退回哪个桶（以前一律退回充值积分，
--     会把每月重置的订阅积分变成 12 个月有效的充值积分，存在被刻意利用的漏洞）
--   · 订阅用户的批量结果保留 7 天：R2 路径前缀用 batch7/（需在 R2 配一条 7 天删除规则）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 表结构
-- -----------------------------------------------------------------------------
-- Stripe 客户 id：续订、客户门户（改档 / 取消 / 发票）都要用同一个 customer
alter table public.users add column if not exists stripe_customer_id text;
create unique index if not exists users_stripe_customer_idx
  on public.users(stripe_customer_id) where stripe_customer_id is not null;

-- 每个用户最多一条订阅记录（以 Stripe 为准，由 webhook 同步）
create table if not exists public.subscriptions (
  user_id                uuid primary key references public.users(id) on delete cascade,
  stripe_subscription_id text unique not null,
  plan                   text not null,                 -- basic | pro | business
  status                 text not null,                 -- Stripe 状态：active | past_due | canceled | incomplete ...
  monthly_credits        int  not null,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_self_read on public.subscriptions;
create policy subscriptions_self_read on public.subscriptions
  for select to authenticated
  using (user_id in (select id from public.users where auth_user_id = auth.uid()));

-- 订单区分积分包 / 订阅发票；退款扣回时按 bucket 决定从哪个积分桶扣
alter table public.orders add column if not exists kind   text not null default 'pack';   -- pack | subscription
alter table public.orders add column if not exists bucket text not null default 'topup';  -- topup | subscription

-- 批量：记录冻结时从订阅积分里拿了多少、已经退回多少；结果保留天数
alter table public.jobs add column if not exists frozen_from_sub int not null default 0;
alter table public.jobs add column if not exists returned_to_sub int not null default 0;
alter table public.jobs add column if not exists retention_days  int not null default 1;

-- -----------------------------------------------------------------------------
-- RPC：同步订阅状态（webhook 收到 customer.subscription.* 后，网关先向 Stripe 取最新数据再调用）
--   有效状态（active / trialing / past_due）→ users.plan = 档位；其他 → 'free'
--   past_due 期间保留档位：Stripe 会自动重试扣款，最终失败会发 subscription.deleted
-- -----------------------------------------------------------------------------
create or replace function public.upsert_subscription(
  p_user        uuid,
  p_sub_id      text,
  p_plan        text,
  p_status      text,
  p_monthly     int,
  p_period_end  timestamptz,
  p_cancel      boolean
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.subscriptions(user_id, stripe_subscription_id, plan, status, monthly_credits,
                                   current_period_end, cancel_at_period_end, updated_at)
    values (p_user, p_sub_id, p_plan, p_status, p_monthly, p_period_end, coalesce(p_cancel, false), now())
    on conflict (user_id) do update
      set stripe_subscription_id = excluded.stripe_subscription_id,
          plan = excluded.plan,
          status = excluded.status,
          monthly_credits = excluded.monthly_credits,
          current_period_end = excluded.current_period_end,
          cancel_at_period_end = excluded.cancel_at_period_end,
          updated_at = now();

  update public.users
    set plan = case when p_status in ('active', 'trialing', 'past_due') then p_plan else 'free' end
    where id = p_user;
end $$;

-- -----------------------------------------------------------------------------
-- RPC：每期续费发积分（首期 / 每月续费的发票支付成功后调用）
--   新订阅积分 = min(剩余订阅积分, 月额度) + 月额度
--   幂等由调用方保证：网关先 insert orders(provider_ref = 发票 id，唯一)，冲突即已处理
--   返回 {carried, expired, granted, balance}
-- -----------------------------------------------------------------------------
create or replace function public.renew_subscription_credits(
  p_user    uuid,
  p_monthly int,
  p_ref     text
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_sub int; v_top int;
  v_carry int; v_expired int;
begin
  select subscription_credits, topup_credits into v_sub, v_top
    from public.wallets where user_id = p_user for update;     -- 行锁，防并发
  if not found then
    return json_build_object('status', 'no_wallet');
  end if;

  v_carry   := least(greatest(v_sub, 0), greatest(p_monthly, 0));
  v_expired := greatest(v_sub, 0) - v_carry;

  if v_expired > 0 then
    insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
      values (p_user, -v_expired, 'subscription', 'subscription_expired', p_ref, v_carry + v_top);
  end if;

  update public.wallets
    set subscription_credits = v_carry + p_monthly, updated_at = now()
    where user_id = p_user;

  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    values (p_user, p_monthly, 'subscription', 'subscription_grant', p_ref, v_carry + p_monthly + v_top);

  return json_build_object('carried', v_carry, 'expired', v_expired, 'granted', p_monthly,
                           'balance', v_carry + p_monthly + v_top);
end $$;

-- -----------------------------------------------------------------------------
-- RPC：升级补差额（basic → pro 等）。幂等由调用方保证（orders 唯一键）
-- -----------------------------------------------------------------------------
create or replace function public.grant_subscription_credits(
  p_user    uuid,
  p_credits int,
  p_reason  text,
  p_ref     text
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_after int;
begin
  if p_credits <= 0 then return; end if;
  update public.wallets
    set subscription_credits = subscription_credits + p_credits, updated_at = now()
    where user_id = p_user
    returning subscription_credits + topup_credits into v_after;
  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    values (p_user, p_credits, 'subscription', p_reason, p_ref, coalesce(v_after, 0));
end $$;

-- -----------------------------------------------------------------------------
-- RPC：订阅结束（取消到期 / 欠费终止）。剩余订阅积分作废，充值积分不动。幂等（再调一次作废 0）
-- -----------------------------------------------------------------------------
create or replace function public.end_subscription(
  p_user uuid,
  p_ref  text
) returns json
language plpgsql security definer set search_path = public
as $$
declare v_sub int; v_top int;
begin
  select subscription_credits, topup_credits into v_sub, v_top
    from public.wallets where user_id = p_user for update;
  if not found then
    return json_build_object('status', 'no_wallet');
  end if;
  if v_sub > 0 then
    update public.wallets set subscription_credits = 0, updated_at = now() where user_id = p_user;
    insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
      values (p_user, -v_sub, 'subscription', 'subscription_expired', p_ref, v_top);
  end if;
  update public.users set plan = 'free' where id = p_user;
  update public.subscriptions set status = 'canceled', updated_at = now() where user_id = p_user;
  return json_build_object('expired', greatest(v_sub, 0), 'balance', v_top);
end $$;

-- -----------------------------------------------------------------------------
-- RPC：建批量任务 —— 新增 p_retention_days（订阅用户 7 天，R2 路径前缀 batch7/）
--   参数表变了，create or replace 会生成重载，所以先删旧签名
-- -----------------------------------------------------------------------------
drop function if exists public.create_batch_job(uuid, text, int, jsonb);
create or replace function public.create_batch_job(
  p_user           uuid,
  p_profile        text,
  p_cost           int,
  p_files          jsonb,
  p_retention_days int default 1
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_job uuid;
  v_total int;
  v_idx int := 0;
  v_img uuid;
  v_in text;
  v_out text;
  v_prefix text;
  r jsonb;
  v_images jsonb := '[]'::jsonb;
begin
  v_total := jsonb_array_length(p_files);
  if v_total is null or v_total < 1 then
    return jsonb_build_object('error', 'no_files');
  end if;
  -- R2 生命周期规则按前缀删文件：batch/ 1 天，batch7/ 7 天
  v_prefix := case when coalesce(p_retention_days, 1) >= 7 then 'batch7/' else 'batch/' end;

  -- expires_at 是「处理超时」兜底（超过仍未完成就释放冻结积分），与结果保留天数无关
  insert into public.jobs(user_id, profile, total_images, cost_per_image, credits_frozen, status,
                          expires_at, retention_days)
    values (p_user, p_profile, v_total, p_cost, v_total * p_cost, 'pending',
            now() + interval '24 hours', case when coalesce(p_retention_days, 1) >= 7 then 7 else 1 end)
    returning id into v_job;

  for r in select * from jsonb_array_elements(p_files) loop
    v_img := gen_random_uuid();
    v_in  := v_prefix || v_job || '/in/'  || v_img;
    v_out := v_prefix || v_job || '/out/' || v_img || '.png';
    insert into public.job_images(id, job_id, user_id, idx, orig_filename, input_key, output_key, status)
      values (v_img, v_job, p_user, v_idx, r->>'name', v_in, v_out, 'pending');
    v_images := v_images || jsonb_build_object('image_id', v_img, 'input_key', v_in, 'orig_filename', r->>'name');
    v_idx := v_idx + 1;
  end loop;

  return jsonb_build_object('job_id', v_job, 'total', v_total, 'images', v_images);
end $$;

-- -----------------------------------------------------------------------------
-- RPC：冻结整批积分 —— 新增记录 frozen_from_sub（先扣订阅积分的那部分）
-- -----------------------------------------------------------------------------
create or replace function public.freeze_batch(p_job uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid; v_amount int; v_status text;
  v_sub int; v_top int; v_from_sub int;
begin
  select user_id, credits_frozen, status into v_user, v_amount, v_status
    from public.jobs where id = p_job for update;
  if not found then return 'not_found'; end if;
  if v_status <> 'pending' then return 'already'; end if;

  select subscription_credits, topup_credits into v_sub, v_top
    from public.wallets where user_id = v_user for update;
  if (coalesce(v_sub,0) + coalesce(v_top,0)) < v_amount then
    return 'insufficient';
  end if;

  -- 先扣订阅积分，再扣充值积分
  v_from_sub := least(greatest(v_sub, 0), v_amount);
  v_sub := v_sub - v_from_sub;
  v_top := v_top - (v_amount - v_from_sub);

  update public.wallets
    set subscription_credits = v_sub, topup_credits = v_top,
        frozen_credits = frozen_credits + v_amount, updated_at = now()
    where user_id = v_user;

  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    values (v_user, -v_amount, 'mixed', 'freeze', p_job::text, v_sub + v_top);

  update public.jobs
    set status = 'processing', frozen_from_sub = v_from_sub, returned_to_sub = 0, updated_at = now()
    where id = p_job;
  return 'ok';
end $$;

-- -----------------------------------------------------------------------------
-- 内部函数：释放一张失败图的冻结积分，退回原来的桶
--   订阅部分优先退回订阅积分（不超过本批从订阅积分冻结的量）；
--   用户已经不是订阅状态（订阅已结束）时一律退回充值积分，避免作废后又「复活」
--   调用方须已持有 jobs 行锁
-- -----------------------------------------------------------------------------
create or replace function public.release_batch_credits(p_job uuid, p_image uuid, p_reason_ref text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid; v_cost int; v_from_sub int; v_returned int; v_plan text;
  v_to_sub int; v_to_top int;
begin
  select user_id, cost_per_image, frozen_from_sub, returned_to_sub
    into v_user, v_cost, v_from_sub, v_returned
    from public.jobs where id = p_job;
  select plan into v_plan from public.users where id = v_user;

  v_to_sub := case when coalesce(v_plan, 'free') <> 'free'
                   then least(v_cost, greatest(v_from_sub - v_returned, 0)) else 0 end;
  v_to_top := v_cost - v_to_sub;

  update public.wallets
    set frozen_credits = frozen_credits - v_cost,
        subscription_credits = subscription_credits + v_to_sub,
        topup_credits = topup_credits + v_to_top,
        updated_at = now()
    where user_id = v_user;
  update public.jobs set returned_to_sub = returned_to_sub + v_to_sub where id = p_job;

  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    select v_user, v_cost,
           case when v_to_sub = 0 then 'topup' when v_to_top = 0 then 'subscription' else 'mixed' end,
           'release', p_reason_ref, subscription_credits + topup_credits
      from public.wallets where user_id = v_user;
end $$;

-- -----------------------------------------------------------------------------
-- RPC：单图完成（Beam 回调，幂等）—— 失败释放改用 release_batch_credits
-- -----------------------------------------------------------------------------
create or replace function public.complete_batch_image(
  p_image      uuid,
  p_status     text,
  p_output_key text,
  p_error      text
) returns text
language plpgsql security definer set search_path = public
as $$
declare v_job uuid; v_user uuid; v_cur text; v_cost int;
begin
  select job_id, user_id, status into v_job, v_user, v_cur
    from public.job_images where id = p_image for update;
  if not found then return 'not_found'; end if;
  if v_cur in ('done','failed') then return 'already'; end if;   -- 幂等：重复回调直接返回

  -- jobs 行锁：同一批的多张图并发回调时，returned_to_sub 的累加要串行
  select cost_per_image into v_cost from public.jobs where id = v_job for update;

  if p_status = 'done' then
    update public.job_images
      set status = 'done', output_key = coalesce(p_output_key, output_key), updated_at = now()
      where id = p_image;
    update public.wallets set frozen_credits = frozen_credits - v_cost, updated_at = now()
      where user_id = v_user;
    update public.jobs
      set succeeded = succeeded + 1, credits_settled = credits_settled + v_cost, updated_at = now()
      where id = v_job;
  else
    update public.job_images set status = 'failed', error = p_error, updated_at = now()
      where id = p_image;
    perform public.release_batch_credits(v_job, p_image, p_image::text);
    update public.jobs set failed = failed + 1, updated_at = now() where id = v_job;
  end if;

  update public.jobs set status = 'done', updated_at = now()
    where id = v_job and status <> 'done' and (succeeded + failed) >= total_images;

  return 'ok';
end $$;

-- -----------------------------------------------------------------------------
-- RPC：超时兜底 —— 失败释放改用 release_batch_credits
-- -----------------------------------------------------------------------------
create or replace function public.expire_batch(p_job uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  perform 1 from public.jobs where id = p_job for update;
  if not found then return 'not_found'; end if;

  for r in select id from public.job_images
           where job_id = p_job and status not in ('done','failed') for update loop
    update public.job_images set status = 'failed', error = 'expired', updated_at = now() where id = r.id;
    perform public.release_batch_credits(p_job, r.id, r.id::text);
    update public.jobs set failed = failed + 1, updated_at = now() where id = p_job;
  end loop;

  update public.jobs set status = 'done', updated_at = now() where id = p_job and status <> 'done';
  return 'ok';
end $$;

-- -----------------------------------------------------------------------------
-- RPC：退款 / 争议扣回 —— 按订单的积分桶扣：订阅发票先扣订阅积分，积分包只扣充值积分（与旧版一致）
-- -----------------------------------------------------------------------------
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
  v_sub      int;
  v_top      int;
  v_from_sub int := 0;
  v_from_top int := 0;
  v_after    int;
  v_status   text;
begin
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

  select subscription_credits, topup_credits into v_sub, v_top
    from public.wallets where user_id = v_order.user_id for update;

  if v_order.bucket = 'subscription' then
    v_from_sub := least(v_delta, greatest(coalesce(v_sub, 0), 0));
    v_from_top := least(v_delta - v_from_sub, greatest(coalesce(v_top, 0), 0));
  else
    v_from_top := least(v_delta, greatest(coalesce(v_top, 0), 0));
  end if;

  update public.wallets
    set subscription_credits = subscription_credits - v_from_sub,
        topup_credits = topup_credits - v_from_top,
        updated_at = now()
    where user_id = v_order.user_id
    returning subscription_credits + topup_credits into v_after;

  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    values (v_order.user_id, -(v_from_sub + v_from_top),
            case when v_from_sub > 0 and v_from_top > 0 then 'mixed'
                 when v_from_sub > 0 then 'subscription' else 'topup' end,
            p_reason, p_ref, coalesce(v_after, 0));

  update public.orders
    set credits_revoked = v_target, status = v_status
    where id = v_order.id;

  return json_build_object(
    'status', v_status,
    'revoked', v_from_sub + v_from_top,
    'shortfall', v_delta - (v_from_sub + v_from_top),
    'revoked_total', v_target
  );
end $$;

-- -----------------------------------------------------------------------------
-- RPC：账户聚合 —— 新增订阅信息和 stripe_customer_id
-- -----------------------------------------------------------------------------
create or replace function public.get_account(p_auth_user_id uuid)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_sub int;
  v_top int;
  v_used int;
  v_s public.subscriptions;
begin
  select * into v_user from public.users where auth_user_id = p_auth_user_id;
  if not found then
    return null;
  end if;
  select subscription_credits, topup_credits into v_sub, v_top
    from public.wallets where user_id = v_user.id;
  select coalesce(used, 0) into v_used
    from public.daily_free_usage where user_id = v_user.id and day = current_date;
  select * into v_s from public.subscriptions where user_id = v_user.id;
  return json_build_object(
    'user_id', v_user.id,
    'email', v_user.email,
    'plan', v_user.plan,
    'stripe_customer_id', v_user.stripe_customer_id,
    'subscription_credits', coalesce(v_sub, 0),
    'topup_credits', coalesce(v_top, 0),
    'daily_used', coalesce(v_used, 0),
    'subscription', case when v_s.user_id is null then null else json_build_object(
      'plan', v_s.plan,
      'status', v_s.status,
      'monthly_credits', v_s.monthly_credits,
      'current_period_end', v_s.current_period_end,
      'cancel_at_period_end', v_s.cancel_at_period_end
    ) end
  );
end $$;

-- -----------------------------------------------------------------------------
-- RPC：记录用户的 Stripe 客户 id（首次订阅结账完成时）
-- -----------------------------------------------------------------------------
create or replace function public.set_stripe_customer(p_user uuid, p_customer text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.users set stripe_customer_id = p_customer
    where id = p_user and (stripe_customer_id is null or stripe_customer_id = p_customer);
end $$;

-- -----------------------------------------------------------------------------
-- 权限：与 launch-hardening 一致 —— 所有函数只给 service_role（网关）执行
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
