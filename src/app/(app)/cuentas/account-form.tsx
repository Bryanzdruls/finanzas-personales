"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import type { Currency } from "@/lib/format";
import { accountTypeLabels, currencies, type Account, type FormState } from "@/lib/types";

export function AccountForm({
  action,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Account;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "COP");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label htmlFor="name" className={labelClass}>
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={60}
          defaultValue={initial?.name}
          placeholder="Ej: Nu, Davivienda, Binance"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="type" className={labelClass}>
            Tipo
          </label>
          <select id="type" name="type" defaultValue={initial?.type ?? "bank"} className={inputClass}>
            {Object.entries(accountTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="currency" className={labelClass}>
            Moneda
          </label>
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className={inputClass}
          >
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Saldo inicial</label>
        <MoneyInput
          key={currency}
          name="initial_balance"
          currency={currency}
          defaultValue={initial?.initial_balance ?? 0}
          allowNegative
        />
        <p className="mt-1 px-1 text-xs text-muted">
          Lo que tenía la cuenta antes de empezar a registrar movimientos.
        </p>
      </div>

      {initial && (
        <label className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
          <span>
            Archivada
            <span className="block text-xs text-muted">No aparece en el inicio ni en formularios.</span>
          </span>
          <input
            type="checkbox"
            name="archived"
            defaultChecked={initial.archived}
            className="h-5 w-5 accent-accent"
          />
        </label>
      )}

      <FormError message={state?.error} />
      <SubmitButton>{initial ? "Guardar cambios" : "Crear cuenta"}</SubmitButton>
    </form>
  );
}
