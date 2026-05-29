# Testing Patterns

**Analysis Date:** 2026-05-29

## Test Framework Setup

**Runner:**
- **Vitest** v3.1.1 (NOT Jest)
- **Config:** `vitest.config.ts` at repo root (merges with Vite config)
- **Environment:** `jsdom` (DOM simulation for React Testing Library)
- **Globals:** true (no need to import `describe`, `it`, `expect`, `vi` — they're global)
- **Setup File:** `tests/setup.ts` (runs before all tests)

**Assertion Library:**
- **@testing-library/jest-dom** v6.9.1 (provides matchers like `.toBeInTheDocument()`, `.toHaveBeenCalledWith()`)
- Imported in `tests/setup.ts:1`

**Test Dependencies:**
- **@testing-library/react** v16.3.0 — RTL for component rendering
- **@testing-library/user-event** v14.6.1 — user interaction simulation
- **jsdom** v29.0.0 — DOM polyfill for jsdom environment

**Run Commands:**
```bash
pnpm test                 # Run all tests in watch mode (Vitest default)
pnpm test --run           # Run all tests once and exit
pnpm test <file> --run    # Run specific test file once
pnpm test --coverage      # Generate coverage report (if configured)
```

## Test File Organization

**Location:**
- All tests in `tests/` at repo root (NOT co-located with source files)
- Directory structure mirrors `src/` loosely, but not strictly enforced

**Naming:**
- Pattern: `{feature}.test.ts` (pure logic) or `{feature}.test.tsx` (React components)
- Examples:
  - `tests/signup-toast-persistence.test.tsx` (SIGNUP-01 behavior)
  - `tests/featured-listings-tier-type.test.ts` (static-source guard)
  - `tests/saved-search-quick-load.test.tsx` (SRCH-14 component test)
  - `tests/mark-job-filled-rpc.test.tsx` (RPC contract test)

**Test Count:**
- ~314 passing tests
- ~114 deferred tests (it.todo stubs)
- Total: ~428 tests

## Setup & Teardown

**Global Setup (tests/setup.ts):**
```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// ResizeObserver polyfill for Radix UI components
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Cleanup after each test (unmount React tree, clear DOM)
afterEach(() => {
  cleanup()
})
```

**Per-Test Setup:**
- Use `beforeEach()` to reset mocks before each test
- Example (signup-toast-persistence.test.tsx:86-88):
```typescript
beforeEach(() => {
  toastErrorMock.mockClear()
})
```

**Teardown:**
- Automatic via `cleanup()` in global afterEach
- Manual cleanup rarely needed (React Testing Library handles unmounting)

## Test Structure & Patterns

**Basic Suite Structure:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Feature Name — Requirement ID', () => {
  beforeEach(() => {
    // Reset mocks
  })

  it('descriptive test case name', async () => {
    // Arrange: setup
    // Act: trigger behavior
    // Assert: check expectations
  })
})
```

**Arrange-Act-Assert Pattern:**
Example from saved-search-quick-load.test.tsx:80-103:
```typescript
it('opening dropdown fetches top 5 saved searches ordered by created_at desc', async () => {
  // ARRANGE: Setup mock return values
  useAuthMock.mockReturnValue({
    session: { user: { id: 'user-123' } },
    role: 'seeker',
    loading: false,
  })
  const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ order: orderMock }),
    }),
  })

  // ACT: Render component and trigger action
  render(
    <MemoryRouter>
      <SavedSearchesDropdown />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))

  // ASSERT: Verify expectations
  await waitFor(() => {
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limitMock).toHaveBeenCalledWith(5)
  })
})
```

## Mocking Patterns

### 1. vi.hoisted for Static Imports (Critical Pattern)

When the System Under Test (SUT) **statically imports** a module (e.g., `import { supabase } from '@/lib/supabase'`), the mock **must be hoisted** using `vi.hoisted()`. This ensures Vitest's transformer lifts the mock definition to the top of the file, before compile-time module resolution.

**Example (signup-toast-persistence.test.tsx:19-24):**
```typescript
const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }))

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock, success: vi.fn(), warning: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}))

