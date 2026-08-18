"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Pencil, Trash2, X } from "lucide-react";

// ===== Componente de Peso (embutido) =====
type WeightUnit = "unidade" | "kg" | "toneladas";
function formatNumber(value: string): string {
  let cleaned = value.replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");
  if (parts.length > 2) cleaned = parts[0] + "," + parts.slice(1).join("");
  const [intPart, decPart] = cleaned.split(",");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? intFormatted + "," + decPart : intFormatted;
}
function parseNumber(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}
function toKg(value: string, unit: WeightUnit): number {
  const n = parseNumber(value);
  if (unit === "toneladas") return n * 1000;
  return n;
}
function WeightInput({
  value, onChange, unit, onUnitChange,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: WeightUnit;
  onUnitChange: (u: WeightUnit) => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        inputMode="decimal"
        className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900"
        value={value}
        placeholder={unit === "kg" ? "Ex: 47.470" : unit === "toneladas" ? "Ex: 47,47" : "Ex: 120"}
        onChange={(e) => onChange(formatNumber(e.target.value))}
      />
      <select
        className="rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900"
        value={unit}
        onChange={(e) => onUnitChange(e.target.value as WeightUnit)}
      >
        <option value="unidade">Unidade</option>
        <option value="kg">Kg</option>
        <option value="toneladas">Toneladas</option>
      </select>
    </div>
  );
}

// ===== Utilitários de data (formato brasileiro) =====
function todayBR(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDateBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function parseDateBR(br: string): string {
  const parts = br.split("/");
  if (parts.length !== 3) return br;
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
}
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  credito: "Cartão de Crédito",
  dinheiro: "Dinheiro",
  anotado: "Anotado",
};

