/** @type {import('tailwindcss').Config} */
module.exports = {
  // 扫描首页 + 所有 use case 子页的 HTML，避免把后端 Python 文件里的字符串误识别为 class。
  // 新增子页时把对应 index.html 加进来即可。
  safelist: ['open', 'show'],
  content: [
    './index.html',
    './product-photo-background-remover/index.html',
    './portrait-background-remover/index.html',
    './id-photo-maker/index.html',
    './old-photo-restoration/index.html',
    './watermark-remover/index.html',
    './feedback.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
