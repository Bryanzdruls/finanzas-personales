"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import {
  dbErrorMessage,
  firstError,
  isoDate,
  optionalText,
  optionalUuid,
  positiveMoney,
  uuid,
} from "@/lib/validation";

const schema = z
  .object({
    type: z.enum(["expense", "income", "transfer"], "Tipo inválido."),
    amount: positiveMoney,
    occurred_on: isoDate,
    account_id: uuid,
    to_account_id: optionalUuid,
    category_id: optionalUuid,
    description: optionalText,
  })
  .refine((t) => t.type !== "transfer" || t.to_account_id, {
    message: "Elige la cuenta destino.",
  })
  .refine((t) => t.to_account_id !== t.account_id, {
    message: "La cuenta destino debe ser distinta.",
  });

export async function saveTransaction(id: string | null, _prev: FormState, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const t = parsed.data;
  const supabase = await createClient();

  if (t.type === "transfer") {
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, currency")
      .in("id", [t.account_id, t.to_account_id!]);
    if (new Set(accounts?.map((a) => a.currency)).size > 1) {
      return { error: "Por ahora las transferencias deben ser entre cuentas de la misma moneda." };
    }
  }

  const row = {
    type: t.type,
    amount: t.amount,
    occurred_on: t.occurred_on,
    account_id: t.account_id,
    to_account_id: t.type === "transfer" ? t.to_account_id : null,
    category_id: t.type === "transfer" ? null : t.category_id,
    description: t.description,
    // Al guardarlo a mano queda revisado (relevante para lo que llegue de Apple Pay).
    needs_review: false,
  };

  const { error } = id
    ? await supabase.from("transactions").update(row).eq("id", id)
    : await supabase.from("transactions").insert(row);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(`/movimientos?mes=${t.occurred_on.slice(0, 7)}`);
}

export async function deleteTransaction(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect("/movimientos");
}
