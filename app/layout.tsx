import type { Metadata, Viewport } from "next";
import { Anek_Malayalam, Hanken_Grotesk, Inter, Noto_Sans_Malayalam } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { APP_NAME } from "@/config/brand";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const anek = Anek_Malayalam({ variable: "--font-anek", subsets: ["malayalam", "latin"], weight: ["500", "700", "800"], display: "swap" });
const noto = Noto_Sans_Malayalam({ variable: "--font-noto", subsets: ["malayalam", "latin"], weight: ["400", "500", "600", "700"], display: "swap" });
/** Free stand-in for Degular (modern bold grotesque). If the licensed Degular is installed on the device, the CSS stack picks it first. */
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${APP_NAME} | Plan the day. Prove the income.`, template: `%s | ${APP_NAME}` },
  description: "Daily buy-list, profit tracking and a shareable proof of income for street vendors.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  openGraph: {
    title: `${APP_NAME} - Plan the day. Prove the income.`,
    description: "Know how much to buy, know your profit, prove your income.",
    type: "website",
    siteName: APP_NAME,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#088178" },
    { media: "(prefers-color-scheme: dark)", color: "#032724" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ml" suppressHydrationWarning className={`${anek.variable} ${noto.variable} ${inter.variable} ${hanken.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
