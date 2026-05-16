# DAPL Project Context

## What this project is
- Marketing site for **Dapl Appliance Repair**
- Stack: **Next.js 16.2.4**, React 19, TypeScript, Tailwind 4, Framer Motion
- Production domain: **https://www.daplappliance.com**

## Key routes
- `/` - main landing page
- `/refrigerator-repair-charlotte-nc` - first fully built SEO service page
- `/washer-repair-charlotte-nc` - second fully built SEO service page
- `/dryer-repair-charlotte-nc` - third fully built SEO service page
- `/dishwasher-repair-charlotte-nc` - fourth fully built SEO service page
- `/oven-repair-charlotte-nc` - fifth fully built SEO service page
- `/cooktop-repair-charlotte-nc` - sixth fully built SEO service page
- `/freezer-repair-charlotte-nc` - seventh fully built SEO service page
- `/ice-machine-repair-charlotte-nc` - eighth fully built SEO service page
- `/wine-cooler-repair-charlotte-nc` - ninth fully built SEO service page
- `/commercial-refrigerator-repair-charlotte-nc` - tenth fully built SEO service page
- `/appliance-repair-charlotte-nc` - city/service-area page for Charlotte, NC
- `/appliance-repair-matthews-nc` - city/service-area page for Matthews, NC
- `/appliance-repair-huntersville-nc` - city/service-area page for Huntersville, NC
- `/appliance-repair-fort-mill-sc` - city/service-area page for Fort Mill, SC
- `/appliance-repair-waxhaw-nc` - city/service-area page for Waxhaw, NC
- `/appliance-repair-concord-nc` - city/service-area page for Concord, NC
- `/appliance-repair-cornelius-nc` - city/service-area page for Cornelius, NC
- `/appliance-repair-davidson-nc` - city/service-area page for Davidson, NC
- `/appliance-repair-weddington-nc` - city/service-area page for Weddington, NC
- `/appliance-repair-rock-hill-sc` - city/service-area page for Rock Hill, SC
- `/booking` - standalone booking page for Google Business Profile booking link and ad traffic
- `/returning-customer-offer` - hidden offer page for repeat customers
- `/api/contact` - form submission endpoint via Resend
- `/privacy-policy` - privacy policy page for website, analytics, cookies, and contact-data handling
- `/robots.txt` - generated from `src/app/robots.ts`
- `/sitemap.xml` - generated from `src/app/sitemap.ts`

## Important environment variables
For production / Vercel:

```env
RESEND_API_KEY=...
CONTACT_TO_EMAIL=dapl.appliance.repair@gmail.com
CONTACT_FROM_EMAIL=Dapl Website <noreply@daplappliance.com>
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_LEADS_TABLE=leads
LEADS_ADMIN_PASSWORD=...
LEADS_ADMIN_SESSION_SECRET=...
```

For local development, create `.env.local` with the same keys if you want the form to work on `localhost`.

## Analytics / tracking status
- Google Analytics 4 web stream has been created
- Measurement ID: `G-KBVZ673NP2`
- Google Tag Manager container has been created
- GTM container ID: `GTM-M2RWZXK9`
- GTM is mounted globally from `src/app/layout.tsx` via `@next/third-parties/google`
- A lightweight direct `gtag.js` loader is also mounted in `src/app/layout.tsx` with `send_page_view: false`, so direct GA4 events can be sent without duplicating page views already handled by GTM
- Next tracking step is inside GTM itself:
  - add a GA4 / Google tag using `G-KBVZ673NP2`
  - publish the container
  - then set up conversion events for form submit, phone click, and schedule click
- Site-side GTM events are now emitted for:
  - `generate_lead` on successful form submit
  - `phone_click` from hero, service-page CTA, contact form, and contact widget
  - `schedule_click` from homepage hero, service-page hero, and contact widget
- `generate_lead` is also sent directly to GA4 from `src/components/sections/contact-section.tsx` as a reliability fallback

