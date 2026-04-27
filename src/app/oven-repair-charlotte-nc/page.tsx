import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { ovenServicePage } from "@/content/service-pages";

const page = ovenServicePage;

export const metadata = buildServicePageMetadata(page);

export default function OvenRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Oven Service"
      bookingTitle="Schedule oven repair in Charlotte, NC"
      bookingDescription="Tell us what your oven is doing, and we will follow up to confirm the next available appointment."
      bookingSource="oven-repair-page"
      bookingSuccessMessage="Thank you - your oven repair request was sent. We will contact you soon."
    />
  );
}
