import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://wictorstenseke.github.io/croatia-quiz/, so assets need
// the repo name as their base. The app routes on the hash, which Pages serves
// without any rewrite rules.
export default defineConfig({
  base: '/croatia-quiz/',
  plugins: [react()],
})
