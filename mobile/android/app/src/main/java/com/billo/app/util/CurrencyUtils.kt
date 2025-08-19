package com.billo.app.util

import java.text.NumberFormat
import java.util.*

/**
 * Formats a numeric value as a currency string.
 * @param amount The amount to format
 * @param currencyCode The currency code (default: KES)
 * @return Formatted currency string (e.g., "Ksh 1,234.56")
 */
fun formatCurrency(amount: Double, currencyCode: String = "KES"): String {
    val format = NumberFormat.getCurrencyInstance(Locale.getDefault())
    
    // For KES, we want to show "Ksh" instead of the default currency symbol
    return if (currencyCode.equals("KES", ignoreCase = true)) {
        val symbol = format.currency?.symbol ?: "Ksh"
        val formatted = format.format(amount)
        formatted.replace(Regex("^[^\d-]+"), "$symbol ")
    } else {
        format.currency = Currency.getInstance(currencyCode)
        format.format(amount)
    }
}

/**
 * Extension function to format Double as currency
 */
fun Double.toCurrencyString(currencyCode: String = "KES"): String {
    return formatCurrency(this, currencyCode)
}
