// Đọc CSV Google Sheet dịch vụ thành danh mục. Logic thuần, không I/O.
// CHỈ đọc các cột cần cho đơn. Cố ý KHÔNG đọc `Khoá giá`, `Đường dẫn` (logic booking của website) và `Ghi chú nội bộ` (spec §2.5/N4).
import { findColumn, parseCsv } from "../../shared/csv.ts";
import { CATALOG_CODE_RE as CODE_RE, MAX_AMOUNT_VND as MAX_PRICE, parseUnit, type Prices } from "../../shared/order-lines.ts";

export interface CatalogInput {
  row: number;
  code: string;
  name: string;
  unit: string;
  prices: Prices;
  notes: { child: string | null; senior: string | null; infant: string | null };
}

/** Dòng hỏng. `code` có khi ô mã đọc được và hợp lệ (để đồng bộ giữ bản đã lưu của dịch vụ đó — TT1); thiếu / sai mã / trùng mã thì không có. */
export interface CatalogProblem { row: number; message: string; code?: string }

/** Giá gốc phí đưa đón đọc từ hai cột tuỳ chọn (ADR-0218 Đ1.3). Ô trống = null (chưa có giá, KHÔNG phải 0). Ô hỏng vào `loiO`, không làm bỏ dòng dịch vụ. */
export interface PhiDonSheet {
  coCotMoiKhach: boolean;
  coCotXeRieng: boolean;
  theoMa: Map<string, { moiKhach: number | null; xeRieng: number | null }>;
  loiO: { row: number; code: string; cot: "moi_khach" | "xe_rieng"; message: string }[];
}

/** Trần giá gốc từ Sheet (ADR-0218 Đ1.3): đi chung mỗi khách, xe riêng cả chuyến. */
export const TRAN_GIA_GOC_MOI_KHACH = 500_000;
export const TRAN_GIA_GOC_XE_RIENG = 5_000_000;

export type CatalogParse =
  | { ok: true; items: CatalogInput[]; problems: CatalogProblem[]; warnings: { row: number; message: string }[]; phiDon: PhiDonSheet }
  | { ok: false; reason: "missing_columns"; missing: string[]; headers: string[] };


function price(raw: string): { value: number | null; bad?: boolean } {
  const t = raw.trim();
  if (!t) return { value: null };
  if (!/^\d{1,12}$/.test(t) || Number(t) > MAX_PRICE) return { value: null, bad: true };
  return { value: Number(t) };
}

function giaGoc(raw: string, tran: number): { value: number | null; bad?: boolean } {
  const t = raw.trim();
  if (!t) return { value: null };
  if (!/^\d{1,12}$/.test(t) || Number(t) > tran) return { value: null, bad: true };
  return { value: Number(t) };
}

const note = (raw: string): string | null => {
  const t = raw.trim().replace(/\s+/g, " ");
  return t ? t.slice(0, 500) : null;
};

