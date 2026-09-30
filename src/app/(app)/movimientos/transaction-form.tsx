"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import { withFullNames } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import type {
  Account,
  Category,
  DebtOption,
  FormState,
  Transaction,
  TransactionType,
} from "@/lib/types";

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
  { value: "transfer", label: "Transferir" },
  { value: "debt_payment", label: "Abono" },
];

export function TransactionForm({
  action,
  accounts,
  categories,
  debts,
  initial,
  defaultType = "expense",
  defaultDebtId,
  today,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  accounts: Account[];
  categories: Category[];
  debts: DebtOption[];
  initial?: Transaction;
  defaultType?: TransactionType;
  defaultDebtId?: string;
  today: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType);
  const [debtId, setDebtId] = useState(initial?.debt_id ?? defaultDebtId ?? debts[0]?.debt_id ?? "");
  const debt = debts.find((d) => d.debt_id === debtId);
  const [accountId, setAccountId] = useState(
    initial?.account_id ?? firstAccountIn(accounts, type === "debt_payment" ? debt?.currency : undefined),
  );
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "COP";
  const visibleCategories = withFullNames(categories.filter((c) => c.kind === type));
  // "Abono" solo aparece si hay deudas a las que abonar.
  const options = typeOptions.filter((o) => o.value !== "debt_payment" || debts.length > 0);

  function selectDebt(id: string) {
    setDebtId(id);
    const next = debts.find((d) => d.debt_id === id);
    if (next && next.currency !== currency) setAccountId(firstAccountIn(accounts, next.currency));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="type" value={type} />

      <div
        className={`grid gap-1 rounded-xl bg-surface p-1 ${options.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
        role="radiogroup"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={type === option.value}
            onClick={() => {
              setType(option.value);
              if (option.value === "debt_payment" && debt && debt.currency !== currency) {
                setAccountId(firstAccountIn(accounts, debt.currency));
              }
            }}
            className={`rounded-lg py-2 text-sm font-medium ${
              type === option.value ? "bg-accent text-accent-foreground" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {type === "debt_payment" && (
        <div>
          <label htmlFor="debt_id" className={labelClass}>
            Deuda
          </label>
          <select
            id="debt_id"
            name="debt_id"
            value={debtId}
            onChange={(e) => selectDebt(e.target.value)}
            className={inputClass}
          >
            {debts.map((d) => (
              <option key={d.debt_id} value={d.debt_id}>
                {d.creditor} ({d.currency})
              </option>
            ))}
          </select>
          {debt && (
            <p className="mt-1 px-1 text-xs text-muted">
              Pendiente: {formatMoney(debt.remaining, debt.currency)}
            </p>
          )}
        </div>
      )}

      <div>
        <label className={labelClass}>Monto</label>
        <MoneyInput
          key={currency}
          name="amount"
          currency={currency}
          defaultValue={initial?.amount}
          autoFocus={!initial}
        />
      </div>

      <div>
        <label htmlFor="account_id" className={labelClass}>
          {type === "transfer" ? "Desde" : type === "debt_payment" ? "Pagado desde" : "Cuenta"}
        </label>
        <select
          id="account_id"
          name="account_id"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={inputClass}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </div>

      {type === "transfer" ? (
        <div>
          <label htmlFor="to_account_id" className={labelClass}>
            Hacia
          </label>
          <select
            id="to_account_id"
            name="to_account_id"
            defaultValue={initial?.to_account_id ?? ""}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Elige una cuenta
            </option>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
          </select>
        </div>
      ) : type === "debt_payment" ? null : (
        <fieldset>
          <legend className={labelClass}>Categoría</legend>
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="category_id"
                  value={c.id}
                  defaultChecked={initial?.category_id === c.id}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-border bg-surface px-3 py-1.5 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground">
                  {c.icon} {c.fullName}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="occurred_on" className={labelClass}>
          Fecha
        </label>
        <input
          id="occurred_on"
          type="date"
          name="occurred_on"
          required
          defaultValue={initial?.occurred_on ?? today}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Descripción (opcional)
        </label>
        <input
          id="description"
          name="description"
          maxLength={200}
          defaultValue={initial?.description ?? initial?.merchant ?? ""}
          placeholder={type === "expense" ? "Ej: almuerzo con el equipo" : ""}
          className={inputClass}
        />
      </div>

      <FormError message={state?.error} />
      <SubmitButton>{initial ? "Guardar cambios" : "Registrar"}</SubmitButton>
    </form>
  );
}

function firstAccountIn(accounts: Account[], currency?: string) {
  return (accounts.find((a) => !currency || a.currency === currency) ?? accounts[0])?.id ?? "";
}
