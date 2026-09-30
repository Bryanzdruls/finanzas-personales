import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { today } from "@/lib/dates";
import { getAccounts, getCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";
import { deleteTransaction, saveTransaction } from "../actions";
import { TransactionForm } from "../transaction-form";

export default async function EditarMovimientoPage({ params }: PageProps<"/movimientos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: transaction }, accounts, categories] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, occurred_on, amount, type, account_id, to_account_id, category_id, debt_id, description, merchant, needs_review",
      )
      .eq("id", id)
      .maybeSingle<Transaction>(),
    getAccounts({ includeArchived: true }),
    getCategories(),
  ]);
  if (!transaction) notFound();

  return (
    <>
      <PageHeader
        title="Editar movimiento"
        backHref={`/movimientos?mes=${transaction.occurred_on.slice(0, 7)}`}
      />
      {transaction.type === "debt_payment" ? (
        <p className={`${cardClass} p-6 text-muted`}>
          Los abonos a deudas se editarán desde la sección Deudas (fase 3).
        </p>
      ) : (
        <TransactionForm
          action={saveTransaction.bind(null, id)}
          accounts={accounts}
          categories={categories}
          initial={transaction}
          today={today()}
        />
      )}
      <DeleteButton
        action={deleteTransaction.bind(null, id)}
        confirmMessage="¿Eliminar este movimiento? No se puede deshacer."
        label="Eliminar movimiento"
      />
    </>
  );
}
