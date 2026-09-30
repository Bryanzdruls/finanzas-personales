import Link from "next/link";
import { AddButton } from "@/components/add-button";
import { cardDebt, CreditCardList } from "@/components/credit-card-list";
import { MonthPicker } from "@/components/month-picker";
import { ReviewBanner } from "@/components/review-banner";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { formatShortDate, parseMonth } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { accountTypeLabels, isCreditCard, isInvestment, type AccountType } from "@/lib/types";

type Summary = {
  currency: Currency;
  income: string;
  expenses: string;
  debt_payments: string;
  net: string;
};

type Balance = {
  account_id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: string;
  last_snapshot_on: string | null;
  credit_limit: string | null;
  due_day: number | null;
};

const sum = (accounts: Balance[]) => accounts.reduce((total, a) => total + Number(a.balance), 0);

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
      .select("account_id, name, type, currency, balance, last_snapshot_on, credit_limit, due_day")
      .eq("archived", false)
      .order("name")
      .returns<Balance[]>(),
  ]);

  if (summary.error) throw new Error(summary.error.message);
  if (expenses.error) throw new Error(expenses.error.message);
  if (netWorth.error) throw new Error(netWorth.error.message);
  if (balances.error) throw new Error(balances.error.message);

  const investments = balances.data.filter((a) => isInvestment(a.type));
  const cards = balances.data.filter((a) => isCreditCard(a.type));
  const liquid = balances.data.filter((a) => !isInvestment(a.type) && !isCreditCard(a.type));

  const summaries: Summary[] = summary.data.length
    ? summary.data
    : [{ currency: "COP", income: "0", expenses: "0", debt_payments: "0", net: "0" }];

  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Inicio</h1>
      <ReviewBanner />
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
      <Link href="/reportes" className="mt-3 block px-1 text-sm text-accent">
        Ver tendencias de los últimos meses ›
      </Link>

      <h2 className={sectionTitleClass}>Patrimonio neto</h2>
      <div className="grid gap-3">
        {netWorth.data.map((row) => {
          const currency = row.currency as Currency;
          const inCurrency = (list: Balance[]) => list.filter((a) => a.currency === currency);
          const invested = sum(inCurrency(investments));
          // Deudas = pendiente de las deudas + lo que se debe en tarjetas de crédito. Un saldo a
          // favor en la tarjeta cuenta como disponible, así el total cuadra con la vista net_worth.
          const cardsOwed = inCurrency(cards).reduce((total, c) => total + cardDebt(c), 0);
          const cardsCredit = inCurrency(cards).reduce((t, c) => t + Math.max(Number(c.balance), 0), 0);
          const available = sum(inCurrency(liquid)) + cardsCredit;
          const liabilities = Number(row.liabilities) + cardsOwed;
          return (
            <div key={currency} className={`${cardClass} p-4`}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">{currency}</span>
                <span className="text-xl font-semibold tabular-nums">
                  {formatMoney(row.net_worth, currency)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <Stat label="Disponible" value={formatMoney(available, currency)} />
                <Stat label="Invertido" value={formatMoney(invested, currency)} />
                <Stat
                  label="Deudas"
                  value={formatMoney(liabilities, currency)}
                  className={liabilities > 0 ? "text-negative" : ""}
                />
              </dl>
            </div>
          );
        })}
      </div>

      {cards.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>Tarjetas de crédito</h2>
          <CreditCardList cards={cards} />
        </>
      )}

      {investments.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>Inversiones</h2>
          <ul className={`${cardClass} divide-y divide-border`}>
            {investments.map((a) => (
              <li key={a.account_id} className="flex items-center gap-3 p-4">
                <Link href={`/cuentas/${a.account_id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="text-xs text-muted">
                    {a.last_snapshot_on ? `Actualizado ${formatShortDate(a.last_snapshot_on)}` : "Sin valor registrado"}
                  </p>
                </Link>
                <div className="text-right">
                  <p className="font-medium tabular-nums">{formatMoney(a.balance, a.currency)}</p>
                  <Link href={`/cuentas/${a.account_id}/actualizar`} className="text-xs text-accent">
                    Actualizar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={sectionTitleClass}>Cuentas</h2>
      <ul className={`${cardClass} divide-y divide-border`}>
        {liquid.map((account) => (
          <li key={account.account_id}>
            <Link href={`/cuentas/${account.account_id}`} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-muted">{accountTypeLabels[account.type]}</p>
              </div>
              <p className="font-medium tabular-nums">{formatMoney(account.balance, account.currency)}</p>
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
