// ĐỒNG BỘ CHUYẾN THEO ĐƠN qua ROUTE THẬT (ADR-0104 Đ2; kế hoạch NT-5, T2.5–T2.12). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả 2027-03-11 06:00 giờ VN
// (tests/audit/dieu-phoi-khung.mjs). Lệnh đơn (huỷ, bỏ / thay / sửa chặng, sửa khách, sửa số khách — cả đường HDV) chạy MỘT lô: câu đơn trước, khúc chuyến sau
// (mỗi chuyến một dấu lệnh + request_id riêng). Tên khách, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, DRIVER2, FIELD, LOC, NGAY, SALES, batDongHo, chiTiet, chuyenSan, denGio, don, setup, taoChuyen, thanhTaiXe, tienDo, uuid, xe, xepHet } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { app, seedStaff } from "../../../tests/audit/harness.mjs";
import { nguoiNhanDay } from "../../shared/web-push.ts";
import { CAU_NHAC_XE_DANG_CHAY } from "../../shared/dong-bo-chuyen.ts";

type W = any;
/** Suất khách CÒN MỞ của chặng trên chuyến, theo mã suất. */
const moCua = (w: W, tripId: string, legId: string): { id: string; k: string | null; b: string; a: string }[] =>
  w.q("SELECT id, passenger_key k, board_stop_id b, alight_stop_id a FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER' ORDER BY id",
    tripId, legId).map((r: any) => ({ ...r }));
/** Suất đã đóng của chuyến: mã đóng + khoá người. */
const daDong = (w: W, tripId: string): { r: string; k: string | null }[] =>
  w.q("SELECT close_reason r, passenger_key k FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NOT NULL ORDER BY id", tripId).map((r: any) => ({ ...r }));
const lyDo = async (w: W, tripId: string): Promise<string[]> => (await chiTiet(w, tripId)).chuyen.lyDoGiu.map((l: any) => l.ma).sort();
const nhatKyDongBo = (w: W): { id: string; staff_id: string; detail: string; order_id: string | null }[] =>
  w.q("SELECT id, staff_id, detail, order_id FROM audit_log WHERE action = 'trip_order_synced' ORDER BY rowid").map((r: any) => ({ ...r }));
const suKien = (w: W, id: string) => ({ ...w.q("SELECT kind, created_by, count, decided_mode, trip_id, request_id FROM vc_trip_event WHERE id = ?", id)[0] });
/** Tin chuyến "khách đổi" (ADR-0104 Đ2.10) trong hộp thông báo của `as`. */
const tinKhachDoi = async (w: W, as: string): Promise<{ cau: string; lienKet: string }[]> =>
  (await w.call("GET", "/api/thong-bao", { as })).json.tin.filter((x: any) => x.loai === "chuyen" && /Đơn vừa đổi khách/.test(x.cau)).map((x: any) => ({ cau: x.cau, lienKet: x.lienKet }));
/** Người nhận gõ cửa cho dòng nhật ký `id` (đường gốc lắp ráp `baoThayDoiChuyen`: `dongChuyenTheoId` → `nguoiNhanDay`, cùng hàm với hộp). */
const TAI_KHOAN = [
  { id: DRIVER, permissions: ["DRIVER"], partyId: `pty-${DRIVER}` }, { id: DRIVER2, permissions: ["DRIVER"], partyId: `pty-${DRIVER2}` },
  { id: SALES, permissions: ["SALES"], partyId: null }, { id: FIELD, permissions: ["FIELD"], partyId: null },
];
async function goCua(w: W, id: string): Promise<string[]> {
  const kq = await app.dongChuyenTheoId(w.env.DB, id, (q: any) => app.chuyenChoTinTheoId(w.env.DB, q));
  assert.ok(kq, "có dòng gõ cửa");
  return nguoiNhanDay(TAI_KHOAN as any, { chuyen: kq.dong }, new Date(Date.parse(kq.dong.luc) + 1).toISOString()).sort();
}
const svcId = (w: W, orderId: string): string => w.q("SELECT id FROM order_service WHERE order_id = ?", orderId)[0].id;
/** Văn phòng sửa số khách (ADR-0063 D1) — `adult` người lớn cho dịch vụ duy nhất của đơn. */
const suaSoKhach = (w: W, orderId: string, adult: number, as = SALES) =>
  w.call("POST", `/api/orders/${orderId}/money-edit`, { as, body: { lyDo: "KHAC", services: [{ id: svcId(w, orderId), pax: { adult, child: 0, senior: 0, infant: 0 } }] } });

