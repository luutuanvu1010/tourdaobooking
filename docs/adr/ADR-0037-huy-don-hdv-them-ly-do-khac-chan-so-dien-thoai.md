# ADR-0037 — HDV huỷ đơn: thêm lý do "Khác" (ghi chữ tự do), chặn số điện thoại — sửa điều 2 của ADR-0030

- **Trạng thái:** **accepted** — chủ dự án duyệt trực tiếp trong phiên chat 2026-09-27 (hỏi lại qua AskUserQuestion khi thi công Task 1.8), khi thi công `docs/superpowers/plans/2026-09-27-tu-choi-huy-hdv-thi-cong.md`.
- **Ngày:** 2026-09-27. **Người phê chuẩn:** chủ dự án.
- **Sửa:** ADR-0030 điều 2 (đã accepted) — theo đúng quy ước "thay đổi nội dung = ADR mới trỏ về ADR này" (dòng trạng thái ADR-0030). ADR-0030 không tự sửa nội dung điều 2, chỉ thêm dòng trỏ tới ADR này ở các chỗ liên quan.
- **Loại quyết định:** cửa hai chiều. Chỉ đổi mã/test; không migration. Quay lại cách cũ (bỏ "Khác") = một commit, không mất dữ liệu (đơn đã huỷ với lý do "Khác" giữ nguyên nhãn đã ghi).

## Tóm tắt cho chủ (lời thường)

Trước đây, khi hướng dẫn viên huỷ đơn, chỉ được chọn một trong hai lý do có sẵn, không được gõ chữ — vì lo số điện thoại khách lỡ gõ vào sẽ nằm mãi trong nhật ký hệ thống (nhật ký không sửa/xoá được). Nay thêm lựa chọn thứ ba "Khác" cho gõ lý do riêng, nhưng máy chủ tự kiểm: nếu trong chữ gõ vào có một dãy số dài giống số điện thoại (từ 8 số liền nhau, kể cả viết cách bằng khoảng trắng/chấm/gạch/ngoặc), máy chủ từ chối, không lưu.

## Bối cảnh

Khi thi công Task 1.8 (màn "Việc của tôi" cho HDV), chủ muốn thêm ô "Khác" cho gõ lý do tự do khi huỷ đơn. Việc này khác với ADR-0030 điều 2 đã duyệt trước đó ("danh sách đóng... 'Khác' **không kèm ô chữ**" — lý do Q-H "có ô chữ tự do" đã bị loại vì "chữ tự do đi thẳng vào nhật ký chỉ-thêm mà không lọc SĐT/email/MST, lỡ ghi thì không gỡ được").

Người thi công phát hiện đúng xung đột này và không tự làm mà báo lại (không tự hoà giải — `CLAUDE.md` §2). Điều phối đã trình lại đúng rủi ro cho chủ; chủ quyết theo hướng chấp nhận rủi ro có kiểm soát (chặn số điện thoại) thay vì giữ nguyên hoặc bỏ hẳn yêu cầu lý do.

## Quyết định

1. **Route hẹp `POST /api/orders/:id/handler-cancel`** (`dispatch/rules.ts` — `CANCEL_REASONS`, `CancelReason`) thêm mã thứ ba `"other"`, cạnh hai mã cũ `not_reachable`/`customer_requested` (không đổi).
2. **`reason: "other"` đòi thêm `note: string`:**
   - `note` rỗng (hoặc chỉ khoảng trắng) → 400 "Cần nhập lý do khi chọn 'Khác'.", không ghi.
   - `note` chứa một dãy ≥ 8 chữ số liên tiếp (đếm sau khi bỏ dấu cách/chấm/gạch nối/ngoặc đơn/dấu cộng/gạch dài — đúng luật đã có ở `maskLongDigits`/Q-N, dùng lại QUA một hàm chung `hasLongDigitRun`, không viết luật nhận diện số thứ hai) → 400 "Lý do không được chứa số điện thoại hoặc dãy số dài — chỉ ghi văn bản thường.", không ghi.
   - `note` hợp lệ → nhật ký (`audit_log`, hành động `order_cancelled_by_field`) ghi ĐÚNG NGUYÊN VĂN `note` (đã trim) làm `detail` — khác hai mã cũ (`detail` = nhãn cố định `CANCEL_REASON_LABEL`).
3. **Không đổi phần còn lại của điều 2 ADR-0030:** Từ chối (lượt 2), Huỷ qua `POST /api/orders/:id/status` (mọi vai khác), vẫn danh sách đóng, "Khác" không kèm ô chữ. Sửa đổi này CHỈ áp cho "Khác" của HDV huỷ qua `handler-cancel`.
4. **Giới hạn đã biết, chủ đã nghe và chấp nhận (P18):** chỉ chặn được dãy số dài kiểu số điện thoại/MST theo đúng định nghĩa Q-N; KHÔNG chặn được email, MST viết không liền số theo kiểu khác, hay dữ liệu nhạy cảm khác gõ vào ô "Khác". Đây là giảm rủi ro, không loại bỏ hết rủi ro của điều 2 gốc.
5. **Nút "chọn nhanh" ở màn sửa số khách** (`handler-money-edit`) chỉ là điền sẵn ô nhập ở giao diện — KHÔNG đổi luật máy chủ (đã là chữ tự do bắt buộc từ trước, không đổi ở ADR này).

## Hàng rào (bắt buộc, người kiểm độc lập đã tìm ra lỗ — phải vá trước khi phát hành)

Người kiểm độc lập (2026-09-27) phát hiện: đột biến đổi nhãn nhật ký của "Khác" thành chữ cố định (bỏ ghi `note` nguyên văn) **sống sót** qua `npm test`, `test:e2e`, và cả kịch bản Chrome — nghĩa là chưa có hàng rào tự động nào canh đúng hành vi này ở mức route/nhật ký. Phải thêm:
- Bài kiểm mức route (harness SQLite thật hoặc `tests/e2e/dispatch.mjs`) đọc thẳng `audit_log` sau khi gọi `handler-cancel` với `reason:"other"`, xác nhận `detail` = đúng `note` đã gõ (không phải nhãn cố định).
- Bài kiểm route chặn SĐT: gọi thật với `note` chứa số điện thoại (nhiều cách viết) → 400, xác nhận KHÔNG có dòng `audit_log` nào được ghi cho lần gọi đó.
- Đột biến xác nhận cả hai bài trên đỏ khi hỏng, ghi ngày quan sát vào `docs/SO-HANG-RAO.md` ở đúng dòng đã có (sửa cho khớp mức đã kiểm — hôm nay dòng đó chỉ đúng ở mức hàm thuần, chưa đúng ở mức route).

## Tiêu chí nghiệm thu

- `reason:"other"` + `note` chứa dãy ≥8 số (mọi cách viết dấu ngăn Q-N đã định) → 400, 0 dòng nhật ký mới.
- `reason:"other"` + `note` rỗng/khoảng trắng → 400, 0 dòng nhật ký mới.
- `reason:"other"` + `note` hợp lệ → 200, đơn `cancelled`, đúng 1 dòng `order_cancelled_by_field`, `detail` = `note` (đã trim) nguyên văn.
- Hai mã cũ không đổi hành vi, `note` gửi kèm (nếu có) bị bỏ qua, không ảnh hưởng nhãn.
- Có bài kiểm mức route (không chỉ mức hàm thuần) canh cả hai vế trên, có quan sát chặn thật ghi ngày ở `docs/SO-HANG-RAO.md`.
