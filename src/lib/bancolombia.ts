import { parseWalletAmount } from "./format";

export type BancolombiaKind =
  | "transfer_out"
  | "qr"
  | "payment"
  | "pse"
  | "purchase"
  | "crypto_buy"
  | "withdrawal"
  | "income"
  | "other";

export type BancolombiaMovement = {
  kind: BancolombiaKind;
  /** Entra o sale plata de la cuenta Bancolombia. */
  direction: "in" | "out";
  amount: number;
  /** Con quién fue, normalizado para las reglas ("llave 0091999304", "nu compania de financiamiento"). */
  counterparty: string | null;
  /** Texto legible para la lista de movimientos. */
  description: string;
  /** Cuenta propia involucrada tal como la nombra el banco ("bancolombia *1601"). */
  cardKey: string | null;
  /** YYYY-MM-DD y HH:MM, si el mensaje los trae. */
  date: string | null;
  time: string | null;
  /** Cuenta destino probable cuando ninguna regla la define: Wenia (compra de USDW) o efectivo (retiro). */
  destHint: "wenia" | "cash" | null;
};

// Verbos que indican un movimiento de plata. Sin uno de estos (claves, avisos, publicidad) no se
// registra nada.
const VERB =
  /\b(recibiste|te\s+(?:consignaron|transfirieron|abonaron|enviaron)|transferiste|enviaste|pagaste|compraste|retiraste|realizaste|abonaste|consignaste)\b/i;
const AMOUNT = /\$\s?\d[\d.,]*/;
const OWN_ACCOUNT = /\b(?:desde|con|en|a)\s+tu\s+(?:cuenta|producto|tarjeta)\s+\*?(\d{3,})/i;
const DATE = /\b(\d{2})\/(\d{2})\/(\d{4}|\d{2})\b/;
const TIME = /(\d{1,2}):(\d{2})(?::\d{2})?/;

// Interpreta un SMS o correo de alertas de Bancolombia. Formatos confirmados con mensajes reales:
// transferencia ("Transferiste"), pago QR ("pagaste … por codigo QR … a la llave"), pago a una
// entidad ("Pagaste … a NU Compania de Financiamiento desde tu producto") y compra de USDW en Wenia.
// Lo demás se reconoce por el verbo; si el tipo no es claro queda como "Movimiento Bancolombia".
export function parseBancolombiaMessage(raw: string): BancolombiaMovement | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!/bancolombia/i.test(text)) return null;

  const verbMatch = text.match(VERB);
  if (!verbMatch) return null;
  const verb = verbMatch[1].toLowerCase();

  // El monto que sigue al verbo (el texto puede traer otros números antes, como el nombre).
  const afterVerb = text.slice(verbMatch.index);
  const amountText = afterVerb.match(AMOUNT)?.[0] ?? text.match(AMOUNT)?.[0];
  const amount = amountText ? parseWalletAmount(amountText) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const kind = classify(verb, text);
  const counterparty = extractCounterparty(kind, afterVerb);
  const own = text.match(OWN_ACCOUNT)?.[1];
  const dateMatch = text.match(DATE);
  const afterDate = dateMatch ? text.slice((dateMatch.index ?? 0) + dateMatch[0].length) : "";
  const timeMatch = afterDate.slice(0, 30).match(TIME);

  return {
    kind,
    direction: kind === "income" ? "in" : "out",
    amount,
    counterparty: counterparty?.toLowerCase() ?? null,
    description: describe(kind, counterparty),
    cardKey: own ? `bancolombia *${own}` : null,
    date: dateMatch ? `${dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null,
    time: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : null,
    destHint: kind === "crypto_buy" ? "wenia" : kind === "withdrawal" ? "cash" : null,
  };
}

function classify(verb: string, text: string): BancolombiaKind {
  if (verb === "recibiste" || verb.startsWith("te ")) return "income";
  if (verb === "retiraste") return "withdrawal";
  if (verb === "compraste") return /\busdw\b|wenia/i.test(text) ? "crypto_buy" : "purchase";
  if (verb === "pagaste") {
    if (/c[oó]digo\s+qr/i.test(text)) return "qr";
    if (/\bpse\b/i.test(text)) return "pse";
    return "payment";
  }
  if (verb === "transferiste" || verb === "enviaste") return "transfer_out";
  return "other";
}

function extractCounterparty(kind: BancolombiaKind, text: string): string | null {
  const pick = (re: RegExp) => clean(text.match(re)?.[1]);
  switch (kind) {
    case "transfer_out":
    case "qr":
      return (
        pick(/\ba\s+la\s+(cuenta\s+\*?\d+|llave\s+[\w@.+-]+)/i) ??
        pick(/\ba\s+(?!la\s)(.+?)\s+(?:el\s+\d|desde|con)\b/i)
      );
    case "payment":
    case "pse":
      return pick(/\$\s?\d[\d.,]*\s+(?:a|en)\s+(.+?)\s+(?:desde|con|el\s+\d|por)\b/i);
    case "purchase":
      return pick(/\$\s?\d[\d.,]*(?:\s+pesos)?\s+en\s+(.+?)\s+(?:con|desde|el\s+\d)\b/i);
    case "crypto_buy":
      return "wenia";
    case "income":
      return pick(/\bde\s+(.+?)\s+(?:en|a)\s+tu\s+(?:cuenta|producto)/i);
    case "withdrawal":
      return "cajero";
    default:
      return null;
  }
}

function describe(kind: BancolombiaKind, counterparty: string | null) {
  const to = counterparty ? ` ${counterparty}` : "";
  switch (kind) {
    case "transfer_out":
      return counterparty ? `Transferencia a${to}` : "Transferencia enviada";
    case "qr":
      return counterparty ? `Pago QR a${to}` : "Pago con código QR";
    case "payment":
      return counterparty ? `Pago a${to}` : "Pago";
    case "pse":
      return counterparty ? `Pago PSE a${to}` : "Pago PSE";
    case "purchase":
      return counterparty ? `Compra en${to}` : "Compra con débito";
    case "crypto_buy":
      return "Compra de USDW (Wenia)";
    case "withdrawal":
      return "Retiro en cajero";
    case "income":
      return counterparty ? `Transferencia de${to}` : "Ingreso recibido";
    default:
      return "Movimiento Bancolombia";
  }
}

function clean(value?: string) {
  const v = value?.replace(/[.,;]+$/, "").trim();
  return v ? v.slice(0, 120) : null;
}

// Clave para no registrar dos veces el mismo movimiento (SMS, correo, sincronización o pegado).
export function movementRef(m: Pick<BancolombiaMovement, "date" | "amount" | "direction" | "time">) {
  return `${m.date ?? "sin-fecha"}|${m.amount.toFixed(2)}|${m.direction}|${m.time ?? ""}`;
}

// Separa un texto pegado con varios SMS en mensajes individuales (cada uno empieza por "Bancolombia").
export function splitMessages(pasted: string) {
  return pasted
    .split(/(?=\bBancolombia\s*:)/i)
    .map((m) => m.trim())
    .filter((m) => /bancolombia/i.test(m));
}

// Parámetros comunes para ingest_bank_movement (token) e import_bank_movement (sesión).
export function movementParams(m: BancolombiaMovement, fxRate: number | null) {
  return {
    p_type: m.direction === "in" ? "income" : "expense",
    p_amount: m.amount,
    p_counterparty: m.counterparty,
    p_description: m.description,
    p_card_key: m.cardKey,
    p_occurred_on: m.date,
    p_external_ref: movementRef(m),
    p_dest_hint: m.destHint,
    p_fx_rate: fxRate,
  };
}
