"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getPublicInvoicePath, isValidInvoiceAccessCode } from "@/lib/invoice-public-link";
import { createLeadActivity } from "@/lib/supabase-activity";
import { getInvoiceByNumber } from "@/lib/supabase-invoices";
import { saveInvoiceSignature } from "@/lib/supabase-invoice-signatures";

function getSignatureRedirect(invoiceNumber: string, accessCode: string, status: string) {
  const params = new URLSearchParams({ c: accessCode, signature: status });

  return `/i/${encodeURIComponent(invoiceNumber)}/sign?${params.toString()}`;
}

function getSignedInvoiceRedirect(invoiceNumber: string) {
  const path = getPublicInvoicePath(invoiceNumber);
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}signature=saved`;
}

function getSafeReturnTo(value: string) {
  if (!value.startsWith("/admin/invoices/")) {
    return null;
  }

  return value;
}

function appendSignatureNotice(path: string) {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}notice=signature_saved`;
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export async function savePublicInvoiceSignatureAction(formData: FormData) {
  const invoiceNumber = String(formData.get("invoiceNumber") || "").trim();
  const accessCode = String(formData.get("accessCode") || "").trim();
  const returnTo = getSafeReturnTo(String(formData.get("returnTo") || "").trim());
  const signerName = String(formData.get("signerName") || "").trim();
  const signatureDataUrl = String(formData.get("signatureDataUrl") || "").trim();
  const acceptedTerms = String(formData.get("acceptedTerms") || "") === "yes";

  if (!isValidInvoiceAccessCode(invoiceNumber, accessCode)) {
    notFound();
  }

  const invoiceData = await getInvoiceByNumber(invoiceNumber);

  if (!invoiceData) {
    notFound();
  }

  try {
    await saveInvoiceSignature({
      invoiceId: invoiceData.invoice.id,
      signerName,
      signatureDataUrl,
      acceptedTerms,
    });
  } catch (error) {
    console.error("Invoice signature save failed", {
      invoiceId: invoiceData.invoice.id,
      invoiceNumber,
      error,
    });

    redirect(getSignatureRedirect(invoiceNumber, accessCode, "error"));
  }

  await createLeadActivity({
    leadId: invoiceData.invoice.lead_id,
    invoiceId: invoiceData.invoice.id,
    eventType: "invoice_customer_signed",
    title: "Customer signature saved",
    details: `${signerName} accepted invoice ${invoiceData.invoice.invoice_number} for ${formatMoney(invoiceData.invoice.total)}.`,
  });

  revalidatePath(`/admin/invoices/${invoiceData.invoice.id}`);
  revalidatePath(`/admin/invoices/${invoiceData.invoice.id}/pdf`);
  revalidatePath(`/i/${invoiceNumber}`);
  revalidatePath(`/i/${invoiceNumber}/sign`);

  redirect(returnTo ? appendSignatureNotice(returnTo) : getSignedInvoiceRedirect(invoiceNumber));
}
