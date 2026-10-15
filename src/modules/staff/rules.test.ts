import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KHONG_NHAN_VAI_NOI_BO, canManageAccount, checkAccountChange, coQuyenNoiBo, generatePin, isWeakPin, mfaGraceOnCreate, mfaGraceOnReactivate, mfaKhiThanhNoiBo, moNoiBoChoHoSoCoNhanProblem, partyAccountVerdict, validateFreshPin,
} from "./rules.ts";

test("ADR-0074 điều 1: tạo tài khoản nội bộ → hạn ân hạn lúc tạo + 14 ngày; chỉ quyền bên ngoài → null", () => {
  const t = Date.parse("2026-10-16T01:02:03.004Z");
  assert.equal(mfaGraceOnCreate(["SALES"], t), "2026-10-30T01:02:03.004Z");
  assert.equal(mfaGraceOnCreate(["HR"], t), "2026-10-30T01:02:03.004Z");
  assert.equal(mfaGraceOnCreate(["PARTNER", "SALES"], t), "2026-10-30T01:02:03.004Z");
  assert.equal(mfaGraceOnCreate(["PARTNER"], t), null);
  assert.equal(mfaGraceOnCreate(["DRIVER_PARTNER"], t), null);
});

test("ADR-0074 điều 1 (bổ sung; vòng sửa 1 Task 6): bên ngoài → nội bộ, chưa có yếu tố — hạn NULL → lúc đổi + 14 ngày; hạn đã qua → giữ nguyên và kết thúc mọi phiên; hạn còn → không làm gì", () => {
  const t = Date.parse("2026-10-16T01:02:03.004Z");
  const MOI = "2026-10-30T01:02:03.004Z";
  const QUA = "2026-10-01T00:00:00.000Z";
  const CON = "2026-10-20T00:00:00.000Z";
  const khong = { anHan: null, ketThucPhien: false };
  assert.deepEqual(mfaKhiThanhNoiBo(["PARTNER"], ["SALES"], false, null, t), { anHan: MOI, ketThucPhien: false });
  assert.deepEqual(mfaKhiThanhNoiBo(["DRIVER_PARTNER"], ["DRIVER"], false, null, t), { anHan: MOI, ketThucPhien: false });
  assert.deepEqual(mfaKhiThanhNoiBo(["PARTNER"], ["SALES"], false, QUA, t), { anHan: null, ketThucPhien: true }, "hạn đã qua: không gia hạn, phiên bên ngoài phải chết");
  assert.deepEqual(mfaKhiThanhNoiBo(["PARTNER"], ["SALES"], false, "2026-10-16T01:02:03.004Z", t), { anHan: null, ketThucPhien: true }, "hạn đúng bằng lúc đổi = đã qua");
  assert.deepEqual(mfaKhiThanhNoiBo(["PARTNER"], ["SALES"], false, CON, t), khong, "hạn còn: giữ, phiên sống");
  assert.deepEqual(mfaKhiThanhNoiBo(["PARTNER"], ["SALES"], true, QUA, t), khong, "đã có yếu tố sống");
  assert.deepEqual(mfaKhiThanhNoiBo(["SALES"], ["SALES", "FIELD"], false, QUA, t), khong, "đã nội bộ từ trước");
  assert.deepEqual(mfaKhiThanhNoiBo(["PARTNER"], ["PARTNER"], false, QUA, t), khong, "vẫn bên ngoài");
  // Lô đổi quyền có câu chốt (gỡ ADMIN) chỉ xảy ra khi TRƯỚC đã nội bộ ⇒ không bao giờ có câu ân hạn / kết thúc phiên: route chỉ nối vào lô không chốt.
  assert.deepEqual(mfaKhiThanhNoiBo(["ADMIN"], ["SALES"], false, QUA, t), khong);
  assert.deepEqual(mfaKhiThanhNoiBo([], ["SALES"], false, null, t), { anHan: MOI, ketThucPhien: false }, "không quyền nào (không nội bộ) → nội bộ");
});

test("ADR-0074 điều 1 (Task 6): kích hoạt lại tài khoản nội bộ chưa có yếu tố → lúc kích hoạt + 14 ngày; bên ngoài / có yếu tố → null", () => {
  const t = Date.parse("2026-10-16T01:02:03.004Z");
  assert.equal(mfaGraceOnReactivate(["SALES"], false, t), "2026-10-30T01:02:03.004Z");
  assert.equal(mfaGraceOnReactivate(["SALES"], true, t), null);
  assert.equal(mfaGraceOnReactivate(["PARTNER"], false, t), null);
});

const admin = { id: "a1", permissions: ["ADMIN"] as const, active: true };
const sales = { id: "s1", permissions: ["SALES"] as const, active: true };
const both = { id: "b1", permissions: ["SALES", "ADMIN"] as const, active: true };

