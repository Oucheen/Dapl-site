import { notFound, redirect } from "next/navigation";
import { getPublicInvoicePath } from "@/lib/invoice-public-link";
import { getInvoiceNumberByShortCode } from "@/lib/supabase-invoices";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invoiceNumber = await getInvoiceNumberByShortCode(code);

  if (!invoiceNumber) {
    notFound();
  }

  redirect(getPublicInvoicePath(invoiceNumber));
}
