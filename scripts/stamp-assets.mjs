#!/usr/bin/env node
/**
 * 静态资源缓存版本戳（cache-busting）脚本
 * ============================================================
 * 背景（踩坑记录）：
 *   output.css / app.js 的引用是固定 URL（href="/output.css"），文件名不带 hash。
 *   _headers 又给它们配了 max-age=86400 长缓存。结果：改了 CSS 重新部署后，
 *   浏览器和 Cloudflare 边缘在 24h 窗口内仍吐旧文件 —— 新 HTML 配旧 CSS，
 *   页面样式会错位（典型现象：语言切换器塌成默认渲染）。
 *
 * 解决办法：给引用 URL 追加内容 hash 查询串 `?v=<hash>`。
 *   - 文件内容变 → hash 变 → URL 变 → 浏览器/CDN 视作新资源，强制拉新版（自动失效）。
 *   - 文件内容没变 → hash 不变 → URL 不变 → 继续命中长缓存（不损失性能）。
 *   这样就能把 _headers 里 output.css / app.js 换成 immutable + 1 年长缓存。
 *
 * 为什么用查询串而不是改文件名（output.<hash>.css）：
 *   Cloudflare Pages 直接 serve 仓库文件、线上不构建，改文件名要同步重命名物理文件，
 *   还要处理 main.py 本地路由。查询串方案物理文件名不变，路由不用动，最省事。
 *   Cloudflare / 浏览器默认都把查询串纳入缓存 key，busting 效果与改文件名一致。
 *
 * 执行时机：必须在 build:css（生成最终 output.css）和 build:i18n（生成各语言 HTML）
 *   之后运行，对仓库里所有 .html 统一打戳。脚本幂等：会先剥掉旧的 ?v=，再写新的。
 *
 * 用法：
 *   node scripts/stamp-assets.mjs   或   npm run build:assets
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 需要打戳的资源：物理文件路径 + 在 HTML 里的引用属性。
// 只收 _headers 里走长缓存（max-age=86400）的那两个；language-menu.js / feedback.js
// 是 4h must-revalidate，自愈快，先不纳入（要加的话照此再补一项即可）。
const ASSETS = [
  { file: 'output.css', attr: 'href', url: '/output.css' },
  { file: 'app.js', attr: 'src', url: '/app.js' },
];

// 不扫描的目录：依赖、git、playwright 抓取产物
const IGNORE_DIRS = new Set(['node_modules', '.git', '.playwright-cli']);

/** 取文件内容的 8 位短 hash（sha256 前 8 hex），足够区分版本又不啰嗦 */
function hashFile(absPath) {
  const buf = readFileSync(absPath);
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

/** 递归收集所有 .html 文件绝对路径 */
function collectHtml(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collectHtml(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

// 1) 算出每个资源当前内容的 hash
const stamped = ASSETS.map((asset) => ({
  ...asset,
  hash: hashFile(join(ROOT, asset.file)),
}));
for (const a of stamped) console.log(`hash ${a.file} = ${a.hash}`);

// 2) 逐个 HTML 文件改写引用：把 attr="/url"（含可能已存在的 ?v=xxx）替换成 attr="/url?v=hash"
const htmlFiles = collectHtml(ROOT);
let changedCount = 0;

for (const file of htmlFiles) {
  let html = readFileSync(file, 'utf8');
  let touched = false;

  for (const { attr, url, hash } of stamped) {
    // 匹配 href="/output.css" 或 href="/output.css?v=旧hash"，统一替换成带新 hash 的版本
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${attr}=")${escapedUrl}(\\?v=[a-f0-9]+)?(")`, 'g');
    const next = html.replace(re, `$1${url}?v=${hash}$3`);
    if (next !== html) {
      html = next;
      touched = true;
    }
  }

  if (touched) {
    writeFileSync(file, html);
    changedCount += 1;
    console.log(`  stamped ${relative(ROOT, file)}`);
  }
}

console.log(`Done: stamped ${changedCount} HTML file(s).`);
