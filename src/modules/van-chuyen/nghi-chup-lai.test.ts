// N3 (báo cáo đánh giá ERP 2026-10-07, Phần 4.4 + Gói C5): khoảng nghỉ CHỤP trên chuyến (`vc_trip.rest_minutes_snapshot` — kiểu `ChuyenVao.nghiChup`: "chụp lúc
// tạo / sửa"; đặc tả 2026-09-29 CH-02: "tạo/sửa chuyến, gán tài xế; chụp vào vc_trip.rest_minutes_snapshot"). Lệnh SỬA chuyến đổi giờ bắt đầu / kết thúc, xe
// hoặc tài xế ⇒ chụp lại `rest_minutes` của chính sách HIỆN HÀNH (cùng chỗ lệnh tạo đọc); lệnh sửa không đổi các trường đó ⇒ giữ số cũ. Luật kiểm lúc sửa
// (`kiemTaoSuaChuyen`) xét khoảng nghỉ theo ĐÚNG số sẽ ghi. Cổng xuất bến (`kiemXuatBen`) KHÔNG đổi — vẫn đọc số đã chụp (tách nghỉ tài xế / quay đầu xe là B4,
// cần ADR). Khuôn bài: docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/kiem-V3/v3-kiem.test.mjs ca "C21-phụ" (đảo khẳng định).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, DRIVER2, NGAY, SALES, SUP, batDongHo, chiTiet, denGio, don, setup, taoChuyen, tienDo, uuid, vnMs, xe, xepHet } from "../../../tests/audit/dieu-phoi-khung.mjs";

/** Chính sách gieo (0041) — chỉ đổi khoảng nghỉ. */
const chinhSach = (w: any, restMinutes: number) =>
  w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
    as: SUP, body: { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720, acceptWaitMinutes: 10, autoConfirmTransfer: true },
  });
const dongChuyen = (w: any, id: string): { rest_minutes_snapshot: number; rest_override_reason_code: string | null } =>
  ({ ...w.q("SELECT rest_minutes_snapshot, rest_override_reason_code FROM vc_trip WHERE id = ?", id)[0] });
const sua = async (w: any, id: string, body: Record<string, unknown>, as = SALES) =>
  w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as, body: { version: (await chiTiet(w, id)).chuyen.version, requestId: uuid(), ...body } });
const gio = (tu: string, den: string) => ({ batDau: { ngay: NGAY, gio: tu }, ketThuc: { ngay: NGAY, gio: den } });

/** Hai chuyến cùng xe, cùng tài xế: A 06:30–07:30, B 08:00–09:00 (cách 30 phút = khoảng nghỉ gieo); mỗi chuyến 2 khách. Đồng hồ: tối hôm trước 22:00. */
async function haiChuyen(w: any) {
  const X = xe(w, 16);
  const dA = await don(w, { soNguoi: 2, gio: "06:40", noiDon: "Khách sạn A" });
  const dB = await don(w, { soNguoi: 2, gio: "08:10", noiDon: "Khách sạn B" });
  const A = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:30" });
  const sauA = await xepHet(w, A, dA, 2);
  const B = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
  const sauB = await xepHet(w, B, dB, 2);
  return { aId: A.chuyen.id as string, bId: B.chuyen.id as string, sauA, sauB };
}
/** Tài xế chạy trọn chuyến A, kết thúc thật lúc 07:30. */
async function chayA(w: any, aId: string, sauA: any) {
  const donA = sauA.diem.find((d: any) => d.loai === "PICKUP").id;
  const traA = sauA.diem.find((d: any) => d.loai === "DROPOFF").id;
  const suatA = sauA.suat.filter((s: any) => s.loai === "PASSENGER").map((s: any) => s.id);
  denGio("06:30");
  assert.equal((await tienDo(w, "tai-xe", aId, "xuat-ben")).status, 200);
  denGio("06:40");
  assert.equal((await tienDo(w, "tai-xe", aId, `diem/${donA}/da-toi`)).status, 200);
  for (const s of suatA) assert.equal((await tienDo(w, "tai-xe", aId, `phan-bo/${s}/don`)).status, 200);
  denGio("07:25");
  assert.equal((await tienDo(w, "tai-xe", aId, `diem/${traA}/da-toi`)).status, 200);
  for (const s of suatA) assert.equal((await tienDo(w, "tai-xe", aId, `phan-bo/${s}/tra`)).status, 200);
  denGio("07:30");
  assert.equal((await tienDo(w, "tai-xe", aId, "ket-thuc")).status, 200);
}

