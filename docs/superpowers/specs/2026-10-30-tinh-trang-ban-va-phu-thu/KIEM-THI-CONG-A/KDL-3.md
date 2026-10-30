# KĐL-3 — Kiểm độc lập toàn nhánh trước phát hành (ADR-0146 + ADR-0152)

> Hồ sơ có ngày 30/10/2026. Người kiểm: subagent `nguoi-kiem-doc-lap`, chỉ đọc; người điều phối chép báo cáo. Phạm vi: `origin/main..715a736c`, trọng tâm T11–T15. Giữa chừng chủ dự án yêu cầu làm nhanh: bỏ chạy lại bộ kiểm dài (`npm test` đã chạy xong trước khi nhận lệnh; e2e dừng giữa chừng).

## Kết luận: **ĐẠT CÓ ĐIỀU KIỆN** — không mục CHẶN; 3 NÊN SỬA (chữ Trợ giúp, quy trình); không lỗi mã.

## Chạy lại
- `npm run typecheck`: thoát 0. `npm run build:web`: không lỗi.
- `npm test` đủ bộ (người kiểm tự chạy): bước 1 6884 bài, 6880 qua, **0 đỏ**, 4 todo; bước 2 1/1; thoát 0. `phat-hien-han` xanh (chưa tới 06/11).
- `npm run db:migrate:local`: «No migrations to apply!». `audit-invariants --db local`: «Mọi bất biến đạt, 1 cảnh báo» (cảnh báo cũ, không liên quan); R-PRC-8, R-CTL-1/2/3 ✓.
- e2e: **không chạy đủ** — dừng theo lệnh chủ khi đã 73 ✔, 0 ✖. Số 79/79 trong sổ là của người thi công, người kiểm không kiểm lại.
- Bài liên quan T11–T15 (14 nhóm tệp): 332/332 xanh.
- Đột biến (bản sao `/tmp/kdl3-mut`): `phuDichVu` vế 3 bỏ điều kiện «cùng nhóm» → đỏ 2 bài («tiêu chí 9», «tiêu chí 10 / CV-3»).

## Mục 2 — bằng chứng Chrome (`docs/evidence/2026-10-30-luat-ban-dac-diem/`, 41 ảnh, 3 kịch bản; không chạy lại — thiếu AXE_JS)
- Không chữ Anh / mã thô trên màn; nhãn phạm vi qua `src/shared/luat-ban-hien-thi.ts:9`.
- R-1 có trong mã (`luat-ban-hien-thi.ts:13`, `:43`); luật đã kết thúc hiện «29/10/2026 (hôm qua)».
- GHI NHẬN: ảnh `luat-ban-4-hop-ket-thuc-390.png` bị ba toast che phần hậu quả của hộp «Kết thúc ngay» ⇒ ảnh không chứng minh câu R-1 trên 390; nên chụp lại.

## Mục 3 — mã giao diện: đạt
- Không `innerHTML`/`confirm()`/`alert()` mới (ba `confirm(` cũ ở `web/catalog.ts` có từ trước; ratchet xanh). CSS `.dd-*`, `.lb-*` sau dấu mốc PWA, chỉ token.
- `src/shared/luat-ban-phu.ts`: ba vế đúng ADR-0152 Đ2; máy chủ và giao diện dùng chung (một nguồn).
- `muc-giao-dien.ts`: `hien` của hai trang cùng điều kiện route GET (`can` + `!holdsPartner`).
- `dongYDoiNhom` (`web/catalog.ts:255`) không hỏi `can`: 403 ⇒ câu «chưa kiểm được»; chấp nhận (GHI NHẬN).

## Mục 4 — bảng tiêu chí: mỗi tiêu chí ADR-0146 1–13 và ADR-0152 1–19 có bài tên rõ, xanh. Chỉ phần hiển thị của tiêu chí 17, 17b dựa vào Chrome (chưa tái hiện).

