// CHUYỂN KHÁCH GIỮA HAI XE — route (ADR-0052 D4, D5c; ADR-0111; kế hoạch A5 T7, T8). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả
// (tests/audit/dieu-phoi-khung.mjs). Tên khách, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, DRIVER, DRIVER2, DRIVER_PARTNER, NGAY_SAU, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo } from "../../../tests/audit/dieu-phoi-khung.mjs";

const xeNhan = (w: any, id: string, as = DRIVER, phamVi?: string) => w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}/xe-nhan${phamVi ? `?phamVi=${phamVi}` : ""}`, { as });

test("NT-A5-2 xe nhận: đúng năm khoá; chỉ chuyến cùng ngày, PLANNED / RUNNING, tài xế mở khác người gửi; ONBOARD chỉ RUNNING (Đ4); không khách / biển số / SĐT / mã đơn; 403 / 404", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
    await chuyenSan(w, { taiXe: DRIVER, gio: "18:00", bd: "17:30", kt: "19:30", noiDon: "Khách sạn Ba" }); // cùng tài xế người gửi → không liệt kê
    await chuyenSan(w, { taiXe: DRIVER2, ngay: NGAY_SAU, gio: "09:00", bd: "08:30", kt: "10:30", noiDon: "Khách sạn Bốn" }); // khác ngày → không liệt kê
    const truoc = await xeNhan(w, a.id);
    assert.equal(truoc.status, 409, truoc.text);
    assert.equal(truoc.json.error.code, "ck_nguon_khong_chay");
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    const r = await xeNhan(w, a.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(Object.keys(r.json).sort(), ["phamVi", "xe"]);
    assert.equal(r.json.phamVi, "STOP");
    assert.deepEqual(r.json.xe.map((x: any) => Object.keys(x).sort()), [["choTrong", "diemSapToi", "maChuyen", "tenTaiXe", "tripId"]]);
    assert.deepEqual([r.json.xe[0].tripId, r.json.xe[0].choTrong, r.json.xe[0].diemSapToi], [b.id, 13, "Khách sạn Hai"]);
    assert.ok(r.json.xe[0].tenTaiXe.length > 0);
    const bienSo = (await chiTiet(w, b.id)).chuyen.xe.bienSo;
    for (const lo of ["Khách Dò Tìm 1", "0912345678", a.don.code, b.don.code, bienSo]) assert.ok(!r.text.includes(lo), `lộ "${lo}"`);
    // Cứu hộ: xe nhận phải đang chạy (ADR-0111 Đ4).
    assert.deepEqual((await xeNhan(w, a.id, DRIVER, "ONBOARD")).json.xe, []);
    denGio("13:20");
    assert.equal((await tienDo(w, "tai-xe", b.id, "xuat-ben", {}, DRIVER2)).status, 200);
    assert.deepEqual((await xeNhan(w, a.id, DRIVER, "ONBOARD")).json.xe.map((x: any) => x.tripId), [b.id]);
    assert.equal((await xeNhan(w, a.id, DRIVER, "XYZ")).status, 400);
    // Quyền: không có ô trip.transfer → 403 trước mọi truy vấn; có ô mà không lái chuyến (kể cả Toàn quyền) → 404.
    for (const as of [SALES, ACC, DRIVER_PARTNER]) assert.equal((await xeNhan(w, a.id, as)).status, 403, as);
    for (const as of [DRIVER2, SUP]) assert.equal((await xeNhan(w, a.id, as)).status, 404, as);
  } finally {
    tat();
  }
});
