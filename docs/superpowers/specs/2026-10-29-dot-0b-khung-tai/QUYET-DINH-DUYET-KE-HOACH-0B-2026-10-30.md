# Quyết định của chủ dự án 2026-10-30 (rạng sáng): duyệt kế hoạch thi công đợt 0b — khung tải

> Hồ sơ có ngày. Main session ghi lại nguyên văn và cách đọc để chủ dự án bác được.

## Lời chủ dự án

Sau khi đọc trang «Duyệt kế hoạch đợt 0b» (https://claude.ai/artifact/B6yawxwSjm4G9QFcB2tuHp, bản 1, một câu «Cho thi công?» có đề xuất «duyệt»), chủ dự án trả lời:

> **duyệt**

| Câu | Quyết định |
|---|---|
| Cho thi công đợt 0b theo kế hoạch bản 4? | **Duyệt.** Kế hoạch `docs/superpowers/plans/2026-10-29-dot-0b-khung-tai.md` bản 4 (commit `988ce4f4` trên nhánh `dac-ta-dot-0b`; kiểm độc lập bốn vòng, vòng 4 ĐẠT 0 chặn 0 sửa) **đóng băng**; thi công chỉ theo bản này và đặc tả bản 5 (`e00c93d9`). |

## Cách đọc và ràng buộc kèm theo

- Thi công ở một phiên Claude Code riêng (subagent-driven), bản sửa riêng `dot-0b-khung-tai` dựng từ `dac-ta-dot-0b`, theo đoạn giao việc trên trang duyệt. Phiên Code không nhập vào `main`, không phát hành.
- Giữ nguyên các chốt của biên bản duyệt đặc tả (`QUYET-DINH-DUYET-DAC-TA-0B-2026-10-29.md`): ngoại lệ CLS `/help`, thanh trên «Đơn hàng», ngân sách Q-5 không nới (vượt thì dừng và báo).
- Phiên Code gặp chỗ kế hoạch lệch mã thật thì ghi vào nhật ký đợt và báo, không tự đổi phạm vi.
- Cổng phát hành 0b giữ như đợt 0: chủ xem bản local, thử iPhone mục 8 `docs/PWA-IPHONE.md`, đọc tờ so sánh trước sau hai khổ, rồi mới «duyệt» phát hành.

## Trạng thái kho lúc ghi

- `main` cục bộ `a129d3dd`. Nhánh `dac-ta-dot-0b` (đặc tả, hai biên bản, kế hoạch bản 4) chưa nhập `main`; chủ nhập bằng `npm run day-len -- dac-ta-dot-0b` trong Terminal thật khi tiện.
