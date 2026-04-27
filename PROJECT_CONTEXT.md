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
- `/returning-customer-offer` - hidden offer page for repeat customers
- `/api/contact` - form submission endpoint via Resend
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
```

For local development, create `.env.local` with the same keys if you want the form to work on `localhost`.

## Resend status
- Resend domain **daplappliance.com** is already verified
- Contact form is configured to send email through Resend
- If local form shows `Add RESEND_API_KEY to your server environment`, that means `.env.local` is missing or the dev server needs a restart

## Telegram notifications
- Telegram delivery is supported in `src/app/api/contact/route.ts`
- If `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set, each new lead is also sent to Telegram
- Email and Telegram now work as parallel notification channels
- The request succeeds if at least one notification channel delivers successfully

## Main implemented features

### Navigation / header
- Header links use homepage anchors, so they work both on the homepage and on the hidden offer page:
  - `/#offer`
  - `/#appliances`
  - `/#brands`
  - `/#why-us`
  - `/#faq`
  - `/#contact`
- Header logo can point either to top-of-page or back to `/`, depending on the page

### Brands section
- Brand logos are loaded from `public/brands/`
- Desktop: infinite forward-only marquee
- Mobile: swipeable horizontal list with center-peek behavior
- Main file: `src/components/sections/brands.tsx`

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
- Each service page includes:
  - custom metadata
  - Service schema
  - BreadcrumbList schema
  - FAQPage schema
  - local SEO copy for Charlotte, NC
  - preselected appliance in the contact form
  - service-specific lead source
  - a shared internal-linking section to other appliance service pages
  - curated related-service ordering, so nearby appliances are shown first in the carousel
  - a shared brand section with calmer, more universal copy across all appliance types
  - a mobile related-services carousel with centered snap behavior, a visible swipe hint, and narrower card widths so the next card peeks in on smaller phones
  - a mobile-safe `Local Service` hero card layout that uses a faint ghosted appliance image in the top-right on phones, with extra right padding so the copy stays readable

### Returning customer offer page
- Route: `/returning-customer-offer`
- Purpose: separate landing page for repeat-customer promo
- Promo code prefilled as `RETURN15`
- Form on this page is separate in behavior, but reuses the shared contact component
- It tags submissions with:

```text
leadSource: returning-customer-offer
promoCode: RETURN15
```

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

### Shared scroll controls
- Service pages have a soft `View details` cue in the hero that scrolls to the next section
- A shared floating `scroll to top` button now lives in:
  - `src/components/ui/scroll-to-top-button.tsx`
- It is mounted from `src/app/layout.tsx`, so it appears across the site instead of only on service pages

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
  - returning customer offer page
- some image `alt` text improved for accessibility and SEO

## Favicon / icon status
- Main icon files are in `src/app/`
- Current setup uses:
  - `src/app/icon.png`
  - `src/app/favicon-96x96.png`
- `layout.tsx` points icons to `/icon.png`
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
- `src/components/service-pages/service-page-template.tsx`
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
   - `/returning-customer-offer`
4. Finish / verify Google Business Profile
5. Add a real reviews/testimonials section using real customer feedback only
6. Add dedicated service pages later for stronger local SEO:
   - city/service area pages later if needed

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
