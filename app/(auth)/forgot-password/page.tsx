"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Enviamos um link de recuperação para o seu e-mail.");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Recuperar senha</h1>
          <p className="mt-2 text-sm text-gray-600">
            Digite seu e-mail para receber o link de redefinição
          </p>
        </div>

        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>

            {message && (
              <p className="text-sm text-green-600">{message}</p>
            )}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-blue-600 hover:underline">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}