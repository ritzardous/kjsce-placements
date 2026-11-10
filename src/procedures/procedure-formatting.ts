export type WritingFormat = 'bold' | 'italic' | 'heading' | 'list' | 'code' | 'quote' | 'link';
type Selection = { body: string; start: number; end: number };
type Edit = { from: number; to: number; text: string };
const prefixes = { heading: /^( {0,3})#{1,6} /, list: /^(\s*)(?:[-+*]|\d+\.) /, quote: /^( {0,3})> ?/ };
const defaults: Record<WritingFormat, string> = { bold: 'bold text', italic: 'emphasis', heading: 'Heading', list: 'List item', code: 'code', quote: 'Quote', link: 'link text' };

function lines(body: string, start: number, end: number) {
  const first = body.lastIndexOf('\n', start - 1) + 1;
  const last = end > start && body[end - 1] === '\n' ? end - 1 : end;
  const result: { from: number; text: string }[] = [];
  for (let from = first; from <= last;) {
    const next = body.indexOf('\n', from);
    result.push({ from, text: body.slice(from, next < 0 ? body.length : next) });
    if (next < 0) break;
    from = next + 1;
  }
  return result;
}

// Recognize a whole Markdown span, including when only its contents are selected.
// Star runs keep bold and italic independent when both are applied together.
function inlineSpan(body: string, start: number, end: number, format: WritingFormat) {
  const pattern = format === 'link' ? /\[([^\]\n]*)\]\(([^)\n]*)\)/g
    : format === 'code' ? /(`+)([^`\n]+)\1/g : /(\*{1,3})([^*\n]+)\1(?!\*)/g;
  for (const match of body.matchAll(pattern)) {
    const from = match.index!, to = from + match[0].length;
    if (from > 0 && format !== 'link' && body[from - 1] === (format === 'code' ? '`' : '*')) continue;
    const width = format === 'link' ? 1 : match[1].length;
    if (format === 'bold' && width < 2 || format === 'italic' && width % 2 !== 1) continue;
    const contentEnd = format === 'link' ? from + 1 + match[1].length : to - width;
    if ((start >= from + width && end <= contentEnd) || (start === from && end === to)) {
      const remove = format === 'bold' ? 2 : format === 'italic' ? 1 : width;
      return [{ from, to: from + remove, text: '' },
        { from: format === 'link' ? contentEnd : to - remove, to, text: '' }];
    }
  }
  return null;
}

function applyEdits(body: string, start: number, end: number, edits: Edit[]): Selection {
  const position = (point: number) => {
    let delta = 0;
    for (const edit of edits) {
      if (point < edit.from) break;
      if (point <= edit.to) return edit.from + delta + edit.text.length;
      delta += edit.text.length - (edit.to - edit.from);
    }
    return point + delta;
  };
  let result = body;
  for (const edit of [...edits].reverse()) result = result.slice(0, edit.from) + edit.text + result.slice(edit.to);
  return { body: result, start: position(start), end: position(end) };
}

export function isWritingFormatActive(body: string, start: number, end: number, format: WritingFormat): boolean {
  if (format in prefixes) {
    const pattern = prefixes[format as keyof typeof prefixes];
    return lines(body, start, end).every(line => pattern.test(line.text));
  }
  return Boolean(inlineSpan(body, start, end, format));
}

export function toggleWritingFormat(body: string, start: number, end: number, format: WritingFormat): Selection {
  if (format in prefixes) {
    const pattern = prefixes[format as keyof typeof prefixes];
    const selected = lines(body, start, end), active = selected.every(line => pattern.test(line.text));
    const prefix = format === 'heading' ? '## ' : format === 'list' ? '- ' : '> ';
    const edits = selected.map(line => {
      const match = line.text.match(pattern);
      const indent = match?.[1] || '';
      return { from: line.from + indent.length, to: line.from + (match?.[0].length || indent.length), text: active ? '' : prefix };
    });
    return applyEdits(body, start, end, edits);
  }
  const existing = inlineSpan(body, start, end, format);
  if (existing) return applyEdits(body, start, end, existing);
  const prefix = format === 'bold' ? '**' : format === 'italic' ? '*' : format === 'code' ? '`' : '[';
  const suffix = format === 'link' ? '](https://example.com)' : prefix;
  const selection = body.slice(start, end) || defaults[format];
  return { body: body.slice(0, start) + prefix + selection + suffix + body.slice(end), start: start + prefix.length, end: start + prefix.length + selection.length };
}
