// TIN ĐIỀU CHỈNH KHẨN CẤP CHO TÀI XẾ (ADR-0104 Đ1 mục 6; kế hoạch NT-11, T1.7). Máy chủ thật (khung thử harness + D1 node:sqlite; chính sách gieo: mốc
// 360 phút), đồng hồ giả 2027-03-11 06:00 giờ VN. Lệnh khách (xếp / rút / dời) mang luật vượt `MOC_TOI_THIEU` trên chuyến có dòng lái mở → tài xế đang lái
// có tin (không tên, không SĐT); cùng lệnh không vượt mốc → không tin; người làm, văn phòng không nhận. Dời (phiếu kiểm D1 CAO-2, ADR-0104 Đ1.6 :95, :232):
// tài xế chuyến ĐÍCH ("chuyển khách tới") và tài xế chuyến NGUỒN ("chuyển khách đi" — nguồn = `related_trip_id` của sự kiện, không thêm hành động, không thêm
// dòng nhật ký). Nguồn: hộp thông báo `GET /api/thong-bao` + dữ kiện `chuyenChoTinTheoId` (khoá `khanCap` = id sự kiện) + dòng gõ cửa `dongChuyenTheoId`
// + người nhận gõ cửa `nguoiNhanDay` (cùng hàm với hộp).
// CAO-C (lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật (Recommended)" — lệch có chủ ý với chữ ADR-0104 :95, SYSTEM-DESIGN §16): lệnh khách mang BẤT KỲ luật bị
// bỏ qua (`override_rule_code IS NOT NULL`) cũng báo tài xế; câu "điều chỉnh khẩn cấp" chỉ khi luật là `MOC_TOI_THIEU`, luật khác câu trung tính "Văn phòng vừa
// điều chỉnh chuyến …". Bài "không tin" dùng `tinLenhKhach` (bắt CẢ hai câu) — tin trung tính sai chỗ cũng đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app } from "../tests/audit/harness.mjs";
import { ADM, DRIVER, DRIVER2, NGAY_SAU, SALES, batDongHo, chiTiet, denGio, don, setup, taoChuyen, uuid, xe } from "../tests/audit/dieu-phoi-khung.mjs";
import { nguoiNhanDay } from "./shared/web-push.ts";

const PL = { lyDo: "PHA_LE_SU_CO" };
const goi = (w: any, as: string, m: string, duoi: string, body: Record<string, unknown>) => w.call(m, `/api/van-chuyen/chuyen${duoi}`, { as, body: { requestId: uuid(), ...body } });
const phienBan = async (w: any, id: string) => (await chiTiet(w, id, ADM)).chuyen.version;
const xep = async (w: any, as: string, tripId: string, chang: unknown[], extra: Record<string, unknown> = {}) =>
  goi(w, as, "POST", `/${tripId}/phan-bo`, { version: await phienBan(w, tripId), chang, ...extra });
const tinKhanCap = async (w: any, as: string): Promise<string[]> =>
  (await w.call("GET", "/api/thong-bao", { as })).json.tin.filter((x: any) => x.loai === "chuyen" && /điều chỉnh khẩn cấp/.test(x.cau)).map((x: any) => x.cau);
/** Mọi tin của ba lệnh khách (câu khẩn cấp HOẶC câu trung tính CAO-C) — dùng cho kỳ vọng "không tin". */
const tinLenhKhach = async (w: any, as: string): Promise<string[]> =>
  (await w.call("GET", "/api/thong-bao", { as })).json.tin.filter((x: any) => x.loai === "chuyen" && /^Văn phòng vừa điều chỉnh (khẩn cấp )?chuyến/.test(x.cau)).map((x: any) => x.cau);
const lienKetTin = async (w: any, as: string, mau: RegExp): Promise<string[]> =>
  (await w.call("GET", "/api/thong-bao", { as })).json.tin.filter((x: any) => x.loai === "chuyen" && mau.test(x.cau)).map((x: any) => x.lienKet);
