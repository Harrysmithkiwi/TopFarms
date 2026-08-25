# Phase 8: Wizard Field Extensions - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add ~30 missing SPEC v3.0 form fields across all three wizards (employer onboarding, post job wizard, seeker onboarding), upgrade checkbox fields to ChipSelector where SPEC requires, persist every new field to Supabase, and upgrade both completion screens to SPEC two-column layouts. No new wizard steps — only extending existing ones.

</domain>

<decisions>
## Implementation Decisions

### Completion screens
- Employer step 8: two-column layout — left column has success checklist (profile completeness: what's done), right column has live mini preview of farm profile as it appears to seekers
- Primary CTA: "Post Your First Job" — secondary CTAs: view dashboard, edit profile
- Seeker step 7: two-column layout — left column has success checklist + "Calculating your matches" message (with loading state), right column has live mini preview of candidate card as it appears to employers
- Matched jobs section shows "We're calculating your matches" placeholder until Phase 11 wires real data
- Both completion screens show profile completeness checklist (green checks for completed sections), not next-steps to-do lists

### Boolean→chip migration
- Silent auto-convert: DB migration converts boolean columns (accommodation_pets, accommodation_couples, etc.) to string arrays automatically — no user-facing notice
- Users see existing selections pre-populated as chips when they re-open wizards
- Shed type: keep existing 5 values (Rotary, Herringbone, AMS, Swing-Over, Tiestall) + keep "Other" as-is for existing users who selected it
- ALL checkbox→ChipSelector upgrades happen in this phase — clean sweep across all three wizards for consistency
- Employer step 5 accommodation extras: use full SPEC extras list (8+ items including pets, couples, family, utilities, furnished, garden, garage, etc.) as ChipSelector grid

### Field validation rules
- Match-critical fields are required: shed type, region, accommodation, salary range — these feed match scoring
- Non-match-critical fields are optional: breed, property size, certifications, etc.
- Salary range: validate min < max on blur, show market rate comparison hint below inputs (e.g., "Market rate for Farm Manager: $55k-$75k")
- Distance >30km warning: hay-colored InfoBox below distance select — "Remote locations may receive fewer applicants. Consider highlighting accommodation and transport options."
- Seeker availability date and notice period: optional with encouragement nudge — "Adding your availability helps employers plan — listings with dates get 30% more views"

### LivePreview integration (post job wizard)
- Side-by-side layout: form on left (~640px), LivePreviewSidebar on right (320px sticky)
- Sidebar appears on steps 2-5 only — step 1 (basics) doesn't have enough data to preview
- Mini card preview reflects key fields in real-time: title, farm name, location, salary range, key tags (shed type, accommodation)
- Hidden on mobile (below 1024px) — mobile users get full-width form, preview is desktop value-add
- Match pool section uses static placeholder numbers (Phase 11 wires real data)

### Claude's Discretion
- Exact chip grid column counts per field (2x3, 3x3, inline, etc.)
- Completeness meter calculation weights
- Form field ordering within steps (follow SPEC layout)
- Responsive breakpoints for two-column completion screens
- Zod schema structure for new fields

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SPEC wireframes — wizard fields
- `SPEC.md` §6.3 (Employer Onboarding) — Steps 2-5 field specs: farm type chip grid, calving system, nearest town + distance warning, career dev chips, accommodation extras chip grid, salary range, billing toggle, completion screen layout
- `SPEC.md` §6.4 (Post Job Wizard) — Steps 2-5 field specs: breed, milking freq, shed type chips, dairy experience, seniority, qualifications, visa chips, pay frequency, hours range, weekend roster, LivePreviewSidebar placement
- `SPEC.md` §6.9 (Seeker Onboarding) — Steps 1/3/5 field specs: 6 sector chips, licence/certification chips, salary input, availability date, notice period, housing sub-option chips, preferred regions multi-select

### Existing wizard code
- `src/pages/onboarding/steps/Step2FarmDetails.tsx` — Current employer step 2 (farm details with 3-option checkbox shed type)
- `src/pages/onboarding/steps/Step4Accommodation.tsx` — Current employer step 4 (boolean accommodation fields)
- `src/pages/onboarding/steps/Step8Complete.tsx` — Current employer completion (simple centered card)
- `src/pages/onboarding/steps/SeekerStep7Complete.tsx` — Current seeker completion (simple centered card)
- `src/pages/jobs/steps/JobStep2FarmDetails.tsx` — Current post job step 2
- `src/types/domain.ts` — TypeScript interfaces (SeekerProfileData, JobListing) that need extending

### Phase 7 primitives
- `src/components/ui/ChipSelector.tsx` — ChipSelector component (string[] value shape, columns prop, single/multi-select)
- `src/components/ui/LivePreviewSidebar.tsx` — LivePreviewSidebar component (320px sticky, completeness meter, mini card, match pool placeholder)
- `src/components/ui/InfoBox.tsx` — InfoBox component (for distance >30km warning)

### Design tokens
- `src/index.css` — Color tokens (moss, hay, fog, cream, meadow, soil), typography (Fraunces, DM Sans)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ChipSelector`: Built in Phase 7, ready for all chip upgrades — supports single/multi-select, columns prop, icon prop
- `LivePreviewSidebar`: Built in Phase 7 — completeness meter, mini card preview, match pool placeholder, AI tip placeholder
- `InfoBox`: Existing component for contextual hints — use for distance warning and accommodation stat
- `ProgressBar`: moss→meadow gradient — used inside LivePreviewSidebar completeness meter
- `FileDropzone`: Existing upload component — but document upload deferred to Phase 11 (SONB-02)
- `Select`, `Input`, `Toggle`: Existing form components used throughout wizards

### Established Patterns
- Wizards use `react-hook-form` + `zod` validation + `Controller` for controlled components
- Each step is a separate component receiving `onComplete`, `onBack`, `defaultValues` props
- Design tokens via CSS custom properties (`var(--color-moss)` etc.)
- `cn()` utility from `@/lib/utils` for className merging

### Integration Points
- `src/types/domain.ts` — TypeScript interfaces must be extended BEFORE step UI work (STATE.md decision)
- DB migrations needed for new columns + boolean→array conversions
- `booleanColumnsToChipArray()` utility needed for mapping existing boolean data to ChipSelector string[] values (Phase 7 decision)
- Post job wizard `PostJob.tsx` layout needs updating to support side-by-side form + sidebar on steps 2-5

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All visual specifications come from SPEC.md wireframe descriptions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-wizard-field-extensions*
*Context gathered: 2026-03-21*
