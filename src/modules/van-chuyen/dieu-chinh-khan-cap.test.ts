// ĐIỀU CHỈNH KHẨN CẤP (ADR-0104 Đ1, Q-1 b — chủ 2026-10-08; kế hoạch `docs/superpowers/plans/2026-10-08-adr-0104-ke-hoach.md` NT-1, NT-2). Máy chủ thật
// (khung thử harness + D1 node:sqlite, đủ migration; chính sách gieo: mốc 360 phút, nghỉ 30 phút), đồng hồ giả 2027-03-11 06:00 giờ VN.
//   - Vượt MỐC ở mọi lệnh bị khoá (xếp, rút, dời, thêm khi xe chạy, đổi xe, đổi tài xế, huỷ chuyến còn khách) = lớp KHAN_CAP: Bán hàng, Quản trị, Toàn quyền.
//   - Vượt khoảng nghỉ / cam kết: chuyến DƯỚI mốc → KHAN_CAP; NGOÀI mốc → QUAN_TRI ("Phá lệ" — chỉ Quản trị, Toàn quyền; Bán hàng 403).
//   - "Dưới mốc" mỗi lệnh một định nghĩa (Đ1 mục 0): xếp / rút / huỷ theo giờ xét mốc của chuyến; dời theo chuyến ĐÍCH; sửa theo min(cũ, mới, sớm nhất)
//     (rào mềm, chủ 2026-10-08 "Cho qua, tính là sát giờ"); tạo theo giờ bắt đầu mới. Dấu đặt gấp KHÔNG làm chuyến thôi dưới mốc.
//   - Luật lõi (LC-02 sức chứa…) không ai vượt.
// Tên, SĐT, số giấy tờ là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ACC, ADM, DRIVER, DRIVER2, LOC, NGAY, NGAY_SAU, SALES, batDongHo, chiTiet, don, setup, taoChuyen, tienDo, uuid, xe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const PL = { lyDo: "PHA_LE_SU_CO" };
const AT = "2026-09-01T00:00:00.000Z";
const CAU_QUAN_TRI = "Chỉ Quản trị hoặc Toàn quyền phá lệ được.";
let so = 0;

/** Tài xế công ty MỚI (hồ sơ người + vai DRIVER_INTERNAL + GPLX hạng D1 — số GIẢ). */
function taiXeMoi(w: any): string {
  const id = `p-kc-${++so}`;
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'PERSON', 'Tài Xế Khẩn ${so}', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${id}', 'Tài Xế Khẩn ${so}', '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-kc-${so}', '${id}', 'DRIVER_INTERNAL', NULL, '2026-09-01', '${AT}', '${AT}')`);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, 'D1', '2030-12-31', ?, ?)`).run(`g-kc-${so}`, id, `7933000000${String(so).padStart(2, "0")}`, `7933000000${String(so).padStart(2, "0")}`, AT, AT);
  return id;
}
/** Đơn ĐÃ XÁC NHẬN có cam kết xe riêng (chặng chiều đi, đón `gio` ngày `ngay`, trả ở bến). */
async function donXeRieng(w: any, v: { ngay?: string; gio: string; soNguoi?: number }) {
  const soNguoi = v.soNguoi ?? 2;
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Riêng", customerPhone: "0912345678",
      services: [{
        kind: "catalog", catalogCode: "ZA1", pax: { adult: soNguoi, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: v.ngay ?? NGAY,
        legs: [{ direction: "OUT", pickupDate: v.ngay ?? NGAY, pickupTime: v.gio, pickupLocationId: null, pickupPlace: "Khách sạn Riêng", dropoffLocationId: LOC, dropoffPlace: "", exclusiveVehicle: true }],
      }],
      passengers: Array.from({ length: soNguoi }, (_x, i) => ({ fullName: `Khách Riêng ${i + 1}`, birthYear: 1980 + i, paxCode: "adult" })),
    },
  });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return { id: o.id, code: o.orderCode, legId: o.services[0].legs[0].id };
}
const goi = (w: any, as: string, m: string, duoi: string, body: Record<string, unknown>) => w.call(m, `/api/van-chuyen/chuyen${duoi}`, { as, body: { requestId: uuid(), ...body } });
const phienBan = async (w: any, id: string) => (await chiTiet(w, id, ADM)).chuyen.version;
async function xep(w: any, as: string, tripId: string, chang: unknown[], extra: Record<string, unknown> = {}) {
  return goi(w, as, "POST", `/${tripId}/phan-bo`, { version: await phienBan(w, tripId), chang, ...extra });
}
const suKien = (w: any, kind: string, tripId: string) =>
  w.q("SELECT override_rule_code r, override_reason_code l, created_by c FROM vc_trip_event WHERE kind = ? AND trip_id = ? ORDER BY rowid DESC", kind, tripId).map((x: any) => ({ ...x }));
