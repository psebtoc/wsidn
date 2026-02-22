import { describe, it, expect } from 'vitest'
import { parseClaudeTitle } from './claude-activity'

describe('parseClaudeTitle', () => {
  it('returns idle status when title starts with cross mark emoji', () => {
    const result = parseClaudeTitle('✳ Reviewing code changes')
    expect(result).toEqual({ status: 'idle', task: 'Reviewing code changes' })
  })

  it('returns idle status and extracts task text after prefix', () => {
    const result = parseClaudeTitle('✳ Running tests')
    expect(result).toEqual({ status: 'idle', task: 'Running tests' })
  })

  it('returns working status when title starts with braille spinner character', () => {
    const braille = String.fromCharCode(0x2800)
    const result = parseClaudeTitle(`${braille} Building project`)
    expect(result).toEqual({ status: 'working', task: 'Building project' })
  })

  it('returns working status for different braille characters in the range', () => {
    const braille = String.fromCharCode(0x28ff)
    const result = parseClaudeTitle(`${braille} Compiling`)
    expect(result).toEqual({ status: 'working', task: 'Compiling' })
  })

  it('returns null for non-matching first character', () => {
    expect(parseClaudeTitle('Some shell title')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseClaudeTitle('')).toBeNull()
  })
})
