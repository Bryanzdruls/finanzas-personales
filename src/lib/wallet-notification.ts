import { parseWalletAmount } from "./format";

export type ParsedPayment = { amount: number; merchant: string | null; card: string | null };

// Monto con símbolo o código de moneda: "$45.000,00", "COP 12.500", "US$9.99", "45.000 COP".
const AMOUNT = /(?:COP|USD|US\$|\$)\s?\d[\d.,]*|\d[\d.,]*\s?(?:COP|USD)\b/i;
// Tarjeta: lo que va después de "con"/"with", o una tarjeta enmascarada ("Visa •••• 1234").
const CARD_AFTER_WITH = /\b(?:con(?: tu(?: tarjeta)?)?|with)\s+(.+)$/i;
const MASKED_CARD = /([A-Za-zÁÉÍÓÚáéíóúñÑ ]*[•*·]+\s?\d{4})/;
const MERCHANT_AFTER_EN = /\b(?:en|at)\s+(.+?)(?:\s+(?:con|with)\b.*)?$/i;

// Interpreta la notificación que Google Wallet muestra tras un pago con el teléfono. El
// formato no está documentado y varía por idioma y versión, así que se busca el monto donde
// esté y el comercio/tarjeta en las posiciones más comunes. Devuelve null si no hay monto.
export function parseGoogleWalletNotification(input: {
  title?: string | null;
  text?: string | null;
}): ParsedPayment | null {
  const title = clean(input.title);
  const text = clean(input.text);

  const source = [title, text].find((s) => s && AMOUNT.test(s));
  const amountMatch = source?.match(AMOUNT)?.[0];
  if (!amountMatch) return null;
  const amount = parseWalletAmount(amountMatch);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // Comercio: el título si no trae el monto; si lo trae, lo que sigue a "en ...".
  let merchant: string | null = null;
  if (title && !AMOUNT.test(title)) {
    merchant = title;
  } else {
    const line = [title, text].find((s) => s && MERCHANT_AFTER_EN.test(s.replace(AMOUNT, "")));
    merchant = line?.replace(AMOUNT, "").match(MERCHANT_AFTER_EN)?.[1]?.trim() || null;
  }
  merchant = merchant?.replace(/^(?:pago|pagaste|compra)\s+(?:en\s+)?/i, "").trim() || null;

  const cardSource = text ?? title ?? "";
  const card =
    cardSource.replace(AMOUNT, "").match(CARD_AFTER_WITH)?.[1]?.trim() ||
    cardSource.match(MASKED_CARD)?.[1]?.trim() ||
    null;

  return { amount, merchant: merchant?.slice(0, 200) ?? null, card: card?.slice(0, 100) ?? null };
}

function clean(value?: string | null) {
  const v = value?.replace(/\s+/g, " ").trim();
  return v ? v : null;
}
