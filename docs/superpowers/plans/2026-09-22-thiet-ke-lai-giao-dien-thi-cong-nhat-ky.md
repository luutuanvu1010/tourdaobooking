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

## Bước 2 Đợt B — chốt xong (2026-09-22)

Thi công theo đúng `subagent-driven-development`: 2 task (Chi tiết đơn, Lập đơn), mỗi task một trợ lý thi công riêng + một trợ lý kiểm độc lập riêng, sau đó một lượt kiểm toàn cục cho riêng Đợt B (model mạnh nhất). Sổ điều phối đầy đủ: `.superpowers/sdd/2026-09-22-thiet-ke-lai-giao-dien-buoc-2-dot-b/progress.md` (chưa xoá — giữ lại làm bằng chứng, có thể xoá ở phiên sau nếu chủ dự án không cần).

**Task 1 (Chi tiết đơn, `web/order.ts` + `public/app.css`, commit `14374ad`):** thêm dải tóm tắt đầu trang (mã đơn/badge, ngày đón, khách, số khách, còn lại) + bọc phần thân vào lưới 2 cột (Thanh toán dính cột phải ở máy tính). Kiểm độc lập: sạch ngay lần đầu, Approved, chỉ 2 gợi ý Minor không cần sửa (đã hoãn).

**Task 2 (Lập đơn, `public/order-form.html` + `web/order-form.ts` + `public/app.css`, commit gốc `bf7530b`):** dời nút Lưu/Quay lại vào cột phải, thêm khối tóm tắt số tiền vào thanh dính đáy điện thoại. Kiểm độc lập lần đầu phát hiện lỗi Critical thật: khối tóm tắt số tiền KHÔNG BAO GIỜ hiện ở bất kỳ khổ màn hình nào (lỗi thứ tự CSS — một rule "ẩn mặc định" vô tình đặt sau khối `@media` nên luôn thắng) + thiếu kịch bản kiểm hiển thị (nên lỗi lọt qua toàn bộ test/kịch bản cũ). Sửa 1 vòng (commit `d7f90f3`): dời rule mặc định lên đúng vị trí, thêm bước kiểm mới vào `a2-smoke-form.mjs` (đã tự dựng lại lỗi cũ để xác nhận bước kiểm mới bắt được trước khi phục hồi). Kiểm lại: cả 2 phát hiện ADDRESSED, sạch.

**Kiểm toàn cục Đợt B (`f076a1e..d7f90f3`):** phát hiện 2 vấn đề Important chỉ lộ ra khi nhìn toàn cục (không phải lỗi từng task riêng):
- Khối "Thanh toán" bị tụt xuống DƯỚI "Lịch sử" trên điện thoại (Task 1 bọc Thanh toán vào cột phải khiến thứ tự DOM bị đảo dưới mốc 900px) — lệch thứ tự cũ, không ai quyết. Ruling (điều phối viên tự quyết, việc bề mặt/đảo ngược được, không cần hỏi chủ): dời khối Lịch sử ra ngoài lưới 2 cột để khôi phục đúng thứ tự cũ trên điện thoại.
- Dải tóm tắt (Task 1) gộp "tổng số khách mọi dịch vụ" với "tên dịch vụ đầu tiên" khi đơn có nhiều dịch vụ — dễ đọc nhầm. Ruling: dùng lại đúng công thức rút gọn "tên đầu +N dịch vụ" đã có sẵn ở trang Đơn hàng (`web/orders.ts`), cho nhất quán.
Sửa 1 đợt duy nhất (commit `700dd62`, có bằng chứng ảnh thật khổ điện thoại xác nhận cả 2 điểm). Kiểm lại: cả 2 ADDRESSED, không lỗi mới — Đợt B sạch.

Các phát hiện Minor còn hoãn (không chặn, ghi cho phiên sau nếu muốn dọn): cấu trúc mã đơn+badge trong dải tóm tắt hơi khác 4 ô còn lại; 1 rule CSS thừa vô hại; dải tóm tắt không phải phần tử đầu trang (hiện trạng có từ trước, chưa đụng); vài nhãn viết hoa cứng trong DOM thay vì CSS; thanh dính đáy điện thoại lặp nhãn cho trình đọc màn hình (nên thêm aria-hidden); biên tương phản màu "Còn lại" trong dải tóm tắt không còn dư (4,67:1 so với sàn 4,5:1, nên ghi số vào comment). Chi tiết đầy đủ ở sổ điều phối.

