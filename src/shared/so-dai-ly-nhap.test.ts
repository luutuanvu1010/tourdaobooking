import { test } from "node:test";
import assert from "node:assert/strict";
import { MOI_KHACH_TOI_DA, docNgayDong, docThanDieuKhoan, docThanDongMucTa, docThanGan, docThanMuc, docTienMoiKhach, docTyLePhanTram, ngayDongMacDinh, type FormDieuKhoan, type FormDongMucTa, type FormMuc } from "./so-dai-ly-nhap.ts";

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

test("docTienMoiKhach: trần như máy chủ (100.000.000đ) — vừa trần thì qua, quá trần thì báo ngay dưới ô và nói rõ trần", () => {
  assert.equal(MOI_KHACH_TOI_DA, 100_000_000);
  assert.deepEqual(docTienMoiKhach("100.000.000"), { ok: true, dong: 100_000_000 });
  assert.deepEqual(docTienMoiKhach("99.999.999"), { ok: true, dong: 99_999_999 });
  for (const qua of ["100.000.001", "150.000.000", "999.999.999"]) {
    const r = docTienMoiKhach(qua);
    assert.equal(r.ok, false, qua);
    assert.equal(!r.ok && r.message, "Số tiền mỗi khách không quá 100.000.000đ.", qua);
  }
  // Số từ mười chữ số trở lên cũng nhận ĐÚNG câu «không quá …» (Task 14, nợ (b)): trước đây khuôn `\d{1,9}` chạy trước phép so trần nên số quá lớn nhận câu «số nguyên đồng» không nói trần.
  const CAU_TRAN = "Số tiền mỗi khách không quá 100.000.000đ.";
  for (const lon of ["1.000.000.000", "1234567890", "99999999999999999999", "9".repeat(400)]) {
    const r = docTienMoiKhach(lon);
    assert.equal(r.ok, false, lon);
    assert.equal(!r.ok && r.message, CAU_TRAN, `${lon.slice(0, 24)}…: số quá lớn nhận câu nói rõ trần`);
  }
  // khuôn «số nguyên đồng» vẫn giữ cho thứ không phải số nguyên
  for (const sai of ["", "50,5", "-1", "abc", "1e9"]) assert.equal(!docTienMoiKhach(sai).ok && (docTienMoiKhach(sai) as { message: string }).message, "Số tiền mỗi khách là số nguyên đồng (vd 50.000).", sai);
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
  const quaTran = docThanMuc({ ...mucDu, kieu: "PER_PAX", moiKhach: "150.000.000" });
  assert.deepEqual(!quaTran.ok && quaTran.loi, [{ truong: "muc", message: "Số tiền mỗi khách không quá 100.000.000đ." }], "quá trần: lỗi ở ô mức, không gửi lên máy chủ");
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

// ---- Mức TA (ADR-0117 lần 2): thân «Thêm dòng» của một mức (không có đối tượng — đích là chính mức) và thân «Gắn mức» (loại ↔ mức theo ngày)
const dongMucTaDu: FormDongMucTa = { phamVi: "SERVICE", catalogCode: "ZE1", groupCode: "", kieu: "RATE", tyLe: "15", moiKhach: "", tuNgay: "2026-10-15", denNgay: "", ghiChu: "" };
test("docThanDongMucTa: thân đúng khuôn route …/muc-ta/:code/dong — KHÔNG có doiTuong; phần trăm và mỗi khách như bảng mức", () => {
  assert.deepEqual(docThanDongMucTa(dongMucTaDu), { ok: true, body: { phamVi: "SERVICE", catalogCode: "ZE1", tuNgay: "2026-10-15", kieu: "RATE", tyLeBp: 1500 } });
  assert.deepEqual(docThanDongMucTa({ ...dongMucTaDu, phamVi: "ALL", kieu: "PER_PAX", moiKhach: "50.000", denNgay: "2026-12-31", ghiChu: " mùa cao điểm " }), {
    ok: true,
    body: { phamVi: "ALL", tuNgay: "2026-10-15", denNgay: "2026-12-31", ghiChu: "mùa cao điểm", kieu: "PER_PAX", moiKhach: 50_000 },
  });
  const r = docThanDongMucTa({ ...dongMucTaDu, catalogCode: "", tyLe: "abc", tuNgay: "" });
  assert.deepEqual(!r.ok && r.loi.map((l) => l.truong), ["phamVi", "tuNgay", "muc"], "lỗi gom theo ô, một lượt");
  const quaTran = docThanDongMucTa({ ...dongMucTaDu, kieu: "PER_PAX", moiKhach: "150.000.000" });
  assert.deepEqual(!quaTran.ok && quaTran.loi, [{ truong: "muc", message: "Số tiền mỗi khách không quá 100.000.000đ." }]);
});
test("docThanGan: { loai, muc, tuNgay, denNgay? } — thiếu loại / mức / ngày báo dưới đúng ô; ngày kết thúc không trước ngày bắt đầu", () => {
  assert.deepEqual(docThanGan({ loai: "LD_ABCDEFGH", muc: "MT_ABCDEFGH", tuNgay: "2026-10-15", denNgay: "" }), { ok: true, body: { loai: "LD_ABCDEFGH", muc: "MT_ABCDEFGH", tuNgay: "2026-10-15" } });
  assert.deepEqual(docThanGan({ loai: "LD_ABCDEFGH", muc: "MT_ABCDEFGH", tuNgay: "2026-10-15", denNgay: "2026-12-31" }), { ok: true, body: { loai: "LD_ABCDEFGH", muc: "MT_ABCDEFGH", tuNgay: "2026-10-15", denNgay: "2026-12-31" } });
  const r = docThanGan({ loai: "", muc: " ", tuNgay: "", denNgay: "" });
  assert.deepEqual(!r.ok && r.loi, [
    { truong: "loai", message: "Chọn một loại đối tác." },
    { truong: "mucTa", message: "Chọn một mức TA." },
    { truong: "tuNgay", message: "Chọn ngày bắt đầu." },
  ]);
  const nguoc = docThanGan({ loai: "LD_ABCDEFGH", muc: "MT_ABCDEFGH", tuNgay: "2026-10-15", denNgay: "2026-10-14" });
  assert.deepEqual(!nguoc.ok && nguoc.loi, [{ truong: "denNgay", message: "Ngày kết thúc không được trước ngày bắt đầu." }]);
});
