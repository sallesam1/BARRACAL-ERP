import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}