test("C21-phụ đảo: Toàn quyền hạ khoảng nghỉ về 0 SAU khi B đã tạo; Bán hàng dời B sát A ⇒ B chụp số 0 và xuất bến được (không NGHI_THIEU)", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const { aId, bId, sauA } = await haiChuyen(w);
    assert.equal(dongChuyen(w, bId).rest_minutes_snapshot, 30, "B chụp 30 lúc tạo");
    assert.equal((await chinhSach(w, 0)).status, 201);
    const p = await sua(w, bId, gio("07:35", "08:35"));
    assert.equal(p.status, 200, p.text);
    assert.deepEqual(dongChuyen(w, bId), { rest_minutes_snapshot: 0, rest_override_reason_code: null }, "dời giờ ⇒ chụp lại khoảng nghỉ của chính sách hiện hành");
    await chayA(w, aId, sauA);
    denGio("07:35");
    const xb = await tienDo(w, "tai-xe", bId, "xuat-ben");
    assert.equal(xb.status, 200, xb.text);
    // Bản chụp xuất bến ghi đúng số đã dùng.
    assert.equal(w.q("SELECT rest_minutes_used FROM vc_trip_departure_check WHERE trip_id = ? AND ket_qua = 'DAT'", bId)[0].rest_minutes_used, 0);
  } finally {
    tat();
  }
});

test("chiều ngược: Toàn quyền NÂNG khoảng nghỉ lên 60 ⇒ dời B nhận số 60; lệnh dời vào khoảng < 60 phút bị chặn theo số mới (chua_du_nghi)", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const { bId } = await haiChuyen(w);
    assert.equal((await chinhSach(w, 60)).status, 201);
    const chan = await sua(w, bId, gio("08:10", "09:10")); // cách giờ kết thúc dự kiến của A 40 phút < 60
    assert.equal(chan.status, 409, chan.text);
    assert.equal(chan.json.error.code, "chua_du_nghi");
    assert.equal(dongChuyen(w, bId).rest_minutes_snapshot, 30, "409 không ghi gì");
    const p = await sua(w, bId, gio("08:45", "09:45"));
    assert.equal(p.status, 200, p.text);
    assert.equal(dongChuyen(w, bId).rest_minutes_snapshot, 60);
    // Chỉ đổi giờ KẾT THÚC cũng là dời giờ ⇒ chụp lại (đồng hồ tiến một phút: mỗi dòng chính sách một mốc hiệu lực).
    denGio("22:01", "2027-03-10");
    assert.equal((await chinhSach(w, 45)).status, 201);
    const k = await sua(w, bId, { ketThuc: { ngay: NGAY, gio: "10:00" } });
    assert.equal(k.status, 200, k.text);
    assert.equal(dongChuyen(w, bId).rest_minutes_snapshot, 45);
  } finally {
    tat();
  }
});

test("lệnh sửa KHÔNG đổi giờ / xe / tài xế giữ số đã chụp; phá lệ khoảng nghỉ giữ nguyên khi dời giờ sau đó", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const { bId, sauB } = await haiChuyen(w);
    assert.equal((await chinhSach(w, 0)).status, 201);
    // Quản trị chỉ phá lệ khoảng nghỉ (không đổi giờ) ⇒ số chụp vẫn 30.
    const p1 = await sua(w, bId, { nghiPhaLe: { lyDo: "PHA_LE_SU_CO" } }, ADM);
    assert.equal(p1.status, 200, p1.text);
    assert.deepEqual(dongChuyen(w, bId), { rest_minutes_snapshot: 30, rest_override_reason_code: "PHA_LE_SU_CO" });
    // Chỉ đổi giờ xe tới điểm đón (không đổi giờ chuyến) ⇒ giữ 30.
    const donB = sauB.diem.find((d: any) => d.loai === "PICKUP");
    const p2 = await sua(w, bId, { diem: [{ id: donB.id, thuTu: donB.thuTu, gioXeToi: { ngay: NGAY, gio: "08:05" } }] });
    assert.equal(p2.status, 200, p2.text);
    assert.equal(dongChuyen(w, bId).rest_minutes_snapshot, 30);
    // Dời giờ ⇒ chụp lại số hiện hành (0); lý do phá lệ cũ GIỮ NGUYÊN.
    const p3 = await sua(w, bId, gio("08:10", "09:10"));
    assert.equal(p3.status, 200, p3.text);
    assert.deepEqual(dongChuyen(w, bId), { rest_minutes_snapshot: 0, rest_override_reason_code: "PHA_LE_SU_CO" });
  } finally {
    tat();
  }
});

