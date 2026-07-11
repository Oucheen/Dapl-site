# Retell Pilot Setup

Use Retell for the first DAPL Appliance Repair voice-agent pilot. The app-side intake is already prepared at:

```text
POST https://www.daplappliance.com/api/voice-leads
```

## 1. Environment

Set this in Vercel before connecting Retell:

```env
VOICE_AGENT_API_KEY=<strong random secret>
```

Use the same value in Retell custom function headers:

```text
Authorization: Bearer <VOICE_AGENT_API_KEY>
```

## 2. Retell Dashboard Flow

1. Create a Retell account: https://dashboard.retellai.com
2. Create a new voice agent.
3. Start with a receptionist / single-prompt style agent for the MVP.
4. Test it in the web-call tester first.
5. Add a custom function that submits a lead to `/api/voice-leads`.
6. Add billing/payment method only when ready to buy a phone number.
7. Buy a US/Canada number and assign the inbound agent.
8. Place 5-10 test calls before exposing the number to real customers.

Retell docs:
- Quick start: https://docs.retellai.com/get-started/quick-start
- Purchase phone number: https://docs.retellai.com/deploy/purchase-number
- Custom function: https://docs.retellai.com/build/conversation-flow/custom-function

## 3. Agent Prompt

```text
You are the phone receptionist for DAPL Appliance Repair in the Charlotte, NC area.

Goal: quickly collect a service request for appliance repair and tell the caller the team will follow up.

Style:
- Warm, professional, concise.
- Ask one question at a time.
- Keep replies under 2 short sentences.
- Do not explain the process unless asked.
- Keep the call efficient.
- Do not troubleshoot.
- Do not ask long diagnostic questions.
- Once all required fields are collected and confirmed, end the call politely.

Business context:
- Company: DAPL Appliance Repair.
- Service area: Charlotte, NC and nearby areas including Matthews, Huntersville, Fort Mill, Waxhaw, Concord, Cornelius, Davidson, Weddington, and Rock Hill.
- Services: appliance repair for refrigerators, washers, dryers, dishwashers, ovens, cooktops, freezers, ice machines, wine coolers, and commercial refrigerators.

Collect these fields:
1. Name
2. Callback phone number
3. Service address
4. Appliance type
5. What is wrong
6. Preferred service date, if any

Optional fields:
- Email
- Promo code

Call flow:
Start with: "Thank you for calling DAPL Appliance Repair. How can I help you today?"

If the caller needs appliance repair:
- Briefly acknowledge the issue.
- Ask for missing fields in this order: name, phone, address, appliance, issue details, preferred date.
- If the caller already gave a field, do not ask again.
- After all required information is collected, repeat only the key details in one short sentence.
- Ask: "Is that correct?"
- If yes, call the create_voice_lead function.
- After the function succeeds, say: "Perfect. I sent this to our team, and someone from DAPL Appliance Repair will contact you to confirm the next step."
- Then use the end_call function.

Rules:
- Do not quote prices.
- Do not promise exact availability.
- Do not promise same-day service.
- Do not diagnose deeply.
- Do not keep chatting after the request is confirmed.
- If asked about price, say: "Pricing depends on the appliance, issue, parts, and diagnosis. The team will confirm details after reviewing the request."
- If asked about timing, say: "The team will confirm availability after reviewing the request."
- If the caller asks for emergency help, collect the request and say the team will contact them as soon as possible. Do not promise emergency dispatch.
- If the caller asks for a human, collect their name and phone number, then say the team will call them back.
- If the caller is angry, stay calm, acknowledge the concern, and collect callback details.
- If the caller is not asking for appliance repair service, politely say DAPL Appliance Repair handles appliance repair requests only, then use the end_call function.
- Never invent availability, technician names, warranty terms, service policies, or prices.
- If you are unsure, say the team will confirm.
```

Welcome message:

```text
Thank you for calling DAPL Appliance Repair. How can I help you today?
```

Recommended settings:
- Response eagerness: `1`
- Interruption sensitivity: `0.8-0.9`
- Transcription: optimize for speed
- Voicemail detection: hang up if reaching voicemail
- IVR hangup: on
- End call on silence: `8-10s`
- Max call duration: `4 minutes`
- Data storage: Everything except PII
- Retention: `30 days`

## 4. Custom Function

Name:

```text
create_voice_lead
```

Description:

```text
Create a DAPL Appliance Repair service request after the caller confirms their details.
```

Method:

```text
POST
```

URL:

```text
https://www.daplappliance.com/api/voice-leads
```

Headers:

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <VOICE_AGENT_API_KEY>"
}
```

Body:

```json
{
  "name": "{{name}}",
  "phone": "{{phone}}",
  "email": "{{email}}",
  "address": "{{address}}",
  "appliance": "{{appliance}}",
  "issue": "{{issue}}",
  "preferredDate": "{{preferredDate}}",
  "promoCode": "{{promoCode}}",
  "provider": "retell",
  "callId": "{{call_id}}",
  "transcript": "{{transcript}}",
  "callSummary": "{{callSummary}}"
}
```

If Retell uses different variable names in the configured agent, map them to the same JSON keys above. The app endpoint expects flat fields.

## 5. Test Call Script

Use this test scenario before buying or publishing the production number:

```text
Hi, my refrigerator is not cooling. My name is Alex Morgan.
My phone number is +1 704 555 0198.
The address is 123 Test Street, Charlotte, North Carolina 28202.
It is a Samsung refrigerator. It started getting warm yesterday.
Tomorrow would be best if available.
```

Expected result:
- A new lead appears in `/admin/leads`.
- `lead_source` is `voice-agent`.
- The lead message contains the issue, provider, call id if available, and transcript if available.
- The lead activity timeline includes `Voice agent lead received`.

## 6. Pilot Success Criteria

Run 20-50 test/real calls and review:

- Did the agent collect all required fields?
- Did it avoid promising prices or exact availability?
- Did leads appear reliably in Supabase/admin?
- How often did customers ask for a human?
- Average call duration and cost per lead.
- Transcript quality for addresses and phone numbers.
