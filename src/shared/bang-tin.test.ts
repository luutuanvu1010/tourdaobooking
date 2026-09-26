// Bài kiểm hàm thuần của Bảng tin (ADR-0022). Task 1: nhãn kết nối/sự kiện + NT-3 (đối chiếu MATRIX, không chép tay).
// Task 2: hàm thuần phía trình duyệt (chờ nối lại, quyết định thông báo nổi TD-4, kiểm tin hợp lệ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX, PERMISSION_CODES, can, type PermissionCode } from "./permissions.ts";
import {
  THAY_DOI,
  choNoiLai,
  laSuKienHopLe,
  nhanKetNoi,
  nhanSuKien,
  thayDoiCuaHandler,
  thongBaoNoi,
  type SuKienDon,
  type TrangThaiPhuTrach,
} from "./bang-tin.ts";

test("THAY_DOI đúng 9 giá trị (điều 4 + điều 7 ADR-0022)", () => {
  assert.deepEqual([...THAY_DOI], ["tao", "tao_cho_nhan", "nhan", "giao", "xac_nhan", "huy", "sua", "chuyen", "tien"]);
});

// 128 tập con của 7 mã quyền — suy kỳ vọng từ MATRIX/can(), không chép tay (P16: bài kiểm không được tự khoá giá trị đọc nhầm là luật).
function moiTapCon<T>(mang: readonly T[]): T[][] {
  if (mang.length === 0) return [[]];
  const [dau, ...con] = mang;
  const conCacTap = moiTapCon(con);
  return [...conCacTap, ...conCacTap.map((t) => [dau as T, ...t])];
}

test("nhanKetNoi: mọi tập con quyền (128) khớp can(order.view)/can(dispatch.claim) suy từ MATRIX", () => {
  const tapCon = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  assert.equal(tapCon.length, 128);
  for (const permissions of tapCon) {
    const staff = { id: "nv1", permissions };
    const ky_vong = new Set<string>(["nguoi:nv1"]);
    if (can(staff, "order.view")) ky_vong.add("tat-ca");
    if (can(staff, "dispatch.claim")) ky_vong.add("cho-nhan");
    assert.deepEqual(nhanKetNoi(staff), [...ky_vong].sort(), `permissions=${JSON.stringify(permissions)}`);
  }
});

test("nhanKetNoi: bảng ảnh chụp hôm nay theo từng quyền đơn lẻ", () => {
  const nhomDayDu = ["cho-nhan", "nguoi:x", "tat-ca"];
  const nhomTatCa = ["nguoi:x", "tat-ca"];
  const chiNguoi = ["nguoi:x"];
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["SALES"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["ADMIN"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["SUPER_ADMIN"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["ACCOUNTING"] }), nhomTatCa);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["FIELD"] }), chiNguoi);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER"] }), chiNguoi);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["INTERN"] }), chiNguoi);
});

test("NT-3: mọi mã quyền có dispatch.claim khác none đều có order.view = any (hôm nay nhãn cho-nhan không thêm người nhận nào ngoài tat-ca)", () => {
  for (const p of PERMISSION_CODES) {
    if (MATRIX["dispatch.claim"][p] !== "none") {
      assert.equal(
        MATRIX["order.view"][p],
        "any",
        "Nhãn cho-nhan nay thêm người nhận ngoài order.view — quyết định (5)/GĐ2 Phần D: hỏi chủ trước khi sửa bài kiểm này",
      );
    }
  }
});

test("nhanSuKien: luôn có tat-ca + nguoi:owner; thêm nguoi:handler khi có tài khoản; cho-nhan khi và chỉ khi sau thay đổi không còn ai phụ trách", () => {
  const chuaAi: TrangThaiPhuTrach = { coNguoi: false, staffId: null };
  const coTaiKhoan = (id: string): TrangThaiPhuTrach => ({ coNguoi: true, staffId: id });
  const khongTaiKhoan: TrangThaiPhuTrach = { coNguoi: true, staffId: null };

  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: chuaAi, handlerSau: chuaAi }),
    ["cho-nhan", "nguoi:chu", "tat-ca"],
    "đơn mới chưa ai phụ trách",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: chuaAi, handlerSau: coTaiKhoan("nv2") }),
    ["nguoi:chu", "nguoi:nv2", "tat-ca"],
    "vừa có người nhận (có tài khoản) — không cho-nhan",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: coTaiKhoan("nv2"), handlerSau: coTaiKhoan("nv3") }),
    ["nguoi:chu", "nguoi:nv2", "nguoi:nv3", "tat-ca"],
    "đổi người phụ trách",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: coTaiKhoan("nv2"), handlerSau: chuaAi }),
    ["cho-nhan", "nguoi:chu", "nguoi:nv2", "tat-ca"],
    "huỷ phụ trách — lại chưa ai",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: chuaAi, handlerSau: khongTaiKhoan }),
    ["nguoi:chu", "tat-ca"],
    "người phụ trách là hồ sơ KHÔNG tài khoản: đơn có người (không cho-nhan) nhưng không có nhãn nguoi: cho người đó",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: chuaAi, handlerSau: coTaiKhoan("chu") }),
    ["nguoi:chu", "tat-ca"],
    "owner = handler → một nhãn, không trùng lặp",
  );
});

