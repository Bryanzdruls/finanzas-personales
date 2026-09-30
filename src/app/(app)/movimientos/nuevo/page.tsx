import { PageHeader } from "@/components/page-header";
import { today } from "@/lib/dates";
import { getAccounts, getCategories, getDebtOptions } from "@/lib/queries";
import type { TransactionType } from "@/lib/types";
import { saveTransaction } from "../actions";
import { TransactionForm } from "../transaction-form";

const types: TransactionType[] = ["expense", "income", "transfer", "debt_payment"];

export default async function NuevoMovimientoPage({ searchParams }: PageProps<"/movimientos/nuevo">) {
  const { tipo, deuda } = await searchParams;
  const [accounts, categories, debts] = await Promise.all([
    getAccounts(),
    getCategories(),
    getDebtOptions(),
  ]);
  const defaultType = types.includes(tipo as TransactionType) ? (tipo as TransactionType) : "expense";
  const defaultDebtId = debts.find((d) => d.debt_id === deuda)?.debt_id;

  return (
    <>
      <PageHeader
        title={defaultType === "debt_payment" ? "Registrar abono" : "Nuevo movimiento"}
        backHref={defaultDebtId ? `/deudas/${defaultDebtId}` : "/movimientos"}
      />
      <TransactionForm
        action={saveTransaction.bind(null, null)}
        accounts={accounts}
        categories={categories}
        debts={debts}
        defaultType={defaultType}
        defaultDebtId={defaultDebtId}
        today={today()}
      />
    </>
  );
}
