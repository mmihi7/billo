package com.billo.app.ui.orders

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.billo.app.R
import com.billo.app.data.model.Order
import com.billo.app.databinding.FragmentOrdersBinding
import com.billo.app.ui.device.DeviceViewModel
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class OrdersFragment : Fragment() {

    private var _binding: FragmentOrdersBinding? = null
    private val binding get() = _binding!!
    
    private val deviceViewModel: DeviceViewModel by viewModels()
    private val ordersViewModel: OrdersViewModel by viewModels()
    private lateinit var orderAdapter: OrderAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentOrdersBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupSwipeRefresh()
        observeDevice()
    }

    private fun setupRecyclerView() {
        orderAdapter = OrderAdapter(
            onOrderClick = { order ->
                // Handle order click
                showOrderActions(order)
            },
            onActionClick = { order ->
                // Handle action button click based on order status
                when (order.status) {
                    OrderStatus.PENDING -> ordersViewModel.acceptOrder(order.id)
                    OrderStatus.ISSUE_REPORTED -> showReportIssueDialog(order)
                    else -> { /* Do nothing */ }
                }
            }
        )

        binding.ordersRecyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = orderAdapter
            setHasFixedSize(true)
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            deviceViewModel.device.value?.let { device ->
                // Get the current tab ID from the device state
                // In a real app, you would get this from your data model
                val tabId = "" // Get the current tab ID
                if (tabId.isNotEmpty()) {
                    ordersViewModel.loadOrders(tabId)
                } else {
                    binding.swipeRefreshLayout.isRefreshing = false
                }
            } ?: run {
                binding.swipeRefreshLayout.isRefreshing = false
            }
        }
    }

    private fun observeDevice() {
        viewLifecycleOwner.lifecycleScope.launch {
            deviceViewModel.device.collect { device ->
                device?.let {
                    // When device is available, load orders for the current tab
                    val tabId = "" // Get the current tab ID from device
                    if (tabId.isNotEmpty()) {
                        observeOrders(tabId)
                    }
                }
            }
        }
    }

    private fun observeOrders(tabId: String) {
        viewLifecycleOwner.lifecycleScope.launch {
            ordersViewModel.loadOrders(tabId)
            
            ordersViewModel.uiState.collectLatest { state ->
                when (state) {
                    is OrdersUiState.Loading -> {
                        binding.loadingIndicator.isVisible = true
                        binding.emptyStateText.isVisible = false
                        binding.ordersRecyclerView.isVisible = false
                        binding.swipeRefreshLayout.isRefreshing = false
                    }
                    is OrdersUiState.Empty -> {
                        binding.loadingIndicator.isVisible = false
                        binding.emptyStateText.isVisible = true
                        binding.ordersRecyclerView.isVisible = false
                        binding.swipeRefreshLayout.isRefreshing = false
                    }
                    is OrdersUiState.Error -> {
                        binding.loadingIndicator.isVisible = false
                        // Show error state or snackbar
                        binding.swipeRefreshLayout.isRefreshing = false
                    }
                    is OrdersUiState.Success -> {
                        binding.loadingIndicator.isVisible = false
                        binding.emptyStateText.isVisible = state.orders.isEmpty()
                        binding.ordersRecyclerView.isVisible = state.orders.isNotEmpty()
                        orderAdapter.submitList(state.orders)
                        binding.swipeRefreshLayout.isRefreshing = false
                    }
                }
            }
        }
    }

    private fun showOrderActions(order: Order) {
        val actions = when (order.status) {
            OrderStatus.PENDING -> arrayOf(
                getString(R.string.accept),
                getString(R.string.cancel),
                getString(R.string.report_issue)
            )
            OrderStatus.ACCEPTED -> arrayOf(
                getString(R.string.view_details),
                getString(R.string.report_issue)
            )
            OrderStatus.ISSUE_REPORTED -> arrayOf(
                getString(R.string.view_issue),
                getString(R.string.cancel_order)
            )
            else -> arrayOf(getString(R.string.view_details))
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.order_number, order.id.takeLast(5).uppercase()))
            .setItems(actions) { _, which ->
                when (actions[which]) {
                    getString(R.string.accept) -> ordersViewModel.acceptOrder(order.id)
                    getString(R.string.cancel) -> showCancelOrderDialog(order)
                    getString(R.string.report_issue) -> showReportIssueDialog(order)
                    getString(R.string.view_details) -> navigateToOrderDetails(order)
                    getString(R.string.view_issue) -> showIssueDetails(order)
                    getString(R.string.cancel_order) -> showCancelOrderDialog(order)
                }
            }
            .setNegativeButton(R.string.close, null)
            .show()
    }

    private fun showCancelOrderDialog(order: Order) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.cancel_order)
            .setMessage(R.string.cancel_order_confirmation)
            .setPositiveButton(R.string.yes) { _, _ ->
                ordersViewModel.cancelOrder(order.id, "Customer requested cancellation")
            }
            .setNegativeButton(R.string.no, null)
            .show()
    }

    private fun showReportIssueDialog(order: Order) {
        // In a real app, you would show a dialog with an EditText for the issue description
        ordersViewModel.reportIssue(order.id, "Customer reported an issue with this order")
    }

    private fun showIssueDetails(order: Order) {
        // Show issue details in a dialog
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.reported_issue)
            .setMessage(order.issueNotes.ifEmpty { getString(R.string.no_issue_notes) })
            .setPositiveButton(R.string.ok, null)
            .show()
    }

    private fun navigateToOrderDetails(order: Order) {
        // TODO: Implement navigation to order details
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        fun newInstance() = OrdersFragment()
    }
}
