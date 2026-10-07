// Kiểm phản biện nhóm V3 (năng lực + lập lịch). CHỈ ĐỌC repo; khung thử import tuyệt đối. Bài KHÔNG đỏ vì phát hiện — chỉ ghi quan sát (OBS).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACC, ADM, DRIVER, FIELD, NGAY, SALES, SUP, batDongHo, chiTiet, denGio, don, nhaXeKhung, setup, taoChuyen, tienDo, uuid, vnMs, xe, xepHet, xeNhaXe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";

const ghi = (nhan, o) => console.log(`OBS ${nhan} ${JSON.stringify(o)}`);
const tt = (r) => ({ status: r.status, code: r.json?.error?.code ?? null, msg: r.json?.error?.message ?? null, lyDo: (r.json?.error?.lyDo ?? []).map((l) => `${l.ma}|${l.loiNhan ?? ""}`) });
const AT = "2026-09-01T00:00:00.000Z";

async function xepRaw(w, tripId, body, as = SALES) {
  const c = (await w.call("GET", `/api/van-chuyen/chuyen/${tripId}`, { as: SALES })).json;
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as, body: { version: c.chuyen.version, requestId: uuid(), ...body } });
}

test("C20: người đi kèm (HDV) có chiếm chỗ không — xe 2 chỗ đã đủ 2 khách, thêm 1 HDV", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const X = xe(w, 2);
    const d = await don(w, { soNguoi: 2, gio: "13:00" });
    const c = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}` });
    await xepHet(w, c, d, 2);
    const r = await xepRaw(w, c.chuyen.id, { nguoiDiKem: [`pty-${FIELD}`] });
    ghi("C20.hdv_tren_xe_day", tt(r));
    // Đối chứng: xe 3 chỗ, 2 khách + 1 HDV = 3 → được.
    const X3 = xe(w, 3);
    const d3 = await don(w, { soNguoi: 2, gio: "13:00" });
    const c3 = await taoChuyen(w, { xe: X3, taiXe: `pty-${DRIVER}`, bd: "16:00", kt: "18:00" });
    const r3 = await xepRaw(w, c3.chuyen.id, { chang: [{ legId: d3.legId, soSuat: 2 }], nguoiDiKem: [`pty-${FIELD}`] });
    ghi("C20.xe3_2khach_1hdv", { ...tt(r3), tai: (await chiTiet(w, c3.chuyen.id)).chuyen.tai });
    // Thêm một khách nữa sau khi HDV đã lên xe 3 chỗ.
    const d4 = await don(w, { soNguoi: 1, gio: "16:30" });
    const r4 = await xepRaw(w, c3.chuyen.id, { chang: [{ legId: d4.legId, soSuat: 1 }] });
    ghi("C20.xe3_them_khach_sau_hdv", tt(r4));
  } finally { tat(); }
});

test("C27: xe trạng thái Bảo dưỡng — máy chủ có cho tạo chuyến không; cổng xuất bến", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const X = xe(w, 16);
    w.sqlite.prepare("UPDATE vc_vehicle SET status = 'maintenance' WHERE id = ?").run(X);
    const r = await w.call("POST", "/api/van-chuyen/chuyen", {
      as: SALES, body: { requestId: uuid(), xeId: X, taiXePartyId: `pty-${DRIVER}`, batDau: { ngay: NGAY, gio: "12:30" }, ketThuc: { ngay: NGAY, gio: "15:00" } },
    });
    ghi("C27.tao_chuyen_xe_bao_duong", { ...tt(r), lyDoGiu: r.json?.chuyen?.lyDoGiu?.map((l) => l.ma) });
    if (r.status === 201) {
      const d = await don(w, { soNguoi: 2, gio: "13:00" });
      const x = await xepRaw(w, r.json.chuyen.id, { chang: [{ legId: d.legId, soSuat: 2 }] });
      ghi("C27.xep_vao_xe_bao_duong", tt(x));
      denGio("12:30");
      ghi("C27.xuat_ben_xe_bao_duong", tt(await tienDo(w, "tai-xe", r.json.chuyen.id, "xuat-ben")));
    }
    const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    ghi("C27.lich_xe", { xe: (lich?.xe ?? []).filter((x) => x.id === X).map((x) => ({ trangThai: x.trangThai })) });
  } finally { tat(); }
});

test("C26: tạo chuyến thiếu tài xế; thêm xe nhà xe không số khung; tài xế nhà xe thiếu GPLX lúc TẠO chuyến", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const X = xe(w, 16);
    const r1 = await w.call("POST", "/api/van-chuyen/chuyen", {
      as: SALES, body: { requestId: uuid(), xeId: X, batDau: { ngay: NGAY, gio: "12:30" }, ketThuc: { ngay: NGAY, gio: "15:00" } },
    });
    ghi("C26.tao_chuyen_khong_tai_xe", tt(r1));
    const nx = nhaXeKhung(w, "Nhà xe Kiểm Phản Biện");
    const r2 = await w.call("POST", "/api/van-chuyen/xe", {
      as: ADM, body: { plateNumber: "79B-111.22", name: "Xe thuê gấp", passengerCapacity: 15, ownerPartyId: nx },
    });
    ghi("C26.them_xe_nha_xe_khong_so_khung", tt(r2));
    const r2b = await w.call("POST", "/api/van-chuyen/xe", {
      as: ADM, body: { plateNumber: "79B-111.23", chassisNumber: "KHUNGTHUE01", name: "Xe thuê gấp", passengerCapacity: 15, ownerPartyId: nx },
    });
    ghi("C26.them_xe_nha_xe_co_so_khung", tt(r2b));
    // Tài xế nhà xe có hồ sơ + quan hệ "Tài xế của" nhưng CHƯA có GPLX.
    const tx = uuid();
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Tài xế thuê gấp', 1, ?, ?)").run(tx, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Tài xế thuê gấp', ?, ?)").run(tx, AT, AT);
    w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
      VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), tx, nx, AT, AT);
    const Xn = xeNhaXe(w, nx, 16);
    const r3 = await w.call("POST", "/api/van-chuyen/chuyen", {
      as: SALES, body: { requestId: uuid(), xeId: Xn, taiXePartyId: tx, batDau: { ngay: NGAY, gio: "12:30" }, ketThuc: { ngay: NGAY, gio: "15:00" } },
    });
    ghi("C26.tao_chuyen_tai_xe_nha_xe_chua_gplx", tt(r3));
  } finally { tat(); }
});

test("C23: chuyến A đang chạy (đúng giờ và quá giờ kết thúc dự kiến) — lịch chung báo gì cho chuyến B cùng xe", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X = xe(w, 16);
    const dA = await don(w, { soNguoi: 2, gio: "06:40", noiDon: "Khách sạn A" });
    const dB = await don(w, { soNguoi: 2, gio: "08:10", noiDon: "Khách sạn B" });
    const A = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:30" });
    await xepHet(w, A, dA, 2);
    const B = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
    await xepHet(w, B, dB, 2);
    const docLich = async (nhan) => {
      const l = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
      const cb = (id) => (l?.canhBao ?? []).filter((x) => x.tripId === id).map((x) => x.loai);
      const ch = (id) => (l?.chuyen ?? []).find((x) => x.id === id);
      ghi(nhan, {
        A: { trangThai: ch(A.chuyen.id)?.trangThai, canhBao: cb(A.chuyen.id), lyDoGiu: (ch(A.chuyen.id)?.lyDoGiu ?? []).map((x) => x.ma) },
        B: { trangThai: ch(B.chuyen.id)?.trangThai, canhBao: cb(B.chuyen.id), lyDoGiu: (ch(B.chuyen.id)?.lyDoGiu ?? []).map((x) => x.ma) },
        tatCaLoai: [...new Set((l?.canhBao ?? []).map((x) => x.loai))],
      });
    };
    await docLich("C23.lich_2200_truoc");
    denGio("06:30", NGAY);
    assert.equal((await tienDo(w, "tai-xe", A.chuyen.id, "xuat-ben")).status, 200);
    denGio("07:00", NGAY);
    await docLich("C23.lich_0700_A_chay_dung_gio");
    denGio("07:45", NGAY);
    await docLich("C23.lich_0745_A_qua_gio_ket_thuc");
    // Kết thúc A khi còn khách chưa có kết quả: thường bị chặn, có "kết thúc gián đoạn" không?
    const kt = await tienDo(w, "tai-xe", A.chuyen.id, "ket-thuc");
    ghi("C23.ket_thuc_A_con_khach", { ...tt(kt), goiY: kt.json?.error?.goiY ?? null });
  } finally { tat(); }
});

test("C21-phụ: Toàn quyền hạ khoảng nghỉ về 0 SAU khi chuyến B đã tạo — B dời sát A được, nhưng xuất bến có bị giữ theo số nghỉ đã chụp không", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X = xe(w, 16);
    const dA = await don(w, { soNguoi: 2, gio: "06:40", noiDon: "Khách sạn A" });
    const dB = await don(w, { soNguoi: 2, gio: "08:10", noiDon: "Khách sạn B" });
    const A = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:30" });
    const sauA = await xepHet(w, A, dA, 2);
    const B = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
    await xepHet(w, B, dB, 2);
    const cs = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
      as: SUP, body: { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 0, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240 },
    });
    ghi("C21p.sup_ha_nghi_0", tt(cs));
    const ctB = await chiTiet(w, B.chuyen.id);
    const p = await w.call("PUT", `/api/van-chuyen/chuyen/${B.chuyen.id}`, { as: SALES, body: { version: ctB.chuyen.version, requestId: uuid(), batDau: { ngay: NGAY, gio: "07:35" }, ketThuc: { ngay: NGAY, gio: "08:35" } } });
    ghi("C21p.sales_doi_B_0735", tt(p));
    ghi("C21p.db_B", { rows: w.q("SELECT code, rest_minutes_snapshot, rest_override_reason_code FROM vc_trip WHERE id = ?", B.chuyen.id) });
    // Chuyến C tạo SAU khi hạ nghỉ (đối chứng chụp 0).
    const aId = A.chuyen.id, bId = B.chuyen.id;
    const donA = sauA.diem.find((d) => d.loai === "PICKUP").id, traA = sauA.diem.find((d) => d.loai === "DROPOFF").id;
    const suatA = sauA.suat.filter((s) => s.loai === "PASSENGER").map((s) => s.id);
    denGio("06:30", NGAY); assert.equal((await tienDo(w, "tai-xe", aId, "xuat-ben")).status, 200);
    denGio("06:40", NGAY); await tienDo(w, "tai-xe", aId, `diem/${donA}/da-toi`); for (const s of suatA) await tienDo(w, "tai-xe", aId, `phan-bo/${s}/don`);
    denGio("07:25", NGAY); await tienDo(w, "tai-xe", aId, `diem/${traA}/da-toi`); for (const s of suatA) await tienDo(w, "tai-xe", aId, `phan-bo/${s}/tra`);
    denGio("07:30", NGAY); ghi("C21p.A_ket_thuc_0730", tt(await tienDo(w, "tai-xe", aId, "ket-thuc")));
    denGio("07:35", NGAY);
    ghi("C21p.B_xuat_ben_0735", tt(await tienDo(w, "tai-xe", bId, "xuat-ben")));
    const l = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    ghi("C21p.lich_B_lyDoGiu", { lyDoGiu: ((l?.chuyen ?? []).find((x) => x.id === bId)?.lyDoGiu ?? []).map((x) => x.ma) });
    // Quản trị phá lệ khoảng nghỉ qua PUT (không đổi giờ) → xuất bến được không.
    const ct2 = await chiTiet(w, bId);
    const p2 = await w.call("PUT", `/api/van-chuyen/chuyen/${bId}`, { as: ADM, body: { version: ct2.chuyen.version, requestId: uuid(), nghiPhaLe: { lyDo: "PHA_LE_SU_CO" } } });
    ghi("C21p.adm_pha_le_nghi_qua_PUT", tt(p2));
    ghi("C21p.B_xuat_ben_sau_pha_le", tt(await tienDo(w, "tai-xe", bId, "xuat-ben")));
  } finally { tat(); }
});
