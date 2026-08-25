# Phase 8: Wizard Field Extensions - Research

**Researched:** 2026-03-21
**Domain:** React wizard form extension — react-hook-form + zod + Supabase migrations + ChipSelector integration
**Confidence:** HIGH

## Summary

Phase 8 extends three existing wizards (employer onboarding, post job wizard, seeker onboarding) with approximately 30 missing SPEC v3.0 fields. All Phase 7 primitives (ChipSelector, LivePreviewSidebar, InfoBox) are confirmed built and ready for consumption. The codebase uses a consistent, well-understood pattern: react-hook-form + zod + Controller for each step, with Supabase upsert on step completion persisted through shell orchestrators (EmployerOnboarding.tsx, PostJob.tsx, SeekerOnboarding.tsx).

The critical sequencing constraint established in STATE.md is: TypeScript interface extensions and DB migrations MUST precede any step-level UI work — writing to Supabase columns that do not yet exist causes silent NULL persistence without runtime errors. The boolean-to-chip migration in employer_profiles (accommodation_pets, accommodation_couples, accommodation_family, accommodation_utilities_included) requires a `booleanColumnsToChipArray()` utility and a DB migration altering those boolean columns to `text[]`.

The three wizards differ architecturally: the employer onboarding shell uses a single `handleStepComplete` function with a flat upsert payload; the post job wizard uses separate per-step handlers; the seeker onboarding (not fully read but follows same pattern per SeekerOnboarding.tsx). This means type interface changes and Supabase payload mappings must be coordinated in each shell file as well as each step component.