test("NT-5 bớt khách (văn phòng sửa số khách 3 → 2): còn suất chưa tên → máy đóng suất chưa tên (REMOVED) trong CÙNG lô; nhật ký + sự kiện mang người sửa; lý do giữ THUA_SUAT không xuất hiện", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 3, ten: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 3);
    assert.equal(moCua(w, t.chuyen.id, d.legId).filter((s) => s.k === null).length, 1, "một suất chưa tên");
    const r = await suaSoKhach(w, d.id, 2);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    const mo = moCua(w, t.chuyen.id, d.legId);
    assert.equal(mo.length, 2);
    assert.ok(mo.every((s) => s.k !== null), "còn đúng hai suất có tên");
    assert.deepEqual(daDong(w, t.chuyen.id), [{ r: "REMOVED", k: null }]);
    const nk = nhatKyDongBo(w);
    assert.equal(nk.length, 1);
    assert.equal(nk[0]!.staff_id, SALES);
    assert.equal(nk[0]!.order_id, null);
    assert.equal(nk[0]!.detail, `${t.chuyen.ma}: máy cập nhật theo đơn — ${d.code} (bớt khách): trả 1 ghế`);
    assert.deepEqual(suKien(w, nk[0]!.id), { kind: "ALLOCATION_ORDER_SYNCED", created_by: SALES, count: 1, decided_mode: "NGUOI", trip_id: t.chuyen.id, request_id: suKien(w, nk[0]!.id).request_id });
    assert.deepEqual(await lyDo(w, t.chuyen.id), []);
  } finally {
    tat();
  }
});

test("NT-5 bớt khách: mọi suất còn lại mang tên người vẫn trong đơn → máy KHÔNG đoán, giữ THUA_SUAT; lệnh đơn 200, chuyến không đổi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const truoc = moCua(w, t.chuyen.id, d.legId);
    const r = await suaSoKhach(w, d.id, 1);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), truoc);
    assert.deepEqual(nhatKyDongBo(w), []);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("THUA_SUAT"));
  } finally {
    tat();
  }
});

test("NT-5 tăng khách (văn phòng sửa số khách 3 → 5, chặng đang thiếu 1 suất), chặng chỉ trên chuyến này, xe còn chỗ → mở thêm ĐÚNG 2 suất cùng điểm lên / xuống; không lấp phần thiếu cũ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 3, ten: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2); // thiếu 1 từ trước (THIEU_SUAT) — máy không lấp
    const truoc = moCua(w, t.chuyen.id, d.legId);
    const r = await suaSoKhach(w, d.id, 5);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    const mo = moCua(w, t.chuyen.id, d.legId);
    assert.equal(mo.length, 4, "2 cũ + 2 vừa tăng");
    const moi = mo.filter((s) => !truoc.some((x) => x.id === s.id));
    assert.ok(moi.every((s) => s.b === truoc[0]!.b && s.a === truoc[0]!.a), "cùng điểm lên / xuống");
    assert.ok(moi.every((s) => s.k === null), "không còn khoá người rảnh → suất chưa tên");
    const nk = nhatKyDongBo(w);
    assert.equal(nk.length, 1);
    assert.equal(nk[0]!.detail, `${t.chuyen.ma}: máy cập nhật theo đơn — ${d.code} (thêm khách): thêm 2 ghế`);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("THIEU_SUAT"), "phần thiếu cũ vẫn giữ");
  } finally {
    tat();
  }
});

