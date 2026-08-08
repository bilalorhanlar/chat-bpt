import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { AuroraBackground } from "@/components/fx/aurora-background";
import { CursorGlow } from "@/components/fx/cursor-glow";
import { Grain } from "@/components/fx/grain";
import { SITE } from "@/config/site";

import "./globals.css";

// latin-ext alt kümesi Türkçe'ye özel harfleri (ş ğ ı İ ö ü ç) kapsıyor.
const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: "default", title: SITE.name },
};

export const viewport: Viewport = {
  themeColor: "#fbfaff",
  // Mobilde çift dokunuşla zoom'u kapatmıyoruz; erişilebilirlik için açık kalsın.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="relative flex min-h-full flex-col">
        <AuroraBackground />
        <Grain />
        <CursorGlow />
        {children}
      </body>
    </html>
  );
}
