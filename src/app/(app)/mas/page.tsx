import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export default async function MasPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <>
      <PageHeader title="Más" />

      <ul className={`${cardClass} divide-y divide-border`}>
        <li>
          <Link href="/mas/categorias" className="flex items-center gap-3 p-4">
            <span aria-hidden className="text-xl">
              🏷️
            </span>
            <span className="flex-1 font-medium">Categorías</span>
            <span className="text-muted">›</span>
          </Link>
        </li>
      </ul>

      <section className={`${cardClass} mt-6 divide-y divide-border`}>
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
