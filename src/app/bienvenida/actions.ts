"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MODULES, type Module } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { dbErrorMessage, firstError, money } from "@/lib/validation";

const name = z.string().trim().max(60, "Los nombres pueden tener máximo 60 caracteres.");
const currency = z.enum(["COP", "USD"]).catch("COP");
const optionalMoney = z.preprocess((v) => (v === "" || v === undefined ? 0 : v), money);
const optionalDay = z.preprocess(
  (v) => (v === "" || v === undefined ? null : Number(v)),
  z.number().int().min(1, "El día de pago va de 1 a 31.").max(31, "El día de pago va de 1 a 31.").nullable(),
);

// Las filas llegan como listas paralelas (bank_name, bank_balance…); se arman y se descartan las vacías.
function rows(formData: FormData, prefix: string, fields: string[]) {
  const columns = fields.map((f) => formData.getAll(`${prefix}_${f}`).map(String));
  return columns[0]
    .map((_, i) => Object.fromEntries(fields.map((f, j) => [f, columns[j][i] ?? ""])))
    .filter((r) => r.name.trim() !== "");
}

const bankRow = z.object({
  name,
  type: z.enum(["bank", "cash"]).catch("bank"),
  currency,
  balance: optionalMoney,
});
const cardRow = z.object({ name, owed: optionalMoney, limit: optionalMoney, due_day: optionalDay });
const investmentRow = z.object({
  name,
  type: z.enum(["broker", "pension", "crypto"]).catch("broker"),
  currency,
  value: optionalMoney,
});

export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const modules = formData
    .getAll("modules")
    .map(String)
    .filter((m): m is Module => (MODULES as readonly string[]).includes(m));
  const usd = modules.includes("usd");

  const banks = z.array(bankRow).safeParse(rows(formData, "bank", ["name", "type", "currency", "balance"]));
  const cards = z.array(cardRow).safeParse(rows(formData, "card", ["name", "owed", "limit", "due_day"]));
  const investments = z
    .array(investmentRow)
    .safeParse(rows(formData, "inv", ["name", "type", "currency", "value"]));
  if (!banks.success) return { error: firstError(banks.error) };
  if (!cards.success) return { error: firstError(cards.error) };
  if (!investments.success) return { error: firstError(investments.error) };
  if (banks.data.length === 0) return { error: "Agrega al menos una cuenta o el efectivo." };

  const accounts = [
    ...banks.data.map((b) => ({
      name: b.name,
      type: b.type,
      currency: usd ? b.currency : "COP",
      initial_balance: b.balance,
    })),
    ...(modules.includes("credit_cards") ? cards.data : []).map((c) => ({
      name: c.name,
      type: "credit_card",
      currency: "COP",
      // En la tarjeta el saldo es lo que se debe, guardado en negativo.
      initial_balance: -Math.abs(c.owed),
      credit_limit: c.limit > 0 ? c.limit : null,
      due_day: c.due_day,
    })),
    ...(modules.includes("investments") ? investments.data : []).map((i) => ({
      name: i.name,
      type: i.type,
      currency: usd ? i.currency : "COP",
      initial_balance: i.value,
    })),
  ];
  const names = accounts.map((a) => a.name.toLowerCase());
  const repeated = names.find((n, i) => names.indexOf(n) !== i);
  if (repeated) return { error: `Hay dos cuentas llamadas "${repeated}". Usa nombres distintos.` };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "Tu sesión expiró. Vuelve a entrar." };

  const { error } = await supabase.from("accounts").insert(accounts);
  if (error) return { error: dbErrorMessage(error) };

  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 60) || null;
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName, modules, onboarded_at: new Date().toISOString() })
    .eq("id", userId);
  if (profileError) return { error: dbErrorMessage(profileError) };

  revalidatePath("/", "layout");
  redirect("/");
}
