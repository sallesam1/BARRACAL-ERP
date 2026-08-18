"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, AlertTriangle, Package, Save } from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function InventoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: prods } = await supabase.from("products").select("id, name, price").eq("user_id", user.id);
    const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", user.id);

    const prodMap: Record<string, any> = {};
    (prods || []).forEach((p) => { prodMap[p.id] = p; });

    const merged = (inv || []).map((i) => ({
      ...i,
      product_name: prodMap[i.product_id]?.name || "Produto removido",
      price: prodMap[i.product_id]?.price || 0,
    }));

    // Produtos cadastrados mas sem linha de estoque ainda
    (prods || []).forEach((p) => {
      if (!merged.some((m) => m.product_id === p.id)) {
        merged.push({ product_id: p.id, product_name: p.name, price: p.price, quantity: 0, min_quantity: 5, notes: "" });
      }
    });

    merged.sort((a, b) => a.product_name.localeCompare(b.product_name));
    setRows(merged);
    setLoading(false);
  }

  function updateRow(id: string, field: string, value: any) {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function handleSave(row: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("inventory").upsert({
      id: row.id || undefined,
      user_id: user.id,
      product_id: row.product_id,
      quantity: Number(row.quantity) || 0,
      min_quantity: Number(row.min_quantity) || 5,
      notes: row.notes || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: "Erro ao salvar: " + error.message });
    } else {
      setMessage({ type: "success", text: "Estoque atualizado!" });
      setTimeout(() => setMessage(null), 2500);
    }
  }

  const totalValue = rows.reduce((acc, r) => acc + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0);
  const lowCount = rows.filter((r) => (Number(r.quantity) || 0) <= (Number(r.min_quantity) || 5)).length;

  if (loading) return <div className="p-6"><p className="text-gray-500">Carregando estoque...</p></div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Estoque</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Valor total em estoque</p>
            <p className="text-xl font-bold">{brl(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Produtos cadastrados</p>
            <p className="text-xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Estoque baixo (repor)</p>
            <p className={`text-xl font-bold ${lowCount > 0 ? "text-amber-600" : "text-green-600"}`}>{lowCount}</p>
          </CardContent>
        </Card>
      </div>

      {lowCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span>{lowCount} produto(s) abaixo do mínimo — veja a coluna "Mín." e reponha.</span>
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-4 w-4" /> Controle de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              <Package className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p>Nenhum produto cadastrado ainda. Cadastre produtos primeiro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Produto</th>
                    <th className="pb-2 pr-4 w-20">Qtd.</th>
                    <th className="pb-2 pr-4 w-20">Mín.</th>
                    <th className="pb-2 pr-4">Observações</th>
                    <th className="pb-2 pr-4">Valor</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const qty = Number(r.quantity) || 0;
                    const min = Number(r.min_quantity) || 5;
                    const low = qty <= min;
                    return (
                      <tr key={r.product_id} className="border-b">
                        <td className="py-2 pr-4 font-medium">
                          {r.product_name}
                          {low && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Baixo</span>}
                        </td>
                        <td className="py-2 pr-4">
                          <Input
                            type="number"
                            min={0}
                            className="w-20"
                            value={r.quantity ?? 0}
                            onChange={(e) => updateRow(r.id, "quantity", Number(e.target.value))}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <Input
                            type="number"
                            min={0}
                            className="w-20"
                            value={r.min_quantity ?? 5}
                            onChange={(e) => updateRow(r.id, "min_quantity", Number(e.target.value))}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <Input
                            value={r.notes || ""}
                            placeholder="Lote, validade, fornecedor..."
                            onChange={(e) => updateRow(r.id, "notes", e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-4 font-semibold">{brl(qty * (Number(r.price) || 0))}</td>
                        <td className="py-2">
                          <Button size="sm" variant="outline" onClick={() => handleSave(r)}>
                            <Save className="mr-1 h-3 w-3" /> Salvar
                          </Button>
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