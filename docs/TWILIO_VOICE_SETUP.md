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

If the core schema was already applied, run `supabase/calls.sql` and then this
small migration in Supabase:

```sql
alter table public.leads
  add column if not exists call_intake jsonb not null default '{}'::jsonb;
alter table public.calls
  add column if not exists intake_data jsonb not null default '{}'::jsonb;
grant select, insert, update, delete on public.calls to service_role;
```

The incoming route rings every active Supabase CRM user. The first user who
answers claims the call. The browser tab must stay open for incoming WebRTC
calls; changing tabs or minimizing the browser does not intentionally end an
active call, but a fully closed browser cannot receive one.

## Call intake window

Clicking **Call** from a lead or from the calls history opens the named
`dapl-phone` pop-up and starts the call there. While a call is ringing or
connected, the window shows the intake flow for Request, Schedule, and Contact.
The form is saved as a browser draft until the operator saves the lead. Phone
numbers are normalized for deduplication, so a known caller updates the
existing lead and a new caller creates one. If the browser blocks the pop-up,
the phone falls back to the current CRM tab; browsers do not allow a website to
open a new window automatically for every unsolicited incoming call, so keep
the phone window open for reliable background ringing.

The TwiML flow plays a recording notice before the customer is connected to an
operator. Confirm the wording and your consent/retention policy before using
the phone in production.

## Recording

Recordings are requested by TwiML and delivered through the Recording Status
Callback. The CRM stores the recording SID and exposes playback through the
authenticated `/api/twilio/recordings/[recordingSid]` route.

Before enabling production recording, configure an appropriate consent prompt
and retention policy for the jurisdictions where callers and staff are located.
