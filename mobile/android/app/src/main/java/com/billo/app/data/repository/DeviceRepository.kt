package com.billo.app.data.repository

import com.billo.app.data.model.Device
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceRepository @Inject constructor() {
    private val db = Firebase.firestore
    private val devicesCollection = db.collection("devices")

    suspend fun getOrCreateDevice(deviceId: String): Device {
        return try {
            val snapshot = devicesCollection.document(deviceId).get().await()
            if (snapshot.exists()) {
                snapshot.toObject(Device::class.java)!!
            } else {
                val newDevice = Device(id = deviceId)
                devicesCollection.document(deviceId).set(newDevice).await()
                newDevice
            }
        } catch (e: Exception) {
            throw Exception("Failed to get or create device", e)
        }
    }

    suspend fun updateFcmToken(deviceId: String, token: String) {
        try {
            devicesCollection.document(deviceId).update("fcmToken", token).await()
        } catch (e: Exception) {
            throw Exception("Failed to update FCM token", e)
        }
    }

    suspend fun updateLastActive(deviceId: String) {
        try {
            devicesCollection.document(deviceId).update("lastActive", System.currentTimeMillis()).await()
        } catch (e: Exception) {
            // Non-critical, just log the error
            println("Failed to update last active time: ${e.message}")
        }
    }
}
