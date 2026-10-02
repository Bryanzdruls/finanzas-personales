import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/profile";
import { SettingsForm } from "./settings-form";

export default async function ConfiguracionPage() {
  const profile = await getProfile();
  return (
    <>
      <PageHeader title="Configuración" backHref="/mas" />
      {profile ? <SettingsForm profile={profile} /> : <p className="text-muted">No se encontró tu perfil.</p>}
    </>
  );
}
