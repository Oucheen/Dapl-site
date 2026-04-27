import { ServicePageTemplate, buildServicePageMetadata } from "@/components/service-pages/service-page-template";
import { iceMachineServicePage } from "@/content/service-pages";

const page = iceMachineServicePage;

export const metadata = buildServicePageMetadata(page);

export default function IceMachineRepairPage() {
  return (
    <ServicePageTemplate
      page={page}
      bookingEyebrow="Book Ice Machine Service"
      bookingTitle="Schedule ice machine repair in Charlotte, NC"
      bookingDescription="Tell us what your ice machine is doing, and we will follow up to confirm the next available appointment."
      bookingSource="ice-machine-repair-page"
      bookingSuccessMessage="Thank you - your ice machine repair request was sent. We will contact you soon."
    />
  );
}
