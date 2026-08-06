# Does admin's Gate A calibration carry to the other two portals?

Type: grilling
Status: open
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
