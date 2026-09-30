import Link from "next/link";
import { AddButton } from "@/components/add-button";
import { cardDebt, CreditCardList, type CreditCardBalance } from "@/components/credit-card-list";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { formatShortDate, nextDueDate } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { debtStatusLabels, type DebtStatus } from "@/lib/types";

type Row = {
  id: string;
  creditor: string;
  currency: Currency;
  status: DebtStatus;
  due_day: number | null;
  category: { icon: string | null; name: string } | null;
};

type Balance = { debt_id: string; total_amount: string; paid: string; remaining: string; progress_pct: string };

export default async function DeudasPage() {
  const supabase = await createClient();
  const [debts, balances, cards] = await Promise.all([
    supabase
      .from("debts")
      .select("id, creditor, currency, status, due_day, category:categories(icon, name)")
      .order("creditor")
      .returns<Row[]>(),
    supabase
      .from("debt_balances")
      .select("debt_id, total_amount, paid, remaining, progress_pct")
      .returns<Balance[]>(),
    supabase
      .from("account_balances")
      .select("account_id, name, currency, balance, credit_limit, due_day")
      .eq("type", "credit_card")
      .eq("archived", false)
      .order("name")
      .returns<CreditCardBalance[]>(),
  ]);
  if (debts.error) throw new Error(debts.error.message);
  if (balances.error) throw new Error(balances.error.message);
  if (cards.error) throw new Error(cards.error.message);

  const balanceById = new Map(balances.data.map((b) => [b.debt_id, b]));
  const rows = debts.data.map((d) => ({ ...d, ...balanceById.get(d.id)! }));
  const active = rows.filter((d) => d.status === "active");
  const closed = rows.filter((d) => d.status !== "active");
  // Pendiente por moneda: deudas activas + lo que se debe en tarjetas.
  const pending = new Map<Currency, number>();
  for (const d of active) pending.set(d.currency, (pending.get(d.currency) ?? 0) + Number(d.remaining));
  for (const c of cards.data) pending.set(c.currency, (pending.get(c.currency) ?? 0) + cardDebt(c));

  return (
    <>
      <PageHeader title="Deudas" />

      {pending.size > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {[...pending].map(([currency, total]) => (
            <div key={currency} className={`${cardClass} p-4`}>
              <p className="text-sm text-muted">Pendiente {currency}</p>
              <p className="mt-1 text-xl font-semibold text-negative tabular-nums">
                {formatMoney(total, currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      {cards.data.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>Tarjetas de crédito</h2>
          <CreditCardList cards={cards.data} />
        </>
      )}

      {rows.length === 0 && cards.data.length === 0 && (
        <p className={`${cardClass} p-6 text-center text-muted`}>
          No tienes deudas registradas. Toca + para agregar una.
        </p>
      )}

      {active.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>Activas</h2>
          <ul className="flex flex-col gap-3">
            {active.map((d) => (
              <li key={d.id}>
                <Link href={`/deudas/${d.id}`} className={`${cardClass} block p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {d.category?.icon} {d.creditor}
                      </p>
                      <p className="text-xs text-muted">
                        {d.due_day
                          ? `Próximo pago: ${formatShortDate(nextDueDate(d.due_day))}`
                          : (d.category?.name ?? "Sin fecha de pago")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold whitespace-nowrap tabular-nums">
                        {formatMoney(d.remaining, d.currency)}
                      </p>
                      <p className="text-xs text-muted">pendiente</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar percent={Number(d.progress_pct)} />
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      {Number(d.progress_pct)}% pagado · {formatMoney(d.paid, d.currency)} de{" "}
                      {formatMoney(d.total_amount, d.currency)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {closed.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>Cerradas</h2>
          <ul className={`${cardClass} divide-y divide-border`}>
            {closed.map((d) => (
              <li key={d.id}>
                <Link href={`/deudas/${d.id}`} className="flex items-center justify-between gap-3 p-4">
                  <span className="truncate">
                    {d.category?.icon} {d.creditor}
                  </span>
                  <span className="text-sm text-muted">
                    {debtStatusLabels[d.status]} · {formatMoney(d.total_amount, d.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <AddButton href="/deudas/nueva" label="Nueva deuda" />
    </>
  );
}
