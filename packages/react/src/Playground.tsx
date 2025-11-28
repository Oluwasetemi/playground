import { type ReactNode } from 'react';
import type { Template, PlaygroundOptions } from '@playground/core';
import { usePlayground } from './usePlayground';
import { PlaygroundContext } from './context/PlaygroundContext';

export interface PlaygroundProps {
  template: Template;
  options?: PlaygroundOptions;
  children: ReactNode;
}

export function Playground({ template, options, children }: PlaygroundProps) {
  const playground = usePlayground(template, options);

  return (
    <PlaygroundContext.Provider value={playground}>
      {children}
    </PlaygroundContext.Provider>
  );
}
