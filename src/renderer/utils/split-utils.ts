import type { SplitNode, SplitDirection } from '@renderer/types/project'

export interface PaneBounds {
  x: number
  y: number
  w: number
  h: number
}

export interface DividerInfo {
  path: string
  direction: SplitDirection
  bounds: PaneBounds
  ratio: number
}

/**
 * Calculate absolute bounds (0-1 fractions) for each pane in the split tree.
 */
export function calculateBounds(
  node: SplitNode,
  bounds: PaneBounds = { x: 0, y: 0, w: 1, h: 1 }
): Map<string, PaneBounds> {
  if (node.type === 'leaf') {
    return new Map([[node.paneId, bounds]])
  }

  const { direction, ratio, first, second } = node
  let fb: PaneBounds, sb: PaneBounds

  if (direction === 'horizontal') {
    fb = { x: bounds.x, y: bounds.y, w: bounds.w * ratio, h: bounds.h }
    sb = { x: bounds.x + bounds.w * ratio, y: bounds.y, w: bounds.w * (1 - ratio), h: bounds.h }
  } else {
    fb = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h * ratio }
    sb = { x: bounds.x, y: bounds.y + bounds.h * ratio, w: bounds.w, h: bounds.h * (1 - ratio) }
  }

  return new Map([...calculateBounds(first, fb), ...calculateBounds(second, sb)])
}

/**
 * Collect divider info for all branches in the split tree.
 */
export function collectDividers(
  node: SplitNode,
  bounds: PaneBounds = { x: 0, y: 0, w: 1, h: 1 },
  path: string = ''
): DividerInfo[] {
  if (node.type === 'leaf') return []

  const { direction, ratio, first, second } = node
  let fb: PaneBounds, sb: PaneBounds

  if (direction === 'horizontal') {
    fb = { x: bounds.x, y: bounds.y, w: bounds.w * ratio, h: bounds.h }
    sb = { x: bounds.x + bounds.w * ratio, y: bounds.y, w: bounds.w * (1 - ratio), h: bounds.h }
  } else {
    fb = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h * ratio }
    sb = { x: bounds.x, y: bounds.y + bounds.h * ratio, w: bounds.w, h: bounds.h * (1 - ratio) }
  }

  return [
    { path, direction, bounds, ratio },
    ...collectDividers(first, fb, path ? `${path}/first` : 'first'),
    ...collectDividers(second, sb, path ? `${path}/second` : 'second'),
  ]
}

/**
 * Update the ratio of a branch at the given path in the split tree.
 */
export function updateRatioAtPath(
  node: SplitNode,
  path: string,
  ratio: number
): SplitNode {
  const clamped = Math.max(0.15, Math.min(0.85, ratio))
  const parts = path === '' ? [] : path.split('/')
  return applyRatio(node, parts, clamped)
}

function applyRatio(node: SplitNode, parts: string[], ratio: number): SplitNode {
  if (node.type === 'leaf') return node
  if (parts.length === 0) {
    return { ...node, ratio }
  }
  const [next, ...rest] = parts
  if (next === 'first') {
    return { ...node, first: applyRatio(node.first, rest, ratio) }
  }
  return { ...node, second: applyRatio(node.second, rest, ratio) }
}

/**
 * Get all pane IDs in the split tree.
 */
export function getPaneIds(node: SplitNode): string[] {
  if (node.type === 'leaf') return [node.paneId]
  return [...getPaneIds(node.first), ...getPaneIds(node.second)]
}

/**
 * Remove a pane from the split tree. Returns null if tree is empty after removal.
 */
export function removePane(node: SplitNode, paneId: string): SplitNode | null {
  if (node.type === 'leaf') {
    return node.paneId === paneId ? null : node
  }

  const first = removePane(node.first, paneId)
  const second = removePane(node.second, paneId)

  if (!first && !second) return null
  if (!first) return second
  if (!second) return first
  return { ...node, first, second }
}

/**
 * Find a pane's position in the split tree: its sibling, direction, and whether
 * the pane was the first (left/top) or second (right/bottom) child.
 * Returns null if the pane is not found or is the root.
 */
export interface PanePosition {
  siblingPaneId: string | null
  direction: SplitDirection
  paneWasFirst: boolean
}

export function findPanePosition(
  node: SplitNode,
  paneId: string
): PanePosition | null {
  if (node.type === 'leaf') return null

  // Check if the target pane is a direct child of this branch
  const firstIds = node.first.type === 'leaf' ? [node.first.paneId] : getPaneIds(node.first)
  const secondIds = node.second.type === 'leaf' ? [node.second.paneId] : getPaneIds(node.second)

  if (node.first.type === 'leaf' && node.first.paneId === paneId) {
    // Pane is the first child — sibling is the first leaf of the second subtree
    const siblingId = node.second.type === 'leaf' ? node.second.paneId : getPaneIds(node.second)[0] ?? null
    return { siblingPaneId: siblingId, direction: node.direction, paneWasFirst: true }
  }

  if (node.second.type === 'leaf' && node.second.paneId === paneId) {
    // Pane is the second child — sibling is the first leaf of the first subtree
    const siblingId = node.first.type === 'leaf' ? node.first.paneId : getPaneIds(node.first)[0] ?? null
    return { siblingPaneId: siblingId, direction: node.direction, paneWasFirst: false }
  }

  // Recurse into children
  if (firstIds.includes(paneId)) return findPanePosition(node.first, paneId)
  if (secondIds.includes(paneId)) return findPanePosition(node.second, paneId)

  return null
}

/**
 * Find the leaf with targetPaneId and replace it with a branch
 * containing the target and a new pane.
 */
export function splitPaneNode(
  node: SplitNode,
  targetPaneId: string,
  newPaneId: string,
  direction: SplitDirection
): SplitNode {
  return splitPaneNodeAt(node, targetPaneId, newPaneId, direction, false)
}

/**
 * Like splitPaneNode but controls whether the new pane goes first or second.
 * newPaneFirst=true puts the new pane as first (left/top).
 */
export function splitPaneNodeAt(
  node: SplitNode,
  targetPaneId: string,
  newPaneId: string,
  direction: SplitDirection,
  newPaneFirst: boolean
): SplitNode {
  if (node.type === 'leaf') {
    if (node.paneId === targetPaneId) {
      const targetLeaf: SplitNode = { type: 'leaf', paneId: targetPaneId }
      const newLeaf: SplitNode = { type: 'leaf', paneId: newPaneId }
      return {
        type: 'branch',
        direction,
        ratio: 0.5,
        first: newPaneFirst ? newLeaf : targetLeaf,
        second: newPaneFirst ? targetLeaf : newLeaf,
      }
    }
    return node
  }

  return {
    ...node,
    first: splitPaneNodeAt(node.first, targetPaneId, newPaneId, direction, newPaneFirst),
    second: splitPaneNodeAt(node.second, targetPaneId, newPaneId, direction, newPaneFirst),
  }
}
