import { useState } from 'react';
import {
  Playground,
  PlaygroundEditor,
  PlaygroundPreview,
  PlaygroundTerminal,
  PlaygroundFileTree,
  PlaygroundToolbar,
} from '@playground/react';
import { vanillaTemplate, reactTemplate, vueTemplate, nodeTemplate, type Template } from '@playground/templates';
import './playground.css';
import './App.css';

const templates: Record<string, Template> = {
  vanilla: vanillaTemplate,
  react: reactTemplate,
  vue: vueTemplate,
  node: nodeTemplate,
};

export default function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('vanilla');
  const template = templates[selectedTemplate];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Code Playground Demo</h1>
        <div className="template-selector">
          <label>Template: </label>
          <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
            <option value="vanilla">Vanilla JS</option>
            <option value="react">React</option>
            <option value="vue">Vue</option>
            <option value="node">Node.js</option>
          </select>
        </div>
      </header>

      <main className="app-main">
        <Playground key={selectedTemplate} template={template} options={{ autoSave: true }}>
          <PlaygroundToolbar />
          <div className="playground-layout">
            <aside className="sidebar">
              <PlaygroundFileTree />
            </aside>
            <div className="main-content">
              <div className="editor-section">
                <PlaygroundEditor />
              </div>
              <div className="preview-section">
                <PlaygroundPreview />
              </div>
            </div>
            <div className="terminal-section">
              <PlaygroundTerminal />
            </div>
          </div>
        </Playground>
      </main>
    </div>
  );
}
