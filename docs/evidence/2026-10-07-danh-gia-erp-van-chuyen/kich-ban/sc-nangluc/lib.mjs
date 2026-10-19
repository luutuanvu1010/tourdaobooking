// Tiện ích chung cho bài thử sc-nangluc (chỉ ghi trong scratchpad). Tên khách, SĐT là GIẢ.
import { appendFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { SALES, LOC, NGAY, uuid } from "../../../../../tests/audit/dieu-phoi-khung.mjs";

const DIR = new URL(".", import.meta.url).pathname;
export function ghiNhan(ten) {
  const f = `${DIR}${ten}.obs.jsonl`;
  writeFileSync(f, "");
  return (nhan, obj) => {
    const dong = JSON.stringify({ nhan, ...obj });
    appendFileSync(f, dong + "\n");
    console.log("OBS " + dong);
  };
}
/** Tóm tắt phản hồi: status + mã lỗi + mã lý do (+ lời) + canQuyen. */
export const tt = (r) => ({
  status: r.status,
  code: r.json?.error?.code ?? null,
  message: r.json?.error?.message ?? null,
  lyDo: (r.json?.error?.lyDo ?? []).map((l) => `${l.ma}: ${l.loiNhan ?? ""}`),
  canQuyen: r.json?.error?.canQuyen,
});
export const lamTuoiDanhMuc = (w) => w.sqlite.exec(`UPDATE catalog_sync SET last_attempt_at = '${new Date().toISOString()}', last_success_at = '${new Date().toISOString()}' WHERE id = 'default'`);

/** Đơn tuỳ biến (nhiều chặng, cam kết...). `legs` = mảng chặng thô; `soNguoi` = người lớn; `ten` = số khách có tên. Xác nhận nếu `xacNhan !== false`. */
export async function donTuy(w, v) {
  const soNguoi = v.soNguoi ?? 2;
  const r = await w.call("POST", "/api/orders", {
    as: v.as ?? SALES,
    body: {
      customerName: "Khách Liên Hệ Dò Tìm", customerPhone: v.sdt ?? "0912345678", customerNote: "Ghi chú Dò Tìm", paymentNote: "Thanh toán Dò Tìm",
      services: [{
        kind: "catalog", catalogCode: "ZA1", pax: { adult: soNguoi, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: v.ngay ?? NGAY,
        legs: v.legs, pickupChoice: v.legs?.length ? "DON" : "KHONG_DON",
      }],
      passengers: Array.from({ length: v.ten ?? soNguoi }, (_x, i) => ({ fullName: `${v.tenGoc ?? "Khách Dò Tìm"} ${i + 1}`, birthYear: 1990 + i, paxCode: "adult" })),
    },
  });
  if (r.status !== 201) return { loi: r };
  const o = r.json.order;
  if (v.xacNhan !== false) {
    const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: v.as ?? SALES, body: { status: "confirmed" } });
    assert.equal(x.status, 200, x.text);
  }
  return { id: o.id, code: o.orderCode, legs: o.services[0].legs, order: o };
}
export const legOut = (gio, noiDon, extra = {}) => ({ direction: "OUT", pickupDate: NGAY, pickupTime: gio, pickupLocationId: null, pickupPlace: noiDon, dropoffLocationId: LOC, dropoffPlace: "", ...extra });
export const legRet = (gio, noiTra, extra = {}) => ({ direction: "RETURN", pickupDate: NGAY, pickupTime: gio, pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: noiTra, ...extra });

/** Gọi tạo chuyến KHÔNG assert. */
export const taoChuyenRaw = (w, v) => w.call("POST", "/api/van-chuyen/chuyen", {
  as: v.as,
  body: { requestId: uuid(), xeId: v.xe, taiXePartyId: v.taiXe, batDau: { ngay: v.ngay ?? NGAY, gio: v.bd }, ketThuc: { ngay: v.ngayKt ?? v.ngay ?? NGAY, gio: v.kt }, ...(v.extra ?? {}) },
});
/** Xếp KHÔNG assert. */
export async function xepRaw(w, tripId, chang, as = SALES, extra = {}) {
  const c = (await w.call("GET", `/api/van-chuyen/chuyen/${tripId}`, { as: SALES })).json;
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as, body: { version: c.chuyen.version, requestId: uuid(), chang, ...extra } });
}
