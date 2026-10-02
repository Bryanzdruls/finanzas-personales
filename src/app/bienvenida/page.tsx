import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { Wizard } from "./wizard";

export const metadata = { title: "Bienvenida · Mis Finanzas" };

export default async function BienvenidaPage() {
  const profile = await getProfile();
  if (!profile || profile.onboarded_at) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const meta = data?.claims.user_metadata as { full_name?: string; name?: string } | undefined;
  const suggestedName = profile.display_name ?? (meta?.full_name ?? meta?.name ?? "").split(" ")[0];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <Wizard suggestedName={suggestedName} />
    </main>
  );
}