// Static imports come AFTER vi.mock (hoisted)
import { SignUp } from '@/pages/auth/SignUp'
import { AuthProvider } from '@/contexts/AuthContext'
```

**Why it's Required:**
- Vitest's transformer hoists `vi.mock()` calls to the top of the module automatically
- Static imports are resolved at transform-time, not runtime
- Without hoisting, the import resolves to the real module before the mock is installed
- Async/lazy imports (via `await import(...)`) can use `vi.mock()` without hoisting

### 2. Hoisted Mocks for Multiple Dependencies

**Example (saved-search-quick-load.test.tsx:20-37):**
```typescript
const navigateMock = vi.hoisted(() => vi.fn())
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigateMock }
})

const useAuthMock = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }))

const fromMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }))

beforeEach(() => {
  navigateMock.mockReset()
  fromMock.mockReset()
  useAuthMock.mockReset()
})
```

**Key Points:**
- Each hoisted mock gets a `beforeEach(() => { mockName.mockReset() })` to clear previous calls
- `vi.importActual()` + spread for partial mocks (preserve non-mocked exports like `Link` at line 24)
- Mock function created once (hoisted), cleared before each test (beforeEach)

### 3. Mocking Supabase Queries

**Chainable Builder Pattern:**
Supabase's `.from().select().eq().order().limit()` returns chainable objects. Mock the chain:

**Example (saved-search-quick-load.test.tsx:80-103):**
```typescript
function mockListReturning(
  rows: Array<{ id: string; name: string; search_params: string; created_at: string }>,
) {
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  })
}
```

**Usage in Test:**
```typescript
mockListReturning([
  {
    id: 'r1',
    name: 'Dairy in Waikato',
    search_params: 'shed_type=rotary&region=Waikato',
    created_at: '2026-05-04T00:00:00Z',
  },
])
```

### 4. Mocking RPC Calls

**Single RPC Function Mock:**
```typescript
const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))
```

**Multiplexed RPC (different responses per function name):**
**Example (mark-job-filled-rpc.test.tsx:34-52):**
```typescript
function setupDefaultApplicantRpc() {
  rpcMock.mockImplementation((name: string) => {
    if (name === 'get_applicants_for_job') {
      return Promise.resolve({
        data: [
          {
            id: 'aaaaaaaa-0000-0000-0000-000000000001',
            seeker_id: 'seek-1',
            display_name: 'John Smith',
            match_score: 78,
          },
        ],
        error: null,
      })
    }
    // mark_job_filled or any other RPC
    return Promise.resolve({ data: null, error: null })
  })
}
```

### 5. React Component Mocking

**Passthrough Mock for Layout Chrome:**
When a component is just wrapping the SUT and not being tested, mock it to a passthrough:

**Example (from saved-search-list.test.tsx comments):**
```typescript
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => children,
}))
```

This prevents needing to set up complex provider trees just for layout chrome.

### 6. Mocking Sonner Toasts

**Pattern (signup-toast-persistence.test.tsx:19-24):**
```typescript
const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }))

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,  // Mock the Toaster component to null
}))
```

**Assertion in Test:**
```typescript
await waitFor(() => {
  expect(toastErrorMock).toHaveBeenCalledWith(
    'Unable to validate email address: invalid format',
    expect.objectContaining({
      duration: Infinity,
      closeButton: true,
    }),
  )
})
```

## The Static-Source-Guard Pattern

A regression test pattern using `readFileSync()` to assert that specific code patterns exist in source files. Used for type-safety regressions where the bug is caught by shape-checking, not runtime behavior.

**Purpose:**
- Catch type-related bugs that are silent at runtime (e.g., passing string values to an int-expecting database column)
- Act as a regression net so bugs don't resurface after fix
- Very fast (<5ms), no DOM rendering or network calls

**Pattern (featured-listings-tier-type.test.ts:1-37):**
```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_PATH = resolve(__dirname, '..', 'src', 'components', 'landing', 'FeaturedListings.tsx')
const source = readFileSync(SOURCE_PATH, 'utf-8')

