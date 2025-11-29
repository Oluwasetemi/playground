/**
 * Virtual scrolling utility for efficiently rendering large lists.
 * Only renders items that are visible in the viewport.
 * Based on TutorialKit's virtual scrolling pattern.
 */

export interface VirtualScrollConfig {
  itemHeight: number
  containerHeight: number
  overscan?: number // Number of items to render outside viewport for smooth scrolling
}

export interface VirtualScrollResult {
  visibleStartIndex: number
  visibleEndIndex: number
  totalHeight: number
  offsetY: number
}

/**
 * Calculate which items should be rendered based on scroll position
 */
export function calculateVisibleRange(
  scrollTop: number,
  totalItems: number,
  config: VirtualScrollConfig,
): VirtualScrollResult {
  const { itemHeight, containerHeight, overscan = 3 } = config

  // Calculate visible range
  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight)

  // Add overscan buffer for smooth scrolling
  const visibleStartIndex = Math.max(0, visibleStart - overscan)
  const visibleEndIndex = Math.min(totalItems, visibleEnd + overscan)

  // Calculate total height and offset
  const totalHeight = totalItems * itemHeight
  const offsetY = visibleStartIndex * itemHeight

  return {
    visibleStartIndex,
    visibleEndIndex,
    totalHeight,
    offsetY,
  }
}

/**
 * Virtual scroll manager for DOM elements
 */
export class VirtualScrollManager<T> {
  private config: VirtualScrollConfig
  private items: T[] = []
  private scrollTop: number = 0
  private container: HTMLElement | null = null
  private renderItem: (item: T, index: number) => HTMLElement

  constructor(
    config: VirtualScrollConfig,
    renderItem: (item: T, index: number) => HTMLElement,
  ) {
    this.config = config
    this.renderItem = renderItem
  }

  setItems(items: T[]): void {
    this.items = items
    this.render()
  }

  mount(container: HTMLElement): void {
    this.container = container

    // Set up scroll listener
    container.addEventListener('scroll', () => {
      this.scrollTop = container.scrollTop
      this.render()
    })

    this.render()
  }

  unmount(): void {
    this.container = null
  }

  private render(): void {
    if (!this.container)
      return

    const result = calculateVisibleRange(
      this.scrollTop,
      this.items.length,
      this.config,
    )

    // Clear container
    this.container.innerHTML = ''

    // Create spacer for total height
    const spacer = document.createElement('div')
    spacer.style.height = `${result.totalHeight}px`
    spacer.style.position = 'relative'
    this.container.appendChild(spacer)

    // Create visible items wrapper
    const wrapper = document.createElement('div')
    wrapper.style.position = 'absolute'
    wrapper.style.top = `${result.offsetY}px`
    wrapper.style.left = '0'
    wrapper.style.right = '0'

    // Render visible items
    for (let i = result.visibleStartIndex; i < result.visibleEndIndex; i++) {
      if (i < this.items.length) {
        const element = this.renderItem(this.items[i], i)
        wrapper.appendChild(element)
      }
    }

    spacer.appendChild(wrapper)
  }

  getVisibleRange(): { start: number, end: number } {
    const result = calculateVisibleRange(
      this.scrollTop,
      this.items.length,
      this.config,
    )
    return {
      start: result.visibleStartIndex,
      end: result.visibleEndIndex,
    }
  }
}
