import { redirect } from "next/navigation";
import { PhoneWindow } from "@/components/twilio/phone-window";
import { TwilioVoiceProvider } from "@/components/twilio/twilio-voice-provider";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function PhonePage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/phone");
  }

  return <TwilioVoiceProvider><PhoneWindow /></TwilioVoiceProvider>;
}
