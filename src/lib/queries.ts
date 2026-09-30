import { createClient } from "./supabase/server";
import type { Account, Category, DebtOption } from "./types";

// Deudas a las que se puede abonar: las activas, más la del abono que se está editando.
export async function getDebtOptions(includeId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("debt_balances")
    .select("debt_id, creditor, currency, remaining")
    .order("creditor");
  query = includeId
    ? query.or(`status.eq.active,debt_id.eq.${includeId}`)
    : query.eq("status", "active");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as DebtOption[];
}

export async function getAccounts({ includeArchived = false } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("accounts")
    .select("id, name, type, currency, initial_balance, color, archived")
    .order("name");
  if (!includeArchived) query = query.eq("archived", false);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Account[];
}

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, kind, parent_id, icon, color")
    .order("name");
  if (error) throw new Error(error.message);
  return data as Category[];
}
