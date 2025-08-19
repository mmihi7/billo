import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '')
  
  // Base config for both web and mobile
  const baseConfig = {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../shared/src"),
      },
    },
    // Use process.env to access environment variables in your code
    define: {
      'process.env': env
    }
  }

  // Mobile-specific config
  if (process.env.VITE_APP_PLATFORM === 'mobile') {
    return {
      ...baseConfig,
      base: './', // Required for Cordova/Capacitor
      build: {
        outDir: '../mobile/www',
        emptyOutDir: true,
        // Enable source maps for better debugging
        sourcemap: true,
        // Keep the same file names for better caching
        rollupOptions: {
          output: {
            entryFileNames: `assets/[name].js`,
            chunkFileNames: `assets/[name].js`,
            assetFileNames: `assets/[name].[ext]`
          }
        }
      },
      // Optimize for mobile performance
      optimizeDeps: {
        include: ['react', 'react-dom'],
        force: true
      }
    }
  }

  // Web-specific config
  return {
    ...baseConfig,
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: true
    }
  }
})
