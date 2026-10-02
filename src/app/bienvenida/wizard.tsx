"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import type { Currency } from "@/lib/format";
import { MODULES, moduleInfo, type Module } from "@/lib/modules";
import { completeOnboarding } from "./actions";

const STEPS = ["Bienvenida", "Tus cuentas", "Extras", "Listo"];

const BANKS = ["Bancolombia", "Nequi", "Davivienda", "Nu", "BBVA", "Daviplata"];
const CARDS = ["Nu", "Bancolombia", "Falabella", "RappiCard"];
const INVESTMENT_TYPES = { broker: "Bróker", pension: "Pensión", crypto: "Cripto" } as const;

type Bank = { key: number; name: string; type: "bank" | "cash"; currency: Currency };
type Card = { key: number; name: string };
type Investment = { key: number; name: string; type: keyof typeof INVESTMENT_TYPES; currency: Currency };

let nextKey = 1;

export function Wizard({ suggestedName }: { suggestedName: string }) {
  const [state, formAction] = useActionState(completeOnboarding, undefined);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [name, setName] = useState(suggestedName);
  const [modules, setModules] = useState<Module[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const usd = modules.includes("usd");
  const last = STEPS.length - 1;

  const hasBank = (n: string) => banks.some((b) => b.name.trim().toLowerCase() === n.toLowerCase());
  function addBank(n = "", type: Bank["type"] = "bank") {
    setStepError(null);
    setBanks((list) => [...list, { key: nextKey++, name: n, type, currency: "COP" }]);
  }
  const addCard = (n = "") => setCards((list) => [...list, { key: nextKey++, name: n }]);
  const addInvestment = (type: Investment["type"]) =>
    setInvestments((list) => [...list, { key: nextKey++, name: "", type, currency: "COP" }]);

  function toggleModule(m: Module) {
    setModules((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]));
  }

  function next() {
    if (step === 1 && !banks.some((b) => b.name.trim())) {
      return setStepError("Agrega al menos una cuenta o el efectivo para seguir.");
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, last));
    window.scrollTo({ top: 0 });
  }

  const usedCards = modules.includes("credit_cards") ? cards.filter((c) => c.name.trim()) : [];
  const usedInvestments = modules.includes("investments") ? investments.filter((i) => i.name.trim()) : [];

  return (
    <form
      action={formAction}
      onKeyDown={(e) => {
        // Enter en un campo avanza de paso en vez de enviar todo.
        if (e.key === "Enter" && step < last && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
          next();
        }
      }}
      className="flex flex-1 flex-col"
    >
      <ol className="mb-8 flex gap-1.5" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`}
          >
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ol>

      {/* Paso 1: bienvenida */}
      <section hidden={step !== 0} className="flex flex-col gap-6">
        <LogoMark className="h-16 w-16" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Te damos la bienvenida</h1>
          <p className="mt-2 text-muted">
            En tres pasos dejas lista la app: tus cuentas, lo que quieres controlar y listo. Todo se puede
            cambiar después.
          </p>
        </div>
        <div>
          <label htmlFor="display_name" className={labelClass}>
            ¿Cómo te llamamos?
          </label>
          <input
            id="display_name"
            name="display_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Tu nombre"
            className={inputClass}
          />
        </div>
      </section>

      {/* Paso 2: cuentas */}
      <section hidden={step !== 1} className="flex flex-col gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">¿Dónde tienes tu plata?</h1>
          <p className="mt-2 text-muted">Agrega tus cuentas y cuánto tienen hoy. El saldo es opcional.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {BANKS.map((b) => (
            <Chip key={b} label={b} disabled={hasBank(b)} onClick={() => addBank(b)} />
          ))}
          <Chip label="Efectivo" disabled={hasBank("Efectivo")} onClick={() => addBank("Efectivo", "cash")} />
          <Chip label="Otra cuenta" icon onClick={() => addBank()} />
        </div>

        {banks.map((b) => (
          <RowCard key={b.key} onRemove={() => setBanks((list) => list.filter((x) => x.key !== b.key))}>
            <input type="hidden" name="bank_type" value={b.type} />
            <input
              name="bank_name"
              value={b.name}
              onChange={(e) =>
                setBanks((list) => list.map((x) => (x.key === b.key ? { ...x, name: e.target.value } : x)))
              }
              maxLength={60}
              placeholder="Nombre de la cuenta"
              aria-label="Nombre de la cuenta"
              className={inputClass}
            />
            <div className={usd ? "grid grid-cols-[5.5rem_1fr] gap-2" : ""}>
              <CurrencySelect
                show={usd}
                name="bank_currency"
                value={b.currency}
                onChange={(currency) =>
                  setBanks((list) => list.map((x) => (x.key === b.key ? { ...x, currency } : x)))
                }
              />
              <MoneyInput key={b.currency} name="bank_balance" currency={b.currency} required={false} />
            </div>
          </RowCard>
        ))}
      </section>

      {/* Paso 3: extras */}
      <section hidden={step !== 2} className="flex flex-col gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">¿Qué más quieres controlar?</h1>
          <p className="mt-2 text-muted">Activa solo lo que usas. Lo puedes cambiar en Más → Configuración.</p>
        </div>

        {(["credit_cards", "investments", "usd"] as const).map((m) => (
          <div key={m} className={`${cardClass} overflow-hidden`}>
            <label className="row-link flex items-center gap-3 p-4">
              <input
                type="checkbox"
                name="modules"
                value={m}
                checked={modules.includes(m)}
                onChange={() => toggleModule(m)}
                className="h-5 w-5 shrink-0 accent-accent"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{moduleInfo[m].label}</span>
                <span className="block text-sm text-muted">{moduleInfo[m].description}</span>
              </span>
            </label>

            {m === "credit_cards" && (
              <div hidden={!modules.includes(m)} className="flex flex-col gap-3 border-t border-border p-4">
                <div className="flex flex-wrap gap-2">
                  {CARDS.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      disabled={cards.some((x) =>
                        [c.toLowerCase(), `tarjeta ${c.toLowerCase()}`].includes(x.name.trim().toLowerCase()),
                      )}
                      // Si ya agregó la cuenta de ahorros del mismo banco, la tarjeta necesita otro nombre.
                      onClick={() => addCard(hasBank(c) ? `Tarjeta ${c}` : c)}
                    />
                  ))}
                  <Chip label="Otra tarjeta" icon onClick={() => addCard()} />
                </div>
                {cards.map((c) => (
                  <RowCard key={c.key} onRemove={() => setCards((list) => list.filter((x) => x.key !== c.key))}>
                    <input
                      name="card_name"
                      value={c.name}
                      onChange={(e) =>
                        setCards((list) => list.map((x) => (x.key === c.key ? { ...x, name: e.target.value } : x)))
                      }
                      maxLength={60}
                      placeholder="Nombre de la tarjeta"
                      aria-label="Nombre de la tarjeta"
                      className={inputClass}
                    />
                    <div>
                      <span className={labelClass}>Lo que debes hoy</span>
                      <MoneyInput name="card_owed" currency="COP" required={false} />
                    </div>
                    <div className="grid grid-cols-[1fr_6rem] gap-2">
                      <div>
                        <span className={labelClass}>Cupo</span>
                        <MoneyInput name="card_limit" currency="COP" required={false} />
                      </div>
                      <div>
                        <span className={labelClass}>Día de pago</span>
                        <input name="card_due_day" inputMode="numeric" placeholder="5" className={inputClass} />
                      </div>
                    </div>
                  </RowCard>
                ))}
              </div>
            )}

            {m === "investments" && (
              <div hidden={!modules.includes(m)} className="flex flex-col gap-3 border-t border-border p-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(INVESTMENT_TYPES).map(([type, label]) => (
                    <Chip key={type} label={label} icon onClick={() => addInvestment(type as Investment["type"])} />
                  ))}
                </div>
                {investments.map((inv) => (
                  <RowCard
                    key={inv.key}
                    onRemove={() => setInvestments((list) => list.filter((x) => x.key !== inv.key))}
                  >
                    <input type="hidden" name="inv_type" value={inv.type} />
                    <input
                      name="inv_name"
                      value={inv.name}
                      onChange={(e) =>
                        setInvestments((list) =>
                          list.map((x) => (x.key === inv.key ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      maxLength={60}
                      placeholder={`${INVESTMENT_TYPES[inv.type]}: ej. ${
                        inv.type === "broker" ? "Interactive Brokers" : inv.type === "pension" ? "Protección" : "Binance"
                      }`}
                      aria-label="Nombre de la inversión"
                      className={inputClass}
                    />
                    <div>
                      <span className={labelClass}>Valor actual</span>
                      <div className={usd ? "grid grid-cols-[5.5rem_1fr] gap-2" : ""}>
                        <CurrencySelect
                          show={usd}
                          name="inv_currency"
                          value={inv.currency}
                          onChange={(currency) =>
                            setInvestments((list) => list.map((x) => (x.key === inv.key ? { ...x, currency } : x)))
                          }
                        />
                        <MoneyInput key={inv.currency} name="inv_value" currency={inv.currency} required={false} />
                      </div>
                    </div>
                  </RowCard>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Paso 4: resumen */}
      <section hidden={step !== last} className="flex flex-col gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Todo listo{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}</h1>
          <p className="mt-2 text-muted">Esto es lo que vamos a crear:</p>
        </div>
        <ul className={`${cardClass} divide-y divide-border`}>
          <Summary label="Cuentas" items={banks.filter((b) => b.name.trim()).map((b) => b.name)} />
          {modules.includes("credit_cards") && <Summary label="Tarjetas" items={usedCards.map((c) => c.name)} />}
          {modules.includes("investments") && (
            <Summary label="Inversiones" items={usedInvestments.map((i) => i.name)} />
          )}
          <li className="p-4 text-sm">
            <span className="text-muted">Módulos: </span>
            {MODULES.filter((m) => modules.includes(m))
              .map((m) => moduleInfo[m].label)
              .join(", ") || "solo lo básico"}
          </li>
        </ul>
        <p className="px-1 text-sm text-muted">
          Las categorías de gastos e ingresos ya vienen listas. Para que tus pagos se registren solos, ve
          después a Más → Pagos automáticos.
        </p>
        <FormError message={state?.error} />
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        {stepError && <FormError message={stepError} />}
        {step < last ? (
          <button type="button" onClick={next} className={primaryButtonClass}>
            {step === 0 ? "Empezar" : "Siguiente"}
          </button>
        ) : (
          <SubmitButton>Entrar a la app</SubmitButton>
        )}
        {step > 0 && (
          <button
            type="button"
            onClick={() => {
              setStepError(null);
              setStep((s) => s - 1);
            }}
            className="row-link rounded-xl py-3 font-medium text-muted"
          >
            Atrás
          </button>
        )}
      </div>
    </form>
  );
}

function Chip({ label, onClick, disabled, icon }: { label: string; onClick: () => void; disabled?: boolean; icon?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:border-accent disabled:border-accent disabled:bg-accent/12 disabled:text-accent"
    >
      {icon && <Icon name="plus" className="h-4 w-4" />}
      {label}
      {disabled && <span aria-label="agregada">✓</span>}
    </button>
  );
}

function RowCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className={`${cardClass} relative flex flex-col gap-3 p-4 pr-12`}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar"
        className="absolute top-4 right-2 flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted hover:bg-background hover:text-negative"
      >
        ×
      </button>
    </div>
  );
}

function CurrencySelect({
  show,
  name,
  value,
  onChange,
}: {
  show: boolean;
  name: string;
  value: Currency;
  onChange: (c: Currency) => void;
}) {
  if (!show) return <input type="hidden" name={name} value="COP" />;
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value as Currency)}
      aria-label="Moneda"
      className={inputClass}
    >
      <option>COP</option>
      <option>USD</option>
    </select>
  );
}

function Summary({ label, items }: { label: string; items: string[] }) {
  return (
    <li className="p-4">
      <p className="text-sm text-muted">
        {label} ({items.length})
      </p>
      <p className="font-medium">{items.join(", ") || "Ninguna"}</p>
    </li>
  );
}
