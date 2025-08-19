package com.billo.app.data.repository

import com.billo.app.data.model.Order
import com.billo.app.data.model.OrderStatus
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.firestore.ktx.toObject
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepository @Inject constructor() {
    private val db: FirebaseFirestore = Firebase.firestore
    private val ordersCollection = db.collection("orders")
    
    suspend fun getOrdersForTab(tabId: String): List<Order> {
        return try {
            ordersCollection
                .whereEqualTo("tabId", tabId)
                .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .get()
                .await()
                .map { document ->
                    document.toObject<Order>().copy(id = document.id)
                }
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    fun observeOrdersForTab(tabId: String): Flow<List<Order>> = callbackFlow {
        val listener = ordersCollection
            .whereEqualTo("tabId", tabId)
            .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, exception ->
                if (exception != null) {
                    close(exception)
                    return@addSnapshotListener
                }
                
                val orders = snapshot?.documents?.mapNotNull { document ->
                    document.toObject<Order>()?.copy(id = document.id)
                } ?: emptyList()
                
                trySend(orders)
            }
        
        // Remove the listener when the flow is cancelled
        awaitClose { listener.remove() }
    }
    
    suspend fun acceptOrder(orderId: String) {
        try {
            val updates = mapOf(
                "status" to OrderStatus.ACCEPTED.name,
                "updatedAt" to Timestamp.now()
            )
            ordersCollection.document(orderId).update(updates).await()
        } catch (e: Exception) {
            throw Exception("Failed to accept order", e)
        }
    }
    
    suspend fun reportIssue(orderId: String, issueNotes: String) {
        try {
            val updates = mapOf(
                "status" to OrderStatus.ISSUE_REPORTED.name,
                "issueNotes" to issueNotes,
                "updatedAt" to Timestamp.now()
            )
            ordersCollection.document(orderId).update(updates).await()
        } catch (e: Exception) {
            throw Exception("Failed to report issue", e)
        }
    }
    
    suspend fun cancelOrder(orderId: String, reason: String) {
        try {
            val updates = mapOf(
                "status" to OrderStatus.CANCELLED.name,
                "issueNotes" to reason,
                "updatedAt" to Timestamp.now()
            )
            ordersCollection.document(orderId).update(updates).await()
        } catch (e: Exception) {
            throw Exception("Failed to cancel order", e)
        }
    }
    
    suspend fun getOrderById(orderId: String): Order? {
        return try {
            val document = ordersCollection.document(orderId).get().await()
            document.toObject<Order>()?.copy(id = document.id)
        } catch (e: Exception) {
            null
        }
    }
}
