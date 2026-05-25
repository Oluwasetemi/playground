<template>
  <div class="app">
    <!-- ── Top bar ── -->
    <div class="template-bar">
      <div class="app-brand">
        <div class="app-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="5 3 1 8 5 13" />
            <polyline points="11 3 15 8 11 13" />
          </svg>
        </div>
        <span class="app-brand-name">playground</span>
        <span class="app-badge">Nuxt</span>
      </div>

      <div class="template-picker" role="group" aria-label="Select template">
        <div v-for="opt in templateOptions" :key="opt.value" class="template-option">
          <input
            :id="`tpl-${opt.value}`"
            v-model="selectedTemplate"
            type="radio"
            name="template"
            :value="opt.value"
          />
          <label :for="`tpl-${opt.value}`">{{ opt.label }}</label>
        </div>
      </div>

      <div class="toolbar-actions">
        <button
          :class="['layout-toggle-btn', direction === 'vertical' ? 'active' : '']"
          :title="direction === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'"
          @click="direction = direction === 'horizontal' ? 'vertical' : 'horizontal'"
        >
          <svg v-if="direction === 'horizontal'" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="1" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.5" />
            <rect x="2" y="9" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.5" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.5" />
            <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Playground (React mounted client-side only) ── -->
    <main class="app-main">
      <!--
        PlaygroundMount is a .client.vue component — Nuxt skips it during SSR
        and hydrates it in the browser. This is necessary because WebContainers
        and xterm.js both require browser APIs unavailable on the server.
      -->
      <PlaygroundMount
        :template-key="selectedTemplate"
        :direction="direction"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selectedTemplate = ref('react')
const direction = ref<'horizontal' | 'vertical'>('horizontal')

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
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
@import '@setemiojo/playground-react/styles';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }

body {
  font-family: 'Outfit', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #0a0c10;
  color: #e2e8f0;
}

::selection { background: rgba(0, 214, 143, 0.25); color: #e2e8f0; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #252830; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #313540; }

/* ── App shell ── */

.app { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; background: #0a0c10; }

.template-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 48px;
  background: #0a0c10;
  border-bottom: 1px solid #171a21;
  flex-shrink: 0;
  gap: 12px;
}

.app-brand { display: flex; align-items: center; gap: 10px; user-select: none; }

.app-brand-mark {
  width: 26px;
  height: 26px;
  background: #00dc82;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.app-brand-mark svg { width: 14px; height: 14px; color: #fff; }

.app-brand-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8892a4;
}

.app-badge {
  font-size: 10px;
  font-weight: 600;
  color: #00dc82;
  background: rgba(0, 220, 130, 0.1);
  border: 1px solid rgba(0, 220, 130, 0.25);
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.template-picker {
  display: flex;
  align-items: center;
  background: #111318;
  border: 1px solid #252830;
  border-radius: 8px;
  padding: 3px;
  gap: 0;
  flex-wrap: wrap;
}

.template-option { position: relative; }
.template-option input[type="radio"] { position: absolute; opacity: 0; width: 0; height: 0; }
.template-option label {
  display: block;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #8892a4;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  user-select: none;
  letter-spacing: 0.02em;
}
.template-option label:hover { color: #e2e8f0; }
.template-option input[type="radio"]:checked + label {
  background: #1d2129;
  color: #00dc82;
  font-weight: 600;
}

.toolbar-actions { display: flex; align-items: center; gap: 6px; }

.layout-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #111318;
  border: 1px solid #252830;
  border-radius: 7px;
  color: #8892a4;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.layout-toggle-btn:hover { color: #e2e8f0; border-color: #313540; background: #1d2129; }
.layout-toggle-btn.active { color: #00dc82; border-color: rgba(0, 220, 130, 0.35); background: rgba(0, 220, 130, 0.08); }

.app-main { flex: 1; overflow: hidden; padding: 12px 16px 16px; }

.playground-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100% - 48px);
}

.playground-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--playground-border);
  overflow: hidden;
}

.playground-main { flex: 1; overflow: hidden; min-width: 0; }

.playground-editor-section,
.playground-preview-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 768px) {
  .template-bar { padding: 0 12px; height: 44px; }
  .app-brand-name, .app-badge { display: none; }
  .app-main { padding: 8px 8px 10px; }
}
</style>
