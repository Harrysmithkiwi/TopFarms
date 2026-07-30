# TopFarms — Cold-start outreach email (founder → farm)

Purpose: invite a farm that's **already advertising a role elsewhere** to also post it free on TopFarms. Warm, personal, founder-to-farmer. Send from your own address, personalised per farm. **Never bulk-blast** — batches of ~5 so you can react to replies.

## The 10 rules for a human-sounding email (judge every send against these)

1. **Read it aloud.** If it sounds like marketing, rewrite it. Contractions always.
2. **Their world first.** Open on *their* ad/farm — never "I'm Harry from TopFarms."
3. **Personalisation must connect to the ask.** If deleting the opening line leaves the email still making sense, the personalisation is fake.
4. **Every sentence earns its place.** The best version feels like it could've been shorter.
5. **One low-friction ask.** They can say yes in a one-line reply.
6. **Subject: 2–4 words, lowercase, internal-looking.** No pitch, no emoji, no first name.
7. **No AI tells.** Kill "I hope this finds you well", "reach out", "leverage", "excited to", "in today's fast-paced", and list-of-three sentences.
8. **Founder, not brand.** Signed by Harry — one human, never "The TopFarms Team".
9. **Honest.** Free means free. No invented numbers (same standard as the whole site).
10. **Brand voice — "matched, not sorted":** frame it as *relief* — you surface the right people instead of burying them in CVs.

## Subject line — pick one
- `your [role] ad`  ·  `[Farm] role`  ·  `posting your job`

## Template (fill the `[bracketed]` bits from each ad)

> **Subject:** your [role] ad
>
> Hi [Name],
>
> Saw you're after a [role] at [Farm] down in [Region][ — one real detail from the ad, e.g. "on the 730-cow rotary"].
>
> I've just built TopFarms — a NZ-only site for farm jobs. It's free to list, and rather than burying you in irrelevant CVs it scores applicants against what you actually need: shed type, experience, visa status, the lot.
>
> You're already advertising the role — want me to put it up on TopFarms too? Five minutes of my time, nothing from you, and it gets in front of people specifically hunting for [Region] farm work.
>
> Worth a go?
>
> Harry
>
> Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
> Not interested? Reply "no thanks" and I won't contact you again.

~90 words. The single real detail in the opener is what makes it read as human — always include one.

### The last two lines are not optional (legal)

Every one of these is a **commercial electronic message** under the Unsolicited Electronic Messages
Act 2007. There is **no B2B exemption and no low-volume exemption.** Sections 10–11 require, in every
message:

1. **Accurate sender identification including contact details** — a name and a working address, not
   just a domain.
2. **A functional unsubscribe facility** — and it must actually be honoured.

"Reply 'no thanks'" is a valid unsubscribe facility *provided you act on it*. When someone replies:
reject the lead with suppression in `/admin/leads` — that writes `lead_suppression`, which
permanently blocks re-creation of the same fingerprint by any later harvest
(`041_leads_pipeline.sql:117-119`). Do not simply delete the lead; a delete lets the harvester
re-import them next week.

Penalties reach $200,000 for an individual. This is the cheapest compliance item in the entire
product — do not send a batch without these lines.

## Worked example (illustrative — confirm the real role from the ad)

> **Subject:** your shepherd ad
>
> Hi Logan,
>
> Saw Onenui Station's after a shepherd out in Hawke's Bay — big hill-country block by the looks of it.
>
> I've just built TopFarms, a NZ-only site for farm jobs. It's free to list, and instead of burying you in irrelevant CVs it scores applicants on what actually matters — hill experience, dogs, tickets.
>
> You're already advertising — want me to put your listing up on TopFarms too? Five minutes my end, nothing from you, and it reaches people specifically after Hawke's Bay station work.
>
> Worth a go?
>
> Harry
> topfarms.co.nz

## One follow-up (only if no reply after ~4 days — add something, don't "just check in")

> **Subject:** re: your shepherd ad
>
> Hi Logan — no worries if it's not for you. Offer stands if you change your mind: I'll get the ad up in five minutes, no cost, and it's in front of people searching specifically for Hawke's Bay farm work. — Harry
>
> Harry Smith · TopFarms · hello@topfarms.co.nz · Reply "no thanks" to stop hearing from me.

> **Truth-pass note (2026-07-30).** This follow-up previously read *"a couple of Hawke's Bay farms have
> listed this week, so there are local candidates actively looking."* Production currently holds **0
> active jobs**, so that sentence would have been false at send time. Never claim listing volume,
> candidate counts or activity levels in outreach unless you have just read them off the live board.
> The offer itself is the pitch — it does not need a number behind it.

## Send checklist
- Personalised the `[role]` + one real detail? (not just the name)
- Subject 2–4 words, lowercase?
- Read it aloud — sounds like you?
- One ask, one-line reply to say yes?
- Sending in a small batch, from your own address?

Shortlist of contactable farms lives in `LAUNCH.md` / the leads triage notes. Do not send from automation — this is founder-to-farmer, by hand.
