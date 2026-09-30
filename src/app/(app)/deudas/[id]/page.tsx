import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { cardClass, primaryButtonClass, sectionTitleClass } from "@/components/ui";
import { formatDay, formatShortDate, nextDueDate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { getCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { debtStatusLabels, type Debt } from "@/lib/types";
import { deleteDebt, saveDebt } from "../actions";
import { DebtForm } from "../debt-form";

type Payment = {
  id: string;
  occurred_on: string;
  amount: string;
  description: string | null;
  account: { name: string };
};

export default async function DeudaPage({ params }: PageProps<"/deudas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: debt }, { data: balance }, { data: payments }, categories] = await Promise.all([
    supabase
      .from("debts")
      .select(
        "id, creditor, description, category_id, total_amount, paid_before, currency, interest_rate, start_date, installments, due_day, status, notes",
      )
      .eq("id", id)
      .maybeSingle<Debt>(),
    supabase
      .from("debt_balances")
      .select("paid, remaining, progress_pct")
      .eq("debt_id", id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id, occurred_on, amount, description, account:accounts!transactions_account_id_user_id_fkey(name)")
      .eq("debt_id", id)
      .order("occurred_on", { ascending: false })
      .returns<Payment[]>(),
    getCategories(),
  ]);
  if (!debt || !balance) notFound();

  const installment = debt.installments ? Number(debt.total_amount) / debt.installments : null;

  return (
    <>
      <PageHeader title={debt.creditor} backHref="/deudas" />

      <div className={`${cardClass} p-5`}>
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted">Pendiente</p>
          {debt.status !== "active" && (
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
              {debtStatusLabels[debt.status]}
            </span>
          )}
        </div>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {formatMoney(balance.remaining, debt.currency)}
        </p>
        <div className="mt-4">
          <ProgressBar percent={Number(balance.progress_pct)} />
          <p className="mt-1 text-xs text-muted tabular-nums">
            {Number(balance.progress_pct)}% pagado · {formatMoney(balance.paid, debt.currency)} de{" "}
            {formatMoney(debt.total_amount, debt.currency)}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {installment && (
            <Detail label={`Cuota (${debt.installments} cuotas)`} value={`≈ ${formatMoney(installment, debt.currency)}`} />
          )}
          {debt.due_day && debt.status === "active" && (
            <Detail label="Próximo pago" value={formatShortDate(nextDueDate(debt.due_day))} />
          )}
          {debt.interest_rate && <Detail label="Tasa" value={`${Number(debt.interest_rate)}% E.A.`} />}
          <Detail label="Desde" value={formatShortDate(debt.start_date)} />
        </dl>
        {debt.notes && <p className="mt-3 text-sm text-muted">{debt.notes}</p>}
      </div>

      {debt.status === "active" && (
        <Link
          href={`/movimientos/nuevo?tipo=debt_payment&deuda=${id}`}
          className={`${primaryButtonClass} mt-4 block text-center`}
        >
          Registrar abono
        </Link>
      )}

      <h2 className={sectionTitleClass}>Abonos</h2>
      <ul className={`${cardClass} divide-y divide-border`}>
        {payments?.map((p) => (
          <li key={p.id}>
            <Link href={`/movimientos/${p.id}`} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="capitalize">{formatDay(p.occurred_on)}</p>
                <p className="truncate text-sm text-muted">
                  {[p.description, p.account.name].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="font-medium whitespace-nowrap tabular-nums">
                {formatMoney(p.amount, debt.currency)}
              </p>
            </Link>
          </li>
        ))}
        {Number(debt.paid_before) > 0 && (
          <li className="flex items-center justify-between gap-3 p-4 text-muted">
            <span>Abonado antes de la app</span>
            <span className="tabular-nums">{formatMoney(debt.paid_before, debt.currency)}</span>
          </li>
        )}
        {!payments?.length && Number(debt.paid_before) === 0 && (
          <li className="p-6 text-center text-muted">Aún no hay abonos.</li>
        )}
      </ul>

      <h2 className={sectionTitleClass}>Datos de la deuda</h2>
      <DebtForm action={saveDebt.bind(null, id)} categories={categories} initial={debt} today={today()} />
      <DeleteButton
        action={deleteDebt.bind(null, id)}
        confirmMessage={`¿Eliminar la deuda con ${debt.creditor}? No se puede deshacer.`}
        label="Eliminar deuda"
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
