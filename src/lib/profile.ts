import { cache } from "react";
import type { Module } from "./modules";
import { createClient } from "./supabase/server";

export type Profile = {
  display_name: string | null;
  onboarded_at: string | null;
  modules: Module[];
};

// Una sola consulta por request aunque la pidan el layout y la página.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, onboarded_at, modules")
    .maybeSingle<Profile>();
  return data;
});

export function hasModule(profile: Profile | null, module: Module) {
  return Boolean(profile?.modules.includes(module));
}
