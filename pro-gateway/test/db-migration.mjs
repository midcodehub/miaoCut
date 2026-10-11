// =============================================================================
// 数据库迁移验证(内存 Postgres / PGlite,不连真实 Supabase)
//   旧 schema → 迁移(跑两次验证幂等) → 注册积分 / 别名防薅 / 退款扣回 / 函数权限
// 运行:node pro-gateway/test/db-migration.mjs(需先 npm ci 安装 devDependencies)
// 新增迁移文件时,把它加进下面的执行列表并补对应断言。
// =============================================================================
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

// 路径相对本文件:pro-gateway/test/ → pro-gateway/db/
const DB = new URL("../db/", import.meta.url).pathname;
const db = new PGlite();
let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log("  PASS  " + name);
  else { failures++; console.log("  FAIL  " + name + (detail ? "  → " + detail : "")); }
};
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

// Supabase 环境桩:auth.uid()、三个角色
await db.exec(`
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
`);
// 模拟 Supabase 的默认行为:public schema 的函数对 anon / authenticated 可执行
await db.exec(`alter default privileges in schema public grant execute on functions to anon, authenticated;`);

const strip = (sql) => sql.replace(/create extension if not exists pgcrypto;/i, "");
await db.exec(strip(readFileSync(DB + "schema.sql", "utf8")));
await db.exec(strip(readFileSync(DB + "schema-batch.sql", "utf8")));
console.log("旧 schema 加载完成");

const before = await one(`select has_function_privilege('anon', 'public.grant_topup(uuid,int,text)', 'execute') as ok`);
check("（迁移前）anon 能执行 grant_topup —— 复现漏洞", before.ok === true);

const migration = readFileSync(DB + "migrations/2026-10-11-launch-hardening.sql", "utf8");
await db.exec(migration);
await db.exec(migration); // 幂等:再跑一次不报错
console.log("迁移执行两次均成功(幂等)\n");

// ---------- 函数权限 ----------
for (const fn of ["grant_topup(uuid,int,text)", "consume_credits(uuid,int,text,text)", "revoke_order_credits(text,int,int,text,text)", "ensure_user(uuid,text,boolean,int,text)"]) {
  const r = await one(`select has_function_privilege('anon', 'public.${fn}', 'execute') a, has_function_privilege('authenticated', 'public.${fn}', 'execute') b, has_function_privilege('service_role', 'public.${fn}', 'execute') c`)
    .catch((e) => ({ err: e.message }));
  check(`权限 ${fn.split("(")[0]}:anon/authenticated 不可执行,service_role 可执行`, r.a === false && r.b === false && r.c === true, JSON.stringify(r));
}

const leaked = (await db.query(`
  select p.oid::regprocedure::text fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`)).rows.map((x) => x.fn);
const total = Number((await one(`select count(*) n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`)).n);
check(`public schema 全部 ${total} 个函数都不对 anon / authenticated 开放`, leaked.length === 0, leaked.join(", "));

// ---------- 注册积分 ----------
const ensure = (auth, email, verified, bonus, norm) =>
  one(`select (public.ensure_user($1::uuid, $2, $3, $4, $5)).id as id`, [auth, email, verified, bonus, norm]);
const wallet = async (uid) => (await one(`select topup_credits t from public.wallets where user_id = $1`, [uid])).t;
const ledgerCount = async (uid, reason) => Number((await one(`select count(*) n from public.credit_ledger where user_id = $1 and reason = $2`, [uid, reason])).n);

const u1 = (await ensure("11111111-1111-1111-1111-111111111111", "Alice.Smith@gmail.com", true, 100, "alicesmith@gmail.com")).id;
check("已验证新用户 → 钱包 100 + 1 条注册流水", (await wallet(u1)) === 100 && (await ledgerCount(u1, "signup_bonus")) === 1);

