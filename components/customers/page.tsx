"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Pencil, UserPlus, Users, Trash2, X } from "lucide-react";

// ====== MÁSCARAS (CPF/CNPJ e Telefone) ======
function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function maskCpfCnpj(value: string) {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
// ====== FIM DAS MÁSCARAS ======

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [ie, setIe] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("clients").select("*").eq("user_id", user.id).order("name");
    if (data) setClients(data);
  }

  function resetForm() {
    setName("");
    setDoc("");
    setIe("");
    setContact("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setEditingId(null);
    setMessage(null);
  }

  function startEdit(c: any) {
    setEditingId(c.id);
    setName(c.name || "");
    setDoc(c.document || "");
    setIe(c.state_registration || "");
    setContact(c.contact || "");
    setPhone(c.phone || "");
    setEmail(c.email || "");
    setAddress(c.address || "");
    setNotes(c.notes || "");
    setMessage(null);
  }

  async function handleSave() {
    if (!name.trim()) return setMessage({ type: "error", text: "Informe o nome do cliente." });
    setSaving(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage({ type: "error", text: "Usuário não autenticado." }); setSaving(false); return; }

    const payload = {
      name: name.trim(),
      document: doc.trim() || null,
      state_registration: ie.trim() || null,
      contact: contact.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editingId);
      if (error) {
        setMessage({ type: "error", text: "Erro ao salvar: " + error.message });
        setSaving(false);
        return;
      }
      setMessage({ type: "success", text: "Cliente atualizado com sucesso!" });
      resetForm();
    } else {
      const { error } = await supabase.from("clients").insert({ user_id: user.id, ...payload });
      if (error) {
        setMessage({ type: "error", text: "Erro ao salvar: " + error.message });
        setSaving(false);
        return;
      }
      setMessage({ type: "success", text: "Cliente cadastrado!" });
      resetForm();
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 2500);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cliente? Se ele já tiver vendas ou contas associadas, o histórico pode ser afetado. Prefira EDITAR em vez de excluir.")) return;
    await supabase.from("clients").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Clientes</h1>

      <Card>
        <CardHeader><CardTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome / Razão Social *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">CPF / CNPJ</label>
              <Input value={doc} onChange={(e) => setDoc(maskCpfCnpj(e.target.value))} placeholder="Digite só os números" inputMode="numeric" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Inscrição Estadual</label>
              <Input value={ie} onChange={(e) => setIe(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contato</label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nome do responsável" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
              <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" inputMode="numeric" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Endereço</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações, condições, preferências..." />
          </div>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {editingId ? <Check className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Cliente"}
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
        <CardHeader><CardTitle>Clientes Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {clients.length === 0 ? (
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
                    <th className="pb-2 pr-4">CPF/CNPJ</th>
                    <th className="pb-2 pr-4">Telefone</th>
                    <th className="pb-2 pr-4">E-mail</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2 pr-4 font-medium">{c.name}</td>
                      <td className="py-2 pr-4">{c.document || "—"}</td>
                      <td className="py-2 pr-4">{c.phone || "—"}</td>
                      <td className="py-2 pr-4">{c.email || "—"}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(c)} className="text-slate-600 hover:text-slate-900" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700" title="Excluir">
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