// TÀI XẾ ĐỐI TÁC DÙNG "CUỐC CỦA TÔI" (ADR-0053 D7.1, D7.2, D7.5; kế hoạch A4 T6 — NT-2, NT-3, NT-11, NT-14 / G17). Tài khoản DRIVER_PARTNER của khung thử được
// gắn làm tài xế của một nhà xe (DRIVES_FOR + GPLX — khuôn `taiXeNhaXe`) và lái xe của nhà xe đó. Đồng hồ giả NOW_GIA (bài không chạm đường Từ chối — §2).
// Tên khách, SĐT, số giấy tờ GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import {
  ADM, DRIVER_PARTNER, NGAY_SAU, SALES, batDongHo, chuyenSan, denGio, nhaXeKhung, setup, uuid, xeNhaXe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const DRIVER_PARTNER2 = "66666666-6666-4666-8666-666666666669";
const AT = "2026-09-01T00:00:00.000Z";
let so = 0;
/** Hồ sơ `pty-<id>` (đã có) thành tài xế của nhà xe `carrierId` (DRIVES_FOR + GPLX hạng D). */
function laiChoNhaXe(w: any, staffId: string, carrierId: string) {
  so++;
  w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), `pty-${staffId}`, carrierId, AT, AT);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, 'Nơi cấp Dò Tìm', 'D', '2030-12-31', ?, ?)`).run(`g-dt-${so}`, `pty-${staffId}`, `79330000000${so}`, `79330000000${so}`, AT, AT);
}
/** Khung thử + hai tài khoản tài xế đối tác, mỗi người một nhà xe + một xe; trả xe của từng người. */
function theGioi() {
  const w = setup();
  seedStaff(w.sqlite, { id: DRIVER_PARTNER2, phone: "0900000036", name: "Tài Xế Đối Tác Hai", perms: ["DRIVER_PARTNER"] });
  const nx1 = nhaXeKhung(w, "Nhà xe Một");
  const nx2 = nhaXeKhung(w, "Nhà xe Hai");
  laiChoNhaXe(w, DRIVER_PARTNER, nx1);
  laiChoNhaXe(w, DRIVER_PARTNER2, nx2);
  return { w, xe1: xeNhaXe(w, nx1), xe2: xeNhaXe(w, nx2) };
}
const CAM = /777000|Ghi chú đơn Dò Tìm|Thanh toán Dò Tìm|"An"|Nơi cấp Dò Tìm|0900000001|"(tongTien|total|price|gia|giaThue|chiPhi|soTien)"\s*:/;

test("A4 T6 NT-3 (D7.2): tài xế đối tác lái chuyến ngày mai — trước hạn Từ chối: không tên, liên hệ, mã đơn (toàn văn), có hanTuChoi + tuChoiDuoc; qua hạn trong ngày chạy → có mã đơn, tên; mọi lúc không tiền", async () => {
  const tat = batDongHo();
  try {
    const { w, xe1 } = theGioi();
    const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xe1, ngay: NGAY_SAU, bd: "12:30", kt: "15:00", gio: "13:00" });
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER_PARTNER });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trongNgayChay, false);
    assert.equal(r.json.tuChoiDuoc, true);
    assert.deepEqual(r.json.hanTuChoi, { ngay: NGAY_SAU, gio: "00:30" });
    for (const s of r.json.suat) assert.equal("maDon" in s, false);
    assert.ok(!r.text.includes(a.don.code), "toàn văn không mã đơn");
    assert.doesNotMatch(r.text, /Dò Tìm \d|0912345678|Khách Liên Hệ/);
    assert.doesNotMatch(r.text, CAM);
    denGio("00:05", NGAY_SAU);
    const r2 = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER_PARTNER });
    assert.equal(r2.json.trongNgayChay, false, "trong ngày chạy nhưng chưa qua hạn → ngoài khung");
    assert.ok(!r2.text.includes(a.don.code));
    denGio("00:31", NGAY_SAU);
    const r3 = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER_PARTNER });
    assert.equal(r3.json.trongNgayChay, true);
    assert.equal(r3.json.tuChoiDuoc, false);
    for (const s of r3.json.suat) assert.equal(s.maDon, a.don.code);
    assert.deepEqual(r3.json.suat.map((s: any) => s.hoTen).sort(), ["Khách Dò Tìm 1", "Khách Dò Tìm 2"]);
    assert.deepEqual(r3.json.lienHe.map((x: any) => x.maDon), [a.don.code]);
    assert.doesNotMatch(r3.text, CAM);
  } finally {
    tat();
  }
});

test("A4 T6 NT-2 + NT-11: tài xế đối tác A dò chuyến của B → 404 (xem, chín lệnh); danh sách chỉ chuyến của mình; bổ sung tên → 403; route văn phòng / đơn → 403", async () => {
  const tat = batDongHo();
  try {
    const { w, xe1, xe2 } = theGioi();
    const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xe1, ngay: NGAY_SAU });
    const b = await chuyenSan(w, { taiXe: DRIVER_PARTNER2, xe: xe2, ngay: NGAY_SAU });
    assert.equal((await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${b.id}`, { as: DRIVER_PARTNER })).status, 404);
    for (const d of ["xuat-ben", `diem/${b.diemDon}/da-toi`, `phan-bo/${b.suat[0]}/don`, "ket-thuc"]) {
      const r = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${b.id}/${d}`, { as: DRIVER_PARTNER, body: { requestId: uuid() } });
      assert.equal(r.status, 404, `${d}: ${r.text}`);
    }
    const ds = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi?tu=${NGAY_SAU}`, { as: DRIVER_PARTNER });
    assert.equal(ds.status, 200, ds.text);
    assert.deepEqual(ds.json.chuyen.map((c: any) => c.id), [a.id], "chỉ chuyến của mình");
    assert.ok(!ds.text.includes(b.ma) && !ds.text.includes(a.don.code) && !ds.text.includes(b.don.code));
    const hk = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${a.id}/hanh-khach`, { as: DRIVER_PARTNER, body: { requestId: uuid() } });
    assert.equal(hk.status, 403, "trip.passenger.add none (chủ 5/10)");
    for (const p of ["/api/orders", "/api/orders/dashboard", "/api/parties", "/api/catalog", `/api/van-chuyen/lich?ngay=${NGAY_SAU}`, "/api/van-chuyen/xe", `/api/van-chuyen/chuyen/${a.id}`, "/api/van-chuyen/ban-tai-xe"]) { // ban-tai-xe: A4 T8 (NT-11)
      assert.equal((await w.call("GET", p, { as: DRIVER_PARTNER })).status, 403, p);
    }
  } finally {
    tat();
  }
});

test("A4 T6 NT-14 / G17 (D7.5): văn phòng dời giờ đón chặng đã xếp lên chuyến tài xế đối tác đang lái → tài xế đối tác nhận 'đổi giờ đón' QUA CÙNG HÀM (không mã đơn, không tên); tạo chuyến → 'được xếp'; tài xế đối tác khác không nhận", async () => {
  const tat = batDongHo();
  try {
    const { w, xe1 } = theGioi();
    const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xe1 }); // chặng 13:00 ngày NGAY
    denGio("06:10");
    const o = (await w.call("GET", `/api/orders/${a.don.id}`, { as: ADM })).json.order;
    const l = o.services[0].legs[0];
    const sua = await w.call("PUT", `/api/orders/${a.don.id}/legs/${l.id}`, {
      as: ADM,
      body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: "13:30", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "" } },
    });
    assert.equal(sua.status, 200, sua.text);
    const hop = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as: DRIVER_PARTNER });
    assert.equal(hop.status, 200, hop.text);
    const gio = hop.json.tin.filter((t: any) => t.loai === "chuyen" && t.cau.includes("giờ đón"));
    assert.deepEqual(gio.map((t: any) => [t.cau, t.lienKet]), [[`Văn phòng vừa đổi giờ đón ở chuyến ${a.ma} ngày 11/03 — mở để xem`, `/cuoc-chuyen?id=${a.id}`]], JSON.stringify(hop.json.tin));
    assert.ok(!hop.text.includes(a.don.code), "tin tài xế không mã đơn");
    assert.doesNotMatch(hop.text, /Dò Tìm|0912345678|Khách Liên Hệ/);
    const khac = await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as: DRIVER_PARTNER2 });
    assert.deepEqual(khac.json.tin.filter((t: any) => t.loai === "chuyen"), [], "tài xế đối tác không lái chuyến này");
    // Tin "được xếp" lúc tạo chuyến cũng tới tài xế đối tác.
    assert.ok(hop.json.tin.some((t: any) => t.loai === "chuyen" && t.cau.startsWith("Bạn được xếp lái")), JSON.stringify(hop.json.tin));
    void SALES;
  } finally {
    tat();
  }
});
