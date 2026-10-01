# ADR-0029 — Lệch có chủ ý, tạm thời, khỏi Hiến chương 5.1 và 5.8 cho các luật của ADR-0027

- **Trạng thái:** **accepted** — chủ dự án trả lời "ok" trong phiên chat 2026-09-26 cho khuyến nghị dưới đây. AI ghi lại, không tự quyết (Hiến chương `docs/ARCHITECTURE.md` dòng "Cách dùng", mục (b): muốn lệch khỏi một điều khoản phải có ADR ghi "lệch có chủ ý" + chủ duyệt). **Điều 2 (lệch 5.8, vế trần giảm giá) bị sửa và gia hạn có điều kiện bởi [ADR-0079](ADR-0079-phieu-da-giao-thuong-mai.md)** (duyệt 2026-10-01, câu C11 = A): giữ ở máy chủ, thêm kiểm định kỳ báo lỗi, xét lại cùng lệch L-C1.
- **Ngày:** 2026-09-26   **Loại:** cửa **hai chiều** — không đổi mã, không đổi dữ liệu; chỉ ghi lại hiện trạng của bản 1.14 và điều kiện gỡ lệch.
- **Nguồn:** rà lại yêu cầu đầu phiên vá ba phát hiện kiểm toán (DK-T3-01, DK-T3-02, DK-T4-02). Yêu cầu có dặn đọc Hiến chương 5.1 và 5.8; người thi công **không đọc trước khi làm**, chỉ đối chiếu sau khi bản 1.14 đã lên production (tự nhận, ghi ở `docs/superpowers/plans/2026-09-26-va-3-loi-kiem-toan-nhat-ky.md`).

## Câu hỏi và lời chủ dự án (nguyên văn)
AI trình (2026-09-26):
- *"Mục 5.8: khuyến nghị giữ như hiện nay và ghi thành điều đã biết. Chỉ nhân viên nội bộ mới vượt được luật, và đó là quyết định có chủ ý của họ; đơn Đối tác mới vốn đã bị chặn ngay từ lúc lập."*
- *"Mục 5.1: khuyến nghị chưa thêm lớp cơ sở dữ liệu cho "ngừng nhập tay", vì bạn nói sẽ mở lại khi cần. Ghi rõ đây là chính sách tạm."*
- Gộp lại ở tin sau: *"Bổ sung bài kiểm lỗi PIN, và giữ nguyên chỗ đối chiếu Hiến chương, ghi là chính sách tạm? Tôi khuyến nghị: đồng ý cả hai."*

Chủ dự án: *"ok"*.

## Quyết định
**1. Lệch 5.1 ("bất biến có hai lớp: cơ sở dữ liệu và mã").** Ba luật của ADR-0027 chỉ được giữ ở **mã máy chủ**, không có lớp cơ sở dữ liệu (trigger, `CHECK`, điều kiện trong câu ghi), và `scripts/audit-checks.mjs` không có kiểm bất biến tương ứng:
   - ngừng dịch vụ nhập tay (`manualFreezeViolation`, `src/modules/orders/price-guards.ts`, gọi ở `POST/PUT /api/orders`);
   - giá danh mục và trần giảm giá của tài khoản có quyền Đối tác (`retailPricesOnly`, `discountWithinCap`; gọi ở `POST/PUT /api/orders` và nhánh xác nhận của `POST /api/orders/:id/status`);
   - hướng dẫn viên không huỷ tour đã qua ngày đi (409 `departed`, `POST /api/orders/:id/handler-cancel`, `src/modules/dispatch/index.ts`).

   Đây là **chính sách tạm**: chủ đã nói nhập tay *"sẽ mở lại khi cần thiết"* (ADR-0027 lời 1), và trần giảm giá còn chờ bảng chiết khấu (ADR-0027 điều 2b).

**2. Lệch 5.8 ("quyền làm một bước xét theo vai của người đó trên chính đối tượng").** Luật giá Đối tác (ADR-0027 điều 2) xét theo **quyền của người đang thao tác** (`holdsPartner(staff)`, `src/shared/permissions.ts`), không theo vai **bên đặt** của đơn.
   - Hệ quả đã biết, chấp nhận: nhân viên nội bộ sửa hoặc xác nhận một đơn do Đối tác lập vẫn đặt được đơn giá khác giá danh mục hoặc giảm giá. Đó là quyết định có chủ ý của người nội bộ đó, có nhật ký. Đơn do Đối tác lập hoặc sửa thì bị chặn ngay từ lúc lập.
   - Mốc huỷ của hướng dẫn viên (ADR-0027 điều 3) xét theo **người phụ trách của đơn** (`isAssigned`) nên **khớp** 5.8, không thuộc phần lệch.

## Khi nào gỡ lệch (phải qua ADR mới do chủ duyệt)
- **5.1:** khi chủ chốt nhập tay **ngừng hẳn** (không mở lại) → thêm lớp cơ sở dữ liệu (migration mới) cho luật đó; nếu chủ **mở lại** nhập tay thì gỡ luật, lệch tự hết. Luật giá Đối tác: xem lại cùng lúc với bảng chiết khấu.
- **5.8:** khi có bảng chiết khấu theo từng đối tác (ADR-0018 §11). Lúc đó trần giảm giá là của **đối tác trên đơn**, nên luật giá nên chuyển sang xét theo bên đặt của đơn. Đây mới là gợi ý của AI; quyết định thuộc ADR lúc đó.

## Hệ quả
- Không đổi mã, không phát hành. `docs/SYSTEM-DESIGN.md` §16 có dòng trỏ về ADR này.
- Người làm việc sau chạm luật giá hoặc dịch vụ nhập tay: đọc ADR-0027 **kèm** ADR này, đừng coi việc thiếu lớp cơ sở dữ liệu là sơ suất cần tự vá.
