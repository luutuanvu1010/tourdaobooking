// Cổng "phải chọn đón" ở cửa xác nhận (ADR-0134 Đ2): chưa chọn; chọn Đón mà 0 chặng mở; chọn Không đón mà còn chặng mở → chỉ số dịch vụ lỗi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauThieuChonDon, thieuChonDon } from "./cong-chon-don.ts";

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
