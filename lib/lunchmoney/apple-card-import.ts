export type AppleCardRow = {
  id: string;
  date: string;
  payee: string;
  amount: number;
};

export type AppleCardFile = {
  rows: AppleCardRow[];
  source: "csv" | "pdf";
  warnings: string[];
};

export class AppleCardImportError extends Error {}

function dateOf(raw: string): string | null {
  const value = raw.trim();
  const match =
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value) ??
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (!match) return null;
  const iso = value.includes("-");
  const year = iso
    ? Number(match[1])
    : Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const month = Number(iso ? match[2] : match[1]);
  const day = Number(iso ? match[3] : match[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function amountOf(raw: string): number | null {
  const trimmed = raw.trim();
  const negative = /^\(.*\)$/.test(trimmed);
  const value = Number(trimmed.replace(/[,$()\s]/g, ""));
  if (!trimmed || !Number.isFinite(value)) return null;
  return Math.round((negative ? -value : value) * 100) / 100;
}

export function matchingKey(
  row: Pick<AppleCardRow, "date" | "payee" | "amount">
): string {
  return `${row.date}|${row.amount.toFixed(2)}|${row.payee.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function hash(value: string): string {
  let result = BigInt("0xcbf29ce484222325");
  for (const character of value) {
    result ^= BigInt(character.codePointAt(0)!);
    result = BigInt.asUintN(64, result * BigInt("0x100000001b3"));
  }
  return result.toString(36);
}

function buildRows(input: Omit<AppleCardRow, "id">[]): AppleCardRow[] {
  const occurrence = new Map<string, number>();
  return input.map((row) => {
    const key = matchingKey(row);
    const next = (occurrence.get(key) ?? 0) + 1;
    occurrence.set(key, next);
    return { ...row, id: `apple-card:${hash(key)}:${next}` };
  });
}

function csvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((part) => part.trim())) records.push(row);
      row = [];
    } else field += char;
  }
  if (quoted)
    throw new AppleCardImportError("The CSV has an unfinished quoted field.");
  row.push(field);
  if (row.some((part) => part.trim())) records.push(row);
  return records;
}

export function parseAppleCardCsv(text: string): AppleCardFile {
  const records = csvRecords(text.replace(/^\uFEFF/, ""));
  const header =
    records[0]?.map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "")
    ) ?? [];
  const column = (...names: string[]) =>
    header.findIndex((part) => names.includes(part));
  const dateIndex = column("transactiondate", "date");
  const payeeIndex = column("description", "merchant", "name", "payee");
  const amountIndex = column("amountusd", "amount", "transactionamount");
  const typeIndex = column("type", "transactiontype");
  if (dateIndex < 0 || payeeIndex < 0 || amountIndex < 0) {
    throw new AppleCardImportError(
      "This does not look like an Apple Card transaction CSV. Expected date, description, and amount columns."
    );
  }
  const rows: Omit<AppleCardRow, "id">[] = [];
  for (const [index, record] of records.slice(1).entries()) {
    const date = dateOf(record[dateIndex] ?? "");
    const payee = (record[payeeIndex] ?? "").trim();
    const amount = amountOf(record[amountIndex] ?? "");
    if (!date || !payee || amount === null) {
      throw new AppleCardImportError(
        `Could not read CSV row ${index + 2}. Check its date, description, and amount.`
      );
    }
    const kind = typeIndex < 0 ? "" : (record[typeIndex] ?? "").toLowerCase();
    const isCredit =
      /payment|refund|return|credit|cashback|daily cash|adjustment/.test(kind);
    rows.push({ date, payee, amount: isCredit ? -Math.abs(amount) : amount });
  }
  if (!rows.length)
    throw new AppleCardImportError("The CSV contains no transactions.");
  return { source: "csv", rows: buildRows(rows), warnings: [] };
}

/** PDF text lines are assembled by the browser extractor using their page coordinates. */
export function parseAppleCardPdfLines(lines: string[]): AppleCardFile {
  const text = lines.join("\n");
  if (!/Apple Card/i.test(text))
    throw new AppleCardImportError(
      "This PDF does not appear to be an Apple Card statement."
    );
  const rows: Omit<AppleCardRow, "id">[] = [];
  let section: "purchase" | "credit" | null = null;
  let uncertain = 0;
  for (const line of lines) {
    const value = line.replace(/\s+/g, " ").trim();
    if (
      /^(?:transactions|purchases|new transactions|interest charged|fees charged)\b/i.test(
        value
      )
    )
      section = "purchase";
    if (/^(?:payments and credits|payments|credits)\b/i.test(value))
      section = "credit";
    if (
      /^(?:apple card monthly installments|daily cash|account summary|payment information|interest charge calculation|important information|year to date)\b/i.test(
        value
      )
    )
      section = null;
    if (!section) continue;
    const match =
      /^(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\s+(.+?)\s+(\(?-?\$?[\d,]+\.\d{2}\)?)$/.exec(
        value
      );
    if (!match) {
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(value)) uncertain++;
      continue;
    }
    const date = dateOf(match[1]);
    const amount = amountOf(match[3]);
    const payee = match[2]
      .replace(/\s+\d+(?:\.\d+)?%\s+\$?[\d,]+\.\d{2}$/, "")
      .trim();
    if (!date || amount === null || !payee) {
      uncertain++;
      continue;
    }
    rows.push({
      date,
      payee,
      amount: section === "credit" ? -Math.abs(amount) : amount,
    });
  }
  if (!rows.length || uncertain) {
    throw new AppleCardImportError(
      uncertain
        ? `The PDF has ${uncertain} transaction lines that could not be read reliably. Export a CSV from Apple Card instead.`
        : "No transaction rows could be read from this PDF. Export a CSV from Apple Card instead."
    );
  }
  return {
    source: "pdf",
    rows: buildRows(rows),
    warnings: [
      "PDF extraction can miss details. Check every row against the statement before importing.",
    ],
  };
}

export function findAppleCardDuplicateIds(
  rows: AppleCardRow[],
  transactions: {
    date: string;
    payee: string;
    amount: string | number;
    external_id?: string | null;
  }[]
): Set<string> {
  const remaining = [...transactions];
  const duplicates = new Set<string>();
  for (const row of rows) {
    const exactId = remaining.findIndex((tx) => tx.external_id === row.id);
    const key = matchingKey(row);
    const match =
      exactId >= 0
        ? exactId
        : remaining.findIndex(
            (tx) =>
              matchingKey({
                date: tx.date,
                payee: tx.payee,
                amount: Number(tx.amount),
              }) === key
          );
    if (match >= 0) {
      duplicates.add(row.id);
      remaining.splice(match, 1);
    }
  }
  return duplicates;
}
