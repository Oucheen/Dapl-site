import { notFound, redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoiceById } from "@/lib/supabase-invoices";
import { getLatestInvoiceSignature } from "@/lib/supabase-invoice-signatures";

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

  try {
    const businessEmail = process.env.CONTACT_TO_EMAIL || "dapl.appliance.repair@gmail.com";
    const signature = await getLatestInvoiceSignature(invoiceData.invoice.id);
    const pdfBuffer = await renderInvoicePdf(invoiceData, businessEmail, signature);
    const filename = `${getSafeFilename(invoiceData.invoice.invoice_number)}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Invoice PDF generation failed", {
      invoiceId,
      invoiceNumber: invoiceData.invoice.invoice_number,
      error,
    });

    return new Response("Invoice PDF generation failed.", { status: 500 });
  }
}
