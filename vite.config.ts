import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base ต้องตรงชื่อ repo บน GitHub Pages — ห้ามเปลี่ยน ลิงก์ถูกแชร์แล้ว (หลักการข้อ 7)
export default defineConfig({
  plugins: [react()],
  base: '/solo-tutor/',
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
} as never)
