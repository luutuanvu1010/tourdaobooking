# Nhật ký thi công ADR-0184 — kế hoạch: docs/superpowers/plans/2026-11-07-adr-0184-thi-cong.md

Nhánh `claude/adr-0184-thi-cong`, tách từ `main` 5f641781 (đã có ADR-0184 và ADR-0180 «Xem như vai khác»). Trạng thái sống ở bảng việc của kế hoạch; tệp này ghi phán quyết, câu trả lời của chủ, mốc từng việc, nợ.

## Câu trả lời của chủ (chat 2026-11-07)

- «thi công ADR-0184».
- Ba câu hỏi chữ giao diện, chủ chọn cả ba phương án khuyến nghị: nút «Cho chạy dù thiếu giấy tờ»; nhãn vàng «Xe thiếu <giấy> — đã cho chạy»; lý do «Giấy đang gia hạn / Xe thay thế khẩn cấp / Khác (gõ rõ ít nhất 10 chữ cái)».

## Phán quyết

P1–P8 ghi ở mục «Phán quyết của điều phối» của kế hoạch (một nơi). Cái giá nếu sai:
- P1 (bảng cho phép riêng thay giá trị `DAT_PHA_LE`): nếu chủ muốn đúng chữ ADR thì phải thêm một migration dựng lại bảng bản chụp — tốn, rủi ro trên CSDL thật; dữ liệu đã ghi theo P1 vẫn đọc được.
- P2 (ô `trip.override.giay_to_cung`): nếu chủ muốn dùng chung `trip.override` thì không thực hiện được lựa chọn D2 của chủ.
- P4 (cho phép từng loại): nếu chủ muốn «một lần cho tất cả» thì giao diện chỉ cần chọn sẵn mọi loại; máy chủ giữ nguyên.
- P5 (ghi chú không vào nhật ký): nếu chủ muốn thấy ghi chú trong nhật ký, thêm vào chi tiết nhật ký sau — chiều ngược lại (gỡ chữ đã ghi) không làm được.

## Mốc

- (chưa có)

## Nợ (không chặn phát hành)

- Chưa có nút «bỏ cho phép» trước giờ chạy.
- Đổi xe rồi đổi về xe cũ: dòng cho phép cũ áp lại (Trọng tâm 3).
- Rủi ro pháp lý Kiểm định / Bảo hiểm: ADR ghi «cần luật sư xác nhận»; chủ đã nghe và chọn D1=b.
