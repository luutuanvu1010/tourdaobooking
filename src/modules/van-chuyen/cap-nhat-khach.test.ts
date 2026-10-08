// R-P29 (chủ lần 16 — "Giữ xe + nút cập nhật", khuôn ADR-0050 VK1-B / route 40): KHÁCH ĐÃ ĐỔI sau khi gắn tên → giữ KHACH_DA_DOI (MỘT luật `kiemXuatBen`,
// màn và lệnh xuất bến cùng kết luận) + lệnh `POST /api/van-chuyen/chuyen/:id/cap-nhat-khach` (đóng PASSENGER_CHANGED, mở lại tới số người của chặng — khoá
// rảnh theo thứ tự hoặc null). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (tests/audit/dieu-phoi-khung.mjs). Tên khách GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, DRIVER, DRIVER2, FIELD, LOC, NGAY, SALES, SUP, batDongHo, chiTiet, denGio, don, setup, taoChuyen, tienDo, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

// ADR-0104 Đ2 (kế hoạch N9 — đổi cách DỰNG, không nới luật): sửa khách nay tự đồng bộ chuyến (máy, bài src/modules/van-chuyen/dong-bo-chuyen-route.test.ts). Các
// bài NÚT TAY dưới đây cần trạng thái GIỮ (khách đã đổi còn trên chuyến) nên dựng thế giới không tiêm máy (`khongDongBoChuyen`) — vẫn phải thấy lý do giữ.
const khoaCuaDon = (w: any, orderId: string): string[] =>
  w.q(`SELECT p.person_key k FROM ord_passenger p WHERE p.order_id = ? AND p.voided_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL) ORDER BY p.person_key`, orderId).map((r: any) => r.k);
const khoaSuat = (w: any, tripId: string, legId: string): (string | null)[] =>
  w.q("SELECT passenger_key k FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER' ORDER BY rowid", tripId, legId).map((r: any) => r.k);