describe('HOMEBUG-02 — listing_tier int type guard', () => {
  it('uses integer values in .in(listing_tier, [...]) — Postgres schema is int NOT NULL DEFAULT 1', () => {
    // POST-FIX assertion (RED until fix shipped, GREEN after):
    expect(source).toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*2\s*,\s*3\s*\]\s*\)/)
  })

  it('does NOT use string tier names ("featured", "premium") — that yields Postgres type error', () => {
    // Negative guard against pre-fix shape:
    expect(source).not.toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*'featured'/)
  })

  it('getTierBadge helper still maps both int and string tiers (defence-in-depth)', () => {
    expect(source).toMatch(/t === '3'/)
    expect(source).toMatch(/t === '2'/)
  })
})
```

**Another Example (jobsearch-accommodation-remap.test.ts:1-45):**
```typescript
const SOURCE_PATH = resolve(__dirname, '..', 'src', 'pages', 'jobs', 'JobSearch.tsx')
const source = readFileSync(SOURCE_PATH, 'utf-8')

describe('HOMEBUG-03 — accommodation filter Layer 2 remap', () => {
  it('declares ACCOMMODATION_FILTER_TO_DB lookup constant', () => {
    expect(source).toMatch(/const\s+ACCOMMODATION_FILTER_TO_DB\s*:\s*Record<string,\s*string>\s*=\s*\{/)
  })

  it('maps URL param values to DB column values (couples → "Couples welcome", etc.)', () => {
    expect(source).toMatch(/couples\s*:\s*'Couples welcome'/)
    expect(source).toMatch(/family\s*:\s*'Family welcome'/)
    expect(source).toMatch(/pet_friendly\s*:\s*'Pets allowed'/)
  })

  it('uses the lookup in .overlaps() (wired, not dead code)', () => {
    expect(source).toMatch(/ACCOMMODATION_FILTER_TO_DB\[/)
  })

  it('does NOT pass raw searchParams directly to .overlaps() (pre-fix shape)', () => {
    expect(source).not.toMatch(/\.overlaps\(\s*'employer_profiles\.accommodation_extras'\s*,\s*accommodationTypes\s*\)/)
  })
})
```

**Key Practices:**
- Use regex with `\s*` for whitespace tolerance (code may be reformatted)
- Include both positive assertions (fix must exist) and negative assertions (pre-fix shape must NOT exist)
- Post-fix tests are RED at scaffold time, GREEN when the fix ships
- Very fast; fine to include many regex patterns per test file

## The it.todo Deferral Pattern

Stubs for tests that will be filled in during implementation. They don't fail; they show up as "todo" in the test report.

**Purpose:**
- Scaffold test suite for a feature before implementation
- Document test intent in the test name
- Track how many tests are planned vs. implemented

**Example (job-search.test.tsx:1-31):**
```typescript
describe('Job Search', () => {
  describe('SRCH-01: Search page rendering', () => {
    it.todo('renders FilterSidebar and job results grid')
    it.todo('shows skeleton cards during loading')
    it.todo('shows empty state when no results match')
  })

  describe('SRCH-02: Shed type filter', () => {
    it.todo('filters jobs by shed type checkboxes')
  })

  describe('SRCH-03: Accommodation filter', () => {
    it.todo('filters jobs by accommodation available toggle')
  })

  describe('SRCH-04: Visa sponsorship filter', () => {
    it.todo('filters jobs by visa sponsorship toggle')
  })
})
```

**Conversion to Real Test:**
Replace `it.todo('name')` with `it('name', async () => { ... })`

## Async Testing Patterns

**Using waitFor() for Async Operations:**
When component fetches data (via Supabase) or state updates asynchronously, use `waitFor()`:

**Example (saved-search-quick-load.test.tsx:98-103):**
```typescript
fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
await waitFor(() => {
  expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
  expect(limitMock).toHaveBeenCalledWith(5)
})
```

**Using screen.findBy() for Element Presence:**
`findBy` queries wait for the element to appear (combines `getBy` + `waitFor`):

**Example (signup-toast-persistence.test.tsx:69-70):**
```typescript
const seekerRoleButton = await screen.findByRole('button', { name: /seeker/i })
fireEvent.click(seekerRoleButton)
```

**Using act() for State Updates:**
When state updates must complete before assertions, wrap in `act()`:

**Example (from saved-search-list.test.tsx comments):**
```typescript
await act(async () => {
  await userEvent.click(screen.getByText('Delete'))
})
```

## Rendering Components with Context

**With MemoryRouter (for routing):**
```typescript
import { MemoryRouter } from 'react-router'

render(
  <MemoryRouter>
    <SignUp />
  </MemoryRouter>,
)
```

**With AuthProvider (for auth context):**
```typescript
import { AuthProvider } from '@/contexts/AuthContext'

render(
  <MemoryRouter>
    <AuthProvider>
      <SignUp />
    </AuthProvider>
  </MemoryRouter>,
)
```

**Mocking Providers Instead:**
For complex provider trees, mock the wrapper component (not recommended for core providers, but used for DashboardLayout per saved-search-list comments):
```typescript
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => children,
}))
```

## User Interaction Simulation

**fireEvent (low-level):**
```typescript
fireEvent.click(element)
fireEvent.change(element, { target: { value: 'new value' } })
fireEvent.keyDown(document, { key: 'Escape' })
```

**userEvent (high-level, preferred):**
```typescript
await userEvent.click(element)
await userEvent.type(inputElement, 'text to type')
```

**Example Mix (signup-toast-persistence.test.tsx:66-82):**
```typescript
const seekerRoleButton = await screen.findByRole('button', { name: /seeker/i })
fireEvent.click(seekerRoleButton)  // Low-level for quick click

