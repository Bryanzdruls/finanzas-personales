import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export default async function MasPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <>
      <h1 className="text-3xl font-bold">Más</h1>
      <section className="mt-6 divide-y divide-border rounded-2xl bg-surface">
        <div className="p-4">
          <p className="text-sm text-muted">Sesión iniciada como</p>
          <p className="font-medium">{data?.claims.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="w-full p-4 text-left font-medium text-negative">
            Cerrar sesión
          </button>
        </form>
      </section>
    </>
  );
}
