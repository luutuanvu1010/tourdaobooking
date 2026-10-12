// Luật thuần mã giao dịch (ADR-0092 Đ6; đặc tả QR §5; Review Focus 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuanHoaMaGiaoDich, docGiaoDich, kiemMaGiaoDich } from "./ma-giao-dich.ts";

test("chuẩn hoá: bỏ cách / - . /, in hoa, chữ số toàn khổ → ASCII; còn ký tự lạ hoặc ngoài 4–40 ⇒ null (không lặng lẽ cắt chữ)", () => {
  assert.equal(chuanHoaMaGiaoDich("ft 2610.0812/345"), "FT26100812345");
  assert.equal(chuanHoaMaGiaoDich("１２３４５６７８９０１２"), "123456789012");
  assert.equal(chuanHoaMaGiaoDich("123456789012"), "123456789012", "ô mã MIỄN luật chặn dãy ≥ 8 chữ số");
  for (const x of ["ĐMA123", "AB_12", "--..", "AB1", "A".repeat(41), "", 12345, null]) assert.equal(chuanHoaMaGiaoDich(x), null, String(x));
});

test("đọc: không được phép mà gửi ⇒ lỗi; bắt buộc mà thiếu ⇒ bank_txn_required; thiếu một nửa / sai dạng ⇒ invalid_input", () => {
  assert.deepEqual(docGiaoDich({}, { choPhep: false, batBuoc: false }), { ok: true, value: null });
  assert.equal(docGiaoDich({ maGiaoDich: "FT1234" }, { choPhep: false, batBuoc: false }).ok, false);
  const thieu = docGiaoDich({}, { choPhep: true, batBuoc: true });
  assert.equal(!thieu.ok && thieu.ma, "bank_txn_required");
  assert.deepEqual(docGiaoDich({}, { choPhep: true, batBuoc: false }), { ok: true, value: null });
  for (const raw of [{ maGiaoDich: "FT1234" }, { soThucChuyen: 100 }, { maGiaoDich: "x", soThucChuyen: 100 }, { maGiaoDich: "FT1234", soThucChuyen: 0 }, { maGiaoDich: "FT1234", soThucChuyen: "100" }]) {
    const r = docGiaoDich(raw, { choPhep: true, batBuoc: true });
    assert.equal(!r.ok && r.ma, "invalid_input", JSON.stringify(raw));
  }
  assert.deepEqual(docGiaoDich({ maGiaoDich: "ft-1234", soThucChuyen: 500 }, { choPhep: true, batBuoc: true }), { ok: true, value: { ma: "FT1234", soThucChuyen: 500 } });
});

test("ba luật: thứ tự trùng → lệch → vượt; lệch mang số đã ghi", () => {
  const d = [{ receiptId: "a", orderId: "o1", soTien: 400, soThucChuyen: 800 }];
  assert.equal((kiemMaGiaoDich({ soThucChuyen: 800, soTien: 1, orderId: "o1", daCo: d }) as { ma: string }).ma, "bank_txn_duplicate");
  assert.deepEqual(kiemMaGiaoDich({ soThucChuyen: 700, soTien: 1, orderId: "o2", daCo: d }).ok, false);
  assert.equal((kiemMaGiaoDich({ soThucChuyen: 700, soTien: 1, orderId: "o2", daCo: d }) as { soThucChuyen: number }).soThucChuyen, 800);
  assert.equal((kiemMaGiaoDich({ soThucChuyen: 800, soTien: 401, orderId: "o2", daCo: d }) as { ma: string }).ma, "bank_txn_over");
  assert.deepEqual(kiemMaGiaoDich({ soThucChuyen: 800, soTien: 400, orderId: "o2", daCo: d }), { ok: true });
});
