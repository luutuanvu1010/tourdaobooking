// ADR-0059 — XE TRÊN CHI TIẾT ĐƠN: route đọc `GET /api/van-chuyen/xe-cua-don/:orderId` (cổng office; thân hỏi trip.view + order.view KHÔNG ngữ cảnh). Chạy CẢ
// ứng dụng trên SQLite thật (tests/audit/harness.mjs), đồng hồ giả — ngày chạy 2027-03-11 (tests/audit/dieu-phoi-khung.mjs). Tên, SĐT, số giấy tờ GIẢ.
// Tiêu chí nghiệm thu của ADR: (2)(3) quyền từng vai + tài khoản lai, (4) chia hai xe / huỷ / suất đóng, (5) danh sách trắng, (6) lịch sử đơn không trip_*.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import {
  ACC, ADM, DRIVER, DRIVER2, DRIVER_PARTNER, FIELD, INTERN, PARTNER, SALES, SUP, batDongHo, chiTiet, don, setup, taoChuyen, uuid, xe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const LAI_SALES_FIELD = "abababab-abab-4bab-8bab-ababababab01";
const LAI_FIELD_INTERN = "abababab-abab-4bab-8bab-ababababab02";
const goiXe = (w: any, orderId: string, as: string) => w.call("GET", `/api/van-chuyen/xe-cua-don/${orderId}`, { as });

/** Xếp `soSuat` suất của chặng `legId` lên chuyến (qua route — một cửa mở suất). */
async function xep(w: any, tripId: string, legId: string, soSuat: number): Promise<void> {
  const c = await chiTiet(w, tripId);
  const r = await w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId, soSuat }] } });
  assert.equal(r.status, 200, r.text);
}

/**
 * Thế giới chung: đơn D1 (4 khách, HDV FIELD phụ trách) chia HAI xe (2 + 2); rút một suất khỏi xe thứ hai (suất đóng không tính); đơn D2 (2 khách) chỉ trên
 * một chuyến bị HUỶ; đơn D3 (1 khách) chưa xếp xe.
 */
