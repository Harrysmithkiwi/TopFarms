import { LegalLayout, LegalSection, LegalList } from './LegalLayout'

// Content source of truth: docs/legal/TERMS-OF-SERVICE.md (A-READY draft,
// pending legal review, FA-02/FA-11). Keep the two in sync.

export function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      updated="Draft. Company details and effective date will be added when these terms are finalised."
    >
      <LegalSection heading="About these terms">
        <p>
          These terms govern your use of topfarms.co.nz and the TopFarms marketplace. By creating
          an account or using the platform, you agree to them. Questions: hello@topfarms.co.nz.
        </p>
      </LegalSection>

      <LegalSection heading="1. Who is who">
        <LegalList
          items={[
            'Seeker (worker): a person looking for agricultural work in New Zealand.',
            'Employer: a farm or agricultural business posting jobs and hiring through the platform.',
            'TopFarms: the marketplace that connects the two.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="2. What TopFarms is, and is not">
        <p>
          TopFarms is a marketplace. We surface the right people to each other and help the
          introduction happen. To be completely clear:
        </p>
        <LegalList
          items={[
            'We are not a recruitment agency. We do not select, supply, or place workers on your behalf, and we do not act as your agent in hiring.',
            'We are not the employer. Any employment relationship, employment agreement, wages, working conditions, and compliance with the Employment Relations Act 2000 and all other employment law are strictly between the employer and the worker. Employers are solely responsible for their obligations as employers.',
            'We do not guarantee outcomes. We do not promise any seeker a job, or any employer a hire, except where a written fill guarantee expressly applies.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. Accounts">
        <p>
          You must provide accurate information, keep your login secure, and be at least 16 years
          old. One person or business per account. You are responsible for activity under your
          account. Tell us promptly if you believe your account has been compromised.
        </p>
      </LegalSection>

      <LegalSection heading="4. Workers never pay">
        <p>
          Using TopFarms as a seeker is free. Creating a profile, applying for jobs, matching,
          and being contacted by employers costs a worker nothing. We will never charge a worker
          a fee to get or keep a job through TopFarms.
        </p>
      </LegalSection>

      <LegalSection heading="5. Employer fees">
        <LegalList
          items={[
            'Listing fees: your first job listing is free. After that, listings are charged per listing at the published tier prices (currently $100 / $150 / $200 NZD depending on tier). Prices are shown on our pricing page and may change; changes apply to new listings only.',
            'Placement fees: when you hire a worker introduced through TopFarms, a flat tier placement fee applies. You acknowledge the fee before receiving the worker’s direct contact details.',
            'Invoicing: placement fees are invoiced via Stripe with payment due within 14 days of the invoice date.',
            'GST treatment will be confirmed in the final published terms.',
            'Circumvention: if you obtain a candidate’s details through TopFarms and hire them off platform to avoid the placement fee, the placement fee is still payable.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="6. Fill guarantee">
        <p>
          Where TopFarms offers a fill guarantee (including any Founding 25 offer), its terms are
          set out separately and form part of these terms for eligible employers. If no written
          guarantee applies to you, no guarantee applies.
        </p>
      </LegalSection>

      <LegalSection heading="7. Verification is assistance, not a warranty">
        <p>
          TopFarms may verify documents, identities, and business details to help keep the
          platform trustworthy. Verification is a good faith assistance process, not a warranty.
          We do not guarantee the accuracy of any profile, document, listing, or claim made by
          any user. Employers must make their own hiring checks (including immigration and right
          to work checks), and seekers must make their own judgements about employers.
        </p>
      </LegalSection>

      <LegalSection heading="8. Acceptable use">
        <p>You must not:</p>
        <LegalList
          items={[
            'post false, misleading, or discriminatory listings or profiles;',
            'use the platform for any role that is unlawful or misrepresented;',
            'harvest or scrape other users’ data, or contact users for purposes unrelated to genuine hiring;',
            'attempt to bypass fees, access controls, or the contact release process;',
            'upload malicious content or interfere with the platform’s operation;',
            'charge, or attempt to charge, a worker any fee connected to a placement.',
          ]}
        />
        <p>We may remove content or suspend or terminate accounts that breach these terms.</p>
      </LegalSection>

      <LegalSection heading="9. Content and privacy">
        <p>
          You keep ownership of what you upload (profiles, listings, documents, photos) and grant
          us a licence to host, display, and process it as needed to run the platform, as
          described in our Privacy Policy. You must have the right to upload anything you upload.
          Our Privacy Policy forms part of these terms.
        </p>
      </LegalSection>

      <LegalSection heading="10. Consumer law">
        <p>
          If you use TopFarms for business purposes (which applies to employers), you agree that
          the Consumer Guarantees Act 1993 does not apply, as permitted for business to business
          supplies. Nothing in these terms limits rights you may have under the Fair Trading Act
          1986 or any consumer rights that cannot lawfully be excluded, including for seekers
          using the platform personally.
        </p>
      </LegalSection>

      <LegalSection heading="11. Liability">
        <p>To the maximum extent the law allows:</p>
        <LegalList
          items={[
            'The platform is provided "as is". We do not warrant it will be uninterrupted or error free.',
            'We are not liable for the acts, omissions, listings, or conduct of any employer or seeker, or for any employment relationship or its outcome.',
            'We are not liable for indirect or consequential loss, loss of profit, or loss of opportunity.',
            'Our total liability to an employer in any 12 month period is capped at the fees that employer paid TopFarms in that period. Our total liability to a seeker (who pays nothing) is capped at NZD $100.',
          ]}
        />
        <p>Nothing in this section excludes liability that cannot lawfully be excluded.</p>
      </LegalSection>

      <LegalSection heading="12. Termination">
        <p>
          You can close your account at any time by contacting hello@topfarms.co.nz. We can
          suspend or terminate accounts for breach of these terms, unlawful conduct, or risk to
          other users, and will tell you why unless the law prevents it. Fees already incurred
          remain payable.
        </p>
      </LegalSection>

      <LegalSection heading="13. Changes, law, and contact">
        <p>
          We may update these terms. For material changes we will give reasonable notice by email
          or on the platform before they take effect. These terms are governed by New Zealand
          law, and the New Zealand courts have exclusive jurisdiction. Before going to court,
          both sides agree to try to resolve any dispute in good faith by contacting
          hello@topfarms.co.nz first.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
