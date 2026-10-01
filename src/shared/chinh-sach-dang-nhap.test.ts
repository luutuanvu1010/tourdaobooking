// Luật thuần của chính sách đăng nhập (ADR-0085; đặc tả §2, §4.2, §5) — dùng chung máy chủ và giao diện.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANH_BAO_NHIEU_MAY_BEN_NGOAI, QUYEN_DAT_DUOC, canCanhBaoBenNgoai, docTapNhieuMayThamSo, isQuyenDatDuoc, kiemThayDoiChinhSach, moTaThayDoiChinhSach,
  tapNhieuMaySau, thayDoiChinhSach, type QuyenDatDuoc,
} from "./chinh-sach-dang-nhap.ts";
import { PERMISSION_CODES } from "./permissions.ts";

test("9 mã đặt được = mọi mã quyền trừ SUPER_ADMIN, đúng thứ tự PERMISSION_CODES", () => {
  assert.deepEqual([...QUYEN_DAT_DUOC], PERMISSION_CODES.filter((c) => c !== "SUPER_ADMIN"));
  assert.equal(isQuyenDatDuoc("SUPER_ADMIN"), false);
  assert.equal(isQuyenDatDuoc("BOSS"), false);
  assert.equal(isQuyenDatDuoc("PARTNER"), true);
});

test("kiemThayDoiChinhSach: nhận danh sách hợp lệ; từ chối SUPER_ADMIN, mã lạ, trùng mã, rỗng, multi không phải boolean, banDangXem sai kiểu", () => {
  const ok = kiemThayDoiChinhSach([{ permissionCode: "SALES", multi: true, banDangXem: null }, { permissionCode: "HR", multi: false, banDangXem: "abc" }]);
  assert.deepEqual(ok, { ok: true, value: [{ permissionCode: "SALES", multi: true, banDangXem: null }, { permissionCode: "HR", multi: false, banDangXem: "abc" }] });
  const sa = kiemThayDoiChinhSach([{ permissionCode: "SUPER_ADMIN", multi: false, banDangXem: null }]);
  assert.equal(sa.ok, false);
  assert.match((sa as { message: string }).message, /Toàn quyền luôn được nhiều máy/);
  for (const bad of [
    undefined, [], "SALES", [{ permissionCode: "BOSS", multi: true, banDangXem: null }],
    [{ permissionCode: "SALES", multi: true, banDangXem: null }, { permissionCode: "SALES", multi: false, banDangXem: null }],
    [{ permissionCode: "SALES", multi: 1, banDangXem: null }], [{ permissionCode: "SALES", multi: true, banDangXem: 5 }],
    [{ permissionCode: "SALES", multi: true, banDangXem: "x".repeat(65) }], [{ permissionCode: "SALES", multi: true }],
  ]) assert.equal(kiemThayDoiChinhSach(bad).ok, false, JSON.stringify(bad));
});

test("docTapNhieuMayThamSo: chuỗi rỗng = không quyền nào; danh sách phẩy; SUPER_ADMIN / mã lạ → lỗi; thiếu tham số → lỗi", () => {
  assert.deepEqual(docTapNhieuMayThamSo(""), { ok: true, value: [] });
  assert.deepEqual(docTapNhieuMayThamSo("HR,SALES"), { ok: true, value: ["SALES", "HR"] });
  assert.equal(docTapNhieuMayThamSo("SUPER_ADMIN").ok, false);
  assert.equal(docTapNhieuMayThamSo("SALES,BOSS").ok, false);
  assert.equal(docTapNhieuMayThamSo(null).ok, false);
});

test("tapNhieuMaySau: chính sách hiện hành + thay đổi → tập nhiều máy mới", () => {
  const rows = [{ permissionCode: "SALES" as const, multi: true }, { permissionCode: "HR" as const, multi: false }];
  assert.deepEqual(tapNhieuMaySau(rows, [{ permissionCode: "SALES", multi: false, banDangXem: "a" }, { permissionCode: "PARTNER", multi: true, banDangXem: null }]), ["PARTNER"]);
  assert.deepEqual(tapNhieuMaySau(rows, []), ["SALES"]);
});

test("thayDoiChinhSach: chỉ gửi quyền có lựa chọn KHÁC bản đang xem, kèm id bản đang xem", () => {
  const rows = QUYEN_DAT_DUOC.map((c) => ({ permissionCode: c, label: c, multi: c === "SALES", banId: c === "SALES" ? "ban-sales" : null }));
  const chon = new Map<QuyenDatDuoc, boolean>(QUYEN_DAT_DUOC.map((c) => [c, c === "PARTNER"]));
  assert.deepEqual(thayDoiChinhSach(rows, chon), [
    { permissionCode: "SALES", multi: false, banDangXem: "ban-sales" },
    { permissionCode: "PARTNER", multi: true, banDangXem: null },
  ]);
});

test("cảnh báo bên ngoài: chỉ khi Đối tác hoặc Tài xế đối tác chọn Nhiều máy; chữ đúng đặc tả §5", () => {
  assert.equal(canCanhBaoBenNgoai(new Map([["PARTNER", true]])), true);
  assert.equal(canCanhBaoBenNgoai(new Map([["DRIVER_PARTNER", true]])), true);
  assert.equal(canCanhBaoBenNgoai(new Map([["PARTNER", false], ["SALES", true]])), false);
  assert.equal(
    CANH_BAO_NHIEU_MAY_BEN_NGOAI,
    "Nhiều máy: nếu ai đó biết PIN, họ đăng nhập song song mà chủ tài khoản không bị đẩy ra để nhận biết. Quyền Đối tác gồm cả lữ hành, HDV độc lập, lễ tân, taxi, cộng tác viên — không chọn riêng được từng loại.",
  );
});

test("moTaThayDoiChinhSach: nhãn quyền tiếng Việt + số máy/số người; không mã thô", () => {
  const s = moTaThayDoiChinhSach([{ permissionCode: "SALES", multi: true, banDangXem: null }, { permissionCode: "PARTNER", multi: false, banDangXem: "x" }], { soPhien: 3, soNguoi: 2 });
  assert.equal(s, "Bán hàng → Nhiều máy; Đối tác → Một máy; đăng xuất 3 máy của 2 người");
  assert.doesNotMatch(s, /SALES|PARTNER|multi/);
});
