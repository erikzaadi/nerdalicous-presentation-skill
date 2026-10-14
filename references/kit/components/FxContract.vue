<script setup lang="ts">
// An artifact handed between stations: a contract, a diff.
// Deliberately a different shape from FxStation: flat, wide, tinted.
withDefaults(defineProps<{
  label: string
  sub?: string // a short line under the label
  icon?: string
  tone?: 'green' | 'teal' | 'amber'
}>(), { icon: 'i-carbon-document', tone: 'green' })
</script>

<template>
  <div class="fx-contract" :class="`fx-contract-${tone}`">
    <div class="fx-contract-icon" :class="icon" />
    <div>
      <div class="fx-contract-label">{{ label }}</div>
      <div v-if="sub" class="fx-contract-sub">{{ sub }}</div>
    </div>
  </div>
</template>

<style scoped>
.fx-contract {
  --tone: var(--fx-green);
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.65rem 0.9rem;
  border: 2px solid var(--tone);
  border-radius: 12px;
  background: color-mix(in srgb, var(--tone) 11%, var(--fx-card));
  color: var(--tone);
}

.fx-contract-teal { --tone: var(--fx-teal); }
.fx-contract-amber { --tone: var(--fx-amber); }

.fx-contract-icon {
  flex: none;
  font-size: 1.5rem;
}

.fx-contract-label {
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.2;
  text-wrap: balance;
}

.fx-contract-sub {
  margin-top: 0.1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fx-text);
  opacity: 0.75;
  line-height: 1.2;
  text-wrap: balance;
}
</style>
