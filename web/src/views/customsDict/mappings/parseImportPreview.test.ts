import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseCustomsDictImportPreview } from './parseImportPreview';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures/import-sample.xlsx',
);

describe('parseCustomsDictImportPreview', () => {
  it('parses openpyxl-shaped template rows', async () => {
    const bytes = readFileSync(fixturePath);
    const file = {
      name: 'import-sample.xlsx',
      arrayBuffer: async () => {
        const out = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(out).set(bytes);
        return out;
      },
    } as File;

    const rows = await parseCustomsDictImportPreview(file);
    expect(rows).toEqual([
      {
        excelRow: 2,
        dictType: 'country',
        dictTypeName: '国家',
        rawValue: 'USA',
        hitCount: '',
        standardValue: '美国',
        remark: '',
      },
      {
        excelRow: 3,
        dictType: 'country',
        dictTypeName: '国家',
        rawValue: 'JPN',
        hitCount: '',
        standardValue: '日本',
        remark: '备注',
      },
    ]);
  });
});
