import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { today } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { TrendChart, type TrendPoint } from "./trend-chart";

type Summary = {
  month: string;
  currency: Currency;
  income: string;
  expenses: string;
  debt_payments: string;
};

type Expense = {
  amount: string;
  category: { id: string; name: string; icon: string | null } | null;
  account: { currency: Currency };
};

const PERIODS = [3, 6, 12] as const;

// Lista de meses (YYYY-MM) desde hace n-1 meses hasta el actual.
function lastMonths(n: number) {
  const [y, m] = today().split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const monthLabel = (key: string) =>
  new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" })
    .format(new Date(`${key}-01T00:00:00Z`))
    .replace(".", "");

export default async function ReportesPage({ searchParams }: PageProps<"/reportes">) {
  const { meses, moneda } = await searchParams;
  const period = PERIODS.find((p) => String(p) === meses) ?? 6;
  const months = lastMonths(period);
  const start = `${months[0]}-01`;
  const supabase = await createClient();

  const [summary, expenses] = await Promise.all([
    supabase
      .from("monthly_summary")
      .select("month, currency, income, expenses, debt_payments")
      .gte("month", start)
      .returns<Summary[]>(),
    supabase
      .from("transactions")
      .select(
        "amount, category:categories(id, name, icon), account:accounts!transactions_account_id_user_id_fkey(currency)",
      )
      .eq("type", "expense")
      .gte("occurred_on", start)
      .returns<Expense[]>(),
  ]);
  if (summary.error) throw new Error(summary.error.message);
  if (expenses.error) throw new Error(expenses.error.message);

  const available = [...new Set(summary.data.map((s) => s.currency))].sort() as Currency[];
  const currency: Currency = moneda === "USD" && available.includes("USD") ? "USD" : "COP";

  const byMonth = new Map(
    summary.data.filter((s) => s.currency === currency).map((s) => [s.month.slice(0, 7), s]),
  );
  const rows = months.map((key) => {
    const s = byMonth.get(key);
    const income = Number(s?.income ?? 0);
    const spent = Number(s?.expenses ?? 0);
    const payments = Number(s?.debt_payments ?? 0);
    return { key, label: monthLabel(key), income, expenses: spent, payments, net: income - spent - payments };
  });
  const chartData: TrendPoint[] = rows.map(({ key, label, income, expenses }) => ({
    month: key,
    label,
    income,
    expenses,
  }));

  const totals = rows.reduce(
    (t, r) => ({ income: t.income + r.income, expenses: t.expenses + r.expenses, net: t.net + r.net }),
    { income: 0, expenses: 0, net: 0 },
  );
  const savingsRate = totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : null;

  const categories = topCategories(expenses.data.filter((e) => e.account.currency === currency));
  const query = (params: Record<string, string>) =>
    `/reportes?${new URLSearchParams({ meses: String(period), moneda: currency, ...params })}`;

  return (
    <>
      <PageHeader title="Reportes" backHref="/mas" />

      <div className="flex items-center justify-between gap-3">
        <nav className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1" aria-label="Periodo">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={query({ meses: String(p) })}
              aria-current={p === period ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-center text-sm font-medium ${
                p === period ? "bg-accent text-accent-foreground" : "text-muted"
              }`}
            >
              {p} m
            </Link>
          ))}
        </nav>
        {available.length > 1 && (
          <nav className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" aria-label="Moneda">
            {available.map((c) => (
              <Link
                key={c}
                href={query({ moneda: c })}
                aria-current={c === currency ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  c === currency ? "bg-accent text-accent-foreground" : "text-muted"
                }`}
              >
                {c}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Tile label="Ingreso / mes" value={formatMoney(totals.income / period, currency)} />
        <Tile label="Gasto / mes" value={formatMoney(totals.expenses / period, currency)} />
        <Tile
          label="Ahorro"
          value={savingsRate === null ? "—" : `${savingsRate}%`}
          className={savingsRate !== null && savingsRate < 0 ? "text-negative" : ""}
        />
      </dl>

      <h2 className={sectionTitleClass}>Ingresos vs gastos · {currency}</h2>
      <div className={`${cardClass} p-4`}>
        <TrendChart data={chartData} currency={currency} />
      </div>

      <h2 className={sectionTitleClass}>Mes a mes</h2>
      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-3 font-medium">Mes</th>
              <th className="p-3 text-right font-medium">Ingresos</th>
              <th className="p-3 text-right font-medium">Gastos</th>
              <th className="p-3 text-right font-medium">Abonos</th>
              <th className="p-3 text-right font-medium">Neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...rows].reverse().map((r) => (
              <tr key={r.key}>
                <td className="p-3">
                  <Link href={`/?mes=${r.key}`} className="capitalize text-accent">
                    {r.label} {r.key.slice(2, 4)}
                  </Link>
                </td>
                <td className="p-3 text-right">{formatMoney(r.income, currency)}</td>
                <td className="p-3 text-right">{formatMoney(r.expenses, currency)}</td>
                <td className="p-3 text-right">{formatMoney(r.payments, currency)}</td>
                <td className={`p-3 text-right font-medium ${r.net < 0 ? "text-negative" : ""}`}>
                  {formatMoney(r.net, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {categories.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>En qué se va la plata · {period} meses</h2>
          <ul className={`${cardClass} flex flex-col gap-3 p-4`}>
            {categories.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate">
                    {c.icon} {c.name}
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {formatMoney(c.total, currency)}{" "}
                    <span className="text-muted">· {c.share}%</span>
                  </span>
                </div>
                <div className="mt-1">
                  <ProgressBar percent={c.share} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={sectionTitleClass}>Exportar</h2>
      <a
        href={`/api/export?desde=${months[0]}&hasta=${months.at(-1)}`}
        className={`${cardClass} flex items-center justify-between p-4`}
      >
        <span>
          <span className="block font-medium">Descargar movimientos (CSV)</span>
          <span className="text-sm text-muted">Últimos {period} meses · se abre en Excel o Numbers</span>
        </span>
        <span aria-hidden className="text-xl">⬇️</span>
      </a>
    </>
  );
}

function Tile({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`${cardClass} min-w-0 p-3`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 truncate font-semibold tabular-nums ${className}`}>{value}</dd>
    </div>
  );
}

// Gastos del periodo por categoría, de mayor a menor; lo que pase de 8 se agrupa en "Otras".
function topCategories(expenses: Expense[]) {
  const totals = new Map<string, { name: string; icon: string; total: number }>();
  for (const e of expenses) {
    const key = e.category?.id ?? "none";
    const entry = totals.get(key) ?? {
      name: e.category?.name ?? "Sin categoría",
      icon: e.category?.icon ?? "•",
      total: 0,
    };
    entry.total += Number(e.amount);
    totals.set(key, entry);
  }
  const sorted = [...totals.values()].sort((a, b) => b.total - a.total);
  const grand = sorted.reduce((t, c) => t + c.total, 0);
  const top = sorted.slice(0, 8);
  const rest = sorted.slice(8).reduce((t, c) => t + c.total, 0);
  if (rest > 0) top.push({ name: "Otras", icon: "📦", total: rest });
  return top.map((c) => ({ ...c, share: grand > 0 ? Math.round((c.total / grand) * 100) : 0 }));
}
