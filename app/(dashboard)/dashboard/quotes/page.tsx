"use client";
import { useState, useEffect } from "react";
type Item = {
  id: number;
  descricao: string;
  qtd: string;
  valor: string;
};
const COMPANY = {
  nome: "BARRACAL PRODUTOS MINERAIS LTDA",
  cnpj: "CNPJ 03.822.330/0001-50",
  endereco:
    "Rua Projetada A, nº 440 – Dorândia – Barra do Piraí/RJ – CEP 27110-153",
  contato: "(24) 99981-4444 | barracal.ind@gmail.com",
  slogan: "Tradição e qualidade que constroem resultados",
};
const AZUL = "#003366";
const DOURADO = "#C5A059";
function formatBRL(valor: string): string {
  const n = parseFloat(valor.replace(/\./g, "").replace(",", "."));
  if (isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export default function QuotesPage() {
  const [cliente, setCliente] = useState("");
  const [contato, setContato] = useState("");
  const [introducao, setIntroducao] = useState(
    "Conforme solicitação, segue cotação para fornecimento dos itens abaixo."
  );
  const [pagamento, setPagamento] = useState(
    "Boleto bancário 30 dias da emissão da NF-e."
  );
  const [entrega, setEntrega] = useState(
    "Conforme liberação do pedido formal e combinado com o transportador."
  );
  const [frete, setFrete] = useState("");
  const [hoje, setHoje] = useState("");
  const [itens, setItens] = useState<Item[]>([
    { id: 1, descricao: "", qtd: "", valor: "" },
  ]);
  useEffect(() => {
    setHoje(
      new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );
  }, []);
  function addItem() {
    setItens((prev) => [
      ...prev,
      { id: Date.now(), descricao: "", qtd: "", valor: "" },
    ]);
  }
  function updateItem(id: number, campo: keyof Item, valor: string) {
    setItens((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [campo]: valor } : i))
    );
  }
  function removeItem(id: number) {
    setItens((prev) => prev.filter((i) => i.id !== id));
  }
  const total = itens.reduce((acc, item) => {
    const qtd = parseFloat(item.qtd.replace(",", "."));
    const valor = parseFloat(item.valor.replace(/\./g, "").replace(",", "."));
    return acc + (isNaN(qtd) || isNaN(valor) ? 0 : qtd * valor);
  }, 0);
  const inputStyle = {
    color: "#111827",
    backgroundColor: "#ffffff",
    colorScheme: "light" as const,
  };
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#fff" }}>
          Cotação
        </h1>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-md text-white font-medium"
          style={{ backgroundColor: AZUL }}
        >
          🖨️ Imprimir / Salvar PDF
        </button>
      </div>
      {/* ===== FORMULÁRIO (escondido na impressão) ===== */}
      <div className="print:hidden space-y-4 border rounded-lg p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#111827" }}>
              Cliente
            </label>
            <input
              className="w-full p-2 border rounded-md"
              style={inputStyle}
              placeholder="Nome da empresa / cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#111827" }}>
              Contato (A/C)
            </label>
            <input
              className="w-full p-2 border rounded-md"
              style={inputStyle}
              placeholder="Nome, e-mail ou telefone"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "#111827" }}>
            Texto de introdução (use Enter para pular linha)
          </label>
          <textarea
            className="w-full p-2 border rounded-md"
            style={inputStyle}
            rows={3}
            value={introducao}
            onChange={(e) => setIntroducao(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#111827" }}>
              Forma de pagamento
            </label>
            <textarea
              className="w-full p-2 border rounded-md"
              style={inputStyle}
              rows={2}
              value={pagamento}
              onChange={(e) => setPagamento(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#111827" }}>
              Prazo de entrega
            </label>
            <textarea
              className="w-full p-2 border rounded-md"
              style={inputStyle}
              rows={2}
              value={entrega}
              onChange={(e) => setEntrega(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#111827" }}>
              Condições de frete
            </label>
            <textarea
              className="w-full p-2 border rounded-md"
              style={inputStyle}
              rows={2}
              placeholder="Ex.: CIF – entregue na usina / FOB – retirada na fábrica"
              value={frete}
              onChange={(e) => setFrete(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-sm font-medium" style={{ color: "#111827" }}>
            <div className="col-span-6">Descrição</div>
            <div className="col-span-2">Qtd</div>
            <div className="col-span-3">Valor unitário</div>
            <div className="col-span-1"></div>
          </div>
          {itens.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2">
              <input
                className="col-span-6 p-2 border rounded-md"
                style={inputStyle}
                placeholder="Ex.: Cal Hidratada CH1 em Bags"
                value={item.descricao}
                onChange={(e) => updateItem(item.id, "descricao", e.target.value)}
              />
              <input
                className="col-span-2 p-2 border rounded-md"
                style={inputStyle}
                placeholder="0"
                value={item.qtd}
                onChange={(e) => updateItem(item.id, "qtd", e.target.value)}
              />
              <input
                className="col-span-3 p-2 border rounded-md"
                style={inputStyle}
                placeholder="0,00"
                value={item.valor}
                onChange={(e) => updateItem(item.id, "valor", e.target.value)}
              />
              <button
                className="col-span-1 text-red-500"
                onClick={() => removeItem(item.id)}
                title="Remover item"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="px-3 py-1.5 rounded-md border text-sm font-medium"
            style={{ borderColor: DOURADO, color: AZUL, backgroundColor: "#ffffff" }}
          >
            + Adicionar item
          </button>
        </div>
      </div>
      {/* ===== PAPEL TIMBRADO (o que vai para o PDF) ===== */}
      {/* SEM altura fixa e SEM mt-auto — o papel encolhe para o conteúdo */}
      <div
        id="papel-timbrado"
        className="mx-auto shadow-lg flex flex-col"
        style={{
          maxWidth: "800px",
          width: "100%",
          backgroundColor: "#FFFFFF",
          color: AZUL,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* ===== CABEÇALHO AZUL ===== */}
        <div
          className="flex items-center px-6 py-5"
          style={{
            backgroundColor: AZUL,
            borderBottom: `4px solid ${DOURADO}`,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          <img
            src="/logo.png"
            alt="Logo Barracal"
            className="h-24 w-auto object-contain mr-5"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          <div className="flex flex-col justify-center text-left">
            <h1 className="text-lg font-bold tracking-wide leading-tight" style={{ color: "#FFFFFF" }}>
              {COMPANY.nome}
            </h1>
            <p className="text-[11px] mt-1" style={{ color: DOURADO }}>
              {COMPANY.cnpj}
            </p>
            <p className="italic text-[12px] mt-1" style={{ color: DOURADO }}>
              {COMPANY.slogan}
            </p>
          </div>
        </div>
        {/* Linha de endereço/contato */}
        <p
          className="text-center text-[11px] pt-2"
          style={{ color: AZUL, backgroundColor: "#FFFFFF" }}
        >
          {COMPANY.endereco} | {COMPANY.contato}
        </p>
        {/* Título */}
        <h2 className="text-center font-bold text-[16px] mt-4" style={{ color: AZUL, backgroundColor: "#FFFFFF" }}>
          Proposta comercial.
        </h2>
        {/* Corpo */}
        <div
          className="px-8 mt-3 space-y-2"
          style={{ color: AZUL, fontSize: "12px", backgroundColor: "#FFFFFF" }}
        >
          <p>
            <strong>À {cliente || "______________________"}.</strong>
          </p>
          <p>
            {contato && (
              <>
                A/C: <strong>{contato}</strong>.{" "}
              </>
            )}
          </p>
          <p style={{ whiteSpace: "pre-line" }}>{introducao}</p>
          {/* Tabela de itens */}
          <table
            className="w-full text-[12px]"
            style={{ borderCollapse: "collapse", backgroundColor: "#FFFFFF" }}
          >
            <thead>
              <tr style={{ backgroundColor: AZUL, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                <th className="text-left p-1.5 font-medium" style={{ color: "#FFF", border: `1px solid ${DOURADO}` }}>
                  Item
                </th>
                <th className="text-left p-1.5 font-medium" style={{ color: "#FFF", border: `1px solid ${DOURADO}` }}>
                  Descrição
                </th>
                <th className="text-center p-1.5 font-medium" style={{ color: "#FFF", border: `1px solid ${DOURADO}` }}>
                  Qtd
                </th>
                <th className="text-right p-1.5 font-medium" style={{ color: "#FFF", border: `1px solid ${DOURADO}` }}>
                  Valor unit.
                </th>
                <th className="text-right p-1.5 font-medium" style={{ color: "#FFF", border: `1px solid ${DOURADO}` }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => {
                const qtd = parseFloat(item.qtd.replace(",", "."));
                const valor = parseFloat(item.valor.replace(/\./g, "").replace(",", "."));
                const sub = isNaN(qtd) || isNaN(valor) ? 0 : qtd * valor;
                return (
                  <tr key={item.id}>
                    <td style={{ border: `1px solid ${DOURADO}`, padding: "5px 8px" }}>
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td style={{ border: `1px solid ${DOURADO}`, padding: "5px 8px" }}>
                      {item.descricao || "—"}
                    </td>
                    <td className="text-center" style={{ border: `1px solid ${DOURADO}`, padding: "5px 8px" }}>
                      {item.qtd || "—"}
                    </td>
                    <td className="text-right" style={{ border: `1px solid ${DOURADO}`, padding: "5px 8px" }}>
                      {item.valor ? formatBRL(item.valor) : "—"}
                    </td>
                    <td className="text-right font-medium" style={{ border: `1px solid ${DOURADO}`, padding: "5px 8px" }}>
                      {formatBRL(String(sub))}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={4} className="text-right font-bold p-1.5" style={{ color: AZUL }}>
                  TOTAL
                </td>
                <td className="text-right font-bold p-1.5" style={{ color: AZUL, borderTop: `2px solid ${DOURADO}` }}>
                  {formatBRL(String(total))}
                </td>
              </tr>
            </tbody>
          </table>
          {/* Condições */}
          <p className="text-[11px]" style={{ whiteSpace: "pre-line" }}>
            <strong>Forma de pagamento:</strong> {pagamento}
            {"\n"}
            <strong>Prazo de entrega:</strong> {entrega}
            {frete && (
              <>
                {"\n"}
                <strong>Condições de frete:</strong> {frete}
              </>
            )}
            {"\n"}
            Desde já agradecemos a preferência.
          </p>
          {/* Data e assinatura */}
          <div className="pt-16">
            <p>{cliente ? "Barra do Piraí" : ""}, {hoje}.</p>
            <div className="mt-8">
              <p className="font-bold">Alexandre Salles.</p>
              <p className="text-[11px]">BARRACAL PRODUTOS MINERAIS LTDA</p>
            </div>
          </div>
        </div>
        {/* Rodapé azul — logo após a assinatura, sem mt-auto */}
        <div
          className="text-center px-6 py-2.5"
          style={{
            backgroundColor: AZUL,
            borderTop: `4px solid ${DOURADO}`,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          <p className="text-[12px] font-bold" style={{ color: "#FFF" }}>
            BARRACAL | (24) 99981-4444 | CNPJ: 03.822.330/0001-50
          </p>
        </div>
      </div>
      {/* CSS de impressão + fundo branco */}
      <style jsx global>{`
        #papel-timbrado {
          background-color: #ffffff !important;
        }
        @media print {
          html,
          body {
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #papel-timbrado,
          #papel-timbrado * {
            visibility: visible !important;
          }
          #papel-timbrado {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}