import Link from "next/link";
import type { CustomerHistoryItem } from "@/lib/customer-history";

type CustomerHistoryCardProps = {
  items: CustomerHistoryItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function CustomerHistoryCard({ items }: CustomerHistoryCardProps) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Customer history
          </p>
          <h2 className="mt-1 text-xl font-black text-primary">Previous jobs</h2>
        </div>
        <span className="w-fit rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
          {items.length}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {items.map((item) => {
            const amount = formatMoney(item.amount);

            return (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href={item.href}
                  className="block rounded-xl border border-border bg-slate-50 p-4 transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span>
                      <span className="block text-sm font-black text-primary">{item.title}</span>
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        {formatDate(item.date)} ET
                      </span>
                    </span>
                    <span className="w-fit rounded-full border border-border bg-white px-3 py-1 text-xs font-bold capitalize text-foreground">
                      {item.status}
                    </span>
                  </span>
                  <span className="mt-3 grid gap-1 text-sm leading-6 text-muted">
                    <span>{item.appliance || "Appliance not selected"}</span>
                    <span>{item.address || "Address not set"}</span>
                    {amount ? <span className="font-bold text-foreground">{amount}</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
          No previous jobs found for this phone or email yet.
        </p>
      )}
    </section>
  );
}
