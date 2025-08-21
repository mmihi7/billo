package com.billo.app.ui.qr

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.billo.app.R
import com.billo.app.databinding.FragmentQrScannerBinding
import com.bill.app.ui.dialogs.ErrorDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DefaultDecoderFactory
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class QrScannerFragment : Fragment() {

    private var _binding: FragmentQrScannerBinding? = null
    private val binding get() = _binding!!
    private var isFlashOn = false
    private var isProcessingResult = false

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            startCamera()
        } else {
            showError(getString(R.string.camera_permission_required))
            findNavController().navigateUp()
        }
    }

    private val barcodeCallback = object : BarcodeCallback {
        override fun barcodeResult(result: BarcodeResult) {
            if (result.text != null) {
                // Stop the camera preview to prevent multiple scans
                binding.barcodeScanner.pause()
                
                // Process the scanned QR code
                processScannedCode(result.text)
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentQrScannerBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupToolbar()
        setupFlashButton()
        setupClickListeners()
        checkCameraPermission()
    }
    
    private fun setupClickListeners() {
        binding.buttonSimulateScan.setOnClickListener {
            // Simulate a successful QR code scan for demo purposes
            processScannedCode("demo_restaurant_123")
        }
        
        binding.textSkipScan.setOnClickListener {
            // Skip the scanning process and go to demo mode
            navigateToRestaurantDemo()
        }
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setupFlashButton() {
        binding.toggleFlash.setOnClickListener {
            isFlashOn = !isFlashOn
            binding.barcodeScanner.setTorch(isFlashOn)
            val icon = if (isFlashOn) R.drawable.ic_flash_on else R.drawable.ic_flash_off
            binding.toggleFlash.setImageResource(icon)
        }
    }

    private fun checkCameraPermission() {
        when {
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED -> {
                startCamera()
            }
            shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) -> {
                // Show an explanation to the user
                showError(getString(R.string.camera_permission_required))
                findNavController().navigateUp()
            }
            else -> {
                // Request the permission
                requestPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }

    private fun startCamera() {
        try {
            // Configure the barcode scanner
            val formats = listOf(BarcodeFormat.QR_CODE)
            binding.barcodeScanner.barcodeView.decoderFactory = DefaultDecoderFactory(formats)
            
            // Set the barcode callback
            binding.barcodeScanner.decodeSingle(barcodeCallback)
            
            // Start the camera preview
            binding.barcodeScanner.resume()
        } catch (e: Exception) {
            showError(getString(R.string.error_accessing_camera))
            findNavController().navigateUp()
        }
    }

    private fun processScannedCode(code: String) {
        if (isProcessingResult) return
        isProcessingResult = true
        
        // Show loading state
        binding.buttonSimulateScan.isEnabled = false
        binding.textSkipScan.isEnabled = false
        
        // In a real app, you would validate the QR code format here
        // For demo purposes, we'll assume any code is valid
        
        // Show connecting message
        binding.buttonSimulateScan.text = getString(R.string.connecting_to_restaurant)
        binding.buttonSimulateScan.icon = null
        
        // Simulate network request
        binding.barcodeScanner.postDelayed({
            // In a real app, you would validate the QR code and connect to the restaurant
            val isValidQrCode = code.startsWith("billo_restaurant_")
            
            if (isValidQrCode) {
                // Success - navigate to the restaurant screen
                navigateToRestaurant(code)
            } else {
                // Show error for invalid QR code
                showError(getString(R.string.invalid_qr_code))
                resetScanState()
            }
        }, 1500)
    }
    
    private fun navigateToRestaurant(restaurantId: String) {
        // In a real app, you would navigate to the restaurant screen with the restaurant ID
        // For now, just show a success message and navigate back
        showMessage(getString(R.string.connection_successful))
        findNavController().navigateUp()
    }
    
    private fun navigateToRestaurantDemo() {
        // Navigate to demo mode
        showMessage("Demo mode activated")
        // In a real app, you would navigate to the demo restaurant screen
        findNavController().navigateUp()
    }
    
    private fun resetScanState() {
        isProcessingResult = false
        binding.buttonSimulateScan.isEnabled = true
        binding.textSkipScan.isEnabled = true
        binding.buttonSimulateScan.text = getString(R.string.simulate_qr_scan)
        binding.buttonSimulateScan.setIconResource(R.drawable.ic_qr_code_scan)
        binding.barcodeScanner.resume()
    }

    private fun showMessage(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    private fun showError(message: String) {
        context?.let {
            ErrorDialog(
                context = it,
                message = message,
                positiveButtonText = getString(R.string.ok),
                positiveAction = {}
            ).show()
        }
    }

    override fun onResume() {
        super.onResume()
        if (ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            binding.barcodeScanner.resume()
        }
    }

    override fun onPause() {
        super.onPause()
        binding.barcodeScanner.pause()
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        binding.barcodeScanner.pause()
        _binding = null
    }

    override fun onDestroyView() {
        super.onDestroyView()
        binding.barcodeScanner.pause()
        _binding = null
    }
}
