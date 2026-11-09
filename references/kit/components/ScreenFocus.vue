<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSlideContext } from '@slidev/client'
import { assetUrl } from '../utils/assetUrl'

// A screenshot that steps through the parts that matter. On each click the camera pans and
// zooms to one region (so a tall capture still fills a 16:9 slide), the region stays sharp and
// the rest of the screenshot blurs and dims. Click 0 shows the whole screenshot, unless
// `autoFocus` is set: then it opens on the first region.
// `crop` shows only part of the screenshot; with one thing to say, crop instead of focusing.
// Regions and crop are [x, y, w, h] as fractions of the full image.
// Use on `layout: full` + `class: photo-slide bg-*` (see references/image-placeholders.md).
type Rect = [number, number, number, number]
const props = withDefaults(
  defineProps<{
    src: string
    focus?: Rect[]
    crop?: Rect
    autoFocus?: boolean
    maxZoom?: number // cap on canvas px per image px, so small captures don't turn to mush
    pad?: number // gap around the stage, in canvas px
  }>(),
  { focus: () => [], crop: () => [0, 0, 1, 1], autoFocus: false, maxZoom: 1.5, pad: 22 },
)

const { $slidev, $clicks } = useSlideContext()
const W = $slidev.configs.canvasWidth
const H = W / $slidev.configs.aspectRatio
const SW = W - props.pad * 2
const SH = H - props.pad * 2

// the math needs the natural size before layout, so read it from a detached Image
const url = assetUrl(props.src)
const natural = ref<{ w: number; h: number } | null>(null)
onMounted(() => {
  const img = new Image()
  img.onload = () => {
    natural.value = { w: img.naturalWidth, h: img.naturalHeight }
  }
  img.src = url
})

// the world is the cropped screenshot scaled to fit the stage; the camera transforms it
const cropPx = computed(() => {
  const n = natural.value ?? { w: SW, h: SH }
  const [x, y, w, h] = props.crop
  return { x: x * n.w, y: y * n.h, w: w * n.w, h: h * n.h, nw: n.w, nh: n.h }
})
// the base fit is capped by maxZoom too, so tiny crops don't get blown up
const base = computed(() => (natural.value ? Math.min(SW / cropPx.value.w, SH / cropPx.value.h, props.maxZoom) : 1))
const world = computed(() => ({ w: cropPx.value.w * base.value, h: cropPx.value.h * base.value }))
// the full image, placed so the crop sits at the world origin
const image = computed(() => ({
  left: -cropPx.value.x * base.value,
  top: -cropPx.value.y * base.value,
  w: cropPx.value.nw * base.value,
  h: cropPx.value.nh * base.value,
}))

// one hidden v-click per region after the first (all of them without autoFocus); $clicks drives the camera
const clickCount = computed(() => Math.max(0, props.focus.length - (props.autoFocus ? 1 : 0)))
const active = computed<Rect | null>(() => {
  const i = props.autoFocus ? $clicks.value : $clicks.value - 1
  return props.focus[Math.min(i, props.focus.length - 1)] ?? null
})

// world-px rect of the active region
const region = computed(() => {
  const a = active.value
  if (!a) {
    return null
  }
  const i = image.value
  return { x: a[0] * i.w + i.left, y: a[1] * i.h + i.top, w: a[2] * i.w, h: a[3] * i.h }
})

function axis(stage: number, size: number, k: number, center: number) {
  const scaled = size * k
  if (scaled <= stage) {
    return (stage - scaled) / 2
  }
  return Math.min(0, Math.max(stage - scaled, stage / 2 - center * k))
}

const camera = computed(() => {
  const r = region.value
  let k = 1
  let cx = world.value.w / 2
  let cy = world.value.h / 2
  if (r) {
    const margin = 1.16
    k = Math.min(SW / (r.w * margin), SH / (r.h * margin), props.maxZoom / base.value)
    k = Math.max(1, k)
    cx = r.x + r.w / 2
    cy = r.y + r.h / 2
  }
  const tx = axis(SW, world.value.w, k, cx)
  const ty = axis(SH, world.value.h, k, cy)
  return { transform: `translate(${tx}px, ${ty}px) scale(${k})` }
})

const placed = computed(() => ({
  left: `${image.value.left}px`,
  top: `${image.value.top}px`,
  width: `${image.value.w}px`,
  height: `${image.value.h}px`,
}))

const sharp = computed(() => {
  const r = region.value
  if (!r) {
    return { clipPath: 'inset(0 round 0px)' }
  }
  const i = image.value
  const top = r.y - i.top
  const left = r.x - i.left
  const right = i.w - left - r.w
  const bottom = i.h - top - r.h
  return { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 8px)` }
})

const outline = computed(() => {
  const r = region.value
  if (!r) {
    return { opacity: 0 }
  }
  return { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, opacity: 1 }
})
</script>

<template>
  <div class="screen-focus" :style="{ inset: `${pad}px` }">
    <div class="screen-focus-world" :style="{ width: `${world.w}px`, height: `${world.h}px`, ...camera }">
      <img :src="url" alt="" class="screen-focus-img" :class="{ 'is-dimmed': region }" :style="placed" />
      <img :src="url" alt="" class="screen-focus-img screen-focus-sharp" :style="{ ...placed, ...sharp }" />
      <div class="screen-focus-outline" :style="outline" />
    </div>
    <span v-for="i in clickCount" :key="i" v-click="i" class="screen-focus-click" />
  </div>
</template>

<style scoped>
.screen-focus {
  position: absolute;
  overflow: hidden;
  border-radius: 14px;
}

/* overflow: hidden so a crop doesn't leak the rest of the image when zoomed */
.screen-focus-world {
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
  transform-origin: 0 0;
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

/* max-width: none, since the UnoCSS preflight's img { max-width: 100% } breaks the zoom math */
.screen-focus-img {
  position: absolute;
  max-width: none;
  transition:
    filter 0.5s ease,
    clip-path 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.screen-focus-img.is-dimmed {
  filter: blur(3px) brightness(0.35) saturate(0.6);
}

.screen-focus-outline {
  position: absolute;
  border: 2px solid var(--fx-teal, #4dd0e1);
  border-radius: 8px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--fx-teal, #4dd0e1) 25%, transparent);
  pointer-events: none;
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.screen-focus-click {
  display: none;
}
</style>
