import type { SupabaseClient } from "@supabase/supabase-js";

// Marca la deuda como pagada cuando lo pendiente llega a 0, y la reactiva si se borra un abono.
// Las deudas canceladas no se tocan.
export async function syncDebtStatus(supabase: SupabaseClient, debtIds: (string | null | undefined)[]) {
  const ids = [...new Set(debtIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return;

  const { data } = await supabase
    .from("debt_balances")
    .select("debt_id, status, remaining")
    .in("debt_id", ids);

  for (const debt of data ?? []) {
    const settled = Number(debt.remaining) <= 0;
    if (debt.status === "active" && settled) {
      await supabase.from("debts").update({ status: "paid" }).eq("id", debt.debt_id);
    } else if (debt.status === "paid" && !settled) {
      await supabase.from("debts").update({ status: "active" }).eq("id", debt.debt_id);
    }
  }
}
