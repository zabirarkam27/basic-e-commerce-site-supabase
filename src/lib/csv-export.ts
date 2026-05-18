import { toast } from "sonner";

type Row = Record<string, unknown>;

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCSV(headers: string[], rows: (string | number | null | undefined)[][]) {
  const head = headers.map(esc).join(",");
  const body = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  return "\ufeff" + head + "\r\n" + body;
}

export function downloadCSV(filename: string, csv: string) {
  const safe = filename.replace(/[^a-z0-9_.-]/gi, "_");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportRowsCSV(opts: {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  emptyMessage?: string;
}) {
  if (opts.rows.length === 0) {
    toast.error(opts.emptyMessage ?? "Nothing to export.");
    return;
  }
  downloadCSV(opts.filename, buildCSV(opts.headers, opts.rows));
  toast.success(`Exported ${opts.rows.length} row${opts.rows.length === 1 ? "" : "s"}.`);
}

export function exportObjectsCSV(opts: {
  filename: string;
  rows: Row[];
  headers?: string[];
  emptyMessage?: string;
}) {
  if (opts.rows.length === 0) {
    toast.error(opts.emptyMessage ?? "Nothing to export.");
    return;
  }
  const headers = opts.headers ?? Array.from(new Set(opts.rows.flatMap((r) => Object.keys(r))));
  const matrix = opts.rows.map((r) =>
    headers.map((h) => {
      const v = r[h];
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return v as string | number;
    }),
  );
  exportRowsCSV({
    filename: opts.filename,
    headers,
    rows: matrix,
    emptyMessage: opts.emptyMessage,
  });
}

export const csvTimestamp = () => new Date().toISOString().slice(0, 10);
