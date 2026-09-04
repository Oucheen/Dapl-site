import { CallWidget } from "@/components/twilio/call-widget";
import { TwilioVoiceProvider } from "@/components/twilio/twilio-voice-provider";

export default function FieldAppLayout({ children }: { children: React.ReactNode }) {
  return <TwilioVoiceProvider><>{children}<CallWidget /></></TwilioVoiceProvider>;
}
