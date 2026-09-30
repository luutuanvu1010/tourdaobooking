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
| K0 | 2026-09-30 | Kiểm độc lập **bản kế hoạch**: ĐẠT CÓ ĐIỀU KIỆN (1 CAO, 4 VỪA, 10 THẤP). Người lập kế hoạch sửa hết trên nhánh `ke-hoach-luot-1-adr-0058-0062` — bảng dưới | điều phối giao sửa | Kế hoạch đủ điều kiện giao thi công |

**Phát hiện → chỗ sửa trong kế hoạch (vòng kiểm kế hoạch 30/9):**

| Mã | Phát hiện | Chỗ sửa |
|---|---|---|
| C1 | `service_group_history` JOIN `v_stf_staff_label` → cạnh `catalog → staff` (cấm) | §5.2 bỏ JOIN, trả `created_by`; §5.4 route trả `createdBy` (id), tên ghép phía web từ `GET /api/staff` (`accounts/index.ts:331`, `admin` + `admin.manage`); NT-A4 thêm "`ALLOWED_EDGES.catalog` vẫn `["audit"]`, không `v_stf_*`"; A2 P16 thêm đột biến JOIN; A7(c) ghép tên; K2A bước 4 |
| V1 | `v1-nguoi-phu-trach.mjs` bước o khẳng định `detail` = lý do | §4 dòng bẫy mới; B2 tệp sửa + kỳ vọng "kết thúc bằng lý do"; K2B (5) chạy lại |
| V2 | `ghiDatGapNhatKy`/`DAU_DAT_GAP` ở `orders/dat-gap.ts:93-94` | B3: chốt chuyển sang `src/shared/chang-dua-don.ts` cạnh `LY_DO_DAT_GAP`, `dat-gap.ts` import lại; khứ hồi canh `kemDatGap` |
| V3 | Đường màn hình khoá chưa chốt | B5 mục "Chốt một đường": sửa `loaiTinDon` (chữ ký giữ) + `locHopThongBao` (thêm `mocTinDoi?`); `hop()` nối vào `don`; `nguoiNhanDay` / `web-push.ts` không sửa; B6 bỏ "nếu cần" |
| V4 | Mốc = lúc phát hành, không phải lúc gộp | §5.6; NT-B16 mới (bài thuần, `test.todo` tới K1B); K1B, K2B (6), K3B (gộp–triển khai liền nhau), R7 |
| T1 | Số dòng `thong-bao.ts`, `web-push.ts`, `catalogForOrderForm` | §4, ràng buộc chung |
| T2 | `dispatch.mjs:502,510` | §4, B2 |
| T3 | Sổ tiền `:1118` / `:1134` | §4, B0 |
| T4 | NT-B1 dò nhãn mọi vị trí, cả nhánh "thêm —" | B1 bài regex + ghi chú `chang-dua-don.ts:272`, `:278-279` |
| T5 | NT-A5 chỉ đỏ qua đột biến; A2 cần đỏ trước | NT-A5; A2 bước 1 thêm dòng `NUA_NGHIEM` trước |
| T6 | Sổ dữ liệu không có mục trigger / chỉ mục | §5.1 cuối, A1 bước 3: `ctl_group` kind `lookup` |
| T7 | Bật lại nhóm trùng tên | NT-A7 |
| T8 | Chú thích 1.42 nói chip vào CUỐI hàng | §12 Q1 ghi lý do vẫn khuyến nghị cách 1 |
| T9 | Bộ chọn dựng trước `initShell` | §5.5 + A6: `setTaiKhoan(staffId)` gọi sau `order-form.ts:487` |
| T10 | Lưu y nguyên không ghi dòng | B6: không `detail` ⇒ không `tinDoi` (`orders/index.ts:359`), thêm ca |

## 5. Kiểm độc lập

| Vòng | Phần | Đỉnh được kiểm | Kết luận | Mục CAO / VỪA / THẤP | Đã sửa ở |
|---|---|---|---|---|---|

## 6. Phát hành

| Phần | Bản | Nhánh gộp | Migration | Worker | Ngày giờ | Kiểm sau deploy |
|---|---|---|---|---|---|---|
