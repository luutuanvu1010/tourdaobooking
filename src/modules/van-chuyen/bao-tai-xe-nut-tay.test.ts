// ADR-0112 (accepted 2026-10-09) qua ROUTE THẬT: nút tay "Cập nhật khách theo đơn" / "Cập nhật điểm theo đơn" trên chuyến CHƯA chạy báo tài xế đang lái (khuôn
// `tinKhachDoi` / `goCua` của dong-bo-chuyen-route.test.ts). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả 2027-03-11 06:00 giờ VN (tests/audit/dieu-phoi-khung.mjs);
// đồng hồ giả sau mốc phát hành `MOC_TIN_CAP_NHAT` nên tin hiện. Đ1/Đ2/Đ3: một lần bấm có việc → tài xế có dòng lái ĐÚNG MỘT tin, người bấm / văn phòng không;
// bấm lần hai không còn lệch → không ghi, không thêm tin; Đ4: gõ cửa đúng tài xế (cùng hàm với hộp thông báo). Tên khách GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER2, SALES, batDongHo, chiTiet, denGio, don, setup, taoChuyen, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { app } from "../../../tests/audit/harness.mjs";
import { nguoiNhanDay } from "../../shared/web-push.ts";

type W = any;
const TAI_KHOAN = [
  { id: DRIVER, permissions: ["DRIVER"], partyId: `pty-${DRIVER}` }, { id: DRIVER2, permissions: ["DRIVER"], partyId: `pty-${DRIVER2}` },
  { id: SALES, permissions: ["SALES"], partyId: null }, { id: ADM, permissions: ["ADMIN"], partyId: null }, { id: ACC, permissions: ["ACCOUNTING"], partyId: null },
];
/** Tin chuyến trong hộp thông báo của `as` có câu khớp `re`. */
const tin = async (w: W, as: string, re: RegExp): Promise<{ cau: string; lienKet: string }[]> =>
  (await w.call("GET", "/api/thong-bao", { as })).json.tin.filter((x: any) => x.loai === "chuyen" && re.test(x.cau)).map((x: any) => ({ cau: x.cau, lienKet: x.lienKet }));
async function goCua(w: W, action: string): Promise<string[]> {
  const id = w.q("SELECT id FROM audit_log WHERE action = ? ORDER BY rowid DESC LIMIT 1", action)[0].id;
  const kq = await app.dongChuyenTheoId(w.env.DB, id, (q: any) => app.chuyenChoTinTheoId(w.env.DB, q));
  assert.ok(kq, "có dòng gõ cửa");
  return nguoiNhanDay(TAI_KHOAN as any, { chuyen: kq.dong }, new Date(Date.parse(kq.dong.luc) + 1).toISOString()).sort();
}
const nhatKy = (w: W, action: string): number => w.q("SELECT count(*) c FROM audit_log WHERE action = ?", action)[0].c;
const khoaCuaDon = (w: W, orderId: string): string[] =>
  w.q(`SELECT p.person_key k FROM ord_passenger p WHERE p.order_id = ? AND p.voided_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL) ORDER BY p.person_key`, orderId).map((r: any) => r.k);
async function xep(w: W, tripId: string, legId: string, soSuat: number) {
  const c = await chiTiet(w, tripId);
  const r = await w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId, soSuat }] } });
  assert.equal(r.status, 200, r.text);
}
/** Người lập thay một khách của đơn (huỷ một, thêm một) — để "cập nhật khách theo đơn" có việc. */
async function thayKhach(w: W, orderId: string) {
  const ds = (await w.call("GET", `/api/orders/${orderId}/passengers`, { as: SALES })).json;
  const r1 = await w.call("POST", `/api/orders/${orderId}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: [khoaCuaDon(w, orderId)[0]] } });
  assert.equal(r1.status, 200, r1.text);
  const r2 = await w.call("POST", `/api/orders/${orderId}/passengers`, {
    as: SALES, body: { expectedUpdatedAt: r1.json.orderUpdatedAt, them: [{ fullName: "Khách Thay Dò Tìm", birthYear: 1985, paxCode: "adult" }], sua: [], huy: [] },
  });
  assert.equal(r2.status, 200, r2.text);
}
/** Đổi nơi đón của chặng qua đường thật của orders (ngoài mốc — chuyến ngày 2027-03-11 cách đồng hồ giả 6 giờ+). */
async function doiNoiDon(w: W, orderId: string, legId: string, noi: string) {
  const o = (await w.call("GET", `/api/orders/${orderId}`, { as: ADM })).json.order;
  const l = o.services.flatMap((s: any) => s.legs).find((x: any) => x.id === legId);
  const leg = {
    pickupDate: l.pickupDate ?? "", pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: noi,
    dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "",
  };
  const r = await w.call("PUT", `/api/orders/${orderId}/legs/${legId}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg } });
  assert.equal(r.status, 200, r.text);
}
const bam = async (w: W, tripId: string, duoi: "cap-nhat-khach" | "cap-nhat-diem", as = SALES, version?: number) =>
  w.call("POST", `/api/van-chuyen/chuyen/${tripId}/${duoi}`, { as, body: { version: version ?? (await chiTiet(w, tripId)).chuyen.version, requestId: uuid() } });

