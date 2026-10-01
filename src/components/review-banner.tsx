import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Aviso de pagos de Apple Pay pendientes de revisar. No muestra nada si no hay.
export async function ReviewBanner() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("needs_review", true);
  if (!count) return null;

  return (
    <Link
      href="/movimientos/revisar"
      className="tap mb-4 flex items-center justify-between rounded-2xl bg-accent px-4 py-3 text-accent-foreground"
    >
      <span className="font-medium">
        {count} {count === 1 ? "pago por revisar" : "pagos por revisar"}
      </span>
      <span aria-hidden>›</span>
    </Link>
  );
}
