"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-gray-700">
          Barracal ERP
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="block p-2 rounded hover:bg-gray-700">Dashboard</Link>
          <Link href="/dashboard/products" className="block p-2 rounded hover:bg-gray-700">Produtos</Link>
          <Link href="/dashboard/sales" className="block p-2 rounded hover:bg-gray-700">Vendas</Link>
          <Link href="/dashboard/customers" className="block p-2 rounded hover:bg-gray-700">Clientes</Link>
          <Link href="/dashboard/accounts-payable" className="block p-2 rounded hover:bg-gray-700">Contas a Pagar</Link>
          <Link href="/dashboard/inventory" className="block p-2 rounded hover:bg-gray-700">Estoque</Link>
          <Link href="/dashboard/theme" className="block p-2 rounded hover:bg-gray-700">Meu Tema</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}