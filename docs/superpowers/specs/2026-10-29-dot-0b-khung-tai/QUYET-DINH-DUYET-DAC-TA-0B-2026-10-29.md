# Quyết định của chủ dự án 2026-10-29 (tối): duyệt đặc tả đợt 0b — khung tải

> Hồ sơ có ngày. Main session ghi lại nguyên văn và cách đọc để chủ dự án bác được.

## Lời chủ dự án

Sau khi đọc trang «Duyệt đặc tả đợt 0b» (https://claude.ai/artifact/W6qJAW2QpMnYk8Ze5s2iGy, bản 1, ba câu có đề xuất), chủ dự án trả lời:

> **ok duyệt**

Trang ghi rõ «trả lời “duyệt” là tôi hiểu cả ba câu theo đề xuất», nên:

| # | Câu | Quyết định (theo đề xuất) |
|---|---|---|
| 1 | Cho viết kế hoạch thi công đợt 0b theo đặc tả bản 5? | **Duyệt.** Đặc tả `DAC-TA.md` bản 5 (commit `e00c93d9` trên nhánh `dac-ta-dot-0b`, QA1 ĐẠT lần 4) **đóng băng**; thi công chỉ theo bản này. |
| 2 | Trang Hướng dẫn `/help` được ngoại lệ tiêu chí CLS ≤ 0,1 (11.6)? | **Chấp nhận ngoại lệ, ghi nợ Chặng 3** (họ Thiết lập). Số ghi: CLS lạnh 0,83 (29/10), nguyên nhân thứ tự thân trang (`web/help.ts:60–67` đổ hướng dẫn theo vai sau `/api/auth/me`, hai thẻ tĩnh nằm dưới). Không sửa thân `/help` trong 0b. Ngoại lệ ghi vào dòng trạng thái ADR-0143 khi thi công (Q-18). |
| 3 | Thanh trên trang Chi tiết đơn ghi gì? | **«Đơn hàng» cố định**; mã đơn đầy đủ ở thẻ tóm tắt và `document.title`. Trang Chuyến, Cuốc không đổi. |

## Cách đọc và ràng buộc kèm theo

- Quy tắc chung cho QA2 (đặc tả mục 3): trang nào sau Q-13/Q-15 vẫn CLS > 0,1 mà phần nhảy do thứ tự thân trang (bằng chứng `sources` của `layout-shift`, Q-17) thì liệt kê kèm số, ghi nợ Chặng 3 và xin chủ ký ở **cổng phát hành 0b** — không nới tiêu chí. Ứng viên đã biết: `/account`, `/chinh-sach-dieu-phoi`, `/giao-dien`, `/catalog`.
- Cổng phát hành đợt 0b giữ như đợt 0 (đặc tả mục 13): chủ xem bản local, thử iPhone mục 8 `docs/PWA-IPHONE.md`, đọc tờ so sánh theo bộ đo Chặng 1 hai khổ, rồi mới «duyệt» phát hành.
- Kế tiếp: Main session viết kế hoạch thi công (`docs/superpowers/plans/2026-10-29-dot-0b-khung-tai.md`, theo khuôn `writing-plans`, đọc mã thật), tự soát và cho kiểm độc lập một vòng, rồi gửi chủ trang giao việc để mở phiên Code riêng (subagent-driven) như đợt 0.

## Trạng thái kho lúc ghi

- `main` cục bộ `cfd66605` (chủ vừa nhập bàn giao tái cấu trúc giao diện; `origin/main` còn `25f127d1`). Chuỗi nhánh chờ chủ gộp bằng Terminal thật: `7c-dong-bo-bo-v2` (`bedce578`) → `bien-ban-cong-phat-hanh-dot-0` (`0cb8c190`, `a129d3dd`) → `dac-ta-dot-0b` (`b416d6ed` … `e00c93d9` + biên bản này). Lệnh `npm run day-len` từ chối chạy ngoài TTY (chủ thử qua Claude Code 29/10 tối) — chủ chạy trong Terminal.
