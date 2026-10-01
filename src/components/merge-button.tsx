"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/types";
import { FormError } from "./form-error";

export function MergeButton({
  action,
  confirmMessage,
  label = "Fusionar",
  wide = false,
}: {
  action: () => Promise<FormState>;
  confirmMessage: string;
  label?: string;
  wide?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
      className={wide ? "mb-4 flex flex-col gap-2" : undefined}
    >
      {wide && <FormError message={state?.error} />}
      <button
        type="submit"
        disabled={pending}
        title={state?.error ?? label}
        className={`rounded-full border border-negative/40 font-medium text-negative disabled:opacity-50 ${
          wide ? "w-full px-4 py-3" : "px-3 py-1.5 text-xs"
        }`}
      >
        {pending ? "Fusionando…" : label}
      </button>
    </form>
  );
}
