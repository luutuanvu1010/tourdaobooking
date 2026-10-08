// Bài THUẦN của src/shared/chi-duong.ts (ADR-0105 bài kiểm 3, 4; kế hoạch T1, T2 — NT-1, NT-2, NT-3, NT-8, NT-9, NT-10 phần thuần).
import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_BAN_DO, chuoiDichChiDuong, giuChiDuong, laMayApple, lienKetChiDuong, nutChiDuongCuaDiem } from "./chi-duong.ts";

const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1";
const UA_IPAD_CU = "Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1";
const UA_IPAD_KIEU_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const UA_IPOD = "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1";
const UA_MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const UA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const UA_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const UA_LINUX = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const GOOGLE_DAU = "https://www.google.com/maps/dir/?api=1&destination=";
const APPLE_DAU = "https://maps.apple.com/directions?destination=";
const thamSo = (u: string) => [...new URL(u).searchParams.keys()].sort();

// ---- NT-1: lienKetChiDuong ------------------------------------------------------------------------------------------------------------------------------
test("NT-1: hai liên kết đúng dạng, giải mã ra CÙNG chuỗi đích (đã trim) — chữ có dấu, dấu cách, & # + / ?", () => {
  for (const s of ["Số 1 Trần Phú, Nha Trang", "  Bến tàu du lịch Nha Trang  ", "A & B # C + D / E ? F", "Hẻm 3/12 Lê Thánh Tôn", "x=1&y=2", "%20 sẵn"]) {
    const r = lienKetChiDuong(s);
    assert.ok(r, s);
    assert.ok(r.google.startsWith(GOOGLE_DAU) && r.google.endsWith("&travelmode=driving"), r.google);
    assert.ok(r.apple.startsWith(APPLE_DAU) && r.apple.endsWith("&mode=driving"), r.apple);
    assert.equal(new URL(r.google).searchParams.get("destination"), s.trim());
    assert.equal(new URL(r.apple).searchParams.get("destination"), s.trim());
    assert.deepEqual(thamSo(r.google), ["api", "destination", "travelmode"]);
    assert.deepEqual(thamSo(r.apple), ["destination", "mode"]);
    assert.equal(new URL(r.google).searchParams.get("api"), "1");
    assert.equal(new URL(r.google).searchParams.get("travelmode"), "driving");
    assert.equal(new URL(r.apple).searchParams.get("mode"), "driving");
  }
});

test("NT-1: không bao giờ có tham số điểm xuất phát hay điểm giữa (origin, source, saddr, daddr, waypoints)", () => {
  const r = lienKetChiDuong("Số 1 Trần Phú")!;
  for (const u of [r.google, r.apple]) for (const k of ["origin", "source", "saddr", "daddr", "waypoints"]) assert.equal(new URL(u).searchParams.has(k), false, `${k} ở ${u}`);
});

test("NT-1: dấu cách thành %20, + thành %2B (encodeURIComponent — không phải encodeURI / URLSearchParams)", () => {
  const r = lienKetChiDuong("a b+c")!;
  assert.ok(r.google.includes("destination=a%20b%2Bc&"), r.google);
  assert.ok(r.apple.includes("destination=a%20b%2Bc&"), r.apple);
});

test("NT-1: chuỗi rỗng / toàn khoảng trắng → null", () => {
  assert.equal(lienKetChiDuong(""), null);
  assert.equal(lienKetChiDuong("   \t\n "), null);
});

test("NT-1: liên kết Google dài hơn 2 048 ký tự → null cho CẢ HAI (không cắt chuỗi); ranh giới 1978 / 1979; 300 × \"ệ\"", () => {
  const vua = lienKetChiDuong("a".repeat(1978));
  assert.ok(vua, "1978 ký tự: vẫn có liên kết");
  assert.equal(vua.google.length, 2048);
  assert.equal(lienKetChiDuong("a".repeat(1979)), null, "1979 ký tự: liên kết Google 2049 > 2048 → không nút nào");
  assert.equal(lienKetChiDuong("ệ".repeat(300)), null, "300 chữ có dấu (9 ký tự mã hoá mỗi chữ) → không nút nào");
});

// ---- NT-2: laMayApple -----------------------------------------------------------------------------------------------------------------------------------
test("NT-2: máy Apple — iPhone, iPad đời cũ, iPad tự báo là Mac, iPod, Mac → đúng; Android, Windows, Linux, chuỗi rỗng → sai", () => {
  for (const ua of [UA_IPHONE, UA_IPAD_CU, UA_IPAD_KIEU_MAC, UA_IPOD, UA_MAC_CHROME]) assert.equal(laMayApple(ua), true, ua);
  for (const ua of [UA_ANDROID, UA_WINDOWS, UA_LINUX, ""]) assert.equal(laMayApple(ua), false, ua);
});

// ---- NT-3: chuoiDichChiDuong ----------------------------------------------------------------------------------------------------------------------------
test("NT-3: điểm danh mục có địa chỉ → địa chỉ đã trim; địa chỉ null / rỗng / toàn khoảng trắng → tên điểm", () => {
  assert.equal(chuoiDichChiDuong({ laDanhMuc: true, diaChi: "  Số 1 Trần Phú  ", tenNoi: "Khách sạn A" }), "Số 1 Trần Phú");
  assert.equal(chuoiDichChiDuong({ laDanhMuc: true, diaChi: null, tenNoi: "Khách sạn A" }), "Khách sạn A");
  assert.equal(chuoiDichChiDuong({ laDanhMuc: true, diaChi: "", tenNoi: "Khách sạn A" }), "Khách sạn A");
  assert.equal(chuoiDichChiDuong({ laDanhMuc: true, diaChi: "   ", tenNoi: "Khách sạn A" }), "Khách sạn A");
});

