import { z } from 'zod';
import { documentId } from './document-id.js';

// Maintainer-curated recruitment context, never a placement result or an application deadline.
export const companyHiringSchema = z.object({
  status: z.enum(['none', 'ongoing', 'upcoming']),
  year: z.literal(2027),
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  updatedAt: z.number().int().nonnegative().optional(),
}).strict();
export type CompanyHiring = z.infer<typeof companyHiringSchema>;
export const updateCompanyHiringSchema = z.object({
  companyKey: documentId(100, true),
  status: z.enum(['none', 'ongoing', 'upcoming']),
  year: z.literal(2027),
  expectedVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1),
}).strict();

// Initial selection confirmed by the maintainer. Explicit stored "none" overrides it.
const initialCompanies = new Set(['magellan', 'godrej-capital', 'sharekhan-limited', 'wissen-technology']);
export function readCompanyHiring(key: string, value?: unknown): CompanyHiring {
  if (value !== undefined) {
    const parsed = companyHiringSchema.safeParse(value);
    return parsed.success ? parsed.data : { status: 'none', year: 2027, version: 0 };
  }
  return { status: initialCompanies.has(key) ? 'ongoing' : 'none', year: 2027, version: 0 };
}
