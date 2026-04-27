import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { refrigeratorServicePage } from "@/content/service-pages";

const page = refrigeratorServicePage;

export const metadata = buildServicePageMetadata(page);

export default function RefrigeratorRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Refrigerator Service"
      bookingTitle="Schedule refrigerator repair in Charlotte, NC"
      bookingDescription="Tell us what your refrigerator is doing, and we will follow up to confirm the next available appointment."
      bookingSource="refrigerator-repair-page"
      bookingSuccessMessage="Thank you - your refrigerator repair request was sent. We will contact you soon."
    />
  );
}
