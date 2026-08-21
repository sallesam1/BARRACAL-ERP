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
  const [isAdmin, setIsAdmin] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      // Verifica se o usuário é admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsAdmin(profile?.role === "admin");
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

  const toggleMenu = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const linkClass = "block p-2 rounded hover:bg-gray-700";
  const subLinkClass = "block p-2 pl-6 rounded hover:bg-gray-700 text-sm";

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-gray-700">
          Barracal ERP
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link href="/dashboard" className={linkClass}>Dashboard</Link>
          <Link href="/dashboard/customers" className={linkClass}>Clientes</Link>
          <Link href="/dashboard/suppliers" className={linkClass}>Fornecedores</Link>
          <Link href="/dashboard/products" className={linkClass}>Produtos</Link>
          <Link href="/dashboard/inventory" className={linkClass}>Estoque</Link>
          <Link href="/dashboard/purchases" className={linkClass}>Compras</Link>
          <Link href="/dashboard/sales" className={linkClass}>Vendas</Link>
          <Link href="/dashboard/quotes" className={linkClass}>Cotação</Link>

          {/* Despesas com sub-menu */}
          <button onClick={() => toggleMenu("expenses")} className="w-full text-left p-2 rounded hover:bg-gray-700 flex justify-between items-center">
            <span>Despesas</span>
            <span>{openMenu === "expenses" ? "▲" : "▼"}</span>
          </button>
          {openMenu === "expenses" && (
            <div className="space-y-1">
              <Link href="/dashboard/expenses" className={subLinkClass}>Despesas</Link>
              <Link href="/dashboard/expense-categories" className={subLinkClass}>Categorias de Despesa</Link>
            </div>
          )}

          {/* Financeiro com sub-menu */}
          <button onClick={() => toggleMenu("financial")} className="w-full text-left p-2 rounded hover:bg-gray-700 flex justify-between items-center">
            <span>Financeiro</span>
            <span>{openMenu === "financial" ? "▲" : "▼"}</span>
          </button>
          {openMenu === "financial" && (
            <div className="space-y-1">
              <Link href="/dashboard/accounts-payable" className={subLinkClass}>Contas a Pagar</Link>
              <Link href="/dashboard/accounts-receivable" className={subLinkClass}>Contas a Receber</Link>
              <Link href="/dashboard/bank-accounts" className={subLinkClass}>Contas Bancárias</Link>
              <Link href="/dashboard/loans" className={subLinkClass}>Empréstimos</Link>
              <Link href="/dashboard/loan-categories" className={subLinkClass}>Categorias de Empréstimo</Link>
            </div>
          )}

          <Link href="/dashboard/reports" className={linkClass}>Relatórios</Link>

          {/* Admin vê Configuração, usuário vê Tema */}
          {isAdmin ? (
            <Link href="/dashboard/settings" className={linkClass}>Configuração</Link>
          ) : (
            <Link href="/dashboard/theme" className={linkClass}>Tema</Link>
          )}

          <Link href="/login" className={linkClass}>Sair</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}