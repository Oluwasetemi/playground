import type { FileNode } from '@setemiojo/playground-core'
import { useMemo } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

interface FileTreeNodeProps {
  node: FileNode
  onFileClick: (path: string) => void
  hiddenFiles: string[]
}

/**
 * Check if a path should be hidden
 */
function isHidden(path: string, hiddenFiles: string[]): boolean {
  // Normalize path to always start with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return hiddenFiles.some((hidden) => {
    const normalizedHidden = hidden.startsWith('/') ? hidden : `/${hidden}`
    return normalizedPath === normalizedHidden
  })
}

/**
 * Recursively filter out hidden files from a file tree
 */
function filterHiddenFiles(nodes: FileNode[], hiddenFiles: string[]): FileNode[] {
  if (!hiddenFiles.length) return nodes

  return nodes
    .filter(node => !isHidden(node.path, hiddenFiles))
    .map((node) => {
      if (node.type === 'directory' && node.children) {
        return {
          ...node,
          children: filterHiddenFiles(node.children, hiddenFiles),
        }
      }
      return node
    })
    // Filter out empty directories after filtering children
    .filter(node => node.type === 'file' || (node.children && node.children.length > 0))
}

function FileTreeNode({ node, onFileClick, hiddenFiles }: FileTreeNodeProps) {
  if (node.type === 'file') {
    return (
      <div className="file-node" onClick={() => onFileClick(node.path)}>
        <span className="file-icon">📄</span>
        <span className="file-name">{node.name}</span>
      </div>
    )
  }

  return (
    <details className="directory-node" open>
      <summary>
        <span className="folder-icon">📁</span>
        <span className="folder-name">{node.name}</span>
      </summary>
      <div className="directory-children">
        {node.children?.map((child: FileNode) => (
          <FileTreeNode
            key={child.path}
            node={child}
            onFileClick={onFileClick}
            hiddenFiles={hiddenFiles}
          />
        ))}
      </div>
    </details>
  )
}

export function PlaygroundFileTree() {
  const { files, openFile, hiddenFiles } = usePlaygroundContext()

  // Filter out hidden files
  const visibleFiles = useMemo(
    () => filterHiddenFiles(files, hiddenFiles),
    [files, hiddenFiles],
  )

  return (
    <div className="playground-file-tree">
      <div className="file-tree-header">Files</div>
      <div className="file-tree-content">
        {visibleFiles.map(node => (
          <FileTreeNode
            key={node.path}
            node={node}
            onFileClick={openFile}
            hiddenFiles={hiddenFiles}
          />
        ))}
      </div>
    </div>
  )
}
