import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransactionType } from "./types";

// Orígenes automáticos de los que se aprende al revisar.
export const AUTOMATIC_SOURCES = ["apple_pay", "google_pay", "bancolombia"];

export function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

// Al confirmar un movimiento automático se aprende, para que el próximo igual llegue clasificado:
// - comercio/contraparte -> categoría (gastos e ingresos)
// - contraparte -> transferencia a una cuenta propia (p. ej. "cuenta *123" -> Nu)
// - tarjeta o cuenta del banco -> cuenta de la app
export async function learnFromReview(
  supabase: SupabaseClient,
  t: {
    type: TransactionType;
    merchant: string | null;
    card_name: string | null;
    category_id: string | null;
    account_id: string;
    to_account_id: string | null;
  },
) {
  if (t.merchant && (t.category_id || (t.type === "transfer" && t.to_account_id))) {
    const merchant = normalizeKey(t.merchant);
    const { data: rules } = await supabase
      .from("merchant_rules")
      .select("pattern, category_id, to_account_id");
    // Misma lógica que la base: gana el patrón más largo contenido en el comercio.
    const best = (rules ?? [])
      .filter((r) => merchant.includes(r.pattern))
      .sort((a, b) => b.pattern.length - a.pattern.length)[0];

    const rule =
      t.type === "transfer"
        ? { category_id: null, to_account_id: t.to_account_id }
        : { category_id: t.category_id, to_account_id: null };
    if (best?.category_id !== rule.category_id || best?.to_account_id !== rule.to_account_id) {
      await supabase
        .from("merchant_rules")
        .upsert({ pattern: merchant, ...rule }, { onConflict: "user_id,pattern" });
    }
  }

  if (t.card_name) {
    await supabase
      .from("payment_cards")
      .upsert(
        { card_key: normalizeKey(t.card_name), account_id: t.account_id },
        { onConflict: "user_id,card_key" },
      );
  }
}
