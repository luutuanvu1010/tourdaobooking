# Nhật ký thi công Đợt 5B — công tắc giờ đón cho đơn Đối tác (ADR-0193)

Kế hoạch mẹ: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần VIII (Đợt 5B, Task 5B.1–5B.5), Phần X. ADR: `docs/adr/ADR-0193-*.md` (accepted 2026-11-09).
Nhánh: `claude/dot-5b-cong-tac-gio-don-e5da0d` (worktree `admin-delete-data-decision-31f0fc`), cắt từ nhánh kế hoạch, đã chứa `origin/main` lúc bắt đầu (10/11). Vai phiên: THI CÔNG (không tự nghiệm thu, N8).
Xây trên lỗ đang hở: **HC-5.19** (khoá `xay_tren_cho_phep_adr_0193`).

## Câu hỏi chủ — áp phương án (a) (chủ chưa trả lời riêng; kế hoạch ghi hết giờ theo (a))

1. Phát hành: **chỉ nhập sau buổi diễn tập khôi phục**. Nhánh nằm yên; KHÔNG đưa lệnh nhập.
2. Câu (ii): xét **mọi lượt còn mở** (`closed_at IS NULL`), kể cả chiều về.

## Số đã đặt

- Migration **0157** `0157_cong_tac_gio_don_doi_tac.sql`: `main` tới 0156, không nhánh / worktree chưa gộp nào có 0157+ (liệt kê `git branch -a --no-merged origin/main` + `git ls-tree`). Giữ chỗ ở thư mục ghi chú chung (`2026-11-10-giu-cho-migration-0157-dot-5b.md`).
- Nhật ký thay đổi: mục **2.90 (số tạm)**; bước A.0 đặt lại số và ngày lúc nhập (5A có thể nhập trước).

## Commit

| Task | Commit | Việc |
|---|---|---|
| 5B.1 | `c2dcef4e0` | migration 0157 + `docBatBuocGioDon` / `gioDonMoiNhat` / `cauThemGioDon` (ở `xac-nhan-repo.ts`) + `GET/POST /api/cai-dat/bat-buoc-gio-don` + nút trang Tôi (`web/gio-don-cai-dat.ts`) + nhật ký `pickup_time_policy_changed` + bảng tham chiếu + từ điển dữ liệu |
| 5B.2 | `df5d2572d` | `coChotGio` (tệp thuần `gio-don-cai-dat.ts`); route Gửi đơn đọc công tắc một lần; nhật ký «Gửi kiểm vé» bỏ «·» thừa khi `vi` rỗng; danh sách chờ `gioDon = null` khi lượt đầu thiếu giờ cả lúc cờ = 0 |
| 5B.3 | `1c9b8c40e` | `changChuaGioVaoHanChot` + `CAU_CHUA_GIO_SAT_NGAY` (`moc-toi-thieu.ts`); vế SQL mới của `ORDER_CONFIRM`; `chanChuaGioSatNgay` / `changDangLuu` (`xac-nhan-chung.ts`) ở ba cửa + `chanDoanXacNhan`; bảng Còn vé giữ nguyên khi gặp `chua_gio_sat_ngay` |
| 5B.4 | `ff063cf74` | `R-ORD-17w` đọc dòng chính sách hiệu lực tại `confirmed_at` (không dòng = Bật) |
| 5B.5 | (commit cuối nhánh) | nhật ký thay đổi 2.90, kịch bản Chrome, nhật ký này |

## Ruling / cách hiểu ghi lại (người kiểm xác nhận lại)

