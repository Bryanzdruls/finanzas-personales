import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { formatDay, formatShortDate, nextDueDate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isCreditCard, isInvestment, type Account } from "@/lib/types";
import { deleteAccount, deleteSnapshot, saveAccount, saveSnapshot } from "../actions";
import { AccountForm } from "../account-form";
import { SnapshotForm } from "../snapshot-form";

export default async function CuentaPage({ params }: PageProps<"/cuentas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: account }, { data: balance }, { data: snapshots }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, currency, initial_balance, color, archived, credit_limit, due_day")
      .eq("id", id)
      .maybeSingle<Account>(),
    supabase
      .from("account_balances")
      .select("balance, last_snapshot_on")
      .eq("account_id", id)
      .maybeSingle(),
    supabase
      .from("account_snapshots")
      .select("id, as_of, balance")
      .eq("account_id", id)
      .order("as_of", { ascending: false })
      .limit(12),
  ]);
  if (!account) notFound();

  const investment = isInvestment(account.type);
  const card = isCreditCard(account.type);
  // En tarjetas el saldo es negativo; se muestra lo que se debe en positivo.
  const shown = (value: string | number) => (card ? Math.max(-Number(value), 0) : Number(value));
  const owed = shown(balance?.balance ?? 0);
  const limit = account.credit_limit ? Number(account.credit_limit) : null;

  return (
    <>
      <PageHeader title={account.name} backHref="/cuentas" />

      <div className={`${cardClass} p-5`}>
        <p className="text-sm text-muted">
          {card ? "Deuda actual" : investment ? "Valor actual" : "Saldo actual"}
        </p>
        <p className={`mt-1 text-3xl font-semibold tabular-nums ${card && owed > 0 ? "text-negative" : ""}`}>
          {formatMoney(card ? owed : (balance?.balance ?? 0), account.currency)}
        </p>
        {card && limit && (
          <p className="mt-1 text-sm text-muted tabular-nums">
            Cupo disponible {formatMoney(Math.max(limit - owed, 0), account.currency)} de{" "}
            {formatMoney(limit, account.currency)}
          </p>
        )}
        {card && account.due_day && (
          <p className="mt-1 text-sm text-muted">
            Próximo pago: {formatShortDate(nextDueDate(account.due_day))}
          </p>
        )}
        {balance?.last_snapshot_on && (
          <p className="mt-1 text-xs text-muted">
            Actualizado el {formatDay(balance.last_snapshot_on)}
          </p>
        )}
        {!investment && (
          <div className="mt-3 flex items-center gap-4">
            {card && owed > 0 && (
              <Link
                href={`/movimientos/nuevo?tipo=transfer&hacia=${id}`}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
              >
                Pagar tarjeta
              </Link>
            )}
            <Link href={`/movimientos?cuenta=${id}`} className="text-sm text-accent">
              Ver movimientos ›
            </Link>
          </div>
        )}
      </div>

      <h2 className={sectionTitleClass}>
        {investment ? "Actualizar valor" : card ? "Ajustar con el extracto" : "Ajustar saldo real"}
      </h2>
      <div className={`${cardClass} p-4`}>
        <p className="mb-4 text-sm text-muted">
          {investment
            ? "Escribe el valor que muestra la plataforma hoy. Así tu patrimonio refleja lo que realmente tienes."
            : card
              ? "Si la deuda de la app no cuadra con la app de Nu (intereses, cuotas de manejo), escribe lo que debes hoy."
              : "Úsalo si el saldo de la app no cuadra con el del banco."}
        </p>
        <SnapshotForm
          action={saveSnapshot.bind(null, id, `/cuentas/${id}`)}
          currency={account.currency}
          today={today()}
          label={investment ? "Valor actual" : card ? "Deuda real hoy" : "Saldo real"}
        />
      </div>

      {snapshots && snapshots.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>Historial</h2>
          <ul className={`${cardClass} divide-y divide-border`}>
            {snapshots.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                <span className="capitalize text-muted">{formatDay(s.as_of)}</span>
                <span className="ml-auto font-medium tabular-nums">
                  {formatMoney(shown(s.balance), account.currency)}
                </span>
                <DeleteButton
                  compact
                  action={deleteSnapshot.bind(null, id, s.id)}
                  confirmMessage="¿Eliminar este valor del historial?"
                  label="Eliminar valor"
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={sectionTitleClass}>Datos de la cuenta</h2>
      <AccountForm action={saveAccount.bind(null, id)} initial={account} />
      <DeleteButton
        action={deleteAccount.bind(null, id)}
        confirmMessage={`¿Eliminar la cuenta ${account.name}? No se puede deshacer.`}
        label="Eliminar cuenta"
      />
    </>
  );
}
