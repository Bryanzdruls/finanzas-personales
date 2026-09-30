"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import type { Account } from "@/lib/types";
import { createToken } from "./actions";

export function TokenForm({ accounts }: { accounts: Account[] }) {
  const [state, formAction] = useActionState(createToken, undefined);
  const [copied, setCopied] = useState(false);

  if (state?.token) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          Copia este token ahora: no se volverá a mostrar.
        </p>
        <code className="block rounded-xl bg-background p-3 text-xs break-all select-all">
          {state.token}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(state.token!);
            setCopied(true);
          }}
          className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground"
        >
          {copied ? "¡Copiado!" : "Copiar token"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className={labelClass}>
          Nombre
        </label>
        <input id="name" name="name" required maxLength={40} defaultValue="iPhone" className={inputClass} />
      </div>
      <div>
        <label htmlFor="default_account_id" className={labelClass}>
          Cuenta por defecto
        </label>
        <select id="default_account_id" name="default_account_id" className={inputClass}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
        <p className="mt-1 px-1 text-xs text-muted">
          Se usa mientras la app no sepa a qué cuenta corresponde cada tarjeta.
        </p>
      </div>
      <FormError message={state?.error} />
      <SubmitButton>Generar token</SubmitButton>
    </form>
  );
}
