import { parse } from "csv-parse/sync";

export function parseCsv(text: string, opts: any = {}) {
  return parse(text, { columns: true, skip_empty_lines: true, ...opts });
}
