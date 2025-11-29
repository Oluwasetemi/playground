import type { FileNode } from '../engine/types'

/**
 * Flattened file node for virtual scrolling
 */
export interface FlatFileNode {
  node: FileNode
  depth: number
  isExpanded: boolean
}

/**
 * Flatten a hierarchical file tree into a flat array for virtual scrolling.
 * Only includes visible nodes (respecting collapsed directories).
 */
export function flattenFileTree(
  nodes: FileNode[],
  expandedPaths: Set<string> = new Set(),
  depth = 0,
): FlatFileNode[] {
  const result: FlatFileNode[] = []

  for (const node of nodes) {
    const isExpanded = expandedPaths.has(node.path)

    result.push({
      node,
      depth,
      isExpanded,
    })

    // If directory is expanded and has children, recursively flatten
    if (node.type === 'directory' && isExpanded && node.children) {
      result.push(...flattenFileTree(node.children, expandedPaths, depth + 1))
    }
  }

  return result
}

/**
 * Toggle directory expansion state
 */
export function toggleExpansion(
  path: string,
  expandedPaths: Set<string>,
): Set<string> {
  const newExpanded = new Set(expandedPaths)

  if (newExpanded.has(path)) {
    newExpanded.delete(path)
  }
  else {
    newExpanded.add(path)
  }

  return newExpanded
}

/**
 * Expand all parent directories of a given path
 */
export function expandToPath(
  path: string,
  expandedPaths: Set<string>,
): Set<string> {
  const newExpanded = new Set(expandedPaths)
  const segments = path.split('/').filter(Boolean)

  let currentPath = ''
  for (const segment of segments.slice(0, -1)) {
    currentPath += `/${segment}`
    newExpanded.add(currentPath)
  }

  return newExpanded
}
