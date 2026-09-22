# Bàn giao — ADR-0014 Phase B/C/D (tài khoản đối tác: sửa/huỷ đơn, xin nhận việc, báo tin)

> Đọc trước: `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` (**accepted**, điều 6, 9–12 — Phase A đã làm điều 1–3, 7, 8), đặc tả ngắn `docs/superpowers/specs/2026-09-22-tai-khoan-doi-tac-super-admin.md`, nhật ký Phase A `docs/superpowers/plans/2026-09-22-adr-0014-phase-a-thi-cong-nhat-ky.md` (mục 3 — các chỗ mã lệch kế hoạch gốc, để không lặp lại kiểu sai đã gặp).

## 1. Trạng thái (kiểm lại bằng lệnh, đừng tin tệp này)

- Nhánh `kiem-toan-doi-tac` (worktree `.claude/worktrees/kiem-toan-doi-tac`), **CHƯA merge `main`, CHƯA đẩy lên GitHub**. Kiểm: `git log --oneline main..HEAD | wc -l`, `git status`.
- **Phase A đã thi công** (quyền `PARTNER`/`SUPER_ADMIN`, D-01, D-02, điều 8) — 451 test, typecheck 0 lỗi, e2e 16/16 + `audit-invariants --strict` xanh tại thời điểm ghi tệp này. **Một lượt kiểm độc lập đã chạy, tìm 1 lỗ P0 (ADMIN tự cấp SUPER_ADMIN qua tạo tài khoản mới), đã vá — nhưng CHƯA có lượt kiểm lại xác nhận bản vá.** Đây là điều kiện nên xong trước khi bắt đầu Phase B/C/D (không bắt buộc kỹ thuật, nhưng làm việc lớn tiếp theo trên nền chưa được xác nhận là rủi ro không cần thiết).
- Kiểm lại bằng lệnh, không suy đoán: `npm test`, `npm run typecheck`, `npm run test:e2e` (cần mạng).

## 2. Việc cần làm — theo đúng thứ tự điều của ADR-0014 (mỗi Phase là MỘT việc lớn riêng — CLAUDE.md §3: đụng quyền + tiền/dữ liệu → viết kế hoạch riêng, TDD, kiểm độc lập sau khi xong)

### Phase B — hướng dẫn viên nội bộ sửa/huỷ đơn đang phụ trách (ADR-0014 điều 6, 11)
- `order.money.edit` cho `FIELD` (đã có trong `MATRIX`, scope `assigned` — xem `src/shared/permissions.ts`, **chưa có route dùng**): route riêng ở module `dispatch` (không phải `orders` — giữ nguyên ADR-0007 điều 4(c), `FIELD` không dùng `/api/orders*`), sửa số khách/dịch vụ của đơn đã xác nhận, lý do bắt buộc (tự do), ghi **dòng điều chỉnh** chỉ-thêm (ai, khi nào, vì sao, trước→sau) — cần **migration mới** (bảng dòng điều chỉnh; số migration lấy lúc thi công, `ls migrations` + kiểm mọi nhánh/worktree chưa gộp theo `CLAUDE.md` §10, hiện cao nhất là `0020`). Tiền tự tính lại ở máy chủ; chênh lệch với tiền đã thu đánh dấu cho `ACCOUNTING`. **Không** hiển thị đơn giá/tổng tiền cho `FIELD` ở route này.
- `order.cancel` cho `FIELD` (đã có trong `MATRIX`, scope `assigned`, **chưa có route dùng**): route huỷ hẹp riêng, lý do bắt buộc từ **danh sách đóng đúng hai lựa chọn** ("Không liên hệ được với khách", "Khách yêu cầu huỷ") — không phải lý do tự do như trên. Huỷ **không đổi cột tiền** (khoá đã có ở `docs/superpowers/specs/2026-09-22-khoa-tien-don-da-xac-nhan.md` đứng nguyên — huỷ chỉ đổi `status`). Đơn có `deposit_amount > 0` bị huỷ theo đường này: đánh dấu cho `ACCOUNTING` (không tự động hoàn tiền — chưa có sổ thu tiền thật).
- `dispatch/rules.ts:checkAssignee` mở rộng chấp nhận `order.money.edit` scope `assigned` là "đủ điều kiện làm người phụ trách" (cấp hẹp, cạnh cấp đầy đủ `order.modify`) — xem điều 6 của ADR để lấy đúng lời văn.

