import { useCallback, useEffect, useRef, useState } from 'react';

interface ToastRecord {
  id: number;
  message: string;
}

export interface UseToastResult {
  toastMessage: string | null;
  showToast: (message: string) => void;
  dismissToast: () => void;
}

export function useToast(durationMs = 3500): UseToastResult {
  const [toast, setToast] = useState<ToastRecord | null>(null);
  const nextIdRef = useRef(0);

  const showToast = useCallback((message: string) => {
    nextIdRef.current += 1;
    setToast({ id: nextIdRef.current, message });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), durationMs);
    return () => clearTimeout(timer);
  }, [toast, durationMs]);

  return {
    toastMessage: toast?.message ?? null,
    showToast,
    dismissToast,
  };
}
