# D4 — is the INZ accredited-employer register queryable? Verified 2026-08-18

**Stage 0 of the D4 work order** (`.planning/D4-AND-SEARCHHERO-PROMPT.md`), which recorded the
question as unknown and blocking. Established by opening the register in Chrome, watching the
network panel, and reading the terms that govern it. Method and evidence below, as `05` does.

**Verdict: the register is queryable by NZBN and it does publish an expiry — and the terms of
use forbid us querying it programmatically. So the lookup is real, the automation is not.**

Both halves matter. The first kills the pessimistic reading in `05` ("name search only, fuzzy
matching against 29,000 records"). The second kills Stage 2 and the inline variant of Stage 1.

---

## 1. What the register is

<https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/>

The page states its own contract, and it is better than we assumed:

> You will need information to identify the employer. This may be their: New Zealand Business
> Number (NZBN); company name or trading name.
> The NZBN is a 13-digit number. You must enter all 13 digits in the search field.

**It is keyed on NZBN** — the exact column `employer_verifications.nzbn_number` already holds,
already validated `^[0-9]{13}$` by `086`, already reviewed by an admin by hand. There is no
fuzzy name-matching problem to solve.

The page also states the limit that governs how we read a negative result:

> Some employers have chosen not to be published in the search results, check with the employer
> to find out if they are accredited or not.

**Absence from the register is not evidence of non-accreditation.** This is load-bearing for the
"Register does not confirm this" button — see §5.

> The list of employers is updated daily.

## 2. It is a JSON endpoint, not server-rendered HTML

Searching fires exactly one XHR. Captured by patching `XMLHttpRequest.prototype.send` on the
live page and re-running the search:

```
POST https://www.immigration.govt.nz/list-api/getAPIResults/
multipart/form-data:  query=<nzbn or name>   collection=2   page=1
```

The response is JSON: `{results, current, totalPages, totalResults}`, where `results` is a
JSON **string** that parses to an array of rows. Each row carries a `field_schema.raw` array of
`{Title, APIColumn, Value}`.

**The field set is exactly four columns, on every row, in every query tried** (`Fonterra`,
`dairy` — 431 results, `farm` — 971, `Waikato` — 68):

| `APIColumn` | Title | Example |
|---|---|---|
| `employerName` | Employer Name | `FONTERRA BRANDS (NEW ZEALAND) LIMITED` |
| `tradingName` | Trading Name | `Fonterra Brands New Zealand Limited` |
| `nzbn` | NZBN | `9429034603017` |
| `expiryDateOfAccreditation` | Expiry Date of Accreditation | `2028-06-22T00:00:00` |

**It publishes an expiry.** That is the field `091`'s CHECK constraint requires and could not
otherwise source from anywhere but the employer's own claim.

**It does not publish an accreditation type.** No standard / high-volume / triangular
distinction appears in the payload. If that distinction ever matters to a farm, the register
cannot answer it and the employer's statement remains the only source.

Behaviour worth recording:

- **NZBN search returns exactly one row.** `query=9429034603017` → `totalResults: 1`.
- **Name search returns up to 10 rows per page**, paginated by `page`. `farm` → 98 pages.
- **A miss is HTTP 400**, not an empty 200:
  `{"Title":"No Results","Message":"Your search found no results…"}`. A digit-flipped NZBN
  (`…3018`) returns the same 400, so a typo and a genuinely-unaccredited employer are
  indistinguishable from the response alone.
- **Under 3 characters is rejected**: `{"Message":"Your search query must contain at least 3 characters"}`.

## 3. There is no deep link, and no CORS

Two mechanical facts that decide the shape of Stage 1.

**No query-string deep link.** `?query=`, `?keyword=`, `?search=` and `?q=` on the register page
all return 200 with an empty search box and no results. The search state lives only in the XHR.
So "a deep link pre-filled with the NZBN" — option (b) in the work order — **is not available**.
The best link-out is the register page itself, with the NZBN presented for the admin to paste.

**No `Access-Control-Allow-Origin` header**, and `X-Frame-Options: SAMEORIGIN`. A browser on
`topfarms.co.nz` cannot call the endpoint and cannot iframe the page. So option (a) — the live
result rendered inline on the admin screen — could only be built through a server-side proxy,
which is Stage 2's Edge Function. **(a) and Stage 2 are the same piece of work**; the work order
separated them on the assumption that a queryable endpoint would be callable from the client.

For completeness: the endpoint answers a bare `curl` with no cookie, no referer, no CSRF token
and no user-agent, so such a proxy would be trivial to write. That it *would work* is not the
question. §4 is.

## 4. The terms of use forbid it — and this is the decisive finding

<https://www.immigration.govt.nz/about-us/about-this-site/using-our-website-and-online-tools/terms-of-use-of-our-online-systems/>

Under **"Your obligation to act in good faith"**:

> You must not: … use any scraping, deep-linking, harvesting, or data mining robot or spider,
> automation, or any similar data gathering, extraction or monitoring method with respect to
> Immigration New Zealand's websites or systems.
>
> You must access the Immigration New Zealand website via standard web browsers only, and not
> by any other method, unless we agree otherwise.

That is as direct as it gets. An Edge Function polling `/list-api/getAPIResults/` is automated
data gathering by a method other than a standard web browser. `robots.txt` does not disallow
`/list-api/` (it lists `/admin`, `/Security/`, `/_search/`, `/_visa-search/`,
`/_list-collection-search/`) — but robots.txt governs crawlers, and the terms govern us. **The
permissive robots.txt is not a permission.**

The work order said: *"Do not build around a prohibition."* So:

- **Stage 2 is not deferred, it is closed** until INZ agrees otherwise. The `unless we agree
  otherwise` clause is the legitimate route: an approach to MBIE for programmatic access. That
  is a relationship, not a sprint.
- **Stage 1 is the manual variant**, and there is no deep link to soften it (§3).

What we *may* do, explicitly:

> You can create hyperlinks from another website to this one. The link must not be presented on
> your website in any context implying our association with or endorsement of your website,
> service, or product…

So a plain link-out to the register from the admin screen is permitted, provided it does not
imply INZ endorses TopFarms.

And the register's content is reusable:
[Copyright](https://www.immigration.govt.nz/about-us/about-this-site/copyright/) licenses the
site's content under **CC-BY 3.0 NZ** with attribution to the Crown and the Ministry. Recording
*that an admin read the register on a date, and what it said*, is therefore fine — it is the
automated retrieval that is prohibited, not the knowledge. (The licence excludes logos and
emblems, so no INZ mark goes anywhere near our UI.)

## 5. What this means for Stage 1

Unchanged in shape, and now unambiguous in its middle step:

1. On the employer-verification tab of `/admin/documents`, beside the submitted NZBN, show the
   employer's **claimed** `inz_accredited` and `inz_accreditation_expires`. Today those two
   facts live on a different screen from the NZBN they should be checked against.
2. **Link out** to the register (§4 permits the hyperlink) with the NZBN rendered for copying.
   The admin searches it in their own browser — which is precisely what the terms require.
3. Two buttons, one admin-gated audit-logged RPC:
   confirms → `inz_accredited_verified_at = now()`;
   does not confirm → `inz_accredited = false`, `inz_accredited_verified_at = NULL`.

**"Does not confirm" must not be read as "lying."** Per §1, an employer may have opted out of
publication, and per §2 a mistyped NZBN is indistinguishable from a genuine miss. Clearing the
flag is right, because we cannot stand behind an unconfirmed claim on a surface migrants spend
money on. Anything harsher than that is not supported by what the register actually tells us.

## 6. The two lawful channels, and the one we are not using

Only two ways to learn what the register says are consistent with §4.

1. **An admin searches it in a standard web browser.** Permitted explicitly, costs about
   fifteen seconds, and is what Stage 1 ships. At the current employer count — zero in prod —
   this is not a compromise, it is the correct amount of machinery.
2. **Ask MBIE for the data.** Either an agreement under the terms' own `unless we agree
   otherwise` clause, or an **Official Information Act request** for the accredited-employer
   list as a dataset. The OIA route was already in the knowledge base as the "snapshot
   fallback" and is worth restating here because it is the one path that survives §4 intact: a
   dataset released under the OIA is ours to hold, and the ToU governs retrieval from the
   website, not knowledge lawfully obtained from the agency.

The OIA route has a cost the endpoint does not: a snapshot goes stale, and the register is
"updated daily". It would need re-requesting on a cadence, which is the re-verification
schedule Stage 3 was deferring. **Not worth requesting until there are enough accredited
employers on TopFarms that an admin's browser search is the bottleneck.** Recorded so the
option is not rediscovered from scratch.

## 7. What was NOT established

- Whether MBIE would grant programmatic access on request. Not asked. That is the only route to
  Stage 2 and it is a conversation, not a build.
- Whether `collection=2` is a stable identifier for this register or an incidental CMS id.
  Moot while §4 stands.
- Whether the register's expiry ever disagrees with an accredited employer's own stated expiry
  in practice. Prod holds zero employer profiles, so there is nothing to compare yet.

## Sources

Fetched and inspected 2026-08-18:

- [Accredited employer list](https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/)
- [Terms of use of our online systems](https://www.immigration.govt.nz/about-us/about-this-site/using-our-website-and-online-tools/terms-of-use-of-our-online-systems/)
- [Copyright](https://www.immigration.govt.nz/about-us/about-this-site/copyright/)
- `https://www.immigration.govt.nz/robots.txt`

**Re-check §4 before ever building Stage 2.** Terms change, and this one is the whole argument.