test("NT-5 tăng khách: xe hết chỗ (LC-02) → ADR-0128 Q3 tất cả hoặc không: không mở ghế nào, giữ THIEU_SUAT; lệnh đơn 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w, 3), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const r = await suaSoKhach(w, d.id, 5);
    assert.equal(r.status, 200, r.text);
    assert.equal(moCua(w, t.chuyen.id, d.legId).length, 2, "xe 3 chỗ, đã giữ 2, cần thêm 3 (còn 1): không mở ghế nào");
    assert.ok((await lyDo(w, t.chuyen.id)).includes("THIEU_SUAT"));
  } finally {
    tat();
  }
});

test("NT-5 thua cổng đơn (sửa số khách: người khác vừa ghi dòng điều chỉnh cùng số thứ tự) → 409, KHÔNG suất nào đổi, không nhật ký chuyến", async () => {
  const tat = batDongHo();
  let orderId = "";
  try {
    const w = setup({
      chenGiuaDocVaGhi: async () => {
        // người khác ghi trước dòng điều chỉnh số 1 của đơn (chỉ mục duy nhất `seq`) — lô của lệnh này đụng chỉ mục.
        w.sqlite.prepare("INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, 1, '[]', '[]', 0, 0)").run(uuid(), orderId);
      },
    });
    const d = await don(w, { soNguoi: 3, ten: 2 });
    orderId = d.id;
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 3);
    const truoc = moCua(w, t.chuyen.id, d.legId);
    const r = await suaSoKhach(w, d.id, 2);
    assert.equal(r.status, 409, r.text);
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), truoc);
    assert.deepEqual(nhatKyDongBo(w), []);
  } finally {
    tat();
  }
});

test("NT-5 thua cổng chuyến (chuyến đổi phiên bản giữa lúc máy đọc và lúc ghi) → lệnh đơn 200, chuyến giữ nguyên, phản hồi báo cập nhật tay", async () => {
  const tat = batDongHo();
  let tripId = "";
  try {
    const w = setup({ chenGiuaDocVaGhi: async () => void w.sqlite.prepare("UPDATE vc_trip SET version = version + 1 WHERE id = ?").run(tripId) });
    const d = await don(w, { soNguoi: 3, ten: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    tripId = t.chuyen.id;
    await xepHet(w, t, d, 3);
    const truoc = moCua(w, t.chuyen.id, d.legId);
    const r = await suaSoKhach(w, d.id, 2);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: true });
    assert.equal(w.q("SELECT count(*) n FROM order_money_adjustment WHERE order_id = ?", d.id)[0].n, 1, "lệnh đơn thắng");
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), truoc);
    assert.deepEqual(nhatKyDongBo(w), []);
  } finally {
    tat();
  }
});

