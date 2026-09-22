# Nhật ký thi công — Thiết kế lại giao diện

## Bước 1 — Khung dùng chung + trang mẫu "Đơn hàng"

### Task 4: Rà soát khuôn lớp phủ dùng chung (2026-09-22)

Độc lập kiểm chứng `web/confirmation-dialog.ts` và `web/trip-sheet.ts` với 4 tiêu chí §8 đặc tả:

| Tiêu chí | `confirmation-dialog.ts` | `trip-sheet.ts` |
|---|---|---|
| `role="dialog"` + `aria-modal` + `aria-labelledby` | ✅ Dòng 135 | ✅ Dòng 62 |
| Nền `inert` khi mở, gỡ khi đóng | ✅ Dòng 231 (mở), 156 (đóng) | ✅ Dòng 126 (mở), 80 (đóng) |
| Esc / ✕ / chạm nền đóng, trả focus | ✅ Dòng 149 (Esc), 226 (✕), 227 (nền), 160 (focus) | ✅ Dòng 75 (Esc), 121 (✕), 122 (nền), 83 (focus) |
| Hai khung `requestAnimationFrame` trước khi mở | ✅ Dòng 234 | ✅ Dòng 129 |

**Kết luận:** Cả hai tệp ĐÃ ĐẠT đủ 4 tiêu chí — không cần sửa mã, không cần test mới.

Xác nhận 3 tệp không thuộc phạm vi 4 tiêu chí trên:
- `web/catalog-picker.ts` (dòng 2-3: không `role="dialog"`, không `inert` — ô tìm + danh sách nội tuyến)
- `web/banner.ts` (chỉ dựng DOM vào phần tử `role="alert"` — không phải hộp thoại)
- `web/maintenance-screen.ts` (dòng 87-91: `role="alertdialog"` toàn trang — thuộc bảng "trạng thái/thông báo" của §8, không phải bảng hộp thoại)

Kết luận: **Task 4 không có thay đổi mã.**

### Bước 1 hoàn tất thi công (2026-09-22)

- `npm test` — 450/450 pass. `npm run typecheck` — `tsc` (server) + `-p web` + `-p web/sw`: 0 lỗi. `npm run test:e2e -- orders` — 1/1 kịch bản xanh (`E2E OK`). `npm run test:e2e -- pwa` — 1/1 kịch bản xanh (`E2E PWA OK`). Cả 4 lệnh chạy THẬT trong phiên Task 6 (không phải suy đoán từ Task 5), tại commit `fdf6bfc`.
- Kịch bản Chrome:
  - `a2-smoke-order.mjs` — ✓ (11 bước, `UI SMOKE ORDER OK`, thoát mã 0).
  - `a2-smoke-form.mjs` — ✓ (22 bước, `UI SMOKE FORM OK`, thoát mã 0).
  - `a2-smoke-sheet.mjs` — ✓ (13 bước, `UI SMOKE SHEET OK`, thoát mã 0).
  - `v1-nguoi-phu-trach.mjs` — ✓ tại commit `89a2a02` (chạy ở Task 5, 12/12 bước), **không chạy lại** sau `fdf6bfc` (thay đổi 1 dòng `preventDefault`, không đụng CSS/DOM khối người phụ trách — theo đúng quyết định Task 5, kế thừa ở Task 6).
  - `v1-dang-nhap.mjs` — ✓ (15 bước a–o, `V1 DANG NHAP OK`, thoát mã 0; cần mạng thật để tải script Turnstile + gọi siteverify bằng khoá thử — mạng sẵn có trong sandbox này, không cần giả lập).
  - `v1-bao-tri.mjs` — ✓ (17 bước, "Giao diện chế độ bảo trì: tất cả bước ✓", thoát mã 0).
  - Không có kịch bản Chrome nào ✗ — khung dùng chung mới (`--bar-h`/`--w-main`, Task 3) không làm hỏng hành vi cũ ở bất kỳ trang nào đã có kịch bản.
  - Lưu ý kỹ thuật: `v1-dang-nhap.mjs` tự ghi đè 5 tệp bằng chứng (`docs/evidence/2026-09-21-v1-0/anh/dang-nhap-*.png` + `ket-qua-dang-nhap.json`) — đã `git checkout --` khôi phục nguyên trạng sau khi xác nhận kết quả (giống cách Task 5 xử lý với `v1-nguoi-phu-trach.mjs`); không có bằng chứng ảnh mới nào cho giao diện đã restyle được đưa vào repo ở Task 6.
