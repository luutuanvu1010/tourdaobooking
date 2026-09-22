# Sửa số khách/dịch vụ/tiền sau xác nhận (ADR-0014 điều 6) — câu hỏi chặn trước khi thi công

> Ngày 2026-09-22, nhánh `kiem-toan-doi-tac`. Viết khi lập kế hoạch Phase B (`docs/HANDOFF-ADR-0014-PHASE-BCD.md`). Đây KHÔNG phải một đặc tả đầy đủ — chỉ ghi lại xung đột phát hiện được và các phương án, để chủ dự án chọn trước khi phần này được thi công. Phần còn lại của Phase B (huỷ đơn cho `FIELD`, ADR-0014 điều 11) **không bị chặn**, đã tách ra kế hoạch riêng và thi công trước — xem `docs/superpowers/plans/2026-09-22-adr-0014-phase-b-thi-cong.md`.

## 1. Vấn đề

ADR-0014 điều 6 quyết **ai** được sửa số khách/dịch vụ/tiền của đơn **đã xác nhận** (`FIELD` đang phụ trách, thêm vào `SALES`/`ACCOUNTING`/`ADMIN` đã có) và chọn cách ghi: "không sửa đè, ghi dòng điều chỉnh chỉ-thêm (ai, khi nào, vì sao, trước→sau)". Nhưng **cách làm cụ thể** (bảng nào, trigger nào phải đổi) bị hai tài liệu chuẩn tắc đã duyệt khoá lại:

- **ADR-0007 (accepted) mục "Hệ quả"** nói thẳng: *"Cho tới khi N3 có bản ghi trước → sau, khoá của A1 giữ nguyên... không đường nào được nới trước"* và *"Cần ADR/đặc tả riêng ở N3 cho bảng bản ghi thay đổi; ADR này chỉ quyết ai được làm gì"*.
- **ADR-0014 điều 6** (chính ADR đang thi công) cũng ghi: *"Thiết kế bảng 'dòng điều chỉnh' cụ thể thuộc N3 (ADR riêng...)"*.

Nghĩa là: đã có ADR cho phép **ai** được sửa, nhưng **chưa có** ADR cho phép **sửa bằng cách nào** (đổi trigger/bảng dữ liệu).

**Không chỉ là vấn đề giấy tờ — trigger `order_service_frozen_update` (migration `0008`, đang chạy thật) chặn NGAY HÔM NAY** mọi UPDATE số khách hoặc dịch vụ của một đơn không còn nháp; `..._insert`/`..._delete` chặn thêm/bớt dịch vụ. Nghĩa là **không thể** viết route "sửa số khách/dịch vụ của đơn đã xác nhận" nếu không đổi (nới) trigger này trước.

Cách ADR-0007 gợi ý nới trigger (dùng lại "idiom `wonGuard`": trigger tự kiểm có một dòng bản ghi thay đổi đi kèm hay không) **không chạy được như viết**: trigger SQLite không nhận tham số riêng theo từng câu gọi như một câu SQL ứng dụng — `wonGuard` hôm nay chỉ hoạt động vì nó nằm trong mệnh đề `WHERE` của chính câu SQL ứng dụng viết ra (nó biết `auditId` của chính request đó), không phải trong `WHEN` của một trigger (trigger không "biết" request nào đang gọi). Cần thiết kế lại cơ chế, không chỉ áp lại y nguyên gợi ý cũ.

## 2. Vì sao dừng lại hỏi thay vì tự quyết

CLAUDE.md §3: đụng **dữ liệu** (schema, trigger) và **tiền** luôn dừng và hỏi, dù nhỏ; không tự hoà giải xung đột giữa hai tài liệu chuẩn tắc (đây là ADR-0007 nói một đằng — thiết kế thuộc N3 — và tài liệu bàn giao Phase B lại giục làm ngay). Đây đúng loại việc đó, cộng thêm việc gợi ý kỹ thuật cũ trong ADR-0007 không chạy được nên bất kỳ thiết kế nào thay thế là một quyết định kiến trúc MỚI, không phải chỉ triển khai lại quyết định cũ.

