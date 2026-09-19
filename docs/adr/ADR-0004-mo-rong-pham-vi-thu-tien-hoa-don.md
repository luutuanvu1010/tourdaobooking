# ADR-0004 — Mở rộng phạm vi: ghi nhận thu tiền, kế toán và yêu cầu hoá đơn (sửa SPEC §1)

- **Trạng thái:** proposed (bản 3, sau hai lượt rà soát độc lập 2026-09-20)
- **Ngày:** 2026-09-20   **Người phê chuẩn:** chủ dự án (chờ duyệt)
- **Loại quyết định:** **cửa hai chiều về phạm vi tính năng** (có thể rút tính năng; dữ liệu thu tiền đã ghi là chỉ-thêm nên không mất). **Thay đổi schema `orders` (gỡ ba cột cọc) là cửa một chiều** và cần ADR riêng ở N3 (Điều 7.2).
- **Liên quan:** ADR-0001, ADR-0005, ADR-0007; SPEC §1

## Bối cảnh
`docs/SPEC-tourdao-sales.md` §1 (dòng 19–23) nói hệ thống **không phải** kế toán/hoá đơn điện tử, **không phải** hệ thống thanh toán (chỉ ghi nhận một khoản cọc và hình thức), không tính thuế. Chủ dự án (2026-09-20) yêu cầu trả lời "đã trả chưa, trả như thế nào, bao nhiêu, hình thức gì", "có yêu cầu xuất hoá đơn không", và có vai **Kế toán**. Theo P4, ranh giới ở SPEC không được lặng lẽ bị phá: phải sửa chính thức.

## Quyết định
Sửa ranh giới của SPEC §1 như sau (áp dụng khi ADR này được duyệt):
- **Được làm (ghi nhận):** (a) **sổ thu tiền từng lần** và hoàn tiền cho mỗi booking (số tiền, hình thức, người thu, nơi thu, thời điểm, ghi chú); (b) **yêu cầu xuất hoá đơn** kèm thông tin xuất (tên đơn vị, mã số thuế, địa chỉ, email nhận) và trạng thái *chưa yêu cầu / cần xuất / đã xuất* (kế toán ghi số hoá đơn, ngày, người). "Không có dòng yêu cầu" nghĩa là chưa yêu cầu; số yêu cầu tối đa mỗi đơn do đặc tả N3 quyết; (c) vai **Kế toán** với quyền tương ứng (ADR-0005, ADR-0007).
- **Vẫn KHÔNG làm:** xuất hoá đơn điện tử hoặc tích hợp nhà cung cấp hoá đơn; tính thuế; tích hợp cổng thanh toán; đối soát ngân hàng; **công nợ đại lý** và giá net cho đại lý (hoãn; giá net cho HDV ở N4).

## Lý do
- Trả lời được các câu hỏi vận hành hàng ngày là lý do tồn tại của thay đổi; ghi nhận (không thực thi) giữ rủi ro pháp lý và kỹ thuật thấp (P11).
- Danh sách "vẫn KHÔNG làm" ghi rõ để chống trượt phạm vi dần dần.

## Phương án bị loại
- **Giữ ranh giới cũ** (một khoản cọc, không hoá đơn): không đáp ứng câu hỏi hàng ngày; kế toán vẫn phải hỏi lại nhân viên bán.
- **Tích hợp xuất hoá đơn điện tử:** cần nhà cung cấp, chữ ký số, quy định thuế; đảo ngược ranh giới "không phải kế toán" — vượt phạm vi.
- **Công nợ đại lý ngay từ v1:** chủ dự án đã chọn sổ thu tiền từng lần, chưa công nợ (2026-09-20).

## Hệ quả
- Module `billing` mới (ADR-0002) sở hữu `bil_*`; thiết kế bảng ở đặc tả N3, kèm một ADR riêng cho "sổ thu tiền chỉ-thêm, sai thì đảo" khi N3 bắt đầu.
- **Việc phải làm khi accepted (P4):** sửa văn bản `SPEC-tourdao-sales.md` §1 và "Lịch sử thay đổi"; cập nhật `HANDOFF-M4.md`.
- **Hai nguồn "đã trả" (N7 hạng có điều kiện):** ba cột `orders.deposit_amount`, `deposit_method`, `remaining_amount` (nằm trong thân các trigger của `0007`, nên gỡ chúng phải dựng lại trigger và bảng đang bị `order_item`/`order_service`/`audit_log` tham chiếu) sẽ được thay bằng dữ liệu dẫn xuất từ sổ thu tiền. N3 phải làm **cùng một lần triển khai** với việc thêm `bil_payment_receipt`; nếu không thể, phải ghi Nợ hiến pháp theo mẫu 5.8 (`CONSTITUTION.md`) với hạn trả cụ thể.