const lyDo = async (w: any, tripId: string): Promise<string[]> => (await chiTiet(w, tripId)).chuyen.lyDoGiu.map((l: any) => l.ma);
async function xep(w: any, tripId: string, legId: string, soSuat: number) {
  const c = await chiTiet(w, tripId);
  const r = await w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId, soSuat }] } });
  assert.equal(r.status, 200, r.text);
}
/** Người lập bỏ khách `huy` (khoá người) và / hoặc thêm khách tên `them` vào đơn. */
async function doiKhach(w: any, orderId: string, v: { huy?: string[]; them?: string[] }) {
  let ds = (await w.call("GET", `/api/orders/${orderId}/passengers`, { as: SALES })).json;
  if (v.huy?.length) {
    const r = await w.call("POST", `/api/orders/${orderId}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: v.huy } });
    assert.equal(r.status, 200, r.text);
    ds = r.json;
  }
  if (v.them?.length) {
    const r = await w.call("POST", `/api/orders/${orderId}/passengers`, {
      as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: v.them.map((fullName) => ({ fullName, birthYear: 1980, paxCode: "adult" })), sua: [], huy: [] },
    });
    assert.equal(r.status, 200, r.text);
  }
}
const capNhat = async (w: any, tripId: string, as = SALES, v: { version?: number; requestId?: string } = {}) =>
  w.call("POST", `/api/van-chuyen/chuyen/${tripId}/cap-nhat-khach`, { as, body: { version: v.version ?? (await chiTiet(w, tripId)).chuyen.version, requestId: v.requestId ?? uuid() } });

test("R-P29 kịch bản K2d: huỷ A, thêm C → màn + lịch chung + xuất bến CÙNG giữ KHACH_DA_DOI → Cập nhật khách theo đơn → A đóng PASSENGER_CHANGED, suất mới mang C → màn sạch → xuất bến 200, bản chốt có C không có A; nhật ký chỉ số lượng", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true }); // N9: cần trạng thái giữ (máy đồng bộ không tiêm)
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    const [a, b] = khoaCuaDon(w, d.id);
    await doiKhach(w, d.id, { huy: [a!], them: ["Khách Thay Thế"] });
    const c = khoaCuaDon(w, d.id).find((k) => k !== b)!;
    assert.deepEqual(await lyDo(w, t.chuyen.id), ["KHACH_DA_DOI"], "màn văn phòng giữ");
    const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    assert.ok(lich.chuyen.find((x: any) => x.id === t.chuyen.id).lyDoGiu.some((l: any) => l.ma === "KHACH_DA_DOI"), "lịch chung giữ");
    denGio("12:40");
    const x1 = await tienDo(w, "van-phong", t.chuyen.id, "xuat-ben");
    assert.equal(x1.status, 409, x1.text);
    assert.deepEqual(x1.json.error.lyDo.map((l: any) => l.ma), ["KHACH_DA_DOI"], "lệnh xuất bến CÙNG kết luận");
    const r = await capNhat(w, t.chuyen.id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 1);
    assert.ok(!/Khách Dò Tìm|Khách Thay Thế|"hoTen"|"namSinh"/.test(r.text), "phản hồi không tên (GA-55)");
    assert.deepEqual({ ...w.q("SELECT close_reason r FROM vc_trip_allocation WHERE trip_id = ? AND passenger_key = ?", t.chuyen.id, a)[0] }, { r: "PASSENGER_CHANGED" });
    assert.deepEqual([...khoaSuat(w, t.chuyen.id, d.legId)].sort(), [b, c].sort(), "suất mới mang C");
    assert.deepEqual(await lyDo(w, t.chuyen.id), [], "màn sạch sau cập nhật");
    const nk = w.q("SELECT id, detail, order_id FROM audit_log WHERE action = 'trip_passengers_synced'");
    assert.equal(nk.length, 1);
    assert.equal(nk[0].order_id, null);
    // ADR-0104 Đ2.11 (kế hoạch §10 "detail thêm nguyên nhân" — sửa có tên): câu chung với máy (`moTaTheoDon`) thay "<mã đơn>: 1 khách".
    assert.equal(nk[0].detail, `${t.chuyen.ma}: cập nhật khách theo đơn — ${d.code} (đổi người): trả 1 ghế, thêm 1 ghế`);
    assert.doesNotMatch(nk[0].detail, /Khách|1980|19[89]\d|09\d{8}/);
    assert.deepEqual({ ...w.q("SELECT kind, count FROM vc_trip_event WHERE id = ?", nk[0].id)[0] }, { kind: "ALLOCATION_PASSENGER_CHANGED", count: 1 });
    const x2 = await tienDo(w, "van-phong", t.chuyen.id, "xuat-ben");
    assert.equal(x2.status, 200, x2.text);
    const chot = w.q(`SELECT p.person_key k FROM vc_trip_manifest m JOIN ord_passenger p ON p.id = m.passenger_row_id WHERE m.trip_id = ?`, t.chuyen.id).map((x: any) => x.k).sort();
    assert.deepEqual(chot, [b, c].sort(), "bản chốt có C, không có A");
  } finally {
    tat();
  }
});

test("R-P29: huỷ A, KHÔNG thêm ai (số khách của đơn vẫn 2) → đóng A, mở lại suất CHƯA TÊN (đơn còn 2 người) → giữ THIEU_TEN ở CẢ màn lẫn lệnh (GA-62: \"xuất bến được với 1 khách\" chỉ khi đơn giảm người — bài kế)", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true }); // N9: cần trạng thái giữ (máy đồng bộ không tiêm)
    const d = await don(w, { soNguoi: 2, handler: FIELD });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    const [a, b] = khoaCuaDon(w, d.id);
    await doiKhach(w, d.id, { huy: [a!] });
    assert.deepEqual(await lyDo(w, t.chuyen.id), ["KHACH_DA_DOI", "THIEU_TEN"], "khách A không còn + đơn 2 người mà 1 tên — hai lý do đúng");
    const r = await capNhat(w, t.chuyen.id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 1);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), [b, null], "đơn vẫn 2 người → mở lại suất chưa tên");
    assert.deepEqual(await lyDo(w, t.chuyen.id), ["THIEU_TEN"], "đơn 2 người mà 1 tên → giữ THIEU_TEN (bắt đủ danh sách)");
    denGio("12:40");
    const x1 = await tienDo(w, "van-phong", t.chuyen.id, "xuat-ben");
    assert.deepEqual([x1.status, x1.json.error.lyDo.map((l: any) => l.ma)], [409, ["THIEU_TEN"]], "lệnh CÙNG kết luận");
  } finally {
    tat();
  }
});

test("R-P29: huỷ A + giảm số khách của đơn xuống 1 → Cập nhật khách: CHỈ đóng A (không mở lại) → màn sạch → xuất bến 200 với 1 khách", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true }); // N9: cần trạng thái giữ (máy đồng bộ không tiêm)
    const d = await don(w, { soNguoi: 2, handler: FIELD });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    const [a, b] = khoaCuaDon(w, d.id);
    await doiKhach(w, d.id, { huy: [a!] });
    const svc = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.services[0].id;
    const giam = await w.call("POST", `/api/orders/${d.id}/handler-money-edit`, { as: FIELD, body: { reason: "khách báo bớt một người", services: [{ id: svc, pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] } });
    assert.equal(giam.status, 200, giam.text);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("KHACH_DA_DOI"));
    const r = await capNhat(w, t.chuyen.id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 1);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), [b], "chỉ đóng — không mở lại");
    assert.deepEqual(await lyDo(w, t.chuyen.id), []);
    denGio("12:40");
    const x = await tienDo(w, "van-phong", t.chuyen.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_manifest WHERE trip_id = ?", t.chuyen.id)[0].n, 1);
  } finally {
    tat();
  }
});

test("R-P29: khoá rảnh không còn (khách mới C đã có suất ở CHUYẾN KHÁC cùng chặng) → mở lại suất CHƯA TÊN theo luật số người; không gắn trùng C (LC-01)", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true }); // N9: cần trạng thái giữ (máy đồng bộ không tiêm)
    const d = await don(w, { soNguoi: 3, ten: 2 });
    const t1 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}` });
    await xep(w, t1.chuyen.id, d.legId, 2);
    const [a, b] = khoaCuaDon(w, d.id);
    await doiKhach(w, d.id, { them: ["Khách Thứ Ba"] });
    const c = khoaCuaDon(w, d.id).find((k) => k !== a && k !== b)!;
    await xep(w, t2.chuyen.id, d.legId, 1);
    assert.deepEqual(khoaSuat(w, t2.chuyen.id, d.legId), [c], "chuyến 2 đã có C");
    await doiKhach(w, d.id, { huy: [a!] });
    const r = await capNhat(w, t1.chuyen.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(khoaSuat(w, t1.chuyen.id, d.legId), [b, null], "đơn 3 người, mở 2 suất khác → mở lại chưa tên (không lặp C)");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE leg_id = ? AND passenger_key = ? AND valid_to_at IS NULL", d.legId, c)[0].n, 1);
  } finally {
    tat();
  }
});

