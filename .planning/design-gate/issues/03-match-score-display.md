# Do seekers see a personal match score?

Type: grilling
Status: open

## Question

Two committed documents disagree, and nothing arbitrates them.

- `docs/design/v11-DIRECTIVE.md` §1.4: workers **never** see a personal number.
- `JobDetail.tsx`: shows a signed-in seeker a **numeric total plus per-dimension scores**, and
  shows a visitor a fabricated blurred `VISITOR_TEASER_SCORE` of **78**.

`docs/DESIGN.md:301-308` separately calls the Match Score circle "the single most identifying
component in the product".

This is a **product decision, not a gate condition** — but it must be ruled before the seeker
leg, or the audit will reopen the argument every time someone looks at the component. It is
also the one ticket here whose answer may require a redesign rather than a repair.

Sub-questions the ruling has to cover:
- Does a signed-in seeker see a number at all? If not, what replaces it — a band, a
  qualitative label, nothing?
- Does the per-dimension breakdown survive?
- What does a **visitor** see? The fabricated 78 is invented data shown to a real person;
  whatever the ruling, a made-up number presented as a real one needs to go or be
  unmistakably labelled.
- Does `v11-DIRECTIVE.md` §1.4 get amended, or does `JobDetail.tsx`?

Flagged in the brief §5 as "surface it; do not resolve it unilaterally."
