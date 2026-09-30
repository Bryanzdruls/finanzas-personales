"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { dbErrorMessage, firstError, optionalText, optionalUuid } from "@/lib/validation";

const schema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre.").max(40, "Máximo 40 caracteres."),
  kind: z.enum(["expense", "income", "debt"], "Tipo inválido."),
  parent_id: optionalUuid,
  icon: optionalText.pipe(z.string().max(8, "Usa un solo emoji.").nullable()),
});

export async function saveCategory(id: string | null, _prev: FormState, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (id && parsed.data.parent_id === id) return { error: "Una categoría no puede ser su propio padre." };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(parsed.data).eq("id", id)
    : await supabase.from("categories").insert(parsed.data);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(`/mas/categorias?tipo=${parsed.data.kind}`);
}

// Los movimientos de una categoría eliminada quedan "sin categoría" (no se borran).
export async function deleteCategory(id: string, kind: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(`/mas/categorias?tipo=${kind}`);
}