export function parseCatalogSheet(csv: string): CatalogParse {
  const rows = parseCsv(csv);
  const header = rows[0] ?? [];
  const col = {
    code: findColumn(header, "mã tour", "mã dịch vụ", "mã"),
    name: findColumn(header, "tên tour", "tên dịch vụ", "tên"),
    unit: findColumn(header, "đơn vị"),
    adult: findColumn(header, "giá người lớn"),
    child: findColumn(header, "giá trẻ em"),
    senior: findColumn(header, "giá người cao tuổi"),
    infant: findColumn(header, "giá em bé"),
    noteChild: findColumn(header, "ghi chú trẻ em"),
    noteSenior: findColumn(header, "ghi chú người cao tuổi"),
    noteInfant: findColumn(header, "ghi chú em bé"),
    phiMoiKhach: findColumn(header, "phí đưa đón"),
    phiXeRieng: findColumn(header, "phí đưa đón xe riêng"),
  };
  const missing = (["code", "name", "unit", "adult"] as const).filter((k) => col[k] < 0);
  if (missing.length) {
    const label = { code: "Mã tour", name: "Tên tour", unit: "Đơn vị", adult: "Giá người lớn" };
    return { ok: false, reason: "missing_columns", missing: missing.map((k) => label[k]), headers: header.map((h) => h.trim()) };
  }

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "") : "");
  const items: CatalogInput[] = [];
  const problems: CatalogProblem[] = [];
  const warnings: { row: number; message: string }[] = [];
  const phiDon: PhiDonSheet = { coCotMoiKhach: col.phiMoiKhach >= 0, coCotXeRieng: col.phiXeRieng >= 0, theoMa: new Map(), loiO: [] };
  const seen = new Set<string>();
  for (const [i, r] of rows.slice(1).entries()) {
    const row = i + 2;
    if (r.every((c) => !c.trim())) continue;
    const code = cell(r, col.code).trim();
    const name = cell(r, col.name).trim().replace(/\s+/g, " ");
    const unit = cell(r, col.unit).trim();
    if (!code) {
      problems.push({ row, message: `"${name || "(không tên)"}": thiếu Mã tour` });
      continue;
    }
    if (!CODE_RE.test(code)) {
      problems.push({ row, message: `${code.slice(0, 20)}: Mã tour chỉ gồm chữ, số, . _ - (tối đa 40 ký tự)` });
      continue;
    }
    if (seen.has(code)) {
      problems.push({ row, message: `${code}: trùng Mã tour với dòng phía trên` });
      continue;
    }
    if (!name || name.length > 300) {
      problems.push({ row, message: `${code}: thiếu hoặc quá dài Tên tour`, code });
      continue;
    }
    if (!unit) {
      problems.push({ row, message: `${code}: thiếu Đơn vị`, code });
      continue;
    }
    const adult = price(cell(r, col.adult));
    if (adult.value === null) {
      problems.push({ row, message: `${code}: Giá người lớn thiếu hoặc không phải số nguyên`, code });
      continue;
    }
    const others = { child: price(cell(r, col.child)), senior: price(cell(r, col.senior)), infant: price(cell(r, col.infant)) };
    const badOther = (Object.entries(others) as [string, { bad?: boolean }][]).find(([, p]) => p.bad);
    if (badOther) {
      problems.push({ row, message: `${code}: giá "${badOther[0]}" không phải số nguyên hợp lệ`, code });
      continue;
    }
    seen.add(code);
    const moi = giaGoc(cell(r, col.phiMoiKhach), TRAN_GIA_GOC_MOI_KHACH);
    const xe = giaGoc(cell(r, col.phiXeRieng), TRAN_GIA_GOC_XE_RIENG);
    if (phiDon.coCotMoiKhach || phiDon.coCotXeRieng) {
      phiDon.theoMa.set(code, { moiKhach: moi.value, xeRieng: xe.value });
      const loi = (cot: "moi_khach" | "xe_rieng") => phiDon.loiO.push({ row, code, cot, message: `Ô ${cot === "moi_khach" ? "Phí đưa đón" : "Phí đưa đón xe riêng"} dòng ${row} của ${code} không hợp lệ, giữ giá cũ` });
      if (moi.bad) loi("moi_khach");
      if (xe.bad) loi("xe_rieng");
    }
    if (parseUnit(unit).kind === "unknown") warnings.push({ row, message: `${code}: đơn vị "${unit}" chưa được hỗ trợ — chỉ nhập tay được` });
    items.push({
      row,
      code,
      name,
      unit,
      prices: { adult: adult.value, child: others.child.value, senior: others.senior.value, infant: others.infant.value },
      notes: { child: note(cell(r, col.noteChild)), senior: note(cell(r, col.noteSenior)), infant: note(cell(r, col.noteInfant)) },
    });
  }
  return { ok: true, items, problems, warnings, phiDon };
}
