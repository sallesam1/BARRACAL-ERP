"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Boxes, Scale, TrendingUp, TrendingDown } from "lucide-react";

export default function EstoquePage() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ajusteId, setAjusteId] = useState<string | null>(null);
  const [ajusteForm, setAjusteForm] = useState({ type: "entrada", quantity: "", reference: "" });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: prods } = await supabase
      .from("products").select("id, name").eq("user_id", user.id).order("name");
    const { data: inv } = await supabase
      .from("inventory").select("*").eq("user_id", user.id);
    const { data: movs } = await supabase
      .from("inventory_movements")
      .select("id, type, quantity, reference, created_at, product:products(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setMovements(movs || []);
    setItems((prods || []).map((p: any) => {
      const iv = (inv || []).find((i: any) => i.product_id === p.id);
      return {
        product_id: p.id,
        name: p.name,
        quantity: Number(iv?.quantity) || 0,
        min_quantity: Number(iv?.min_quantity) || 0,
      };
    }));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function statusItem(qty: number, min: number) {
    if (!qty || qty <= 0) return { label: "Zerado", cor: "bg-red-100 text-red-700" };
    if (qty < (min || 0)) return { label: "Baixo", cor: "bg-amber-100 text-amber-700" };
    return { label: "OK", cor: "bg-green-100 text-green-700" };
  }

  function tipoMov(m: any) {
    if (m.type === "entrada") return { label: "Entrada", cor: "text-green-600", sinal: "+" };
    if (m.type === "saida") return { label: "Saída", cor: "text-red-600", sinal: "−" };
    return { label: "Ajuste", cor: "text-blue-600", sinal: "±" };
  }

  const fmtDataHora = (d: string) =>
    d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtQtd = (v: number) => Number(v || 0).toLocaleString("pt-BR");

  // ===== SALDO TOTAL =====
  const saldoTotal = items.reduce((a, i) => a + (Number(i.quantity) || 0), 0);
  const positivos = items.filter((i) => (Number(i.quantity) || 0) > 0);
  const negativos = items.filter((i) => (Number(i.quantity) || 0) < 0);
  const saldoPositivo = positivos.reduce((a, i) => a + (Number(i.quantity) || 0), 0);
  const saldoNegativo = negativos.reduce((a, i) => a + (Number(i.quantity) || 0), 0);
  const baixos = items.filter((i) => i.quantity > 0 && i.quantity < (i.min_quantity || 0)).length;
  const zerados = items.filter((i) => !i.quantity || i.quantity <= 0).length;

  async function salvarAjuste() {
    if (!ajusteId) return;
    const qty = parseFloat(String(ajusteForm.quantity).replace(",", "."));
    if (!qty || qty <= 0) {
      setMessage({ type: "error", text: "Informe uma quantidade válida." });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const item = items.find((i) => i.product_id === ajusteId);
    const current = Number(item?.quantity) || 0;
    const delta = ajusteForm.type === "saida" ? -qty : qty;
    const novo = Math.max(0, current + delta);
    const { error } = await supabase.from("inventory").upsert({
      user_id: user.id,
      product_id: ajusteId,
      quantity: novo,
      updated_at: new Date().toISOString(),
    });
    if (error) { setMessage({ type: "error", text: "Erro: " + error.message }); return; }
    const { error: err2 } = await supabase.from("inventory_movements").insert({
      user_id: user.id,
      product_id: ajusteId,
      type: ajusteForm.type,
      quantity: qty,
      reference: ajusteForm.reference || null,
    });
    if (err2) { setMessage({ type: "error", text: "Ajuste salvo, mas erro no histórico: " + err2.message }); }
    else { setMessage({ type: "success", text: "Estoque ajustado!" }); }
    setAjusteId(null);
    setAjusteForm({ type: "entrada", quantity: "", reference: "" });
    load();
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Estoque</h1>

      {/* ===== JANELA DE SALDO TOTAL (padrão escuro do ERP) ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-400" />
            Saldo Total de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Total geral (kg)</p>
              <p className={`text-4xl font-extrabold ${saldoTotal < 0 ? "text-red-400" : "text-blue-400"}`}>
                {fmtQtd(saldoTotal)} kg
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="flex items-center gap-1 text-gray-400"><TrendingUp className="h-4 w-4 text-green-500" /> Disponível</p>
                <p className="text-xl font-bold text-green-500">{fmtQtd(saldoPositivo)} kg</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-gray-400"><TrendingDown className="h-4 w-4 text-red-500" /> Em falta</p>
                <p className="text-xl font-bold text-red-500">{fmtQtd(saldoNegativo)} kg</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {items.map((i) => (
              <div key={i.product_id} className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2">
                <span className="text-sm font-medium text-gray-200">{i.name}</span>
                <span className={`text-sm font-bold ${(Number(i.quantity) || 0) < 0 ? "text-red-400" : "text-gray-100"}`}>
                  {fmtQtd(i.quantity)} kg
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Produtos no Estoque</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Boxes className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Estoque Baixo</p>
                <p className="text-2xl font-bold text-amber-600">{baixos}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Zerados</p>
                <p className="text-2xl font-bold text-red-600">{zerados}</p>
              </div>
              <Package className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
      )}

      <Card>
        <CardHeader><CardTitle>Saldo Atual</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p>Nenhum produto cadastrado ainda. Cadastre produtos primeiro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Produto</th>
                    <th className="pb-2 pr-4">Saldo Atual</th>
                    <th className="pb-2 pr-4">Mínimo</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const st = statusItem(i.quantity, i.min_quantity);
                    return (
                      <tr key={i.product_id} className="border-b">
                        {ajusteId === i.product_id ? (
                          <td colSpan={5} className="py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                className="rounded-md border border-gray-300 p-2 text-sm"
                                value={ajusteForm.type}
                                onChange={(e) => setAjusteForm({ ...ajusteForm, type: e.target.value })}
                              >
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                              </select>
                              <Input
                                className="w-28"
                                placeholder="Quantidade"
                                value={ajusteForm.quantity}
                                onChange={(e) => setAjusteForm({ ...ajusteForm, quantity: e.target.value })}
                              />
                              <Input
                                className="w-44"
                                placeholder="Referência (ex: NF 1234)"
                                value={ajusteForm.reference}
                                onChange={(e) => setAjusteForm({ ...ajusteForm, reference: e.target.value })}
                              />
                              <Button size="sm" onClick={salvarAjuste}>Salvar</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setAjusteId(null); setAjusteForm({ type: "entrada", quantity: "", reference: "" }); }}>
                                Cancelar
                              </Button>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="py-2 pr-4 font-medium">{i.name}</td>
                            <td className="py-2 pr-4 font-bold">{fmtQtd(i.quantity)}</td>
                            <td className="py-2 pr-4 text-gray-500">{fmtQtd(i.min_quantity)}</td>
                            <td className="py-2 pr-4">
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${st.cor}`}>{st.label}</span>
                            </td>
                            <td className="py-2">
                              <Button size="sm" variant="outline" onClick={() => setAjusteId(i.product_id)}>
                                Ajustar
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimas Movimentações</CardTitle></CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Data</th>
                    <th className="pb-2 pr-4">Produto</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Quantidade</th>
                    <th className="pb-2">Referência</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const t = tipoMov(m);
                    return (
                      <tr key={m.id} className="border-b">
                        <td className="py-2 pr-4">{fmtDataHora(m.created_at)}</td>
                        <td className="py-2 pr-4 font-medium">{m.product?.name || "—"}</td>
                        <td className="py-2 pr-4">
                          <span className={`font-medium ${t.cor}`}>{t.sinal} {t.label}</span>
                        </td>
                        <td className="py-2 pr-4 font-bold">{fmtQtd(m.quantity)}</td>
                        <td className="py-2 text-gray-500">{m.reference || "—"}</td>
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