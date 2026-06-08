/** @type {import('tailwindcss').Config} */
module.exports = {
  // 扫描首页 + 所有 use case 子页的 HTML，避免把后端 Python 文件里的字符串误识别为 class。
  // 新增子页时把对应 index.html 加进来即可。
  // dark mode 由 <html class="dark"> 控制（页面右上角主题切换按钮 toggle 这个 class）
  darkMode: 'class',
  safelist: ['open', 'show'],
  content: [
    './index.html',
    './app.js',
    './product-photo-background-remover/index.html',
    './portrait-background-remover/index.html',
    './id-photo-maker/index.html',
    './old-photo-restoration/index.html',
    './watermark-remover/index.html',
    './jpg-to-transparent-png/index.html',
    './png-to-jpg-white-background/index.html',
    './png-to-jpg-white-background/png-to-jpg.js',
    // 教程中心（How-To Guides）：纯静态英文页，Hub + 各 Spoke
    './how-to-remove-background/**/*.html',
    // 竞品替代页 + 法务页（纯静态英文页）
    './alternatives/**/*.html',
    './privacy/**/*.html',
    './terms/**/*.html',
    './feedback.js',
  ],
  theme: {
    extend: {
      // 品牌字体：自托管 Geist（可变字重 woff2，latin 子集，见 src/input.css 的 @font-face）。
      // 中文等非 latin 字符回退到系统 CJK 字体，不额外加载多兆体积的中文 web font。
      fontFamily: {
        sans: [
          'Geist', 'system-ui', '-apple-system', 'BlinkMacSystemFont',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial',
          'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif',
        ],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // 品牌强调色：锁定为 emerald 一个色系（原来 green/emerald 混用 + 散落 amber/blue/pink）。
      // 统一走 brand-* 语义令牌，红=错误、琥珀=警告保留作纯状态色，其余装饰色一律收敛。
      colors: {
        brand: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
          800: '#065f46', 900: '#064e3b', 950: '#022c22',
        },
      },
    },
  },
  plugins: [],
};
