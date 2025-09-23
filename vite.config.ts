import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/sales-script-graph/',   // имя репозитория
  build: { outDir: 'dist' }       // куда собирать
})