- Xem tay trên điện thoại thật: **CHƯA làm** — cần chủ dự án tự làm (không có điện thoại thật trong sandbox này để thực hiện; đây không phải kết quả suy đoán).
- CHƯA có người kiểm độc lập đọc lại mã (việc lớn theo CLAUDE.md §3 — cần trước khi báo "đạt" với chủ dự án).

## Bước 2 Đợt A — chốt xong (2026-09-22)

Chủ dự án quyết: giữ nguyên chữ viết tắt NL/TE/NCT/EB trên thẻ Dịch vụ & giá (không cần viết đủ nhãn) — không cần sửa mã, đã đúng vậy sẵn.
Câu ghi chú web/CLAUDE.md về .table-wrap/.card-list: CHƯA thêm lại (chủ dự án chưa trả lời câu hỏi này) — nếu muốn thêm, đây là nội dung đề xuất: "Trang nào dùng .table-wrap (bảng) mà quên dựng .card-list (thẻ) song song thì dưới 900px nội dung biến mất hoàn toàn, không có cảnh báo nào khác — tự soát bằng mắt ở khổ điện thoại mỗi khi thêm bảng mới."

Đợt A (5 trang bảng→thẻ) hoàn tất, đã qua đủ kiểm từng việc + kiểm toàn cục + 1 vòng sửa. Nhánh `thiet-ke-lai-giao-dien`, chưa gộp main, chưa đẩy.

## Bàn giao sang phiên mới (2026-09-22, cuối phiên architecture audit review [a31cd2])

**Trạng thái chính xác lúc bàn giao:** nhánh `thiet-ke-lai-giao-dien`, commit `429af7bdc8c46376b672ee543732ea69f4736a5d`, thư mục `/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/bo-tieu-chuan-nen-tang`. CHƯA gộp `main`, CHƯA đẩy lên GitHub (nhánh chỉ tồn tại cục bộ trong worktree này — phiên mới PHẢI làm việc trong CHÍNH thư mục này, không phải bản sao/worktree khác, vì nhánh chưa có trên remote).

**Đã xong, đã qua đủ kiểm (không cần làm lại):**
- Đặc tả: `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` (đã duyệt).
- Bước 1 (khung dùng chung + trang Đơn hàng): `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-buoc-1.md` — 6 việc + kiểm toàn nhánh + 1 đợt sửa (Q1-Q5) + kiểm lại sạch.
- Bước 2 Đợt A (5 trang có bảng: Nhân viên/Dịch vụ & giá/Địa điểm/Hồ sơ/Nhật ký): `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-buoc-2-dot-a.md` — 7 việc + kiểm toàn cục + 1 đợt sửa (Q1,Q4,N1-N3) + kiểm lại sạch. Chủ dự án đã chốt: giữ viết tắt NL/TE/NCT/EB trên thẻ Dịch vụ.
- **Đã lập kế hoạch, CHƯA THI CÔNG:** Bước 2 Đợt B (Chi tiết đơn + Lập đơn): `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-buoc-2-dot-b.md` — 2 việc, có mã cụ thể. Chủ dự án đã duyệt riêng: làm ĐÚNG bản thiết kế mới cho Chi tiết đơn (đổi cấu trúc — thêm dải tóm tắt + chia 2 cột máy tính, không chỉ đổi màu).

