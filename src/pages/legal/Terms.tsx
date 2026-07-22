import { LegalLayout } from './LegalLayout'
import { usePageMeta } from '@/lib/usePageMeta'

export function Terms() {
  usePageMeta(
    'Terms of Service — TopFarms',
    'The terms that govern use of TopFarms, the New Zealand agricultural recruitment marketplace.',
  )
  return (
    <LegalLayout title="Terms of Service" updated="23 July 2026">
      <p>
        These terms govern your use of topfarms.co.nz ("TopFarms", "we", "us"). By creating an
        account or using the site you agree to these terms. If you are using TopFarms on behalf of a
        business, you confirm you are authorised to bind that business.
      </p>

      <h2>1. What TopFarms is</h2>
      <p>
        TopFarms is a marketplace that connects agricultural employers with job seekers. We provide
        listing, search, matching, and application tools. We are <strong>not</strong> a recruitment
        agency, we are not a party to any employment agreement, and we do not guarantee that any
        role will be filled or any application will succeed.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate information and keep your login details secure.</li>
        <li>You are responsible for activity on your account.</li>
        <li>You must be at least 16 years old to create an account.</li>
        <li>
          We may suspend or close accounts that breach these terms, post misleading content, or
          misuse the platform.
        </li>
      </ul>

      <h2>3. Employer obligations</h2>
      <ul>
        <li>
          Job listings must be genuine, lawful vacancies and comply with New Zealand employment and
          immigration law, including minimum wage and anti-discrimination requirements.
        </li>
        <li>
          Information in listings (pay, accommodation, conditions) must be accurate and not
          misleading.
        </li>
        <li>
          Candidate information received through TopFarms may be used only for recruitment for the
          listed role, consistent with our Privacy Policy.
        </li>
      </ul>

      <h2>4. Job seeker obligations</h2>
      <ul>
        <li>
          Profile information, experience, qualifications, and documents you provide must be
          truthful and your own.
        </li>
        <li>Apply only to roles you genuinely intend to pursue.</li>
      </ul>

      <h2>5. Fees and payments</h2>
      <p>
        Posting standard listings is priced per listing as shown on our{' '}
        <a href="/pricing" style={{ textDecoration: 'underline' }}>
          pricing page
        </a>
        ; prices are in NZD and include GST unless stated otherwise. Payments are processed by
        Stripe. Except where required by law, listing fees are non-refundable once a listing is
        published. Creating an account and browsing is free for job seekers.
      </p>

      <h2>6. Content</h2>
      <p>
        You retain ownership of content you post but grant us a licence to host and display it for
        the purpose of operating the marketplace. We may remove content that is unlawful,
        misleading, or inappropriate.
      </p>

      <h2>7. Acceptable use</h2>
      <ul>
        <li>No scraping, bulk harvesting of profiles, or automated access without permission.</li>
        <li>
          No attempts to circumvent security, access other users' data, or disrupt the service.
        </li>
        <li>No spam, fraudulent listings, or off-platform fee solicitation from candidates.</li>
      </ul>

      <h2>8. Liability</h2>
      <p>
        TopFarms is provided "as is". To the maximum extent permitted by law, we exclude liability
        for indirect or consequential loss arising from use of the platform, and our total liability
        to you is limited to the fees you paid us in the 3 months before the event giving rise to
        the claim. Nothing in these terms limits rights you have under the Consumer Guarantees Act
        1993 or Fair Trading Act 1986 that cannot lawfully be excluded. If you use TopFarms in
        trade, the Consumer Guarantees Act does not apply.
      </p>

      <h2>9. Changes and termination</h2>
      <p>
        We may update these terms or change the service; material changes will be signposted on the
        site. You may close your account at any time by emailing{' '}
        <a href="mailto:hello@topfarms.co.nz" style={{ textDecoration: 'underline' }}>
          hello@topfarms.co.nz
        </a>
        .
      </p>

      <h2>10. Governing law</h2>
      <p>These terms are governed by New Zealand law, and NZ courts have jurisdiction.</p>

      <h2>Contact</h2>
      <p>TopFarms — hello@topfarms.co.nz</p>
    </LegalLayout>
  )
}
