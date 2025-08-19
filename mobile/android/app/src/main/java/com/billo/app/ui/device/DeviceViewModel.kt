package com.billo.app.ui.device

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.billo.app.data.model.Device
import com.billo.app.data.repository.DeviceRepository
import com.google.firebase.installations.FirebaseInstallations
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DeviceViewModel @Inject constructor(
    application: Application,
    private val deviceRepository: DeviceRepository
) : AndroidViewModel(application) {

    private val _device = MutableStateFlow<Device?>(null)
    val device: StateFlow<Device?> = _device

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        initializeDevice()
    }

    private fun initializeDevice() {
        viewModelScope.launch {
            _loading.value = true
            try {
                // Get or create device in Firestore
                val deviceId = getDeviceId()
                val device = deviceRepository.getOrCreateDevice(deviceId)
                _device.value = device
                
                // Update FCM token
                updateFcmToken()
                
                // Update last active time
                deviceRepository.updateLastActive(deviceId)
                
            } catch (e: Exception) {
                _error.value = "Failed to initialize device: ${e.message}"
                Log.e("DeviceViewModel", "Error initializing device", e)
            } finally {
                _loading.value = false
            }
        }
    }

    private suspend fun getDeviceId(): String {
        return FirebaseInstallations.getInstance().id.await()
    }

    private fun updateFcmToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful && task.result != null) {
                val token = task.result
                viewModelScope.launch {
                    try {
                        deviceRepository.updateFcmToken(_device.value?.id ?: return@launch, token)
                    } catch (e: Exception) {
                        Log.e("DeviceViewModel", "Failed to update FCM token", e)
                    }
                }
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