/** Tài khoản cho người nhận gõ cửa (cùng quyền với khung thử — dieu-phoi-khung.mjs). */
const TAI_KHOAN = [
  { id: DRIVER, permissions: ["DRIVER"], partyId: `pty-${DRIVER}` }, { id: DRIVER2, permissions: ["DRIVER"], partyId: `pty-${DRIVER2}` },
  { id: SALES, permissions: ["SALES"], partyId: null }, { id: ADM, permissions: ["ADMIN"], partyId: null },
];
/** Ai được gõ cửa cho sự kiện dời (đường gốc lắp ráp: `dongChuyenTheoId` với chuyến đích + chuyến nguồn, như `baoThayDoiChuyen` ở src/index.ts). */
async function goCuaDoi(w: any, dichId: string, nguonId: string): Promise<string[]> {
  const ev = w.q("SELECT id, occurred_at FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATION_MOVED' ORDER BY rowid DESC", dichId)[0];
  const kq = await app.dongChuyenTheoId(w.env.DB, ev.id, (q: any) => app.chuyenChoTinTheoId(w.env.DB, q), [dichId, nguonId]);
  assert.ok(kq, "có dòng gõ cửa");
  return nguoiNhanDay(TAI_KHOAN as any, { chuyen: kq.dong }, new Date(Date.parse(kq.dong.luc) + 1).toISOString()).sort();
}

test("NT-11 (ADR-0104 Đ1 mục 6): xếp / rút dưới mốc có điều chỉnh khẩn cấp → tài xế đang lái có tin; Bán hàng (người làm), Quản trị không; câu không tên, không SĐT", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00", soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    const x = await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(x.status, 200, x.text);
    const tin1 = await tinKhanCap(w, DRIVER);
    assert.deepEqual(tin1, [`Văn phòng vừa điều chỉnh khẩn cấp chuyến ${t.chuyen.ma} ngày 11/03 (xếp thêm khách) — mở để xem`]);
    assert.deepEqual(await tinLenhKhach(w, SALES), [], "người làm không tự nhận");
    assert.deepEqual(await tinLenhKhach(w, ADM), [], "không tin cho Quản trị");
    const rut = await goi(w, SALES, "POST", `/${t.chuyen.id}/rut`, { version: await phienBan(w, t.chuyen.id), suatIds: [x.json.suat[0].id], phaLe: PL });
    assert.equal(rut.status, 200, rut.text);
    assert.equal((await tinKhanCap(w, DRIVER)).filter((c) => /rút khách/.test(c)).length, 1);
    // Dữ kiện chuyến cho tin: `khanCap` = id sự kiện mang MOC_TOI_THIEU trong số id được hỏi.
    const ev = w.q("SELECT id FROM vc_trip_event WHERE trip_id = ? AND kind IN ('ALLOCATED', 'ALLOCATION_REMOVED') ORDER BY rowid", t.chuyen.id).map((r: any) => r.id);
    const f = await app.chuyenChoTinTheoId(w.env.DB, { tripIds: [t.chuyen.id], suKienIds: ev });
    assert.deepEqual([...f.khanCap].sort(), [...ev].sort());
    // Đường gõ cửa (gốc lắp ráp): dòng của lệnh xếp mang khanCap.
    const kq = await app.dongChuyenTheoId(w.env.DB, ev[0], (q: any) => app.chuyenChoTinTheoId(w.env.DB, q));
    assert.equal(kq?.dong.khanCap, true);
    assert.doesNotMatch(JSON.stringify(tin1), /Khách|09\d{8}/);
  } finally {
    tat();
  }
});

