"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LeadAdminStatus, LeadRecord } from "@/lib/supabase-leads";
import { updateLeadStatus } from "@/app/admin/leads/actions";

const COLUMNS: { value: LeadAdminStatus; label: string; description: string; tone: string }[] = [
  { value: "new", label: "New Lead", description: "Needs first contact", tone: "border-accent/25 bg-accent/5" },
  { value: "contacted", label: "Contacted", description: "Follow-up in progress", tone: "border-primary/20 bg-primary/5" },
  { value: "confirmed", label: "Scheduled", description: "Visit or job confirmed", tone: "border-emerald-500/25 bg-emerald-50" },
  { value: "invoiced", label: "Estimate / Invoice", description: "Money workflow started", tone: "border-amber-500/25 bg-amber-50" },
  { value: "completed", label: "Completed", description: "Work finished", tone: "border-slate-300 bg-slate-50" },
  { value: "cancelled", label: "Cancelled", description: "Closed without completion", tone: "border-slate-300 bg-slate-100" },
];

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function getLocation(value: string) {
  return value.split(",").slice(1, 3).join(", ").trim() || value;
}

function getColumnLeads(leads: LeadRecord[], status: LeadAdminStatus) {
  return leads.filter((lead) => lead.status === status);
}

export function PipelineBoard({ leads }: { leads: LeadRecord[] }) {
  const router = useRouter();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<LeadAdminStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  function moveLead(leadId: string, status: LeadAdminStatus) {
    if (isPending) {
      return;
    }

    const formData = new FormData();
    formData.set("id", leadId);
    formData.set("status", status);
    setPendingStatus(status);

    startTransition(async () => {
      await updateLeadStatus(formData);
      setDraggedLeadId(null);
      setPendingStatus(null);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      {isPending ? (
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-primary/20">
          <div className="h-full w-1/2 animate-pulse bg-primary" />
        </div>
      ) : null}

      <div className="grid min-w-[1180px] grid-cols-6 gap-3 pb-4">
        {COLUMNS.map((column) => {
          const columnLeads = getColumnLeads(leads, column.value);

          return (
            <section
              key={column.value}
              className={`min-h-[34rem] rounded-2xl border p-2.5 ${column.tone}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const leadId = event.dataTransfer.getData("text/plain");

                if (leadId) {
                  moveLead(leadId, column.value);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2 px-1.5 pb-2.5">
                <div>
                  <h2 className="text-sm font-black text-primary">{column.label}</h2>
                  <p className="mt-0.5 text-[0.65rem] font-semibold text-muted">{column.description}</p>
                </div>
                <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-black text-primary shadow-sm">
                  {columnLeads.length}
                </span>
              </div>

              <div className="grid gap-2.5">
                {columnLeads.map((lead) => (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", lead.id);
                      setDraggedLeadId(lead.id);
                    }}
                    onDragEnd={() => setDraggedLeadId(null)}
                    className={`cursor-grab rounded-xl border border-border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
                      draggedLeadId === lead.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-primary">{lead.name}</p>
                        <p className="mt-0.5 truncate text-[0.7rem] font-semibold text-muted">
                          {lead.appliance || "Appliance repair"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-black text-primary">
                        {formatMoney(lead.estimated_price)}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-xs font-bold text-muted">{getLocation(lead.service_address)}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-[0.65rem] font-bold text-muted">
                      <span className="rounded-full bg-slate-100 px-2 py-1">{formatDate(lead.scheduled_date)}</span>
                      {lead.assigned_technician ? (
                        <span className="rounded-full bg-primary/5 px-2 py-1 text-primary">
                          {lead.assigned_technician}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">Unassigned</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-xs font-black text-primary underline-offset-4 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Open lead
                      </Link>
                      <select
                        value={lead.status}
                        disabled={isPending}
                        onChange={(event) => moveLead(lead.id, event.target.value as LeadAdminStatus)}
                        className="max-w-[8rem] rounded-lg border border-border bg-white px-2 py-1 text-[0.65rem] font-bold text-primary outline-none focus:border-primary"
                        aria-label={`Move ${lead.name}`}
                      >
                        {COLUMNS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}

                {columnLeads.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-primary/15 bg-white/40 px-3 py-8 text-center text-xs font-bold text-muted">
                    Drop a lead here
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {pendingStatus ? (
        <p className="mt-2 text-xs font-bold text-muted">Saving move to {COLUMNS.find((column) => column.value === pendingStatus)?.label}…</p>
      ) : null}
    </div>
  );
}
