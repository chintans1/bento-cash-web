import type { Metadata, Viewport } from "next";
import { Geist_Mono, Public_Sans, Playfair_Display } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TokenProvider } from "@/hooks/use-token";
import { AppDataProvider } from "@/hooks/use-app-data";
import { Header } from "@/components/header";
import { SessionGate } from "@/components/session-gate";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";

const fontHeading = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

const fontSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Bento Cash",
    template: "%s · Bento Cash",
  },
  description:
    "A richer analytics interface for Lunch Money — spending insights, net worth and fast transaction editing.",
};

export const viewport: Viewport = {
  // Matches --background in each theme, so mobile browser chrome blends in.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1113" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        fontMono.variable,
        fontHeading.variable
      )}
    >
      <body>
        <ThemeProvider>
          <TokenProvider>
            <AppDataProvider>
              <Header />
              <SessionGate>{children}</SessionGate>
            </AppDataProvider>
          </TokenProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
