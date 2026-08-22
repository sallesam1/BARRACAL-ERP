"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [buttonStyle, setButtonStyle] = useState("dark-premium");
  const [users, setUsers] = useState<any[]>([]);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("email", user.email)
        .maybeSingle();

      if (!userRole || userRole.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const { data } = await supabase
        .from("settings")
        .select("*")
        .maybeSingle();

      if (data) {
        setCompanyName(data.company_name || "");
        setButtonStyle(data.button_style || "dark-premium");
      }

      const { data: userList } = await supabase
        .from("user_roles")
        .select("user_id, email, role");

      if (userList) setUsers(userList);

      setLoading(false);
    }
    loadSettings();
  }, []);

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      company_name: companyName,
      button_style: buttonStyle,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from("settings")
      .update(payload)
      .select();

    if (updateError) {
      console.error("Erro ao atualizar:", updateError);
      toast.error("Erro ao salvar configurações");
      return;
    }

    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from("settings").insert({
        user_id: user.id,
        ...payload,
      });

      if (insertError) {
        console.error("Erro ao inserir:", insertError);
        toast.error("Erro ao salvar configurações");
        return;
      }
    }

    // Aplica o tema na hora, sem precisar recarregar a página
    window.dispatchEvent(new Event("settings-saved"));
    toast.success("Configurações salvas!");
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao atualizar papel do usuário");
    } else {
      toast.success("Papel atualizado!");
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
    }
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Configurações do Sistema</h1>

      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Empresa</label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estilo do Sistema</label>
            <select
              className="w-full p-2 border rounded-md bg-card text-card-foreground border-border"
              value={buttonStyle}
              onChange={(e) => setButtonStyle(e.target.value)}
            >
              <option value="dark-premium">Dark Premium (Fundo Escuro)</option>
              <option value="light">Claro</option>
              <option value="midnight">Meia-Noite</option>
              <option value="emerald">Esmeralda</option>
              <option value="ocean">Oceano</option>
              <option value="dark-sidebar">Dark Sidebar (Menu Escuro + Conteúdo Claro)</option>
            </select>
          </div>

          <Button onClick={handleSave}>Salvar Configurações</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          )}
          {users.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-sm font-medium">{u.email}</p>
                <p className="text-xs text-muted-foreground">Papel atual: {u.role}</p>
              </div>
              <select
                className="p-1 border rounded-md text-sm bg-card text-card-foreground border-border"
                value={u.role}
                onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}