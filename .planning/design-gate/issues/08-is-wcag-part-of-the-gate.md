# Is WCAG AA a pass/fail condition of the gate, or adjacent to it?

Type: grilling
Status: open

## Question

Gate A's browser pass measured accessibility properly for the first time and the results split
hard:

**Passing, measured:** 0 contrast failures at 1440 and 390; focus rings settle at 4.57:1;
0 horizontal overflow; 0 occurrences of the Tailwind v4 `outline-none` trap.

**Failing, on the portal's landing screen:** one `h1` and zero `h2`–`h6` across six regions of
content, so screen-reader heading navigation does not exist; the only content tab stop is an
`svg` with `role="application"` and an empty `<title>`; table `<th>`s with `scope=null` and no
`<caption>`; 14 unlabelled decorative icons; no skip link; every mobile nav target 40px against
a 44px minimum.

`docs/DESIGN.md:164` says "the gate is not only visual… Authorisation, auth states, and state
coverage are part of this contract" — it names states and auth, **not** WCAG.

Decide whether the gate **fails** a surface on WCAG AA, or merely reports it. That single
choice sets the size of the employer and seeker legs, because the same shared components
carry the same defects everywhere.

If the answer is "part of the gate", the follow-on is which subset is blocking — contrast and
focus are already automatable and already pass; heading structure and accessible naming are
neither automatable nor currently passing.