test("kiểm lúc sửa xét khoảng nghỉ theo SỐ SẼ GHI: chính sách nâng lên 60 sau khi B (cách A 30 phút) đã tạo — sửa giờ xe tới điểm (giữ số 30) không bị đòi phá lệ", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const { bId, sauB } = await haiChuyen(w);
    assert.equal((await chinhSach(w, 60)).status, 201);
    const donB = sauB.diem.find((d: any) => d.loai === "PICKUP");
    const p = await sua(w, bId, { diem: [{ id: donB.id, thuTu: donB.thuTu, gioXeToi: { ngay: NGAY, gio: "08:05" } }] });
    assert.equal(p.status, 200, p.text);
    assert.equal(dongChuyen(w, bId).rest_minutes_snapshot, 30, "không dời giờ ⇒ giữ số đã chụp");
  } finally {
    tat();
  }
});

// Phiếu kiểm độc lập V2(b): mỗi vế của điều kiện chụp lại có một bài riêng — bỏ riêng vế `doiXe` hay riêng vế `doiTaiXe` đều phải đỏ.
/** Một chuyến B 08:00–09:00 (không khách) chụp 30 lúc tạo. */
async function motChuyen(w: any) {
  const B = await taoChuyen(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
  const id = B.chuyen.id as string;
  assert.equal(dongChuyen(w, id).rest_minutes_snapshot, 30, "chụp 30 lúc tạo");
  return id;
}
const keHoach = (w: any, id: string) => ({
  ...w.q(
    `SELECT t.planned_start_ms, t.planned_end_ms, t.vehicle_id,
       (SELECT d.driver_party_id FROM vc_trip_driver d WHERE d.trip_id = t.id AND d.valid_to_at IS NULL) AS driver_party_id
     FROM vc_trip t WHERE t.id = ?`, id)[0],
});

test("chỉ đổi XE (giữ giờ, giữ tài xế) ⇒ chụp lại khoảng nghỉ của chính sách hiện hành", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const id = await motChuyen(w);
    const truoc = keHoach(w, id);
    assert.equal((await chinhSach(w, 0)).status, 201);
    const xeMoi = xe(w, 16);
    const p = await sua(w, id, { xeId: xeMoi });
    assert.equal(p.status, 200, p.text);
    assert.deepEqual(keHoach(w, id), { ...truoc, vehicle_id: xeMoi }, "lệnh chỉ đổi xe");
    assert.equal(dongChuyen(w, id).rest_minutes_snapshot, 0);
  } finally {
    tat();
  }
});

test("chỉ đổi TÀI XẾ (giữ giờ, giữ xe) ⇒ chụp lại khoảng nghỉ của chính sách hiện hành", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const id = await motChuyen(w);
    const truoc = keHoach(w, id);
    assert.equal((await chinhSach(w, 45)).status, 201);
    const p = await sua(w, id, { taiXePartyId: `pty-${DRIVER2}` });
    assert.equal(p.status, 200, p.text);
    assert.deepEqual(keHoach(w, id), { ...truoc, driver_party_id: `pty-${DRIVER2}` }, "lệnh chỉ đổi tài xế");
    assert.equal(dongChuyen(w, id).rest_minutes_snapshot, 45);
  } finally {
    tat();
  }
});

// Phiếu kiểm độc lập vòng 2 (THẤP, 8/10): bỏ riêng vế "đổi giờ BẮT ĐẦU" vẫn xanh vì mọi bài dời giờ đều đổi luôn giờ kết thúc — bài này giữ riêng vế đó.
test("chỉ đổi GIỜ BẮT ĐẦU (giữ giờ kết thúc, xe, tài xế) ⇒ chụp lại khoảng nghỉ của chính sách hiện hành", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const id = await motChuyen(w);
    const truoc = keHoach(w, id);
    assert.equal((await chinhSach(w, 15)).status, 201);
    const p = await sua(w, id, gio("08:10", "09:00"));
    assert.equal(p.status, 200, p.text);
    const sau = keHoach(w, id);
    assert.equal(sau.planned_end_ms, truoc.planned_end_ms, "giờ kết thúc giữ nguyên");
    assert.equal(sau.planned_start_ms - truoc.planned_start_ms, 10 * 60_000, "chỉ dời giờ bắt đầu 10 phút");
    assert.equal(dongChuyen(w, id).rest_minutes_snapshot, 15);
  } finally {
    tat();
  }
});
