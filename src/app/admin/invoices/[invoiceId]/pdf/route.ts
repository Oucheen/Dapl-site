import { notFound, redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoiceById } from "@/lib/supabase-invoices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSafeFilename(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const { invoiceId } = await context.params;
  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData) {
    notFound();
  }

  const businessEmail = process.env.CONTACT_TO_EMAIL || "dapl.appliance.repair@gmail.com";
  const pdfBuffer = await renderInvoicePdf(invoiceData, businessEmail);
  const filename = `${getSafeFilename(invoiceData.invoice.invoice_number)}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