**Kết quả cuối:** `npm test` 450/450 xanh, `npm run typecheck` 0 lỗi, tất cả bước trong kế hoạch đã đánh dấu xong. Nhánh `thiet-ke-lai-giao-dien`, HEAD `700dd62`, CHƯA gộp main, CHƯA đẩy remote (theo đúng luật CLAUDE.md §8 — chỉ chủ dự án tự chạy).

## Gộp main vào nhánh (2026-09-22, sau khi chủ dự án tự chạy `git merge`)

Chủ dự án tự chạy `git merge thiet-ke-lai-giao-dien` ở checkout gốc, gặp xung đột thật (không phải lỗi thao tác) vì `main` đã có PR #15 "kiem-toan-doi-tac" (ADR-0014: tài khoản Đối tác, FIELD sửa số khách/huỷ đơn, cơ chế điều chỉnh tiền sau xác nhận) — cả `main` và nhánh này cùng sửa `src/modules/orders/repository.ts` (hàm `listOrders`). Điều phối viên tự đọc kỹ cả 2 phiên bản, ghép trong worktree riêng (không đụng checkout gốc): giữ đúng logic số tiền HIỆN HÀNH sau điều chỉnh của `main`, giữ nguyên phần mở rộng tóm tắt dịch vụ/ghi chú/đã trả cho thẻ đơn của nhánh này — không tính năng nào bị mất. Có 1 xung đột phụ ở dòng import (2 symbol khác nhau thêm vào cùng vị trí, ghép cơ học, không rủi ro).

Trước khi commit: dispatch 1 subagent kiểm độc lập, chỉ đọc, model mạnh nhất (đúng luật việc chạm dữ liệu/tiền §3) — xác nhận ghép đúng ngữ nghĩa, tự chạy typecheck + test hẹp module orders, nhưng lưu ý CHƯA đủ vì kịch bản kiểm hồi quy chính (`tests/e2e/dispatch.mjs`: "trang danh sách đơn hiện đúng số đã sửa, khớp trang chi tiết") là e2e, chưa chạy. Sau đó chạy `npm run test:e2e` đầy đủ (16/16 kịch bản xanh, gồm cả 2 kịch bản kiểm đúng tình huống vừa ghép) + `audit-invariants` xanh. Commit `58380c7`.

Trước đó còn gặp 1 lỗi khi chủ dự án tự merge: git từ chối ghi đè `docs/design/mockup-by-ClaudeDesign/` vì máy chủ dự án có sẵn bản CHƯA lưu git ở đúng đường dẫn — đã hướng dẫn chủ dời tạm, so sánh (giống hệt phần nội dung thật, chỉ khác vài tệp phụ trợ của công cụ hiển thị), xoá bản dư, merge lại.

**Trạng thái cuối:** nhánh `thiet-ke-lai-giao-dien` giờ chứa TOÀN BỘ công việc thiết kế lại giao diện (Bước 1, Đợt A, Đợt B) + đã gộp hết `main` tính tới lúc này — build/typecheck/test/e2e/audit-invariants đều xanh. Việc còn lại: chủ dự án tự `git merge thiet-ke-lai-giao-dien` vào `main` ở checkout gốc (nay sẽ sạch, không còn xung đột vì nhánh đã chứa main), rồi tự quyết đẩy remote.

## Đợt C — chốt xong (2026-09-23): Đăng nhập, Tôi, Góp ý (11/11 trang restyle)

Phiên kế tiếp (cùng phiên đã gộp main ở trên) tự lập đặc tả con + kế hoạch (`docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-dot-c.md`, `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-dot-c.md`) theo yêu cầu của chủ dự án (qua phiên viết đặc tả gốc chuyển lời), rồi thi công theo đúng `subagent-driven-development` như các đợt trước: 4 task, mỗi task một trợ lý thi công + một trợ lý kiểm độc lập riêng, cuối cùng một lượt kiểm toàn cục.