test("thayDoiCuaHandler: nhan khi tự đặt mình vào đơn chưa có người, còn lại giao", () => {
  const chuaAi: TrangThaiPhuTrach = { coNguoi: false, staffId: null };
  const coTaiKhoan = (id: string): TrangThaiPhuTrach => ({ coNguoi: true, staffId: id });
  assert.equal(thayDoiCuaHandler({ nguoiGoi: "nv2", handlerTruoc: chuaAi, handlerSau: coTaiKhoan("nv2") }), "nhan");
  assert.equal(thayDoiCuaHandler({ nguoiGoi: "nv2", handlerTruoc: coTaiKhoan("nv1"), handlerSau: coTaiKhoan("nv2") }), "giao");
  assert.equal(thayDoiCuaHandler({ nguoiGoi: "quantri", handlerTruoc: chuaAi, handlerSau: coTaiKhoan("nv2") }), "giao");
  assert.equal(thayDoiCuaHandler({ nguoiGoi: "nv2", handlerTruoc: coTaiKhoan("nv2"), handlerSau: coTaiKhoan("nv3") }), "giao");
});

test("choNoiLai: lần 0 nằm trong [1000, 2000), ngauNhien=0 cho dãy tăng gấp đôi tới trần 30000", () => {
  assert.equal(choNoiLai(0, 0), 1000);
  assert.ok(choNoiLai(0, 0.999999) < 2000, "lần 0, ngauNhien gần 1 vẫn dưới 2000");
  assert.ok(choNoiLai(0, 0.999999) >= 1000);
  assert.equal(choNoiLai(1, 0), 2000, "gấp đôi lần 0");
  assert.equal(choNoiLai(2, 0), 4000, "gấp đôi lần 1");
  assert.equal(choNoiLai(3, 0), 8000);
  assert.equal(choNoiLai(4, 0), 16000);
  assert.equal(choNoiLai(5, 0), 30000, "chạm trần (1000*2^5=32000 > 30000)");
  assert.equal(choNoiLai(10, 0), 30000, "vẫn ở trần, không tăng thêm");
});

test("choNoiLai: đã tới trần chỉ cộng thêm tối đa 20%, không bao giờ vượt 36000", () => {
  assert.equal(choNoiLai(5, 1), 36000, "ngauNhien=1 (biên trên lý thuyết) đúng bằng trần cộng 20%");
  assert.ok(choNoiLai(5, 0.999) < 36000);
  assert.ok(choNoiLai(20, 0.5) <= 36000);
  assert.ok(choNoiLai(20, 0.5) >= 30000);
});

// Cố định thời điểm/mã đơn cho mọi bài `thongBaoNoi`.
const suKien = (thayDoi: SuKienDon["thayDoi"]): SuKienDon => ({
  loai: "don",
  orderId: "order1",
  maDon: "TD1",
  thayDoi,
  luc: "2026-09-26T00:00:00.000Z",
});
const vanPhong = { id: "nv1", permissions: ["SALES"] as const }; // order.view=any, dispatch.claim=any
const ketToan = { id: "nv2", permissions: ["ACCOUNTING"] as const }; // order.view=any, dispatch.claim=none
const huongDanVien = { id: "nv3", permissions: ["FIELD"] as const }; // order.view=none, dispatch.claim=none, có FIELD
const doiTac = { id: "nv4", permissions: ["PARTNER"] as const };
const thucTap = { id: "nv5", permissions: ["INTERN"] as const };

