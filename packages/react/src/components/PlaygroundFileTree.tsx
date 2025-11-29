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
        {node.children?.map(child => (
          <FileTreeNode key={child.path} node={child} onFileClick={onFileClick} />
        ))}
      </div>
    </details>
  )
}

export function PlaygroundFileTree() {
  const { files, openFile } = usePlaygroundContext()

  return (
    <div className="playground-file-tree">
      <div className="file-tree-header">Files</div>
      <div className="file-tree-content">
        {files.map(node => (
          <FileTreeNode key={node.path} node={node} onFileClick={openFile} />
        ))}
      </div>
    </div>
  )
}
