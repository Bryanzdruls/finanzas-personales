"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeKey } from "@/lib/apple-pay";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { dbErrorMessage, firstError, uuid } from "@/lib/validation";

const ruleSchema = z.object({
  pattern: z
    .string()
    .transform(normalizeKey)
    .pipe(z.string().min(2, "Escribe al menos 2 letras del comercio.").max(80, "Máximo 80 caracteres.")),
  category_id: uuid,
});

export async function saveRule(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ruleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("merchant_rules")
    .upsert(parsed.data, { onConflict: "user_id,pattern" });
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/mas/reglas");
  return {};
}

export async function deleteRule(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("merchant_rules").delete().eq("id", id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/mas/reglas");
}

export async function deleteCard(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("payment_cards").delete().eq("id", id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/mas/reglas");
}

const cardSchema = z.object({
  card_key: z
    .string()
    .transform(normalizeKey)
    .pipe(z.string().min(1, "Escribe el nombre de la tarjeta.").max(100, "Máximo 100 caracteres.")),
  account_id: uuid,
});

// Asigna a mano una tarjeta (tal como la nombra Apple Pay, Google Wallet o el banco) a una cuenta.
export async function saveCard(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = cardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("payment_cards").upsert(parsed.data, { onConflict: "user_id,card_key" });
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/mas/reglas");
  return {};
}
