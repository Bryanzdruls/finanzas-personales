"use server";

import { revalidatePath } from "next/cache";
import { movementParams, parseBancolombiaMessage } from "@/lib/bancolombia";
import { createClient } from "@/lib/supabase/server";
import { getTrm } from "@/lib/trm";
import { uuid } from "@/lib/validation";

export type ImportResult = { error?: string; created?: number; duplicates?: number; failed?: number } | undefined;

// Registra los SMS pegados que el usuario dejó marcados. Se vuelven a interpretar en el servidor
// (no se confía en lo que calculó el navegador) y la base descarta los que ya existen.
export async function importMessages(_prev: ImportResult, formData: FormData): Promise<ImportResult> {
  const account = uuid.safeParse(formData.get("default_account_id"));
  if (!account.success) return { error: "Elige la cuenta por defecto." };

  const messages = formData.getAll("message").map(String).slice(0, 100);
  const movements = messages.map((m) => parseBancolombiaMessage(m)).filter((m) => m !== null);
  if (movements.length === 0) return { error: "No hay movimientos marcados para importar." };

  const supabase = await createClient();
  const fxRate = movements.some((m) => m.direction === "out") ? await getTrm() : null;
  let created = 0;
  let duplicates = 0;
  let failed = 0;

  for (const movement of movements) {
    const { data, error } = await supabase.rpc("import_bank_movement", {
      p_default_account: account.data,
      ...movementParams(movement, fxRate),
    });
    if (error) failed++;
    else if ((data as { duplicate?: boolean })?.duplicate) duplicates++;
    else created++;
  }

  revalidatePath("/", "layout");
  return { created, duplicates, failed };
}
