import type { FileSystemTree } from '@webcontainer/api'

export interface Template {
  id: string
  name: string
  description: string
  files: FileSystemTree
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  commands: {
    dev: string
    build?: string
    test?: string
  }
  entryFile: string
  mainFile?: string
}
