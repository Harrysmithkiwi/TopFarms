import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// v13 stage 3b (directive 1.16): reactRouter() REPLACES @vitejs/plugin-react —
// it registers the React plugin itself, and running both breaks fast refresh.
// It also takes over the entry point: there is no index.html any more, and no
// src/main.tsx. src/root.tsx emits the document, src/routes.ts declares what
// renders where. This is the swap the rest of the stage was staged behind;
// reverting the commit that carries this file returns the app to library mode.
export default defineConfig({
  plugins: [reactRouter(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
