import "./globals.css";
import { Toaster } from "sonner";
import ThemeProvider from "@/components/theme-provider";

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
        <ThemeProvider />
      </body>
    </html>
  );
}