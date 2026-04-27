import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { commercialRefrigeratorServicePage } from "@/content/service-pages";

const page = commercialRefrigeratorServicePage;

export const metadata = buildServicePageMetadata(page);

export default function CommercialRefrigeratorRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Commercial Refrigerator Service"
      bookingTitle="Schedule commercial refrigerator repair in Charlotte, NC"
      bookingDescription="Tell us what your commercial refrigerator is doing, and we will follow up to confirm the next available appointment."
      bookingSource="commercial-refrigerator-repair-page"
      bookingSuccessMessage="Thank you - your commercial refrigerator repair request was sent. We will contact you soon."
    />
  );
}
