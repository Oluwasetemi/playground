import type { FileNode } from '@setemiojo/playground-core'
import { usePlaygroundContext } from '../context/PlaygroundContext'

interface FileTreeNodeProps {
  node: FileNode
  onFileClick: (path: string) => void
}

function FileTreeNode({ node, onFileClick }: FileTreeNodeProps) {
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
          <FileTreeNode key={child.path} node={child} onFileClick={onFileClick} />
        ))}
      </div>
    </details>
  )
}

const SKELETON_WIDTHS = ['60%', '45%', '72%', '38%', '55%', '65%', '42%']

function FileTreeSkeleton() {
  return (
    <div className="file-tree-skeleton" aria-label="Loading files…" aria-busy="true">
      {SKELETON_WIDTHS.map((w, i) => (
        <div key={i} className="file-tree-skeleton-row" style={{ paddingLeft: i > 1 ? 22 : 8 }}>
          <div className="file-tree-skeleton-icon" />
          <div className="file-tree-skeleton-label" style={{ width: w }} />
        </div>
      ))}
    </div>
  )
}

export function PlaygroundFileTree() {
  const { files, openFile, status } = usePlaygroundContext()
  const isLoading = status === 'initializing' || status === 'installing' || files.length === 0

  return (
    <div className="playground-file-tree">
      <div className="file-tree-header">
        Files
        {isLoading && <span className="file-tree-spinner" aria-hidden="true" />}
      </div>
      <div className="file-tree-content">
        {isLoading
          ? <FileTreeSkeleton />
          : files.map(node => (
              <FileTreeNode key={node.path} node={node} onFileClick={openFile} />
            ))}
      </div>
    </div>
  )
}
