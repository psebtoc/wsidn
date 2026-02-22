import { describe, it, expect } from 'vitest'
import type { SplitNode } from '@renderer/types/project'
import {
  getPaneIds,
  isFullyMinimized,
  calculateBounds,
  updateRatioAtPath,
  removePane,
  splitPaneNode,
  splitPaneNodeAt,
  collectDividers,
  getLeafDirection,
} from './split-utils'

// -- helpers --

const leaf = (id: string): SplitNode => ({ type: 'leaf', paneId: id })

const branch = (
  dir: 'horizontal' | 'vertical',
  first: SplitNode,
  second: SplitNode,
  ratio = 0.5
): SplitNode => ({ type: 'branch', direction: dir, ratio, first, second })

// -- tests --

describe('getPaneIds', () => {
  it('returns single id for a leaf', () => {
    expect(getPaneIds(leaf('a'))).toEqual(['a'])
  })

  it('returns flattened ids for a branch', () => {
    const tree = branch('horizontal', leaf('a'), branch('vertical', leaf('b'), leaf('c')))
    expect(getPaneIds(tree)).toEqual(['a', 'b', 'c'])
  })
})

describe('isFullyMinimized', () => {
  it('returns true when the leaf is in the minimized set', () => {
    expect(isFullyMinimized(leaf('a'), new Set(['a']))).toBe(true)
  })

  it('returns false when the leaf is not minimized', () => {
    expect(isFullyMinimized(leaf('a'), new Set())).toBe(false)
  })

  it('returns true when all leaves are minimized', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'))
    expect(isFullyMinimized(tree, new Set(['a', 'b']))).toBe(true)
  })

  it('returns false when only some leaves are minimized', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'))
    expect(isFullyMinimized(tree, new Set(['a']))).toBe(false)
  })
})

describe('calculateBounds', () => {
  it('returns full bounds for a single leaf', () => {
    const bounds = calculateBounds(leaf('a'))
    expect(bounds.get('a')).toEqual({ x: 0, y: 0, w: 1, h: 1 })
  })

  it('splits horizontally with ratio', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'), 0.3)
    const bounds = calculateBounds(tree)
    const a = bounds.get('a')!
    const b = bounds.get('b')!
    expect(a.x).toBeCloseTo(0)
    expect(a.w).toBeCloseTo(0.3)
    expect(b.x).toBeCloseTo(0.3)
    expect(b.w).toBeCloseTo(0.7)
    expect(a.h).toBe(1)
    expect(b.h).toBe(1)
  })

  it('splits vertically with ratio', () => {
    const tree = branch('vertical', leaf('a'), leaf('b'), 0.4)
    const bounds = calculateBounds(tree)
    const a = bounds.get('a')!
    const b = bounds.get('b')!
    expect(a.y).toBeCloseTo(0)
    expect(a.h).toBeCloseTo(0.4)
    expect(b.y).toBeCloseTo(0.4)
    expect(b.h).toBeCloseTo(0.6)
    expect(a.w).toBe(1)
    expect(b.w).toBe(1)
  })

  it('gives full space to non-minimized side when one side is minimized', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'), 0.5)
    const opts = { minimizedPaneIds: new Set(['a']) }
    const bounds = calculateBounds(tree, undefined, opts)
    const a = bounds.get('a')!
    const b = bounds.get('b')!
    expect(a.w).toBeCloseTo(0)
    expect(b.w).toBeCloseTo(1)
  })

  it('handles nested splits correctly', () => {
    const tree = branch(
      'horizontal',
      leaf('a'),
      branch('vertical', leaf('b'), leaf('c'), 0.5),
      0.5
    )
    const bounds = calculateBounds(tree)
    expect(bounds.get('a')!.w).toBeCloseTo(0.5)
    expect(bounds.get('b')!.w).toBeCloseTo(0.5)
    expect(bounds.get('b')!.h).toBeCloseTo(0.5)
    expect(bounds.get('c')!.h).toBeCloseTo(0.5)
  })
})

describe('updateRatioAtPath', () => {
  it('updates ratio at root path', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'), 0.5)
    const updated = updateRatioAtPath(tree, '', 0.7)
    expect((updated as any).ratio).toBe(0.7)
  })

  it('clamps ratio to minimum 0.15', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'), 0.5)
    const updated = updateRatioAtPath(tree, '', 0.05)
    expect((updated as any).ratio).toBe(0.15)
  })

  it('clamps ratio to maximum 0.85', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'), 0.5)
    const updated = updateRatioAtPath(tree, '', 0.95)
    expect((updated as any).ratio).toBe(0.85)
  })

  it('traverses path to nested branch', () => {
    const tree = branch(
      'horizontal',
      leaf('a'),
      branch('vertical', leaf('b'), leaf('c'), 0.5),
      0.5
    )
    const updated = updateRatioAtPath(tree, 'second', 0.3)
    expect((updated as any).second.ratio).toBe(0.3)
    expect((updated as any).ratio).toBe(0.5) // root unchanged
  })

  it('returns leaf unchanged if path leads to leaf', () => {
    const tree = leaf('a')
    const updated = updateRatioAtPath(tree, '', 0.7)
    expect(updated).toEqual(leaf('a'))
  })
})