/** Tạo chuyến bằng route, trả phản hồi thô (không khẳng định mã). */
const taoTho = (w: any, as: string, v: { xe: string; taiXe: string; ngay?: string; bd: string; kt: string; nghiPhaLe?: unknown }) =>
  w.call("POST", "/api/van-chuyen/chuyen", {
    as, body: { requestId: uuid(), xeId: v.xe, taiXePartyId: v.taiXe, batDau: { ngay: v.ngay ?? NGAY, gio: v.bd }, ketThuc: { ngay: v.ngay ?? NGAY, gio: v.kt }, ...(v.nghiPhaLe ? { nghiPhaLe: v.nghiPhaLe } : {}) },
  });

// ---- NT-1: bảy lệnh bị khoá — Bán hàng điều chỉnh khẩn cấp ---------------------------------------------------------------------------------------------
test("NT-1 (ADR-0104 Đ1 mục 1, 2): chuyến DƯỚI mốc — Bán hàng xếp / rút / dời / đổi xe / đổi tài xế / huỷ chuyến còn khách kèm lý do → 200 (sự kiện mang MOC_TOI_THIEU + người bấm); 409 lớp KHAN_CAP canQuyen true; thiếu / sai lý do → 400", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00", soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // 06:00 → 11:00: còn 5 giờ < mốc 6 giờ
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:10", kt: "15:00" });
    assert.equal(t.chuyen.khoaMoc.dangKhoa, true, "chuyến dưới mốc");
    // 409: thiếu mốc → lớp KHAN_CAP, Bán hàng đủ ô (canQuyen true), câu "điều chỉnh khẩn cấp".
    const r409 = await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }]);
    assert.equal(r409.status, 409, r409.text);
    assert.equal(r409.json.error.code, "can_pha_le");
    assert.equal(r409.json.error.lop, "KHAN_CAP");
    assert.equal(r409.json.error.canQuyen, true);
    assert.match(r409.json.error.message, /cần điều chỉnh khẩn cấp/);
    // Thiếu lý do / lý do ngoài danh mục → 400, không ghi.
    assert.equal((await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: {} })).status, 400);
    const sai = await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: { lyDo: "KHONG_CO_MA_NAY" } });
    assert.equal(sai.status, 400, sai.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'ALLOCATED'")[0].n, 0, "từ chối thì không ghi");
    // Xếp.
    const x = await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(x.status, 200, x.text);
    assert.deepEqual(suKien(w, "ALLOCATED", t.chuyen.id), [{ r: "MOC_TOI_THIEU", l: "PHA_LE_SU_CO", c: SALES }]);
    const [s1, s2] = x.json.suat.map((s: any) => s.id);
    // Rút một khách.
    const rut = await goi(w, SALES, "POST", `/${t.chuyen.id}/rut`, { version: await phienBan(w, t.chuyen.id), suatIds: [s1], phaLe: PL });
    assert.equal(rut.status, 200, rut.text);
    assert.deepEqual(suKien(w, "ALLOCATION_REMOVED", t.chuyen.id), [{ r: "MOC_TOI_THIEU", l: "PHA_LE_SU_CO", c: SALES }]);
    // Dời khách còn lại sang chuyến 2 (cũng dưới mốc) — sự kiện ghi ở chuyến ĐÍCH.
    const doi = await goi(w, SALES, "POST", `/${t.chuyen.id}/doi`, {
      version: await phienBan(w, t.chuyen.id), suatIds: [s2], denChuyenId: t2.chuyen.id, denVersion: await phienBan(w, t2.chuyen.id), phaLe: PL,
    });
    assert.equal(doi.status, 200, doi.text);
    assert.deepEqual(suKien(w, "ALLOCATION_MOVED", t2.chuyen.id), [{ r: "MOC_TOI_THIEU", l: "PHA_LE_SU_CO", c: SALES }]);
    // Đổi xe, rồi đổi tài xế trên chuyến 2 (còn khách) — không kèm lý do → 409 KHAN_CAP; kèm lý do → 200.
    const xeMoi = xe(w);
    const doiXe0 = await goi(w, SALES, "PUT", `/${t2.chuyen.id}`, { version: await phienBan(w, t2.chuyen.id), xeId: xeMoi });
    assert.equal(doiXe0.status, 409, doiXe0.text);
    assert.equal(doiXe0.json.error.lop, "KHAN_CAP");
    const doiXe = await goi(w, SALES, "PUT", `/${t2.chuyen.id}`, { version: await phienBan(w, t2.chuyen.id), xeId: xeMoi, phaLe: PL });
    assert.equal(doiXe.status, 200, doiXe.text);
    assert.equal(doiXe.json.chuyen.xe.id, xeMoi);
    const txMoi = taiXeMoi(w);
    const doiTx = await goi(w, SALES, "PUT", `/${t2.chuyen.id}`, { version: await phienBan(w, t2.chuyen.id), taiXePartyId: txMoi, phaLe: PL });
    assert.equal(doiTx.status, 200, doiTx.text);
    assert.equal(doiTx.json.chuyen.taiXe.partyId, txMoi);
    assert.deepEqual(suKien(w, "UPDATED", t2.chuyen.id).map((e: any) => e.r), ["MOC_TOI_THIEU", "MOC_TOI_THIEU"]);
    // Huỷ chuyến còn khách.
    const huy0 = await goi(w, SALES, "POST", `/${t2.chuyen.id}/huy`, { version: await phienBan(w, t2.chuyen.id), lyDo: "HUY_KHAC" });
    assert.equal(huy0.status, 409, huy0.text);
    assert.equal(huy0.json.error.lop, "KHAN_CAP");
    const huy = await goi(w, SALES, "POST", `/${t2.chuyen.id}/huy`, { version: await phienBan(w, t2.chuyen.id), lyDo: "HUY_KHAC", phaLe: PL });
    assert.equal(huy.status, 200, huy.text);
    assert.deepEqual(suKien(w, "CANCELLED", t2.chuyen.id), [{ r: "MOC_TOI_THIEU", l: "PHA_LE_SU_CO", c: SALES }]);
  } finally {
    tat();
  }
});

