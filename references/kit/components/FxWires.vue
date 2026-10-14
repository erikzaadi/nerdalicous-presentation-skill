<script setup lang="ts">
import { useId } from 'vue'
import type { Wire } from '../utils/fx'

// SVG connector layer drawn over a diagram, in the diagram's pixel space.
// Each wire can be tied to a click step: ghost wires show as blueprint
// before their step, others stay hidden until it.

defineProps<{ wires: Wire[], w: number, h: number }>()

const uid = useId()
const tones = ['line', 'teal', 'green', 'amber', 'orange', 'red', 'purple'] as const
const color = (t: string) => `var(--fx-${t})`
const cls = (wr: Wire) => (wr.ghost === false ? 'fx-reveal' : 'fx-ghost')
</script>

<template>
  <svg class="fx-wires" :viewBox="`0 0 ${w} ${h}`" :width="w" :height="h" aria-hidden="true">
    <defs>
      <marker
        v-for="t in tones" :id="`${uid}-${t}`" :key="t"
        viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"
      >
        <path d="M0 0 L10 5 L0 10 z" :style="{ fill: color(t) }" />
      </marker>
    </defs>
    <template v-for="(wr, i) in wires" :key="i">
      <path
        v-if="wr.step"
        v-click="wr.step"
        :class="cls(wr)"
        :d="wr.d"
        :style="{ stroke: color(wr.tone ?? 'line'), strokeWidth: wr.width ?? 2.5 }"
        :marker-end="wr.arrow === false ? undefined : `url(#${uid}-${wr.tone ?? 'line'})`"
      />
      <path
        v-else
        :d="wr.d"
        :style="{ stroke: color(wr.tone ?? 'line'), strokeWidth: wr.width ?? 2.5 }"
        :marker-end="wr.arrow === false ? undefined : `url(#${uid}-${wr.tone ?? 'line'})`"
      />
    </template>
  </svg>
</template>

<style scoped>
.fx-wires {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.fx-wires path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fx-wires marker path {
  stroke: none;
}
</style>
