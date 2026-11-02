// Kiểm migration kho vé điện tử (đặc tả 2026-10-31-ve-dien-tu-design.md §5.1; kế hoạch Task 1). Chạy trên SQLite thật (node:sqlite) với schema dựng từ
// migrations/*.sql: chèn / sửa THẲNG bằng SQL để chứng minh chặn nằm ở CƠ SỞ DỮ LIỆU (chỉ mục duy nhất, trigger), không ở mã. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ve_dien_tu.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-10-31T03:00:00.000Z";
const SAU = "2026-10-31T04:00:00.000Z";

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  return d;
}
let n = 0;
const lo = (d: DatabaseSync, nhom = "ADULT") => {
  const id = `b-${++n}`;
  d.prepare(
    `INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, created_by, updated_at, updated_by) VALUES (?, 'V2D', ?, 'Vé mẫu', 'ACTIVE', ?, NULL, ?, NULL)`,
  ).run(id, nhom, AT, AT);
  return id;
};
const ve = (d: DatabaseSync, batch: string, from = "2026-10-24", to = "2026-11-23") => {
  const id = `t-${++n}`;
  d.prepare(
    `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, slot_time, storage_key, content_kind, byte_size, content_hash, status, stored_at, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, NULL, ?, 'image/jpeg', 1000, 'bam-' || ?1, 'AVAILABLE', ?, ?, NULL, ?, NULL)`,
  ).run(id, batch, `TA.${id}`, from, to, `vdt/${id}`, AT, AT, AT);
  return id;
};
const phanBo = (d: DatabaseSync, ticket: string, dichVu = "s-1", slot = 1, nhom = "ADULT") => {
  const id = `a-${++n}`;
  d.prepare(`UPDATE vdt_ticket SET status = 'ALLOCATED', updated_at = ? WHERE id = ? AND status = 'AVAILABLE'`).run(AT, ticket); // giữ chỗ luôn đổi vé trước, ghi phân bổ sau
  d.prepare(
    `INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, allocated_by, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, 'o-1', ?, ?, ?, ?, NULL, ?, NULL, ?, NULL)`,
  ).run(id, ticket, dichVu, nhom, slot, AT, AT, AT);
  return id;
};
const doiTrangThai = (d: DatabaseSync, ticket: string, st: string) => d.prepare(`UPDATE vdt_ticket SET status = ?, updated_at = ? WHERE id = ?`).run(st, SAU, ticket);

test("migration kho vé: đúng MỘT tệp `*_ve_dien_tu.sql`, số ≥ 0131; chỉ thêm, không xoá / sửa bảng cũ", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.ok(MATCHES[0]! >= "0131", MATCHES[0]);
  const sql = sqlOf(MATCHES[0]!).replace(/--[^\n]*/g, "");
  assert.doesNotMatch(sql, /DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE|UPDATE\s+\w+\s+SET/i); // trigger «BEFORE DELETE ON» / «BEFORE UPDATE ON» không phải câu ghi
});

test("chenHaiPhanBoCungVe_biChanBangChiMucDuyNhat", () => {
  const d = db();
  const t = ve(d, lo(d));
  phanBo(d, t, "s-1", 1);
  assert.throws(() => phanBo(d, t, "s-2", 1), /UNIQUE/i);
});

test("haiPhanBoCungViTri_biChan; trả vé rồi vị trí dùng lại được", () => {
  const d = db();
  const b = lo(d);
  const t1 = ve(d, b);
  const t2 = ve(d, b);
  const a1 = phanBo(d, t1, "s-1", 1);
  assert.throws(() => phanBo(d, t2, "s-1", 1), /UNIQUE/i, "cùng (dòng dịch vụ, nhóm, thứ tự) đang mở");
  d.prepare(`UPDATE vdt_allocation SET released_at = ?, release_reason = 'DON_HUY', updated_at = ? WHERE id = ?`).run(SAU, SAU, a1);
  phanBo(d, t2, "s-1", 1); // vị trí đã trả: cấp lại được
  assert.equal((d.prepare(`SELECT count(*) AS c FROM vdt_allocation`).get() as { c: number }).c, 2);
});

test("trungMaVe_biChan; trùng khoá kho bị chặn", () => {
  const d = db();
  const b = lo(d);
  const t = ve(d, b);
  assert.throws(
    () =>
      d.prepare(
        `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, stored_at, created_at, updated_at) VALUES ('x', ?, ?, '2026-10-24', '2026-10-25', 'vdt/khac', 'image/jpeg', 1, 'bam-khac', 'AVAILABLE', ?, ?, ?)`,
      ).run(b, `TA.${t}`, AT, AT, AT),
    /UNIQUE/i,
  );
});

