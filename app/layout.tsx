import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "チョコボスタリオン パスワードツール",
  description: "チョコボスタリオン（PS1）のパスワードを解析・生成するツール。能力値・名前・体色・習性などを確認できます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
