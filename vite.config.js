import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // 加入這個 server 區塊，解決前後端 Port 不同的問題
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 指向你的 Node.js 後端
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name:             '鏡界 Mirror Realm',
        short_name:       '鏡界',
        description:      '文字修仙 LBS 遊戲',
        theme_color:      '#0A0C10',
        background_color: '#0A0C10',
        display:          'standalone',
        start_url:        '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // App Shell：HTML 與 JS/CSS 快取優先
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        runtimeCaching: [
          {
            // API 請求：網路優先，失敗時回傳快取
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName:       'api-cache',
              networkTimeoutSeconds: 5,
              expiration:      { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    })
  ]
})