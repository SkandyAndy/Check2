import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  // When deployed to GitHub Pages the app lives at /Check2/ — in dev it's just /
  base: process.env.GITHUB_PAGES === 'true' ? '/Check2/' : '/',
})

