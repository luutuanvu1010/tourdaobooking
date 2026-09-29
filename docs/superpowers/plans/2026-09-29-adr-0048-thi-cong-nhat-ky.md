# Nhật ký thi công ADR-0048 (nhà xe đối tác, tài xế đối tác `DRIVER_PARTNER`)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-29-adr-0048-thi-cong.md` (vai lập kế hoạch, 2026-09-29; đo trên `377813d`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-29-adr-0048-de-xuat-luat.md` (CHỜ CHỦ DUYỆT).
- **Nguồn chuẩn tắc:** ADR-0048 (accepted 2026-09-28: D1, D2; Q4 = Q5 = Q6 = (a)).
- **Nhánh thi công:** _(điền: tên nhánh, worktree, tách từ đâu @ mã commit, đã gộp những gì)_
- **Cách thi công:** _(điền: subagent-driven / executing-plans; ai giao vai)_
- **Trạng thái:** CHƯA BẮT ĐẦU.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả kiểm độc lập ghi ở mục 8.

## 1. Mốc ban đầu (Task A0)

| Bước | Kết quả |
|---|---|
| 1. ADR-0048 accepted trên nhánh | |
| 2. `docs/quyen-hoan.json` → `phat_hien` | |
| 3. Chưa ai thêm `DRIVER_PARTNER` / `DRIVER_EXTERNAL` / `CARRIER` / `DRIVES_FOR` | |
| 4. Số migration; nhánh ADR-0047 đã gộp `main` chưa; 0034–0036 có chạm `stf_`/`pty_`/`vc_` không | |
| 5. Mốc `npm test` / `typecheck` (số test, số lỗi, `uptime` nếu ca CPU đỏ) | |
| 6. Mốc e2e (đỏ sẵn có) | |
| 7. Độ lệch số dòng trích dẫn so với `377813d` | |
| 8. Chỗ "đúng số lượng" mới tìm thấy (ngoài mục 1.2 của kế hoạch) | |
| 9. Mốc Chrome (✓/✗ từng kịch bản; số ô vai màn hình đang có) | |

## 2. Câu trả lời của chủ dự án

| Câu | Trả lời (nguyên văn, ngày giờ, kênh) | Áp ở |
|---|---|---|
| Q1 — sửa chủ xe sau khi thêm | _(chờ)_ | Task A9 bước 5 |
| Q2 — màn "Nhà xe" riêng | _(chờ)_ | Phần B |
| Duyệt tệp đề xuất luật (mục 1–6) | _(chờ)_ | Task K3 |

## 3. Bảng từng task

| Task | Commit | Đỏ trước (dòng đỏ nguyên văn) | Xanh sau (lệnh + số) | P16 (đột biến → đỏ → hoàn nguyên) | Ghi chú |
|---|---|---|---|---|---|
| A0 | — | — | — | — | |
| A1 migration 0037 + cột 9 + vai | | | | a–e | |
| A2 LC-1b năm đường | | | | a–c | |
| A3 "Toàn công ty", trang đầu | | | | a–b | |
| A4 cổng toàn tuyến hai mã | | | | 1 | |
| A5 migration 0038 | | | | từng trigger, hai nhánh view | |
| A6 route quan hệ | | | | 1 | |
| A7 hàm công bố | | | | a–b | |
| A8 migration 0039 + fixture | | | | a–c | |
| A9 route xe / nhà xe / lọc (bước 5 chờ Q1) | | | | 1 | |
| A10 sắp hết hạn | | | | 1 | |
| A11 kiểm bất biến | | | | 1 | |
| A12 e2e | | | | — | |
| A13 sổ hàng rào | | — | — | — | |
| A14 tài liệu | | — | — | — | |
| A15 tự kiểm Phần A | — | — | | — | |
| B1–B5 | | | | | |
| K1 nhật ký thay đổi | | | | — | số bản: |

## 4. Phán quyết của điều phối (Ruling) — kèm giá nếu sai

Diễn giải I1–I8 của kế hoạch mục 0 chờ điều phối xác nhận hoặc bác. Ghi mỗi Ruling một dòng.

| Mã | Nội dung | Áp ở | Giá nếu sai |
|---|---|---|---|
| | | | |

## 5. Sự cố

_(chưa có)_

## 6. Nợ còn lại (không chặn gộp)

- Bàn giao lượt 1b / lượt II (kế hoạch mục 14.3): B1.4, B1.5; view `v_pty_carrier_driver` là "hiện tại"; cột `DRIVER_PARTNER` của các ô chuyến mặc định `none`.
- Khoảng hở báo cáo "tài xế của nhà xe chưa có tài khoản không lên danh sách sắp hết hạn" (kế hoạch mục 14.2 điểm 2) — gợi ý ghi `docs/BACKLOG.md`.

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

_(Task A15)_

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc)

### Giữa chừng (tuỳ điều phối, sau Task A15)

### Cuối — Task K2

## 9. Chưa kiểm (lúc viết mục này)

## 10. Phát hành (chủ dự án tự chạy — Task K3)

- Thứ tự với nhánh ADR-0047 (ai lên `main` trước; có phải đổi số migration của nhánh kia không):
- Lệnh đã đưa chủ:
- Kết quả kiểm chỉ đọc sau triển khai:
