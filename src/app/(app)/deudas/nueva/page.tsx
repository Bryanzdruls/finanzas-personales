import { PageHeader } from "@/components/page-header";
import { today } from "@/lib/dates";
import { getCategories } from "@/lib/queries";
import { saveDebt } from "../actions";
import { DebtForm } from "../debt-form";

export default async function NuevaDeudaPage() {
  return (
    <>
      <PageHeader title="Nueva deuda" backHref="/deudas" />
      <DebtForm action={saveDebt.bind(null, null)} categories={await getCategories()} today={today()} />
    </>
  );
}
