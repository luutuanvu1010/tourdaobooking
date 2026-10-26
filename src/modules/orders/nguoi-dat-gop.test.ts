// ADR-0068 Đ1 bước 5 (G7): đơn nháp / đã xác nhận CHƯA giao của người đặt A đổi sang B, updated_at tăng NGHIÊM NGẶT (khoá lạc quan của người đang sửa đơn bắt
// được, kể cả cùng mili-giây — Review Focus 2); đơn đã giao / đã huỷ giữ A; lính gác "A còn đang dùng"; đơn lệch tiền được báo theo mã đơn.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { cauDoiNguoiDat, donCuaNguoiDat } from "./nguoi-dat-gop-repo.ts";
import { gieoLyDoHuy } from "../../../tests/audit/huy-don.mjs";
import { gieoDongTienKhop } from "../../../tests/audit/dong-tien.mjs";

const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
function nguoi(w: any, id: string) {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, `Khách ${id}`, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, id, AT, AT);
}
/** Đơn `id` của người đặt `booker` ở trạng thái `trangThai` (nháp / xác nhận / đã giao / đã huỷ) — đi đúng các trigger (xác nhận cần dịch vụ có ngày). */
function don(w: any, id: string, booker: string, trangThai: "draft" | "confirmed" | "delivered" | "cancelled") {
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at, booker_party_id)
    VALUES (?, ?, ?, 'draft', 'Khách', '0900000099', 100000, 100000, 100000, ?, ?, ?)`).run(id, `TD-${id}`, SA, AT, AT, booker);
  w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-10-10')").run(`sv-${id}`, id);
  if (trangThai === "cancelled") { gieoLyDoHuy(w.sqlite, id); w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id); }
  if (trangThai === "confirmed" || trangThai === "delivered") gieoDongTienKhop(w.sqlite, id);
  if (trangThai === "confirmed" || trangThai === "delivered") w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, id);
  if (trangThai === "delivered") w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(AT, SA, id);
}
function nen() {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  nguoi(w, "pa"); nguoi(w, "pb"); nguoi(w, "pc");
  don(w, "o1", "pa", "draft"); don(w, "o2", "pa", "confirmed"); don(w, "o3", "pa", "delivered"); don(w, "o4", "pa", "cancelled"); don(w, "o5", "pc", "draft");
  return w;
}
const booker = (w: any, id: string) => w.q("SELECT booker_party_id b, updated_at u FROM orders WHERE id = ?", id)[0];

test("donCuaNguoiDat: đếm đơn sẽ đổi / giữ, không đơn lệch tiền", async () => {
  const w = nen();
  assert.deepEqual(await donCuaNguoiDat(w.env.DB, "pa"), { doi: 2, giuDaGiao: 1, giuDaHuy: 1, lechTien: [], maDoi: ["TD-o2"] }); // ADR-0135: `doi` vẫn đếm nháp o1 (sẽ đổi) nhưng mã đơn NHÁP không lộ ra cho người gộp
});

test("G7: câu đổi người đặt chỉ chạm đơn nháp + đã xác nhận chưa giao; updated_at = mốc lô", async () => {
  const w = nen();
  const at = "2026-10-01T02:00:00.000Z";
  const [r] = await w.env.DB.batch([cauDoiNguoiDat(w.env.DB, "pa", "pb", at)]);
  assert.equal(r.meta.changes, 2);
  assert.deepEqual([booker(w, "o1"), booker(w, "o2")].map((x) => [x.b, x.u]), [["pb", at], ["pb", at]]);
  assert.deepEqual(["o3", "o4"].map((id) => booker(w, id).b), ["pa", "pa"]);
  assert.equal(booker(w, "o5").b, "pc");
});

test("Review Focus 2: đơn có updated_at BẰNG hoặc SAU mốc lô → vẫn tăng nghiêm ngặt (lần lưu mang mốc cũ khớp 0 dòng)", async () => {
  const w = nen();
  const at = "2026-10-01T02:00:00.000Z";
  w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = 'o1'").run(at);
  await w.env.DB.batch([cauDoiNguoiDat(w.env.DB, "pa", "pb", at)]);
  const sau = booker(w, "o1").u as string;
  assert.ok(sau > at, `mốc mới ${sau} phải > ${at}`);
  assert.equal(w.sqlite.prepare("UPDATE orders SET customer_name = 'X' WHERE id = 'o1' AND updated_at = ?").run(at).changes, 0, "lần lưu mang mốc cũ bị khoá lạc quan chặn");
});

test("lính gác: A đã ngưng (lô khác vừa gộp) → câu đổi không chạm dòng nào", async () => {
  const w = nen();
  w.sqlite.prepare("UPDATE pty_party SET active = 0 WHERE id = 'pa'").run();
  const [r] = await w.env.DB.batch([cauDoiNguoiDat(w.env.DB, "pa", "pb", "2026-10-01T02:00:00.000Z")]);
  assert.equal(r.meta.changes, 0);
});

test("đơn chưa giao đang lệch tiền (dữ liệu cũ) → trả mã đơn để máy chủ từ chối gộp", async () => {
  const w = nen();
  w.sqlite.exec("DROP TRIGGER orders_money_update"); // chỉ trong DB thử: gieo dữ liệu cũ lệch tiền
  w.sqlite.exec("DROP TRIGGER orders_money_frozen"); // 0081 (F-03): đơn đã xác nhận khoá cột tiền — dữ liệu cũ lệch tiền có trước khoá
  w.sqlite.prepare("UPDATE orders SET total = 1 WHERE id = 'o2'").run();
  assert.deepEqual((await donCuaNguoiDat(w.env.DB, "pa")).lechTien, ["TD-o2"]);
});
