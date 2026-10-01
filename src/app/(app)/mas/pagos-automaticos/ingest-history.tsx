import { cardClass, sectionTitleClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { sourceLabels } from "@/lib/types";

type IngestEvent = {
  id: string;
  source: string;
  status: number;
  message: string;
  payload: string | null;
  created_at: string;
};

const when = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

// Lo que llegó en cada intento y qué respondió la app: iOS no muestra el historial de los
// Atajos, así que aquí se ve qué mandó realmente la automatización.
export async function IngestHistory() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingest_events")
    .select("id, source, status, message, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<IngestEvent[]>();
  // Antes de aplicar la migración la tabla no existe: simplemente no se muestra.
  if (error) return null;

  return (
    <>
      <h2 className={sectionTitleClass}>Últimos intentos</h2>
      {data.length === 0 ? (
        <p className={`${cardClass} p-4 text-sm text-muted`}>
          Aún no ha llegado nada. Ejecuta el Atajo o haz un pago para verlo aquí.
        </p>
      ) : (
        <ul className={`${cardClass} divide-y divide-border`}>
          {data.map((e) => {
            const ok = e.status === 200;
            return (
              <li key={e.id} className="p-4 text-sm">
                <div className="flex items-start gap-2">
                  <span aria-label={ok ? "Correcto" : "Error"}>{ok ? "✅" : "⚠️"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={ok ? "" : "text-negative"}>{e.message}</p>
                    <p className="text-xs text-muted">
                      {sourceLabels[e.source] ?? e.source} · {when.format(new Date(e.created_at))}
                    </p>
                    {e.payload && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-muted">Lo que llegó</summary>
                        <pre className="mt-1 overflow-x-auto rounded-lg bg-background p-2 text-xs whitespace-pre-wrap break-all">
                          {pretty(e.payload)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function pretty(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}
