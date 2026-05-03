// 用 Playwright 把 scripts/og/template.html 渲染成 og/<slug>.png（1200×630）
// 跑法：
//   npm install -D playwright
//   npx playwright install chromium
//   npm run og
//
// 设计要点：
// - 输出固定 1200×630 PNG，符合 Facebook / X / LinkedIn 的 1.91:1 OG 卡片标准
// - deviceScaleFactor 用 1（不是 2），避免输出 2400×1260 让单文件超过 200KB；社交平台会自动压缩
// - 用 file:// 协议加载模板，所有素材走仓库内相对路径，离线也能跑
// - 通过 page.evaluate 把 config 注入 DOM，模板本身保持纯静态，方便直接用浏览器预览

import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const ogOutDir = join(repoRoot, 'og');
const templatePath = join(__dirname, 'template.html');
const configPath = join(__dirname, 'config.json');

const config = JSON.parse(await readFile(configPath, 'utf8'));

await mkdir(ogOutDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const templateUrl = pathToFileURL(templatePath).href;
// logo 路径相对仓库根目录，组装成 file:// 绝对 URL 注入到模板
const logoUrl = pathToFileURL(join(repoRoot, 'examples/logo-cutout.webp')).href;

for (const item of config) {
  await page.goto(templateUrl, { waitUntil: 'load' });

  const heroUrl = pathToFileURL(join(repoRoot, item.hero)).href;

  await page.evaluate(({ data, logoSrc, heroSrc }) => {
    document.getElementById('brand-logo').src = logoSrc;
    document.getElementById('hero').src = heroSrc;

    // 根据标题长度阶梯式调字号，确保 2 行内能完整显示
    // ~24 字符以内：60px（最饱满）；~30 字符：54px；更长：48px
    const titleEl = document.getElementById('title');
    titleEl.textContent = data.title;
    const len = data.title.length;
    titleEl.style.fontSize = len <= 24 ? '60px' : len <= 30 ? '54px' : '48px';

    document.getElementById('subtitle').textContent = data.subtitle;

    const bullets = document.getElementById('bullets');
    bullets.innerHTML = '';
    for (const text of data.bullets) {
      const span = document.createElement('span');
      span.className = 'bullet';
      span.innerHTML = `<span class="check">✓</span>${text}`;
      bullets.appendChild(span);
    }
  }, { data: item, logoSrc: logoUrl, heroSrc: heroUrl });

  // 等所有 <img> 都解码完，避免截到半张图
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((res, rej) => {
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', rej, { once: true });
            })
      )
    );
  });

  const out = join(ogOutDir, `${item.slug}.png`);
  await page.screenshot({
    path: out,
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  console.log(`✓ og/${item.slug}.png`);
}

await browser.close();
