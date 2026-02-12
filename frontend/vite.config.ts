import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Degas CS',
        short_name: 'Degas CS',
        description: 'High-security QR-based Access Control System',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow network access
    https: process.env.VITE_HTTPS === 'true' ? {
      key: './localhost+3-key.pem',
      cert: './localhost+3.pem',
    } : undefined,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        retry: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.log(`🔴 Proxy error for ${req.url}:`, err.message);
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: 'Backend service unavailable', 
                ready: false 
              }));
            }
          });
        },
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        timeout: 10000
      },
      '/temp': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        timeout: 10000
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        scanner: resolve(__dirname, 'scanner.html'),
      },
    },
  }
});