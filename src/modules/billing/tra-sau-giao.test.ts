// Bước «Đã giao» của đơn Trả sau (ADR-0168 Đ3 mục 2; kế hoạch Task 5): `lyDoChuaGiaoDuoc` nhận thêm `traSau`. Còn nợ ⇒ cùng mã `underpaid` nhưng câu và người xử lý khác;
// đơn Trả trước giữ NGUYÊN CHỮ. Thu đủ thì qua như đơn thường.
import { test } from "node:test";
import assert from "node:assert/strict";
import { conLai, lyDoChuaGiaoDuoc } from "./rules.ts";
import { cauChoDoiTacThanhToan } from "../../shared/tra-sau.ts";

const KHONG_HUONG = { trangThai: "KHONG_NGUOI_HUONG" } as const;
const base = { status: "confirmed" as const, deliveredAt: null, homNay: "2026-10-10", ngayDi: ["2026-10-09", "2026-10-10"], dichVuThieuNgay: [], thuongMai: KHONG_HUONG, soKhoanDoiChieu: 0, anGiaVon: false };
const so = (daThu: number, phaiThu: number) => ({ ...conLai([], phaiThu, "confirmed"), daThu, conLai: Math.max(0, phaiThu - daThu), du: Math.max(0, daThu - phaiThu), chuaRo: 0 });

test("đơn Trả sau còn nợ: mã underpaid, Kế toán xử lý, câu «Đơn trả sau còn nợ <số> — chờ đối tác thanh toán.»", () => {
  const ly = lyDoChuaGiaoDuoc({ ...base, so: so(200_000, 1_000_000), traSau: true })!;
  assert.deepEqual([ly.ma, ly.aiXuLy], ["underpaid", "Kế toán"]);
  assert.equal(ly.cau, "Đơn trả sau còn nợ 800.000 ₫ — chờ đối tác thanh toán.");
  assert.equal(ly.cau, cauChoDoiTacThanhToan(800_000));
});

test("đơn Trả trước (traSau false hoặc vắng): câu cũ từng chữ, người xử lý cũ", () => {
  for (const traSau of [false, undefined]) {
    const ly = lyDoChuaGiaoDuoc({ ...base, so: so(200_000, 1_000_000), ...(traSau === undefined ? {} : { traSau }) })!;
    assert.deepEqual([ly.ma, ly.aiXuLy, ly.cau], ["underpaid", "Hướng dẫn viên", "Còn thiếu 800.000 ₫ — ghi thêm khoản thu hoặc sửa đơn trước."]);
  }
});

test("đơn Trả sau thu đủ thì qua như đơn thường; các lý do đứng trước (chưa tới ngày đi, đang đối chiếu) vẫn đứng trước", () => {
  assert.equal(lyDoChuaGiaoDuoc({ ...base, so: so(1_000_000, 1_000_000), traSau: true }), null);
  assert.equal(lyDoChuaGiaoDuoc({ ...base, homNay: "2026-10-08", so: so(0, 1_000_000), traSau: true })!.ma, "before_departure");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, soKhoanDoiChieu: 1, so: so(0, 1_000_000), traSau: true })!.ma, "reconciling");
});
