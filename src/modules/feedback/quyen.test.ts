import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";
import { NHOM_KY_THUAT_ID } from "../../shared/ve-ho-tro.ts";
import { choPhepNhomGui, quyenPhieu, type Membership } from "./quyen.ts";

const KE_TOAN = "fbk-team-ke-toan", NHAN_SU = "fbk-team-nhan-su";
const who = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const TV = (teamId: string, role: "LEAD" | "MEMBER" = "MEMBER"): Membership => ({ teamId, role });
const q = (w: ReturnType<typeof who>, m: Membership[], over: Partial<{ submitterId: string; ticketTeamId: string }> = {}) =>
  quyenPhieu({ who: w, submitterId: over.submitterId ?? "gui", ticketTeamId: over.ticketTeamId ?? KE_TOAN, memberships: m });

test("người ngoài nhóm và không phải người gửi: không đọc, không xử lý (mọi mã quyền trừ Toàn quyền)", () => {
  for (const p of PERMISSION_CODES.filter((p) => p !== "SUPER_ADMIN")) {
    const r = q(who("la", p), [TV(NHAN_SU, "LEAD")]); // là Trưởng nhóm của nhóm KHÁC
    assert.deepEqual(r, { doc: false, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" }, p);
  }
});

test("Quản trị (ADMIN) không có đường tắt vào yêu cầu nhóm nhạy cảm", () => {
  assert.equal(q(who("qt", "ADMIN"), []).doc, false);
});

test("người gửi: đọc được phiếu của mình, không xử lý, không thấy ghi chú nội bộ", () => {
  const r = q(who("gui", "SALES"), [], { submitterId: "gui" });
  assert.deepEqual(r, { doc: true, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" });
});

test("người gửi đồng thời là thành viên nhóm nhận: vẫn chỉ là người gửi (R2)", () => {
  const r = q(who("gui", "ACCOUNTING"), [TV(KE_TOAN, "LEAD")], { submitterId: "gui" });
  assert.deepEqual(r, { doc: true, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" });
});

test("R6: tài khoản có mã quyền bên ngoài (kể cả tài khoản lai) KHÔNG có tư cách thành viên nhóm, dù dữ liệu có dòng thành viên", () => {
  const ngoai: PermissionCode[][] = [["PARTNER"], ["DRIVER_PARTNER"], ["SALES", "PARTNER"]];
  for (const p of ngoai) {
    for (const role of ["LEAD", "MEMBER"] as const) {
      const r = q(who("ngoai", ...p), [TV(KE_TOAN, role)]);
      assert.deepEqual(r, { doc: false, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" }, `${p.join("+")} ${role}`);
    }
  }
  // Phiếu của chính mình: vẫn đọc được với tư cách người gửi (feedback.view own), không hơn.
  assert.deepEqual(q(who("ngoai", "PARTNER"), [TV(KE_TOAN, "LEAD")], { submitterId: "ngoai" }), { doc: true, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" });
});

test("thành viên nhóm giữ phiếu: đọc, xử lý, thấy ghi chú của nhóm; không giao người khác, không chuyển nhóm", () => {
  const r = q(who("tv", "ACCOUNTING"), [TV(KE_TOAN, "MEMBER")]);
  assert.deepEqual(r, { doc: true, xuLy: true, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "team" });
});

test("Trưởng nhóm: thêm giao việc và chuyển nhóm; thành viên nhóm khác thì không", () => {
  const r = q(who("tn", "ACCOUNTING"), [TV(KE_TOAN, "LEAD")]);
  assert.equal(r.giaoViecChoNguoiKhac, true);
  assert.equal(r.chuyenNhom, true);
  assert.equal(q(who("tn", "ACCOUNTING"), [TV(NHAN_SU, "LEAD")]).chuyenNhom, false);
});

test("Toàn quyền: mọi quyền, thấy ghi chú nội bộ của mọi nhóm, kể cả phiếu mình gửi", () => {
  for (const submitterId of ["gui", "sa"]) {
    const r = q(who("sa", "SUPER_ADMIN"), [], { submitterId });
    assert.deepEqual(r, { doc: true, xuLy: true, giaoViecChoNguoiKhac: true, chuyenNhom: true, noiBo: "all" });
  }
});

test("tư cách thành viên chỉ tính cho ĐÚNG nhóm giữ phiếu (sau chuyển nhóm, Trưởng nhóm cũ mất quyền)", () => {
  const truoc = q(who("tn", "ACCOUNTING"), [TV(KE_TOAN, "LEAD")], { ticketTeamId: KE_TOAN });
  const sau = q(who("tn", "ACCOUNTING"), [TV(KE_TOAN, "LEAD")], { ticketTeamId: NHAN_SU });
  assert.equal(truoc.xuLy, true);
  assert.deepEqual(sau, { doc: false, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" });
});

test("bên ngoài chỉ được gửi tới nhóm Kỹ thuật; nội bộ gửi nhóm nào cũng được", () => {
  for (const p of ["PARTNER", "DRIVER_PARTNER"] as const) {
    assert.equal(choPhepNhomGui(who("x", p), NHOM_KY_THUAT_ID), true, p);
    assert.equal(choPhepNhomGui(who("x", p), KE_TOAN), false, p);
  }
  assert.equal(choPhepNhomGui(who("x", "SALES"), KE_TOAN), true);
  assert.equal(choPhepNhomGui(who("x", "SALES", "PARTNER"), KE_TOAN), false, "tài khoản lai có mã bên ngoài vẫn bị giới hạn");
});
