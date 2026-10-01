"use client";

import { useActionState } from "react";
import type { Account, FormState } from "@/lib/types";

// Selector de la cuenta por defecto de un token: se guarda al cambiarlo.
export function TokenAccount({
  action,
  accounts,
  value,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  accounts: Account[];
  value: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mt-1">
      <label className="flex items-center gap-2 text-xs text-muted">
        Pagos a
        <select
          name="default_account_id"
          defaultValue={value}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.type === "credit_card" ? " (tarjeta)" : ""}
            </option>
          ))}
        </select>
        {pending && <span>Guardando…</span>}
        {state && !state.error && !pending && <span className="text-positive">Guardado</span>}
      </label>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
