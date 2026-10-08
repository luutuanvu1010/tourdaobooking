import { test } from "node:test";
import assert from "node:assert/strict";
import { benDatChoTaiKhoan, benDatDoiTacBiCam, bookerPayload, canPickMatch, describeBookerChange, lookupReady, matchNote, parseBooker } from "./booker.ts";

const U = "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0";

test("parseBooker: vắng cả hai (undefined/null/rỗng) = không gắn", () => {
  for (const [id, nb] of [[undefined, undefined], [null, null], ["", undefined]] as const) assert.deepEqual(parseBooker(id, nb), { ok: true, value: { kind: "none" } });
});

test("parseBooker: hồ sơ có sẵn — UUID hoặc pty-UUID; sai dạng bị từ chối", () => {
  assert.deepEqual(parseBooker(U, undefined), { ok: true, value: { kind: "existing", partyId: U } });
  assert.deepEqual(parseBooker(`pty-${U}`, null), { ok: true, value: { kind: "existing", partyId: `pty-${U}` } });
  for (const bad of ["x", 42, `ptr-${U}`]) assert.deepEqual(parseBooker(bad, undefined), { ok: false, message: "Hồ sơ khách không hợp lệ." });
});

test("parseBooker: gửi cả hai → lỗi", () => {
  assert.deepEqual(parseBooker(U, { fullName: "A", phone: "0901234567" }), { ok: false, message: "Chỉ chọn một: dùng hồ sơ có sẵn hoặc tạo hồ sơ mới." });
});

test("parseBooker: hồ sơ mới — gọn khoảng trắng tên, chuẩn hoá SĐT; thiếu tên / số không phải Việt Nam / sai dạng bị từ chối", () => {
  assert.deepEqual(parseBooker(undefined, { fullName: "  Trần   Thị B ", phone: "+84 901 234 567" }), { ok: true, value: { kind: "new", fullName: "Trần Thị B", phone: "0901234567" } });
  assert.deepEqual(parseBooker(undefined, { fullName: " ", phone: "0901234567" }), { ok: false, message: "Cần tên khách để tạo hồ sơ." });
  const r = parseBooker(undefined, { fullName: "A", phone: "+1 415 555 0100" });
  assert.ok(!r.ok && /số điện thoại Việt Nam 10 số/.test(r.message));
  assert.deepEqual(parseBooker(undefined, ["A"]), { ok: false, message: "Thông tin tạo hồ sơ khách không hợp lệ." });
  assert.deepEqual(parseBooker(undefined, { fullName: "A".repeat(201), phone: "0901234567" }), { ok: false, message: "Tên khách tối đa 200 ký tự." });
});

test("canPickMatch / matchNote: chỉ cá nhân đang hoạt động chọn được", () => {
  assert.equal(canPickMatch({ kind: "PERSON", active: true }), true);
  assert.equal(canPickMatch({ kind: "PERSON", active: false }), false);
  assert.equal(canPickMatch({ kind: "ORGANIZATION", active: true }), false);
  assert.equal(matchNote({ kind: "PERSON", active: true }), null);
  assert.equal(matchNote({ kind: "PERSON", active: false }), "đã ngưng");
  assert.equal(matchNote({ kind: "ORGANIZATION", active: true }), "tổ chức — chưa gắn được vào đơn ở bản này");
});

test("lookupReady: cùng chuẩn với máy chủ (số Việt Nam 10 số)", () => {
  assert.equal(lookupReady("0901 234 567"), true);
  assert.equal(lookupReady("+84901234567"), true);
  assert.equal(lookupReady("090123"), false);
  assert.equal(lookupReady("+1 415 555 0100"), false);
});

test("bookerPayload: lựa chọn giao diện → trường gửi lên", () => {
  assert.deepEqual(bookerPayload({ kind: "none" }, "A", "0901"), { bookerPartyId: null });
  assert.deepEqual(bookerPayload({ kind: "existing", partyId: U, name: "B" }, "A", "0901"), { bookerPartyId: U });
  assert.deepEqual(bookerPayload({ kind: "new" }, "  Trần B ", " 0901234567 "), { newBooker: { fullName: "Trần B", phone: "0901234567" } });
});

test("describeBookerChange: chỉ tên, null khi không đổi", () => {
  const a = { id: "a", name: "Nguyễn A" };
  const b = { id: "b", name: "Trần B" };
  const none = { id: null, name: null };
  assert.equal(describeBookerChange(a, a), null);
  assert.equal(describeBookerChange(none, none), null);
  assert.equal(describeBookerChange(none, b), "gắn hồ sơ khách “Trần B”");
  assert.equal(describeBookerChange(a, none), "bỏ gắn hồ sơ khách “Nguyễn A”");
  assert.equal(describeBookerChange(a, b), "đổi hồ sơ khách “Nguyễn A” → “Trần B”");
});

