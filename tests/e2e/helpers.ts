import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type Role = 'seeker' | 'employer' | 'admin'

// ESM ("type": "module") — no __dirname; derive from import.meta.url.
export const AUTH_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth')

export function statePath(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`)
}

export function creds(role: Role): { email: string; password: string } | null {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`]
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`]
  return email && password ? { email, password } : null
}

/** True when auth.setup.ts produced a storage state for this role this run. */
export function hasState(role: Role): boolean {
  return fs.existsSync(statePath(role))
}

export const SKIP_NO_CREDS = (role: Role) =>
  `${role} credentials not provided (E2E_${role.toUpperCase()}_EMAIL/_PASSWORD) — see playwright.config.ts header`
