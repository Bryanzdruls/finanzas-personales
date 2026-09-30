"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import { withFullNames } from "@/lib/categories";
import type { Category } from "@/lib/types";
import { saveRule } from "./actions";

export function RuleForm({ categories }: { categories: Category[] }) {
  const [state, formAction] = useActionState(saveRule, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const expenseCategories = withFullNames(categories.filter((c) => c.kind === "expense"));

  // Tras guardar con éxito, limpiar el formulario para agregar otra regla.
  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="pattern" className={labelClass}>
          Si el comercio contiene
        </label>
        <input
          id="pattern"
          name="pattern"
          required
          minLength={2}
          maxLength={80}
          placeholder="Ej: uber, rappi, exito"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="category_id" className={labelClass}>
          Categoría
        </label>
        <select id="category_id" name="category_id" required className={inputClass}>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.fullName}
            </option>
          ))}
        </select>
      </div>
      <FormError message={state?.error} />
      <SubmitButton>Guardar regla</SubmitButton>
    </form>
  );
}