test("thongBaoNoi: văn phòng thấy đủ 5 loại có thông báo nổi (TD-4), câu đúng chữ, liên kết /order?id=", () => {
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("tao_cho_nhan")), {
    cau: "Có đơn mới chưa có người phụ trách: TD1",
    lienKet: "/order?id=order1",
  });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("giao")), { cau: "Đơn TD1 vừa đổi người phụ trách", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("xac_nhan")), { cau: "Đơn TD1 đã được xác nhận", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("huy")), { cau: "Đơn TD1 đã bị huỷ", lienKet: "/order?id=order1" });
});

test("thongBaoNoi: tao/sua/chuyen/tien không hiện thông báo nổi (chỉ làm mới màn hình)", () => {
  assert.equal(thongBaoNoi(vanPhong, suKien("tao")), null);
  assert.equal(thongBaoNoi(vanPhong, suKien("sua")), null);
  assert.equal(thongBaoNoi(vanPhong, suKien("chuyen")), null);
  assert.equal(thongBaoNoi(vanPhong, suKien("tien")), null);
});

test("thongBaoNoi: tao_cho_nhan chỉ hiện cho ai có dispatch.claim (Kế toán không có → null)", () => {
  assert.equal(thongBaoNoi(ketToan, suKien("tao_cho_nhan")), null);
  assert.deepEqual(thongBaoNoi(ketToan, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/order?id=order1" });
});

test("thongBaoNoi: Hướng dẫn viên (không văn phòng) thấy các loại còn lại, liên kết /account", () => {
  assert.deepEqual(thongBaoNoi(huongDanVien, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/account" });
  assert.deepEqual(thongBaoNoi(huongDanVien, suKien("giao")), { cau: "Đơn TD1 vừa đổi người phụ trách", lienKet: "/account" });
  assert.equal(thongBaoNoi(huongDanVien, suKien("tao_cho_nhan")), null, "FIELD không có dispatch.claim hôm nay");
});

test("thongBaoNoi: Đối tác/Thực tập KHÔNG BAO GIỜ hiện thông báo nổi (Q-C ADR-0022)", () => {
  for (const thayDoi of THAY_DOI) {
    assert.equal(thongBaoNoi(doiTac, suKien(thayDoi)), null, `Đối tác × ${thayDoi}`);
    assert.equal(thongBaoNoi(thucTap, suKien(thayDoi)), null, `Thực tập × ${thayDoi}`);
  }
});

test("thongBaoNoi: không câu nào lộ mã thô ra người dùng", () => {
  for (const thayDoi of THAY_DOI) {
    const kq = thongBaoNoi(vanPhong, suKien(thayDoi));
    if (kq === null) continue;
    for (const maThoRaw of THAY_DOI) assert.ok(!kq.cau.includes(maThoRaw), `câu "${kq.cau}" lộ mã "${maThoRaw}"`);
    assert.ok(!kq.cau.includes("FIELD") && !kq.cau.includes("PARTNER"), `câu "${kq.cau}" lộ mã quyền`);
  }
});

test("laSuKienHopLe: đúng 5 khoá của điều 4, thayDoi thuộc THAY_DOI → true", () => {
  assert.equal(laSuKienHopLe(suKien("nhan")), true);
  for (const thayDoi of THAY_DOI) assert.equal(laSuKienHopLe(suKien(thayDoi)), true, thayDoi);
});

test("laSuKienHopLe: khoá thừa, khoá thiếu, thayDoi lạ, kiểu sai, không phải object → false", () => {
  const hopLe = suKien("nhan");
  assert.equal(laSuKienHopLe({ ...hopLe, thua: 1 }), false, "khoá thừa");
  const { luc, ...thieuLuc } = hopLe;
  assert.equal(laSuKienHopLe(thieuLuc), false, "thiếu khoá luc");
  assert.equal(laSuKienHopLe({ ...hopLe, thayDoi: "khong_ton_tai" }), false, "thayDoi lạ");
  assert.equal(laSuKienHopLe({ ...hopLe, loai: "khac" }), false, "loai sai");
  assert.equal(laSuKienHopLe({ ...hopLe, orderId: 1 }), false, "orderId sai kiểu");
  assert.equal(laSuKienHopLe(null), false);
  assert.equal(laSuKienHopLe("chuoi"), false);
  assert.equal(laSuKienHopLe(42), false);
  assert.equal(laSuKienHopLe([hopLe]), false, "mảng không phải sự kiện");
});
