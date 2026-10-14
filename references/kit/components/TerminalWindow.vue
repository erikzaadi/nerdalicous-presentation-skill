<script setup lang="ts">
// A macOS-style terminal around a code block. Always dark, in both themes.
// Diff lines get GitHub-style tinted rows.
defineProps<{
  title: string
  command?: string // shown as the first, prompt-styled line
}>()
</script>

<template>
  <div class="terminal">
    <div class="term-bar">
      <span class="term-dot term-red" />
      <span class="term-dot term-amber" />
      <span class="term-dot term-green" />
      <span class="term-title">{{ title }}</span>
    </div>
    <div class="term-body">
      <div v-if="command" class="term-command">
        <span class="term-prompt">❯</span>{{ command }}
      </div>
      <slot />
      <div class="term-end" />
    </div>
  </div>
</template>

<style scoped>
/* One edge only: a hairline ring that follows the radius exactly (no border,
   so the title bar's corners line up with the window's). No drop shadow:
   on a dark slide it reads as a second ring. */
.terminal {
  border-radius: 12px;
  background: #0d1117;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.09);
}

.term-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.4rem;
  padding: 0 1rem;
  border-bottom: 1px solid #30363d;
  border-radius: 12px 12px 0 0;
  background: #161b22;
}

.term-dot {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
}

.term-red { background: #ff5f57; }
.term-amber { background: #febc2e; }
.term-green { background: #28c840; }

.term-title {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--fx-mono, 'Roboto Mono', monospace);
  font-size: 0.85rem;
  color: #8b949e;
  pointer-events: none;
}

.term-body {
  padding-top: 1.1rem;
}

/* breathing room under the last row */
.term-end {
  height: 1.1rem;
}

.term-command {
  padding: 0 1.8rem 0.8rem;
  font-family: var(--fx-mono, 'Roboto Mono', monospace);
  font-size: 1.3rem;
  font-variant-ligatures: none;
  color: #8b949e;
}

.term-prompt {
  margin-right: 0.75rem;
  color: #3fb950;
}

/* The highlighted code: always the dark palette, bigger, no own frame */
.term-body :deep(.slidev-code-wrapper) {
  margin: 0 !important;
}

.term-body :deep(.slidev-code) {
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  overflow: visible !important;
  font-size: 1.3rem !important;
  line-height: 2.35rem !important;
  font-variant-ligatures: none;
}

.term-body :deep(.shiki span) {
  color: var(--shiki-dark) !important;
}

/* Rows: rounded, tinted for removed/added lines (shiki's diff token colours) */
.term-body :deep(.line) {
  display: inline-block;
  width: calc(100% - 1.6rem);
  margin: 0 0.8rem;
  padding: 0 1rem;
  border-radius: 6px;
}

.term-body :deep(.line:has(span[style*='B31D28'])) {
  background: rgba(248, 81, 73, 0.15);
}

.term-body :deep(.line:has(span[style*='B31D28']) span) {
  color: #ffa198 !important;
}

.term-body :deep(.line:has(span[style*='22863A'])) {
  background: rgba(46, 160, 67, 0.17);
}

.term-body :deep(.line:has(span[style*='22863A']) span) {
  color: #7ee787 !important;
}
</style>
