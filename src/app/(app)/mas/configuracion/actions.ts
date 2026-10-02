"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MODULES, type Module } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { dbErrorMessage } from "@/lib/validation";

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const modules = formData
    .getAll("modules")
    .map(String)
    .filter((m): m is Module => (MODULES as readonly string[]).includes(m));
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 60) || null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { error: "Tu sesión expiró. Vuelve a entrar." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, modules })
    .eq("id", userId);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect("/mas");
}
