// Bộ dò "nhật ký không chứa dữ liệu hạng N3, N4" (Hiến chương 5.20; lát H-0 Gói 2) — gọi ở CUỐI các bài chạy cả ứng dụng trên SQLite thật.
// Nguồn hạng: docs/data-dictionary.json (khoá hangDuLieu). Chỉ xét cột của BẢNG (view chiếu lại cột bảng). Giá trị dưới 8 ký tự bỏ qua (dễ trùng ngẫu nhiên).
// N4 chỉ dò ở đây, không dò trên D1 production (scripts/audit-checks.mjs): phải so từng giá trị băm với mọi dòng nhật ký — quá nặng cho bước kiểm của
// `npm run trien-khai`. N3 còn có kiểm dữ liệu R-PTY-4 / R-PD-1.
import { readFileSync } from "node:fs";

const DICT = JSON.parse(readFileSync(new URL("../../docs/data-dictionary.json", import.meta.url), "utf8"));
const BANG = new Set(DICT.tables.map((t) => t.name));

/** Mọi cột BẢNG hạng N3/N4, dạng "bảng.cột", đã sắp xếp. */
export function cotN3N4() {
  const out = [];
  for (const [obj, cot] of Object.entries(DICT.hangDuLieu ?? {})) {
    if (!BANG.has(obj)) continue;
    for (const [c, h] of Object.entries(cot)) if (h === "N3" || h === "N4") out.push(`${obj}.${c}`);
  }
  return out.sort();
}

/** Cột N3/N4 → bài chạy cả ứng dụng sinh dữ liệu THẬT cho cột đó (qua route) rồi gọi doNhatKyHang với cột trong danh sách phải có dữ liệu. */
export const PHU_TRACH = {
  "pty_person_document.document_number": "src/giay-to-khong-lo-so.test.ts",
  "pty_person_document.number_key": "src/giay-to-khong-lo-so.test.ts",
  "pty_person_document.issued_place": "src/giay-to-khong-lo-so.test.ts",
  "staff.pin_hash": "src/hai-lop-email-khong-lo.test.ts",
  "aut_mfa_factor.secret_enc": "src/hai-lop-email-khong-lo.test.ts",
  "aut_mfa_recovery_code.code_hash": "src/hai-lop-email-khong-lo.test.ts",
  "aut_mfa_email_code.code_hash": "src/hai-lop-email-khong-lo.test.ts",
  "aut_trusted_device.token_hash": "src/hai-lop-email-khong-lo.test.ts",
};

/** Cột N3/N4 chưa có route ghi nên chưa bài nào sinh được dữ liệu thật — kèm lý do và lát sẽ chuyển sang PHU_TRACH. */
export const MIEN = {
  "pty_organization_document.document_number": "chưa có route ghi giấy tờ tổ chức (lát H-1 chỉ có bảng) — lát H-2 chuyển sang src/giay-to-khong-lo-so.test.ts",
  "pty_organization_document.number_key": "chưa có route ghi giấy tờ tổ chức (lát H-1 chỉ có bảng) — lát H-2 chuyển sang src/giay-to-khong-lo-so.test.ts",
  "pty_organization_document.issued_place": "chưa có route ghi giấy tờ tổ chức (lát H-1 chỉ có bảng) — lát H-2 chuyển sang src/giay-to-khong-lo-so.test.ts",
};

const chuan = (s) => s.normalize("NFC").toUpperCase().replace(/[\s.\-/]/g, "");

/**
 * Dò mọi giá trị của mọi cột N3/N4 trong audit_log.detail (nguyên văn, hoặc đã bỏ khoảng trắng . - / và viết HOA).
 * `phaiCoDuLieu`: các cột bài gọi chịu trách nhiệm — cột nào không có giá trị ≥ 8 ký tự thì vào `rong` (chống bài rỗng).
 * Thông báo lộ KHÔNG in lại giá trị.
 */
export function doNhatKyHang(sqlite, phaiCoDuLieu) {
  const nhatKy = sqlite.prepare("SELECT id, action, detail FROM audit_log WHERE detail IS NOT NULL").all();
  const lo = [];
  const rong = [];
  for (const cot of cotN3N4()) {
    const [bang, ten] = cot.split(".");
    const giaTri = sqlite.prepare(`SELECT DISTINCT "${ten}" AS v FROM "${bang}" WHERE "${ten}" IS NOT NULL AND length("${ten}") >= 8`).all().map((r) => String(r.v));
    if (phaiCoDuLieu.includes(cot) && giaTri.length === 0) rong.push(cot);
    for (const v of giaTri) {
      const vc = chuan(v);
      for (const r of nhatKy) {
        const d = String(r.detail);
        if (d.includes(v) || (vc.length >= 8 && chuan(d).includes(vc))) lo.push(`${cot} lộ ở nhật ký ${r.action} (${r.id})`);
      }
    }
  }
  return { lo, rong };
}
