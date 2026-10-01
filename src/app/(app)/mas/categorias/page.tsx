import Link from "next/link";
import { AddButton } from "@/components/add-button";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { withFullNames } from "@/lib/categories";
import { getCategories } from "@/lib/queries";
import { categoryKindLabels, type CategoryKind } from "@/lib/types";

const kinds = Object.keys(categoryKindLabels) as CategoryKind[];

export default async function CategoriasPage({ searchParams }: PageProps<"/mas/categorias">) {
  const { tipo } = await searchParams;
  const kind = kinds.includes(tipo as CategoryKind) ? (tipo as CategoryKind) : "expense";
  const categories = withFullNames((await getCategories()).filter((c) => c.kind === kind));

  return (
    <>
      <PageHeader title="Categorías" backHref="/mas" />

      <nav className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
        {kinds.map((k) => (
          <Link
            key={k}
            href={`/mas/categorias?tipo=${k}`}
            className={`rounded-lg py-2 text-center text-sm font-medium ${
              k === kind ? "bg-accent text-accent-foreground" : "text-muted"
            }`}
          >
            {categoryKindLabels[k]}
          </Link>
        ))}
      </nav>

      <ul className={`${cardClass} mt-6 divide-y divide-border`}>
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/mas/categorias/${c.id}`}
              className={`row-link flex items-center gap-3 p-4 ${c.parent_id ? "pl-10" : ""}`}
            >
              <span aria-hidden className="w-7 text-center text-xl">
                {c.icon ?? "•"}
              </span>
              <span className={c.parent_id ? "text-muted" : "font-medium"}>{c.name}</span>
            </Link>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="p-6 text-center text-muted">No hay categorías de este tipo.</li>
        )}
      </ul>

      <AddButton href={`/mas/categorias/nueva?tipo=${kind}`} label="Nueva categoría" />
    </>
  );
}
