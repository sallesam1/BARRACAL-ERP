"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ThemePage() {
  const [loading, setLoading] = useState(true);
  const [buttonStyle, setButtonStyle] = useState("dark-premium");

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadTheme() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("settings")
        .select("button_style")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && data.button_style) {
        setButtonStyle(data.button_style);
      }
      setLoading(false);
    }
    loadTheme();
  }, []);

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("settings").upsert({
      user_id: user.id,
      button_style: buttonStyle,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      toast.error("Erro ao salvar tema");
    } else {
      toast.success("Tema salvo!");
      window.dispatchEvent(new Event("settings-saved"));
    }
  }

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Meu Tema</h1>
      <p className="text-sm text-muted-foreground">
        Escolha o visual do sistema para a sua conta. Isso não afeta os outros usuários.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Personalização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            </select>
          </div>

          <Button onClick={handleSave}>Salvar Tema</Button>
        </CardContent>
      </Card>
    </div>
  );
}