test("R-P29: Bán hàng TRONG vùng khoá mốc gọi Cập nhật khách → 200, không cần phá lệ (lệnh rút cùng lúc cần phá lệ); Kế toán → 403; chuyến ĐANG CHẠY → 409 xe_dang_chay", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true }); // N9: cần trạng thái giữ (máy đồng bộ không tiêm)
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    const [a] = khoaCuaDon(w, d.id);
    denGio("07:00"); // xuất bến 12:30 − 6 giờ = 06:30 → đang trong vùng khoá
    await doiKhach(w, d.id, { huy: [a!], them: ["Khách Thay Thế"] });
    const c = await chiTiet(w, t.chuyen.id);
    const rut = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/rut`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), suatIds: [c.suat[0].id] } });
    assert.equal(rut.json.error.code, "can_pha_le", "đang trong vùng khoá thật");
    assert.equal((await capNhat(w, t.chuyen.id, ACC)).status, 403, "Kế toán");
    const r = await capNhat(w, t.chuyen.id, SALES);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 1);
    // Đang chạy → 409 xe_dang_chay (đổi khách lần nữa sau xuất bến).
    denGio("12:40");
    assert.equal((await tienDo(w, "van-phong", t.chuyen.id, "xuat-ben")).status, 200);
    const [k1] = khoaCuaDon(w, d.id);
    await doiKhach(w, d.id, { huy: [k1!], them: ["Khách Sau Xuất Bến"] });
    const chay = await capNhat(w, t.chuyen.id);
    assert.equal(chay.status, 409, chay.text);
    assert.equal(chay.json.error.code, "xe_dang_chay");
  } finally {
    tat();
  }
});

test("R-P29: lệnh lặp cùng requestId → 200 cùng daCapNhat, không ghi thêm; version cũ khi còn lệch → 409 stale; không lệch → 200 daCapNhat 0, không ghi (kể cả version cũ)", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true }); // N9: cần trạng thái giữ (máy đồng bộ không tiêm)
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    const vCu = (await chiTiet(w, t.chuyen.id)).chuyen.version;
    // Không lệch → 0, không ghi, kể cả version cũ.
    const khong = await capNhat(w, t.chuyen.id, SALES, { version: vCu - 1 });
    assert.equal(khong.status, 200, khong.text);
    assert.equal(khong.json.daCapNhat, 0);
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_passengers_synced'")[0].n, 0);
    const [a] = khoaCuaDon(w, d.id);
    await doiKhach(w, d.id, { huy: [a!], them: ["Khách Thay Thế"] });
    // version cũ khi còn lệch → 409 stale.
    const cu = await capNhat(w, t.chuyen.id, SALES, { version: vCu - 1 });
    assert.equal(cu.status, 409, cu.text);
    assert.equal(cu.json.error.code, "stale");
    const rid = uuid();
    const r1 = await capNhat(w, t.chuyen.id, SALES, { requestId: rid });
    assert.equal(r1.json.daCapNhat, 1);
    const soDong = w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ?", t.chuyen.id)[0].n;
    const r2 = await capNhat(w, t.chuyen.id, SALES, { requestId: rid, version: vCu });
    assert.equal(r2.status, 200, r2.text);
    assert.equal(r2.json.daCapNhat, 1, "lệnh lặp → kết quả cũ");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE request_id = ?", rid)[0].n, 1, "lặp: đúng một sự kiện");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ?", t.chuyen.id)[0].n, soDong, "không ghi thêm");
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_passengers_synced'")[0].n, 1);
  } finally {
    tat();
  }
});

// ---- ADR-0104 Đ2.11 (kế hoạch T2.14): nút tay dùng CHUNG luật thuần với máy (`dongBoChuyenTheoDon`) — gỡ được cả DON_DA_HUY, CHANG_DA_DONG, THUA_SUAT ----------
// (hôm trước nút bỏ qua chặng `!changXetTheoDon`). Thế giới KHÔNG tiêm máy (`khongDongBoChuyen`) để dựng trạng thái giữ — như khi máy vượt trần / thua cổng.
const daDongCua = (w: any, tripId: string): { r: string; k: string | null }[] =>
  w.q("SELECT close_reason r, passenger_key k FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NOT NULL ORDER BY id", tripId).map((r: any) => ({ ...r }));
const nhatKyNut = (w: any): { id: string; detail: string }[] =>
  w.q("SELECT id, detail FROM audit_log WHERE action = 'trip_passengers_synced' ORDER BY rowid").map((r: any) => ({ ...r }));
const suaSoKhach = (w: any, orderId: string, adult: number) => {
  const svc = w.q("SELECT id FROM order_service WHERE order_id = ?", orderId)[0].id;
  return w.call("POST", `/api/orders/${orderId}/money-edit`, { as: SALES, body: { lyDo: "KHAC", services: [{ id: svc, pax: { adult, child: 0, senior: 0, infant: 0 } }] } });
};

test("Đ2.11 nút tay gỡ DON_DA_HUY: đơn huỷ khi máy không chạy → giữ DON_DA_HUY → Bán hàng TRONG vùng khoá mốc bấm → 200, đóng MỌI suất của chặng REMOVED, điểm hết khách bỏ qua, hết giữ; nhật ký nêu nguyên nhân, không tên", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true });
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    denGio("07:00"); // xuất bến 12:30 − 6 giờ = 06:30 → trong vùng khoá (N2 của ADR: đổi theo đơn miễn mốc)
    assert.equal((await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("DON_DA_HUY"), "chống bài rỗng: chuyến giữ DON_DA_HUY");
    const r = await capNhat(w, t.chuyen.id, SALES);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 2);
    assert.deepEqual(daDongCua(w, t.chuyen.id).map((x) => x.r), ["REMOVED", "REMOVED"]);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), []);
    assert.ok(!(await lyDo(w, t.chuyen.id)).includes("DON_DA_HUY"), "hết giữ DON_DA_HUY");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_stop WHERE trip_id = ? AND status <> 'SKIPPED'", t.chuyen.id)[0].n, 0, "điểm hết khách → bỏ qua");
    const nk = nhatKyNut(w);
    assert.equal(nk.length, 1);
    assert.equal(nk[0]!.detail, `${t.chuyen.ma}: cập nhật khách theo đơn — ${d.code} (đơn huỷ): trả 2 ghế`);
    assert.deepEqual({ ...w.q("SELECT kind, count FROM vc_trip_event WHERE id = ?", nk[0]!.id)[0] }, { kind: "ALLOCATION_PASSENGER_CHANGED", count: 2 });
  } finally {
    tat();
  }
});

test("Đ2.11 nút tay gỡ CHANG_DA_DONG: bỏ chặng khi máy không chạy → bấm → đóng suất của chặng REMOVED, hết giữ; nhật ký 'bỏ chặng'", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true });
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    const o = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order;
    const bo = await w.call("POST", `/api/orders/${d.id}/legs/${d.legId}/close`, { as: SALES, body: { expectedUpdatedAt: o.services[0].legs[0].updatedAt, reasonCode: "NOT_NEEDED" } });
    assert.equal(bo.status, 200, bo.text);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("CHANG_DA_DONG"), "chống bài rỗng: chuyến giữ CHANG_DA_DONG");
    const r = await capNhat(w, t.chuyen.id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 2);
    assert.deepEqual(daDongCua(w, t.chuyen.id).map((x) => x.r), ["REMOVED", "REMOVED"]);
    assert.ok(!(await lyDo(w, t.chuyen.id)).includes("CHANG_DA_DONG"), "hết giữ CHANG_DA_DONG");
    assert.equal(nhatKyNut(w)[0]!.detail, `${t.chuyen.ma}: cập nhật khách theo đơn — ${d.code} (bỏ chặng): trả 2 ghế`);
  } finally {
    tat();
  }
});

test("Đ2.11 nút tay gỡ THUA_SUAT: bớt khách khi máy không chạy, còn suất CHƯA TÊN → bấm → đóng suất chưa tên REMOVED, hết giữ; mọi suất mang tên người vẫn trong đơn → KHÔNG đoán: 0, không ghi, vẫn giữ", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true });
    const d = await don(w, { soNguoi: 3, ten: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 3);
    assert.equal((await suaSoKhach(w, d.id, 2)).status, 200);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("THUA_SUAT"), "chống bài rỗng: chuyến giữ THUA_SUAT");
    const r = await capNhat(w, t.chuyen.id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 1);
    assert.deepEqual(daDongCua(w, t.chuyen.id), [{ r: "REMOVED", k: null }], "đóng đúng suất chưa tên");
    assert.equal(khoaSuat(w, t.chuyen.id, d.legId).filter((k) => k !== null).length, 2, "hai suất có tên còn nguyên");
    assert.deepEqual(await lyDo(w, t.chuyen.id), [], "hết giữ");
    assert.equal(nhatKyNut(w)[0]!.detail, `${t.chuyen.ma}: cập nhật khách theo đơn — ${d.code} (bớt khách): trả 1 ghế`);
    // Mọi suất mang tên người vẫn trong đơn: bớt tiếp xuống 1 → nút không đoán người nào rời xe.
    assert.equal((await suaSoKhach(w, d.id, 1)).status, 200);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("THUA_SUAT"));
    const truoc = khoaSuat(w, t.chuyen.id, d.legId);
    const r2 = await capNhat(w, t.chuyen.id);
    assert.equal(r2.status, 200, r2.text);
    assert.equal(r2.json.daCapNhat, 0);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), truoc, "không suất nào đổi");
    assert.equal(nhatKyNut(w).length, 1, "không ghi thêm");
    assert.ok((await lyDo(w, t.chuyen.id)).includes("THUA_SUAT"), "vẫn giữ — người xếp xe tự rút");
  } finally {
    tat();
  }
});

test("Đ2.11 lô riêng từng chuyến: chặng của đơn huỷ nằm trên HAI chuyến → bấm ở chuyến 1 chỉ đóng suất của chuyến 1; chuyến 2 không đổi, vẫn giữ DON_DA_HUY", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true });
    const d = await don(w, { soNguoi: 2 });
    const t1 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}` });
    await xep(w, t1.chuyen.id, d.legId, 1);
    await xep(w, t2.chuyen.id, d.legId, 1);
    assert.equal((await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
    const v2 = (await chiTiet(w, t2.chuyen.id)).chuyen.version;
    const r = await capNhat(w, t1.chuyen.id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 1);
    assert.deepEqual(khoaSuat(w, t1.chuyen.id, d.legId), []);
    assert.equal(khoaSuat(w, t2.chuyen.id, d.legId).length, 1, "chuyến 2 không đổi");
    assert.equal((await chiTiet(w, t2.chuyen.id)).chuyen.version, v2, "chuyến 2 không có lệnh nào");
    assert.ok((await lyDo(w, t2.chuyen.id)).includes("DON_DA_HUY"));
  } finally {
    tat();
  }
});

