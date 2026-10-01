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
- Task 5 (dạng `dongBangTin` `{ phienKetThuc }`, SQL tắt máy theo danh sách phiên), quan sát chặn thật 2026-10-01, đột biến "bỏ `revoked_at IS NULL AND` khỏi câu TAT_MAY_CUA_CAC_PHIEN" — dòng đã tắt trước đó (lý do tu-tat) bị ghi đè (khôi phục từ bản sao, xanh 7/7 sau đó):
  `not ok 7 - ADR-0085 Q3: TAT_MAY_CUA_CAC_PHIEN — chỉ tắt đăng ký mang ĐÚNG các phiên trong danh sách (nhiều tài khoản), lý do mat-mien; máy giữ lại, đăng ký session_id NULL, phiên ngoài danh sách, dòng đã tắt không đụng; danh sách rỗng → 0 dòng`
- Task 5, ghi chú: nhánh `phienKetThuc` ở `src/index.ts` chưa có bài dây thật (Task 6 Step 1 + đột biến Task 6 Step 6 (d)); bảng ghim hàng rào (b) cũng để Task 6.
- Task 6 (ba route chính sách ở `accounts`, hàm công bố `luuChinhSachStatements` / `sietTheoTapStatements` của `auth`), đỏ trước 2026-10-01: 8/8 bài `chinh-sach-phien-route.test.ts` đỏ (404 — route chưa có); sau thi công 8/8 xanh; `npm test` 2643/2643 + bài đo giờ 1/1 xanh (bài "hàng rào 1: mọi ô của MATRIX được máy chủ hỏi…" hết đỏ). Quan sát chặn thật 2026-10-01 (mỗi lần khôi phục từ bản sao ở `/Users/tuanbao/.claude/jobs/d451e7d2/tmp/t6/`, chạy lại xanh):
  - (a) đột biến "ô `auth.session.policy` cột ADMIN = `any`":
    `not ok 1 - §6 quy tắc 1 (AC5): Quản trị, Nhân sự, Bán hàng → 403 ở cả ba route; Toàn quyền đọc được 9 dòng, bảng trống = Một máy`
  - (b) đột biến "route PUT gọi `ctx.dongBangTin({ staffId: ctx.staff.id, tatThongBao: true })` thay dạng `phienKetThuc`" (bảng ghim `tat-thong-bao-dung-may.test.ts`):
    `not ok 6 - ADR-0046 điểm 2–3: MỌI route gọi dongBangTin khai cờ tatThongBao đúng loại — 7 thao tác bảo mật true, gỡ phiên chỉ-phiên (ADR-0075 điều 6b), lưu chính sách chỉ-phiên danh sách (ADR-0085 Q3), đổi quyền/vai false; route mới gọi dongBangTin phải được xếp loại ở đây`
  - (c) theo ruling điều phối: đột biến "`changes() > 0` → `changes() > 99` trong POL_INSERT_AFTER_CLOSE" (chạy `chinh-sach-repo.test.ts` + `chinh-sach-phien-route.test.ts`):
    `not ok 3 - §6 quy tắc 5 (AC2, AC3): 'Bán hàng = Nhiều máy' → hai lần đăng nhập SALES cùng sống; đặt lại 'Một máy' → xem trước 1 máy/1 người, sau lưu còn đúng phiên mới nhất, máy kia 401 'Không còn quyền dùng nhiều máy'`
    `not ok 4 - §6 quy tắc 8 + Review Focus 5 — DÂY THẬT (không ghiDe, hàm tiêm của gốc lắp ráp): siết tắt đăng ký của máy vừa kết thúc (mat-mien); máy giữ lại và đăng ký session_id NULL còn bật`
    `not ok 6 - §6 quy tắc 3 (AC7): hai lần lưu đè nhau từ cùng một bản → một 200, một 409; bên thua không ghi dòng nào, không đăng xuất máy nào`
    `not ok 7 - §6 quy tắc 6 + Review Focus 4: 50 tài khoản Đối tác hai máy → lô lưu có cùng số câu như 5 tài khoản; một lời gọi dongBangTin; mỗi người còn một phiên`
    `not ok 9 - lưu có kiểm phiên bản: đóng đúng id + chèn; id cũ (người khác vừa lưu) → lỗi ràng buộc, CẢ lô lùi (không dòng nào đổi, không phiên nào kết thúc)`
    Quan sát kèm: bỏ hẳn `CASE WHEN changes() > 0 THEN ?2 END` (ghi `?2`) thì hai tệp vẫn XANH 14/14 — lưới chính = chỉ mục `aut_session_policy_one_current`, CASE = lớp hai (chưa có bài nào chỉ đỏ khi riêng lớp hai mất).
  - (d) đột biến "xoá nhánh `phienKetThuc` ở `dongBangTin` của `src/index.ts`":
    `not ok 4 - §6 quy tắc 8 + Review Focus 5 — DÂY THẬT (không ghiDe, hàm tiêm của gốc lắp ráp): siết tắt đăng ký của máy vừa kết thúc (mat-mien); máy giữ lại và đăng ký session_id NULL còn bật`
- Task 6, lựa chọn bề mặt (ghi theo mã): số "đăng xuất N máy của M người" trong nhật ký `session_policy_changed` lấy bằng câu đếm xem trước NGAY TRƯỚC lô (nhật ký nhận chuỗi cố định); lệch với số RETURNING thật (chỉ khi có đăng nhập chen giữa) → một dòng log `session_policy_count_drift` (chỉ hai con số, không dữ liệu cá nhân); phản hồi trả số thật.
- Task 6, ghi chú: `src/shared/tro-ly-cau-truc.ts` (kho trợ lý, sinh tự động ở Bước 0 của `npm test`) đổi theo ô `auth.session.policy` (mục "Việc: đặt chính sách đăng nhập" + dòng "không làm được" của 10 vai) — commit cùng Task 6 (bản trong git trước Task 6 chưa có mục này; tệp sinh đổi thì `npm test` thoát ≠ 0 tới khi commit).
- Task 7 (R-AUT-SESSION-3, mức warn), quan sát chặn thật 2026-10-01 — đột biến "`HAVING count(*) > 1` → `> 5` trong kiểm R-AUT-SESSION-3":
  `not ok 43 - R-AUT-SESSION-3: tài khoản theo chính sách HIỆN HÀNH là một máy mà có > 1 phiên sống còn hạn là MỘT vi phạm; nhiều máy (chính sách / Toàn quyền), phiên quá hạn không tính`
  `not ok 44 - R-AUT-SESSION-3 đếm cùng tập tài khoản với xem trước khi tập Nhiều máy = chính sách hiện hành (cùng mẩu điều kiện SQL)`
  (khôi phục từ bản sao, xanh lại; bài đỏ trước khi có mã: 3 bài `phải có đúng một kiểm R-AUT-SESSION-3`).
