// Luật thuần nhập lô vé (ADR-0156 Đ1, Đ3): khoá mã vé lấy từ chuỗi QR, lọc ảnh đã đọc, khoảng trần lô.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TOI_DA_BYTE_ANH, TRAN_LO_LON_NHAT, TRAN_LO_MAC_DINH, TRAN_LO_NHO_NHAT, cauVuotTran, locAnhDaDoc, maVeTuQr, tranLoHopLe } from "./ve-nhap-lo.ts";

const QR = "1".repeat(24) + "900000000001";

test("maVeTuQr: nhận chuỗi 36 chữ số của vé thật và giữ nguyên toàn bộ", () => {
  assert.equal(maVeTuQr(QR), QR);
});

test("maVeTuQr: chuỗi rỗng, có dấu cách, quá dài, có đường dẫn đều không phải mã vé", () => {
  for (const x of ["", "có dấu cách", "1".repeat(41), "https://vi.example/ve/1"]) assert.equal(maVeTuQr(x), null, x);
});

test("locAnhDaDoc: ảnh tốt đi tiếp kèm mã; ảnh không đọc được, sai dạng, quá cỡ bị loại riêng và nêu tên tệp", () => {
  const kq = locAnhDaDoc([
    { ten: "a.jpg", chuoiQr: QR, byte: 1000 },
    { ten: "khong-qr.jpg", chuoiQr: null, byte: 1000 },
    { ten: "sai-dang.jpg", chuoiQr: "https://vi.example/ve/1", byte: 1000 },
    { ten: "to.jpg", chuoiQr: `${QR.slice(1)}9`, byte: TOI_DA_BYTE_ANH + 1 },
  ]);
  assert.deepEqual(kq.hop.map((x) => [x.ten, x.maVe]), [["a.jpg", QR]]);
  assert.deepEqual(kq.bi.map((x) => x.ten), ["khong-qr.jpg", "sai-dang.jpg", "to.jpg"]);
  assert.match(kq.bi[0]!.lyDo, /Không đọc được mã QR/);
  assert.match(kq.bi[1]!.lyDo, /không đúng dạng/);
  assert.match(kq.bi[2]!.lyDo, /3 MB/);
});

test("locAnhDaDoc: hai ảnh cùng chuỗi QR trong lựa chọn: giữ ảnh đầu, ảnh sau bị loại và nêu tên ảnh đầu", () => {
  const kq = locAnhDaDoc([{ ten: "a.jpg", chuoiQr: QR, byte: 1 }, { ten: "a-nen-lai.jpg", chuoiQr: QR, byte: 1 }]);
  assert.deepEqual(kq.hop.map((x) => x.ten), ["a.jpg"]);
  assert.equal(kq.bi[0]!.ten, "a-nen-lai.jpg");
  assert.match(kq.bi[0]!.lyDo, /a\.jpg/);
});

test("locAnhDaDoc: giữ thêm trường của người gọi (tệp gốc) trên ảnh đi tiếp", () => {
  const kq = locAnhDaDoc([{ ten: "a.jpg", chuoiQr: QR, byte: 1, tep: "goc" }]);
  assert.equal(kq.hop[0]!.tep, "goc");
});

test("tranLoHopLe: chỉ số nguyên trong khoảng cho phép; mặc định 50 nằm trong khoảng", () => {
  assert.equal(TRAN_LO_MAC_DINH, 50);
  assert.ok(tranLoHopLe(TRAN_LO_MAC_DINH));
  assert.ok(tranLoHopLe(TRAN_LO_NHO_NHAT));
  assert.ok(tranLoHopLe(TRAN_LO_LON_NHAT));
  for (const x of [0, TRAN_LO_LON_NHAT + 1, 1.5, "50", null, undefined, Number.NaN]) assert.equal(tranLoHopLe(x), false, String(x));
});

test("cauVuotTran: nói rõ trần và số ảnh đang chọn", () => {
  assert.equal(cauVuotTran(50, 51), "Một lô tối đa 50 vé, bạn đang chọn 51 ảnh.");
});
