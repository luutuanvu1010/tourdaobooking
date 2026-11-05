import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_DANG_CHO_XAC_NHAN, STATUS_LABEL, cauKhongDoiDuocTrangThai, nhanNgan, trangThaiHienThi } from "./order-status-label.ts";

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

test("STATUS_LABEL (ADR-0166 câu 5): đơn nháp chưa gửi kiểm vé ghi 'Chưa xác nhận'; 'Chờ xác nhận' là hằng riêng cho đơn đã gửi", () => {
  assert.equal(STATUS_LABEL.draft, "Chưa xác nhận");
  assert.equal(NHAN_DANG_CHO_XAC_NHAN, "Chờ xác nhận");
  assert.deepEqual(STATUS_LABEL, { draft: "Chưa xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" });
});

test("trangThaiHienThi + cờ dangCho: nháp có cờ → 'Chờ xác nhận', không cờ / cờ false / null → 'Chưa xác nhận'; khoá luôn 'draft' (màu không đổi)", () => {
  assert.deepEqual(trangThaiHienThi({ status: "draft", dangCho: true }), { khoa: "draft", nhan: "Chờ xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "draft", dangCho: false }), { khoa: "draft", nhan: "Chưa xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "draft", dangCho: null }), { khoa: "draft", nhan: "Chưa xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "draft" }), { khoa: "draft", nhan: "Chưa xác nhận" });
});

test("trangThaiHienThi: cờ dangCho bị bỏ qua với đơn đã xác nhận / đã huỷ / đã giao / hoàn thành", () => {
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", dangCho: true }), { khoa: "confirmed", nhan: "Đã xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "cancelled", dangCho: true }), { khoa: "cancelled", nhan: "Đã huỷ" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: "x", dangCho: true }), { khoa: "delivered", nhan: "Đã thu đủ sau dịch vụ" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: "x", completedAt: "y", dangCho: true }), { khoa: "completed", nhan: "Hoàn thành" });
});

test("trangThaiHienThi (ADR-0025 đ9): hai mốc sổ tiền suy ra nhãn 'Đã giao – đã thu đủ' / 'Hoàn thành'; không lộ mã delivered/completed ra chữ", () => {
  assert.deepEqual(trangThaiHienThi({ status: "draft" }), { khoa: "draft", nhan: "Chưa xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: null }), { khoa: "confirmed", nhan: "Đã xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: "x" }), { khoa: "delivered", nhan: "Đã thu đủ sau dịch vụ" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: "x", completedAt: "y" }), { khoa: "completed", nhan: "Hoàn thành" });
  assert.deepEqual(trangThaiHienThi({ status: "cancelled" }), { khoa: "cancelled", nhan: "Đã huỷ" });
});

test("chỗ chật ghi «Xong và đủ tiền» cho đơn đã thu đủ sau dịch vụ; nhãn khác giữ nguyên (chủ 2026-11-05)", () => {
  assert.equal(nhanNgan(trangThaiHienThi({ status: "confirmed", deliveredAt: "x" })), "Xong và đủ tiền");
  assert.equal(nhanNgan(trangThaiHienThi({ status: "confirmed", deliveredAt: "x", completedAt: "y" })), "Hoàn thành");
  assert.equal(nhanNgan(trangThaiHienThi({ status: "confirmed" })), STATUS_LABEL.confirmed);
});
