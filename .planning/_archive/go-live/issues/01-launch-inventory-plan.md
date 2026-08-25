# How many real listings by launch day, and which leads get pushed?

Type: grilling
Status: open

## Question

Measured 2026-08-07: prod has **0 jobs**, 1 employer profile, **62 staged leads**. Directive
§1.15 forbids seeding, and the counter gate hides the stats band below 10 of everything — so
the launch-day board is exactly what outreach converts by Day 7.

The operator owns two calls engineering cannot make:

1. **The number.** What is the minimum credible board for launch day? The v2.1 gate said
   "even 5–10 real jobs changes the picture". Is 5 enough to launch against, or does launch
   slip if the board is under N?
2. **The push list.** Which of the 62 staged leads get the outreach push this week, and in
   what order? Lane A/B mechanics exist; the reply-draft config (`LEAD-05`) is still awaiting
   the operator's `lead_outreach_config`, so drafts stay manual unless that lands too.

Engineering commitments once ruled: same-day fixes on any signup/posting friction a
converting employer hits, admin queue prep for the chosen batch, and the counter-gate floor
honoured (no fiddling it downward to fake liveliness).

**Fallback worth ruling on now:** if Day 6 arrives with fewer than N listings, does launch
proceed with an honest thin board, or hold? Deciding this before Day 6 keeps it a plan
instead of a scramble.