/** Xếp `soSuat` người của chặng lên chuyến (qua route). */
async function xep(w: W, tripId: string, legId: string, soSuat: number) {
  const r = await w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as: SALES, body: { version: (await chiTiet(w, tripId)).chuyen.version, requestId: uuid(), chang: [{ legId, soSuat }] } });
  assert.equal(r.status, 200, r.text);
}
const huyVanPhong = (w: W, orderId: string, as = SALES) => w.call("POST", `/api/orders/${orderId}/status`, { as, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
const huyHdv = (w: W, orderId: string) => w.call("POST", `/api/orders/${orderId}/handler-cancel`, { as: FIELD, body: { reason: "customer_requested" } });

test("NT-5 huỷ đơn (văn phòng), chặng trên HAI chuyến PLANNED dưới mốc → cả hai chuyến đóng suất REMOVED cùng lệnh, mỗi chuyến dấu lệnh + request_id riêng; DON_DA_HUY biến mất; nhật ký + sự kiện mang người huỷ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const a = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const b = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}` });
    await xep(w, a.chuyen.id, d.legId, 1);
    await xep(w, b.chuyen.id, d.legId, 1);
    denGio("08:00"); // chuyến 12:30 — dưới mốc 6 giờ: máy không hỏi mốc
    const r = await huyVanPhong(w, d.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    for (const t of [a, b]) {
      assert.deepEqual(moCua(w, t.chuyen.id, d.legId), [], `${t.chuyen.ma}: không còn suất mở`);
      assert.deepEqual(daDong(w, t.chuyen.id).map((x) => x.r), ["REMOVED"]);
      assert.deepEqual(await lyDo(w, t.chuyen.id), [], `${t.chuyen.ma}: không giữ DON_DA_HUY`);
    }
    const nk = nhatKyDongBo(w);
    assert.equal(nk.length, 2);
    assert.ok(nk.every((x) => x.staff_id === SALES));
    const ev = nk.map((x) => suKien(w, x.id));
    assert.deepEqual(ev.map((e) => e.trip_id).sort(), [a.chuyen.id, b.chuyen.id].sort());
    assert.ok(ev.every((e) => e.kind === "ALLOCATION_ORDER_SYNCED" && e.created_by === SALES));
    assert.equal(new Set(ev.map((e) => e.request_id)).size, 2, "request_id riêng từng khúc");
    assert.equal(new Set(nk.map((x) => x.id)).size, 2, "dấu lệnh riêng từng khúc");
    assert.match(nk[0]!.detail, new RegExp(`máy cập nhật theo đơn — ${d.code} \\(đơn huỷ\\): trả 1 ghế$`));
    // Đ2.10 (T2.15): mỗi tài xế đang lái nhận ĐÚNG MỘT tin cho chuyến của mình; người huỷ (Bán hàng), Quản trị không; gõ cửa đúng tài xế của khúc.
    assert.deepEqual(await tinKhachDoi(w, DRIVER), [{ cau: `Đơn vừa đổi khách ở chuyến ${a.chuyen.ma} ngày 11/03 — mở để xem`, lienKet: `/cuoc-chuyen?id=${a.chuyen.id}` }]);
    assert.deepEqual(await tinKhachDoi(w, DRIVER2), [{ cau: `Đơn vừa đổi khách ở chuyến ${b.chuyen.ma} ngày 11/03 — mở để xem`, lienKet: `/cuoc-chuyen?id=${b.chuyen.id}` }]);
    assert.deepEqual(await tinKhachDoi(w, SALES), [], "người huỷ không tự nhận");
    assert.deepEqual(await tinKhachDoi(w, ADM), [], "văn phòng không nhận");
    for (const x of nk) {
      const tripId = suKien(w, x.id).trip_id;
      assert.deepEqual(await goCua(w, x.id), [tripId === a.chuyen.id ? DRIVER : DRIVER2], "gõ cửa đúng tài xế đang lái chuyến của khúc");
    }
  } finally {
    tat();
  }
});

test("NT-5 huỷ đơn qua đường HDV (handler-cancel) → như văn phòng: suất đóng REMOVED, nhật ký mang HDV; HDV gọi route xếp → 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2, handler: FIELD });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const cam = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/phan-bo`, { as: FIELD, body: { version: (await chiTiet(w, t.chuyen.id)).chuyen.version, requestId: uuid(), chang: [{ legId: d.legId, soSuat: 1 }] } });
    assert.equal(cam.status, 403, cam.text);
    const r = await huyHdv(w, d.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), []);
    assert.deepEqual(daDong(w, t.chuyen.id).map((x) => x.r), ["REMOVED", "REMOVED"]);
    const nk = nhatKyDongBo(w);
    assert.equal(nk.length, 1);
    assert.equal(nk[0]!.staff_id, FIELD);
    assert.equal(suKien(w, nk[0]!.id).created_by, FIELD);
    assert.doesNotMatch(r.text, new RegExp(`${t.chuyen.ma}|79C|Tài Xế`), "phản hồi cho HDV không dữ liệu chuyến");
    // Đ2.10: tài xế đang lái nhận đúng một tin; HDV (người huỷ, không trip.view) không.
    assert.equal((await tinKhachDoi(w, DRIVER)).length, 1);
    assert.deepEqual(await tinKhachDoi(w, FIELD), []);
  } finally {
    tat();
  }
});

