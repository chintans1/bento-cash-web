import { Geist_Mono, Public_Sans, Playfair_Display } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TokenProvider } from "@/hooks/use-token";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";

const playfairDisplayHeading = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        publicSans.variable,
        playfairDisplayHeading.variable
      )}
    >
      <body>
        <ThemeProvider>
          <TokenProvider>
            <Header />
            <main>{children}</main>
          </TokenProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
