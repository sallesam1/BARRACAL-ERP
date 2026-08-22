"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Converte aaaa-mm-dd para dd/mm/aaaa
function formatDateBR(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type Filter = "todos" | "aberto" | "vencidos" | "pagos";

export default function AccountsPayablePage() {
  const [loading, setLoading] = useState(true);
  const [payables, setPayables] = useState<any[]>([]);
  const [purchaseDates, setPurchaseDates] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("todos");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        setLoading(false);
        return;
      }

      const [payRes, purRes] = await Promise.all([
        supabase
          .from("accounts_payable")
          .select("*")
          .order("due_date", { ascending: true }),
        supabase
          .from("purchases")
          .select("id, purchase_date"),
      ]);

      if (payRes.data) setPayables(payRes.data);

      // Mapa: purchase_id -> data da compra
      if (purRes.data) {
        const map: Record<string, string> = {};
        purRes.data.forEach((p: any) => {
          map[p.id] = p.purchase_date;
        });
        setPurchaseDates(map);
      }
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao carregar: " + (e?.message || e) });
    }
    setLoading(false);
  }

  async function handlePay(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }
      const { error } = await supabase
        .from("accounts_payable")
        .update({ status: "paid" })
        .eq("id", id);
      if (error) throw error;
      setMessage({ type: "success", text: "Boleto marcado como pago!" });
      load();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao pagar: " + (e?.message || e) });
    }
  }

  async function handleReopen(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }
      const { error } = await supabase
        .from("accounts_payable")
        .update({ status: "pending" })
        .eq("id", id);
      if (error) throw error;
      setMessage({ type: "success", text: "Boleto reaberto." });
      load();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao reabrir: " + (e?.message || e) });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este boleto?")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }
      const { error } = await supabase
        .from("accounts_payable")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setMessage({ type: "success", text: "Boleto excluído." });
      load();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao excluir: " + (e?.message || e) });
    }
  }

  function isOverdue(p: any): boolean {
    if (p.status === "paid") return false;
    const today = new Date();
    const due = new Date(p.due_date + "T00:00:00");
    return due < today;
  }

  const filtered = payables.filter((p) => {
    if (filter === "aberto") return p.status === "pending" && !isOverdue(p);
    if (filter === "vencidos") return p.status === "pending" && isOverdue(p);
    if (filter === "pagos") return p.status === "paid";
    return true;
  });

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Contas a Pagar</h1>

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
          <CardTitle>Boletos ({payables.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {([
              { key: "todos", label: "Todos" },
              { key: "aberto", label: "Em aberto" },
              { key: "vencidos", label: "Vencidos" },
              { key: "pagos", label: "Pagos" },
            ] as { key: Filter; label: string }[]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors " +
                  (filter === f.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum boleto neste filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4">Descrição</th>
                    <th className="py-2 pr-4">Data da Compra</th>
                    <th className="py-2 pr-4">Vencimento</th>
                    <th className="py-2 pr-4">Valor</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const overdue = isOverdue(p);
                    return (
                      <tr key={p.id} className="border-b">
                        <td className="py-2 pr-4">{p.description}</td>
                        <td className="py-2 pr-4">{formatDateBR(purchaseDates[p.purchase_id] || "")}</td>
                        <td className="py-2 pr-4">{formatDateBR(p.due_date)}</td>
                        <td className="py-2 pr-4 font-medium">R$ {Number(p.amount).toFixed(2)}</td>
                        <td className="py-2 pr-4">
                          {p.status === "paid" ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Pago</span>
                          ) : overdue ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Vencido</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Em aberto</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            {p.status === "paid" ? (
                              <button onClick={() => handleReopen(p.id)} className="text-blue-600 hover:underline text-sm">
                                Reabrir
                              </button>
                            ) : (
                              <button onClick={() => handlePay(p.id)} className="text-green-600 hover:underline text-sm">
                                Pagar
                              </button>
                            )}
                            <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-sm">
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}