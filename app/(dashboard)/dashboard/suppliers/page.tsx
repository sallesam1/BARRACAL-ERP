"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const vazio = {
  name: "", cnpj: "", ie: "", contact_name: "", phone: "",
  email: "", address: "", city: "", uf: "", notes: "",
};

export default function SuppliersPage() {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...vazio });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    setSuppliers(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const set = (campo: string, valor: any) => setForm((f: any) => ({ ...f, [campo]: valor }));

  function abrirNovo() {
    setEditId(null);
    setForm({ ...vazio });
    setShowForm(true);
    setMessage(null);
  }

  function abrirEdicao(s: any) {
    setEditId(s.id);
    setForm({
      name: s.name || "", cnpj: s.cnpj || "", ie: s.ie || "",
      contact_name: s.contact_name || "", phone: s.phone || "",
      email: s.email || "", address: s.address || "", city: s.city || "",
      uf: s.uf || "", notes: s.notes || "",
    });
    setShowForm(true);
    setMessage(null);
  }

  async function salvar() {
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Informe o nome / razão social." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = { ...form, name: form.name.trim() };
    let error: any = null;
    if (editId) {
      const res = await supabase.from("suppliers").update(payload).eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("suppliers").insert({ ...payload, user_id: user.id });
      error = res.error;
    }
    if (error) {
      setMessage({ type: "error", text: "Erro: " + error.message });
      setSaving(false);
      return;
    }
    setMessage({ type: "success", text: editId ? "Fornecedor atualizado!" : "Fornecedor cadastrado!" });
    setShowForm(false);
    setEditId(null);
    setForm({ ...vazio });
    setSaving(false);
    load();
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir o fornecedor "${nome}"?`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      setMessage({ type: "error", text: "Erro: " + error.message });
      return;
    }
    setMessage({ type: "success", text: "Fornecedor excluído." });
    load();
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        {!showForm && (
          <Button onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
          </Button>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Editar Fornecedor" : "Novo Fornecedor"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome / Razão Social *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Madeireira São João" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ</label>
                <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Inscrição Estadual</label>
                <Input value={form.ie} onChange={(e) => set("ie", e.target.value)} placeholder="IE (se houver)" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome de Contato</label>
                <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Telefone / Whatsapp</label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contato@fornecedor.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Endereço</label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, número, bairro" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cidade</label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">UF</label>
                <select className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm" value={form.uf} onChange={(e) => set("uf", e.target.value)}>
                  <option value="">UF</option>
                  {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
              <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Prazo de entrega, condições..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={salvar} disabled={saving}>
                {saving ? "Salvando..." : editId ? "Salvar Alterações" : "+ Cadastrar Fornecedor"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...vazio }); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Fornecedores Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p>Nenhum fornecedor cadastrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Nome</th>
                    <th className="pb-2 pr-4">CNPJ</th>
                    <th className="pb-2 pr-4">Contato</th>
                    <th className="pb-2 pr-4">Telefone</th>
                    <th className="pb-2 pr-4">Cidade/UF</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 pr-4 font-medium">{s.name || "—"}</td>
                      <td className="py-2 pr-4">{s.cnpj || "—"}</td>
                      <td className="py-2 pr-4">{s.contact_name || "—"}</td>
                      <td className="py-2 pr-4">{s.phone || "—"}</td>
                      <td className="py-2 pr-4">{[s.city, s.uf].filter(Boolean).join("/") || "—"}</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => abrirEdicao(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => excluir(s.id, s.name)}>
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
    </div>
  );
}