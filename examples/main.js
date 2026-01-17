import { PlaygroundEngine } from '@setemiojo/playground-core'
import { reactTemplate, vanillaTemplate } from '@setemiojo/playground-templates'

let engine = null
let currentTemplate = null
const statusEl = document.getElementById('status')
const logEl = document.getElementById('log')
const previewIframe = document.getElementById('preview')
const previewPlaceholder = document.getElementById('preview-placeholder')

function log(message, type = 'info') {
  const entry = document.createElement('div')
  entry.className = `log-entry log-${type}`
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
  logEl.appendChild(entry)
  logEl.scrollTop = logEl.scrollHeight
}

function updateStatus(status) {
  statusEl.textContent = status
  log(`Status: ${status}`, 'info')
}

function showPreview() {
  previewIframe.style.display = 'block'
  previewPlaceholder.style.display = 'none'
}

function hidePreview() {
  previewIframe.style.display = 'none'
  previewPlaceholder.style.display = 'flex'
}

async function initializeEngine(template) {
  try {
    log(`Initializing with ${template.name}...`, 'info')

    if (engine) {
      hidePreview()
      await engine.cleanup()
    }

    engine = new PlaygroundEngine({ autoSave: false })

    // Listen to events
    engine.on('status:change', (status) => {
      updateStatus(status)
    })

    engine.on('error', (error) => {
      log(`Error: ${error.message}`, 'error')
    })

    engine.on('preview:ready', (url) => {
      log(`Preview ready: ${url}`, 'success')
      // Mount the preview in the iframe
      showPreview()
      engine.mountPreview(previewIframe)
    })

    engine.on('files:update', (files) => {
      log(`File tree updated: ${files.length} items`, 'info')
    })

    engine.on('file:change', (path) => {
      log(`File changed: ${path}`, 'info')
    })

    await engine.initialize(template)
    currentTemplate = template
    log(`✓ ${template.name} initialized successfully!`, 'success')
  }
  catch (error) {
    log(`✗ Initialization failed: ${error.message}`, 'error')
  }
}

async function switchTemplate(template) {
  if (!engine) {
    log('Please initialize first', 'error')
    return
  }

  try {
    log(`Switching to ${template.name}...`, 'info')
    await engine.switchTemplate(template)
    currentTemplate = template
    log(`✓ Switched to ${template.name}!`, 'success')
    // Re-mount preview after template switch
    showPreview()
    engine.mountPreview(previewIframe)
  }
  catch (error) {
    log(`✗ Switch failed: ${error.message}`, 'error')
  }
}

async function readFile() {
  if (!engine) {
    log('Please initialize first', 'error')
    return
  }

  try {
    const status = engine.getStatus()

    if (status !== 'ready') {
      log('Engine not ready yet', 'error')
      return
    }

    // Check if File System Access API is supported
    if (!('showOpenFilePicker' in window)) {
      log('File System Access API not supported in this browser', 'error')
      return
    }

    log('Opening file picker...', 'info')

    // Open file picker
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Text Files',
          accept: {
            'text/*': ['.txt', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md'],
          },
        },
      ],
      multiple: false,
    })

    const file = await fileHandle.getFile()
    const content = await file.text()

    log(`✓ Read file: ${file.name} (${content.length} bytes)`, 'success')
    log(`Preview (first 200 chars): ${content.substring(0, 200)}...`, 'info')

    // Determine the path based on file extension
    const fileName = file.name
    const targetPath = `/${fileName}`

    log(`Adding file to template at ${targetPath}...`, 'info')

    // Add the file to the current template
    await engine.updateFile(targetPath, content)

    // Open it in the editor
    await engine.openFile(targetPath)

    log(`✓ File added to template and opened in editor`, 'success')
  }
  catch (error) {
    if (error.name === 'AbortError') {
      log('File selection cancelled', 'info')
    }
    else {
      log(`✗ Read failed: ${error.message}`, 'error')
    }
  }
}

async function updateFile() {
  if (!engine) {
    log('Please initialize first', 'error')
    return
  }

  try {
    const status = engine.getStatus()

    if (status !== 'ready') {
      log('Engine not ready yet', 'error')
      return
    }

    const path = currentTemplate?.id === 'vanilla-js' ? '/main.js' : '/src/App.jsx'
    const newContent = currentTemplate?.id === 'vanilla-js'
      ? `import './style.css';

const app = document.getElementById('app');
app.innerHTML = '<h1>Updated from Vanilla JS! Time: ${new Date().toLocaleTimeString()}</h1>';`
      : `import { useState } from 'react';
import './App.css';

function App() {
return <div><h1>Updated from Vanilla JS! Time: ${new Date().toLocaleTimeString()}</h1></div>;
}

export default App;`

    log(`Updating ${path}...`, 'info')
    await engine.updateFile(path, newContent)
    log(`✓ Updated ${path}`, 'success')
  }
  catch (error) {
    log(`✗ Update failed: ${error.message}`, 'error')
  }
}

// Button handlers
document.getElementById('init-vanilla').onclick = () => initializeEngine(vanillaTemplate)
document.getElementById('init-react').onclick = () => initializeEngine(reactTemplate)
document.getElementById('switch-react').onclick = () => switchTemplate(reactTemplate)
document.getElementById('switch-vanilla').onclick = () => switchTemplate(vanillaTemplate)
document.getElementById('read-file').onclick = readFile
document.getElementById('update-file').onclick = updateFile
document.getElementById('clear-log').onclick = () => {
  logEl.innerHTML = ''
}

log('Ready! Click a button to start.', 'success')
