import { notFound } from "next/navigation";
import {
  BrandPageTemplate,
  buildBrandMetadata,
} from "@/components/brand-pages/brand-page-template";
import { brandPages, getBrandPage } from "@/content/brand-pages";

type BrandRouteProps = {
  params: Promise<{
    brandSlug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return brandPages.map((page) => ({
    brandSlug: page.slug,
  }));
}

export async function generateMetadata({ params }: BrandRouteProps) {
  const { brandSlug } = await params;
  const page = getBrandPage(brandSlug);

  if (!page) {
    return {};
  }

  return buildBrandMetadata(page);
}

export default async function BrandRoute({ params }: BrandRouteProps) {
  const { brandSlug } = await params;
  const page = getBrandPage(brandSlug);

  if (!page) {
    notFound();
  }

  return <BrandPageTemplate page={page} />;
}
