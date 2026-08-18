"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [salesRes, finRes, custRes, prodRes] = await Promise.all([
        supabase.from("sales").select("total"),
        supabase.from("financial_transactions").select("type, amount"),
        supabase.from("customers").select("id", { count: "exact" }),
        supabase.from("products").select("id", { count: "exact" }),
      ]);

      const sales = salesRes.data || [];
      const fin = finRes.data || [];

      setTotalSales(sales.reduce((sum, s) => sum + s.total, 0));
      setTotalIncome(
        fin
          .filter((t) => t.type === "entrada" || t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0)
      );
      setTotalExpense(
        fin
          .filter((t) => t.type === "saida" || t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0)
      );
      setCustomerCount(custRes.count || 0);
      setProductCount(prodRes.count || 0);
      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  const balance = totalIncome - totalExpense;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">Relatórios</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total em vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalSales)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpense)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saldo financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                balance >= 0 ? "text-gray-900" : "text-red-600"
              }`}
            >
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{customerCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{productCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}