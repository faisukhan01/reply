/**
 * Realtime socket helper with graceful fallback.
 *
 * In the sandbox dev environment, a Socket.io mini-service runs on port 3001
 * and the Caddy gateway routes to it via `?XTransformPort=3001`.
 *
 * On Vercel (or any deployment without the mini-service), there is no socket
 * server. Rather than spamming reconnection attempts and console errors, we
 * detect availability via an opt-in env var and return a no-op stub so the
 * rest of the app (which already has a 10s polling fallback) keeps working.
 */
import { io, type Socket } from "socket.io-client";

let socketSingleton: Socket | null = null;
let initFailed = false;

/**
 * Whether realtime socket support is enabled.
 * Set NEXT_PUBLIC_REALTIME_ENABLED=1 in the env to enable.
 * Defaults to enabled in non-production for the sandbox workflow.
 */
export function isRealtimeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const flag = process.env.NEXT_PUBLIC_REALTIME_ENABLED;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  // Auto-enable in development unless explicitly disabled.
  return process.env.NODE_ENV !== "production";
}

/**
 * Get the shared socket instance, or null if realtime is unavailable.
 * Never throws — all errors are swallowed and the app falls back to polling.
 */
export function getRealtimeSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (initFailed) return null;
  if (!isRealtimeEnabled()) return null;

  if (socketSingleton) return socketSingleton;

  try {
    socketSingleton = io("/?XTransformPort=3001", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 8000,
      autoConnect: false,
    });

    // Silence connection errors so they don't pollute the console on Vercel.
    socketSingleton.on("connect_error", () => {
      // Mark as failed after first error so we stop using it.
      initFailed = true;
    });
    socketSingleton.on("connect_timeout", () => {
      initFailed = true;
    });
  } catch {
    initFailed = true;
    return null;
  }

  return socketSingleton;
}

/**
 * Connect the socket if available. Safe to call multiple times.
 */
export function connectRealtime(): Socket | null {
  const socket = getRealtimeSocket();
  if (!socket) return null;
  if (!socket.connected) {
    try {
      socket.connect();
    } catch {
      return null;
    }
  }
  return socket;
}
