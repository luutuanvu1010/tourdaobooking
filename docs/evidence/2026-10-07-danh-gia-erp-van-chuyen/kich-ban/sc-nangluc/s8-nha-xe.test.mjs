// S8 — Nhà xe đối tác: xe + tài xế của nhà xe, xếp chuyến, xuất bến; tài xế đối tác (DRIVER_PARTNER) xem / bấm tiến độ; thiếu giá xe thuê.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACC, ADM, DRIVER, DRIVER_PARTNER, NGAY, SALES, batDongHo, denGio, don, nhaXeKhung, setup, taiXeNhaXe, tienDo, vnMs, xe, xeNhaXe, xepHet, uuid,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { ghiNhan, taoChuyenRaw, tt } from "./lib.mjs";

const log = ghiNhan("s8-nha-xe");
const AT = "2026-09-01T00:00:00.000Z";

test("S8 nhà xe đối tác: chuyến xe thuê, tài xế đối tác có tài khoản, thiếu giá, văn phòng bấm thay", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const nx = nhaXeKhung(w, "Nhà xe Hùng Phát Dò Tìm");
    const txNx = taiXeNhaXe(w, nx); // hồ sơ không tài khoản
    const xNx = xeNhaXe(w, nx, 16);
    // Gắn tài khoản DRIVER_PARTNER (hồ sơ pty-DRIVER_PARTNER) vào nhà xe: DRIVES_FOR + GPLX hạng D + vai DRIVER_EXTERNAL
    const pDp = `pty-${DRIVER_PARTNER}`;
    w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)").run(uuid(), pDp, nx, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at) VALUES (?, ?, 'GPLX', '792200009999', '792200009999', 'Nơi cấp Dò Tìm', 'D', '2030-12-31', ?, ?)").run(uuid(), pDp, AT, AT);
    let vaiLoi = null;
    try { w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, 'DRIVER_EXTERNAL', NULL, '2026-09-01', ?, ?)").run(uuid(), pDp, AT, AT); } catch (e) { vaiLoi = String(e.message); }
    log("gan_vai_DRIVER_EXTERNAL", { vaiLoi });
    // Danh sách tài xế cho điều phối (meta / lich) có tài xế nhà xe không?
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    log("lich_tai_xe_xe", { taiXe: lich.json?.taiXe?.map((t) => ({ ten: t.ten, loai: t.loai, nhaXe: t.nhaXe ?? t.carrierPartyIds ?? null })), xe: lich.json?.xe?.map((x) => ({ bienSo: x.bienSo, soCho: x.soCho, chuLaCongTy: x.chuLaCongTy, chuXe: x.chuXe })) });
    // Chéo xe – tài xế
    log("cheo_xe_nha_xe_tai_xe_cong_ty", tt(await taoChuyenRaw(w, { as: SALES, xe: xNx, taiXe: `pty-${DRIVER}`, bd: "09:00", kt: "10:30" })));
    log("cheo_xe_cong_ty_tai_xe_nha_xe", tt(await taoChuyenRaw(w, { as: SALES, xe: xe(w, 16), taiXe: txNx, bd: "09:00", kt: "10:30" })));
    // Chuyến xe nhà xe + tài xế đối tác CÓ tài khoản, không tuyến → thiếu giá
    const d = await don(w, { soNguoi: 3, gio: "09:10", noiDon: "Khách sạn Nhà Xe" });
    const c = await taoChuyenRaw(w, { as: SALES, xe: xNx, taiXe: pDp, bd: "09:00", kt: "10:30" });
    log("tao_chuyen_xe_thue", { ...tt(c), ma: c.json?.chuyen?.ma });
    const id = c.json.chuyen.id;
    log("db_trip_thue", { rows: w.q("SELECT code, rented, carrier_party_id = ? AS dung_nha_xe, (SELECT count(*) FROM vc_trip_cost_line l WHERE l.trip_id = vc_trip.id) AS so_dong_chi_phi FROM vc_trip WHERE id = ?", nx, id).map((r) => ({ ...r })) });
    await xepHet(w, { chuyen: c.json.chuyen }, d, 3);
    const ct = (await w.call("GET", `/api/van-chuyen/chuyen/${id}`, { as: SALES })).json;
    log("chi_tiet_sau_xep", { lyDoGiu: ct.chuyen.lyDoGiu?.map((l) => `${l.ma}: ${l.loiNhan} [${l.aiXuLy ?? ""}]`), taiXe: ct.chuyen.taiXe, coTien: /1350000|1\.350\.000/.test(JSON.stringify(ct)) });
    // Tài xế đối tác xem / bấm
    denGio("08:50");
    log("dp_GET_cuoc_cua_toi", tt(await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: DRIVER_PARTNER })));
    log("dp_GET_cuoc_chi_tiet", tt(await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}`, { as: DRIVER_PARTNER })));
    log("dp_POST_xuat_ben", tt(await tienDo(w, "tai-xe", id, "xuat-ben", {}, DRIVER_PARTNER)));
    log("dp_GET_lich_van_phong", tt(await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: DRIVER_PARTNER })));
    // Văn phòng bấm thay xuất bến khi thiếu giá
    denGio("09:00");
    log("vp_xuat_ben_thieu_gia", tt(await tienDo(w, "van-phong", id, "xuat-ben")));
    log("adm_xuat_ben_thieu_gia_kem_pha_le", tt(await tienDo(w, "van-phong", id, "xuat-ben", { phaLe: { lyDo: "PHA_LE_SU_CO" } }, ADM)));
    // Kế toán nhập giá thoả thuận
    const cp = await w.call("GET", `/api/van-chuyen/chuyen/${id}/chi-phi`, { as: ACC });
    log("acc_GET_chi_phi", { status: cp.status, phienBan: cp.json?.chiPhi?.phienBanChiPhi });
    const g = await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/gia-thoa-thuan`, { as: ACC, body: { requestId: uuid(), phienBanChiPhi: cp.json?.chiPhi?.phienBanChiPhi, soTien: 1_350_000, ghiChu: "Chốt giá Dò Tìm" } });
    log("acc_gia_thoa_thuan", tt(g));
    denGio("09:02");
    const x = await tienDo(w, "van-phong", id, "xuat-ben");
    log("vp_xuat_ben_sau_co_gia", tt(x));
    log("db_trip_sau", { rows: w.q("SELECT code, status, (SELECT group_concat(kind) FROM vc_trip_cost_line l WHERE l.trip_id = vc_trip.id) AS dong_chi_phi FROM vc_trip WHERE id = ?", id).map((r) => ({ ...r })) });
    log("nhat_ky_xuat_ben", { rows: w.q("SELECT action, detail FROM audit_log WHERE action LIKE 'trip_%' ORDER BY rowid DESC LIMIT 2").map((r) => ({ ...r })) });
    // Sau xuất bến, tài xế đối tác vẫn không thấy chuyến
    log("dp_GET_cuoc_chi_tiet_sau_xuat_ben", tt(await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}`, { as: DRIVER_PARTNER })));
    // Bảng quyền đọc lại
    log("quyen_DRIVER_PARTNER", { note: "src/shared/permissions.ts trip.view/trip.progress cột 9 = none" });
  } finally { tat(); }
});
