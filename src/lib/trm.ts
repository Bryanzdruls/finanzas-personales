// TRM oficial (pesos por dólar) de la Superintendencia Financiera, publicada en datos.gov.co.
// Se usa para estimar los dólares de una transferencia COP -> USD (p. ej. compra de USDW en
// Wenia); el usuario la corrige al revisar. Caché de 12 horas; si falla, devuelve null.
const TRM_URL = "https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1";

export async function getTrm(): Promise<number | null> {
  try {
    const res = await fetch(TRM_URL, { next: { revalidate: 43200 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const [row] = (await res.json()) as { valor?: string }[];
    const value = Number(row?.valor);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}
