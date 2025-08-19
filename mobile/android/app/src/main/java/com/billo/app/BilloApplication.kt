package com.billo.app

import android.app.Application
import android.content.Context
import com.billo.app.di.AppModule
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

@HiltAndroidApp
class BilloApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Timber for logging in debug builds
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }
        
        // Initialize app components
        initApp()
    }
    
    private fun initApp() {
        // Any additional app initialization can go here
        Timber.d("BilloApplication initialized")
    }
    
    companion object {
        // Application context for places where activity context is not available
        lateinit var context: Context
            private set
    }
}
