<script setup>
import { computed } from 'vue'

const props = defineProps({
  // image (generated, scripts/generate-slide-images.mjs), gif (scripts/find-gifs.mjs) or meme (scripts/generate-memes.mjs)
  kind: { type: String, default: 'image' },
  // image: the generation prompt; gif: the search query
  prompt: { type: String, default: '' },
  // gif: where it's from (a film, a show), added to the search
  source: { type: String, default: '' },
  // gif: the chosen Giphy id or URL
  pick: { type: String, default: '' },
  // meme: a memegen.link template id, and its text (top/bottom, or lines="a|b|c")
  template: { type: String, default: '' },
  top: { type: String, default: '' },
  bottom: { type: String, default: '' },
  lines: { type: String, default: '' },
  height: { type: String, default: '18rem' },
  // the downloaded or generated file's name, e.g. robot-strike
  name: { type: String, default: '' }
})

const label = computed(() => ({ gif: '🎞️ GIF TBD', meme: '🖼️ Meme TBD' })[props.kind] ?? '🎨 Image TBD')
const memeText = computed(() => (props.lines ? props.lines.split('|') : [props.top, props.bottom]).map((line) => line.trim()).filter(Boolean))
const searchUrl = computed(() => {
  const query = [props.source, props.prompt].filter(Boolean).join(' ')
  return `https://giphy.com/search/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`
})
</script>

<template>
  <div class="image-tbd" :style="{ height }">
    <div class="image-tbd-label">{{ label }}<template v-if="name"> · {{ name }}</template></div>
    <template v-if="kind === 'meme'">
      <div class="image-tbd-prompt"><strong>{{ template }}</strong></div>
      <div v-for="(line, i) in memeText" :key="i" class="image-tbd-prompt">“{{ line }}”</div>
    </template>
    <template v-else-if="kind === 'gif'">
      <div class="image-tbd-prompt">“{{ prompt }}”<template v-if="source"> · {{ source }}</template></div>
      <div class="image-tbd-hint">
        <template v-if="pick">picked {{ pick }}</template>
        <a v-else :href="searchUrl" target="_blank" rel="noopener">search giphy</a>
      </div>
    </template>
    <div v-else class="image-tbd-prompt">{{ prompt }}</div>
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

.image-tbd-hint {
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: var(--fx-line, #727272);
}

.image-tbd-hint a {
  color: inherit;
}
</style>
