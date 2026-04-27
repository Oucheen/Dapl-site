import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { washerServicePage } from "@/content/service-pages";

const page = washerServicePage;

export const metadata = buildServicePageMetadata(page);

export default function WasherRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Washer Service"
      bookingTitle="Schedule washer repair in Charlotte, NC"
      bookingDescription="Tell us what your washer is doing, and we will follow up to confirm the next available appointment."
      bookingSource="washer-repair-page"
      bookingSuccessMessage="Thank you - your washer repair request was sent. We will contact you soon."
    />
  );
}