test("Đ2.11 chặng dời NGÀY ra ngoài chuyến (GIO_HEN_NGOAI_CHUYEN — khách vẫn đi, chỉ khác ngày) → nút KHÔNG đoán: 0, không ghi, vẫn giữ", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true });
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    const l = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.services[0].legs[0];
    const doi = await w.call("PUT", `/api/orders/${d.id}/legs/${d.legId}`, {
      as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { direction: "OUT", pickupDate: "2027-03-15", pickupTime: "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" } },
    });
    assert.equal(doi.status, 200, doi.text);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("GIO_HEN_NGOAI_CHUYEN"), "chống bài rỗng: chuyến giữ GIO_HEN_NGOAI_CHUYEN");
    const truoc = khoaSuat(w, t.chuyen.id, d.legId);
    const r = await capNhat(w, t.chuyen.id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 0);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), truoc);
    assert.deepEqual(nhatKyNut(w), []);
    assert.ok((await lyDo(w, t.chuyen.id)).includes("GIO_HEN_NGOAI_CHUYEN"));
  } finally {
    tat();
  }
});

// Lưới THỨ HAI của lệnh xuất bến (R-P29): đơn đổi GIỮA lúc route đọc lịch và lúc đọc hành khách — gọi thẳng `lenhXuatBen` với lịch đọc TRƯỚC khi huỷ khách
// và hành khách đọc SAU → `kiemXuatBen` (lịch cũ) đạt, lưới thứ hai chặn với CÙNG lý do màn sẽ hiện khi tải lại (KHACH_DA_DOI), không "tải lại" chung chung.
const VC = new URL(".", import.meta.url).pathname;
const bo = await esbuild.build({
  stdin: { contents: 'export { lenhXuatBen } from "./dieu-phoi-tien-do"; export { docNen } from "./dieu-phoi-doc"; export { lichChungChang, hanhKhachChoChuyen } from "../orders";', resolveDir: VC, loader: "ts" },
  bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
});
const M = (await import(`data:text/javascript;base64,${Buffer.from(bo.outputFiles[0]!.text).toString("base64")}`)) as Record<string, any>;
test("R-P29 lưới thứ hai: lịch đọc trước khi đổi khách, hành khách đọc sau → lệnh xuất bến 409 KHACH_DA_DOI (cùng lý do màn sẽ hiện), không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    denGio("12:40");
    const nen = await M.docNen(w.env.DB, t.chuyen.id);
    const lich = await M.lichChungChang(w.env.DB, nen.tu, nen.den);
    const [a] = khoaCuaDon(w, d.id);
    await doiKhach(w, d.id, { huy: [a!], them: ["Khách Thay Thế"] });
    const hk = await M.hanhKhachChoChuyen(w.env.DB, nen.legIds);
    const r = await M.lenhXuatBen(w.env.DB, nen, lich.chang, hk, { requestId: uuid(), xayRaMs: null }, { id: SALES, bamThay: true }, Date.now());
    assert.ok(r instanceof Response, "bị chặn");
    const j = await r.json();
    assert.equal(r.status, 409);
    assert.deepEqual(j.error.lyDo.map((l: any) => l.ma), ["KHACH_DA_DOI"]);
    assert.match(j.error.lyDo[0].loiNhan, new RegExp(d.code));
    assert.equal(w.q("SELECT status FROM vc_trip WHERE id = ?", t.chuyen.id)[0].status, "PLANNED", "không ghi gì");
  } finally {
    tat();
  }
});

