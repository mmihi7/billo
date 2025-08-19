package com.billo.app.ui.splash

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.billo.app.R
import com.billo.app.ui.MainActivity
import com.billo.app.ui.device.DeviceViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {

    private val viewModel: DeviceViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)
        
        // Observe device initialization
        observeViewModel()
        
        // Initialize device
        viewModel.initializeDevice()
    }
    
    private fun observeViewModel() {
        lifecycleScope.launch {
            // Wait for device to be ready or error to occur
            viewModel.device.collect { device ->
                if (device != null) {
                    // Device is ready, proceed to main activity
                    navigateToMain()
                }
            }
        }
        
        // Handle errors
        lifecycleScope.launch {
            viewModel.error.collect { error ->
                error?.let {
                    // Show error message and retry after delay
                    // In a real app, you'd show a proper error dialog
                    delay(2000) // Show error for 2 seconds
                    viewModel.clearError()
                    viewModel.initializeDevice()
                }
            }
        }
    }
    
    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
