"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { PIPELINE_STAGE_CONFIG, PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline-stages";
import type { LeadRecord } from "@/lib/supabase-leads";
import {
  deleteLeadFromPipeline,
  updateLeadPipelineTelegramPreference,
  updateLeadPipelineStage,
} from "@/app/admin/leads/actions";

const COLUMNS = PIPELINE_STAGES.map((value) => ({
  value,
  ...PIPELINE_STAGE_CONFIG[value],
}));

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

function getColumnLeads(leads: LeadRecord[], stage: PipelineStage) {
  return leads.filter((lead) => (lead.pipeline_stage || "new_lead") === stage);
}

export function PipelineBoard({
  leads,
  canDeleteLeads,
}: {
  leads: LeadRecord[];
  canDeleteLeads: boolean;
}) {
  const router = useRouter();
  const topScrollRef = useRef<HTMLDivElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(2800);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<PipelineStage | null>(null);
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    const updateWidth = () => {
      setBoardWidth(Math.max(grid.scrollWidth, 2800));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(grid);

    return () => observer.disconnect();
  }, [leads.length]);

  function syncHorizontalScroll(source: "top" | "board") {
    const sourceElement = source === "top" ? topScrollRef.current : boardScrollRef.current;
    const targetElement = source === "top" ? boardScrollRef.current : topScrollRef.current;

    if (sourceElement && targetElement) {
      targetElement.scrollLeft = sourceElement.scrollLeft;
    }
  }

  function moveLead(leadId: string, stage: PipelineStage) {
    if (isPending) {
      return;
    }

    const formData = new FormData();
    formData.set("id", leadId);
    formData.set("stage", stage);
    setActionError("");
    setPendingStage(stage);

    startTransition(async () => {
      try {
        await updateLeadPipelineStage(formData);
        setDraggedLeadId(null);
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Could not move the card. Check the Supabase Pipeline migration.",
        );
      } finally {
        setPendingStage(null);
      }
    });
  }

  function setTelegramPreference(leadId: string, enabled: boolean) {
    if (isPending) {
      return;
    }

    const formData = new FormData();
    formData.set("id", leadId);
    formData.set("enabled", String(enabled));
    setActionError("");

    startTransition(async () => {
      try {
        await updateLeadPipelineTelegramPreference(formData);
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Could not save the Telegram preference. Check the Supabase migration.",
        );
      }
    });
  }

  function deleteLead(lead: LeadRecord) {
    if (isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${lead.name} from DAPL Pipeline? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("id", lead.id);
    setActionError("");

    startTransition(async () => {
      try {
        await deleteLeadFromPipeline(formData);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not delete the lead.");
      }
    });
  }

  return (
    <div className="relative">
      {isPending ? (
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-primary/20">
          <div className="h-full w-1/2 animate-pulse bg-primary" />
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-3 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm font-bold leading-6 text-accent">
          <p>Could not save this Pipeline change.</p>
          <p className="mt-1 font-mono text-xs font-semibold text-foreground">{actionError}</p>
          <p className="mt-2 text-xs font-semibold text-foreground">
            Run <code className="rounded bg-white px-1.5 py-0.5">supabase/pipeline-telegram.sql</code> in the Supabase SQL Editor, then reload this page.
          </p>
        </div>
      ) : null}

      <div
        ref={topScrollRef}
        onScroll={() => syncHorizontalScroll("top")}
        className="mb-2 h-5 overflow-x-auto overflow-y-hidden rounded-full border border-border bg-white shadow-sm"
        aria-label="Scroll Pipeline horizontally"
      >
        <div style={{ width: `${boardWidth}px`, height: "1px" }} />
      </div>

      <div
        ref={boardScrollRef}
        onScroll={() => syncHorizontalScroll("board")}
        className="overflow-x-auto pb-4"
      >
        <div
          ref={gridRef}
          className="grid min-w-[2800px] grid-cols-[repeat(13,minmax(200px,1fr))] gap-3"
        >
        {COLUMNS.map((column) => {
          const columnLeads = getColumnLeads(leads, column.value);

          return (
            <section
              key={column.value}
              className={`min-h-[34rem] min-w-0 rounded-2xl border p-2.5 ${column.tone}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const leadId = event.dataTransfer.getData("text/plain");

                if (leadId) {
                  moveLead(leadId, column.value);
                }
              }}
            >
              <div className="flex min-h-[6.5rem] items-start justify-between gap-2 px-1.5 pb-2.5">
                <div>
                  <h2 className="min-h-[2.75rem] text-sm font-black leading-5 text-primary">{column.label}</h2>
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
                    className={`w-full min-w-0 overflow-hidden cursor-grab rounded-xl border border-border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
                      draggedLeadId === lead.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-black text-primary">
                          <span className="truncate">{lead.name}</span>
                          {lead.pipeline_telegram_enabled ? (
                            <span title="Telegram notifications enabled" aria-label="Telegram notifications enabled">
                              🔔
                            </span>
                          ) : null}
                        </p>
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

                    <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-xs font-black text-primary underline-offset-4 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Open lead
                      </Link>
                      <div className="flex min-w-0 items-center gap-2">
                        <label className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/15 bg-primary/5 px-2 py-1 text-[0.65rem] font-black text-primary" title="Send Telegram notifications for this lead">
                          <input
                            type="checkbox"
                            checked={lead.pipeline_telegram_enabled === true}
                            disabled={isPending}
                            onChange={(event) => setTelegramPreference(lead.id, event.target.checked)}
                            className="h-3.5 w-3.5 accent-primary"
                            aria-label={`Telegram notifications for ${lead.name}`}
                          />
                          TG
                        </label>
                        <select
                          value={lead.pipeline_stage || "new_lead"}
                          disabled={isPending}
                          onChange={(event) => moveLead(lead.id, event.target.value as PipelineStage)}
                          className="min-w-0 max-w-[8rem] rounded-lg border border-border bg-white px-2 py-1 text-[0.65rem] font-bold text-primary outline-none focus:border-primary"
                          aria-label={`Move ${lead.name}`}
                        >
                          {COLUMNS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {canDeleteLeads ? (
                      <button
                        type="button"
                        onClick={() => deleteLead(lead)}
                        disabled={isPending}
                        className="mt-2 w-full rounded-lg border border-accent/20 bg-white px-2 py-1.5 text-[0.65rem] font-black text-accent transition hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Delete ${lead.name}`}
                      >
                        Delete card
                      </button>
                    ) : null}
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
      </div>

      {pendingStage ? (
        <p className="mt-2 text-xs font-bold text-muted">Saving move to {COLUMNS.find((column) => column.value === pendingStage)?.label}…</p>
      ) : null}
    </div>
  );
}
