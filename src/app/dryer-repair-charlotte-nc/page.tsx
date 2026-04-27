import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { dryerServicePage } from "@/content/service-pages";

const page = dryerServicePage;

export const metadata = buildServicePageMetadata(page);

export default function DryerRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Dryer Service"
      bookingTitle="Schedule dryer repair in Charlotte, NC"
      bookingDescription="Tell us what your dryer is doing, and we will follow up to confirm the next available appointment."
      bookingSource="dryer-repair-page"
      bookingSuccessMessage="Thank you - your dryer repair request was sent. We will contact you soon."
    />
  );
}