**Primary recommendation:** Execute in strict wave order — (1) DB migration + TypeScript interfaces, (2) `booleanColumnsToChipArray()` utility, (3) step component extensions by wizard, (4) PostJob.tsx layout upgrade for LivePreviewSidebar, (5) completion screen upgrades.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Completion screens:**
- Employer step 8: two-column layout — left column has success checklist (profile completeness: what's done), right column has live mini preview of farm profile as it appears to seekers
- Primary CTA: "Post Your First Job" — secondary CTAs: view dashboard, edit profile
- Seeker step 7: two-column layout — left column has success checklist + "Calculating your matches" message (with loading state), right column has live mini preview of candidate card as it appears to employers
- Matched jobs section shows "We're calculating your matches" placeholder until Phase 11 wires real data
- Both completion screens show profile completeness checklist (green checks for completed sections), not next-steps to-do lists

**Boolean→chip migration:**
- Silent auto-convert: DB migration converts boolean columns (accommodation_pets, accommodation_couples, etc.) to string arrays automatically — no user-facing notice
- Users see existing selections pre-populated as chips when they re-open wizards
- Shed type: keep existing 5 values (Rotary, Herringbone, AMS, Swing-Over, Tiestall) + keep "Other" as-is for existing users who selected it
- ALL checkbox→ChipSelector upgrades happen in this phase — clean sweep across all three wizards for consistency
- Employer step 5 accommodation extras: use full SPEC extras list (8+ items including pets, couples, family, utilities, furnished, garden, garage, etc.) as ChipSelector grid

**Field validation rules:**
- Match-critical fields are required: shed type, region, accommodation, salary range — these feed match scoring
- Non-match-critical fields are optional: breed, property size, certifications, etc.
- Salary range: validate min < max on blur, show market rate comparison hint below inputs (e.g., "Market rate for Farm Manager: $55k-$75k")
- Distance >30km warning: hay-colored InfoBox below distance select — "Remote locations may receive fewer applicants. Consider highlighting accommodation and transport options."
- Seeker availability date and notice period: optional with encouragement nudge — "Adding your availability helps employers plan — listings with dates get 30% more views"

**LivePreview integration (post job wizard):**
- Side-by-side layout: form on left (~640px), LivePreviewSidebar on right (320px sticky)
- Sidebar appears on steps 2-5 only — step 1 (basics) doesn't have enough data to preview
- Mini card preview reflects key fields in real-time: title, farm name, location, salary range, key tags (shed type, accommodation)
- Hidden on mobile (below 1024px) — mobile users get full-width form, preview is desktop value-add
- Match pool section uses static placeholder numbers (Phase 11 wires real data)

### Claude's Discretion
- Exact chip grid column counts per field (2x3, 3x3, inline, etc.) — resolved in UI-SPEC
- Completeness meter calculation weights
- Form field ordering within steps (follow SPEC layout)
- Responsive breakpoints for two-column completion screens
- Zod schema structure for new fields

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EONB-01 | Step 2 shows 6 farm types in 2x3 chip grid + 4 ownership structure chips | Step2FarmDetails.tsx currently has ownership_type as Select + no farm_type chips — needs ChipSelector for farm type (currently in Step1) and ownership |
| EONB-02 | Step 3 includes calving system select, nearest town input, distance-from-town select with >30km hay warning | Step3Culture.tsx currently has culture_description, team_size, about_farm — new fields need adding + InfoBox conditional on distance value |
| EONB-03 | Step 3 shed type uses ChipSelector with 5 options (Rotary, Herringbone, AMS, Swing-Over, Tiestall) | shed_type currently uses 3 Checkbox items in Step2FarmDetails — move to Step3 per SPEC, upgrade to ChipSelector, expand to 5 options |
| EONB-04 | Step 4 includes career development chip grid, hiring frequency select, couples toggle with partner sub-select | Step4Accommodation.tsx currently handles only accommodation — new fields need adding |
| EONB-05 | Step 4 textarea char limits match SPEC (175/400 for about farm) | Step3Culture.tsx currently uses MAX_CHARS = 2000 — must change to SPEC values (175 short / 400 long) |
| EONB-06 | Step 5 includes blue info box ("76% of seekers need accommodation"), full 8+ extras chip grid, vehicle toggle with chips, broadband toggle | Step4Accommodation.tsx currently has 4 boolean checkboxes — upgrade to extras ChipSelector + add toggles |
| EONB-07 | Step 5 includes salary range min/max NZD inputs with market rate comparison hint | No salary fields in employer onboarding currently — new addition |
| EONB-08 | Step 7 includes annual/monthly billing toggle with "Save 20%" messaging | Step6Pricing.tsx is tier selection — Step7Preview.tsx needs billing toggle added |
| EONB-09 | Step 8 shows two-col completion with success checklist, 3 CTAs, AI tip, and live profile preview | Step8Complete.tsx is currently simple centered card — full rebuild to two-column |
| PJOB-01 | Step 1 uses two-column layout (soil left panel with stats, cream right form) | JobStep1Basics.tsx is single-column — needs two-column layout restructure |
| PJOB-02 | Step 2 includes breed select, milking frequency, calving system, farm area, nearest town, distance with warning | JobStep2FarmDetails.tsx missing breed, milking_frequency, calving_system, farm_area, nearest_town, distance fields |
| PJOB-03 | Step 2 shed type uses ChipSelector with 5 options instead of 3 checkboxes | shed_type currently uses 3 Checkbox items — upgrade to 5-option ChipSelector |
| PJOB-04 | Step 3 includes minimum dairy experience select, seniority level select, qualifications section, visa chip grid | JobStep3Skills.tsx uses SkillsPicker only — new fields needed alongside |
| PJOB-05 | Step 4 includes market rate salary comparison hint, pay frequency, on-call allowance, hours range, weekend roster | JobStep4Compensation.tsx has salary + checkboxes — new fields + InfoBox needed |
| PJOB-06 | Step 5 textarea char limits match SPEC (175/400 for overview) | JobStep5Description.tsx char limits need verification/update |
| PJOB-07 | Steps 2-5 show LivePreviewSidebar with completeness meter, mini card preview, match pool estimate | PostJob.tsx uses `max-w-2xl mx-auto` single-column — needs grid layout change for steps 2-5 |
| PJOB-08 | Step 8 success screen shows stats grid (avg days to first applicant, seekers in match pool, actively looking) | JobStep8Success.tsx currently shows basic success + share — needs StatsStrip component |
| SONB-01 | Step 1 shows all 6 sector chips (+ Cropping, Deer, Mixed, Other beyond current 2) | SeekerStep1FarmType.tsx has 2 large card options — upgrade to 6-option ChipSelector |
| SONB-03 | Step 3 includes NZ driver's licence chips and other certification chips (ATV, tractor, 4WD, first aid) | SeekerStep3Qualifications.tsx has only DairyNZ level select — new chip fields needed |
| SONB-04 | Step 5 includes minimum salary input, availability date, notice period | SeekerStep5LifeSituation.tsx has no salary/availability fields — new additions |
| SONB-05 | Step 5 housing sub-options use chip grid (Single, Couple working, Couple not working, Family, Working dogs, Pets) | Currently boolean checkboxes under accommodation_needed toggle — upgrade to ChipSelector |
| SONB-06 | Step 5 preferred regions uses multi-select chip grid (8 NZ regions) instead of single select | Currently single Select component — upgrade to ChipSelector multi-select |
| SONB-07 | Step 7 completion shows success screen with profile checklist, match pool preview, top 3 matched jobs with scores | SeekerStep7Complete.tsx is simple spinner — full rebuild to two-column |
</phase_requirements>

## Standard Stack

### Core (confirmed from codebase inspection)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.x | Form state, validation, Controller | Established pattern in all existing wizard steps |
| zod | ^3.x | Schema definition and inference | All steps use zodResolver, existing schemas to extend |
| @hookform/resolvers | ^3.x | RHF/zod bridge | Already imported in every step file |
| ChipSelector | local `src/components/ui/ChipSelector.tsx` | Chip multi/single select | Phase 7 output, confirmed built with string[] value shape |
| LivePreviewSidebar | local `src/components/ui/LivePreviewSidebar.tsx` | Post job wizard sidebar | Phase 7 output, sticky 320px, accepts completenessPercent + miniCard |
| InfoBox | local `src/components/ui/InfoBox.tsx` | Contextual warnings/hints | 5 variants: blue, hay, green, purple, red |
| Select | local `src/components/ui/Select.tsx` | Single-select dropdowns | Used throughout all wizards |
| Toggle | local `src/components/ui/Toggle.tsx` | Binary toggles | Step4Accommodation pattern established |
| Input | local `src/components/ui/Input.tsx` | Text/number/date inputs | Used in all wizards |
| Button | local `src/components/ui/Button.tsx` | CTAs and navigation | Variants: primary, outline, ghost |
| supabase-js | ^2.x | DB reads/writes | All data persistence via supabase client |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cn() | local `@/lib/utils` | className merging | All conditional class logic |
| lucide-react | ^0.x | Icons | Check, CheckCircle etc. already used in ChipSelector and Step8Complete |
| sonner (toast) | ^1.x | Toast notifications | Existing pattern for save success/error |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ChipSelector | Checkbox | ChipSelector is the mandated upgrade target — Checkbox is being replaced |
| Single Select | ChipSelector multi | Multi-region (SONB-06) requires multi-select chip grid per SPEC |
| zod on-submit validation | on-change/on-blur | Salary range: validate min < max on blur per CONTEXT.md — use `trigger()` from RHF after blur |

**Installation:** No new packages required — Phase 8 exclusively uses existing project dependencies.

## Architecture Patterns

### Recommended Project Structure

Phase 8 modifies existing files only — no new directories. New files created:

```
supabase/migrations/
└── 013_phase8_wizard_fields.sql      # DB migration: new columns + boolean→array conversions

src/lib/
└── wizardUtils.ts                    # booleanColumnsToChipArray() + completeness helpers

src/pages/onboarding/steps/
├── Step2FarmDetails.tsx              # MODIFIED: farm type chips, ownership chips
├── Step3Culture.tsx                  # MODIFIED: calving, nearest town, distance warning, shed type ChipSelector, char limit fix
├── Step4Accommodation.tsx            # MODIFIED: career dev chips, hiring freq, couples toggle + salary
├── Step5Accommodation.tsx            # MODIFIED (was Step4): extras ChipSelector, info box, vehicle/broadband toggles
├── Step7Preview.tsx                  # MODIFIED: add billing toggle
└── Step8Complete.tsx                 # REBUILT: two-column completion

src/pages/onboarding/steps/
├── SeekerStep1FarmType.tsx           # REBUILT: 6-option ChipSelector (was 2 large cards)
├── SeekerStep3Qualifications.tsx     # MODIFIED: add licence/cert chips
├── SeekerStep5LifeSituation.tsx      # MODIFIED: salary, availability, notice period, housing chips, regions chips
└── SeekerStep7Complete.tsx           # REBUILT: two-column completion

src/pages/jobs/steps/
├── JobStep1Basics.tsx                # MODIFIED: two-column layout
├── JobStep2FarmDetails.tsx           # MODIFIED: breed, milking freq, calving, farm area, nearest town, distance, shed ChipSelector
├── JobStep3Skills.tsx                # MODIFIED: add experience, seniority, qualifications, visa chips
├── JobStep4Compensation.tsx          # MODIFIED: pay frequency, on-call, hours range, weekend roster, InfoBox
└── JobStep8Success.tsx               # MODIFIED: stats grid

src/pages/onboarding/EmployerOnboarding.tsx  # MODIFIED: EmployerProfileData interface + upsert payload
src/pages/jobs/PostJob.tsx                    # MODIFIED: grid layout for steps 2-5, LivePreviewSidebar wiring
src/types/domain.ts                           # MODIFIED: SeekerProfileData + JobListing interfaces
```

### Pattern 1: ChipSelector with react-hook-form Controller

**What:** Replace Checkbox loops with ChipSelector using Controller wrapper.
**When to use:** Every checkbox-to-chip upgrade in Phase 8.

```typescript
// Source: ChipSelector.tsx + existing Controller pattern
import { ChipSelector } from '@/components/ui/ChipSelector'

// In zod schema:
shed_type: z.array(z.string()).min(1, 'Select shed type'),  // required
career_dev: z.array(z.string()).optional(),                  // optional

// In JSX:
<div>
  <p className="font-body text-[13px] font-semibold text-ink mb-2">Shed type *</p>
  <Controller
    control={control}
    name="shed_type"
    render={({ field }) => (
      <ChipSelector
        options={SHED_TYPE_OPTIONS}
        value={field.value ?? []}
        onChange={field.onChange}
        mode="multi"
        columns="inline"
      />
    )}
  />
  {errors.shed_type && (
    <p className="text-red text-[12px] mt-1">{errors.shed_type.message}</p>
  )}
</div>
```

### Pattern 2: Conditional InfoBox (distance warning)

**What:** Show InfoBox hay variant when distance select is ">30km" or ">50km".
**When to use:** EONB-02 (Step 3), PJOB-02 (Job Step 2).

```typescript
// Source: InfoBox.tsx + InfoBoxProps
const distance = watch('distance_from_town')
const showDistanceWarning = distance === '>30km' || distance === '>50km'

// In JSX (after the distance Select):
{showDistanceWarning && (
  <InfoBox variant="hay">
    Remote locations may receive fewer applicants. Consider highlighting
    accommodation and transport options.
  </InfoBox>
)}
```

### Pattern 3: Salary range with blur validation

**What:** Two side-by-side salary inputs with on-blur min<max check.
**When to use:** EONB-07 (employer Step 5), PJOB-05 (Job Step 4), SONB-04 (seeker Step 5).

```typescript
// Source: existing JobStep4Compensation.tsx pattern + zod refine
const schema = z.object({
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
}).refine(
  (d) => !d.salary_min || !d.salary_max || d.salary_min < d.salary_max,
  { message: 'Maximum must be greater than minimum', path: ['salary_max'] }
)

// Trigger blur validation manually:
<Input
  label="Max salary (NZD)"
  type="number"
  error={errors.salary_max?.message}
  {...register('salary_max', {
    onBlur: () => trigger('salary_max'),
  })}
/>
```

### Pattern 4: Toggle with conditional reveal

**What:** Toggle row that reveals additional fields when enabled.
**When to use:** Couples toggle with partner sub-select (EONB-04), vehicle toggle with chips, broadband toggle.

```typescript
// Source: Step4Accommodation.tsx — established pattern
const couplesOn = watch('couples_welcome')

<div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
  <div>
    <p className="font-body text-[13px] font-semibold text-ink">Couples welcome?</p>
    <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
      We'll match you with couples-ready seekers
    </p>
  </div>
  <Controller
    control={control}
    name="couples_welcome"
    render={({ field }) => (
      <Toggle checked={field.value} onCheckedChange={field.onChange} />
    )}
  />
</div>

{couplesOn && (
  <div className="space-y-3 pl-1">
    <Controller
      control={control}
      name="partner_role"
      render={({ field }) => (
        <Select
          label="Partner's role"
          options={PARTNER_ROLE_OPTIONS}
          value={field.value}
          onValueChange={field.onChange}
        />
      )}
    />
  </div>
)}
```

### Pattern 5: LivePreviewSidebar layout in PostJob.tsx

**What:** Wrap steps 2-5 in grid layout with sidebar visible on desktop only.
**When to use:** PJOB-07 — PostJob.tsx shell for steps 2-5.

```typescript
// Source: LivePreviewSidebar.tsx props + UI-SPEC interaction contract
// PostJob.tsx — conditional grid wrapper
const showSidebar = currentStep >= 1 && currentStep <= 4  // steps 2-5 (0-indexed 1-4)

// Replace the current single step wrapper for steps 2-5:
<div className={showSidebar ? 'grid grid-cols-[1fr_320px] gap-8 items-start' : ''}>
  <div className="bg-white rounded-[16px] border border-fog p-6 shadow-sm">
    {/* step content */}
  </div>
  {showSidebar && (
    <div className="hidden lg:block">
      <LivePreviewSidebar
        completenessPercent={computedCompleteness}
        miniCard={miniCardData || undefined}
      />
    </div>
  )}
</div>
```

### Pattern 6: booleanColumnsToChipArray utility

**What:** Map legacy boolean DB values to string[] for ChipSelector defaultValues.
**When to use:** Loading existing employer profile data for re-entry into upgraded steps.

```typescript
// Source: STATE.md decision + Phase 7 design
// src/lib/wizardUtils.ts

const ACCOMMODATION_CHIP_MAP: Record<string, string> = {
  accommodation_pets: 'Pets allowed',
  accommodation_couples: 'Couples welcome',
  accommodation_family: 'Family welcome',
  accommodation_utilities_included: 'Utilities included',
}

export function booleanColumnsToChipArray(
  profile: Record<string, boolean | unknown>,
  columnMap: Record<string, string>,
): string[] {
  return Object.entries(columnMap)
    .filter(([col]) => profile[col] === true)
    .map(([, chipValue]) => chipValue)
}
```

### Pattern 7: Two-column completion screen

**What:** Grid layout for completion screens — left checklist, right mini preview card.
**When to use:** EONB-09 (Step8Complete), SONB-07 (SeekerStep7Complete).

```typescript
// Source: UI-SPEC completion screen contract
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Left column */}
  <div className="space-y-6">
    {/* Success icon + heading */}
    {/* Checklist */}
    {/* CTAs */}
    {/* Match pool loading (seeker only) */}
  </div>
  {/* Right column — mini preview card */}
  <div className="hidden md:block">
    <div className="rounded-[14px] border border-fog overflow-hidden bg-white">
      {/* Profile/candidate card preview */}
    </div>
  </div>
</div>
```

### Anti-Patterns to Avoid

- **Modifying step components before the DB migration:** Writing new fields in the upsert will silently store NULL if the column doesn't exist — no runtime error.
- **Adding new form fields directly to `EmployerProfileData` without also updating the upsert payload in `handleStepComplete`:** State will be accumulated but never persisted to Supabase.
- **Using `overflow: hidden` on the PostJob.tsx container that wraps LivePreviewSidebar:** Breaks `sticky` positioning — already documented in LivePreviewSidebar.tsx JSDoc.
- **Keeping boolean schema for accommodation extras in Step4/Step5:** After DB migration converts to `text[]`, the zod schema must also change from `z.boolean()` to `z.array(z.string())`.
- **Treating SeekerStep1FarmType.tsx like a normal RHF form:** It currently uses `useState` not react-hook-form — upgrading to ChipSelector can keep the same pattern or migrate to RHF (keep useState for simplicity since it's a single-field step).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chip multi-select | Custom checkbox grid | `ChipSelector` | Already built in Phase 7 with exact design system tokens |
| Sticky sidebar | Custom sticky div | `LivePreviewSidebar` | Phase 7 built component — handles completeness meter, mini card, match pool |
| Contextual warnings | Custom alert divs | `InfoBox` variant="hay"/"blue" | Exact variants exist for distance warning and accommodation stat |
| Class merging | String concatenation | `cn()` from `@/lib/utils` | Prevents class conflicts, already used everywhere |
| Form state management | useState per field | react-hook-form + Controller | All wizards already use this pattern — deviating causes defaultValues issues |
| Boolean-to-array mapping | Inline conversion logic | `booleanColumnsToChipArray()` utility | Single source of truth for the migration mapping, reused across employer onboarding and post job wizard |

**Key insight:** Phase 8 is entirely about wiring existing Phase 7 primitives into existing form steps — no custom component work required. Every UI element already exists.

## Common Pitfalls

### Pitfall 1: DB Migration Out of Order
**What goes wrong:** Steps are updated to write new fields to Supabase but columns don't exist yet. Supabase silently ignores unknown columns in upsert — data is lost with no error.
**Why it happens:** Developer updates step UI first, tests locally, data appears to save, but DB never received the new columns.
**How to avoid:** Wave 0 must be DB migration + TypeScript interface update. Test by querying the table directly after each step save.
**Warning signs:** Fields submit but come back as `null`/`undefined` when re-opening wizard.

### Pitfall 2: Boolean Columns Not Converted Before ChipSelector
**What goes wrong:** accommodation_pets, accommodation_couples, etc. are boolean in DB but ChipSelector expects string[]. Existing users re-open wizard and see no chips selected — data appears lost.
**Why it happens:** DB migration converts the column type but `booleanColumnsToChipArray()` utility isn't called before passing defaultValues.
**How to avoid:** The utility must be called in the shell orchestrator (EmployerOnboarding.tsx) when mapping DB data to profileData state.
**Warning signs:** ChipSelector renders but nothing is pre-selected even though DB has values.

### Pitfall 3: Zod Schema Still References boolean After DB Migration
**What goes wrong:** Zod schema has `accommodation_pets: z.boolean()` but the Controller now passes `string[]` — runtime type error or form never validates correctly.
**Why it happens:** DB migration and schema update are done in separate tasks by different plan waves.
**How to avoid:** Zod schema update must be in the same task as the ChipSelector UI upgrade for each step.

### Pitfall 4: PostJob.tsx Container overflow Breaks Sticky Sidebar
**What goes wrong:** LivePreviewSidebar doesn't stick as user scrolls — floats up out of view.
**Why it happens:** Any ancestor with `overflow: hidden` or `overflow: auto` clips the sticky context. The current PostJob.tsx wraps content in `DashboardLayout` which may have scroll overflow set.
**How to avoid:** Verify DashboardLayout scroll container is the `<body>` or `<html>` element, not an inner div with overflow. LivePreviewSidebar JSDoc explicitly documents this constraint.
**Warning signs:** Sidebar is visible but scrolls away with content instead of staying fixed.

### Pitfall 5: EmployerProfileData Interface Missing New Fields
**What goes wrong:** Step component submits new fields via `onComplete()` but the shell's `EmployerProfileData` interface doesn't include them — TypeScript may not catch if fields are spread into the upsert payload, and they silently drop.
**Why it happens:** Interface and step are updated in separate phases of work.
**How to avoid:** Interface update and upsert payload update must be in the same task as the step UI work.

### Pitfall 6: Char Limit Mismatch (EONB-05, PJOB-06)
**What goes wrong:** Step3Culture.tsx currently uses `MAX_CHARS = 2000` for both culture_description and about_farm. SPEC requires 175/400. Existing users may have text exceeding new limits — zod validation will block submit.
**Why it happens:** The char limit was set arbitrarily in Phase 2.
**How to avoid:** When updating char limits, add a migration note: truncation of existing data is NOT performed (DB constraint is not changed). Zod validates at 175/400 for new input only. Existing data over limit will fail validation when user re-edits — acceptable per CONTEXT.md.

### Pitfall 7: SeekerStep1FarmType Uses useState Not RHF
**What goes wrong:** Assuming all steps use react-hook-form and adding Controller — the step uses direct useState and its own form handler. Adding Controller without RHF context causes a crash.
**Why it happens:** SeekerStep1FarmType was built before the react-hook-form convention solidified.
**How to avoid:** The SONB-01 task must either: (a) keep useState and convert the 2-card layout to ChipSelector with useState, or (b) migrate to RHF. Option (a) is simpler — no RHF needed for a single field step.

### Pitfall 8: Seeker Step 5 Has Deeply Nested Schema
**What goes wrong:** The existing schema uses fields like `pets_dogs: z.boolean()` and `family_has_children: z.boolean()` with manual mapping in `onSubmit`. Adding housing sub-option chips requires a new top-level `housing_sub_options: z.array(z.string())` field — the old boolean fields conflict.
**Why it happens:** The original schema modeled sub-properties of nested objects as flat booleans for DB compatibility.
**How to avoid:** Add new chip fields as top-level schema properties. The DB migration adds `housing_sub_options text[]` as a new column — old boolean columns (`pets`, `family`) remain for backward compat and are phased out when DB is updated.

## Code Examples

Verified patterns from codebase inspection:

### ChipSelector integration (confirmed API)
```typescript
// Source: src/components/ui/ChipSelector.tsx
// Props: options, value (string[]), onChange, mode ('single'|'multi'), columns (1|2|3|'inline')
<ChipSelector
  options={[
    { value: 'rotary', label: 'Rotary' },
    { value: 'herringbone', label: 'Herringbone' },
    { value: 'ams', label: 'AMS' },
    { value: 'swing_over', label: 'Swing-Over' },
    { value: 'tiestall', label: 'Tiestall' },
  ]}
  value={field.value ?? []}
  onChange={field.onChange}
  mode="multi"
  columns="inline"
/>
```

### InfoBox confirmed variants
```typescript
// Source: src/components/ui/InfoBox.tsx
// Variants: 'blue' | 'hay' | 'green' | 'purple' | 'red'
// Usage: hay for distance warning, blue for accommodation stat
<InfoBox variant="hay">
  Remote locations may receive fewer applicants. Consider highlighting
  accommodation and transport options.
</InfoBox>

<InfoBox variant="blue">
  76% of seekers need accommodation — listings with it get 2x more applications
</InfoBox>
```

### LivePreviewSidebar confirmed props
```typescript
// Source: src/components/ui/LivePreviewSidebar.tsx
interface LivePreviewSidebarProps {
  completenessPercent: number   // 0-100
  miniCard?: {
    title: string
    farmName: string
    location: string
    salaryRange?: string
    tags?: string[]
  }
  className?: string
}
// Shows MiniCardPlaceholder when miniCard is undefined
```

### EmployerOnboarding upsert pattern
```typescript
// Source: src/pages/onboarding/EmployerOnboarding.tsx
// Shell uses flat upsert — new fields must be added to both EmployerProfileData interface
// AND the upsert payload object in handleStepComplete
const upsertPayload = {
  user_id: session.user.id,
  ...updatedData,           // spreads EmployerProfileData
  onboarding_step: stepIndex + 1,
  ...(isLastStep ? { onboarding_complete: true } : {}),
}
await supabase.from('employer_profiles').upsert(upsertPayload, { onConflict: 'user_id' })
```

### PostJob per-step handler pattern
```typescript
// Source: src/pages/jobs/PostJob.tsx
// Unlike employer onboarding, PostJob has per-step handlers
// New fields added to JobPostingData must be added to the relevant handler's update call
async function handleStepComplete(stepData: Partial<JobPostingData>, _stepIndex: number) {
  const updatedData = { ...jobData, ...stepData }
  setJobData(updatedData)
  await supabase.from('jobs').update({
    // ALL job columns must be explicitly listed — spread is not used here
    shed_type: updatedData.shed_type,
    // ... add new fields here
  }).eq('id', jobId)
}
```

### Textarea char count pattern (existing)
```typescript
// Source: src/pages/onboarding/steps/Step3Culture.tsx
const [cultureCount, setCultureCount] = useState(defaultValues?.culture_description?.length ?? 0)

<textarea
  maxLength={175}  // SPEC value — was 2000
  {...register('culture_description', {
    onChange: (e) => setCultureCount(e.target.value.length),
  })}
/>
<p className="text-[12px] font-body ml-auto" style={{ color: 'var(--color-light)' }}>
  {cultureCount}/175
</p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Checkbox for shed type | ChipSelector (Phase 8) | Phase 8 | All 3 wizards use consistent chip UI |
| boolean accommodation_pets etc. | text[] extras chip array | Phase 8 DB migration | Enables multi-value extras grid |
| 2-option farm type cards (seeker) | 6-option ChipSelector grid | Phase 8 | Adds Cropping, Deer, Mixed, Other sectors |
| Single region Select (seeker) | Multi-select region chip grid | Phase 8 | Seekers can prefer multiple regions |
| Simple centered completion cards | Two-column layout with live preview | Phase 8 | SPEC compliance + increased perceived value |
| Max-width 2xl single column (PostJob steps 2-5) | Grid with LivePreviewSidebar on desktop | Phase 8 | Real-time preview for job posting quality |

**Deprecated/outdated after Phase 8:**
- Checkbox component usage in accommodation, shed type, and certification fields: replaced by ChipSelector everywhere
- boolean columns `accommodation_pets`, `accommodation_couples`, `accommodation_family`, `accommodation_utilities_included` in employer_profiles: converted to `accommodation_extras text[]`

## Open Questions

1. **Step mapping: EONB-01 says "Step 2 shows 6 farm types" but Step 1 is currently "Farm Type"**
   - What we know: Step1FarmType.tsx handles farm_type. Step 2 is FarmDetails. EONB-01 describes "6 farm types in 2x3 chip grid + 4 ownership structure chips" — the requirement may be describing what moves to Step 2 or restructuring Step 1 to add more chips.
   - What's unclear: Whether "Step 2" in EONB-01 refers to the current step 2 (Farm Details) being extended with farm type chips, or a restructure of step 1.
   - Recommendation: Read SPEC.md §6.3 Steps 2-5 field specs. Most likely: farm_type chip grid stays in Step 1 but expands from 2 large cards to 6 ChipSelector options (SONB-01 pattern), and ownership_type chips move/expand in Step 2. The planner should resolve by reading SPEC.md.

2. **Boolean column migration: ALTER COLUMN or ADD new column?**
   - What we know: accommodation_pets etc. are currently `bool NOT NULL DEFAULT false` in employer_profiles (migration 004). The match scoring function (009) reads `accommodation->>'pets'` from the jsonb column in jobs table — not from employer_profiles boolean columns.
   - What's unclear: Whether ALTER COLUMN bool → text[] works cleanly in Postgres or requires DROP + ADD + data copy. Also whether the `accommodation_extras text[]` replaces or supplements the individual boolean columns.
   - Recommendation: Use ADD new column `accommodation_extras text[]`, populate from boolean values, then DROP old boolean columns in same migration. This is safer than ALTER COLUMN type change.

3. **PostJob.tsx `handleStepComplete` is a single function handling all steps 2-7**
   - What we know: The function always writes ALL accumulated fields in `updatedData` to Supabase, not just the step's fields. New fields from step 2 will be written on every subsequent step completion.
   - What's unclear: Whether new fields added for specific steps might conflict (e.g., writing `undefined` for step 3 fields during step 2 save).
   - Recommendation: Keep existing pattern — undefined values are safely coalesced with `?? null` before write. Planner should ensure new fields in JobPostingData have null coalescing in the update payload.

## Validation Architecture

> Note: `workflow.nyquist_validation` key is absent from .planning/config.json — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not detected — no test config files found in project |
| Config file | None — Wave 0 gap |
| Quick run command | TBD after framework installed |
| Full suite command | TBD after framework installed |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EONB-01 | Farm type + ownership chips render with correct options | unit | TBD | ❌ Wave 0 |
| EONB-02 | Distance warning InfoBox shows/hides based on select value | unit | TBD | ❌ Wave 0 |
| EONB-03 | Shed type ChipSelector renders 5 options, value is string[] | unit | TBD | ❌ Wave 0 |
| EONB-06 | Extras chip grid renders 8+ items, boolean→chip preload works | unit | TBD | ❌ Wave 0 |
| EONB-07 | Salary range validates min < max on blur | unit | TBD | ❌ Wave 0 |
| EONB-09 | Completion screen renders two-column layout on md+ | unit | TBD | ❌ Wave 0 |
| PJOB-03 | Post job step 2 shed type uses ChipSelector with 5 options | unit | TBD | ❌ Wave 0 |
| PJOB-07 | LivePreviewSidebar renders on steps 2-5, hidden below 1024px | integration | TBD | ❌ Wave 0 |
| SONB-01 | Seeker step 1 renders 6 sector chips | unit | TBD | ❌ Wave 0 |
| SONB-06 | Preferred regions uses multi-select ChipSelector with 8 regions | unit | TBD | ❌ Wave 0 |
| SONB-07 | Seeker completion two-column layout + match loading state | unit | TBD | ❌ Wave 0 |
| DB migration | Boolean columns converted, new columns exist | manual-only | Check via Supabase Studio or psql | ❌ Wave 0 |

**Note:** No test infrastructure exists in this project. All validation is manual or visual. Wave 0 would need to establish a test framework (Vitest + React Testing Library) before any automated testing is possible. Given the complexity of wizard integration tests, recommend manual testing protocol as the Phase 8 gate, with Vitest setup deferred.

### Sampling Rate
- **Per task commit:** Manual visual check — open wizard step in browser, verify fields render and submit
- **Per wave merge:** Full wizard run-through end-to-end for affected wizard
- **Phase gate:** All three wizards complete full flow, data persists in Supabase with correct column values

### Wave 0 Gaps
- [ ] No test framework installed — Vitest + @testing-library/react installation needed if automated tests required
- [ ] DB migration `013_phase8_wizard_fields.sql` does not yet exist — must be created in Wave 0
- [ ] `src/lib/wizardUtils.ts` does not yet exist — `booleanColumnsToChipArray()` needed before step upgrades

*(Primary gap: DB migration and utility function — not test framework, as project has no existing tests)*

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all source files read verbatim (Step2FarmDetails, Step4Accommodation, Step8Complete, SeekerStep1FarmType, SeekerStep3Qualifications, SeekerStep5LifeSituation, SeekerStep7Complete, JobStep1Basics, JobStep2FarmDetails, JobStep3Skills, JobStep4Compensation, JobStep8Success, PostJob.tsx, EmployerOnboarding.tsx, domain.ts, ChipSelector.tsx, LivePreviewSidebar.tsx, InfoBox.tsx, migration 004+009)
- Phase 8 CONTEXT.md — locked decisions and canonical refs
- Phase 8 UI-SPEC.md — chip grid specs, interaction contracts, color/typography contracts

### Secondary (MEDIUM confidence)
- STATE.md accumulated decisions — boolean→chip migration approach, interface-first ordering constraint
- REQUIREMENTS.md — requirement descriptions used to map to existing code gaps

### Tertiary (LOW confidence)
- None — all findings are from direct source code inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct file inspection
- Architecture: HIGH — all existing patterns confirmed by reading shell orchestrators and step components
- Pitfalls: HIGH — each pitfall is grounded in specific code observations (boolean schemas, upsert payload structure, overflow CSS, useState vs RHF)
- DB migration approach: MEDIUM — confirmed column names from migration 004, approach recommendation (ADD vs ALTER) based on Postgres conventions

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable codebase — no external dependencies changing)
