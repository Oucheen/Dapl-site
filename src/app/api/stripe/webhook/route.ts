import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  fromStripeCents,
  getStripe,
  getStripeWebhookSecret,
} from "@/lib/stripe-payments";
import {
  createLeadActivity,
  listActivitiesForInvoice,
} from "@/lib/supabase-activity";
import {
  addInvoicePayment,
  getInvoiceById,
} from "@/lib/supabase-invoices";

export const dynamic = "force-dynamic";

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function getStripePaymentMethod(session: Stripe.Checkout.Session) {
  if (session.payment_method_types?.includes("card")) {
    return "card";
  }

  if (session.payment_method_types?.includes("us_bank_account")) {
    return "ach";
  }

  return "stripe";
}

async function wasStripeSessionRecorded(invoiceId: string, sessionId: string) {
  const activities = await listActivitiesForInvoice(invoiceId, 150);

  return activities.some(
    (activity) =>
      activity.event_type === "stripe_payment_recorded" &&
      activity.metadata?.stripeCheckoutSessionId === sessionId,
  );
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId || session.client_reference_id || "";

  if (!isUuid(invoiceId) || session.payment_status !== "paid") {
    return;
  }

  if (await wasStripeSessionRecorded(invoiceId, session.id)) {
    return;
  }

  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData) {
    return;
  }

  const amount = fromStripeCents(session.amount_total);
  const method = getStripePaymentMethod(session);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const note = [
    `Stripe Checkout ${session.id}`,
    paymentIntentId ? `PaymentIntent ${paymentIntentId}` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const { leadId } = await addInvoicePayment(invoiceId, {
    amount,
    method,
    note,
  });

  await createLeadActivity({
    leadId: leadId ?? invoiceData.invoice.lead_id,
    invoiceId,
    eventType: "stripe_payment_recorded",
    title: "Stripe payment recorded",
    details: `Stripe payment of $${amount.toFixed(2)} was recorded from Checkout.`,
    metadata: {
      source: "stripe_webhook",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId ?? null,
      stripePaymentStatus: session.payment_status,
      stripeAmountTotal: session.amount_total ?? null,
      stripeCurrency: session.currency ?? null,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/invoices");
  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook secret is not configured." }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
