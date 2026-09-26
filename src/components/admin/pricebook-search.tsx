"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PricebookEntry } from "@/lib/pricebook";

type PricebookSearchProps = {
  entries: PricebookEntry[];
};

type PricebookGroup = {
  key: string;
  category: string;
  subcategory: string;
  brandGroups: string[];
  name: string;
  description: string;
  totalCount: number;
  variants: Array<{ brandGroup: string; price: string; count: number }>;
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
  const [brandGroup, setBrandGroup] = useState("All");
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

  const availableBrandGroups = useMemo(() => {
    const source = entries.filter(
      (entry) =>
        (category === "All" || entry.category === category) &&
        (subcategory === "All" || entry.subcategory === subcategory),
    );
    return ["All", ...Array.from(new Set(source.map((entry) => entry.brandGroup).filter(Boolean))).sort()];
  }, [category, entries, subcategory]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalize(query);

    return entries
      .filter((entry) => category === "All" || entry.category === category)
      .filter((entry) => subcategory === "All" || entry.subcategory === subcategory)
      .filter((entry) => brandGroup === "All" || entry.brandGroup === brandGroup)
      .filter((entry) => {
        if (!normalizedQuery) {
          return true;
        }

        return normalize(
          [entry.name, entry.category, entry.subcategory, entry.brandGroup, entry.description].filter(Boolean).join(" "),
        ).includes(normalizedQuery);
      })
      .sort((left, right) => {
        const nameSort = left.name.localeCompare(right.name);
        return nameSort || priceValue(left.price) - priceValue(right.price);
      });
  }, [brandGroup, category, entries, query, subcategory]);

  const groupedEntries = useMemo<PricebookGroup[]>(() => {
    const groups = new Map<string, PricebookGroup>();

    for (const entry of filteredEntries) {
      const key = `${entry.category}|${entry.subcategory}|${normalize(entry.name)}`;
      const group = groups.get(key) ?? {
        key,
        category: entry.category,
        subcategory: entry.subcategory,
        brandGroups: [],
        name: entry.name,
        description: entry.description,
        totalCount: 0,
        variants: [],
      };
      const variant = group.variants.find(
        (item) => item.brandGroup === entry.brandGroup && item.price === entry.price,
      );

      group.totalCount += 1;
      if (variant) {
        variant.count += 1;
      } else {
        group.variants.push({ brandGroup: entry.brandGroup, price: entry.price, count: 1 });
      }

      if (entry.brandGroup && !group.brandGroups.includes(entry.brandGroup)) {
        group.brandGroups.push(entry.brandGroup);
      }

      if (!group.description && entry.description) {
        group.description = entry.description;
      }

      groups.set(key, group);
    }

    return Array.from(groups.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [filteredEntries]);

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

  async function copyPrice(id: string, price: string) {
    try {
      await navigator.clipboard.writeText(price);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1400);
    } catch {
      setCopiedId(null);
    }
  }

  function resetFilters() {
    setQuery("");
    setCategory("All");
    setSubcategory("All");
    setBrandGroup("All");
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
                setBrandGroup("All");
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
                onClick={() => {
                  setSubcategory(item);
                  setBrandGroup("All");
                }}
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

        {availableBrandGroups.length > 1 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {availableBrandGroups.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setBrandGroup(item)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  brandGroup === item
                    ? "bg-blue-900 text-white"
                    : "bg-blue-50 text-blue-900 hover:bg-blue-100"
                }`}
              >
                {item === "All" ? "All brands" : item}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted">
          {query || category !== "All" || subcategory !== "All" || brandGroup !== "All" ? (
            <>
              Found <span className="font-black text-primary">{formatCount(groupedEntries.length)}</span> groups / {formatCount(filteredEntries.length)} source positions
            </>
          ) : (
            <>{formatCount(groupedEntries.length)} groups / {formatCount(entries.length)} source positions</>
          )}
        </p>
        {query || category !== "All" || subcategory !== "All" || brandGroup !== "All" ? (
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
            {groupedEntries.map((group) => {
              const expanded = expandedId === group.key;
              const sortedVariants = [...group.variants].sort((left, right) => {
                const brandSort = left.brandGroup.localeCompare(right.brandGroup);
                return brandSort || priceValue(left.price) - priceValue(right.price);
              });
              const prices = Array.from(new Set(sortedVariants.map((variant) => variant.price))).sort(
                (left, right) => priceValue(left) - priceValue(right),
              );
              const lowestPrice = prices[0] ?? "$0.00";
              const highestPrice = prices[prices.length - 1] ?? lowestPrice;
              const hasVariants = sortedVariants.length > 1;
              const priceLabel = prices.length > 1 ? `${lowestPrice}–${highestPrice}` : lowestPrice;

              return (
                <div key={group.key} className="px-4 py-4 transition hover:bg-slate-50 sm:px-5">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_110px] sm:items-center sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : group.key)}
                      className="min-w-0 text-left"
                      aria-expanded={expanded}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-black text-primary">{group.name}</p>
                        {hasVariants || group.totalCount > 1 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-800">
                            {group.brandGroups.length > 1
                              ? `${group.brandGroups.length} brand groups`
                              : hasVariants
                                ? `${sortedVariants.length} price variants`
                                : `${group.totalCount} source rows`}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">{hasVariants ? "Click to compare prices" : "Click for details"}</p>
                    </button>
                    <div className="flex flex-wrap gap-1.5 text-xs font-bold text-muted">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{group.category}</span>
                      {group.subcategory ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{group.subcategory}</span> : null}
                      {group.brandGroups.length === 1 ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-900">{group.brandGroups[0]}</span>
                      ) : group.brandGroups.length > 1 ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-900">Multiple brands</span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-xl font-black tabular-nums text-primary sm:text-2xl">{priceLabel}</span>
                      {!hasVariants ? (
                        <button
                          type="button"
                          onClick={() => copyPrice(group.key, lowestPrice)}
                          className="rounded-lg border border-primary/15 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/5"
                          title="Copy price"
                        >
                          {copiedId === group.key ? "Copied" : "Copy"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {expanded ? (
                    <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-foreground">
                      {hasVariants ? (
                        <div className="flex flex-wrap gap-2">
                          {sortedVariants.map((variant) => (
                            <div key={`${variant.brandGroup}-${variant.price}`} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
                              <span className="font-black text-primary">{variant.brandGroup || "General"}</span>
                              <span className="font-black text-primary">{variant.price}</span>
                              {variant.count > 1 ? <span className="text-xs text-muted">×{variant.count}</span> : null}
                              <button
                                type="button"
                                onClick={() => copyPrice(`${group.key}-${variant.price}`, variant.price)}
                                className="rounded border border-primary/15 px-2 py-1 text-xs font-bold text-primary"
                              >
                                {copiedId === `${group.key}-${variant.price}` ? "Copied" : "Copy"}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {group.description ? <p className={hasVariants ? "mt-3" : ""}>{group.description}</p> : null}
                      <p className="mt-3 text-xs font-semibold text-muted">
                        Brand groups are taken from subcategory 2. Some source rows intentionally combine several brands.
                      </p>
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
