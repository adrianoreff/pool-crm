export type CsvCustomerRow = {
  first_name: string;
  last_name: string | null;
  email: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string;
  is_active: boolean;
  tags: string[] | null;
  notes: string | null;
};

export type ParsedCsvImport = {
  rows: CsvCustomerRow[];
  errors: { line: number; message: string }[];
  skipped: number;
};

const HEADER_ALIASES: Record<string, keyof CsvCustomerRow | 'status' | 'list'> = {
  firstname: 'first_name',
  'first name': 'first_name',
  first_name: 'first_name',
  lastname: 'last_name',
  'last name': 'last_name',
  last_name: 'last_name',
  email: 'email',
  'address line 1': 'address',
  address: 'address',
  address1: 'address',
  'postal code': 'zip_code',
  zip: 'zip_code',
  zipcode: 'zip_code',
  zip_code: 'zip_code',
  city: 'city',
  state: 'state',
  country: 'country',
  phone: 'phone',
  mobile: 'phone',
  status: 'status',
  list: 'list',
  lists: 'list',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function detectDelimiter(sampleLine: string): string {
  const counts = [
    { d: ',', n: (sampleLine.match(/,/g) || []).length },
    { d: ';', n: (sampleLine.match(/;/g) || []).length },
    { d: '\t', n: (sampleLine.match(/\t/g) || []).length },
  ];
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ',';
}

/** Parse CSV text with quoted fields (comma, semicolon, or tab). */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell.trim());
    cell = '';
  };

  const pushRow = () => {
    pushCell();
    if (row.some((c) => c.length > 0)) rows.push([...row]);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushCell();
    } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
      pushRow();
      if (c === '\r') i++;
    } else if (c === '\r') {
      pushRow();
    } else {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) pushRow();
  return rows;
}

/** Placeholder when CSV has no phone (DB requires phone). */
export function placeholderPhoneForLine(line: number): string {
  const suffix = String(line).padStart(7, '0').slice(-7);
  return `555${suffix}`;
}

export function normalizePhone(raw: string): string | null {
  let s = (raw ?? '').trim();
  if (!s) return null;

  // Excel scientific notation (e.g. 1.7608896392E+10)
  if (/^[\d.]+[eE][+-]?\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isNaN(n) && n > 0) {
      s = String(Math.round(n));
    }
  }

  // Excel float export (7602379011.0)
  if (/^\d+\.0+$/.test(s)) {
    s = s.replace(/\.0+$/, '');
  }

  const digits = s.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function statusToActive(status: string): boolean {
  const s = status.trim().toLowerCase();
  if (['unsubscribed', 'inactive', 'unsubscribe', 'optout', 'opt-out'].includes(s)) {
    return false;
  }
  return true;
}

function mapRow(
  raw: Record<string, string>,
  line: number
): { row?: CsvCustomerRow; error?: string } {
  const first = raw.first_name?.trim();
  const phoneRaw = raw.phone?.trim() ?? '';
  let phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  let phoneWasPlaceholder = false;

  if (!first) return { error: `Line ${line}: First name is required` };

  if (!phone) {
    if (phoneRaw) {
      return {
        error: `Line ${line}: Could not read phone "${phoneRaw}" — use 10+ digits or format like (619) 920-2807`,
      };
    }
    phone = placeholderPhoneForLine(line);
    phoneWasPlaceholder = true;
  }

  const tags: string[] = [];
  if (raw.list?.trim()) tags.push(raw.list.trim());

  const noteParts: string[] = [];
  if (phoneWasPlaceholder) {
    noteParts.push('Phone missing in CSV import — please update');
  }
  if (raw.country?.trim() && raw.country.trim().toUpperCase() !== 'US') {
    noteParts.push(`Country: ${raw.country.trim()}`);
  }
  if (raw.status?.trim()) {
    noteParts.push(`Import status: ${raw.status.trim()}`);
  }

  return {
    row: {
      first_name: first,
      last_name: raw.last_name?.trim() || null,
      email: raw.email?.trim() || null,
      address: raw.address?.trim() || null,
      zip_code: raw.zip_code?.trim() || null,
      city: raw.city?.trim() || null,
      state: raw.state?.trim() || null,
      country: raw.country?.trim() || null,
      phone,
      is_active: raw.status ? statusToActive(raw.status) : true,
      tags: tags.length ? tags : null,
      notes: noteParts.length ? noteParts.join(' · ') : null,
    },
  };
}

export function parseCustomerCsv(fileText: string): ParsedCsvImport {
  const cleaned = fileText.replace(/^\uFEFF/, '');
  const firstLine = cleaned.split(/\r?\n/)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const grid = parseCsv(cleaned, delimiter);
  if (grid.length < 2) {
    return { rows: [], errors: [{ line: 1, message: 'CSV must include a header row and at least one data row' }], skipped: 0 };
  }

  const headerRow = grid[0];
  const colMap: (keyof CsvCustomerRow | 'status' | 'list' | null)[] = headerRow.map((h) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    return key ?? null;
  });

  const unknown = headerRow.filter((_, i) => colMap[i] === null);
  const hasFirst = colMap.includes('first_name');
  const hasPhone = colMap.includes('phone');
  if (!hasFirst || !hasPhone) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Missing required columns (FirstName, Phone). Found: ${headerRow.join(', ')}${unknown.length ? `. Unmapped: ${unknown.join(', ')}` : ''}`,
        },
      ],
      skipped: 0,
    };
  }

  const rows: CsvCustomerRow[] = [];
  const errors: { line: number; message: string }[] = [];
  let skipped = 0;

  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    if (!cells.some((c) => c.trim())) {
      skipped++;
      continue;
    }

    const raw: Record<string, string> = {};
    cells.forEach((cell, j) => {
      const field = colMap[j];
      if (!field) return;
      if (field === 'status') raw.status = cell;
      else if (field === 'list') raw.list = cell;
      else raw[field] = cell;
    });

    const line = i + 1;
    const result = mapRow(raw, line);
    if (result.error) {
      errors.push({ line, message: result.error });
    } else if (result.row) {
      rows.push(result.row);
    }
  }

  return { rows, errors, skipped };
}

export const CUSTOMER_CSV_TEMPLATE = [
  'FirstName,LastName,Email,Address Line 1,Postal Code,City,State,Country,Phone,Status,List',
  'Stephen,Battle,stephen@example.com,534 Echo Lane,92078,San Marcos,CA,US,17608896392,subscribed,existing customers',
].join('\n');
