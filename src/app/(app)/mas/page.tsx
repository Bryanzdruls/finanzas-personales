import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

const menu: { href: string; icon: IconName; label: string }[] = [
  { href: "/reportes", icon: "chart", label: "Reportes y exportar" },
  { href: "/mas/categorias", icon: "tag", label: "Categorías" },
  { href: "/movimientos/revisar", icon: "inbox", label: "Pagos por revisar" },
  { href: "/movimientos/importar", icon: "clipboard", label: "Importar SMS de Bancolombia" },
  { href: "/mas/pagos-automaticos", icon: "card", label: "Pagos automáticos" },
  { href: "/mas/reglas", icon: "rules", label: "Reglas de clasificación" },
];

export default async function MasPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <>
      <PageHeader title="Más" />

      <ul className={`${cardClass} divide-y divide-border overflow-hidden`}>
        {menu.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="row-link flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/12 text-accent">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <span className="flex-1 font-medium">{item.label}</span>
              <Icon name="chevronRight" className="h-4 w-4 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <section className={`${cardClass} mt-6 divide-y divide-border`}>
        <div className="p-4">
          <p className="text-sm text-muted">Sesión iniciada como</p>
          <p className="font-medium">{data?.claims.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="row-link w-full p-4 text-left font-medium text-negative">
            Cerrar sesión
          </button>
        </form>
      </section>
    </>
  );
}
