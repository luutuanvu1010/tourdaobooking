import assert from "node:assert/strict";
import { test } from "node:test";
import type { FeedbackTepDto } from "./contracts.ts";
import { TEP_MOI_TIN, TOI_DA_BASE64_TIN, TONG_BYTE_MOI_TIN, doDaiBase64, giaiBase64 } from "./tep-dinh-kem.ts";
import {
  CANH_DAI_TOI_DA, CAU_CAN_CHU, cauTepLoi, cauTrangThaiTep, coTep, duongTep, kichThuocThuNho, kiemTepDaChon, khoaTepCuaTin, maBase64, nhanTep, tinDoiTep,
} from "./tep-hien-thi.ts";
import { CAU_QUA_SO_TEP, CAU_QUA_TONG, CAU_SAI_LOAI } from "./tep-dinh-kem.ts";

const tep = (id: string, trangThai: FeedbackTepDto["trangThai"], loai: FeedbackTepDto["loai"] = "jpg", kichThuoc = 1000): FeedbackTepDto => ({ id, loai, kichThuoc, trangThai });
const tin = (id: string, ds: FeedbackTepDto[]) => ({ id, tep: ds });

test("coTep: dưới 1 MB tính KB (tối thiểu 1), từ 1 MB một chữ số lẻ, dấu phẩy thập phân, bỏ «,0»", () => {
  assert.equal(coTep(0), "1 KB");
  assert.equal(coTep(350 * 1024), "350 KB");
  assert.equal(coTep(1023 * 1024), "1023 KB");
  assert.equal(coTep(1024 * 1024 - 1), "1 MB"); // làm tròn ra 1024 KB thì đổi sang MB, không hiện «1024 KB»
  assert.equal(coTep(1024 * 1024), "1 MB");
  assert.equal(coTep(Math.round(1.24 * 1024 * 1024)), "1,2 MB");
  assert.equal(coTep(10 * 1024 * 1024), "10 MB");
});

test("nhanTep: ảnh đánh số theo thứ tự trong tin, PDF ghi «Tệp PDF», kèm cỡ", () => {
  assert.equal(nhanTep(tep("a", "DA_LUU", "jpg", 350 * 1024), 1), "Ảnh 1 · 350 KB");
  assert.equal(nhanTep(tep("b", "DA_LUU", "heic", 2 * 1024 * 1024), 2), "Ảnh 2 · 2 MB");
  assert.equal(nhanTep(tep("c", "DA_LUU", "pdf", Math.round(1.2 * 1024 * 1024)), 3), "Tệp PDF · 1,2 MB");
});

test("cauTrangThaiTep: chỉ tệp chưa xem được mới có câu; đã lưu ⇒ null", () => {
  assert.equal(cauTrangThaiTep("DA_LUU"), null);
  assert.equal(cauTrangThaiTep("DANG_TAI"), "Đang tải tệp…");
  assert.equal(cauTrangThaiTep("CHUA_TAI_DUOC"), "Tệp chưa tải lên được");
  assert.equal(cauTrangThaiTep("DA_GO"), "Tệp đã được gỡ");
});

test("cauTepLoi: 0 ⇒ null; có số thì nói rõ tin đã gửi, tệp nào chưa lên", () => {
  assert.equal(cauTepLoi(0), null);
  assert.match(cauTepLoi(1) ?? "", /^Tin đã gửi, nhưng 1 tệp chưa tải lên được/);
  assert.match(cauTepLoi(3) ?? "", /3 tệp/);
});

test("duongTep: đường tải qua máy chủ (có kiểm quyền), mã được mã hoá", () => {
  assert.equal(duongTep("v 1", "t/2"), "/api/feedback/v%201/tep/t%2F2");
});

test("kichThuocThuNho: cạnh dài ≤ 2000 giữ nguyên; lớn hơn thì thu theo tỉ lệ, làm tròn, không về 0", () => {
  assert.equal(CANH_DAI_TOI_DA, 2000);
  assert.deepEqual(kichThuocThuNho(1200, 800), { rong: 1200, cao: 800 });
  assert.deepEqual(kichThuocThuNho(2000, 2000), { rong: 2000, cao: 2000 });
  assert.deepEqual(kichThuocThuNho(4032, 3024), { rong: 2000, cao: 1500 });
  assert.deepEqual(kichThuocThuNho(1179, 2556), { rong: 923, cao: 2000 });
  assert.deepEqual(kichThuocThuNho(10000, 1), { rong: 2000, cao: 1 });
});