test("NT-11 + CAO-C: cùng lệnh KHÔNG bỏ qua luật nào → không tin (cả câu trung tính) — xếp chuyến ngoài mốc; xếp chặng đặt gấp vào chuyến dưới mốc (không cờ)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { ngay: NGAY_SAU, gio: "09:00", soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "12:00" }); // ngoài mốc
    assert.equal((await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }])).status, 200);
    const gap = await don(w, { gio: "13:00", soNguoi: 2 });
    assert.equal((await w.call("POST", `/api/orders/${gap.id}/legs/${gap.legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    assert.equal((await xep(w, SALES, t2.chuyen.id, [{ legId: gap.legId, soSuat: 2 }])).status, 200);
    assert.deepEqual(w.q("SELECT override_rule_code r FROM vc_trip_event WHERE kind = 'ALLOCATED'").map((x: any) => x.r), [null, null], "không luật bỏ qua");
    assert.deepEqual(await tinLenhKhach(w, DRIVER), []);
    assert.deepEqual(await tinLenhKhach(w, DRIVER2), []);
  } finally {
    tat();
  }
});

test("NT-11 + phiếu D1 CAO-2 (ADR-0104 Đ1.6 :95, :232): dời có điều chỉnh khẩn cấp → tài xế chuyến ĐÍCH 'chuyển khách tới' và tài xế chuyến NGUỒN đúng MỘT tin 'chuyển khách đi' (liên kết chuyến nguồn); văn phòng không; gõ cửa tới cả hai tài xế", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00", soNguoi: 2 });
    const nguon = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" });
    const dich = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:10", kt: "15:00" });
    const x = await xep(w, ADM, nguon.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(x.status, 200, x.text);
    const d = await goi(w, SALES, "POST", `/${nguon.chuyen.id}/doi`, {
      version: await phienBan(w, nguon.chuyen.id), suatIds: x.json.suat.map((s: any) => s.id), denChuyenId: dich.chuyen.id, denVersion: await phienBan(w, dich.chuyen.id), phaLe: PL,
    });
    assert.equal(d.status, 200, d.text);
    assert.deepEqual(await tinKhanCap(w, DRIVER2), [`Văn phòng vừa điều chỉnh khẩn cấp chuyến ${dich.chuyen.ma} ngày 11/03 (chuyển khách tới) — mở để xem`]);
    assert.deepEqual((await tinKhanCap(w, DRIVER)).filter((c) => /chuyển khách/.test(c)), [`Văn phòng vừa điều chỉnh khẩn cấp chuyến ${nguon.chuyen.ma} ngày 11/03 (chuyển khách đi) — mở để xem`], "tài xế nguồn: đúng một tin dời");
    assert.deepEqual(await lienKetTin(w, DRIVER, /chuyển khách đi/), [`/cuoc-chuyen?id=${encodeURIComponent(nguon.chuyen.id)}`]);
    assert.deepEqual(await tinLenhKhach(w, ADM), [], "văn phòng không nhận");
    assert.deepEqual(await tinLenhKhach(w, SALES), [], "người làm không tự nhận");
    assert.deepEqual(await goCuaDoi(w, dich.chuyen.id, nguon.chuyen.id), [DRIVER, DRIVER2].sort(), "gõ cửa tới cả hai tài xế");
    // Dữ kiện: hỏi CHỈ chuyến đích + sự kiện dời → chuyến nguồn (kèm khoảng lái) tự có trong dữ kiện, khanCapNguon chỉ đúng nguồn — hộp không phải tự biết nguồn.
    const evDoi = w.q("SELECT id FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATION_MOVED'", dich.chuyen.id)[0].id;
    const f = await app.chuyenChoTinTheoId(w.env.DB, { tripIds: [dich.chuyen.id], suKienIds: [evDoi] });
    assert.deepEqual(f.khanCapNguon, [{ suKienId: evDoi, tripId: nguon.chuyen.id }]);
    const cn = f.chuyen.find((c: any) => c.tripId === nguon.chuyen.id);
    assert.ok(cn, "chuyến nguồn có trong dữ kiện");
    assert.deepEqual(cn.lai.map((l: any) => l.partyId), [`pty-${DRIVER}`]);
  } finally {
    tat();
  }
});

test("Phiếu D1 CAO-2: dời KHÔNG vượt mốc (hai chuyến ngoài mốc, không cờ) → không tin cho cả tài xế nguồn lẫn tài xế đích; không gõ cửa", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { ngay: NGAY_SAU, gio: "09:00", soNguoi: 2 });
    const nguon = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "12:00" });
    const dich = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "08:10", kt: "12:00" });
    const x = await xep(w, SALES, nguon.chuyen.id, [{ legId: a.legId, soSuat: 2 }]);
    assert.equal(x.status, 200, x.text);
    const d = await goi(w, SALES, "POST", `/${nguon.chuyen.id}/doi`, {
      version: await phienBan(w, nguon.chuyen.id), suatIds: x.json.suat.map((s: any) => s.id), denChuyenId: dich.chuyen.id, denVersion: await phienBan(w, dich.chuyen.id),
    });
    assert.equal(d.status, 200, d.text);
    assert.deepEqual(await tinLenhKhach(w, DRIVER), []);
    assert.deepEqual(await tinLenhKhach(w, DRIVER2), []);
    assert.deepEqual(await goCuaDoi(w, dich.chuyen.id, nguon.chuyen.id), []);
  } finally {
    tat();
  }
});

test("Phiếu D1 CAO-3 (a): 3001 dòng xếp KHÔNG khẩn cấp MỚI HƠN (vượt trần 3000 của nhóm tin cũ) không đẩy tin huỷ chuyến CŨ của tài xế ra khỏi hộp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "12:00" });
    denGio("06:10");
    const h = await goi(w, ADM, "POST", `/${t.chuyen.id}/huy`, { version: await phienBan(w, t.chuyen.id), lyDo: "HUY_KHAC" });
    assert.equal(h.status, 200, h.text);
    const cauHuy = `Chuyến ${t.chuyen.ma} ngày 12/03 đã bị huỷ`;
    const soTinHuy = async () => (await w.call("GET", "/api/thong-bao", { as: DRIVER })).json.tin.filter((x: any) => x.loai === "chuyen" && x.cau === cauHuy).length;
    assert.equal(await soTinHuy(), 1, "trước: tài xế có tin huỷ");
    denGio("07:00");
    // Dòng nhật ký xếp GIẢ (hình chiếu v_aud_trip_event — không sự kiện mang cờ mốc ⇒ không sinh tin), mới hơn dòng huỷ, nhiều hơn trần cũ (3000).
    const base = Date.now() - 40 * 60_000; // 06:20 giờ VN — sau dòng huỷ (06:10), trước giờ đọc (07:00)
    const chen = w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, NULL, ?, 'trip_allocated', 'trip', ?, 'x', ?)");
    w.sqlite.exec("BEGIN");
    for (let i = 0; i < 3001; i++) chen.run(`gia-xep-${i}`, SALES, t.chuyen.id, new Date(base + 60_000 + i * 100).toISOString());
    w.sqlite.exec("COMMIT");
    assert.equal(w.q("SELECT count(*) n FROM v_aud_trip_event WHERE action = 'trip_allocated' AND created_at > (SELECT created_at FROM v_aud_trip_event WHERE action = 'trip_cancelled')")[0].n, 3001);
    assert.equal(await soTinHuy(), 1, "sau 3001 dòng xếp mới hơn: tin huỷ vẫn còn trong hộp");
  } finally {
    tat();
  }
});

// CAO-C (lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật"): bài này từng ghim hiện trạng "tài xế KHÔNG có tin" — đổi màu có tên theo lời chủ.
test("Phiếu D1 THẤP-7 + CAO-C (báo mọi lệnh có bỏ qua luật — chủ chọn 2026-10-08): Bán hàng xếp chặng ĐẶT GẤP vào chuyến dưới mốc có tài xế, CHỈ kèm camKetPhaLe → 200, sự kiện mang CAM_KET; tài xế có ĐÚNG MỘT tin câu TRUNG TÍNH (không 'khẩn cấp'); người làm, Quản trị không", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const gap = await don(w, { gio: "13:00", soNguoi: 2 });
    assert.equal((await w.call("POST", `/api/orders/${gap.id}/legs/${gap.legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
    w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 30 WHERE id = ?").run(gap.legId); // xe 15 chỗ trái cam kết số chỗ
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    const r = await xep(w, SALES, t.chuyen.id, [{ legId: gap.legId, soSuat: 2 }], { camKetPhaLe: PL });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(w.q("SELECT override_rule_code r FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATED'", t.chuyen.id).map((x: any) => x.r), ["CAM_KET"]);
    assert.deepEqual(await tinLenhKhach(w, DRIVER), [`Văn phòng vừa điều chỉnh chuyến ${t.chuyen.ma} ngày 11/03 (xếp thêm khách) — mở để xem`], "câu trung tính");
    assert.deepEqual(await lienKetTin(w, DRIVER, /xếp thêm khách/), [`/cuoc-chuyen?id=${encodeURIComponent(t.chuyen.id)}`]);
    assert.deepEqual(await tinLenhKhach(w, SALES), [], "người làm không tự nhận");
    assert.deepEqual(await tinLenhKhach(w, ADM), [], "văn phòng không nhận");
  } finally {
    tat();
  }
});

// ---- Phiếu kiểm hẹp D1 CAO-C: tin bám mã luật MOC_TOI_THIEU, không bám lớp — ghim HIỆN TRẠNG ở ca DỜI ---------------------------------------------------------
/** Đánh dấu ĐẶT GẤP cho chặng (đường thật — Quản trị). */
async function datGap(w: any, d: { id: string; legId: string }) {
  const r = await w.call("POST", `/api/orders/${d.id}/legs/${d.legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } });
  assert.equal(r.status, 200, r.text);
}
/** Dời mọi suất mở của `nguon` sang `dich` (Bán hàng), `co` = cờ vượt gửi kèm. */
async function doiHet(w: any, nguon: string, dich: string, suatIds: string[], co: Record<string, unknown>) {
  return goi(w, SALES, "POST", `/${nguon}/doi`, { version: await phienBan(w, nguon), suatIds, denChuyenId: dich, denVersion: await phienBan(w, dich), ...co });
}
// Bài này từng ghim HIỆN TRẠNG "không tin" chờ chủ quyết (ADR-0104 :95 vs :90). Chủ chọn 2026-10-08 "Báo mọi lệnh có bỏ qua luật (Recommended)" — đổi màu có tên.
test("Phiếu hẹp D1 CAO-C (báo mọi lệnh có bỏ qua luật — chủ chọn 2026-10-08): Bán hàng DỜI chặng ĐẶT GẤP từ chuyến NGOÀI mốc sang chuyến DƯỚI mốc, CHỈ kèm camKetPhaLe → 200, sự kiện mang CAM_KET; tài xế đích ('chuyển khách tới') và tài xế nguồn ('chuyển khách đi', liên kết chuyến nguồn) mỗi người ĐÚNG MỘT tin câu TRUNG TÍNH; dữ kiện tự nạp chuyến nguồn; gõ cửa cả hai", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const gap = await don(w, { gio: "13:00", soNguoi: 2 });
    await datGap(w, gap);
    const nguon = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "16:00" }); // ngoài mốc (còn 6 giờ 30)
    const dich = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    const x = await xep(w, SALES, nguon.chuyen.id, [{ legId: gap.legId, soSuat: 2 }]);
    assert.equal(x.status, 200, x.text);
    w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 30 WHERE id = ?").run(gap.legId); // xe 15 chỗ của chuyến đích trái cam kết số chỗ
    const d = await doiHet(w, nguon.chuyen.id, dich.chuyen.id, x.json.suat.map((s: any) => s.id), { camKetPhaLe: PL });
    assert.equal(d.status, 200, d.text);
    assert.deepEqual(w.q("SELECT override_rule_code r FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATION_MOVED'", dich.chuyen.id).map((r: any) => r.r), ["CAM_KET"]);
    assert.deepEqual(await tinLenhKhach(w, DRIVER2), [`Văn phòng vừa điều chỉnh chuyến ${dich.chuyen.ma} ngày 11/03 (chuyển khách tới) — mở để xem`], "tài xế đích: câu trung tính");
    assert.deepEqual(await tinLenhKhach(w, DRIVER), [`Văn phòng vừa điều chỉnh chuyến ${nguon.chuyen.ma} ngày 11/03 (chuyển khách đi) — mở để xem`], "tài xế nguồn: câu trung tính");
    assert.deepEqual(await lienKetTin(w, DRIVER, /chuyển khách đi/), [`/cuoc-chuyen?id=${encodeURIComponent(nguon.chuyen.id)}`]);
    assert.deepEqual(await tinLenhKhach(w, SALES), [], "người làm không tự nhận");
    assert.deepEqual(await tinLenhKhach(w, ADM), [], "văn phòng không nhận");
    assert.deepEqual(await goCuaDoi(w, dich.chuyen.id, nguon.chuyen.id), [DRIVER, DRIVER2].sort(), "gõ cửa tới cả hai tài xế");
    // Dữ kiện: hỏi CHỈ chuyến đích + sự kiện dời mang CAM_KET → chuyến nguồn (kèm khoảng lái) tự có trong dữ kiện; cờ tin có, cờ mốc không.
    const evDoi = w.q("SELECT id FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATION_MOVED'", dich.chuyen.id)[0].id;
    const f = await app.chuyenChoTinTheoId(w.env.DB, { tripIds: [dich.chuyen.id], suKienIds: [evDoi] });
    assert.deepEqual(f.khanCap, [evDoi], "cờ tin: sự kiện có bỏ qua luật");
    assert.deepEqual(f.vuotMoc ?? [], [], "cờ mốc: không (câu trung tính)");
    assert.deepEqual(f.khanCapNguon, [{ suKienId: evDoi, tripId: nguon.chuyen.id }]);
    const cn = f.chuyen.find((c: any) => c.tripId === nguon.chuyen.id);
    assert.ok(cn, "chuyến nguồn có trong dữ kiện");
    assert.deepEqual(cn.lai.map((l: any) => l.partyId), [`pty-${DRIVER}`]);
  } finally {
    tat();
  }
});

test("Phiếu hẹp D1 CAO-C (ca biên): dời chặng thường từ chuyến NGOÀI mốc sang chuyến DƯỚI mốc kèm phaLe → sự kiện mang MOC_TOI_THIEU; tài xế nguồn (chuyến ngoài mốc) VẪN nhận 'chuyển khách đi', tài xế đích nhận 'chuyển khách tới'", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00", soNguoi: 2 });
    const nguon = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "16:00" }); // ngoài mốc
    const dich = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    const x = await xep(w, SALES, nguon.chuyen.id, [{ legId: a.legId, soSuat: 2 }]);
    assert.equal(x.status, 200, x.text);
    const d = await doiHet(w, nguon.chuyen.id, dich.chuyen.id, x.json.suat.map((s: any) => s.id), { phaLe: PL });
    assert.equal(d.status, 200, d.text);
    assert.deepEqual(w.q("SELECT override_rule_code r FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATION_MOVED'", dich.chuyen.id).map((r: any) => r.r), ["MOC_TOI_THIEU"]);
    assert.deepEqual(await tinKhanCap(w, DRIVER), [`Văn phòng vừa điều chỉnh khẩn cấp chuyến ${nguon.chuyen.ma} ngày 11/03 (chuyển khách đi) — mở để xem`]);
    assert.deepEqual(await tinKhanCap(w, DRIVER2), [`Văn phòng vừa điều chỉnh khẩn cấp chuyến ${dich.chuyen.ma} ngày 11/03 (chuyển khách tới) — mở để xem`]);
    // CAO-C: sự kiện mang MOC_TOI_THIEU ⇒ có trong CẢ cờ tin lẫn cờ mốc (câu "khẩn cấp"); không thêm tin trung tính.
    const evDoi = w.q("SELECT id FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATION_MOVED'", dich.chuyen.id)[0].id;
    const f = await app.chuyenChoTinTheoId(w.env.DB, { tripIds: [dich.chuyen.id], suKienIds: [evDoi] });
    assert.deepEqual([f.khanCap, f.vuotMoc], [[evDoi], [evDoi]]);
    assert.equal((await tinLenhKhach(w, DRIVER)).length, 1, "tài xế nguồn: một tin, không thêm câu trung tính");
  } finally {
    tat();
  }
});

test("CAO-C (báo mọi lệnh có bỏ qua luật — chủ chọn 2026-10-08, ca 'ồn' chủ chấp nhận): Quản trị xếp đơn thường vào chuyến NGOÀI mốc có tài xế, CHỈ kèm camKetPhaLe → 200, sự kiện mang CAM_KET; tài xế có ĐÚNG MỘT tin câu TRUNG TÍNH (không 'khẩn cấp', không '6 giờ'); Quản trị (người làm), Bán hàng không; gõ cửa tới tài xế", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { ngay: NGAY_SAU, gio: "09:00", soNguoi: 2 });
    w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 30 WHERE id = ?").run(a.legId); // xe 15 chỗ trái cam kết số chỗ
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "12:00" }); // ngoài mốc
    const r = await xep(w, ADM, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { camKetPhaLe: PL });
    assert.equal(r.status, 200, r.text);
    const ev = w.q("SELECT id, override_rule_code r FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATED'", t.chuyen.id);
    assert.deepEqual(ev.map((x: any) => x.r), ["CAM_KET"]);
    const tin = await tinLenhKhach(w, DRIVER);
    assert.deepEqual(tin, [`Văn phòng vừa điều chỉnh chuyến ${t.chuyen.ma} ngày 12/03 (xếp thêm khách) — mở để xem`]);
    assert.doesNotMatch(tin[0]!, /khẩn cấp|6 giờ|phá lệ/);
    assert.deepEqual(await tinLenhKhach(w, ADM), [], "người làm không tự nhận");
    assert.deepEqual(await tinLenhKhach(w, SALES), [], "văn phòng không nhận");
    // Đường gõ cửa (gốc lắp ráp): dòng của lệnh xếp mang cờ tin ⇒ dongCoTheSinhTin đúng; người nhận gõ cửa chỉ tài xế.
    const kq = await app.dongChuyenTheoId(w.env.DB, ev[0].id, (q: any) => app.chuyenChoTinTheoId(w.env.DB, q));
    assert.equal(kq?.dong.khanCap, true, "cờ tin");
    assert.equal(kq?.dong.vuotMoc, false, "cờ mốc");
    assert.deepEqual(nguoiNhanDay(TAI_KHOAN as any, { chuyen: kq!.dong }, new Date(Date.parse(kq!.dong.luc) + 1).toISOString()), [DRIVER]);
  } finally {
    tat();
  }
});

// ---- Phiếu kiểm hẹp D1 THẤP-1: hai trần của hộp tin chuyến (src/modules/thongbao/repository.ts — `listTinChuyen`) -------------------------------------------
/** Chèn `n` dòng nhật ký chuyến GIẢ (hình chiếu v_aud_trip_event — không có sự kiện vc_trip_event nên không sinh tin), lúc `tuMs` + i × 100 ms. */
function chenDongGia(w: any, n: number, action: string, tripId: string, tuMs: number) {
  const chen = w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, NULL, ?, ?, 'trip', ?, 'x', ?)");
  w.sqlite.exec("BEGIN");
  for (let i = 0; i < n; i++) chen.run(`gia-${action}-${i}`, SALES, action, tripId, new Date(tuMs + i * 100).toISOString());
  w.sqlite.exec("COMMIT");
}
test("Phiếu hẹp D1 THẤP-1 (K9 — trần nhóm tin cũ đọc ĐỦ 3000 dòng gần nhất): 2999 dòng sửa chuyến (chuyến khác, không tin cho tài xế này) MỚI HƠN tin huỷ chuyến của tài xế — tin huỷ là dòng thứ 3000, vẫn còn trong hộp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "12:00" });
    const khac = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "08:00", kt: "12:00" });
    denGio("06:10");
    const h = await goi(w, ADM, "POST", `/${t.chuyen.id}/huy`, { version: await phienBan(w, t.chuyen.id), lyDo: "HUY_KHAC" });
    assert.equal(h.status, 200, h.text);
    const cauHuy = `Chuyến ${t.chuyen.ma} ngày 12/03 đã bị huỷ`;
    const soTinHuy = async () => (await w.call("GET", "/api/thong-bao", { as: DRIVER })).json.tin.filter((x: any) => x.loai === "chuyen" && x.cau === cauHuy).length;
    assert.equal(await soTinHuy(), 1, "trước: tài xế có tin huỷ");
    denGio("07:00");
    chenDongGia(w, 2999, "trip_edited", khac.chuyen.id, Date.now() - 40 * 60_000); // 06:20 → sau dòng huỷ (06:10), trước giờ đọc
    assert.equal(w.q("SELECT count(*) n FROM v_aud_trip_event WHERE action IN ('trip_edited', 'trip_cancelled', 'trip_created') AND created_at >= (SELECT created_at FROM v_aud_trip_event WHERE action = 'trip_cancelled')")[0].n, 3000, "dòng huỷ là dòng thứ 3000 của nhóm cũ");
    assert.equal(await soTinHuy(), 1, "tin huỷ vẫn còn (trần nhóm cũ = 3000)");
  } finally {
    tat();
  }
});

test("Phiếu hẹp D1 THẤP-1 (K10 — trần riêng ba lệnh khách giữ dòng MỚI nhất): 1001 dòng xếp thường CŨ HƠN một lệnh xếp có điều chỉnh khẩn cấp thật — tài xế vẫn có tin khẩn cấp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const khac = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "08:00", kt: "12:00" });
    chenDongGia(w, 1001, "trip_allocated", khac.chuyen.id, Date.now() - 60 * 60_000); // 05:00 → trước lệnh thật (06:00)
    const a = await don(w, { gio: "13:00", soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    const x = await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(x.status, 200, x.text);
    assert.equal(w.q("SELECT count(*) n FROM v_aud_trip_event WHERE action = 'trip_allocated'")[0].n, 1002);
    assert.deepEqual(await tinKhanCap(w, DRIVER), [`Văn phòng vừa điều chỉnh khẩn cấp chuyến ${t.chuyen.ma} ngày 11/03 (xếp thêm khách) — mở để xem`]);
  } finally {
    tat();
  }
});
