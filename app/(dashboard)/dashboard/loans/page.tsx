"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Eye, Pencil, X, Check } from "lucide-react";
// Retorna a data de HOJE no fuso do usuário (não em UTC)
function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
type LoanCategory = { id: string; name: string; default_interest_rate: number; default_amortization: string };
type Loan = {
  id: string;
  description: string;
  lender: string;
  amount: number;
  interest_rate: number;
  interest_period: string;
  amortization: string;
  grace_months: number;
  grace_type: string;
  total_installments: number;
  start_date: string;
  status: string;
  category_id: string | null;
};
type Installment = {
  installment_number: number;
  due_date: string;
  principal: number;
  interest: number;
  total: number;
  status: string;
};
const AMORT_LABELS: Record<string, string> = {
  price: "Tabela Price (parcelas fixas)",
  sac: "SAC (parcelas decrescentes)",
  simple: "Juros Simples",
  none: "Sem juros",
};
const GRACE_LABELS: Record<string, string> = {
  none: "Sem carência",
  interest_only: "Carência pagando só juros",
  no_interest: "Carência sem juros",
};
// Converte taxa anual em mensal (juros compostos)
function annualToMonthly(annual: number): number {
  return Math.pow(1 + annual / 100, 1 / 12) - 1;
}
// Gera a tabela de parcelas
function buildSchedule(params: {
  amount: number;
  monthlyRate: number;
  amortization: string;
  graceMonths: number;
  graceType: string;
  totalInstallments: number;
  startDate: string;
}): Installment[] {
  const { amount, monthlyRate, amortization, graceMonths, graceType, totalInstallments, startDate } = params;
  const schedule: Installment[] = [];
  const start = new Date(startDate + "T00:00:00");
  let balance = amount;
  let count = 0;
  function addMonth(principal: number, interest: number) {
    count++;
    const due = new Date(start);
    due.setMonth(due.getMonth() + count);
    schedule.push({
      installment_number: count,
      due_date: due.toISOString().slice(0, 10),
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      total: Math.round((principal + interest) * 100) / 100,
      status: "pending",
    });
  }
  // Fase de carência
  if (graceMonths > 0) {
    for (let g = 0; g < graceMonths; g++) {
      if (graceType === "interest_only") {
        const interest = balance * monthlyRate;
        addMonth(0, interest);
      } else if (graceType === "no_interest") {
        count++;
      } else {
        balance = balance * (1 + monthlyRate);
        count++;
      }
    }
  }
  const remaining = totalInstallments - schedule.length;
  if (remaining <= 0) return schedule;
  if (amortization === "none") {
    const principal = balance / remaining;
    for (let i = 0; i < remaining; i++) addMonth(principal, 0);
  } else if (amortization === "simple") {
    const totalInterest = balance * monthlyRate * remaining;
    const payment = (balance + totalInterest) / remaining;
    for (let i = 0; i < remaining; i++) {
      const interest = balance * monthlyRate;
      const principal = payment - interest;
      addMonth(principal, interest);
      balance -= principal;
    }
  } else if (amortization === "sac") {
    const amort = balance / remaining;
    for (let i = 0; i < remaining; i++) {
      const interest = balance * monthlyRate;
      addMonth(amort, interest);
      balance -= amort;
    }
  } else {
    // Tabela Price
    const i = monthlyRate;
    const pmt = i > 0 ? (balance * i) / (1 - Math.pow(1 + i, -remaining)) : balance / remaining;
    for (let k = 0; k < remaining; k++) {
      const interest = balance * i;
      const principal = pmt - interest;
      addMonth(principal, interest);
      balance -= principal;
    }
  }
  return schedule;
}
export default function LoansPage() {
  const [categories, setCategories] = useState<LoanCategory[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Form
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [lender, setLender] = useState("");
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [interestPeriod, setInterestPeriod] = useState("mensal");
  const [amortization, setAmortization] = useState("price");
  const [graceMonths, setGraceMonths] = useState("0");
  const [graceType, setGraceType] = useState("none");
  const [totalInstallments, setTotalInstallments] = useState("1");
  const [startDate, setStartDate] = useState(todayLocal());
  // Preview
  const [preview, setPreview] = useState<Installment[] | null>(null);
  const supabase = createClient();
  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        setLoading(false);
        return;
      }
      const [catRes, loanRes] = await Promise.all([
        supabase.from("loan_categories").select("*").order("name"),
        supabase.from("loans").select("*").order("created_at", { ascending: false }),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (loanRes.data) setLoans(loanRes.data);
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao carregar: " + (e?.message || e) });
    }
    setLoading(false);
  }
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function resetForm() {
    setEditingId(null);
    setCategoryId("");
    setDescription("");
    setLender("");
    setAmount("");
    setInterestRate("0");
    setInterestPeriod("mensal");
    setAmortization("price");
    setGraceMonths("0");
    setGraceType("none");
    setTotalInstallments("1");
    setStartDate(todayLocal());
    setPreview(null);
    setMessage(null);
  }
  function startEdit(loan: Loan) {
    setEditingId(loan.id);
    setCategoryId(loan.category_id || "");
    setDescription(loan.description || "");
    setLender(loan.lender || "");
    setAmount(String(loan.amount ?? ""));
    setInterestRate(String(loan.interest_rate ?? "0"));
    setInterestPeriod(loan.interest_period || "mensal");
    setAmortization(loan.amortization || "price");
    setGraceMonths(String(loan.grace_months ?? "0"));
    setGraceType(loan.grace_type || "none");
    setTotalInstallments(String(loan.total_installments ?? "1"));
    setStartDate(loan.start_date ? loan.start_date.slice(0, 10) : todayLocal());
    setPreview(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function handlePreview() {
    const val = parseFloat(amount) || 0;
    const rate = parseFloat(interestRate) || 0;
    const monthly = interestPeriod === "anual" ? annualToMonthly(rate) : rate / 100;
    const grace = parseInt(graceMonths) || 0;
    const total = parseInt(totalInstallments) || 1;
    setPreview(buildSchedule({
      amount: val,
      monthlyRate: monthly,
      amortization,
      graceMonths: grace,
      graceType,
      totalInstallments: total,
      startDate,
    }));
  }
  async function handleSave() {
    const val = parseFloat(amount) || 0;
    if (val <= 0 || !description.trim()) {
      setMessage({ type: "error", text: "Informe a descrição e um valor válido." });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }
      const payload = {
        user_id: user.id,
        category_id: categoryId || null,
        description: description.trim(),
        lender: lender.trim() || null,
        amount: val,
        interest_rate: parseFloat(interestRate) || 0,
        interest_period: interestPeriod,
        amortization,
        grace_months: parseInt(graceMonths) || 0,
        grace_type: graceType,
        total_installments: parseInt(totalInstallments) || 1,
        start_date: startDate,
        status: "active",
      };
      let loanId: string;
      if (editingId) {
        const { error: updErr } = await supabase
          .from("loans")
          .update({
            category_id: categoryId || null,
            description: description.trim(),
            lender: lender.trim() || null,
            amount: val,
            interest_rate: parseFloat(interestRate) || 0,
            interest_period: interestPeriod,
            amortization,
            grace_months: parseInt(graceMonths) || 0,
            grace_type: graceType,
            total_installments: parseInt(totalInstallments) || 1,
            start_date: startDate,
          })
          .eq("id", editingId);
        if (updErr) {
          setMessage({ type: "error", text: "Erro ao salvar: " + updErr.message });
          return;
        }
        loanId = editingId;
        // Recalcula as parcelas: apaga as antigas e recria
        await supabase.from("loan_installments").delete().eq("loan_id", editingId);
      } else {
        const { data: inserted, error } = await supabase.from("loans").insert(payload).select().single();
        if (error) {
          setMessage({ type: "error", text: "Erro ao salvar: " + error.message });
          return;
        }
        loanId = inserted.id;
      }
      // Gera e grava as parcelas
      const rate = parseFloat(interestRate) || 0;
      const monthly = interestPeriod === "anual" ? annualToMonthly(rate) : rate / 100;
      const schedule = buildSchedule({
        amount: val,
        monthlyRate: monthly,
        amortization,
        graceMonths: parseInt(graceMonths) || 0,
        graceType,
        totalInstallments: parseInt(totalInstallments) || 1,
        startDate,
      });
      const rows = schedule.map((p) => ({
        user_id: user.id,
        loan_id: loanId,
        installment_number: p.installment_number,
        due_date: p.due_date,
        principal: p.principal,
        interest: p.interest,
        total: p.total,
        status: "pending",
      }));
      const { error: insErr } = await supabase.from("loan_installments").insert(rows);
      if (insErr) {
        setMessage({ type: "error", text: "Empréstimo salvo, mas erro nas parcelas: " + insErr.message });
      } else {
        setMessage({
          type: "success",
          text: editingId
            ? `Empréstimo atualizado! ${schedule.length} parcelas recalculadas.`
            : `Empréstimo cadastrado com ${schedule.length} parcelas!`,
        });
      }
      resetForm();
      loadData();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao salvar: " + (e?.message || e) });
    }
  }
  async function handleDelete(id: string) {
    if (!confirm("Excluir este empréstimo? As parcelas dele também serão removidas. Prefira EDITAR em vez de excluir.")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }
      await supabase.from("loan_installments").delete().eq("loan_id", id);
      const { error } = await supabase.from("loans").delete().eq("id", id);
      if (error) throw error;
      setMessage({ type: "success", text: "Empréstimo excluído." });
      loadData();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao excluir: " + (e?.message || e) });
    }
  }
  if (loading) return <p className="p-6">Carregando...</p>;
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Empréstimos</h1>
      <Card>
        <CardHeader><CardTitle>{editingId ? "Editar Empréstimo" : "Novo Empréstimo"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className={"p-3 rounded-md border text-sm " + (message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700")}>
              {message.text}
            </div>
          )}
          {editingId && (
            <p className="text-xs text-gray-500">Editando empréstimo existente — ao salvar, as parcelas são recalculadas.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Input placeholder="Ex: Empréstimo BNDES, Cartão 12x, Sócio" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credor / Devedor</label>
              <Input placeholder="Ex: Banco do Brasil, Betão (pessoa física)" value={lender} onChange={(e) => setLender(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select className="w-full p-2 border rounded-md bg-background" value={categoryId} onChange={(e) => {
                setCategoryId(e.target.value);
                const cat = categories.find((c) => c.id === e.target.value);
                if (cat) {
                  setInterestRate(String(cat.default_interest_rate));
                  setAmortization(cat.default_amortization);
                }
              }}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valor (R$)</label>
              <Input type="number" step="0.01" placeholder="10000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Taxa de Juros</label>
              <div className="flex gap-2">
                <Input type="number" step="0.01" placeholder="2.5" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                <select className="p-2 border rounded-md bg-background" value={interestPeriod} onChange={(e) => setInterestPeriod(e.target.value)}>
                  <option value="mensal">% ao mês</option>
                  <option value="anual">% ao ano</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sistema de Cálculo</label>
              <select className="w-full p-2 border rounded-md bg-background" value={amortization} onChange={(e) => setAmortization(e.target.value)}>
                {Object.entries(AMORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Carência (meses)</label>
              <Input type="number" min="0" placeholder="0" value={graceMonths} onChange={(e) => setGraceMonths(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Carência</label>
              <select className="w-full p-2 border rounded-md bg-background" value={graceType} onChange={(e) => setGraceType(e.target.value)}>
                {Object.entries(GRACE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nº de Parcelas</label>
              <Input type="number" min="1" placeholder="12" value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data de Início</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" /> Ver parcelas
            </Button>
            <Button onClick={handleSave}>
              {editingId ? <Check className="mr-2 h-4 w-4" /> : null}
              {editingId ? "Salvar Alterações" : "Salvar Empréstimo"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
          {preview && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Prévia das parcelas ({preview.length})</h3>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Vencimento</th>
                      <th className="p-2 text-right">Principal</th>
                      <th className="p-2 text-right">Juros</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p) => (
                      <tr key={p.installment_number} className="border-t">
                        <td className="p-2">{p.installment_number}</td>
                        <td className="p-2">{p.due_date}</td>
                        <td className="p-2 text-right">{p.principal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        <td className="p-2 text-right">{p.interest.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        <td className="p-2 text-right font-medium">{p.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Empréstimos Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum empréstimo ainda.</p>
          ) : (
            <div className="space-y-2">
              {loans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{loan.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {loan.lender ? loan.lender + " · " : ""}
                      {loan.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      {loan.interest_rate > 0 ? ` · ${loan.interest_rate}% ${loan.interest_period === "anual" ? "a.a." : "a.m."}` : " · sem juros"}
                      {" · "}{loan.total_installments} parcelas
                      {loan.grace_months > 0 ? ` · ${loan.grace_months}m carência` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(loan)}>
                      <Pencil className="mr-1 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(loan.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}