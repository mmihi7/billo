package com.billo.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

data class Tab(
    @DocumentId
    val id: String = "",
    val deviceId: String = "",
    val restaurantId: String = "",
    val tableNumber: String = "",
    val status: TabStatus = TabStatus.ACTIVE,
    val orders: List<String> = emptyList(), // List of order IDs
    val totalAmount: Double = 0.0,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now(),
    val closedAt: Timestamp? = null,
    val paymentMethod: PaymentMethod? = null,
    val tipAmount: Double = 0.0,
    val taxAmount: Double = 0.0,
    val serviceCharge: Double = 0.0
)

enum class TabStatus {
    ACTIVE,         // Tab is open and active
    PENDING_BILL,   // Customer has requested the bill
    PAYMENT_PENDING, // Bill has been generated, waiting for payment
    PAID,           // Tab has been paid
    CANCELLED       // Tab was cancelled
}

enum class PaymentMethod {
    CASH,
    CARD,
    MOBILE_MONEY,
    OTHER
}