test("NT-1 (ADR-0104 Đ1 mục 0, 2 — 'Chỉ khi chuyến còn dưới 6 giờ'): khoảng nghỉ — tạo chuyến DƯỚI mốc: Bán hàng 409 KHAN_CAP (canQuyen true) rồi kèm lý do 201; NGOÀI mốc: Bán hàng 409 QUAN_TRI (canQuyen false, câu cũ), gửi lý do 403; Quản trị 201", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x1 = xe(w);
    await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "10:00" });
    // Dưới mốc (06:00 → 10:10): chuyến mới cùng xe bắt đầu 10 phút sau chuyến trước.
    const d0 = await taoTho(w, SALES, { xe: x1, taiXe: `pty-${DRIVER2}`, bd: "10:10", kt: "11:00" });
    assert.equal(d0.status, 409, d0.text);
    assert.equal(d0.json.error.code, "chua_du_nghi");
    assert.equal(d0.json.error.lop, "KHAN_CAP");
    assert.equal(d0.json.error.canQuyen, true);
    assert.equal(d0.json.error.message, "Chưa đủ khoảng nghỉ giữa hai chuyến — cần điều chỉnh khẩn cấp kèm lý do.");
    const d1 = await taoTho(w, SALES, { xe: x1, taiXe: `pty-${DRIVER2}`, bd: "10:10", kt: "11:00", nghiPhaLe: PL });
    assert.equal(d1.status, 201, d1.text);
    assert.deepEqual(suKien(w, "CREATED", d1.json.chuyen.id), [{ r: "KHOANG_NGHI", l: "PHA_LE_SU_CO", c: SALES }]);
    // Ngoài mốc (ngày hôm sau).
    const x2 = xe(w);
    await taoChuyen(w, { xe: x2, taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "10:00" });
    const n0 = await taoTho(w, SALES, { xe: x2, taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "10:10", kt: "11:00" });
    assert.equal(n0.status, 409, n0.text);
    assert.equal(n0.json.error.code, "chua_du_nghi");
    assert.equal(n0.json.error.lop, "QUAN_TRI");
    assert.equal(n0.json.error.canQuyen, false);
    assert.equal(n0.json.error.message, "Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ.");
    const n1 = await taoTho(w, SALES, { xe: x2, taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "10:10", kt: "11:00", nghiPhaLe: PL });
    assert.equal(n1.status, 403, n1.text);
    assert.equal(n1.json.error.message, CAU_QUAN_TRI);
    const n2 = await taoTho(w, ADM, { xe: x2, taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "10:10", kt: "11:00" });
    assert.equal(n2.json.error.canQuyen, true, "Quản trị đủ ô ngoài mốc");
    const n3 = await taoTho(w, ADM, { xe: x2, taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "10:10", kt: "11:00", nghiPhaLe: PL });
    assert.equal(n3.status, 201, n3.text);
  } finally {
    tat();
  }
});

