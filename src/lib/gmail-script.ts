// Código de Google Apps Script que el usuario pega en script.google.com (Más → Pagos
// automáticos). Corre en la cuenta de Gmail del usuario: la app nunca ve su correo.
// - revisarCorreos: cada 5 minutos, envía los correos de alertas nuevos.
// - sincronizar: cada noche a las 21:00, reenvía los de los últimos 2 días; el servidor descarta
//   los que ya estaban (SMS, correo o pegados), así entran los que se hayan escapado.
// - sincronizar7dias: para ponerse al día a mano.
//
// Se registran los IDs de mensaje ya enviados (no etiquetas) porque Gmail agrupa las alertas
// con el mismo asunto en una sola conversación.
export const BANCOLOMBIA_SENDER = "alertasynotificaciones@an.notificacionesbancolombia.com";

export function buildGmailScript(endpoint: string) {
  return `// Mis Finanzas: registra automáticamente las alertas de Bancolombia que llegan a este Gmail.
// 1) Proyecto → Configuración (⚙) → Propiedades del script → agrega TOKEN = tu token fp_...
// 2) Elige la función "setup" arriba y toca Ejecutar (autoriza Gmail la primera vez).
const ENDPOINT = ${JSON.stringify(endpoint)};
const SENDER = "${BANCOLOMBIA_SENDER}";
const MAX_IDS = 300;

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("TOKEN")) throw new Error("Primero agrega la propiedad TOKEN (Configuración → Propiedades del script).");
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("revisarCorreos").timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger("sincronizar").timeBased().atHour(21).everyDays(1).create();
  // Los correos que ya están en la bandeja no se envían ahora: los recoge la sincronización.
  const ids = mensajes_(2).map((m) => m.getId());
  props.setProperty("PROCESADOS", JSON.stringify(ids.slice(-MAX_IDS)));
  console.log("Listo: revisión cada 5 minutos y sincronización diaria a las 21:00.");
}

// Correos nuevos desde la última revisión.
function revisarCorreos() {
  const props = PropertiesService.getScriptProperties();
  const procesados = JSON.parse(props.getProperty("PROCESADOS") || "[]");
  for (const msg of mensajes_(2)) {
    const id = msg.getId();
    if (procesados.includes(id)) continue;
    if (enviar_(msg, "email")) procesados.push(id);
  }
  props.setProperty("PROCESADOS", JSON.stringify(procesados.slice(-MAX_IDS)));
}

// Fin del día: reenvía todo lo de los últimos días; los repetidos se descartan en el servidor.
function sincronizar(dias) {
  const n = typeof dias === "number" ? dias : 2;
  let enviados = 0;
  for (const msg of mensajes_(n)) if (enviar_(msg, "sync")) enviados++;
  console.log("Sincronización de " + n + " días: " + enviados + " correos revisados.");
}

function sincronizar7dias() {
  sincronizar(7);
}

function enviar_(msg, channel) {
  const token = PropertiesService.getScriptProperties().getProperty("TOKEN");
  if (!token) return false;
  const text = (msg.getSubject() + " " + msg.getPlainBody()).replace(/\\s+/g, " ").slice(0, 4000);
  const res = UrlFetchApp.fetch(ENDPOINT, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify({ source: "bancolombia", channel: channel, text: text }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  console.log(code + " " + res.getContentText());
  // Error del servidor o de red: se reintenta en la próxima ejecución.
  return code < 500;
}

function mensajes_(dias) {
  return GmailApp.search("from:" + SENDER + " newer_than:" + dias + "d", 0, 100)
    .flatMap((thread) => thread.getMessages());
}
`;
}
