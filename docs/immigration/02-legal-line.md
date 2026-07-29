# The legal line — Immigration Advisers Licensing Act 2007 (IALA)

**This is load-bearing. Design every feature around it.** *(Not legal advice — confirm the borderline
calls with a NZ immigration lawyer or LIA before shipping. Statute + regulator guidance below.)*

## What "immigration advice" is (s 7)

> "using, or purporting to use, knowledge of or experience in immigration to advise, direct, assist,
> or represent another person in regard to an immigration matter relating to New Zealand, whether
> directly or indirectly and **whether or not for gain or reward**."

**Being free does not make it legal.** It also reaches offshore advice about NZ immigration.

## What s 7 EXCLUDES — our safe zone
- **Publicly-available information** (incl. INZ's own material).
- **Clerical work** — recording/organising/storing/retrieving info; **filling in a form with
  information the client supplies** (transcription, *not* deciding what goes in it or which visa to pick).
- **Settlement services** — housing, schools, English classes (nothing about the visa itself).
- **Translation / interpreting.**
- **Referral** — directing someone to INZ, or **to a list of licensed advisers** (explicitly named as not-advice).

**The line, in one sentence:** the moment generic public info is **tailored/applied/interpreted for an
individual** ("based on your situation, apply for X / you qualify"), it becomes regulated advice.

## Offences (IAA-prosecuted)
| Section | Offence | Max penalty |
|---|---|---|
| s 63 | Advice while unlicensed & not exempt | **7 yrs / $100,000** |
| s 67 | Receiving a fee for unlicensed advice | **7 yrs / $100,000** |
| s 64/65 | Falsely holding out as licensed | 2 yrs / $10,000 |
| s 68 | Employing an unlicensed person to advise | 2 yrs / $10,000 |

## Who CAN advise (s 11 exemptions)
Licensed Immigration Advisers; **NZ lawyers** (+ their employees within the firm); MPs/public servants
in-role; Community Law / Citizens Advice; informal non-systematic non-fee help; offshore student-visa only.
**TopFarms is none of these** → stay on the info/clerical/settlement/translation/referral side, or
**partner/employ an LIA or lawyer** for anything that is actual advice.

## SAFE vs RISKY — the feature table

| Feature | Verdict | How to keep it safe |
|---|---|---|
| Marketplace matching (verified employers ↔ migrants) | **SAFE** | Not regulated at all |
| Generic document checklist (same list for everyone, INZ-sourced) | **SAFE** | RISKY if it dynamically says "*you* also need X because of your situation" |
| Form-filling assistance (captures the client's own answers → populates INZ forms) | **SAFE (clerical)** | RISKY the moment it suggests *what* answer to give / which visa |
| Status / timeline tracking (published INZ processing times) | **SAFE** | Don't editorialise ("your delay means do Y") |
| Employment-agreement template | **SAFE** | Provide a generic compliant template; link MBIE's builder. Don't frame clauses as "needed to get the visa approved" |
| Wage / median-wage calculator | **SAFE if a public-data lookup** | Show the number + the INZ rule + link; RISKY if it concludes "therefore *you* qualify" |
| "Find a licensed adviser" directory | **SAFE — explicitly blessed** | s 7 names it as not-advice; the safest feature + a monetisation hook |
| Eligibility quiz / "which visa are you?" / "are you eligible?" | **RISKY — likely advice** | Individualised verdict = s 7 advice. Point at public info, or put behind an LIA. **Lawyer-check first.** |
| AI chatbot answering visa questions | **RISKY if it personalises** | General FAQ from cited INZ text = info; "in my case, should I…" = advice. Constrain to retrieval + hard refusals. **Lawyer-check first.** |

**Design principle:** show the public rule + the source and let the user draw the conclusion — don't let
the product state the conclusion for them. The two features to lawyer-check before build: any **eligibility
"you qualify" output** and any **personalising chatbot** ($100k/7-yr exposure, fee or not).

## Sources
- IALA s 7 & s 11 — https://www.legislation.govt.nz/act/public/2007/0015/latest/whole.html
- IAA "what is immigration advice" factsheet — https://www.iaa.govt.nz/assets/documents/factsheets/factsheet-what-is-nz-immigration-advice.pdf
- IAA offences — https://www.iaa.govt.nz/about-us/what-we-do/offences-under-the-immigration-advisers-licensing-act/
- INZ "who can give immigration advice" — https://www.immigration.govt.nz/process-to-apply/information-for-immigration-professionals/who-can-give-immigration-advice/
