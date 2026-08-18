"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [version, setVersion] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [buttonStyle, setButtonStyle] = useState("dark-premium");

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setCompanyName(data.company_name ?? "");
        setProductName(data.product_name ?? "Meu ERP");
        setVersion(data.version ?? "1.0.0");
        setPrimaryColor(data.primary_color ?? "");
        setButtonStyle(data.button_style ?? "dark-premium");
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("settings").upsert({
      user_id: user.id,
      company_name: companyName,
      product_name: productName,
      version: version,
      primary_color: primaryColor,
      button_style: buttonStyle,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas!");
      // Só aplica a cor se o usuário escolheu uma (vazio = usa a cor do tema)
      if (primaryColor) {
        document.documentElement.style.setProperty("--primary", primaryColor);
      }
    }
  }

  // Busca os dados de uma tabela (com ou sem filtro por usuário)
  async function fetchTable(table: string, userId: string) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
    if (!error && data) return data;
    // Tabelas de itens (sem user_id) buscam tudo
    const { data: all, error: err2 } = await supabase.from(table).select("*");
    if (!err2 && all) return all;
    return [];
  }

  // 🔒 BACKUP: baixa um arquivo JSON com TODOS os seus dados
  async function handleBackup() {
    setBackingUp(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBackingUp(false); return; }

    const tables = [
      "products", "sales", "sale_items",
      "purchases", "purchase_items", "inventory",
      "accounts_payable", "accounts_receivable",
      "settings", "product_categories",
    ];

    const backup: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
    };

    for (const table of tables) {
      backup[table] = await fetchTable(table, user.id);
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-erp-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackingUp(false);
    toast.success("Backup gerado! Verifique seus downloads.");
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        <p className="text-sm text-gray-500">Central de controle do ERP</p>
      </div>

      {/* 🏢 Identidade */}
      <Card>
        <CardHeader><CardTitle>🏢 Identidade</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Empresa</label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sua empresa" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Produto / Sistema</label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: Gestor Pro" />
            <p className="text-xs text-gray-400 mt-1">É o nome que aparece na tela "Sobre" e no menu lateral</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Versão do Sistema</label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
          </div>
        </CardContent>
      </Card>

      {/* 🎨 Aparência */}
      <Card>
        <CardHeader><CardTitle>🎨 Aparência</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cor Principal</label>
            <div className="flex gap-2 items-center">
              <Input type="color" className="w-12 h-10 p-1" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="Deixe vazio para usar a cor do tema" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Vazio = usa a cor padrão do tema escolhido</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estilo dos Botões</label>
            <select className="w-full p-2 border rounded-md" value={buttonStyle} onChange={(e) => setButtonStyle(e.target.value)}>
              <option value="dark-premium">Dark Premium (Fundo Escuro)</option>
              <option value="classic">Clássico</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 🔒 Backup */}
      <Card>
        <CardHeader><CardTitle>🔒 Backup dos Dados</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Gera um arquivo com todos os seus cadastros (produtos, vendas, compras, contas, configurações).
            Guarde em um lugar seguro — Google Drive, e-mail ou pen drive.
          </p>
          <Button onClick={handleBackup} disabled={backingUp}>
            {backingUp ? "Gerando backup..." : "⬇ Gerar backup agora"}
          </Button>
        </CardContent>
      </Card>

      {/* ℹ️ Sobre */}
      <Card>
        <CardHeader><CardTitle>ℹ️ Sobre o Sistema</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>{productName || "Meu ERP"}</strong> — versão {version || "1.0.0"}</p>
          <p className="text-gray-500">
            Desenvolvido para gestão do dia a dia. Seus dados ficam protegidos no banco e você pode gerar backups a qualquer momento.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}