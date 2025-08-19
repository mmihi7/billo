package com.billo.app.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.billo.app.R
import com.billo.app.databinding.FragmentHomeBinding

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupClickListeners()
    }

    private fun setupClickListeners() {
        // Connect to Restaurant button
        binding.btnConnect.setOnClickListener {
            // Navigate to QR Scanner
            findNavController().navigate(R.id.navigation_qr_scanner)
        }

        // Saved Restaurants card
        binding.savedRestaurantsCard.setOnClickListener {
            // Navigate to Saved Restaurants
            findNavController().navigate(R.id.navigation_saved_restaurants)
        }

        // Easy Billing card
        binding.easyBillingCard.setOnClickListener {
            // Navigate to Easy Billing
            findNavController().navigate(R.id.navigation_easy_billing)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
