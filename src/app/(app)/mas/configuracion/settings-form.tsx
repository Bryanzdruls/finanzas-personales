"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, inputClass, labelClass, sectionTitleClass } from "@/components/ui";
import { MODULES, moduleInfo } from "@/lib/modules";
import type { Profile } from "@/lib/profile";
import { saveSettings } from "./actions";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(saveSettings, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label htmlFor="display_name" className={labelClass}>
          Tu nombre
        </label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          maxLength={60}
          className={inputClass}
        />
      </div>

      <div>
        <h2 className={`${sectionTitleClass} mt-2`}>Módulos</h2>
        <ul className={`${cardClass} divide-y divide-border overflow-hidden`}>
          {MODULES.map((m) => (
            <li key={m}>
              <label className="row-link flex items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{moduleInfo[m].label}</span>
                  <span className="block text-sm text-muted">{moduleInfo[m].description}</span>
                </span>
                <input
                  type="checkbox"
                  name="modules"
                  value={m}
                  defaultChecked={profile.modules.includes(m)}
                  className="h-5 w-5 shrink-0 accent-accent"
                />
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-xs text-muted">
          Apagar un módulo solo lo oculta de Inicio y de los formularios; tus cuentas y movimientos no se borran.
        </p>
      </div>

      <FormError message={state?.error} />
      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}
