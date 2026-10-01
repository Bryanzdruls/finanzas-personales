"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AUTOMATIC_SOURCES, learnFromReview } from "@/lib/apple-pay";
import { syncDebtStatus } from "@/lib/debts";
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
    type: z.enum(["expense", "income", "transfer", "debt_payment"], "Tipo inválido."),
    amount: positiveMoney,
    occurred_on: isoDate,
    account_id: uuid,
    to_account_id: optionalUuid,
    // Lo que llega a la cuenta destino si tiene otra moneda (COP -> USD).
    to_amount: z.preprocess((v) => (v === "" || v === undefined ? null : v), positiveMoney.nullable()),
    category_id: optionalUuid,
    debt_id: optionalUuid,
    description: optionalText,
  })
  .refine((t) => t.type !== "transfer" || t.to_account_id, {
    message: "Elige la cuenta destino.",
  })
  .refine((t) => t.type !== "transfer" || t.to_account_id !== t.account_id, {
    message: "La cuenta destino debe ser distinta.",
  })
  .refine((t) => t.type !== "debt_payment" || t.debt_id, {
    message: "Elige la deuda a la que abonas.",
  });

export async function saveTransaction(id: string | null, _prev: FormState, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const t = parsed.data;
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", t.account_id)
    .single();

  let toAmount: number | null = null;
  if (t.type === "transfer") {
    const { data: target } = await supabase
      .from("accounts")
      .select("currency")
      .eq("id", t.to_account_id!)
      .single();
    if (account?.currency !== target?.currency) {
      if (!t.to_amount) return { error: `Escribe cuánto llegó a la cuenta destino (${target?.currency}).` };
      toAmount = t.to_amount;
    }
  }

  if (t.type === "debt_payment") {
    const { data: debt } = await supabase
      .from("debts")
      .select("currency")
      .eq("id", t.debt_id!)
      .single();
    if (account?.currency !== debt?.currency) {
      return { error: `Esta deuda es en ${debt?.currency}: paga desde una cuenta en esa moneda.` };
    }
  }

  // Si se edita un abono y se cambia de deuda, la deuda anterior también debe recalcularse.
  // Si es un pago de Apple Pay por revisar, al guardarlo se aprende de lo elegido.
  const previous = id
    ? (
        await supabase
          .from("transactions")
          .select("debt_id, source, merchant, card_name, needs_review")
          .eq("id", id)
          .single()
      ).data
    : null;

  const row = {
    type: t.type,
    amount: t.amount,
    occurred_on: t.occurred_on,
    account_id: t.account_id,
    to_account_id: t.type === "transfer" ? t.to_account_id : null,
    to_amount: toAmount,
    category_id: t.type === "expense" || t.type === "income" ? t.category_id : null,
    debt_id: t.type === "debt_payment" ? t.debt_id : null,
    description: t.description,
    // Al guardarlo a mano queda revisado (relevante para lo que llegue de Apple Pay).
    needs_review: false,
  };

  const { error } = id
    ? await supabase.from("transactions").update(row).eq("id", id)
    : await supabase.from("transactions").insert(row);
  if (error) return { error: dbErrorMessage(error) };

  await syncDebtStatus(supabase, [row.debt_id, previous?.debt_id]);

  if (previous && AUTOMATIC_SOURCES.includes(previous.source) && row.type !== "debt_payment") {
    await learnFromReview(supabase, {
      type: row.type,
      merchant: previous.merchant,
      card_name: previous.card_name,
      category_id: row.category_id,
      account_id: row.account_id,
      to_account_id: row.to_account_id,
    });
  }

  revalidatePath("/", "layout");
  if (previous?.needs_review) redirect("/movimientos/revisar");
  redirect(row.debt_id ? `/deudas/${row.debt_id}` : `/movimientos?mes=${t.occurred_on.slice(0, 7)}`);
}

// Confirma un pago de Apple Pay tal como llegó (desde la bandeja "Por revisar").
export async function approveTransaction(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: t, error } = await supabase
    .from("transactions")
    .update({ needs_review: false })
    .eq("id", id)
    .select("type, merchant, card_name, category_id, account_id, to_account_id")
    .single();
  if (error) return { error: dbErrorMessage(error) };

  if (t.type !== "debt_payment") await learnFromReview(supabase, t);
  revalidatePath("/", "layout");
}

export async function deleteTransaction(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .select("debt_id")
    .maybeSingle();
  if (error) return { error: dbErrorMessage(error) };

  await syncDebtStatus(supabase, [deleted?.debt_id]);

  revalidatePath("/", "layout");
  redirect(deleted?.debt_id ? `/deudas/${deleted.debt_id}` : "/movimientos");
}

// Borra un movimiento desde la bandeja "Por revisar" (p. ej. un duplicado) sin salir de ella.
export async function deleteFromReview(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .select("debt_id")
    .maybeSingle();
  if (error) return { error: dbErrorMessage(error) };

  await syncDebtStatus(supabase, [deleted?.debt_id]);
  revalidatePath("/", "layout");
}
