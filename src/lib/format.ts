export type Currency = "COP" | "USD";

const formatters: Record<Currency, Intl.NumberFormat> = {
  COP: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }),
};

// Supabase devuelve los numeric como string para no perder precisión.
export function formatMoney(amount: number | string, currency: Currency) {
  return formatters[currency].format(Number(amount));
}

// Convierte lo que escribe el usuario ("1.250.000" o "12,50") en número. Formato colombiano:
// punto = miles, coma = decimales. Excepción: "12.50" (un solo punto y 1-2 decimales) es decimal.
export function parseAmount(input: string): number {
  const sign = input.trim().startsWith("-") ? -1 : 1;
  const cleaned = input.replace(/[^\d.,]/g, "");
  if (cleaned === "") return NaN;
  if (/^\d+\.\d{1,2}$/.test(cleaned)) return sign * Number(cleaned);
  return sign * Number(cleaned.replace(/\./g, "").replace(",", "."));
}

// Número -> texto para el campo de monto ("1250000" -> "1.250.000").
export function formatAmountInput(value: number | string, currency: Currency) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(n);
}
