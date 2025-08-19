package com.billo.app.data.model

data class Device(
    val id: String = "",
    val fcmToken: String = "",
    val lastActive: Long = 0,
    val os: String = "android",
    val model: String = "",
    val osVersion: String = "",
    val createdAt: Long = System.currentTimeMillis()
)
