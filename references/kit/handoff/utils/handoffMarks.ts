import { useStorage } from '@vueuse/core'

// In localStorage, so toggling in the presenter window also toggles the audience window
export const showHandoffMarks = useStorage('handoff-marks', true)