test("xoaVe_biTriggerChan; xoá phân bổ, lần giao cũng bị chặn", () => {
  const d = db();
  const t = ve(d, lo(d));
  const a = phanBo(d, t);
  assert.throws(() => d.prepare(`DELETE FROM vdt_ticket WHERE id = ?`).run(t), /vdt_append_only/);
  assert.throws(() => d.prepare(`DELETE FROM vdt_allocation WHERE id = ?`).run(a), /vdt_append_only/);
  d.prepare(`INSERT INTO vdt_delivery (id, allocation_id, channel, delivered_at, created_at, updated_at) VALUES ('d1', ?, 'ZALO', ?, ?, ?)`).run(a, AT, AT, AT);
  assert.throws(() => d.prepare(`DELETE FROM vdt_delivery WHERE id = 'd1'`).run(), /vdt_append_only/);
  assert.throws(() => d.prepare(`UPDATE vdt_delivery SET channel = 'LINK' WHERE id = 'd1'`).run(), /vdt_append_only/);
});

test("trangThaiVeDiNguocLoi_biChan: VOID là cuối; AVAILABLE→ALLOCATED→AVAILABLE/VOID đi được", () => {
  const d = db();
  const t = ve(d, lo(d));
  doiTrangThai(d, t, "ALLOCATED");
  doiTrangThai(d, t, "AVAILABLE"); // trả vé còn hạn, chưa lộ
  doiTrangThai(d, t, "ALLOCATED");
  doiTrangThai(d, t, "VOID");
  assert.throws(() => doiTrangThai(d, t, "AVAILABLE"), /vdt_one_way/);
  assert.throws(() => doiTrangThai(d, t, "ALLOCATED"), /vdt_one_way/);
});

test("veDaLo_khongVeKho: ALLOCATED→AVAILABLE bị chặn khi có phân bổ đã revealed_at", () => {
  const d = db();
  const t = ve(d, lo(d));
  doiTrangThai(d, t, "ALLOCATED");
  const a = phanBo(d, t);
  d.prepare(`UPDATE vdt_allocation SET revealed_at = ?, updated_at = ? WHERE id = ?`).run(SAU, SAU, a);
  assert.throws(() => doiTrangThai(d, t, "AVAILABLE"), /vdt_one_way/);
  doiTrangThai(d, t, "VOID"); // đường duy nhất: vô hiệu
});

test("khoaBatBienCuaVe: không đổi mã vé, khoảng ngày, khoá kho, băm sau khi nhập", () => {
  const d = db();
  const t = ve(d, lo(d));
  for (const [cot, giaTri] of [["ticket_code", "TA.khac"], ["valid_to", "2030-01-01"], ["valid_from", "2020-01-01"], ["storage_key", "vdt/khac"], ["content_hash", "h2"], ["batch_id", "b-zzz"]] as const) {
    assert.throws(() => d.prepare(`UPDATE vdt_ticket SET ${cot} = ? WHERE id = ?`).run(giaTri, t), /vdt_/, cot);
  }
});

test("phanBo chỉ đổi released_at (một lần, kèm lý do) và revealed_at (một lần); không đổi cột khác", () => {
  const d = db();
  const t = ve(d, lo(d));
  const a = phanBo(d, t);
  assert.throws(() => d.prepare(`UPDATE vdt_allocation SET order_id = 'o-2' WHERE id = ?`).run(a), /vdt_append_only/);
  assert.throws(() => d.prepare(`UPDATE vdt_allocation SET released_at = ? WHERE id = ?`).run(SAU, a), /vdt_append_only|CHECK/i, "trả mà thiếu lý do");
  d.prepare(`UPDATE vdt_allocation SET revealed_at = ?, updated_at = ? WHERE id = ?`).run(SAU, SAU, a);
  assert.throws(() => d.prepare(`UPDATE vdt_allocation SET revealed_at = ? WHERE id = ?`).run("2026-11-01T00:00:00.000Z", a), /vdt_append_only/, "ghi một lần");
  d.prepare(`UPDATE vdt_allocation SET released_at = ?, release_reason = 'DON_HUY', updated_at = ? WHERE id = ?`).run(SAU, SAU, a);
  assert.throws(() => d.prepare(`UPDATE vdt_allocation SET release_reason = 'THU_HOI' WHERE id = ?`).run(a), /vdt_append_only/, "đã trả: không sửa nữa");
});

test("kiểm ràng buộc giá trị: nhóm khách, khoảng ngày, trạng thái", () => {
  const d = db();
  assert.throws(() => lo(d, "INFANT"), /CHECK/i);
  const b = lo(d);
  assert.throws(() => ve(d, b, "2026-11-23", "2026-10-24"), /CHECK/i, "từ ngày sau đến ngày");
  assert.throws(() => ve(d, b, "24/10/2026", "2026-11-23"), /CHECK/i, "ngày không đúng dạng");
  const t = ve(d, b);
  assert.throws(() => doiTrangThai(d, t, "LOST"), /CHECK/i);
});

