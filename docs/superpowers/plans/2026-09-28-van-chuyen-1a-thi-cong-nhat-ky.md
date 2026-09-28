# Nhật ký thi công Vận chuyển lượt 1a (ADR-0040)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-28-van-chuyen-1a.md` (vai lập kế hoạch, 2026-09-28; đo trên `9ead2e7`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` (CHỜ CHỦ DUYỆT).
- **Nguồn chuẩn tắc:**
  - ADR-0040 (accepted 2026-09-28; dòng trạng thái `9ead2e7`: chủ trả lời "Mọi nhân viên" cho ô xem giấy tờ của chính mình);
  - danh sách màn `docs/superpowers/specs/2026-09-28-van-chuyen-1a-man-hinh-can-ve.md`.
- **Nhánh thi công:** _(điền)_. Tạo từ `main` @ _(điền mã commit)_, sau khi `main` có ADR-0040 và kế hoạch (hoặc từ đỉnh nhánh kế hoạch — ghi rõ).
- **Cách thi công:** _(điền: subagent-driven-development / executing-plans; ai thi công task nào)_.
- **Trạng thái:** CHƯA BẮT ĐẦU. Phần A làm ngay; Phần B **chờ bản vẽ** Claude Design của chủ. Chưa push, chưa gộp, chưa lên production.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả của người kiểm độc lập ghi ở mục 8.

## 1. Mốc ban đầu (Task A0)

| Mục | Kết quả |
|---|---|
| Bước 1: ADR-0040 (accepted, có câu "Mọi nhân viên") trên nhánh thi công | _(điền)_ |
| Bước 2: `docs/quyen-hoan.json` → `phat_hien` | _(điền; kế hoạch đo `[]` trên `9ead2e7`)_ |
| Bước 3: `DRIVER` / `vehicle.manage` / `party.document.*` chưa có trong `permissions.ts`, `roles.ts` | _(điền)_ |
| Bước 4: số migration lớn nhất trên nhánh; kết quả quét mọi nhánh; số dùng cho 1a | _(điền; kế hoạch dự kiến 0031–0033, 0029 giữ cho Thông báo)_ |
| Bước 5: `npm test` (số test) / `npm run typecheck` | _(điền)_ |
| Bước 6: `npm run test:e2e` đủ bộ — kịch bản đỏ sẵn có | _(điền)_ |
| Bước 7: Chrome (`vai-smoke`, `dot-a-smoke`, `trang-chu-smoke`) — số ✓/✗; **số ô vai `vai-smoke.mjs:34` thật sự đếm được** | _(điền)_ |
| Bước 8: số dòng trích dẫn lệch so với kế hoạch (đo trên `9ead2e7`) | _(điền)_ |
| Bước 9: khẳng định "đúng số lượng / đúng danh sách" tìm thêm được | _(điền)_ |

**Đỏ sẵn có trên nhánh gốc** (không phải lỗi của 1a): _(điền)_

## 2. Câu trả lời của chủ dự án

| Câu | Nội dung | Trả lời (nguyên văn, ngày) | Ảnh hưởng |
|---|---|---|---|
| R5 (điều phối hỏi) | Ô "xem giấy tờ của chính mình (số che)" mở cho ai | **"Mọi nhân viên"** — phương án A, 2026-09-28 (ghi ở dòng trạng thái ADR-0040, `9ead2e7`) | Task A7 (không còn phụ thuộc) |
| Q1 | Quản trị có được nhập / xem đủ số giấy tờ của tài khoản cấp trên | _(điền; mặc định (a) không — áp luật cấp bậc)_ | Task A8, A9 |
| Q2 | Thêm xe có bắt buộc số khung | _(điền; mặc định (a) bắt buộc ở máy chủ)_ | Task A13 |
| Đề xuất luật | Duyệt `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` (mục 1–5; 2e tuỳ chọn) | _(điền)_ | Task K3 |
| Truy vấn chỉ đọc (Ruling R1; kế hoạch mục 9 bước 4) | Số hồ sơ đang giữ vai "Tài xế" cũ (`DRIVER`) trên production: đang giữ / tổng số dòng | _(điền: hai con số)_ | Task K3 (chỉ để biết; lượt 1a không đổi các dòng đó) |
| Bản vẽ | Link Claude Design bảy màn | _(điền: link, ngày)_ | Phần B |

## 3. Bảng từng task

Cột "Đột biến P16": sửa cố ý → đỏ → hoàn nguyên → xanh. Chép **nguyên văn** dòng đỏ, kèm ngày.

