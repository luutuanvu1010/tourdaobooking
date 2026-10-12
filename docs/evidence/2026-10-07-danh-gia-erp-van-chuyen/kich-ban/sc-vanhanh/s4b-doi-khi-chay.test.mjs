// S4b — Thay đổi khi xe đang chạy: đổi thứ tự (thu-tu), thêm điểm/khách, báo huỷ, rút, chuyển sang xe khác (doi), cứu hộ. Mỗi lệnh thử bằng DRIVER / SALES / ADM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, ACC, DRIVER, DRIVER2, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, donRieng, tom, log, uuid } from "./helpers.mjs";

async function dung(w) {
  const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000031", tenKhach: "Khách A" });
  const B = await donRieng(w, { soNguoi: 2, gio: "13:20", noiDon: "Khách sạn B", lienHe: "LH B", sdt: "0911000032", tenKhach: "Khách B" });
  const E = await donRieng(w, { soNguoi: 2, gio: "13:40", noiDon: "Khách sạn E (thêm khi chạy)", lienHe: "LH E", sdt: "0911000033", tenKhach: "Khách E" });
  const F = await donRieng(w, { soNguoi: 2, gio: "13:30", noiDon: "Khách sạn F", lienHe: "LH F", sdt: "0911000034", tenKhach: "Khách F" });
  const t1 = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" });
  const t2 = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER2}`, bd: "12:30", kt: "16:00" });
  let v = (await chiTiet(w, t1.chuyen.id)).chuyen.version;
  assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t1.chuyen.id}/phan-bo`, { as: SALES, body: { version: v, requestId: uuid(), chang: [A, B].map((d) => ({ legId: d.legId, soSuat: 2 })) } })).status, 200);
  v = (await chiTiet(w, t2.chuyen.id)).chuyen.version;
  assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t2.chuyen.id}/phan-bo`, { as: SALES, body: { version: v, requestId: uuid(), chang: [{ legId: F.legId, soSuat: 2 }] } })).status, 200);
  denGio("12:35");
  assert.equal((await tienDo(w, "tai-xe", t1.chuyen.id, "xuat-ben")).status, 200);
  denGio("12:36");
  return { A, B, E, F, t1: t1.chuyen.id, t2: t2.chuyen.id };
}
const ver = async (w, id) => (await chiTiet(w, id, ADM)).chuyen.version;
const diemTX = async (w, id, as = DRIVER) => (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}`, { as })).json.diem.map((d) => ({ id: d.id, thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, trangThai: d.trangThai }));

test("S4b.1 đổi thứ tự khi đang chạy", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t1 } = await dung(w);
    const d0 = await diemTX(w, t1);
    log("S4b.1.diem_ban_dau", d0);
    const pA = d0.find((d) => d.tenNoi === "Khách sạn A"), pB = d0.find((d) => d.tenNoi === "Khách sạn B"), tr = d0.find((d) => d.loai === "DROPOFF");
    const kq = {};
    // Tài xế: đổi A ↔ B.
    kq.taiXe_doi_A_B = tom(await tienDo(w, "tai-xe", t1, "thu-tu", { diem: [{ id: pA.id, thuTu: pB.thuTu }, { id: pB.id, thuTu: pA.thuTu }] }));
    denGio("12:37");
    // Tài xế: đưa ĐIỂM TRẢ lên trước điểm đón B (trả trước đón).
    const d1 = await diemTX(w, t1);
    const pB1 = d1.find((d) => d.id === pB.id), tr1 = d1.find((d) => d.id === tr.id);
    kq.taiXe_dua_diem_tra_len_truoc_don = tom(await tienDo(w, "tai-xe", t1, "thu-tu", { diem: [{ id: tr1.id, thuTu: pB1.thuTu }, { id: pB1.id, thuTu: tr1.thuTu }] }));
    kq.diem_sau_tra_truoc_don = await diemTX(w, t1);
    denGio("12:38");
    // Văn phòng (SALES, ADM) cùng lệnh qua route văn phòng; Kế toán.
    const d2 = await diemTX(w, t1);
    const a2 = d2.find((d) => d.id === pA.id), b2 = d2.find((d) => d.id === pB.id);
    kq.SALES_doi = tom(await tienDo(w, "van-phong", t1, "thu-tu", { diem: [{ id: a2.id, thuTu: b2.thuTu }, { id: b2.id, thuTu: a2.thuTu }] }, SALES));
    denGio("12:39");
    kq.ACC_doi = tom(await tienDo(w, "van-phong", t1, "thu-tu", { diem: [{ id: a2.id, thuTu: a2.thuTu }] }, ACC));
    // Hai người cùng nhìn bản cũ (d2) rồi cùng gửi: tài xế gửi đúng bản d2 (đã cũ sau lệnh SALES).
    kq.taiXe_gui_theo_ban_cu = tom(await tienDo(w, "tai-xe", t1, "thu-tu", { diem: [{ id: a2.id, thuTu: b2.thuTu }, { id: b2.id, thuTu: a2.thuTu }] }));
    kq.diem_cuoi = await diemTX(w, t1);
    // Thứ tự tạm thời trùng: đổi một điểm sang số đang có của điểm khác.
    kq.trung_so = tom(await tienDo(w, "tai-xe", t1, "thu-tu", { diem: [{ id: pA.id, thuTu: kq.diem_cuoi.find((d) => d.id === pB.id).thuTu }] }));
    kq.xayRaLuc_o_thu_tu_van_phong = tom(await tienDo(w, "van-phong", t1, "thu-tu", { diem: [], xayRaLuc: "2027-03-11T12:30:00+07:00" }, ADM));
    log("S4b.1.ket_qua", kq);
    log("S4b.1.su_kien_thu_tu", w.q("SELECT kind, count, created_by FROM vc_trip_event WHERE trip_id = ? AND kind = 'STOPS_REORDERED'", t1));
  } finally { tat(); }
});

