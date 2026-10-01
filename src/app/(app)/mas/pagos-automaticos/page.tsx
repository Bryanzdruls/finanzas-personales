import { headers } from "next/headers";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { PlatformSwitch } from "@/components/platform-switch";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { getAccounts } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { revokeToken, updateTokenAccount } from "./actions";
import { AndroidCapture } from "./android-capture";
import { BancolombiaSetup } from "./bancolombia-setup";
import { IngestHistory } from "./ingest-history";
import { TokenAccount } from "./token-account";
import { TokenForm } from "./token-form";

type Token = {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  default_account_id: string;
  account: { name: string };
};

export default async function PagosAutomaticosPage() {
  const supabase = await createClient();
  const [{ data: tokens, error }, accounts, headerList] = await Promise.all([
    supabase
      .from("api_tokens")
      .select(
        "id, name, last_used_at, created_at, default_account_id, account:accounts!api_tokens_default_account_id_user_id_fkey(name)",
      )
      .order("created_at")
      .returns<Token[]>(),
    getAccounts(),
    headers(),
  ]);
  if (error) throw new Error(error.message);

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const endpoint = `${protocol}://${host}/api/apple-pay`;
  const ingestEndpoint = `${protocol}://${host}/api/ingest`;

  return (
    <>
      <PageHeader title="Pagos automáticos" backHref="/mas" />
      <p className="px-1 text-sm text-muted">
        Los pagos con Apple Pay o Google Wallet y los movimientos de Bancolombia se registran solos y quedan en{" "}
        <strong>Por revisar</strong> para que confirmes categoría y cuenta.
      </p>

      <IngestHistory />

      {tokens.length > 0 && <h2 className={sectionTitleClass}>Conectados</h2>}
      {tokens.length > 0 && (
        <ul className={`${cardClass} mb-3 divide-y divide-border`}>
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.last_used_at
                    ? `usado ${formatShortDate(t.last_used_at.slice(0, 10))}`
                    : "sin usar todavía"}
                </p>
                <TokenAccount
                  action={updateTokenAccount.bind(null, t.id)}
                  accounts={accounts}
                  value={t.default_account_id}
                />
              </div>
              <DeleteButton
                compact
                action={revokeToken.bind(null, t.id)}
                confirmMessage={`¿Revocar "${t.name}"? El Atajo o teléfono que lo use dejará de registrar pagos.`}
                label="Revocar token"
              />
            </li>
          ))}
        </ul>
      )}
      <PlatformSwitch
        android={
          <>
            <h2 className={sectionTitleClass}>Google Wallet en este teléfono</h2>
            <div className={`${cardClass} p-4`}>
              <AndroidCapture accounts={accounts} />
            </div>
          </>
        }
        web={
          <>
            <h2 className={sectionTitleClass}>Apple Pay · 1. Token del Atajo</h2>
            <div className={`${cardClass} p-4`}>
              <TokenForm accounts={accounts} />
            </div>

            <h2 className={sectionTitleClass}>Apple Pay · 2. Crear la automatización</h2>
            <ol className={`${cardClass} flex list-decimal flex-col gap-3 p-4 pl-9 text-sm`}>
              <li>
                Abre <strong>Atajos</strong> → pestaña <strong>Automatización</strong> → <strong>+</strong> →{" "}
                <strong>Transacción</strong>.
              </li>
              <li>
                Elige las tarjetas de Wallet que quieras registrar y marca{" "}
                <strong>Ejecutar inmediatamente</strong>.
              </li>
              <li>
                Crea un atajo nuevo y agrega la acción <strong>Obtener contenido de URL</strong> con esta URL:
                <code className="mt-1 block rounded-lg bg-background p-2 text-xs break-all select-all">
                  {endpoint}
                </code>
              </li>
              <li>
                Toca la flecha de la acción: <strong>Método</strong> = POST.
              </li>
              <li>
                En <strong>Encabezados</strong> agrega la clave <code>Authorization</code> con el valor{" "}
                <code>Bearer TU_TOKEN</code> (la palabra Bearer, un espacio y el token).
              </li>
              <li>
                En <strong>Cuerpo de la solicitud</strong> elige <strong>JSON</strong> y agrega tres campos de
                texto. La <em>clave</em> se escribe; el <em>valor</em> <strong>no se escribe</strong>: toca el
                campo, elige la burbuja azul <strong>Entrada del atajo</strong> y luego tócala para escoger la
                propiedad:
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <code>amount</code> → burbuja <strong>Entrada del atajo</strong> › propiedad{" "}
                    <strong>Importe</strong> (o Monto)
                  </li>
                  <li>
                    <code>merchant</code> → burbuja <strong>Entrada del atajo</strong> › propiedad{" "}
                    <strong>Comerciante</strong>
                  </li>
                  <li>
                    <code>card</code> → burbuja <strong>Entrada del atajo</strong> › propiedad{" "}
                    <strong>Tarjeta o pase</strong>
                  </li>
                </ul>
                <p className="mt-1 text-xs text-muted">
                  Si en el valor ves letras normales en vez de una burbuja azul, está escrito a mano y no
                  funcionará.
                </p>
              </li>
              <li>
                Opcional: agrega <strong>Mostrar notificación</strong> con el resultado para confirmar cada
                registro.
              </li>
            </ol>
            <p className="mt-2 px-1 text-xs text-muted">
              Los nombres exactos de los campos pueden variar según el idioma de tu iPhone.
            </p>

            <BancolombiaSetup endpoint={ingestEndpoint} />
          </>
        }
      />
    </>
  );
}
