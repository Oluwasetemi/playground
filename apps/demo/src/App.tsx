import type { Template } from '@setemiojo/playground-templates'
import {
  Playground,
  PlaygroundEditor,
  PlaygroundFileTree,
  PlaygroundHeader,
  PlaygroundPanel,
  ResizablePanel,
} from "@setemiojo/playground-react";
import { useState } from "react";
// import { reactTemplate as newTemp } from "./react.ts";
import {
  nodeTemplate,
  reactTemplate,
  vanillaTemplate,
  vueTemplate,
} from '@setemiojo/playground-templates'
import "./playground.css";
import "./App.css";

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

function CodeMirrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <polyline points="4 5 1 8 4 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="12 5 15 8 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="3" x2="7" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function MonacoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5l2 3-2 3M9 11h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

export default function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("react");
  const [showSidebar, setShowSidebar] = useState(false);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal')
  const [editorType, setEditorType] = useState<'codemirror' | 'monaco'>('codemirror')
  const template = templates[selectedTemplate]

  const getTitle = () => {
    switch (selectedTemplate) {
      case "react":
        return "React Playground";
      case "vue":
        return "Vue Playground";
      case "node":
        return "Node.js Playground";
      default:
        return "JavaScript Playground";
    }
  };

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

        {/* Editor toggle */}
        <button
          className={`layout-toggle-btn ${editorType === 'monaco' ? 'active' : ''}`}
          onClick={() => setEditorType(e => e === 'codemirror' ? 'monaco' : 'codemirror')}
          title={editorType === 'codemirror' ? 'Switch to Monaco editor' : 'Switch to CodeMirror editor'}
          aria-label={editorType === 'codemirror' ? 'Switch to Monaco editor' : 'Switch to CodeMirror editor'}
        >
          {editorType === 'codemirror' ? <MonacoIcon /> : <CodeMirrorIcon />}
        </button>

        {/* Layout toggle */}
        <button
          className={`layout-toggle-btn ${direction === 'vertical' ? 'active' : ''}`}
          onClick={() => setDirection(d => d === 'horizontal' ? 'vertical' : 'horizontal')}
          title={direction === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'}
          aria-label={direction === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'}
        >
          {direction === 'horizontal' ? <VerticalIcon /> : <HorizontalIcon />}
        </button>
      </div>

      {/* ── Main content ── */}
      <main className="app-main">
        <Playground
          template={template}
          options={{ autoSave: true, editor: editorType }}
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
                storageKey="playground-panel-size"
                className="playground-main"
              />
            </div>
          </div>
        </Playground>
      </main>
    </div>
  );
}
