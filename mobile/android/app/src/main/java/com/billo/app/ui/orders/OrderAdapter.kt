package com.billo.app.ui.orders

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.billo.app.R
import com.billo.app.data.model.Order
import com.billo.app.data.model.OrderStatus
import com.billo.app.databinding.ItemOrderBinding
import java.text.SimpleDateFormat
import java.util.*

class OrderAdapter(
    private val onOrderClick: (Order) -> Unit,
    private val onActionClick: (Order) -> Unit
) : ListAdapter<Order, OrderAdapter.OrderViewHolder>(OrderDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val binding = ItemOrderBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return OrderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        val order = getItem(position)
        holder.bind(order)
    }

    inner class OrderViewHolder(
        private val binding: ItemOrderBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        private val dateFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
        
        init {
            binding.root.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onOrderClick(getItem(position))
                }
            }
            
            binding.actionButton.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onActionClick(getItem(position))
                }
            }
        }

        fun bind(order: Order) {
            binding.apply {
                // Set order number
                orderNumberText.text = itemView.context.getString(R.string.order_number, order.id.takeLast(5).uppercase())
                
                // Set status
                orderStatusChip.text = order.status.name.lowercase().replaceFirstChar { it.uppercase() }
                
                // Set items preview (first 3 items)
                val itemsPreview = order.items.take(3).joinToString(", ") { item ->
                    "${item.quantity}x ${item.name}"
                }
                itemsPreviewText.text = itemsPreview
                
                // Set total
                orderTotalText.text = itemView.context.getString(R.string.price_format, order.total)
                
                // Set time
                orderTimeText.text = dateFormat.format(order.createdAt.toDate())
                
                // Configure action button based on status
                when (order.status) {
                    OrderStatus.PENDING -> {
                        actionButton.text = itemView.context.getString(R.string.accept)
                        actionButton.visibility = android.view.View.VISIBLE
                    }
                    OrderStatus.ISSUE_REPORTED -> {
                        actionButton.text = itemView.context.getString(R.string.view_issue)
                        actionButton.visibility = android.view.View.VISIBLE
                    }
                    else -> {
                        actionButton.visibility = android.view.View.GONE
                    }
                }
                
                // Set status color
                val (bgColor, textColor) = when (order.status) {
                    OrderStatus.PENDING -> R.color.yellow_light to R.color.yellow_dark
                    OrderStatus.ACCEPTED -> R.color.green_light to R.color.green_dark
                    OrderStatus.ISSUE_REPORTED -> R.color.red_light to R.color.red_dark
                    OrderStatus.CANCELLED -> R.color.gray_light to R.color.gray_dark
                    OrderStatus.COMPLETED -> R.color.blue_light to R.color.blue_dark
                }
                
                orderStatusChip.setChipBackgroundColorResource(bgColor)
                orderStatusChip.chipStrokeColor = itemView.context.getColorStateList(textColor)
                orderStatusChip.setTextColor(itemView.context.getColor(textColor))
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
