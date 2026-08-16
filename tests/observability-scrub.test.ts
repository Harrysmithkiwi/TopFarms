import { describe, it, expect } from 'vitest'
import type { ErrorEvent } from '@sentry/react'
import { scrubEvent } from '@/lib/observability'

// Test intent — the PII leak found by firing a probe error at PROD Sentry, 2026-08-16,
// and reading the actual envelope off the wire.
//
// beforeSend scrubbed only `extra` and `contexts`. The probe carried a fake email and
// phone, and they came back unredacted in three other carriers: the exception message
// (which is the headline Sentry shows for the issue), the console breadcrumb's message,
// and the breadcrumb's raw `data.arguments`. ~59 console.error calls feed that path.
//
// The fixture below is the real captured event, trimmed. Asserting on an invented shape
// would have missed this — the nesting depth of `breadcrumbs[].data.arguments[]` is
// precisely what the old depth-6 limit failed open on.

const EMAIL = 'test.person@example.com'
const PHONE = '021 555 8899'
const MESSAGE = `Deliberate verification error — contact ${EMAIL} on ${PHONE}`

function makeEvent(): ErrorEvent {
  return {
    type: undefined,
    level: 'error',
    platform: 'javascript',
    environment: 'production',
    exception: {
      values: [{ type: 'Error', value: MESSAGE, mechanism: { type: 'auto.core.capture_console', handled: true } }],
    },
    request: {
      url: 'https://www.topfarms.co.nz/dashboard/seeker',
      query_string: 'email=someone@example.com',
      data: { profile: 'entire seeker row' },
      cookies: { session: 'secret' },
      headers: { authorization: 'Bearer xyz' },
    },
    user: { id: 'b917769d-1bfc-4157-8341-e5b11b92a668', email: EMAIL, ip_address: '1.2.3.4' },
    extra: { arguments: ['sentry-probe', { message: MESSAGE, name: 'Error' }] },
    breadcrumbs: [
      {
        timestamp: 1786885293.512,
        category: 'console',
        level: 'error',
        message: `sentry-probe Error: ${MESSAGE}`,
        data: { arguments: ['sentry-probe', { message: MESSAGE, name: 'Error' }], logger: 'console' },
      },
      {
        timestamp: 1786885277.033,
        category: 'fetch',
        type: 'http',
        data: {
          method: 'GET',
          url: `https://inlagtgpynemhipnqvty.supabase.co/rest/v1/seeker_contacts?email=eq.${EMAIL}`,
          status_code: 200,
        },
      },
    ],
  } as unknown as ErrorEvent
}

/** Every string anywhere in the event, so nothing can hide behind a nesting level. */
function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out))
  return out
}

describe('observability — scrubEvent', () => {
  it('leaves no raw email or phone anywhere in the outgoing event', () => {
    const serialised = allStrings(scrubEvent(makeEvent())).join('\n')

    // The whole point: not "we scrub the fields we listed", but "nothing leaks".
    expect(serialised).not.toContain(EMAIL)
    expect(serialised).not.toContain(PHONE)
    expect(serialised).not.toContain('someone@example.com')
  })

  it('scrubs the exception message — the headline Sentry shows for the issue', () => {
    const event = scrubEvent(makeEvent())
    expect(event.exception?.values?.[0].value).toBe(
      'Deliberate verification error — contact [email] on [phone]',
    )
  })

  it('scrubs console breadcrumbs, including their nested raw arguments', () => {
    const event = scrubEvent(makeEvent())
    const crumb = event.breadcrumbs?.[0]

    expect(crumb?.message).not.toContain(EMAIL)
    expect(crumb?.message).toContain('[email]')
    // data.arguments[1].message sits deep enough that the old depth-6 limit failed open.
    const args = (crumb?.data as { arguments: unknown[] }).arguments
    expect(JSON.stringify(args)).not.toContain(EMAIL)
    expect(JSON.stringify(args)).not.toContain(PHONE)
  })

  it('scrubs identifiers out of fetch breadcrumb URLs', () => {
    const event = scrubEvent(makeEvent())
    const url = (event.breadcrumbs?.[1].data as { url: string }).url
    expect(url).not.toContain(EMAIL)
    expect(url).toContain('[email]')
  })

  it('still drops request bodies, cookies and headers outright', () => {
    const event = scrubEvent(makeEvent())
    expect(event.request?.data).toBeUndefined()
    expect(event.request?.cookies).toBeUndefined()
    expect(event.request?.headers).toBeUndefined()
    expect(event.request?.query_string).toBe('[redacted]')
  })

  it('reduces the user to an opaque id', () => {
    const event = scrubEvent(makeEvent())
    expect(event.user).toEqual({ id: 'b917769d-1bfc-4157-8341-e5b11b92a668' })
    expect(event.user).not.toHaveProperty('email')
    expect(event.user).not.toHaveProperty('ip_address')
  })

  it('redacts values whose KEY is sensitive even when the value looks innocuous', () => {
    const event = makeEvent()
    event.extra = { visa_status: 'needs_sponsorship', first_name: 'Riley', region: 'Waikato' }
    const scrubbed = scrubEvent(event)

    expect(scrubbed.extra?.visa_status).toBe('[redacted]')
    expect(scrubbed.extra?.first_name).toBe('[redacted]')
    // Region is not personally identifying and is useful for debugging — keep it.
    expect(scrubbed.extra?.region).toBe('Waikato')
  })
})
