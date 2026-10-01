import Link from "next/link";
import { ApproveButton } from "@/components/approve-button";
import { MergeButton } from "@/components/merge-button";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { type DuplicateCandidate, loadDuplicateMatches } from "@/lib/duplicates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { approveTransaction, mergeAllDuplicates, mergeDuplicate } from "../actions";

type Row = {
  id: string;
  occurred_on: string;
  created_at: string;
  account_id: string;
  amount: string;
  type: string;
  merchant: string | null;
  description: string | null;
  card_name: string | null;
  account: { name: string; currency: Currency };
  category: { name: string; icon: string | null } | null;
};

export default async function RevisarPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, occurred_on, created_at, account_id, amount, type, merchant, description, card_name,
       account:accounts!transactions_account_id_user_id_fkey(name, currency),
       category:categories(name, icon)`,
    )
    .eq("needs_review", true)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error) throw new Error(error.message);

  // Posible duplicado: otro movimiento de la misma cuenta y monto con fecha a ±1 día.
  const matches = await loadDuplicateMatches(
    supabase,
    data.map((t) => t.occurred_on),
  );

  return (
    <>
      <PageHeader title="Por revisar" backHref="/movimientos" />
      <p className="mb-4 px-1 text-sm text-muted">
        Movimientos que llegaron solos (Apple Pay, Google Wallet, Bancolombia). Toca ✓ si están bien, o
        ábrelos para cambiar categoría, cuenta o tipo: la app lo recordará para la próxima vez.
      </p>

      {data.length === 0 ? (
        <p className={`${cardClass} p-6 text-center text-muted`}>Todo al día 🎉</p>
      ) : (
        <>
          {matches.size >= 2 && (
            <MergeButton
              wide
              action={mergeAllDuplicates}
              label={`Fusionar los ${matches.size} duplicados`}
              confirmMessage={`¿Fusionar los ${matches.size} posibles duplicados? Se conserva el movimiento original de cada pareja y se borra el repetido.`}
            />
          )}
          <ul className={`${cardClass} divide-y divide-border overflow-hidden`}>
            {data.map((t) => (
              <li key={t.id} className="row-link flex items-center gap-3 p-4">
                <Link href={`/movimientos/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span aria-hidden className="text-2xl">
                    {t.type === "transfer" ? "🔄" : (t.category?.icon ?? "❔")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.description ?? t.merchant ?? "Pago sin comercio"}</p>
                    <p className="truncate text-xs text-muted">
                      {formatShortDate(t.occurred_on)} · {t.category?.name ?? "Sin categoría"} · {t.account.name}
                    </p>
                    {matches.has(t.id) && (
                      <p className="mt-1 text-xs text-negative">
                        <span className="rounded-full bg-negative/10 px-2 py-0.5 font-medium">Posible duplicado</span>{" "}
                        de {describe(matches.get(t.id)!)}
                      </p>
                    )}
                  </div>
                  <p
                    className={`font-medium whitespace-nowrap tabular-nums ${t.type === "income" ? "text-positive" : ""}`}
                  >
                    {t.type === "income" ? "+" : ""}
                    {formatMoney(t.amount, t.account.currency)}
                  </p>
                </Link>
                {matches.has(t.id) && (
                  <MergeButton
                    action={mergeDuplicate.bind(null, t.id, matches.get(t.id)!.id)}
                    confirmMessage={`¿Fusionar con ${describe(matches.get(t.id)!)}? Se conserva ese movimiento y se borra este.`}
                  />
                )}
                <ApproveButton action={approveTransaction.bind(null, t.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function describe(t: DuplicateCandidate) {
  const name = t.description ?? t.merchant ?? (t.source === "manual" ? "el anotado a mano" : "otro movimiento");
  return `"${name}" del ${formatShortDate(t.occurred_on)}`;
}
