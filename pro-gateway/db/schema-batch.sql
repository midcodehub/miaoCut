-- =============================================================================
-- MiaoCut Pro — Phase 2 批量 schema（jobs / job_images + 冻结/结算/释放 RPC）
--
-- 在 schema.sql（Phase 1）之后运行。幂等（if not exists / or replace / add column if not exists）。
--
-- 积分模型：提交只建任务不冻结；点开始(start)时一次性【冻结】= 张数 × 单价；
--   每张成功 → 【结算】(frozen -= 单价，积分真正消耗)；
--   每张失败 → 【释放】(frozen -= 单价，退回 topup，记 release 流水)。
--   freeze 时 available 已减、frozen 已加（total 不变）；settle 让 total 减、release 让 total 复原。
-- =============================================================================

-- 钱包加“冻结中”列（批量进行时占用）
alter table public.wallets add column if not exists frozen_credits int not null default 0;

-- -----------------------------------------------------------------------------
-- 表
-- -----------------------------------------------------------------------------
create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  profile         text not null,                          -- 'fast' | 'fur'
  total_images    int  not null,
  cost_per_image  int  not null,                          -- 1 | 2
  credits_frozen  int  not null,                          -- = total_images * cost_per_image
  credits_settled int  not null default 0,
  succeeded       int  not null default 0,
  failed          int  not null default 0,
  status          text not null default 'pending',        -- pending | processing | done | canceled
  expires_at      timestamptz,                            -- 结果 24h 后清
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists jobs_user_idx on public.jobs(user_id, created_at desc);

