import { headers } from "next/headers";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { getAccounts } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { revokeToken } from "./actions";
import { TokenForm } from "./token-form";

type Token = {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  account: { name: string };
};

export default async function ApplePayPage() {
  const supabase = await createClient();
  const [{ data: tokens, error }, accounts, headerList] = await Promise.all([
    supabase
      .from("api_tokens")
      .select(
        "id, name, last_used_at, created_at, account:accounts!api_tokens_default_account_id_user_id_fkey(name)",
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

  return (
    <>
      <PageHeader title="Apple Pay" backHref="/mas" />
      <p className="px-1 text-sm text-muted">
        Cada vez que pagues con Apple Pay, un Atajo de iOS registra el gasto aquí. Queda en{" "}
        <strong>Por revisar</strong> para que confirmes categoría y cuenta.
      </p>

      <h2 className={sectionTitleClass}>1. Token del Atajo</h2>
      {tokens.length > 0 && (
        <ul className={`${cardClass} mb-3 divide-y divide-border`}>
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.account.name} ·{" "}
                  {t.last_used_at
                    ? `usado ${formatShortDate(t.last_used_at.slice(0, 10))}`
                    : "sin usar todavía"}
                </p>
              </div>
              <DeleteButton
                compact
                action={revokeToken.bind(null, t.id)}
                confirmMessage={`¿Revocar el token "${t.name}"? El Atajo que lo use dejará de funcionar.`}
                label="Revocar token"
              />
            </li>
          ))}
        </ul>
      )}
      <div className={`${cardClass} p-4`}>
        <TokenForm accounts={accounts} />
      </div>

      <h2 className={sectionTitleClass}>2. Crear la automatización</h2>
      <ol className={`${cardClass} flex list-decimal flex-col gap-3 p-4 pl-9 text-sm`}>
        <li>
          Abre <strong>Atajos</strong> → pestaña <strong>Automatización</strong> → <strong>+</strong> →{" "}
          <strong>Transacción</strong>.
        </li>
        <li>
          Elige las tarjetas de Wallet que quieras registrar y marca <strong>Ejecutar inmediatamente</strong>.
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
          texto, tomando cada valor de la <strong>Entrada del atajo</strong>:
          <ul className="mt-1 list-disc pl-5">
            <li>
              <code>amount</code> → Importe / Monto
            </li>
            <li>
              <code>merchant</code> → Comerciante
            </li>
            <li>
              <code>card</code> → Tarjeta o pase
            </li>
          </ul>
        </li>
        <li>
          Opcional: agrega <strong>Mostrar notificación</strong> con el resultado para confirmar cada registro.
        </li>
      </ol>
      <p className="mt-2 px-1 text-xs text-muted">
        Los nombres exactos de los campos pueden variar según el idioma de tu iPhone.
      </p>
    </>
  );
}
