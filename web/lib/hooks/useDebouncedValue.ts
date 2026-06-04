import { useState, useEffect } from "react";

/**
 * Returns a debounced version of the provided value.
 * The returned value only updates after the caller stops
 * changing `value` for `delay` ms.
 *
 * @param value - Raw value to debounce
 * @param delay - Milliseconds to wait (default 300)
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
