# Purge the old UAT accounts without breaking CI

Type: task
Status: open

## Question

The launch gate includes purging 3 UAT accounts. Since that item was written, two accounts
became load-bearing: `harry.symmans.smith+ci-seeker@gmail.com` and `+ci-employer@` are wired
into GitHub Actions (`E2E_*` secrets), and `E2E_REQUIRED_ROLES` now **fails CI** if they stop
authenticating — deleting them doesn't skip quietly anymore, it turns CI red.

To rule:
1. **Which accounts are the purge 3**, exactly (operator knows; `LAUNCH.md` UAT table lists
   them). The `+ci-*` pair must not be among them.
2. **The old E2E seeker identity**: `.env` still points `E2E_SEEKER_*` at the operator's
   personal address locally. Rotate local `.env` to the `+ci-seeker` account so local and CI
   test as the same identity, and the personal account is no longer a test credential.
3. Whether purge happens before or after the M4 audit rerun (after is safer — the audit may
   want to exercise them one last time).

Engineering executes the deletions once named (auth.users + cascade check), operator confirms
the list.