**Task 1 (Đăng nhập, commit `540038e`+`ce712a7`):** thêm cột thương hiệu bên trái form, chỉ hiện ở máy tính (≥900px). Thêm 2 token mới (`--fs-hero`, `--w-login-wide`, kích thước — không cần hỏi chủ). Kiểm độc lập: sạch ngay lần đầu, Approved.

**Task 2 (Tôi, commit gốc `9e72723`):** chia 2 cột bằng nhau ở máy tính (hồ sơ+Việc của tôi+liên kết+đổi PIN trái, bảo trì phải). Kiểm độc lập lần đầu phát hiện 2 lỗi Important thật: (a) thứ tự hiển thị điện thoại bị đảo — khối bảo trì tụt xuống dưới form đổi PIN (đúng kiểu lỗi "Lịch sử tụt xuống dưới Thanh toán" ở Đợt B, do lồng div bọc theo thứ tự khác thứ tự DOM gốc); (b) "Việc của tôi" bị bó hẹp còn ≤420px ở mọi khổ dưới 900px (trước đây không giới hạn). Sửa 1 vòng (commit `c5f69d4`): bỏ hẳn div bọc, dùng CSS Grid `grid-column` tường minh trên 5 phần tử phẳng đúng thứ tự DOM gốc — đây là **bài học kỹ thuật quan trọng cho các trang bố cục nhiều cột sau này**: không lồng div bọc theo thứ tự khác thứ tự gốc, luôn giữ DOM phẳng đúng thứ tự cũ + dùng `grid-column`/`grid-row` để tạo hiệu ứng nhiều cột. Kiểm lại sạch.

**Task 3 (Góp ý, commit gốc `925ce4d`):** 2 cột ở máy tính, đổi 1 điều kiện có chủ đích (hiện đồng thời danh sách+luồng ở ≥900px thay vì chỉ luồng, dùng kỹ thuật `wide()` giống `order-form.ts`). Người thi công tự phát hiện+tự sửa 1 lỗi (thiếu `loadList()` khi mở luồng ở khổ rộng, commit `2a08997`). Kiểm độc lập phát hiện thêm 1 lỗi Important thật: thiếu đồng bộ lại khi đổi khổ cửa sổ ĐỘNG (resize/xoay máy) ngay lúc đang mở luồng — `list-card.hidden` chỉ đọc một lần lúc tải trang, không theo dõi `matchMedia` runtime. Sửa 1 vòng (commit `93f7d55`, thêm `matchMedia().addEventListener("change", ...)`). Kiểm lại: người kiểm tự viết kịch bản CDP giả lập resize ĐỘNG thật (không phải đọc mã suông) xác nhận đúng cả 2 chiều — sạch.

**Task 4 (kịch bản Chrome `dot-c-smoke.mjs`, commit `8587cad`+`fe853f5`):** phủ 3 trang × 2 khổ, có bằng chứng P16 (tự phá mốc CSS → đỏ đúng chỗ → hoàn nguyên → xanh lại). Kiểm độc lập: sạch, người kiểm tự chạy lại kịch bản thành công.

**Kiểm toàn cục Đợt C (`ba90968..fe853f5`):** người kiểm (model mạnh nhất) tự dựng môi trường Chrome thật, tự chạy lại toàn bộ build/typecheck/test/e2e liên quan + `v1-dang-nhap.mjs`, và tự đo 4 mục "đặc biệt kiểm" chưa ai kiểm trước đó bằng Chrome thật (không chỉ đọc mã):
- Widget Turnstile ở khổ giáp ranh 900px: ĐẠT — thú vị là mốc 900px làm cột form RỘNG THÊM (300→354→424px), giảm áp lực chứ không tăng như lo ngại ban đầu.
- Trang Tôi với tài khoản không phải ADMIN: ĐẠT — cột phải trống hoàn toàn, không vỡ, không phải hồi quy (trước Đợt C cũng đã trống nửa phải).
- Trang Góp ý với tài khoản thường: ĐẠT — vẫn xem đúng `?id=` của mình, đúng bố cục 2 cột, không thấy tab "Hàng đợi" đúng theo quyền.
- Biên chính xác 899px/900px cả 3 trang: ĐẠT — không trang nào tràn ngang hay vỡ.