## Resend status
- Resend domain **daplappliance.com** is already verified
- Contact form is configured to send email through Resend
- If local form shows `Add RESEND_API_KEY to your server environment`, that means `.env.local` is missing or the dev server needs a restart

## Telegram notifications
- Telegram delivery is supported in `src/app/api/contact/route.ts`
- If `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set, each new lead is also sent to Telegram
- Email and Telegram now work as parallel notification channels
- The request succeeds if at least one notification channel delivers successfully

## Supabase lead storage
- Supabase lead storage is supported as an optional first step toward a mini CRM / invoice workflow
- SQL schema lives in `supabase/schema.sql`
- Server helper lives in `src/lib/supabase-leads.ts`
- `src/app/api/contact/route.ts` attempts to save every validated lead to Supabase before sending email / Telegram notifications
- Required environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_LEADS_TABLE` (defaults to `leads`)
- Supabase storage is optional for now. If it is not configured or insert fails, the form can still deliver through email / Telegram.
- The service role key must remain server-only and must never be exposed with a `NEXT_PUBLIC_` prefix.
- Because automatic table exposure was disabled in Supabase, `public.leads` must explicitly grant `usage` on `public` plus `select, insert, update` on the table to `service_role`.

## Leads admin dashboard
- Admin entry point: `/admin/leads`
- Login page: `/admin/leads/login`
- `/admin` redirects to `/admin/leads`
- Admin routes are marked `noindex, nofollow` via `src/app/admin/layout.tsx`
- The floating contact widget is hidden on `/admin` routes
- Auth is intentionally simple for the first CRM step:
  - `LEADS_ADMIN_PASSWORD` is required in Vercel
  - `LEADS_ADMIN_SESSION_SECRET` is optional but recommended
  - the session cookie is httpOnly, scoped to `/admin`, and lasts 8 hours
- The dashboard reads the newest leads from Supabase and can update lead statuses:
  - `new`
  - `contacted`
  - `confirmed`
  - `invoiced`
  - `completed`
  - `cancelled`
- The dashboard also supports first-pass CRM fields on each lead:
  - `admin_notes`
  - `scheduled_date`
  - `estimated_price`
  - `assigned_technician`
- If those fields are missing in Supabase, run the latest `supabase/schema.sql` or at least the `alter table public.leads add column if not exists ...` block from that file.

## Main implemented features

### Navigation / header
- Header links use homepage anchors, so they work both on the homepage and on the hidden offer page:
  - `/#offer`
  - `/#appliances`
  - `/#brands`
  - `/#why-us`
  - `/#faq`
- Header `Booking` link now points to the standalone `/booking` page instead of `/#contact`
- Header logo can point either to top-of-page or back to `/`, depending on the page
- `Appliances` in the desktop header opens a hover/focus dropdown with direct links to all service pages
- `Appliances` in the mobile/tablet burger menu opens as an accordion with a plus icon and the same service-page links

### Homepage hero
- Main homepage hero now fills the viewport height minus the sticky header
- It includes a standalone down-arrow button below the main CTAs that scrolls to `#offer` on `xl+`; the arrow is intentionally hidden on mobile/tablet widths to keep the first screen cleaner
- The main hero image now uses `public/hero-placeholder.webp` instead of the original heavy PNG. The WebP is about 159 KB vs the old PNG at about 2.37 MB.
- `src/components/sections/hero.tsx` marks the hero image as `priority` and provides responsive `sizes` to improve LCP/PageSpeed behavior.

### Reviews / trust section
- `src/components/sections/reviews-section.tsx` contains the selected carousel-style reviews section
- The homepage imports it, but `REVIEWS_SECTION_ENABLED` in `src/app/page.tsx` is currently `false`, so the section is not visible on the live site
- Before enabling it, replace sample review text with real Google reviews, set the real Google Business Profile reviews URL, and update the manual Google rating/review count
- Review carousel behavior: mobile uses swipe and a next-card peek; desktop/tablet shows arrow controls