test("NT-5 huỷ đơn có khách CHỜ ĐÓN trên xe ĐANG CHẠY → không suất, không cờ báo huỷ nào đổi; phản hồi đúng câu nhắc Báo huỷ, không mã chuyến / biển số / tài xế", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const c = await chuyenSan(w, { soNguoi: 2 });
    denGio("12:40");
    const x = await tienDo(w, "van-phong", c.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    const truoc = w.q("SELECT id, valid_to_at, status, office_cancel_at FROM vc_trip_allocation WHERE trip_id = ? ORDER BY id", c.id).map((r: any) => ({ ...r }));
    const r = await huyVanPhong(w, c.don.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: CAU_NHAC_XE_DANG_CHAY, capNhatTay: false });
    assert.equal(r.json.dongBoChuyen.nhac, "Đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ");
    assert.deepEqual(w.q("SELECT id, valid_to_at, status, office_cancel_at FROM vc_trip_allocation WHERE trip_id = ? ORDER BY id", c.id).map((r: any) => ({ ...r })), truoc);
    assert.deepEqual(nhatKyDongBo(w), []);
    assert.doesNotMatch(JSON.stringify(r.json.dongBoChuyen), new RegExp(`${c.ma}|79C|Tài Xế`));
  } finally {
    tat();
  }
});

test("NT-5 thua cổng đơn (huỷ: người khác vừa sửa đơn — đổi updated_at — giữa lúc đọc và lúc ghi) → 409, KHÔNG suất nào đổi, không nhật ký chuyến", async () => {
  const tat = batDongHo();
  let orderId = "";
  try {
    const w = setup({ chenGiuaDocVaGhi: async () => void w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(new Date(Date.now() + 1000).toISOString(), orderId) });
    const d = await don(w, { soNguoi: 2 });
    orderId = d.id;
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const truoc = moCua(w, t.chuyen.id, d.legId);
    const r = await huyVanPhong(w, d.id);
    assert.equal(r.status, 409, r.text);
    assert.equal(w.q("SELECT status FROM orders WHERE id = ?", d.id)[0].status, "confirmed");
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), truoc);
    assert.deepEqual(nhatKyDongBo(w), []);
  } finally {
    tat();
  }
});

// ---- Chặng: bỏ (điểm gọi 3), thay (điểm gọi 8), sửa số người chiều về (điểm gọi 4) ------------------------------------------------------------------------
const layDon = async (w: W, id: string) => (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order;
const CHANG_MOI = { direction: "OUT", pickupDate: NGAY, pickupTime: "13:30", pickupLocationId: null, pickupPlace: "Khách sạn Mới", dropoffLocationId: LOC, dropoffPlace: "" };

test("NT-5 bỏ chặng (văn phòng) → suất của chặng đóng REMOVED cùng lệnh; không giữ CHANG_DA_DONG; nhật ký nguyên nhân 'bỏ chặng'", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const o = await layDon(w, d.id);
    const r = await w.call("POST", `/api/orders/${d.id}/legs/${d.legId}/close`, { as: SALES, body: { expectedUpdatedAt: o.services[0].legs[0].updatedAt, reasonCode: "NOT_NEEDED" } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), []);
    assert.deepEqual(daDong(w, t.chuyen.id).map((x) => x.r), ["REMOVED", "REMOVED"]);
    assert.deepEqual(await lyDo(w, t.chuyen.id), []);
    assert.match(nhatKyDongBo(w)[0]!.detail, new RegExp(`${d.code} \\(bỏ chặng\\): trả 2 ghế$`));
  } finally {
    tat();
  }
});

test("NT-5 thay chặng (C14) → suất của chặng CŨ đóng REMOVED cùng lệnh; chặng mới chưa có suất", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const o = await layDon(w, d.id);
    const r = await w.call("POST", `/api/orders/${d.id}/legs/${d.legId}/replace`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, leg: CHANG_MOI } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), []);
    assert.deepEqual(daDong(w, t.chuyen.id).map((x) => x.r), ["REMOVED", "REMOVED"]);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE valid_to_at IS NULL AND kind = 'PASSENGER'")[0].n, 0, "chặng mới chưa có suất");
    assert.deepEqual(await lyDo(w, t.chuyen.id), []);
  } finally {
    tat();
  }
});

