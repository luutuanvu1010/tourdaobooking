// ĐỒNG BỘ CHUYẾN THEO ĐƠN qua ROUTE THẬT (ADR-0104 Đ2; kế hoạch NT-5, T2.5–T2.12). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả 2027-03-11 06:00 giờ VN
// (tests/audit/dieu-phoi-khung.mjs). Lệnh đơn (huỷ, bỏ / thay / sửa chặng, sửa khách, sửa số khách — cả đường HDV) chạy MỘT lô: câu đơn trước, khúc chuyến sau
// (mỗi chuyến một dấu lệnh + request_id riêng). Tên khách, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, DRIVER2, FIELD, SALES, batDongHo, chiTiet, chuyenSan, denGio, don, setup, taoChuyen, tienDo, uuid, xe, xepHet } from "../../../tests/audit/dieu-phoi-khung.mjs";
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

test("NT-5 tăng khách: xe hết chỗ (LC-02) → chỉ mở phần còn chỗ, còn lại giữ THIEU_SUAT; lệnh đơn 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w, 3), taiXe: `pty-${DRIVER}` });
    await xepHet(w, t, d, 2);
    const r = await suaSoKhach(w, d.id, 5);
    assert.equal(r.status, 200, r.text);
    assert.equal(moCua(w, t.chuyen.id, d.legId).length, 3, "xe 3 chỗ: mở thêm 1");
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
