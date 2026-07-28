"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ReportSavedActionsProps = {
  autoRedirect: boolean;
  editHref: string;
  invoiceHref: string;
};

export function ReportSavedActions({
  autoRedirect,
  editHref,
  invoiceHref,
}: ReportSavedActionsProps) {
  const router = useRouter();

  useEffect(() => {
    if (!autoRedirect) {
      return;
    }

    const timerId = window.setTimeout(() => {
      router.push(invoiceHref);
    }, 2000);

    return () => window.clearTimeout(timerId);
  }, [autoRedirect, invoiceHref, router]);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 p-3 text-emerald-900 sm:p-4">
      <p className="text-sm font-black">Report saved. Thank you.</p>
      <p className="mt-1 text-xs font-semibold leading-5">
        {autoRedirect
          ? "Opening the invoice in a moment."
          : "Review the warning above before opening the invoice."}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Link
          href={invoiceHref}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
        >
          Open invoice
        </Link>
        <Link
          href={editHref}
          className="inline-flex items-center justify-center rounded-xl border border-emerald-700/20 bg-white px-4 py-3 text-sm font-black text-emerald-900 transition hover:bg-emerald-100"
        >
          Edit report again
        </Link>
      </div>
    </div>
  );
}
