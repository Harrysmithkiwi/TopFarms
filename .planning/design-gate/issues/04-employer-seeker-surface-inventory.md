# What are the employer and seeker surfaces, by route?

Type: task
Status: open

## Question

Not a decision — the fact-gathering two decisions wait on. AFK; the agent can do this alone.

The brief warns that employer and seeker **have no directory boundary**: `src/pages/dashboard/`
and `src/pages/onboarding/` each hold both, split only by a `Seeker*` filename prefix.
**Scope by route, not by path.**

Produce, from `src/main.tsx` (the single place all 24 `requiredRole` routes are declared):

1. Every route per portal — employer, seeker — with its component and file path.
2. Which of them fetch, submit, or depend on a session (i.e. which owe all four §5 states).
3. Which route through a **shared** component versus hand-rolling their own states — the
   admin equivalent of "9 of 13 route through `AdminTable`".
4. The shared components that span portals (`ProtectedRoute`, `Button`, `Input`, `Skeleton`,
   `Card`, `Pagination`…), noting which already passed a gate pass on the admin leg.
5. Any surface that is genuinely marketing wearing a portal route — out of scope, but name it
   so it is not re-litigated.

Record the inventory as the answer on this ticket; `05` and `06` both read it.
