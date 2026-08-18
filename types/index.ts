export type UserRole = "admin" | "manager" | "employee" | "customer";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  cost: number | null;
  category: string | null;
  stock_quantity: number;
  min_stock: number | null;
  created_at: string;
}

export interface Sale {
  id: string;
  customer_id: string | null;
  user_id: string;
  total: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface FinancialTransaction {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  category: string | null;
  date: string;
  created_at: string;
}