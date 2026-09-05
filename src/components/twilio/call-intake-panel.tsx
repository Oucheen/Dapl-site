"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CallInfo } from "@/components/twilio/twilio-voice-provider";

type IntakeItem = {
  category: "service" | "material";
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type IntakeForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  appliance: string;
  leadSource: string;
  privateNotes: string;
  propertyType: string;
  propertyAge: string;
  ownership: string;
  workType: string;
  problem: string;
  priority: string;
  preferredDate: string;
  serviceDate: string;
  serviceTime: string;
  serviceWindow: string;
  assignedTechnician: string;
  businessUnit: string;
  jobType: string;
  tags: string;
  items: IntakeItem[];
};

type Tab = "request" | "schedule" | "contact";

const emptyItem = (category: IntakeItem["category"] = "service"): IntakeItem => ({
  category,
  name: "",
  description: "",
  quantity: "1",
  unitPrice: "0",
});

function initialForm(call: CallInfo): IntakeForm {
  const customer = call.customer;
  return {
    name: customer?.name && customer.name !== "Unknown caller" ? customer.name : call.name === "Unknown caller" ? "" : call.name,
    phone: customer?.phone || call.phone,
    email: customer?.email || "",
    address: customer?.address || "",
    appliance: customer?.appliance || "",
    leadSource: customer?.leadSource || "Phone",
    privateNotes: customer?.adminNotes || "",
    propertyType: "",
    propertyAge: "",
    ownership: "",
    workType: customer?.appliance || "",
    problem: customer?.message || "",
    priority: "Normal",
    preferredDate: customer?.preferredDate || "",
    serviceDate: "",
    serviceTime: "",
    serviceWindow: "",
    assignedTechnician: "",
    businessUnit: "",
    jobType: "",
    tags: "",
    items: [emptyItem()],
  };
}

function draftKey(call: CallInfo) {
  return `dapl-call-intake:${call.call.parameters.CallSid || `${call.direction}:${call.phone}`}`;
}

