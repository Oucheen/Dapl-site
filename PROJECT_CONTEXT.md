# DAPL Project Context

## What this project is
- Marketing site for **DAPL Appliance Repair**
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
CONTACT_FROM_EMAIL=DAPL Website <noreply@daplappliance.com>
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_LEADS_TABLE=leads
SUPABASE_INVOICES_TABLE=invoices
SUPABASE_INVOICE_ITEMS_TABLE=invoice_items
SUPABASE_INVOICE_PAYMENTS_TABLE=invoice_payments
SUPABASE_ACTIVITY_TABLE=lead_activity
LEADS_ADMIN_PASSWORD=...
LEADS_ADMIN_USERS=Owner|owner-password|owner;Dmytro|employee-password|staff
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
- Lead detail route: `/admin/leads/[leadId]`
- Invoice list route: `/admin/invoices`
- Manual invoice route: `/admin/invoices/new`
- Invoice detail route: `/admin/invoices/[invoiceId]`
- `/admin` redirects to `/admin/leads`
- Admin routes are marked `noindex, nofollow` via `src/app/admin/layout.tsx`
- Admin login supports either the legacy single `LEADS_ADMIN_PASSWORD` or multiple staff users through `LEADS_ADMIN_USERS`.
- `LEADS_ADMIN_USERS` format is semicolon-separated: `Name|password|role;Second Name|password2|staff`.
  Roles are normalized to lowercase automatically, so `BOSS` becomes `boss`.
- When multiple staff users are configured, the signed-in user name is stored in the admin session and new activity-log rows show who made each change.
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
- The top status cards on `/admin/leads` are also filters. Clicking a status limits the visible lead cards to that workflow stage.
- `/admin/leads` now has a higher-level view filter:
  - `Active` is the default and shows `new`, `contacted`, `confirmed`, and `invoiced`
  - `Archive` shows closed work: `completed` and `cancelled`
  - `All` shows every lead
- No extra archive table/column is used yet; archive behavior is status-based so paid/completed jobs automatically leave the default working view.
- `/admin/leads` also has a GET search box for name, phone, email, address, appliance, message, source, notes, visit date, and technician. Status filters preserve the active search query.
- `/admin/leads/[leadId]` is the focused lead workspace: customer/request details, invoice shortcut, editable lead status/notes, locked post-invoice fields, needs-attention guidance, and a longer timeline.
- Lead list cards include an `Open lead details` shortcut and show small needs-attention badges for new/contacted/confirmed leads that need the next action.
- The dashboard also supports first-pass CRM fields on each lead:
  - `admin_notes`
  - `scheduled_date`
  - `estimated_price`
  - `assigned_technician`
- If those fields are missing in Supabase, run the latest `supabase/schema.sql` or at least the `alter table public.leads add column if not exists ...` block from that file.
- The lead list uses responsive cards instead of a wide table, so it should not require horizontal scrolling on normal desktop/tablet widths.
- The lead card now has a `Create invoice` action. It creates one draft invoice from the lead, marks the lead as `invoiced`, and opens `/admin/invoices/[invoiceId]`.
- If a lead already has an invoice, the lead card shows `Open / edit invoice` instead of offering to create another one.
- Once an invoice exists for a lead, the lead card locks visit date, estimate, and technician fields. Only lead status and admin notes stay editable, and the status dropdown is limited to `invoiced`, `completed`, and `cancelled`.
- Lead cards with an invoice show the invoice number as a quick link into `/admin/invoices/[invoiceId]`.
- `/admin/invoices` lists recent invoices with status, customer, total, and links back into each invoice detail page.
- `/admin/invoices` has a higher-level view filter:
  - `Open` is the default and shows `draft` and `sent` invoices
  - `Archive` shows closed invoices: `paid` and `void`
  - `All` shows every invoice
- `/admin/invoices` also has status filters for all / draft / sent / paid / void plus search by invoice number, customer, phone, email, address, appliance, service date, technician, and notes.
- Invoice MVP tables:
  - `public.invoices`
  - `public.invoice_items`
  - `public.invoice_payments`
- Activity log table:
  - `public.lead_activity`
- Invoice MVP currently supports:
  - manual invoice creation for phone/offline/non-website leads via `/admin/invoices/new`
  - draft invoice creation from lead details
  - one starter line item using the lead estimate
  - editing invoice item descriptions, quantities, and unit prices
  - adding and deleting invoice line items
  - quick invoice line templates on invoice detail pages: Diagnostic, Labor, Parts, Repair service, Maintenance, Installation
  - automatic subtotal / total recalculation from invoice items
  - manual payment history for cash, Zelle, card, check, or other payments
  - automatic amount-due calculation from invoice total minus recorded payments
  - invoice status updates: `draft`, `sent`, `paid`, `void`