const u2 = (await ensure("22222222-2222-2222-2222-222222222222", "x@example.com", false, 100, "x@example.com")).id;
check("未验证邮箱 → 钱包 0(修复旧版「钱包照发 100」的 bug)", (await wallet(u2)) === 0 && (await ledgerCount(u2, "signup_bonus")) === 0, `wallet=${await wallet(u2)}`);

const u3 = (await ensure("33333333-3333-3333-3333-333333333333", "alice.smith+2@gmail.com", true, 100, "alicesmith@gmail.com")).id;
check("同一 Gmail 的别名 → 不再发注册积分", (await wallet(u3)) === 0, `wallet=${await wallet(u3)}`);

const u4 = (await ensure("44444444-4444-4444-4444-444444444444", "bob@example.com", true, 0, "bob@example.com")).id;
check("Worker 判定不发(传 0)→ 钱包 0", (await wallet(u4)) === 0);

const again = (await ensure("11111111-1111-1111-1111-111111111111", "Alice.Smith@gmail.com", true, 100, "alicesmith@gmail.com")).id;
check("老用户重复调用 → 返回同一账户、不重复发", again === u1 && (await wallet(u1)) === 100 && (await ledgerCount(u1, "signup_bonus")) === 1);

// ---------- 退款 / 争议 ----------
await db.query(`insert into public.orders(user_id, provider_ref, sku, amount_cents, currency, credits, status, payment_intent)
                values ($1, 'cs_test_1', 'creator_500', 1499, 'usd', 500, 'paid', 'pi_test_1')`, [u1]);
await db.query(`select public.grant_topup($1, 500, 'cs_test_1')`, [u1]);
check("充值后余额 600", (await wallet(u1)) === 600);

const revoke = async (refunded, total, reason, ref) =>
  (await one(`select public.revoke_order_credits('pi_test_1', $1, $2, $3, $4) r`, [refunded, total, reason, ref])).r;

let r = await revoke(750, 1499, "refund", "evt_1");
check("部分退款一半 → 扣回 250,状态 partially_refunded", r.revoked === 250 && r.status === "partially_refunded" && (await wallet(u1)) === 350, JSON.stringify(r));

r = await revoke(750, 1499, "refund", "evt_1");
check("同一退款事件重复投递 → 不重复扣", r.status === "noop" && (await wallet(u1)) === 350, JSON.stringify(r));

r = await revoke(1499, 1499, "refund", "evt_2");
check("再退剩下的(累计全额)→ 再扣 250,状态 refunded", r.revoked === 250 && r.status === "refunded" && (await wallet(u1)) === 100, JSON.stringify(r));

// 另一笔订单:用户先把积分花光,再发起争议
await db.query(`insert into public.orders(user_id, provider_ref, sku, amount_cents, currency, credits, status, payment_intent)
                values ($1, 'cs_test_2', 'starter_100', 499, 'usd', 100, 'paid', 'pi_test_2')`, [u4]);
await db.query(`select public.grant_topup($1, 100, 'cs_test_2')`, [u4]);
await db.query(`update public.wallets set topup_credits = 30 where user_id = $1`, [u4]); // 用掉 70
r = (await one(`select public.revoke_order_credits('pi_test_2', 0, 0, 'dispute', 'evt_d') r`)).r;
check("争议且积分已用掉 → 扣到 0、shortfall=70、状态 disputed", r.revoked === 30 && r.shortfall === 70 && r.status === "disputed" && (await wallet(u4)) === 0, JSON.stringify(r));

r = (await one(`select public.revoke_order_credits('pi_unknown', 0, 0, 'refund', 'evt_x') r`)).r;
check("找不到订单 → order_not_found(不报错)", r.status === "order_not_found");

const neg = Number((await one(`select count(*) n from public.wallets where topup_credits < 0`)).n);
check("任何钱包都不会出现负数", neg === 0);

console.log(failures ? `\n❌ ${failures} 项失败` : "\n✅ 全部通过");
process.exit(failures ? 1 : 0);
