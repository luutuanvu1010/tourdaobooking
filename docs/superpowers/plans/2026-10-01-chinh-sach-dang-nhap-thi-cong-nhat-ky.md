# Sổ thi công — Chính sách đăng nhập (ADR-0085)

- Kế hoạch: `docs/superpowers/plans/2026-10-01-chinh-sach-dang-nhap.md`
- Đặc tả: `docs/superpowers/specs/2026-10-01-chinh-sach-dang-nhap-dac-ta.md`; ADR: `docs/adr/ADR-0085-chinh-sach-dang-nhap.md`
- Nhánh: `chinh-sach-dang-nhap` (worktree `.claude/worktrees/dac-ta-2fa`). Cách thi công: subagent-driven (chủ chọn).

## Task 0 — hiện trạng (2026-10-01)

- Gộp `main` (`24d52d69`, bản 1.61 in đậm) vào nhánh: không xung đột.
- **Số migration:** lớn nhất mọi nhánh = `0066_pty_person_gender.sql` ⇒ bản này **`0067_aut_session_policy.sql`** (đúng kế hoạch).
- **Số bản: 1.62** (KHÔNG phải 1.60 như kế hoạch — `main` đã có 1.60 đổi tên Loại giấy tờ và 1.61 in đậm). **PHẢI KIỂM LẠI LÚC GỘP.**
- Nền trước khi đụng mã: `npm run typecheck` 0 lỗi; `npm test` 2615/2615 + bài đo giờ 1/1.
- Chỗ đụng (khớp kế hoạch): `auth/repository.ts:124` `KHONG_TOAN_QUYEN`, `:127-129` hai câu siết/đánh dấu, `:160` `markMultiStatement`; `auth/index.ts:77` (`issueLoginSession`), `:139-158` (`exemptionChangeStatements`); `accounts/index.ts:542` (route đổi quyền), `:602` (route đổi vai); `tests/audit/harness.mjs:39, :136`; `session-ledger.ts:24`.

## Ruling của điều phối

- Ruling: số bản 1.62 thay 1.60 — main đã dùng 1.60/1.61 — sai thì chỉ đổi một chuỗi lúc gộp.

## Tiến độ, số liệu, quan sát chặn thật

(các task sau ghi tiếp dưới đây)

- Task 1 (migration 0067), quan sát chặn thật 2026-10-01, đột biến "thêm 'SUPER_ADMIN' vào CHECK permission_code của aut_session_policy" (khôi phục từ bản sao, xanh 4/4 sau đó):
  `not ok 2 - (b) 9 mã đặt được nhận; SUPER_ADMIN, mã lạ, multi ngoài 0/1, permission_code NULL bị CSDL chặn`
- Task 2 (luật thuần, isSingleDevice có chính sách), quan sát chặn thật 2026-10-01, đột biến "bỏ vế `permissions.some((p) => nhieuMay.has(p))` khỏi isSingleDevice" (khôi phục từ bản sao, xanh 9/9 sau đó):
  `not ok 2 - được nhiều máy (ADR-0085 Q1 điều 2): SUPER_ADMIN hoặc vai IT (khoá cứng) hoặc một quyền mà chính sách đặt Nhiều máy; bảng trống = như bản 1.58`
- Task 2, tồn đọng có chủ ý: `npm test` đỏ bài `hàng rào 1: mọi ô của MATRIX được máy chủ hỏi…` vì ô `auth.session.policy` chưa có route hỏi `can()` — Task 4 thêm route (KHÔNG thêm mục vào docs/quyen-hoan.json, theo kế hoạch).
- Task 3 (SQL chính sách + siết theo tập), quan sát chặn thật 2026-10-01, đột biến "bỏ vế `AND id <> <phiên mới nhất>` khỏi SS_SIET_THEO_TAP (thay bằng `AND 1`)" (khôi phục từ bản sao, xanh 6/6 sau đó):
  `not ok 3 - siết theo tập: tài khoản một máy theo chính sách TRONG BẢNG còn đúng phiên còn hạn mới nhất (single=1); Toàn quyền, vai IT, quyền Nhiều máy không đụng`
- Task 3, đột biến phụ "changes() > 0 → changes() > 99" trong POL_INSERT_AFTER_CLOSE (chứng minh changes() đọc câu đóng ngay trước trên SQLite): `not ok 1 - lưu có kiểm phiên bản: đóng đúng id + chèn; id cũ (người khác vừa lưu) → lỗi ràng buộc, CẢ lô lùi (không dòng nào đổi, không phiên nào kết thúc)`
- Task 4 (cấp phiên + đổi quyền/vai dùng chính sách; câu phiên ở lô thứ hai), quan sát chặn thật 2026-10-01, đột biến "đưa câu phiên trở lại lô đầu của PUT /api/staff/:id/permissions (`...(plan.guarded ? [] : phien.statements)` → `...phien.statements`, `loPhien = plan.guarded ? (…) : results` → `loPhien = results`)" — SQL không còn tự kiểm Toàn quyền nên câu chốt thua vẫn kết thúc phiên (khôi phục từ bản sao, xanh 7/7 sau đó):
  `not ok 6 - ADR-0085 §6 quy tắc 4 (AC8): 'ADMIN = Nhiều máy', gỡ ADMIN mà câu chốt TRONG LÔ thua (quản trị viên kia bị ngưng giữa lời kiểm trước và lô) → 409, KHÔNG phiên nào kết thúc`
  (cùng lần: `not ok 7 - ADR-0085 Q2 điều 7: bỏ Toàn quyền + ADMIN bị câu chốt TRONG LÔ từ chối (quản trị viên kia bị ngưng giữa chừng, 409) → không phiên nào đổi`)
- Task 4, đột biến phụ 2026-10-01 "giữ lô thứ hai nhưng chạy nó TRƯỚC khi kiểm câu chốt (đổi chỗ dòng `return LAST_ADMIN()` xuống sau `loPhien = …`)": cùng hai dòng `not ok 6 - ADR-0085 §6 quy tắc 4 (AC8): …` và `not ok 7 - …` như trên; khôi phục → xanh 7/7.
- Task 4, ghi chú: dòng sổ hàng rào "Mất miễn một máy …" (docs/SO-HANG-RAO.md, cơ chế cũ "câu SQL tự kiểm NOT EXISTS v_stf_toan_quyen") nay lỗi thời — cơ chế mới là thứ tự lô (lô thứ hai sau câu chốt); để task sổ hàng rào/tài liệu cập nhật.
