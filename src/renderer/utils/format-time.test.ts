import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime } from './format-time'

const t = vi.fn((key: string, opts?: any) =>
  key + (opts?.count !== undefined ? ':' + opts.count : '')
)

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set "now" to 2025-06-15T12:00:00.000Z
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
    t.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for less than 1 minute ago', () => {
    const iso = new Date('2025-06-15T11:59:30.000Z').toISOString()
    const result = formatRelativeTime(iso, t as any)
    expect(result).toBe('contextMenu.timeJustNow')
  })

  it('returns minutes ago for time between 1 and 59 minutes', () => {
    const iso = new Date('2025-06-15T11:45:00.000Z').toISOString()
    const result = formatRelativeTime(iso, t as any)
    expect(result).toBe('contextMenu.timeMinAgo:15')
  })

  it('returns hours ago for time between 1 and 23 hours', () => {
    const iso = new Date('2025-06-15T09:00:00.000Z').toISOString()
    const result = formatRelativeTime(iso, t as any)
    expect(result).toBe('contextMenu.timeHourAgo:3')
  })

  it('returns days ago for time between 1 and 6 days', () => {
    const iso = new Date('2025-06-13T12:00:00.000Z').toISOString()
    const result = formatRelativeTime(iso, t as any)
    expect(result).toBe('contextMenu.timeDayAgo:2')
  })

  it('returns date format for 7+ days ago', () => {
    const d = new Date('2025-06-01T08:30:00.000Z')
    const iso = d.toISOString()
    const result = formatRelativeTime(iso, t as any)
    // formatRelativeTime uses local getHours/getDate, so build expected from local values
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hours = d.getHours().toString().padStart(2, '0')
    const mins = d.getMinutes().toString().padStart(2, '0')
    expect(result).toBe(`${month}/${day} ${hours}:${mins}`)
  })

  it('returns hours ago at exactly 60 minutes boundary', () => {
    const iso = new Date('2025-06-15T11:00:00.000Z').toISOString()
    const result = formatRelativeTime(iso, t as any)
    expect(result).toBe('contextMenu.timeHourAgo:1')
  })

  it('returns days ago at exactly 24 hours boundary', () => {
    const iso = new Date('2025-06-14T12:00:00.000Z').toISOString()
    const result = formatRelativeTime(iso, t as any)
    expect(result).toBe('contextMenu.timeDayAgo:1')
  })
})
