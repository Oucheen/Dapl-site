"use client";

import { useMemo, useState } from "react";

function toMoney(value: string) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.max(0, amount));
}

export function ManualChargeFields() {
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const priceAmount = Number(unitPrice || 0);
  const quantityAmount = Number(quantity || 1);
  const hasPrice = Number.isFinite(priceAmount) && priceAmount > 0;
  const previewTotal = useMemo(() => {
    if (!Number.isFinite(priceAmount) || !Number.isFinite(quantityAmount)) {
      return "$0.00";
    }

    return toMoney(String(priceAmount * quantityAmount));
  }, [priceAmount, quantityAmount]);

  return (
    <div className="grid gap-3">
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_120px] xl:grid-cols-[minmax(0,1fr)_110px_160px]">
        <label className="grid min-w-0 gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Service / charge
          <input
            name="invoiceItemDescription"
            placeholder="Refrigerator repair service"
            className="w-full min-w-0 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Qty
          <input
            type="number"
            name="invoiceItemQuantity"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-full min-w-0 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted sm:col-span-2 xl:col-span-1">
          Unit price
          <input
            type="number"
            name="invoiceItemUnitPrice"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            className="w-full min-w-0 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
          />
        </label>
      </div>
      <div
        className={`rounded-xl border px-4 py-3 text-xs leading-5 ${
          hasPrice
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {hasPrice ? (
          <span>
            Customer charge preview: <span className="font-black">{previewTotal}</span>.
          </span>
        ) : (
          <span>
            Draft only: price is missing, so the invoice will start at{" "}
            <span className="font-black">$0.00</span>.
          </span>
        )}
      </div>
    </div>
  );
}
