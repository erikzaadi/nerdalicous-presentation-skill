<script setup lang="ts">
import { computed } from 'vue'
import { useBoxes, wire, type Wire } from '../utils/fx'

// A worked example of the diagram pattern (references/diagram-components.md),
// from the LGTM test deck: the PR pipeline on top, and on click the conversation underneath
// that never makes it into the diff (author and reviewer talking both ways).

const { root, reg, boxes, size } = useBoxes()

const wires = computed<Wire[]>(() => {
  const { author: a, diff, reviewer: r, merge: m, why, worry } = boxes.value
  // every wire exists from the first frame (empty until measured), since
  // v-click targets registered after mount break the slide's click count
  const ready = !!(a && diff && r && m && why && worry)
  const d = (pts: () => [number, number][]) => (ready ? wire(pts()) : '')
  const gap = 4 // arrows stop just short of the card edge
  const inset = 22 // the two loop wires leave a card side by side
  return [
    // the pipeline everyone sees
    { d: d(() => [[a.r, a.cy], [diff.l - gap, a.cy]]) },
    { d: d(() => [[diff.r, r.cy], [r.l - gap, r.cy]]) },
    { d: d(() => [[r.r, r.cy], [m.l - gap, m.cy]]), tone: 'green' },
    // the conversation underneath: author asks reviewer, reviewer answers back
    { d: d(() => [[a.cx + inset, a.b], [a.cx + inset, why.cy], [why.l - gap, why.cy]]), tone: 'teal', step: 1, arrow: false },
    { d: d(() => [[why.r, why.cy], [r.cx - inset, why.cy], [r.cx - inset, r.b + gap]]), tone: 'teal', step: 1 },
    { d: d(() => [[r.cx + inset, r.b], [r.cx + inset, worry.cy], [worry.r + gap, worry.cy]]), tone: 'teal', step: 1, arrow: false },
    { d: d(() => [[worry.l, worry.cy], [a.cx - inset, worry.cy], [a.cx - inset, a.b + gap]]), tone: 'teal', step: 1 },
  ]
})
</script>

<template>
  <div ref="root" class="gap-diagram">
    <FxStation :ref="reg('author')" name="Author" icon="i-carbon-user" size="sm" />
    <FxContract :ref="reg('diff')" class="gap-diff" label="Diff" icon="i-carbon-code" tone="green" />
    <FxStation :ref="reg('reviewer')" name="Reviewer" icon="i-carbon-view" size="sm" />
    <FxStation :ref="reg('merge')" name="Merge" icon="i-carbon-checkmark-filled" tone="green" size="sm" />

    <div class="gap-talk">
      <FxContract :ref="reg('why')" v-click="1" class="fx-ghost" label="Why this way?" icon="i-carbon-help" tone="teal" />
      <FxContract :ref="reg('worry')" v-click="1" class="fx-ghost" label="What I'd worry about" icon="i-carbon-warning-alt" tone="teal" />
    </div>

    <FxWires :wires="wires" :w="size.w" :h="size.h" />
  </div>
</template>

<style scoped>
.gap-diagram {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 9.5rem);
  column-gap: 3.5rem;
  row-gap: 2.75rem;
  justify-content: center;
  align-items: center;
  margin-top: 3.5rem;
}

.gap-diff {
  justify-self: center;
}

/* sits under the diff, between author and reviewer */
.gap-talk {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
}

.gap-talk > * {
  width: max-content;
}
</style>
