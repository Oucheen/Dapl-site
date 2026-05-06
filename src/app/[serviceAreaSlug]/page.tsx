import { notFound } from "next/navigation";
import {
  buildServiceAreaMetadata,
  ServiceAreaPageTemplate,
} from "@/components/service-areas/service-area-page-template";
import { getServiceAreaPage, serviceAreaPages } from "@/content/service-areas";

type ServiceAreaRouteProps = {
  params: Promise<{
    serviceAreaSlug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return serviceAreaPages.map((page) => ({
    serviceAreaSlug: page.slug,
  }));
}

export async function generateMetadata({ params }: ServiceAreaRouteProps) {
  const { serviceAreaSlug } = await params;
  const page = getServiceAreaPage(serviceAreaSlug);

  if (!page) {
    return {};
  }

  return buildServiceAreaMetadata(page);
}

export default async function ServiceAreaRoute({ params }: ServiceAreaRouteProps) {
  const { serviceAreaSlug } = await params;
  const page = getServiceAreaPage(serviceAreaSlug);

  if (!page) {
    notFound();
  }

  return <ServiceAreaPageTemplate page={page} />;
}
