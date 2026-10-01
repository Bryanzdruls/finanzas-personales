import { PageHeader } from "@/components/page-header";
import { today } from "@/lib/dates";
import { getAccounts, getCategories, getDebtOptions } from "@/lib/queries";
import { getTrm } from "@/lib/trm";
import type { TransactionType } from "@/lib/types";
import { saveTransaction } from "../actions";
import { TransactionForm } from "../transaction-form";

const types: TransactionType[] = ["expense", "income", "transfer", "debt_payment"];

export default async function NuevoMovimientoPage({ searchParams }: PageProps<"/movimientos/nuevo">) {
  const { tipo, deuda, hacia } = await searchParams;
  const [accounts, categories, debts, trm] = await Promise.all([
    getAccounts(),
    getCategories(),
    getDebtOptions(),
    getTrm(),
  ]);
  const defaultType = types.includes(tipo as TransactionType) ? (tipo as TransactionType) : "expense";
  const defaultDebtId = debts.find((d) => d.debt_id === deuda)?.debt_id;
  // "Pagar tarjeta": destino = la tarjeta; origen = una cuenta (no tarjeta) de la misma moneda.
  const target = accounts.find((a) => a.id === hacia);
  const source = target
    ? accounts.find((a) => a.id !== target.id && a.type !== "credit_card" && a.currency === target.currency)
    : undefined;

  return (
    <>
      <PageHeader
        title={
          target?.type === "credit_card"
            ? `Pagar ${target.name}`
            : defaultType === "debt_payment"
              ? "Registrar abono"
              : "Nuevo movimiento"
        }
        backHref={defaultDebtId ? `/deudas/${defaultDebtId}` : "/movimientos"}
      />
      <TransactionForm
        action={saveTransaction.bind(null, null)}
        accounts={accounts}
        categories={categories}
        debts={debts}
        defaultType={defaultType}
        defaultDebtId={defaultDebtId}
        defaultAccountId={source?.id}
        defaultToAccountId={target?.id}
        trm={trm}
        today={today()}
      />
    </>
  );
}
