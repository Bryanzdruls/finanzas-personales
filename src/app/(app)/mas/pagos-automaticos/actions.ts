"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { dbErrorMessage, firstError, uuid } from "@/lib/validation";

export type TokenState = { error?: string; token?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre (ej: iPhone).").max(40, "Máximo 40 caracteres."),
  default_account_id: uuid,
});

// El token se muestra una sola vez; en la base solo queda su hash.
export async function createToken(_prev: TokenState, formData: FormData): Promise<TokenState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const token = `fp_${randomBytes(32).toString("hex")}`;
  const supabase = await createClient();
  const { error } = await supabase.from("api_tokens").insert({
    ...parsed.data,
    token_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/mas/pagos-automaticos");
  return { token };
}

export async function revokeToken(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("api_tokens").delete().eq("id", id);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/mas/pagos-automaticos");
}

// Cambia la cuenta a la que van los pagos de un token (p. ej. Apple Pay -> tarjeta Nu) sin
// tener que generar otro token ni tocar el Atajo.
export async function updateTokenAccount(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = uuid.safeParse(formData.get("default_account_id"));
  if (!parsed.success) return { error: "Elige una cuenta." };

  const supabase = await createClient();
  const { error } = await supabase.from("api_tokens").update({ default_account_id: parsed.data }).eq("id", id);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/mas/pagos-automaticos");
  return {};
}
