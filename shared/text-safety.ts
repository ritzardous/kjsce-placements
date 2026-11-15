// C0 controls (except tab, newline and carriage return) plus bidi overrides can
// hide or reorder visible text in feeds, audit logs and notification labels.
export const hiddenTextPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/;
// Identities also reject zero-width and direction marks that create lookalike
// company names. The zero-width joiner stays allowed so emoji sequences work.
export const hiddenIdentityPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\u200c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
export const hiddenTextMessage = 'Remove hidden control characters.';
export function hasHiddenText(value: string) { return hiddenTextPattern.test(value); }
export function hasHiddenIdentityText(value: string) { return hiddenIdentityPattern.test(value); }
