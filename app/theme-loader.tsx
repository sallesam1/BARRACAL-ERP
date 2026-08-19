"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ThemeLoader() {
  const [theme, setTheme] = useState("dark-premium");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("settings")
        .select("button_style")
        .eq("user_id", user.id)
        .single();
      if (data?.button_style) {
        setTheme(data.button_style);
      }
    }
    load();
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove(
      "theme-light", "theme-dark-premium", "theme-midnight", "theme-emerald", "theme-ocean"
    );
    document.documentElement.classList.add("theme-" + theme);
  }, [theme]);

  return null;
}