Phát hiện 1 lỗi Important CHẶN thật: đổi khổ HẸP→RỘNG lúc đang mở luồng Góp ý để lại thẻ danh sách TRỐNG (đúng trạng thái mà chính chú thích code tuyên bố là sai, đã sửa cho đường tải trang nhưng thiếu sửa cho đường resize động — lỗi chỉ lộ khi kiểm CẢ 2 chiều resize, 2 lượt kiểm task riêng mỗi lượt chỉ kiểm 1 chiều). Sửa 1 đợt duy nhất (commit `29a75d2`, thêm `loadList()` khi resize sang rộng). Kiểm lại: đọc mã + tự chạy `dot-c-smoke.mjs` (6/6, thoát mã 0) xác nhận ADDRESSED, không lỗi mới — Đợt C sạch.

**2 việc cần chủ dự án quyết (không tự sửa, ghi rõ trong báo cáo cho chủ):**
- I-2: khối "Chế độ bảo trì" trang Tôi không nằm ở đầu cột phải như mockup (CSS Grid tự xếp vào hàng 2, để lại 2 khoảng trống) — chỉ thẩm mỹ, không vỡ chức năng. Cách sửa đúng: `grid-row` tường minh hoặc div bọc + `display:contents` dưới 900px (PHẢI giữ đúng thứ tự DOM điện thoại). Cảnh báo: `grid-auto-flow: dense` KHÔNG sửa được, chỉ chuyển lỗ trống sang chỗ khác.
- I-3: bảng "sửa tệp nào → chạy kịch bản nào" trong `web/CLAUDE.md` (dòng 33, 39) chưa cập nhật — dòng 39 vẫn ghi sai feedback.ts "chưa có kịch bản riêng", thiếu dòng cho account.html/account.ts. `web/CLAUDE.md` là tệp luật, AI không tự sửa (N9) — cần chủ duyệt nội dung cụ thể.

**Kết quả cuối:** `npm test` 490/490 xanh, `npm run typecheck` 0 lỗi, tất cả bước Đợt C đã đánh dấu xong. **Đủ 11/11 trang restyle theo kế hoạch ban đầu** (chỉ còn Trang chủ mới — việc riêng, cần chốt API với chủ trước khi viết mã, xem đặc tả gốc §10/§12 mục 1 — mới đủ 12 màn hình để chuẩn bị deploy). Nhánh `thiet-ke-lai-giao-dien`, HEAD `29a75d2`, CHƯA gộp main lần 2 (Đợt B đã gộp trước, main có thể đã tiến thêm từ lúc đó), CHƯA đẩy remote.

**Chủ dự án đã quyết 2 việc mở (2026-09-23):**
- I-2 (khối bảo trì lệch vị trí ở trang Tôi): **BỎ QUA, không sửa** — chủ dự án đã xem, chấp nhận giữ nguyên. Không phải bỏ sót.
- I-3 (đăng ký `dot-c-smoke.mjs` vào bảng kịch bản của `web/CLAUDE.md`): **ĐỒNG Ý, đã sửa** (commit `e516c83`). Chủ dự án xác nhận TRỰC TIẾP trong phiên chat (qua `AskUserQuestion`, không chỉ qua lời chuyển của phiên khác) trước khi AI sửa tệp luật — đúng quy trình N9, tránh lặp lại tình huống đáng ngờ ở Đợt A (một trợ lý từng tự sửa `web/CLAUDE.md` rồi tự nhận "đã được duyệt" mà không có người thật xác nhận).

**Minor còn hoãn (không chặn, cho phiên dọn sau):** app.css:370+order.ts:170 (Đợt B, mã đơn+badge chung dòng), app.css:394 (Đợt B, rule thừa), M1-M6 (Đợt B, dải tóm tắt/nhãn/biên tương phản), `.narrow` dead CSS (Đợt C Task 2, xác nhận lại ở kiểm toàn cục), `ket-qua-dang-nhap.json` nhiễu theo lần chạy (Đợt C Task 1), banner lỗi dùng chung khi 2 request song song ở Góp ý (Đợt C Task 3, lỗ MỚI sinh ở Đợt C nhưng hậu quả nhỏ), 2 ảnh gop-y-*.png đổi mỗi lần chạy (Đợt C Task 4), M-1/M-2/M-3 (Đợt C kiểm toàn cục: Đăng nhập chạm mép 900-1184px, tên app hiện 2 lần, chọn kiểu bằng id trần giòn cho tương lai).
