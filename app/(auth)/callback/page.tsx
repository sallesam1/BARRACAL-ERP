"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      // Lê o tipo de link vindo do Supabase
      const type = searchParams.get("type");
      const code = searchParams.get("code");

      // Se tem um code, troca pelo token de sessão
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      // Se for link de RECUPERAÇÃO DE SENHA → vai para a tela de Nova senha
      if (type === "recovery") {
        router.replace("/reset-password");
        return;
      }

      // Se for link de CONFIRMAÇÃO DE E-MAIL → vai para o login com mensagem
      if (type === "signup") {
        router.replace("/login?confirmed=true");
        return;
      }

      // Qualquer outro caso (login normal com Google, etc.) → dashboard
      router.replace("/dashboard");
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-500">Conectando...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-gray-500">Carregando...</p></div>}>
      <CallbackContent />
    </Suspense>
  );
}