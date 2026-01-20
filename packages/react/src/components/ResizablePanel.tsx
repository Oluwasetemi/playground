import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useIsMobile } from '../hooks/useMediaQuery'

export interface ResizablePanelProps {
  /** Left or top panel content */
  firstPanel: ReactNode
  /** Right or bottom panel content */
  secondPanel: ReactNode
  /** Direction of the split */
  direction?: 'horizontal' | 'vertical'
  /** Enable responsive behavior - switches to vertical on mobile */
  responsive?: boolean
  /** Breakpoint for responsive switch in pixels (default: 768) */
  responsiveBreakpoint?: number
  /** Initial size of the first panel as a percentage (0-100) */
  initialSize?: number
  /** Initial size for mobile/vertical layout (default: 40) */
  mobileInitialSize?: number
  /** Minimum size of the first panel as a percentage */
  minSize?: number
  /** Maximum size of the first panel as a percentage */
  maxSize?: number
  /** Storage key for persisting the panel size */
  storageKey?: string
  /** Class name for the container */
  className?: string
  /** Class name for the first panel */
  firstPanelClassName?: string
  /** Class name for the second panel */
  secondPanelClassName?: string
  /** Class name for the resizer handle */
  resizerClassName?: string
  /** Callback when resize starts */
  onResizeStart?: () => void
  /** Callback during resize with current size percentage */
  onResize?: (size: number) => void
  /** Callback when resize ends with final size percentage */
  onResizeEnd?: (size: number) => void
}

export function ResizablePanel({
  firstPanel,
  secondPanel,
  direction = 'horizontal',
  responsive = false,
  responsiveBreakpoint = 768,
  initialSize = 50,
  mobileInitialSize = 40,
  minSize = 10,
  maxSize = 90,
  storageKey,
  className = '',
  firstPanelClassName = '',
  secondPanelClassName = '',
  resizerClassName = '',
  onResizeStart,
  onResize,
  onResizeEnd,
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile(responsiveBreakpoint)

  // Determine effective direction based on responsive prop
  const effectiveDirection = responsive && isMobile ? 'vertical' : direction
  const isHorizontal = effectiveDirection === 'horizontal'

  // Use different storage keys for mobile vs desktop to preserve both sizes
  const effectiveStorageKey = storageKey
    ? `${storageKey}${responsive && isMobile ? '-mobile' : ''}`
    : undefined

  const [size, setSize] = useState<number>(() => {
    if (effectiveStorageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(effectiveStorageKey)
      if (stored) {
        const parsed = parseFloat(stored)
        if (!isNaN(parsed) && parsed >= minSize && parsed <= maxSize) {
          return parsed
        }
      }
    }
    return responsive && isMobile ? mobileInitialSize : initialSize
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ position: number; size: number } | null>(null)

  // Update size when switching between mobile and desktop
  useEffect(() => {
    if (!responsive) return

    // Load the appropriate size for the current mode
    if (effectiveStorageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(effectiveStorageKey)
      if (stored) {
        const parsed = parseFloat(stored)
        if (!isNaN(parsed) && parsed >= minSize && parsed <= maxSize) {
          setSize(parsed)
          return
        }
      }
    }
    // Fall back to default sizes
    setSize(isMobile ? mobileInitialSize : initialSize)
  }, [isMobile, responsive, effectiveStorageKey, minSize, maxSize, mobileInitialSize, initialSize])

  const clampSize = useCallback(
    (value: number) => Math.min(maxSize, Math.max(minSize, value)),
    [minSize, maxSize]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = {
        position: isHorizontal ? e.clientX : e.clientY,
        size,
      }
      onResizeStart?.()
    },
    [isHorizontal, size, onResizeStart]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      setIsDragging(true)
      dragStartRef.current = {
        position: isHorizontal ? touch.clientX : touch.clientY,
        size,
      }
      onResizeStart?.()
    },
    [isHorizontal, size, onResizeStart]
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragStartRef.current) return

      const container = containerRef.current.getBoundingClientRect()
      const containerSize = isHorizontal ? container.width : container.height
      const currentPosition = isHorizontal ? e.clientX : e.clientY
      const startPosition = dragStartRef.current.position
      const delta = currentPosition - startPosition
      const deltaPercent = (delta / containerSize) * 100
      const newSize = clampSize(dragStartRef.current.size + deltaPercent)

      setSize(newSize)
      onResize?.(newSize)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !dragStartRef.current) return

      const touch = e.touches[0]
      const container = containerRef.current.getBoundingClientRect()
      const containerSize = isHorizontal ? container.width : container.height
      const currentPosition = isHorizontal ? touch.clientX : touch.clientY
      const startPosition = dragStartRef.current.position
      const delta = currentPosition - startPosition
      const deltaPercent = (delta / containerSize) * 100
      const newSize = clampSize(dragStartRef.current.size + deltaPercent)

      setSize(newSize)
      onResize?.(newSize)
    }

    const handleEnd = () => {
      setIsDragging(false)
      dragStartRef.current = null

      if (effectiveStorageKey) {
        localStorage.setItem(effectiveStorageKey, size.toString())
      }
      onResizeEnd?.(size)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, isHorizontal, clampSize, size, effectiveStorageKey, onResize, onResizeEnd])

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  }

  const firstPanelStyle: CSSProperties = {
    [isHorizontal ? 'width' : 'height']: `${size}%`,
    flexShrink: 0,
    overflow: 'hidden',
  }

  const secondPanelStyle: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
  }

  const resizerStyle: CSSProperties = {
    [isHorizontal ? 'width' : 'height']: '8px',
    [isHorizontal ? 'cursor' : 'cursor']: isHorizontal ? 'col-resize' : 'row-resize',
    background: 'transparent',
    position: 'relative',
    flexShrink: 0,
    zIndex: 10,
  }

  return (
    <div
      ref={containerRef}
      className={`resizable-panel ${className}`}
      style={containerStyle}
      data-direction={effectiveDirection}
      data-dragging={isDragging}
    >
      <div
        className={`resizable-panel-first ${firstPanelClassName}`}
        style={firstPanelStyle}
      >
        {firstPanel}
      </div>
      <div
        className={`resizable-panel-resizer ${resizerClassName}`}
        style={resizerStyle}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="separator"
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(size)}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        tabIndex={0}
      >
        <div className="resizable-panel-resizer-line" />
      </div>
      <div
        className={`resizable-panel-second ${secondPanelClassName}`}
        style={secondPanelStyle}
      >
        {secondPanel}
      </div>
    </div>
  )
}
