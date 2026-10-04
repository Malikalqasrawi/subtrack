import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin in development too, so the refresh cookie and API calls behave as in production.
    proxy: {
      '/api': 'http://localhost:8081',
    },
  },
})
