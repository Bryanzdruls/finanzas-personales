import Link from "next/link";
import { ApproveButton } from "@/components/approve-button";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { approveTransaction, deleteFromReview } from "../actions";

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

  // Posible duplicado: otro movimiento del mismo día, monto y cuenta registrado antes.
  const dates = data.map((t) => t.occurred_on).sort();
  const { data: sameDays } = dates.length
    ? await supabase
        .from("transactions")
        .select("id, occurred_on, amount, account_id, created_at")
        .gte("occurred_on", dates[0])
        .lte("occurred_on", dates.at(-1)!)
    : { data: [] };
  const key = (t: { occurred_on: string; amount: string | number; account_id: string }) =>
    `${t.occurred_on}|${Number(t.amount)}|${t.account_id}`;
  const earliest = new Map<string, string>();
  for (const t of sameDays ?? []) {
    const k = key(t);
    const prev = earliest.get(k);
    if (!prev || t.created_at < prev) earliest.set(k, t.created_at);
  }
  const isDuplicate = (t: Row) => (earliest.get(key(t)) ?? t.created_at) < t.created_at;

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
        <ul className={`${cardClass} divide-y divide-border`}>
          {data.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-4">
              <Link href={`/movimientos/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span aria-hidden className="text-2xl">
                  {t.type === "transfer" ? "🔄" : (t.category?.icon ?? "❔")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.description ?? t.merchant ?? "Pago sin comercio"}</p>
                  <p className="truncate text-xs text-muted">
                    {formatShortDate(t.occurred_on)} · {t.category?.name ?? "Sin categoría"} · {t.account.name}
                  </p>
                  {isDuplicate(t) && (
                    <p className="mt-1 inline-block rounded-full bg-negative/10 px-2 py-0.5 text-xs font-medium text-negative">
                      Posible duplicado
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
              {isDuplicate(t) && (
                <DeleteButton
                  compact
                  action={deleteFromReview.bind(null, t.id)}
                  confirmMessage="¿Eliminar este movimiento repetido?"
                  label="Eliminar duplicado"
                />
              )}
              <ApproveButton action={approveTransaction.bind(null, t.id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
