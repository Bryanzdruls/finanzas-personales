package co.misfinanzas.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Los plugins propios se registran antes de crear el bridge.
        registerPlugin(PaymentCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
