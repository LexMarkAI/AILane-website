import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AiLaneCEO/',
  build: {
    outDir: '../AiLaneCEO',
    emptyOutDir: true,
  },
})
