package com.billo.app.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.findNavController
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import com.billo.app.R
import com.billo.app.auth.GoogleSignInHelper
import com.billo.app.databinding.ActivityMainBinding
import com.billo.app.viewmodel.AuthViewModel
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.snackbar.Snackbar
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val authViewModel: AuthViewModel by viewModels()
    private lateinit var googleSignInHelper: GoogleSignInHelper
    
    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            handleGoogleSignInResult(result.data)
        } else {
            showError("Sign in was cancelled")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        googleSignInHelper = GoogleSignInHelper(this)
        setupNavigation()
        observeAuthState()
    }
    
    private fun observeAuthState() {
        authViewModel.currentUser.observe(this) { user ->
            user?.let {
                // User is signed in
                // Update UI accordingly
            } ?: run {
                // User is signed out
                // Handle sign out UI
            }
        }
    }
    
    private fun handleGoogleSignInResult(data: Intent?) {
        lifecycleScope.launch {
            try {
                val result = googleSignInHelper.handleSignInResult(data)
                result.onSuccess {
                    // Successfully signed in with Google
                    authViewModel.setCurrentUser(it.currentUser)
                }.onFailure { exception ->
                    showError(exception.message ?: "Google sign in failed")
                }
            } catch (e: Exception) {
                showError(e.message ?: "An error occurred")
            }
        }
    }
    
    private fun showError(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
    }

    private fun setupNavigation() {
        val navView: BottomNavigationView = binding.navView
        val navController = findNavController(R.id.nav_host_fragment)
        
        // Set up the bottom navigation
        navView.setupWithNavController(navController)
        
        // Set up the ActionBar with navigation controller
        val appBarConfiguration = AppBarConfiguration(
            setOf(
                R.id.navigation_home,
                R.id.navigation_saved_restaurants,
                R.id.navigation_easy_billing
            )
        )
        setupActionBarWithNavController(navController, appBarConfiguration)
        
        // Hide action bar title
        supportActionBar?.setDisplayShowTitleEnabled(false)
    }
    
    override fun onSupportNavigateUp(): Boolean {
        val navController = findNavController(R.id.nav_host_fragment)
        return navController.navigateUp() || super.onSupportNavigateUp()
    }
}
