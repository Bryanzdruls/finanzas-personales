"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { dbErrorMessage, firstError, isoDate, money, positiveMoney } from "@/lib/validation";

const accountSchema = z
  .object({
    name: z.string().trim().min(1, "Escribe un nombre.").max(60, "Máximo 60 caracteres."),
    type: z.enum(
      ["bank", "credit_card", "pension", "broker", "crypto", "cash", "other"],
      "Tipo inválido.",
    ),
    currency: z.enum(["COP", "USD"], "Moneda inválida."),
    initial_balance: money,
    credit_limit: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      positiveMoney.nullable(),
    ),
    due_day: z.preprocess(
      (v) => (v === "" || v === undefined ? null : Number(v)),
      z
        .number()
        .int("El día de pago debe estar entre 1 y 31.")
        .min(1, "El día de pago debe estar entre 1 y 31.")
        .max(31, "El día de pago debe estar entre 1 y 31.")
        .nullable(),
    ),
    archived: z.preprocess((v) => v === "on", z.boolean()),
  })
  // En la tarjeta se escribe lo que se debe (positivo) y se guarda negativo; el cupo y el día de
  // pago solo aplican a tarjetas.
  .transform((a) =>
    a.type === "credit_card"
      ? { ...a, initial_balance: -Math.abs(a.initial_balance) }
      : { ...a, credit_limit: null, due_day: null },
  );

export async function saveAccount(id: string | null, _prev: FormState, formData: FormData) {
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();

  // Cambiar la moneda reinterpretaría los montos ya guardados (2.000.000 COP -> US$2.000.000).
  if (id) {
    const [{ data: current }, movements, snapshots] = await Promise.all([
      supabase.from("accounts").select("currency").eq("id", id).single(),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .or(`account_id.eq.${id},to_account_id.eq.${id}`),
      supabase.from("account_snapshots").select("id", { count: "exact", head: true }).eq("account_id", id),
    ]);
    if (current && current.currency !== parsed.data.currency && (movements.count || snapshots.count)) {
      return {
        error: `No se puede cambiar la moneda: la cuenta tiene ${movements.count ?? 0} movimiento(s) y ${snapshots.count ?? 0} valor(es) registrados en ${current.currency}. Elimínalos primero o crea una cuenta nueva.`,
      };
    }
  }

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
export async function saveSnapshot(
  accountId: string,
  returnTo: string,
  _prev: FormState,
  formData: FormData,
) {
  const parsed = snapshotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data: account } = await supabase.from("accounts").select("type").eq("id", accountId).single();
  // En tarjetas se escribe la deuda del extracto (positiva) y se guarda como saldo negativo.
  const balance =
    account?.type === "credit_card" ? -Math.abs(parsed.data.balance) : parsed.data.balance;

  const { error } = await supabase
    .from("account_snapshots")
    .upsert({ account_id: accountId, as_of: parsed.data.as_of, balance }, { onConflict: "account_id,as_of" });
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(/^\/(?!\/)/.test(returnTo) ? returnTo : `/cuentas/${accountId}`);
}

export async function deleteSnapshot(accountId: string, snapshotId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("account_snapshots").delete().eq("id", snapshotId);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(`/cuentas/${accountId}`);
}
