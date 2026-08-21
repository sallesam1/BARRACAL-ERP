"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const THEME_CLASSES = [
  "theme-light",
  "theme-dark-premium",
  "theme-midnight",
  "theme-emerald",
  "theme-ocean",
  "theme-dark-sidebar",
];

const THEME_MAP: Record<string, string> = {
  light: "theme-light",
  "light-classic": "theme-light",
  classic: "theme-light",
  dark: "theme-dark-premium",
  "dark-premium": "theme-dark-premium",
  premium: "theme-dark-premium",
  midnight: "theme-midnight",
  "midnight-violet": "theme-midnight",
  violet: "theme-midnight",
  emerald: "theme-emerald",
  "emerald-dark": "theme-emerald",
  ocean: "theme-ocean",
  "ocean-light": "theme-ocean",
  "dark-sidebar": "theme-dark-sidebar",
  "dark-sidebar-light": "theme-dark-sidebar",
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return "";
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function ThemeProvider() {
  const supabase = createClient();

  function applyTheme(t: string, color: string) {
    const el = document.documentElement;
    THEME_CLASSES.forEach((c) => el.classList.remove(c));
    const themeClass = THEME_MAP[normalize(t)] || "theme-dark-premium";
    el.classList.add(themeClass);

    const clean = (color || "").trim();
    if (/^#([a-f\d]{3}|[a-f\d]{6})$/i.test(clean)) {
      const hsl = hexToHsl(clean);
      if (hsl) {
        el.style.setProperty("--primary", hsl);
        el.style.setProperty("--ring", hsl);
        return;
      }
    }
    el.style.removeProperty("--primary");
    el.style.removeProperty("--ring");
  }

  useEffect(() => {
    let active = true;
    async function load() {
      let savedTheme = "dark-premium";
      let savedColor = "";
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("settings")
            .select("button_style, primary_color")
            .eq("user_id", user.id)
            .maybeSingle();
          if (data) {
            if (data.button_style) savedTheme = data.button_style;
            if (data.primary_color) savedColor = data.primary_color;
          }
        }
      } catch {}
      if (active) applyTheme(savedTheme, savedColor);
    }
    load();
    window.addEventListener("settings-saved", load);
    return () => {
      active = false;
      window.removeEventListener("settings-saved", load);
    };
  }, []);

  return null;
}