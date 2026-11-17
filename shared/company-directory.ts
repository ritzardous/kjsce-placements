import { z } from 'zod';
import { companyProfileSchema, readCompanyProfile } from './company-profile.js';
import { companyHiringSchema } from './company-hiring.js';
import { mergeCompanyDirectory } from './company-identity.js';

export const companyDirectoryPath = 'companyDirectory/current';
const entrySchema = z.object({
  key: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), name: z.string().min(1).max(300),
  years: z.array(z.number().int().min(2000).max(2100)).max(101),
  profile: companyProfileSchema.optional(), hiring: companyHiringSchema.optional(),
}).strict();
export const companyDirectorySchema = z.object({
  schemaVersion: z.literal(1), updatedAt: z.number().int().nonnegative(),
  companies: z.array(entrySchema).max(2000),
}).strict();

/** Explicit public-within-auth projection: never serialize creation/owner metadata. */
export function directoryEntry(key: string, value: Record<string, unknown>) {
  if (value.aliasOf) return undefined;
  const profile = readCompanyProfile(value.profile), hiring = companyHiringSchema.safeParse(value.hiring);
  return entrySchema.parse({ key, name: value.name, years: value.years ?? [],
    ...(profile ? { profile } : {}), ...(hiring.success ? { hiring: hiring.data } : {}),
  });
}
export function directoryPublication(companies: z.infer<typeof entrySchema>[], updatedAt = Date.now()) {
  const merged=mergeCompanyDirectory(companies).map(row=>{
    const {hiring,...base}=row;
    const canonical=companies.find(company=>company.key===row.key);
    return canonical?.hiring ? {...base,hiring:canonical.hiring} : base;
  });
  const value = companyDirectorySchema.parse({ schemaVersion: 1, updatedAt, companies: merged });
  if (new TextEncoder().encode(JSON.stringify(value)).length > 750000) throw new Error('Company directory capacity reached; maintainer review required.');
  return value;
}
