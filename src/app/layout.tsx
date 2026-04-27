import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import { ContactWidget } from "@/components/ui/contact-widget";
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
  metadataBase: new URL("https://www.daplappliance.com"),
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
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <GoogleTagManager gtmId="GTM-M2RWZXK9" />
      <body className="min-h-full flex flex-col">
        {children}
        <ContactWidget />
      </body>
    </html>
  );
}
