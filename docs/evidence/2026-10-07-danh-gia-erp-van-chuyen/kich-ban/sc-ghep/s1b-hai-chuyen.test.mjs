// S1b — Ghép 10 đơn vào 2 chuyến (2 xe 16 chỗ): đếm số lời gọi API / thao tác; thứ tự điểm đón (theo giờ đón hay theo thứ tự xếp); chi tiết chuyến trả gì.
// Đồng hồ giả 2027-03-10 06:00 VN (ngày trước ngày chạy — ngoài mốc 6 giờ).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRIVER, DRIVER2, NGAY, SALES, batDongHo, chiTiet, denGio, setup, uuid, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { demGoi, donXacNhan, ghi, lyDoGiu, taiSql, taoChuyenRaw, tom } from "./chung.mjs";

// Đơn 2 và đơn 7 CÙNG khách sạn Havana (xem điểm có dùng lại không).
const KS = ["Khách sạn Sheraton", "Khách sạn Havana", "Khách sạn Liberty", "Khách sạn Novotel", "Khách sạn Mường Thanh", "Khách sạn InterContinental",
  "Khách sạn Havana", "Nhà riêng hẻm 12 Trần Phú", "Khách sạn Citadines", "Khách sạn Premier Havana"];
const SO = [2, 2, 2, 2, 2, 2, 2, 1, 2, 1];
const GIO = ["07:00", "07:10", "07:20", "07:30", "07:40", "07:50", "08:00", "08:10", "08:20", "08:30"];
const diemTom = (ct) => ct.diem.map((d) => `${d.thuTu}.${d.loai === "PICKUP" ? "Đón" : "Trả"} ${d.tenNoi} ${d.gioHen ? d.gioHen.gio : "-"} (${d.soNguoi})`);

