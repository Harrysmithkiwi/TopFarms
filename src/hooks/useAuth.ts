// useAuth was moved to src/contexts/AuthContext.tsx as part of AUTH-FIX
// (single AuthProvider subscription replaces 22 independent hook instances
// each spinning up their own getSession + onAuthStateChange + loadRole chain).
// This re-export keeps the original import path working so callers do not change.
export { useAuth, type AuthHookReturn } from '@/contexts/AuthContext'