| Task | Việc | Commit | `npm test` sau | Dòng ĐỎ trước (đã thấy) | Đột biến P16 (ngày · đột biến · dòng đỏ) | Người kiểm |
|---|---|---|---|---|---|---|
| A0 | Điều kiện trước, mốc | — | _(điền)_ | — | — | — |
| A1 | `src/shared/giay-to.ts` | _(điền)_ | _(điền)_ | _(điền)_ | — | _(điền)_ |
| A2 | Quyền `DRIVER`, vai `DRIVER_INTERNAL`, migration 0031, cột thứ tám, 256 tập con | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô `order.view` của DRIVER; DRIVER vào OFFICE_GATE; bỏ `active = 0`)_ | _(điền)_ |
| A3 | Trang đầu `/tai-xe` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: bỏ nhánh DRIVER)_ | _(điền)_ |
| A4 | Vai đã ngưng không gán mới | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: bỏ lời kiểm)_ | _(điền)_ |
| A5 | Migration 0032 giấy tờ của người | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: 9 khối — CCCD ins/upd, superseded, voided, identity, no_delete, renew_ins, next_uq, CHECK GPLX)_ | _(điền)_ |
| A6 | Luật thuần giấy tờ người | _(điền)_ | _(điền)_ | _(điền)_ | — | _(điền)_ |
| A7 | Route đọc + ô `party.document.view/write` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô view; ô write; che số)_ | _(điền)_ |
| A8 | Route ghi (thêm / gia hạn / sửa sai / huỷ dòng) | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô write; cấp bậc; dòng hiện hành; số vào nhật ký)_ | _(điền)_ |
| A9 | Xem đủ số + ô `party.document.reveal` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô; thứ tự nhật ký; cấp bậc)_ | _(điền)_ |
| A10 | Danh mục loại giấy tờ người + hạng | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: luật 4 hàng rào 2; `fixed_type`)_ | _(điền)_ |
| A11 | Hàm công bố `expiringDriverDocuments` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: bỏ lọc vai; thêm cột số)_ | _(điền)_ |
| A12 | Migration 0033 + sổ dữ liệu + cạnh / tiền tố (nới) | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: chỉ mục biển số, số khung; CHECK ngừng; trigger; bỏ cạnh parties)_ | _(điền)_ |
| A13 | Module `van-chuyen`: xe + ô `vehicle.manage` + STRICT | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô; số khung; `.prepare` thô)_ | _(điền)_ |
| A14 | Giấy tờ xe | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô; dòng hiện hành)_ | _(điền)_ |
| A15 | Danh mục loại giấy tờ xe, ngưỡng, danh sách sắp hết hạn | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: `settings.ops`; lọc xe ngừng; `vehicle.manage`)_ | _(điền)_ |
| A16 | Bài toàn tuyến che số + nhật ký không số | _(điền)_ | _(điền)_ | — | _(điền: số vào detail; `cheSo` trả nguyên; bớt ca `TUYEN`)_ | _(điền)_ |
| A17 | `R-PTY-2..4`, `R-VC-1..2` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ba đột biến SQL)_ | _(điền)_ |
| A18 | Bài cổng toàn tuyến của tài xế (siết, có thể bỏ) | _(điền hoặc "không làm")_ | _(điền)_ | — | _(điền: DRIVER vào ORDERS_GATE)_ | _(điền)_ |
| A19 | Trang Danh mục giấy tờ (khuôn sẵn) + Chrome | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: bỏ điều kiện liên kết)_ | _(điền)_ |
| A20 | E2E `van-chuyen` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô `vehicle.manage` của ADMIN = none)_ | _(điền)_ |
| A21 | Sổ hàng rào | _(điền)_ | — | — | — | _(điền)_ |
| A22 | Tài liệu mô tả + đề xuất luật | _(điền)_ | _(điền)_ | — | — | _(điền)_ |
| A23 | Kiểm toàn bộ Phần A (tự khai) | — | _(điền)_ | — | — | — |
| A24 | Kiểm độc lập giữa chừng (khuyến nghị) | — | — | — | — | _(điền hoặc "điều phối không chọn")_ |
| B0–B8 | Phần B — giao diện theo bản vẽ | _(điền từng task)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| K1 | Nhật ký thay đổi (số bản chốt lúc gộp; tạm 1.35) | _(điền)_ | _(điền)_ | — | — | _(điền)_ |

## 4. Phán quyết của điều phối (Ruling) — kèm giá nếu sai

