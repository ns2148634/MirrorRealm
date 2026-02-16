import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: '鏡界-凡人篇',
        short_name: '鏡界',
        description: '文字修仙 LBS 遊戲',
        theme_color: '#0c0a09', // stone-950 背景色
        background_color: '#0c0a09',
        display: 'standalone', // 這是全螢幕運行的關鍵
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
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // 讓圖示在不同手機上能自動適應形狀
          }
        ]
      }
    })
  ]
})