import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { dishwasherServicePage } from "@/content/service-pages";

const page = dishwasherServicePage;

export const metadata = buildServicePageMetadata(page);

export default function DishwasherRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Dishwasher Service"
      bookingTitle="Schedule dishwasher repair in Charlotte, NC"
      bookingDescription="Tell us what your dishwasher is doing, and we will follow up to confirm the next available appointment."
      bookingSource="dishwasher-repair-page"
      bookingSuccessMessage="Thank you - your dishwasher repair request was sent. We will contact you soon."
    />
  );
}
