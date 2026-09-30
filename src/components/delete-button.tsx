"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/types";
import { FormError } from "./form-error";

export function DeleteButton({
  action,
  confirmMessage,
  label = "Eliminar",
  compact = false,
}: {
  action: () => Promise<FormState>;
  confirmMessage: string;
  label?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (compact) {
    return (
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm(confirmMessage)) e.preventDefault();
        }}
      >
        <button
          type="submit"
          disabled={pending}
          aria-label={label}
          title={state?.error ?? label}
          className="px-2 text-lg text-muted disabled:opacity-50"
        >
          ×
        </button>
      </form>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
      className="mt-6 flex flex-col gap-3"
    >
      <FormError message={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl px-4 py-3 font-semibold text-negative disabled:opacity-50"
      >
        {pending ? "Eliminando…" : label}
      </button>
    </form>
  );
}
