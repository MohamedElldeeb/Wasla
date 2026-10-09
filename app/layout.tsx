import type { Metadata } from "next";
import { Readex_Pro, IBM_Plex_Sans_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ar } from "@/lib/i18n/ar";
import "./globals.css";

const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: ar.brand.name, template: `%s | ${ar.brand.name}` },
  description: ar.brand.tagline,
  icons: { icon: "/brand/wasla-logo-mark.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${readex.variable} ${plexArabic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" dir="rtl" />
      </body>
    </html>
  );
}
