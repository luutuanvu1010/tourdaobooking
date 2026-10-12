// S1 — Sức chứa khi ghép 10 đơn (10 khách sạn) vào MỘT chuyến xe 16 chỗ; thử tổng 15, 16, 17, 18 suất; phá lệ; em bé; xe 4 / 7 chỗ.
// Đồng hồ giả: 2027-03-10 06:00 VN (ngày TRƯỚC ngày chạy) để không chạm mốc 6 giờ (S6 kiểm riêng mốc).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADM, DRIVER, DRIVER2, NGAY, SALES, SUP, batDongHo, chiTiet, setup, uuid, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donXacNhan, ghi, lapDon, lyDoGiu, taiSql, taoChuyenRaw, tom, xep } from "./chung.mjs";

const KS = ["Khách sạn Sheraton", "Khách sạn Havana", "Khách sạn Liberty", "Khách sạn Novotel", "Khách sạn Mường Thanh", "Khách sạn InterContinental",
  "Khách sạn Vinpearl Beachfront", "Nhà riêng hẻm 12 Trần Phú", "Khách sạn Citadines", "Khách sạn Premier Havana"];
const SO = [2, 2, 2, 2, 2, 2, 2, 1, 2, 1]; // tổng 18
const GIO = ["07:00", "07:10", "07:20", "07:30", "07:40", "07:50", "08:00", "08:10", "08:20", "08:30"];

async function mươiDon(w) {
  const ds = [];
  for (let i = 0; i < 10; i++) ds.push(await donXacNhan(w, { soNguoi: SO[i], noiDon: KS[i], gio: GIO[i] }));
  return ds;
}

test("S1: 10 đơn / 18 khách — xe 16 chỗ: 15, 16, 17, 18 suất; phá lệ Quản trị / Toàn quyền", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const ds = await mươiDon(w);
    const xe16 = xe(w, 16);
    const t = await taoChuyenRaw(w, { xe: xe16, taiXe: `pty-${DRIVER}` });
    ghi("S1.taoChuyen16", { ...tom(t), soCho: t.json?.chuyen?.xe?.soCho, lyDoGiu: lyDoGiu(t.json) });
    assert.equal(t.status, 201, t.text);
    const id = t.json.chuyen.id;
    // Bước 1: 8 đơn đầu (2+2+2+2+2+2+2+1 = 15) trong MỘT lệnh.
    const r15 = await xep(w, id, ds.slice(0, 8).map((d) => ({ legId: d.legId, soSuat: d.soNguoi })));
    ghi("S1.xep15", { ...tom(r15), tai: r15.json?.chuyen?.tai, taiSql: taiSql(w, id), canhBaoXep: r15.json?.canhBaoXep?.map((l) => l.ma) });
    // Bước 2: đơn 10 (1 khách) → 16.
    const r16 = await xep(w, id, [{ legId: ds[9].legId, soSuat: 1 }]);
    ghi("S1.xep16", { ...tom(r16), tai: r16.json?.chuyen?.tai, taiSql: taiSql(w, id) });
    // Bước 3: đơn 9 (2 khách) → 18: Bán hàng.
    const r18 = await xep(w, id, [{ legId: ds[8].legId, soSuat: 2 }]);
    ghi("S1.xep18.SALES", { ...tom(r18), taiSql: taiSql(w, id) });
    // Bước 3b: chỉ 1 khách của đơn 9 → 17: Bán hàng.
    const r17 = await xep(w, id, [{ legId: ds[8].legId, soSuat: 1 }]);
    ghi("S1.xep17.SALES", { ...tom(r17), taiSql: taiSql(w, id) });
    // Bước 3c: Quản trị phá lệ (lý do danh mục PHA_LE_DON_GAP) cả "phaLe" và "camKetPhaLe" → 17.
    const r17a = await xep(w, id, [{ legId: ds[8].legId, soSuat: 1 }], ADM, { phaLe: { lyDo: "PHA_LE_DON_GAP" }, camKetPhaLe: { lyDo: "PHA_LE_DON_GAP" } });
    ghi("S1.xep17.ADM_phaLe", { ...tom(r17a), taiSql: taiSql(w, id) });
    const r17s = await xep(w, id, [{ legId: ds[8].legId, soSuat: 1 }], SUP, { phaLe: { lyDo: "PHA_LE_SU_CO" } });
    ghi("S1.xep17.SUP_phaLe", { ...tom(r17s), taiSql: taiSql(w, id) });
    // Lớp CSDL: chèn thẳng suất thứ 17 bằng SQL (lách máy chủ) → trigger?
    let loiSql = null;
    try {
      const diemLen = w.q("SELECT id FROM vc_trip_stop WHERE trip_id = ? AND kind = 'PICKUP' LIMIT 1", id)[0].id;
      w.sqlite.prepare(`INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, crew_party_id, board_stop_id, alight_stop_id, status, valid_from_at, created_at, created_by, updated_at)
        VALUES (?, ?, 'PASSENGER', ?, NULL, NULL, ?, NULL, 'WAITING', ?, ?, ?, ?)`).run(uuid(), id, ds[0].legId, diemLen, new Date().toISOString(), new Date().toISOString(), SALES, new Date().toISOString());
    } catch (e) { loiSql = String(e.message).slice(0, 160); }
    ghi("S1.sql17.trigger", { loiSql, taiSql: taiSql(w, id) });
    // Đơn 9 bị bỏ lại: trạng thái trên lịch chung.
    const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    const c9 = (lich?.chang ?? []).find((c) => c.legId === ds[8].legId);
    ghi("S1.lich.don9", { coTrongLich: !!c9, trangThai: c9?.trangThai, soNguoi: c9?.soNguoi, soDaXep: c9?.soDaXep, keys: c9 ? Object.keys(c9) : Object.keys(lich ?? {}) });
    const ct = await chiTiet(w, id);
    ghi("S1.chiTiet.sau", { tai: ct.chuyen.tai, soCho: ct.chuyen.xe.soCho, lyDoGiu: lyDoGiu(ct), soDiem: ct.diem.length });
  } finally {
    tat();
  }
});

