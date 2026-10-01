# Sổ thi công — Chính sách đăng nhập (ADR-0085)

- Kế hoạch: `docs/superpowers/plans/2026-10-01-chinh-sach-dang-nhap.md`
- Đặc tả: `docs/superpowers/specs/2026-10-01-chinh-sach-dang-nhap-dac-ta.md`; ADR: `docs/adr/ADR-0085-chinh-sach-dang-nhap.md`
- Nhánh: `chinh-sach-dang-nhap` (worktree `.claude/worktrees/dac-ta-2fa`). Cách thi công: subagent-driven (chủ chọn).

## Task 0 — hiện trạng (2026-10-01)

- Gộp `main` (`24d52d69`, bản 1.61 in đậm) vào nhánh: không xung đột.
- **Số migration:** lớn nhất mọi nhánh = `0066_pty_person_gender.sql` ⇒ bản này **`0067_aut_session_policy.sql`** (đúng kế hoạch).
- **Số bản: 1.64** (đánh lại lúc gộp main 1.63 ở đợt sửa cuối; trước ghi 1.62; KHÔNG phải 1.60 như kế hoạch — `main` đã có 1.60 đổi tên Loại giấy tờ và 1.61 in đậm). **PHẢI KIỂM LẠI LÚC GỘP.**
- Nền trước khi đụng mã: `npm run typecheck` 0 lỗi; `npm test` 2615/2615 + bài đo giờ 1/1.
- Chỗ đụng (khớp kế hoạch): `auth/repository.ts:124` `KHONG_TOAN_QUYEN`, `:127-129` hai câu siết/đánh dấu, `:160` `markMultiStatement`; `auth/index.ts:77` (`issueLoginSession`), `:139-158` (`exemptionChangeStatements`); `accounts/index.ts:542` (route đổi quyền), `:602` (route đổi vai); `tests/audit/harness.mjs:39, :136`; `session-ledger.ts:24`.

## Ruling của điều phối

- Ruling (ĐÃ THAY ở đợt sửa cuối: nay **1.64**, main đã dùng 1.62/1.63): số bản 1.62 thay 1.60 — main đã dùng 1.60/1.61 — sai thì chỉ đổi một chuỗi lúc gộp.

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
- Task 8 (giao diện), số chữ Trợ giúp (`chuCuaNhom`) — TRƯỚC sửa: chung 1346 (9 phút), quan-tri 3150 (21 phút), nhan-su 604; SAU sửa: chung 1349 (9 phút, trần 1350), quan-tri 3148 (21 phút, trần 3150), nhan-su 612 (5 phút). Mọi câu sửa đúng theo brief, không phải rút thêm, không đổi ngưỡng bài nào (số dòng đã lệch sau khi gộp main; tìm câu theo nội dung; câu ví dụ Ngọc ở mã thật dài hơn bản kế hoạch nên "−11" thực tế là rút về đúng câu của brief).
- Task 8, số bản "1.62" (ruling điều phối; main đã có 1.60, 1.61), ngày 2026-10-01; `app-info.test.ts` đổi "Phiên bản 1.62 · ngày 1 tháng 10 năm 2026".
- Task 8, lựa chọn bề mặt: tiêu đề cột bảng chính sách là "Quyền" + "Số máy được đăng nhập cùng lúc" (colSpan 2) thay cho hai `<th>` rỗng của bản brief (tránh ô tiêu đề rỗng cho trình đọc màn hình). Kịch bản Chrome dùng `ACCOUNTS.chu` (Quản trị + Toàn quyền) vì a2-cdp.mjs không có tài khoản "chỉ Toàn quyền"; ô `auth.session.policy` chỉ Toàn quyền nên bước 3 (Quản trị, Kế toán) vẫn chứng minh hai tài khoản thiếu ô không thấy mục.
- Task 8, chạy kịch bản Chrome 2026-10-01: `chinh-sach.mjs` 4 bước ✓ (1040 + 390, 0 window.confirm, D1 SALES multi=1, khôi phục bằng API), `phien.mjs` ✓ (ảnh của nó chạy lại ghi đè ảnh cũ nên đã hoàn nguyên), `help-smoke.mjs` ✓. Đột biến thử: đổi ô hỏi ở `web/sessions.ts` từ `auth.session.policy` sang `auth.session.viewAll` thì `src/giao-dien-hoi-bang-quyen.test.ts` vẫn XANH (bài đó không canh tên ô trong lời gọi `can`) — không tuyên bố hàng rào này; bước 3 của `chinh-sach.mjs` (Chrome, không nằm trong CI) là nơi canh, dựa vào kỷ luật.
- Task 9 (e2e `chinh-sach-phien`, 2026-10-01): `npm run test:e2e -- chinh-sach-phien phien passkey` xanh 4/4; đủ bộ `npm run test:e2e` xanh 38/38 (303 giây, 3 nhóm), ba nhóm audit-invariants có ✓ R-AUT-SESSION-1/2/3. **AC10 đo: siết 1000 tài khoản Đối tác (2000 phiên → 1000) một lô, 21 ms (đo ở máy khách, gồm một vòng HTTP; lần chạy lẻ 25 ms, lần khác 37 ms)**. Ruling điều phối AC7: đua hai lần lưu từ `banId` KHÁC null (SALES sau bước 4) → [200, 409] trên workerd D1 thật; sau đó kịch bản đặt SALES về Một máy (AC9 cần Bán hàng = Một máy).
- Task 9, sửa dữ liệu 1000 tài khoản theo ghi chú (c): `display_name` phải bằng họ + tên đệm + tên (R-N1-3 báo 1000 vi phạm) → đặt 'Thử N' (cùng `given_name`).
- Task 9, quan sát chặn thật 2026-10-01, đột biến 1 "bỏ khối `finally` khôi phục (`if (false && thayDoi.length)`)": `phien` vẫn XANH (cả hai ✔) vì kịch bản đã tự trả Bán hàng về Một máy ở bước 5 — brief giả định Bán hàng còn Nhiều máy lúc kết thúc; khôi phục ở `finally` chỉ còn bảo vệ ACCOUNTING/PARTNER (phien không dùng) và trường hợp kịch bản đỏ giữa chừng.
  Đột biến 2 "bỏ `finally` khôi phục + bỏ dòng trả SALES về Một máy" (mô phỏng kịch bản đỏ giữa chừng khi SALES còn Nhiều máy, nhóm tuần tự `E2E_SONG_SONG=1`): `chinh-sach-phien` đỏ ở AC9 (`200 !== 401`, chinh-sach-phien.mjs:96) và `phien` ĐỎ: `AssertionError: máy 1 bị đá → 401 (chỉ nhờ kiểm dòng aut_session)  200 !== 401  at tests/e2e/phien.mjs:51:8`. Khôi phục từ bản sao, xanh lại.
