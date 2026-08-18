"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet, TrendingUp, TrendingDown, Scale, AlertTriangle,
  ArrowUpRight, ArrowDownRight, HandCoins,
} from "lucide-react";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function monthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("Barracal ERP");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [salesMonth, setSalesMonth] = useState(0);
  const [expensesMonth, setExpensesMonth] = useState(0);
  const [payableOpen, setPayableOpen] = useState(0);
  const [receivableOpen, setReceivableOpen] = useState(0);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [nextInstallments, setNextInstallments] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) { setLoading(false); return; }

        try {
          const { data: st } = await supabase
            .from("settings").select("company_name").eq("user_id", user.id).maybeSingle();
          if (active && st?.company_name) setCompanyName(st.company_name);
        } catch {}

        try {
          const [accRes, txRes] = await Promise.all([
            supabase.from("bank_accounts").select("*").eq("user_id", user.id),
            supabase.from("bank_transactions").select("*").eq("user_id", user.id),
          ]);
          if (active) { setAccounts(accRes.data || []); setTransactions(txRes.data || []); }
        } catch {}

        try {
          const { data: sales } = await supabase.from("sales").select("*").eq("user_id", user.id);
          if (active && sales) {
            const total = sales
              .filter((s: any) => String(s.sale_date || s.created_at || "").startsWith(monthPrefix()))
              .reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            setSalesMonth(total);
          }
        } catch {}

        try {
          const { data: expenses } = await supabase.from("expenses").select("*").eq("user_id", user.id);
          if (active && expenses) {
            const total = expenses
              .filter((e: any) => String(e.expense_date || e.date || e.created_at || "").startsWith(monthPrefix()))
              .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
            setExpensesMonth(total);
          }
        } catch {}

        try {
          const [ap, ar] = await Promise.all([
            supabase.from("accounts_payable").select("*").eq("user_id", user.id).eq("status", "pending"),
            supabase.from("accounts_receivable").select("*").eq("user_id", user.id).eq("status", "pending"),
          ]);
          if (active) {
            if (ap.data) setPayableOpen(ap.data.reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0));
            if (ar.data) setReceivableOpen(ar.data.reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0));
          }
        } catch {}

        try {
          const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", user.id);
          if (active && inv) {
            const low = inv.filter((i: any) => Number(i.quantity) <= Number(i.min_quantity || 0));
            const { data: products } = await supabase.from("products").select("id, name");
            const nameMap = new Map((products || []).map((p: any) => [p.id, p.name]));
            setLowStock(low.map((i: any) => ({ ...i, product_name: nameMap.get(i.product_id) || "Produto" })));
          }
        } catch {}

        try {
          const { data: installments } = await supabase
            .from("loan_installments").select("*").eq("user_id", user.id).eq("status", "pending")
            .order("due_date", { ascending: true }).limit(5);
          if (active && installments && installments.length > 0) {
            const { data: loans } = await supabase.from("loans").select("id, description");
            const loanMap = new Map((loans || []).map((l: any) => [l.id, l.description]));
            setNextInstallments(installments.map((i: any) => ({ ...i, loan_description: loanMap.get(i.loan_id) || "Empréstimo" })));
          }
        } catch {}
      } catch (e) {
        console.error("Erro ao carregar dashboard:", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="p-6">Carregando...</p>;

  const balanceByAccount = new Map<string, number>();
  accounts.forEach((acc) => balanceByAccount.set(acc.id, Number(acc.initial_balance) || 0));
  transactions.forEach((t) => {
    const cur = balanceByAccount.get(t.account_id) || 0;
    balanceByAccount.set(t.account_id, t.type === "entrada" ? cur + t.amount : cur - t.amount);
  });
  let totalBalance = 0;
  balanceByAccount.forEach((v) => { totalBalance += v; });

  const monthTx = transactions.filter((t) => String(t.transaction_date).startsWith(monthPrefix()));
  const monthIn = monthTx.filter((t) => t.type === "entrada").reduce((a, t) => a + t.amount, 0);
  const monthOut = monthTx.filter((t) => t.type === "saida").reduce((a, t) => a + t.amount, 0);
  const monthResult = monthIn - monthOut;

  const recentTxs = [...transactions]
    .sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)))
    .slice(0, 8);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.account_name || "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{companyName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Saldo Total</div>
          <p className={`text-2xl font-bold mt-2 ${totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtBRL(totalBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">{accounts.length} conta(s) corrente(s)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-green-600" /> Entradas do Mês</div>
          <p className="text-2xl font-bold mt-2 text-green-600">{fmtBRL(monthIn)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="h-4 w-4 text-red-600" /> Saídas do Mês</div>
          <p className="text-2xl font-bold mt-2 text-red-600">{fmtBRL(monthOut)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Scale className="h-4 w-4" /> Resultado do Mês</div>
          <p className={`text-2xl font-bold mt-2 ${monthResult >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtBRL(monthResult)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Vendas do Mês</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmtBRL(salesMonth)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Despesas do Mês</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmtBRL(expensesMonth)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Em Aberto</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Pagar: {fmtBRL(payableOpen)}</span>
              <span className="text-green-600">Receber: {fmtBRL(receivableOpen)}</span>
            </div>
          </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Últimos Lançamentos</CardTitle></CardHeader>
        <CardContent>
          {recentTxs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento ainda. Lance entradas e saídas em Contas Correntes.</p>
          ) : (
            <div className="space-y-2">
              {recentTxs.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    {t.type === "entrada" ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                    <div>
                      <p className="font-medium text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.transaction_date} · {accountName(t.account_id)}</p>
                    </div>
                  </div>
                  <span className={"font-semibold " + (t.type === "entrada" ? "text-green-600" : "text-red-600")}>
                    {t.type === "entrada" ? "+" : "−"}{fmtBRL(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Estoque Baixo</CardTitle></CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto abaixo do mínimo.</p>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 6).map((i: any) => (
                  <div key={i.id} className="flex justify-between rounded-md border p-2 text-sm">
                    <span>{i.product_name}</span>
                    <span className="text-amber-600 font-medium">{i.quantity} un.</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><HandCoins className="h-4 w-4" /> Próximas Parcelas (Empréstimos)</CardTitle></CardHeader>
          <CardContent>
            {nextInstallments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma parcela pendente.</p>
            ) : (
              <div className="space-y-2">
                {nextInstallments.map((i: any) => (
                  <div key={i.id} className="flex justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{i.loan_description}</p>
                      <p className="text-xs text-muted-foreground">Parcela {i.installment_number} · vence {i.due_date}</p>
                    </div>
                    <span className="font-semibold">{fmtBRL(Number(i.total) || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}