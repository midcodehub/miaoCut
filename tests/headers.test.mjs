// _headers 的缓存规则检查：工作台里内容哈希命名的脚本块要长缓存 + immutable，HTML 页面不能。
//
// 背景（2026-11-06 实测）：工作台的脚本块文件名里带内容哈希（改了内容 → 名字变），但响应头是 Pages 默认的
// `max-age=14400, must-revalidate`：缓存超过 4 小时后，回访者每个文件都要发一次条件请求去问服务器有没有变；
// 链路差的时候这些请求每个要 1.4～1.8 秒（量到过“有缓存的回访”load 3.41 秒，比冷访问的 2.22 秒还慢）。
// 内容哈希命名的文件放 1 年 immutable 是安全的：内容变了名字就变，浏览器自然去拿新的。
// 不能 immutable 的是 HTML 页面：页面名字不变、里面引用的脚本块名字会变，必须每次都能拿到最新的。
// 运行：node --test tests/headers.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** 解析 _headers：返回 [{ pattern, headers: { 小写名: 值 } }]（Pages 的格式：顶格是路径，缩进的是头，# 开头是注释）。 */
function parse(text) {
  const rules = []; let current;
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) { current = { pattern: line.trim(), headers: {} }; rules.push(current); continue; }
    const [name, ...value] = line.trim().split(":");
    if (current) current.headers[name.trim().toLowerCase()] = value.join(":").trim();
  }
  return rules;
}
const rules = parse(readFileSync(path.join(root, "_headers"), "utf8"));
const rule = (pattern) => rules.find((item) => item.pattern === pattern);

test("the workbench's content-hashed chunks are cached for a year and marked immutable", () => {
  const chunks = rule("/workbench/_next/static/*");
  assert.ok(chunks, "a rule for /workbench/_next/static/* exists");
  assert.equal(chunks.headers["cache-control"], "public, max-age=31536000, immutable");
});

test("nothing that can name a changing page is immutable: HTML, the build manifest and the noindex rule stay as they were", () => {
  for (const item of rules) {
    if (item.pattern === "/workbench/_next/static/*") continue;
    if (/^\/workbench\/(\*|\S*\.html|\S*\/)$/.test(item.pattern) || item.pattern === "/workbench/*")
      assert.ok(!/immutable/.test(item.headers["cache-control"] || ""), `${item.pattern} must not be immutable`);
  }
  assert.equal(rule("/workbench/*").headers["x-robots-tag"], "noindex, nofollow", "the workbench is still not indexed");
});

test("the site's other long-cache rules are untouched", () => {
  for (const pattern of ["/output.css", "/app.js", "/editor/*", "/fonts/*"]) assert.equal(rule(pattern).headers["cache-control"], "public, max-age=31536000, immutable", pattern);
  assert.equal(rule("/*.webp").headers["cache-control"], "public, max-age=604800, must-revalidate", "images keep the one-week rule");
});