test("không tự ngưng hoặc tự đổi quyền của chính mình", () => {
  assert.match(checkAccountChange("a1", admin, { active: false }, 2)!, /tự ngưng/);
  assert.match(checkAccountChange("a1", admin, { permissions: ["SALES"] }, 2)!, /tự ngưng/);
  assert.match(checkAccountChange("a1", admin, { permissions: ["ADMIN", "ACCOUNTING"] }, 2)!, /tự ngưng/, "thêm quyền cho mình cũng bị chặn");
  assert.equal(checkAccountChange("a1", admin, { permissions: ["ADMIN"] }, 2), null, "không thay đổi gì");
  assert.equal(checkAccountChange("a1", both, { permissions: ["ADMIN", "SALES"] }, 2), null, "cùng tập quyền, khác thứ tự = không đổi");
});

test("không để hết admin đang hoạt động", () => {
  assert.match(checkAccountChange("x", admin, { active: false }, 1)!, /ít nhất một quản trị viên/);
  assert.match(checkAccountChange("x", admin, { permissions: ["SALES"] }, 1)!, /ít nhất một quản trị viên/);
  assert.match(checkAccountChange("x", both, { permissions: ["SALES"] }, 1)!, /ít nhất một quản trị viên/, "bỏ ADMIN nhưng giữ SALES vẫn là mất admin");
  assert.equal(checkAccountChange("x", both, { permissions: ["ADMIN"] }, 1), null, "bỏ SALES, còn ADMIN thì không mất admin");
  assert.equal(checkAccountChange("x", admin, { active: false }, 2), null);
});

test("sửa nhân viên thường luôn được (không phải admin cuối)", () => {
  assert.equal(checkAccountChange("a1", sales, { active: false }, 1), null);
  assert.equal(checkAccountChange("a1", sales, { permissions: ["SALES", "ADMIN"] }, 1), null);
  assert.equal(checkAccountChange("a1", { id: "z", permissions: ["ADMIN"] as const, active: false }, { active: true }, 1), null, "admin đã ngưng không tính là mất admin");
});

test("canManageAccount (ADR-0014 điều 8): ADMIN quản lý được cấp dưới, không quản lý được ADMIN/SUPER_ADMIN khác; SUPER_ADMIN quản lý được mọi tài khoản", () => {
  assert.equal(canManageAccount(["ADMIN"], ["SALES"]), true);
  assert.equal(canManageAccount(["ADMIN"], ["PARTNER"]), true);
  assert.equal(canManageAccount(["ADMIN"], []), true);
  assert.equal(canManageAccount(["ADMIN"], ["ADMIN"]), false);
  assert.equal(canManageAccount(["ADMIN"], ["SUPER_ADMIN"]), false);
  assert.equal(canManageAccount(["ADMIN"], ["SUPER_ADMIN", "ADMIN"]), false);
  assert.equal(canManageAccount(["SUPER_ADMIN"], ["ADMIN"]), true);
  assert.equal(canManageAccount(["SUPER_ADMIN"], ["SUPER_ADMIN"]), true);
  assert.equal(canManageAccount(["SUPER_ADMIN", "ADMIN"], ["ADMIN"]), true, "giữ cả hai quyền vẫn quản lý được nhờ SUPER_ADMIN");
  assert.equal(canManageAccount(["SALES"], ["SALES"]), false, "không giữ ADMIN/SUPER_ADMIN thì không quản lý ai");
});

test("PIN yếu bị loại; PIN sinh ra luôn 6 số và không yếu", () => {
  for (const w of ["000000", "111111", "123456", "654321", "234567", "890123"]) assert.ok(isWeakPin(w), w);
  for (const ok of ["135790", "482915", "100200"]) assert.ok(!isWeakPin(ok), ok);
  for (let i = 0; i < 2000; i++) {
    const p = generatePin();
    assert.match(p, /^\d{6}$/);
    assert.ok(!isWeakPin(p));
  }
  // random giả trả PIN yếu trước rồi PIN tốt → phải bỏ qua PIN yếu
  const seq = [111111, 123456, 482915];
  assert.equal(generatePin(() => seq.shift()!), "482915");
});

test("validateFreshPin (đặt PIN mới không cần PIN cũ, đăng nhập bằng Face ID)", () => {
  assert.match(validateFreshPin("12345")!, /đúng 6 chữ số/);
  assert.match(validateFreshPin("123456")!, /dễ đoán/);
  assert.equal(validateFreshPin("583920"), null);
});

