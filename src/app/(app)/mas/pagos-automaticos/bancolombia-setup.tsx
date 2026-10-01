import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { buildGmailScript } from "@/lib/gmail-script";

// Instrucciones para registrar solos los movimientos de Bancolombia: SMS (Atajo, inmediato) y
// correo (Gmail + Apps Script, respaldo). Si llegan ambos, la base registra uno solo.
export function BancolombiaSetup({ endpoint }: { endpoint: string }) {
  const script = buildGmailScript(endpoint);
  const code = "rounded-lg bg-background px-1 text-xs";

  return (
    <>
      <h2 className={sectionTitleClass}>Bancolombia · SMS (inmediato)</h2>
      <ol className={`${cardClass} flex list-decimal flex-col gap-3 p-4 pl-9 text-sm`}>
        <li>
          Genera un token arriba con el nombre <strong>SMS Bancolombia</strong> y la cuenta por defecto{" "}
          <strong>Bancolombia</strong>.
        </li>
        <li>
          En <strong>Atajos → Automatización → +</strong> elige <strong>Mensaje</strong>. Deja{" "}
          <em>Remitente</em> vacío (iOS falla con los números cortos) y en <em>El mensaje contiene</em> escribe{" "}
          <code className={code}>Bancolombia:</code> (con los dos puntos). Así entran transferencias, QR, pagos,
          compras, Wenia e ingresos. Marca <strong>Ejecutar inmediatamente</strong>.
        </li>
        <li>
          Nuevo atajo en blanco → <strong>Obtener contenido de URL</strong> con esta URL, método{" "}
          <strong>POST</strong> y el encabezado <code className={code}>Authorization</code> ={" "}
          <code className={code}>Bearer TU_TOKEN</code>:
          <code className="mt-1 block rounded-lg bg-background p-2 text-xs break-all select-all">
            {endpoint}
          </code>
        </li>
        <li>
          Cuerpo <strong>JSON</strong> con tres campos de texto:
          <ul className="mt-1 list-disc pl-5">
            <li>
              <code className={code}>source</code> → escribe <code className={code}>bancolombia</code>
            </li>
            <li>
              <code className={code}>channel</code> → escribe <code className={code}>sms</code>
            </li>
            <li>
              <code className={code}>text</code> → <strong>no lo escribas</strong>: elige la burbuja azul{" "}
              <strong>Entrada del atajo</strong> y luego la propiedad <strong>Contenido</strong>
            </li>
          </ul>
        </li>
        <li>
          Opcional: <strong>Obtener valor del diccionario</strong> (<code className={code}>message</code>) y{" "}
          <strong>Mostrar notificación</strong>, igual que con Apple Pay.
        </li>
      </ol>

      <h2 className={sectionTitleClass}>Bancolombia · correo (respaldo)</h2>
      <div className={`${cardClass} flex flex-col gap-3 p-4 text-sm`}>
        <p className="text-muted">
          Revisa tu Gmail cada 5 minutos y, cada noche a las 21:00, <strong>sincroniza los últimos 2 días</strong>{" "}
          para registrar lo que el SMS no haya capturado, sin duplicar. Corre en tu propia cuenta de Google: la
          app no tiene acceso a tu correo.
        </p>
        <ol className="flex list-decimal flex-col gap-3 pl-5">
          <li>
            Genera otro token con el nombre <strong>Gmail Bancolombia</strong>.
          </li>
          <li>
            Abre{" "}
            <a href="https://script.google.com/home/projects/create" className="text-accent underline">
              script.google.com
            </a>{" "}
            con la cuenta donde te llegan las alertas, borra lo que haya y pega el código:
            <div className="mt-2">
              <CopyButton text={script} label="Copiar código" />
            </div>
          </li>
          <li>
            En <strong>⚙ Configuración del proyecto → Propiedades del script</strong> agrega la propiedad{" "}
            <code className={code}>TOKEN</code> con tu token.
          </li>
          <li>
            Vuelve al editor, elige la función <code className={code}>setup</code> y toca <strong>Ejecutar</strong>.
            Autoriza el acceso a Gmail. Si dice &quot;Google no verificó esta app&quot;, toca{" "}
            <em>Configuración avanzada → Ir al proyecto</em>: es tu propio script.
          </li>
          <li>
            Listo. En <strong>Ejecuciones</strong> ves cada revisión. Si el SMS ya registró el movimiento, el
            correo responde &quot;Ya estaba registrado&quot;. Para ponerte al día de una semana, ejecuta una vez{" "}
            <code className={code}>sincronizar7dias</code>.
          </li>
          <li>
            ¿Ya tenías el script instalado? Pega el código nuevo encima y vuelve a ejecutar{" "}
            <code className={code}>setup</code> para crear la sincronización nocturna.
          </li>
        </ol>
        <details>
          <summary className="cursor-pointer text-muted">Ver el código</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-background p-3 text-xs">{script}</pre>
        </details>
      </div>

      <p className="mt-3 px-1 text-sm text-muted">
        ¿Se escapó alguno? Cópialo desde Mensajes y pégalo en{" "}
        <Link href="/movimientos/importar" className="text-accent underline">
          Importar SMS
        </Link>
        .
      </p>
    </>
  );
}
