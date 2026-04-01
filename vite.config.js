import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /repo-name/ — set via env in CI, defaults to / locally
  base: process.env.VITE_BASE_URL || '/',
})
