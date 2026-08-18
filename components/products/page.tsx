"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, Tag, Trash2, X } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState("");

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => { loadAll(); }, [supabase]);

  async function loadAll() {
    const { data: prods } = await supabase.from("products").select("*").order("name");
    if (prods) setProducts(prods);

    const { data: cats } = await supabase.from("product_categories").select("*").order("name");
    if (cats) setCategories(cats);
    setLoading(false);
  }

  const catMap: Record<string, string> = {};
  categories.forEach((c) => { catMap[c.id] = c.name; });

  async function handleSaveProduct() {
    if (!name.trim()) return setMessage({ type: "error", text: "Informe o nome do produto." });
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage({ type: "error", text: "Usuário não autenticado." }); setSaving(false); return; }

    const { error } = await supabase.from("products").insert({
      user_id: user.id,
      name: name.trim(),
      sku: sku.trim() || null,
      price: price || 0,
      category_id: categoryId || null,
    });

    if (error) { setMessage({ type: "error", text: "Erro ao salvar: " + error.message }); setSaving(false); return; }

    setMessage({ type: "success", text: "Produto cadastrado!" });
    setName(""); setSku(""); setPrice(0); setCategoryId("");
    setSaving(false);
    loadAll();
  }

  async function handleSaveCategory() {
    if (!categoryName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("product_categories").insert({
      user_id: user.id,
      name: categoryName.trim(),
    });

    setCategoryName("");
    setShowCategoryForm(false);
    loadAll();
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Excluir esta categoria? Os produtos dela ficarão sem categoria.")) return;
    await supabase.from("product_categories").delete().eq("id", id);
    loadAll();
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Excluir este produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    loadAll();
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Produtos</h1>

      <Card>
        <CardHeader>
          <CardTitle>Novo Produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome do Produto *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mesa de Jantar em Carvalho" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Código / SKU</label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: MESA-001" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Preço de Venda (R$)</label>
              <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Button onClick={handleSaveProduct} disabled={saving} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Cadastrar Produto"}
          </Button>

          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4" /> Categorias
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCategoryForm(!showCategoryForm)}>
            {showCategoryForm ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
            {showCategoryForm ? "Cancelar" : "Nova Categoria"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showCategoryForm && (
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria (ex: Mesas, Cadeiras, Armários)"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
              <Button onClick={handleSaveCategory} className="shrink-0">
                <Plus className="mr-1 h-4 w-4" /> Criar
              </Button>
            </div>
          )}

          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma categoria criada ainda. Crie a primeira para organizar seus produtos!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {c.name}
                  <button onClick={() => handleDeleteCategory(c.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Produtos Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Carregando...</p>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              <Package className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p>Nenhum produto cadastrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Produto</th>
                    <th className="pb-2 pr-4">Código</th>
                    <th className="pb-2 pr-4">Categoria</th>
                    <th className="pb-2 pr-4">Preço</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 pr-4 font-medium">{p.name}</td>
                      <td className="py-2 pr-4">{p.sku || "—"}</td>
                      <td className="py-2 pr-4">
                        {p.category_id ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {catMap[p.category_id] || "—"}
                          </span>
                        ) : (
                          <span className="text-gray-400">Sem categoria</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 font-bold">
                        {(p.price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-2">
                        <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-700" title="Excluir">
                          <Trash2 size={16} />
                        </button>
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