package com.billo.app.ui.tab

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.billo.app.R
import com.billo.app.data.model.OrderStatus
import com.billo.app.data.model.TabStatus
import com.billo.app.databinding.FragmentTabBinding
import com.billo.app.ui.device.DeviceViewModel
import com.billo.app.util.formatCurrency
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class TabFragment : Fragment() {

    private var _binding: FragmentTabBinding? = null
    private val binding get() = _binding!!
    
    private val deviceViewModel: DeviceViewModel by viewModels()
    private val tabViewModel: TabViewModel by viewModels()
    private val orderHistoryAdapter = OrderHistoryAdapter()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTabBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupSwipeRefresh()
        setupClickListeners()
        observeViewModels()
    }

    private fun setupRecyclerView() {
        binding.ordersRecyclerView.apply {
            adapter = orderHistoryAdapter
            setHasFixedSize(true)
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            deviceViewModel.device.value?.let { device ->
                tabViewModel.loadTab(device.id)
            } ?: run {
                binding.swipeRefreshLayout.isRefreshing = false
            }
        }
    }

    private fun setupClickListeners() {
        binding.requestBillButton.setOnClickListener {
            showRequestBillConfirmation()
        }
    }

    private fun observeViewModels() {
        viewLifecycleOwner.lifecycleScope.launch {
            deviceViewModel.device.collect { device ->
                device?.let {
                    tabViewModel.loadTab(device.id)
                }
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            tabViewModel.uiState.collectLatest { state ->
                updateUiState(state)
            }
        }
    }

    private fun updateUiState(state: TabUiState) {
        when (state) {
            is TabUiState.Loading -> showLoading()
            is TabUiState.NoActiveTab -> showNoActiveTab()
            is TabUiState.Error -> showError(state.message)
            is TabUiState.ProcessingPayment -> showProcessingPayment()
            is TabUiState.Success -> showTabInfo(state.tab, state.orders, state.isRefreshing)
        }
    }

    private fun showLoading() {
        with(binding) {
            loadingIndicator.isVisible = true
            noActiveTabText.isVisible = false
            errorText.isVisible = false
            tabInfoCard.isVisible = false
            orderHistoryLabel.isVisible = false
            ordersRecyclerView.isVisible = false
            swipeRefreshLayout.isRefreshing = false
        }
    }

    private fun showNoActiveTab() {
        with(binding) {
            loadingIndicator.isVisible = false
            noActiveTabText.isVisible = true
            errorText.isVisible = false
            tabInfoCard.isVisible = false
            orderHistoryLabel.isVisible = false
            ordersRecyclerView.isVisible = false
            swipeRefreshLayout.isRefreshing = false
        }
    }

    private fun showError(message: String) {
        with(binding) {
            loadingIndicator.isVisible = false
            noActiveTabText.isVisible = false
            errorText.isVisible = true
            errorText.text = message
            tabInfoCard.isVisible = false
            orderHistoryLabel.isVisible = false
            ordersRecyclerView.isVisible = false
            swipeRefreshLayout.isRefreshing = false
        }
    }

    private fun showProcessingPayment() {
        with(binding) {
            loadingIndicator.isVisible = true
            loadingIndicator.contentDescription = getString(R.string.processing_payment)
            swipeRefreshLayout.isRefreshing = false
        }
    }

    private fun showTabInfo(tab: Tab, orders: List<com.billo.app.data.model.Order>, isRefreshing: Boolean) {
        with(binding) {
            loadingIndicator.isVisible = false
            noActiveTabText.isVisible = false
            errorText.isVisible = false
            tabInfoCard.isVisible = true
            orderHistoryLabel.isVisible = true
            ordersRecyclerView.isVisible = orders.isNotEmpty()
            swipeRefreshLayout.isRefreshing = isRefreshing

            // Update tab info
            tableNumberText.text = getString(R.string.table_number, tab.tableNumber)
            
            // Update status chip
            tabStatusChip.text = tab.status.name.lowercase().replaceFirstChar { it.uppercase() }
            when (tab.status) {
                TabStatus.ACTIVE -> tabStatusChip.setChipBackgroundColorResource(R.color.green_light)
                TabStatus.PENDING_BILL -> tabStatusChip.setChipBackgroundColorResource(R.color.yellow_light)
                TabStatus.PAYMENT_PENDING -> tabStatusChip.setChipBackgroundColorResource(R.color.blue_light)
                TabStatus.PAID -> tabStatusChip.setChipBackgroundColorResource(R.color.gray_light)
                TabStatus.CANCELLED -> tabStatusChip.setChipBackgroundColorResource(R.color.red_light)
            }
            
            // Update order count and total
            val totalItems = orders.sumOf { it.items.size }
            totalItemsText.text = resources.getQuantityString(
                R.plurals.item_count, totalItems, totalItems
            )
            
            val totalAmount = orders.sumOf { order ->
                order.items.sumOf { it.price * it.quantity }
            }
            totalAmountText.text = formatCurrency(totalAmount)
            
            // Update request bill button
            requestBillButton.isEnabled = tab.status == TabStatus.ACTIVE
            requestBillButton.alpha = if (tab.status == TabStatus.ACTIVE) 1f else 0.5f
            requestBillButton.text = when (tab.status) {
                TabStatus.ACTIVE -> getString(R.string.request_bill)
                TabStatus.PENDING_BILL -> getString(R.string.bill_requested)
                TabStatus.PAYMENT_PENDING -> getString(R.string.payment_pending)
                TabStatus.PAID -> getString(R.string.paid)
                TabStatus.CANCELLED -> getString(R.string.cancelled)
            }
            
            // Update order history
            orderHistoryAdapter.submitList(orders.sortedByDescending { it.createdAt })
        }
    }

    private fun showRequestBillConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.request_bill)
            .setMessage(R.string.request_bill_confirmation)
            .setPositiveButton(R.string.yes) { _, _ ->
                tabViewModel.requestBill()
            }
            .setNegativeButton(R.string.no, null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        fun newInstance() = TabFragment()
    }
}
