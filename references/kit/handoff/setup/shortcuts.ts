import type { NavOperations, ShortcutOptions } from '@slidev/types'
import { defineShortcutsSetup } from '@slidev/types'
import { showHandoffMarks } from '../utils/handoffMarks'

// `h` isn't one of Slidev's built-in shortcuts (checked on Slidev 53)
export default defineShortcutsSetup((_nav: NavOperations, base: ShortcutOptions[]) => [
  ...base,
  {
    name: 'toggle_handoff_marks',
    key: 'h',
    fn: () => {
      showHandoffMarks.value = !showHandoffMarks.value
    },
  },
])
