// ĐỒNG BỘ CHUYẾN THEO ĐƠN qua ROUTE THẬT (ADR-0104 Đ2; kế hoạch NT-5, T2.5–T2.12). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả 2027-03-11 06:00 giờ VN
// (tests/audit/dieu-phoi-khung.mjs). Lệnh đơn (huỷ, bỏ / thay / sửa chặng, sửa khách, sửa số khách — cả đường HDV) chạy MỘT lô: câu đơn trước, khúc chuyến sau
// (mỗi chuyến một dấu lệnh + request_id riêng). Tên khách, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, DRIVER2, SALES, batDongHo, chiTiet, don, setup, taoChuyen, uuid, xe, xepHet } from "../../../tests/audit/dieu-phoi-khung.mjs";
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

void DRIVER2;
void CAU_NHAC_XE_DANG_CHAY;
