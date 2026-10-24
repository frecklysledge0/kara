import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoBanner } from "@/components/common/DemoBanner";
import { AuthProvider } from "@/components/auth/AuthProvider";

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-[#F8F9FB] text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
        <AuthProvider>
          <DemoBanner />
          <Suspense fallback={<div className="h-14 border-b border-slate-200 bg-white" />}>
            <Header />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
