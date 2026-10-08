// Payload VietQR (ADR-0108 đ3; đặc tả QR §7, §8.5). Sổ vàng:
//  - chuỗi CÔNG KHAI: ví dụ trong README của thư viện npm `vietnam-qr-pay` (https://npmjs.org/package/vietnam-qr-pay) — BIN 970416, TK 257678859, 1.000đ,
//    nội dung "Chuyen tien", CRC BBB8;
//  - các chuỗi còn lại TỰ TÍNH bằng một bản Python độc lập cùng thuật toán ở phiên lập kế hoạch (đối chiếu chéo, không phải nguồn công khai).
// Kiểm thật cuối cùng là chủ dự án quét bằng ≥ 2 ứng dụng ngân hàng (§8.6) — bài này không thay được việc đó.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16, payloadVietQr } from "./vietqr.ts";

test("CRC-16/CCITT-FALSE: giá trị kiểm chuẩn '123456789' → 29B1", () => {
  assert.equal(crc16("123456789"), "29B1");
});

const vang: [string, Parameters<typeof payloadVietQr>[0], string][] = [
  ["công khai (vietnam-qr-pay)", { bin: "970416", soTaiKhoan: "257678859", soTien: 1000, noiDung: "Chuyen tien" },
    "00020101021238530010A0000007270123000697041601092576788590208QRIBFTTA5303704540410005802VN62150811Chuyen tien6304BBB8"],
  ["tự tính: VCB, 13 số, 700.000đ, mã đơn", { bin: "970436", soTaiKhoan: "0011001234567", soTien: 700_000, noiDung: "TD202610080012" },
    "00020101021238570010A00000072701270006970436011300110012345670208QRIBFTTA530370454067000005802VN62180814TD202610080012630455D9"],
  ["tự tính: MB, 19 số (dài nhất), 1đ", { bin: "970422", soTaiKhoan: "1234567890123456789", soTien: 1, noiDung: "TD202610080012" },
    "00020101021238630010A00000072701330006970422011912345678901234567890208QRIBFTTA5303704540115802VN62180814TD2026100800126304D3D1"],
];
for (const [ten, vao, mong] of vang) {
  test(`sổ vàng — ${ten}: khớp từng ký tự, CRC đúng`, () => {
    const r = payloadVietQr(vao);
    assert.deepEqual(r, { ok: true, payload: mong });
    assert.equal(crc16(mong.slice(0, -4)), mong.slice(-4), "CRC tính trên cả '6304'");
  });
}

test("đầu vào sai → lỗi tiếng Việt, không ném", () => {
  const goc = { bin: "970436", soTaiKhoan: "0011001234567", soTien: 1000, noiDung: "TD1" };
  for (const [sua, mau] of [
    [{ bin: "97043" }, /BIN/], [{ bin: "97043A" }, /BIN/], [{ soTaiKhoan: "123" }, /tài khoản/], [{ soTaiKhoan: "12345678901234567890" }, /tài khoản/],
    [{ soTaiKhoan: "0011-001" }, /tài khoản/], [{ soTien: 0 }, /Số tiền/], [{ soTien: 1.5 }, /Số tiền/], [{ soTien: 10_000_000_000_000 }, /Số tiền/],
    [{ noiDung: "" }, /Nội dung/], [{ noiDung: "x".repeat(26) }, /Nội dung/], [{ noiDung: "Chuyển" }, /Nội dung/],
  ] as const) {
    const r = payloadVietQr({ ...goc, ...sua });
    assert.equal(r.ok, false, JSON.stringify(sua));
    if (!r.ok) assert.match(r.loi, mau);
  }
});