const emailInput = await screen.findByLabelText(/email/i)
const passwordInput = screen.getByLabelText(/^password$/i)
fireEvent.change(emailInput, { target: { value: 'not_an_email@example.test' } })
fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } })

const termsCheckbox = screen.getByRole('checkbox')
fireEvent.click(termsCheckbox)

const submitButton = screen.getByRole('button', { name: /create account/i })
fireEvent.click(submitButton)
```

## Querying Elements

**getBy (throws if not found — use for required elements):**
```typescript
screen.getByRole('button', { name: /create account/i })
screen.getByLabelText(/email/i)
```

**findBy (async, waits for element — use for lazy-rendered elements):**
```typescript
await screen.findByText('Dairy in Waikato')
```

**queryBy (returns null if not found — use for checking absence):**
```typescript
expect(screen.queryByTestId('saved-searches-dropdown-trigger')).toBeNull()
```

**testId (when semantic queries don't work):**
```typescript
screen.getByTestId('saved-searches-dropdown-trigger')
```

## Assertions

**Common Matchers:**
```typescript
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toHaveClass('class-name')
expect(element).toHaveAttribute('aria-expanded', 'true')
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
expect(fn).toHaveBeenCalledTimes(1)
expect(fn).toHaveBeenCalledWith(..., expect.objectContaining({ key: value }))
expect(source).toMatch(/regex/)
expect(source).not.toMatch(/regex/)
```

## Test File Comments

Each test file has a header comment documenting:
- **Phase + Feature ID** (e.g., "SIGNUP-01", "SRCH-14", "DOC-QUEUE-01")
- **What flips RED/GREEN** (e.g., "RED at scaffold time; GREEN when Wave 1 plan ships...")
- **Mock strategy** (hoisted vs. lazy, which modules are mocked)
- **Reference** to planning doc if complex

**Example (signup-toast-persistence.test.tsx:1-14):**
```typescript
/**
 * SIGNUP-01 — Sonner toast persistence for email_address_invalid
 *
 * RED at scaffold time (Wave 0); flips GREEN when Wave 1 plan 22-01 adds
 * `{ duration: Infinity, closeButton: true }` to the toast.error call at
 * SignUp.tsx:88.
 *
 * Pattern: vi.mock of @/lib/supabase + vi.mock of sonner. Static import
 * of SignUp component requires vi.hoisted for the toast mock (see
 * tests/saved-search-modal.test.tsx for the canonical hoisted pattern).
 *
 * Reference: .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md
 * §Pattern 1, §Example 4.
 */
```

## Coverage & Reporting

**Coverage Target:**
- Not explicitly enforced in config; project uses test count + passing rate as primary metric
- ~314 passing tests + ~114 deferred tests indicate broad coverage

**When Adding Tests:**
- Always add test files to `tests/` (not src)
- Use it.todo() stubs for test intent before implementation
- Match existing test file naming pattern
- Include file header comment with phase/feature ID and mock strategy

---

*Testing analysis: 2026-05-29*
