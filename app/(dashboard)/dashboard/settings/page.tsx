"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const THEMES = [
  { id: "light-classic", name: "Light Clássico", desc: "Claro e limpo", accent: "#334155", previewBg: "bg-white", previewSidebar: "bg-slate-200", previewLine: "bg-slate-300" },
  { id: "dark-premium", name: "Dark Premium", desc: "Escuro profundo", accent: "#475569", previewBg: "bg-slate-900", previewSidebar: "bg-slate-800", previewLine: "bg-white/20" },
  { id: "midnight-violet", name: "Midnight Violet", desc: "Quase preto + violeta", accent: "#a78bfa", previewBg: "bg-[#120c1f]", previewSidebar: "bg-[#241640]", previewLine: "bg-white/20" },
  { id: "emerald-dark", name: "Emerald Dark", desc: "Verde esmeralda", accent: "#10b981", previewBg: "bg-[#052e22]", previewSidebar: "bg-[#0b3d2e]", previewLine: "bg-white/20" },
  { id: "ocean-light", name: "Ocean Light", desc: "Claro e suave", accent: "#64748b", previewBg: "bg-slate-50", previewSidebar: "bg-slate-200", previewLine: "bg-slate-300" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [buttonStyle, setButtonStyle] = useState("dark-premium");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { if (active) setLoading(false); }, 4000);

    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (data && active) {
          if (data.company_name) setCompanyName(data.company_name);
          if (data.primary_color) setPrimaryColor(data.primary_color);
          if (data.button_style) setButtonStyle(data.button_style);
        }
      } catch (e) {
        console.error("Erro ao carregar configurações", e);
      } finally {
        if (active) { setLoading(false); clearTimeout(timer); }
      }
    }

    loadSettings();
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const currentTheme = THEMES.find((t) => t.id === buttonStyle) || THEMES[1];
  const destaque = primaryColor || currentTheme.accent;

  function showNotice(type: "success" | "error", text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showNotice("error", "Você precisa estar logado para salvar.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          user_id: user.id,
          company_name: companyName,
          primary_color: primaryColor,
          button_style: buttonStyle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    setSaving(false);

    if (error) {
      showNotice("error", "Erro ao salvar: " + error.message);
      return;
    }

    showNotice("success", "Configurações salvas com sucesso!");
    window.dispatchEvent(new Event("settings-saved"));
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações do Sistema</h1>

      {notice && (
        <div
          className={
            "rounded-md border px-4 py-3 text-sm font-medium shadow-md " +
            (notice.type === "success"
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-900")
          }
        >
          {notice.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tema do Sistema</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {THEMES.map((t) => {
                const selected = buttonStyle === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setButtonStyle(t.id)}
                    className={
                      "rounded-lg border bg-card p-2 text-left transition-all " +
                      (selected ? "border-2" : "border-border hover:border-primary/50")
                    }
                    style={selected ? { borderColor: destaque, boxShadow: `0 0 0 2px ${destaque}30` } : undefined}
                  >
                    <div className={"relative mb-2 h-16 overflow-hidden rounded-md border border-black/10 " + t.previewBg}>
                      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: destaque }} />
                      <div className={"absolute inset-y-0 left-0 w-4 " + t.previewSidebar} />
                      <div className="absolute inset-x-0 bottom-1.5 left-6 right-1.5 top-2.5 flex flex-col gap-1">
                        <div className={"h-1 w-10 rounded-full " + t.previewLine} />
                        <div className={"h-1 w-7 rounded-full " + t.previewLine} />
                        <div className="mt-auto h-2.5 w-12 rounded-sm" style={{ backgroundColor: destaque }} />
                      </div>
                    </div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhum tema tem azul. A cor abaixo é opcional.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nome da Empresa</label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Minha Empresa" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Cor Principal <span className="text-xs text-muted-foreground">(opcional — deixe vazio para usar a cor do tema)</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="color"
                className="h-10 w-12 p-1"
                value={primaryColor || currentTheme.accent}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="Ex: #f7733b"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}