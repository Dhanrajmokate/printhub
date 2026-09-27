export type SSEEventHandler = (data: any) => void;

class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<SSEEventHandler>> = new Map();
  private reconnectTimeout: any = null;

  connect() {
    const token = sessionStorage.getItem('printhub_token');
    if (!token) {
      this.disconnect();
      return;
    }

    if (this.eventSource) {
      return; // already connected
    }

    try {
      const url = `/api/sse/stream?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('[SSE] Connected to real-time event stream');
      };

      // Register standard custom events
      const registeredEvents = ['order_created', 'order_status_update', 'new_order', 'queue_updated', 'connected'];
      for (const evt of registeredEvents) {
        this.eventSource.addEventListener(evt, (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            this.emit(evt, parsed);
          } catch (err) {
            console.error(`[SSE] Failed to parse event '${evt}':`, err);
          }
        });
      }

      this.eventSource.onerror = (err) => {
        console.warn('[SSE] Connection error. Reconnecting in 5s...', err);
        this.disconnect();
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
      };
    } catch (err) {
      console.error('[SSE] Failed to initialize EventSource:', err);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('[SSE] Disconnected');
    }
    clearTimeout(this.reconnectTimeout);
  }

  on(event: string, handler: SSEEventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  off(event: string, handler: SSEEventHandler) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        handler(data);
      }
    }
  }
}

export const sseClient = new SSEClient();
