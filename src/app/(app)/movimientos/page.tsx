import Link from "next/link";
import { AddButton } from "@/components/add-button";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { cardClass } from "@/components/ui";
import { formatDay, parseMonth } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { transactionTypeLabels, type TransactionType } from "@/lib/types";

type Row = {
  id: string;
  occurred_on: string;
  amount: string;
  type: TransactionType;
  description: string | null;
  merchant: string | null;
  needs_review: boolean;
  account: { name: string; currency: Currency };
  to_account: { name: string } | null;
  category: { name: string; icon: string | null } | null;
  debt: { creditor: string } | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sign: Record<TransactionType, string> = {
  income: "+",
  expense: "−",
  debt_payment: "−",
  transfer: "",
};

const amountColor: Record<TransactionType, string> = {
  income: "text-positive",
  expense: "",
  debt_payment: "",
  transfer: "text-muted",
};

function title(t: Row) {
  if (t.description) return t.description;
  if (t.merchant) return t.merchant;
  if (t.type === "transfer") return `${t.account.name} → ${t.to_account?.name}`;
  if (t.type === "debt_payment") return `Abono a ${t.debt?.creditor}`;
  return t.category?.name ?? transactionTypeLabels[t.type];
}

function icon(t: Row) {
  if (t.type === "transfer") return "🔄";
  if (t.type === "debt_payment") return "📉";
  return t.category?.icon ?? "•";
}

export default async function MovimientosPage({ searchParams }: PageProps<"/movimientos">) {
  const { mes, cuenta } = await searchParams;
  const month = parseMonth(mes);
  const accountId = typeof cuenta === "string" && UUID.test(cuenta) ? cuenta : null;
  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select(
      `id, occurred_on, amount, type, description, merchant, needs_review,
       account:accounts!transactions_account_id_user_id_fkey(name, currency),
       to_account:accounts!transactions_to_account_id_user_id_fkey(name),
       category:categories(name, icon),
       debt:debts(creditor)`,
    )
    .gte("occurred_on", month.start)
    .lt("occurred_on", month.end);
  if (accountId) query = query.or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`);

  const [{ data, error }, { data: account }] = await Promise.all([
    query
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Row[]>(),
    accountId
      ? supabase.from("accounts").select("name").eq("id", accountId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (error) throw new Error(error.message);

  const days = Map.groupBy(data, (t) => t.occurred_on);

  return (
    <>
      <PageHeader title="Movimientos" />
      <ReviewBanner />
      <MonthPicker
        month={month}
        basePath="/movimientos"
        params={accountId ? { cuenta: accountId } : {}}
      />

      {account && (
        <Link
          href={`/movimientos?mes=${month.key}`}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground"
        >
          Solo {account.name} <span aria-label="Quitar filtro">×</span>
        </Link>
      )}

      {data.length === 0 && (
        <p className={`${cardClass} mt-6 p-6 text-center text-muted`}>
          No hay movimientos este mes. Toca + para registrar uno.
        </p>
      )}

      {[...days].map(([day, rows]) => (
        <section key={day}>
          <h2 className="mt-6 mb-2 px-1 text-sm font-medium capitalize text-muted">
            {formatDay(day)}
          </h2>
          <ul className={`${cardClass} divide-y divide-border`}>
            {rows.map((t) => (
              <li key={t.id}>
                <Link href={`/movimientos/${t.id}`} className="flex items-center gap-3 p-4">
                  <span aria-hidden className="text-2xl">
                    {icon(t)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{title(t)}</p>
                    <p className="truncate text-sm text-muted">
                      {t.type === "transfer"
                        ? "Transferencia"
                        : [t.category?.name, t.account.name].filter(Boolean).join(" · ")}
                      {t.needs_review && " · por revisar"}
                    </p>
                  </div>
                  <p className={`font-medium whitespace-nowrap tabular-nums ${amountColor[t.type]}`}>
                    {sign[t.type]}
                    {formatMoney(t.amount, t.account.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <AddButton href="/movimientos/nuevo" label="Registrar movimiento" />
    </>
  );
}