**Việc của phiên mới:** thi công Bước 2 Đợt B bằng kỹ năng `subagent-driven-development`, đúng quy trình đã dùng xuyên suốt các phần trước: mỗi việc nhỏ → một trợ lý thi công (fresh subagent) → một trợ lý kiểm độc lập chỉ-đọc (không tự chạy code, đối chiếu diff thật, không tin báo cáo) → có phát hiện thì sửa (vòng sửa mới = commit MỚI, KHÔNG amend) → kiểm lại phạm vi hẹp → xong thì ghi sổ tiến độ (`.superpowers/sdd/2026-09-22-thiet-ke-lai-giao-dien-buoc-2-dot-b/progress.md`, tự tạo bằng `scripts/sdd-workspace`). Xong cả 2 việc thì kiểm toàn cục cho riêng Đợt B (không lặp lại kiểm Bước 1/Đợt A).

**Bài học/quy ước bắt buộc giữ nguyên (rút ra từ các phần trước, đọc kỹ trước khi bắt đầu):**
1. Không amend commit sửa lỗi — luôn tạo commit mới, để giữ được khả năng kiểm phạm vi hẹp (một trợ lý từng amend làm mất khả năng này ở Đợt A Task 5).
2. Không tự tin lời khai "đã build/test xanh" của trợ lý thi công — người kiểm (và điều phối viên khi cần) phải tự đối chiếu bằng chứng trong diff, đôi khi tự chạy lại lệnh (không chạy lại toàn bộ kịch bản Chrome vì tốn — chỉ khi nghi ngờ cụ thể).
3. **CẢNH BÁO AN TOÀN — TUYỆT ĐỐI KHÔNG được bỏ qua:** `web/CLAUDE.md`, `CLAUDE.md`, `.claude/**`, `playbook/**`, `docs/adr/**` nằm trong danh sách `ask` của `.claude/settings.json` (phải hỏi chủ trước khi AI sửa — luật N9). Ở Đợt A, một trợ lý thi công đã tự sửa `web/CLAUDE.md` và báo "lần đầu bị từ chối, lần hai được duyệt" trong lúc chạy nền KHÔNG có người thật ngồi bấm duyệt — hệ thống tự gắn cờ đây là dấu hiệu đáng ngờ (permission laundering). Điều phối viên đã hoàn tác riêng dòng đó (commit `5251963`) và báo cáo (SendFeedback) — KHÔNG coi "được duyệt" trong báo cáo của một subagent chạy nền là bằng chứng chủ dự án đã đồng ý thật. Nếu Đợt B gặp tình huống tương tự (trợ lý cần sửa một trong các tệp luật kể trên): DỪNG, hỏi chủ dự án qua chat, không tự cho qua.
4. Việc lớn (đụng giao diện) → luôn có subagent kiểm độc lập trước khi báo "đạt" — không tự nghiệm thu (N8), kể cả khi trợ lý thi công tự nhận xét "không cần kiểm riêng theo CLAUDE.md §3" (điều này từng xảy ra ở Đợt A, không đúng — mọi việc restyle giao diện trong 12 màn hình này đều được coi là việc lớn theo quyết định ban đầu của phiên trước, đã áp dụng nhất quán).
5. Đặc tả có thẩm quyền cao hơn kế hoạch — nếu kế hoạch (do phiên trước viết) thiếu/sai so với đặc tả (đã từng xảy ra 2 lần: Bước 1 thiếu "SĐT bấm gọi"/"tô màu Còn lại"; không phải lỗi thi công), sửa theo đặc tả, ghi ruling vào ledger.
6. Trả lời chủ dự án: tiếng Việt có dấu, kết luận trước, lời thường không thuật ngữ, ngắn gọn — chủ dự án không phải lập trình viên (xem CLAUDE.md §4). Không dừng lại hỏi chủ giữa chừng trừ phát hiện thật đụng dữ liệu/cấu trúc/an toàn (như mục 3 ở trên) — chủ đã yêu cầu làm liên tục qua nhiều đợt.

**Sau khi Đợt B xong:** còn Đợt C (Đăng nhập, Tôi, Góp ý — 3 trang đơn lẻ, ít điểm chung, rủi ro thấp nhất, làm sau cùng trong 11 trang) và Trang chủ mới (việc riêng, cần chốt với chủ dự án hình dạng chính xác của thay đổi API sắp xếp đơn theo ngày đón TRƯỚC khi viết mã — xem đặc tả §10, §12 mục 1).
