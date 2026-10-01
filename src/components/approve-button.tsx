"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/types";

export function ApproveButton({ action }: { action: () => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        aria-label="Confirmar"
        title={state?.error ?? "Confirmar así"}
        className="tap flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
      >
        ✓
      </button>
    </form>
  );
}
