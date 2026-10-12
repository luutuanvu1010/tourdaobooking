import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUS_LABEL, cauKhongDoiDuocTrangThai, trangThaiHienThi } from "./order-status-label.ts";

// Task 14, nợ (g): câu 409 `invalid_transition` dựng từ MỘT bảng nhãn; quét MỌI cặp trạng thái để không mã thô nào lọt (kể cả trạng thái thêm sau này vào bảng).
test("cauKhongDoiDuocTrangThai: mọi cặp trạng thái — câu tiếng Việt, nhãn lấy từ STATUS_LABEL, không lộ mã thô", () => {
  const ma = Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[];
  for (const tu of ma) {
    for (const sang of ma) {
      const cau = cauKhongDoiDuocTrangThai(tu, sang);
      for (const m of ma) assert.ok(!new RegExp(`\\b${m}\\b`, "i").test(cau), `${tu}→${sang}: lộ mã thô «${m}»: ${cau}`);
      assert.ok(cau.includes(`“${STATUS_LABEL[tu]}”`), `${tu}→${sang}: nêu trạng thái hiện tại bằng nhãn`);
      if (tu === sang) assert.equal(cau, `Đơn đã ở trạng thái “${STATUS_LABEL[tu]}” rồi.`);
      else assert.equal(cau, `Đơn đang ở trạng thái “${STATUS_LABEL[tu]}”, không thể chuyển sang “${STATUS_LABEL[sang]}”.`);
    }
  }
});

test("STATUS_LABEL (ADR-0030 điều 3, Q-A2): 'Chờ xác nhận' thay 'Nháp' — đơn mới không tự gắn người phụ trách", () => {
  assert.equal(STATUS_LABEL.draft, "Chờ xác nhận");
  assert.deepEqual(STATUS_LABEL, { draft: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" });
});

test("trangThaiHienThi (ADR-0025 đ9): hai mốc sổ tiền suy ra nhãn 'Đã giao – đã thu đủ' / 'Hoàn thành'; không lộ mã delivered/completed ra chữ", () => {
  assert.deepEqual(trangThaiHienThi({ status: "draft" }), { khoa: "draft", nhan: "Chờ xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: null }), { khoa: "confirmed", nhan: "Đã xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: "x" }), { khoa: "delivered", nhan: "Đã giao – đã thu đủ" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: "x", completedAt: "y" }), { khoa: "completed", nhan: "Hoàn thành" });
  assert.deepEqual(trangThaiHienThi({ status: "cancelled" }), { khoa: "cancelled", nhan: "Đã huỷ" });
});
