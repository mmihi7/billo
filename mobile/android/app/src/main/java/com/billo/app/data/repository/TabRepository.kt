package com.billo.app.data.repository

import com.billo.app.data.model.Tab
import com.billo.app.data.model.TabStatus
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TabRepository @Inject constructor() {
    private val db: FirebaseFirestore = Firebase.firestore
    private val tabsCollection = db.collection("tabs")
    
    fun getActiveTabForDevice(deviceId: String) = flow {
        try {
            val querySnapshot = tabsCollection
                .whereEqualTo("deviceId", deviceId)
                .whereEqualTo("status", TabStatus.ACTIVE.name)
                .limit(1)
                .get()
                .await()
                
            val tab = querySnapshot.documents.firstOrNull()?.let { document ->
                document.toObject(Tab::class.java)?.copy(id = document.id)
            }
            
            emit(Result.success(tab))
        } catch (e: Exception) {
            emit(Result.failure<Tab?>(e))
        }
    }
    
    fun observeTab(tabId: String): Flow<Result<Tab?>> = callbackFlow {
        val listener = tabsCollection.document(tabId).addSnapshotListener { snapshot, error ->
            if (error != null) {
                trySend(Result.failure(error))
                return@addSnapshotListener
            }
            
            val tab = snapshot?.toObject(Tab::class.java)?.copy(id = snapshot.id)
            trySend(Result.success(tab))
        }
        
        awaitClose { listener.remove() }
    }
    
    suspend fun requestBill(tabId: String): Result<Unit> {
        return try {
            val updates = mapOf(
                "status" to TabStatus.PENDING_BILL.name,
                "updatedAt" to Timestamp.now()
            )
            tabsCollection.document(tabId).update(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getTabWithOrders(tabId: String): Result<Pair<Tab, List<Order>>> {
        return try {
            // In a real app, you would use a transaction to get both tab and its orders
            val tabDoc = tabsCollection.document(tabId).get().await()
            val tab = tabDoc.toObject(Tab::class.java)?.copy(id = tabDoc.id)
                ?: return Result.failure(Exception("Tab not found"))
                
            val orders = db.collection("orders")
                .whereEqualTo("tabId", tabId)
                .get()
                .await()
                .mapNotNull { it.toObject(Order::class.java).copy(id = it.id) }
                
            Result.success(Pair(tab, orders))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun updatePayment(
        tabId: String,
        paymentMethod: String,
        tipAmount: Double,
        onSuccess: () -> Unit,
        onError: (Exception) -> Unit
    ) {
        try {
            val updates = mapOf(
                "status" to TabStatus.PAID.name,
                "paymentMethod" to paymentMethod,
                "tipAmount" to tipAmount,
                "updatedAt" to Timestamp.now(),
                "closedAt" to Timestamp.now()
            )
            
            tabsCollection.document(tabId).update(updates).await()
            onSuccess()
        } catch (e: Exception) {
            onError(e)
        }
    }
}