export default function PurchasesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulário
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayBR());
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [unitCost, setUnitCost] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [installments, setInstallments] = useState(1);
  const [firstDueDays, setFirstDueDays] = useState(30);
  const [installmentInterval, setInstallmentInterval] = useState(30);
  const [isInitialStock, setIsInitialStock] = useState(false);
  const [notes, setNotes] = useState("");

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
      const [prodRes, supRes, purRes] = await Promise.all([
        supabase.from("products").select("id, name").order("name"),
        supabase.from("suppliers").select("*"),
        supabase.from("purchases").select("*").eq("user_id", user.id).order("purchase_date", { ascending: false }),
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (supRes.data) {
        const list = supRes.data
          .map((s: any) => ({
            id: s.id,
            name: s.name || s.company_name || s.razao_social || "Fornecedor",
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setSuppliers(list);
      }
      if (purRes.data) setPurchases(purRes.data);
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao carregar: " + (e?.message || e) });
    }
    setLoading(false);
  }

  function resetForm() {
    setSupplierId("");
    setProductId("");
    setWeight("");
    setUnitCost("");
    setNotes("");
    setInstallments(1);
    setFirstDueDays(30);
    setInstallmentInterval(30);
    setIsInitialStock(false);
    setEditingId(null);
    setMessage(null);
  }

  async function startEdit(p: any) {
    setEditingId(p.id);
    // Busca o item da compra (produto, peso em kg, custo unitário)
    const { data: item } = await supabase
      .from("purchase_items")
      .select("product_id, quantity, unit_cost")
      .eq("purchase_id", p.id)
      .maybeSingle();
    const supplier = suppliers.find((s) => s.name === p.supplier_name);
    setSupplierId(supplier?.id || "");
    setProductId(item?.product_id || "");
    setPurchaseDate(p.purchase_date || todayBR());
    setWeight(item?.quantity != null ? String(item.quantity) : "");
    setWeightUnit("kg");
    setUnitCost(item?.unit_cost != null ? String(item.unit_cost) : "");
    setPaymentMethod(p.payment_method || "pix");
    setInstallments(p.installments > 0 ? p.installments : 1);
    setFirstDueDays(p.first_due_days != null ? p.first_due_days : 30);
    setInstallmentInterval(p.installment_interval != null ? p.installment_interval : 30);
    setIsInitialStock(false);
    setNotes(p.notes || "");
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
      if (!supplierId) {
        setMessage({ type: "error", text: "Selecione o fornecedor." });
        setSaving(false);
        return;
      }
      if (!productId) {
        setMessage({ type: "error", text: "Selecione o produto." });
        setSaving(false);
        return;
      }
      const weightNum = parseNumber(weight);
      if (!(weightNum > 0)) {
        setMessage({ type: "error", text: "Informe o peso/quantidade recebida." });
        setSaving(false);
        return;
      }
      const cost = parseNumber(unitCost);
      if (!(cost > 0)) {
        setMessage({ type: "error", text: "Informe o custo unitário." });
        setSaving(false);
        return;
      }
      const total = Number((weightNum * cost).toFixed(2));
      const supplier = suppliers.find((s) => s.id === supplierId);
      const supplierName = supplier?.name || "Fornecedor";
      const pesoKg = toKg(weight, weightUnit);
      const dataISO = purchaseDate.includes("/") ? parseDateBR(purchaseDate) : purchaseDate;
      let purchaseId: string;
      if (editingId) {
        // ===== EDIÇÃO =====
        // 1. Reverte o estoque da versão antiga
        const { data: oldItem } = await supabase
          .from("purchase_items")
          .select("product_id, quantity")
          .eq("purchase_id", editingId)
          .maybeSingle();
        if (oldItem) {
          const { data: oldInv } = await supabase
            .from("inventory")
            .select("id, quantity")
            .eq("user_id", user.id)
            .eq("product_id", oldItem.product_id)
            .maybeSingle();
          if (oldInv) {
            await supabase
              .from("inventory")
              .update({ quantity: Math.max(0, Number(oldInv.quantity || 0) - Number(oldItem.quantity || 0)), updated_at: new Date().toISOString() })
              .eq("id", oldInv.id);
          }
        }
        // 2. Atualiza a compra
        const { error: updErr } = await supabase
          .from("purchases")
          .update({
            supplier_name: supplierName,
            purchase_date: dataISO,
            total,
            payment_method: paymentMethod,
            installments,
            notes,
            first_due_days: firstDueDays,
            installment_interval: installmentInterval,
          })
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (updErr) throw updErr;
        // 3. Remove itens e parcelas antigas (serão recriados abaixo)
        await supabase.from("purchase_items").delete().eq("purchase_id", editingId);
        await supabase.from("accounts_payable").delete().eq("purchase_id", editingId);
        purchaseId = editingId;
      } else {
        // ===== NOVA COMPRA =====
        const { data: purchase, error: purErr } = await supabase
          .from("purchases")
          .insert({
            user_id: user.id,
            supplier_name: supplierName,
            purchase_date: dataISO,
            total,
            payment_method: paymentMethod,
            installments,
            notes,
            first_due_days: firstDueDays,
            installment_interval: installmentInterval,
          })
          .select()
          .single();
        if (purErr) throw purErr;
        purchaseId = purchase.id;
      }
      // 4. Item da compra (novo/atualizado)
      const { error: itemErr } = await supabase.from("purchase_items").insert({
        purchase_id: purchaseId,
        product_id: productId,
        quantity: pesoKg,
        unit_cost: cost,
      });
      if (itemErr) throw itemErr;
      // 5. Aplica o novo estoque (soma em kg)
      const { data: inv } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();
      if (inv) {
        await supabase
          .from("inventory")
          .update({ quantity: Number(inv.quantity || 0) + pesoKg, updated_at: new Date().toISOString() })
          .eq("id", inv.id);
      } else {
        await supabase.from("inventory").insert({
          user_id: user.id,
          product_id: productId,
          quantity: pesoKg,
          min_quantity: 5,
        });
      }
      // 6. Gera as parcelas (somente se NÃO for estoque inicial)
      if (!isInitialStock) {
        const parcelas = installments > 0 ? installments : 1;
        const baseParcela = Math.floor((total / parcelas) * 100) / 100;
        let soma = 0;
        const payRows = Array.from({ length: parcelas }, (_, i) => {
          const isLast = i === parcelas - 1;
          const valor = isLast ? Number((total - soma).toFixed(2)) : baseParcela;
          soma += valor;
          return {
            user_id: user.id,
            purchase_id: purchaseId,
            description: `Compra ${supplierName} — ${i + 1}/${parcelas}`,
            amount: valor,
            due_date: addDays(dataISO, firstDueDays + i * installmentInterval),
            status: "pending",
            installment_number: i + 1,
            total_installments: parcelas,
          };
        });
        const { error: payErr } = await supabase.from("accounts_payable").insert(payRows);
        if (payErr) throw payErr;
      }
      setMessage({
        type: "success",
        text: isInitialStock
          ? "Estoque inicial registrado! (não gerou parcelas)"
          : editingId
          ? `Compra atualizada! ${installments}x de R$ ${Number(total / installments).toFixed(2)} recalculadas no Contas a Pagar.`
          : `Compra salva! ${installments}x de R$ ${Number(total / installments).toFixed(2)} geradas no Contas a Pagar.`,
      });
      resetForm();
      const { data: purRes } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false });
      if (purRes) setPurchases(purRes);
    } catch (e: any) {
      console.error("Erro ao salvar compra:", e);
      setMessage({ type: "error", text: "Erro ao salvar: " + (e?.message || e) });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta compra? O estoque e as parcelas dela também serão ajustados. Prefira EDITAR em vez de excluir.")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }
      // Reverte o estoque antes de excluir
      const { data: item } = await supabase
        .from("purchase_items")
        .select("product_id, quantity")
        .eq("purchase_id", id)
        .maybeSingle();
      if (item) {
        const { data: inv } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("product_id", item.product_id)
          .maybeSingle();
        if (inv) {
          await supabase
            .from("inventory")
            .update({ quantity: Math.max(0, Number(inv.quantity || 0) - Number(item.quantity || 0)), updated_at: new Date().toISOString() })
            .eq("id", inv.id);
        }
      }
      await supabase.from("accounts_payable").delete().eq("purchase_id", id);
      await supabase.from("purchase_items").delete().eq("purchase_id", id);
      await supabase.from("purchases").delete().eq("id", id).eq("user_id", user.id);
      setMessage({ type: "success", text: "Compra excluída e estoque ajustado." });
      load();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao excluir: " + (e?.message || e) });
    }
  }

  if (loading) return <p className="p-6">Carregando...</p>;
  const totalExibido = parseNumber(weight) * parseNumber(unitCost);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Compras</h1>

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
          <CardTitle>{editingId ? "Editar Compra" : "Nova Compra"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingId && (
            <p className="text-xs text-gray-500">Editando compra existente — ao salvar, o estoque e as parcelas são recalculados automaticamente.</p>
          )}
          <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50 border border-gray-200">
            <input
              type="checkbox"
              checked={isInitialStock}
              onChange={(e) => setIsInitialStock(e.target.checked)}
              className="h-4 w-4"
            />
            <label className="text-sm text-gray-700">
              Estoque Inicial — mercadoria que você JÁ TEM (sem valor, não gera boleto)
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data do evento (pode ser retroativa)</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={formatDateBR(purchaseDate)}
                onChange={(e) => {
                  const br = e.target.value;
                  const cleaned = br.replace(/[^\d/]/g, "").slice(0, 10);
                  setPurchaseDate(parseDateBR(cleaned));
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fornecedor</label>
              <select
                className="w-full p-2 border rounded-md bg-white text-gray-900"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Selecione o fornecedor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Produto</label>
              <select
                className="w-full p-2 border rounded-md bg-white text-gray-900"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Selecione o produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Peso do material recebido</label>
              <WeightInput value={weight} onChange={setWeight} unit={weightUnit} onUnitChange={setWeightUnit} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Custo Unitário (R$)</label>
              <Input
                type="text"
                inputMode="decimal"
                value={unitCost}
                placeholder="Ex: 400"
                onChange={(e) => setUnitCost(formatNumber(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Modalidade de Pagamento</label>
              <select
                className="w-full p-2 border rounded-md bg-white text-gray-900"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="pix">Pix</option>
                <option value="boleto">Boleto</option>
                <option value="credito">Cartão de Crédito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="anotado">Anotado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Parcelas (1 a 6x)</label>
              <select
                className="w-full p-2 border rounded-md bg-white text-gray-900"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dias p/ 1ª parcela</label>
              <Input type="number" min="0" value={firstDueDays} onChange={(e) => setFirstDueDays(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Intervalo entre parcelas (dias)</label>
              <Input type="number" min="1" value={installmentInterval} onChange={(e) => setInstallmentInterval(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nº da nota fiscal, condições, prazo combinado..." />
          </div>
          <div className="p-3 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total da compra</span>
            <span className="text-lg font-bold">R$ {totalExibido.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {editingId ? <Check className="mr-2 h-4 w-4" /> : null}
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "+ Registrar Compra"}
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
          <CardTitle>Compras Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma compra registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4">Fornecedor</th>
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Pagamento</th>
                    <th className="py-2 pr-4">Parcelas</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 pr-4">{p.supplier_name}</td>
                      <td className="py-2 pr-4">{formatDateBR(p.purchase_date)}</td>
                      <td className="py-2 pr-4">{PAYMENT_LABELS[p.payment_method] || p.payment_method || "—"}</td>
                      <td className="py-2 pr-4">{p.installments}x</td>
                      <td className="py-2 pr-4 font-medium">R$ {Number(p.total).toFixed(2)}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(p)} className="text-slate-600 hover:text-slate-900" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700" title="Excluir">
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