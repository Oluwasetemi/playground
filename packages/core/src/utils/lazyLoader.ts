/**
 * Lazy loader for deferring component initialization until needed.
 * Based on TutorialKit's lazy loading pattern for performance optimization.
 */

export interface LazyLoadable<T> {
  load: () => Promise<T>
  isLoaded: () => boolean
  getInstance: () => T | null
}

/**
 * Creates a lazy-loadable wrapper around a factory function.
 * The factory is only called once, on first load() invocation.
 */
export function createLazyLoader<T>(factory: () => Promise<T>): LazyLoadable<T> {
  let instance: T | null = null
  let loading: Promise<T> | null = null

  return {
    async load(): Promise<T> {
      // If already loaded, return cached instance
      if (instance !== null) {
        return instance
      }

      // If currently loading, wait for existing promise
      if (loading !== null) {
        return loading
      }

      // Start loading
      loading = factory()
        .then((result) => {
          instance = result
          loading = null
          return result
        })
        .catch((error) => {
          loading = null
          throw error
        })

      return loading
    },

    isLoaded(): boolean {
      return instance !== null
    },

    getInstance(): T | null {
      return instance
    },
  }
}

/**
 * Defers execution until the next idle period or timeout.
 * Uses requestIdleCallback if available, falls back to setTimeout.
 */
export function deferUntilIdle<T>(
  callback: () => T,
  timeout = 2000,
): Promise<T> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(
        () => {
          resolve(callback())
        },
        { timeout },
      )
    }
    else {
      setTimeout(() => {
        resolve(callback())
      }, 0)
    }
  })
}

/**
 * Lazy loads a module only when needed.
 * Useful for code-splitting heavy dependencies.
 */
export function createModuleLazyLoader<T>(
  importer: () => Promise<{ default: T }>,
): LazyLoadable<T> {
  return createLazyLoader(async () => {
    const module = await importer()
    return module.default
  })
}
