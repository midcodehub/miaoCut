#!/usr/bin/env node
// =============================================================================
// SEO 守卫：对比「基准分支」和「当前工作区」所有 HTML 页面的 SEO 关键项，防止改版把已有排名改没了。
// -----------------------------------------------------------------------------
// 检查项（每个页面）：
//   <title>、meta description、meta robots、canonical、hreflang 列表、所有 <h1> 文本、
//   JSON-LD 结构化数据（压成一行比较）
// 以及 sitemap.xml 里的 URL 列表（被删的 URL 一律算问题）。
//
// 规则：
//   - 基准里「可被收录」的页面（没有 noindex）：上面任何一项变了都报出来，退出码 1
//   - 基准里本来就是 noindex 的页面：只提示，不算失败（没有排名可丢）
//   - 新增页面：只提示
//   - 只比较 SEO 字段，不管样式 / 脚本 / ?v= 版本号
//
// 用法：
//   node scripts/seo-guard.mjs               # 和 origin/main 比
//   node scripts/seo-guard.mjs <git-ref>     # 和指定分支 / 提交比
// 有意修改某个 SEO 字段时（比如优化标题），看清报告确认无误即可，脚本不会改任何文件。
// =============================================================================
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const BASE = process.argv[2] || "origin/main";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

// 去掉标签、合并空白、解 HTML 实体（只处理常见几个，够比较用）
function clean(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] ?? m[3]) : null;
}
function metaContent(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if ((attr(tag, "name") || "").toLowerCase() === name) return clean(attr(tag, "content"));
  }
  return null;
}

// 提取一个页面的 SEO 字段
function seoFields(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  const canonical = links.find((l) => (attr(l, "rel") || "").toLowerCase() === "canonical");
  const hreflang = links
    .filter((l) => (attr(l, "rel") || "").toLowerCase() === "alternate" && attr(l, "hreflang"))
    .map((l) => `${attr(l, "hreflang")}=${attr(l, "href")}`)
    .sort();
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => clean(m[1]));
  const jsonld = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].replace(/\s+/g, " ").trim());
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return {
    title: title ? clean(title[1]) : null,
    description: metaContent(html, "description"),
    robots: metaContent(html, "robots"),
    canonical: canonical ? attr(canonical, "href") : null,
    hreflang: hreflang.join(" | "),
    h1: h1.join(" | "),
    jsonld: jsonld.join(" || "),
  };
}
const isNoindex = (f) => /noindex/i.test(f.robots || "");

// 需要检查的页面：基准里的所有 HTML + 当前的所有 HTML（排除依赖目录）
const skip = (p) => /(^|\/)(node_modules|\.impeccable|\.claude|benchmark)\//.test(p);
const basePages = git("ls-tree", "-r", "--name-only", BASE).split("\n").filter((p) => p.endsWith(".html") && !skip(p));
const headPages = git("ls-files").split("\n").filter((p) => p.endsWith(".html") && !skip(p));
const all = [...new Set([...basePages, ...headPages])].sort();

const problems = [];
const notes = [];
let checked = 0;
for (const p of all) {
  const inBase = basePages.includes(p);
  const inHead = existsSync(p);
  if (!inBase) { notes.push(`新增页面：${p}`); continue; }
  const before = seoFields(git("show", `${BASE}:${p}`));
  if (!inHead) {
    (isNoindex(before) ? notes : problems).push(`页面被删除：${p}`);
    continue;
  }
  checked++;
  const after = seoFields(readFileSync(p, "utf8"));
  for (const key of Object.keys(before)) {
    if (before[key] === after[key]) continue;
    const line = `${p} → ${key}\n      之前：${before[key] ?? "（无）"}\n      现在：${after[key] ?? "（无）"}`;
    (isNoindex(before) ? notes : problems).push(line);
  }
}

// sitemap：基准里有的 URL 不能消失
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
let baseLocs = [];
try { baseLocs = locs(git("show", `${BASE}:sitemap.xml`)); } catch (_) { /* 基准没有 sitemap */ }
const headLocs = existsSync("sitemap.xml") ? locs(readFileSync("sitemap.xml", "utf8")) : [];
baseLocs.filter((u) => !headLocs.includes(u)).forEach((u) => problems.push(`sitemap 删除了 URL：${u}`));
headLocs.filter((u) => !baseLocs.includes(u)).forEach((u) => notes.push(`sitemap 新增 URL：${u}`));

console.log(`SEO 守卫：对比 ${BASE} ↔ 当前工作区`);
console.log(`检查 ${checked} 个已有页面，sitemap ${baseLocs.length} → ${headLocs.length} 个 URL\n`);
if (notes.length) {
  console.log("ℹ️  提示（不影响已有排名）：");
  notes.forEach((n) => console.log("  - " + n));
  console.log("");
}
if (problems.length) {
  console.log(`❌ 已收录页面的 SEO 字段有 ${problems.length} 处变化（请确认是否有意）：`);
  problems.forEach((n) => console.log("  - " + n));
  process.exit(1);
}
console.log("✅ 所有可被收录的已有页面：标题、描述、robots、canonical、hreflang、H1、结构化数据均未变化；sitemap 没有删除任何 URL。");
