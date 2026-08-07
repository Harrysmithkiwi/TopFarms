# Does admin's Gate A calibration carry to the other two portals?

Type: grilling
Status: resolved
Blocked by: 04

## Question

Gate A was calibrated **on admin**, deliberately: the brief called admin "internal-only — the
safe place to get the gate wrong." The result was a measured false-positive rate per source
and a written `ignore.md`.

Decide whether that calibration is **portal-agnostic** or **portal-specific**.

Arguments it carries: same canon (`docs/DESIGN.md`), same detector, same locked decisions, and
the false-positive classes found were about the *tooling* (a YAML/prose mismatch, CSSOM
reads, self-audit) rather than about admin.

Arguments it does not: employer and seeker are **customer-facing**, so the bar for tone,
copy and emotional journey is different even though the mode is still Operate. Assessment A's
strongest admin findings were about *usefulness to one internal operator* — a lens that does
not transfer. A recalibration run also costs roughly what Gate A cost.

If the answer is "recalibrate per portal", say what the calibration is measured **against** —
admin had a pre-existing list of 11 known findings to score against, and neither other portal
has one.

## Answer

Resolved 2026-08-07.

**Ruling: the calibration carries. A re-calibration in the same form is impossible, and
attempting one would measure nothing.**

### What Gate A actually calibrated

Not "the gate on admin" — **the tooling**. Every false-positive class it found was
tooling-level and portal-independent:

| FP class | Cause | Admin-specific? |
|---|---|---|
| 67 of 94 detector findings | `DESIGN.md` YAML declared 5 type steps, prose declared 8 | No — **fixed at source** |
| `bounce-easing`, `layout-transition`, `repeating-stripes` | in-page detector reads the CSSOM, not the rendered tree | No |
| `text-occlusion` | the detector auditing its own injected overlay | No |
| `overused-font` (Inter 100%) | canon mandates it | No |
| Contrast failures | walker not canvas-normalising `oklch`/`color-mix` | No |
| Focus ring at 1.77:1 | sampled mid-`transition-all` | No |

Not one of them was about admin. All are written down in `.impeccable/critique/ignore.md` with
retirement conditions, and that file is portal-agnostic. The zero canon-contradicting false
positives from the design review came from canon reaching the tool — **the same canon governs
all three gated portals**.

### Why re-running it is impossible, not merely expensive

Gate A's number — 7 hits, 3 partial, 1 miss — was measurable **only because a list of 11 known
findings already existed** to score against. Neither employer nor seeker has one. Without a
ground truth there is no hit rate; a "calibration run" on employer would just be the first
critique, relabelled. Calling it a calibration would manufacture false confidence.

### What genuinely does not carry — and it is not the calibration's job

The **judgement lens**. Assessment A's strongest admin findings were about usefulness to one
internal operator checking the business each morning. Employer and seeker are customer-facing,
with different stakes and a different emotional journey. That lens difference is real, but it
is what the critique *does*, not what the calibration *measures*. Conflating them is what made
this ticket look bigger than it is.

### Instead: first run per portal is provisional

Cheap safeguard in place of a ceremony that cannot work.

1. Run the critique dual-agent as normal, first surface of a portal.
2. Before acting on it, read the output specifically for **new FP classes** — anything the
   admin run could not have surfaced.
3. Add them to `ignore.md` with a reason and a retirement condition.
4. From the second surface on, treat the gate as calibrated for that portal.

### Two things to set before either portal's first run

- **Mode.** Employer and seeker dashboards, verification and onboarding are **Operate**, as
  admin was. Do not let a customer-facing surface get critiqued as Persuade — that invites
  exactly the marketing-flavoured findings this canon split exists to prevent.
- **`/jobs` and `/jobs/:id` are the exception**, per `10`. In the gate for states,
  authorisation, accessibility and the `v11-DIRECTIVE` product principles; **out of scope for
  visual findings**, which stay under the marketing canon. Their critique must be run with the
  visual lens off, or every run will file discarded findings.
