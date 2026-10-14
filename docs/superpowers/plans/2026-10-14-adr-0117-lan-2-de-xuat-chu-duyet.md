# ADR-0117 lần 2 — gói đề xuất cho chủ duyệt (AI chỉ đề xuất, không tự áp)

Ghi ngày 2026-10-15. Đi kèm `2026-10-14-adr-0117-lan-2-thi-cong-nhat-ky.md` (mục «Việc treo chờ chủ»). AI không được sửa ADR đã duyệt, `docs/quyen-hoan.json` hay chạy lệnh remote (Hiến pháp N9, CLAUDE.md §8); các việc dưới đây do chủ làm.

## 1. Dòng Trạng thái của ADR-0117 (chủ sửa hoặc ra lệnh sửa)
Đề xuất thêm vào dòng «Trạng thái» của `docs/adr/ADR-0117-…md`, sau câu «Phạm vi duyệt: chỉ lần 1»:

> **Cập nhật 2026-10-14 (chủ, chat): duyệt lần 2** — mức TA dùng chung (`prc_rate_tier`, `prc_role_tier`, dựng lại `prc_commission_rule` thêm đích mức, `chonMuc` chín bậc), thi công theo `docs/superpowers/plans/2026-10-14-adr-0117-lan-2-ke-hoach.md`. Điều 4 và 6 của bảng «Sửa câu» (sửa ADR-0077) có hiệu lực từ nay. Phát hành chỉ sau khi Bước 0 bậc (c), (d) đạt.

## 2. Gia hạn HC-5.19 (chủ chọn «chấp nhận rủi ro»)
Sửa trường `han` của mục `HC-5.19` ở `docs/quyen-hoan.json` (hiện `2026-10-31`) sang một ngày chủ chọn (đề xuất `2026-11-30`), kèm lý do trong thông điệp commit: «Chủ chấp nhận phát hành ADR-0117 lần 2 khi chưa diễn tập khôi phục; vẫn diễn tập khi có thể». Năm mục khác hạn `2026-10-31` (TNV-G1, TNV-G3, TNV-G4, HC-4.2 và mục còn lại cùng ngày) **cũng** đỏ `npm test` từ 2026-11-01 nếu không vá hoặc gia hạn.

## 3. Bước 0 bậc (c): bản xuất production nạp vào D1 local, áp 0096+0097
Làm theo `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md` §3 (xuất tách hai tệp `--no-data` và `--no-schema`, nạp theo thứ tự cấu trúc → dữ liệu → trigger vào `--persist-to "$TMPDB"`; các lệnh `--remote` ở đó chỉ đọc). Sau khi nạp xong và đếm khớp, áp hai migration mới lên **bản nạp local** (không phải D1 thật), đứng ở thư mục nhánh thi công:

```bash
# đứng ở: .claude/worktrees/friendly-franklin-4c7098 (chép 0096, 0097 vào bản sao migrations/ của chính bản nạp, không chạm D1 thật)
CI=1 npx wrangler d1 migrations apply tourdao-sales-db --local --persist-to "$TMPDB"
```
Phải thấy: áp xong không lỗi; `PRAGMA foreign_key_check` ra 0 dòng; số dòng `prc_commission_rule`, `ord_service_terms` trước = sau; `node scripts/audit-invariants.mjs --db local` sạch. Xong thì **xoá tệp xuất** (có SĐT, hồ sơ khách thật).

## 4. Bước 0 bậc (d): D1 thật bỏ đi
Cần quy trình nạp `--remote` (cấu trúc → dữ liệu → trigger) **chưa có sẵn, chưa kiểm** (tệp diễn tập chỉ viết cho D1 local). Khi (c) đạt và chủ muốn làm (d), nhắn AI soạn nguyên lệnh theo kế hoạch 0.4a; mọi lệnh `--remote` do chủ chạy, xong thì xoá D1 bỏ đi và tệp xuất.

## 5. Phát hành (Task 7)
Chỉ sau (1), (2), (3), (4). AI soạn nguyên lệnh `npm run day-len` rồi `npm run trien-khai` kèm thư mục khi chủ ra lệnh.