test("NT-1 (ADR-0104 Đ1 mục 0b, 0): cam kết xe riêng — chuyến DƯỚI mốc: Bán hàng 409 can_pha_le_cam_ket lớp KHAN_CAP, kèm lý do 200; chặng ĐẶT GẤP không làm chuyến thôi dưới mốc (Bán hàng chỉ gửi cờ cam kết → 200)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const rieng = await donXeRieng(w, { gio: "13:00" });
    const thuong = await don(w, { gio: "13:00" });
    const gap = await don(w, { gio: "13:00" });
    assert.equal((await w.call("POST", `/api/orders/${gap.id}/legs/${gap.legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" });
    assert.equal((await xep(w, SALES, t.chuyen.id, [{ legId: rieng.legId, soSuat: 2 }], { phaLe: PL })).status, 200);
    const c0 = await xep(w, SALES, t.chuyen.id, [{ legId: thuong.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(c0.status, 409, c0.text);
    assert.equal(c0.json.error.code, "can_pha_le_cam_ket");
    assert.equal(c0.json.error.lop, "KHAN_CAP");
    assert.equal(c0.json.error.canQuyen, true);
    assert.equal(c0.json.error.message, "Chuyến trái cam kết xe riêng / số chỗ của khách — cần điều chỉnh khẩn cấp kèm lý do.");
    const c1 = await xep(w, SALES, t.chuyen.id, [{ legId: thuong.legId, soSuat: 2 }], { phaLe: PL, camKetPhaLe: PL });
    assert.equal(c1.status, 200, c1.text);
    assert.equal(w.q("SELECT commitment_override_reason_code r FROM vc_trip WHERE id = ?", t.chuyen.id)[0].r, "PHA_LE_SU_CO");
    // Chặng đặt gấp: miễn luật mốc lúc xếp, nhưng chuyến VẪN dưới mốc → cờ cam kết thuộc lớp KHAN_CAP → Bán hàng 200 (không cần cờ mốc).
    const g = await xep(w, SALES, t.chuyen.id, [{ legId: gap.legId, soSuat: 2 }], { camKetPhaLe: PL });
    assert.equal(g.status, 200, g.text);
    assert.equal(suKien(w, "ALLOCATED", t.chuyen.id)[0].r, "CAM_KET", "đặt gấp không vượt mốc — sự kiện mang CAM_KET (ca lệch nhãn 2, ADR-0104 Đ1 mục 5)");
  } finally {
    tat();
  }
});

test("NT-1 rào mềm (ADR-0104 Đ1 mục 0, cách (a) — chủ 2026-10-08 'Cho qua, tính là sát giờ'): chuyến NGOÀI mốc, Bán hàng trong MỘT lệnh sửa vừa dời giờ vào mốc vừa vượt khoảng nghỉ → 200; cùng lệnh mà giờ mới vẫn ngoài mốc → 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x1 = xe(w);
    await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, bd: "10:00", kt: "10:40" });
    const r2 = await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER2}`, bd: "13:00", kt: "14:00" }); // 06:00 → 13:00: còn 7 giờ — ngoài mốc
    assert.equal(r2.chuyen.khoaMoc.dangKhoa, false);
    const ngoai = await goi(w, SALES, "PUT", `/${r2.chuyen.id}`, { version: r2.chuyen.version, batDau: { ngay: NGAY, gio: "12:20" }, nghiPhaLe: PL });
    assert.equal(ngoai.status, 403, `giờ mới 12:20 còn 6 giờ 20 — vẫn ngoài mốc: ${ngoai.text}`);
    assert.equal(ngoai.json.error.message, CAU_QUAN_TRI);
    const vao = await goi(w, SALES, "PUT", `/${r2.chuyen.id}`, { version: r2.chuyen.version, batDau: { ngay: NGAY, gio: "10:50" }, ketThuc: { ngay: NGAY, gio: "11:30" } });
    assert.equal(vao.status, 409, vao.text);
    assert.equal(vao.json.error.code, "chua_du_nghi");
    assert.equal(vao.json.error.lop, "KHAN_CAP", "giờ xét = min(cũ, mới, sớm nhất) = 10:50 — dưới mốc");
    const ok = await goi(w, SALES, "PUT", `/${r2.chuyen.id}`, { version: r2.chuyen.version, batDau: { ngay: NGAY, gio: "10:50" }, ketThuc: { ngay: NGAY, gio: "11:30" }, nghiPhaLe: PL });
    assert.equal(ok.status, 200, ok.text);
    assert.equal(w.q("SELECT rest_override_reason_code r FROM vc_trip WHERE id = ?", r2.chuyen.id)[0].r, "PHA_LE_SU_CO");
  } finally {
    tat();
  }
});

