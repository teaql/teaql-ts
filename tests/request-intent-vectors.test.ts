import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MutationIntent, MutationRequest, QueryIntent, QueryRequest, SelectQuery, MutationQuery } from '../src';

const bytes = readFileSync(join(__dirname, 'fixtures/request-intent-v1.json'));
const vectors: { cases: Array<{ id: string; kind: string; input: any; error?: any; expected?: any }> } =
  JSON.parse(bytes.toString('utf8'));

test('shared request-intent fixture has the frozen cross-language checksum', () => {
  expect(createHash('sha256').update(bytes).digest('hex'))
    .toBe('3b911b0edb1b6634204a41c199f67f709d6408405b87d4f2f72a02110cb0b38b');
});

test.each(vectors.cases)('$id', (vector: any) => {
  const create = () => vector.kind === 'query'
    ? new QueryIntent(vector.input.comment, vector.input.purpose)
    : new MutationIntent(vector.input.comment);
  if (vector.error) {
    expect(create).toThrow();
    try { create(); } catch (error) {
      expect(error).toMatchObject({ ...vector.error, requestKind: vector.kind });
      expect(String(error)).not.toContain('SECRET-CANARY');
    }
  } else {
    expect(create().comment).toBe(vector.expected.comment);
    if (vector.kind === 'query') expect((create() as QueryIntent).purpose).toBe(vector.expected.purpose);
  }
});

test('request envelopes own intent after builders, route frames and Context state change', () => {
  const builder = new SelectQuery('Document').comment(' load document ').purpose('inspect document');
  const query = new QueryRequest(builder);
  builder.comment('replacement').purpose('replacement');
  expect(query.comment).toBe(' load document ');
  expect(query.purpose).toBe('inspect document');
  expect(query.query.commentText).toBe(' load document ');
  const command = new MutationQuery('Document', 'Create', {}, undefined, ' submit document ');
  const mutation = new MutationRequest(command);
  command.comment = 'replacement';
  expect(mutation.comment).toBe(' submit document ');
  expect(mutation.mutation.comment).toBe(' submit document ');
  expect(Object.keys(query.intent)).toEqual([]);
  expect(Object.keys(mutation.intent)).toEqual([]);
  expect(JSON.stringify(query.intent)).toBe('{}');
  expect(JSON.stringify(mutation.intent)).toBe('{}');
});

test('whitespace parity accepts BOM text but rejects the complete Unicode White_Space set', () => {
  const whitespace = '\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680' +
    '\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000';
  for (const value of whitespace) {
    expect(() => new MutationIntent(value)).toThrow();
    expect(() => new QueryIntent('load document', value)).toThrow();
  }
  expect(new MutationIntent('\ufeff').comment).toBe('\ufeff');
});

test('JavaScript-supplied explicit intent is validated and captured, not trusted by structural shape', () => {
  const input = { comment: 'original', purpose: 'inspect' };
  const query = new QueryRequest(new SelectQuery('Document'), input as any);
  const mutation = new MutationRequest(new MutationQuery('Document', 'Create', {}), input as any);
  input.comment = '';
  input.purpose = '';
  expect(query.comment).toBe('original');
  expect(query.purpose).toBe('inspect');
  expect(mutation.comment).toBe('original');
  expect(() => new QueryRequest(new SelectQuery('Document'), input as any)).toThrow('REQUEST_COMMENT_REQUIRED');
  expect(() => new MutationRequest(new MutationQuery('Document', 'Create', {}), input as any))
    .toThrow('REQUEST_COMMENT_REQUIRED');
});
