import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { BottomNav } from "./bottom-nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Quien aún no termina la bienvenida la hace primero (el layout no se vuelve a pedir al navegar).
  const profile = await getProfile();
  if (profile && !profile.onboarded_at) redirect("/bienvenida");

  return (
    <>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-28">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
