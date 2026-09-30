"use client";

import { cardClass, primaryButtonClass } from "@/components/ui";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className={`${cardClass} mt-6 flex flex-col gap-4 p-6`}>
      <p role="alert" className="text-negative">
        No se pudieron cargar los datos: {error.message}
      </p>
      <button type="button" onClick={reset} className={primaryButtonClass}>
        Reintentar
      </button>
    </div>
  );
}
