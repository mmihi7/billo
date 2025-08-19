package com.billo.app.ui

import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.findNavController
import androidx.navigation.ui.setupWithNavController
import com.billo.app.R
import com.billo.app.databinding.ActivityMainBinding
import com.billo.app.ui.device.DeviceViewModel
import com.google.android.material.bottomnavigation.BottomNavigationView
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: DeviceViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupNavigation()
        observeDeviceStatus()
    }

    private fun setupNavigation() {
        val navView: BottomNavigationView = binding.navView
        val navController = findNavController(R.id.nav_host_fragment)
        
        // Set up bottom navigation
        navView.setupWithNavController(navController)
        
        // Handle navigation item selection
        navView.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.navigation_orders -> {
                    navController.navigate(R.id.navigation_orders)
                    true
                }
                R.id.navigation_tab -> {
                    navController.navigate(R.id.navigation_tab)
                    true
                }
                R.id.navigation_profile -> {
                    navController.navigate(R.id.navigation_profile)
                    true
                }
                else -> false
            }
        }
    }

    private fun observeDeviceStatus() {
        viewModel.device.observe(this) { device ->
            device?.let {
                // Device is ready, update UI if needed
                supportActionBar?.title = getString(R.string.app_name)
            }
        }
        
        viewModel.error.observe(this) { error ->
            error?.let {
                // Show error to user
                // In a real app, show a proper error dialog
                binding.errorText.text = it
                binding.errorText.visibility = android.view.View.VISIBLE
            } ?: run {
                binding.errorText.visibility = android.view.View.GONE
            }
        }
    }
}
