// S4c — Sửa bấm nhầm + "chưa đón được, quay lại sau" + chuyến riêng lẻ (một đoàn, một điểm). Chỉ ghi hành vi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, DRIVER, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, donRieng, tom, log, uuid } from "./helpers.mjs";

test("S4c sửa nhầm và quay lại điểm", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000011", tenKhach: "Khách A" });
    const B = await donRieng(w, { soNguoi: 2, gio: "13:10", noiDon: "Khách sạn B", lienHe: "LH B", sdt: "0911000012", tenKhach: "Khách B" });
    const c = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" });
    const id = c.chuyen.id;
    const v = (await chiTiet(w, id)).chuyen.version;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as: SALES, body: { version: v, requestId: uuid(), chang: [A, B].map((d) => ({ legId: d.legId, soSuat: 2 })) } })).status, 200);
    denGio("12:35");
    assert.equal((await tienDo(w, "tai-xe", id, "xuat-ben")).status, 200);
    const ct = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}`, { as: DRIVER })).json;
    const dA = ct.diem.find((d) => d.tenNoi === "Khách sạn A"), dB = ct.diem.find((d) => d.tenNoi === "Khách sạn B"), dT = ct.diem.find((d) => d.loai === "DROPOFF");
    const sA = ct.suat.filter((s) => s.maDon === A.code).map((s) => s.id), sB = ct.suat.filter((s) => s.maDon === B.code).map((s) => s.id);
    const kq = {};
    // Tới A, khách chưa xuống: không bấm gì, đi B trước, rồi quay lại A.
    denGio("12:40"); kq.A_daToi = tom(await tienDo(w, "tai-xe", id, `diem/${dA.id}/da-toi`));
    denGio("12:45"); kq.B_daToi_khi_A_chua_xong = tom(await tienDo(w, "tai-xe", id, `diem/${dB.id}/da-toi`));
    denGio("12:46"); kq.B_don1 = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sB[0]}/don`));
    denGio("12:47"); kq.B_don2 = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sB[1]}/don`));
    // Quay lại A: một khách tới muộn — trước đó bấm vắng, giờ đón được.
    denGio("12:55"); kq.A_vang1 = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sA[0]}/vang`));
    denGio("12:56"); kq.A_vang_roi_don_lai = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sA[0]}/don`));
    // Bấm nhầm "khách huỷ" rồi muốn sửa thành "đã đón".
    denGio("12:57"); kq.A_khachHuy_nham = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sA[1]}/khach-huy`));
    denGio("12:58"); kq.A_sua_khachHuy_thanh_don = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sA[1]}/don`));
    kq.A_sua_qua_van_phong_SALES = tom(await tienDo(w, "van-phong", id, `phan-bo/${sA[1]}/don`, {}, SALES));
    kq.A_sua_qua_van_phong_ADM = tom(await tienDo(w, "van-phong", id, `phan-bo/${sA[1]}/don`, {}, ADM));
    // Có route "hoàn tác"/"sửa kết quả" không? Thử vài đường đoán (kỳ vọng 404 nếu không có).
    for (const duoi of ["hoan-tac", "sua-ket-qua", "bo-ket-qua"]) kq[`route_${duoi}`] = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sA[1]}/${duoi}`));
    // Route điều chỉnh của ADR-0097 (đã duyệt 3/10): văn phòng sửa kết quả suất có lý do.
    kq.route_ADR0097_dieu_chinh_ADM = tom(await tienDo(w, "van-phong", id, `phan-bo/${sA[1]}/dieu-chinh`, { trangThaiMoi: "BOARDED", lyDo: "KHAC" }, ADM));
    kq.route_ADR0097_thu_hoi_xuat_ben_ADM = tom(await tienDo(w, "van-phong", id, "thu-hoi-xuat-ben", { lyDo: "KHAC" }, ADM));
    // Đã trả nhầm khi chưa tới bến?
    denGio("13:05"); kq.ben_daToi = tom(await tienDo(w, "tai-xe", id, `diem/${dT.id}/da-toi`));
    denGio("13:06"); kq.tra_B0 = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sB[0]}/tra`));
    denGio("13:07"); kq.tra_lai_B0 = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sB[0]}/tra`));
    log("S4c.ket_qua", kq);
    log("S4c.suat_cuoi", w.q("SELECT a.status, s.place_text FROM vc_trip_allocation a JOIN vc_trip_stop s ON s.id = a.board_stop_id WHERE a.trip_id = ? ORDER BY s.place_text", id));
  } finally {
    tat();
  }
});

test("S4d chuyến riêng lẻ (xe riêng một đoàn 6 khách, 1 điểm đón)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 6, gio: "13:00", noiDon: "Villa riêng, 3 Đường Biển", lienHe: "LH Riêng", sdt: "0911000021", tenKhach: "Đoàn Riêng" });
    const c = await taoChuyen(w, { xe: xe(w, 7), taiXe: `pty-${DRIVER}`, bd: "12:40", kt: "14:00", as: SALES });
    log("S4d.tao_chuyen", { status: 201, ma: c.chuyen.ma });
    const v = (await chiTiet(w, c.chuyen.id)).chuyen.version;
    // 06:00, chuyến 12:40 — ngoài mốc 6 giờ.
    const r1 = await w.call("POST", `/api/van-chuyen/chuyen/${c.chuyen.id}/phan-bo`, { as: SALES, body: { version: v, requestId: uuid(), chang: [{ legId: A.legId, soSuat: 6 }] } });
    log("S4d.xep_SALES_trong_moc", tom(r1));
    // Xe 7 chỗ, đoàn 6 — thử thêm đoàn thứ hai 3 khách (tổng 9 = C + 2) vào xe riêng.
    const B = await donRieng(w, { soNguoi: 3, gio: "13:05", noiDon: "Khách sạn Ghép Thêm", lienHe: "LH Ghép", sdt: "0911000022", tenKhach: "Khách Ghép" });
    const v2 = (await chiTiet(w, c.chuyen.id)).chuyen.version;
    const r2 = await w.call("POST", `/api/van-chuyen/chuyen/${c.chuyen.id}/phan-bo`, { as: SALES, body: { version: v2, requestId: uuid(), chang: [{ legId: B.legId, soSuat: 3 }] } });
    log("S4d.ghep_them_3_vao_xe_7_cho_da_co_6", tom(r2));
    const ct = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${c.chuyen.id}`, { as: DRIVER });
    log("S4d.dto_tai_xe", { status: ct.status, diem: ct.json.diem.map((d) => ({ thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, gioHen: d.gioHen, soNguoi: d.soNguoi })), lienHe: ct.json.lienHe, soSuat: ct.json.suat.length });
    denGio("12:40");
    const xb = await tienDo(w, "tai-xe", c.chuyen.id, "xuat-ben");
    log("S4d.xuat_ben", tom(xb));
  } finally {
    tat();
  }
});