test("ADR-0013 điều 2/4: partyAccountVerdict — hồ sơ không gắn tài khoản; tự mình; cấp dưới; cùng cấp/cấp trên", () => {
  const admin = { id: "a1", permissions: ["ADMIN"] as const };
  const superAdmin = { id: "s1", permissions: ["SUPER_ADMIN"] as const };
  const sales = { id: "x1", permissions: ["SALES"] as const };
  assert.deepEqual(partyAccountVerdict(sales, null), { linked: false });
  assert.deepEqual(partyAccountVerdict(admin, { id: "a1", permissions: ["ADMIN"] }), { linked: true, manageable: true }, "tự sửa hồ sơ của chính mình");
  assert.deepEqual(partyAccountVerdict(admin, { id: "x2", permissions: ["SALES"] }), { linked: true, manageable: true });
  assert.deepEqual(partyAccountVerdict(admin, { id: "p1", permissions: ["PARTNER"] }), { linked: true, manageable: true });
  assert.deepEqual(partyAccountVerdict(admin, { id: "a2", permissions: ["ADMIN"] }), { linked: true, manageable: false }, "Admin khác");
  assert.deepEqual(partyAccountVerdict(admin, { id: "s1", permissions: ["SUPER_ADMIN"] }), { linked: true, manageable: false });
  assert.deepEqual(partyAccountVerdict(admin, { id: "m1", permissions: ["SALES", "ADMIN"] }), { linked: true, manageable: false }, "giữ ADMIN kèm quyền khác vẫn là cùng cấp");
  assert.deepEqual(partyAccountVerdict(superAdmin, { id: "a2", permissions: ["ADMIN"] }), { linked: true, manageable: true });
  assert.deepEqual(partyAccountVerdict(sales, { id: "x2", permissions: ["SALES"] }), { linked: true, manageable: false }, "SALES không quản tài khoản nào");
  assert.deepEqual(partyAccountVerdict(sales, { id: "x1", permissions: ["SALES"] }), { linked: true, manageable: true }, "tự mình: manageable, nhưng ô party.staff.write của SALES = none vẫn chặn ở route");
});

// ADR-0117 lần 1, điều 4 — vế 3 của luật «nội bộ»: tài khoản mang ít nhất một quyền KHÔNG thuộc nhóm bên ngoài (EXTERNAL_PERMISSIONS).
test("ADR-0117: coQuyenNoiBo — chỉ quyền bên ngoài (Đối tác, Tài xế đối tác) thì không; có một quyền nội bộ là có", () => {
  assert.equal(coQuyenNoiBo(["PARTNER"]), false);
  assert.equal(coQuyenNoiBo(["PARTNER", "DRIVER_PARTNER"]), false);
  assert.equal(coQuyenNoiBo(["DRIVER_PARTNER"]), false);
  assert.equal(coQuyenNoiBo([]), false);
  assert.equal(coQuyenNoiBo(["SALES"]), true);
  assert.equal(coQuyenNoiBo(["PARTNER", "HR"]), true);
  assert.equal(coQuyenNoiBo(["SUPER_ADMIN"]), true);
});

test("ADR-0117: moNoiBoChoHoSoCoNhanProblem — hồ sơ mang nhãn không nhận vai nội bộ / quyền nội bộ; câu KHÔNG nêu tên loại", () => {
  assert.equal(moNoiBoChoHoSoCoNhanProblem({ nhanDoiTac: true, vaiTiep: ["SALES_STAFF"], quyenTiep: ["SALES"] }), KHONG_NHAN_VAI_NOI_BO);
  assert.equal(moNoiBoChoHoSoCoNhanProblem({ nhanDoiTac: true, vaiTiep: ["SALES_STAFF"], quyenTiep: [] }), KHONG_NHAN_VAI_NOI_BO, "vai INTERNAL tự nó đủ");
  assert.equal(moNoiBoChoHoSoCoNhanProblem({ nhanDoiTac: true, vaiTiep: [], quyenTiep: ["FIELD"] }), KHONG_NHAN_VAI_NOI_BO, "quyền nội bộ tự nó đủ");
  assert.equal(moNoiBoChoHoSoCoNhanProblem({ nhanDoiTac: true, vaiTiep: ["HOTEL_RECEPTION"], quyenTiep: ["PARTNER"] }), null, "đối tác thuần được");
  assert.equal(moNoiBoChoHoSoCoNhanProblem({ nhanDoiTac: true, vaiTiep: ["DRIVER_EXTERNAL"], quyenTiep: ["DRIVER_PARTNER"] }), null);
  assert.equal(moNoiBoChoHoSoCoNhanProblem({ nhanDoiTac: false, vaiTiep: ["SALES_STAFF"], quyenTiep: ["SALES"] }), null, "không nhãn thì không chặn");
  assert.equal(KHONG_NHAN_VAI_NOI_BO, "Hồ sơ này không nhận thêm vai nội bộ vào lúc này.");
});
