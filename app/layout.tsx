import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "TAA 網球團體賽 | TAA Tennis Team Tournament",
  description: "Live scores for the TAA tennis team tournament",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
