"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Check, Pencil, Wallet, Trash2, Plus, X } from "lucide-react";

const CATEGORIES = ["Saldo Inicial", "Juros", "Multa", "Venda de Ativo", "Venda Antecipada", "Empréstimo", "Outros"];

const brl = (v: number) =>
  (v < 0 ? "-" : "") + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function maskAmount(value: string): string {
  let neg = value.startsWith("-");
  let cleaned = value.replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");
  if (parts.length > 2) cleaned = parts[0] + "," + parts.slice(1).join("");
  const [intPart, decPart] = cleaned.split(",");
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = decPart !== undefined ? intFmt + "," + decPart : intFmt;
  return (neg ? "-" : "") + body;
}
function parseAmount(v: string): number {
  const neg = v.startsWith("-");
  const n = parseFloat(v.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
  return neg ? -n : n;
}

export default function FinanceiroPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [type, setType] = useState<"entrada" | "saida">("entrada");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Outros");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("sv-SE"));
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(500);
    if (data) setTxs(data);
  }

  function resetForm() {
    setDescription("");
    setAmount("");
    setNotes("");
    setEditingId(null);
    setMessage(null);
  }

  function startEdit(t: any) {
    setEditingId(t.id);
    setType(t.type === "saida" ? "saida" : "entrada");
    setDescription(t.description || "");
    setCategory(t.category || "Outros");
    setAmount(maskAmount(String(Math.abs(t.amount)).replace(".", ",")));
    setDate(t.transaction_date ? t.transaction_date.slice(0, 10) : new Date().toLocaleDateString("sv-SE"));
    setNotes(t.notes || "");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    const value = parseAmount(amount);
    if (!description.trim()) return setMessage({ type: "error", text: "Informe a descrição." });
    if (isNaN(value) || value === 0) return setMessage({ type: "error", text: "Informe um valor diferente de zero." });
    setSaving(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage({ type: "error", text: "Usuário não autenticado." }); setSaving(false); return; }

    const payload = {
      type,
      description: description.trim(),
      category,
      amount: value,
      transaction_date: date,
      notes: notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from("financial_transactions").update(payload).eq("id", editingId);
      if (error) {
        setMessage({ type: "error", text: "Erro ao salvar: " + error.message });
        setSaving(false);
        return;
      }
      setMessage({ type: "success", text: "Lançamento atualizado!" });
      resetForm();
    } else {
      const { error } = await supabase.from("financial_transactions").insert({ user_id: user.id, ...payload });
      if (error) {
        setMessage({ type: "error", text: "Erro ao salvar: " + error.message });
        setSaving(false);
        return;
      }
      setMessage({ type: "success", text: "Lançamento registrado!" });
      resetForm();
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 2500);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento? Ele sairá do saldo e do histórico. Prefira EDITAR em vez de excluir.")) return;
    await supabase.from("financial_transactions").delete().eq("id", id);
    load();
  }

  const saldoInicial = txs
    .filter((t) => t.category === "Saldo Inicial")
    .reduce((a, t) => a + (t.type === "entrada" ? t.amount : -t.amount), 0);
  const entradas = txs
    .filter((t) => t.type === "entrada" && t.category !== "Saldo Inicial")
    .reduce((a, t) => a + t.amount, 0);
  const saidas = txs
    .filter((t) => t.type === "saida")
    .reduce((a, t) => a + t.amount, 0);
  const saldo = saldoInicial + entradas - saidas;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Financeiro</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Saldo Atual</p>
            <p className={`text-2xl font-bold ${saldo < 0 ? "text-red-600" : "text-green-600"}`}>{brl(saldo)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Saldo Inicial</p>
            <p className="text-xl font-bold">{brl(saldoInicial)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Entradas Avulsas</p>
            <p className="text-xl font-bold text-green-600">{brl(entradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Saídas</p>
            <p className="text-xl font-bold text-red-600">{brl(saidas)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Lançamento" : "Novo Lançamento (entradas e saídas avulsas)"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as "entrada" | "saida")}
              >
                <option value="entrada">Entrada (dinheiro que entra)</option>
                <option value="saida">Saída (dinheiro que sai)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descrição *</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Multa + juros boleto LD MINAS / Venda de caminhão / Saldo inicial" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Valor (R$) — use "-" antes para negativo</label>
              <Input value={amount} onChange={(e) => setAmount(maskAmount(e.target.value))} placeholder="Ex: 1.250,00 ou -500,00" inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data (pode ser retroativa)</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {editingId ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Registrar Lançamento"}
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
        <CardHeader><CardTitle>Lançamentos</CardTitle></CardHeader>
        <CardContent>
          {txs.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              <Wallet className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p>Nenhum lançamento ainda. Comece registrando o Saldo Inicial.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Data</th>
                    <th className="pb-2 pr-4">Descrição</th>
                    <th className="pb-2 pr-4">Categoria</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Valor</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2 pr-4">{new Date(t.transaction_date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 pr-4 font-medium">{t.description}</td>
                      <td className="py-2 pr-4">{t.category}</td>
                      <td className="py-2 pr-4">
                        {t.type === "entrada" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            <ArrowUpCircle className="h-3 w-3" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                            <ArrowDownCircle className="h-3 w-3" /> Saída
                          </span>
                        )}
                      </td>
                      <td className={`py-2 pr-4 font-semibold ${t.type === "entrada" ? "text-green-600" : "text-red-600"}`}>
                        {brl(t.type === "entrada" ? t.amount : -t.amount)}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(t)} className="text-slate-600 hover:text-slate-900" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700" title="Excluir">
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