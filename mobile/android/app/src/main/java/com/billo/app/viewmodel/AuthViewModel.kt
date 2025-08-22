package com.billo.app.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.billo.app.repository.AuthRepository
import com.google.firebase.auth.FirebaseUser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _currentUser = MutableLiveData<FirebaseUser?>()
    val currentUser: LiveData<FirebaseUser?> = _currentUser

    init {
        viewModelScope.launch {
            authRepository.authState.collect { user ->
                _currentUser.value = user
            }
        }
    }

    fun setCurrentUser(user: FirebaseUser?) {
        _currentUser.value = user
    }

    fun signOut() {
        viewModelScope.launch {
            authRepository.signOut()
        }
    }
}
