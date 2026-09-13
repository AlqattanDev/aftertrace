import { defineConfig } from 'vite'

// The showcase build (`npm run build:showcase`) is served by exidex.dev at
// /aftertrace/play/ out of this repo's .exidex/play/ folder, so it needs that base.
// A plain `npm run build` keeps `/` for local preview.
export default defineConfig(({ mode }) => ({
  base: mode === 'showcase' ? '/aftertrace/play/' : '/',
  build: {
    outDir: mode === 'showcase' ? '.exidex/play' : 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
  },
}))
