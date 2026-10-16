# ADR-0117 lần 2 — nhật ký thi công (mức TA dùng chung)

Kế hoạch: `2026-10-14-adr-0117-lan-2-ke-hoach.md`. Nhánh `claude/phan-loai-dai-ly-hoa-hong-66d076` (dựng trên main `7b832996`). Ghi ngày 2026-10-15. Chưa đẩy lên, chưa gộp, **chưa phát hành**.

## Ba câu trả lời của chủ
- **Duyệt lần 2:** chủ nói bằng lời trong chat ngày 2026-10-14 ("duyệt lần 2, bắt đầu thi công"). Dòng Trạng thái của ADR-0117 **chưa được sửa** (AI không tự sửa ADR đã duyệt): chủ tự đổi hoặc duyệt diff do AI đề xuất.
- **HC-5.19 (khôi phục chưa diễn tập):** chủ chọn «chấp nhận rủi ro, ghi gia hạn». Việc ghi gia hạn có lý do vào `docs/quyen-hoan.json` là **của chủ** (kế hoạch cấm người thi công tự sửa). Chưa ghi.
- **Bằng chứng D1 thật cho Bước 0:** chưa chạy (bậc c, d cần chủ).

## Xây trên lỗ đang hở
**HC-5.19** (hạn 2026-10-31). Các mã TNV-G1, TNV-G3, TNV-G4, HC-4.2, HC-5.11: lần 2 không dựa vào; người kiểm toàn nhánh xác nhận diff không chạm `billing/*` hay `orders/hoan-tat-repo.ts`. Từ 2026-11-01 `src/phat-hien-han.test.ts` làm `npm test` đỏ trên mọi nhánh nếu năm mục hạn 31/10 chưa gia hạn hoặc đóng.

## Trang ghép lần 2 (bổ sung cho phụ lục 04)
1. **Loại thực thể trong bảng:** `prc_commission_rule` ba đích (hồ sơ, loại, mức TA — đúng một); `prc_rate_tier` có `name_key UNIQUE`; `prc_role_tier` mỗi loại một mức tại một ngày.
2. **Ô quyền:** chỉ `partner.commission.view/write`, không ô mới; mọi route kèm `!holdsPartner`.
3. **Cổng:** trigger `target_tier` và khoá chồng ngày có đích mức; `chonMuc` bậc 7–9 là cổng chọn mức duy nhất (một hàm: dựa vào kỷ luật/grep); chỗ giao diện ẩn/hiện «Mức TA» và cảnh báo theo cờ máy chủ.

## Kết quả theo task (mỗi task có kiểm độc lập)
| Task | Commit | Kiểm độc lập | Vòng sửa |
|---|---|---|---|
| 1 migration 0096 | `046240c4` | đạt; gỡ 7 trigger đều đỏ | 0 |
| 2 migration 0097 | `8a624363`…`57ca8b26` | đạt sau sửa | 2: R-PRC-2 không báo khi mức tắt (ruling N-23); bài N-15 gieo giá trị khác nhau từng cột |
| 3 `chonMuc` chín bậc | `abc080b0` | đạt; 7 phép phá đều đỏ | 0 |
| 4 route máy chủ | `28fd0e44`…`42b01422` | đạt sau sửa | 1: thêm bài cho hai đường chụp mức của orders |
| 5 giao diện, e2e, Chrome, Trợ giúp, tài liệu | `a80a8087`…`2ee7c0d9` | do Task 6 kiểm | — |
| 6 kiểm toàn nhánh | — | «đủ trình chủ»; không Critical | — |

Bằng chứng chính (tự chạy lại bởi người kiểm toàn nhánh, 2026-10-15): `typecheck` 0 lỗi; `npm test` 4765 qua, 0 đỏ; e2e 62/62 và `audit-invariants` đạt; 0096+0097 áp được trên D1 local (`foreign_key_check` 0, câu cuối hỏng thì hoàn tác cả tệp); bản 1.96 chạy được trên lược đồ mới (582/582).

