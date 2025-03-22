package com.yurayura.studio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.splashscreen.SplashScreen;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Show the splash screen until the app is ready
        SplashScreen.show(this);
        super.onCreate(savedInstanceState);
    }
}