test("S4b.2 thêm điểm/khách, báo huỷ, rút, dời khi đang chạy", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { B, E, F, t1, t2 } = await dung(w);
    const kq = {};
    const them = async (as, extra = {}) => tom(await w.call("POST", `/api/van-chuyen/chuyen/${t1}/them-diem`, { as, body: { version: await ver(w, t1), requestId: uuid(), chang: [{ legId: E.legId, soSuat: 2 }], ...extra } }));
    kq.them_DRIVER_route_van_phong = await them(DRIVER);
    kq.them_DRIVER_route_tai_xe = tom(await tienDo(w, "tai-xe", t1, "them-diem", { chang: [{ legId: E.legId, soSuat: 2 }] }));
    kq.them_SALES = await them(SALES);
    kq.them_ADM_khong_pha_le = await them(ADM);
    kq.them_ADM_pha_le = await them(ADM, { phaLe: { lyDo: "PHA_LE_SU_CO" } });
    kq.diem_tai_xe_sau_them = await diemTX(w, t1);
    // Thêm KHÁCH (không phải điểm): tài xế bổ sung khách mới qua route hanh-khach (chỉ cho suất chưa tên).
    kq.tai_xe_them_khach_moi = tom(await tienDo(w, "tai-xe", t1, "hanh-khach", { suatId: "khong-co", fullName: "Khách Mới", birthYear: 1990, paxCode: "adult" }));
    // Báo huỷ suất của B (SALES), DRIVER.
    const ct = await chiTiet(w, t1, ADM);
    const sB = ct.suat.filter((s) => s.maDon === B.code).map((s) => s.id);
    const taiTruoc = ct.chuyen.tai;
    kq.baoHuy_DRIVER = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t1}/phan-bo/${sB[0]}/bao-huy`, { as: DRIVER, body: { version: await ver(w, t1), requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" } }));
    kq.baoHuy_SALES = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t1}/phan-bo/${sB[0]}/bao-huy`, { as: SALES, body: { version: await ver(w, t1), requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" } }));
    const ct2 = await chiTiet(w, t1, ADM);
    kq.tai_truoc_sau_bao_huy = [taiTruoc, ct2.chuyen.tai];
    kq.suat_bao_huy = ct2.suat.find((s) => s.id === sB[0]);
    kq.dto_tai_xe_suat_bao_huy = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t1}`, { as: DRIVER })).json.suat.find((s) => s.id === sB[0]);
    // Rút suất khi xe chạy.
    kq.rut_SALES = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t1}/rut`, { as: SALES, body: { version: await ver(w, t1), requestId: uuid(), suatIds: [sB[1]] } }));
    kq.rut_ADM_pha_le = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t1}/rut`, { as: ADM, body: { version: await ver(w, t1), requestId: uuid(), suatIds: [sB[1]], phaLe: { lyDo: "PHA_LE_SU_CO" } } }));
    // Dời 1 điểm (2 suất B) từ xe đang chạy sang xe khác (PLANNED).
    kq.doi_RUNNING_sang_PLANNED_ADM = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t1}/doi`, { as: ADM, body: { version: await ver(w, t1), requestId: uuid(), denChuyenId: t2, denVersion: await ver(w, t2), suatIds: sB, phaLe: { lyDo: "PHA_LE_SU_CO" } } }));
    // Ngược lại: dời từ xe chưa chạy (t2, khách F) sang xe đang chạy t1.
    const sF = (await chiTiet(w, t2, ADM)).suat.filter((s) => s.maDon === F.code).map((s) => s.id);
    kq.doi_PLANNED_sang_RUNNING_ADM = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t2}/doi`, { as: ADM, body: { version: await ver(w, t2), requestId: uuid(), denChuyenId: t1, denVersion: await ver(w, t1), suatIds: sF, phaLe: { lyDo: "PHA_LE_SU_CO" } } }));
    // Đường đề nghị chuyển của tài xế (ADR-0052 D4) có route không?
    kq.de_nghi_chuyen_tai_xe = tom(await tienDo(w, "tai-xe", t1, "de-nghi", {}));
    kq.xe_nhan_tai_xe = tom(await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t1}/xe-nhan`, { as: DRIVER }));
    // Sửa giờ chuyến đang chạy.
    kq.sua_gio_RUNNING_ADM = tom(await w.call("PUT", `/api/van-chuyen/chuyen/${t1}`, { as: ADM, body: { version: await ver(w, t1), requestId: uuid(), ketThuc: { ngay: "2027-03-11", gio: "16:00" } } }));
    log("S4b.2.ket_qua", kq);
  } finally { tat(); }
});

