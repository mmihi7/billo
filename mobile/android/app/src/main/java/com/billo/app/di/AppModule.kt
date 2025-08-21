package com.billo.app.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    // Add your dependency providers here
    // Example:
    // @Provides
    // @Singleton
    // fun provideSomeDependency(): SomeDependency {
    //     return SomeDependency()
    // }
}