/** Đơn đã xác nhận: dịch vụ 4 khách (2 có tên), CHỈ một chặng VỀ đón 13:00 ở bến, số người chiều về `ve`. */
async function donVe(w: W, ve: number) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678",
      services: [{
        kind: "catalog", catalogCode: "ZA1", pax: { adult: 4, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
        legs: [{ direction: "RETURN", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm", paxOverride: ve }],
      }],
      passengers: [{ fullName: "Khách Dò Tìm 1", birthYear: 1990, paxCode: "adult" }, { fullName: "Khách Dò Tìm 2", birthYear: 1991, paxCode: "adult" }],
    },
  });
  assert.equal(r.status, 201, r.text);
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return { id: r.json.order.id as string, code: r.json.order.orderCode as string, legId: r.json.order.services[0].legs[0].id as string };
}
const suaVe = async (w: W, d: { id: string; legId: string }, ve: number) => {
  const l = (await layDon(w, d.id)).services[0].legs[0];
  return w.call("PUT", `/api/orders/${d.id}/legs/${d.legId}`, {
    as: SALES,
    body: { expectedUpdatedAt: l.updatedAt, leg: { direction: "RETURN", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm", paxOverride: ve } },
  });
};

test("NT-5 sửa chặng: số người chiều về 3 → 2 (bớt) → đóng suất chưa tên; 2 → 4 (tăng 2) → mở thêm đúng 2 suất", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donVe(w, 3);
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 3);
    const bot = await suaVe(w, d, 2);
    assert.equal(bot.status, 200, bot.text);
    assert.deepEqual(bot.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    assert.equal(moCua(w, t.chuyen.id, d.legId).length, 2);
    assert.deepEqual(daDong(w, t.chuyen.id), [{ r: "REMOVED", k: null }]);
    const tang = await suaVe(w, d, 4);
    assert.equal(tang.status, 200, tang.text);
    assert.equal(moCua(w, t.chuyen.id, d.legId).length, 4);
    assert.deepEqual(nhatKyDongBo(w).map((x) => x.detail.replace(/^.*— /, "")), [`${d.code} (bớt khách): trả 1 ghế`, `${d.code} (thêm khách): thêm 2 ghế`]);
  } finally {
    tat();
  }
});

test("NT-5 sửa chặng CHỈ giờ / nơi (VK1-B) → máy không đổi suất nào (giờ / nơi vẫn theo giữ + nút); lệnh đơn 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const truoc = moCua(w, t.chuyen.id, d.legId);
    const l = (await layDon(w, d.id)).services[0].legs[0];
    const r = await w.call("PUT", `/api/orders/${d.id}/legs/${d.legId}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { ...CHANG_MOI, pickupTime: "13:00" } } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), truoc);
    assert.deepEqual(nhatKyDongBo(w), []);
  } finally {
    tat();
  }
});

test("NT-5 vượt trần 74 câu phần chuyến (huỷ đơn 2 dịch vụ × 40 khách trên một xe) → không câu chuyến nào chạy, lệnh đơn 200, phản hồi capNhatTay; chuyến giữ DON_DA_HUY", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const dv = (gio: string) => ({
      kind: "catalog", catalogCode: "ZA1", pax: { adult: 40, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
      legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: gio, pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }],
    });
    const tao = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678", services: [dv("13:00"), dv("13:10")], passengers: [] } });
    assert.equal(tao.status, 201, tao.text);
    const o = tao.json.order;
    assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
    const taiXeD = "66666666-6666-4666-8666-66666666666d";
    seedStaff(w.sqlite, { id: taiXeD, phone: "0900000036", name: "Tài Xế Hạng D", perms: ["DRIVER"] });
    thanhTaiXe(w, `pty-${taiXeD}`, { hang: "D" }); // xe 90 chỗ cần hạng D
    const t = await taoChuyen(w, { xe: xe(w, 90), taiXe: `pty-${taiXeD}` });
    const r0 = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/phan-bo`, {
      as: SALES, body: { version: (await chiTiet(w, t.chuyen.id)).chuyen.version, requestId: uuid(), chang: o.services.map((x: any) => ({ legId: x.legs[0].id, soSuat: 40 })) },
    });
    assert.equal(r0.status, 200, r0.text);
    const r = await huyVanPhong(w, o.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: true });
    assert.equal(w.q("SELECT status FROM orders WHERE id = ?", o.id)[0].status, "cancelled", "lệnh đơn thắng");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER'", t.chuyen.id)[0].n, 80, "không câu chuyến nào chạy");
    assert.deepEqual(nhatKyDongBo(w), []);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("DON_DA_HUY"));
  } finally {
    tat();
  }
});

