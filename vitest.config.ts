import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// v13 stage 3b: this used to mergeConfig(viteConfig, ...). It cannot any more —
// vite.config.ts now carries the reactRouter() plugin, which takes over the
// entry point and expects a route graph, neither of which exists under vitest.
// The tests only ever needed JSX transform + the @ alias, so they get exactly
// those. @vitejs/plugin-react stays a devDependency for this reason alone.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
})