- Task 9, vòng sửa 1 (2026-10-01): AC10 nay khẳng định thêm soPhien >= 1000, 1000 phiên 'b' (mới hơn) còn sống, 0 phiên 'a' còn sống (trước chỉ "không ai hơn một phiên" — vẫn qua nếu kết thúc cả hai). Bản chính sách lấy TRƯỚC t0; số đo lại: **20 ms — D1 local (workerd), một lần đo, chỉ PUT (không phải số production)**. `finally` bọc try/catch: lỗi khôi phục không che lỗi gốc (có lỗi gốc thì in lỗi khôi phục ra stderr và giữ lỗi gốc; không thì ném lỗi khôi phục).
  P16 `finally`, cặp đối chứng (nhóm tuần tự `E2E_SONG_SONG=1 npm run test:e2e -- chinh-sach-phien phien`):
  (1) CHỈ bỏ dòng "trả SALES về Một máy", GIỮ `finally`: `✘ chinh-sach-phien` (AC9 `200 !== 401` — như dự kiến, SALES còn Nhiều máy) nhưng `✔ phien` XANH. Chứng minh: `finally` THỰC SỰ khôi phục chính sách khi kịch bản đỏ giữa chừng.
  (2) bỏ CẢ `finally` khôi phục lẫn dòng đó (lần chạy trước): `✘ phien — AssertionError: máy 1 bị đá → 401 (chỉ nhờ kiểm dòng aut_session)  200 !== 401  at tests/e2e/phien.mjs:51:8`. Chứng minh: không có khôi phục thì chính sách sót làm phien đỏ. Hai lần chạy chỉ khác nhau ở `finally` => `finally` là thứ giữ phien xanh. Dòng đã hoàn nguyên; chạy lại `npm run test:e2e -- chinh-sach-phien phien passkey` xanh 4/4.
