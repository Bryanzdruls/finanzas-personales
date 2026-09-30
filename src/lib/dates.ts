const TIME_ZONE = "America/Bogota";

// Fecha de hoy (YYYY-MM-DD) en Colombia, sin importar la zona del servidor.
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export type Month = {
  key: string; // 2026-09
  start: string; // 2026-09-01 (inclusive)
  end: string; // 2026-10-01 (exclusivo)
  label: string; // septiembre 2026
  prev: string;
  next: string;
  isCurrent: boolean;
};

export function parseMonth(param: string | string[] | undefined): Month {
  const current = today().slice(0, 7);
  const key = typeof param === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : current;
  const [year, month] = key.split("-").map(Number);

  const label = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(" de ", " ");

  return {
    key,
    start: `${key}-01`,
    end: `${shiftMonth(key, 1)}-01`,
    label,
    prev: shiftMonth(key, -1),
    next: shiftMonth(key, 1),
    isCurrent: key === current,
  };
}

function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// "2026-09-30" -> "martes, 30 sept"
export function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// "2026-09-30" -> "30 sept"
export function formatShortDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

// Próxima fecha de pago (YYYY-MM-DD) para un día del mes, desde hoy. Si el mes es más corto
// (p. ej. día 31 en febrero) se usa el último día del mes.
export function nextDueDate(dueDay: number, from = today()) {
  const [y, m, d] = from.split("-").map(Number);
  const candidate = (year: number, month: number) => {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return new Date(Date.UTC(year, month - 1, Math.min(dueDay, last)));
  };
  let date = candidate(y, m);
  if (date.getUTCDate() < d) date = candidate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1);
  return date.toISOString().slice(0, 10);
}