- **R5B-1 (lệch chữ ADR-0193 mục 1, theo kế hoạch Task 5B.2):** chỉ route Gửi đơn đọc công tắc. Khối `xacNhan` của chi tiết đơn không đọc: `canXN` vẫn dùng `canChotGioCuaNguoiLap` (nhánh A không phụ thuộc công tắc), lý do của yêu cầu đang mở lấy từ cờ đã chụp (`viCuaYeuCau`). Hai nơi vẫn «nói cùng một điều». Bài: `cong-tac-gio-don.test.ts` ca «chi tiết đơn … canXacNhan».
- **R5B-2 (vị trí tệp):** kế hoạch ghi `gio-don-cai-dat.ts` «đọc / ghi dòng hiện hành». SQL đặt ở `xac-nhan-repo.ts` (đã ở `NUA_NGHIEM`) theo khuôn công tắc ẩn khách, để khỏi khai thêm tệp vào `architecture.test.ts`; `lenhGhiBatBuocGioDon` ở `xac-nhan-route.ts` (cạnh `lanSau`); `gio-don-cai-dat.ts` chỉ còn `coChotGio` (thuần, chạy thẳng `node --test`). Route nằm ở `xac-nhan-route.ts` (chỗ thật của khối `/api/cai-dat/an-thong-tin-khach`), không phải `index.ts` như kế hoạch ghi.
- **R5B-3 (quy ước «<»):** câu (ii) dùng `${ngay} 00:00 < nguongMocVn(...)`; đúng 23:00:00.000 (hạn chốt 60 phút, đón ngày sau) chưa chặn, 23:00:01 thì chặn. Ghi ở chú thích hàm.
- **R5B-4 (thứ tự cổng ở Còn vé):** `pickup_time_required` → `chua_gio_sat_ngay` → đặt gấp (`xetDatGap`) → `short_notice_required` → `kiemCongXacNhan` → `confirmGaps`. Câu (ii) đứng trước đặt gấp vì lượt chưa giờ không dựng được dấu.
- **R5B-5 (409 kèm `legs`):** thân `ChuaGioSatNgayBody` có `legs: [{legId}]` (khuôn `PickupTimeRequiredBody`) để giao diện chỉ chỗ; câu báo nêu ngày đón sớm nhất trong các lượt chạm luật.

## Điều biết trước, không chặn (ghi cho người kiểm và chủ)

- **Đối tác ở nhánh B với lượt chưa giờ trong hạn chốt** nhận 409 bảo «điền giờ đón» mà form Đối tác không có ô giờ. Chỉ xảy ra khi lượt đầu có giờ (gửi thẳng qua API) mà một lượt khác (chiều về) chưa giờ và sát ngày — hiếm. Đối tác báo văn phòng.
- **R-ORD-17w cảnh báo thừa** khi yêu cầu gửi lúc Tắt (cờ = 0) mà Còn vé bấm sau khi Bật lại: câu kiểm đọc chính sách theo giờ xác nhận, đúng chữ ADR mục 6.
- **Bảng Còn vé**: lượt không bắt buộc chỉ có các khung giờ đã cài (không có «Giờ khác»). Khi câu (ii) chặn một lượt chiều về, người xét chọn được khung; muốn giờ lẻ thì Hết vé / Huỷ để người lập sửa. Không sửa vì phải chạm luật hiển thị ADR-0154 (ngoài phạm vi).
- `R-ORD-17w` đọc bảng 0157: D1 chưa áp 0157 thì «no such table» (thoát 2). `npm run trien-khai` chỉ chạy kiểm này SAU khi áp migration (`scripts/release-lib.mjs`).

## Kết quả kiểm (2026-11-10, trên đỉnh nhánh `17db1ce1d`)

- `npm test` đủ bộ (lần 2): 8795 bài, 8790 qua, 4 «todo» (bài chờ chủ quyết có từ trước: gộp hồ sơ hoa hồng N-11, bảo mật hai lớp ADR-0090, sổ đại lý SV-TA-07/08 — không thuộc nhánh), 1 đỏ duy nhất là `src/modules/parties/xac-minh-route.test.ts` (r7, «nhật ký không chứa số») — bài đỏ giả đã biết khi số ngẫu nhiên chứa dãy trùng (bộ nhớ `reference-bai-r7b-do-gia-0111`), chạy lại riêng 3 lần + người kiểm 1 lần đều 30/30 xanh; nằm ở phân hệ hồ sơ, không chạm nhánh này. Lần chạy đầu có 7 bài đỏ thật (bảng route chưa khai hai route mới, TC-23 theo hành vi cũ, chữ «Còn vé» đơn lẻ, gạch nhật ký thay đổi quá 160 ký tự) — đã sửa ở `f7ab7720c`.
- `npm test` chạy lại lần 3 (sau khi sang ngày 11/11, trước lần lưu này): **thoát 0** — 8795 bài, 8791 qua, 0 đỏ, 4 todo như trên; bài r7 lần này xanh (xác nhận là đỏ giả).
- `npm run typecheck`: 0 lỗi.
- `npm run test:e2e`: **90/90 kịch bản xanh** (799 giây), kể cả `audit-invariants`.
- Kịch bản Chrome `docs/evidence/2026-11-10-dot-5b-gio-don/kich-ban/gio-don-smoke.mjs` (có `AXE_JS`): **5/5 bước**, ảnh 390 + 1280 ở `…/anh/`.
- **Người kiểm độc lập (`nguoi-kiem-doc-lap`): ĐẠT**, không lỗi chặn, không mục nên sửa; xác nhận cả năm ruling R5B-1…R5B-5; tự chạy typecheck, 10 tệp bài (163/163), bài R-ORD-17w (3/3), và thử đột biến trên bản sao tạm: bỏ vế SQL mới thì bài đua và bài khoá hai phía đỏ. Hai điều nên báo chủ trùng mục «Điều biết trước» ở trên. Người kiểm không chạy e2e, Chrome (dựa vào kết quả người thi công).

