// Bốn hàm SQL của thuong-mai-repo.ts, chạy thẳng trên D1 giả (SQLite thật + migration thật): chuỗi changes() > 0, ghi tay có lính gác, bản chụp hiện hành, đếm.
// Task 5 (ghi mức tay, đọc phần thương mại) dùng lại các hàm này; route xác nhận (chup-xac-nhan.test.ts) mới chỉ chạm `cauChupChuoi`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { banChupHienHanh, cauChupChuoi, cauGhiTay, demBanChup } from "./thuong-mai-repo.ts";
import { dongGhiTuChup } from "./thuong-mai.ts";

const AT = "2026-10-01T00:00:00.000Z";
const HOM_NAY = "2026-10-08";
const ID = "99999999-9999-4999-8999-0000000000aa";

function dung() {
  const sqlite = openDb();
  const db = fakeD1(sqlite);
  sqlite.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('nv', '', '0900000001', 'x', 'sales', 1, ?)").run(AT);
  sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dla', 'ORGANIZATION', 'Đại lý A', 1, ?, ?)").run(AT, AT);
  sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, 'TD-1', 'nv', 'draft', 'Khách Giả', '0900000099', 1000, 1000, 1000, ?, ?)`).run(ID, AT, AT);
  sqlite.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'HONTAM', 'DV', 'perPax', 1, ?)").run(`${ID}-s`, ID, HOM_NAY);
  sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'x', 1, 1000, 1000, 1000)").run(`${ID}-i`, ID, `${ID}-s`);
  const congTy = String(sqlite.prepare("SELECT party_id FROM v_pty_owner_company").get()!.party_id);
  return { sqlite, db, congTy };
}
const v = (id: string, source: "AUTO" | "MANUAL", supersedesId: string | null) => ({ id, orderId: ID, ngay: HOM_NAY, at: AT, by: "nv", source, reason: source === "MANUAL" ? "Đại lý thoả thuận lại 15%" : null, supersedesId });
const lenhXacNhan = (db: ReturnType<typeof fakeD1>) => db.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ?1, updated_at = ?1 WHERE id = ?2 AND status = 'draft'").bind(AT, ID);

test("cauChupChuoi: nối sau một lệnh ghi thật thì chèn; nối sau lệnh ghi 0 dòng thì KHÔNG chèn gì (không lỗi, không dòng)", async () => {
  const { db, congTy } = dung();
  const dong = dongGhiTuChup({ serviceId: `${ID}-s`, beneficiaryPartyId: null, hoaHong: { status: "NONE" }, cungUng: { status: "SET", termId: "prc-st-goc-all", sellerPartyId: congTy, supplierPartyId: null, costRateBp: null } }, v("t1", "AUTO", null));
  // Lệnh thứ nhất thắng (đơn đang nháp) ⇒ có chụp.
  await db.batch([lenhXacNhan(db), ...cauChupChuoi(db, [dong])]);
  assert.equal(await demBanChup(db, ID), 1);
  // Lệnh thứ hai thua (đơn không còn nháp, UPDATE 0 dòng) ⇒ câu chụp không chèn — nếu chèn thì trigger terms_one_current đã làm cả lô rơi.
  await db.batch([lenhXacNhan(db), ...cauChupChuoi(db, [{ ...dong, id: "t-thua" }])]);
  assert.equal(await demBanChup(db, ID), 1);
});

test("cauGhiTay: chỉ đơn đã xác nhận và chưa Đã giao; banChupHienHanh chỉ trả bản chưa bị thay; demBanChup đếm mọi bản", async () => {
  const { sqlite, db, congTy } = dung();
  const goc = dongGhiTuChup({ serviceId: `${ID}-s`, beneficiaryPartyId: null, hoaHong: { status: "NONE" }, cungUng: { status: "SET", termId: "prc-st-goc-all", sellerPartyId: congTy, supplierPartyId: null, costRateBp: null } }, v("t1", "AUTO", null));
  const tay = dongGhiTuChup({ serviceId: `${ID}-s`, beneficiaryPartyId: "pty-dla", hoaHong: { status: "SET", kind: "RATE", rateBp: 1500, perPax: null, ruleId: null },
    cungUng: { status: "SET", termId: null, sellerPartyId: congTy, supplierPartyId: null, costRateBp: null } }, v("t2", "MANUAL", "t1"));
  // Đơn còn nháp ⇒ lính gác trong câu: không chèn (và không lỗi khoá ngoại vì SELECT không ra dòng).
  await db.batch([cauGhiTay(db, tay)]);
  assert.equal(await demBanChup(db, ID), 0);
  assert.deepEqual(await banChupHienHanh(db, ID), []);
  // Xác nhận + chụp, rồi ghi tay thay bản đầu.
  await db.batch([lenhXacNhan(db), ...cauChupChuoi(db, [goc])]);
  await db.batch([cauGhiTay(db, tay)]);
  assert.equal(await demBanChup(db, ID), 2);
  const hienHanh = await banChupHienHanh(db, ID);
  assert.equal(hienHanh.length, 1);
  assert.equal(hienHanh[0]!.id, "t2");
  assert.equal(hienHanh[0]!.source, "MANUAL");
  assert.equal(hienHanh[0]!.commission_rate_bp, 1500);
  // Đã giao ⇒ lính gác chặn (câu không chèn; trigger terms_order_delivered là lưới cuối nhưng câu không tới được nó).
  sqlite.exec("DROP TRIGGER IF EXISTS ord_service_terms_delivered");
  sqlite.prepare("UPDATE orders SET delivered_at = ?1, delivered_by = 'nv' WHERE id = ?2").run(AT, ID);
  const tay2 = dongGhiTuChup({ serviceId: `${ID}-s`, beneficiaryPartyId: "pty-dla", hoaHong: { status: "SET", kind: "RATE", rateBp: 2000, perPax: null, ruleId: null },
    cungUng: { status: "SET", termId: null, sellerPartyId: congTy, supplierPartyId: null, costRateBp: null } }, v("t3", "MANUAL", "t2"));
  await db.batch([cauGhiTay(db, tay2)]);
  assert.equal(await demBanChup(db, ID), 2, "đơn Đã giao: câu ghi tay không chèn dù trigger terms_order_delivered đã gỡ — lính gác nằm trong câu");
});
