# Nhật ký thi công ADR-0047 (chặng đưa đón, danh sách hành khách, số khách hiệu lực, tiền tố `ord_`)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md` (vai lập kế hoạch, 2026-09-29; đo trên `9067d97`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md` (**CHỜ CHỦ DUYỆT**).
- **Nguồn chuẩn tắc:**
  - ADR-0047 (accepted 2026-09-28; Q4 = (a) "Chặng thay hẳn ô cũ");
  - danh sách màn `docs/superpowers/specs/2026-09-29-adr-0047-man-hinh-can-ve.md`.
- **Nhánh thi công:** _(điền ở Task A0: tên nhánh, worktree, mốc tách, các nhánh đã gộp vào, đỉnh)_.
- **Cách thi công:** _(subagent-driven / executing-plans; ai giao vai)_.
- **Trạng thái:** _(cập nhật sau mỗi mốc: Phần A / Phần B / Phần C; đã kiểm độc lập chưa; đã lên production chưa)_.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả của người kiểm độc lập ghi ở mục 8.

## 1. Mốc ban đầu (Task A0)

| Mục | Kết quả |
|---|---|
| Bước 1: ADR-0047 accepted trên nhánh (dòng trạng thái, câu Q4) | |
| Bước 2: Ruling R1–R11 đã chốt (xem mục 4) | |
| Bước 3: `docs/quyen-hoan.json` → `phat_hien` | |
| Bước 4: chưa ai thêm `ord_transfer_leg` / `ord_passenger` / `order.passenger.write` / `soKhachHieuLuc` | |
| Bước 5: số migration lớn nhất; quét mọi ref (`git log --all --name-only --format= -- migrations/`); `0034`–`0036` còn trống; `0037`–`0039` của nhánh ADR-0048 có chưa | |
| Bước 6: `npm test` (số test) / `npm run typecheck` / `uptime` | |
| Bước 7: số dòng trích dẫn lệch so với kế hoạch (đo trên `9067d97`) | |
| Bước 8: `npm run test:e2e` đủ bộ — kịch bản đỏ sẵn có | |
| Bước 9: Chrome — số ✓/✗ từng kịch bản (`a2-smoke-form`, `a2-smoke-order`, `a2-smoke-sheet`, `v1-xac-nhan-png`, `trang-chu-smoke`, `hdv-viec-cua-toi-smoke`) | |
| Bước 10: khẳng định "đúng số lượng / đúng danh sách" tìm thêm được | |

**Đỏ sẵn có trên nhánh gốc** (không phải lỗi của việc này):
- _(điền)_

## 2. Câu trả lời của chủ dự án

| Câu | Nội dung | Trả lời (nguyên văn, ngày) | Ảnh hưởng |
|---|---|---|---|
| Q0 | Xác nhận lệch có chủ ý hẹp của Hiến chương 5.5: xoá–chèn lại chặng / hành khách của **đơn nháp** (khuyến nghị (a) xác nhận) — trả lời cùng lúc duyệt đề xuất luật mục 2 | _chờ_ | Task A7, A9 (chặn riêng phần lưu nháp) |
| Q1 | Dịch vụ cũ có giờ đón mà không có điểm đón: chép thế nào (mặc định (a) "(chưa ghi nơi đón)") | _chờ_ | Task A4 (câu chép), A15 (R-ORD-12) |
| Q2 | Khoảng ngày đón so với ngày đi (mặc định (a): −1 / +7 ngày) | _chờ_ | Task A3 (`khoangNgayDon`) |
| Q3 | "Chuyến đón hôm nay" ở Trang chủ theo ngày đi hay ngày đón (mặc định (a) ngày đi) | _chờ_ | Task A8 (`getDashboard`) |
| Truy vấn chỉ đọc (kế hoạch mục 10 bước 3) | Số dịch vụ có dữ liệu đón cũ theo trạng thái; số "giờ không nơi", "chưa có ngày đi", "chưa có nơi trả" | _chờ chủ chạy_ (AI chạy thử câu `SELECT` trên D1 **local** trước — ghi kết quả thử ở đây) | Q1; kiểm sau triển khai |
| Đề xuất luật | Duyệt `…-de-xuat-luat.md` mục 1–4 (mục 5 chỉ để biết; mục 4d tuỳ chọn) | _chờ_ | Task K3 |
| Bản vẽ | Link Claude Design các màn | _chờ_ | Phần B |

## 3. Bảng từng task

Cột "Đột biến P16": sửa cố ý → đỏ → hoàn nguyên → xanh. Chép **nguyên văn** dòng đỏ, kèm ngày.

