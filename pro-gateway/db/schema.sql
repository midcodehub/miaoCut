-- =============================================================================
-- MiaoCut Pro — Phase 1 Supabase schema
-- 账户 / 钱包 / 积分流水 / 订单 / 每日免费额度 + 原子扣减/入账 RPC + RLS
--
-- 运行方式:Supabase Dashboard → SQL Editor 粘贴执行,或
--   psql "$SUPABASE_DB_URL" -f pro-gateway/db/schema.sql
--
-- 设计要点:
--  · 所有积分增减只通过 security definer 函数完成,网关永不做"先读后写"。
--  · 余额扣减用行锁(SELECT ... FOR UPDATE),并发安全,杜绝超卖。
--  · 充值入账幂等由 orders.provider_ref 唯一约束保证(webhook 可重复投递)。
--  · 业务表与 Supabase Auth 的 auth.users 通过 users.auth_user_id 关联。
-- =============================================================================

-- 需要 gen_random_uuid()
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 表
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id             uuid primary key default gen_random_uuid(),
  auth_user_id   uuid unique not null,                 -- = auth.users.id
  email          text unique,
  email_verified boolean not null default false,
  plan           text not null default 'free',         -- Phase 1 只有 'free'
  created_at     timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id              uuid primary key references public.users(id) on delete cascade,
  subscription_credits int not null default 0,          -- 月度积分(Phase 1 预留)
  topup_credits        int not null default 0,          -- 充值积分(12 个月有效)
  updated_at           timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id            bigserial primary key,
  user_id       uuid not null references public.users(id) on delete cascade,
  delta         int  not null,                          -- 正=增,负=减
  bucket        text not null,                          -- 'topup' | 'subscription' | 'mixed'
  reason        text not null,                          -- signup_bonus|purchase|consume|refund|admin
  ref           text,                                   -- order_id / 请求 id,排查用
  balance_after int  not null,
  created_at    timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx
  on public.credit_ledger(user_id, created_at desc);

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  provider      text not null default 'stripe',
  provider_ref  text unique not null,                   -- Stripe checkout session id,幂等键
  sku           text not null,                          -- starter_100 | creator_500 ...
  amount_cents  int,
  currency      text,
  credits       int  not null,
  status        text not null default 'pending',        -- pending | paid | refunded
  created_at    timestamptz not null default now()
);

create table if not exists public.daily_free_usage (
  user_id  uuid not null references public.users(id) on delete cascade,
  day      date not null,
  used     int  not null default 0,
  primary key (user_id, day)
);

-- -----------------------------------------------------------------------------
-- RPC:懒初始化用户 + 首登发注册积分(幂等)
--   网关在 /auth/me 首次见到某 auth_user_id 时调用。
--   重复调用安全:已存在则直接返回,不重复发积分。
-- -----------------------------------------------------------------------------
create or replace function public.ensure_user(
  p_auth_user_id uuid,
  p_email        text,
  p_email_verified boolean,
  p_signup_bonus int
) returns public.users
language plpgsql security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_after int;
begin
  select * into v_user from public.users where auth_user_id = p_auth_user_id;
  if found then
    return v_user;
  end if;

  insert into public.users(auth_user_id, email, email_verified)
    values (p_auth_user_id, p_email, coalesce(p_email_verified, false))
    on conflict (auth_user_id) do update set email = excluded.email
    returning * into v_user;

  insert into public.wallets(user_id, topup_credits)
    values (v_user.id, greatest(coalesce(p_signup_bonus, 0), 0))
    on conflict (user_id) do nothing;

  -- 仅在已验证邮箱 / OAuth 时发放注册积分(防薅)
  if coalesce(p_email_verified, false) and coalesce(p_signup_bonus, 0) > 0 then
    select subscription_credits + topup_credits into v_after
      from public.wallets where user_id = v_user.id;
    insert into public.credit_ledger(user_id, delta, bucket, reason, balance_after)
      values (v_user.id, p_signup_bonus, 'topup', 'signup_bonus', coalesce(v_after, 0));
  end if;

  return v_user;
end $$;

-- -----------------------------------------------------------------------------
-- RPC:原子扣减(先扣会员积分,再扣充值积分)
--   返回 'ok' | 'insufficient'
-- -----------------------------------------------------------------------------
create or replace function public.consume_credits(
  p_user   uuid,
  p_amount int,
  p_reason text,
  p_ref    text
) returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_sub int;
  v_top int;
  v_left int;
  v_after int;
