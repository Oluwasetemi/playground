export interface Template {
  id: string
  name: string
  description: string
  files: any // Using any to avoid type conflicts with @webcontainer/api
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  commands: {
    dev: string
    build?: string
    test?: string
  }
  entryFile: string
  mainFile?: string
  /** List of file paths to hide from the file tree (e.g., ['/vite.config.js', '/package.json']) */
  hiddenFiles?: string[]
}
