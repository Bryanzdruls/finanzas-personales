package co.misfinanzas.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;

/**
 * Configuración de la captura de pagos, en las preferencias privadas de la app (otras apps no
 * pueden leerlas). El token solo permite crear gastos "por revisar" y se puede revocar desde la
 * app en Más → Pagos automáticos.
 */
class PaymentCaptureStore {

    private static final String PREFS = "payment_capture";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_ENDPOINT = "endpoint";
    private static final String KEY_LAST_SEEN = "last_seen";
    private static final String KEY_PENDING = "pending";

    private final SharedPreferences prefs;

    PaymentCaptureStore(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    boolean isConfigured() {
        return getToken() != null && getEndpoint() != null;
    }

    String getToken() {
        return prefs.getString(KEY_TOKEN, null);
    }

    String getEndpoint() {
        return prefs.getString(KEY_ENDPOINT, null);
    }

    void configure(String token, String endpoint) {
        prefs.edit().putString(KEY_TOKEN, token).putString(KEY_ENDPOINT, endpoint).apply();
    }

    void clear() {
        prefs.edit().clear().apply();
    }

    /** Devuelve false si esta notificación ya se procesó. */
    synchronized boolean markSeen(String key) {
        if (key.equals(prefs.getString(KEY_LAST_SEEN, null))) return false;
        prefs.edit().putString(KEY_LAST_SEEN, key).apply();
        return true;
    }

    synchronized void addPending(String payload, int max) {
        JSONArray pending = readPending();
        pending.put(payload);
        // Se conservan solo los más recientes.
        JSONArray trimmed = new JSONArray();
        for (int i = Math.max(0, pending.length() - max); i < pending.length(); i++) {
            trimmed.put(pending.opt(i));
        }
        prefs.edit().putString(KEY_PENDING, trimmed.toString()).apply();
    }

    synchronized JSONArray takePending() {
        JSONArray pending = readPending();
        prefs.edit().remove(KEY_PENDING).apply();
        return pending;
    }

    private JSONArray readPending() {
        try {
            return new JSONArray(prefs.getString(KEY_PENDING, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }
}
