// Kho tệp vé điện tử (ADR-0153 Đ1 mục 7; kế hoạch Task 4a): đặt / xoá đối tượng R2 SAU lô D1; lỗi kho không ném, để lại dòng "dở dang" / "chờ xoá".
import { test } from "node:test";
import assert from "node:assert/strict";
import { datVeVaoKho, xoaKhoiKho } from "./kho-tep.ts";
import { cauDatChoXoa, listChoXoa } from "./repository.ts";
import { AT, chayLo, d1That, dem, r2Gia, taoCsdl, themLo } from "../../khung-thu-ve.test.ts";
import { taoKhoaNgauNhien } from "../../shared/tep-dinh-kem.ts";

const BYTES = new Uint8Array([0xff, 0xd8, 0xff]);
function veDoDang(d: ReturnType<typeof taoCsdl>, lo: string, id: string) {
  d.prepare(
    `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, created_at, updated_at)
     VALUES (?, ?, ?, '2026-10-01', '2026-11-30', ?, 'jpg', 3, 'h', 'AVAILABLE', ?, ?)`,
  ).run(id, lo, `TA.${id}`, `vdt/${id}`, AT, AT);
}
const luc = () => "2026-10-31T05:00:00.000Z";
const im = (f: () => Promise<unknown>) => { const goc = console.error; console.error = () => {}; return f().finally(() => { console.error = goc; }); };

test("khoaVdt: khoá kho có tiền tố vdt/ + 128 bit ngẫu nhiên, không mang nghĩa", () => {
  const k = taoKhoaNgauNhien("vdt");
  assert.match(k, /^vdt\/[0-9a-f]{32}$/);
  assert.notEqual(k, taoKhoaNgauNhien("vdt"));
});

test("datVeVaoKho: đặt từng vé của lô, đánh dấu đã lưu; khoá lấy từ D1, không từ đầu vào", async () => {
  const d = taoCsdl();
  const lo = themLo(d);
  veDoDang(d, lo, "t-1");
  veDoDang(d, lo, "t-2");
  const r2 = r2Gia();
  const chua = await datVeVaoKho(d1That(d), r2, { batchId: lo, ve: [{ id: "t-1", bytes: BYTES, loai: "jpg" }, { id: "t-2", bytes: BYTES, loai: "jpg" }], luc });
  assert.equal(chua, 0);
  assert.deepEqual([...r2.kho.keys()].sort(), ["vdt/t-1", "vdt/t-2"]);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE stored_at IS NOT NULL"), 2);
});

test("datVeVaoKho: không đặt vé không có dòng trong D1 (khoá do đầu vào đưa)", async () => {
  const d = taoCsdl();
  const lo = themLo(d);
  veDoDang(d, lo, "t-1");
  const r2 = r2Gia();
  const chua = await datVeVaoKho(d1That(d), r2, { batchId: lo, ve: [{ id: "t-1", bytes: BYTES, loai: "jpg" }, { id: "t-la", bytes: BYTES, loai: "jpg" }], luc });
  assert.equal(chua, 1);
  assert.deepEqual([...r2.kho.keys()], ["vdt/t-1"]);
});

test("loD1ChayTruocKhiDatKho: vé phải có dòng D1 trước khi kho nhận byte (kho thử ghi nhận thứ tự)", async () => {
  const d = taoCsdl();
  const lo = themLo(d);
  const r2 = r2Gia();
  // Chưa có dòng vé nào ⇒ kho không nhận gì.
  await datVeVaoKho(d1That(d), r2, { batchId: lo, ve: [{ id: "t-1", bytes: BYTES, loai: "jpg" }], luc });
  assert.deepEqual(r2.nhatKy, []);
});

test("kho hỏng khi đặt: không ném, vé quyết xoá (VOID), không bao giờ được giữ chỗ", async () => {
  const d = taoCsdl();
  const lo = themLo(d);
  veDoDang(d, lo, "t-1");
  const r2 = r2Gia(new Set(["vdt/t-1"]));
  const chua = await im(() => datVeVaoKho(d1That(d), r2, { batchId: lo, ve: [{ id: "t-1", bytes: BYTES, loai: "jpg" }], luc }));
  assert.equal(chua, 1);
  const v = d.prepare("SELECT status, stored_at, purged_at, r2_deleted_at FROM vdt_ticket WHERE id = 't-1'").get() as Record<string, string | null>;
  assert.equal(v.status, "VOID");
  assert.equal(v.stored_at, null);
  assert.ok(v.purged_at);
  assert.ok(v.r2_deleted_at, "đã thử xoá đối tượng (xoá không lỗi khi đối tượng không có)");
});

test("xoaKhoiKho: xoá đối tượng của vé đã thu hồi rồi đánh dấu; chạy lại không lỗi; vé còn chờ xoá được liệt kê", async () => {
  const d = taoCsdl();
  const lo = themLo(d);
  veDoDang(d, lo, "t-1");
  chayLo(d, [cauDatChoXoa(d1That(d), "t-1", luc(), null)].map((c) => c as never));
  assert.deepEqual((await listChoXoa(d1That(d), 10)).map((x) => x.id), ["t-1"]);
  const r2 = r2Gia();
  r2.kho.set("vdt/t-1", BYTES);
  const kq = await xoaKhoiKho(d1That(d), r2, await listChoXoa(d1That(d), 10), luc);
  assert.deepEqual(kq, { daXoa: 1, loi: 0 });
  assert.equal(r2.kho.size, 0);
  assert.deepEqual(await listChoXoa(d1That(d), 10), []);
  assert.deepEqual(await xoaKhoiKho(d1That(d), r2, [], luc), { daXoa: 0, loi: 0 });
});

test("giữ chỗ bỏ qua vé chưa lưu vào kho (stored_at rỗng)", async () => {
  const d = taoCsdl();
  const lo = themLo(d);
  veDoDang(d, lo, "t-1"); // dở dang: chưa có stored_at
  const { soanCapVe } = await import("./cap-ve.ts");
  const { nhatKyThu } = await import("../../khung-thu-ve.test.ts");
  chayLo(d, soanCapVe(d1That(d), { orderId: "o", serviceId: "s", catalogCode: "V2D", ngayDi: "2026-10-24", pax: { adult: 1, child: 0, senior: 0, infant: 0 } }, null, AT, nhatKyThu(d1That(d))).cau);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation"), 0);
});
