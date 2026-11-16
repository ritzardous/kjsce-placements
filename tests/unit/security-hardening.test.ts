import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from '../../api/procedures.mjs';
import { createCompanySchema, initialProcedureDraft, procedureDraftSchema } from '../../shared/procedures';
import { notificationSettingsSchema } from '../../shared/notifications';
import { safeWritingLink } from '../../src/procedures/writing-links';
import { documentId } from '../../shared/document-id';

test('record identifiers validate every character without rewriting the target', () => {
  assert.equal(documentId().parse('record-123'), 'record-123');
  assert.equal(documentId(128, true).parse('record_123'), 'record_123');
  for (const value of ['record\n', 'record\r', 'record/path', 'record_123', 'record\u200b', 'é', 'a'.repeat(101), '']) {
    assert.equal(documentId().safeParse(value).success, false);
  }
});

const root = new URL('../../', import.meta.url);
test('the document shell keeps scripts external in /theme-init.js', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  assert.equal(/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), false);
  assert.match(html, /<script src="\/theme-init\.js"><\/script>/);
});

test('company names reject hidden bidi and zero-width characters but keep ordinary names', () => {
  assert.equal(createCompanySchema.safeParse({ name: 'Acme Labs' }).success, true);
  assert.equal(createCompanySchema.safeParse({ name: 'Larsen & Toubro' }).success, true);
  for (const name of ['Acme\u202eLabs', 'Acme\u200bLabs', 'Acme\u2066Labs', '<b>Acme</b>']) {
    assert.equal(createCompanySchema.safeParse({ name }).success, false, JSON.stringify(name));
  }
});

test('experience text and follow labels reject hidden control characters', () => {
  assert.equal(procedureDraftSchema.safeParse({ ...initialProcedureDraft(), body: 'Round one\u202e notes' }).success, false);
  assert.equal(procedureDraftSchema.safeParse({ ...initialProcedureDraft(), body: 'Round one notes' }).success, true);
  const settings = { version: 0, discovery: false, following: [{ kind: 'company', key: 'acme', label: 'Acme\u202e' }] };
  assert.equal(notificationSettingsSchema.safeParse(settings).success, false);
});

test('the API adapter rejects non-JSON requests before authentication', async () => {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: '',
    setHeader(key: string, value: string) { headers[key.toLowerCase()] = value; },
    end(body: string) { this.body = body; },
  };
  await handler(
    { method: 'POST', headers: { 'content-type': 'application/json-invalid' } } as unknown as IncomingMessage,
    res as unknown as ServerResponse,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.match(res.body, /application\/json/);
});

test('the API adapter rejects oversized declared content-length', async () => {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: '',
    setHeader(key: string, value: string) { headers[key.toLowerCase()] = value; },
    end(body: string) { this.body = body; },
  };
  await handler(
    { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '150000' } } as unknown as IncomingMessage,
    res as unknown as ServerResponse,
  );
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /Request too large/);
});

test('JSON media types allow charset parameters and still require authentication', async () => {
  for (const contentType of ['application/json', 'Application/JSON; charset=utf-8']) {
    const res = { statusCode: 0, body: '', setHeader() {}, end(body: string) { this.body = body; } };
    await handler(
      { method: 'POST', headers: { 'content-type': contentType } } as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    assert.equal(res.statusCode, 401);
    assert.match(res.body, /unauthenticated/);
  }
});

test('safeWritingLink permits only safe web/email protocols and drops javascript/data/malformed links', () => {
  assert.equal(safeWritingLink('https://example.com/path?q=1'), 'https://example.com/path?q=1');
  assert.equal(safeWritingLink('http://kjsce.somaiya.edu'), 'http://kjsce.somaiya.edu/');
  assert.equal(safeWritingLink('mailto:student@somaiya.edu'), 'mailto:student@somaiya.edu');
  assert.equal(safeWritingLink('javascript:alert(1)'), null);
  assert.equal(safeWritingLink('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeWritingLink('vbscript:msgbox(1)'), null);
  assert.equal(safeWritingLink('https://user:pass@evil.com'), null);
  assert.equal(safeWritingLink('https://example.com\u0000/null'), null);
});

test('input fields reject HTML tags and hidden characters in role, customName, title and summary', () => {
  const base = initialProcedureDraft();
  assert.equal(procedureDraftSchema.safeParse({ ...base, role: 'Software Engineer' }).success, true);
  assert.equal(procedureDraftSchema.safeParse({ ...base, role: '<script>alert(1)</script>' }).success, false);
  assert.equal(procedureDraftSchema.safeParse({ ...base, role: 'Software\u202eEngineer' }).success, false);
  assert.equal(procedureDraftSchema.safeParse({ ...base, customName: 'Test Student' }).success, true);
  assert.equal(procedureDraftSchema.safeParse({ ...base, customName: '<b>Admin</b>' }).success, false);
  assert.equal(procedureDraftSchema.safeParse({ ...base, customName: 'Test\u200bStudent' }).success, false);
  assert.equal(procedureDraftSchema.safeParse({ ...base, title: '<img src=x onerror=1>' }).success, false);
  assert.equal(procedureDraftSchema.safeParse({ ...base, summary: '<p>malicious</p>' }).success, false);
  assert.equal(procedureDraftSchema.safeParse({ ...base, summary: 'Required CPI > 7.5 and CTC < 20 LPA' }).success, true);
});
