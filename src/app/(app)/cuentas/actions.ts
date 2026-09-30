"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { dbErrorMessage, firstError, isoDate, money } from "@/lib/validation";

const accountSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre.").max(60, "Máximo 60 caracteres."),
  type: z.enum(["bank", "pension", "broker", "crypto", "cash", "other"], "Tipo inválido."),
  currency: z.enum(["COP", "USD"], "Moneda inválida."),
  initial_balance: money,
  archived: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveAccount(id: string | null, _prev: FormState, formData: FormData) {
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("accounts").update(parsed.data).eq("id", id)
    : await supabase.from("accounts").insert(parsed.data);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect("/cuentas");
}

export async function deleteAccount(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) {
    return error.code === "23503"
      ? { error: "Esta cuenta tiene movimientos. Archívala en vez de eliminarla." }
      : { error: dbErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect("/cuentas");
}

const snapshotSchema = z.object({
  as_of: isoDate,
  balance: money,
});

// Guarda el saldo real reportado (p. ej. el que muestra IBKR hoy). Desde esa fecha el saldo
// de la cuenta parte de este valor en vez del saldo inicial.
export async function saveSnapshot(accountId: string, _prev: FormState, formData: FormData) {
  const parsed = snapshotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("account_snapshots")
    .upsert({ account_id: accountId, ...parsed.data }, { onConflict: "account_id,as_of" });
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(`/cuentas/${accountId}`);
}

export async function deleteSnapshot(accountId: string, snapshotId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("account_snapshots").delete().eq("id", snapshotId);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(`/cuentas/${accountId}`);
}