test("NT-1 dời hỗn hợp (ADR-0104 Đ1 mục 0: dời xét 'dưới mốc' ở chuyến ĐÍCH): nguồn dưới mốc, đích NGOÀI mốc trái cam kết — Bán hàng 409 lớp QUAN_TRI (canQuyen false), gửi cờ → 403; Quản trị → 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00" });
    const rieng = await donXeRieng(w, { gio: "13:00" });
    const nguon = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    const dich = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "12:30", kt: "15:30" }); // 6 giờ 30 — ngoài mốc
    const x = await xep(w, SALES, nguon.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(x.status, 200, x.text);
    assert.equal((await xep(w, SALES, dich.chuyen.id, [{ legId: rieng.legId, soSuat: 2 }])).status, 200, "đích ngoài mốc: xếp không cần cờ");
    const than = async (extra: Record<string, unknown>) => ({
      version: await phienBan(w, nguon.chuyen.id), suatIds: x.json.suat.map((s: any) => s.id), denChuyenId: dich.chuyen.id, denVersion: await phienBan(w, dich.chuyen.id), ...extra,
    });
    const r0 = await goi(w, SALES, "POST", `/${nguon.chuyen.id}/doi`, await than({}));
    assert.equal(r0.status, 409, r0.text);
    assert.equal(r0.json.error.code, "can_pha_le");
    assert.deepEqual([...new Set(r0.json.error.lyDo.map((l: any) => l.ma))].sort(), ["CAM_KET", "MOC_TOI_THIEU"]);
    assert.equal(r0.json.error.lop, "QUAN_TRI");
    assert.equal(r0.json.error.canQuyen, false);
    const r1 = await goi(w, SALES, "POST", `/${nguon.chuyen.id}/doi`, await than({ phaLe: PL, camKetPhaLe: PL }));
    assert.equal(r1.status, 403, r1.text);
    assert.equal(r1.json.error.message, CAU_QUAN_TRI);
    const r2 = await goi(w, ADM, "POST", `/${nguon.chuyen.id}/doi`, await than({ phaLe: PL, camKetPhaLe: PL }));
    assert.equal(r2.status, 200, r2.text);
  } finally {
    tat();
  }
});

