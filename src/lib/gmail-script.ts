// Código de Google Apps Script que el usuario pega en script.google.com (Más → Pagos
// automáticos). Corre en la cuenta de Gmail del usuario: la app nunca ve su correo.
// El SMS registra en tiempo real; el correo es el respaldo de fin de día:
// - sincronizar: cada noche a las 21:00 reenvía los correos de alertas de los últimos 2 días; el
//   servidor descarta los que ya estaban (por SMS o pegados), así entran solo los que faltan.
// - sincronizar7dias: para ponerse al día a mano.
export const BANCOLOMBIA_SENDER = "alertasynotificaciones@an.notificacionesbancolombia.com";

export function buildGmailScript(endpoint: string) {
  return `// Mis Finanzas: cada noche registra las alertas de Bancolombia de este Gmail que falten.
// 1) Proyecto → Configuración (⚙) → Propiedades del script → agrega TOKEN = tu token fp_...
// 2) Elige la función "setup" arriba y toca Ejecutar (autoriza Gmail la primera vez).
const ENDPOINT = ${JSON.stringify(endpoint)};
const SENDER = "${BANCOLOMBIA_SENDER}";

function setup() {
  if (!PropertiesService.getScriptProperties().getProperty("TOKEN")) {
    throw new Error("Primero agrega la propiedad TOKEN (Configuración → Propiedades del script).");
  }
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("sincronizar").timeBased().atHour(21).everyDays(1).create();
  console.log("Listo: sincronización diaria a las 21:00 (últimos 2 días).");
}

// Fin del día: reenvía todo lo de los últimos días; los repetidos se descartan en el servidor.
function sincronizar(dias) {
  const n = typeof dias === "number" ? dias : 2;
  let enviados = 0;
  for (const msg of mensajes_(n)) if (enviar_(msg)) enviados++;
  console.log("Sincronización de " + n + " días: " + enviados + " correos revisados.");
}

function sincronizar7dias() {
  sincronizar(7);
}

function enviar_(msg) {
  const token = PropertiesService.getScriptProperties().getProperty("TOKEN");
  if (!token) return false;
  const text = (msg.getSubject() + " " + msg.getPlainBody()).replace(/\\s+/g, " ").slice(0, 4000);
  const res = UrlFetchApp.fetch(ENDPOINT, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify({ source: "bancolombia", channel: "sync", text: text }),
    muteHttpExceptions: true,
  });
  console.log(res.getResponseCode() + " " + res.getContentText());
  return res.getResponseCode() < 500;
}

function mensajes_(dias) {
  return GmailApp.search("from:" + SENDER + " newer_than:" + dias + "d", 0, 100)
    .flatMap((thread) => thread.getMessages());
}
`;
}
