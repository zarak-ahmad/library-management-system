import ExcelJS from 'exceljs';
import { PDFParse } from 'pdf-parse';

export interface ParsedBookRow {
  rowNumber: number;
  values: Record<string, string>;
}

const HEADER_ALIASES: Record<string, string> = {
  isbn: 'isbn',
  title: 'title',
  author: 'author',
  genre: 'genre',
  genrename: 'genre',
  category: 'category',
  categoryname: 'category',
  publisher: 'publisher',
  edition: 'edition',
  publishedyear: 'publishedYear',
  year: 'publishedYear',
  language: 'language',
  description: 'description',
  shelflocation: 'shelfLocation',
  shelf: 'shelfLocation',
  location: 'shelfLocation',
  totalcopies: 'totalCopies',
  copies: 'totalCopies',
};

const normalizeHeader = (header: string): string => {
  const key = header.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return HEADER_ALIASES[key] || key;
};

const parseDelimitedLine = (line: string, delimiter: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
};

const rowsFromMatrix = (matrix: string[][]): ParsedBookRow[] => {
  if (matrix.length === 0) return [];

  const headerRow = matrix[0].map((cell) => normalizeHeader(String(cell || '')));
  const rows: ParsedBookRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    if (!line.some((cell) => String(cell || '').trim())) continue;

    const values: Record<string, string> = {};
    headerRow.forEach((header, index) => {
      if (!header) return;
      values[header] = String(line[index] ?? '').trim();
    });

    rows.push({ rowNumber: i + 1, values });
  }

  return rows;
};

export const parseCsvBuffer = (buffer: Buffer): ParsedBookRow[] => {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes('|') ? '|' : ',';
  const matrix = lines.map((line) => parseDelimitedLine(line, delimiter));
  return rowsFromMatrix(matrix);
};

export const parseExcelBuffer = async (buffer: Buffer): Promise<ParsedBookRow[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const matrix: string[][] = [];
  worksheet.eachRow((row) => {
    const cells = row.values as Array<string | number | undefined>;
    matrix.push(
      cells.slice(1).map((cell) => (cell === undefined || cell === null ? '' : String(cell)))
    );
  });

  return rowsFromMatrix(matrix);
};

export const parsePdfBuffer = async (buffer: Buffer): Promise<ParsedBookRow[]> => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const textResult = await parser.getText();
    const lines = textResult.text
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const delimiter = lines[0].includes('\t')
      ? '\t'
      : lines[0].includes('|')
        ? '|'
        : lines[0].includes(',')
          ? ','
          : null;

    if (!delimiter) {
      throw new Error(
        'Could not detect columns in PDF. Export your list as CSV or Excel, or use comma/tab separated lines in the PDF.'
      );
    }

    const matrix = lines.map((line: string) => parseDelimitedLine(line, delimiter));
    return rowsFromMatrix(matrix);
  } finally {
    await parser.destroy();
  }
};

export const parseImportFile = async (
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<ParsedBookRow[]> => {
  const ext = filename.toLowerCase().split('.').pop() || '';

  if (ext === 'csv' || mimetype === 'text/csv') {
    return parseCsvBuffer(buffer);
  }

  if (ext === 'xlsx' || ext === 'xls' || mimetype.includes('spreadsheet') || mimetype.includes('excel')) {
    return parseExcelBuffer(buffer);
  }

  if (ext === 'pdf' || mimetype === 'application/pdf') {
    return parsePdfBuffer(buffer);
  }

  throw new Error('Unsupported file type. Upload CSV, Excel (.xlsx), or PDF.');
};

export const IMPORT_TEMPLATE_CSV = [
  'isbn,title,author,genre,category,publisher,edition,publishedYear,language,description,shelfLocation,totalCopies',
  '978-0000000001,Sample Book,Jane Doe,Computer Science,Programming,Sample Press,1st,2024,English,Optional description,A-01,2',
].join('\n');
