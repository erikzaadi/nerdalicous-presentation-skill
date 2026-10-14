import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

export interface Box {
  l: number
  r: number
  t: number
  b: number
  cx: number
  cy: number
  w: number
  h: number
}

/**
 * Measures named elements relative to a root element, so SVG wires can be
 * drawn in the root's pixel space and stay aligned with the cards.
 * Uses layout offsets, which ignore Slidev's slide scaling transform.
 *
 *   const { root, reg, boxes, size } = useBoxes()
 *   <div ref="root"> <FxStation :ref="reg('plan')" /> </div>
 */
export function useBoxes() {
  const root = ref<HTMLElement>()
  const els = new Map<string, HTMLElement>()
  const boxes = ref<Record<string, Box>>({})
  const size = ref({ w: 0, h: 0 })

  function reg(name: string) {
    return (el: any) => {
      const node = el?.$el ?? el
      if (node instanceof HTMLElement)
        els.set(name, node)
    }
  }

  function offsetWithin(node: HTMLElement, base: HTMLElement) {
    let x = 0
    let y = 0
    let cur: HTMLElement | null = node
    while (cur && cur !== base) {
      x += cur.offsetLeft
      y += cur.offsetTop
      cur = cur.offsetParent as HTMLElement | null
    }
    return { x, y }
  }

  function measure() {
    const base = root.value
    if (!base)
      return
    size.value = { w: base.offsetWidth, h: base.offsetHeight }
    const next: Record<string, Box> = {}
    for (const [name, node] of els) {
      const { x, y } = offsetWithin(node, base)
      const w = node.offsetWidth
      const h = node.offsetHeight
      next[name] = { l: x, r: x + w, t: y, b: y + h, cx: x + w / 2, cy: y + h / 2, w, h }
    }
    boxes.value = next
  }

  let observer: ResizeObserver | undefined
  onMounted(async () => {
    await nextTick()
    measure()
    observer = new ResizeObserver(measure)
    if (root.value)
      observer.observe(root.value)
    els.forEach(node => observer!.observe(node))
    document.fonts?.ready.then(measure)
  })
  onBeforeUnmount(() => observer?.disconnect())

  return { root, reg, boxes, size }
}

type Point = [number, number]

/** An orthogonal path through the given points, with rounded corners. */
export function wire(points: Point[], radius = 14): string {
  if (points.length < 2)
    return ''
  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]
    const next = points[i + 1]
    if (!next) {
      d += ` L ${x} ${y}`
      break
    }
    const [px, py] = points[i - 1]
    const inLen = Math.hypot(x - px, y - py)
    const outLen = Math.hypot(next[0] - x, next[1] - y)
    const r = Math.min(radius, inLen / 2, outLen / 2)
    const ax = x - Math.sign(x - px) * r
    const ay = y - Math.sign(y - py) * r
    const bx = x + Math.sign(next[0] - x) * r
    const by = y + Math.sign(next[1] - y) * r
    d += ` L ${ax} ${ay} Q ${x} ${y} ${bx} ${by}`
  }
  return d
}

/** A connector drawn by FxWires. */
export interface Wire {
  d: string
  tone?: 'line' | 'teal' | 'green' | 'amber' | 'orange' | 'red' | 'purple'
  step?: number
  ghost?: boolean // default true
  width?: number
  arrow?: boolean // default true
}