### Brands section
- Brand logos are loaded from `public/brands/`
- Desktop: infinite forward-only marquee
- Mobile: swipeable horizontal list with center-peek behavior
- Main file: `src/components/sections/brands.tsx`
- Homepage brand logos now link to dedicated brand SEO pages under `/brands/...`

### Brand SEO pages
- A brand repair cluster exists for 8 major brands:
  - Whirlpool
  - GE
  - Samsung
  - LG
  - KitchenAid
  - Bosch
  - Frigidaire
  - Maytag
- Routes live under:
  - `src/app/brands/[brandSlug]/page.tsx`
- Supporting content lives in:
  - `src/content/brand-pages.ts`
- Shared page renderer lives in:
  - `src/components/brand-pages/brand-page-template.tsx`
- Current brand page URLs:
  - `/brands/whirlpool-appliance-repair-charlotte-nc`
  - `/brands/ge-appliance-repair-charlotte-nc`
  - `/brands/samsung-appliance-repair-charlotte-nc`
  - `/brands/lg-appliance-repair-charlotte-nc`
  - `/brands/kitchenaid-appliance-repair-charlotte-nc`
  - `/brands/bosch-appliance-repair-charlotte-nc`
  - `/brands/frigidaire-appliance-repair-charlotte-nc`
  - `/brands/maytag-appliance-repair-charlotte-nc`
- Each brand page includes custom metadata, Service schema, BreadcrumbList schema, FAQPage schema, unique issue cards, appliance category links, related brand links, and a brand-specific contact form lead source.
- Brand pages are included in `src/app/sitemap.ts`.
- Footer includes compact brand repair links for internal linking.
- Service page brand-logo cards now link to the matching brand repair page.

### Offer section
- Offer timer uses **America/New_York** time
- Active window:
  - starts at **2:00 AM**
  - ends at **9:00 PM**
- During active window: `Offer ends in`
- Outside active window: `Offer ended` + `Next offer soon`
- Main file: `src/components/sections/offer.tsx`

### Contact forms
- Main form and offer-page form are powered by the same reusable component:
  - `src/components/sections/contact-section.tsx`
- Features:
  - address field required
  - appliance can be preselected via `defaultAppliance`
  - promo code field optional
  - preferred date cannot be in the past
  - hidden honeypot field
  - support for `leadSource`
  - backend can notify via both email and Telegram

### Service pages
- First service pages live in code:
  - `src/app/refrigerator-repair-charlotte-nc/page.tsx`
  - `src/app/washer-repair-charlotte-nc/page.tsx`
  - `src/app/dryer-repair-charlotte-nc/page.tsx`
  - `src/app/dishwasher-repair-charlotte-nc/page.tsx`
  - `src/app/oven-repair-charlotte-nc/page.tsx`
  - `src/app/cooktop-repair-charlotte-nc/page.tsx`
  - `src/app/freezer-repair-charlotte-nc/page.tsx`
  - `src/app/ice-machine-repair-charlotte-nc/page.tsx`
  - `src/app/wine-cooler-repair-charlotte-nc/page.tsx`
  - `src/app/commercial-refrigerator-repair-charlotte-nc/page.tsx`
- Supporting content lives in:
  - `src/content/service-pages.ts`
- Shared page renderer lives in:
  - `src/components/service-pages/service-page-template.tsx`
- Refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, ice machine, wine cooler, and commercial refrigerator cards on the homepage now link to their service pages
- Homepage appliance card images use responsive `sizes` tuned to the actual grid widths, so mobile/tablet browsers do not request unnecessarily large image variants.
- Each service page includes:
  - custom metadata
  - Service schema
  - BreadcrumbList schema
  - FAQPage schema
  - local SEO copy for Charlotte, NC
  - unique short descriptions for every `commonIssues` card, stored as `{ title, text }` objects in `src/content/service-pages.ts`, to avoid repeated boilerplate like "showing signs like this" across service pages
  - preselected appliance in the contact form
  - service-specific lead source
  - a shared internal-linking section to other appliance service pages
  - curated related-service ordering, so nearby appliances are shown first in the carousel
  - a shared brand section with calmer, more universal copy across all appliance types
  - a first hero section sized to the viewport height minus the sticky header, so the opening screen reads as a full service-page hero
  - the old `View details` text cue was replaced by a larger standalone down-arrow button positioned below the main CTAs; like the homepage, it is hidden on mobile and shown on `md+`
  - a mobile related-services carousel with centered snap behavior, a visible swipe hint, and narrower card widths so the next card peeks in on smaller phones
  - the `Local Service` hero card now uses transparent appliance PNGs without the old gray tile background on both mobile and desktop; desktop images use a soft drop shadow and keep their natural height instead of being forced into a square box

