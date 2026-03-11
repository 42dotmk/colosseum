/**
 * Minimal JSON-RPC over WebSocket LSP client.
 * No external dependencies — talks the raw Language Server Protocol.
 */

type JsonRpcMessage =
  | { jsonrpc: '2.0'; id: number; method: string; params?: unknown }
  | { jsonrpc: '2.0'; id: number; result: unknown }
  | { jsonrpc: '2.0'; id: number; error: { code: number; message: string } }
  | { jsonrpc: '2.0'; method: string; params?: unknown };

type PendingRequest = { resolve: (v: unknown) => void; reject: (e: unknown) => void };

export type LspClientState = 'connecting' | 'ready' | 'closed' | 'error';

export class LspClient {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private notificationHandlers = new Map<string, Array<(params: unknown) => void>>();
  private queue: JsonRpcMessage[] = [];
  private _state: LspClientState = 'connecting';
  private _stateListeners: Array<(s: LspClientState) => void> = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      // Flush queued messages
      for (const msg of this.queue) this._send(msg);
      this.queue = [];
    };
    this.ws.onmessage = (e) => this.handleMessage(e.data as string);
    this.ws.onerror = () => this._setState('error');
    this.ws.onclose = () => {
      this._setState('closed');
      // Reject all pending requests
      for (const [, p] of this.pending) p.reject(new Error('Connection closed'));
      this.pending.clear();
    };
  }

  get state() { return this._state; }

  onStateChange(cb: (s: LspClientState) => void) {
    this._stateListeners.push(cb);
  }

  private _setState(s: LspClientState) {
    this._state = s;
    for (const cb of this._stateListeners) cb(s);
  }

  markReady() {
    this._setState('ready');
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      const msg: JsonRpcMessage = { jsonrpc: '2.0', id, method, params };
      if (this.ws.readyState === WebSocket.OPEN) {
        this._send(msg);
      } else {
        this.queue.push(msg);
      }
    });
  }

  notify(method: string, params?: unknown): void {
    const msg: JsonRpcMessage = { jsonrpc: '2.0', method, params };
    if (this.ws.readyState === WebSocket.OPEN) {
      this._send(msg);
    } else {
      this.queue.push(msg);
    }
  }

  onNotification(method: string, handler: (params: unknown) => void): void {
    const handlers = this.notificationHandlers.get(method) ?? [];
    handlers.push(handler);
    this.notificationHandlers.set(method, handlers);
  }

  dispose(): void {
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
  }

  private _send(msg: JsonRpcMessage): void {
    this.ws.send(JSON.stringify(msg));
  }

  private handleMessage(raw: string): void {
    let msg: JsonRpcMessage;
    try { msg = JSON.parse(raw); } catch { return; }

    if ('id' in msg && msg.id !== undefined) {
      // Response to a request we sent
      const pending = this.pending.get(msg.id as number);
      if (pending) {
        this.pending.delete(msg.id as number);
        if ('error' in msg) {
          pending.reject((msg as { error: unknown }).error);
        } else {
          pending.resolve((msg as { result: unknown }).result);
        }
      }
    } else if ('method' in msg) {
      // Server-initiated notification or request
      const handlers = this.notificationHandlers.get((msg as { method: string }).method) ?? [];
      for (const h of handlers) {
        try { h((msg as { params?: unknown }).params); } catch { /* ignore */ }
      }
    }
  }
}
