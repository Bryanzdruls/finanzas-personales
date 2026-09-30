import { parseWalletAmount } from "./format";

export type BancolombiaKind = "transfer_out" | "pse" | "income" | "purchase" | "withdrawal" | "unknown";

export type BancolombiaMovement = {
  kind: BancolombiaKind;
  amount: number;
  /** Con quién fue el movimiento, normalizado para las reglas ("cuenta *123456789", "acme sas"). */
  counterparty: string | null;
  /** Texto legible para la lista de movimientos. */
  description: string;
  /** Cuenta propia involucrada tal como la nombra el banco ("bancolombia *134"). */
  cardKey: string | null;
  /** YYYY-MM-DD si el mensaje trae fecha. */
  date: string | null;
};

// Solo estos tipos se registran; compras y retiros se reconocen pero se ignoran por ahora.
export const ENABLED_KINDS: BancolombiaKind[] = ["transfer_out", "pse", "income"];

const AMOUNT = String.raw`(?:COP\s?)?\$\s?\d[\d.,]*`;
const OWN_ACCOUNT = /(?:desde|en|a)\s+tu\s+cuenta\s+\*(\d{3,})/i;
const DATE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;

type Pattern = {
  kind: BancolombiaKind;
  regex: RegExp;
  // Grupo con la contraparte, si el patrón la captura.
  counterparty?: (m: RegExpMatchArray) => string | undefined;
  describe: (counterparty: string | null) => string;
};

// Formato confirmado con un SMS real (transferencia). Los demás siguen la misma redacción
// ("Transferiste", "Recibiste", "Pagaste") y se ajustan cuando lleguen muestras reales.
const PATTERNS: Pattern[] = [
  {
    // "Transferiste $220,000 desde tu cuenta *134 a la cuenta *123456789 el 30/09/2026 a las 10:49."
    kind: "transfer_out",
    regex: new RegExp(String.raw`transferiste\s+(${AMOUNT}).*?\s+a\s+(?:la\s+)?(cuenta\s+\*\d+|llave\s+\S+|.+?)\s+el\s+\d{2}/`, "i"),
    counterparty: (m) => m[2],
    describe: (c) => (c ? `Transferencia a ${c}` : "Transferencia enviada"),
  },
  {
    // "Pagaste $85,000 a EPM desde tu cuenta *134 ... (PSE)"
    kind: "pse",
    regex: new RegExp(String.raw`(?:pagaste|pago(?:\s+pse)?\s+(?:por|de))\s+(${AMOUNT})\s+(?:a|en)\s+(.+?)\s+(?:desde|con|el|por)\s`, "i"),
    counterparty: (m) => m[2],
    describe: (c) => (c ? `Pago a ${c}` : "Pago PSE"),
  },
  {
    // "Recibiste una transferencia por $6,200,000 de ACME SAS en tu cuenta *134 el ..."
    kind: "income",
    regex: new RegExp(String.raw`recibiste\s+(?:una\s+transferencia\s+|un\s+pago\s+)?(?:por\s+|de\s+)?(${AMOUNT})(?:\s+de\s+(.+?))?\s+(?:en|a)\s+tu\s+cuenta`, "i"),
    counterparty: (m) => m[2],
    describe: (c) => (c ? `Transferencia de ${c}` : "Transferencia recibida"),
  },
  {
    kind: "purchase",
    regex: new RegExp(String.raw`(?:compraste|compra\s+por)\s+(${AMOUNT})`, "i"),
    describe: () => "Compra",
  },
  {
    kind: "withdrawal",
    regex: new RegExp(String.raw`(?:retiraste|retiro\s+por)\s+(${AMOUNT})`, "i"),
    describe: () => "Retiro",
  },
];

// Interpreta un SMS o correo de alertas de Bancolombia. Devuelve null si no es un movimiento.
export function parseBancolombiaMessage(raw: string): BancolombiaMovement | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!/bancolombia/i.test(text) && !/\b(transferiste|recibiste|pagaste|compraste)\b/i.test(text)) {
    return null;
  }

  for (const p of PATTERNS) {
    const m = text.match(p.regex);
    if (!m) continue;
    const amount = parseWalletAmount(m[1]);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const counterparty = clean(p.counterparty?.(m));
    const own = text.match(OWN_ACCOUNT)?.[1];
    const date = text.match(DATE);
    return {
      kind: p.kind,
      amount,
      counterparty: counterparty?.toLowerCase() ?? null,
      description: p.describe(counterparty),
      cardKey: own ? `bancolombia *${own}` : null,
      date: date ? `${date[3]}-${date[2]}-${date[1]}` : null,
    };
  }
  return null;
}

function clean(value?: string) {
  const v = value?.replace(/[.,;]+$/, "").trim();
  return v ? v.slice(0, 120) : null;
}
