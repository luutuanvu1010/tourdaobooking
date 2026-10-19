// Kiểm phản biện C01 — MỘT dịch vụ 5 khách, HAI chặng chiều đi ở hai khách sạn (đi qua route thật). Chỉ đọc repo; dữ liệu GIẢ.
// Câu hỏi: máy có nhận đơn không; lịch chung ghi số người mỗi chặng là bao nhiêu; xếp 3+2 có bị giữ không; xếp 5+0 có xuất bến được không.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRIVER, LOC, NGAY, SALES, batDongHo, chiTiet, denGio, setup, tienDo, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { ghi, lyDoGiu, taiSql, taoChuyenRaw, tom, xep } from "../sc-ghep/chung.mjs";

async function donHaiDiem(w) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678", customerNote: "", paymentNote: "",
      services: [{
        kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 5, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
        legs: [
          { direction: "OUT", pickupDate: NGAY, pickupTime: "07:00", pickupLocationId: null, pickupPlace: "Khách sạn A Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" },
          { direction: "OUT", pickupDate: NGAY, pickupTime: "07:15", pickupLocationId: null, pickupPlace: "Khách sạn B Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" },
        ],
      }],
      passengers: Array.from({ length: 5 }, (_x, i) => ({ fullName: `Khách Dò Tìm ${i + 1}`, birthYear: 1990 + i, paxCode: "adult" })),
    },
  });
  ghi("C01.lapDon", { ...tom(r), soChang: r.json?.order?.services?.[0]?.legs?.length });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
  ghi("C01.xacNhan", tom(x));
  assert.equal(x.status, 200, x.text);
  const legs = o.services[0].legs;
  const a = legs.find((l) => l.pickupTime === "07:00");
  const b = legs.find((l) => l.pickupTime === "07:15");
  return { id: o.id, code: o.orderCode, legA: a.id, legB: b.id };
}
const lichChang = async (w, legId) => {
  const l = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
  const c = l.chang.find((x) => x.legId === legId);
  return c ? { trangThai: c.trangThai, soNguoi: c.soNguoi, soDaXep: c.soDaXep } : null;
};

test("C01(a) xếp đúng thực tế 3 người ở A + 2 người ở B", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const d = await donHaiDiem(w);
    ghi("C01a.lichTruocXep", { A: await lichChang(w, d.legA), B: await lichChang(w, d.legB) });
    const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "10:00" });
    assert.equal(t.status, 201, t.text);
    const id = t.json.chuyen.id;
    const r = await xep(w, id, [{ legId: d.legA, soSuat: 3 }, { legId: d.legB, soSuat: 2 }]);
    ghi("C01a.xep3cong2", { ...tom(r), taiSql: taiSql(w, id) });
    const ct = await chiTiet(w, id);
    ghi("C01a.sauXep", { lyDoGiu: lyDoGiu(ct), A: await lichChang(w, d.legA), B: await lichChang(w, d.legB) });
    // Thử xếp thêm cho đủ "5" ở chặng B (máy đòi 5 mỗi chặng) — sức chứa / số người chặng có chặn không.
    const r2 = await xep(w, id, [{ legId: d.legB, soSuat: 3 }]);
    ghi("C01a.xepThemB3", { ...tom(r2), taiSql: taiSql(w, id) });
    // Xếp tiếp 2 ở A (vẫn ngoài mốc) cho "đủ" 5/5 mỗi chặng: 5 người thật chiếm 10 ghế?
    const r3 = await xep(w, id, [{ legId: d.legA, soSuat: 2 }]);
    ghi("C01a.xepThemA2", { ...tom(r3), taiSql: taiSql(w, id), lyDoGiu: r3.status === 200 ? lyDoGiu(r3.json) : null });
    denGio("06:30", NGAY);
    const xb2 = await tienDo(w, "tai-xe", id, "xuat-ben");
    ghi("C01a.xuatBen2", { ...tom(xb2), lyDo: xb2.json?.error?.lyDo?.map((l) => `${l.ma}|${l.loiNhan}`), taiSql: taiSql(w, id) });
  } finally {
    tat();
  }
});

test("C01(b) xếp 'cho lọt' 5 người ở A, B để trống", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const d = await donHaiDiem(w);
    const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "10:00" });
    const id = t.json.chuyen.id;
    const r = await xep(w, id, [{ legId: d.legA, soSuat: 5 }]);
    ghi("C01b.xep5A", { ...tom(r), taiSql: taiSql(w, id) });
    const ct = await chiTiet(w, id);
    ghi("C01b.sauXep", { lyDoGiu: lyDoGiu(ct), A: await lichChang(w, d.legA), B: await lichChang(w, d.legB), diem: ct.diem.map((z) => `${z.thuTu}.${z.loai} ${z.tenNoi}`) });
    denGio("06:30", NGAY);
    const xb = await tienDo(w, "tai-xe", id, "xuat-ben");
    ghi("C01b.xuatBen", { ...tom(xb), lyDo: xb.json?.error?.lyDo?.map((l) => `${l.ma}|${l.loiNhan}`) });
    ghi("C01b.lichSauXuatBen", { B: await lichChang(w, d.legB) });
  } finally {
    tat();
  }
});
