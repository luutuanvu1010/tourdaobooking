// S7 — Bấm trùng / mất mạng: cùng requestId, khác requestId cùng ý, version cũ, requestId dùng lại cho lệnh khác, vé idempotency-key (ADR-0094).
import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, DRIVER, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, donRieng, tom, log, uuid } from "./helpers.mjs";

const dem = (w, rid) => ({
  suKien: w.q("SELECT count(*) n FROM vc_trip_event WHERE request_id = ?", rid)[0].n,
});
test("S7 bấm trùng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000041", tenKhach: "Khách A" });
    const B = await donRieng(w, { soNguoi: 2, gio: "13:10", noiDon: "Khách sạn B", lienHe: "LH B", sdt: "0911000042", tenKhach: "Khách B" });
    const Z = await donRieng(w, { soNguoi: 1, gio: "13:20", noiDon: "Khách sạn Z", lienHe: "LH Z", sdt: "0911000043", tenKhach: "Khách Z" });
    const c = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" });
    const id = c.chuyen.id;
    const kq = {};
    // Version cũ ở lệnh văn phòng (xếp).
    const v1 = (await chiTiet(w, id)).chuyen.version;
    kq.xep_lan1 = tom(await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as: SALES, body: { version: v1, requestId: uuid(), chang: [A, B].map((d) => ({ legId: d.legId, soSuat: 2 })) } }));
    kq.xep_version_cu = tom(await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as: SALES, body: { version: v1, requestId: uuid(), chang: [{ legId: Z.legId, soSuat: 1 }] } }));
    // Xếp cùng requestId hai lần (mạng chập chờn): lần 2 → ?
    const ridX = uuid();
    const v2 = (await chiTiet(w, id)).chuyen.version;
    kq.xep_Z_lan1 = tom(await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as: SALES, body: { version: v2, requestId: ridX, chang: [{ legId: Z.legId, soSuat: 1 }] } }));
    kq.xep_Z_lap_cung_rid_cung_version = tom(await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as: SALES, body: { version: v2, requestId: ridX, chang: [{ legId: Z.legId, soSuat: 1 }] } }));
    kq.so_suat_Z = w.q("SELECT count(*) n FROM vc_trip_allocation a JOIN ord_transfer_leg l ON l.id = a.leg_id WHERE a.trip_id = ? AND a.leg_id = ? AND a.valid_to_at IS NULL", id, Z.legId)[0].n;
    denGio("12:35");
    // Xuất bến: cùng requestId hai lần nối tiếp.
    const ridXB = uuid();
    const x1 = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { as: DRIVER, body: { requestId: ridXB } });
    const x2 = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { as: DRIVER, body: { requestId: ridXB } });
    kq.xuatBen_lan1 = tom(x1); kq.xuatBen_lan2_cung_rid = { ...tom(x2), trangThai: x2.json?.chuyen?.trangThai };
    kq.xuatBen_dem = { ...dem(w, ridXB), audit: w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_departed'")[0].n };
    denGio("12:36");
    kq.xuatBen_khac_rid = tom(await tienDo(w, "tai-xe", id, "xuat-ben"));
    const ct = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}`, { as: DRIVER })).json;
    const pA = ct.diem.find((d) => d.tenNoi === "Khách sạn A"), pB = ct.diem.find((d) => d.tenNoi === "Khách sạn B");
    const sA = ct.suat.filter((s) => s.maDon === A.code).map((s) => s.id), sB = ct.suat.filter((s) => s.maDon === B.code).map((s) => s.id);
    // Đã tới: cùng requestId gửi ĐỒNG THỜI.
    denGio("12:40");
    const ridDT = uuid();
    const [d1, d2] = await Promise.all([
      w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/diem/${pA.id}/da-toi`, { as: DRIVER, body: { requestId: ridDT } }),
      w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/diem/${pA.id}/da-toi`, { as: DRIVER, body: { requestId: ridDT } }),
    ]);
    kq.daToi_dong_thoi_cung_rid = [tom(d1), tom(d2)];
    kq.daToi_dem = { ...dem(w, ridDT), audit: w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_stop_arrived'")[0].n };
    denGio("12:41");
    kq.daToi_lai_khac_rid = tom(await tienDo(w, "tai-xe", id, `diem/${pA.id}/da-toi`));
    // Đã đón: khác requestId, cùng ý (bấm hai lần).
    denGio("12:42");
    kq.don_lan1 = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sA[0]}/don`));
    kq.don_lan2_khac_rid = tom(await tienDo(w, "tai-xe", id, `phan-bo/${sA[0]}/don`));
    // Đã đón: khác requestId gửi ĐỒNG THỜI.
    denGio("12:43");
    const [e1, e2] = await Promise.all([
      tienDo(w, "tai-xe", id, `phan-bo/${sA[1]}/don`), tienDo(w, "tai-xe", id, `phan-bo/${sA[1]}/don`),
    ]);
    kq.don_dong_thoi_khac_rid = [tom(e1), tom(e2)];
    kq.don_dem_su_kien_suat = w.q("SELECT count(*) n FROM vc_trip_event WHERE allocation_id = ? AND kind = 'PASSENGER_BOARDED'", sA[1])[0].n;
    // Version cũ trong thân lệnh tiến độ (máy chủ không nhận version) — gửi khoá version cũ.
    denGio("12:44");
    kq.daToi_B_kem_version_cu = tom(await tienDo(w, "tai-xe", id, `diem/${pB.id}/da-toi`, { version: 1 }));
    // requestId DÙNG LẠI cho lệnh KHÁC (lỗi máy khách): lấy requestId của "đón sA[0]" gửi cho "vắng sB[0]".
    const ridCu = w.q("SELECT request_id FROM vc_trip_event WHERE allocation_id = ? AND kind = 'PASSENGER_BOARDED'", sA[0])[0].request_id;
    denGio("12:45");
    const r = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/phan-bo/${sB[0]}/vang`, { as: DRIVER, body: { requestId: ridCu } });
    kq.vang_B0_dung_lai_rid_cua_lenh_khac = { ...tom(r), trangThaiSuatTrongPhanHoi: r.json?.suat?.find((s) => s.id === sB[0])?.trangThai };
    kq.vang_B0_trang_thai_that = w.q("SELECT status FROM vc_trip_allocation WHERE id = ?", sB[0])[0].status;
    // requestId dùng lại ở VĂN PHÒNG bấm thay (đã đón sB[0]).
    denGio("12:46");
    const r2 = await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo/${sB[0]}/don`, { as: SALES, body: { requestId: ridCu } });
    kq.van_phong_don_B0_dung_lai_rid = { ...tom(r2), trangThaiSuat: w.q("SELECT status FROM vc_trip_allocation WHERE id = ?", sB[0])[0].status };
    // Lớp vé idempotency-key (ADR-0094): cùng vé, cùng thân → phát lại; cùng vé, thân khác → 422.
    denGio("12:47");
    const ve = uuid();
    const body = { requestId: uuid() };
    const h1 = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/phan-bo/${sB[0]}/don`, { as: DRIVER, body, headers: { "idempotency-key": ve } });
    await w.choNen();
    const h2 = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/phan-bo/${sB[0]}/don`, { as: DRIVER, body, headers: { "idempotency-key": ve } });
    const h3 = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/phan-bo/${sB[1]}/don`, { as: DRIVER, body: { requestId: uuid() }, headers: { "idempotency-key": ve } });
    kq.ve_lan1 = tom(h1); kq.ve_lan2 = { ...tom(h2), phatLai: h2.headers.get("x-phat-lai") ?? [...h2.headers.keys()].filter((k) => /phat|replay/i.test(k)) };
    kq.ve_than_khac = tom(h3);
    kq.lg_lan_gui = w.q("SELECT duong, ma_tra, so_lan_lap FROM lg_lan_gui");
    log("S7.ket_qua", kq);
    log("S7.su_kien", w.q("SELECT kind, count(*) n FROM vc_trip_event WHERE trip_id = ? GROUP BY kind", id));
  } finally { tat(); }
});
