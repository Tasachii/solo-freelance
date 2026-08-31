import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base ต้องตรงกับชื่อ repo บน GitHub Pages: https://<user>.github.io/tutordai-demo/
export default defineConfig({
  plugins: [react()],
  base: '/tutordai-demo/',
})
