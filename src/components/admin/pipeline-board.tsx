"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { PIPELINE_STAGE_CONFIG, PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline-stages";
import type { LeadRecord } from "@/lib/supabase-leads";
import {
  archiveLeadFromPipeline,
  archiveSelectedLeadsFromPipeline,
  deleteLeadFromPipeline,
  restoreLeadFromPipeline,
  restoreSelectedLeadsFromPipeline,
  updateLeadPipelineStage,
} from "@/app/admin/leads/actions";

const COLUMNS = PIPELINE_STAGES.map((value) => ({
  value,
  ...PIPELINE_STAGE_CONFIG[value],
}));
const ESTIMATE_COLUMN_VALUES: PipelineStage[] = [
  "diagnosed_estimate_needed",
  "estimate_sent_awaiting_approval",
  "approved",
];

const INITIAL_VISIBLE_CARDS = 8;
const LOAD_MORE_CARDS = 4;

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

function formatScheduleTime(start: string | null | undefined, end: string | null | undefined) {
  if (!start) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  const startLabel = formatter.format(new Date(start));
  const endLabel = end ? formatter.format(new Date(end)) : "";
  return endLabel ? `${startLabel}–${endLabel}` : startLabel;
}

function formatBookedLabel(lead: LeadRecord) {
  const scheduleTime = formatScheduleTime(lead.scheduled_start, lead.scheduled_end);

  if (lead.scheduled_date && scheduleTime) {
    return `${formatDate(lead.scheduled_date)} · ${scheduleTime}`;
  }

  if (lead.scheduled_date) {
    return formatDate(lead.scheduled_date);
  }

  if (lead.scheduled_start) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }).format(new Date(lead.scheduled_start));
  }

  return "Not booked";
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
  showArchived,
  view,
}: {
  leads: LeadRecord[];
  canDeleteLeads: boolean;
  showArchived: boolean;
  view: "leads" | "estimates";
}) {
  const router = useRouter();
  const columns = view === "estimates"
    ? COLUMNS.filter((column) => ESTIMATE_COLUMN_VALUES.includes(column.value))
    : COLUMNS;
  const minimumBoardWidth = view === "estimates" ? 1200 : 2800;
  const topScrollRef = useRef<HTMLDivElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(2800);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [visibleCardCounts, setVisibleCardCounts] = useState<Partial<Record<PipelineStage, number>>>({});
  const [pendingStage, setPendingStage] = useState<PipelineStage | null>(null);
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const newLeadCount = getColumnLeads(leads, "new_lead").length;
  const followUpCount = getColumnLeads(leads, "follow_up_required").length;

  useEffect(() => {
    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    const updateWidth = () => {
      setBoardWidth(Math.max(grid.scrollWidth, minimumBoardWidth));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(grid);

    return () => observer.disconnect();
  }, [leads.length, minimumBoardWidth]);

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

  function archiveLead(lead: LeadRecord) {
    if (isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Archive ${lead.name} from the active Pipeline? The card will remain available in Archived.`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("id", lead.id);
    setActionError("");

    startTransition(async () => {
      try {
        await archiveLeadFromPipeline(formData);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not archive the lead.");
      }
    });
  }

  function restoreLead(lead: LeadRecord) {
    if (isPending) {
      return;
    }

    const formData = new FormData();
    formData.set("id", lead.id);
    setActionError("");

    startTransition(async () => {
      try {
        await restoreLeadFromPipeline(formData);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not restore the lead.");
      }
    });
  }

  function toggleLeadSelection(leadId: string, selected: boolean) {
    setSelectedLeadIds((current) => {
      const next = new Set(current);

      if (selected) {
        next.add(leadId);
      } else {
        next.delete(leadId);
      }

      return next;
    });
  }

  function selectAllLeads() {
    setSelectedLeadIds(new Set(leads.map((lead) => lead.id)));
  }

  function selectFollowUpLeads() {
    setSelectedLeadIds(
      new Set(
        leads
          .filter((lead) => (lead.pipeline_stage || "new_lead") === "follow_up_required")
          .map((lead) => lead.id),
      ),
    );
  }

  function clearSelectedLeads() {
    setSelectedLeadIds(new Set());
  }

  function archiveSelectedLeads() {
    if (isPending || !selectedLeadIds.size) {
      return;
    }

    const count = selectedLeadIds.size;
    if (!window.confirm(`Archive ${count} selected card${count === 1 ? "" : "s"}?`)) {
      return;
    }

    const formData = new FormData();
    formData.set("ids", [...selectedLeadIds].join(","));
    setActionError("");

    startTransition(async () => {
      try {
        await archiveSelectedLeadsFromPipeline(formData);
        clearSelectedLeads();
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not archive the selected cards.");
      }
    });
  }

  function restoreSelectedLeads() {
    if (isPending || !selectedLeadIds.size) {
      return;
    }

    const count = selectedLeadIds.size;
    if (!window.confirm(`Restore ${count} selected card${count === 1 ? "" : "s"}?`)) {
      return;
    }

    const formData = new FormData();
    formData.set("ids", [...selectedLeadIds].join(","));
    setActionError("");

    startTransition(async () => {
      try {
        await restoreSelectedLeadsFromPipeline(formData);
        clearSelectedLeads();
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not restore the selected cards.");
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

      {newLeadCount > 0 || followUpCount > 0 ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950"
          role="status"
          aria-live="polite"
        >
          <span>Dispatcher reminder:</span>
          {newLeadCount > 0 ? (
            <span>{newLeadCount} new lead{newLeadCount === 1 ? "" : "s"} need first contact.</span>
          ) : null}
          {followUpCount > 0 ? (
            <span>{followUpCount} Follow-Up item{followUpCount === 1 ? "" : "s"} need action.</span>
          ) : null}
        </div>
      ) : null}

      {leads.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-xs font-bold text-muted shadow-sm">
          <span className="mr-2 text-primary">{selectedLeadIds.size} selected</span>
          <button
            type="button"
            onClick={selectAllLeads}
            disabled={isPending || selectedLeadIds.size === leads.length}
            className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select all {leads.length}
          </button>
          {!showArchived && followUpCount > 0 ? (
            <button
              type="button"
              onClick={selectFollowUpLeads}
              disabled={isPending || selectedLeadIds.size === followUpCount}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Select Follow-Up ({followUpCount})
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearSelectedLeads}
            disabled={isPending || selectedLeadIds.size === 0}
            className="rounded-lg border border-border bg-white px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear selection
          </button>
          {selectedLeadIds.size > 0 ? (
            <button
              type="button"
              onClick={showArchived ? restoreSelectedLeads : archiveSelectedLeads}
              disabled={isPending}
              className="rounded-lg border border-primary/20 bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showArchived ? "Restore selected" : "Archive selected"}
            </button>
          ) : null}
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
          className={`grid gap-3 ${view === "estimates" ? "min-w-[1200px] grid-cols-[repeat(3,minmax(400px,1fr))]" : "min-w-[5200px] grid-cols-[repeat(13,minmax(400px,1fr))]"}`}
        >
        {columns.map((column) => {
          const columnLeads = getColumnLeads(leads, column.value);
          const visibleCardCount = visibleCardCounts[column.value] ?? INITIAL_VISIBLE_CARDS;
          const visibleColumnLeads = columnLeads.slice(0, visibleCardCount);
          const hiddenLeadCount = Math.max(columnLeads.length - visibleColumnLeads.length, 0);

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

              <div className="grid grid-cols-2 gap-2.5">
                {visibleColumnLeads.map((lead) => (
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
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.id)}
                            disabled={isPending}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => toggleLeadSelection(lead.id, event.target.checked)}
                            className="h-3.5 w-3.5 shrink-0 accent-primary"
                            aria-label={`Select ${lead.name}`}
                          />
                          <span className="truncate">{lead.name}</span>
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

                    <div className="mt-3 grid gap-1.5 text-[0.65rem] font-bold text-muted">
                      <span className="truncate rounded-full bg-slate-100 px-2 py-1" title="Booked date and time">
                        Booked: {formatBookedLabel(lead)}
                      </span>
                      {lead.assigned_technician ? (
                        <span className="truncate rounded-full bg-primary/5 px-2 py-1 text-primary" title="Assigned technician">
                          Tech: {lead.assigned_technician}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">Tech: Unassigned</span>
                      )}
                      {lead.pipeline_stage === "follow_up_required" ? (
                        <span
                          className="truncate rounded-full bg-orange-50 px-2 py-1 text-orange-800"
                          title={lead.follow_up_reason || "Dispatcher action needed"}
                        >
                          Action: {lead.follow_up_reason || "Dispatcher action needed"}
                        </span>
                      ) : null}
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
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => (showArchived ? restoreLead(lead) : archiveLead(lead))}
                        disabled={isPending}
                        className="rounded-lg border border-primary/15 bg-white px-2 py-1.5 text-[0.65rem] font-black text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`${showArchived ? "Restore" : "Archive"} ${lead.name}`}
                      >
                        {showArchived ? "Restore" : "Archive"}
                      </button>
                      {canDeleteLeads ? (
                        <button
                          type="button"
                          onClick={() => deleteLead(lead)}
                          disabled={isPending}
                          className="rounded-lg border border-accent/20 bg-white px-2 py-1.5 text-[0.65rem] font-black text-accent transition hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${lead.name}`}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}

                {columnLeads.length > INITIAL_VISIBLE_CARDS ? (
                  <div className="col-span-2 grid gap-2">
                    {hiddenLeadCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCardCounts((current) => ({
                          ...current,
                          [column.value]: Math.min(visibleCardCount + LOAD_MORE_CARDS, columnLeads.length),
                        }))}
                        className="rounded-xl border border-primary/15 bg-white px-3 py-2 text-xs font-black text-primary transition hover:bg-primary/5"
                      >
                        Show {Math.min(LOAD_MORE_CARDS, hiddenLeadCount)} more
                      </button>
                    ) : null}
                    {visibleCardCount > INITIAL_VISIBLE_CARDS ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCardCounts((current) => ({
                          ...current,
                          [column.value]: INITIAL_VISIBLE_CARDS,
                        }))}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-black text-muted transition hover:bg-slate-50"
                      >
                        Show less
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {columnLeads.length === 0 ? (
                  <div className="col-span-2 rounded-xl border border-dashed border-primary/15 bg-white/40 px-3 py-8 text-center text-xs font-bold text-muted">
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
