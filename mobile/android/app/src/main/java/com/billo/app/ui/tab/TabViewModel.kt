package com.billo.app.ui.tab

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.billo.app.data.model.Order
import com.billo.app.data.model.Tab
import com.billo.app.data.model.TabStatus
import com.billo.app.data.model.request.BillPaymentRequest
import com.billo.app.data.repository.OrderRepository
import com.billo.app.data.repository.TabRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TabViewModel @Inject constructor(
    private val tabRepository: TabRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<TabUiState>(TabUiState.Loading)
    val uiState: StateFlow<TabUiState> = _uiState

    private var currentTabId: String? = null

    fun loadTab(deviceId: String) {
        viewModelScope.launch {
            _uiState.value = TabUiState.Loading

            tabRepository.getActiveTabForDevice(deviceId)
                .catch { e ->
                    _uiState.value = TabUiState.Error(e.message ?: "Failed to load tab")
                }
                .collect { result ->
                    result.fold(
                        onSuccess = { tab ->
                            if (tab != null) {
                                currentTabId = tab.id
                                observeTab(tab.id)
                            } else {
                                _uiState.value = TabUiState.NoActiveTab
                            }
                        },
                        onFailure = { e ->
                            _uiState.value = TabUiState.Error(e.message ?: "Failed to load tab")
                        }
                    )
                }
        }
    }

    private fun observeTab(tabId: String) {
        viewModelScope.launch {
            tabRepository.observeTab(tabId)
                .catch { e ->
                    _uiState.value = TabUiState.Error(e.message ?: "Error observing tab")
                }
                .collect { result ->
                    result.fold(
                        onSuccess = { tab ->
                            if (tab != null) {
                                loadTabWithOrders(tab)
                            } else {
                                _uiState.value = TabUiState.Error("Tab not found")
                            }
                        },
                        onFailure = { e ->
                            _uiState.value = TabUiState.Error(e.message ?: "Error loading tab")
                        }
                    )
                }
        }
    }

    private suspend fun loadTabWithOrders(tab: Tab) {
        try {
            val orders = orderRepository.getOrdersForTab(tab.id)
            _uiState.value = TabUiState.Success(tab, orders)
        } catch (e: Exception) {
            _uiState.value = TabUiState.Success(tab, emptyList())
        }
    }

    fun requestBill() {
        val tabId = currentTabId ?: return
        
        viewModelScope.launch {
            _uiState.value = TabUiState.Loading
            
            tabRepository.requestBill(tabId)
                .fold(
                    onSuccess = {
                        // State will be updated through the observer
                    },
                    onFailure = { e ->
                        _uiState.value = TabUiState.Error("Failed to request bill: ${e.message}")
                    }
                )
        }
    }

    fun payBill(
        paymentMethod: String,
        tipAmount: Double,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val tabId = currentTabId ?: return
        
        viewModelScope.launch {
            _uiState.value = TabUiState.ProcessingPayment
            
            tabRepository.updatePayment(
                tabId = tabId,
                paymentMethod = paymentMethod,
                tipAmount = tipAmount,
                onSuccess = {
                    onSuccess()
                },
                onError = { e ->
                    onError(e.message ?: "Payment failed")
                }
            )
        }
    }

    fun clearError() {
        if (_uiState.value is TabUiState.Error) {
            currentTabId?.let { observeTab(it) } ?: run {
                _uiState.value = TabUiState.NoActiveTab
            }
        }
    }
}

sealed class TabUiState {
    object Loading : TabUiState()
    object NoActiveTab : TabUiState()
    object ProcessingPayment : TabUiState()
    data class Error(val message: String) : TabUiState()
    data class Success(
        val tab: Tab,
        val orders: List<Order>,
        val isRefreshing: Boolean = false
    ) : TabUiState()
}
