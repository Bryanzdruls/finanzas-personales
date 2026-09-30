import { PageHeader } from "@/components/page-header";
import { getCategories } from "@/lib/queries";
import type { CategoryKind } from "@/lib/types";
import { saveCategory } from "../actions";
import { CategoryForm } from "../category-form";

export default async function NuevaCategoriaPage({ searchParams }: PageProps<"/mas/categorias/nueva">) {
  const { tipo } = await searchParams;
  const defaultKind: CategoryKind = tipo === "income" || tipo === "debt" ? tipo : "expense";

  return (
    <>
      <PageHeader title="Nueva categoría" backHref={`/mas/categorias?tipo=${defaultKind}`} />
      <CategoryForm
        action={saveCategory.bind(null, null)}
        categories={await getCategories()}
        defaultKind={defaultKind}
      />
    </>
  );
}
