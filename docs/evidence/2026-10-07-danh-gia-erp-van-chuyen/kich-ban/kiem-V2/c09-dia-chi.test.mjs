// Kiểm C09: địa chỉ của điểm danh mục có tới tài xế không. CHỈ ĐỌC repo. Dữ liệu GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, batDongHo, xe, taoChuyen, xepHet, SALES, ADM, DRIVER, LOC, NGAY } from "../../../../../tests/audit/dieu-phoi-khung.mjs";
const ghi = (n, o) => console.log(`OBS ${n} ${JSON.stringify(o)}`);
const DIA_CHI = "26-28 Trần Phú, Lộc Thọ, Nha Trang";

test("C09: điểm danh mục có địa chỉ → tài xế chỉ thấy tên", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const ban = await w.call("POST", "/api/locations", { as: SALES, body: { code: "KS_SHERATON_X", name: "Sheraton Thử", locationTypeCode: "HOTEL", address: DIA_CHI, sortOrder: 9 } });
    ghi("C09.banHangThemDiem", { status: ban.status, code: ban.json?.error?.code ?? null });
    const loc = await w.call("POST", "/api/locations", { as: ADM, body: { code: "KS_SHERATON_X", name: "Sheraton Thử", locationTypeCode: "HOTEL", address: DIA_CHI, sortOrder: 9 } });
    ghi("C09.quanTriThemDiem", { status: loc.status, address: loc.json?.location?.address });
    assert.equal(loc.status, 201, loc.text);
    const locId = loc.json.location.id;
    const r = await w.call("POST", "/api/orders", { as: SALES, body: {
      customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678", customerNote: "", paymentNote: "",
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
        legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: locId, pickupPlace: null, dropoffLocationId: LOC, dropoffPlace: "" }] }],
      passengers: [{ fullName: "Khách Dò Tìm 1", birthYear: 1990, paxCode: "adult" }, { fullName: "Khách Dò Tìm 2", birthYear: 1991, paxCode: "adult" }],
    } });
    assert.equal(r.status, 201, r.text);
    const o = r.json.order;
    const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
    assert.equal(x.status, 200, x.text);
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, c, { legId: o.services[0].legs[0].id }, 2);
    const tx = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${c.chuyen.id}`, { as: DRIVER });
    const vp = await w.call("GET", `/api/van-chuyen/chuyen/${c.chuyen.id}`, { as: SALES });
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    const coDiaChi = (s) => s.includes("Trần Phú");
    ghi("C09.taiXe", { status: tx.status, trongNgay: tx.json?.trongNgayChay, diem: tx.json?.diem?.map((d) => `${d.loai} ${d.tenNoi}`), coDiaChi: coDiaChi(tx.text), khoaDiem: Object.keys(tx.json?.diem?.[0] ?? {}).join(",") });
    ghi("C09.vanPhong", { status: vp.status, coDiaChi: coDiaChi(vp.text) });
    ghi("C09.lichChung", { status: lich.status, coDiaChi: coDiaChi(lich.text) });
    assert.equal(coDiaChi(tx.text), false);
  } finally { tat(); }
});
