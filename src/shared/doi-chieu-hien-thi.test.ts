import { test } from "node:test";
import assert from "node:assert/strict";
import { NGAY_NHAC_DOI_CHIEU_HIEN_THI, cauNhacKhoan, quaHanDoiChieu, soNgayCho, tieuDeDemDoiChieu } from "./doi-chieu-hien-thi.ts";
import { SO_NGAY_NHAC_DOI_CHIEU, nhacDoiChieu } from "../modules/billing/rules.ts";

test("số ngày nhắc của giao diện bằng số của máy chủ; ranh 3 ngày / 4 ngày khớp nhacDoiChieu", () => {
  assert.equal(NGAY_NHAC_DOI_CHIEU_HIEN_THI, SO_NGAY_NHAC_DOI_CHIEU);
  for (const [khai, qua] of [["2026-10-17", false], ["2026-10-16", true], ["2026-10-20", false]] as const) {
    assert.equal(quaHanDoiChieu(soNgayCho(`${khai}T05:00:00.000Z`, new Date("2026-10-20T05:00:00.000Z"))), qua, khai);
    assert.equal(nhacDoiChieu({ homNay: "2026-10-20", ngayKhai: khai }), qua);
  }
});

test("soNgayCho tính theo ngày giờ Việt Nam: 18:00 UTC đã là ngày hôm sau ở Việt Nam", () => {
  assert.equal(soNgayCho("2026-10-16T18:00:00.000Z", new Date("2026-10-17T05:00:00.000Z")), 0);
  assert.equal(soNgayCho("2026-10-16T05:00:00.000Z", new Date("2026-10-17T05:00:00.000Z")), 1);
});

test("câu nhắc: có tên người khai, số tiền, số ngày; không số điện thoại / tài khoản / mã giao dịch", () => {
  assert.equal(cauNhacKhoan({ nguoiKhai: "Nam HDV", soTienDaDinhDang: "100.000 ₫", soNgay: 4 }), "Nam HDV khai 100.000 ₫ — đã chờ 4 ngày, quá 3 ngày, cần đối chiếu.");
  assert.equal(cauNhacKhoan({ nguoiKhai: "Nam HDV", soTienDaDinhDang: "100.000 ₫", soNgay: 3 }), "Nam HDV khai 100.000 ₫ — đã chờ 3 ngày.");
  assert.equal(cauNhacKhoan({ nguoiKhai: null, soTienDaDinhDang: "50.000 ₫", soNgay: 0 }), "Khai 50.000 ₫ — mới khai hôm nay.");
  assert.doesNotMatch(cauNhacKhoan({ nguoiKhai: "A", soTienDaDinhDang: "1 ₫", soNgay: 9 }), /\d{8,}/);
  assert.equal(tieuDeDemDoiChieu(2), "2 khoản đang đối chiếu quá 3 ngày"); // Task 12: gồm khoản khách trả cho đại lý / tại quầy (có thể tiền mặt) — bỏ chữ «chuyển khoản»
});
