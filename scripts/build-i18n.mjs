#!/usr/bin/env node
/**
 * 多语言 HTML 生成脚本
 * ============================================================
 * 把仓库里的英文 HTML 按 i18n 字典翻译，输出到各语言目录下，
 * 让每个语言都有独立 URL 给 Google 索引。
 *
 * 数据来源（两种 pattern）：
 *   - inline   : index.html / product-photo / portrait → <head> 内联 window.MIAOCUT_PAGE_I18N + MIAOCUT_PAGE_TITLES
 *                运行时由 app.js 合并 BASE_I18N 形成完整字典；本脚本同样读取并合并
 *   - js       : watermark-remover / old-photo-restoration / id-photo-maker
 *                字典定义在子页自己的 watermark.js / old-photo.js / id-photo.js 内
 *                这些 JS 不依赖 app.js 的 BASE_I18N；脚本只读它们各自的 i18n 对象
 *
 * 处理步骤（每个 zh 页面）：
 *   1. 读取 EN HTML
 *   2. 提取 zh 字典（按 pattern 选择数据源）
 *   3. 替换 [data-i18n] 元素的文本内容
 *   4. 替换 [data-i18n-ph] 元素的 placeholder
 *   5. 改写 <html lang>、<title>、meta description/keywords/og:* 标签
 *   6. 改写 <link rel="canonical"> 指向 /zh/... URL（self-canonical）
 *   7. 把内部链接 href="/foo" 改写成 href="/zh/foo"，资源链接（output.css/app.js/og/examples）保持不变
 *   8. 改写 JSON-LD 里的 url / item 字段指向 /zh/... URL
 *   9. 在 </head> 前插入 hreflang 集合（en / 各 locale / x-default）
 *  10. 写入 <locale>/<原路径>
 *
 * 同时给原 EN HTML 在 </head> 前补上同一组 hreflang，让各语言互相引用（必须是双向声明，
 * 否则 Google 会丢弃整个 alternate cluster）。
 *
 * 脚本是幂等的：再次运行会先把已有的 hreflang 块清掉再加，结果不会膨胀。
 *
 * 用法：
 *   node scripts/build-i18n.mjs
 * 或：
 *   npm run build:i18n
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ORIGIN = 'https://miaocut.app';

// ============================================================
// 语言注册表
// ============================================================
// code 用于 JS 字典 key 和 URL 目录名；htmlLang 写进 <html lang>；
// hreflang 写进 <link rel="alternate"> / sitemap；prefix 用于内链和 canonical。
const LOCALES = [
  { code: 'zh',    htmlLang: 'zh-CN',  hreflang: 'zh-CN',  prefix: '/zh',    dir: 'ltr' },
  { code: 'hi',    htmlLang: 'hi-IN',  hreflang: 'hi-IN',  prefix: '/hi',    dir: 'ltr' },
  { code: 'id',    htmlLang: 'id-ID',  hreflang: 'id-ID',  prefix: '/id',    dir: 'ltr' },
  { code: 'pt-br', htmlLang: 'pt-BR',  hreflang: 'pt-BR',  prefix: '/pt-br', dir: 'ltr' },
  { code: 'bn',    htmlLang: 'bn-BD',  hreflang: 'bn-BD',  prefix: '/bn',    dir: 'ltr' },
  { code: 'fil',   htmlLang: 'fil-PH', hreflang: 'fil-PH', prefix: '/fil',   dir: 'ltr' },
  { code: 'ur',    htmlLang: 'ur-PK',  hreflang: 'ur-PK',  prefix: '/ur',    dir: 'rtl' },
];

const LOCALE_PREFIXES = LOCALES
  .map((locale) => locale.prefix)
  .sort((a, b) => b.length - a.length);

// ============================================================
// 页面注册表
// ============================================================
// urlPath 用 / 结尾以匹配 Cloudflare Pages 的目录式路由
const PAGES = [
  // inline pattern：HTML 里有 MIAOCUT_PAGE_I18N + MIAOCUT_PAGE_TITLES，运行时合并 app.js 的 BASE_I18N
  { src: 'index.html',                                  dictSource: 'inline', urlPath: '/' },
  { src: 'product-photo-background-remover/index.html', dictSource: 'inline', urlPath: '/product-photo-background-remover/' },
  { src: 'portrait-background-remover/index.html',      dictSource: 'inline', urlPath: '/portrait-background-remover/' },
  { src: 'jpg-to-transparent-png/index.html',           dictSource: 'inline', urlPath: '/jpg-to-transparent-png/' },
  // js pattern：i18n 在子页自己的 JS 文件里
  { src: 'watermark-remover/index.html',     dictSource: 'js', jsFile: 'watermark-remover/watermark.js',     urlPath: '/watermark-remover/' },
  { src: 'old-photo-restoration/index.html', dictSource: 'js', jsFile: 'old-photo-restoration/old-photo.js', urlPath: '/old-photo-restoration/' },
  { src: 'id-photo-maker/index.html',        dictSource: 'js', jsFile: 'id-photo-maker/id-photo.js',         urlPath: '/id-photo-maker/' },
  { src: 'png-to-jpg-white-background/index.html', dictSource: 'js', jsFile: 'png-to-jpg-white-background/png-to-jpg.js', urlPath: '/png-to-jpg-white-background/' },
];

// ============================================================
// EN-only 页面注册表（教程中心 / How-To Guides）
// ============================================================
// 这些是纯静态英文页（不引 app.js、没有 zh 版本）。EN-first 策略下不生成 zh 镜像，
// 因此：
//   - 不进上面的 PAGES（那会强制提取 zh 字典并生成 /zh/... 镜像）
//   - 自指 canonical、不发 hreflang（只有一种语言版本时声明 alternate 反而有害）
//   - 只在 sitemap 里写单条 <loc>，不带 xhtml:link alternate 集合
// 将来某页要补中文，把它从这里挪进 PAGES、加 zh 字典即可。
const EN_ONLY_PAGES = [
  { urlPath: '/how-to-remove-background/',            changefreq: 'monthly', priority: '0.7' },
  { urlPath: '/how-to-remove-background/powerpoint/', changefreq: 'monthly', priority: '0.7' },
  { urlPath: '/how-to-remove-background/gimp/',       changefreq: 'monthly', priority: '0.7' },
  // 竞品替代页（外链落点）
  { urlPath: '/alternatives/remove-bg/',              changefreq: 'monthly', priority: '0.7' },
  // 法务页：参与索引但优先级低
  { urlPath: '/privacy/',                             changefreq: 'yearly',  priority: '0.3' },
  { urlPath: '/terms/',                               changefreq: 'yearly',  priority: '0.3' },
];

// 资源链接前缀，重写内链时跳过这些（它们只有英文版，不应改成 /zh/...）
const ASSET_PATH_PREFIXES = [
  '/output.css',
  '/app.js',
  '/language-menu.js',
  '/feedback.js',
  '/examples/',
  '/og/',
  '/fonts/',
  '/watermark-remover/watermark.js',
  '/old-photo-restoration/old-photo.js',
  '/id-photo-maker/id-photo.js',
  '/png-to-jpg-white-background/png-to-jpg.js',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon',
  // 教程中心是 EN-only（没有 zh 镜像）。zh 页 footer 里指向它的链接必须保持指向 EN 版，
  // 不能被改写成 /zh/how-to-remove-background/（那是不存在的 404）。
  '/how-to-remove-background',
  // 同理：竞品替代页、隐私、条款都是 EN-only，zh 页链接保持指向 EN 版。
  '/alternatives',
  '/privacy',
  '/terms',
];

// ============================================================
// JS 对象字面量提取
// ============================================================
// 用 RegExp 找到 `<keyword> <varName> = {` 的起始位置，再用括号深度匹配找到对应的 `}`，
// 切片后用 Function 构造器 eval 成 JS 对象。
// 这种做法对我们自己的源文件是安全的（不接受外部输入）。
function extractJsObjectLiteral(jsContent, varName) {
  const startRe = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\{`);
  const m = jsContent.match(startRe);
  if (!m) return null;
  const objStart = jsContent.indexOf('{', m.index);
  let depth = 0;
  let i = objStart;
  while (i < jsContent.length) {
    const ch = jsContent[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { i += 1; break; }
    }
    i += 1;
  }
  // eslint-disable-next-line no-new-func
  return new Function('return ' + jsContent.slice(objStart, i))();
}

// 提取 inline 页面的 PAGE 字典（zh 或 en）
function extractInlinePageDict(html, lang) {
  const m = html.match(/window\.MIAOCUT_PAGE_I18N\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return null;
  // eslint-disable-next-line no-new-func
  const obj = new Function('return ' + m[1])();
  return obj[lang] || null;
}

// 提取 inline 页面的 PAGE TITLES
function extractInlinePageTitle(html, lang) {
  const m = html.match(/window\.MIAOCUT_PAGE_TITLES\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return null;
  // eslint-disable-next-line no-new-func
  const obj = new Function('return ' + m[1])();
  return obj[lang] || null;
}

// 加载 app.js 里的 BASE_I18N（inline 页面运行时会和 PAGE_I18N 合并）
function loadBaseI18n() {
  const appJs = readFileSync(join(ROOT, 'app.js'), 'utf8');
  return extractJsObjectLiteral(appJs, 'BASE_I18N');
}

// ============================================================
// HTML 注释保护
// ============================================================
// 很多注释会写到 `<section data-i18n="faqTitle">` 这种字面 HTML 文本（提示开发者去改对应 section）。
// 我们的 data-i18n 替换是用正则跑的，看不出 "<" 在不在注释里，会贪婪吃到下一个真实 </section>，
// 把整个 head/body 边界都吃掉。所以处理前先把所有注释替换成占位符，处理完再还原。
function maskHtmlComments(html) {
  const comments = [];
  const masked = html.replace(/<!--[\s\S]*?-->/g, (match) => {
    const placeholder = ` HTMLCOMMENT${comments.length} `;
    comments.push(match);
    return placeholder;
  });
  return { masked, comments };
}

function unmaskHtmlComments(html, comments) {
  return html.replace(/ HTMLCOMMENT(\d+) /g, (_m, idx) => comments[Number(idx)]);
}

// ============================================================
// HTML 转换工具
// ============================================================
// 转义到 attribute 值里要把 " 也转，否则会破坏属性边界
function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// 转义到文本节点里只需要转 < & >（' 和 " 在文本节点里是安全的）
function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 把所有 [data-i18n="key"] 元素的内部文本替换为字典翻译
// 假设：data-i18n 都挂在叶子元素上（不嵌套同名子元素）。当前仓库符合这个约束。
function replaceDataI18nText(html, dict, missingKeys) {
  return html.replace(
    /(<([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*?\bdata-i18n="([^"]+)"[^<>]*?>)([\s\S]*?)(<\/\2>)/g,
    (match, openTag, _tagName, key, _content, closeTag) => {
      if (!Object.prototype.hasOwnProperty.call(dict, key)) {
        missingKeys.add(key);
        return match;
      }
      return openTag + escapeText(dict[key]) + closeTag;
    }
  );
}

// 把所有 [data-i18n-ph="key"] 元素的 placeholder 属性替换为字典翻译
function replaceDataI18nPlaceholder(html, dict, missingKeys) {
  return html.replace(
    /(<[a-zA-Z][a-zA-Z0-9]*\b[^<>]*?)\bplaceholder="([^"]*)"([^<>]*?\bdata-i18n-ph="([^"]+)"[^<>]*?>)/g,
    (match, before, _oldPh, after, key) => {
      if (!Object.prototype.hasOwnProperty.call(dict, key)) {
        missingKeys.add(key);
        return match;
      }
      return before + 'placeholder="' + escapeAttr(dict[key]) + '"' + after;
    }
  );
}

function replaceDataI18nAttribute(html, dict, missingKeys, attrName, dataAttrName) {
  const attrRe = new RegExp(
    `(<[a-zA-Z][a-zA-Z0-9]*\\b[^<>]*?)\\b${attrName}="([^"]*)"([^<>]*?\\b${dataAttrName}="([^"]+)"[^<>]*?>)`,
    'g'
  );
  return html.replace(attrRe, (match, before, _oldValue, after, key) => {
    if (!Object.prototype.hasOwnProperty.call(dict, key)) {
      missingKeys.add(key);
      return match;
    }
    return `${before}${attrName}="${escapeAttr(dict[key])}"${after}`;
  });
}

// 替换 meta 标签的 content
//   name 形如 "description" / "og:title"
function setMetaContent(html, name, value) {
  if (value === null || value === undefined || value === '') return html;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 同时支持 name="..." 和 property="..." 两种 meta 形式
  const re = new RegExp(
    `(<meta\\s+(?:name|property)="${escapedName}"[^>]*?\\bcontent=)"[^"]*"`,
    'g'
  );
  return html.replace(re, (_m, prefix) => prefix + '"' + escapeAttr(value) + '"');
}

function setHtmlLang(html, lang, dir = 'ltr') {
  const dirAttr = dir === 'rtl' ? ' dir="rtl"' : '';
  return html.replace(/<html\s+lang="[^"]*"(?:\s+dir="[^"]*")?/, `<html lang="${lang}"${dirAttr}`);
}

function setTitle(html, title) {
  if (!title) return html;
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeText(title)}</title>`);
}

function setCanonical(html, url) {
  return html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeAttr(url)}">`
  );
}

// 内链改写：href="/..." 或 src="/..." → 加上前缀 prefix（"/zh"）
// 跳过资源（output.css/app.js/og/examples 等）和外链
function rewriteInternalLinks(html, prefix) {
  return html.replace(/(\b(?:href|src)=")(\/[^"]*)"/g, (match, attrPrefix, path) => {
    if (path.startsWith('//')) return match; // protocol-relative
    if (ASSET_PATH_PREFIXES.some((ap) => path === ap || path.startsWith(ap))) return match;
    if (path.startsWith(`${prefix}/`) || path === prefix) return match; // 已经带 prefix（幂等）
    if (path === '/') return `${attrPrefix}${prefix}/"`;
    return `${attrPrefix}${prefix}${path}"`;
  });
}

function localizePath(path, prefix) {
  if (!prefix) return path;
  if (path === '/') return `${prefix}/`;
  return `${prefix}${path}`;
}

function stripLocalePrefix(path) {
  for (const prefix of LOCALE_PREFIXES) {
    if (path === prefix) return '/';
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || '/';
  }
  return path;
}

// 把 JSON-LD 里出现的所有本站 URL 改写成目标语言版本
// 处理两类字段：
//   "url": "https://miaocut.app/<path>"     (WebApplication, Organization)
//   "item": "https://miaocut.app/<path>"    (BreadcrumbList.itemListElement[])
// 已经是目标语言路径的不重复加；外部域名（github.com 等）不会被匹配到。
function rewriteJsonLdUrls(html, locale) {
  return html.replace(/(<script\s+type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (m, openTag, jsonText, closeTag) => {
    const rewritten = jsonText.replace(
      /("(?:url|item)"\s*:\s*"https:\/\/miaocut\.app)(\/[^"]*)"/g,
      (mm, prefix, path) => {
        if (path === locale.prefix || path.startsWith(`${locale.prefix}/`)) return mm;
        const basePath = stripLocalePrefix(path);
        return `${prefix}${localizePath(basePath, locale.prefix)}"`;
      }
    );
    return openTag + rewritten + closeTag;
  });
}

function localizeJsonLdStrings(html, sourceDict, localizedDict) {
  const replacements = new Map();
  for (const [key, sourceValue] of Object.entries(sourceDict || {})) {
    const localizedValue = localizedDict ? localizedDict[key] : null;
    if (typeof sourceValue === 'string' && typeof localizedValue === 'string' && localizedValue !== sourceValue) {
      replacements.set(sourceValue, localizedValue);
    }
  }
  if (!replacements.size) return html;

  const walk = (value) => {
    if (typeof value === 'string') return replacements.get(value) || value;
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, child] of Object.entries(value)) out[key] = walk(child);
      return out;
    }
    return value;
  };

  return html.replace(/(<script\s+type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (match, openTag, jsonText, closeTag) => {
    try {
      const parsed = JSON.parse(jsonText);
      return `${openTag}\n${JSON.stringify(walk(parsed), null, 4)}\n${closeTag}`;
    } catch (_) {
      return match;
    }
  });
}

// 在 </head> 前插入 hreflang 集合；先清掉已有的，保持幂等
//   en       → 英文版 URL
//   locales  → 各语言 URL
//   x-default→ 兜底（指向英文版，因为目标是 English-first，未匹配语言用户看英文）
function setHreflangBlock(html, urlPath) {
  const enUrl = ORIGIN + urlPath;
  const block = [
    `    <link rel="alternate" hreflang="en" href="${enUrl}">`,
    ...LOCALES.map((locale) => {
      const url = ORIGIN + localizePath(urlPath, locale.prefix);
      return `    <link rel="alternate" hreflang="${locale.hreflang}" href="${url}">`;
    }),
    `    <link rel="alternate" hreflang="x-default" href="${enUrl}">`,
  ].join('\n');
  // 先剥掉已有的 hreflang link（幂等）。
  // 注意：trailing 必须用 `[ \t]*\r?\n?` 而不是 `\s*\n?` —— 后者的 `\s*` 会贪婪吃掉下一行的
  // 缩进空格，导致下一行的 `^` 锚点失配，间隔行的 hreflang 不会被剥掉。
  const cleaned = html.replace(/^[ \t]*<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*>[ \t]*\r?\n?/gm, '');
  // 然后把 </head> 之前的所有空白都吃掉，再固定插入：1 个换行 + block + 1 个换行 + </head>。
  // 不用 $1 回填，避免每次运行都把残留空行越积越多。
  return cleaned.replace(/\s*<\/head>/, `\n${block}\n</head>`);
}

// ============================================================
// 主流程
// ============================================================
function generateLocaleFile(page, locale, dict, localizedTitle, sourceDict) {
  const srcPath = join(ROOT, page.src);
  const outRel = `${locale.code}/${page.src}`;
  const outPath = join(ROOT, outRel);
  const localeUrl = ORIGIN + localizePath(page.urlPath, locale.prefix);

  let html = readFileSync(srcPath, 'utf8');
  const missingKeys = new Set();

  // 0. 先把 HTML 注释替换成占位符，防止 data-i18n / meta 正则在注释里误匹配后吃掉整段 HTML
  const masked = maskHtmlComments(html);
  html = masked.masked;

  // 1. <html lang>
  html = setHtmlLang(html, locale.htmlLang, locale.dir);

  // 2. <title>：优先用 PAGE_TITLES.<locale>，再 fallback 到 ogTitle / pageTitle
  const titleText = localizedTitle || dict.ogTitle || dict.pageTitle;
  html = setTitle(html, titleText);

  // 3. data-i18n 文本 + placeholder
  html = replaceDataI18nText(html, dict, missingKeys);
  html = replaceDataI18nPlaceholder(html, dict, missingKeys);
  html = replaceDataI18nAttribute(html, dict, missingKeys, 'title', 'data-i18n-title');
  html = replaceDataI18nAttribute(html, dict, missingKeys, 'aria-label', 'data-i18n-aria');

  // 4. SEO / 分享卡片 meta
  html = setMetaContent(html, 'description', dict.metaDescription);
  html = setMetaContent(html, 'keywords', dict.metaKeywords);
  html = setMetaContent(html, 'og:title', dict.ogTitle || titleText);
  html = setMetaContent(html, 'og:description', dict.ogDescription || dict.metaDescription);
  html = setMetaContent(html, 'og:locale', dict.ogLocale);
  html = setMetaContent(html, 'og:url', localeUrl);

  // 5. canonical → 自指向当前 locale URL（每个 locale 自我 canonical，绝不跨 locale canonical，
  //    否则 Google 会忽略 hreflang 集群）
  html = setCanonical(html, localeUrl);

  // 6. 内链改写：所有 / 开头的非资源链接加上语言前缀
  html = rewriteInternalLinks(html, locale.prefix);

  // 7. JSON-LD 文案按 i18n 字典本地化，再把所有本站 url/item 改写到当前语言路径
  html = localizeJsonLdStrings(html, sourceDict, dict);
  html = rewriteJsonLdUrls(html, locale);

  // 8. hreflang 集合
  html = setHreflangBlock(html, page.urlPath);

  // 9. 还原 HTML 注释
  html = unmaskHtmlComments(html, masked.comments);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, 'utf8');

  return { outRel, missingKeys };
}

// 给 EN 文件补上 hreflang（幂等）。其他什么都不改。
// 这里也先 mask 注释 —— hreflang strip 正则不会在注释里误匹配，但保持一致更安全。
function annotateEnFile(page) {
  const srcPath = join(ROOT, page.src);
  let html = readFileSync(srcPath, 'utf8');
  const masked = maskHtmlComments(html);
  html = setHreflangBlock(masked.masked, page.urlPath);
  html = unmaskHtmlComments(html, masked.comments);
  writeFileSync(srcPath, html, 'utf8');
}

// ============================================================
// sitemap.xml 生成
// ============================================================
// 对每个页面生成 EN URL + 各语言 URL，每条带完整 xhtml:link alternate 集合（含自指）。
// 自指是 hreflang 协议要求的 —— 缺了 self-referencing 整组 alternate 都会被 Google 丢弃。
// changefreq 和 priority 保持和原 sitemap 一致；lastmod 用当天日期。
// 注意：每次跑都会覆盖 sitemap.xml，所以不要手动维护它。
function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 各页面的 changefreq + priority 沿用原 sitemap.xml 的设置；首页给 priority 1.0，
  // 其他子页 0.8/0.9。同时配上对应的 OG 图片（image:image），让 Google 图片搜索也能索引。
  const META = {
    '/':                                  { changefreq: 'daily',  priority: '1.0', ogImage: 'home.png',      imgTitle: 'MiaoCut — Free AI Background Remover Online' },
    '/product-photo-background-remover/': { changefreq: 'weekly', priority: '0.8', ogImage: 'product.png',   imgTitle: 'Product Photo Background Remover by MiaoCut AI' },
    '/portrait-background-remover/':      { changefreq: 'weekly', priority: '0.8', ogImage: 'portrait.png',  imgTitle: 'Portrait Background Remover by MiaoCut AI' },
    '/watermark-remover/':                { changefreq: 'weekly', priority: '0.9', ogImage: 'watermark.png', imgTitle: 'AI Object Eraser and Watermark Remover by MiaoCut' },
    '/old-photo-restoration/':            { changefreq: 'weekly', priority: '0.9', ogImage: 'old-photo.png', imgTitle: 'AI Old Photo Restoration by MiaoCut' },
    '/id-photo-maker/':                   { changefreq: 'weekly', priority: '0.9', ogImage: 'id-photo.png',  imgTitle: 'AI Passport & ID Photo Maker by MiaoCut' },
    '/jpg-to-transparent-png/':           { changefreq: 'weekly', priority: '0.8', ogImage: 'home.png',      imgTitle: 'JPG to Transparent PNG Converter by MiaoCut AI' },
    '/png-to-jpg-white-background/':      { changefreq: 'weekly', priority: '0.8', ogImage: 'home.png',      imgTitle: 'PNG to JPG Converter with Smart White Background by MiaoCut' },
  };

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];

  // 对每个页面写 EN + 各语言 <url>。每条的 xhtml:link 块完全相同（en、各 locale、x-default）。
  // 每条 url 同时挂一张 OG 图（image:image），让 Google Images 也能抓到。
  for (const page of PAGES) {
    const meta = META[page.urlPath] || { changefreq: 'weekly', priority: '0.7' };
    const enUrl = ORIGIN + page.urlPath;
    const localizedUrls = LOCALES.map((locale) => ({
      hreflang: locale.hreflang,
      url: ORIGIN + localizePath(page.urlPath, locale.prefix),
    }));
    const altBlock = [
      `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>`,
      ...localizedUrls.map((localeUrl) => (
        `    <xhtml:link rel="alternate" hreflang="${localeUrl.hreflang}" href="${localeUrl.url}"/>`
      )),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>`,
    ].join('\n');
    const imgBlock = meta.ogImage
      ? [
          `    <image:image>`,
          `      <image:loc>${ORIGIN}/og/${meta.ogImage}</image:loc>`,
          `      <image:title>${escapeText(meta.imgTitle || page.urlPath)}</image:title>`,
          `    </image:image>`,
        ].join('\n')
      : null;

    for (const url of [enUrl, ...localizedUrls.map((localeUrl) => localeUrl.url)]) {
      lines.push('  <url>');
      lines.push(`    <loc>${url}</loc>`);
      lines.push(`    <lastmod>${today}</lastmod>`);
      lines.push(`    <changefreq>${meta.changefreq}</changefreq>`);
      lines.push(`    <priority>${meta.priority}</priority>`);
      lines.push(altBlock);
      if (imgBlock) lines.push(imgBlock);
      lines.push('  </url>');
    }
  }

  // EN-only 教程页：单条 <loc>，自指语言，不带 xhtml:link alternate（没有其它语言版本）。
  for (const page of EN_ONLY_PAGES) {
    lines.push('  <url>');
    lines.push(`    <loc>${ORIGIN + page.urlPath}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>${page.changefreq}</changefreq>`);
    lines.push(`    <priority>${page.priority}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  lines.push(''); // 末尾换行

  writeFileSync(join(ROOT, 'sitemap.xml'), lines.join('\n'), 'utf8');
  return PAGES.length * (LOCALES.length + 1) + EN_ONLY_PAGES.length;
}

function main() {
  const baseI18n = loadBaseI18n();
  if (!baseI18n) {
    console.error('Failed to load BASE_I18N from app.js');
    process.exit(1);
  }

  const generated = [];
  const allWarnings = [];

  for (const page of PAGES) {
    const srcHtml = readFileSync(join(ROOT, page.src), 'utf8');
    annotateEnFile(page);

    for (const locale of LOCALES) {
      let pageDict = null;
      let sourceDict = null;
      let localizedTitle = null;

      if (page.dictSource === 'inline') {
        const sourceInlineDict = extractInlinePageDict(srcHtml, 'en');
        const inlineDict = extractInlinePageDict(srcHtml, locale.code);
        if (!sourceInlineDict || !inlineDict) {
          allWarnings.push(`${page.src}: 无法提取 inline MIAOCUT_PAGE_I18N.en/${locale.code}，跳过`);
          continue;
        }
        if (!baseI18n[locale.code]) {
          allWarnings.push(`app.js: BASE_I18N.${locale.code} 不存在，跳过 ${page.src}`);
          continue;
        }
        // 合并 BASE_I18N.<locale> + PAGE_I18N.<locale>，page 优先，与 app.js 运行时合并顺序一致
        sourceDict = { ...baseI18n.en, ...sourceInlineDict };
        pageDict = { ...baseI18n[locale.code], ...inlineDict };
        localizedTitle = extractInlinePageTitle(srcHtml, locale.code);
      } else if (page.dictSource === 'js') {
        const jsContent = readFileSync(join(ROOT, page.jsFile), 'utf8');
        const jsDict = extractJsObjectLiteral(jsContent, 'i18n');
        if (!jsDict || !jsDict.en || !jsDict[locale.code]) {
          allWarnings.push(`${page.src}: 无法从 ${page.jsFile} 提取 i18n.en/${locale.code}，跳过`);
          continue;
        }
        // js pattern 的页面不依赖 BASE_I18N，自己的 i18n.<locale> 已经是完整字典
        sourceDict = jsDict.en;
        pageDict = jsDict[locale.code];
        // 这类页面没有 PAGE_TITLES，<title> 走 dict.pageTitle / ogTitle
        localizedTitle = pageDict.pageTitle || pageDict.ogTitle || null;
      }

      // 警告：必填 SEO key 缺失
      const requiredSeo = ['metaDescription'];
      const missingSeo = requiredSeo.filter((k) => !pageDict[k]);
      if (missingSeo.length) {
        allWarnings.push(`${page.src}: ${locale.code} 字典缺少 SEO 关键 key [${missingSeo.join(', ')}]`);
      }

      const { outRel, missingKeys } = generateLocaleFile(page, locale, pageDict, localizedTitle, sourceDict);
      generated.push(outRel);

      if (missingKeys.size) {
        // 只警告页面专属 key 缺失（BASE_I18N 提供的 key 即使页面没用也算"缺失"，
        // 但这里 missingKeys 只收集真正在 HTML 里出现但字典里没有的 key）
        allWarnings.push(
          `${page.src}: 以下 data-i18n key 在 ${locale.code} 字典里没找到（保持英文）: ${[...missingKeys].sort().join(', ')}`
        );
      }
    }
  }

  console.log(`✓ 生成了 ${generated.length} 个多语言页面：`);
  generated.forEach((p) => console.log(`    ${p}`));

  // 生成包含 EN + 各语言 URL 的 sitemap，每条 url 都带完整 xhtml:link alternate 集合
  const urlCount = buildSitemap();
  console.log(`\n✓ 生成 sitemap.xml，共 ${urlCount} 个 URL（多语言页 EN+locales 带 hreflang；EN-only 教程页各一条）`);

  if (allWarnings.length) {
    console.log(`\n⚠ ${allWarnings.length} 条警告：`);
    allWarnings.forEach((w) => console.log(`    ${w}`));
  } else {
    console.log('\n✓ 没有翻译缺口');
  }
}

main();
