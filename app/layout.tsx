import "./globals.css";
import { Toaster } from "sonner";
import ThemeLoader from "./theme-loader";

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