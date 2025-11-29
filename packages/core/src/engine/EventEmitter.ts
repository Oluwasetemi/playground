type EventHandler<T = any> = (data: T) => void

export class EventEmitter<Events extends Record<string, EventHandler>> {
  private listeners: Map<keyof Events, Set<EventHandler>> = new Map()

  on<K extends keyof Events>(event: K, handler: Events[K]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    this.listeners.get(event)!.add(handler as EventHandler)

    return () => {
      this.off(event, handler)
    }
  }

  off<K extends keyof Events>(event: K, handler: Events[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler as EventHandler)
    }
  }

  emit<K extends keyof Events>(
    event: K,
    ...args: any[]
  ): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          (handler as any)(...args)
        }
        catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error)
        }
      })
    }
  }

  once<K extends keyof Events>(event: K, handler: Events[K]): void {
    const onceHandler = ((...args: any[]) => {
      (handler as any)(...args)
      this.off(event, onceHandler as Events[K])
    }) as Events[K]

    this.on(event, onceHandler)
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.listeners.delete(event)
    }
    else {
      this.listeners.clear()
    }
  }
}
