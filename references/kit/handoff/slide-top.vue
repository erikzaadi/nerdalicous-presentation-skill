<script setup lang="ts">
// Handoff corner marks for co-presented talks: a tiny square in each top corner,
// left = who speaks on this slide, right = who speaks next. Read from the notes'
// `Handoff (Erik → Mor): "..."` line, so the notes stay the only place to edit.
// Slidev renders a deck-root slide-top.vue on top of every slide; `h` toggles the marks.
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'
import { showHandoffMarks } from './utils/handoffMarks'

// One entry per presenter, keyed by the lowercased name used in the notes.
// Use the deck's palette tokens, with a literal fallback for decks without them.
const colors: Record<string, string> = {
  erik: 'var(--color-text-primary, #f4f4f4)',
  dana: 'var(--fx-blue, #64b5f6)',
}

// Production builds ship only the rendered notes (noteHTML), not the raw note, so read
// both; the arrow may arrive as an entity there.
const HANDOFF =
  /(?:Handoff|מעבר)\s*\(\s*([\p{L}\d_-]+)\s*(?:→|->|&rarr;|&#8594;|&#x2192;|-&gt;)\s*([\p{L}\d_-]+)\s*\)/iu

const { $route } = useSlideContext()
const handoff = computed(() => {
  const slide = $route?.meta?.slide as { note?: string; noteHTML?: string } | undefined
  const match = `${slide?.note ?? ''} ${slide?.noteHTML ?? ''}`.match(HANDOFF)
  if (!match) {
    return null
  }
  return { now: colors[match[1].toLowerCase()], next: colors[match[2].toLowerCase()] }
})
</script>

<template>
  <template v-if="showHandoffMarks && handoff">
    <i v-if="handoff.now" class="handoff-mark left" :style="{ background: handoff.now }" />
    <i v-if="handoff.next" class="handoff-mark right" :style="{ background: handoff.next }" />
  </template>
</template>

<style scoped>
.handoff-mark {
  position: absolute;
  top: 6px;
  width: 5px;
  height: 5px;
  opacity: 0.6;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4); /* keeps a dark mark visible on dark slides */
  pointer-events: none;
  z-index: 100;
}

.handoff-mark.left {
  left: 6px;
}

.handoff-mark.right {
  right: 6px;
}
</style>
