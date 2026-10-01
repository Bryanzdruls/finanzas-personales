"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import type { Account } from "@/lib/types";
import { saveCard } from "./actions";

export function CardForm({ accounts, seen }: { accounts: Account[]; seen: string[] }) {
  const [state, formAction] = useActionState(saveCard, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="card_key" className={labelClass}>
          Tarjeta (como llega en el pago)
        </label>
        <input
          id="card_key"
          name="card_key"
          required
          maxLength={100}
          list="seen-cards"
          placeholder="Ej: nu, mastercard nu"
          className={inputClass}
        />
        <datalist id="seen-cards">
          {seen.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {seen.length > 0 && (
          <p className="mt-1 px-1 text-xs text-muted">Han llegado: {seen.join(", ")}</p>
        )}
      </div>
      <div>
        <label htmlFor="account_id" className={labelClass}>
          Cuenta
        </label>
        <select id="account_id" name="account_id" required className={inputClass}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.type === "credit_card" ? " (tarjeta de crédito)" : ""}
            </option>
          ))}
        </select>
      </div>
      <FormError message={state?.error} />
      <SubmitButton>Guardar tarjeta</SubmitButton>
    </form>
  );
}
