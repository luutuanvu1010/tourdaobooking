# Nhật ký thi công — Lượt 1: ADR-0058 (nhóm dịch vụ) + ADR-0062 (báo tin khi đơn đổi sau xác nhận)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-30-luot-1-adr-0058-0062-ke-hoach.md` (vai lập kế hoạch, 2026-09-30; đo trên `3a39b5a7`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-30-luot-1-de-xuat-luat.md` (Task A8 / B8 tạo; chủ duyệt; điều phối áp lúc gộp).
- **Nguồn chuẩn tắc:** ADR-0058 (accepted 2026-09-30, lượt 1a), ADR-0062 (accepted 2026-09-30, lượt 1b; câu 3 = A, câu 5 = Có, câu 6 = không ghi nơi đón mới).
- **Nhánh thi công Phần A:** _(chưa có)_
- **Nhánh thi công Phần B:** _(chưa có — chỉ bắt đầu sau khi Sổ tiền gộp `main`, Task B0)_
- **Cách thi công:** _(điều phối ghi: subagent-driven / executing-plans)_
- **Trạng thái:** CHƯA BẮT ĐẦU.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả kiểm độc lập ghi ở mục 5.

## 1. Mốc ban đầu

### 1.1 Phần A (Task A0)

| Bước | Kết quả |
|---|---|
| 1. Đỉnh `main`; số bản trên `main` | |
| 2. Sổ tiền (1.41) và nhánh 1.42 đã gộp `main` chưa | |
| 3. Số migration (`ls migrations` + quét mọi nhánh); `0046` còn trống | |
| 4. Ảnh chụp Sheet: giờ, số byte, sha256; khớp 110 mã của ADR | |
| 5. Mốc `npm test` / `typecheck` (số test, số lỗi, `uptime` nếu ca CPU đỏ) | |
| 6. Mốc e2e + `audit-invariants --db local` (đỏ sẵn có) | |
| 7. Độ lệch `tệp:dòng` so với §4 kế hoạch | |
| 8. Hai số đếm chỉ-đọc do chủ chạy (`co_mat`, `dang_tren_sheet`, `ngoai_bang_gieo`) | |

### 1.2 Phần B (Task B0)

| Bước | Kết quả |
|---|---|
| 1. Cổng: Sổ tiền đã gộp `main` | |
| 2. Độ lệch `tệp:dòng` (`insertMoneyAdjustment`, `handler-money-edit`, `dispatch.mjs`, `THAY_DOI`, `HANH_DONG_CUA_THAY_DOI`, `router.ts`) | |
| 3. `INSERT INTO order_money_adjustment` trong mã chạy | |
| 4. `order_money_adjusted` đã khai chưa (ADR-0063 lên trước?) | |
| 5. `v_aud_trip_event` có chưa (ADR-0052 D6 lên trước?) | |
| 6. Đối tác / Thực tập mở được `/order?id=` không | |
| 7. Số migration; `0047` còn trống | |
| 8. Chỉ mục `audit_log` theo `order_id` | |
| 9. Mốc test đủ bộ | |

## 2. Câu trả lời của chủ dự án

| Câu | Trả lời (nguyên văn, ngày giờ, kênh) | Áp ở |
|---|---|---|
| Q1 — cách đặt chip nhóm dịch vụ (Task A5) | _(chờ)_ | Task A6 |
| Duyệt đề xuất luật mục A | _(chờ)_ | K3A |
| Duyệt đề xuất luật mục B | _(chờ)_ | K3B |

## 3. Bảng từng task

| Task | Commit | Đỏ trước (dòng đỏ nguyên văn) | Xanh sau (lệnh + số) | P16 (đột biến → đỏ → hoàn nguyên) | Dòng `SO-HANG-RAO` | Ghi chú |
|---|---|---|---|---|---|---|
| A0 | | | | | | |
| A1 | | | | | | |
| A2 | | | | | | |
| A3 | | | | | | |
| A4 | | | | | | |
| A5 | | | | | | |
| A6 | | | | | | |
| A7 | | | | | | |
| A8 | | | | | | |
| K1A | | | | | | |
| B0 | | | | | | |
| B1 | | | | | | |
| B2 | | | | | | |
| B3 | | | | | | |
| B4 | | | | | | |
| B5 | | | | | | |
| B6 | | | | | | |
| B7 | | | | | | |
| B8 | | | | | | |
| K1B | | | | | | |

## 4. Ruling, lệch kế hoạch, nợ

| # | Ngày | Nội dung | Ai quyết | Hệ quả |
|---|---|---|---|---|

## 5. Kiểm độc lập

| Vòng | Phần | Đỉnh được kiểm | Kết luận | Mục CAO / VỪA / THẤP | Đã sửa ở |
|---|---|---|---|---|---|

## 6. Phát hành

| Phần | Bản | Nhánh gộp | Migration | Worker | Ngày giờ | Kiểm sau deploy |
|---|---|---|---|---|---|---|