function money(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function fieldClass() {
  return "min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-primary outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10";
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs font-bold text-slate-600">{children}</label>;
}

export function CallIntakePanel({ call }: { call: CallInfo }) {
  const storageKey = useMemo(() => draftKey(call), [call]);
  const [form, setForm] = useState<IntakeForm>(() => {
    const fallback = initialForm(call);

    if (typeof window === "undefined") return fallback;

    try {
      const draft = window.localStorage.getItem(draftKey(call));
      return draft ? { ...fallback, ...(JSON.parse(draft) as Partial<IntakeForm>) } : fallback;
    } catch {
      return fallback;
    }
  });
  const [tab, setTab] = useState<Tab>("request");
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!savedLeadId) {
      window.localStorage.setItem(storageKey, JSON.stringify(form));
    }
  }, [form, savedLeadId, storageKey]);

  const total = form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * money(item.unitPrice), 0);
  const update = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateItem = (index: number, key: keyof IntakeItem, value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  };

  const save = async (saveMode: "lead" | "schedule") => {
    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      const response = await fetch("/api/twilio/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callSid: call.call.parameters.CallSid,
          leadId: call.customer?.leadId || call.leadId || null,
          saveMode,
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          appliance: form.appliance,
          leadSource: form.leadSource,
          preferredDate: form.preferredDate,
          message: form.problem,
          adminNotes: form.privateNotes,
          propertyType: form.propertyType,
          propertyAge: form.propertyAge,
          ownership: form.ownership,
          workType: form.workType,
          priority: form.priority,
          serviceDate: form.serviceDate,
          serviceTime: form.serviceTime,
          serviceWindow: form.serviceWindow,
          assignedTechnician: form.assignedTechnician,
          businessUnit: form.businessUnit,
          jobType: form.jobType,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          items: form.items.map((item) => ({
            category: item.category,
            name: item.name,
            description: item.description,
            quantity: Number(item.quantity || 1),
            unitPrice: money(item.unitPrice),
          })),
        }),
      });
      const result = (await response.json()) as { leadId?: string; error?: string; callLinked?: boolean };

      if (!response.ok || !result.leadId) {
        throw new Error(result.error || "Could not save the call intake.");
      }

      window.localStorage.removeItem(storageKey);
      setSavedLeadId(result.leadId);
      setSavedMessage(saveMode === "schedule" ? "Lead saved and marked for scheduling." : "Lead saved to CRM.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the call intake.");
    } finally {
      setSaving(false);
    }
  };

  if (dismissed) {
    return <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm"><button type="button" onClick={() => setDismissed(false)} className="font-black text-primary">Reopen call intake</button></div>;
  }

  return (
    <section className="mx-auto mt-4 max-w-2xl overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div><p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-accent">{call.direction === "incoming" ? "Incoming call" : "Outgoing call"}</p><h2 className="mt-1 text-xl font-black text-primary">{call.customer?.leadId ? "Customer Call" : "New Call"}</h2><p className="mt-1 text-xs font-bold text-slate-500">{call.phone || "Unknown number"} · {call.status}</p></div>
        <button type="button" onClick={() => { window.localStorage.removeItem(storageKey); setDismissed(true); }} className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100">Cancel</button>
      </div>
      {call.customer?.leadId ? <div className="mx-4 mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900"><span className="font-black">Existing lead found:</span> {call.customer.name} · {call.customer.status || "active"} <Link href={`/admin/leads/${call.customer.leadId}`} className="ml-2 font-black underline">Open lead</Link></div> : <div className="mx-4 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Unknown number — complete the form to create a new potential client.</div>}

      <div className="grid grid-cols-3 border-b border-slate-100 px-3 pt-3">
        {(["request", "schedule", "contact"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 px-2 py-2 text-xs font-black capitalize ${tab === item ? "border-primary text-primary" : "border-transparent text-slate-400"}`}>{item}</button>)}
      </div>

      <div className="grid gap-4 p-4">
        {tab === "contact" ? <div className="grid gap-3 sm:grid-cols-2">
          <Label>Name<input className={fieldClass()} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Customer name" /></Label>
          <Label>Phone<input className={fieldClass()} value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+1 704..." /></Label>
          <Label>Email<input type="email" className={fieldClass()} value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="customer@email.com" /></Label>
          <Label>Address<input className={fieldClass()} value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Service address" /></Label>
          <Label>Business unit<input className={fieldClass()} value={form.businessUnit} onChange={(event) => update("businessUnit", event.target.value)} placeholder="Appliance repair" /></Label>
          <Label>Job type<input className={fieldClass()} value={form.jobType} onChange={(event) => update("jobType", event.target.value)} placeholder="Repair / install" /></Label>
          <Label>Tags<input className={fieldClass()} value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="urgent, referral" /></Label>
          <Label>Lead source<input className={fieldClass()} value={form.leadSource} onChange={(event) => update("leadSource", event.target.value)} placeholder="Phone" /></Label>
        </div> : null}

        {tab === "request" ? <div className="grid gap-3">
          <Label>Private notes<textarea className={`${fieldClass()} min-h-20`} value={form.privateNotes} onChange={(event) => update("privateNotes", event.target.value)} placeholder="Notes for the team" /></Label>
          <div className="grid gap-3 sm:grid-cols-2"><Label>Property type<select className={fieldClass()} value={form.propertyType} onChange={(event) => update("propertyType", event.target.value)}><option value="">Select</option><option>Residential</option><option>Commercial</option></select></Label><Label>Property age<select className={fieldClass()} value={form.propertyAge} onChange={(event) => update("propertyAge", event.target.value)}><option value="">Select</option><option>Less than 5 years</option><option>6–10 years</option><option>11–20 years</option><option>21–50 years</option><option>Over 50 years</option><option>Not sure</option></select></Label><Label>Own or rent<select className={fieldClass()} value={form.ownership} onChange={(event) => update("ownership", event.target.value)}><option value="">Select</option><option>Own</option><option>Rent</option></select></Label><Label>Type of work<input className={fieldClass()} value={form.workType} onChange={(event) => update("workType", event.target.value)} placeholder="Washer, refrigerator..." /></Label><Label>Priority<select className={fieldClass()} value={form.priority} onChange={(event) => update("priority", event.target.value)}><option>Normal</option><option>Urgent</option><option>Emergency</option></select></Label><Label>Preferred date<input type="date" className={fieldClass()} value={form.preferredDate} onChange={(event) => update("preferredDate", event.target.value)} /></Label></div>
          <Label>Problem description<textarea className={`${fieldClass()} min-h-24`} value={form.problem} onChange={(event) => update("problem", event.target.value)} placeholder="Tell us more about the issue" /></Label>
        </div> : null}

        {tab === "schedule" ? <div className="grid gap-3 sm:grid-cols-2"><Label>Service date<input type="date" className={fieldClass()} value={form.serviceDate} onChange={(event) => update("serviceDate", event.target.value)} /></Label><Label>Time<input type="time" className={fieldClass()} value={form.serviceTime} onChange={(event) => update("serviceTime", event.target.value)} /></Label><Label>Service window<input className={fieldClass()} value={form.serviceWindow} onChange={(event) => update("serviceWindow", event.target.value)} placeholder="Morning / afternoon" /></Label><Label>Assigned technician<input className={fieldClass()} value={form.assignedTechnician} onChange={(event) => update("assignedTechnician", event.target.value)} placeholder="Optional" /></Label></div> : null}

        <div className="border-t border-slate-100 pt-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black text-primary">Services and materials</h3><div className="flex gap-2"><button type="button" onClick={() => update("items", [...form.items, emptyItem("service")])} className="inline-flex items-center gap-1 text-xs font-black text-primary"><Plus className="h-3.5 w-3.5" /> Service</button><button type="button" onClick={() => update("items", [...form.items, emptyItem("material")])} className="inline-flex items-center gap-1 text-xs font-black text-primary"><Plus className="h-3.5 w-3.5" /> Material</button></div></div>
          <div className="grid gap-2">{form.items.map((item, index) => <div key={`${index}-${item.category}`} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_4.5rem_6.5rem_auto]"><input className={fieldClass()} value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} placeholder={`${item.category === "material" ? "Material" : "Service"} name`} /><input className={fieldClass()} type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} aria-label="Quantity" /><input className={fieldClass()} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} aria-label="Unit price" /><button type="button" onClick={() => update("items", form.items.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex min-h-10 items-center justify-center rounded-xl px-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove item"><Trash2 className="h-4 w-4" /></button><textarea className={`${fieldClass()} sm:col-span-4`} value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Description (optional)" /></div>)}</div>
          <div className="mt-3 flex items-center justify-end gap-3 border-t border-slate-200 pt-3 text-sm"><span className="font-bold text-slate-500">Total</span><span className="text-xl font-black text-primary">${total.toFixed(2)}</span></div>
        </div>
      </div>

      {error ? <div className="mx-4 mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div> : null}
      {savedMessage ? <div className="mx-4 mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{savedMessage} <Link href={`/admin/leads/${savedLeadId}`} className="ml-1 underline">Open lead</Link></div> : null}
      <div className="grid gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:grid-cols-2"><button type="button" disabled={saving} onClick={() => void save("lead")} className="min-h-11 rounded-xl bg-primary px-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving..." : "Save lead"}</button><button type="button" disabled={saving} onClick={() => void save("schedule")} className="min-h-11 rounded-xl border border-primary px-3 text-sm font-black text-primary disabled:opacity-50">Save & schedule</button></div>
    </section>
  );
}
