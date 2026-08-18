"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      window.location.href = "/auth/update-password" + hash;
      return;
    }
    router.replace("/dashboard");
  }, [router]);

  return null;
}