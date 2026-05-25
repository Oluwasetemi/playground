'use client'

import {
  Playground,
  PlaygroundEditor,
  PlaygroundFileTree,
  PlaygroundHeader,
  PlaygroundPanel,
  ResizablePanel,
} from '@setemiojo/playground-react'
import type { Template } from '@setemiojo/playground-templates'
import {
  honoTemplate,
  nodeTemplate,
  reactTemplate,
  reactEslintTemplate,
  solidTemplate,
  svelteTemplate,
  vanillaTemplate,
  vueTemplate,
} from '@setemiojo/playground-templates'
import { useState } from 'react'

const templates: Record<string, Template> = {
  vanilla: vanillaTemplate,
  react: reactTemplate,
  'react-eslint': reactEslintTemplate,
  vue: vueTemplate,
  solid: solidTemplate,
  svelte: svelteTemplate,
  node: nodeTemplate,
  hono: honoTemplate,
}

const templateOptions = [
  { value: 'vanilla',      label: 'Vanilla' },
  { value: 'react',        label: 'React' },
  { value: 'react-eslint', label: 'React+ESLint' },
  { value: 'vue',          label: 'Vue' },
  { value: 'solid',        label: 'Solid' },
  { value: 'svelte',       label: 'Svelte' },
  { value: 'node',         label: 'Node' },
  { value: 'hono',         label: 'Hono' },
]

function HorizontalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function VerticalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="1" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="9" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function PlaygroundPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('react')
  const [showSidebar, setShowSidebar] = useState(false)
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal')
  const template = templates[selectedTemplate]

  const titles: Record<string, string> = {
    react: 'React Playground',
    'react-eslint': 'React + ESLint Playground',
    vue: 'Vue Playground',
    solid: 'SolidJS Playground',
    svelte: 'Svelte Playground',
    node: 'Node.js Playground',
    hono: 'Hono Playground',
  }

  return (
    <div className="app">
      {/* ── Top bar ── */}
      <div className="template-bar">
        <div className="app-brand">
          <div className="app-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 3 1 8 5 13" />
              <polyline points="11 3 15 8 11 13" />
            </svg>
          </div>
          <span className="app-brand-name">playground</span>
          <span className="app-badge">Next.js</span>
        </div>

        <div className="template-picker" role="group" aria-label="Select template">
          {templateOptions.map(opt => (
            <div className="template-option" key={opt.value}>
              <input
                type="radio"
                id={`tpl-${opt.value}`}
                name="template"
                value={opt.value}
                checked={selectedTemplate === opt.value}
                onChange={() => setSelectedTemplate(opt.value)}
              />
              <label htmlFor={`tpl-${opt.value}`}>{opt.label}</label>
            </div>
          ))}
        </div>

        <div className="toolbar-actions">
          <button
            className={`layout-toggle-btn ${direction === 'vertical' ? 'active' : ''}`}
            onClick={() => setDirection(d => d === 'horizontal' ? 'vertical' : 'horizontal')}
            title={direction === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'}
            aria-label={direction === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'}
          >
            {direction === 'horizontal' ? <VerticalIcon /> : <HorizontalIcon />}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="app-main">
        <Playground template={template} options={{ autoSave: true }}>
          <div className="playground">
            <PlaygroundHeader
              title={titles[selectedTemplate] ?? 'Playground'}
              onToggleSidebar={() => setShowSidebar(s => !s)}
              showSidebar={showSidebar}
            />
            <div className="playground-content">
              {showSidebar && (
                <aside className="playground-sidebar">
                  <PlaygroundFileTree />
                </aside>
              )}
              <ResizablePanel
                firstPanel={
                  <div className="playground-editor-section">
                    <PlaygroundEditor />
                  </div>
                }
                secondPanel={
                  <div className="playground-preview-section">
                    <PlaygroundPanel />
                  </div>
                }
                direction={direction}
                responsive
                responsiveBreakpoint={768}
                initialSize={50}
                mobileInitialSize={45}
                minSize={20}
                maxSize={80}
                storageKey="nextjs-demo-panel-size"
                className="playground-main"
              />
            </div>
          </div>
        </Playground>
      </main>
    </div>
  )
}
