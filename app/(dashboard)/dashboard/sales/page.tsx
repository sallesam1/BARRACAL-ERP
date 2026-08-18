"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";

const PAYMENT_METHODS = ["Pix", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Cheque", "Anotado"];
const PAGE_SIZE = 30;

const fmtData = (d: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—");
const fmtMoeda = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtQtd = (v: number) => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

function statusParcela(p: any) {
  if (p.status === "paid") return { label: "Recebido", cor: "text-green-600" };
  const hoje = new Date().toISOString().slice(0, 10);
  if (p.due_date < hoje) return { label: "Vencido", cor: "text-red-600 font-semibold" };
  return { label: "Em aberto", cor: "text-amber-600" };
}

function splitEqual(total: number, count: number): number[] {
  if (count <= 0 || total <= 0) return Array(Math.max(1, count)).fill(0);
  const base = Math.floor((total / count) * 100) / 100;
  const values = Array(count).fill(base);
  let remainder = Math.round((total - base * count) * 100);
  let i = 0;
  while (remainder > 0 && i < count) {
    values[i] = Math.round((values[i] + 0.01) * 100) / 100;
    remainder--;
    i++;
  }
  return values;
}

export default function SalesPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerId, setCustomerId] = useState("");
  const [customCustomer, setCustomCustomer] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [installments, setInstallments] = useState(1);
  const [installmentValues, setInstallmentValues] = useState<number[]>([0]);
  const [daysToFirst, setDaysToFirst] = useState(30);
  const [daysBetween, setDaysBetween] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSaleId, setEditSaleId] = useState<string | null>(null);
  const [editParcelaId, setEditParcelaId] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState<any>({});
  const [parcelaForm, setParcelaForm] = useState<any>({});

  const qty = parseFloat(String(quantity).replace(",", ".")) || 0;
  const price = parseFloat(String(unitPrice).replace(",", ".")) || 0;
  const total = qty * price;

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: custs } = await supabase
      .from("customers").select("id, name").eq("user_id", user.id).order("name");
    if (custs) setCustomers(custs);
    const { data: prods } = await supabase
      .from("products").select("id, name").eq("user_id", user.id).order("name");
    if (prods) setProducts(prods);
    const { data: vendas } = await supabase
      .from("sales").select("*").eq("user_id", user.id)
      .order("sale_date", { ascending: true });
    if (vendas && vendas.length) {
      const { data: receb } = await supabase
        .from("accounts_receivable").select("*")
        .in("sale_id", vendas.map((v: any) => v.id))
        .order("due_date", { ascending: true });
      const { data: itens } = await supabase
        .from("sale_items").select("sale_id, quantity, product_id")
        .in("sale_id", vendas.map((v: any) => v.id));
      setSales(vendas.map((v: any) => ({
        ...v,
        parcelas: (receb || []).filter((r: any) => r.sale_id === v.id),
        itens: (itens || []).filter((i: any) => i.sale_id === v.id),
      })));
    } else {
      setSales(vendas || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalPages = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSales = sales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleInstallmentsChange(n: number) {
    const count = Math.max(1, Math.min(6, n || 1));
    setInstallments(count);
    setInstallmentValues(splitEqual(total, count));
  }

  function updateInstallmentValue(index: number, value: number) {
    const copy = [...installmentValues];
    copy[index] = value;
    setInstallmentValues(copy);
  }

  const sumInstallments = installmentValues.reduce((a, b) => a + (Number(b) || 0), 0);
  const diff = Math.round((sumInstallments - total) * 100) / 100;

  async function handleSave() {
    if (!productId) return setMessage({ type: "error", text: "Selecione um produto." });
    let customerName = "";
    if (customerId === "__custom__") {
      customerName = customCustomer.trim();
    } else if (customerId) {
      const found = customers.find((c) => c.id === customerId);
      customerName = found ? found.name : "";
    }
    if (!customerName) return setMessage({ type: "error", text: "Escolha um cliente da lista ou digite um nome." });
    if (qty <= 0) return setMessage({ type: "error", text: "Informe a quantidade vendida." });
    if (price <= 0) return setMessage({ type: "error", text: "Informe o preço unitário." });
    if (diff !== 0) return setMessage({ type: "error", text: `A soma das parcelas (${sumInstallments.toFixed(2)}) não bate com o total (${total.toFixed(2)}). Ajuste os valores.` });

    setSaving(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage({ type: "error", text: "Usuário não autenticado." }); setSaving(false); return; }

    // CORREÇÃO: busca o estoque do usuário, sem falhar quando não existe registro
    const { data: inv } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();
    const available = Number(inv?.quantity) || 0;
    if (qty > available) {
      setMessage({ type: "error", text: `Estoque insuficiente. Disponível: ${available.toLocaleString("pt-BR")} kg.` });
      setSaving(false);
      return;
    }

    const { data: sale, error: sError } = await supabase
      .from("sales")
      .insert({
        user_id: user.id,
        customer_name: customerName,
        sale_date: saleDate,
        total,
        payment_method: paymentMethod,
        installments,
        notes: notes.trim() || null,
      })
      .select()
      .single();
    if (sError || !sale) {
      setMessage({ type: "error", text: "Erro ao registrar: " + (sError?.message || "") });
      setSaving(false);
      return;
    }

    await supabase.from("sale_items").insert({
      sale_id: sale.id,
      product_id: productId,
      quantity: qty,
      unit_price: price,
    });

    // CORREÇÃO: atualiza o estoque pelo id (ou cria se não existir)
    if (inv?.id) {
      await supabase
        .from("inventory")
        .update({ quantity: available - qty, updated_at: new Date().toISOString() })
        .eq("id", inv.id);
    } else {
      await supabase.from("inventory").insert({
        user_id: user.id,
        product_id: productId,
        quantity: Math.max(0, available - qty),
        min_quantity: 5,
      });
    }

    const baseDate = new Date(saleDate + "T12:00:00");
    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + daysToFirst + (i - 1) * daysBetween);
      await supabase.from("accounts_receivable").insert({
        user_id: user.id,
        sale_id: sale.id,
        description: `Venda para ${customerName} - Parcela ${i}/${installments}`,
        amount: installmentValues[i - 1] || 0,
        due_date: dueDate.toISOString().split("T")[0],
        installment_number: i,
        total_installments: installments,
      });
    }

    setMessage({ type: "success", text: "Venda registrada! Recebimentos gerados e estoque atualizado." });
    setCustomerId(""); setCustomCustomer(""); setProductId(""); setQuantity(""); setUnitPrice("");
    setPaymentMethod("Pix"); setInstallments(1); setInstallmentValues([0]); setNotes("");
    setShowForm(false);
    setSaving(false);
    load();
  }

  function abrirEdicaoVenda(v: any) {
    setEditSaleId(v.id);
    setSaleForm({
      customer_name: v.customer_name,
      sale_date: v.sale_date,
      total: String(v.total).replace(".", ","),
      payment_method: v.payment_method || "Pix",
      installments: String(v.installments || 1),
    });
  }

  async function salvarVenda() {
    if (!editSaleId) return;
    const { error } = await supabase
      .from("sales")
      .update({
        customer_name: saleForm.customer_name,
        sale_date: saleForm.sale_date,
        total: parseFloat(String(saleForm.total).replace(/\./g, "").replace(",", ".")),
        payment_method: saleForm.payment_method,
        installments: parseInt(saleForm.installments) || 1,
      })
      .eq("id", editSaleId);
    if (error) { setMessage({ type: "error", text: "Erro ao salvar venda" }); return; }
    setMessage({ type: "success", text: "Venda atualizada!" });
    setEditSaleId(null);
    load();
  }

  async function excluirVenda(id: string) {
    if (!confirm("Excluir esta venda e todos os recebimentos dela?")) return;
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) { setMessage({ type: "error", text: "Erro ao excluir" }); return; }
    setMessage({ type: "success", text: "Venda excluída" });
    load();
  }

  function abrirEdicaoParcela(p: any) {
    setEditParcelaId(p.id);
    setParcelaForm({ due_date: p.due_date, amount: String(p.amount).replace(".", ","), status: p.status });
  }

  async function salvarParcela() {
    if (!editParcelaId) return;
    const { error } = await supabase
      .from("accounts_receivable")
      .update({
        due_date: parcelaForm.due_date,
        amount: parseFloat(String(parcelaForm.amount).replace(/\./g, "").replace(",", ".")),
        status: parcelaForm.status,
      })
      .eq("id", editParcelaId);
    if (error) { setMessage({ type: "error", text: "Erro ao salvar parcela" }); return; }
    setMessage({ type: "success", text: "Recebimento atualizado!" });
    setEditParcelaId(null);
    load();
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendas</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Registrar Venda
          </Button>
        )}
      </div>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
      )}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Nova Venda (Saída de Produto)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data da venda</label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Selecione um cliente cadastrado...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="__custom__">✏️ Outro — digitar manualmente</option>
              </select>
            </div>
            {customerId === "__custom__" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome do cliente (manual)</label>
                <Input placeholder="Digite o nome do cliente" value={customCustomer} onChange={(e) => setCustomCustomer(e.target.value)} />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Produto</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Selecione o produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Quantidade (kg)</label>
                <Input type="number" min={0} step="0.01" value={quantity} onChange={(e) => { setQuantity(e.target.value); setInstallmentValues(splitEqual(parseFloat(e.target.value) * price, installments)); }} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Preço Unitário (R$)</label>
                <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => { setUnitPrice(e.target.value); setInstallmentValues(splitEqual(qty * parseFloat(e.target.value), installments)); }} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Modalidade de Pagamento</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Parcelas (1 a 6x)</label>
                <Input type="number" min={1} max={6} value={installments} onChange={(e) => handleInstallmentsChange(Number(e.target.value))} />
              </div>
            </div>
            {installments > 1 && (
              <div className="space-y-3 rounded-md bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-700">Valor de cada recebimento (edite à vontade)</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {installmentValues.map((val, idx) => (
                    <div key={idx}>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Parcela {idx + 1} de {installments}</label>
                      <Input type="number" min={0} step="0.01" value={val} onChange={(e) => updateInstallmentValue(idx, Number(e.target.value))} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="font-medium text-gray-700">Soma: <b>{sumInstallments.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span>
                  {diff !== 0 ? (
                    <span className="font-semibold text-red-600">⚠️ Diferença de {diff.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — não salva até bater</span>
                  ) : (
                    <span className="font-semibold text-green-600">✅ Soma confere com o total</span>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Dias p/ 1ª parcela</label>
                <Input type="number" min={0} value={daysToFirst} onChange={(e) => setDaysToFirst(Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Intervalo entre parcelas (dias)</label>
                <Input type="number" min={1} value={daysBetween} onChange={(e) => setDaysBetween(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nº da nota, condições, prazo..." />
            </div>
            <div className="flex items-center justify-between rounded-md bg-gray-100 p-3">
              <span className="text-sm font-medium text-gray-700">Total da venda</span>
              <span className="text-xl font-bold">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {saving ? "Registrando..." : "Registrar Venda"}
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Vendas Recentes</CardTitle>
          <p className="text-sm text-gray-500">{sales.length} venda(s) · Página {currentPage} de {totalPages}</p>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p>Nenhuma venda registrada ainda.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4">Data</th>
                      <th className="pb-2 pr-4">Cliente</th>
                      <th className="pb-2 pr-4">Produto</th>
                      <th className="pb-2 pr-4 text-right">Qtd (kg)</th>
                      <th className="pb-2 pr-4">Pagamento</th>
                      <th className="pb-2 pr-4">Parcelas</th>
                      <th className="pb-2 pr-4 text-right">Total</th>
                      <th className="pb-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSales.map((v) => (
                      <FragmentRow key={v.id} v={v} expandedId={expandedId} setExpandedId={setExpandedId}
                        editSaleId={editSaleId} saleForm={saleForm} setSaleForm={setSaleForm}
                        abrirEdicaoVenda={abrirEdicaoVenda} salvarVenda={salvarVenda} setEditSaleId={setEditSaleId}
                        excluirVenda={excluirVenda} editParcelaId={editParcelaId} parcelaForm={parcelaForm}
                        setParcelaForm={setParcelaForm} abrirEdicaoParcela={abrirEdicaoParcela} salvarParcela={salvarParcela}
                        setEditParcelaId={setEditParcelaId} fmtData={fmtData} fmtMoeda={fmtMoeda} fmtQtd={fmtQtd} statusParcela={statusParcela} />
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-1">
                  <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === currentPage ? "default" : "outline"}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FragmentRow(props: any) {
  const { v, expandedId, setExpandedId, editSaleId, saleForm, setSaleForm, abrirEdicaoVenda,
    salvarVenda, setEditSaleId, excluirVenda, editParcelaId, parcelaForm, setParcelaForm,
    abrirEdicaoParcela, salvarParcela, setEditParcelaId, fmtData, fmtMoeda, fmtQtd, statusParcela } = props;
  const qtdTotal = (v.itens || []).reduce((a: number, i: any) => a + (Number(i.quantity) || 0), 0);
  return (
    <>
      <tr className="border-b">
        {editSaleId === v.id ? (
          <td colSpan={8} className="py-2">
            <div className="flex flex-wrap gap-2">
              <Input type="date" className="w-36" value={saleForm.sale_date || ""} onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })} />
              <Input className="w-44" value={saleForm.customer_name || ""} onChange={(e) => setSaleForm({ ...saleForm, customer_name: e.target.value })} />
              <Input className="w-28" value={saleForm.total || ""} onChange={(e) => setSaleForm({ ...saleForm, total: e.target.value })} />
              <select className="rounded-md border border-gray-300 p-2 text-sm" value={saleForm.payment_method || "Pix"} onChange={(e) => setSaleForm({ ...saleForm, payment_method: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <Input type="number" min={1} max={6} className="w-20" value={saleForm.installments || "1"} onChange={(e) => setSaleForm({ ...saleForm, installments: e.target.value })} />
              <Button size="sm" onClick={salvarVenda}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditSaleId(null)}>Cancelar</Button>
            </div>
          </td>
        ) : (
          <>
            <td className="py-2 pr-4">{fmtData(v.sale_date)}</td>
            <td className="py-2 pr-4 font-medium">{v.customer_name}</td>
            <td className="py-2 pr-4">{(v.itens || []).map((i: any) => i.product_id ? "—" : "").join("") || "—"}</td>
            <td className="py-2 pr-4 text-right font-semibold">{qtdTotal > 0 ? fmtQtd(qtdTotal) : "—"}</td>
            <td className="py-2 pr-4">{v.payment_method || "—"}</td>
            <td className="py-2 pr-4">{v.installments > 1 ? `${v.installments}x` : "À vista"}</td>
            <td className="py-2 pr-4 text-right font-bold">{fmtMoeda(v.total)}</td>
            <td className="py-2">
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
                  {expandedId === v.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="ml-1">Recebimentos ({v.parcelas.length})</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => abrirEdicaoVenda(v)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => excluirVenda(v.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </td>
          </>
        )}
      </tr>
      {expandedId === v.id && (
        <tr className="border-b bg-slate-50">
          <td colSpan={8} className="p-3">
            <p className="mb-2 text-sm font-semibold">Recebimentos ({v.parcelas.length})</p>
            <div className="space-y-2">
              {v.parcelas.length === 0 && <p className="text-xs text-gray-500">Esta venda não gerou recebimentos.</p>}
              {v.parcelas.map((p: any) => {
                const st = statusParcela(p);
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 rounded border bg-white p-2 text-sm">
                    {editParcelaId === p.id ? (
                      <>
                        <Input type="date" className="w-36" value={parcelaForm.due_date || ""} onChange={(e) => setParcelaForm({ ...parcelaForm, due_date: e.target.value })} />
                        <Input className="w-28" value={parcelaForm.amount || ""} onChange={(e) => setParcelaForm({ ...parcelaForm, amount: e.target.value })} />
                        <select className="rounded-md border border-gray-300 p-2 text-sm" value={parcelaForm.status || "pending"} onChange={(e) => setParcelaForm({ ...parcelaForm, status: e.target.value })}>
                          <option value="pending">Em aberto</option>
                          <option value="paid">Recebido</option>
                        </select>
                        <Button size="sm" onClick={salvarParcela}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditParcelaId(null)}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{p.installment_number}/{p.total_installments}</span>
                        <span>Venc: <b>{fmtData(p.due_date)}</b></span>
                        <span className="ml-2 font-semibold">{fmtMoeda(p.amount)}</span>
                        <span className={`ml-2 rounded px-2 py-0.5 text-xs ${st.cor}`}>{st.label}</span>
                        <Button size="sm" variant="outline" className="ml-auto" onClick={() => abrirEdicaoParcela(p)}><Pencil className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}