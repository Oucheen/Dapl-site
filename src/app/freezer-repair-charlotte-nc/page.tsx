import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { freezerServicePage } from "@/content/service-pages";

const page = freezerServicePage;

export const metadata = buildServicePageMetadata(page);

export default function FreezerRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Freezer Service"
      bookingTitle="Schedule freezer repair in Charlotte, NC"
      bookingDescription="Tell us what your freezer is doing, and we will follow up to confirm the next available appointment."
      bookingSource="freezer-repair-page"
      bookingSuccessMessage="Thank you - your freezer repair request was sent. We will contact you soon."
    />
  );
}
