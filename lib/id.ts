/**
 * crypto.randomUUID() requires a secure context (HTTPS or localhost) and
 * throws/is undefined over plain HTTP on a remote host, so we can't rely on
 * it here. These IDs are only used as local React keys, not for security.
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