### Service area / city pages
- A city/service-area cluster now exists for 10 local markets:
  - Charlotte, NC
  - Matthews, NC
  - Huntersville, NC
  - Fort Mill, SC
  - Waxhaw, NC
  - Concord, NC
  - Cornelius, NC
  - Davidson, NC
  - Weddington, NC
  - Rock Hill, SC
- Content lives in:
  - `src/content/service-areas.ts`
- Shared renderer lives in:
  - `src/components/service-areas/service-area-page-template.tsx`
- Dynamic route lives in:
  - `src/app/[serviceAreaSlug]/page.tsx`
- Each city page includes:
  - unique title / description / keywords
  - city-specific intro copy
  - local route notes
  - common appliance needs for that city
  - FAQPage schema
  - Service schema with city-specific `areaServed`
  - links to nearby city pages
  - links to all main appliance service pages
  - city-specific `leadSource` in the contact form
- Footer uses a compact Service Areas row under the main footer contact columns, with all 10 city pages linked as small wrapping text links instead of a tall card or vertical list.

### Returning customer offer page
- Route: `/returning-customer-offer`
- Purpose: separate landing page for repeat-customer promo
- It is intentionally hidden from organic indexing:
  - removed from `sitemap.ts`
  - `robots: { index: false, follow: false }`
- Promo code prefilled as `RETURN15`
- Form on this page is separate in behavior, but reuses the shared contact component
- Mobile promo card now stacks text and logo vertically instead of squeezing them side-by-side
- It tags submissions with:

```text
leadSource: returning-customer-offer
promoCode: RETURN15
```

### Booking page
- Route: `/booking`
- Purpose:
  - clean booking URL for Google Business Profile instead of `/#contact`
  - dedicated scheduling page for paid traffic and direct links
  - visible contact details, hours, service areas, and the shared request form
- Uses the shared contact form component with:

```text
leadSource: booking-page
```

- Includes booking-focused WebPage and BreadcrumbList structured data
- Sitemap includes `/booking`
- `/contact` redirects permanently to `/booking` from `next.config.ts`

### FAQ
- FAQ section exists on the homepage
- FAQPage structured data is also included for SEO
- Files:
  - `src/components/sections/faq.tsx`
  - `src/components/sections/faq-data.ts`

### 404 page
- Custom 404 page exists at `src/app/not-found.tsx`
- Purpose: turn broken links into a useful conversion page instead of a dead end
- Current content includes:
  - `Schedule Service` CTA
  - `Back to Home`
  - click-to-call button
  - trust chips
  - quick links to key sections
  - compact contact/help block

### Privacy / legal page
- A dedicated privacy policy page now exists at `src/app/privacy-policy/page.tsx`
- It covers:
  - business identity linking the public brand name **Dapl Appliance Repair** to the legal operator **DAPL Honcharos Appliance Service Corp**
  - contact form submissions
  - analytics and cookies
  - lead notifications
  - basic service-provider sharing language
  - user contact/update requests
- The footer now links to `/privacy-policy`
- The footer also includes the short legal identity line: `Dapl Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.`

### Shared scroll controls
- Service pages have a standalone down-arrow cue in the hero that scrolls to the next section
- The old floating `scroll to top` button has been replaced with a shared floating contact widget:
  - `src/components/ui/contact-widget.tsx`
