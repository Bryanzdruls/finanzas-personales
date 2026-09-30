import { PageHeader } from "@/components/page-header";
import { saveAccount } from "../actions";
import { AccountForm } from "../account-form";

export default function NuevaCuentaPage() {
  return (
    <>
      <PageHeader title="Nueva cuenta" backHref="/cuentas" />
      <AccountForm action={saveAccount.bind(null, null)} />
    </>
  );
}
