import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "商品场景工作台 · MiaoCut",
  description: "MiaoCut 商品场景工作台交互演示。选择场景、调整构图并导出本地示意图。",
  robots: { index: false, follow: false },
};

const theme = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch{}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: theme }} /></head>
      <body>{children}</body>
    </html>
  );
}
