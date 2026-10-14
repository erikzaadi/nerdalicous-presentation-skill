<script setup>
defineProps({
  prompt: { type: String, required: true },
  height: { type: String, default: '18rem' },
  // the generated file's name (scripts/generate-slide-images.mjs), e.g. robot-strike
  name: { type: String, default: '' }
})
</script>

<template>
  <div class="image-tbd" :style="{ height }">
    <div class="image-tbd-label">🎨 Image TBD<template v-if="name"> · {{ name }}</template></div>
    <div class="image-tbd-prompt">{{ prompt }}</div>
  </div>
</template>

<style scoped>
.image-tbd {
  margin-top: 1.5rem;
  border: 2px dashed var(--fx-line, #727272);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 3rem;
  text-align: center;
}

.image-tbd-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fx-line, #727272);
  margin-bottom: 0.5rem;
}

.image-tbd-prompt {
  font-family: var(--fx-mono, 'Roboto Mono', monospace);
  font-size: 0.8rem;
  color: var(--fx-muted, #d1d1d1);
  max-width: 40rem;
}
</style>
