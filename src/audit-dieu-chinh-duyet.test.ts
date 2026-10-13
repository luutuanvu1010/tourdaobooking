// Kiểm định kỳ điều chỉnh công nợ cần duyệt (ADR-0115 đợt 1; migration 0094): R-BIL-14 — phiếu ADJUSTMENT ghi từ mốc đều có yêu cầu đã được NGƯỜI KHÁC duyệt; R-BIL-14w — phiếu
// cũ hơn mốc chỉ là cảnh báo; R-BIL-15 — tổng điều chỉnh tăng nợ còn hiệu lực của đơn không vượt trần chụp lúc duyệt. Dữ liệu vi phạm dựng bằng cách GỠ trigger trong CSDL thử
// (giả lập "trigger bị gỡ nhầm / SQL gõ tay đi vòng").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

interface Check { code: string; sql: string; level: string; mode?: "rows" }
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
const one = (code: string): Check => {
  const f = CHECKS.filter((c) => c.code === code);
  assert.equal(f.length, 1, `phải có đúng một kiểm ${code}`);
  return f[0]!;
};
const dem = (db: DatabaseSync, code: string): number => {
  const c = one(code);
  const rows = db.prepare(c.sql.replace(/\s+/g, " ").trim()).all();
  return c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
};
const DIR = new URL("../migrations/", import.meta.url);
const TRUOC = "2020-01-01T00:00:00.000Z"; // trước mốc (mốc = lúc áp migration)
const SAU = "2099-01-01T00:00:00.000Z";
let n = 0;
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
/** Gỡ các trigger 0094 mà bài cố ý vượt (giả lập bị gỡ nhầm). */
const go = (db: DatabaseSync, ...ten: string[]) => { for (const t of ten) db.exec(`DROP TRIGGER ${t}`); };
const yeuCau = (db: DatabaseSync, o: { id: string; order: string; nguoi: string; amount: number; at: string }) =>
  db.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason, target_id,
      cap_snapshot, created_at, created_by, updated_at, updated_by) VALUES (?, 'REQUEST', ?, 'hdv', 'ct', ?, 'HELD', '2026-10-13', 'INCREASE', 'khách gửi thêm tiền qua HDV', NULL, NULL, ?, ?, ?, ?)`)
    .run(o.id, o.order, o.amount, o.at, o.nguoi, o.at, o.nguoi);
const duyet = (db: DatabaseSync, o: { id: string; yc: string; order: string; nguoi: string; cap: number; at: string }) =>
  db.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, direction, reason, target_id, cap_snapshot, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'APPROVE', ?, 'INCREASE', NULL, ?, ?, ?, ?, ?, ?)`).run(o.id, o.order, o.yc, o.cap, o.at, o.nguoi, o.at, o.nguoi);
const phieu = (db: DatabaseSync, o: { id: string; order: string; yc: string | null; nguoi: string; at: string }) =>
  db.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, request_id, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'ADJUSTMENT', ?, 'khách gửi thêm tiền qua HDV', '2026-10-13', ?, ?, ?, ?, ?)`).run(o.id, o.order, o.yc, o.at, o.nguoi, o.at, o.nguoi);
const dong = (db: DatabaseSync, o: { posting: string; order: string; amount: number; reverses?: string }) => {
  const id = `l${++n}`;
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, reverses_line_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'HELD', ?, ?, ?, ?)`).run(id, o.posting, o.reverses ? "ct" : "hdv", o.reverses ? "hdv" : "ct", o.amount, o.order, o.reverses ?? null, SAU, SAU);
  return id;
};
/** Bộ ba hợp lệ + dòng nợ `amount`, trần chụp `cap`. */
function bo(db: DatabaseSync, o: { k: string; order: string; amount: number; cap: number; at?: string }) {
  const at = o.at ?? SAU;
  yeuCau(db, { id: `yc-${o.k}`, order: o.order, nguoi: "kt1", amount: o.amount, at });
  duyet(db, { id: `dq-${o.k}`, yc: `yc-${o.k}`, order: o.order, nguoi: "kt2", cap: o.cap, at });
  phieu(db, { id: `ph-${o.k}`, order: o.order, yc: `yc-${o.k}`, nguoi: "kt2", at });
  return dong(db, { posting: `ph-${o.k}`, order: o.order, amount: o.amount });
}

