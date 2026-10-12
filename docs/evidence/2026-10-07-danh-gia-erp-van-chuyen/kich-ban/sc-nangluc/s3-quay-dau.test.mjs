// S3 — Quay đầu: cùng xe + cùng tài xế, chuyến A 06:30–07:30, chuyến B ngay sau. Luật khoảng nghỉ, phá lệ, kết thúc thật sớm, xuất bến sớm.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADM, DRIVER, DRIVER2, NGAY, SALES, batDongHo, denGio, don, setup, taoChuyen, tienDo, vnMs, xe, xepHet, uuid,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { ghiNhan, taoChuyenRaw, tt } from "./lib.mjs";

const log = ghiNhan("s3-quay-dau");
const cong = (gio, phut) => { const [h, m] = gio.split(":").map(Number); const t = h * 60 + m + phut; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

test("S3.1 luật khoảng nghỉ lúc TẠO chuyến B sau A 06:30–07:30 (cùng xe + cùng tài xế)", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const cs = await w.call("GET", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: ADM });
    log("chinh_sach", { status: cs.status, hienHanh: cs.json?.hienHanh ?? cs.json?.chinhSach ?? Object.keys(cs.json ?? {}), raw: JSON.stringify(cs.json).slice(0, 600) });
    log("db_policy", { rows: w.q("SELECT id, min_lead_minutes, rest_minutes, duty_day_max_minutes, trip_no_break_max_minutes FROM vc_dispatch_policy") });
    const X = xe(w, 16);
    const A = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:30" });
    log("A", { ma: A.chuyen.ma, id: A.chuyen.id });
    for (const bd of ["07:29", "07:30", "07:35", "07:45", "07:59"]) {
      const r = await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER}`, bd, kt: cong(bd, 60) });
      log(`B_cung_xe_cung_tx_${bd}`, tt(r));
    }
    // Cùng xe, ĐỔI tài xế (DRIVER2) lúc 07:45 — khoảng nghỉ có áp cho XE không?
    log("B_cung_xe_TX2_0745", tt(await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER2}`, bd: "07:45", kt: "08:45" })));
    // Cùng tài xế, xe KHÁC lúc 07:45.
    const X2 = xe(w, 16);
    log("B_xe_khac_cung_tx_0745", tt(await taoChuyenRaw(w, { as: SALES, xe: X2, taiXe: `pty-${DRIVER}`, bd: "07:45", kt: "08:45" })));
    // Bán hàng gửi kèm phá lệ nghỉ → ?
    log("B_sales_gui_pha_le_0745", tt(await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER}`, bd: "07:45", kt: "08:45", extra: { nghiPhaLe: { lyDo: "PHA_LE_SU_CO" } } })));
    // 08:00 (đúng 30 phút sau giờ kết thúc dự kiến 07:30)
    const r8 = await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
    log("B_cung_xe_cung_tx_0800", { ...tt(r8), ma: r8.json?.chuyen?.ma });
    log("doc_lai_trip", { rows: w.q("SELECT code, status, planned_start_ms, planned_end_ms, rest_minutes_snapshot, rest_override_reason_code FROM vc_trip ORDER BY planned_start_ms").map((r) => ({ ...r, bd: new Date(r.planned_start_ms + 7 * 3600e3).toISOString().slice(11, 16), kt: new Date(r.planned_end_ms + 7 * 3600e3).toISOString().slice(11, 16) })) });
  } finally { tat(); }
});

test("S3.2 Quản trị phá lệ khoảng nghỉ: B 07:45 cùng xe cùng tài xế", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X = xe(w, 16);
    await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:30" });
    const r = await taoChuyenRaw(w, { as: ADM, xe: X, taiXe: `pty-${DRIVER}`, bd: "07:45", kt: "08:45", extra: { nghiPhaLe: { lyDo: "PHA_LE_SU_CO" } } });
    log("B_adm_pha_le_0745", { ...tt(r), ma: r.json?.chuyen?.ma });
    log("doc_lai_trip_S3.2", { rows: w.q("SELECT code, rest_minutes_snapshot, rest_override_reason_code FROM vc_trip ORDER BY planned_start_ms").map((x) => ({ ...x })) });
    log("nhat_ky_pha_le", { rows: w.q("SELECT action, detail FROM audit_log WHERE action LIKE 'trip_%' ORDER BY rowid").map((x) => ({ ...x })) });
  } finally { tat(); }
});

test("S3.3 A kết thúc THỰC TẾ sớm (07:10) — B (08:00) có xuất bến / dời sớm được không", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X = xe(w, 16);
    const dA = await don(w, { soNguoi: 3, gio: "06:40", noiDon: "Khách sạn Quay Đầu A" });
    const dB = await don(w, { soNguoi: 2, gio: "08:10", noiDon: "Khách sạn Quay Đầu B" });
    const A = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:30" });
    const sauA = await xepHet(w, A, dA, 3);
    const B = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
    await xepHet(w, B, dB, 2);
    const aId = A.chuyen.id, bId = B.chuyen.id;
    const donA = sauA.diem.find((d) => d.loai === "PICKUP").id, traA = sauA.diem.find((d) => d.loai === "DROPOFF").id;
    const suatA = sauA.suat.filter((s) => s.loai === "PASSENGER").map((s) => s.id);
    denGio("06:30");
    log("A_xuat_ben_0630", tt(await tienDo(w, "tai-xe", aId, "xuat-ben")));
    denGio("06:45");
    // B xuất bến khi A còn RUNNING
    log("B_xuat_ben_khi_A_dang_chay_0645", tt(await tienDo(w, "tai-xe", bId, "xuat-ben")));
    log("A_da_toi_don", tt(await tienDo(w, "tai-xe", aId, `diem/${donA}/da-toi`)));
    for (const s of suatA) log("A_da_don", tt(await tienDo(w, "tai-xe", aId, `phan-bo/${s}/don`)));
    denGio("07:05");
    log("A_da_toi_tra", tt(await tienDo(w, "tai-xe", aId, `diem/${traA}/da-toi`)));
    for (const s of suatA) log("A_da_tra", tt(await tienDo(w, "tai-xe", aId, `phan-bo/${s}/tra`)));
    denGio("07:10");
    log("A_ket_thuc_0710", tt(await tienDo(w, "tai-xe", aId, "ket-thuc")));
    log("A_doc_lai", { rows: w.q("SELECT code, status, ended_ms FROM vc_trip WHERE id = ?", aId).map((r) => ({ ...r, ketThucVn: new Date(r.ended_ms + 7 * 3600e3).toISOString().slice(11, 16) })) });
    // Danh sách cuốc của tài xế lúc 07:10: có gì báo "xe rảnh, chuyến B có thể đi sớm" không?
    const ds = await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: DRIVER });
    log("cuoc_cua_toi_0710", { status: ds.status, chuyen: ds.json?.chuyen?.map((c) => ({ ma: c.ma, gio: c.gioXuatBen, trangThai: c.trangThai, dieuKienConThieu: c.dieuKienConThieu?.map((x) => x.ma) })) });
    denGio("07:15");
    log("B_xuat_ben_0715_tai_xe", tt(await tienDo(w, "tai-xe", bId, "xuat-ben")));
    // Văn phòng dời B lên 07:20 (10 phút sau giờ kết thúc THẬT) → ?
    const ct = (await w.call("GET", `/api/van-chuyen/chuyen/${bId}`, { as: SALES })).json;
    const p1 = await w.call("PUT", `/api/van-chuyen/chuyen/${bId}`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), batDau: { ngay: NGAY, gio: "07:20" }, ketThuc: { ngay: NGAY, gio: "08:20" } } });
    log("B_PUT_dời_0720", tt(p1));
    const ct2 = (await w.call("GET", `/api/van-chuyen/chuyen/${bId}`, { as: SALES })).json;
    const p2 = await w.call("PUT", `/api/van-chuyen/chuyen/${bId}`, { as: SALES, body: { version: ct2.chuyen.version, requestId: uuid(), batDau: { ngay: NGAY, gio: "07:40" }, ketThuc: { ngay: NGAY, gio: "08:40" } } });
    log("B_PUT_dời_0740", { ...tt(p2), lyDoGiu: p2.json?.chuyen?.lyDoGiu?.map((l) => l.ma) });
    denGio("07:40");
    log("B_xuat_ben_0740_tai_xe_sau_doi", tt(await tienDo(w, "tai-xe", bId, "xuat-ben")));
    log("B_doc_lai", { rows: w.q("SELECT code, status, planned_start_ms, departed_ms FROM vc_trip WHERE id = ?", bId).map((r) => ({ code: r.code, status: r.status, bdVn: new Date(r.planned_start_ms + 7 * 3600e3).toISOString().slice(11, 16), xbVn: r.departed_ms ? new Date(r.departed_ms + 7 * 3600e3).toISOString().slice(11, 16) : null })) });
  } finally { tat(); }
});

test("S3.4 A kết thúc 07:10 — tài xế bấm xuất bến B (kế hoạch 08:00) lúc 07:40 KHÔNG cần văn phòng dời giờ", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X = xe(w, 16);
    const dA = await don(w, { soNguoi: 2, gio: "06:40", noiDon: "Khách sạn Quay Đầu A" });
    const dB = await don(w, { soNguoi: 2, gio: "08:10", noiDon: "Khách sạn Quay Đầu B" });
    const A = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:30" });
    const sauA = await xepHet(w, A, dA, 2);
    const B = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
    await xepHet(w, B, dB, 2);
    const aId = A.chuyen.id, bId = B.chuyen.id;
    const donA = sauA.diem.find((d) => d.loai === "PICKUP").id, traA = sauA.diem.find((d) => d.loai === "DROPOFF").id;
    const suatA = sauA.suat.filter((s) => s.loai === "PASSENGER").map((s) => s.id);
    denGio("06:30"); assert.equal((await tienDo(w, "tai-xe", aId, "xuat-ben")).status, 200);
    denGio("06:40"); await tienDo(w, "tai-xe", aId, `diem/${donA}/da-toi`); for (const s of suatA) await tienDo(w, "tai-xe", aId, `phan-bo/${s}/don`);
    denGio("07:05"); await tienDo(w, "tai-xe", aId, `diem/${traA}/da-toi`); for (const s of suatA) await tienDo(w, "tai-xe", aId, `phan-bo/${s}/tra`);
    denGio("07:10"); log("S3.4_A_ket_thuc", tt(await tienDo(w, "tai-xe", aId, "ket-thuc")));
    denGio("07:39");
    log("S3.4_B_xuat_ben_0739", tt(await tienDo(w, "tai-xe", bId, "xuat-ben")));
    denGio("07:40");
    const r = await tienDo(w, "tai-xe", bId, "xuat-ben");
    log("S3.4_B_xuat_ben_0740", tt(r));
    log("S3.4_B_doc_lai", { rows: w.q("SELECT code, status, departed_ms, planned_start_ms FROM vc_trip WHERE id = ?", bId).map((x) => ({ code: x.code, status: x.status, xbVn: x.departed_ms ? new Date(x.departed_ms + 7 * 3600e3).toISOString().slice(11, 16) : null, bdVn: new Date(x.planned_start_ms + 7 * 3600e3).toISOString().slice(11, 16) })) });
    // Khách đoàn B hẹn 08:10 — xe đến sớm; hệ thống có gì nhắc báo khách không?
    const ct = (await w.call("GET", `/api/van-chuyen/chuyen/${bId}`, { as: SALES })).json;
    log("S3.4_B_chi_tiet_sau_xuat_ben", { trangThai: ct?.chuyen?.trangThai, keys: Object.keys(ct?.chuyen ?? {}), canhBao: JSON.stringify(ct?.chuyen?.canhBao ?? ct?.canhBao ?? null)?.slice(0, 400) });
  } finally { tat(); }
});

test("S3.5 lịch chung của điều phối sau khi A kết thúc sớm: có thông tin 'xe rảnh từ' / gợi ý mở chuyến kế không", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X = xe(w, 16);
    const dA = await don(w, { soNguoi: 2, gio: "06:40", noiDon: "Khách sạn Quay Đầu A" });
    const A = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:30" });
    const sauA = await xepHet(w, A, dA, 2);
    const B = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
    const aId = A.chuyen.id;
    const donA = sauA.diem.find((d) => d.loai === "PICKUP").id, traA = sauA.diem.find((d) => d.loai === "DROPOFF").id;
    const suatA = sauA.suat.filter((s) => s.loai === "PASSENGER").map((s) => s.id);
    denGio("06:30"); await tienDo(w, "tai-xe", aId, "xuat-ben");
    denGio("06:40"); await tienDo(w, "tai-xe", aId, `diem/${donA}/da-toi`); for (const s of suatA) await tienDo(w, "tai-xe", aId, `phan-bo/${s}/don`);
    denGio("07:05"); await tienDo(w, "tai-xe", aId, `diem/${traA}/da-toi`); for (const s of suatA) await tienDo(w, "tai-xe", aId, `phan-bo/${s}/tra`);
    denGio("07:10"); await tienDo(w, "tai-xe", aId, "ket-thuc");
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    const xeItem = lich.json.xe.find((x) => x.id === X);
    const cA = lich.json.chuyen.find((c) => c.id === aId), cB = lich.json.chuyen.find((c) => c.id === B.chuyen.id);
    log("S3.5_lich_xe_item", { keys: Object.keys(xeItem ?? {}), xeItem });
    log("S3.5_lich_chuyen_A", { keys: Object.keys(cA ?? {}), trangThai: cA?.trangThai, ketThucThat: cA?.ketThucThat ?? null });
    log("S3.5_lich_chuyen_B", { trangThai: cB?.trangThai, batDau: cB?.batDau, canhBao: (lich.json.canhBao ?? []).filter((c) => c.tripId === B.chuyen.id) });
    log("S3.5_lich_top_keys", { keys: Object.keys(lich.json) });
  } finally { tat(); }
});

test("S3.6 quay đầu trong ngày: 07:15 điều phối chèn thêm một đoàn ĐÃ XÁC NHẬN từ tối qua vào chuyến B (08:00) — mốc 6 giờ có chặn không", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X = xe(w, 16);
    const dB = await don(w, { soNguoi: 2, gio: "08:10", noiDon: "Khách sạn Quay Đầu B" });
    const dC = await don(w, { soNguoi: 2, gio: "08:20", noiDon: "Nhà riêng Đoàn C" });
    const B = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "09:00" });
    await xepHet(w, B, dB, 2);
    log("S3.6_xep_C_luc_2200_hom_truoc", { note: "chưa xếp — để 07:15 mới chèn" });
    denGio("07:15");
    const { xepRaw } = await import("./lib.mjs");
    log("S3.6_sales_chen_C_0715", tt(await xepRaw(w, B.chuyen.id, [{ legId: dC.legId, soSuat: 2 }])));
    log("S3.6_adm_chen_C_0715_pha_le", tt(await xepRaw(w, B.chuyen.id, [{ legId: dC.legId, soSuat: 2 }], ADM, { phaLe: { lyDo: "PHA_LE_SU_CO" } })));
  } finally { tat(); }
});