## Bước 0 — hiện trạng bốn bậc
- (a) SQLite trong bộ nhớ: đạt (và chạy lại bằng bài thật ở Task 2).
- (b) D1 local trên tệp thật: đạt, hai lần (người thi công, người kiểm toàn nhánh).
- (c) bản xuất production nạp D1 local: **ĐẠT, chủ chạy 2026-10-15** (xuất `--remote` chỉ đọc, tách `cau-truc`/`trigger`, nạp local; wrangler 4.147.0). Lần xuất cấu trúc đầu báo «Authentication error 10000» (vé OAuth), chạy lại sau `wrangler login` thì qua. Trước khi áp: mức 4, bản chụp 1, đơn 99. Áp `0096` rồi `0097` (12 + 21 lệnh) báo thành công. Sau khi áp: mức 4, bản chụp 1, đơn 99 (không đổi). `PRAGMA foreign_key_check` không trả dòng nào. `audit-invariants --strict`: «Mọi bất biến đạt, 4 cảnh báo» — R-PRC-1, R-PRC-2, R-PRC-6 mới đều xanh trên dữ liệu thật; bốn cảnh báo (lần thu chưa rõ người thu 22, giấy tờ xe thiếu 7, dịch vụ chưa phân nhóm 5, đơn chưa chụp bù 42) là dữ liệu cũ, có sẵn, không do lần 2. Chưa chứng minh: D1 thật (không phải local) có chạy cả tệp trong một lần như wrangler local — chỉ bậc (d) trả lời.
- (d) D1 thật bỏ đi: **chưa chạy — việc của chủ**. Phải xong trước khi 0097 tới gần production.

## Ruling của điều phối
- Làm Task 1–6 trên máy; không phát hành, không áp migration remote (hoàn tác chỉ bằng Time Travel chưa diễn tập).
- R-PRC-2 không báo khi mức TA tắt mà dòng còn hiệu lực — theo giả định «tắt mức chỉ chặn gắn mới» của kế hoạch. Hệ quả: nó **lệch** với loại (vai bị tắt mà còn dòng thì R-PRC-2 báo). Chờ chủ chốt.
- Cảnh báo N-17 và «Thử tra» xét dòng riêng của mọi loại hồ sơ đang mang.
- Sửa `src/migrations-cam-ket.test.ts` ngoài brief (khung thứ tự áp migration; người kiểm xác nhận không làm yếu bài).

## Việc treo chờ chủ
1. Duyệt diff dòng Trạng thái ADR-0117; ghi gia hạn HC-5.19 vào `docs/quyen-hoan.json`; năm mục hạn 31/10.
2. Chạy bậc (c), (d) của Bước 0 (AI soạn nguyên lệnh khi chủ ra lệnh).
3. Chốt ý nghĩa «tắt mức» (N-23) và bất đối xứng R-PRC-2.
4. Danh bạ lộ TÊN LOẠI cho tài khoản lai Bán hàng + Đối tác (`BL-ADR0117-DANH-BA-TEN-LOAI`, hành vi lần 1).
5. Kế toán hoặc chủ xác nhận bảy ca vàng `SV-TA-*` (N-18); AI không tự đánh dấu.
6. Duyệt ảnh thật `docs/evidence/2026-10-15-muc-ta/`; hai quyết định bề mặt.
7. Phát hành (Task 7): do chủ chạy `npm run day-len` rồi `npm run trien-khai`.

## Nợ nhỏ
Khung cảnh báo vàng chỉ hiện ngay sau khi gắn; trạng thái «Đã tắt» lỗi tương phản màu axe (khuôn `.row-off` từ lần 1); `help-smoke` bước c (khôi phục bộ nhớ đệm trang `/account`) chập chờn có sẵn — người kiểm đo nhánh đỏ 5/10, bản nền 3/9, cùng lý do Chrome tự xả bộ đệm, không phải hồi quy; dòng Worker 1.96 ở sổ hàng rào có thể ghi thêm ngày quan sát 2026-10-15; `BL-ADR0117-VAI-CU` làm riêng, không chờ lần 2.

## Ý kiến của chủ về bảy ca số mẫu `SV-TA` (chat 2026-10-15)
Chủ xem bảy ví dụ bằng lời thường. Kết luận từng ca: 01 đúng ý nghĩa; 02 đúng; 03 đúng (giá theo phạm vi hiệu lực của mức TA); 04a đúng về logic nhưng «hơi thiệt cho đại lý» (dòng riêng của loại thắng mức TA — giữ theo ADR-0117 điều 6, có cảnh báo khi gắn); 04b đúng luật; 05 đúng luật; 06 đúng ý nhưng **phải báo ĐỎ** và nói rõ «cần có cấp (mức) thì mới tính được» (hôm nay màn hình dùng màu cát — đã giao việc sửa sang đỏ bằng token `--c-danger*`). Chữ trình bày «hoa hồng / đại lý trả» chưa quen với Việt Nam, thường viết «Tạm tính, chiết khấu, thành tiền» — chờ chủ chọn tên nhãn (đưa phương án trước khi đổi). Trạng thái ở `golden/so-cong-no-luot-2.json` **vẫn `cho_xac_nhan`**: chưa đổi sang `da_xac_nhan` vì (i) đây sẽ là lần đầu bài lớp 2 chạy thật nên cần chủ quyết rõ ca nào, (ii) ca 03 và 06 thiếu số tiền đầy đủ.
