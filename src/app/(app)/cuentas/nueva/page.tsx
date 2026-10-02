import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/profile";
import { saveAccount } from "../actions";
import { AccountForm } from "../account-form";

export default async function NuevaCuentaPage() {
  const profile = await getProfile();
  return (
    <>
      <PageHeader title="Nueva cuenta" backHref="/cuentas" />
      <AccountForm action={saveAccount.bind(null, null)} modules={profile?.modules ?? []} />
    </>
  );
}
