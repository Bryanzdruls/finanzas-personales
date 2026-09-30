"use client";

import { useState } from "react";
import { formatAmountInput, parseAmount, type Currency } from "@/lib/format";
import { inputClass } from "./ui";

// Muestra el monto con separador de miles mientras se escribe y envía el texto tal cual;
// el Server Action lo convierte con parseAmount.
export function MoneyInput({
  name,
  currency,
  defaultValue,
  autoFocus,
  allowNegative,
  required = true,
}: {
  name: string;
  currency: Currency;
  defaultValue?: string | number;
  autoFocus?: boolean;
  allowNegative?: boolean;
  required?: boolean;
}) {
  const [text, setText] = useState(
    defaultValue === undefined ? "" : formatAmountInput(defaultValue, currency),
  );

  function onChange(raw: string) {
    const negative = allowNegative && raw.trim().startsWith("-") ? "-" : "";
    // En USD, mientras se escriben los decimales ("12," o "12,5") se deja el texto tal cual.
    if (currency === "USD" && /,\d{0,2}$/.test(raw)) return setText(raw);
    const n = Math.abs(parseAmount(raw));
    setText(Number.isFinite(n) ? negative + formatAmountInput(n, currency) : negative);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">
        {currency === "USD" ? "US$" : "$"}
      </span>
      <input
        name={name}
        required={required}
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} ${currency === "USD" ? "pl-14" : "pl-8"} text-2xl font-semibold tabular-nums`}
      />
    </div>
  );
}
