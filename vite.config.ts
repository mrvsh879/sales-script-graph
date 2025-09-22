import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'sales-script-graph'

export default defineConfig({
  plugins: [react()],
  base: `/${repo}/`,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