// ---- Sửa danh sách khách (điểm gọi 5) ---------------------------------------------------------------------------------------------------------------------
const khoaCuaDon = (w: W, orderId: string): string[] =>
  w.q(`SELECT p.person_key k FROM ord_passenger p WHERE p.order_id = ? AND p.voided_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL) ORDER BY p.person_key`, orderId).map((r: any) => r.k);
async function doiKhach(w: W, orderId: string, huy: string[], them: string[]) {
  const ds = (await w.call("GET", `/api/orders/${orderId}/passengers`, { as: SALES })).json;
  return w.call("POST", `/api/orders/${orderId}/passengers`, {
    as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: them.map((fullName) => ({ fullName, birthYear: 1980, paxCode: "adult" })), sua: [], huy },
  });
}

test("NT-5 đổi người (huỷ A, thêm C trong MỘT lệnh) → suất mang A đóng PASSENGER_CHANGED, suất mới mang C cùng lô; không giữ KHACH_DA_DOI; nhật ký 'đổi người', không tên", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const [a, b] = khoaCuaDon(w, d.id);
    const r = await doiKhach(w, d.id, [a!], ["Khách Thay Thế"]);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    const c = khoaCuaDon(w, d.id).find((k) => k !== b)!;
    assert.deepEqual(daDong(w, t.chuyen.id), [{ r: "PASSENGER_CHANGED", k: a }]);
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId).map((x) => x.k).sort(), [b, c].sort());
    assert.deepEqual(await lyDo(w, t.chuyen.id), []);
    const nk = nhatKyDongBo(w);
    assert.equal(nk.length, 1);
    assert.match(nk[0]!.detail, new RegExp(`${d.code} \\(đổi người\\): trả 1 ghế, thêm 1 ghế$`));
    assert.doesNotMatch(nk[0]!.detail, /Khách|1980/);
  } finally {
    tat();
  }
});

test("NT-5 (thêm từ kế hoạch) hai chuyến CÙNG chặng, đổi hai người trong MỘT lệnh → khoá người mở lại không trùng nhau (không vấp chỉ mục chặng + người), lệnh đơn 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const x1 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const x2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}` });
    await xep(w, x1.chuyen.id, d.legId, 1);
    await xep(w, x2.chuyen.id, d.legId, 1);
    const [a, b] = khoaCuaDon(w, d.id);
    const r = await doiKhach(w, d.id, [a!, b!], ["Khách Thay Một", "Khách Thay Hai"]);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    const moi = khoaCuaDon(w, d.id);
    const k1 = moCua(w, x1.chuyen.id, d.legId).map((x) => x.k);
    const k2 = moCua(w, x2.chuyen.id, d.legId).map((x) => x.k);
    assert.equal(k1.length, 1);
    assert.equal(k2.length, 1);
    assert.notEqual(k1[0], k2[0], "hai khúc không cấp trùng khoá");
    assert.deepEqual([...k1, ...k2].sort(), [...moi].sort());
    assert.equal(nhatKyDongBo(w).length, 2);
  } finally {
    tat();
  }
});

