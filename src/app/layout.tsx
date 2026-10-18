import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";
import { housecallProBookingScriptUrl } from "@/components/ui/housecall-pro-config";
import { CookieConsent } from "@/components/ui/cookie-consent";
import { GlobalWidgets } from "@/components/ui/global-widgets";
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
  title: "DAPL Appliance Repair | Charlotte, Greensboro & Winston-Salem",
  description:
    "Expert appliance repair in Charlotte, Greensboro, Winston-Salem, and surrounding NC areas. Same-day service, certified technicians, and affordable pricing.",
  keywords: [
    "appliance repair Charlotte NC",
    "refrigerator repair Charlotte",
    "washer and dryer repair Charlotte",
    "appliance repair Greensboro NC",
    "appliance repair Winston-Salem NC",
    "same day appliance repair",
    "DAPL Appliance Repair",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon1.png", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/icon1.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "DAPL Appliance Repair | We Fix It Right. The First Time.",
    description:
      "Expert appliance repair services in Charlotte, Greensboro, Winston-Salem, and surrounding NC areas.",
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
      <Script
        id="openai-pixel"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var choice=null;try{choice=w.localStorage.getItem("dapl_cookie_consent")}catch(error){}oaiq("consent",choice === "accepted");var j=d.createElement(s);j.async=true;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:"AtZ3qgzrgGSsLStxsnMGsp",debug:true});
          `,
        }}
      />
      <body className="min-h-full flex flex-col">
        <Script
          id="google-consent-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
              (function(){
                var choice = null;
                try {
                  choice = window.localStorage.getItem('dapl_cookie_consent');
                } catch (error) {}
                var granted = choice === 'accepted';
                var value = granted ? 'granted' : 'denied';
                window.gtag('consent', 'default', {
                  ad_storage: value,
                  ad_user_data: value,
                  ad_personalization: value,
                  analytics_storage: value,
                  wait_for_update: 500
                });
              })();
            `,
          }}
        />
        <Script
          id="ga-event-src"
          src="https://www.googletagmanager.com/gtag/js?id=G-KBVZ673NP2"
          strategy="afterInteractive"
        />
        <Script
          id="ga-event-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
              window.gtag('js', new Date());
              window.gtag('config', 'G-KBVZ673NP2', { send_page_view: false });
            `,
          }}
        />
        <Script
          id="housecall-pro-online-booking"
          src={housecallProBookingScriptUrl}
          strategy="afterInteractive"
        />
        {children}
        <Suspense fallback={null}>
          <GlobalWidgets />
        </Suspense>
        <CookieConsent />
      </body>
    </html>
  );
}
