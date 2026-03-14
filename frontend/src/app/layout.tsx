import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perpustakaan Kuno",
  description: "Sistem perpustakaan digital dengan fitur peminjaman, chat, dan mading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0, background: "#06060f" }}>
        {children}
      </body>
    </html>
  );
}
