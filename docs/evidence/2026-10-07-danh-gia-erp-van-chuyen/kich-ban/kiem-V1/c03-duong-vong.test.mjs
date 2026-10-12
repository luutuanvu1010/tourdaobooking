// Kiểm phản biện C03 / C04 / C06 — trong vùng khoá 6 giờ, có đường nào KHÔNG cần Quản trị / Toàn quyền để gỡ chuyến bị giữ không?
// (1) Bớt khách: Toàn quyền / HDV giảm số khách → THUA_SUAT; Bán hàng huỷ TÊN người thừa ở đơn rồi bấm "Cập nhật khách theo đơn" (lệnh không bị khoá).
// (2) Huỷ đơn: thử khôi phục đơn, thử huỷ tên ở đơn đã huỷ, thử văn phòng xuất bến kèm thân phá lệ, thử cập nhật khách theo đơn.
// Chỉ đọc repo; dữ liệu GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADM, DRIVER, FIELD, SALES, SUP, batDongHo, chiTiet, denGio, setup, tienDo, uuid, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donXacNhan, ghi, lyDoGiu, taiSql, taoChuyenRaw, tom, xep } from "../sc-ghep/chung.mjs";

const suaSoKhach = (w, d, as, adult) =>
  w.call("POST", `/api/orders/${d.id}/handler-money-edit`, { as, body: { reason: "Khách báo bớt người sát giờ", services: [{ id: d.svcId, pax: { adult, child: 0, senior: 0, infant: 0 } }] } });
const suatCua = (w, tripId, legId) =>
  w.q("SELECT id, passenger_key k, status FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL ORDER BY rowid", tripId, legId).map((r) => ({ ...r }));
const capNhatKhach = async (w, tripId, as = SALES) =>
  w.call("POST", `/api/van-chuyen/chuyen/${tripId}/cap-nhat-khach`, { as, body: { version: (await chiTiet(w, tripId)).chuyen.version, requestId: uuid() } });

async function dung(w) {
  const d1 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Sheraton", gio: "07:00" });
  const d2 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Havana", gio: "07:10" });
  const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "06:45", kt: "09:00" });
  assert.equal(t.status, 201, t.text);
  const id = t.json.chuyen.id;
  const r = await xep(w, id, [d1, d2].map((d) => ({ legId: d.legId, soSuat: 2 })));
  assert.equal(r.status, 200, r.text);
  denGio("06:00");
  return { d1, d2, id };
}

async function boTenThua(w, d, as = SALES) {
  const ds = (await w.call("GET", `/api/orders/${d.id}/passengers`, { as })).json;
  const keys = ds.passengers.map((p) => p.personKey);
  const r = await w.call("POST", `/api/orders/${d.id}/passengers`, { as, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: [keys[keys.length - 1]] } });
  return { r, keys };
}

test("C03(1a) Toàn quyền bớt 1 khách lúc 06:00 → Bán hàng bỏ tên người thừa + cập nhật khách theo đơn", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d2, id } = await dung(w);
    ghi("C03.1a.suatTruoc", { suat: suatCua(w, id, d2.legId) });
    ghi("C03.1a.SUP_bot", tom(await suaSoKhach(w, d2, SUP, 1)));
    ghi("C03.1a.giu1", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    const { r, keys } = await boTenThua(w, d2);
    ghi("C03.1a.SALES_boTen", { ...tom(r), keys: keys.length, conLai: r.json?.passengers?.length });
    ghi("C03.1a.giu2", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    const ck = await capNhatKhach(w, id);
    ghi("C03.1a.SALES_capNhatKhach", { ...tom(ck), daCapNhat: ck.json?.daCapNhat, taiSql: taiSql(w, id), suat: suatCua(w, id, d2.legId) });
    ghi("C03.1a.giu3", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    denGio("06:45");
    const xb = await tienDo(w, "tai-xe", id, "xuat-ben");
    ghi("C03.1a.xuatBen", { ...tom(xb), lyDo: xb.json?.error?.lyDo?.map((l) => `${l.ma}|${l.loiNhan}`) });
  } finally {
    tat();
  }
});

