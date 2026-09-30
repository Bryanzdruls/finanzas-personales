package co.misfinanzas.app;

import android.Manifest;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Puente entre la página (Más → Pagos automáticos) y la captura nativa de Google Wallet.
 * Uso desde JS: src/lib/native.ts.
 */
@CapacitorPlugin(
        name = "PaymentCapture",
        permissions = {@Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})})
public class PaymentCapturePlugin extends Plugin {

    /** Guarda el token y el endpoint; desde ahí el listener empieza a enviar pagos. */
    @PluginMethod
    public void configure(PluginCall call) {
        String token = call.getString("token");
        String endpoint = call.getString("endpoint");
        if (token == null || !token.startsWith("fp_") || endpoint == null || !endpoint.startsWith("https://")) {
            call.reject("Token o endpoint inválido");
            return;
        }
        new PaymentCaptureStore(getContext()).configure(token, endpoint);
        call.resolve(status());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void clear(PluginCall call) {
        new PaymentCaptureStore(getContext()).clear();
        call.resolve(status());
    }

    /** Abre Ajustes → Acceso a notificaciones, donde el usuario activa "Mis Finanzas". */
    @PluginMethod
    public void openListenerSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= 30) {
            intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS);
            intent.putExtra(
                    Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                    new ComponentName(getContext(), WalletNotificationListener.class).flattenToString());
        } else {
            intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception e) {
            // Algunos fabricantes no tienen la pantalla de detalle: se abre la lista general.
            Intent fallback = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(fallback);
        }
        call.resolve();
    }

    /** Permiso para mostrar "Registrado $X" después de cada pago (Android 13+). */
    @PluginMethod
    public void requestResultNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(status());
            return;
        }
        requestPermissionForAlias("notifications", call, "onNotificationsPermission");
    }

    @PermissionCallback
    private void onNotificationsPermission(PluginCall call) {
        call.resolve(status());
    }

    private JSObject status() {
        PaymentCaptureStore store = new PaymentCaptureStore(getContext());
        JSObject result = new JSObject();
        result.put("configured", store.isConfigured());
        result.put(
                "listenerEnabled",
                NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName()));
        result.put(
                "resultNotifications",
                Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED);
        return result;
    }
}
