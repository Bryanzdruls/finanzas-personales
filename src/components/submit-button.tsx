"use client";

import { useFormStatus } from "react-dom";
import { primaryButtonClass } from "./ui";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryButtonClass}>
      {pending ? "Guardando…" : children}
    </button>
  );
}
