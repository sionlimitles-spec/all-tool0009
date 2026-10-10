import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Komik Reader",
  description: "Baca manga dan manhwa Bahasa Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