test("kiemTepDaChon: sai loại, quá số tệp, quá tổng byte, quá tổng chuỗi base64 (không bao giờ lỏng hơn máy chủ)", () => {
  assert.equal(kiemTepDaChon([]), null);
  assert.equal(kiemTepDaChon([{ loai: "jpg", kichThuoc: 10 }, { loai: null, kichThuoc: 10 }]), CAU_SAI_LOAI);
  assert.equal(kiemTepDaChon(Array.from({ length: TEP_MOI_TIN + 1 }, () => ({ loai: "png" as const, kichThuoc: 10 }))), CAU_QUA_SO_TEP);
  assert.equal(kiemTepDaChon([{ loai: "pdf", kichThuoc: TONG_BYTE_MOI_TIN + 1 }]), CAU_QUA_TONG);
  assert.equal(kiemTepDaChon([{ loai: "pdf", kichThuoc: TONG_BYTE_MOI_TIN }]), null);
  // 5 tệp, tổng byte ĐÚNG trần, nhưng mỗi tệp lẻ 1 byte ⇒ tổng chuỗi base64 vượt trần máy chủ: máy chủ trả 413, máy phải báo trước.
  const le = Math.floor(TONG_BYTE_MOI_TIN / 5);
  const nam = [le + 1, le, le, le, TONG_BYTE_MOI_TIN - 4 * le - 1].map((n) => ({ loai: "jpg" as const, kichThuoc: n }));
  assert.equal(nam.reduce((s, x) => s + x.kichThuoc, 0), TONG_BYTE_MOI_TIN);
  assert.ok(nam.reduce((s, x) => s + doDaiBase64(x.kichThuoc), 0) > TOI_DA_BASE64_TIN);
  assert.equal(kiemTepDaChon(nam), CAU_QUA_TONG);
});

test("CAU_CAN_CHU: đúng câu đặc tả", () => {
  assert.equal(CAU_CAN_CHU, "Hãy viết vài chữ kèm tệp.");
});

test("maBase64: khứ hồi với giaiBase64 của máy chủ, kể cả mảng lớn hơn một khúc mã", () => {
  for (const n of [1, 2, 3, 4, 100, 70_000]) {
    const b = new Uint8Array(n).map((_, i) => (i * 37 + 11) & 0xff);
    const s = maBase64(b);
    assert.equal(s.length, doDaiBase64(n));
    assert.deepEqual(giaiBase64(s), b);
  }
});

test("tinDoiTep: vẽ lại khi một tin ĐÃ CÓ đổi trạng thái tệp, thêm hay bớt tệp; tin mới hoàn toàn không tính (đã có nhánh tin mới)", () => {
  const cu = [tin("m1", [tep("a", "DANG_TAI")]), tin("m2", [])];
  assert.equal(tinDoiTep(cu, [tin("m1", [tep("a", "DANG_TAI")])]), false);
  assert.equal(tinDoiTep(cu, [tin("m1", [tep("a", "DA_LUU")])]), true);
  assert.equal(tinDoiTep(cu, [tin("m1", [])]), true);
  assert.equal(tinDoiTep(cu, [tin("m2", [tep("b", "DA_LUU")])]), true);
  assert.equal(tinDoiTep(cu, [tin("m9", [tep("c", "DA_LUU")])]), false);
  assert.equal(tinDoiTep(cu, []), false);
});

test("khoaTepCuaTin: theo thứ tự máy chủ trả, gồm mã và trạng thái", () => {
  assert.equal(khoaTepCuaTin({ tep: [tep("a", "DA_LUU"), tep("b", "DA_GO")] }), "a:DA_LUU|b:DA_GO");
  assert.equal(khoaTepCuaTin({ tep: [] }), "");
});
