"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Pencil, X, Check } from "lucide-react";

// Retorna a data de HOJE no fuso do usuário (não em UTC)
function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

type Bank = { code: string; name: string };
type Account = {
  id: string;
  account_name: string;
  bank_code: string | null;
  agency: string;
  account_number: string;
  initial_balance: number;
  is_master: boolean;
};
type Transaction = {
  id: string;
  account_id: string;
  type: "entrada" | "saida";
  description: string;
  amount: number;
  transaction_date: string;
};

export default function BankAccountsPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Form conta
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [isMaster, setIsMaster] = useState(false);
  // Form transação
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [txType, setTxType] = useState<"entrada" | "saida">("entrada");
  const [txDesc, setTxDesc] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(todayLocal());
  const supabase = createClient();

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [bankRes, accRes, txRes] = await Promise.all([
      supabase.from("banks").select("*").order("name"),
      supabase.from("bank_accounts").select("*").eq("user_id", user.id).order("account_name"),
      supabase.from("bank_transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
    ]);
    if (bankRes.data) setBanks(bankRes.data);
    if (accRes.data) setAccounts(accRes.data);
    if (txRes.data) setTransactions(txRes.data);
    setLoading(false);
  }
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getBalance(acc: Account): number {
    let bal = acc.initial_balance || 0;
    transactions
      .filter((t) => t.account_id === acc.id)
      .forEach((t) => {
        bal += t.type === "entrada" ? t.amount : -t.amount;
      });
    return bal;
  }

  function resetAccountForm() {
    setEditingAccountId(null);
    setAccountName("");
    setBankCode("");
    setAgency("");
    setAccountNumber("");
    setInitialBalance("0");
    setIsMaster(false);
    setMessage(null);
  }

  function startEditAccount(acc: Account) {
    setEditingAccountId(acc.id);
    setAccountName(acc.account_name || "");
    setBankCode(acc.bank_code || "");
    setAgency(acc.agency || "");
    setAccountNumber(acc.account_number || "");
    setInitialBalance(String(acc.initial_balance ?? "0"));
    setIsMaster(!!acc.is_master);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveAccount() {
    if (!accountName.trim()) {
      setMessage({ type: "error", text: "Informe o nome da conta." });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      account_name: accountName.trim(),
      bank_code: bankCode || null,
      agency: agency.trim() || null,
      account_number: accountNumber.trim() || null,
      initial_balance: parseFloat(initialBalance) || 0,
      is_master: isMaster,
    };
    let error: any = null;
    if (editingAccountId) {
      const res = await supabase.from("bank_accounts").update(payload).eq("id", editingAccountId);
      error = res.error;
    } else {
      const res = await supabase.from("bank_accounts").insert({ user_id: user.id, ...payload });
      error = res.error;
    }
    if (error) setMessage({ type: "error", text: "Erro ao salvar conta: " + error.message });
    else {
      setMessage({ type: "success", text: editingAccountId ? "Conta atualizada!" : "Conta criada!" });
      resetAccountForm();
      loadData();
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("Excluir esta conta? Os lançamentos dela também serão removidos. Prefira EDITAR em vez de excluir.")) return;
    try {
      await supabase.from("bank_transactions").delete().eq("account_id", id);
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
      setMessage({ type: "success", text: "Conta excluída." });
      loadData();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao excluir: " + (e?.message || e) });
    }
  }

  function resetTxForm() {
    setEditingTxId(null);
    setSelectedAccount("");
    setTxType("entrada");
    setTxDesc("");
    setTxAmount("");
    setTxDate(todayLocal());
    setMessage(null);
  }

  function startEditTransaction(t: Transaction) {
    setEditingTxId(t.id);
    setSelectedAccount(t.account_id || "");
    setTxType(t.type || "entrada");
    setTxDesc(t.description || "");
    setTxAmount(String(t.amount ?? ""));
    setTxDate(t.transaction_date ? t.transaction_date.slice(0, 10) : todayLocal());
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveTransaction() {
    const val = parseFloat(txAmount) || 0;
    if (!selectedAccount || val <= 0 || !txDesc.trim()) {
      setMessage({ type: "error", text: "Preencha conta, descrição e valor." });
      return;
    }
    const payload = {
      account_id: selectedAccount,
      type: txType,
      description: txDesc.trim(),
      amount: val,
      transaction_date: txDate,
    };
    let error: any = null;
    if (editingTxId) {
      const res = await supabase.from("bank_transactions").update(payload).eq("id", editingTxId);
      error = res.error;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await supabase.from("bank_transactions").insert({ user_id: user.id, ...payload });
      error = res.error;
    }
    if (error) setMessage({ type: "error", text: "Erro ao lançar: " + error.message });
    else {
      setMessage({ type: "success", text: editingTxId ? "Lançamento atualizado!" : "Lançamento feito!" });
      resetTxForm();
      loadData();
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm("Excluir este lançamento? Prefira EDITAR em vez de excluir.")) return;
    const { error } = await supabase.from("bank_transactions").delete().eq("id", id);
    if (error) setMessage({ type: "error", text: "Erro ao excluir: " + error.message });
    else { setMessage({ type: "success", text: "Lançamento excluído." }); loadData(); }
  }

  if (loading) return <p className="p-6">Carregando...</p>;
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Contas Correntes</h1>
      {message && (
        <div className={"p-3 rounded-md border text-sm " + (message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700")}>
          {message.text}
        </div>
      )}
      {/* Nova conta / Editar conta */}
      <Card>
        <CardHeader><CardTitle>{editingAccountId ? "Editar Conta" : "Nova Conta"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {editingAccountId && (
            <p className="text-xs text-gray-500">Editando conta existente.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Conta</label>
              <Input placeholder="Ex: Conta PJ Itaú, Mestra" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Banco</label>
              <select className="w-full p-2 border rounded-md bg-background" value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
                <option value="">Sem banco (conta mestra)</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Agência</label>
              <Input placeholder="0000" value={agency} onChange={(e) => setAgency(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número da Conta</label>
              <Input placeholder="00000-0" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Saldo Inicial (R$)</label>
              <Input type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} />
                Conta Mestra (principal)
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveAccount}>
              {editingAccountId ? <Check className="mr-2 h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingAccountId ? "Salvar Alterações" : "Salvar Conta"}
            </Button>
            {editingAccountId && (
              <Button variant="outline" onClick={resetAccountForm}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Lista de contas com saldo */}
      <Card>
        <CardHeader><CardTitle>Minhas Contas</CardTitle></CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta ainda. Crie a primeira acima.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => {
                const bank = banks.find((b) => b.code === acc.bank_code);
                const balance = getBalance(acc);
                return (
                  <div key={acc.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">
                        {acc.account_name} {acc.is_master && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Mestra</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bank ? bank.name + " · " : ""}
                        {acc.agency ? "Ag " + acc.agency + " · " : ""}
                        {acc.account_number ? "Conta " + acc.account_number : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={"font-semibold " + (balance >= 0 ? "text-green-600" : "text-red-600")}>
                        {balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => startEditAccount(acc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteAccount(acc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Lançamento */}
      <Card>
        <CardHeader><CardTitle>{editingTxId ? "Editar Lançamento" : "Lançar Entrada / Saída"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {editingTxId && (
            <p className="text-xs text-gray-500">Editando lançamento existente.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Conta</label>
              <select className="w-full p-2 border rounded-md bg-background" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                <option value="">Selecione a conta</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select className="w-full p-2 border rounded-md bg-background" value={txType} onChange={(e) => setTxType(e.target.value as "entrada" | "saida")}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Input placeholder="Ex: Venda à vista, Pagamento fornecedor" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valor (R$)</label>
              <Input type="number" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveTransaction}>
              {editingTxId ? <Check className="mr-2 h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingTxId ? "Salvar Alterações" : "Lançar"}
            </Button>
            {editingTxId && (
              <Button variant="outline" onClick={resetTxForm}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Últimos lançamentos */}
      <Card>
        <CardHeader><CardTitle>Últimos Lançamentos</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 20).map((t) => {
                const acc = accounts.find((a) => a.id === t.account_id);
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.transaction_date} · {acc ? acc.account_name : "—"} · {t.type === "entrada" ? "Entrada" : "Saída"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={"font-semibold " + (t.type === "entrada" ? "text-green-600" : "text-red-600")}>
                        {t.type === "entrada" ? "+" : "−"}{t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => startEditTransaction(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteTransaction(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}