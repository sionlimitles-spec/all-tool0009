import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AllTool",
  description: "Kumpulan tools berguna",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
