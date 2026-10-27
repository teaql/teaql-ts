import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BlobFieldSpec, BlobRef } from '../src/core/blob-ref';
import { RuntimeModule } from '../src/core/runtime-module';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';
import { MutationIntent } from '../src/core/request-intent';

const vectors = JSON.parse(readFileSync(join(__dirname, '..', 'test-vectors',
  'blob-value-cases.json'), 'utf8')) as {
  valid: string[]; invalid: string[]; invalidJson: unknown[];
  formats: Record<string, string>;
};

describe('shared BlobRef value and native SQL entry gate', () => {
  test('matches every shared stable-Key positive and negative vector', () => {
    for (const key of vectors.valid) {
      const reference = BlobRef.fromJSON(key);
      expect(reference.equals(BlobRef.fromSQL(key))).toBe(true);
      expect(reference.toString()).toBe('BlobRef[masked]');
      expect(() => JSON.stringify(reference)).toThrow('BLOB_PRESENTATION_REQUIRED');
    }
    for (const value of [...vectors.invalid, ...vectors.invalidJson]) {
      expect(() => BlobRef.fromJSON(value)).toThrow('BLOB_REFERENCE_INVALID');
    }
  });

  test('uses the shared extension/MIME mapping without sample-derived candidates', () => {
    const spec = new BlobFieldSpec('Asset', 'document', Object.keys(vectors.formats).reverse(),
      false, 'default');
    expect(spec.allowedExtensions).toEqual(Object.keys(vectors.formats).sort());
    expect(spec.allowedContentTypes).toEqual([...new Set(Object.values(vectors.formats))].sort());
    expect(() => new BlobFieldSpec('Asset', 'document', ['application.docx'], false, 'default'))
      .toThrow('BLOB_FORMAT_NOT_ALLOWED');
  });

  test('Blob schema fails before a physical transaction without the optional capability', async () => {
    const client = new SQLiteTeaQLClient(':memory:', {}).install(new RuntimeModule({
      Asset: { table: 'asset', columns: {
        id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
        version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
        document: { columnName: 'document', logicalType: 'text', decode: 'string', nullable: true,
          blob: new BlobFieldSpec('Asset', 'document', ['pdf'], true, 'default') },
      } },
    }));
    try {
      await expect(client.executeGraphSave(new MutationIntent('save document'), async () => {
        throw new Error('provider entered');
      })).rejects.toThrow('BLOB_CAPABILITY_MISSING');
      expect(client.sqlTrace).toEqual([]);
    } finally {
      await client.close();
    }
  });
});