test("S1b: 10 đơn → 2 chuyến; cách A một lệnh / đơn (xếp ngược giờ), cách B một lệnh 5 chặng (ngược giờ); đếm lời gọi; thứ tự điểm; sắp lại bằng PUT diem", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const ds = [];
    for (let i = 0; i < 10; i++) ds.push(await donXacNhan(w, { soNguoi: SO[i], noiDon: KS[i], gio: GIO[i] }));
    const goi = demGoi(w);
    // Màn lịch chung: điều phối viên thấy gì trước khi xếp
    const lich0 = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    ghi("S1b.lich.truoc", {
      keys: Object.keys(lich0), soChang: lich0.chang?.length, chuaXep: lich0.chang?.filter((c) => c.trangThai === "CHUA_XEP").length,
      mau: lich0.chang?.[0] ? { maDon: lich0.chang[0].maDon, gioDon: lich0.chang[0].gioDon, noiDon: lich0.chang[0].noiDon, soNguoi: lich0.chang[0].soNguoi, trangThaiNhan: lich0.chang[0].trangThaiNhan } : null,
      thuTuTraVe: lich0.chang?.map((c) => c.gioDon),
    });
    const tA = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}` });
    const tB = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER2}` });
    assert.equal(tA.status, 201, tA.text);
    assert.equal(tB.status, 201, tB.text);
    const A = tA.json.chuyen.id;
    const B = tB.json.chuyen.id;
    // Cách A: 5 đơn đầu (9 khách), MỖI ĐƠN MỘT LỆNH, xếp NGƯỢC giờ đón (đơn 5 → đơn 1).
    for (const i of [4, 3, 2, 1, 0]) {
      const c = (await w.call("GET", `/api/van-chuyen/chuyen/${A}`, { as: SALES })).json;
      const r = await w.call("POST", `/api/van-chuyen/chuyen/${A}/phan-bo`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId: ds[i].legId, soSuat: ds[i].soNguoi }] } });
      assert.equal(r.status, 200, r.text);
    }
    // Cách B: 5 đơn sau (9 khách) MỘT LỆNH, mảng chặng NGƯỢC giờ đón.
    const cB = (await w.call("GET", `/api/van-chuyen/chuyen/${B}`, { as: SALES })).json;
    const rB = await w.call("POST", `/api/van-chuyen/chuyen/${B}/phan-bo`, {
      as: SALES, body: { version: cB.chuyen.version, requestId: uuid(), chang: [9, 8, 7, 6, 5].map((i) => ({ legId: ds[i].legId, soSuat: ds[i].soNguoi })) },
    });
    ghi("S1b.cachB.motLenh", { ...tom(rB), tai: rB.json?.chuyen?.tai });
    ghi("S1b.demGoi", { ...goi.dem });
    const ctA = await chiTiet(w, A);
    const ctB = await chiTiet(w, B);
    ghi("S1b.A.diem", { thuTu: diemTom(ctA), tai: ctA.chuyen.tai, taiSql: taiSql(w, A), lyDoGiu: lyDoGiu(ctA) });
    ghi("S1b.B.diem", { thuTu: diemTom(ctB), tai: ctB.chuyen.tai, taiSql: taiSql(w, B), lyDoGiu: lyDoGiu(ctB) });
    ghi("S1b.B.havanaDungLai", { soDiemHavana: ctB.diem.filter((d) => d.tenNoi === "Khách sạn Havana").length, soDiemHavanaA: ctA.diem.filter((d) => d.tenNoi === "Khách sạn Havana").length });
    ghi("S1b.chiTiet.keys", {
      diem: Object.keys(ctA.diem[0]), suat: Object.keys(ctA.suat[0]),
      suatMau: { ...ctA.suat[0], id: undefined },
      coSdt: /09\d{8}/.test(JSON.stringify(ctA)), coTenKhach: /Khách Dò Tìm/.test(JSON.stringify(ctA)),
      coDiaChi: ctA.diem.map((d) => d.tenNoi).slice(0, 2),
    });
    // Sắp lại theo giờ đón cho chuyến A bằng PUT /chuyen/:id { diem }.
    const don = ctA.diem.filter((d) => d.loai === "PICKUP").sort((x, y) => (x.gioHen.gio < y.gioHen.gio ? -1 : 1));
    const tra = ctA.diem.filter((d) => d.loai === "DROPOFF");
    const moi = [...don, ...tra].map((d, i) => ({ id: d.id, thuTu: i + 1 }));
    goi.reset();
    const p = await w.call("PUT", `/api/van-chuyen/chuyen/${A}`, { as: SALES, body: { version: ctA.chuyen.version, requestId: uuid(), diem: moi } });
    ghi("S1b.A.sapLai.PUT", { ...tom(p), thuTu: p.json ? diemTom(p.json) : null });
    // Thử thứ tự "trả trước đón" (bến trước khách sạn) — máy có chặn không.
    const ct2 = await chiTiet(w, A);
    const dao = [...ct2.diem.filter((d) => d.loai === "DROPOFF"), ...ct2.diem.filter((d) => d.loai === "PICKUP")].map((d, i) => ({ id: d.id, thuTu: i + 1 }));
    const p2 = await w.call("PUT", `/api/van-chuyen/chuyen/${A}`, { as: SALES, body: { version: ct2.chuyen.version, requestId: uuid(), diem: dao } });
    ghi("S1b.A.traTruocDon.PUT", { ...tom(p2), thuTu: p2.json && p2.status === 200 ? diemTom(p2.json) : null });
    // Route thu-tu của văn phòng khi chuyến CHƯA chạy.
    const ct3 = await chiTiet(w, A);
    const t3 = await w.call("POST", `/api/van-chuyen/chuyen/${A}/thu-tu`, { as: SALES, body: { requestId: uuid(), diem: ct3.diem.map((d, i) => ({ id: d.id, thuTu: ct3.diem.length - i })) } });
    ghi("S1b.A.thuTu.PLANNED", tom(t3));
    // Màn tài xế (trong ngày chạy, 06:10) — điểm, số khách, SĐT, địa chỉ.
    denGio("06:10");
    const tx = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${A}`, { as: DRIVER });
    ghi("S1b.taiXe.chiTiet", {
      status: tx.status, keys: tx.json ? Object.keys(tx.json) : null,
      diem: tx.json?.diem?.map((d) => ({ thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, soNguoi: d.soNguoi, keys: Object.keys(d) })).slice(0, 3),
      coSdt: /09\d{8}/.test(tx.text), coTenKhach: /Khách Dò Tìm/.test(tx.text),
    });
    const lich1 = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    ghi("S1b.lich.sau", { chuaXep: lich1.chang?.filter((c) => c.trangThai === "CHUA_XEP").length, trangThai: [...new Set(lich1.chang?.map((c) => c.trangThai))] });
  } finally {
    tat();
  }
});

test("S1b: một lệnh xếp 10 chặng (18 khách) vào xe 16 chỗ → tất cả hay không gì", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const ds = [];
    for (let i = 0; i < 10; i++) ds.push(await donXacNhan(w, { soNguoi: SO[i], noiDon: KS[i], gio: GIO[i] }));
    const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}` });
    const id = t.json.chuyen.id;
    const c = await chiTiet(w, id);
    const r = await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), chang: ds.map((d) => ({ legId: d.legId, soSuat: d.soNguoi })) } });
    ghi("S1b.motLenh10chang18khach", { ...tom(r), taiSql: taiSql(w, id) });
  } finally {
    tat();
  }
});