create table if not exists public.job_images (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  idx           int  not null default 0,
  orig_filename text,
  input_key     text not null,                            -- R2 key（输入）
  output_key    text,                                     -- R2 key（输出）
  task_id       text,                                     -- Beam task id（可选，调试用）
  status        text not null default 'pending',          -- pending | done | failed
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists job_images_job_idx on public.job_images(job_id, idx);

-- -----------------------------------------------------------------------------
-- RPC：建批量任务（建 job + N 条 job_images，生成 R2 keys，返回给网关去签名）
--   p_files = jsonb 数组，每项 {name}
--   返回 {job_id, total, images:[{image_id, input_key, orig_filename}]}
-- -----------------------------------------------------------------------------
create or replace function public.create_batch_job(
  p_user    uuid,
  p_profile text,
  p_cost    int,
  p_files   jsonb
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
  r jsonb;
  v_images jsonb := '[]'::jsonb;
begin
  v_total := jsonb_array_length(p_files);
  if v_total is null or v_total < 1 then
    return jsonb_build_object('error', 'no_files');
  end if;

  insert into public.jobs(user_id, profile, total_images, cost_per_image, credits_frozen, status, expires_at)
    values (p_user, p_profile, v_total, p_cost, v_total * p_cost, 'pending', now() + interval '24 hours')
    returning id into v_job;

  for r in select * from jsonb_array_elements(p_files) loop
    v_img := gen_random_uuid();
    v_in  := 'batch/' || v_job || '/in/'  || v_img;
    v_out := 'batch/' || v_job || '/out/' || v_img || '.webp';  -- Beam 输出 lossless WebP
    insert into public.job_images(id, job_id, user_id, idx, orig_filename, input_key, output_key, status)
      values (v_img, v_job, p_user, v_idx, r->>'name', v_in, v_out, 'pending');
    v_images := v_images || jsonb_build_object('image_id', v_img, 'input_key', v_in, 'orig_filename', r->>'name');
    v_idx := v_idx + 1;
  end loop;

  return jsonb_build_object('job_id', v_job, 'total', v_total, 'images', v_images);
end $$;

-- -----------------------------------------------------------------------------
-- RPC：冻结整批积分（点“开始”时调）。返回 'ok'|'insufficient'|'already'|'not_found'
--   available（先会员后充值）→ frozen；记 freeze 流水。
-- -----------------------------------------------------------------------------
create or replace function public.freeze_batch(p_job uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid; v_amount int; v_status text;
  v_sub int; v_top int; v_left int;
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

  v_left := v_amount;
  if v_sub >= v_left then v_sub := v_sub - v_left; v_left := 0;
  else v_left := v_left - v_sub; v_sub := 0; v_top := v_top - v_left; v_left := 0; end if;

  update public.wallets
    set subscription_credits = v_sub, topup_credits = v_top,
        frozen_credits = frozen_credits + v_amount, updated_at = now()
    where user_id = v_user;

  insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
    values (v_user, -v_amount, 'mixed', 'freeze', p_job::text, v_sub + v_top);

  update public.jobs set status = 'processing', updated_at = now() where id = p_job;
  return 'ok';
end $$;

-- -----------------------------------------------------------------------------
-- RPC：单图完成（Beam 回调调用，幂等）。成功=结算，失败=释放。返回 'ok'|'already'|'not_found'
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

  select cost_per_image into v_cost from public.jobs where id = v_job;

  if p_status = 'done' then
    update public.job_images
      set status = 'done', output_key = coalesce(p_output_key, output_key), updated_at = now()
      where id = p_image;
    -- 结算：frozen 扣除（freeze 时 available 已减，这里把冻结消耗掉，total 减少）
    update public.wallets set frozen_credits = frozen_credits - v_cost, updated_at = now()
      where user_id = v_user;
    update public.jobs
      set succeeded = succeeded + 1, credits_settled = credits_settled + v_cost, updated_at = now()
      where id = v_job;
  else
    update public.job_images set status = 'failed', error = p_error, updated_at = now()
      where id = p_image;
    -- 释放：frozen 扣除 + 退回 topup + 记 release 流水（失败不扣）
    update public.wallets
      set frozen_credits = frozen_credits - v_cost, topup_credits = topup_credits + v_cost, updated_at = now()
      where user_id = v_user;
    insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
      select v_user, v_cost, 'topup', 'release', p_image::text, subscription_credits + topup_credits
        from public.wallets where user_id = v_user;
    update public.jobs set failed = failed + 1, updated_at = now() where id = v_job;
  end if;

  -- 全部完成 → 任务 done
  update public.jobs set status = 'done', updated_at = now()
    where id = v_job and status <> 'done' and (succeeded + failed) >= total_images;

  return 'ok';
end $$;

-- -----------------------------------------------------------------------------
-- RPC：超时兜底（防积分永久冻结）。把未完成的图标失败 + 释放冻结，任务置 done。
--   网关在 GET 状态发现任务已过 expires_at 仍未完成时调用。
-- -----------------------------------------------------------------------------
create or replace function public.expire_batch(p_job uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare r record; v_cost int; v_user uuid;
begin
  select cost_per_image, user_id into v_cost, v_user from public.jobs where id = p_job for update;
  if not found then return 'not_found'; end if;

  for r in select id from public.job_images
           where job_id = p_job and status not in ('done','failed') for update loop
    update public.job_images set status = 'failed', error = 'expired', updated_at = now() where id = r.id;
    update public.wallets
      set frozen_credits = frozen_credits - v_cost, topup_credits = topup_credits + v_cost, updated_at = now()
      where user_id = v_user;
    insert into public.credit_ledger(user_id, delta, bucket, reason, ref, balance_after)
      select v_user, v_cost, 'topup', 'release', r.id::text, subscription_credits + topup_credits
        from public.wallets where user_id = v_user;
    update public.jobs set failed = failed + 1, updated_at = now() where id = p_job;
  end loop;

  update public.jobs set status = 'done', updated_at = now() where id = p_job and status <> 'done';
  return 'ok';
end $$;

-- -----------------------------------------------------------------------------
-- RLS：jobs / job_images 仅本人可读（写仍只走 service_role + security definer）
-- -----------------------------------------------------------------------------
alter table public.jobs       enable row level security;
alter table public.job_images enable row level security;

drop policy if exists jobs_self_read on public.jobs;
create policy jobs_self_read on public.jobs
  for select using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists job_images_self_read on public.job_images;
create policy job_images_self_read on public.job_images
  for select using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );
