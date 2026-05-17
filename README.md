## DAPL Appliance Repair Homepage

Production-ready homepage built with Next.js, React, TypeScript, Tailwind CSS, and Framer Motion.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build For Production

```bash
npm run build
npm run start
```

## Project Structure

- `src/app/layout.tsx` - global layout + SEO metadata
- `src/app/page.tsx` - homepage composition + LocalBusiness schema
- `src/components/sections/*` - reusable homepage sections
- `src/components/ui/*` - shared UI and motion helpers
- `public/logo.svg` - placeholder company logo
- `public/hero-placeholder.svg` - placeholder hero image

## Notes

- Update `metadataBase` in `src/app/layout.tsx` to your final production domain.
- Replace placeholder assets in `public/` with final branded images/logo when available.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
