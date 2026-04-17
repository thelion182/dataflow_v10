import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // accesible desde otros dispositivos en la red local (Mac, iPhone, etc.)
    port: 5173,
  },
})
