import type { User } from 'firebase/auth';
import { callProcedure } from './procedures-api';

const sessions = new Map<string, Promise<unknown>>();
export function syncGoogleProfile(user: User) {
  const key = `${user.uid}:${user.metadata.lastSignInTime}`;
  const existing = sessions.get(key);
  if (existing) return existing;
  const request = callProcedure('procedureCommunity', {action:'syncAccount',payload:{}});
  sessions.set(key, request);
  while (sessions.size > 10) sessions.delete(sessions.keys().next().value!);
  void request.catch(() => { if (sessions.get(key) === request) sessions.delete(key); });
  return request;
}
