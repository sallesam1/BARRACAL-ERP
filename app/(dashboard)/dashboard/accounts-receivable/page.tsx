"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowUpCircle, Pencil, Trash2, X } from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AccountsReceivablePage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  useEffect(() => { loadBills(); }, []);

  async function loadBills() {
    const { data } = await supabase
      .from("accounts_receivable")
      .select("*")
      .order("due_date", { ascending: true });
    if (data) setBills(data);
    setLoading(false);
  }

  async function markAsReceived(id: string) {
    await supabase.from("accounts_receivable").update({ status: "paid" }).eq("id", id);
    loadBills();
  }

  function startEdit(b: any) {
    setEditing(b);
    setEditDesc(b.description || "");
    setEditAmount(String(b.amount ?? ""));
    setEditDate(b.due_date ? b.due_date.slice(0, 10) : "");
    setMessage(null);
  }

  function cancelEdit() {
    setEditing(null);
    setMessage(null);
  }

  async function handleSaveEdit() {
    if (!editDesc.trim() || !editAmount || !editDate) {
      setMessage({ type: "error", text: "Preencha descrição, valor e vencimento." });
      return;
    }
    const amount = parseFloat(editAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Valor inválido." });
      return;
    }
    try {
      const { error } = await supabase
        .from("accounts_receivable")
        .update({ description: editDesc.trim(), amount, due_date: editDate })
        .eq("id", editing.id);
      if (error) throw error;
      setMessage({ type: "success", text: "Parcela atualizada!" });
      cancelEdit();
      loadBills();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao salvar: " + (e?.message || e) });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta parcela? Prefira EDITAR em vez de excluir.")) return;
    try {
      const { error } = await supabase.from("accounts_receivable").delete().eq("id", id);
      if (error) throw error;
      setMessage({ type: "success", text: "Parcela excluída." });
      loadBills();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao excluir: " + (e?.message || e) });
    }
  }

  const pending = bills.filter((b) => b.status === "pending");
  const paid = bills.filter((b) => b.status === "paid");
  const pendingTotal = pending.reduce((acc, b) => acc + Number(b.amount), 0);
  const paidTotal = paid.reduce((acc, b) => acc + Number(b.amount), 0);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Contas a Receber</h1>

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total a Receber</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{brl(pendingTotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Recebido</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{brl(paidTotal)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Parcelas de Vendas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Carregando...</p>
          ) : bills.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              <ArrowUpCircle className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p>Nenhuma conta a receber ainda.</p>
              <p className="text-sm">Registre uma venda parcelada para gerar as parcelas automaticamente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Descrição</th>
                    <th className="pb-2 pr-4">Parcela</th>
                    <th className="pb-2 pr-4">Vencimento</th>
                    <th className="pb-2 pr-4">Valor</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="py-2 pr-4 font-medium">{b.description}</td>
                      <td className="py-2 pr-4">{b.installment_number}/{b.total_installments}</td>
                      <td className="py-2 pr-4">{new Date(b.due_date).toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 pr-4 font-bold">{brl(Number(b.amount))}</td>
                      <td className="py-2 pr-4">
                        {b.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                            <CheckCircle2 size={14} /> Recebido
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600">Em aberto</span>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(b)}>
                            <Pencil className="mr-1 h-4 w-4" /> Editar
                          </Button>
                          {b.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => markAsReceived(b.id)}>
                              Marcar como recebida
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(b.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card text-card-foreground p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Editar Parcela</h2>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Descrição</label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Valor (R$)</label>
                <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Vencimento</label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
                <Button onClick={handleSaveEdit}>Salvar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}