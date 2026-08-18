"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function checkToken() {
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const type = params.get("type");

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
        if (error) {
          setLinkError(true);
          setChecking(false);
          return;
        }
      }
      setChecking(false);
    }
    checkToken();
  }, []);

  async function handleSubmit() {
    if (!password) { setMessage({ type: "error", text: "Digite a nova senha." }); return; }
    if (password.length < 6) { setMessage({ type: "error", text: "A senha precisa ter pelo menos 6 caracteres." }); return; }
    if (password !== confirm) { setMessage({ type: "error", text: "As senhas não conferem." }); return; }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ type: "error", text: "Erro: " + error.message });
      setSaving(false);
      return;
    }

    setMessage({ type: "success", text: "Senha alterada com sucesso!" });
    setSaving(false);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-gray-500">Verificando seu link...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Definir nova senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkError ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-red-600">Este link expirou ou é inválido. Peça um novo link de recuperação.</p>
              <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
                Ir para o login
              </Button>
            </div>
          ) : (
            <>
              {message && (
                <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nova senha</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite a nova senha" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar nova senha</label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a nova senha" />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}