/**
 * Lightweight backend-reachability tracker.
 *
 * The API interceptor calls `markOffline()` on network errors and
 * `markOnline()` on any successful response. React components can
 * subscribe via `useNetworkStatus()` to show/hide an offline banner.
 *
 * This is NOT a browser navigator.onLine check — it tracks whether
 * the *backend API* is responding, which is the actual concern for
 * our SPA.
 */

type Listener = () => void;

const _listeners = new Set<Listener>();
let _offline = false;

export function markOffline(): void {
  if (!_offline) {
    _offline = true;
    _listeners.forEach((fn) => fn());
  }
}

export function markOnline(): void {
  if (_offline) {
    _offline = false;
    _listeners.forEach((fn) => fn());
  }
}

export function isBackendOffline(): boolean {
  return _offline;
}

/**
 * Subscribe to offline/online transitions.
 * Returns an unsubscribe function.
 */
export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}