- Task 10 (sổ hàng rào + tài liệu + chạy đủ), 2026-10-01. Quan sát chặn thật chạy ở task này — đột biến "bỏ `WHERE valid_to_at IS NULL` khỏi chỉ mục `aut_session_policy_one_current`" (migration 0067, bản sao ở `/Users/tuanbao/.claude/jobs/d451e7d2/tmp/t10/`; khôi phục từ bản sao, 4/4 xanh sau đó, `git status` sạch phần migration):
  `not ok 3 - (c) mỗi quyền tối đa MỘT dòng hiện hành; dòng đã đóng không tính; valid_to_at không trước valid_from_at` (`node --test src/migrations-aut-session-policy.test.ts`: # pass 3 / # fail 1)
  Sổ hàng rào: viết lại dòng "Mất nhiều máy khi đổi quyền/vai…" (cơ chế = thứ tự lô; ghi chú: chỉ route permissions có bài đua + đột biến, route đổi vai dựa vào kỷ luật + đọc mã; lô hai không nguyên tử, R-AUT-SESSION-3 thấy); thêm đoạn ADR-0085 Q3 vào dòng ADR-0046; thêm bốn dòng mới: ô `auth.session.policy` (+ chỗ giao diện "dựa vào kỷ luật / kịch bản Chrome", KHÔNG có ngày chặn bằng máy), lưu all-or-nothing (lưới chính = chỉ mục; `CASE changes() > 0` là lớp hai, bỏ riêng nó vẫn xanh), khôi phục `finally` của e2e, `R-AUT-SESSION-3` (cảnh báo, không chặn).
- Task 10, chạy đủ (máy rảnh sau khi một lượt e2e của phiên khác ở checkout gốc kết thúc): `npm run typecheck` 0 lỗi; `npm test` 2646/2646 + bài đo giờ hook 1/1 xanh (thoát 0); `npm run build:web` xong; `npm run test:e2e` đủ bộ **38/38 xanh** (339 giây, 3 nhóm; ba nhóm audit-invariants có R-AUT-SESSION-3); `node scripts/audit-invariants.mjs --db local` **KHÔNG chạy được (thoát 2)** — D1 local chung của máy đã áp dở (`npm run db:migrate:local` báo `table aut_session already exists`, nhãn số cũ 0061→0065), không phải dữ liệu sạch; bất biến đã được kiểm trên ba D1 tạm của e2e (đuôi `audit-invariants` xanh). Không sửa D1 local.

### Đợt sửa sau kiểm độc lập cuối (2026-10-01)

**Kết luận kiểm độc lập cuối: ĐẠT CÓ ĐIỀU KIỆN — I1, I2, M1 + đợt sửa** (các mục nhỏ M2, chú thích repository/auth/accounts, `catch` của `xacNhan`). Không làm: M3, M4, M6 (trình chủ).

- I2 (gộp `main`): gộp `main` vào nhánh (main đi trước 45 commit, đã có 1.62 + 1.63); xung đột 4 tệp (`docs/SO-HANG-RAO.md`, `src/shared/app-info.test.ts`, `src/shared/changelog.ts`, `tests/e2e/run.mjs`) giải bằng giữ cả hai phía; `chinh-sach-phien` ngay trước `phien`; **số bản mới 1.64** (= main 1.63 + 1). `main` chưa có `0067_*` ⇒ `0067_aut_session_policy.sql` giữ số. Trần Trợ giúp A4 đo lại: Quản trị 3148/3150 (không đổi), Bán hàng 3027. Sau gộp: `npm run typecheck` 0 lỗi; `npm test` 2684/2684 + bài đo giờ 1/1.
- I1 (bài đua route đổi vai): bài mới "AC8, route đổi vai" ở `src/modules/accounts/mat-mien-route.test.ts` (cùng khuôn `ngungGiuaChung`). Quan sát chặn thật **2026-10-01**, đột biến "câu phiên vào lô ĐẦU ở route đổi vai" (nhánh có câu chốt: `...phien.statements` nối cuối lô quyền, `cuoi = results`, lô vai sau chỉ còn `roleStatements`) ⇒
  `not ok 8 - ADR-0085 §6 quy tắc 4 (AC8, route đổi vai): 'ADMIN = Nhiều máy', đổi vai làm mất ADMIN mà câu chốt TRONG LÔ thua → 409, KHÔNG phiên nào kết thúc`
  (lỗi: `ended_at` của phiên ADM khác `null`). Khôi phục từ bản sao `/Users/tuanbao/.claude/jobs/d451e7d2/tmp/final-fix-I1-accounts-index.ts.bak` → xanh 8/8.
- M1: `docs/CHANGE-GUIDE.md` công thức z8 (cấp phiên) và bẫy 57 mục 5 thêm vế "có một quyền mà chính sách đặt Nhiều máy" (khớp `isSingleDevice`).
- M2: mảng `SILENT` gõ tay ở `src/modules/audit/an-toan-quyen.test.ts` thêm `session_policy_changed` (giữ gõ tay có chủ ý để bỏ sót ở nguồn thì đỏ). Quan sát chặn thật **2026-10-01**, đột biến "bỏ `session_policy_changed` khỏi `SILENT_AUDIT_ACTIONS`" (`src/shared/audit-actions.ts`) ⇒
  `not ok 2 - ADR-0038: người không giữ Toàn quyền KHÔNG nhận 8 thao tác im lặng do Toàn quyền làm (kể cả tài khoản giữ cả Quản trị lẫn Toàn quyền); nhận thao tác thường của Toàn quyền và mọi thao tác của Quản trị`
  Khôi phục từ bản sao `/Users/tuanbao/.claude/jobs/d451e7d2/tmp/final-fix-M2-audit-actions.ts.bak` → xanh 6/6.
- Chú thích / sửa nhỏ: JSDoc `tatMayCuaPhienStatement` dời về đúng hàm, `tatMayCuaCacPhienStatement` có JSDoc riêng (`thongbao/repository.ts`); `sietTheoTapStatements` ghi "PHẢI đứng cuối lô" (`auth/index.ts`); chú thích lô hai ở `catch` của route đổi quyền và đổi vai (`accounts/index.ts`); `web/chinh-sach-dang-nhap-ui.ts` `xacNhan`: nhánh `policy_stale` đặt `bao` trước rồi bọc `await tai()` riêng. Kịch bản Chrome `chinh-sach.mjs` KHÔNG chạy lại (nhánh lỗi tải lại không có trong kịch bản; typecheck 0 lỗi).
- Số cuối đợt sửa (2026-10-01, sau mọi commit đợt này): `npm run typecheck` 0 lỗi; `npm test` 2685/2685 + bài đo giờ 1/1 (thoát 0); `npm run build:web` xong; `npm run test:e2e` đủ bộ **40/40 kịch bản xanh** (3 nhóm, 416 giây, kể cả `chinh-sach-phien`, `phien`, `audit-invariants`). Hai lần chập chờn không thuộc nhánh, chạy lại là xanh: bài đo giờ hook (`claude-guard-thoi-gian`, chạy lúc máy bận) và một lần `not ok 1462 - HÀNG RÀO khoá: khoaCuoi = 4 ký tự cuối; KHÔNG cửa sổ 5 ký tự liền nào của khoá nằm trong MỌI phản hồi của route quản lý (kể cả Thử key sai key)` (`src/modules/tro-ly/bang-dieu-khien-route.test.ts`, nhánh không đụng `tro-ly`; chạy riêng 5/5 lần xanh, chạy lại cả bộ xanh — nghi khoá ngẫu nhiên trùng chữ; ghi để phiên sau xem). **Số bản: 1.64.**

## Câu chờ chủ (Task 10 Step 4 — KHÔNG tự quyết)

1. **Đề xuất dòng bẫy cho `CLAUDE.md` §10 (N9 — chỉ đề xuất, chưa sửa tệp luật):**
```diff
+- **Chính sách đăng nhập** (ADR-0085, migration `0067`): "được nhiều máy" = Toàn quyền / vai IT / một quyền mà `aut_session_policy` đặt Nhiều máy — MỘT mẩu SQL `nhieuMayDieuKien` (auth/repository.ts) dùng cho siết, đánh dấu, xem trước và chép ở `R-AUT-SESSION-3`; `isSingleDevice` là bản TS (tham số chính sách bắt buộc). Đổi quyền/vai: câu phiên ở lô thứ hai sau câu chốt. Lưu chính sách all-or-nothing (409 `policy_stale`). e2e đổi chính sách phải khôi phục ở `finally`. Chi tiết: `docs/CHANGE-GUIDE.md` công thức z8.
```
   (1b) **Đề xuất dòng cho bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" của `web/CLAUDE.md`:**
```diff
+| Mục "Chính sách đăng nhập" ở /sessions: web/chinh-sach-dang-nhap-ui.ts, src/shared/chinh-sach-dang-nhap.ts, khung #policy-card của public/sessions.html | chinh-sach.mjs ở docs/evidence/2026-10-01-chinh-sach-dang-nhap/kich-ban/ + phien.mjs ở docs/evidence/2026-10-01-dang-nhap-a/kich-ban/ |
```
2. **Số bản 1.64 (trước 1.62) + migration 0067**: kiểm lại lúc gộp (main có thể đã đi tiếp).
3. **Số "đăng xuất N máy của M người" trong nhật ký**: hiện là số ước lượng đếm NGAY TRƯỚC lô (nhật ký nhận chuỗi cố định, lệch số thật chỉ khi có đăng nhập chen giữa → log `session_policy_count_drift`); đặc tả §4.2 bước 2 nói số THỰC. Lựa chọn bề mặt đổi được; chủ quyết giữ hay đổi.
4. **Hai hở có tên đã ghi ở sổ hàng rào, chờ chủ biết:** (a) chỗ giao diện `can(staff, "auth.session.policy")` ở `web/sessions.ts` chỉ có kịch bản Chrome canh, không có bài máy; (b) ~~route đổi vai (`PUT /api/staff/:id/roles`) chưa có bài đua riêng cho thứ tự lô~~ — ĐÃ ĐÓNG ở đợt sửa sau kiểm độc lập cuối (I1, bài `not ok 8`); (c) lớp hai `CASE WHEN changes() > 0` chưa có bài chỉ đỏ khi riêng nó mất.