test("NT-1: Kế toán (không có ô xếp xe) → 403 ở mọi lệnh có cờ vượt; Quản trị xếp dưới mốc kèm lý do → 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00" });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" });
    const id = t.chuyen.id;
    const v = t.chuyen.version;
    const ca: [string, string, Record<string, unknown>][] = [
      ["POST", "", { xeId: xe(w), taiXePartyId: `pty-${DRIVER2}`, batDau: { ngay: NGAY, gio: "16:00" }, ketThuc: { ngay: NGAY, gio: "17:00" }, nghiPhaLe: PL }],
      ["PUT", `/${id}`, { version: v, xeId: xe(w), phaLe: PL }],
      ["POST", `/${id}/phan-bo`, { version: v, chang: [{ legId: a.legId, soSuat: 2 }], phaLe: PL, camKetPhaLe: PL }],
      ["POST", `/${id}/them-diem`, { version: v, chang: [{ legId: a.legId, soSuat: 2 }], phaLe: PL }],
      ["POST", `/${id}/rut`, { version: v, suatIds: [uuid()], phaLe: PL }],
      ["POST", `/${id}/doi`, { version: v, suatIds: [uuid()], denChuyenId: uuid(), denVersion: 1, phaLe: PL }],
      ["POST", `/${id}/huy`, { version: v, lyDo: "HUY_KHAC", phaLe: PL }],
    ];
    for (const [m, duoi, body] of ca) {
      const r = await goi(w, ACC, m, duoi, body);
      assert.equal(r.status, 403, `${m} ${duoi}: ${r.text}`);
    }
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind <> 'CREATED'")[0].n, 0);
    const ok = await xep(w, ADM, id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(ok.status, 200, ok.text);
  } finally {
    tat();
  }
});

// ---- NT-2: LC-02 (luật lõi) — không ai vượt -----------------------------------------------------------------------------------------------------------
test("NT-2 (ADR-0104 Đ1 mục 8): Bán hàng điều chỉnh khẩn cấp xếp vượt số chỗ → 409 vuot_so_cho (không ghi); câu SQL chèn suất tay vượt chỗ bị trigger lc02_capacity chặn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00", soNguoi: 3 });
    const t = await taoChuyen(w, { xe: xe(w, 2), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" });
    const r = await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 3 }], { phaLe: PL });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "vuot_so_cho");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ?", t.chuyen.id)[0].n, 0, "không ghi");
    const du = await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(du.status, 200, du.text);
    w.sqlite.exec("CREATE TEMP TABLE suat_tay AS SELECT * FROM vc_trip_allocation WHERE trip_id = '" + t.chuyen.id + "' LIMIT 1");
    w.sqlite.exec("UPDATE suat_tay SET id = 'suat-tay-1', passenger_key = NULL");
    assert.throws(() => w.sqlite.exec("INSERT INTO vc_trip_allocation SELECT * FROM suat_tay"), /lc02_capacity/);
  } finally {
    tat();
  }
});

