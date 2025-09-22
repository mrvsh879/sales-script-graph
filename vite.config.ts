import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repo = 'sales-script-graph' // имя твоего репозитория

export default defineConfig({
  plugins: [react()],
  base: `/${repo}/`, // критично для GitHub Pages
})
