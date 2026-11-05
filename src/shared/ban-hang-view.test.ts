import { test } from "node:test";
import assert from "node:assert/strict";
import { banHangDaLuu, banHangFailure, banHangTrang } from "./ban-hang-view.ts";
import { dongBanHangDanhSach } from "./ban-hang-dong.ts";
import type { BanHangDonDto } from "./contracts.ts";
import type { PermissionCode } from "./permissions.ts";

const nv = (id: string, ...permissions: PermissionCode[]) => ({ id, permissions });
const dto = (rieng: Partial<BanHangDonDto> = {}): BanHangDonDto => ({ banHang: null, loiMoi: null, laBanHangPhuTrach: false, ...rieng });
const xacNhan = { status: "confirmed" as const, daGiao: false, dangChoQuyet: false, quyetDinhDuoc: false, banHangMoi: null };

test("đã có người phụ trách: dòng tên; Quản trị và Toàn quyền có nút Đổi (đơn đã xác nhận), Bán hàng thì không", () => {
  const d = dto({ banHang: { staffId: "b1", name: "Lan" } });
  assert.deepEqual(banHangTrang(nv("a", "ADMIN"), d, xacNhan), { dong: { kieu: "ten", text: "Lan" }, nhan: false, tuChoi: false, doi: true, doiNhan: "Đổi người phụ trách" });
  assert.equal(banHangTrang(nv("b", "SALES"), d, xacNhan)?.doi, false);
  assert.equal(banHangTrang(nv("a", "ADMIN"), d, { ...xacNhan, daGiao: true })?.doi, false);
  assert.equal(banHangTrang(nv("a", "ADMIN"), d, { ...xacNhan, status: "cancelled" })?.doi, false);
});

test("chưa có ai, không lời mời: chip «Chờ Bán hàng nhận»; Bán hàng nhận được, Đối tác thì không", () => {
  const t = banHangTrang(nv("b", "SALES"), dto(), xacNhan)!;
  assert.deepEqual([t.dong, t.nhan, t.tuChoi, t.doi], [{ kieu: "cho", text: "Chờ Bán hàng nhận" }, true, false, false]);
  const dt = banHangTrang(nv("p", "PARTNER"), dto(), xacNhan)!;
  assert.deepEqual([dt.nhan, dt.tuChoi, dt.doi], [false, false, false]);
});

test("đang mời X: X thấy Nhận + Từ chối; Bán hàng khác không có Nhận trong thời gian ưu tiên; Quản trị vẫn nhận được", () => {
  const d = dto({ loiMoi: { staffId: "x", name: "Mai", conPhut: 25 } });
  const x = banHangTrang(nv("x", "SALES"), d, xacNhan)!;
  assert.deepEqual([x.dong, x.nhan, x.tuChoi], [{ kieu: "moi", text: "Đang mời Mai · còn 25 phút" }, true, true]);
  const khac = banHangTrang(nv("k", "SALES"), d, xacNhan)!;
  assert.deepEqual([khac.nhan, khac.tuChoi], [false, false]);
  const qt = banHangTrang(nv("q", "ADMIN"), d, xacNhan)!;
  assert.deepEqual([qt.nhan, qt.tuChoi, qt.doi], [true, false, true]);
});

test("đơn chờ xác nhận: Nhận chỉ hiện cho người quyết định được (mở bảng Còn vé / Hết vé); không có bảng thì không nút; Đổi ẩn", () => {
  const cho = { ...xacNhan, status: "draft" as const, dangChoQuyet: true };
  assert.equal(banHangTrang(nv("b", "SALES"), dto(), { ...cho, quyetDinhDuoc: true })?.nhan, true);
  assert.equal(banHangTrang(nv("b", "SALES"), dto(), cho)?.nhan, false);
  assert.equal(banHangTrang(nv("q", "ADMIN"), dto(), { ...cho, quyetDinhDuoc: true })?.doi, false);
  assert.equal(banHangTrang(nv("b", "SALES"), dto(), cho)?.dong.kieu, "cho");
});

