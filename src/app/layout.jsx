import "./globals.css";

export const metadata = {
  title: "AllTool - 50+ Alat Digital Gratis",
  description: "Downloader TikTok, YouTube, temp mail, HTML editor, web to APK, dan 50+ tools gratis.",
  keywords: ["alltool", "tools", "downloader", "tiktok", "youtube", "temp mail", "web to apk"],
};

export const viewport = {
  width: "device-width", initialScale: 1, maximumScale: 5, themeColor: "#7c3aed",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
