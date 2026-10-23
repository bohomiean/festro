import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { FestProvider } from "@/components/FestProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-sans" });
const serif = Fraunces({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Festro · ORACLE 2026",
  description: "Live schedule, delays and an AI assistant for ORACLE 2026.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3E4763",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <FestProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </FestProvider>
      </body>
    </html>
  );
}
