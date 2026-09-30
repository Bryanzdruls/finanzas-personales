import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

// Al confirmar un pago de Apple Pay se aprende: comercio -> categoría y tarjeta -> cuenta,
// para que el próximo pago igual llegue ya clasificado.
export async function learnFromReview(
  supabase: SupabaseClient,
  t: { merchant: string | null; card_name: string | null; category_id: string | null; account_id: string },
) {
  if (t.merchant && t.category_id) {
    const merchant = normalizeKey(t.merchant);
    const { data: rules } = await supabase.from("merchant_rules").select("pattern, category_id");
    // Misma lógica que ingest_apple_pay: gana el patrón más largo contenido en el comercio.
    const best = (rules ?? [])
      .filter((r) => merchant.includes(r.pattern))
      .sort((a, b) => b.pattern.length - a.pattern.length)[0];
    if (best?.category_id !== t.category_id) {
      await supabase
        .from("merchant_rules")
        .upsert({ pattern: merchant, category_id: t.category_id }, { onConflict: "user_id,pattern" });
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
