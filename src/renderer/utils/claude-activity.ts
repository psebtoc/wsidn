import type { ClaudeActivity } from '@renderer/types/project'

// Braille spinner: U+2800~U+28FF block
function isBrailleSpinner(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0x2800 && code <= 0x28ff
}

export function parseClaudeTitle(title: string): ClaudeActivity | null {
  const first = title[0]
  if (!first) return null

  if (first === '✳') {
    return { status: 'idle', task: title.slice(2) }
  }
  if (isBrailleSpinner(first)) {
    return { status: 'working', task: title.slice(2) }
  }

  return null // shell title etc → ignore
}
