// Các dòng in dưới mã QR (đặc tả QR §4.2, §8.10): chỉ trường của DTO danh sách trắng; tiền theo dạng "1.000.000đ".
import { test } from "node:test";
import assert from "node:assert/strict";
import type { QrThanhToanDto } from "./contracts.ts";
import { dongThongTinQr, soTienQr } from "./qr-thong-tin.ts";

const DTO: QrThanhToanDto = {
  payload: "000201", soTien: 1_000_000, conLai: 1_000_000, maDon: "TD-20261008-0012", noiDung: "TD202610080012",
  congTy: "CÔNG TY TNHH TOUR ĐẢO", nganHang: "Vietcombank", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO",
};

test("định dạng tiền 1.000.000đ", () => {
  assert.equal(soTienQr(1_000_000), "1.000.000đ");
  assert.equal(soTienQr(700), "700đ");
});

test("đúng sáu dòng; nguồn có trường lạ (hoa hồng, người thu) cũng không lọt", () => {
  const lan = { ...DTO, hoaHong: "HOA HỒNG 480017", nguoiThu: "Nam HDV" } as QrThanhToanDto;
  const d = dongThongTinQr(lan);
  assert.deepEqual(d, [
    "CÔNG TY TNHH TOUR ĐẢO", "Vietcombank · 0011001234567", "Chủ tài khoản: CONG TY TNHH TOUR DAO", "Số tiền: 1.000.000đ", "Nội dung: TD202610080012", "Mã đơn: TD-20261008-0012",
  ]);
  assert.doesNotMatch(d.join("\n"), /hoa hồng|480017|giá vốn|Nam HDV/i);
});
