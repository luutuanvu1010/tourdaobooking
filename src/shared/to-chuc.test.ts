// Luật thuần của tổ chức trên phiếu đăng ký (ADR-0212 Đ4; đợt 2 Task 5; Review Focus 1, 2 của kế hoạch).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuanHoaMaSoThue, chuanHoaSoGpkd, kiemPhanToChuc, type DanhMucGiayToToChuc } from "./to-chuc.ts";
import { chuanHoaSo } from "./giay-to.ts";

const HOM_NAY = "2026-11-16";
const DM: DanhMucGiayToToChuc = {
  loai: new Map([
    ["GPKD", { hasExpiry: false, active: true }],
    ["TRAVEL_DOMESTIC", { hasExpiry: true, active: true }],
    ["ACCOMMODATION", { hasExpiry: true, active: false }],
  ]),
};
const du = (doi: Record<string, unknown> = {}): Record<string, unknown> => ({ tenToChuc: "Công ty Thử", soGpkd: "41A8 001234", duocUyQuyen: true, ...doi });

test("mã số thuế (Review Focus 1): bỏ khoảng trắng, giữ hậu tố chi nhánh; hai cách viết cùng một mã ⇒ cùng khoá", () => {
  assert.deepEqual(chuanHoaMaSoThue(" 0123 456 789 "), { hien: "0123456789", khoa: "0123456789" });
  assert.deepEqual(chuanHoaMaSoThue("0123456789"), { hien: "0123456789", khoa: "0123456789" });
  const chiNhanh = chuanHoaMaSoThue("0123456789-001");
  assert.deepEqual(chiNhanh, { hien: "0123456789-001", khoa: "0123456789-001" });
  for (const cach of ["0123456789 - 001", "0123456789001", " 0123 456 789-001 "]) assert.equal(chuanHoaMaSoThue(cach)?.khoa, chiNhanh!.khoa, cach);
  assert.notEqual(chuanHoaMaSoThue("0123456789-001")!.khoa, chuanHoaMaSoThue("0123456789")!.khoa, "hậu tố chi nhánh là mã khác");
  for (const sai of ["012345678", "01234567890", "0123456789-01", "0123A56789", "abc", "", "0123456789--001"]) assert.equal(chuanHoaMaSoThue(sai), null, sai);
});

test("số GPKD (Review Focus 2): luật number_key của giấy tờ cá nhân; chữ thường, gạch, khoảng trắng ⇒ cùng khoá", () => {
  const a = chuanHoaSoGpkd("41A8 001234");
  const b = chuanHoaSoGpkd("41a8-001234");
  assert.equal(a?.khoa, "41A8001234");
  assert.equal(b?.khoa, a?.khoa);
  assert.equal(a?.khoa, chuanHoaSo("41A8 001234"), "cùng một luật với giấy tờ cá nhân");
  assert.equal(a?.hien, "41A8 001234");
  for (const sai of ["", "   ", "Số Đặc Biệt", "41A8#001", "X".repeat(41)]) assert.equal(chuanHoaSoGpkd(sai), null, sai);
});

test("kiemPhanToChuc: tối thiểu (tên, số GPKD, xác nhận) qua; chuẩn hoá mã số thuế, GPKD, điện thoại, email", () => {
  const r = kiemPhanToChuc(du({ maSoThue: "0123456789 001", dienThoai: "+84 912 345 678", emailHoaDon: " HD@Example.com ", tenPhapLy: "  CÔNG TY  TNHH THỬ ", ngayCapGpkd: "2020-01-02" }), DM, HOM_NAY);
  assert.ok(r.ok, !r.ok ? r.message : "");
  assert.equal(r.value.taxCode, "0123456789-001");
  assert.equal(r.value.taxKey, "0123456789-001");
  assert.equal(r.value.gpkdKey, "41A8001234");
  assert.equal(r.value.phoneKey, "0912345678");
  assert.equal(r.value.invoiceEmail, "hd@example.com");
  assert.equal(r.value.legalName, "CÔNG TY TNHH THỬ");
  assert.equal(r.value.extraTypeCode, null);
  const toiThieu = kiemPhanToChuc(du(), DM, HOM_NAY);
  assert.ok(toiThieu.ok);
  assert.equal(toiThieu.value.taxCode, null);
});

test("kiemPhanToChuc: thiếu / sai ⇒ câu báo, không nhắc lại giá trị đã khai", () => {
  const ca: [Record<string, unknown>, RegExp][] = [
    [du({ tenToChuc: "" }), /Tên tổ chức/],
    [du({ soGpkd: undefined }), /bắt buộc/],
    [du({ soGpkd: "41A8#77777" }), /chữ số và chữ cái/],
    [du({ maSoThue: "012345678" }), /Mã số thuế/],
    [du({ maSoThue: 123 }), /Mã số thuế/],
    [du({ dienThoai: "12345" }), /điện thoại/],
    [du({ emailHoaDon: "khong-phai-email" }), /Email/],
    [du({ duocUyQuyen: undefined }), /cho phép đăng ký thay/],
    [du({ duocUyQuyen: "true" }), /cho phép đăng ký thay/],
    [du({ ngayCapGpkd: "2099-01-01" }), /sau hôm nay/],
    [du({ soGiayPhep: "GP 1" }), /Chọn loại giấy phép/],
    [du({ loaiGiayPhep: "GPKD" }), /danh mục/],
    [du({ loaiGiayPhep: "ACCOMMODATION" }), /danh mục/],
    [du({ loaiGiayPhep: "KHONG_CO" }), /danh mục/],
    [du({ loaiGiayPhep: "TRAVEL_DOMESTIC", ngayCapGiayPhep: "2024-01-01", hetHanGiayPhep: "2023-01-01" }), /từ ngày cấp/],
  ];
  for (const [b, re] of ca) {
    const r = kiemPhanToChuc(b, DM, HOM_NAY);
    assert.equal(r.ok, false, JSON.stringify(b));
    if (!r.ok) {
      assert.match(r.message, re, JSON.stringify(b));
      for (const v of ["012345678", "41A8#77777", "12345", "khong-phai-email"]) assert.equal(r.message.includes(v), false, "câu báo nhắc lại giá trị");
    }
  }
});

