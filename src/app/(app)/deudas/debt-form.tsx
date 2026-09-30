"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import { withFullNames } from "@/lib/categories";
import type { Currency } from "@/lib/format";
import {
  currencies,
  debtStatusLabels,
  type Category,
  type Debt,
  type FormState,
} from "@/lib/types";

export function DebtForm({
  action,
  categories,
  initial,
  today,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Category[];
  initial?: Debt;
  today: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "COP");
  const debtCategories = withFullNames(categories.filter((c) => c.kind === "debt"));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label htmlFor="creditor" className={labelClass}>
          ¿A quién le debes?
        </label>
        <input
          id="creditor"
          name="creditor"
          required
          maxLength={60}
          defaultValue={initial?.creditor}
          placeholder="Ej: Tarjeta Bancolombia, Crédito carro, Mamá"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div>
          <label htmlFor="category_id" className={labelClass}>
            Categoría
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={initial?.category_id ?? ""}
            className={inputClass}
          >
            <option value="">Sin categoría</option>
            {debtCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.fullName}
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
        <label className={labelClass}>Monto total de la deuda</label>
        <MoneyInput
          key={`total-${currency}`}
          name="total_amount"
          currency={currency}
          defaultValue={initial?.total_amount}
          autoFocus={!initial}
        />
      </div>

      <div>
        <label className={labelClass}>Ya abonado antes de usar la app</label>
        <MoneyInput
          key={`before-${currency}`}
          name="paid_before"
          currency={currency}
          defaultValue={initial?.paid_before ?? 0}
        />
        <p className="mt-1 px-1 text-xs text-muted">
          Si ya llevas pagos, escribe cuánto has abonado. Los abonos nuevos regístralos desde la deuda.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="installments" className={labelClass}>
            Cuotas
          </label>
          <input
            id="installments"
            name="installments"
            inputMode="numeric"
            defaultValue={initial?.installments ?? ""}
            placeholder="36"
            className={inputClass}
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
            placeholder="15"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="interest_rate" className={labelClass}>
            Tasa E.A. %
          </label>
          <input
            id="interest_rate"
            name="interest_rate"
            inputMode="decimal"
            defaultValue={initial?.interest_rate ?? ""}
            placeholder="24,5"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="start_date" className={labelClass}>
          Fecha de inicio
        </label>
        <input
          id="start_date"
          type="date"
          name="start_date"
          required
          defaultValue={initial?.start_date ?? today}
          className={inputClass}
        />
      </div>

      {initial && (
        <div>
          <label htmlFor="status" className={labelClass}>
            Estado
          </label>
          <select id="status" name="status" defaultValue={initial.status} className={inputClass}>
            {Object.entries(debtStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 px-1 text-xs text-muted">
            Pasa a &quot;Pagada&quot; sola cuando los abonos cubren el total.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notas (opcional)
        </label>
        <input
          id="notes"
          name="notes"
          maxLength={200}
          defaultValue={initial?.notes ?? ""}
          className={inputClass}
        />
      </div>

      <FormError message={state?.error} />
      <SubmitButton>{initial ? "Guardar cambios" : "Crear deuda"}</SubmitButton>
    </form>
  );
}
