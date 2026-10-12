// Tiện ích chung cho các bài thử tình huống ghép xe (sc-ghep). CHỈ ĐỌC repo: import khung thử bằng đường dẫn tuyệt đối. Dữ liệu khách, SĐT là GIẢ.
import assert from "node:assert/strict";
import { SALES, LOC, NGAY, uuid } from "../../../../../tests/audit/dieu-phoi-khung.mjs";

/** Ghi một dòng quan sát JSON (bài KHÔNG đỏ vì phát hiện). */
export function ghi(nhan, obj) {
  console.log(`OBS ${nhan} ${JSON.stringify(obj)}`);
}
/** Tóm tắt phản hồi: status, mã lỗi, lý do. */
export const tom = (r) => ({
  status: r.status,
  code: r.json?.error?.code ?? null,
  msg: r.json?.error?.message ?? null,
  lyDo: r.json?.error?.lyDo?.map((l) => `${l.ma}|${l.loiNhan}`) ?? undefined,
});

/** Bọc w.call để đếm số lời gọi API theo nhóm. */
export function demGoi(w) {
  const dem = {};
  const goc = w.call.bind(w);
  w.call = async (method, path, opt) => {
    const k = `${method} ${path.replace(/[0-9a-f-]{36}/g, ":id")}`;
    dem[k] = (dem[k] ?? 0) + 1;
    return goc(method, path, opt);
  };
  return { dem, reset: () => { for (const k of Object.keys(dem)) delete dem[k]; } };
}

/** Lập đơn (raw, không assert) — trả phản hồi POST. */
export async function lapDon(w, v) {
  const pax = v.pax ?? { adult: v.soNguoi ?? 2, child: 0, senior: 0, infant: 0 };
  const tong = pax.adult + pax.child + pax.senior + pax.infant;
  return w.call("POST", "/api/orders", {
    as: v.as ?? SALES,
    body: {
      customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678", customerNote: "", paymentNote: "",
      ...(v.handler ? { handlerStaffId: v.handler } : {}),
      services: [{
        kind: "catalog", catalogCode: v.catalog ?? "ZA1", pax, catalogPriceSeen: v.priceSeen ?? { adult: 777000 }, departDate: v.ngay ?? NGAY,
        legs: [{ direction: "OUT", pickupDate: v.ngay ?? NGAY, pickupTime: v.gio ?? "07:00", pickupLocationId: null, pickupPlace: v.noiDon ?? "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }],
      }],
      passengers: Array.from({ length: v.ten ?? tong }, (_x, i) => ({
        fullName: `Khách Dò Tìm ${i + 1}`, birthYear: (v.namSinh ?? 1990) + i, paxCode: v.paxCodes?.[i] ?? "adult",
      })),
    },
  });
}
/** Lập + xác nhận, có assert (dùng khi bước này KHÔNG phải điều đang kiểm). */
export async function donXacNhan(w, v) {
  const r = await lapDon(w, v);
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: v.as ?? SALES, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return { id: o.id, code: o.orderCode, legId: o.services[0].legs[0].id, svcId: o.services[0].id, soNguoi: v.soNguoi ?? 2, noiDon: v.noiDon, gio: v.gio };
}
/** Lệnh xếp raw (đọc version mới). */
export async function xep(w, tripId, chang, as = SALES, them = {}) {
  const c = (await w.call("GET", `/api/van-chuyen/chuyen/${tripId}`, { as: SALES })).json;
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as, body: { version: c.chuyen.version, requestId: uuid(), chang, ...them } });
}
/** Lệnh rút raw. */
export async function rut(w, tripId, suatIds, as = SALES, them = {}) {
  const c = (await w.call("GET", `/api/van-chuyen/chuyen/${tripId}`, { as: SALES })).json;
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/rut`, { as, body: { version: c.chuyen.version, requestId: uuid(), suatIds, ...them } });
}
/** Tạo chuyến raw. */
export function taoChuyenRaw(w, v) {
  return w.call("POST", "/api/van-chuyen/chuyen", {
    as: v.as ?? SALES,
    body: { requestId: uuid(), xeId: v.xe, taiXePartyId: v.taiXe, batDau: { ngay: v.ngay ?? NGAY, gio: v.bd ?? "06:30" }, ketThuc: { ngay: v.ngay ?? NGAY, gio: v.kt ?? "10:00" } },
  });
}
/** Tải hiện tại của chuyến (suất chiếm chỗ) đọc thẳng SQLite. */
export const taiSql = (w, tripId) =>
  w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND status IN ('WAITING','BOARDED')", tripId)[0].n;
export const lyDoGiu = (ct) => (ct?.chuyen?.lyDoGiu ?? []).map((l) => `${l.ma}|${l.loiNhan}`);
