// =============================================================================
// 订阅迁移验证(内存 Postgres / PGlite,不连真实 Supabase)
//   全部 schema + 迁移(订阅迁移跑两次验证幂等) → 续费结转 / 升级 / 批量退回桶 / 订阅结束 / 退款 / 权限
// 运行:node pro-gateway/test/db-subscriptions.mjs
// =============================================================================
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const DB = new URL("../db/", import.meta.url).pathname;
const db = new PGlite();
let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log("  PASS  " + name);
  else { failures++; console.log("  FAIL  " + name + (detail ? "  → " + detail : "")); }
};
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

// Supabase 环境桩
await db.exec(`
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);
const strip = (sql) => sql.replace(/create extension if not exists pgcrypto;/i, "");
await db.exec(strip(readFileSync(DB + "schema.sql", "utf8")));
await db.exec(strip(readFileSync(DB + "schema-batch.sql", "utf8")));
await db.exec(readFileSync(DB + "migrations/2026-10-11-launch-hardening.sql", "utf8"));
const sub = readFileSync(DB + "migrations/2026-10-12-subscriptions.sql", "utf8");
await db.exec(sub);
await db.exec(sub); // 幂等
console.log("全部 schema + 迁移加载完成(订阅迁移执行两次,幂等)\n");

// ---------- 工具 ----------
const mkUser = async (n) => (await one(
  `select (public.ensure_user($1::uuid, $2, true, 0, $2)).id as id`,
  [`${n}${n}${n}${n}${n}${n}${n}${n}-0000-0000-0000-000000000000`.slice(0, 36), `u${n}@example.com`],
)).id;
const wallet = async (u) => one(`select subscription_credits s, topup_credits t, frozen_credits f from public.wallets where user_id = $1`, [u]);
const setWallet = (u, s, t) => db.query(`update public.wallets set subscription_credits = $2, topup_credits = $3 where user_id = $1`, [u, s, t]);
const plan = async (u) => (await one(`select plan from public.users where id = $1`, [u])).plan;

// ---------- 续费:结转上限 = 一个月额度 ----------
const a = await mkUser(1);
let r = await one(`select public.renew_subscription_credits($1, 300, 'in_1') r`, [a]);
let w = await wallet(a);
check("首期:订阅积分 0 → 300", w.s === 300 && r.r.granted === 300, JSON.stringify(w));

await setWallet(a, 250, 40); // 用掉 50
r = await one(`select public.renew_subscription_credits($1, 300, 'in_2') r`, [a]);
w = await wallet(a);
check("续费:剩 250 全部结转 + 300 = 550,充值积分不动", w.s === 550 && w.t === 40 && r.r.expired === 0, JSON.stringify(w));

r = await one(`select public.renew_subscription_credits($1, 300, 'in_3') r`, [a]);
w = await wallet(a);
check("续费:剩 550 只结转 300(上限一个月),作废 250 → 600", w.s === 600 && r.r.expired === 250 && r.r.carried === 300, JSON.stringify(r.r));
const exp = await one(`select delta, balance_after from public.credit_ledger where user_id = $1 and reason = 'subscription_expired' order by id desc limit 1`, [a]);
check("作废写流水 -250,余额 = 结转 300 + 充值 40", exp.delta === -250 && exp.balance_after === 340, JSON.stringify(exp));

// ---------- 升级补差额 ----------
await one(`select public.grant_subscription_credits($1, 1200, 'subscription_upgrade', 'evt_up')`, [a]);
w = await wallet(a);
check("升级 basic → pro:补发 1200", w.s === 1800, JSON.stringify(w));

// ---------- 订阅状态同步 ----------
await one(`select public.upsert_subscription($1, 'sub_a', 'pro', 'active', 1500, now() + interval '30 days', false)`, [a]);
check("active → users.plan = pro", (await plan(a)) === "pro");
await one(`select public.upsert_subscription($1, 'sub_a', 'pro', 'past_due', 1500, now() + interval '30 days', false)`, [a]);
check("past_due → 保留档位(Stripe 还在重试扣款)", (await plan(a)) === "pro");
const acct = await one(`select public.get_account((select auth_user_id from public.users where id = $1)) j`, [a]);
check("get_account 带订阅信息", acct.j.subscription && acct.j.subscription.plan === "pro" && acct.j.subscription.monthly_credits === 1500, JSON.stringify(acct.j.subscription));
await one(`select public.upsert_subscription($1, 'sub_a', 'pro', 'active', 1500, now() + interval '30 days', false)`, [a]);

// ---------- 批量:冻结记录来源,失败退回原来的桶 ----------
await setWallet(a, 5, 20);
const job = await one(`select public.create_batch_job($1, 'fast', 1, $2::jsonb, 7) j`,
  [a, JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ name: `p${i}.jpg` })))]);
const jobId = job.j.job_id;
check("订阅用户(保留 7 天)→ R2 前缀 batch7/", job.j.images[0].input_key.startsWith("batch7/"), job.j.images[0].input_key);
const ret = await one(`select retention_days from public.jobs where id = $1`, [jobId]);
check("jobs.retention_days = 7", ret.retention_days === 7);

check("冻结 10:先扣订阅 5,再扣充值 5", (await one(`select public.freeze_batch($1) r`, [jobId])).r === "ok");
w = await wallet(a);
const fj = await one(`select frozen_from_sub from public.jobs where id = $1`, [jobId]);
check("冻结后:订阅 0 / 充值 15 / 冻结 10,frozen_from_sub = 5", w.s === 0 && w.t === 15 && w.f === 10 && fj.frozen_from_sub === 5, JSON.stringify({ ...w, ...fj }));

const imgs = (await db.query(`select id from public.job_images where job_id = $1 order by idx`, [jobId])).rows.map((x) => x.id);
for (let i = 0; i < 7; i++) await one(`select public.complete_batch_image($1, 'failed', null, 'boom')`, [imgs[i]]);
for (let i = 7; i < 10; i++) await one(`select public.complete_batch_image($1, 'done', 'k', null)`, [imgs[i]]);
w = await wallet(a);
check("失败 7 张:5 张退回订阅积分、2 张退回充值积分;成功 3 张结算", w.s === 5 && w.t === 17 && w.f === 0, JSON.stringify(w));
check("重复回调幂等", (await one(`select public.complete_batch_image($1, 'failed', null, 'boom') r`, [imgs[0]])).r === "already");

// 默认保留 1 天
const b = await mkUser(2);
const job2 = await one(`select public.create_batch_job($1, 'fast', 1, '[{"name":"x.jpg"}]'::jsonb) j`, [b]);
check("非订阅用户(默认)→ R2 前缀 batch/", job2.j.images[0].input_key.startsWith("batch/"), job2.j.images[0].input_key);

// ---------- 订阅结束 ----------
await setWallet(a, 900, 30);
// 结束前先冻结一批(订阅积分 4)
const job3 = await one(`select public.create_batch_job($1, 'fast', 1, $2::jsonb, 7) j`, [a, JSON.stringify([{ name: "1" }, { name: "2" }, { name: "3" }, { name: "4" }])]);
await one(`select public.freeze_batch($1)`, [job3.j.job_id]);
r = await one(`select public.end_subscription($1, 'evt_end') r`, [a]);
w = await wallet(a);
check("订阅结束:剩余订阅积分 896 作废,充值 30 不动,plan = free", w.s === 0 && w.t === 30 && r.r.expired === 896 && (await plan(a)) === "free", JSON.stringify({ w, r: r.r }));
const img3 = (await db.query(`select id from public.job_images where job_id = $1`, [job3.j.job_id])).rows[0].id;
await one(`select public.complete_batch_image($1, 'failed', null, 'boom')`, [img3]);
w = await wallet(a);
check("订阅结束后才失败的图 → 退回充值积分(订阅积分不会「复活」)", w.s === 0 && w.t === 31, JSON.stringify(w));
r = await one(`select public.end_subscription($1, 'evt_end') r`, [a]);
check("end_subscription 重复调用幂等(作废 0)", r.r.expired === 0);

// ---------- 退款扣回:按订单的积分桶 ----------
const c = await mkUser(3);
await setWallet(c, 300, 100);
await db.query(`insert into public.orders(user_id, provider_ref, sku, amount_cents, currency, credits, status, payment_intent, kind, bucket)
                values ($1, 'in_sub', 'sub_basic', 699, 'usd', 300, 'paid', 'pi_sub', 'subscription', 'subscription')`, [c]);
r = await one(`select public.revoke_order_credits('pi_sub', 699, 699, 'refund', 'evt_r') r`);
w = await wallet(c);
check("订阅发票全额退款 → 扣订阅积分 300,充值积分不动", w.s === 0 && w.t === 100 && r.r.revoked === 300, JSON.stringify({ w, r: r.r }));

await setWallet(c, 50, 100);
await db.query(`insert into public.orders(user_id, provider_ref, sku, amount_cents, currency, credits, status, payment_intent)
                values ($1, 'cs_pack', 'starter_100', 499, 'usd', 100, 'paid', 'pi_pack')`, [c]);
r = await one(`select public.revoke_order_credits('pi_pack', 499, 499, 'refund', 'evt_r2') r`);
w = await wallet(c);
check("积分包退款 → 只扣充值积分(与旧版一致)", w.s === 50 && w.t === 0 && r.r.revoked === 100, JSON.stringify(w));

// ---------- Stripe 客户 id ----------
await one(`select public.set_stripe_customer($1, 'cus_1')`, [c]);
await one(`select public.set_stripe_customer($1, 'cus_2')`, [c]);
const cus = await one(`select stripe_customer_id x from public.users where id = $1`, [c]);
check("stripe_customer_id 一旦设置不被覆盖", cus.x === "cus_1");

// ---------- 权限 ----------
const leaked = (await db.query(`
  select p.oid::regprocedure::text fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`)).rows.map((x) => x.fn);
check("新增函数同样不对 anon / authenticated 开放", leaked.length === 0, leaked.join(", "));
const overloads = Number((await one(`select count(*) n from pg_proc where proname = 'create_batch_job'`)).n);
check("create_batch_job 只有一个版本(旧签名已删除,不会出现重载歧义)", overloads === 1, String(overloads));

console.log(failures ? `\n❌ ${failures} 项失败` : "\n✅ 全部通过");
process.exit(failures ? 1 : 0);
