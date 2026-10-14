<script setup>
defineProps({
  label: { type: String, default: 'Pro tip' }
})
</script>

<template>
  <div class="field-note">
    <div class="field-note-label">🔧 {{ label }}</div>
    <div class="field-note-body"><slot /></div>
  </div>
</template>

<style scoped>
.field-note {
  /* only as wide as its text, so it never reads as a full-width banner */
  width: max-content;
  max-width: 100%;
  margin-top: 1rem;
  padding: 0.75rem 1.75rem 0.75rem 1.25rem;
  border-left: 4px solid var(--fx-amber, #ffab40);
  border-radius: 0 12px 12px 0;
  background: color-mix(in srgb, var(--fx-amber, #ffab40) 8%, transparent);
}

.field-note-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fx-amber, #ffab40);
  margin-bottom: 0.25rem;
}

.field-note-body {
  font-size: 1rem;
  font-weight: 500;
}
</style>
