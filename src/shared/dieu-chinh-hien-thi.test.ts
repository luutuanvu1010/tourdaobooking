// ADR-0115: chữ hiển thị của màn «Điều chỉnh công nợ» — trang không tự viết câu về trạng thái / hạn.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { YeuCauDieuChinhDto } from "./contracts.ts";
import { LOP_TRANG_THAI, NHAN_TRANG_THAI, choDuyetTruoc, cuaToiTruoc, dongPhu, huongNhan, cauNoiDung } from "./dieu-chinh-hien-thi.ts";

const y = (o: Partial<YeuCauDieuChinhDto>): YeuCauDieuChinhDto => ({
  id: "i", orderId: "o", maDon: "TD-1", benNo: "Công ty", benDuocNo: "Nam HDV", soTien: 100000, loaiDong: "SETTLEMENT", loaiDongNhan: "Quyết toán (nộp / trả)", ngayPhatSinh: "2026-10-13",
  lyDo: "bù trừ", huong: "giam", taoLuc: "2026-10-13T01:00:00.000Z", hetHanLuc: "2026-10-20T01:00:00.000Z", nguoiTao: "Lan", trangThai: "cho_duyet", quyetLuc: null, nguoiQuyet: null,
  lyDoQuyet: null, laCuaToi: false, coTheDuyet: false, coTheTuChoi: false, coTheRut: false, ...o,
});

test("mỗi trạng thái có nhãn tiếng Việt và lớp chip; không lộ mã thô", () => {
  for (const t of ["cho_duyet", "da_duyet", "tu_choi", "da_rut", "het_han"] as const) {
    assert.match(NHAN_TRANG_THAI[t], /[À-ỹ]/, t);
    assert.ok(LOP_TRANG_THAI[t].startsWith("badge"));
  }
  assert.equal(huongNhan("tang"), "Tăng nợ");
  assert.equal(huongNhan("giam"), "Giảm nợ");
  assert.equal(cauNoiDung(y({}), "100.000 ₫"), "Công ty nợ Nam HDV 100.000 ₫");
});

test("dòng phụ: chờ → hạn; duyệt / từ chối → người quyết (+ lý do); rút; hết hạn", () => {
  assert.equal(dongPhu(y({}), "20/10/2026"), "Gửi bởi Lan · hạn duyệt 20/10/2026");
  assert.equal(dongPhu(y({ trangThai: "da_duyet", nguoiQuyet: "Mai" }), "x"), "Gửi bởi Lan · Mai đã duyệt");
  assert.equal(dongPhu(y({ trangThai: "tu_choi", nguoiQuyet: "Mai", lyDoQuyet: "sai số" }), "x"), "Gửi bởi Lan · Mai từ chối: sai số");
  assert.equal(dongPhu(y({ trangThai: "da_rut" }), "x"), "Lan đã rút");
  assert.equal(dongPhu(y({ trangThai: "het_han" }), "20/10/2026"), "Gửi bởi Lan · quá hạn duyệt (20/10/2026)");
});

test("khối «Chờ duyệt» chỉ gồm yêu cầu chờ, mới trước; khối «của tôi» chỉ yêu cầu của mình, mọi trạng thái", () => {
  const a = y({ id: "a", taoLuc: "2026-10-10T00:00:00.000Z", laCuaToi: true });
  const b = y({ id: "b", taoLuc: "2026-10-12T00:00:00.000Z", laCuaToi: true, trangThai: "da_duyet" });
  const c = y({ id: "c", taoLuc: "2026-10-11T00:00:00.000Z" });
  assert.deepEqual(choDuyetTruoc([a, b, c]).map((x) => x.id), ["c", "a"]);
  assert.deepEqual(cuaToiTruoc([a, b, c]).map((x) => x.id), ["b", "a"]);
});