async function theGioi() {
  const w = setup();
  seedStaff(w.sqlite, { id: LAI_SALES_FIELD, phone: "0900000071", name: "Lai Bán HDV", perms: ["SALES", "FIELD"] });
  seedStaff(w.sqlite, { id: LAI_FIELD_INTERN, phone: "0900000072", name: "Lai HDV Thực Tập", perms: ["FIELD", "INTERN"] });
  const d1 = await don(w, { soNguoi: 4, handler: FIELD });
  const d2 = await don(w, { soNguoi: 2 });
  const d3 = await don(w, { soNguoi: 1 });
  const xeA = xe(w);
  const xeB = xe(w);
  const xeC = xe(w);
  const A = await taoChuyen(w, { xe: xeA, taiXe: `pty-${DRIVER}` });
  const B = await taoChuyen(w, { xe: xeB, taiXe: `pty-${DRIVER2}` });
  const C = await taoChuyen(w, { xe: xeC, taiXe: `pty-${DRIVER}`, bd: "16:00", kt: "18:00" });
  await xep(w, A.chuyen.id, d1.legId, 2);
  await xep(w, B.chuyen.id, d1.legId, 2);
  const b = await chiTiet(w, B.chuyen.id);
  const rut = await w.call("POST", `/api/van-chuyen/chuyen/${B.chuyen.id}/rut`, {
    as: SALES, body: { version: b.chuyen.version, requestId: uuid(), suatIds: [b.suat.find((s: any) => s.loai === "PASSENGER").id] },
  });
  assert.equal(rut.status, 200, rut.text);
  await xep(w, C.chuyen.id, d2.legId, 2);
  const c = await chiTiet(w, C.chuyen.id);
  const huy = await w.call("POST", `/api/van-chuyen/chuyen/${C.chuyen.id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } });
  assert.equal(huy.status, 200, huy.text);
  const bien = (id: string) => w.q("SELECT plate_number p FROM vc_vehicle WHERE id = ?", id)[0].p as string;
  return { w, d1, d2, d3, bienA: bien(xeA), bienB: bien(xeB) };
}

test("ADR-0059 (4): chặng chia hai xe → hai dòng (biển số, tên tài xế, số khách mở, trạng thái); suất đã đóng không tính; chuyến huỷ không hiện; chặng chưa xếp → xe rỗng", async () => {
  const tat = batDongHo();
  try {
    const { w, d1, d2, d3, bienA, bienB } = await theGioi();
    const r = await goiXe(w, d1.id, SALES);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.chang.length, 1);
    assert.equal(r.json.chang[0].legId, d1.legId);
    const xeDs = [...r.json.chang[0].xe].sort((a: any, b: any) => a.bienSo.localeCompare(b.bienSo));
    assert.deepEqual(xeDs, [
      { bienSo: bienA, tenTaiXe: "Tài Xế Một", soKhach: 2, trangThai: "PLANNED" },
      { bienSo: bienB, tenTaiXe: "Tài Xế Hai", soKhach: 1, trangThai: "PLANNED" },
    ].sort((a, b) => a.bienSo.localeCompare(b.bienSo)), "hai xe; xe B còn 1 suất mở sau khi rút một suất");
    const huy = await goiXe(w, d2.id, SALES);
    assert.equal(huy.status, 200, huy.text);
    assert.deepEqual(huy.json, { chang: [{ legId: d2.legId, xe: [] }] }, "chuyến huỷ không hiện");
    // Ghi chú trung thực: lệnh huỷ đóng mọi suất của chuyến (loHuy — ALLOCS_CLOSE_ALL), nên ca này đi qua điều kiện "suất mở"; vế `t.status <> 'CANCELLED'` của
    // câu SQL là lớp phòng thủ thêm, không có đường dữ liệu hợp lệ nào để quan sát riêng nó.
    const chua = await goiXe(w, d3.id, SALES);
    assert.deepEqual(chua.json, { chang: [{ legId: d3.legId, xe: [] }] }, "chặng chưa xếp: có mục, xe rỗng");
  } finally {
    tat();
  }
});

test("ADR-0059 (2)(3): quyền — Bán hàng, Kế toán, Quản trị, Toàn quyền, lai Bán hàng + HDV thấy; HDV phụ trách, Đối tác, Thực tập, Tài xế đang lái, Tài xế đối tác, lai HDV + Thực tập → 403; đơn lạ → 404 (sau 403)", async () => {
  const tat = batDongHo();
  try {
    const { w, d1 } = await theGioi();
    for (const as of [SALES, ACC, ADM, SUP, LAI_SALES_FIELD]) {
      const r = await goiXe(w, d1.id, as);
      assert.equal(r.status, 200, `${as}: ${r.text}`);
      assert.equal(r.json.chang[0].xe.length, 2, as);
    }
    // Đối chứng: HDV (FIELD) đang phụ trách đơn d1 (xem được đơn); DRIVER đang lái chuyến chở khách của d1 — vẫn 403 ở route này.
    assert.equal((await w.call("GET", `/api/orders/${d1.id}`, { as: FIELD })).status, 200, "HDV phụ trách xem được đơn");
    assert.ok(w.q("SELECT 1 FROM vc_trip_driver WHERE driver_party_id = ? AND valid_to_at IS NULL", `pty-${DRIVER}`).length >= 1, "DRIVER đang lái");
    for (const as of [FIELD, PARTNER, INTERN, DRIVER, DRIVER_PARTNER, LAI_FIELD_INTERN]) {
      const r = await goiXe(w, d1.id, as);
      assert.equal(r.status, 403, `${as}: ${r.text}`);
      assert.doesNotMatch(r.text, /79C/, `${as}: 403 không kèm biển số`);
    }
    assert.equal((await goiXe(w, uuid(), SALES)).status, 404, "đơn không tồn tại → 404");
    assert.equal((await goiXe(w, uuid(), FIELD)).status, 403, "403 đứng TRƯỚC 404");
  } finally {
    tat();
  }
});

test("ADR-0059 (5)(6): danh sách trắng — đúng khoá, không SĐT / tên khách / khoá nơi / id chuyến; lịch sử đơn không có dòng trip_*; route không ghi nhật ký", async () => {
  const tat = batDongHo();
  try {
    const { w, d1 } = await theGioi();
    const nk0 = w.q("SELECT count(*) n FROM audit_log")[0].n;
    const r = await goiXe(w, d1.id, SALES);
    assert.equal(r.status, 200, r.text);
    assert.equal(w.q("SELECT count(*) n FROM audit_log")[0].n, nk0, "route đọc không ghi nhật ký");
    assert.deepEqual(Object.keys(r.json), ["chang"]);
    for (const c of r.json.chang) {
      assert.deepEqual(Object.keys(c).sort(), ["legId", "xe"]);
      for (const x of c.xe) assert.deepEqual(Object.keys(x).sort(), ["bienSo", "soKhach", "tenTaiXe", "trangThai"]);
    }
    const sdt = w.q("SELECT phone FROM staff").map((s: any) => s.phone as string);
    for (const s of [...sdt, "0912345678"]) assert.ok(!r.text.includes(s), `không SĐT ${s}`);
    assert.doesNotMatch(r.text, /Dò Tìm/, "không tên khách, không nơi đón chữ tự do");
    assert.doesNotMatch(r.text, /\b[LT]:[0-9a-f-]{8,}/, "không khoá so sánh nơi");
    for (const t of w.q("SELECT id, code FROM vc_trip")) assert.ok(!r.text.includes(t.id) && !r.text.includes(t.code), "không id / mã chuyến");
    // (6) Lịch sử đơn: nhật ký chuyến vẫn không gắn đơn (order_id NULL) — không dòng trip_* nào ở GET /api/orders/:id.
    assert.ok(w.q("SELECT count(*) n FROM audit_log WHERE action LIKE 'trip_%'")[0].n >= 4, "chống bài rỗng: đã có nhật ký chuyến");
    const o = await w.call("GET", `/api/orders/${d1.id}`, { as: SUP });
    assert.equal(o.status, 200, o.text);
    assert.ok(o.json.history.length > 0, "chống bài rỗng: lịch sử đơn có dòng");
    assert.ok(!o.json.history.some((h: any) => String(h.action).startsWith("trip_")), JSON.stringify(o.json.history.map((h: any) => h.action)));
  } finally {
    tat();
  }
});
