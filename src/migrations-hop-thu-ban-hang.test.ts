// Kiểm migration *_hop_thu_ban_hang.sql (ADR-0142 Đ7; Task 6): dựng lại view hộp thư `v_aud_order_event` trên bản MỚI NHẤT trước nó (…_tin_duyet_hoan_thu_truoc, 0125), CHỈ thêm năm hành động của Bán hàng phụ trách.
// Tệp tìm theo ĐUÔI tên (số migration đổi được lúc gộp — CHANGE-GUIDE công thức d). Bài so tập tổng quát (view = HANH_DONG_TIN_DON) ở migrations-tin-cho-xac-nhan.test.ts; ở đây khoá ba điều riêng:
// (1) mọi hành động của bản 0125 còn nguyên (đặc biệt `order_confirm_withdrawn` mà bộ lọc `yeuCauDaKhep` cần); (2) đúng năm hành động mới; (3) không `order_handler_refused`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dirname, "..", "migrations");
const tep = (duoi: string) => readdirSync(DIR).filter((f) => f.endsWith(duoi));
const hanhDongCuaView = (sql: string): string[] => {
  const m = /\baction\s+IN\s*\(([^)]*)\)/i.exec(sql.replace(/--.*$/gm, ""));
  assert.ok(m, "không thấy action IN (…)");
  return [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]!).sort();
};

test("có đúng MỘT tệp *_hop_thu_ban_hang.sql và đúng MỘT tệp *_tin_duyet_hoan_thu_truoc.sql (bản nền)", () => {
  assert.equal(tep("_hop_thu_ban_hang.sql").length, 1);
  assert.equal(tep("_tin_duyet_hoan_thu_truoc.sql").length, 1);
});

test("view mới = các hành động của bản nền + ĐÚNG năm hành động Bán hàng phụ trách; không order_handler_refused; vẫn DROP rồi CREATE cùng tên", () => {
  const moi = readFileSync(join(DIR, tep("_hop_thu_ban_hang.sql")[0]!), "utf8");
  const nen = readFileSync(join(DIR, tep("_tin_duyet_hoan_thu_truoc.sql")[0]!), "utf8");
  const them = ["order_completed", "sales_invite_refused", "sales_invited", "sales_owner_changed", "sales_owner_claimed"];
  assert.deepEqual(hanhDongCuaView(moi), [...hanhDongCuaView(nen), ...them].sort());
  assert.ok(!hanhDongCuaView(moi).includes("order_handler_refused"));
  assert.match(moi.replace(/--.*$/gm, ""), /DROP VIEW v_aud_order_event;\s*CREATE VIEW v_aud_order_event AS/);
  assert.match(moi.replace(/--.*$/gm, ""), /SELECT id, order_id, staff_id, action, created_at FROM audit_log\s+WHERE order_id IS NOT NULL/);
});
