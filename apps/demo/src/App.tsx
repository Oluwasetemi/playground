import type { Template } from '@setemiojo/playground-templates'
import {
  Playground,
  PlaygroundEditor,
  PlaygroundFileTree,
  PlaygroundHeader,
  PlaygroundPanel,
} from '@setemiojo/playground-react'
import { nodeTemplate, reactTemplate, vanillaTemplate, vueTemplate } from '@setemiojo/playground-templates'
import { useState } from 'react'
import './playground.css'
import './App.css'

const templates: Record<string, Template> = {
  vanilla: vanillaTemplate,
  react: reactTemplate,
  vue: vueTemplate,
  node: nodeTemplate,
}

export default function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('react')
  const [showSidebar, setShowSidebar] = useState(false)
  const template = templates[selectedTemplate]

  const getTitle = () => {
    switch (selectedTemplate) {
      case 'react':
        return 'React Playground'
      case 'vue':
        return 'Vue Playground'
      case 'node':
        return 'Node.js Playground'
      default:
        return 'JavaScript Playground'
    }
  }

  return (
    <div className="app">
      <div className="template-bar">
        <select disabled value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
          <option value="vanilla">Vanilla JS</option>
          <option value="react">React</option>
          <option value="vue">Vue</option>
          <option value="node">Node.js</option>
        </select>
      </div>

      <main className="app-main">
        <Playground key={selectedTemplate} template={template} options={{ autoSave: true }}>
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
              <div className="playground-main">
                <div className="playground-editor-section">
                  <PlaygroundEditor />
                </div>
                <div className="playground-preview-section">
                  <PlaygroundPanel />
                </div>
              </div>
            </div>
          </div>
        </Playground>
      </main>
    </div>
  )
}
