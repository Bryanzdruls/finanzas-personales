import { createClient } from "./supabase/server";
import type { Account, Category } from "./types";

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
