"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus } from "lucide-react";

type LoanCategory = {
  id: string;
  name: string;
  default_interest_rate: number;
  default_amortization: string;
};

const AMORTIZATION_LABELS: Record<string, string> = {
  price: "Tabela Price (parcelas fixas)",
  sac: "SAC (parcelas decrescentes)",
  simple: "Juros Simples",
  none: "Sem juros",
};

export default function LoanCategoriesPage() {
  const [categories, setCategories] = useState<LoanCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [amortization, setAmortization] = useState("price");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  async function loadCategories() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("loan_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (data) setCategories(data);
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao carregar: " + (e?.message || e) });
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setName("");
    setInterestRate("0");
    setAmortization("price");
    setEditingId(null);
    setMessage(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      setMessage({ type: "error", text: "Informe o nome da categoria." });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Usuário não autenticado." });
        return;
      }

      const payload = {
        user_id: user.id,
        name: name.trim(),
        default_interest_rate: parseFloat(interestRate) || 0,
        default_amortization: amortization,
      };

      let error: any = null;
      if (editingId) {
        ({ error } = await supabase.from("loan_categories").update(payload).eq("id", editingId).eq("user_id", user.id));
      } else {
        ({ error } = await supabase.from("loan_categories").insert(payload));
      }

      if (error) {
        setMessage({ type: "error", text: "Erro ao salvar: " + error.message });
      } else {
        setMessage({ type: "success", text: editingId ? "Categoria atualizada!" : "Categoria criada!" });
        resetForm();
        loadCategories();
      }
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
      const { error } = await supabase.from("loan_categories").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        setMessage({ type: "error", text: "Erro ao excluir: " + error.message });
      } else {
        setMessage({ type: "success", text: "Categoria excluída." });
        loadCategories();
      }
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao excluir: " + (e?.message || e) });
    }
  }

  function startEdit(cat: LoanCategory) {
    setEditingId(cat.id);
    setName(cat.name);
    setInterestRate(String(cat.default_interest_rate));
    setAmortization(cat.default_amortization);
    setMessage(null);
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Categorias de Empréstimo</h1>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Categoria" : "Nova Categoria"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium mb-1">Nome da Categoria</label>
            <Input
              placeholder="Ex: Bancário, Pessoal, Cartão/Maquininha, Outros"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Taxa de Juros Padrão (%)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="Ex: 2.5"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deixe 0 para empréstimos sem juros (ex: entre sócios).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sistema de Cálculo Padrão</label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={amortization}
              onChange={(e) => setAmortization(e.target.value)}
            >
              {Object.entries(AMORTIZATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave}>
              {editingId ? "Atualizar" : "Salvar Categoria"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
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
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria ainda. Crie a primeira acima.
            </p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat.default_interest_rate > 0
                        ? `${cat.default_interest_rate}% de juros · `
                        : "Sem juros · "}
                      {AMORTIZATION_LABELS[cat.default_amortization] || cat.default_amortization}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(cat)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="h-4 w-4" />
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