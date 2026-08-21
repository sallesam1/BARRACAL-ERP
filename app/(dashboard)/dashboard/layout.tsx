"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Ícones SVG inline (sem depender de pacote externo)
const Icon = ({ d, className = "w-5 h-5" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  customers: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  suppliers: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  products: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  inventory: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v9",
  purchases: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  sales: "M3 3v18h18M19 9l-5 5-4-4-3 3",
  quotes: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  expenses: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  financial: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  reports: "M18 20V10M12 20V4M6 20v-6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  theme: "M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  chevron: "M6 9l6 6 6-6",
};

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
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Classes que se adaptam ao tema (claro e escuro)
  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm rounded transition-colors ${
      isActive(href)
        ? "bg-blue-900 text-white font-medium dark:bg-gray-700 dark:border-l-4 dark:border-white dark:rounded-none"
        : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
    }`;

  const subLinkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-2 pl-10 text-sm rounded transition-colors ${
      isActive(href)
        ? "bg-blue-900 text-white font-medium dark:bg-gray-700 dark:border-l-4 dark:border-white dark:rounded-none"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    }`;

  const menuBtnClass = (name: string) =>
    `flex items-center justify-between w-full px-4 py-2.5 text-sm rounded transition-colors ${
      openMenu === name || isActive(`/dashboard/${name}`)
        ? "bg-blue-900 text-white font-medium dark:bg-gray-700 dark:border-l-4 dark:border-white dark:rounded-none"
        : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
    }`;

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col dark:bg-gray-900 dark:border-gray-800">
        <div className="px-4 py-4 text-lg font-bold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-800">
          Barracal ERP
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            <Icon d={icons.dashboard} /> Dashboard
          </Link>
          <Link href="/dashboard/customers" className={linkClass("/dashboard/customers")}>
            <Icon d={icons.customers} /> Clientes
          </Link>
          <Link href="/dashboard/suppliers" className={linkClass("/dashboard/suppliers")}>
            <Icon d={icons.suppliers} /> Fornecedores
          </Link>
          <Link href="/dashboard/products" className={linkClass("/dashboard/products")}>
            <Icon d={icons.products} /> Produtos
          </Link>
          <Link href="/dashboard/inventory" className={linkClass("/dashboard/inventory")}>
            <Icon d={icons.inventory} /> Estoque
          </Link>
          <Link href="/dashboard/purchases" className={linkClass("/dashboard/purchases")}>
            <Icon d={icons.purchases} /> Compras
          </Link>
          <Link href="/dashboard/sales" className={linkClass("/dashboard/sales")}>
            <Icon d={icons.sales} /> Vendas
          </Link>
          <Link href="/dashboard/quotes" className={linkClass("/dashboard/quotes")}>
            <Icon d={icons.quotes} /> Cotação
          </Link>

          {/* Despesas com sub-menu */}
          <button onClick={() => toggleMenu("expenses")} className={menuBtnClass("expenses")}>
            <span className="flex items-center gap-3">
              <Icon d={icons.expenses} /> Despesas
            </span>
            <Icon d={icons.chevron} className={`w-4 h-4 transition-transform ${openMenu === "expenses" ? "rotate-180" : ""}`} />
          </button>
          {openMenu === "expenses" && (
            <div className="space-y-1">
              <Link href="/dashboard/expenses" className={subLinkClass("/dashboard/expenses")}>
                Despesas
              </Link>
              <Link href="/dashboard/expense-categories" className={subLinkClass("/dashboard/expense-categories")}>
                Categorias de Despesa
              </Link>
            </div>
          )}

          {/* Financeiro com sub-menu */}
          <button onClick={() => toggleMenu("financial")} className={menuBtnClass("financial")}>
            <span className="flex items-center gap-3">
              <Icon d={icons.financial} /> Financeiro
            </span>
            <Icon d={icons.chevron} className={`w-4 h-4 transition-transform ${openMenu === "financial" ? "rotate-180" : ""}`} />
          </button>
          {openMenu === "financial" && (
            <div className="space-y-1">
              <Link href="/dashboard/accounts-payable" className={subLinkClass("/dashboard/accounts-payable")}>
                Contas a Pagar
              </Link>
              <Link href="/dashboard/accounts-receivable" className={subLinkClass("/dashboard/accounts-receivable")}>
                Contas a Receber
              </Link>
              <Link href="/dashboard/bank-accounts" className={subLinkClass("/dashboard/bank-accounts")}>
                Contas Bancárias
              </Link>
              <Link href="/dashboard/loans" className={subLinkClass("/dashboard/loans")}>
                Empréstimos
              </Link>
              <Link href="/dashboard/loan-categories" className={subLinkClass("/dashboard/loan-categories")}>
                Categorias de Empréstimo
              </Link>
            </div>
          )}

          <Link href="/dashboard/reports" className={linkClass("/dashboard/reports")}>
            <Icon d={icons.reports} /> Relatórios
          </Link>

          {/* Admin vê Configuração, usuário vê Tema */}
          {isAdmin ? (
            <Link href="/dashboard/settings" className={linkClass("/dashboard/settings")}>
              <Icon d={icons.settings} /> Configuração
            </Link>
          ) : (
            <Link href="/dashboard/theme" className={linkClass("/dashboard/theme")}>
              <Icon d={icons.theme} /> Tema
            </Link>
          )}
        </nav>

        {/* Sair no rodapé */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <Link href="/login" className="flex items-center gap-3 px-4 py-2.5 text-sm rounded text-gray-800 hover:bg-gray-100 transition-colors dark:text-gray-200 dark:hover:bg-gray-800">
            <Icon d={icons.logout} /> Sair
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-950">{children}</main>
    </div>
  );
}