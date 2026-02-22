import type { TFunction } from 'i18next'

export function formatRelativeTime(iso: string, t: TFunction): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return t('contextMenu.timeJustNow')
  if (diffMin < 60) return t('contextMenu.timeMinAgo', { count: diffMin })
  if (diffHour < 24) return t('contextMenu.timeHourAgo', { count: diffHour })
  if (diffDay < 7) return t('contextMenu.timeDayAgo', { count: diffDay })

  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hours}:${mins}`
}
