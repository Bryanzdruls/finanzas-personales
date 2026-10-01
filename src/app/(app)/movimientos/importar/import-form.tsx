"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, inputClass, labelClass } from "@/components/ui";
import { parseBancolombiaMessage, splitMessages } from "@/lib/bancolombia";
import { formatMoney } from "@/lib/format";
import type { Account } from "@/lib/types";
import { importMessages } from "./actions";

export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [state, formAction] = useActionState(importMessages, undefined);
  const [pasted, setPasted] = useState("");
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const defaultAccount = accounts.find((a) => a.name.toLowerCase().includes("bancolombia")) ?? accounts[0];

  // Vista previa inmediata: el mismo lector que usa el servidor.
  const rows = useMemo(
    () => splitMessages(pasted).map((text) => ({ text, movement: parseBancolombiaMessage(text) })),
    [pasted],
  );
  const valid = rows.filter((r) => r.movement);

  if (state?.created !== undefined) {
    return (
      <div className={`${cardClass} flex flex-col gap-3 p-5`}>
        <p className="font-medium">
          {state.created} {state.created === 1 ? "movimiento importado" : "movimientos importados"}
        </p>
        {!!state.duplicates && <p className="text-sm text-muted">{state.duplicates} ya estaban registrados.</p>}
        {!!state.failed && <p className="text-sm text-negative">{state.failed} no se pudieron registrar.</p>}
        <Link href="/movimientos/revisar" className="text-accent">
          Revisarlos en Por revisar ›
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label htmlFor="pasted" className={labelClass}>
          SMS de Bancolombia
        </label>
        <textarea
          id="pasted"
          rows={6}
          value={pasted}
          onChange={(e) => {
            setPasted(e.target.value);
            setSkipped(new Set());
          }}
          placeholder="Pega aquí uno o varios SMS. Cada uno empieza por «Bancolombia:»."
          className={`${inputClass} text-sm`}
        />
      </div>

      {rows.length > 0 && (
        <ul className={`${cardClass} divide-y divide-border`}>
          {rows.map((r, i) => {
            const m = r.movement;
            if (!m) {
              return (
                <li key={i} className="p-4 text-sm text-muted">
                  Sin movimiento: {r.text.slice(0, 60)}…
                </li>
              );
            }
            const checked = !skipped.has(i);
            return (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSkipped((s) => {
                        const next = new Set(s);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className="mt-1 h-5 w-5 accent-accent"
                  />
                  {checked && <input type="hidden" name="message" value={r.text} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.description}</p>
                    <p className="text-xs text-muted">
                      {m.date ?? "sin fecha"}
                      {m.time ? ` · ${m.time}` : ""}
                      {m.cardKey ? ` · ${m.cardKey}` : ""}
                    </p>
                  </div>
                  <p
                    className={`font-medium whitespace-nowrap tabular-nums ${m.direction === "in" ? "text-positive" : ""}`}
                  >
                    {m.direction === "in" ? "+" : "−"}
                    {formatMoney(m.amount, "COP")}
                  </p>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <label htmlFor="default_account_id" className={labelClass}>
          Cuenta por defecto
        </label>
        <select
          id="default_account_id"
          name="default_account_id"
          defaultValue={defaultAccount?.id}
          className={inputClass}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
        <p className="mt-1 px-1 text-xs text-muted">
          Se usa si la app aún no sabe a qué cuenta corresponde el número del SMS (*1601).
        </p>
      </div>

      <FormError message={state?.error} />
      {valid.length > 0 && (
        <SubmitButton>
          Importar {valid.length - [...skipped].filter((i) => rows[i]?.movement).length} movimientos
        </SubmitButton>
      )}
    </form>
  );
}
