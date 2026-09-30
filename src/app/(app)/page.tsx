import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/format";

const accountTypeLabels: Record<string, string> = {
  bank: "Banco",
  pension: "Pensión",
  broker: "Bróker",
  crypto: "Cripto",
  cash: "Efectivo",
  other: "Otro",
};

export default async function HomePage() {
  const supabase = await createClient();
  const [netWorth, balances] = await Promise.all([
    supabase.from("net_worth").select("currency, assets, liabilities, net_worth").order("currency"),
    supabase
      .from("account_balances")
      .select("account_id, name, type, currency, balance")
      .eq("archived", false)
      .order("name"),
  ]);

  const error = netWorth.error ?? balances.error;
  if (error) {
    return (
      <p role="alert" className="rounded-2xl bg-surface p-6 text-negative">
        No se pudieron cargar los datos: {error.message}
      </p>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Inicio</h1>

      <section className="mt-6 grid gap-3">
        {(netWorth.data ?? []).map((row) => (
          <div key={row.currency} className="rounded-2xl bg-surface p-5">
            <p className="text-sm text-muted">Patrimonio neto · {row.currency}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {formatMoney(row.net_worth, row.currency as Currency)}
            </p>
            <div className="mt-3 flex gap-6 text-sm tabular-nums">
              <span className="text-positive">
                Activos {formatMoney(row.assets, row.currency as Currency)}
              </span>
              <span className="text-negative">
                Deudas {formatMoney(row.liabilities, row.currency as Currency)}
              </span>
            </div>
          </div>
        ))}
      </section>

      <h2 className="mt-8 mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
        Cuentas
      </h2>
      <ul className="divide-y divide-border rounded-2xl bg-surface">
        {(balances.data ?? []).map((account) => (
          <li key={account.account_id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{account.name}</p>
              <p className="text-sm text-muted">{accountTypeLabels[account.type] ?? account.type}</p>
            </div>
            <p className="font-medium tabular-nums">
              {formatMoney(account.balance, account.currency as Currency)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
