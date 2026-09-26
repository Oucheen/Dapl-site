"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PricebookEntry } from "@/lib/pricebook";

type PricebookSearchProps = {
  entries: PricebookEntry[];
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function priceValue(value: string) {
  return Number(value.replace(/[^0-9.-]/g, "")) || 0;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function PricebookSearch({ entries }: PricebookSearchProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [subcategory, setSubcategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(entries.map((entry) => entry.category))).sort()],
    [entries],
  );

  const availableSubcategories = useMemo(() => {
    const source = category === "All" ? entries : entries.filter((entry) => entry.category === category);
    return ["All", ...Array.from(new Set(source.map((entry) => entry.subcategory).filter(Boolean))).sort()];
  }, [category, entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalize(query);

    return entries
      .filter((entry) => category === "All" || entry.category === category)
      .filter((entry) => subcategory === "All" || entry.subcategory === subcategory)
      .filter((entry) => {
        if (!normalizedQuery) {
          return true;
        }

        return normalize(
          [entry.name, entry.category, entry.subcategory, entry.description].filter(Boolean).join(" "),
        ).includes(normalizedQuery);
      })
      .sort((left, right) => {
        const nameSort = left.name.localeCompare(right.name);
        return nameSort || priceValue(left.price) - priceValue(right.price);
      });
  }, [category, entries, query, subcategory]);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      const key = `${entry.category}|${entry.subcategory}|${normalize(entry.name)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  }, [entries]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }

      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  async function copyPrice(entry: PricebookEntry) {
    try {
      await navigator.clipboard.writeText(entry.price);
      setCopiedId(entry.id);
      window.setTimeout(() => setCopiedId((current) => (current === entry.id ? null : current)), 1400);
    } catch {
      setCopiedId(null);
    }
  }

  function resetFilters() {
    setQuery("");
    setCategory("All");
    setSubcategory("All");
    searchRef.current?.focus();
  }

  return (
    <section className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-slate-50/95 px-4 pb-4 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="relative">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing a service, part, or appliance..."
            aria-label="Search price book"
            autoFocus
            className="w-full rounded-2xl border-2 border-primary/20 bg-white px-5 py-4 pr-24 text-base font-semibold text-foreground shadow-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-slate-50 px-2 py-1 text-xs font-bold text-muted">
            Ctrl K
          </span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setCategory(item);
                setSubcategory("All");
              }}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              {item === "All" ? "All categories" : item}
            </button>
          ))}
        </div>

        {availableSubcategories.length > 1 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {availableSubcategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSubcategory(item)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  subcategory === item
                    ? "bg-slate-800 text-white"
                    : "bg-slate-200/70 text-slate-700 hover:bg-slate-300"
                }`}
              >
                {item === "All" ? "All appliances" : item}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted">
          {query || category !== "All" || subcategory !== "All" ? (
            <>
              Found <span className="font-black text-primary">{formatCount(filteredEntries.length)}</span> of {formatCount(entries.length)} positions
            </>
          ) : (
            <>{formatCount(entries.length)} positions in the price book</>
          )}
        </p>
        {query || category !== "All" || subcategory !== "All" ? (
          <button type="button" onClick={resetFilters} className="text-xs font-bold text-primary hover:underline">
            Clear search
          </button>
        ) : null}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
          <p className="font-black text-primary">Nothing found</p>
          <p className="mt-2 text-sm text-muted">Try a shorter name, appliance type, or another category.</p>
          <button type="button" onClick={resetFilters} className="mt-5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Show all positions
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1fr)_150px_110px] gap-4 border-b border-border bg-slate-50 px-5 py-3 text-[0.65rem] font-black uppercase tracking-[0.14em] text-muted sm:grid">
            <span>Service or part</span>
            <span>Category</span>
            <span className="text-right">Customer price</span>
          </div>
          <div className="divide-y divide-border">
            {filteredEntries.map((entry) => {
              const duplicateKey = `${entry.category}|${entry.subcategory}|${normalize(entry.name)}`;
              const hasDuplicate = (duplicateNames.get(duplicateKey) ?? 0) > 1;
              const expanded = expandedId === entry.id;

              return (
                <div key={entry.id} className="px-4 py-4 transition hover:bg-slate-50 sm:px-5">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_110px] sm:items-center sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : entry.id)}
                      className="min-w-0 text-left"
                      aria-expanded={expanded}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-black text-primary">{entry.name}</p>
                        {hasDuplicate ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-800">
                            model / variant pricing
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">Click for details</p>
                    </button>
                    <div className="flex flex-wrap gap-1.5 text-xs font-bold text-muted">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{entry.category}</span>
                      {entry.subcategory ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{entry.subcategory}</span> : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-2xl font-black tabular-nums text-primary">{entry.price}</span>
                      <button
                        type="button"
                        onClick={() => copyPrice(entry)}
                        className="rounded-lg border border-primary/15 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/5"
                        title="Copy price"
                      >
                        {copiedId === entry.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  {expanded ? (
                    <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-foreground">
                      {entry.description || "No additional note in the price book."}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
