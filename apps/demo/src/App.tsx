import type { Template } from '@setemiojo/playground-templates'
import {
  Playground,
  PlaygroundEditor,
  PlaygroundFileTree,
  PlaygroundHeader,
  PlaygroundPanel,
  ResizablePanel,
} from '@setemiojo/playground-react'
import {
  nodeTemplate,
  reactTemplate,
  vanillaTemplate,
  vueTemplate,
} from '@setemiojo/playground-templates'
import { useState } from 'react'
import './playground.css'
import './App.css'

const templates: Record<string, Template> = {
  vanilla: vanillaTemplate,
  react: reactTemplate,
  vue: vueTemplate,
  node: nodeTemplate,
}

const templateOptions = [
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'react',   label: 'React' },
  { value: 'vue',     label: 'Vue' },
  { value: 'node',    label: 'Node' },
]

export default function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('react')
  const [showSidebar, setShowSidebar] = useState(false)
  const template = templates[selectedTemplate]

  const getTitle = () => {
    switch (selectedTemplate) {
      case 'react':   return 'React Playground'
      case 'vue':     return 'Vue Playground'
      case 'node':    return 'Node.js Playground'
      default:        return 'JavaScript Playground'
    }
  }

  return (
    <div className="app">
      {/* ── Top bar ── */}
      <div className="template-bar">
        {/* Brand */}
        <div className="app-brand">
          <div className="app-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 3 1 8 5 13" />
              <polyline points="11 3 15 8 11 13" />
            </svg>
          </div>
          <span className="app-brand-name">playground</span>
        </div>

        {/* Template picker */}
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
      </div>

      {/* ── Main content ── */}
      <main className="app-main">
        <Playground
          key={selectedTemplate}
          template={template}
          options={{ autoSave: true }}
        >
          <div className="playground">
            <PlaygroundHeader
              title={getTitle()}
              onToggleSidebar={() => setShowSidebar(!showSidebar)}
              showSidebar={showSidebar}
            />
            <div className="playground-content">
              {showSidebar && (
                <aside className="playground-sidebar">
                  <PlaygroundFileTree />
                </aside>
              )}
              <ResizablePanel
                firstPanel={(
                  <div className="playground-editor-section">
                    <PlaygroundEditor />
                  </div>
                )}
                secondPanel={(
                  <div className="playground-preview-section">
                    <PlaygroundPanel />
                  </div>
                )}
                direction="horizontal"
                responsive
                responsiveBreakpoint={768}
                initialSize={50}
                mobileInitialSize={45}
                minSize={20}
                maxSize={80}
                storageKey="playground-panel-size"
                className="playground-main"
              />
            </div>
          </div>
        </Playground>
      </main>
    </div>
  )
}
