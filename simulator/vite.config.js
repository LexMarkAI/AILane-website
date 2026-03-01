import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/simulator-app/',
  build: { outDir: '../simulator-app', emptyOutDir: true },
})