// ---- Đ1 mục 9 ★: "ai xử lý" của lý do kèm theo lớp ----------------------------------------------------------------------------------------------------
test("Đ1 mục 9 ★ (ly-do-giu theo mốc): khoảng nghỉ / cam kết — 409 lệnh, lý do giữ ở chi tiết / lịch / cuốc tài xế, 409 xuất bến: chuyến dưới mốc → Văn phòng (người xếp xe điều chỉnh khẩn cấp); ngoài mốc → Quản trị (câu cũ)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    // (1) 409 của lệnh tạo chuyến thiếu khoảng nghỉ.
    const x1 = xe(w);
    await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "10:00" });
    const d0 = await taoTho(w, SALES, { xe: x1, taiXe: `pty-${DRIVER2}`, bd: "10:10", kt: "11:00" });
    assert.equal(d0.status, 409, d0.text);
    assert.deepEqual(d0.json.error.lyDo.map((l: any) => [l.ma, l.aiXuLy, l.aiXuLyNhan]), [["KHOANG_NGHI", "VAN_PHONG", "Văn phòng"]]);
    assert.match(d0.json.error.lyDo[0].loiNhan, /^Chưa đủ khoảng nghỉ giữa hai chuyến — người xếp xe điều chỉnh khẩn cấp kèm lý do: CX-/);
    const x2 = xe(w);
    await taoChuyen(w, { xe: x2, taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "10:00" });
    const n0 = await taoTho(w, SALES, { xe: x2, taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "10:10", kt: "11:00" });
    assert.equal(n0.status, 409, n0.text);
    assert.deepEqual(n0.json.error.lyDo.map((l: any) => [l.ma, l.aiXuLy, l.aiXuLyNhan]), [["KHOANG_NGHI", "QUAN_TRI", "Quản trị"]]);
    assert.match(n0.json.error.lyDo[0].loiNhan, /^Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ: CX-/);
    // (2) Lý do GIỮ: cam kết bật SAU khi xếp (chặng đòi xe ≥ 30 chỗ, xe 15 chỗ) trên chuyến dưới mốc.
    const camKet = (ds: any[]) => ds.filter((l) => l.ma === "CAM_KET").map((l) => [l.aiXuLy, l.loiNhan.startsWith("Trái cam kết xe riêng / số chỗ tối thiểu")]);
    const a = await don(w, { gio: "13:00" });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:00", kt: "15:00" });
    assert.equal((await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL })).status, 200);
    w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 30 WHERE id = ?").run(a.legId);
    assert.deepEqual(camKet((await chiTiet(w, t.chuyen.id)).chuyen.lyDoGiu), [["VAN_PHONG", true]], "chi tiết");
    const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    assert.deepEqual(camKet(lich.chuyen.find((c: any) => c.id === t.chuyen.id).lyDoGiu), [["VAN_PHONG", true]], "lịch");
    const cuoc = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t.chuyen.id}`, { as: DRIVER2 });
    assert.equal(cuoc.status, 200, cuoc.text);
    assert.deepEqual(camKet(cuoc.json.dieuKienConThieu), [["VAN_PHONG", true]], "cuốc tài xế");
    const xb = await tienDo(w, "van-phong", t.chuyen.id, "xuat-ben");
    assert.equal(xb.status, 409, xb.text);
    assert.equal(xb.json.error.code, "chua_du_dieu_kien_xuat_ben");
    assert.deepEqual(camKet(xb.json.error.lyDo), [["VAN_PHONG", true]], "409 xuất bến");
    // (3) Cùng lý do trên chuyến NGOÀI mốc (ngày mai) → Quản trị.
    const b = await don(w, { ngay: NGAY_SAU, gio: "13:00" });
    const t3 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "11:00", kt: "15:00" });
    assert.equal((await xep(w, SALES, t3.chuyen.id, [{ legId: b.legId, soSuat: 2 }])).status, 200);
    w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 30 WHERE id = ?").run(b.legId);
    assert.deepEqual(camKet((await chiTiet(w, t3.chuyen.id)).chuyen.lyDoGiu), [["QUAN_TRI", true]], "chi tiết ngoài mốc");
    const cuoc3 = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t3.chuyen.id}`, { as: DRIVER2 });
    assert.deepEqual(camKet(cuoc3.json.dieuKienConThieu), [["QUAN_TRI", true]], "cuốc tài xế ngoài mốc");
  } finally {
    tat();
  }
});
