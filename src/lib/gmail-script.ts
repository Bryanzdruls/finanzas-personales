// Código de Google Apps Script que el usuario pega en script.google.com (Más → Pagos
// automáticos). Revisa cada 5 minutos los correos de alertas de Bancolombia y los envía a
// /api/ingest. Corre en la cuenta de Gmail del usuario: la app nunca ve su correo.
//
// Se registran los IDs de mensaje ya enviados (no etiquetas) porque Gmail agrupa las alertas
// con el mismo asunto en una sola conversación.
export const BANCOLOMBIA_SENDER = "alertasynotificaciones@an.notificacionesbancolombia.com";

export function buildGmailScript(endpoint: string) {
  return `// Mis Finanzas: registra automáticamente las alertas de Bancolombia que llegan a este Gmail.
// 1) Proyecto → Configuración (⚙) → Propiedades del script → agrega TOKEN = tu token fp_...
// 2) Elige la función "setup" arriba y toca Ejecutar (autoriza Gmail la primera vez).
const ENDPOINT = ${JSON.stringify(endpoint)};
const QUERY = "from:${BANCOLOMBIA_SENDER} newer_than:2d";
const MAX_IDS = 300;

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("TOKEN")) throw new Error("Primero agrega la propiedad TOKEN (Configuración → Propiedades del script).");
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("revisarCorreos").timeBased().everyMinutes(5).create();
  // Los correos que ya están en la bandeja no se envían: solo los que lleguen desde ahora.
  const ids = mensajes_().map((m) => m.getId());
  props.setProperty("PROCESADOS", JSON.stringify(ids.slice(-MAX_IDS)));
  console.log("Listo. Se revisará cada 5 minutos. Correos existentes marcados: " + ids.length);
}

function revisarCorreos() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("TOKEN");
  if (!token) return;
  const procesados = JSON.parse(props.getProperty("PROCESADOS") || "[]");

  for (const msg of mensajes_()) {
    const id = msg.getId();
    if (procesados.includes(id)) continue;
    const text = (msg.getSubject() + " " + msg.getPlainBody()).replace(/\\s+/g, " ").slice(0, 4000);
    const res = UrlFetchApp.fetch(ENDPOINT, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify({ source: "bancolombia", channel: "email", text: text }),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    console.log(code + " " + res.getContentText());
    // Error del servidor o de red: se reintenta en la próxima ejecución.
    if (code >= 500) continue;
    procesados.push(id);
  }
  props.setProperty("PROCESADOS", JSON.stringify(procesados.slice(-MAX_IDS)));
}

function mensajes_() {
  return GmailApp.search(QUERY, 0, 30).flatMap((thread) => thread.getMessages());
}
`;
}
