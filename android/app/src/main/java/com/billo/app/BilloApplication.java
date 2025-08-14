package com.billo.app;

import android.content.Context;
import androidx.multidex.MultiDexApplication;

public class BilloApplication extends MultiDexApplication {
    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        androidx.multidex.MultiDex.install(this);
    }
}
