/** Firestore uses numeric gRPC codes; never forward raw backend messages. */
export function isDatabaseQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  return [8, '8', 'resource-exhausted', 'firestore/resource-exhausted'].includes(error.code as string | number);
}
