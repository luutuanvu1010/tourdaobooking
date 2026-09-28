# Đề xuất sửa `src/CLAUDE.md` dòng 15 và `docs/ARCHITECTURE.md` Phần II theo tên hook mới `ctx.newOrderHandler`

- **Ngày:** 2026-09-27. **Trạng thái:** **CHỜ CHỦ DỰ ÁN DUYỆT** — chưa áp vào tệp luật nào. AI không tự sửa luật chi phối chính mình (Hiến pháp N9; `CLAUDE.md` §3); `src/CLAUDE.md` còn có hàng rào `ask` ở `.claude/settings.json`.
- **Nguồn:** kế hoạch `docs/superpowers/plans/2026-09-27-tu-choi-huy-hdv-thi-cong.md` Task 1.3 ("Đổi **tên** hook là tuỳ người thi công. Nếu đổi tên, `src/CLAUDE.md:15` nhắc tên cũ ⇒ commit **riêng** 'ĐỀ XUẤT — chủ duyệt'"); ADR-0030 S20-4 (accepted) và ADR-0020 điều 1: **giữ và đổi dạng** đường tiêm — lô tạo đơn nhận câu mở dòng `HANDLE` cho **người được chọn**, không bao giờ mặc định người lập.
- **Vì sao đổi tên:** hook cũ `ctx.defaultHandlerStatement(orderId, at)` đặt NGƯỜI LẬP làm người phụ trách **mặc định**. Từ Task 1.3 hook nhận **người được chọn** (`staffId`), đọc tài khoản đó rồi xét bằng `checkAssignee`, trả `Promise<{ ok: true; statements(orderId, at) } | { ok: false; message }>` — khác cả chữ ký lẫn nghĩa; giữ chữ "default" sẽ khiến người đọc sau hiểu nhầm là còn tự gắn. Mã đã dùng tên mới `ctx.newOrderHandler` (commit chính của Task 1.3).
- **Không đổi nghĩa quy tắc nào:** hai dòng dưới chỉ là ví dụ tên hook của cùng một luật (ADR-0007 điều 4(b): `orders` không import `dispatch`, gốc lắp ráp tiêm hàm vào `ctx`). Cho tới khi chủ duyệt, hai dòng cũ còn nguyên — người đọc gặp tên cũ thì hiểu là `ctx.newOrderHandler`.

## Thay đổi 1 — `src/CLAUDE.md` mục "Ranh giới module", dòng 15

```diff
-- `orders` **KHÔNG** import `dispatch`: "đang là người phụ trách" và "đặt người phụ trách mặc định cho đơn mới" do gốc lắp ráp tiêm vào `ctx` (`ctx.isAssigned`, `ctx.defaultHandlerStatement`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
+- `orders` **KHÔNG** import `dispatch`: "đang là người phụ trách" và "mở người phụ trách do người lập chọn cho đơn mới" (đơn mới không bao giờ tự gắn người lập — ADR-0030 S20-4) do gốc lắp ráp tiêm vào `ctx` (`ctx.isAssigned`, `ctx.newOrderHandler`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
```

## Thay đổi 2 — `docs/ARCHITECTURE.md` Phần II, mục "Các tầng và chiều phụ thuộc", gạch 2 (dòng 183)

Tài liệu chuẩn tắc (Hiến chương + luật) nên cũng chỉ đề xuất. Chỉ đổi đúng một cụm trong dòng:

```diff
-(`AppOptions.injected` → `ctx.isAssigned(orderId)`, `ctx.defaultHandlerStatement(orderId, at)`)
+(`AppOptions.injected` → `ctx.isAssigned(orderId)`, `ctx.newOrderHandler(staffId)`)
```

## Cách áp (sau khi chủ duyệt)

AI chép nguyên văn hai thay đổi trên vào hai tệp trên một nhánh, ghi ngày duyệt trong thông điệp commit; chủ gộp bằng `npm run day-len`. Không cần triển khai (chỉ tài liệu).
