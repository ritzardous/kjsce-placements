import { z } from 'zod';

export const notificationTypes = ['submitted', 'approved', 'changes_requested', 'rejected', 'unpublished', 'correction_requested', 'content_hidden', 'report_received', 'report_reviewed', 'question_reviewed', 'answer_reviewed', 'question', 'reply', 'company_update', 'experience_update', 'batch_update', 'legacy'] as const;
export const notificationSchema = z.object({
  id: z.string(), schemaVersion: z.literal(1).default(1), eventId: z.string().default(''),
  type: z.enum(notificationTypes).catch('legacy'), category: z.enum(['contributions', 'discussions', 'reports', 'following', 'statistics']).catch('contributions'),
  entityType: z.enum(['submission', 'post', 'report', 'question', 'batch']).catch('submission'), entityId: z.string().default(''),
  submissionId: z.string().default(''), revision: z.number().optional(), questionId: z.string().optional(), reportId: z.string().optional(),
  companyKey: z.string().optional(), companyName: z.string().optional(), experienceTitle: z.string().optional(),
  title: z.string().default('Activity update'), message: z.string().default(''), createdAt: z.number().finite().nonnegative().catch(0),
  read: z.boolean().default(false), readAt: z.number().nullable().default(null), archived: z.boolean().default(false),
  needsAction: z.boolean().default(false), currentStatus: z.string().optional(),
});
export type AppNotification = z.infer<typeof notificationSchema>;
const legacyTitles: Record<string, AppNotification['type']> = {
  'Submitted for review': 'submitted', 'Experience approved': 'approved', 'Changes requested': 'changes_requested', 'Submission rejected': 'rejected',
  'Experience unpublished': 'unpublished', 'Correction requested': 'correction_requested', 'Reported content hidden': 'content_hidden',
  'Report reviewed': 'report_reviewed', 'Discussion reviewed': 'question_reviewed', 'A reader has a question': 'question', 'Your question has a reply': 'reply',
};
export function notificationCategory(type: AppNotification['type']): AppNotification['category'] {
  if (['company_update', 'experience_update'].includes(type)) return 'following';
  if (type === 'batch_update') return 'statistics';
  if (['question_reviewed', 'answer_reviewed', 'question', 'reply'].includes(type)) return 'discussions';
  if (['report_received', 'report_reviewed'].includes(type)) return 'reports';
  return 'contributions';
}
/** Legacy links are never trusted as executable destinations. Unknown events remain readable. */
export function normalizeNotification(raw: Record<string, unknown>): AppNotification {
  const type = raw.type || legacyTitles[String(raw.title)] || 'legacy';
  return notificationSchema.parse({ ...raw, schemaVersion: 1, type, category: raw.category || notificationCategory(type as AppNotification['type']), entityId: raw.entityId || raw.submissionId || '' });
}
export function notificationAction(row: AppNotification): { href: string; label: string } | null {
  const entity = encodeURIComponent(row.entityId || row.submissionId);
  if (!entity) return null;
  if (row.category === 'discussions') return null; // Discussion creation has been retired.
  if (row.category === 'reports') return null; // Outcome is displayed privately in the inbox.
  if (row.type === 'batch_update') return /^202[5-7]$/.test(row.entityId) ? { href: `#${entity}/overview`, label: 'View batch statistics' } : null;
  if (['approved', 'company_update', 'experience_update'].includes(row.type)) return { href: `#procedures/${entity}`, label: 'Read approved experience' };
  if (row.type === 'legacy') return { href: '#procedures/contributions', label: 'View my contributions' };
  return { href: `#procedures/contribute?draft=${encodeURIComponent(row.submissionId || row.entityId)}`, label: row.needsAction ? 'Revise experience' : 'Review submission and feedback' };
}
export const notificationSettingsSchema = z.object({
  version: z.number().int().nonnegative().default(0),
  discovery: z.boolean().default(false),
  following: z.array(z.object({ kind: z.enum(['company', 'experience', 'batch']), key: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), label: z.string().trim().min(1).max(120), muted: z.boolean().default(false), since: z.number().nonnegative().default(0) }).strict()).max(20).default([]),
}).strict();
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