test("R-BIL-14: sạch = 0; phiếu từ mốc thiếu yêu cầu / yêu cầu do chính người ghi tạo / yêu cầu chưa duyệt ⇒ mỗi phiếu một vi phạm; mức LỖI", () => {
  assert.equal(one("R-BIL-14").level, "fail");
  const db = moi();
  bo(db, { k: "ok", order: "o1", amount: 100, cap: 500 });
  assert.equal(dem(db, "R-BIL-14"), 0);
  go(db, "bil_posting_adjustment_approved", "bil_posting_adjustment_request_only");
  phieu(db, { id: "ph-khong", order: "o1", yc: null, nguoi: "kt2", at: SAU });
  assert.equal(dem(db, "R-BIL-14"), 1, "thiếu yêu cầu");
  yeuCau(db, { id: "yc-chua", order: "o1", nguoi: "kt1", amount: 1, at: SAU });
  phieu(db, { id: "ph-chua", order: "o1", yc: "yc-chua", nguoi: "kt1", at: SAU });
  assert.equal(dem(db, "R-BIL-14"), 2, "yêu cầu chưa duyệt");
  yeuCau(db, { id: "yc-tu", order: "o1", nguoi: "kt1", amount: 1, at: SAU });
  go(db, "bil_adjustment_request_same_person");
  duyet(db, { id: "dq-tu", yc: "yc-tu", order: "o1", nguoi: "kt1", cap: 500, at: SAU });
  phieu(db, { id: "ph-tu", order: "o1", yc: "yc-tu", nguoi: "kt1", at: SAU });
  assert.equal(dem(db, "R-BIL-14"), 3, "người duyệt trùng người tạo");
  yeuCau(db, { id: "yc-lech", order: "o1", nguoi: "kt1", amount: 1, at: SAU });
  duyet(db, { id: "dq-lech", yc: "yc-lech", order: "o1", nguoi: "kt2", cap: 500, at: SAU });
  phieu(db, { id: "ph-lech", order: "o1", yc: "yc-lech", nguoi: "kt3", at: SAU });
  assert.equal(dem(db, "R-BIL-14"), 4, "người ghi phiếu khác người duyệt");
});

test("R-BIL-14w: phiếu cũ hơn mốc không có yêu cầu ⇒ cảnh báo (không phải lỗi); phiếu từ mốc không vào đây", () => {
  assert.equal(one("R-BIL-14w").level, "warn");
  const db = moi();
  go(db, "bil_posting_adjustment_approved", "bil_posting_adjustment_request_only");
  phieu(db, { id: "ph-cu", order: "o1", yc: null, nguoi: "kt2", at: TRUOC });
  assert.equal(dem(db, "R-BIL-14w"), 1);
  assert.equal(dem(db, "R-BIL-14"), 0, "trước mốc không tính lỗi");
  phieu(db, { id: "ph-moi", order: "o1", yc: null, nguoi: "kt2", at: SAU });
  assert.equal(dem(db, "R-BIL-14w"), 1);
  assert.equal(dem(db, "R-BIL-14"), 1);
});

test("R-BIL-15: tổng tăng nợ còn hiệu lực ≤ trần chụp ⇒ 0; vượt trần ⇒ 1 đơn; dòng đã đảo không tính; đơn khác không lẫn", () => {
  assert.equal(one("R-BIL-15").level, "fail");
  const db = moi();
  bo(db, { k: "a", order: "o1", amount: 300, cap: 500 });
  bo(db, { k: "b", order: "o1", amount: 200, cap: 500 });
  assert.equal(dem(db, "R-BIL-15"), 0, "300 + 200 = đúng trần");
  const lc = bo(db, { k: "c", order: "o1", amount: 1, cap: 500 });
  assert.equal(dem(db, "R-BIL-15"), 1, "301 + 200 = 501 > 500");
  go(db, "bil_debt_line_adjustment_match"); // dòng đảo (đổi chỗ hai bên) gắn vào phiếu của chính nó cho gọn — bài chỉ xét phép loại trừ của R-BIL-15
  dong(db, { posting: "ph-c", order: "o1", amount: 1, reverses: lc });
  assert.equal(dem(db, "R-BIL-15"), 0, "dòng vượt đã bị đảo ⇒ không tính (cả dòng đảo)");
  bo(db, { k: "d", order: "o2", amount: 900, cap: 1000 });
  assert.equal(dem(db, "R-BIL-15"), 0, "đơn khác trần riêng");
});
