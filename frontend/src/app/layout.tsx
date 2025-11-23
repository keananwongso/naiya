import type { Metadata } from "next";
import { Space_Grotesk, Work_Sans } from "next/font/google";
import { Navbar } from "@/components/Navbar";
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
      <body
        className={`${display.variable} ${body.variable} antialiased flex flex-col h-screen w-screen overflow-hidden`}
      >
        <Navbar />
        <div className="flex-1 overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
