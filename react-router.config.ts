import type { Config } from '@react-router/dev/config'
import { vercelPreset } from '@vercel/react-router/vite'

// v13 stage 3b — React Router framework mode (directive 1.16).
//
// appDirectory is `src`, not the framework default `app`, so the repo keeps ONE
// source root: `@/` still resolves, tsconfig.app.json's `include: ["src"]` is
// unchanged, and no page moved. root.tsx and routes.ts live at src/.
//
// This file is inert until vite.config.ts registers the reactRouter() plugin —
// that swap is the LAST commit of the stage, on purpose (rollback plan, 1.16).
export default {
  appDirectory: 'src',
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config