- It is mounted from `src/app/layout.tsx`
- The widget opens three actions:
  - `Call`
  - `Schedule`
  - `Top`
- The widget is currently in a more branded minimal variant:
  - compact dark-blue circular trigger
  - small red notification dot
  - white floating action panel with a thin red accent rail
  - calmer row-style actions instead of heavy standalone pills
  - stable inline SVG icons for phone, schedule, and top actions so the UI renders consistently across Windows, iOS, and Android

## SEO work already done
- `metadataBase` set to `https://www.daplappliance.com`
- title / description / keywords configured
- canonical configured for homepage
- Open Graph metadata present
- `robots.ts` added
- `sitemap.ts` added
- `LocalBusiness` schema added
- `FAQPage` schema added
- sitemap includes:
  - homepage
  - booking page
  - privacy policy page
  - refrigerator repair page
  - washer repair page
  - dryer repair page
  - dishwasher repair page
  - oven repair page
  - cooktop repair page
  - freezer repair page
  - ice machine repair page
  - wine cooler repair page
  - commercial refrigerator repair page
  - all 10 city/service-area pages
  - all 8 brand repair pages
- some image `alt` text improved for accessibility and SEO

## Favicon / icon status
- Main icon files are in `src/app/`
- Current setup uses:
  - `src/app/icon.png` - 512x512 PNG generated from the main site logo
  - `src/app/icon1.png` - 96x96 PNG generated from the main site logo
  - `src/app/favicon-96x96.png` - 96x96 copy of the same logo icon kept for compatibility/context
- `layout.tsx` points icon metadata to `/icon.png` (`512x512`) and `/icon1.png` (`96x96`), with shortcut using `/icon1.png`
- Browsers may keep showing the old icon because of aggressive favicon cache; hard refresh / incognito / waiting after deploy may be needed

## Files worth knowing first
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/not-found.tsx`
- `src/app/refrigerator-repair-charlotte-nc/page.tsx`
- `src/app/washer-repair-charlotte-nc/page.tsx`
- `src/app/dryer-repair-charlotte-nc/page.tsx`
- `src/app/dishwasher-repair-charlotte-nc/page.tsx`
- `src/app/oven-repair-charlotte-nc/page.tsx`
- `src/app/cooktop-repair-charlotte-nc/page.tsx`
- `src/app/freezer-repair-charlotte-nc/page.tsx`
- `src/app/ice-machine-repair-charlotte-nc/page.tsx`
- `src/app/wine-cooler-repair-charlotte-nc/page.tsx`
- `src/app/commercial-refrigerator-repair-charlotte-nc/page.tsx`
- `src/app/returning-customer-offer/page.tsx`
- `src/app/api/contact/route.ts`
- `src/content/service-pages.ts`
- `src/content/service-areas.ts`
- `src/components/service-pages/service-page-template.tsx`
- `src/components/service-areas/service-area-page-template.tsx`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/components/sections/header.tsx`
- `src/components/sections/contact-section.tsx`
- `src/components/sections/offer.tsx`
- `src/components/sections/brands.tsx`
- `src/components/sections/faq.tsx`

## Current SEO / launch checklist
Still worth doing or verifying:

1. Deploy latest changes to Vercel
2. Submit `https://www.daplappliance.com/sitemap.xml` in Google Search Console
3. Request indexing for:
   - `/`
   - `/booking`
4. Finish / verify Google Business Profile
5. Add a real reviews/testimonials section using real customer feedback only
6. Review the new city/service-area pages after deploy and request indexing for the most important markets first

## Good things to tell the next chat
- This is an actively customized Next.js landing site, not a fresh template
- The hidden offer page already exists and should not be removed
- The custom 404 page is already built and should stay conversion-focused
- The contact form already supports `promoCode` and `leadSource`
- Resend is wired up and the domain is verified
- Be careful not to break homepage anchor navigation from secondary pages

## Maintenance note
- Keep this file updated when adding new routes, SEO changes, form behavior, domain/email settings, or important UI flows
-
