import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { getCategories } from "@/lib/queries";
import { deleteCategory, saveCategory } from "../actions";
import { CategoryForm } from "../category-form";

export default async function EditarCategoriaPage({ params }: PageProps<"/mas/categorias/[id]">) {
  const { id } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  return (
    <>
      <PageHeader title="Editar categoría" backHref={`/mas/categorias?tipo=${category.kind}`} />
      <CategoryForm action={saveCategory.bind(null, id)} categories={categories} initial={category} />
      <DeleteButton
        action={deleteCategory.bind(null, id, category.kind)}
        confirmMessage={`¿Eliminar "${category.name}"? Sus movimientos quedarán sin categoría.`}
        label="Eliminar categoría"
      />
    </>
  );
}
