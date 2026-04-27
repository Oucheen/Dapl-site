import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { cooktopServicePage } from "@/content/service-pages";

const page = cooktopServicePage;

export const metadata = buildServicePageMetadata(page);

export default function CooktopRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Cooktop Service"
      bookingTitle="Schedule cooktop repair in Charlotte, NC"
      bookingDescription="Tell us what your cooktop is doing, and we will follow up to confirm the next available appointment."
      bookingSource="cooktop-repair-page"
      bookingSuccessMessage="Thank you - your cooktop repair request was sent. We will contact you soon."
    />
  );
}
