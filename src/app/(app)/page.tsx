import Link from "next/link";
import { AddButton } from "@/components/add-button";
import { MonthPicker } from "@/components/month-picker";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { parseMonth } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { accountTypeLabels, type AccountType } from "@/lib/types";

type Summary = {
  currency: Currency;
  income: string;
  expenses: string;
  debt_payments: string;
  net: string;
};

type Expense = {
  amount: string;
  category: { id: string; name: string; icon: string | null } | null;
  account: { currency: Currency };
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const month = parseMonth((await searchParams).mes);
  const supabase = await createClient();

  const [summary, expenses, netWorth, balances] = await Promise.all([
    supabase
      .from("monthly_summary")
      .select("currency, income, expenses, debt_payments, net")
      .eq("month", month.start)
      .order("currency")
      .returns<Summary[]>(),
    supabase
      .from("transactions")
      .select(
        "amount, category:categories(id, name, icon), account:accounts!transactions_account_id_user_id_fkey(currency)",
      )
      .eq("type", "expense")
      .gte("occurred_on", month.start)
      .lt("occurred_on", month.end)
      .returns<Expense[]>(),
    supabase.from("net_worth").select("currency, assets, liabilities, net_worth").order("currency"),
    supabase
      .from("account_balances")
      .select("account_id, name, type, currency, balance")
      .eq("archived", false)
      .order("name"),
  ]);

  if (summary.error) throw new Error(summary.error.message);
  if (expenses.error) throw new Error(expenses.error.message);
  if (netWorth.error) throw new Error(netWorth.error.message);
  if (balances.error) throw new Error(balances.error.message);

  const summaries: Summary[] = summary.data.length
    ? summary.data
    : [{ currency: "COP", income: "0", expenses: "0", debt_payments: "0", net: "0" }];

  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Inicio</h1>
      <MonthPicker month={month} basePath="/" />

      <section className="mt-4 grid gap-3">
        {summaries.map((s) => (
          <div key={s.currency} className={`${cardClass} p-5`}>
            <p className="text-sm text-muted">Balance del mes · {s.currency}</p>
            <p
              className={`mt-1 text-3xl font-semibold tabular-nums ${Number(s.net) < 0 ? "text-negative" : ""}`}
            >
              {formatMoney(s.net, s.currency)}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Stat label="Ingresos" value={formatMoney(s.income, s.currency)} className="text-positive" />
              <Stat label="Gastos" value={formatMoney(s.expenses, s.currency)} />
              <Stat label="Abonos" value={formatMoney(s.debt_payments, s.currency)} />
            </dl>
          </div>
        ))}
      </section>

      <CategoryBreakdown expenses={expenses.data} monthKey={month.key} />

      <h2 className={sectionTitleClass}>Patrimonio neto</h2>
      <div className="grid gap-3">
        {netWorth.data.map((row) => (
          <div key={row.currency} className={`${cardClass} p-4`}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">{row.currency}</span>
              <span className="text-xl font-semibold tabular-nums">
                {formatMoney(row.net_worth, row.currency as Currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted tabular-nums">
              <span>Activos {formatMoney(row.assets, row.currency as Currency)}</span>
              <span>Deudas {formatMoney(row.liabilities, row.currency as Currency)}</span>
            </div>
          </div>
        ))}
      </div>

      <h2 className={sectionTitleClass}>Cuentas</h2>
      <ul className={`${cardClass} divide-y divide-border`}>
        {balances.data.map((account) => (
          <li key={account.account_id}>
            <Link href={`/cuentas/${account.account_id}`} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-muted">{accountTypeLabels[account.type as AccountType]}</p>
              </div>
              <p className="font-medium tabular-nums">
                {formatMoney(account.balance, account.currency as Currency)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <AddButton href="/movimientos/nuevo" label="Registrar movimiento" />
    </>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted">{label}</dt>
      <dd className={`truncate font-medium tabular-nums ${className}`}>{value}</dd>
    </div>
  );
}

// Gastos del mes agrupados por categoría (por moneda), de mayor a menor.
function CategoryBreakdown({ expenses, monthKey }: { expenses: Expense[]; monthKey: string }) {
  if (expenses.length === 0) return null;

  const byCurrency = Map.groupBy(expenses, (e) => e.account.currency);

  return (
    <>
      <h2 className={sectionTitleClass}>Gastos por categoría</h2>
      {[...byCurrency].map(([currency, rows]) => {
        const totals = new Map<string, { name: string; icon: string; total: number }>();
        for (const e of rows) {
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
        const max = sorted[0].total;

        return (
          <ul key={currency} className={`${cardClass} mb-3 flex flex-col gap-3 p-4`}>
            {byCurrency.size > 1 && <li className="text-xs text-muted">{currency}</li>}
            {sorted.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>
                    {c.icon} {c.name}
                  </span>
                  <span className="font-medium tabular-nums">{formatMoney(c.total, currency)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-background">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${Math.max((c.total / max) * 100, 2)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        );
      })}
      <Link href={`/movimientos?mes=${monthKey}`} className="block px-1 text-sm text-accent">
        Ver movimientos del mes ›
      </Link>
    </>
  );
}
