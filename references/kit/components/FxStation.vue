<script setup lang="ts">
// A station card: one step in a flow diagram.
// tone: blue (default, normal operations) or an accent from style.css.
withDefaults(defineProps<{
  name: string
  icon: string // UnoCSS icon class, e.g. 'i-carbon-flow'
  tone?: 'blue' | 'teal' | 'green' | 'amber' | 'orange' | 'red' | 'purple'
  sub?: string
  size?: 'md' | 'sm'
}>(), { tone: 'blue', size: 'md' })
</script>

<template>
  <div class="fx-station" :class="[`fx-tone-${tone}`, `fx-${size}`]">
    <div class="fx-station-icon" :class="icon" />
    <div class="fx-station-name">{{ name }}</div>
    <div v-if="sub" class="fx-station-sub">{{ sub }}</div>
    <slot />
  </div>
</template>

<style scoped>
.fx-station {
  --tone: var(--fx-blue);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 8.5rem;
  padding: 0.9rem 0.5rem;
  border: 1.5px solid var(--fx-border);
  border-radius: 14px;
  background: var(--fx-card);
  box-shadow: var(--fx-shadow);
  color: var(--fx-text);
  text-align: center;
}

.fx-sm {
  min-height: 6.25rem;
  gap: 0.4rem;
  padding: 0.7rem 0.4rem;
}

.fx-station-icon {
  font-size: 2.3rem;
  color: var(--tone);
}

.fx-sm .fx-station-icon {
  font-size: 1.9rem;
}

.fx-station-name {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.15;
  text-wrap: balance;
}

.fx-station-sub {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--fx-muted);
  line-height: 1.2;
}

/* Accent tones: coloured border, tint, name. Blue keeps the neutral card. */
.fx-station:not(.fx-tone-blue) {
  border: 2px solid var(--tone);
  background: color-mix(in srgb, var(--tone) 9%, var(--fx-card));
}

.fx-station:not(.fx-tone-blue) .fx-station-name {
  color: var(--tone);
}

.fx-tone-teal { --tone: var(--fx-teal); }
.fx-tone-green { --tone: var(--fx-green); }
.fx-tone-amber { --tone: var(--fx-amber); }
.fx-tone-orange { --tone: var(--fx-orange); }
.fx-tone-red { --tone: var(--fx-red); }
.fx-tone-purple { --tone: var(--fx-purple); }
</style>
