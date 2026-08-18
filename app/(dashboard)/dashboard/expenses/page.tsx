"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Pencil, Trash2, X } from "lucide-react";

// Retorna a data de HOJE no fuso do usuário (não em UTC)
function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// Converte aaaa-mm-dd para dd/mm/aaaa
function formatDateBR(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Nomes bonitos das formas de pagamento
const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
};

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayLocal());
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [installments, setInstallments] = useState(1);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const [expRes, catRes] = await Promise.all([
          supabase
            .from("expenses")
            .select("*")
            .eq("user_id", user.id)
            .order("expense_date", { ascending: false }),
          supabase
            .from("expense_categories")
            .select("id, name")
            .eq("user_id", user.id)
            .order("name"),
        ]);
        if (expRes.data) setExpenses(expRes.data);
        if (catRes.data) {
          setCategories(catRes.data);
          if (catRes.data.length > 0) setCategory(catRes.data[0].name);
        }
      } catch (e: any) {
        setMessage({ type: "error", text: "Erro ao carregar: " + (e?.message || e) });
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setDescription("");
    setAmount("");
    setNotes("");
    setInstallments(1);
    setEditingId(null);
    setMessage(null);
  }

  function startEdit(exp: any) {
    setEditingId(exp.id);
    setDescription(exp.description || "");
    setAmount(exp.amount != null ? String(exp.amount) : "");
    setExpenseDate(exp.expense_date ? exp.expense_date.slice(0, 10) : todayLocal());
    setPaymentMethod(exp.payment_method || "pix");
    setInstallments(exp.installments > 0 ? exp.installments : 1);
    setCategory(exp.category || (categories.length > 0 ? categories[0].name : ""));
    setNotes(exp.notes || "");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        setSaving(false);
        return;
      }
      if (!description.trim()) {
        setMessage({ type: "error", text: "Descreva a despesa." });
        setSaving(false);
        return;
      }
      const value = Number(amount);
      if (!value || value <= 0) {
        setMessage({ type: "error", text: "Informe um valor válido." });
        setSaving(false);
        return;
      }
      const parcelas = installments > 0 ? installments : 1;
      let expenseId: string;

      if (editingId) {
        const { error: updErr } = await supabase
          .from("expenses")
          .update({
            description,
            amount: value,
            expense_date: expenseDate,
            payment_method: paymentMethod,
            installments: parcelas,
            category,
            notes,
          })
          .eq("id", editingId);
        if (updErr) throw updErr;
        expenseId = editingId;
        await supabase.from("accounts_payable").delete().eq("expense_id", editingId);
      } else {
        const { data: expense, error: expErr } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            description,
            amount: value,
            expense_date: expenseDate,
            payment_method: paymentMethod,
            installments: parcelas,
            category,
            notes,
          })
          .select()
          .single();
        if (expErr) throw expErr;
        expenseId = expense.id;
      }

      const valorParcela = value / parcelas;
      const payRows = Array.from({ length: parcelas }, (_, i) => {
        const due = new Date(expenseDate);
        due.setMonth(due.getMonth() + i);
        return {
          user_id: user.id,
          expense_id: expenseId,
          description: `${description} — ${i + 1}/${parcelas}`,
          amount: Number(valorParcela.toFixed(2)),
          due_date: due.toISOString().slice(0, 10),
          status: "pending",
          installment_number: i + 1,
          total_installments: parcelas,
        };
      });
      const { error: payErr } = await supabase.from("accounts_payable").insert(payRows);
      if (payErr) throw payErr;

      setMessage({
        type: "success",
        text: editingId
          ? `Despesa atualizada! ${parcelas}x de R$ ${valorParcela.toFixed(2)} recalculadas no Contas a Pagar.`
          : `Despesa salva! ${parcelas}x de R$ ${valorParcela.toFixed(2)} geradas no Contas a Pagar.`,
      });
      resetForm();
      const { data: res } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });
      if (res) setExpenses(res);
    } catch (e: any) {
      console.error("Erro ao salvar despesa:", e);
      setMessage({ type: "error", text: "Erro ao salvar: " + (e?.message || e) });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta despesa? As parcelas dela no Contas a Pagar também serão removidas. Prefira EDITAR em vez de excluir.")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("accounts_payable").delete().eq("expense_id", id);
      await supabase.from("expenses").delete().eq("id", id);
      setMessage({ type: "success", text: "Despesa excluída." });
      const { data: res } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });
      if (res) setExpenses(res);
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao excluir: " + (e?.message || e) });
    }
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Despesas</h1>

      {message && (
        <div className={
          "p-3 rounded-md border text-sm " +
          (message.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700")
        }>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Despesa" : "Nova Despesa"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingId && (
            <p className="text-xs text-gray-500">Editando despesa existente — ao salvar, as parcelas do Contas a Pagar são recalculadas.</p>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Gás de cozinha, material de escritório, rolamento..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Valor (R$)</label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select className="w-full p-2 border rounded-md bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.length === 0 ? (
                  <option value="">Nenhuma categoria — cadastre na tela de Categorias</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
              <select className="w-full p-2 border rounded-md bg-white" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
                <option value="credito">Cartão de Crédito</option>
                <option value="debito">Cartão de Débito</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parcelas (até 12x)</label>
              <select className="w-full p-2 border rounded-md bg-white" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {editingId ? <Check className="mr-2 h-4 w-4" /> : null}
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Salvar Despesa"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma despesa registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Descrição</th>
                    <th className="py-2 pr-4">Categoria</th>
                    <th className="py-2 pr-4">Pagamento</th>
                    <th className="py-2 pr-4">Parcelas</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="py-2 pr-4">{formatDateBR(e.expense_date)}</td>
                      <td className="py-2 pr-4">{e.description}</td>
                      <td className="py-2 pr-4">{e.category || "—"}</td>
                      <td className="py-2 pr-4">{PAYMENT_LABELS[e.payment_method] || e.payment_method || "—"}</td>
                      <td className="py-2 pr-4">{e.installments}x</td>
                      <td className="py-2 pr-4 text-right font-medium">R$ {Number(e.amount).toFixed(2)}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(e)} className="text-slate-600 hover:text-slate-900" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:text-red-700" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}