describe('removePane', () => {
  it('returns null when removing the only leaf', () => {
    expect(removePane(leaf('a'), 'a')).toBeNull()
  })

  it('returns the leaf unchanged if id does not match', () => {
    expect(removePane(leaf('a'), 'b')).toEqual(leaf('a'))
  })

  it('collapses branch to sibling when one child is removed', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'))
    const result = removePane(tree, 'a')
    expect(result).toEqual(leaf('b'))
  })

  it('collapses to remaining subtree on nested removal', () => {
    const inner = branch('vertical', leaf('b'), leaf('c'))
    const tree = branch('horizontal', leaf('a'), inner)
    const result = removePane(tree, 'a')
    expect(result).toEqual(inner)
  })

  it('returns null when all panes are removed', () => {
    const tree = branch('horizontal', leaf('a'), leaf('a'))
    expect(removePane(tree, 'a')).toBeNull()
  })
})

describe('splitPaneNode', () => {
  it('splits a single leaf into a branch with ratio 0.5', () => {
    const result = splitPaneNode(leaf('a'), 'a', 'b', 'horizontal')
    expect(result).toEqual({
      type: 'branch',
      direction: 'horizontal',
      ratio: 0.5,
      first: leaf('a'),
      second: leaf('b'),
    })
  })

  it('does not modify non-matching leaves', () => {
    const result = splitPaneNode(leaf('a'), 'x', 'b', 'horizontal')
    expect(result).toEqual(leaf('a'))
  })

  it('splits correct pane in a nested tree', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'))
    const result = splitPaneNode(tree, 'b', 'c', 'vertical')
    expect((result as any).second).toEqual({
      type: 'branch',
      direction: 'vertical',
      ratio: 0.5,
      first: leaf('b'),
      second: leaf('c'),
    })
  })
})

describe('splitPaneNodeAt', () => {
  it('puts new pane first when newPaneFirst is true', () => {
    const result = splitPaneNodeAt(leaf('a'), 'a', 'b', 'horizontal', true)
    expect(result).toEqual({
      type: 'branch',
      direction: 'horizontal',
      ratio: 0.5,
      first: leaf('b'),
      second: leaf('a'),
    })
  })

  it('puts new pane second when newPaneFirst is false', () => {
    const result = splitPaneNodeAt(leaf('a'), 'a', 'b', 'horizontal', false)
    expect(result).toEqual({
      type: 'branch',
      direction: 'horizontal',
      ratio: 0.5,
      first: leaf('a'),
      second: leaf('b'),
    })
  })
})

describe('collectDividers', () => {
  it('returns empty array for a leaf', () => {
    expect(collectDividers(leaf('a'))).toEqual([])
  })

  it('returns one divider for a simple branch', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'), 0.5)
    const dividers = collectDividers(tree)
    expect(dividers).toHaveLength(1)
    expect(dividers[0].path).toBe('')
    expect(dividers[0].direction).toBe('horizontal')
    expect(dividers[0].disabled).toBe(false)
  })

  it('returns dividers for nested branches', () => {
    const tree = branch(
      'horizontal',
      leaf('a'),
      branch('vertical', leaf('b'), leaf('c')),
      0.5
    )
    const dividers = collectDividers(tree)
    expect(dividers).toHaveLength(2)
    expect(dividers[0].path).toBe('')
    expect(dividers[1].path).toBe('second')
  })

  it('marks divider as disabled when a child side is minimized', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'), 0.5)
    const opts = { minimizedPaneIds: new Set(['a']) }
    const dividers = collectDividers(tree, undefined, undefined, opts)
    expect(dividers[0].disabled).toBe(true)
  })
})

describe('getLeafDirection', () => {
  it('returns null for a leaf node (root)', () => {
    expect(getLeafDirection(leaf('a'), 'a')).toBeNull()
  })

  it('returns parent direction when pane is a direct child', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'))
    expect(getLeafDirection(tree, 'a')).toBe('horizontal')
    expect(getLeafDirection(tree, 'b')).toBe('horizontal')
  })

  it('returns parent direction for deeply nested leaf', () => {
    const tree = branch(
      'horizontal',
      leaf('a'),
      branch('vertical', leaf('b'), leaf('c'))
    )
    expect(getLeafDirection(tree, 'b')).toBe('vertical')
    expect(getLeafDirection(tree, 'c')).toBe('vertical')
  })

  it('returns null when pane is not found', () => {
    const tree = branch('horizontal', leaf('a'), leaf('b'))
    expect(getLeafDirection(tree, 'x')).toBeNull()
  })
})
