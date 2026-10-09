import { test } from "node:test";
import assert from "node:assert/strict";
import { docNgayDong, docThanDieuKhoan, docThanMuc, docTienMoiKhach, docTyLePhanTram, ngayDongMacDinh, type FormDieuKhoan, type FormMuc } from "./so-dai-ly-nhap.ts";

test("docTyLePhanTram: dấu phẩy hoặc chấm, tối đa hai chữ số thập phân, 0…100", () => {
  assert.deepEqual(docTyLePhanTram("12,5"), { ok: true, bp: 1250 });
  assert.deepEqual(docTyLePhanTram("12.5"), { ok: true, bp: 1250 });
  assert.deepEqual(docTyLePhanTram(" 15 "), { ok: true, bp: 1500 });
  assert.deepEqual(docTyLePhanTram("0"), { ok: true, bp: 0 });
  assert.deepEqual(docTyLePhanTram("100"), { ok: true, bp: 10000 });
  assert.deepEqual(docTyLePhanTram("0,01"), { ok: true, bp: 1 });
  for (const sai of ["", "abc", "12,555", "100,01", "-1", "1e2", "12,5%x"]) assert.equal(docTyLePhanTram(sai).ok, false, sai);
  assert.deepEqual(docTyLePhanTram("12,5%"), { ok: true, bp: 1250 }, "cho phép dấu % ở cuối");
});

test("docTienMoiKhach: số nguyên đồng, bỏ dấu chấm nghìn", () => {
  assert.deepEqual(docTienMoiKhach("50.000"), { ok: true, dong: 50_000 });
  assert.deepEqual(docTienMoiKhach("0"), { ok: true, dong: 0 });
  for (const sai of ["", "50,5", "-1", "abc"]) assert.equal(docTienMoiKhach(sai).ok, false, sai);
});

// ---- Đọc cả form thành thân gửi ----
const mucDu: FormMuc = {
  doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", catalogCode: "", groupCode: "", kieu: "RATE", tyLe: "12,5", moiKhach: "", tuNgay: "2026-10-01", denNgay: "", ghiChu: "",
};
test("docThanMuc: phần trăm → tyLeBp phần vạn; thân đúng khuôn máy chủ, không khoá thừa", () => {
  assert.deepEqual(docThanMuc(mucDu), { ok: true, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", tuNgay: "2026-10-01", kieu: "RATE", tyLeBp: 1250 } });
});
test("docThanMuc: số tiền mỗi khách; một dịch vụ / một nhóm mang đúng mã; ngày kết thúc và ghi chú đi kèm khi có", () => {
  const r = docThanMuc({ ...mucDu, doiTuong: { loai: "DOI_TAC", partyId: "pty-1" }, phamVi: "SERVICE", catalogCode: " HONTAM ", kieu: "PER_PAX", moiKhach: "50.000", denNgay: "2026-12-31", ghiChu: " mùa cao điểm " });
  assert.deepEqual(r, {
    ok: true,
    body: { doiTuong: { loai: "DOI_TAC", partyId: "pty-1" }, phamVi: "SERVICE", catalogCode: "HONTAM", tuNgay: "2026-10-01", denNgay: "2026-12-31", ghiChu: "mùa cao điểm", kieu: "PER_PAX", moiKhach: 50_000 },
  });
  const g = docThanMuc({ ...mucDu, phamVi: "GROUP", groupCode: "DTH" });
  assert.equal(g.ok && g.body.groupCode, "DTH");
});
test("docThanMuc: lỗi gom theo ô, một lượt (chưa chọn đối tượng, chưa chọn dịch vụ, tỷ lệ sai, ngày sai)", () => {
  const r = docThanMuc({ ...mucDu, doiTuong: null, phamVi: "SERVICE", tyLe: "abc", tuNgay: "", denNgay: "2026-09-30" });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.deepEqual(r.loi.map((l) => l.truong), ["doiTuong", "phamVi", "tuNgay", "muc"]);
  const sau = docThanMuc({ ...mucDu, denNgay: "2026-09-30" });
  assert.deepEqual(!sau.ok && sau.loi.map((l) => l.truong), ["denNgay"], "ngày kết thúc trước ngày bắt đầu");
  assert.equal(docThanMuc({ ...mucDu, phamVi: "GROUP" }).ok, false, "chọn nhóm mà chưa chọn nhóm");
  assert.equal(docThanMuc({ ...mucDu, ghiChu: "x".repeat(201) }).ok, false);
  assert.equal(docThanMuc({ ...mucDu, kieu: "PER_PAX", moiKhach: "50,5" }).ok, false);
  assert.equal(docThanMuc({ ...mucDu, doiTuong: { loai: "DOI_TAC", partyId: "" } }).ok, false);
});

const dkDu: FormDieuKhoan = { phamVi: "ALL", catalogCode: "", groupCode: "", nguoiBanPartyId: "pty-cty", laCongTy: true, tyLeMua: "", tuNgay: "2026-10-01", denNgay: "", ghiChu: "" };
test("docThanDieuKhoan: Tour Đảo bán thì KHÔNG gửi tỷ lệ mua lại (dù ô còn chữ cũ); nhà cung cấp bán thì bắt buộc", () => {
  assert.deepEqual(docThanDieuKhoan({ ...dkDu, tyLeMua: "80" }), { ok: true, body: { phamVi: "ALL", tuNgay: "2026-10-01", nguoiBanPartyId: "pty-cty" } });
  const ncc = docThanDieuKhoan({ ...dkDu, phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-ncc", laCongTy: false, tyLeMua: "80" });
  assert.deepEqual(ncc, { ok: true, body: { phamVi: "SERVICE", catalogCode: "IRESORT", tuNgay: "2026-10-01", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 8000 } });
  const thieu = docThanDieuKhoan({ ...dkDu, nguoiBanPartyId: "pty-ncc", laCongTy: false, tyLeMua: "" });
  assert.deepEqual(!thieu.ok && thieu.loi, [{ truong: "tyLeMua", message: "Nhà cung cấp bán thì phải ghi tỷ lệ Tour Đảo mua lại." }]);
  const chuaChon = docThanDieuKhoan({ ...dkDu, nguoiBanPartyId: "" });
  assert.deepEqual(!chuaChon.ok && chuaChon.loi.map((l) => l.truong), ["nguoiBan"]);
});

test("ngày đóng: mặc định hôm nay, dòng chưa bắt đầu thì chính ngày bắt đầu; không nhận ngày trước ngày bắt đầu", () => {
  assert.equal(ngayDongMacDinh("2026-10-09", "2026-01-01"), "2026-10-09");
  assert.equal(ngayDongMacDinh("2026-10-09", "2026-11-01"), "2026-11-01");
  assert.deepEqual(docNgayDong("2026-10-09", "2026-10-01"), { ok: true, body: { denNgay: "2026-10-09" } });
  assert.equal(docNgayDong("2026-09-30", "2026-10-01").ok, false);
  assert.equal(docNgayDong("", "2026-10-01").ok, false);
  assert.equal(docNgayDong("2026-02-30", "2026-01-01").ok, false);
});