### Phase C — CTV chọn người phụ trách lúc lập đơn; đối tác ngoài "xin nhận, nhân viên duyệt" (ADR-0014 điều 9, 10)
- `dispatch.guides.view` (đã có trong `MATRIX`, `PARTNER: any`, **chưa có route dùng**): route liệt kê HẸP, chỉ tên tài khoản đang giữ `FIELD` và đang hoạt động (không dùng `GET /api/dispatch/assignees` — D-07, lộ toàn bộ danh sách văn phòng).
- Route lập đơn của `PARTNER`: nếu có chọn một hướng dẫn viên từ danh sách trên, gán làm người phụ trách NGAY trong cùng giao dịch tạo đơn (tái dùng `mayChangeHandler`/cơ chế `defaultHandlerStatement` đã có, đổi THỜI ĐIỂM gọi, không phải quyền mới). Không chọn → đơn để trống người phụ trách.
- `dispatch.request` (đã có trong `MATRIX`, `PARTNER: any`, **chưa có route dùng**): "xin nhận việc" — `PARTNER` gửi yêu cầu trên một đơn CHƯA có người phụ trách, **chưa** đổi người phụ trách. Cần **bảng lưu yêu cầu mới** (migration mới): ai xin, khi nào, đơn nào, trạng thái (đang chờ/đã duyệt/đã từ chối). Route duyệt/từ chối cho `SALES`/`ADMIN` (đã có `dispatch.assign`) — **luật nghiệp vụ mới** (không phải ô `MATRIX`): nhân viên CHỈ được gán một `PARTNER` làm người phụ trách QUA bước duyệt một yêu cầu đang chờ của chính họ, không được gán thẳng một `PARTNER` chưa từng xin — thêm vào `mayChangeHandler`.
- Khi được duyệt: `PARTNER` có `task.progress`/`contact.view` scope `assigned` (đã có trong `MATRIX` — chỉ cần `ctx.assigned` đúng cho đơn đó qua route "việc của tôi" kiểu `FIELD` hiện có, mở rộng nhận `PARTNER`).

### Phase D — chấm đếm báo CTV khi đơn bị sửa/huỷ (ADR-0014 điều 12)
- Tái dùng khuôn chấm đếm Góp ý đã có (`GET /api/feedback/badge`, `src/modules/feedback/notify.ts`) — khi Phase B ghi dòng điều chỉnh hoặc huỷ đơn, đánh dấu đơn đó "có thay đổi chưa xem" cho `PARTNER` đã lập đơn. Cần bảng/cột đánh dấu đã xem (migration nhỏ hoặc tái dùng cơ chế đã có nếu đủ tổng quát — kiểm trước khi thêm bảng mới). **Không** làm thông báo đẩy (PWA push) — ngoài phạm vi.

## 3. Ràng buộc bắt buộc theo (đã có sẵn trong dự án, không phải phát minh mới)

- TDD: mỗi hành vi mới viết test đỏ trước, xanh sau (`CLAUDE.md` §7).
- Migration: chỉ thêm tệp mới; số hiệu lấy **lúc thi công** (`ls migrations`, cao nhất hiện có + 1, kiểm cả nhánh/worktree khác chưa gộp).
- Tiền: `INTEGER` VNĐ, dẫn xuất tính ở server; không tin số từ trình duyệt.
- Không xoá cứng: dòng điều chỉnh/yêu cầu nhận việc là bản ghi CHỈ-THÊM, không sửa/xoá.
- Việc lớn (đụng quyền + tiền + dữ liệu, cả ba Phase): sau khi thi công xong MỖI Phase, bắt buộc một subagent kiểm độc lập, CHỈ ĐỌC, trước khi báo "đạt" (`CLAUDE.md` §3) — dùng khuôn đã chạy thật ở Phase A (xem cách gọi Agent tool trong nhật ký Phase A, đã tìm ra một lỗ thật, đáng lặp lại).
- **KHÔNG sửa nội dung `ADR-0014` nữa** (đã accepted) — nếu thi công phát hiện cần đổi quyết định, viết ADR mới trỏ về ADR-0014 (`CLAUDE.md` §3).
- Sau khi hết cả ba Phase: cập nhật `docs/SYSTEM-DESIGN.md` (các dòng "chưa có route" của bốn thao tác `order.money.edit`(FIELD)/`order.cancel`/`dispatch.guides.view`/`dispatch.request` — xoá chữ "chưa có route", ghi route thật), `docs/DATA-DICTIONARY.md` (bảng mới qua `docs/data-dictionary.json` + `npm run dict`).