test("ADR-0112 Đ1, Đ3, Đ4: 'Cập nhật khách theo đơn' trên chuyến CHƯA chạy → tài xế đang lái có ĐÚNG MỘT tin 'Đơn vừa đổi khách'; người bấm, Quản trị, Kế toán, tài xế khác không; bấm lần hai (không còn lệch) → không tin mới; gõ cửa đúng tài xế", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true }); // cần trạng thái GIỮ (máy đồng bộ không tiêm) để nút tay có việc — khuôn cap-nhat-khach.test.ts
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    await thayKhach(w, d.id);
    assert.deepEqual(await tin(w, DRIVER, /Đơn vừa đổi khách/), [], "chưa bấm nút: chưa có tin");
    const r = await bam(w, t.chuyen.id, "cap-nhat-khach");
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 1);
    const dong = [{ cau: `Đơn vừa đổi khách ở chuyến ${t.chuyen.ma} ngày 11/03 — mở để xem`, lienKet: `/cuoc-chuyen?id=${t.chuyen.id}` }];
    assert.deepEqual(await tin(w, DRIVER, /Đơn vừa đổi khách/), dong, "tài xế đang lái: đúng một tin, đúng câu Đ1");
    for (const ai of [SALES, ADM, ACC, DRIVER2]) assert.deepEqual(await tin(w, ai, /Đơn vừa đổi khách/), [], `không tin cho ${ai}`);
    assert.deepEqual(await goCua(w, "trip_passengers_synced"), [DRIVER], "gõ cửa đúng tài xế đang lái (người bấm là Bán hàng — E3)");
    // Lần hai: không còn lệch → 200 / 0, không ghi nhật ký, không tin mới.
    const truoc = nhatKy(w, "trip_passengers_synced");
    const r2 = await bam(w, t.chuyen.id, "cap-nhat-khach");
    assert.equal(r2.status, 200, r2.text);
    assert.equal(r2.json.daCapNhat, 0);
    assert.equal(nhatKy(w, "trip_passengers_synced"), truoc, "không ghi thêm");
    assert.deepEqual(await tin(w, DRIVER, /Đơn vừa đổi khách/), dong, "vẫn đúng một tin");
    assert.doesNotMatch(JSON.stringify(await tin(w, DRIVER, /./)), /Khách|1985|(?<![0-9a-f-])09\d{8}(?!\d)|DH-/, "câu tin không tên, năm sinh, SĐT, mã đơn");
  } finally {
    tat();
  }
});

test("ADR-0112 Đ2, Đ3, Đ4: 'Cập nhật điểm theo đơn' trên chuyến CHƯA chạy → tài xế đang lái có ĐÚNG MỘT tin 'Văn phòng vừa đổi điểm đón' (loại xe_chay_doi); người khác không; bấm lần hai → không tin mới; gõ cửa đúng tài xế", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    await doiNoiDon(w, d.id, d.legId, "Khách sạn Đổi Điểm Dò Tìm");
    assert.deepEqual(await tin(w, DRIVER, /đổi điểm đón/), [], "chưa bấm nút: chưa có tin");
    const r = await bam(w, t.chuyen.id, "cap-nhat-diem");
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 2);
    const dong = [{ cau: `Văn phòng vừa đổi điểm đón ở chuyến ${t.chuyen.ma} ngày 11/03 — mở để xem`, lienKet: `/cuoc-chuyen?id=${t.chuyen.id}` }];
    assert.deepEqual(await tin(w, DRIVER, /đổi điểm đón/), dong);
    for (const ai of [SALES, ADM, ACC, DRIVER2]) assert.deepEqual(await tin(w, ai, /đổi điểm đón/), [], `không tin cho ${ai}`);
    assert.deepEqual(await goCua(w, "trip_stops_synced"), [DRIVER]);
    const truoc = nhatKy(w, "trip_stops_synced");
    const r2 = await bam(w, t.chuyen.id, "cap-nhat-diem");
    assert.equal(r2.status, 200, r2.text);
    assert.equal(r2.json.daCapNhat, 0);
    assert.equal(nhatKy(w, "trip_stops_synced"), truoc, "không ghi thêm");
    assert.deepEqual(await tin(w, DRIVER, /đổi điểm đón/), dong, "vẫn đúng một tin");
    assert.doesNotMatch(JSON.stringify(await tin(w, DRIVER, /./)), /Khách|Đổi Điểm|Dò Tìm|(?<![0-9a-f-])09\d{8}(?!\d)|DH-/, "câu tin không tên khách, SĐT, nơi đón, mã đơn");
  } finally {
    tat();
  }
});

test("ADR-0112 Đ3: tài xế bị gỡ (đổi tài xế) TRƯỚC khi bấm nút không nhận tin; tài xế mới lái nhận", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xep(w, t.chuyen.id, d.legId, 2);
    const c = await chiTiet(w, t.chuyen.id);
    const sua = await w.call("PUT", `/api/van-chuyen/chuyen/${t.chuyen.id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER2}` } });
    assert.equal(sua.status, 200, sua.text);
    denGio("06:10"); // sau mốc gỡ tài xế cũ (dòng lái đóng ≥ lúc sự kiện vẫn tính là "đang lái" — cùng mili-giây thì chưa gỡ)
    await doiNoiDon(w, d.id, d.legId, "Khách sạn Đổi Điểm Dò Tìm");
    const r = await bam(w, t.chuyen.id, "cap-nhat-diem");
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(await tin(w, DRIVER, /đổi điểm đón/), [], "tài xế cũ (đã bị gỡ trước sự kiện) không nhận");
    assert.equal((await tin(w, DRIVER2, /đổi điểm đón/)).length, 1, "tài xế mới nhận");
    assert.deepEqual(await goCua(w, "trip_stops_synced"), [DRIVER2]);
  } finally {
    tat();
  }
});
