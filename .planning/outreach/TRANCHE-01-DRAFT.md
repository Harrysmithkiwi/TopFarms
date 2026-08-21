# Outreach tranche 1 — DRAFT ONLY, nothing sent

**Status: awaiting operator review. Nothing has been sent, staged as sent, or written to `leads`.**
Sending is the operator's hand (standing constraint 1).

Drafted 2026-08-21 against `lead_outreach_config` (voice guide + do-not rules, live row id 1)
and the UEMA rules in `lead-draft-email`'s `SYSTEM_PROMPT`. Every draft carries the two legal
lines verbatim — `tests/outreach-uema-compliance.test.ts` exists because dropping them is a
$200k exposure under the Unsolicited Electronic Messages Act 2007.

Link used throughout: `https://www.topfarms.co.nz/signup?role=employer` (pre-selects the role,
v12-DIRECTIVE §4; walked on live prod).

---

## Before you send: three things I could not decide for you

1. **These leads are still `pending` in `lead_staging`.** Only 2 rows exist in `leads`, and
   neither is in this tranche. Promotion is the human approval gate (041: "only
   `admin_lead_approve` moves staging → leads"), so I have not promoted anything. Approve the
   ones you like in the Outreach screen, then the drafts below attach to them.
2. **`Beckenham Hills Ltd` is duplicated in staging** — two rows, Canterbury and Otago, same
   address `accounts@beckenhamhills.co.nz`, contact spelled "Canswick" on one and "Cranswick"
   on the other. A dedupe miss. Both have an EMPTY `raw_excerpt`, so there is no real detail
   to personalise on either. **Excluded from this tranche**; emailing them twice would be the
   worst possible first impression.
3. **`Colhaven Farms Limited` is flagged `is_recruiter = false` but its contact is
   `laura@bakerag.co.nz`** — BakerAg is an agri consultancy, so this is very likely an agent
   advertising for a farm, not the farm. **Excluded.** Worth a look at whether the recruiter
   heuristic should catch consultancy domains.

That is 9 drafts, not 10. I would rather send 9 clean than pad it.

---

## Voice rules these were written against

From the live `lead_outreach_config` row, which is stricter than the edge function's older
prompt and wins where they disagree:

- **No mention of money, price, or "free"** in a first message. The signup page handles it.
- **No em dashes.** Commas or two short sentences.
- **UK/NZ spelling only.**
- **Never bash how they hire now.** No "Facebook is broken".
- **No AI as a selling point.** Never pitch "AI matching" to a stranger.
- **Never reference private circumstances** even when the post states them. This bit: Otherside
  Acres' ad explains they are readvertising because a staff member resigned to move closer to
  family. Draft 6 does not touch it.
- Name the company **once**, lightly, never first. Vary shape and length so it does not read
  as a template at volume.

---

## 1 · Melrose Station — Clutha, Otago · Head Shepherd
**To:** office@melrosestation.co.nz (Emily Wilson)
**Subject:** your head shepherd ad

```
Saw you're after a head shepherd at Melrose, down in the Clutha. 2,800 hectares is a
lot of country to cover, so getting someone who can handle that scale matters more
than filling the spot quickly.

I built TopFarms, it matches people on the experience you're actually after rather
than whoever happens to be looking this week. You can put the role up here:
https://www.topfarms.co.nz/signup?role=employer

Good luck either way,
Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

## 2 · Hodsell Farming — Taramoa, Southland · Farm Assistant / Herd Manager
**To:** hodsellfarming@yahoo.com
**Subject:** your herd manager role

```
Came across your ad for a farm assistant or herd manager out at Taramoa. A 40 a-side
herringbone with 600 cows through it is a decent operation to hand someone, and the
right fit matters more than a quick one.

I run TopFarms, which puts your job in front of people matched on the shed and system
you're running, not just anyone browsing. You can stick it up here:
https://www.topfarms.co.nz/signup?role=employer

Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

## 3 · Nosae Farming Ltd — Waihao Valley, Canterbury · 2IC / Trainee Manager
**To:** nosaefarming@gmail.com
**Subject:** your 2ic role

```
Saw your 2IC role in the Waihao Valley. Being able to take a day off is a fair reason
to hire, and it means you need someone you can genuinely leave in charge, not just
another pair of hands.

I run TopFarms, it matches people on the experience the job needs rather than sending
you a pile to sort through. The role can go up here:
https://www.topfarms.co.nz/signup?role=employer

Anyway, good luck with it.
Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

## 4 · Moratti Agri Limited — Taranaki · Seasonal Machinery Operators
**To:** office@morattiagri.co.nz
**Subject:** your machinery operators

```
Noticed you're lining up machinery operators for the 2026/27 season. Seasonal crews
are their own problem, you need them all at once and you need them to have actually
driven the gear.

I built TopFarms, it lets you reach operators directly rather than going through an
agency. You can put the season's roles up here:
https://www.topfarms.co.nz/signup?role=employer

Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

## 5 · Horrell Farms — Waikaia, Northern Southland · Farm Employee → Manager
**To:** clarkeandmegan@huntlyfarm.co.nz (Clarke Horrell)
**Subject:** your farm employee ad

```
Saw your ad for Waikaia, the one that leads into a management option. 5,500 ewes and
finishing most of your own lambs is a real job to step into, and worth being picky
about.

I run TopFarms, it helps you reach people beyond the local patch, which counts for a
bit in Northern Southland. Put it up here if you like:
https://www.topfarms.co.nz/signup?role=employer

Good luck either way,
Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

## 6 · Otherside Acres Farms — Tarras, Otago · Dairy Farming
**To:** z.b.othersideacres@outlook.com
**Subject:** your dairy role

```
Saw you're after someone full time near Tarras. Half an hour out of Wanaka is a
genuine selling point for the right person, though it does mean you're fishing in a
smaller pond locally.

I built TopFarms, it helps get the job in front of people further afield who'd shift
for it. You can put it up here:
https://www.topfarms.co.nz/signup?role=employer

Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

> ⚠ Their ad states why the role is open. Deliberately not referenced, per the do-not rules.

## 7 · Managh Farming — Whakamaru, Waikato · 2IC / Herd Manager
**To:** tommanagh@gmail.com (Tom and Alex)
**Subject:** your 2ic role

```
Came across your 2IC role at Whakamaru. Working alongside a contract milking couple
takes someone who fits the team as much as the job, and that's the harder thing to
screen for.

I run TopFarms, it matches on the actual skills and setup rather than just who's
about. The job can go up here:
https://www.topfarms.co.nz/signup?role=employer

Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

## 8 · Wagon Wheel Dairy — Putaruru, Waikato · Assistant Manager / 2IC
**To:** wagonwheeldairy@gmail.com (Courtney Tiddy)
**Subject:** your assistant manager ad

```
Saw your ad out on Lake Arapuni Road. Offering someone a path into sole charge is a
good pitch, and it'll pull a different sort of applicant than a straight 2IC job
would.

I built TopFarms, it puts the role in front of people with the experience to take
that step. You can list it here:
https://www.topfarms.co.nz/signup?role=employer

Good luck either way,
Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

## 9 · Tu Puni Farm — Fairlie, South Canterbury · Experienced Shepherd
**To:** handsheritage@gmail.com (Mark and Penny Williams)
**Subject:** your shepherd role

```
Saw you're after an experienced shepherd out of Fairlie. Three properties and 13,000
stock units across the Mackenzie is a lot of variety, and that suits some people far
better than others.

I run TopFarms, it matches on the country and stock someone's actually worked rather
than whoever applies first. The role can go up here:
https://www.topfarms.co.nz/signup?role=employer

Harry

Harry Smith · TopFarms · hello@topfarms.co.nz · topfarms.co.nz
Not interested? Reply "no thanks" and I won't contact you again.
```

---

## Self-check against the rules

| Rule | Status |
|---|---|
| Two legal lines verbatim, after the sign-off, in all 9 | ✅ |
| No em dashes anywhere | ✅ |
| No money / price / "free" mentioned | ✅ |
| UK/NZ spelling | ✅ |
| No banned words (leverage, seamless, unlock, talent pool…) | ✅ |
| No "I hope this finds you well" / "reach out" / "excited to" | ✅ |
| Never bashes how they hire now | ✅ |
| No AI as a selling point | ✅ |
| One real detail from THEIR ad in each | ✅ |
| Private circumstances never referenced (draft 6) | ✅ |
| Company named once, never first | ✅ |
| Subjects 2–4 words, lowercase, no pitch | ✅ |
| Shape varies (openers, benefit angle, sign-off, length) | ✅ 4 openers, 5 benefit angles, 3 sign-offs |
| Every link real and route-verified | ✅ `/signup?role=employer` |

## After you send

- Mark each with `admin_lead_mark_contacted` / `admin_outreach_mark_sent` so the next
  harvest cannot re-surface them.
- **Then stop.** Warm-up plan in `.planning/NOW.md`: 10–15 max in tranche 1, then hold 24h and
  re-read the Resend log before tranche 2. Auth email shares this sending reputation, so a bad
  tranche breaks signup for everyone.
- Anyone replying "no thanks" goes through `admin_lead_suppress`, which writes
  `lead_suppression` and marks the lead dead. `lead-draft-email` now refuses both (409), so a
  suppressed farm cannot be redrafted by accident.
