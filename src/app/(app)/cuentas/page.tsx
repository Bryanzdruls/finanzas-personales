import Link from "next/link";
import { AddButton } from "@/components/add-button";
import { PageHeader } from "@/components/page-header";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { formatMoney, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { accountTypeLabels, isInvestment, type AccountType } from "@/lib/types";

type Balance = {
  account_id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  archived: boolean;
  balance: string;
  last_snapshot_on: string | null;
};

export default async function CuentasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_balances")
    .select("account_id, name, type, currency, archived, balance, last_snapshot_on")
    .order("name")
    .returns<Balance[]>();
  if (error) throw new Error(error.message);

  const active = data.filter((a) => !a.archived);
  const archived = data.filter((a) => a.archived);
  const totals = Map.groupBy(active, (a) => a.currency);

  return (
    <>
      <PageHeader title="Cuentas" />

      <div className="grid grid-cols-2 gap-3">
        {[...totals].map(([currency, accounts]) => (
          <div key={currency} className={`${cardClass} p-4`}>
            <p className="text-sm text-muted">Total {currency}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatMoney(
                accounts.reduce((sum, a) => sum + Number(a.balance), 0),
                currency,
              )}
            </p>
          </div>
        ))}
      </div>

      <AccountList title="Disponible" accounts={active.filter((a) => !isInvestment(a.type))} />
      <AccountList title="Inversiones" accounts={active.filter((a) => isInvestment(a.type))} />
      {archived.length > 0 && <AccountList title="Archivadas" accounts={archived} />}

      <AddButton href="/cuentas/nueva" label="Nueva cuenta" />
    </>
  );
}

function AccountList({ title, accounts }: { title: string; accounts: Balance[] }) {
  if (accounts.length === 0) return null;
  return (
    <>
      <h2 className={sectionTitleClass}>{title}</h2>
      <ul className={`${cardClass} divide-y divide-border`}>
        {accounts.map((a) => (
          <li key={a.account_id}>
            <Link href={`/cuentas/${a.account_id}`} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-sm text-muted">
                  {accountTypeLabels[a.type]} · {a.currency}
                </p>
              </div>
              <p
                className={`font-medium whitespace-nowrap tabular-nums ${Number(a.balance) < 0 ? "text-negative" : ""}`}
              >
                {formatMoney(a.balance, a.currency)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
