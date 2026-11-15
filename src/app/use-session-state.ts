import { useEffect, useState } from 'react';
import { safeStored, storeSession } from '../community/community-api';

/** Persist small view state (filters, cursors) for the current browser session. */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => safeStored<T>(key, initial));
  useEffect(() => { storeSession(key, value); }, [key, value]);
  return [value, setValue] as const;
}
