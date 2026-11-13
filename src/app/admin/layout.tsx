import type { Metadata } from "next";
import { AdminRuntimeShell } from "@/components/admin/admin-runtime-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminRuntimeShell>{children}</AdminRuntimeShell>;
}
