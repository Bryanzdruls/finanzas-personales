import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { formatDay, today } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";
import { deleteAccount, deleteSnapshot, saveAccount, saveSnapshot } from "../actions";
import { AccountForm } from "../account-form";
import { SnapshotForm } from "../snapshot-form";

export default async function CuentaPage({ params }: PageProps<"/cuentas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: account }, { data: balance }, { data: snapshots }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, currency, initial_balance, color, archived")
      .eq("id", id)
      .maybeSingle<Account>(),
    supabase.from("account_balances").select("balance").eq("account_id", id).maybeSingle(),
    supabase
      .from("account_snapshots")
      .select("id, as_of, balance")
      .eq("account_id", id)
      .order("as_of", { ascending: false })
      .limit(12),
  ]);
  if (!account) notFound();

  const isInvestment = ["pension", "broker", "crypto"].includes(account.type);

  return (
    <>
      <PageHeader title={account.name} backHref="/cuentas" />

      <div className={`${cardClass} p-5`}>
        <p className="text-sm text-muted">Saldo actual</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {formatMoney(balance?.balance ?? 0, account.currency)}
        </p>
      </div>

      <h2 className={sectionTitleClass}>Actualizar saldo real</h2>
      <div className={`${cardClass} p-4`}>
        <p className="mb-4 text-sm text-muted">
          {isInvestment
            ? "Escribe el saldo que muestra la plataforma hoy. Así se reflejan rendimientos y valorizaciones."
            : "Úsalo si el saldo de la app no cuadra con el del banco."}
        </p>
        <SnapshotForm
          action={saveSnapshot.bind(null, id)}
          currency={account.currency}
          today={today()}
        />
      </div>

      {snapshots && snapshots.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>Historial de saldos</h2>
          <ul className={`${cardClass} divide-y divide-border`}>
            {snapshots.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                <span className="capitalize text-muted">{formatDay(s.as_of)}</span>
                <span className="ml-auto font-medium tabular-nums">
                  {formatMoney(s.balance, account.currency)}
                </span>
                <DeleteButton
                  compact
                  action={deleteSnapshot.bind(null, id, s.id)}
                  confirmMessage="¿Eliminar este saldo del historial?"
                  label="Eliminar saldo"
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
