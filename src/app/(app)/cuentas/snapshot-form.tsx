"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import type { Currency } from "@/lib/format";
import type { FormState } from "@/lib/types";

export function SnapshotForm({
  action,
  currency,
  today,
  label = "Saldo real",
  autoFocus,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  currency: Currency;
  today: string;
  label?: string;
  autoFocus?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className={labelClass}>{label}</label>
        <MoneyInput name="balance" currency={currency} allowNegative autoFocus={autoFocus} />
      </div>
      <div>
        <label htmlFor="as_of" className={labelClass}>
          Fecha
        </label>
        <input id="as_of" type="date" name="as_of" required defaultValue={today} className={inputClass} />
      </div>
      <FormError message={state?.error} />
      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}
