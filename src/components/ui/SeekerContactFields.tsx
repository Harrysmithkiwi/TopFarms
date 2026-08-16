import { Input } from '@/components/ui/Input'

interface SeekerContactFieldsProps {
  firstName: string
  lastName: string
  phone: string
  onFirstNameChange: (v: string) => void
  onLastNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  /** Rendered above the fields. Omitted where a surrounding section already carries one. */
  heading?: string
}

/**
 * The three contact inputs, shared by onboarding step 1 and the profile editor's
 * "Your details" section. State and persistence live in useSeekerContact — this is
 * presentation only, so the two callers cannot drift apart on the copy that tells a
 * seeker who gets to see their phone number.
 */
export function SeekerContactFields({
  firstName,
  lastName,
  phone,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  heading,
}: SeekerContactFieldsProps) {
  return (
    <div>
      {heading && <h2 className="text-text text-lg font-semibold">{heading}</h2>}
      <p className={`text-text-muted text-sm ${heading ? 'mt-1' : ''}`}>
        Employers see your first name and last initial while deciding. Your full name, email and
        phone are shared only with an employer who shortlists you.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          autoComplete="given-name"
          maxLength={80}
        />
        <Input
          label="Last name"
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          autoComplete="family-name"
          maxLength={80}
        />
      </div>
      <div className="mt-4">
        <Input
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          autoComplete="tel"
          maxLength={30}
          placeholder="021 123 4567"
        />
      </div>
    </div>
  )
}
