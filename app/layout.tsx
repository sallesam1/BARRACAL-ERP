import "./globals.css";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/client";

export const metadata = {
  title: "Barracal ERP",
  description: "Sistema de Gestão",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster />
        <ThemeLoader />
      </body>
    </html>
  );
}

function ThemeLoader() {
  const [theme, setTheme] = React.useState("dark-premium");

  React.useEffect(() => {
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

  React.useEffect(() => {
    // Remove todos os temas e aplica a CLASSE do tema salvo
    document.documentElement.classList.remove(
      "theme-light", "theme-dark-premium", "theme-midnight", "theme-emerald", "theme-ocean"
    );
    document.documentElement.classList.add("theme-" + theme);
  }, [theme]);

  return null;
}