# Twilio Voice setup for DAPL CRM

The CRM phone is a browser softphone. The browser only receives a short-lived
Voice Access Token; Twilio Account SID, Auth Token, API key secret, and the
Supabase service-role key remain server-side.

## Environment variables

Set these in Vercel:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1...
TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=
TWILIO_TWIML_APP_SID=AP...
SUPABASE_CALLS_TABLE=calls
```

## Twilio Console

1. Buy or configure a Voice-capable Twilio number.
2. Create a Twilio API Key and copy its SID and secret into Vercel.
3. Create a TwiML App with this Voice URL:
   `https://www.daplappliance.com/api/twilio/outgoing`
4. Configure the Twilio phone number's incoming Voice URL as:
   `https://www.daplappliance.com/api/twilio/incoming`
5. Apply `supabase/schema.sql` in the Supabase SQL Editor.
6. Log into the CRM, open Admin or Field App, and click **Enable phone**.

The incoming route rings every active Supabase CRM user. The first user who
answers claims the call. The browser tab must stay open for incoming WebRTC
calls; changing tabs or minimizing the browser does not intentionally end an
active call, but a fully closed browser cannot receive one.

The TwiML flow plays a recording notice before the customer is connected to an
operator. Confirm the wording and your consent/retention policy before using
the phone in production.

## Recording

Recordings are requested by TwiML and delivered through the Recording Status
Callback. The CRM stores the recording SID and exposes playback through the
authenticated `/api/twilio/recordings/[recordingSid]` route.

Before enabling production recording, configure an appropriate consent prompt
and retention policy for the jurisdictions where callers and staff are located.