begin
  if p_amount <= 0 then
    return 'ok';
  end if;

  select subscription_credits, topup_credits into v_sub, v_top
    from public.wallets where user_id = p_user for update;   -- 行锁
  if not found then
    return 'insufficient';
  end if;

  if (coalesce(v_sub, 0) + coalesce(v_top, 0)) < p_amount then
    return 'insufficient';
  end if;

  v_left := p_amount;
  if v_sub >= v_left then
    v_sub := v_sub - v_left;
    v_left := 0;
  else
    v_left := v_left - v_sub;
    v_sub := 0;
    v_top := v_top - v_left;
    v_left := 0;
  end if;

  update public.wallets
    set subscription_credits = v_sub, topup_credits = v_top, updated_at = now()
    where user_id = p_user;

  v_after := v_sub + v_top;
  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    values (p_user, -p_amount, 'mixed', p_reason, p_ref, v_after);

  return 'ok';
end $$;

-- -----------------------------------------------------------------------------
-- RPC:充值入账(webhook 调用)
--   幂等:调用前网关先 insert orders(provider_ref unique);冲突即视为已处理。
--   本函数只负责加积分 + 记流水,假定订单已校验。
-- -----------------------------------------------------------------------------
create or replace function public.grant_topup(
  p_user    uuid,
  p_credits int,
  p_ref     text
) returns void
language plpgsql security definer
set search_path = public
as $$
declare v_after int;
begin
  update public.wallets
    set topup_credits = topup_credits + p_credits, updated_at = now()
    where user_id = p_user
    returning subscription_credits + topup_credits into v_after;

  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    values (p_user, p_credits, 'topup', 'purchase', p_ref, coalesce(v_after, 0));
end $$;

-- -----------------------------------------------------------------------------
-- RPC:记录一次免费额度使用并返回当日已用次数(成功后调用)
-- -----------------------------------------------------------------------------
create or replace function public.bump_daily_free(p_user uuid)
returns int
language plpgsql security definer
set search_path = public
as $$
declare v_used int;
begin
  insert into public.daily_free_usage(user_id, day, used)
    values (p_user, current_date, 1)
    on conflict (user_id, day) do update set used = public.daily_free_usage.used + 1
    returning used into v_used;
  return v_used;
end $$;

-- -----------------------------------------------------------------------------
-- RPC:一次性取账户聚合信息(网关用,避免多次往返)
--   返回 json:{user_id, email, plan, subscription_credits, topup_credits, daily_used}
--   未找到返回 null(网关据此决定是否 ensure_user)。
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
begin
  select * into v_user from public.users where auth_user_id = p_auth_user_id;
  if not found then
    return null;
  end if;

  select subscription_credits, topup_credits into v_sub, v_top
    from public.wallets where user_id = v_user.id;

  select coalesce(used, 0) into v_used
    from public.daily_free_usage where user_id = v_user.id and day = current_date;

  return json_build_object(
    'user_id', v_user.id,
    'email', v_user.email,
    'plan', v_user.plan,
    'subscription_credits', coalesce(v_sub, 0),
    'topup_credits', coalesce(v_top, 0),
    'daily_used', coalesce(v_used, 0)
  );
end $$;

-- -----------------------------------------------------------------------------
-- RLS:用户只能读自己的数据。所有写入走上面的 security definer 函数 +
--   网关用 service_role key(绕过 RLS)调用 RPC;前端用 anon/authenticated key 只读。
-- -----------------------------------------------------------------------------
alter table public.users           enable row level security;
alter table public.wallets         enable row level security;
alter table public.credit_ledger   enable row level security;
alter table public.orders          enable row level security;
alter table public.daily_free_usage enable row level security;

-- 读策略(authenticated 用户,凭 JWT 的 auth.uid() 匹配)
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users
  for select using (auth.uid() = auth_user_id);

drop policy if exists wallets_self_read on public.wallets;
create policy wallets_self_read on public.wallets
  for select using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists ledger_self_read on public.credit_ledger;
create policy ledger_self_read on public.credit_ledger
  for select using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists orders_self_read on public.orders;
create policy orders_self_read on public.orders
  for select using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists usage_self_read on public.daily_free_usage;
create policy usage_self_read on public.daily_free_usage
  for select using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

-- 注:不建任何 insert/update/delete 策略 → 普通角色无法直接改;
--     仅 service_role(网关)与 security definer 函数可写。
