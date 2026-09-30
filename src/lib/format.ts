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

// Monto que manda el Atajo de iOS. Su formato depende de la región del iPhone
// ("$45.000,00", "COP 45.000", "45,000.00", "US$12.99"): si el último separador tiene 1-2
// dígitos después es el decimal; si no, todos son de miles.
export function parseWalletAmount(input: unknown): number {
  if (typeof input === "number") return input;
  if (typeof input !== "string") return NaN;
  const cleaned = input.replace(/[^\d.,]/g, "");
  if (!/\d/.test(cleaned)) return NaN;
  const lastSep = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  const decimals = lastSep >= 0 ? cleaned.length - lastSep - 1 : 0;
  if (lastSep >= 0 && decimals >= 1 && decimals <= 2) {
    const integer = cleaned.slice(0, lastSep).replace(/[.,]/g, "");
    return Number(`${integer || "0"}.${cleaned.slice(lastSep + 1)}`);
  }
  return Number(cleaned.replace(/[.,]/g, ""));
}

// Número -> texto para el campo de monto ("1250000" -> "1.250.000").
export function formatAmountInput(value: number | string, currency: Currency) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(n);
}
