import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    host: true,
    allowedHosts: ['stag-above-hog.ngrok-free.app'],
    proxy: {
      '/api/twitter': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/proxy-video': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/cobalt': {
        target: 'https://api.cobalt.tools',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cobalt/, '')
      }
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