## 3. Ba phương án cho chủ dự án chọn

**(a) Ghi riêng, không sửa đè bảng gốc (khuyến nghị nếu muốn làm ngay).**
Bản gốc của đơn (`order_service`, `order_item`, cột tiền của `orders`) giữ nguyên như lúc xác nhận — không đổi, không cần nới trigger `0008` hay trigger tiền chưa có. Mỗi lần hướng dẫn viên sửa, thêm MỘT dòng vào bảng "dòng điều chỉnh" mới (ai, khi nào, vì sao, số khách/dịch vụ/tiền trước → sau). Số "đúng" hiện tại của đơn = bản gốc cộng dồn các dòng điều chỉnh, tính lúc đọc.
- Được: không đụng trigger nào đang bảo vệ dữ liệu; tương thích sẵn với trigger khoá tiền (`order_item_frozen_*`/`orders_money_frozen`) mô tả ở `docs/superpowers/specs/2026-09-22-khoa-tien-don-da-xac-nhan.md` dù trigger đó có được thi công sau hay không.
- Mất: mọi nơi hiển thị số khách/dịch vụ/tiền của đơn (màn chi tiết đơn, bản in xác nhận, nhật ký, `order.history.view`...) phải sửa để cộng dồn thay vì đọc thẳng cột — phạm vi rộng hơn một route.

**(b) Sửa đè tại chỗ, có nới trigger.**
Giữ cách hiển thị hôm nay (đọc thẳng `order_service`/`order_item`), nhưng phải thiết kế lại cơ chế nới trigger `0008` (và trigger tiền nếu được thi công) theo đúng tinh thần ADR-0007 (không đơn giản như gợi ý cũ viết) — ví dụ: trigger kiểm tồn tại một dòng "dòng điều chỉnh" khớp đúng `order_id` VÀ đúng giá trị NEW (không dựa vào tham số phiên như gợi ý cũ).
- Được: không phải sửa lại các nơi hiển thị.
- Mất: cần thiết kế trigger mới (rủi ro cao hơn vì đụng ngay dữ liệu đang chạy thật), và tự nó nên có một ADR riêng vì đổi một bất biến ADR-0007 đã khoá ("không đường nào được nới trước").

**(c) Chưa làm phần sửa số khách/dịch vụ/tiền đợt này.**
Đợt Phase B này chỉ làm phần huỷ đơn cho hướng dẫn viên (ADR-0014 điều 11 — không đụng vấn đề này, xem mục 1 lời mở đầu). Phần sửa tiền chờ N3 làm đầy đủ (sổ thu tiền thật) theo đúng lịch ADR-0007 đã hẹn.

## 4. Khuyến nghị

**(a)** nếu chủ dự án muốn hướng dẫn viên sửa được số khách/dịch vụ/tiền ngay trong đợt này (đúng nhu cầu đã nêu ở ADR-0014 điều 6) — an toàn hơn, không đụng trigger đang bảo vệ dữ liệu thật, đúng tinh thần "không sửa đè" ADR đã chọn. Nếu chọn (a), việc này cần một đặc tả riêng (thiết kế bảng dòng điều chỉnh + chỗ nào phải cộng dồn) và kế hoạch thi công riêng, coi như "việc lớn" độc lập.

**(c)** nếu chưa gấp — dồn phần này vào N3 (sổ thu tiền thật) cho gọn, tránh làm hai lần.

Không khuyến nghị (b) trừ khi chủ dự án có lý do riêng cần giữ nguyên cách hiển thị hôm nay — chi phí thiết kế lại trigger cao hơn.

## 5. Trạng thái

Chờ chủ dự án chọn. Chưa thi công phần này. Phase B tiếp tục với phần không bị chặn (huỷ đơn, điều 11) theo `docs/superpowers/plans/2026-09-22-adr-0014-phase-b-thi-cong.md`.