test("S4b.3 cứu hộ: xe hỏng giữa đường", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { A, B, t1, t2 } = await dung(w);
    const ct = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t1}`, { as: DRIVER })).json;
    const pA = ct.diem.find((d) => d.tenNoi === "Khách sạn A");
    const sA = ct.suat.filter((s) => s.maDon === A.code).map((s) => s.id);
    denGio("12:40"); assert.equal((await tienDo(w, "tai-xe", t1, `diem/${pA.id}/da-toi`)).status, 200);
    denGio("12:41"); await tienDo(w, "tai-xe", t1, `phan-bo/${sA[0]}/don`);
    denGio("12:42"); await tienDo(w, "tai-xe", t1, `phan-bo/${sA[1]}/don`);
    // Xe hỏng 12:50 trên đường tới B: 2 khách A đang trên xe, 2 khách B đang chờ.
    denGio("12:50");
    const kq = {};
    kq.cuuHo_truoc_gian_doan = tom(await w.call("GET", `/api/van-chuyen/chuyen/${t1}/cuu-ho`, { as: SALES }));
    kq.gianDoan_DRIVER = tom(await tienDo(w, "tai-xe", t1, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" }));
    const cu = await w.call("GET", `/api/van-chuyen/chuyen/${t1}/cuu-ho`, { as: SALES });
    kq.cuuHo_SALES = { status: cu.status, body: cu.json };
    kq.cuuHo_DRIVER = tom(await w.call("GET", `/api/van-chuyen/chuyen/${t1}/cuu-ho`, { as: DRIVER }));
    kq.suat_t1_sau_gian_doan = w.q("SELECT status, valid_to_at IS NOT NULL dong, close_reason FROM vc_trip_allocation WHERE trip_id = ?", t1);
    kq.diem_t1_sau_gian_doan = w.q("SELECT seq, kind, status, skip_reason_code FROM vc_trip_stop WHERE trip_id = ? ORDER BY seq", t1);
    // Xếp khách A (2 người đã đón, đang đứng ở chỗ xe hỏng) + B lên t2 (PLANNED, DRIVER2) — SALES rồi ADM phá lệ.
    const xepT2 = async (as, extra = {}) => tom(await w.call("POST", `/api/van-chuyen/chuyen/${t2}/phan-bo`, { as, body: { version: await ver(w, t2), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 2 }, { legId: B.legId, soSuat: 2 }], ...extra } }));
    kq.xep_t2_SALES = await xepT2(SALES);
    kq.xep_t2_ADM_pha_le = await xepT2(ADM, { phaLe: { lyDo: "PHA_LE_SU_CO" } });
    const d2 = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t2}`, { as: DRIVER2 });
    kq.dto_tai_xe2_diem = d2.json.diem.map((d) => ({ thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, gioHen: d.gioHen, soNguoi: d.soNguoi }));
    kq.lienHe_tai_xe2 = d2.json.lienHe;
    // Đơn A còn thấy trạng thái gì (chi tiết đơn) — có biết khách đã được đón rồi bị bỏ giữa đường?
    const don = await w.call("GET", `/api/van-chuyen/xe-cua-don/${A.id}`, { as: SALES });
    kq.xe_cua_don_A = { status: don.status, body: don.json };
    log("S4b.3.ket_qua", kq);
    log("S4b.3.su_kien_t1", w.q("SELECT kind, count FROM vc_trip_event WHERE trip_id = ? ORDER BY created_at, rowid", t1));
  } finally { tat(); }
});
