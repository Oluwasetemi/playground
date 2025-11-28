import type { FileSystemTree } from '@webcontainer/api';

export interface Template {
  id: string;
  name: string;
  description: string;
  files: FileSystemTree;
  dependencies: Record<string, string>;
  commands: {
    dev: string;
    build?: string;
    test?: string;
  };
  entryFile: string;
  mainFile?: string;
}

export interface PlaygroundOptions {
  theme?: 'light' | 'dark';
  autoSave?: boolean;
  autoSaveInterval?: number;
  showLineNumbers?: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info';
  args: any[];
  timestamp: number;
}

export interface ProcessOutput {
  type: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

export interface PlaygroundSnapshot {
  version: number;
  timestamp: number;
  files: Record<string, string>;
  openTabs: string[];
  activeFile: string;
  templateId: string;
}

export type PlaygroundStatus = 'initializing' | 'installing' | 'ready' | 'error';

export interface PlaygroundEvents {
  'status:change': (status: PlaygroundStatus) => void;
  'file:change': (path: string, content: string) => void;
  'files:update': (files: FileNode[]) => void;
  'preview:ready': (url: string) => void;
  'console:message': (message: ConsoleMessage) => void;
  'process:output': (output: ProcessOutput) => void;
  'error': (error: Error) => void;
  'install:progress': (data: { current: number; total: number }) => void;
  [key: string]: (...args: any[]) => void;
}