test("C03(1b) HDV đang phụ trách bớt 1 khách lúc 06:00 → cùng đường vòng", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d2, id } = await dung(w);
    ghi("C03.1b.giaoHDV", tom(await w.call("PUT", `/api/orders/${d2.id}/handler`, { as: SALES, body: { staffId: FIELD } })));
    ghi("C03.1b.FIELD_bot", tom(await suaSoKhach(w, d2, FIELD, 1)));
    ghi("C03.1b.giu1", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    // HDV tự bỏ tên được không (ô order.passenger.write của FIELD = none)?
    const hdv = await boTenThua(w, d2, FIELD).catch((e) => ({ r: { status: "loi", json: { error: { message: String(e) } } }, keys: [] }));
    ghi("C03.1b.FIELD_boTen", tom(hdv.r));
    const { r } = await boTenThua(w, d2);
    ghi("C03.1b.SALES_boTen", tom(r));
    const ck = await capNhatKhach(w, id);
    ghi("C03.1b.SALES_capNhatKhach", { ...tom(ck), daCapNhat: ck.json?.daCapNhat, taiSql: taiSql(w, id) });
    ghi("C03.1b.giu3", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
  } finally {
    tat();
  }
});

test("C03(2) huỷ đơn lúc 06:00 — mọi lối thoát không cần Quản trị", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d1, id } = await dung(w);
    ghi("C03.2.huy", tom(await w.call("POST", `/api/orders/${d1.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })));
    ghi("C03.2.giu", { lyDoGiu: lyDoGiu(await chiTiet(w, id)), suat: suatCua(w, id, d1.legId).map((s) => s.status) });
    ghi("C03.2.khoiPhuc", tom(await w.call("POST", `/api/orders/${d1.id}/status`, { as: SALES, body: { status: "confirmed" } })));
    ghi("C03.2.khoiPhuc.SUP", tom(await w.call("POST", `/api/orders/${d1.id}/status`, { as: SUP, body: { status: "confirmed" } })));
    const { r } = await boTenThua(w, d1).catch((e) => ({ r: { status: "loi", json: { error: { message: String(e) } } } }));
    ghi("C03.2.boTenDonHuy", tom(r));
    const ck = await capNhatKhach(w, id);
    ghi("C03.2.capNhatKhach", { ...tom(ck), daCapNhat: ck.json?.daCapNhat, taiSql: taiSql(w, id) });
    const ct = await chiTiet(w, id);
    const huyChuyen = await w.call("POST", `/api/van-chuyen/chuyen/${id}/huy`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } });
    ghi("C03.2.SALES_huyChuyen", { ...tom(huyChuyen), lyDo: huyChuyen.json?.error?.lyDo?.map((l) => l.ma) });
    denGio("06:45");
    const xbVp = await w.call("POST", `/api/van-chuyen/chuyen/${id}/xuat-ben`, { as: SALES, body: { requestId: uuid(), phaLe: { lyDo: "PHA_LE_SU_CO" } } });
    ghi("C03.2.vanPhongXuatBenKemPhaLe", { ...tom(xbVp), lyDo: xbVp.json?.error?.lyDo?.map((l) => l.ma) });
    const xbAdm = await w.call("POST", `/api/van-chuyen/chuyen/${id}/xuat-ben`, { as: ADM, body: { requestId: uuid(), phaLe: { lyDo: "PHA_LE_SU_CO" } } });
    ghi("C03.2.QuanTriXuatBenKemPhaLe", { ...tom(xbAdm), lyDo: xbAdm.json?.error?.lyDo?.map((l) => l.ma) });
  } finally {
    tat();
  }
});

test("C03(3) đường thủ tục: KHÔNG huỷ đơn trước giờ chạy — xuất bến, văn phòng báo huỷ khi xe chạy, rồi mới huỷ đơn", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d1, id } = await dung(w);
    denGio("06:45");
    const xb = await tienDo(w, "tai-xe", id, "xuat-ben");
    ghi("C03.3.xuatBen", tom(xb));
    const suat = suatCua(w, id, d1.legId);
    const out = [];
    for (const s of suat) {
      const ct = await chiTiet(w, id);
      const r = await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo/${s.id}/bao-huy`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" } });
      out.push(tom(r));
    }
    ghi("C03.3.SALES_baoHuy", out);
    const kh = [];
    for (const s of suat) kh.push(tom(await tienDo(w, "tai-xe", id, `phan-bo/${s.id}/khach-huy`)));
    ghi("C03.3.taiXe_khachHuy", kh);
    const h = await w.call("POST", `/api/orders/${d1.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    ghi("C03.3.SALES_huyDonSauXuatBen", { ...tom(h), suat: suatCua(w, id, d1.legId).map((s) => s.status), taiSql: taiSql(w, id) });
  } finally {
    tat();
  }
});

test("C03(4) đường thủ tục ĐI HẾT: xuất bến → báo huỷ → huỷ đơn giữa chuyến → Đã tới + khách huỷ → đón, trả khách còn lại → kết thúc", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d1, d2, id } = await dung(w);
    denGio("06:45");
    ghi("C03.4.xuatBen", tom(await tienDo(w, "tai-xe", id, "xuat-ben")));
    const s1 = suatCua(w, id, d1.legId);
    const s2 = suatCua(w, id, d2.legId);
    for (const s of s1) {
      const ct = await chiTiet(w, id);
      ghi("C03.4.baoHuy", tom(await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo/${s.id}/bao-huy`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" } })));
    }
    ghi("C03.4.huyDonGiuaChuyen", tom(await w.call("POST", `/api/orders/${d1.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })));
    const diem = (await chiTiet(w, id)).diem;
    ghi("C03.4.diem", diem.map((z) => `${z.thuTu}.${z.loai} ${z.tenNoi} ${z.trangThai}`));
    const dSher = diem.find((z) => z.tenNoi === "Khách sạn Sheraton");
    const dHav = diem.find((z) => z.tenNoi === "Khách sạn Havana");
    const dTra = diem.find((z) => z.loai === "DROPOFF");
    denGio("07:00");
    ghi("C03.4.daToiSheraton", tom(await tienDo(w, "tai-xe", id, `diem/${dSher.id}/da-toi`)));
    for (const s of s1) ghi("C03.4.khachHuy", tom(await tienDo(w, "tai-xe", id, `phan-bo/${s.id}/khach-huy`)));
    denGio("07:10");
    ghi("C03.4.daToiHavana", tom(await tienDo(w, "tai-xe", id, `diem/${dHav.id}/da-toi`)));
    for (const s of s2) ghi("C03.4.don", tom(await tienDo(w, "tai-xe", id, `phan-bo/${s.id}/don`)));
    denGio("07:40");
    ghi("C03.4.daToiBen", tom(await tienDo(w, "tai-xe", id, `diem/${dTra.id}/da-toi`)));
    for (const s of s2) ghi("C03.4.tra", tom(await tienDo(w, "tai-xe", id, `phan-bo/${s.id}/tra`)));
    const kt = await tienDo(w, "tai-xe", id, "ket-thuc");
    ghi("C03.4.ketThuc", { ...tom(kt), json: kt.status === 200 ? undefined : kt.json?.error });
    ghi("C03.4.cuoi", { diem: (await chiTiet(w, id)).diem.map((z) => `${z.thuTu}.${z.tenNoi} ${z.trangThai}`), trangThai: (await chiTiet(w, id)).chuyen.trangThai });
  } finally {
    tat();
  }
});
