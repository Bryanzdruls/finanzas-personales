import { PageHeader } from "@/components/page-header";
import { today } from "@/lib/dates";
import { getAccounts, getCategories } from "@/lib/queries";
import { saveTransaction } from "../actions";
import { TransactionForm } from "../transaction-form";

export default async function NuevoMovimientoPage({ searchParams }: PageProps<"/movimientos/nuevo">) {
  const { tipo } = await searchParams;
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  const defaultType = tipo === "income" || tipo === "transfer" ? tipo : "expense";

  return (
    <>
      <PageHeader title="Nuevo movimiento" backHref="/movimientos" />
      <TransactionForm
        action={saveTransaction.bind(null, null)}
        accounts={accounts}
        categories={categories}
        defaultType={defaultType}
        today={today()}
      />
    </>
  );
}
