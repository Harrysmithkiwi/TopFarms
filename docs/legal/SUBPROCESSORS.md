# TopFarms Sub-processor Register

> **STATUS: A-READY DRAFT — pending legal review (FOUNDER-ACTIONS FA-02/FA-11). Not yet legal advice or a published policy.**

All third parties that process personal information on TopFarms' behalf. DPA/terms confirmation is FOUNDER-ACTION FA-02.

| Processor | Location | Data categories | Purpose | DPA status |
|---|---|---|---|---|
| Supabase | Australia (ap-southeast-2, Sydney) | All marketplace data: accounts, profiles (incl. categorical visa status), contact records, documents (incl. identity documents in private bucket), audit logs | Database, authentication, file storage — primary data host | ☐ to confirm — FA-02 |
| Vercel | US / global CDN | Technical data (IP addresses, request logs); serves the web app | Website hosting and delivery | ☐ to confirm — FA-02 |
| Stripe | US / global | Employer billing details, payment records | Listing-fee payments and placement-fee invoicing (Net 14) | ☐ to confirm — FA-02 |
| Resend | US | Email addresses, transactional email content | Transactional email delivery | ☐ to confirm — FA-02 |
| Anthropic (Claude API) | US | Seeker profile data incl. categorical visa status (never identity documents or contact details); public job-post text from leads pipeline | AI match explanations and candidate summaries; lead parsing | ☐ to confirm — FA-02 |
| Firecrawl | US | Publicly posted job listings (may contain poster contact details) | Admin-only lead harvesting of public job boards | ☐ to confirm — FA-02 |
| Apify | US | Publicly posted job listings (may contain poster contact details) | Admin-only lead capture | ☐ to confirm — FA-02 |
| Google | US | OAuth identity (name, email) only | "Sign in with Google" | ☐ to confirm — FA-02 |
| Facebook (Meta) | US | OAuth identity (name, email) only | "Sign in with Facebook" | ☐ to confirm — FA-02 |

**Change process:** adding or swapping a sub-processor requires updating this register, the Privacy Policy s6 table, and re-checking the DPIA if the new processor touches visa status or identity documents.