## Mục 5 — runbook `docs/HANDOFF-N1.md`: lệnh chép-dán chạy được, có `cd`; không lệnh ghi remote cho AI; lệnh đếm 1 khớp R-9 từng ký tự.
- **NÊN SỬA 1:** bước `git mv` đổi tên tệp ADR là thủ công, máy không canh; quên thì `main` có hai tệp số 0151. Đề xuất nhấn mạnh «không đổi tên thì đừng `day-len`» hoặc thêm bài kiểm liên kết mục lục.
- GHI NHẬN: lệnh đếm 2 của phiếu chốt chỉ liệt kê loại do người dùng thêm; người thi công đã thêm lệnh đọc đủ loại.

## Mục 6 — tệp luật và Trợ giúp
- `src/CLAUDE.md` (+1/−1: hai câu ngoại lệ SIẾT ADR-0146 + câu đặc điểm ADR-0152), `web/CLAUDE.md` (hai dòng mới + sửa dòng nhóm dịch vụ), `docs/ARCHITECTURE.md` (một dòng 5.2 «lệch có chủ ý, hẹp»): đúng Q-6, không đổi nghĩa dòng cũ.
- Trợ giúp: mọi `[[nút]]` cũ còn; nút mới có thật. Nhưng rút gọn làm mất nghĩa:
  - **NÊN SỬA 2** (`src/shared/huong-dan-ban-hang.ts`): mất «chỉ đặt gấp được khi lượt đó thật sự đã qua hạn chốt»; «Huỷ được đơn chờ xác nhận lẫn đã xác nhận» → «Huỷ được đơn bạn lập hoặc đang phụ trách» (mất phạm vi trạng thái); mất «thêm ghế khi xe còn chỗ»; mất «bạn nhận tin nếu đơn liên quan tới bạn» (HDV nhận).
  - **NÊN SỬA 3** (`src/shared/huong-dan-quan-tri.ts`): mất «Văn phòng thêm dịch vụ nhập tay vào đơn nháp của Đối tác thì Đối tác không tự xác nhận được — văn phòng xác nhận thay»; «Tài khoản nhiều vai trò: một vai trò bật là dùng được»; «Thử key» báo «sai hay hết tiền», «Đổi key làm ngoài Nền tảng»; «tài khoản Toàn quyền vẫn dùng bình thường» (bảo trì); «Chỉ hiện ở trang Tôi của tài khoản Toàn quyền». Đề xuất khôi phục câu có hậu quả nghiệp vụ, nén chỗ khác (trần đọc đã sát).

## Mục 7 — lệch tự khai
- Hai lần nâng trần `goi-trang-nhe` (101.719 → 102.250): đúng số đo, có lý do, theo tiền lệ 27/10 — chấp nhận; dài hạn mỗi trang quản trị mới làm phình gói Đơn hàng.
- Sửa `ds-v2/` (bundle.css, tokens.json): do bài `bo-v2-khop-ma` bắt buộc đồng bộ — hợp lệ.
- Thứ tự e2e (`luat-ban` sau `loai-doi-tac`): hợp lý. R-CTL-3 mã riêng mức cảnh báo: hợp lý. §16 SYSTEM-DESIGN (Q-1 (a) lệch chữ ADR-0146 Đ3): đúng CLAUDE.md §2, chủ cần ghi vào ADR.

## Không kiểm được
Chrome (thiếu AXE_JS); e2e đủ bộ (dừng theo lệnh chủ ở 73 ✔ / 0 ✖); production; lệnh đếm bước 6 trên dữ liệu thật.

## Người điều phối xử lý (30/10)
- NÊN SỬA 1: đã sửa — runbook nhấn mạnh «CHƯA đổi tên thì ĐỪNG `day-len`», nêu hậu quả; dòng trạng thái ghi KĐL-3.
- NÊN SỬA 2, 3: **chưa sửa** (chủ yêu cầu hoàn thành nhanh; sửa phải cân lại trần đọc Trợ giúp) — ghi nợ `NỢ-TRO-GIUP-RUT-GON` ở sổ thi công, trình chủ quyết trước khi phát hành.
