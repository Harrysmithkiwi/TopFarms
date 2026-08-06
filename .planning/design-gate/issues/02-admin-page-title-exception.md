# Admin page titles contradict the declared type ramp

Type: grilling
Status: open

## Question

`docs/DESIGN.md:201` assigns **Headline (600, 36/44)** to "Page titles, major section headers.
One per screen." Every admin screen ships its page title at **20px** via
`AdminPageHeader.tsx:31-36` — all 11 of them, consistently.

Assessment A raised this unprompted as a canon disagreement rather than a finding: the shipped
consistency is right for a dense internal tool, and 36px page titles would make the admin
portal shout.

Decide: **record an admin exception in `docs/DESIGN.md`** (page titles are Title 20/28 on
gated-portal tooling; Headline is for marketing and public surfaces), or **change the 11
screens** to match the ramp as written.

If neither happens, every future audit files a correctly-consistent choice as drift — which
is exactly the noise the gate exists to remove.

Note the constraint from the brief: additions go **inline in existing sections**; the
six-section structure of `docs/DESIGN.md` is fixed.
