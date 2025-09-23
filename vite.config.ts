import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// временно для отладки
export default defineConfig({
  plugins: [react()],
  base: '/sales-script-graph/',
  build: {
    outDir: 'dist',
    minify: false,     // выключаем минификацию
    sourcemap: true    // включаем sourcemap
  },
  resolve: {
    dedupe: ['react', 'react-dom']  // убираем дубликаты React
  }
})
