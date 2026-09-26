// Bài kiểm hàm thuần của Bảng tin (ADR-0022). Task 1: nhãn kết nối/sự kiện + NT-3 (đối chiếu MATRIX, không chép tay).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX, PERMISSION_CODES, can, type PermissionCode } from "./permissions.ts";
import { THAY_DOI, nhanKetNoi, nhanSuKien, thayDoiCuaHandler, type TrangThaiPhuTrach } from "./bang-tin.ts";

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
