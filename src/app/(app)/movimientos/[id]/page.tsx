import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { today } from "@/lib/dates";
import { getAccounts, getCategories, getDebtOptions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";
import { deleteTransaction, saveTransaction } from "../actions";
import { TransactionForm } from "../transaction-form";

export default async function EditarMovimientoPage({ params }: PageProps<"/movimientos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: transaction } = await supabase
    .from("transactions")
    .select(
      "id, occurred_on, amount, type, account_id, to_account_id, category_id, debt_id, description, merchant, needs_review",
    )
    .eq("id", id)
    .maybeSingle<Transaction>();
  if (!transaction) notFound();

  const [accounts, categories, debts] = await Promise.all([
    getAccounts({ includeArchived: true }),
    getCategories(),
    getDebtOptions(transaction.debt_id),
  ]);

  return (
    <>
      <PageHeader
        title={transaction.type === "debt_payment" ? "Editar abono" : "Editar movimiento"}
        backHref={
          transaction.debt_id
            ? `/deudas/${transaction.debt_id}`
            : `/movimientos?mes=${transaction.occurred_on.slice(0, 7)}`
        }
      />
      <TransactionForm
        action={saveTransaction.bind(null, id)}
        accounts={accounts}
        categories={categories}
        debts={debts}
        initial={transaction}
        today={today()}
      />
      <DeleteButton
        action={deleteTransaction.bind(null, id)}
        confirmMessage="¿Eliminar este movimiento? No se puede deshacer."
        label="Eliminar movimiento"
      />
    </>
  );
}
