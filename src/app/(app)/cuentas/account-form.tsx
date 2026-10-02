"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import type { Currency } from "@/lib/format";
import type { Module } from "@/lib/modules";
import {
  accountTypeLabels,
  currencies,
  isInvestment,
  type Account,
  type AccountType,
  type FormState,
} from "@/lib/types";

export function AccountForm({
  action,
  initial,
  modules,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Account;
  modules: Module[];
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "COP");
  const [type, setType] = useState<AccountType>(initial?.type ?? "bank");
  const card = type === "credit_card";
  // Solo los tipos y monedas de los módulos activos (más los que ya tenga la cuenta al editarla).
  const types = (Object.keys(accountTypeLabels) as AccountType[]).filter(
    (t) =>
      t === initial?.type ||
      (t === "credit_card" ? modules.includes("credit_cards") : !isInvestment(t) || modules.includes("investments")),
  );
  const showCurrency = modules.includes("usd") || initial?.currency === "USD";
  // En la tarjeta el saldo guardado es negativo; se edita como deuda positiva.
  const initialBalance = Number(initial?.initial_balance ?? 0);
  const balanceValue = initial?.type === "credit_card" ? Math.abs(initialBalance) : initialBalance;

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

      <div className={showCurrency ? "grid grid-cols-2 gap-3" : ""}>
        <div>
          <label htmlFor="type" className={labelClass}>
            Tipo
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            className={inputClass}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {accountTypeLabels[t]}
              </option>
            ))}
          </select>
        </div>
        {showCurrency ? (
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
        ) : (
          <input type="hidden" name="currency" value="COP" />
        )}
      </div>

      <div>
        <label className={labelClass}>{card ? "Deuda inicial de la tarjeta" : "Saldo inicial"}</label>
        <MoneyInput
          key={`${currency}-${card}`}
          name="initial_balance"
          currency={currency}
          defaultValue={balanceValue}
          allowNegative={!card}
        />
        <p className="mt-1 px-1 text-xs text-muted">
          {card
            ? "Lo que debías en la tarjeta antes de empezar a registrar compras (0 si está al día)."
            : "Lo que tenía la cuenta antes de empezar a registrar movimientos."}
        </p>
      </div>

      {card && (
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <div>
            <label className={labelClass}>Cupo (opcional)</label>
            <MoneyInput
              key={`limit-${currency}`}
              name="credit_limit"
              currency={currency}
              defaultValue={initial?.credit_limit ?? undefined}
              required={false}
            />
          </div>
          <div>
            <label htmlFor="due_day" className={labelClass}>
              Día de pago
            </label>
            <input
              id="due_day"
              name="due_day"
              inputMode="numeric"
              defaultValue={initial?.due_day ?? ""}
              placeholder="5"
              className={inputClass}
            />
          </div>
        </div>
      )}

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
