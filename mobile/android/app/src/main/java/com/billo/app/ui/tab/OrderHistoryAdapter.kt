package com.billo.app.ui.tab

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.billo.app.R
import com.billo.app.data.model.Order
import com.billo.app.data.model.OrderStatus
import com.billo.app.databinding.ItemOrderHistoryBinding
import java.text.SimpleDateFormat
import java.util.*

class OrderHistoryAdapter : ListAdapter<Order, OrderHistoryAdapter.OrderViewHolder>(OrderDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val binding = ItemOrderHistoryBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return OrderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class OrderViewHolder(
        private val binding: ItemOrderHistoryBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        private val dateFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
        
        fun bind(order: Order) {
            binding.apply {
                // Set order number
                orderNumberText.text = root.context.getString(R.string.order_number, 
                    order.id.takeLast(5).uppercase())
                
                // Set order time
                orderTimeText.text = dateFormat.format(order.createdAt.toDate())
                
                // Set status
                orderStatusText.text = order.status.name.lowercase()
                    .replaceFirstChar { it.uppercase() }
                
                // Set status background color
                val statusBgResId = when (order.status) {
                    OrderStatus.PENDING -> R.drawable.bg_status_pending
                    OrderStatus.ACCEPTED -> R.drawable.bg_status_accepted
                    OrderStatus.ISSUE_REPORTED -> R.drawable.bg_status_issue
                    OrderStatus.CANCELLED -> R.drawable.bg_status_cancelled
                    OrderStatus.COMPLETED -> R.drawable.bg_status_completed
                }
                orderStatusText.setBackgroundResource(statusBgResId)
                
                // Set order items preview (first 3 items)
                val itemsPreview = order.items.take(3).joinToString(", ") { item ->
                    "${item.quantity}x ${item.name}"
                }
                orderItemsText.text = itemsPreview
                
                // Set order total
                val total = order.items.sumOf { it.price * it.quantity }
                orderTotalText.text = root.context.getString(R.string.price_format, total)
            }
        }
    }
}

class OrderDiffCallback : DiffUtil.ItemCallback<Order>() {
    override fun areItemsTheSame(oldItem: Order, newItem: Order): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: Order, newItem: Order): Boolean {
        return oldItem == newItem
    }
}
