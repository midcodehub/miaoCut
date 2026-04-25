/** @type {import('tailwindcss').Config} */
module.exports = {
  // 只扫描 index.html，避免把后端 Python 文件里的字符串误识别为 class
  content: ['./index.html'],
  theme: {
    extend: {},
  },
  plugins: [],
};
