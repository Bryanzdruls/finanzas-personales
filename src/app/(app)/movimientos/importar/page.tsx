import { PageHeader } from "@/components/page-header";
import { getAccounts } from "@/lib/queries";
import { ImportForm } from "./import-form";

// Para los movimientos que el Atajo no capturó: se copian los SMS desde Mensajes y se pegan aquí.
export default async function ImportarPage() {
  return (
    <>
      <PageHeader title="Importar SMS" backHref="/movimientos" />
      <p className="mb-4 px-1 text-sm text-muted">
        En Mensajes, mantén presionado cada SMS de Bancolombia → Copiar, y pégalos aquí (puedes pegar
        varios seguidos). Los que ya estén registrados no se duplican.
      </p>
      <ImportForm accounts={await getAccounts()} />
    </>
  );
}
