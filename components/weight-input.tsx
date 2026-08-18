"use client";

type WeightUnit = "unidade" | "kg" | "toneladas";

// Formata com ponto de milhar e vírgula decimal
function formatNumber(value: string): string {
  let cleaned = value.replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");
  if (parts.length > 2) cleaned = parts[0] + "," + parts.slice(1).join("");
  const [intPart, decPart] = cleaned.split(",");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? intFormatted + "," + decPart : intFormatted;
}

// Converte a string formatada para número
function parseNumber(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}

// Converte para kg (valor canônico)
export function toKg(value: string, unit: WeightUnit): number {
  const n = parseNumber(value);
  if (unit === "toneladas") return n * 1000;
  if (unit === "kg") return n;
  return n; // unidade = conta como 1
}

export default function WeightInput({
  value, onChange, unit, onUnitChange,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: WeightUnit;
  onUnitChange: (u: WeightUnit) => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        inputMode="decimal"
        className="w-full rounded-md border border-gray-300 p-2 text-sm"
        value={value}
        placeholder={unit === "kg" ? "Ex: 47.470" : unit === "toneladas" ? "Ex: 47,47" : "Ex: 120"}
        onChange={(e) => onChange(formatNumber(e.target.value))}
      />
      <select
        className="rounded-md border border-gray-300 bg-white p-2 text-sm"
        value={unit}
        onChange={(e) => onUnitChange(e.target.value as WeightUnit)}
      >
        <option value="unidade">Unidade</option>
        <option value="kg">Kg</option>
        <option value="toneladas">Toneladas</option>
      </select>
    </div>
  );
}