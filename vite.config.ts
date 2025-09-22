import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// имя репозитория на GitHub
const repo = 'sales-script-graph'

export default defineConfig({
  plugins: [react()],
  base: `/${repo}/`,
  resolve: {
    dedupe: ['react', 'react-dom'],   // <— важно
    alias: {
      // опционально, если используешь алиас @ в tsconfig
      // '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
