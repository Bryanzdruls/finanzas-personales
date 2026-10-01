import type { SupabaseClient } from "@supabase/supabase-js";

// Un movimiento por revisar es un posible duplicado si hay otro de la misma cuenta y monto con fecha
// a ±1 día (el correo puede llegar al día siguiente): el anotado a mano, uno ya confirmado o uno
// anterior que también espera revisión (SMS y correo del mismo movimiento).

export type DuplicateCandidate = {
  id: string;
  occurred_on: string;
  created_at: string;
  account_id: string;
  amount: string | number;
  source: string;
  needs_review: boolean;
  external_ref: string | null;
  description: string | null;
  merchant: string | null;
};

const MAX_DAYS_APART = 1;

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysApart(a: string, b: string) {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

// Dos huellas con hora distinta son movimientos distintos del banco (dos transferencias iguales).
function differentBankMovements(a: string | null, b: string | null) {
  if (!a || !b || a === b) return false;
  const [dayA, amountA, dirA, hourA = ""] = a.split("|");
  const [dayB, amountB, dirB, hourB = ""] = b.split("|");
  if (dayA !== dayB || amountA !== amountB || dirA !== dirB) return true;
  return hourA !== "" && hourB !== "" && hourA !== hourB;
}

// Devuelve, por cada movimiento por revisar repetido, el movimiento con el que se fusionaría.
// Cada movimiento se usa en una sola pareja.
export function findDuplicateMatches(candidates: DuplicateCandidate[]) {
  const matches = new Map<string, DuplicateCandidate>();
  const used = new Set<string>();

  // Primero los más recientes: son los que sobran.
  const pending = candidates
    .filter((t) => t.needs_review)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  for (const t of pending) {
    if (used.has(t.id)) continue;
    const options = candidates.filter(
      (c) =>
        c.id !== t.id &&
        !used.has(c.id) &&
        !matches.has(c.id) &&
        c.account_id === t.account_id &&
        Number(c.amount) === Number(t.amount) &&
        daysApart(c.occurred_on, t.occurred_on) <= MAX_DAYS_APART &&
        (!c.needs_review || c.created_at < t.created_at) &&
        !differentBankMovements(c.external_ref, t.external_ref),
    );
    if (options.length === 0) continue;

    // Preferencia: el anotado a mano, luego el ya confirmado, la fecha más cercana y el más antiguo.
    options.sort(
      (a, b) =>
        Number(b.source === "manual") - Number(a.source === "manual") ||
        Number(a.needs_review) - Number(b.needs_review) ||
        daysApart(a.occurred_on, t.occurred_on) - daysApart(b.occurred_on, t.occurred_on) ||
        (a.created_at < b.created_at ? -1 : 1),
    );
    matches.set(t.id, options[0]);
    used.add(t.id);
    used.add(options[0].id);
  }
  return matches;
}

// Carga los movimientos por revisar y los de su rango de fechas (±1 día) para buscar parejas.
export async function loadDuplicateMatches(supabase: SupabaseClient, reviewDates: string[]) {
  if (reviewDates.length === 0) return new Map<string, DuplicateCandidate>();
  const dates = [...reviewDates].sort();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, occurred_on, created_at, account_id, amount, source, needs_review, external_ref, description, merchant")
    .gte("occurred_on", shiftDate(dates[0], -MAX_DAYS_APART))
    .lte("occurred_on", shiftDate(dates.at(-1)!, MAX_DAYS_APART))
    .returns<DuplicateCandidate[]>();
  if (error) throw new Error(error.message);
  return findDuplicateMatches(data);
}
