"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const vazio = {
  name: "", cnpj_cpf: "", contact_name: "", phone: "",
  email: "", address: "", city: "", uf: "", notes: "",
};

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<any[]>([]);
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
      .from("customers")
      .select("*")
      .order("name");
    setCustomers(data || []);
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

  function abrirEdicao(c: any) {
    setEditId(c.id);
    setForm({
      name: c.name || "", cnpj_cpf: c.cnpj_cpf || "", contact_name: c.contact_name || "",
      phone: c.phone || "", email: c.email || "", address: c.address || "",
      city: c.city || "", uf: c.uf || "", notes: c.notes || "",
    });
    setShowForm(true);
    setMessage(null);
  }

  async function salvar() {
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Informe o nome do cliente." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = { ...form, name: form.name.trim() };
    let error: any = null;
    if (editId) {
      const res = await supabase.from("customers").update(payload).eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("customers").insert({ ...payload, user_id: user.id });
      error = res.error;
    }
    if (error) {
      setMessage({ type: "error", text: "Erro: " + error.message });
      setSaving(false);
      return;
    }
    setMessage({ type: "success", text: editId ? "Cliente atualizado!" : "Cliente cadastrado!" });
    setShowForm(false);
    setEditId(null);
    setForm({ ...vazio });
    setSaving(false);
    load();
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir o cliente "${nome}"?`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      setMessage({ type: "error", text: "Erro: " + error.message });
      return;
    }
    setMessage({ type: "success", text: "Cliente excluído." });
    load();
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        {!showForm && (
          <Button onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
          </Button>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Editar Cliente" : "Novo Cliente"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome / Razão Social *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Construtora Ápia" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ / CPF</label>
                <Input value={form.cnpj_cpf} onChange={(e) => set("cnpj_cpf", e.target.value)} placeholder="00.000.000/0000-00" />
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
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="cliente@empresa.com" />
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
              <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Condições de pagamento, prazo..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={salvar} disabled={saving}>
                {saving ? "Salvando..." : editId ? "Salvar Alterações" : "+ Cadastrar Cliente"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...vazio }); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Clientes Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p>Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Nome</th>
                    <th className="pb-2 pr-4">CNPJ/CPF</th>
                    <th className="pb-2 pr-4">Contato</th>
                    <th className="pb-2 pr-4">Telefone</th>
                    <th className="pb-2 pr-4">Cidade/UF</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2 pr-4 font-medium">{c.name || "—"}</td>
                      <td className="py-2 pr-4">{c.cnpj_cpf || "—"}</td>
                      <td className="py-2 pr-4">{c.contact_name || "—"}</td>
                      <td className="py-2 pr-4">{c.phone || "—"}</td>
                      <td className="py-2 pr-4">{[c.city, c.uf].filter(Boolean).join("/") || "—"}</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => abrirEdicao(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => excluir(c.id, c.name)}>
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