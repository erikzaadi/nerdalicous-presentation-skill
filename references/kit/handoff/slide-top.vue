<script setup lang="ts">
// Handoff corner marks for co-presented talks: a tiny square in each top corner,
// left = who speaks now, right = who speaks next. Read from the speaker notes, so the
// notes stay the only place to edit:
// - `Handoff (Erik → Mor): "..."` names who speaks on the slide and who opens the next one.
// - On slides where the speaker changes at a [click], the marks follow the speaker turns
//   click by click, and the Handoff line (if any) names who's next after the last turn.
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

// Where a line starts, in raw notes or in noteHTML; a click marker may sit before the name.
const LINE_START = String.raw`(?<=^|\n|<p>|<li>|<br\s*\/?>|\[click(?::\d+)?\]|data-clicks="\d+"><\/span>)[ \t]*`
const NAME = String.raw`(\p{L}[\p{L}\d _.'-]*?)\s*:`
const SPEAKER_FORMS = [
  // a standalone [Name] presenter-tag line (or [click], when indented)
  String.raw`(?<=^|\n|<p>|<li>|<br\s*\/?>)[ \t]*(?:-[ \t]*)?\[([^\]<\n]+)\][ \t]*(?=$|\n|<\/p>|<\/li>|<br)`,
  // Name: at the start of a line
  LINE_START + NAME,
  // <b>Name:</b>, <strong>Name:</strong>, **Name:**
  String.raw`<(?:b|strong)>\s*${NAME}\s*<\/(?:b|strong)>`,
  String.raw`\*\*\s*${NAME}\s*\*\*`,
].join('|')
// Raw notes: Slidev's own click marker, where N adds N clicks.
const RAW_TOKENS = new RegExp(String.raw`${SPEAKER_FORMS}|\[click(?::(\d+))?\]`, 'gimu')
// noteHTML: Slidev swaps each marker for a span carrying the running total.
const HTML_TOKENS = new RegExp(String.raw`${SPEAKER_FORMS}|data-clicks="(\d+)"`, 'gimu')
// Same rules as presenterTag() in scripts/generate-speaker-notes-audio.mjs
const CLICK_TAG = /^click(?::(\d+))?$/iu
const STAGE_CUE =
  /^(?:click(?::\s*\d+)?|beat(?:\s*[—-]\s*[\d.]+\s*seconds?)?|beat,\s*click|click(?:,\s*click)+|small laugh|opening|pacing target:.*)$/iu

interface Turn {
  at: number // clicks before this turn starts
  who: string
}

// Speaker turns in note order. Parse one source only, or every click counts twice.
function speakerTurns(note: string, noteHTML: string): Turn[] {
  const raw = note.trim() !== ''
  const turns: Turn[] = []
  let at = 0
  for (const m of (raw ? note : noteHTML).matchAll(raw ? RAW_TOKENS : HTML_TOKENS)) {
    const [, tag, lineName, htmlBold, mdBold, clicks] = m
    const who = tag ?? lineName ?? htmlBold ?? mdBold
    if (who === undefined) {
      // a click marker
      at = raw ? at + Number(clicks ?? 1) : Number(clicks)
      continue
    }
    if (tag !== undefined) {
      // an indented [click] line lands here rather than on the click marker
      const click = raw ? tag.match(CLICK_TAG) : null
      if (click) {
        at += Number(click[1] ?? 1)
        continue
      }
      // [Erik + Dana] is not one speaker
      if (STAGE_CUE.test(tag.trim()) || tag.includes('+')) {
        continue
      }
    }
    const key = who.trim().toLowerCase()
    // Only presenters with a colour count, so a stray "Note:" or "Punchline:" is no speaker
    if (key in colors) {
      turns.push({ at, who: key })
    }
  }
  return turns
}

const { $route, $clicks } = useSlideContext()
const handoff = computed(() => {
  const slide = $route?.meta?.slide as { note?: string; noteHTML?: string } | undefined
  const note = slide?.note ?? ''
  const noteHTML = slide?.noteHTML ?? ''
  const match = `${note} ${noteHTML}`.match(HANDOFF)
  const turns = speakerTurns(note, noteHTML)

  // Follow the turns only when they start at two or more click counts; a slide where
  // everyone speaks before the first click keeps the Handoff line.
  if (new Set(turns.map((turn) => turn.at)).size > 1) {
    const clicks = $clicks.value
    const started = turns.filter((turn) => turn.at <= clicks)
    const nowAt = started.length ? started[started.length - 1].at : turns[0].at
    const now = turns.find((turn) => turn.at === nowAt)!.who
    const next = turns.find((turn) => turn.at > clicks && turn.who !== now)?.who ?? match?.[2].toLowerCase() ?? now
    return { now: colors[now], next: colors[next] }
  }

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