## 4. Câu hỏi còn mở, không chặn bắt đầu Phase B/C/D nhưng nên hỏi trước khi CHỐT chi tiết UI/luồng

Không còn câu hỏi kiến trúc nào bị bỏ ngỏ (ADR-0014 đã accepted, điều 9–12 đã đủ chi tiết để thi công). Hai điều còn treo (đã ghi trong đặc tả ngắn §6, không phải kiến trúc — không cần hỏi lại, tự áp nguyên tắc sẵn có nếu chạm tới):
1. Loại sửa nào `FIELD` không được làm (vd giảm giá) — **không cần chặn riêng**, an toàn nằm ở lý do bắt buộc + dòng điều chỉnh + đối chiếu tiền (đã quyết, xem đặc tả ngắn §6 mục 1).
2. Tiêu chí mở rộng thí điểm sau 2 tuần — việc vận hành của chủ dự án lúc đó, không phải việc của thi công.

Đúng một điều **nên hỏi CHỦ DỰ ÁN trước khi thi công Phase C** (nghĩa "gán hoặc xác nhận thủ công" đã được làm rõ thành "xin nhận, nhân viên duyệt" — nhưng CHI TIẾT giao diện: nhân viên duyệt ở đâu, có danh sách "yêu cầu đang chờ" riêng không, hay chỉ ở màn đơn — đây là **thiết kế giao diện**, chưa có trong ADR, người soạn giao diện tự quyết được theo CLAUDE.md §3 P8 (bề mặt, đảo ngược được) — KHÔNG cần dừng hỏi, chỉ cần ghi giả định lại.

## 5. Thứ tự đề xuất

1. Có lượt kiểm lại xác nhận bản vá P0 của Phase A (mục 1) — hoặc ít nhất chạy lại `npm test`/`typecheck`/`test:e2e` một lần nữa cho chắc trước khi thi công tiếp trên cùng nhánh.
2. Viết kế hoạch thi công riêng cho Phase B (dùng skill `superpowers:writing-plans`) — làm trước vì chạm tiền (rủi ro cao nhất, nên làm sớm và kỹ), theo đúng khuôn Phase A (mỗi task: file, test đỏ→xanh, commit).
3. Thi công Phase B → kiểm độc lập → (nếu đạt) viết kế hoạch Phase C → thi công → kiểm độc lập → Phase D → kiểm độc lập.
4. Sau khi cả ba Phase qua kiểm độc lập: báo chủ dự án, chờ chủ quyết merge `main` (AI không tự `git push`/merge — `CLAUDE.md` §8).

## 6. Lời nhắn mở đầu gợi ý cho phiên sau

> Đọc `docs/HANDOFF-ADR-0014-PHASE-BCD.md` trên nhánh `kiem-toan-doi-tac` (worktree `.claude/worktrees/kiem-toan-doi-tac`). Đóng vai người thi công tiếp: bắt đầu từ mục 5 (thứ tự đề xuất) — viết kế hoạch thi công cho Phase B (dùng skill viết kế hoạch), rồi thi công theo TDD, mỗi task một commit. Việc lớn (đụng quyền + tiền): sau khi xong Phase B, bắt buộc gọi một subagent kiểm độc lập chỉ đọc trước khi báo "đạt" — đừng tự nhận đạt.
