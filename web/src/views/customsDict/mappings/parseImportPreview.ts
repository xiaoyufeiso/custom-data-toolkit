// SheetJS ESM：公司 npm 源无 xlsx 包时本地预览用（UMD mini 在 Vite ESM 下无导出）
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — vendored build without package types
import { read, utils } from './xlsx.mjs';

export type ImportPreviewRow = {
  excelRow: number;
  dictType: string;
  dictTypeName: string;
  rawValue: string;
  hitCount: string;
  standardValue: string;
  remark: string;
};

const REQUIRED_HEADERS = ['字典类型编码', '原始值', '标准值'] as const;

const cellText = (value: unknown): string => {
  if (value == null) return '';
  return String(value).trim();
};

const isEmptyRow = (cells: unknown[]): boolean => (
  cells.every((cell) => cellText(cell) === '')
);

export class ImportPreviewParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportPreviewParseError';
  }
}

export async function parseCustomsDictImportPreview(
  file: File,
): Promise<ImportPreviewRow[]> {
  const buffer = await file.arrayBuffer();
  let workbook: { SheetNames: string[]; Sheets: Record<string, unknown> };
  try {
    workbook = read(new Uint8Array(buffer), { type: 'array', cellDates: false });
  } catch (error) {
    if (error instanceof ImportPreviewParseError) throw error;
    throw new ImportPreviewParseError('无法解析 Excel 文件，请上传有效的 xlsx。');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ImportPreviewParseError('导入文件为空。');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (matrix.length === 0) {
    throw new ImportPreviewParseError('导入文件为空。');
  }

  const headerRow = (matrix[0] ?? []).map((cell) => cellText(cell));
  const headerMap = new Map<string, number>();
  headerRow.forEach((name, index) => {
    if (name) headerMap.set(name, index);
  });

  const missing = REQUIRED_HEADERS.filter((name) => !headerMap.has(name));
  if (missing.length > 0) {
    throw new ImportPreviewParseError(
      `表头缺少列：${missing.join('、')}。请使用与导出相同的模板。`,
    );
  }

  const get = (row: unknown[], name: string): string => {
    const index = headerMap.get(name);
    if (index == null) return '';
    return cellText(row[index]);
  };

  const rows: ImportPreviewRow[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] ?? [];
    if (isEmptyRow(row)) continue;
    rows.push({
      excelRow: i + 1,
      dictType: get(row, '字典类型编码'),
      dictTypeName: get(row, '字典类型名称'),
      rawValue: get(row, '原始值'),
      hitCount: get(row, '出现次数'),
      standardValue: get(row, '标准值'),
      remark: get(row, '备注'),
    });
  }

  if (rows.length === 0) {
    throw new ImportPreviewParseError('未读取到可导入的数据行。');
  }

  return rows;
}
