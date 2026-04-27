import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { wineCoolerServicePage } from "@/content/service-pages";

const page = wineCoolerServicePage;

export const metadata = buildServicePageMetadata(page);

export default function WineCoolerRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Wine Cooler Service"
      bookingTitle="Schedule wine cooler repair in Charlotte, NC"
      bookingDescription="Tell us what your wine cooler is doing, and we will follow up to confirm the next available appointment."
      bookingSource="wine-cooler-repair-page"
      bookingSuccessMessage="Thank you - your wine cooler repair request was sent. We will contact you soon."
    />
  );
}
