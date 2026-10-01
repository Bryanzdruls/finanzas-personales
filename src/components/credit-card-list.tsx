import Link from "next/link";
import { formatShortDate, nextDueDate } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/format";
import { Icon } from "./icons";
import { ProgressBar } from "./progress-bar";
import { cardClass } from "./ui";

export type CreditCardBalance = {
  account_id: string;
  name: string;
  currency: Currency;
  balance: string;
  credit_limit: string | null;
  due_day: number | null;
};

// Lo que se debe en la tarjeta: el saldo es negativo; un saldo a favor cuenta como 0.
export function cardDebt(card: { balance: string }) {
  return Math.max(-Number(card.balance), 0);
}

export function CreditCardList({ cards }: { cards: CreditCardBalance[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {cards.map((c) => {
        const owed = cardDebt(c);
        const limit = c.credit_limit ? Number(c.credit_limit) : null;
        return (
          <li key={c.account_id} className={`${cardClass} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <Link href={`/cuentas/${c.account_id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-medium">
                  <Icon name="card" className="h-4 w-4 shrink-0 text-muted" />
                  {c.name}
                </p>
                <p className="text-xs text-muted">
                  {c.due_day ? `Pagar antes del ${formatShortDate(nextDueDate(c.due_day))}` : "Tarjeta de crédito"}
                </p>
              </Link>
              <div className="text-right">
                <p className={`font-semibold whitespace-nowrap tabular-nums ${owed > 0 ? "text-negative" : ""}`}>
                  {formatMoney(owed, c.currency)}
                </p>
                <p className="text-xs text-muted">{owed > 0 ? "debes" : "al día"}</p>
              </div>
            </div>
            {limit && (
              <div className="mt-3">
                <ProgressBar percent={(owed / limit) * 100} />
                <p className="mt-1 text-xs text-muted tabular-nums">
                  Disponible {formatMoney(Math.max(limit - owed, 0), c.currency)} de{" "}
                  {formatMoney(limit, c.currency)}
                </p>
              </div>
            )}
            {owed > 0 && (
              <Link
                href={`/movimientos/nuevo?tipo=transfer&hacia=${c.account_id}`}
                className="row-link mt-3 block rounded-xl border border-accent py-2 text-center text-sm font-semibold text-accent"
              >
                Pagar tarjeta
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