// ---- HDV sửa số khách (điểm gọi 7) ------------------------------------------------------------------------------------------------------------------------
test("NT-5 tăng khách qua HDV (handler-money-edit, Q-2 = a) → mở thêm đúng số vừa tăng; nhật ký + sự kiện mang HDV; phản hồi chỉ câu cố định + cờ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2, handler: FIELD });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const r = await w.call("POST", `/api/orders/${d.id}/handler-money-edit`, {
      as: FIELD, body: { reason: "Khách thêm người", services: [{ id: svcId(w, d.id), pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] },
    });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, { ok: true, dongBoChuyen: { nhac: null, capNhatTay: false } });
    assert.equal(moCua(w, t.chuyen.id, d.legId).length, 3);
    const nk = nhatKyDongBo(w);
    assert.equal(nk.length, 1);
    assert.equal(nk[0]!.staff_id, FIELD);
    assert.equal(suKien(w, nk[0]!.id).created_by, FIELD);
    assert.match(nk[0]!.detail, new RegExp(`${d.code} \\(thêm khách\\): thêm 1 ghế$`));
  } finally {
    tat();
  }
});

// ---- Phiếu kiểm Đ2 CAO-1: câu đơn và phần chuyến ghi trong CÙNG MỘT db.batch (ADR-0104 Đ2.3) ----
// Hạ sức chở của xe giữa lúc máy đọc và lúc ghi ⇒ câu mở suất của máy vấp luật sức chở (LC-02) lúc ghi. Một lô: CẢ lô huỷ, lệnh đơn không để lại gì.
// Chia lô làm hai (câu đơn chạy trước, phần chuyến sau) thì câu đơn đã ghi rồi mới vấp ⇒ bài đỏ.
test("CAO-1 (Đ2.3 một lô): sửa chặng 3 → 4 người, xe bị hạ còn 3 chỗ giữa lúc đọc và lúc ghi → 409 trip_rule; pax_override vẫn 3, không dòng order_leg_updated, chuyến không đổi", async () => {
  const tat = batDongHo();
  let xeId = "";
  let bat = false;
  try {
    const w = setup({ chenGiuaDocVaGhi: async () => { if (bat) w.sqlite.prepare("UPDATE vc_vehicle SET passenger_capacity = 3 WHERE id = ?").run(xeId); } });
    const d = await donVe(w, 3);
    xeId = xe(w);
    const t = await taoChuyen(w, { xe: xeId, taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 3);
    const truoc = moCua(w, t.chuyen.id, d.legId);
    const nkTruoc = w.q("SELECT count(*) n FROM audit_log WHERE action = 'order_leg_updated'")[0].n;
    bat = true;
    const r = await suaVe(w, d, 4);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "trip_rule", r.text);
    assert.equal(w.q("SELECT pax_override FROM ord_transfer_leg WHERE id = ?", d.legId)[0].pax_override, 3, "câu đơn không được ghi riêng");
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'order_leg_updated'")[0].n, nkTruoc, "không dòng nhật ký sửa chặng");
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), truoc);
    assert.deepEqual(nhatKyDongBo(w), []);
  } finally {
    tat();
  }
});

test("CAO-1 (Đ2.3 một lô): văn phòng sửa số khách 2 → 3, xe bị hạ còn 2 chỗ giữa lúc đọc và lúc ghi → 409 trip_rule; không dòng điều chỉnh, không nhật ký sửa số khách, chuyến không đổi", async () => {
  const tat = batDongHo();
  let xeId = "";
  let bat = false;
  try {
    const w = setup({ chenGiuaDocVaGhi: async () => { if (bat) w.sqlite.prepare("UPDATE vc_vehicle SET passenger_capacity = 2 WHERE id = ?").run(xeId); } });
    const d = await don(w, { soNguoi: 2 });
    xeId = xe(w);
    const t = await taoChuyen(w, { xe: xeId, taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const truoc = moCua(w, t.chuyen.id, d.legId);
    bat = true;
    const r = await suaSoKhach(w, d.id, 3);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "trip_rule", r.text);
    assert.equal(w.q("SELECT count(*) n FROM order_money_adjustment WHERE order_id = ?", d.id)[0].n, 0, "câu đơn không được ghi riêng");
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'order_money_adjusted'")[0].n, 0, "không dòng nhật ký sửa số khách");
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), truoc);
    assert.deepEqual(nhatKyDongBo(w), []);
  } finally {
    tat();
  }
});
