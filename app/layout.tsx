import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuraBloom } from "@/components/atmosphere/AuraBloom";
import { CursorTrail } from "@/components/atmosphere/CursorTrail";
import { SiteNav } from "@/components/nav/SiteNav";
import { StoreHydrator } from "@/components/StoreHydrator";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "SAMAYA — personal study platform",
  description:
    "A local-first study tracker: per-subject weekly progress, the Aura focus timer, and end-of-day reflection.",
};

export const viewport: Viewport = {
  themeColor: "#F2EDE4",
};

// Applies the persisted theme before first paint to avoid a flash.
const themeScript = `try{var q=new URLSearchParams(location.search).get("theme");var t=q||localStorage.getItem("aura-theme");if(t==="night")document.documentElement.setAttribute("data-theme","night")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${grotesk.variable} ${jetbrains.variable} grain min-h-dvh`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AuraBloom />
        <CursorTrail />
        <StoreHydrator />
        <div className="relative" style={{ zIndex: 1 }}>
          <SiteNav />
          <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
