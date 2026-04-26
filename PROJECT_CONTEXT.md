# DAPL Project Context

## What this project is
- Marketing site for **Dapl Appliance Repair**
- Stack: **Next.js 16.2.4**, React 19, TypeScript, Tailwind 4, Framer Motion
- Production domain: **https://www.daplappliance.com**

## Key routes
- `/` - main landing page
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
```

For local development, create `.env.local` with the same keys if you want the form to work on `localhost`.

## Resend status
- Resend domain **daplappliance.com** is already verified
- Contact form is configured to send email through Resend
- If local form shows `Add RESEND_API_KEY to your server environment`, that means `.env.local` is missing or the dev server needs a restart

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
  - promo code field optional
  - preferred date cannot be in the past
  - hidden honeypot field
  - support for `leadSource`

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
- `src/app/returning-customer-offer/page.tsx`
- `src/app/api/contact/route.ts`
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
   - refrigerator repair
   - washer repair
   - dryer repair
   - dishwasher repair

## Good things to tell the next chat
- This is an actively customized Next.js landing site, not a fresh template
- The hidden offer page already exists and should not be removed
- The custom 404 page is already built and should stay conversion-focused
- The contact form already supports `promoCode` and `leadSource`
- Resend is wired up and the domain is verified
- Be careful not to break homepage anchor navigation from secondary pages

## Maintenance note
- Keep this file updated when adding new routes, SEO changes, form behavior, domain/email settings, or important UI flows
