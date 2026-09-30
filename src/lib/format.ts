export type Currency = "COP" | "USD";

const formatters: Record<Currency, Intl.NumberFormat> = {
  COP: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }),
};

// Supabase devuelve los numeric como string para no perder precisión.
export function formatMoney(amount: number | string, currency: Currency) {
  return formatters[currency].format(Number(amount));
}