// K2e THẤP-3 (GA-69): khe đua của lưới thứ hai với suất CHƯA tên — `kiemXuatBen` (lịch đọc TRƯỚC) gán tạm người B cho suất chưa tên (I19b), rồi B bị bỏ khỏi đơn
// trước khi hành khách được đọc (SAU). Suất vẫn null trong CSDL nên màn tải lại KHÔNG giữ KHACH_DA_DOI (suatKhachDaDoi bỏ qua suất chưa tên) mà giữ THIEU_TEN.
// Lưới thứ hai phải trả ĐÚNG lý do màn sẽ hiện khi tải lại (tính lại CHÍNH `kiemXuatBen` với danh sách người mới đọc), không dẫn văn phòng tới nút sai.
test("K2e THẤP-3 lưới thứ hai: suất chưa tên vừa được GÁN TẠM cho người bị bỏ giữa hai lần đọc → 409 mang ĐÚNG lý do màn hiện khi tải lại (THIEU_TEN), không KHACH_DA_DOI; không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2, ten: 1 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId).map((k) => k !== null), [true, false], "chống bài rỗng: một suất có tên, một suất chưa tên");
    await doiKhach(w, d.id, { them: ["Khách Gán Tạm"] });
    const truoc = khoaCuaDon(w, d.id);
    denGio("12:40");
    const nen = await M.docNen(w.env.DB, t.chuyen.id);
    const lich = await M.lichChungChang(w.env.DB, nen.tu, nen.den);
    const daCo = khoaSuat(w, t.chuyen.id, d.legId).filter((k) => k !== null);
    const b = truoc.find((k) => !daCo.includes(k))!;
    await doiKhach(w, d.id, { huy: [b] }); // bỏ ĐÚNG người sẽ được gán tạm
    const hk = await M.hanhKhachChoChuyen(w.env.DB, nen.legIds);
    const r = await M.lenhXuatBen(w.env.DB, nen, lich.chang, hk, { requestId: uuid(), xayRaMs: null }, { id: SALES, bamThay: true }, Date.now());
    assert.ok(r instanceof Response, "bị chặn");
    assert.equal(r.status, 409);
    const j = await r.json();
    const man = (await chiTiet(w, t.chuyen.id)).chuyen.lyDoGiu;
    assert.deepEqual(man.map((l: any) => l.ma), ["THIEU_TEN"], "chống bài rỗng: màn tải lại giữ THIEU_TEN");
    assert.deepEqual(j.error.lyDo, man, "câu 409 = đúng lý do màn hiện khi tải lại (mã + câu)");
    assert.equal(w.q("SELECT status FROM vc_trip WHERE id = ?", t.chuyen.id)[0].status, "PLANNED", "không ghi gì");
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId).filter((k) => k === null).length, 1, "suất chưa tên vẫn chưa tên");
  } finally {
    tat();
  }
});