Ruling đã có trong kế hoạch (mục 0), chép lại:
- **R1:**
  - Mã vai tài khoản **`DRIVER_INTERNAL`**, nhãn **"Tài xế công ty"** (khuôn `GUIDE_INTERNAL`).
  - Không dùng `DRIVER` cho vai: `pty_role_type` đã có `DRIVER` nhóm OTHER, `migrations/0011:76`.
  - Ngưng dòng `DRIVER` cũ (`active = 0`) để máy chặn gán mới.
  - Chủ chạy truy vấn chỉ-đọc đếm hồ sơ đang giữ vai `DRIVER` trước khi triển khai.
  - Mã quyền app `DRIVER` giữ được (tiền lệ `INTERN`).
  - **Tiền đề đã sửa trong kế hoạch:** `active = 0` hôm nay chỉ ẩn ở giao diện; Task A4 thêm lời kiểm ở route cho hàng rào máy thật. Áp cho **mọi** loại vai đã ngưng — điều phối có thể hẹp lại.
- **R2:**
  - Cột `DRIVER` không "tuyệt đối none". Ngoại lệ: `feedback.submit = any`, `feedback.view = own`, ô "xem giấy tờ của chính mình" (`own`); còn lại `none`.
  - Có bài ghim cả hàng.
- **R3:**
  - Tài khoản chỉ `DRIVER` đi tới trang đầu riêng (`/tai-xe`, qua `homeRedirect`), không gọi `/api/orders/dashboard`.
  - Có test khoá.
- **R4:**
  - Route "xem giấy tờ của chính mình" có cổng `"staff"`; thân route tự chặn Đối tác.
  - Route chỉ trả giấy tờ của chính người gọi, số che.
- **R5:** Chủ trả lời 2026-09-28: ô "xem giấy tờ của chính mình" mở cho **mọi nhân viên nội bộ** (A). Task A7 không còn phụ thuộc.

Ruling mới:
- _(điền: số hiệu, nội dung, vì sao, giá nếu sai)_

## 5. Sự cố

- _(điền)_

## 6. Nợ còn lại (không chặn gộp)

- **Lượt 1b** (ADR-0040 D3, thiết kế §4–§5):
  - ô "xem cuốc xe của mình" cho `DRIVER`;
  - trang `/tai-xe` hiện cuốc xe;
  - nghĩa của hạng GPLX (chở tối đa bao nhiêu khách);
  - bộ điều kiện xuất bến;
  - khoảng nghỉ;
  - chuyến / điểm dừng / phân bổ khách.
- **Lượt 2:** tài xế đối tác (nhóm bên ngoài) + sửa LC-1; quyết số phận mã vai hồ sơ cũ `DRIVER`.
- **Nhắc hạn trên chuông** (cơ chế nhắc theo thời gian) — ADR-0040 D1 để sau.
- **Chuyển chủ xe** (khi đổi công ty chủ, hoặc xe thuê) — ADR-0040 D1: "việc riêng".
- **Ảnh giấy tờ** (thiết kế H5 nhắc "ảnh giấy"): chưa làm ở 1a.
- _(điền thêm)_

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

- `npm test`: _(điền)_ · `npm run typecheck`: _(điền)_ · `npm run build:web`: _(điền)_
- `npm run db:migrate:local` (D1 đọc được 0031–0033): _(điền đầu ra)_
- `npm run test:e2e` đủ bộ + `audit-invariants --strict` (có `R-PTY-2..4`, `R-VC-1..2`): _(điền)_
- `node scripts/audit-invariants.mjs --db local`: _(điền)_
- `node --test "tests/audit/*.test.mjs"`: _(điền)_
- Chrome Phần A: `vai-smoke` _(điền)_ · `dot-a-smoke` _(điền)_ · `trang-chu-smoke` _(điền)_ · `dot-c-smoke` _(điền)_ · `danh-muc-giay-to-smoke` _(điền)_
- Chrome Phần B: _(điền từng kịch bản)_

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc)

- **Giữa chừng — Task A24 (nếu điều phối chọn):** _(điền: ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, ngày, mã commit; phép đột biến tự làm; phán ba điểm ở kế hoạch mục 14)_
- **Cuối — Task K2 (bắt buộc):**
  - **Kết luận:** _(điền: ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, ngày, trên mã commit nào)_
  - **Phép đột biến người kiểm tự làm:** _(điền)_
  - **Phát hiện và cách xử lý:** _(điền)_

## 9. Chưa kiểm (lúc viết mục này)

- _(điền: ví dụ iPhone thật, tài khoản thật trên production, dữ liệu hồ sơ giữ vai "Tài xế" cũ)_

## 10. Phát hành (chủ dự án tự chạy — Task K3)

- Chủ đã duyệt tệp đề xuất luật: _(điền ngày, nguyên văn)_; commit áp từng tệp luật: _(điền)_
- `npm run day-len -- <nhánh>`: _(điền: ngày giờ, kết quả)_
- `npm run trien-khai` (có migration 0031–0033): _(điền: số phiên bản, Worker, mốc lùi, `audit-invariants --db remote`, cổng phiên bản sau deploy)_
- AI kiểm bằng GET công khai sau triển khai: _(điền)_
