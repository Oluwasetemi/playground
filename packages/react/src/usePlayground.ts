import { useEffect, useRef, useState, useCallback } from 'react';
import { PlaygroundEngine, type Template, type PlaygroundOptions, type FileNode, type PlaygroundStatus } from '@playground/core';

export function usePlayground(template: Template, options?: PlaygroundOptions) {
  const engineRef = useRef<PlaygroundEngine | null>(null);
  const [status, setStatus] = useState<PlaygroundStatus>('initializing');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const engine = new PlaygroundEngine(options);
    engineRef.current = engine;

    const unsubscribers = [
      engine.on('status:change', setStatus),
      engine.on('files:update', setFiles),
      engine.on('preview:ready', setPreviewUrl),
      engine.on('error', (error) => {
        console.error('Playground error:', error);
      }),
    ];

    engine.initialize(template).catch((error) => {
      console.error('Failed to initialize playground:', error);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      engine.cleanup();
    };
  }, [template.id, options]);

  const updateFile = useCallback(async (path: string, content: string) => {
    if (engineRef.current) {
      await engineRef.current.updateFile(path, content);
    }
  }, []);

  const openFile = useCallback(async (path: string) => {
    if (engineRef.current) {
      await engineRef.current.openFile(path);
    }
  }, []);

  const saveSnapshot = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.saveSnapshot();
    }
  }, []);

  return {
    engine: engineRef.current,
    status,
    files,
    previewUrl,
    updateFile,
    openFile,
    saveSnapshot,
  };
}
