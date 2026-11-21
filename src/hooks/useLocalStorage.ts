import { useCallback, useState } from 'react';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCompatibleStoredValue<T>(parsed: unknown, initialValue: T): parsed is T {
  if (initialValue === null || initialValue === undefined) {
    return parsed !== undefined;
  }

  if (parsed === null || parsed === undefined) {
    return false;
  }

  if (Array.isArray(initialValue)) {
    return Array.isArray(parsed);
  }

  if (isPlainObject(initialValue)) {
    if (!isPlainObject(parsed)) {
      return false;
    }

    const expectedKeys = Object.keys(initialValue);
    if (expectedKeys.length > 0 && Object.keys(parsed).length === 0) {
      return false;
    }

    for (const key of expectedKeys) {
      const expectedVal = initialValue[key];
      const actualVal = parsed[key];
      if (actualVal === undefined || expectedVal === undefined || expectedVal === null) {
        continue;
      }
      if (Array.isArray(expectedVal) !== Array.isArray(actualVal)) {
        return false;
      }
      if (typeof actualVal !== typeof expectedVal) {
        return false;
      }
    }

    return true;
  }

  if (typeof initialValue === 'number') {
    return typeof parsed === 'number' && Number.isFinite(parsed);
  }

  return typeof parsed === typeof initialValue;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      const parsed: unknown = JSON.parse(item);
      return isCompatibleStoredValue(parsed, initialValue) ? parsed : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage quota or private browsing restriction — keep in-memory state working
        }
        return next;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
