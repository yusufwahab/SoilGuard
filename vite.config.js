import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // .m4a isn't in Vite's built-in known-asset-types list -- needed so the
  // recorded Hausa/Yoruba status clips (src/data/audioClips.js) import as
  // URLs instead of failing to resolve.
  assetsInclude: ['**/*.m4a'],
})