test("S1: xếp MỘT PHẦN đơn để lấp đủ 16 (đơn 3 khách chỉ xếp 2) → giữ THIEU_SUAT?", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const a = await donXacNhan(w, { soNguoi: 14, noiDon: "Khách sạn Đoàn A", gio: "07:00" });
    const b = await donXacNhan(w, { soNguoi: 3, noiDon: "Khách sạn Đoàn B", gio: "07:15" });
    const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}` });
    const id = t.json.chuyen.id;
    const r = await xep(w, id, [{ legId: a.legId, soSuat: 14 }, { legId: b.legId, soSuat: 2 }]);
    ghi("S1.motPhan.xep", { ...tom(r), taiSql: taiSql(w, id), canhBaoXep: r.json?.canhBaoXep?.map((l) => l.ma) });
    const ct = await chiTiet(w, id);
    ghi("S1.motPhan.lyDoGiu", { lyDoGiu: lyDoGiu(ct) });
  } finally {
    tat();
  }
});

test("S1: em bé (infant) — có tính vào số người chặng và chiếm suất không", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('ZI1', 'Tour đảo có em bé', 'perPax', 777000, 500000, 0, 1, '2026-01-01', '2026-01-01')");
    const r = await lapDon(w, { catalog: "ZI1", pax: { adult: 2, child: 0, senior: 0, infant: 1 }, priceSeen: { adult: 777000, infant: 0 }, paxCodes: ["adult", "adult", "infant"], noiDon: "Khách sạn Em Bé", gio: "07:30" });
    ghi("S1.infant.lapDon", { ...tom(r) });
    if (r.status !== 201) return;
    const o = r.json.order;
    const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
    ghi("S1.infant.xacNhan", tom(x));
    const legId = o.services[0].legs[0].id;
    const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    const c = (lich?.chang ?? []).find((z) => z.legId === legId);
    ghi("S1.infant.lich", { soNguoi: c?.soNguoi });
    const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}` });
    const id = t.json.chuyen.id;
    const r2 = await xep(w, id, [{ legId, soSuat: 2 }]);
    ghi("S1.infant.xep2", { ...tom(r2), taiSql: taiSql(w, id) });
    ghi("S1.infant.lyDoGiu.sau2", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    const r3 = await xep(w, id, [{ legId, soSuat: 1 }]);
    ghi("S1.infant.xepThem1", { ...tom(r3), taiSql: taiSql(w, id) });
    ghi("S1.infant.lyDoGiu.sau3", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    const r4 = await xep(w, id, [{ legId, soSuat: 1 }]);
    ghi("S1.infant.xepThem1nua", { ...tom(r4), taiSql: taiSql(w, id) });
  } finally {
    tat();
  }
});

test("S1: xe 4 chỗ và 7 chỗ — tạo chuyến (tài xế hạng D1) và xếp quá số chỗ", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const a = await donXacNhan(w, { soNguoi: 5, noiDon: "Khách sạn Năm Người", gio: "07:00" });
    const b = await donXacNhan(w, { soNguoi: 8, noiDon: "Khách sạn Tám Người", gio: "07:00" });
    const t4 = await taoChuyenRaw(w, { xe: xe(w, 4), taiXe: `pty-${DRIVER}` });
    ghi("S1.xe4.tao", { ...tom(t4), soCho: t4.json?.chuyen?.xe?.soCho });
    const t7 = await taoChuyenRaw(w, { xe: xe(w, 7), taiXe: `pty-${DRIVER2}` });
    ghi("S1.xe7.tao", { ...tom(t7), soCho: t7.json?.chuyen?.xe?.soCho });
    if (t4.status === 201) {
      const id4 = t4.json.chuyen.id;
      ghi("S1.xe4.xep5", { ...tom(await xep(w, id4, [{ legId: a.legId, soSuat: 5 }])), taiSql: taiSql(w, id4) });
      ghi("S1.xe4.xep4", { ...tom(await xep(w, id4, [{ legId: a.legId, soSuat: 4 }])), taiSql: taiSql(w, id4) });
      ghi("S1.xe4.lyDoGiu", { lyDoGiu: lyDoGiu(await chiTiet(w, id4)) });
    }
    if (t7.status === 201) {
      const id7 = t7.json.chuyen.id;
      ghi("S1.xe7.xep8", { ...tom(await xep(w, id7, [{ legId: b.legId, soSuat: 8 }])), taiSql: taiSql(w, id7) });
      ghi("S1.xe7.xep7", { ...tom(await xep(w, id7, [{ legId: b.legId, soSuat: 7 }])), taiSql: taiSql(w, id7) });
      ghi("S1.xe7.xep8_ADM_phaLe", { ...tom(await xep(w, id7, [{ legId: b.legId, soSuat: 1 }], ADM, { phaLe: { lyDo: "PHA_LE_DON_GAP" } })), taiSql: taiSql(w, id7) });
    }
  } finally {
    tat();
  }
});