| Task | Việc | Commit | `npm test` sau | Dòng ĐỎ trước (đã thấy) | Đột biến P16 (ngày · đột biến · dòng đỏ) | Người kiểm |
|---|---|---|---|---|---|---|
| A0 | Điều kiện trước, mốc | | | — | — | — |
| A1 | `ord_` (chờ duyệt), khoá `legacy`, khung `NUA_NGHIEM` | | | | | chưa |
| A2 | `soKhachHieuLuc` + quét `after_json` + bật EXPLAIN `NUA_NGHIEM` | | | | | chưa |
| A3 | Luật thuần chặng + kiểu + `vnLocalToMs` | | | | — (luật thuần) | chưa |
| A4 | Migration `0034` (chặng, loại điểm, chép dữ liệu) | | | | | chưa |
| A5 | Migration `0035` (hành khách, 3 view) | | | | | chưa |
| A6 | Luật thuần hành khách | | | | — (luật thuần) | chưa |
| A7 | Tệp SQL + hai ngoại lệ có tên (chờ duyệt) | | | | | chưa |
| A8 | Mọi nơi đọc chuyển sang chặng | | | | | chưa |
| A9 | Ghi ở lập / sửa nháp; tương thích; ghi kép; xác nhận điền ngày | | | | | chưa |
| A10 | `PUT /trip` trộn vào chặng, dời ngày | | | | | chưa |
| A11 | Route chặng sau xác nhận | | | | | chưa |
| A12 | Ô `order.passenger.write` + route hành khách | | | | | chưa |
| A13 | `hanhKhachChoChuyen` + quét nơi gọi | | | | | chưa |
| A14 | Hàng rào "nhật ký không tên" | | | | | chưa |
| A15 | R-ORD-7…12 | | | | | chưa |
| A16 | E2E `chang-hanh-khach` | | | | — | chưa |
| A17 | Sổ hàng rào | | | — | — | chưa |
| A18 | Tài liệu + đề xuất luật | | | — | — | chưa |
| A19 | Tự kiểm Phần A | | | — | — | — |
| A20 | Kiểm độc lập giữa chừng (nếu điều phối chọn) | | | — | — | |
| B0–B7 | Giao diện theo bản vẽ | | | | | chưa |
| C0–C6 | Phát hành 2 (contract) | | | | | chưa |
| K1–K3 | Mỗi lần phát hành | | | | | |

## 4. Phán quyết của điều phối (Ruling) — kèm giá nếu sai

Kế hoạch mục 0 đề nghị R1–R11. Điều phối chốt, hoặc sửa, rồi chép vào đây **trước Task A3**.

| Mã | Đề nghị (kế hoạch mục 0) | Điều phối chốt (nguyên ý, ngày) | Giá nếu sai |
|---|---|---|---|
| R1 | Hành khách / chặng của đơn nháp chỉ đi trong thân `POST/PUT /api/orders`; route riêng chỉ nhận đơn đã xác nhận | _chờ_ | hai đường ghi đè nhau khi lưu nháp |
| R2 | Tương thích phát hành 1: DTO cũ dẫn xuất từ chặng; khoá vắng = giữ; `PUT /trip` khoá có mặt thì trộn | _chờ_ | bỏ ⇒ Phần A không lên trước bản vẽ được; làm sai ⇒ máy chưa tải bản mới xoá mất chiều về, danh sách khách |
| R3 | Ghi kép hai cột cũ ở phát hành 1 | _chờ_ | bỏ ⇒ lùi Worker về 1.36 thấy giờ đón cũ |
| R4 | Ngày đón trống chỉ ở đơn nháp; máy chủ tự điền; xác nhận điền nốt; đổi ngày đi thì chặng dời theo | _chờ_ | đổi cổng xác nhận người dùng thấy, hoặc chặng lệch ngày đi |
| R5 | Tệp SQL nửa nghiêm + hai ngoại lệ có tên (chờ chủ) | _chờ_ | mục 16 điểm 4 của kế hoạch |
| R6 | Ba lý do đóng chặng ở mã | _chờ_ | sửa hằng |
| R7 | Điểm danh mục phải đang dùng; mọi loại | _chờ_ | sửa một điều kiện |
| R8 | "Huỷ người" = huỷ cả chuỗi, mới trước cũ sau | _chờ_ | huỷ dòng cuối làm tên cũ "sống lại" |
| R9 | Cờ vượt số khách so với dịch vụ đông nhất | _chờ_ | cờ bật nhầm ở đơn nhiều nhóm |
| R10 | Kiểm độc lập giữa chừng sau Phần A | _chờ_ | — |
| R11 | `0036` (trigger khoá cột cũ) — mặc định không làm | _chờ_ | có ⇒ không lùi được từ phát hành 2 |

## 5. Sự cố

_(ghi theo thời gian: gì xảy ra, ảnh hưởng, đã làm gì)_

## 6. Nợ còn lại (không chặn gộp)

- _(điền)_
- **Đã biết từ kế hoạch:** ngoại lệ `DOC_AUDIT_LOG_WONGUARD` có hạn (chủ chốt ngày ở đề xuất luật mục 3); hết hạn thì `npm test` đỏ.

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

| Lệnh | Kết quả |
|---|---|
| `npm test` | |
| `npm run typecheck` | |
| `npm run build:web` | |
| `npm run test:e2e` (đủ bộ) | |
| Chrome (mốc A0 + mới) | |
| Tiêu chí mục 3 kế hoạch, từng dòng | |

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc)

### Kiểm độc lập giữa chừng — Task A20

_(điền: mốc commit, phạm vi, kết luận ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, phát hiện, việc đã sửa)_

### Kiểm độc lập cuối phát hành 1 — Task K2

### Kiểm độc lập Phần B — Task K2

### Kiểm độc lập phát hành 2 — Task K2

## 9. Chưa kiểm (lúc viết mục này)

- _(điền)_

## 10. Phát hành (chủ dự án tự chạy — Task K3)

| Lần | Nhánh / commit | Số bản | Migration | Worker (id) | Mốc lùi | Kiểm sau (kiem-phien-ban, audit remote, GET 401) |
|---|---|---|---|---|---|---|
| Phát hành 1 | | | `0034`, `0035` | | | |
| Phần B (nếu riêng) | | | không | | | |
| Phát hành 2 | | | `0036` nếu R11 | | | |