## Đề xuất cho chủ — CHƯA ghi (tệp luật chỉ sửa khi chủ nói)

1. **Dòng Trạng thái ADR-0154** (`docs/adr/ADR-0154-*.md`), thêm cuối dòng Trạng thái: «Sửa đổi 2026-11-09 bởi ADR-0193: Đ1.2 (vế cờ) và Đ1.3 chỉ áp khi công tắc «Bắt buộc giờ đón cho đơn đối tác» Bật (mặc định Bật); thêm điều chặn xác nhận cho lượt đón chưa giờ đã vào hạn chốt (đóng phần còn hở của Đ1.7).»
2. **Phần «Điều kiện» của khoá `xay_tren_cho_phep_adr_0193`** (`docs/quyen-hoan.json`, mục `HC-5.19`), thay cụm «Điều kiện phát hành (trước hay sau diễn tập khôi phục): chủ CHƯA chọn — người phát hành hỏi chủ trước khi đưa migration này lên bản thật.» bằng: «Điều kiện: chỉ phát hành SAU buổi diễn tập khôi phục (phương án (a) của câu hỏi 1, kế hoạch 2026-11-08 Phần VIII — áp mặc định vì chủ chưa trả lời riêng; chủ chọn (b) thì sửa dòng này trước khi nhập).» Cần chủ xác nhận câu chữ trước khi ghi.

## Trạng thái nhánh

Xong thi công Task 5B.1–5B.5. Nhánh **nằm chờ tới sau buổi diễn tập khôi phục** (hẹn 30/11); KHÔNG đưa lệnh nhập. Trước khi nhập: gộp `origin/main` mới, kiểm lại số migration (0157) và số phiên bản (2.90 tạm), chạy lại bộ kiểm.

## Cập nhật 2026-11-11 — chủ chọn nhập trước diễn tập

- Chủ (chat 11/11), nguyên văn: «không, nhập nhánh chính luôn, vì diễn tập sẽ dời vào 25 tháng 11». Lời cho phép ghi ở khoá `xay_tren_cho_phep_adr_0193` (`docs/quyen-hoan.json`) và dòng Trạng thái kế hoạch mẹ. Số bản đánh lại thành **2.91** (5A đã lên 2.90); migration 0157 không trùng.
- Gộp `origin/main` (a83580774) vào nhánh: xung đột duy nhất ở `src/shared/changelog.ts`, giải bằng cách giữ 2.90 của 5A và đặt 5B thành 2.91.
- Kiểm lại sau gộp: `npm test` thoát 0 (8827 bài qua, 0 đỏ, 4 todo có từ trước); `npm run typecheck` 0 lỗi; `npm run test:e2e` 90/90 xanh (790 giây); người kiểm độc lập xem phần gộp: ĐẠT.
- Còn mở: dòng Trạng thái ADR-0154 (chờ chủ). Trước khi nhập phải kiểm `main` còn trùng `origin/main` (khối lệnh có rào lo việc này).

## Cập nhật 2026-11-11 (lần gộp thứ hai)

- Bản chính tiến tới `8f6934fca` (nhánh ADR lượt C / Đợt 6 nhập xong). Phần mới chỉ là tài liệu (ADR-0196, ADR-0197, đặc tả, mục lục ADR), không mã, không migration, không mục nhật ký thay đổi: gộp sạch vào nhánh 5B, giữ nguyên 2.91 và migration 0157.
- Kiểm lại: `npm test` thoát 0, `npm run typecheck` 0 lỗi. Không chạy lại e2e vì không có mã mới.
