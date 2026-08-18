"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      const { error } = await supabase.auth.getSession();
      if (error) {
        router.replace("/login");
        return;
      }
      router.replace("/dashboard");
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-500">Conectando com Google...</p>
    </div>
  );
}