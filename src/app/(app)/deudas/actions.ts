"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { syncDebtStatus } from "@/lib/debts";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import {
  dbErrorMessage,
  firstError,
  isoDate,
  money,
  optionalText,
  optionalUuid,
  positiveMoney,
} from "@/lib/validation";

const optionalInt = (min: number, max: number, message: string) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z.number().int(message).min(min, message).max(max, message).nullable(),
  );

const schema = z
  .object({
    creditor: z.string().trim().min(1, "Escribe a quién le debes.").max(60, "Máximo 60 caracteres."),
    description: optionalText,
    category_id: optionalUuid,
    total_amount: positiveMoney,
    paid_before: money.pipe(z.number().min(0, "Lo ya abonado no puede ser negativo.")),
    currency: z.enum(["COP", "USD"], "Moneda inválida."),
    interest_rate: z.preprocess(
      (v) => (v === "" || v === undefined ? null : Number(String(v).replace(",", "."))),
      z.number("Tasa inválida.").min(0, "Tasa inválida.").max(1000, "Tasa inválida.").nullable(),
    ),
    start_date: isoDate,
    installments: optionalInt(1, 600, "Número de cuotas inválido."),
    due_day: optionalInt(1, 31, "El día de pago debe estar entre 1 y 31."),
    status: z.enum(["active", "paid", "cancelled"]).default("active"),
    notes: optionalText,
  })
  .refine((d) => d.paid_before <= d.total_amount, {
    message: "Lo ya abonado no puede superar el monto total.",
  });

export async function saveDebt(id: string | null, _prev: FormState, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();

  // Los abonos se hicieron en la moneda de la deuda; cambiarla los reinterpretaría.
  if (id) {
    const [{ data: current }, { count }] = await Promise.all([
      supabase.from("debts").select("currency").eq("id", id).single(),
      supabase.from("transactions").select("id", { count: "exact", head: true }).eq("debt_id", id),
    ]);
    if (current && current.currency !== parsed.data.currency && count) {
      return { error: "No se puede cambiar la moneda de una deuda que ya tiene abonos." };
    }
  }

  const result = id
    ? await supabase.from("debts").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("debts").insert(parsed.data).select("id").single();
  if (result.error) return { error: dbErrorMessage(result.error) };

  // Si el usuario eligió el estado a mano (pagada/cancelada) se respeta.
  if (parsed.data.status === "active") await syncDebtStatus(supabase, [result.data.id]);

  revalidatePath("/", "layout");
  redirect(`/deudas/${result.data.id}`);
}

export async function deleteDebt(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) {
    return error.code === "23503"
      ? { error: "Esta deuda tiene abonos registrados. Elimínalos primero o márcala como cancelada." }
      : { error: dbErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect("/deudas");
}
