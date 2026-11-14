import { z } from 'zod';

// Trusted catalog context, separate from batch placement announcements and metrics.
export const companyProfileSchema=z.object({
  roles:z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  ctcMinLpa:z.number().nonnegative().max(10000),
  ctcMaxLpa:z.number().nonnegative().max(10000),
  currency:z.literal('INR'),period:z.literal('year'),source:z.literal('maintainer'),
  logoPath:z.string().regex(/^\/company-logos\/[a-z0-9-]+\.(png|jpg|webp|svg|ico)$/),
  website:z.url().refine(value=>/^https:\/\//i.test(value),'Use an HTTPS company website.'),
}).strict().refine(value=>value.ctcMinLpa<=value.ctcMaxLpa,'CTC range must be ordered.');
export type CompanyProfile=z.infer<typeof companyProfileSchema>;
export function readCompanyProfile(value:unknown):CompanyProfile|undefined {
  const parsed=companyProfileSchema.safeParse(value);
  return parsed.success?parsed.data:undefined;
}
export function companyProfileCtc(profile:CompanyProfile) {
  const min=profile.ctcMinLpa.toLocaleString('en-IN',{maximumFractionDigits:2});
  const max=profile.ctcMaxLpa.toLocaleString('en-IN',{maximumFractionDigits:2});
  return `₹${min}${min===max?'':'–'+max} LPA`;
}
