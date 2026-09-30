import Link from "next/link";
import { ApproveButton } from "@/components/approve-button";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { approveTransaction } from "../actions";

type Row = {
  id: string;
  occurred_on: string;
  amount: string;
  merchant: string | null;
  card_name: string | null;
  account: { name: string; currency: Currency };
  category: { name: string; icon: string | null } | null;
};

export default async function RevisarPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, occurred_on, amount, merchant, card_name,
       account:accounts!transactions_account_id_user_id_fkey(name, currency),
       category:categories(name, icon)`,
    )
    .eq("needs_review", true)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Por revisar" backHref="/movimientos" />
      <p className="mb-4 px-1 text-sm text-muted">
        Pagos que llegaron de Apple Pay. Toca ✓ si están bien, o ábrelos para cambiar categoría o cuenta:
        la app lo recordará para el próximo pago en ese comercio o con esa tarjeta.
      </p>

      {data.length === 0 ? (
        <p className={`${cardClass} p-6 text-center text-muted`}>Todo al día 🎉</p>
      ) : (
        <ul className={`${cardClass} divide-y divide-border`}>
          {data.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-4">
              <Link href={`/movimientos/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span aria-hidden className="text-2xl">
                  {t.category?.icon ?? "❔"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.merchant ?? "Pago sin comercio"}</p>
                  <p className="truncate text-xs text-muted">
                    {formatShortDate(t.occurred_on)} · {t.category?.name ?? "Sin categoría"} · {t.account.name}
                  </p>
                </div>
                <p className="font-medium whitespace-nowrap tabular-nums">
                  {formatMoney(t.amount, t.account.currency)}
                </p>
              </Link>
              <ApproveButton action={approveTransaction.bind(null, t.id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
