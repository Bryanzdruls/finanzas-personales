import { parseAmount } from "./format";

export type Search = {
  /** Texto para buscar en descripción, comercio y categoría, sin caracteres que rompan el filtro. */
  text: string;
  /** Si lo escrito es un monto ("45000", "45.000", "$45.000", "12,50"), el número. */
  amount: number | null;
};

// Interpreta lo que se escribe en el buscador de Movimientos.
export function parseSearch(raw: string | string[] | undefined): Search | null {
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 60);
  if (!q) return null;
  const looksLikeAmount = /^\$?\s?\d[\d.,]*$/.test(q);
  const amount = looksLikeAmount ? parseAmount(q) : NaN;
  return {
    // Comas, paréntesis y comodines tienen significado en los filtros de PostgREST.
    text: q.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim(),
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
  };
}
