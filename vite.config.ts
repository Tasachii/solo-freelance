import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base ต้องตรงชื่อ repo บน GitHub Pages (repo: solo)
export default defineConfig({
  plugins: [react()],
  base: '/solo/',
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
} as never)
