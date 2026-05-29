import { useEffect, useState } from 'react'

/**
 * Hook to detect if a media query matches
 * @param query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined')
      return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined')
      return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

/**
 * Hook to detect if the screen is mobile-sized
 * @param breakpoint - Max width in pixels for mobile (default: 768)
 * @returns boolean indicating if screen is mobile-sized
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  return useMediaQuery(`(max-width: ${breakpoint}px)`)
}
