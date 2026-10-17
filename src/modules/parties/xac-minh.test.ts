import { test } from "node:test";
import assert from "node:assert/strict";
import { chuyenToanQuyen, coChamTaiKhoan, kiemTuChoi, loiLoChapNhan, lyDoKhongChapNhan, moc30Ngay, xetNguoiXacMinh, type ChamTaiKhoan, type TaiKhoanTom } from "./xac-minh.ts";

const GUI = "2026-10-17T08:00:00.000Z";
const phieu = { id: "p1", partyId: "pty-u", createdBy: "u", createdAt: GUI };
const chu: TaiKhoanTom = { id: "u", permissions: ["PARTNER"], active: true, partyId: "pty-u" };
const hr: TaiKhoanTom = { id: "hr", permissions: ["HR"], active: true, partyId: "pty-hr" };
const adm: TaiKhoanTom = { id: "adm", permissions: ["ADMIN"], active: true, partyId: "pty-adm" };
const sup: TaiKhoanTom = { id: "sup", permissions: ["SUPER_ADMIN"], active: true, partyId: "pty-sup" };
const cham = (actorId: string, loai: ChamTaiKhoan["loai"], at: string): ChamTaiKhoan => ({ actorId, accountId: "u", loai, at });

test("moc30Ngay: đúng 30 ngày UTC, khuôn toISOString", () => {
  assert.equal(moc30Ngay(GUI), "2026-09-17T08:00:00.000Z");
});

test("Review Focus 2: vĩnh viễn và biên 30 ngày", () => {
  assert.equal(coChamTaiKhoan([cham("hr", "VINH_VIEN", "2025-09-12T00:00:00.000Z")], "hr", phieu), true, "đặt lại PIN 400 ngày trước vẫn chặn");
  assert.equal(coChamTaiKhoan([cham("hr", "CUA_SO_30", "2026-09-17T08:00:00.000Z")], "hr", phieu), true, "đúng biên 30 ngày: chặn");
  assert.equal(coChamTaiKhoan([cham("hr", "CUA_SO_30", "2026-09-17T07:59:59.999Z")], "hr", phieu), false, "30 ngày + 1 ms: được");
  assert.equal(coChamTaiKhoan([cham("hr", "TAO", "2020-01-01T00:00:00.000Z")], "hr", phieu), true, "người tạo: chặn mãi");
  assert.equal(coChamTaiKhoan([cham("adm", "VINH_VIEN", GUI)], "hr", phieu), false, "người khác chạm: không chặn hr");
});

test("xetNguoiXacMinh: người khai, cấp bậc, chạm, Toàn quyền là chốt cuối có cờ", () => {
  assert.deepEqual(xetNguoiXacMinh({ nguoi: { ...chu }, phieu, chuPhieu: chu, cham: [] }), { duoc: false, lyDo: "nguoi_khai", coCham: false });
  assert.deepEqual(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: chu, cham: [] }), { duoc: true, lyDo: null, coCham: false });
  assert.equal(xetNguoiXacMinh({ nguoi: adm, phieu, chuPhieu: { ...chu, permissions: ["HR"] }, cham: [] }).lyDo, "cap_bac", "Quản trị không xác minh Nhân sự (canManageAccount)");
  assert.equal(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: { ...chu, permissions: ["ADMIN"] }, cham: [] }).lyDo, "cap_bac");
  assert.deepEqual(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: chu, cham: [cham("hr", "TAO", GUI)] }), { duoc: false, lyDo: "da_cham", coCham: true });
  assert.deepEqual(xetNguoiXacMinh({ nguoi: sup, phieu, chuPhieu: chu, cham: [cham("sup", "VINH_VIEN", GUI)] }), { duoc: true, lyDo: null, coCham: true });
  assert.equal(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: null, cham: [] }).lyDo, "khong_tai_khoan");
  assert.equal(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: { ...chu, partyId: "pty-khac" }, cham: [] }).lyDo, "khong_tai_khoan");
  assert.equal(xetNguoiXacMinh({ nguoi: sup, phieu, chuPhieu: null, cham: [] }).duoc, true, "R12: Toàn quyền xử lý được phiếu mất gắn");
});

test("Review Focus 4: Chuyển Toàn quyền khi không còn Quản trị / Nhân sự hợp lệ đang hoạt động", () => {
  assert.equal(chuyenToanQuyen(phieu, chu, [hr, adm, sup], [cham("hr", "TAO", GUI)]), false, "còn adm");
  assert.equal(chuyenToanQuyen(phieu, chu, [hr, adm, sup], [cham("hr", "TAO", GUI), cham("adm", "VINH_VIEN", GUI)]), true);
  assert.equal(chuyenToanQuyen(phieu, chu, [{ ...hr, active: false }, sup], []), true, "tài khoản ngưng không tính");
  assert.equal(chuyenToanQuyen(phieu, { ...chu, permissions: ["ADMIN"] }, [hr, adm, sup], []), true, "chủ phiếu thành Quản trị: hr cấp bậc chặn; adm khác cũng chặn");
  assert.equal(chuyenToanQuyen(phieu, chu, [{ ...adm, permissions: ["ADMIN", "SUPER_ADMIN"] }], []), true, "tài khoản giữ Toàn quyền không tính là Quản trị");
});

test("kiemTuChoi: chỉ mã thuộc danh sách đóng, không chữ tự do", () => {
  assert.deepEqual(kiemTuChoi({ lyDo: "KHONG_KHOP_GIAY_TO" }), { ok: true, value: { lyDo: "KHONG_KHOP_GIAY_TO" } });
  for (const b of [{ lyDo: "khác" }, { lyDo: "" }, {}, null, { lyDo: "KHONG_KHOP_GIAY_TO", ghiChu: "x" }]) assert.equal(kiemTuChoi(b as never).ok, false, JSON.stringify(b));
});

test("lyDoKhongChapNhan: hồ sơ đã gộp; giấy tờ chưa ảnh (R18)", () => {
  assert.equal(lyDoKhongChapNhan({ loai: "NGAY_SINH", daGop: true, coAnh: false })?.code, "ho_so_da_gop");
  assert.equal(lyDoKhongChapNhan({ loai: "GIAY_TO", daGop: false, coAnh: false })?.code, "can_anh_giay_to");
  assert.equal(lyDoKhongChapNhan({ loai: "DIA_CHI", daGop: false, coAnh: false }), null);
});

test("loiLoChapNhan: ba lỗi CSDL đổi thành 409 có mã; lỗi lạ trả null; câu báo không chứa số", () => {
  assert.equal(loiLoChapNhan(new Error("person_document_cccd_other_person: số CCCD này đã thuộc một hồ sơ khác"))?.code, "document_number_taken");
  assert.equal(loiLoChapNhan(new Error("self_submission_decider_is_author: x"))?.code, "verify_self");
  assert.equal(loiLoChapNhan(new Error("verification_no_replace: x"))?.code, "submission_not_pending");
  // Vòng sửa 1 (m-4): lô chấp nhận đua với gia hạn thủ công ⇒ trigger đích ném verification_target_mismatch ⇒ 409 tiếng Việt, không 500.
  const lech = loiLoChapNhan(new Error("verification_target_mismatch: dòng được xác minh không thuộc hồ sơ này"));
  assert.equal(lech?.status, 409);
  assert.equal(lech?.code, "verify_target_changed");
  assert.match(lech?.message ?? "", /đã thay đổi/);
  assert.doesNotMatch(lech?.message ?? "", /verification_target_mismatch/);
  assert.equal(loiLoChapNhan(new Error("khác")), null);
  assert.equal(loiLoChapNhan("không phải Error"), null);
});
