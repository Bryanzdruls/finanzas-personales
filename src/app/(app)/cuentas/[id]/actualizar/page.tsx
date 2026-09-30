import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { formatDay, today } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { saveSnapshot } from "../../actions";
import { SnapshotForm } from "../../snapshot-form";

// Acceso rápido desde Inicio para escribir el valor actual de una inversión.
export default async function ActualizarValorPage({ params }: PageProps<"/cuentas/[id]/actualizar">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("account_balances")
    .select("name, currency, balance, last_snapshot_on")
    .eq("account_id", id)
    .maybeSingle<{ name: string; currency: Currency; balance: string; last_snapshot_on: string | null }>();
  if (!account) notFound();

  return (
    <>
      <PageHeader title={account.name} backHref="/" />
      <p className="mb-4 px-1 text-sm text-muted">
        Valor registrado: {formatMoney(account.balance, account.currency)}
        {account.last_snapshot_on && ` (${formatDay(account.last_snapshot_on)})`}
      </p>
      <div className={`${cardClass} p-4`}>
        <SnapshotForm
          action={saveSnapshot.bind(null, id, "/")}
          currency={account.currency}
          today={today()}
          label="Valor actual"
          autoFocus
        />
      </div>
    </>
  );
}
