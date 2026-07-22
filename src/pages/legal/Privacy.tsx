import { LegalLayout } from './LegalLayout'
import { usePageMeta } from '@/lib/usePageMeta'

export function Privacy() {
  usePageMeta(
    'Privacy Policy — TopFarms',
    'How TopFarms collects, uses, and protects your personal information under the New Zealand Privacy Act 2020.',
  )
  return (
    <LegalLayout title="Privacy Policy" updated="23 July 2026">
      <p>
        TopFarms ("we", "us") operates topfarms.co.nz, a recruitment marketplace connecting
        agricultural employers and job seekers in New Zealand. This policy explains how we collect,
        use, store, and share your personal information, and your rights under the Privacy Act 2020.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> — email address, password (stored as a secure hash), and
          your chosen role (employer or job seeker).
        </li>
        <li>
          <strong>Profile information you provide</strong> — for job seekers: name, contact details,
          region, work experience, skills, qualifications, licences, availability, preferences, and
          documents you upload (e.g. CVs, certificates). For employers: farm/business name, region,
          farm type and operational details, and verification documents.
        </li>
        <li>
          <strong>Activity on the platform</strong> — job listings, applications, saved jobs and
          searches, messages sent through the platform, and match preferences.
        </li>
        <li>
          <strong>Payment information</strong> — payments for job listings are processed by Stripe.
          We do not store your full card details; Stripe provides us a payment record.
        </li>
        <li>
          <strong>Technical information</strong> — standard log data such as IP address, browser
          type, and pages visited, used to keep the service secure and reliable.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To operate your account and provide the matching, search, and application features.</li>
        <li>
          To share relevant profile information between the two sides of the marketplace — e.g.
          showing an employer the profile of a seeker who applies to their listing.
        </li>
        <li>To verify employer and seeker documents where verification features are used.</li>
        <li>To process listing payments and send service emails (verification, notifications).</li>
        <li>To improve the platform, prevent abuse, and meet our legal obligations.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your personal information.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>Other users, as part of the service</strong> — applying to a job shares your
          profile with that employer; posting a job displays your farm profile to seekers.
        </li>
        <li>
          <strong>Service providers</strong> — we use Supabase (database, authentication, and file
          storage), Vercel (hosting), Stripe (payments), and an email delivery provider. These
          providers may store data outside New Zealand; we choose providers with appropriate
          safeguards consistent with the Privacy Act 2020.
        </li>
        <li>
          <strong>When required by law</strong> — if we must disclose information to comply with a
          legal obligation.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while your account is active. If you ask us to delete your account,
        we will delete or anonymise your personal information within a reasonable period, except
        where we are required to retain records (e.g. payment records for tax purposes).
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, passwords are hashed, and database access is restricted with
        row-level security. No system is perfectly secure — if we become aware of a privacy breach
        that causes or is likely to cause serious harm, we will notify affected users and the Office
        of the Privacy Commissioner as required.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Privacy Act 2020 you may request access to, or correction of, the personal
        information we hold about you. You can edit most information directly in your profile. For
        anything else — including account deletion — email{' '}
        <a href="mailto:hello@topfarms.co.nz" style={{ textDecoration: 'underline' }}>
          hello@topfarms.co.nz
        </a>
        . If you are not satisfied with our response, you may complain to the Office of the Privacy
        Commissioner (privacy.org.nz).
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies and browser storage necessary to keep you signed in and operate the
        site. We do not use third-party advertising cookies.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the platform evolves. Material changes will be signposted on
        the site. Continued use after a change means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>TopFarms — hello@topfarms.co.nz</p>
    </LegalLayout>
  )
}
