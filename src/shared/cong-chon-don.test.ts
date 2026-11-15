// Cổng "phải chọn đón" ở cửa xác nhận (ADR-0134 Đ2): chưa chọn; chọn Đón mà 0 chặng mở; chọn Không đón mà còn chặng mở → chỉ số dịch vụ lỗi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauThieuChonDon, dichVuThieuChonDon, thieuChonDon } from "./cong-chon-don.ts";

test("NULL → [0]; DON + 0 chặng → [0]; KHONG_DON + 1 chặng → [0]", () => {
  assert.deepEqual(thieuChonDon([{ pickupChoice: null, soChangMo: 0 }]), [0]);
  assert.deepEqual(thieuChonDon([{ pickupChoice: null, soChangMo: 2 }]), [0]);
  assert.deepEqual(thieuChonDon([{ pickupChoice: "DON", soChangMo: 0 }]), [0]);
  assert.deepEqual(thieuChonDon([{ pickupChoice: "KHONG_DON", soChangMo: 1 }]), [0]);
});

test("DON + 1 chặng, KHONG_DON + 0 chặng → []; nhiều dịch vụ trả đúng chỉ số", () => {
  assert.deepEqual(thieuChonDon([{ pickupChoice: "DON", soChangMo: 1 }, { pickupChoice: "KHONG_DON", soChangMo: 0 }]), []);
  assert.deepEqual(thieuChonDon([]), []);
  assert.deepEqual(
    thieuChonDon([{ pickupChoice: "DON", soChangMo: 2 }, { pickupChoice: null, soChangMo: 0 }, { pickupChoice: "KHONG_DON", soChangMo: 0 }, { pickupChoice: "DON", soChangMo: 0 }]),
    [1, 3],
  );
});

test("câu lỗi: đúng chữ ADR, số dịch vụ đếm từ 1", () => {
  assert.equal(cauThieuChonDon(0), "Dịch vụ thứ 1 chưa chọn Đón hay Không đón.");
  assert.equal(cauThieuChonDon(2), "Dịch vụ thứ 3 chưa chọn Đón hay Không đón.");
});

// G-02: cùng phép với collect() của form (chonDonTheoNhom rồi thieuChonDon) — chỉ ở cửa Gửi đơn của Đối tác.
test("dichVuThieuChonDon: nhóm tắt đưa đón không bị chặn; null bị chặn; Đón không chặng bị chặn", () => {
  assert.deepEqual(dichVuThieuChonDon([{ choPhep: false, pickupChoice: null, soChang: 0 }]), [], "nhóm tắt → tự Không đón");
  assert.deepEqual(dichVuThieuChonDon([{ choPhep: true, pickupChoice: null, soChang: 0 }]), [0]);
  assert.deepEqual(dichVuThieuChonDon([{ choPhep: true, pickupChoice: "DON", soChang: 0 }]), [0]);
  assert.deepEqual(dichVuThieuChonDon([{ choPhep: true, pickupChoice: "DON", soChang: 1 }, { choPhep: true, pickupChoice: "KHONG_DON", soChang: 0 }, { choPhep: true, pickupChoice: null, soChang: 0 }]), [2]);
});