test("benDatChoTaiKhoan (ADR-0077 đ3 (i), thu hẹp): Đối tác có hồ sơ được hưởng ⇒ chính hồ sơ đó, bất kể thân gửi gì", () => {
  const nhieu = [{ kind: "none" }, { kind: "existing", partyId: "pty-khac" }, { kind: "new", fullName: "A", phone: "0901234567" }] as const;
  for (const guiLen of nhieu) assert.deepEqual(benDatChoTaiKhoan({ laDoiTac: true, partyId: "pty-minh", laNguoiHuong: true, guiLen }), { kind: "existing", partyId: "pty-minh" });
});

test("benDatChoTaiKhoan: Đối tác có hồ sơ nhưng KHÔNG được hưởng, Đối tác chưa gắn hồ sơ, hoặc không phải Đối tác ⇒ giữ nguyên điều thân gửi", () => {
  const guiLen = { kind: "existing", partyId: "pty-khac" } as const;
  assert.equal(benDatChoTaiKhoan({ laDoiTac: true, partyId: "pty-minh", laNguoiHuong: false, guiLen }), guiLen);
  assert.equal(benDatChoTaiKhoan({ laDoiTac: true, partyId: null, laNguoiHuong: false, guiLen }), guiLen);
  assert.equal(benDatChoTaiKhoan({ laDoiTac: true, partyId: null, laNguoiHuong: true, guiLen }), guiLen, "không có hồ sơ thì không thể ghi hồ sơ của tài khoản");
  assert.equal(benDatChoTaiKhoan({ laDoiTac: false, partyId: "pty-minh", laNguoiHuong: true, guiLen }), guiLen, "tài khoản không giữ quyền Đối tác không bị ép");
  assert.equal(benDatChoTaiKhoan({ laDoiTac: false, partyId: "pty-minh", laNguoiHuong: false, guiLen: { kind: "none" } }).kind, "none");
});

test("benDatDoiTacBiCam (K1, lời chủ 2026-10-09): tài khoản Đối tác gửi hồ sơ CÓ SẴN đang được hưởng mà khác hồ sơ của chính mình và khác bên đặt đang lưu ⇒ bị cấm", () => {
  const goc = { laDoiTac: true, partyId: "pty-minh", guiLen: { kind: "existing", partyId: "pty-dai-ly" }, guiLaNguoiHuong: true, benDatDangLuu: null } as const;
  assert.equal(benDatDoiTacBiCam(goc), true);
  assert.equal(benDatDoiTacBiCam({ ...goc, benDatDangLuu: "pty-khac-nua" }), true, "bên đặt đang lưu là hồ sơ khác thì không được miễn");
  assert.equal(benDatDoiTacBiCam({ ...goc, partyId: null }), true, "chưa gắn hồ sơ: luật này vẫn cấm (đường lập đơn trả 409 trước, đường đổi khách trả 403)");
});

test("benDatDoiTacBiCam: các ngoại lệ — bên đặt đang lưu, chính hồ sơ của tài khoản, hồ sơ không được hưởng, không gửi hồ sơ có sẵn, không giữ quyền Đối tác", () => {
  const goc = { laDoiTac: true, partyId: "pty-minh", guiLen: { kind: "existing", partyId: "pty-dai-ly" }, guiLaNguoiHuong: true, benDatDangLuu: null } as const;
  assert.equal(benDatDoiTacBiCam({ ...goc, benDatDangLuu: "pty-dai-ly" }), false, "văn phòng đã gắn đúng bên này lên nháp: Đối tác lưu lại nháp không bị chặn");
  assert.equal(benDatDoiTacBiCam({ ...goc, guiLen: { kind: "existing", partyId: "pty-minh" } }), false, "chọn đúng hồ sơ của chính mình");
  assert.equal(benDatDoiTacBiCam({ ...goc, guiLaNguoiHuong: false }), false, "khách lẻ / tổ chức không được hưởng: luật khác lo");
  assert.equal(benDatDoiTacBiCam({ ...goc, guiLen: { kind: "none" } }), false);
  assert.equal(benDatDoiTacBiCam({ ...goc, guiLen: { kind: "new", fullName: "A", phone: "0901234567" } }), false);
  assert.equal(benDatDoiTacBiCam({ ...goc, laDoiTac: false }), false, "nhân viên văn phòng không giữ quyền Đối tác chọn tự do");
});
