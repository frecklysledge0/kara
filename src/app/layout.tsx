import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { AppChrome } from "@/components/layout/AppChrome";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { themeBootScript } from "@/components/layout/ThemeToggle";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MillProof | Enterprise B2B Steel Marketplace & Verification",
  description:
    "Source steel with confidence. Translate engineering requirements into standard ASTM grades, compare delivered inventory costs, and verify material test certificates with mathematical certainty.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies a saved light/dark choice before first paint (see ThemeToggle.tsx). */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen flex flex-col bg-[#F8F9FB] text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
        <AuthProvider>
          <Suspense fallback={<div className="workspace-loading" role="status">Opening MillProof… <Link href="/">Return to Find Steel</Link></div>}>
            <AppChrome>{children}</AppChrome>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
