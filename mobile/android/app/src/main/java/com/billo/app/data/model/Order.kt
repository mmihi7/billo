package com.billo.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

enum class OrderStatus {
    PENDING,
    ACCEPTED,
    ISSUE_REPORTED,
    CANCELLED,
    COMPLETED
}

data class Order(
    @DocumentId
    val id: String = "",
    val tabId: String = "",
    val restaurantId: String = "",
    val items: List<OrderItem> = emptyList(),
    val status: OrderStatus = OrderStatus.PENDING,
    val total: Double = 0.0,
    val notes: String = "",
    val issueNotes: String = "",
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
)

data class OrderItem(
    val id: String = "",
    val name: String = "",
    val quantity: Int = 1,
    val price: Double = 0.0,
    val isOpened: Boolean = false,
    val notes: String = ""
)
