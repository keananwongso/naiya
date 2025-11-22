import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, Work_Sans } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Naiya | One Weekly Plan",
  description:
    "Turn classes, exams, and life commitments into a weekly calendar you can actually follow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:max-w-7xl">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#a9c3a2] to-[#2d4739] shadow-[0_10px_26px_rgba(45,71,57,0.35)]" />
              <span className="text-lg font-semibold text-[var(--foreground)]">Naiya</span>
            </div>
            <nav className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
              <Link
                href="/"
                className="rounded-full px-3 py-2 transition hover:bg-[rgba(45,71,57,0.08)]"
              >
                Home
              </Link>
              <Link
                href="/schedule"
                className="rounded-full px-3 py-2 transition hover:bg-[rgba(45,71,57,0.08)]"
              >
                Schedule
              </Link>
            </nav>
            <button className="rounded-full bg-[#2d4739] px-3 py-2 text-xs font-semibold text-[var(--background)] shadow-[0_14px_30px_rgba(45,71,57,0.28)] transition hover:bg-[#243a2e]">
              Quick chat
            </button>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
