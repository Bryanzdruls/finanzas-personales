package co.misfinanzas.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Escucha las notificaciones de Google Wallet que aparecen después de pagar con el teléfono y
 * envía su título y texto a /api/ingest. El servidor interpreta el monto y el comercio, así que
 * si Google cambia el formato basta con un deploy, sin reinstalar la app.
 *
 * Android mantiene este servicio vivo aunque la app esté cerrada, una vez el usuario concede
 * "Acceso a notificaciones" en Ajustes.
 */
public class WalletNotificationListener extends NotificationListenerService {

    private static final String TAG = "MisFinanzasWallet";
    private static final String WALLET_PACKAGE = "com.google.android.apps.walletnfcrel";
    // En builds de depuración se aceptan notificaciones de adb para probar sin pagar.
    private static final String SHELL_PACKAGE = "com.android.shell";
    private static final String RESULT_CHANNEL = "pagos_registrados";
    private static final int MAX_PENDING = 20;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String pkg = sbn.getPackageName();
        boolean fromWallet = WALLET_PACKAGE.equals(pkg);
        boolean fromShell = BuildConfig.DEBUG && SHELL_PACKAGE.equals(pkg);
        if (!fromWallet && !fromShell) return;

        Notification notification = sbn.getNotification();
        if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;

        PaymentCaptureStore store = new PaymentCaptureStore(this);
        if (!store.isConfigured()) return;
        // Google Wallet a veces actualiza la misma notificación; se envía una sola vez.
        if (!store.markSeen(sbn.getKey() + "|" + sbn.getPostTime())) return;

        Bundle extras = notification.extras;
        String title = charSeq(extras.getCharSequence(Notification.EXTRA_TITLE));
        CharSequence big = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        String text = charSeq(big != null ? big : extras.getCharSequence(Notification.EXTRA_TEXT));
        if (title == null && text == null) return;

        JSONObject payload = new JSONObject();
        try {
            payload.put("source", "google_pay");
            payload.put("title", title == null ? JSONObject.NULL : title);
            payload.put("text", text == null ? JSONObject.NULL : text);
        } catch (Exception e) {
            return;
        }

        executor.execute(() -> {
            flushPending(store);
            send(store, payload, true);
        });
    }

    /** Envía un pago. Si falla la red, lo deja pendiente para el próximo intento. */
    private void send(PaymentCaptureStore store, JSONObject payload, boolean notifyResult) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(store.getEndpoint()).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + store.getToken());
            try (OutputStream out = conn.getOutputStream()) {
                out.write(payload.toString().getBytes(StandardCharsets.UTF_8));
            }

            int status = conn.getResponseCode();
            InputStream stream = status < 400 ? conn.getInputStream() : conn.getErrorStream();
            String message = readMessage(stream);
            Log.i(TAG, "ingest " + status + ": " + message);
            // 422 = no era un pago (p. ej. "tarjeta lista"): no se avisa ni se reintenta.
            if (notifyResult && status != 422) showResult(status == 200, message);
        } catch (Exception e) {
            Log.w(TAG, "Sin conexión, se reintentará", e);
            store.addPending(payload.toString(), MAX_PENDING);
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void flushPending(PaymentCaptureStore store) {
        JSONArray pending = store.takePending();
        for (int i = 0; i < pending.length(); i++) {
            try {
                send(store, new JSONObject(pending.getString(i)), false);
            } catch (Exception ignored) {
                // Entrada corrupta: se descarta.
            }
        }
    }

    private static String readMessage(InputStream stream) {
        if (stream == null) return "";
        try (Scanner scanner = new Scanner(stream, "UTF-8").useDelimiter("\\A")) {
            String body = scanner.hasNext() ? scanner.next() : "";
            return new JSONObject(body).optString("message", "");
        } catch (Exception e) {
            return "";
        }
    }

    /** Notificación propia con el resultado ("Registrado $45.000 en ..."). */
    private void showResult(boolean ok, String message) {
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new NotificationChannel(
                    RESULT_CHANNEL, "Pagos registrados", NotificationManager.IMPORTANCE_LOW));
        }
        Notification n = new NotificationCompat.Builder(this, RESULT_CHANNEL)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(ok ? "Mis Finanzas" : "Mis Finanzas: no se registró")
                .setContentText(message.isEmpty() ? (ok ? "Pago registrado" : "Error al registrar") : message)
                .setAutoCancel(true)
                .build();
        manager.notify((int) (System.currentTimeMillis() % Integer.MAX_VALUE), n);
    }

    private static String charSeq(CharSequence value) {
        if (value == null) return null;
        String s = value.toString().trim();
        return s.isEmpty() ? null : s;
    }
}