test("NT-3: chữ tự do → ĐÚNG tên nơi tài xế đang thấy (đã che), kể cả khi diaChi khác null", () => {
  assert.equal(chuoiDichChiDuong({ laDanhMuc: false, diaChi: null, tenNoi: "Nhà nghỉ •••••••••• hẻm 3" }), "Nhà nghỉ •••••••••• hẻm 3");
  assert.equal(chuoiDichChiDuong({ laDanhMuc: false, diaChi: "Số 9 Lạc", tenNoi: "Nhà nghỉ X" }), "Nhà nghỉ X");
});

// ---- NT-8, NT-9: nutChiDuongCuaDiem ---------------------------------------------------------------------------------------------------------------------
const CHUYEN = ["PLANNED", "RUNNING", "ENDED", "ENDED_INTERRUPTED", "CANCELLED"] as const;
const DIEM = ["PENDING", "ARRIVED", "DONE", "SKIPPED", "MOVED"] as const;

test("NT-8: nút chỉ ở chuyến PLANNED / RUNNING × điểm PENDING / ARRIVED (bảng 5 × 5)", () => {
  for (const c of CHUYEN) for (const d of DIEM) {
    const nut = nutChiDuongCuaDiem({ trangThaiChuyen: c, trangThaiDiem: d, chuoiDich: "Số 1 Trần Phú", ua: UA_ANDROID });
    const mong = (c === "PLANNED" || c === "RUNNING") && (d === "PENDING" || d === "ARRIVED");
    assert.equal(nut.length > 0, mong, `${c} × ${d}`);
  }
});

test("NT-8: DTO không có chuỗi đích (ngoài ngày chạy) → không nút; chuỗi quá dài → không nút", () => {
  assert.deepEqual(nutChiDuongCuaDiem({ trangThaiChuyen: "RUNNING", trangThaiDiem: "PENDING", chuoiDich: undefined, ua: UA_IPHONE }), []);
  assert.deepEqual(nutChiDuongCuaDiem({ trangThaiChuyen: "RUNNING", trangThaiDiem: "PENDING", chuoiDich: "ệ".repeat(300), ua: UA_IPHONE }), []);
  assert.deepEqual(nutChiDuongCuaDiem({ trangThaiChuyen: "RUNNING", trangThaiDiem: "PENDING", chuoiDich: "  ", ua: UA_IPHONE }), []);
});

test("NT-9: máy Apple → Google Maps rồi Apple Maps; Android / Windows → chỉ Google Maps; href đúng bằng lienKetChiDuong", () => {
  const s = "Số 1 Trần Phú";
  const lk = lienKetChiDuong(s)!;
  const iphone = nutChiDuongCuaDiem({ trangThaiChuyen: "PLANNED", trangThaiDiem: "PENDING", chuoiDich: s, ua: UA_IPHONE });
  assert.deepEqual(iphone, [{ banDo: "google", nhan: "Google Maps", href: lk.google }, { banDo: "apple", nhan: "Apple Maps", href: lk.apple }]);
  const mac = nutChiDuongCuaDiem({ trangThaiChuyen: "RUNNING", trangThaiDiem: "ARRIVED", chuoiDich: s, ua: UA_IPAD_KIEU_MAC });
  assert.deepEqual(mac.map((n) => n.nhan), ["Google Maps", "Apple Maps"]);
  for (const ua of [UA_ANDROID, UA_WINDOWS]) {
    assert.deepEqual(nutChiDuongCuaDiem({ trangThaiChuyen: "RUNNING", trangThaiDiem: "PENDING", chuoiDich: s, ua }), [{ banDo: "google", nhan: "Google Maps", href: lk.google }]);
  }
  assert.deepEqual(NHAN_BAN_DO, { google: "Google Maps", apple: "Apple Maps" });
});

// ---- NT-10 phần thuần: giuChiDuong ----------------------------------------------------------------------------------------------------------------------
const dto = (trongNgayChay: boolean, diem: { id: string; diaChiChiDuong?: string }[]) => ({ trongNgayChay, diem, khac: 1 });

test("NT-10: đọc lại GET hỏng — phản hồi lệnh thiếu khoá, lần GET trước có, vẫn trong ngày chạy → chép chuỗi đích theo id điểm", () => {
  const cu = dto(true, [{ id: "d1", diaChiChiDuong: "Số 1" }, { id: "d2", diaChiChiDuong: "Bến tàu" }]);
  const moi = dto(true, [{ id: "d2" }, { id: "d1" }, { id: "d3" }]);
  const r = giuChiDuong(moi, cu);
  assert.deepEqual(r.diem, [{ id: "d2", diaChiChiDuong: "Bến tàu" }, { id: "d1", diaChiChiDuong: "Số 1" }, { id: "d3" }]);
  assert.equal(r.khac, 1);
});

test("NT-10: phản hồi lệnh nói ĐÃ HẾT ngày chạy → không chép; cũ null → trả nguyên; mới đã có khoá → giữ của mới", () => {
  const cu = dto(true, [{ id: "d1", diaChiChiDuong: "Số 1" }]);
  assert.deepEqual(giuChiDuong(dto(false, [{ id: "d1" }]), cu).diem, [{ id: "d1" }]);
  const moi = dto(true, [{ id: "d1" }]);
  assert.equal(giuChiDuong(moi, null), moi);
  assert.deepEqual(giuChiDuong(dto(true, [{ id: "d1", diaChiChiDuong: "Mới" }]), cu).diem, [{ id: "d1", diaChiChiDuong: "Mới" }]);
});
