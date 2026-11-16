import { z } from 'zod';

/** Validate every character; never normalise an identifier into a different record. */
export function documentId(maximum=100, underscores=false) {
  const invalid = underscores ? /[^a-zA-Z0-9_-]/ : /[^a-zA-Z0-9-]/;
  return z.string().min(1).max(maximum).refine(value=>!invalid.test(value),'Use a valid record identifier.');
}