test("đường dẫn khách: băm duy nhất, không xoá, chỉ thu hồi một lần và đếm lượt mở", () => {
  const d = db();
  const them = (id: string, h: string) => d.prepare(`INSERT INTO vdt_guest_link (id, order_id, token_hash, expires_at, created_at, updated_at) VALUES (?, 'o-1', ?, ?, ?, ?)`).run(id, h, "2026-12-01", AT, AT);
  them("g1", "hash-1");
  assert.throws(() => them("g2", "hash-1"), /UNIQUE/i);
  assert.throws(() => d.prepare(`DELETE FROM vdt_guest_link WHERE id = 'g1'`).run(), /vdt_append_only/);
  d.prepare(`UPDATE vdt_guest_link SET opened_count = opened_count + 1 WHERE id = 'g1'`).run();
  assert.throws(() => d.prepare(`UPDATE vdt_guest_link SET token_hash = 'x' WHERE id = 'g1'`).run(), /vdt_append_only/);
  assert.throws(() => d.prepare(`UPDATE vdt_guest_link SET opened_count = 0 WHERE id = 'g1'`).run(), /vdt_append_only/, "bộ đếm chỉ tăng");
  d.prepare(`UPDATE vdt_guest_link SET revoked_at = ?, updated_at = ? WHERE id = 'g1'`).run(SAU, SAU);
  assert.throws(() => d.prepare(`UPDATE vdt_guest_link SET revoked_at = NULL WHERE id = 'g1'`).run(), /vdt_append_only/, "đã thu hồi không bật lại");
});

test("chặn kẽ hở người kiểm 31/10: lô VOID không sống lại; mã tour của lô đã có vé giữ không đổi được; vé chèn thẳng ALLOCATED / VOID bị chặn", () => {
  const d = db();
  const b = lo(d);
  const t = ve(d, b);
  d.prepare(`UPDATE vdt_batch SET catalog_code = 'VB350', updated_at = ? WHERE id = ?`).run(SAU, b); // chưa vé nào giữ chỗ: sửa được
  phanBo(d, t);
  assert.throws(() => d.prepare(`UPDATE vdt_batch SET catalog_code = 'V2D', updated_at = ? WHERE id = ?`).run(SAU, b), /vdt_one_way/);
  d.prepare(`UPDATE vdt_batch SET status = 'VOID', updated_at = ? WHERE id = ?`).run(SAU, b);
  assert.throws(() => d.prepare(`UPDATE vdt_batch SET status = 'ACTIVE', updated_at = ? WHERE id = ?`).run(SAU, b), /vdt_one_way/);
  for (const st of ["ALLOCATED", "VOID"]) {
    assert.throws(
      () =>
        d.prepare(
          `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, created_at, updated_at) VALUES (?, ?, ?, '2026-10-24', '2026-10-25', ?, 'jpg', 1, 'h', ?, ?, ?)`,
        ).run(`z-${st}`, lo(d), `TA.z-${st}`, `vdt/z-${st}`, st, AT, AT),
      /vdt_one_way/,
      st,
    );
  }
});

test("phân bổ chỉ chèn được cho vé ALLOCATED, đúng nhóm khách, lô ACTIVE", () => {
  const d = db();
  const t = ve(d, lo(d)); // AVAILABLE
  const them = (ticket: string, nhom: string) =>
    d.prepare(`INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, created_at, updated_at) VALUES ('x', ?, 'o', 's', ?, 1, ?, ?, ?)`).run(ticket, nhom, AT, AT, AT);
  assert.throws(() => them(t, "ADULT"), /vdt_one_way/, "vé còn AVAILABLE");
  doiTrangThai(d, t, "ALLOCATED");
  assert.throws(() => them(t, "CHILD"), /vdt_one_way/, "sai nhóm khách của lô");
  them(t, "ADULT");
});

test("dấu lưu kho / thu hồi / xoá kho ghi một lần; stored_at không về rỗng", () => {
  const d = db();
  const t = ve(d, lo(d));
  assert.throws(() => d.prepare(`UPDATE vdt_ticket SET stored_at = NULL WHERE id = ?`).run(t), /vdt_append_only/);
  d.prepare(`UPDATE vdt_ticket SET purged_at = ?, status = 'VOID', updated_at = ? WHERE id = ?`).run(SAU, SAU, t);
  assert.throws(() => d.prepare(`UPDATE vdt_ticket SET purged_at = NULL WHERE id = ?`).run(t), /vdt_append_only/);
});