test("kiemPhanToChuc: giấy phép thêm đủ trường; loại không hạn thì không nhận ngày hết hạn", () => {
  const r = kiemPhanToChuc(du({ loaiGiayPhep: "TRAVEL_DOMESTIC", soGiayPhep: "gp-79/2024", ngayCapGiayPhep: "2024-01-01", noiCapGiayPhep: "Cục Du lịch", hetHanGiayPhep: "2029-01-01" }), DM, HOM_NAY);
  assert.ok(r.ok, !r.ok ? r.message : "");
  assert.deepEqual(
    [r.value.extraTypeCode, r.value.extraNumber, r.value.extraKey, r.value.extraIssuedDate, r.value.extraIssuedPlace, r.value.extraExpiryDate],
    ["TRAVEL_DOMESTIC", "gp-79/2024", "GP792024", "2024-01-01", "Cục Du lịch", "2029-01-01"],
  );
  const dm2: DanhMucGiayToToChuc = { loai: new Map([["KHONG_HAN", { hasExpiry: false, active: true }]]) };
  assert.equal(kiemPhanToChuc(du({ loaiGiayPhep: "KHONG_HAN", hetHanGiayPhep: "2030-01-01" }), dm2, HOM_NAY).ok, false);
});

// ADR-0213 Đ8.1 (mốc B1 Task 12): ai bấm «Gửi đơn» lên Tour Đảo.
test("duocGuiLenTourDao: đơn tư cách tổ chức chỉ người quản lý có hiệu lực; còn lại người lập", async () => {
  const { duocGuiLenTourDao } = await import("./to-chuc.ts");
  assert.equal(duocGuiLenTourDao({ tuCach: "TO_CHUC", laNguoiLap: true, laQuanLyCoHieuLuc: true }), true);
  assert.equal(duocGuiLenTourDao({ tuCach: "TO_CHUC", laNguoiLap: false, laQuanLyCoHieuLuc: true }), true);
  assert.equal(duocGuiLenTourDao({ tuCach: "TO_CHUC", laNguoiLap: true, laQuanLyCoHieuLuc: false }), false, "thành viên / người quản lý mất hiệu lực");
  assert.equal(duocGuiLenTourDao({ tuCach: "TO_CHUC", laNguoiLap: false, laQuanLyCoHieuLuc: false }), false);
  for (const tuCach of ["CA_NHAN", null] as const) {
    assert.equal(duocGuiLenTourDao({ tuCach, laNguoiLap: true, laQuanLyCoHieuLuc: false }), true, `${tuCach}: người lập như hôm nay`);
    assert.equal(duocGuiLenTourDao({ tuCach, laNguoiLap: false, laQuanLyCoHieuLuc: true }), false, `${tuCach}: người quản lý không gửi đơn cá nhân của người khác`);
  }
});

// ---- ADR-0213 Đ7 (mốc B2, Task 15): mã vào tổ chức ----
import { BANG_CHU_MA_VAO, CAU_TRAN_THEO_SO, cauTaoLoiMoi, chuanHoaMaVao, hienMaVao, sinhMaVao } from "./to-chuc.ts";

test("mã vào tổ chức: bảng chữ bỏ 0 O 1 I L; sinhMaVao ra đúng 8 ký tự trong bảng, bỏ byte rơi vào phần dư; thiếu byte thì ném", () => {
  for (const c of "0O1IL") assert.equal(BANG_CHU_MA_VAO.includes(c), false, c);
  assert.equal(BANG_CHU_MA_VAO.length, 31);
  for (let i = 0; i < 200; i++) {
    const ma = sinhMaVao(crypto.getRandomValues(new Uint8Array(32)));
    assert.match(ma, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  }
  // 248..255 bị bỏ; 0 → '2', 30 → 'Z', 31 → '2'
  assert.equal(sinhMaVao(new Uint8Array([255, 248, 0, 30, 31, 1, 2, 3, 4, 5])), "2Z234567");
  assert.throws(() => sinhMaVao(new Uint8Array([255, 255, 255, 0, 1])));
});

test("chuanHoaMaVao: «ab12cd34», «AB12 CD34», «ab12-cd34» ra cùng AB12CD34; sai khuôn ⇒ null (Review Focus 3)", () => {
  for (const g of ["ab12cd34", "AB12 CD34", "ab12-cd34", " AB12-CD34 ", "Ab12\tcD34"]) assert.equal(chuanHoaMaVao(g), "AB12CD34", g);
  for (const g of ["AB12CD3", "AB12CD345", "AB12CĐ34", "AB12_CD34", "", 12345678, null, undefined]) assert.equal(chuanHoaMaVao(g), null, String(g));
  assert.equal(hienMaVao("AB12CD34"), "AB12-CD34");
});

test("câu trả lời của lệnh tạo lời mời đúng nguyên văn Đ7.1; câu vượt trần theo số đúng nguyên văn Đ7.3, không chứa mã", () => {
  assert.equal(cauTaoLoiMoi("AB23CD45", "23/11/2026"), "Đã tạo lời mời. Mã: AB23-CD45, dùng được tới 23/11/2026. Hãy gửi mã này cho người được mời.");
  assert.equal(CAU_TRAN_THEO_SO, "Chưa tạo được lời mời cho số này lúc này, hãy thử lại sau");
});
