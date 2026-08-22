"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, X, Check } from "lucide-react";

export default function ExpenseCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
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
      const { data } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name");
      if (data) setCategories(data);
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao carregar: " + (e?.message || e) });
    }
    setLoading(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setNewName("");
    setMessage(null);
  }

  function startEdit(c: any) {
    setEditingId(c.id);
    setNewName(c.name || "");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    if (!newName.trim()) {
      setMessage({ type: "error", text: "Digite o nome da categoria." });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from("expense_categories")
          .update({ name: newName.trim() })
          .eq("id", editingId);
        if (error) throw error;
        setMessage({ type: "success", text: "Categoria atualizada!" });
        cancelEdit();
      } else {
        const { error } = await supabase.from("expense_categories").insert({
          user_id: user.id,
          name: newName.trim(),
        });
        if (error) throw error;
        setNewName("");
        setMessage({ type: "success", text: "Categoria adicionada!" });
      }
      load();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao salvar: " + (e?.message || e) });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria? Prefira EDITAR em vez de excluir.")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setMessage({ type: "success", text: "Categoria removida." });
      load();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao remover: " + (e?.message || e) });
    }
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Categorias de Despesa</h1>

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
          <CardTitle>{editingId ? "Editar Categoria" : "Adicionar Categoria"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Combustível, Aluguel, Energia..."
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <Button onClick={handleSave}>
              {editingId ? <Check className="mr-1 h-4 w-4" /> : null}
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancelEdit}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma categoria cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b py-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(c)}>
                      <Pencil className="mr-1 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}