test("đơn nháp chưa gửi: không khối, trừ khi người lập đã mời ai đó (dòng «Đang mời <tên>», không nút)", () => {
  const nhap = { ...xacNhan, status: "draft" as const };
  assert.equal(banHangTrang(nv("b", "SALES"), dto(), nhap), null);
  const t = banHangTrang(nv("b", "SALES"), dto(), { ...nhap, banHangMoi: { staffId: "x", name: "Mai" } })!;
  assert.deepEqual([t.dong, t.nhan, t.tuChoi, t.doi], [{ kieu: "moi", text: "Đang mời Mai" }, false, false, false]);
});

test("tài khoản lai có quyền Đối tác không nhận, không đổi; chưa tải được (undefined) thì không khối", () => {
  assert.equal(banHangTrang(nv("l", "SALES", "PARTNER"), dto(), xacNhan)?.nhan, false);
  assert.equal(banHangTrang(nv("b", "SALES"), undefined, xacNhan), null);
});

test("dòng ở danh sách đơn: «Phụ trách: <tên>», chip chờ, hoặc «Đang mời <X> · còn N phút»", () => {
  assert.equal(dongBanHangDanhSach(dto({ banHang: { name: "Lan" } })), "Phụ trách: Lan");
  assert.equal(dongBanHangDanhSach(dto({ loiMoi: { staffId: "x", name: "Mai", conPhut: 5 } })), "Đang mời Mai · còn 5 phút");
  assert.equal(dongBanHangDanhSach(dto()), "Chờ Bán hàng nhận");
});

test("banHangFailure: 409 stale / no_change / khong_co_loi_moi và 403 tải lại bằng chữ riêng; 409 khác giữ câu máy chủ; 400 không tải lại; không lộ mã thô", () => {
  assert.deepEqual([banHangFailure({ status: 409, code: "stale", message: "x" }, "nhan").reload, banHangFailure({ status: 409, code: "stale", message: "x" }, "nhan").banner.title], [true, "Đơn này vừa có người khác nhận phụ trách. Đã tải lại đơn."]);
  assert.match(banHangFailure({ status: 409, code: "stale", message: "x" }, "doi").banner.title, /^Người phụ trách của đơn vừa được đổi ở nơi khác\./);
  assert.equal(banHangFailure({ status: 409, code: "khong_co_loi_moi", message: "x" }, "tu-choi").banner.title, "Lời mời không còn nữa. Đã tải lại đơn.");
  assert.equal(banHangFailure({ status: 409, code: "dang_cho_nguoi_khac", message: "Đơn đang chờ Mai trả lời, còn 10 phút." }, "nhan").banner.title, "Đơn đang chờ Mai trả lời, còn 10 phút.");
  assert.equal(banHangFailure({ status: 403, code: "forbidden", message: "x" }, "doi").reload, true);
  assert.deepEqual([banHangFailure({ status: 400, code: "invalid_assignee", message: "Chọn người khác." }, "doi").reload, banHangFailure({ status: 400, code: "invalid_assignee", message: "Chọn người khác." }, "doi").banner.title], [false, "Chọn người khác."]);
  assert.equal(banHangFailure(null, "doi").banner.title, "Không kết nối được máy chủ.");
  for (const c of [{ status: 409, code: "stale", message: "" }, { status: 403, code: "forbidden", message: "" }, { status: 409, code: "no_change", message: "" }, { status: 500, code: "internal", message: "" }]) for (const k of ["nhan", "tu-choi", "doi"] as const) {
    const b = banHangFailure(c, k).banner;
    assert.doesNotMatch(b.title, /stale|forbidden|no_change|internal|khong_co/i);
  }
});

test("banHangDaLuu: câu báo sau khi nhận, từ chối, đổi", () => {
  assert.equal(banHangDaLuu("nhan", ""), "Bạn đã nhận phụ trách đơn này.");
  assert.equal(banHangDaLuu("tu-choi", ""), "Đã từ chối. Đơn chuyển sang Chờ Bán hàng nhận.");
  assert.equal(banHangDaLuu("doi", "Lan"), "Đã đổi người phụ trách sang Lan.");
});
