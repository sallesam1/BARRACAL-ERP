"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Boxes,
  ShoppingCart,
  ShoppingBag,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  BarChart3,
  Settings,
  Receipt,
  Tags,
  LogOut,
  ChevronDown,
  Landmark,
  HandCoins,
  FolderOpen,
  Menu,
  X,
  Palette,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Clientes", icon: Users },
  { href: "/dashboard/suppliers", label: "Fornecedores", icon: Truck },
  { href: "/dashboard/products", label: "Produtos", icon: Package },
  { href: "/dashboard/inventory", label: "Estoque", icon: Boxes },
  { href: "/dashboard/purchases", label: "Compras", icon: ShoppingCart },
  { href: "/dashboard/sales", label: "Vendas", icon: ShoppingBag },
  { href: "/dashboard/quotes", label: "Cotação", icon: FileText },
];

const expenseItems = [
  { href: "/dashboard/expenses", label: "Despesas", icon: Receipt },
  { href: "/dashboard/expense-categories", label: "Categorias de Despesa", icon: Tags },
];

const financialItems = [
  { href: "/dashboard/accounts-payable", label: "Contas a Pagar", icon: ArrowDownCircle },
  { href: "/dashboard/accounts-receivable", label: "Contas a Receber", icon: ArrowUpCircle },
  { href: "/dashboard/bank-accounts", label: "Contas Correntes", icon: Landmark },
  { href: "/dashboard/loans", label: "Empréstimos", icon: HandCoins },
  { href: "/dashboard/loan-categories", label: "Categorias de Empréstimo", icon: FolderOpen },
  { href: "/dashboard/financial", label: "Financeiro", icon: Wallet },
];

const bottomItems = [
  { href: "/dashboard/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/theme", label: "Tema", icon: Palette },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isViewer, setIsViewer] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data && data.role === "viewer") {
          setIsViewer(true);
        }
      } catch {}
    }
    checkRole();
  }, [supabase]);

  // ADMIN: vê Configurações (sem Tema) | VIEWER: vê Tema (sem Configurações)
  const visibleBottomItems = bottomItems.filter((item) => {
    if (isViewer) {
      return item.href !== "/dashboard/settings";
    }
    return item.href !== "/dashboard/theme";
  });

  const isExpenseActive = expenseItems.some((item) => pathname === item.href);
  const isFinancialActive = financialItems.some((item) => pathname === item.href);

  function toggleExpense() {
    setExpenseOpen((v) => !v);
    setFinancialOpen(false);
  }

  function toggleFinancial() {
    setFinancialOpen((v) => !v);
    setExpenseOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function renderLink(item: { href: string; label: string; icon: any }) {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  function renderGroup(
    label: string,
    icon: any,
    items: { href: string; label: string; icon: any }[],
    open: boolean,
    setOpen: (v: boolean) => void,
    isActive: boolean
  ) {
    const Icon = icon;
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
            {items.map(renderLink)}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg md:hidden"
        aria-label="Abrir menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card text-card-foreground transition-transform duration-300",
          "md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-lg font-bold">Barracal ERP</h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map(renderLink)}

          {renderGroup("Despesas", Receipt, expenseItems, expenseOpen, toggleExpense, isExpenseActive)}

          {renderGroup("Financeiro", Wallet, financialItems, financialOpen, toggleFinancial, isFinancialActive)}

          {visibleBottomItems.map(renderLink)}
        </nav>

        <div className="border-t border-border p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}