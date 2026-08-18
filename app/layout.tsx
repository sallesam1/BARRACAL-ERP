import "./globals.css";
import "./globals-extra.css";
import { Toaster } from "sonner";
import ThemeProvider from "@/components/theme-provider";

export const metadata = {
  title: "Barracal ERP",
  description: "Sistema de Gestão Empresarial",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}