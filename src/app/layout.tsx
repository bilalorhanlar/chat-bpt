import type { Metadata, Viewport } from "next";

import { Grain } from "@/components/fx/grain";
import { SITE } from "@/config/site";

import "./globals.css";

// Yazı tipi Helvetica: sistemde zaten var (macOS/iOS'ta Helvetica Neue,
// diğerlerinde Arial'a düşer). İndirilen web fontu yok — ilk boyama bedava.

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: "default", title: SITE.name },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full">
      <body className="relative flex min-h-full flex-col">
        <Grain />
        {children}
      </body>
    </html>
  );
}
