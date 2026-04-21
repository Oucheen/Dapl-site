import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.daplrepair.com"),
  title: "Dapl Appliance Repair | Appliance Repair in Charlotte, NC",
  description:
    "Expert appliance repair in Charlotte, NC and surrounding areas. Same-day service, certified technicians, and affordable pricing.",
  keywords: [
    "appliance repair Charlotte NC",
    "refrigerator repair Charlotte",
    "washer and dryer repair Charlotte",
    "same day appliance repair",
    "Dapl Appliance Repair",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Dapl Appliance Repair | We Fix It Right. The First Time.",
    description:
      "Expert appliance repair services in Charlotte, NC and surrounding areas.",
    type: "website",
    locale: "en_US",
    url: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
