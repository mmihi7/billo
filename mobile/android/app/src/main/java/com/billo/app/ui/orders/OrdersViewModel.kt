package com.billo.app.ui.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.billo.app.data.model.Order
import com.billo.app.data.model.OrderStatus
import com.billo.app.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<OrdersUiState>(OrdersUiState.Loading)
    val uiState: StateFlow<OrdersUiState> = _uiState

    private var currentTabId: String? = null
    
    fun loadOrders(tabId: String) {
        if (currentTabId == tabId) return
        
        currentTabId = tabId
        viewModelScope.launch {
            _uiState.value = OrdersUiState.Loading
            
            try {
                orderRepository.observeOrdersForTab(tabId)
                    .catch { e ->
                        _uiState.value = OrdersUiState.Error(e.message ?: "Unknown error")
                    }
                    .collect { orders ->
                        if (orders.isEmpty()) {
                            _uiState.value = OrdersUiState.Empty
                        } else {
                            _uiState.value = OrdersUiState.Success(orders)
                        }
                    }
            } catch (e: Exception) {
                _uiState.value = OrdersUiState.Error(e.message ?: "Failed to load orders")
            }
        }
    }
    
    fun acceptOrder(orderId: String) {
        viewModelScope.launch {
            try {
                orderRepository.acceptOrder(orderId)
                // State will be updated through the Flow
            } catch (e: Exception) {
                _uiState.value = OrdersUiState.Error("Failed to accept order: ${e.message}")
            }
        }
    }
    
    fun reportIssue(orderId: String, issueNotes: String) {
        viewModelScope.launch {
            try {
                orderRepository.reportIssue(orderId, issueNotes)
                // State will be updated through the Flow
            } catch (e: Exception) {
                _uiState.value = OrdersUiState.Error("Failed to report issue: ${e.message}")
            }
        }
    }
    
    fun cancelOrder(orderId: String, reason: String) {
        viewModelScope.launch {
            try {
                orderRepository.cancelOrder(orderId, reason)
                // State will be updated through the Flow
            } catch (e: Exception) {
                _uiState.value = OrdersUiState.Error("Failed to cancel order: ${e.message}")
            }
        }
    }
    
    fun clearError() {
        if (_uiState.value is OrdersUiState.Error) {
            _uiState.value = OrdersUiState.Success(emptyList())
        }
    }
}

sealed class OrdersUiState {
    object Loading : OrdersUiState()
    object Empty : OrdersUiState()
    data class Error(val message: String) : OrdersUiState()
    data class Success(val orders: List<Order>) : OrdersUiState()
}