- Invoice detail pages now have a `Print / save as PDF` button. Print styles hide admin controls and render a clean invoice document with plain line items and totals, so Chrome/Edge can save the invoice as PDF.
- Invoice detail pages can send the current invoice to the customer by email through Resend. A successful send marks a draft invoice as `sent` and records invoice activity.
- Invoice detail pages show `Paid`, `Amount due`, and `Payment History` in the admin view, print view, and customer invoice email.
- Admins can set both payment date and payment time when recording manual payments; stored payment timestamps are interpreted as Charlotte / Eastern time.
- Recording payments automatically marks the invoice as `paid` when the amount due reaches $0. Deleting a payment can reopen a paid invoice back to `sent` if a balance remains.
- Paid and void invoices lock line-item editing in the UI and on the server, so closed invoices keep a stable payment/history record. Reopen the invoice before changing charges.
- Invoice status updates now sync the related lead status:
  - invoice `draft` / `sent` -> lead `invoiced`
  - invoice `paid` -> lead `completed`
  - invoice `void` -> lead `cancelled`
- Invoice detail pages include a `Mark job completed` shortcut. It marks the invoice as `paid` and the related lead as `completed`.
- Lead and invoice admin screens now support an activity log:
  - new lead received
  - lead status/details updated
  - invoice created
  - manual invoice created
  - invoice email sent
  - invoice status updated
  - invoice line items added / updated / deleted
  - job marked completed
- Activity writes are best-effort, so admin workflows should still work if the `lead_activity` table has not been created yet. To enable visible history, run the latest `supabase/schema.sql` in Supabase SQL Editor.
- Manual invoices create a normal lead first with `lead_source: manual-admin`, then create a draft invoice from it. This keeps phone/offline work in the same lead/invoice/status workflow as website submissions.
- If invoice creation or payment history fails with a Supabase permission or missing-table error, run the latest `supabase/schema.sql` invoice-table/payment-table block and grants for `service_role`.

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
  - business identity linking the public brand name **DAPL Appliance Repair** to the legal operator **DAPL Honcharos Appliance Service Corp**
  - contact form submissions
  - analytics and cookies
  - lead notifications
  - basic service-provider sharing language
  - user contact/update requests
- The footer now links to `/privacy-policy`
- The footer also includes the short legal identity line: `DAPL Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.`

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

## Invoice / promo code notes
- Invoice discounts are tied to the two active promo codes:
  - `WEB25` - $25 off from the homepage first-repair offer
  - `RETURN15` - $15 off from the returning customer offer page
- When an invoice is created from a lead, the lead `promo_code` is copied into the invoice as `promo_code`, and the matching amount is stored as `discount_amount`.
- Manual invoices created from `/admin/invoices/new` can also optionally choose `WEB25` or `RETURN15`; this stores the code on the manual lead first, then applies the same invoice discount logic.
- Invoice totals are calculated as `subtotal - discount_amount + tax`, never below $0 before tax.
- The discount is shown in the invoice admin page, print view, and customer invoice email.
- Supabase needs the latest `supabase/schema.sql` applied so `public.invoices` has `promo_code` and `discount_amount`.
- Invoice edit actions redirect back with a small success notice (`notice=...`) so admins can see when invoice status, items, templates, or completion changes were saved.
- Admin lead and invoice detail pages now show `Customer history` matched by customer phone/email, so repeat customers and previous jobs are easier to spot.
- Admin roles are permission-aware:
  - elevated roles are `owner`, `boss`, `admin`, and `manager`
  - elevated roles can edit invoice line items/prices, delete payments, and void invoices
  - elevated roles can set historical lead/invoice creation dates when creating a manual invoice, useful for importing old customers
  - new manual invoices use the selected invoice creation date in the stored invoice number prefix, e.g. `DAPL-20260425-XXXXXXXX`; the final segment is a random UUID suffix for uniqueness
  - invoice detail pages format invoice/payment dates with `en-US` and `America/New_York`; browser print headers/footers are outside app control and should be disabled for clean PDFs
  - regular employee-style roles can keep operational work moving without changing protected invoice charges
- Homepage now includes a compact `Service Areas` section linking to all city pages from the main page body, not only the footer. This was added to strengthen internal linking for Search Console URLs stuck in `Discovered - currently not indexed`.
- City/service-area pages now use structured `commonNeeds` entries with unique `title` + `text` per card. Avoid reverting this to repeated boilerplate copy; it was changed because the old cards looked too templated across city pages.
- Appliance category cards on city and brand pages use shared appliance-specific descriptions from `src/content/service-pages.ts` instead of repeated `See symptoms...` boilerplate.

## Brand consistency note
- Public-facing brand casing should stay consistent as `DAPL Appliance Repair` for Google Business Profile / Search Console consistency.
- The legal operator line should stay separate: `DAPL Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.`
- Domain names and email addresses stay lowercase.

## Maintenance note
- Keep this file updated when adding new routes, SEO changes, form behavior, domain/email settings, or important UI flows
