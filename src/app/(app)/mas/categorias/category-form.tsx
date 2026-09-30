"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import {
  categoryKindLabels,
  type Category,
  type CategoryKind,
  type FormState,
} from "@/lib/types";

export function CategoryForm({
  action,
  categories,
  initial,
  defaultKind = "expense",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Category[];
  initial?: Category;
  defaultKind?: CategoryKind;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? defaultKind);
  // Solo un nivel de subcategorías: el padre debe ser una categoría principal del mismo tipo.
  const hasChildren = initial && categories.some((c) => c.parent_id === initial.id);
  const parents = categories.filter((c) => c.kind === kind && !c.parent_id && c.id !== initial?.id);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <div>
          <label htmlFor="icon" className={labelClass}>
            Ícono
          </label>
          <input
            id="icon"
            name="icon"
            maxLength={8}
            defaultValue={initial?.icon ?? ""}
            placeholder="🙂"
            className={`${inputClass} text-center text-xl`}
          />
        </div>
        <div>
          <label htmlFor="name" className={labelClass}>
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={40}
            defaultValue={initial?.name}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="kind" className={labelClass}>
          Tipo
        </label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as CategoryKind)}
          disabled={Boolean(initial)}
          className={inputClass}
        >
          {Object.entries(categoryKindLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {/* Un select deshabilitado no se envía; se manda el valor aparte. */}
        {initial && <input type="hidden" name="kind" value={kind} />}
      </div>

      {!hasChildren && (
        <div>
          <label htmlFor="parent_id" className={labelClass}>
            Dentro de (opcional)
          </label>
          <select
            key={kind}
            id="parent_id"
            name="parent_id"
            defaultValue={initial?.parent_id ?? ""}
            className={inputClass}
          >
            <option value="">— Categoría principal —</option>
            {parents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <FormError message={state?.error} />
      <SubmitButton>{initial ? "Guardar cambios" : "Crear categoría"}</SubmitButton>
    </form>
  );
}
