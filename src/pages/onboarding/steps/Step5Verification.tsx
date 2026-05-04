import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

interface Step5Props {
  onComplete: (data: Record<string, never>) => void
  onBack?: () => void
}

interface VerificationCardProps {
  icon: string
  title: string
  description: string
  isVerified?: boolean
  onStart?: () => void
}

function VerificationCard({ icon, title, description, isVerified, onStart }: VerificationCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-[10px] border-[1.5px]',
        isVerified ? 'border-brand bg-[rgba(74,124,47,0.04)]' : 'border-border bg-surface',
      )}
    >
      <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-body font-semibold text-[13px] text-text">{title}</p>
          {isVerified && (
            <span className="text-[11px] font-body font-semibold text-brand bg-[rgba(74,124,47,0.1)] px-2 py-0.5 rounded-full">
              Verified
            </span>
          )}
        </div>
        <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      </div>
      {!isVerified && onStart && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onStart}
          className="flex-shrink-0"
        >
          Start now
        </Button>
      )}
    </div>
  )
}

export function Step5Verification({ onComplete, onBack }: Step5Props) {
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComplete({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Verify your identity
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Verified employers get more trust from candidates — but you can complete these later
        </p>
      </div>

      <div className="space-y-3">
        <VerificationCard
          icon="✉️"
          title="Email"
          description="Your email address has been automatically verified at signup"
          isVerified
        />

        <VerificationCard
          icon="📱"
          title="Phone"
          description="Add your mobile number to receive SMS notifications and increase trust"
          onStart={() => setShowPhoneInput(true)}
        />

        {showPhoneInput && (
          <div className="ml-14 space-y-2">
            <Input
              label="Mobile number"
              type="tel"
              placeholder="+64 21 000 0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
              Phone verification will be completed in your dashboard settings
            </p>
          </div>
        )}

        <VerificationCard
          icon="🏢"
          title="NZBN"
          description="Verify with your New Zealand Business Number for full employer verification"
          onStart={() => {}}
        />

        <VerificationCard
          icon="📄"
          title="Documents"
          description="Upload farm ownership documents or lease agreement"
          onStart={() => {}}
        />

        <VerificationCard
          icon="📷"
          title="Farm Photos"
          description="Upload photos of your farm to build authenticity with candidates"
          onStart={() => {}}
        />
      </div>

      <div
        className="rounded-[10px] p-4 text-[12px]"
        style={{ backgroundColor: 'var(--color-warn-bg)', color: 'var(--color-brand-900)' }}
      >
        <strong>You can complete verification later</strong> — access verification settings anytime
        from your employer dashboard. More verified methods means more trust from candidates.
      </div>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" className={onBack ? '' : 'ml-auto'}>
          Continue — you can complete verification later
        </Button>
      </div>
    </form>
  )
}
