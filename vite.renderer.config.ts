import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Renderer-only Vite config for browser preview (no Electron)
export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/',
  build: {
    outDir: 'out/renderer',
  },
})
