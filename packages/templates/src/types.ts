export interface Template {
  id: string
  name: string
  description: string
  files: any // Using any to avoid type conflicts with @webcontainer/api
  dependencies: Record<string, string>
  commands: {
    dev: string
    build?: string
    test?: string
  }
  entryFile: string
  mainFile?: string
}
