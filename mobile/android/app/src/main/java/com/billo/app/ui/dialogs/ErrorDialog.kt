package com.billo.app.ui.dialogs

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.Window
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.DialogFragment
import com.billo.app.R
import com.billo.app.databinding.DialogErrorBinding

/**
 * A reusable error dialog that displays an error message with optional action buttons.
 *
 * @param context The context to use for creating the dialog
 * @param message The error message to display
 * @param positiveButtonText The text for the positive button (defaults to "OK")
 * @param negativeButtonText The text for the negative button (optional)
 * @param positiveAction Callback for the positive button click
 * @param negativeAction Callback for the negative button click (optional)
 * @param cancelable Whether the dialog is cancelable (defaults to true)
 */
class ErrorDialog(
    private val context: Context,
    private val message: String,
    private val positiveButtonText: String = "OK",
    private val negativeButtonText: String? = null,
    private val positiveAction: (() -> Unit)? = null,
    private val negativeAction: (() -> Unit)? = null,
    private val cancelable: Boolean = true
) : DialogFragment() {

    private var _binding: DialogErrorBinding? = null
    private val binding get() = _binding!!

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        _binding = DialogErrorBinding.inflate(LayoutInflater.from(context))

        val builder = AlertDialog.Builder(context, R.style.Theme_Billo_Dialog_Alert)
            .setView(binding.root)
            .setCancelable(cancelable)

        binding.apply {
            // Set the error message
            textMessage.text = message

            // Set up the positive button
            buttonPositive.text = positiveButtonText
            buttonPositive.setOnClickListener {
                positiveAction?.invoke()
                dismiss()
            }

            // Set up the negative button if provided
            if (negativeButtonText != null) {
                buttonNegative.visibility = View.VISIBLE
                buttonNegative.text = negativeButtonText
                buttonNegative.setOnClickListener {
                    negativeAction?.invoke()
                    dismiss()
                }
            } else {
                buttonNegative.visibility = View.GONE
            }
        }

        // Create the dialog
        val dialog = builder.create()
        dialog.window?.requestFeature(Window.FEATURE_NO_TITLE)
        return dialog
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        const val TAG = "ErrorDialog"
    }
}
