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
  disabled: boolean
}

export interface CalculateBoundsOptions {
  minimizedPaneIds: Set<string>
  containerWidth: number
  containerHeight: number
  collapsedSize?: number // default 28
}

const DEFAULT_COLLAPSED_SIZE = 28
const FALLBACK_COLLAPSED_RATIO = 0.05

/**
 * Check if every leaf in a subtree is minimized.
 */
export function isFullyMinimized(node: SplitNode, minimizedIds: Set<string>): boolean {
  if (node.type === 'leaf') return minimizedIds.has(node.paneId)
  return isFullyMinimized(node.first, minimizedIds) && isFullyMinimized(node.second, minimizedIds)
}

/**
 * Compute the effective ratio for a branch, accounting for minimized children.
 * Returns the original ratio if no children are minimized.
 */
function computeEffectiveRatio(
  node: SplitNode & { type: 'branch' },
  bounds: PaneBounds,
  options?: CalculateBoundsOptions
): number {
  if (!options || options.minimizedPaneIds.size === 0) return node.ratio

  const firstMinimized = isFullyMinimized(node.first, options.minimizedPaneIds)
  const secondMinimized = isFullyMinimized(node.second, options.minimizedPaneIds)

  if (firstMinimized && secondMinimized) return 0.5
  if (!firstMinimized && !secondMinimized) return node.ratio

  const collapsedSize = options.collapsedSize ?? DEFAULT_COLLAPSED_SIZE
  const axisPx =
    node.direction === 'horizontal'
      ? options.containerWidth * bounds.w
      : options.containerHeight * bounds.h

  if (axisPx <= 0) return firstMinimized ? FALLBACK_COLLAPSED_RATIO : 1 - FALLBACK_COLLAPSED_RATIO

  const collapsedFraction = Math.min(collapsedSize / axisPx, 0.5)
  return firstMinimized ? collapsedFraction : 1 - collapsedFraction
}

/**
 * Compute first/second bounds for a branch given effective ratio.
 */
function splitBounds(
  direction: SplitDirection,
  ratio: number,
  bounds: PaneBounds
): [PaneBounds, PaneBounds] {
  if (direction === 'horizontal') {
    return [
      { x: bounds.x, y: bounds.y, w: bounds.w * ratio, h: bounds.h },
      { x: bounds.x + bounds.w * ratio, y: bounds.y, w: bounds.w * (1 - ratio), h: bounds.h },
    ]
  }
  return [
    { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h * ratio },
    { x: bounds.x, y: bounds.y + bounds.h * ratio, w: bounds.w, h: bounds.h * (1 - ratio) },
  ]
}

/**
 * Calculate absolute bounds (0-1 fractions) for each pane in the split tree.
 */
export function calculateBounds(
  node: SplitNode,
  bounds: PaneBounds = { x: 0, y: 0, w: 1, h: 1 },
  options?: CalculateBoundsOptions
): Map<string, PaneBounds> {
  if (node.type === 'leaf') {
    return new Map([[node.paneId, bounds]])
  }

  const effectiveRatio = computeEffectiveRatio(node, bounds, options)
  const [fb, sb] = splitBounds(node.direction, effectiveRatio, bounds)

  return new Map([
    ...calculateBounds(node.first, fb, options),
    ...calculateBounds(node.second, sb, options),
  ])
}

/**
 * Collect divider info for all branches in the split tree.
 */
export function collectDividers(
  node: SplitNode,
  bounds: PaneBounds = { x: 0, y: 0, w: 1, h: 1 },
  path: string = '',
  options?: CalculateBoundsOptions
): DividerInfo[] {
  if (node.type === 'leaf') return []

  const effectiveRatio = computeEffectiveRatio(node, bounds, options)
  const [fb, sb] = splitBounds(node.direction, effectiveRatio, bounds)

  const disabled =
    !!options &&
    options.minimizedPaneIds.size > 0 &&
    (isFullyMinimized(node.first, options.minimizedPaneIds) ||
      isFullyMinimized(node.second, options.minimizedPaneIds))

  return [
    { path, direction: node.direction, bounds, ratio: effectiveRatio, disabled },
    ...collectDividers(node.first, fb, path ? `${path}/first` : 'first', options),
    ...collectDividers(node.second, sb, path ? `${path}/second` : 'second', options),
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
 * Get the split direction of the branch that is the immediate parent of a leaf pane.
 * Returns null if the pane is the root or not found.
 */
export function getLeafDirection(node: SplitNode, paneId: string): SplitDirection | null {
  if (node.type === 'leaf') return null

  if (
    (node.first.type === 'leaf' && node.first.paneId === paneId) ||
    (node.second.type === 'leaf' && node.second.paneId === paneId)
  ) {
    return node.direction
  }

  return getLeafDirection(node.first, paneId) ?? getLeafDirection(node.second, paneId)
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