// K2f THẤP-2 (vòng 5g → 5h, bài giao cho người thi công giao diện): nhánh "tính lại vẫn đạt → CHUYEN_CU()" của lưới thứ hai (`dieu-phoi-tien-do.ts`). Chính sách
// KHÔNG bắt đủ danh sách (requireManifest=false) ⇒ bỏ người vừa được GÁN TẠM giữa lúc đọc lịch và lúc đọc hành khách thì tính lại vẫn đạt (suất chưa tên được
// phép) — gán tạm cũ không còn đúng ⇒ 409 `stale` "tải lại", KHÔNG ghi gì; màn tải lại không giữ.
test("K2f THẤP-2 lưới thứ hai, chính sách không bắt đủ danh sách: người được gán tạm bị bỏ giữa hai lần đọc → 409 stale 'tải lại'; không DEPARTED, không bản chốt, vẫn PLANNED; GET không giữ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const cs = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
      as: SUP, body: { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: false, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720 },
    });
    assert.equal(cs.status, 201, cs.text);
    assert.equal(cs.json.current.requireManifest, false, "chính sách hiện hành không bắt đủ danh sách");
    const d = await don(w, { soNguoi: 2, ten: 1 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId).map((k) => k !== null), [true, false], "chống bài rỗng: một suất có tên, một suất chưa tên");
    await doiKhach(w, d.id, { them: ["Khách Gán Tạm"] });
    const truoc = khoaCuaDon(w, d.id);
    denGio("12:40");
    assert.deepEqual(await lyDo(w, t.chuyen.id), [], "chống bài rỗng: chính sách không bắt đủ danh sách → trước lệnh không giữ gì");
    const nen = await M.docNen(w.env.DB, t.chuyen.id);
    const lich = await M.lichChungChang(w.env.DB, nen.tu, nen.den);
    const daCo = khoaSuat(w, t.chuyen.id, d.legId).filter((k) => k !== null);
    const b = truoc.find((k) => !daCo.includes(k))!;
    await doiKhach(w, d.id, { huy: [b] }); // bỏ ĐÚNG người sẽ được gán tạm
    const hk = await M.hanhKhachChoChuyen(w.env.DB, nen.legIds);
    const r = await M.lenhXuatBen(w.env.DB, nen, lich.chang, hk, { requestId: uuid(), xayRaMs: null }, { id: SALES, bamThay: true }, Date.now());
    assert.ok(r instanceof Response, "bị chặn");
    assert.equal(r.status, 409);
    const j = await r.json();
    assert.equal(j.error.code, "stale");
    assert.match(j.error.message, /tải lại/);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE trip_id = ? AND kind = 'DEPARTED'", t.chuyen.id)[0].n, 0, "không sự kiện DEPARTED");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_departure_check WHERE trip_id = ?", t.chuyen.id)[0].n, 0, "không bản chốt (phiếu kiểm)");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_manifest WHERE trip_id = ?", t.chuyen.id)[0].n, 0, "không bản chốt (danh sách)");
    assert.equal(w.q("SELECT status FROM vc_trip WHERE id = ?", t.chuyen.id)[0].status, "PLANNED", "vẫn PLANNED");
    assert.deepEqual(await lyDo(w, t.chuyen.id), [], "GET tải lại không giữ");
  } finally {
    tat();
  }
});

