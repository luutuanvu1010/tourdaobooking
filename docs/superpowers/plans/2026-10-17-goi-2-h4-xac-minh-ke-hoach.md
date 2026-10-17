# Gói 2 hồ sơ riêng tư — lát H-4 (xác minh hồ sơ: Quản trị và Nhân sự): Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quản trị, Nhân sự (và Toàn quyền là chốt cuối) mở **hàng chờ xác minh** phiếu tự khai đang chờ, xem trường khai (số che), xem đủ số giấy tờ của phiếu đang chờ (nhật ký ghi TRƯỚC), rồi bấm **Chấp nhận nguyên văn** hoặc **Từ chối kèm lý do thuộc danh sách đóng** — với luật tách nhiệm vụ (khác người khai, khác người tạo tài khoản, khác người chạm quyền truy cập: đặt lại PIN và tắt lớp hai = vĩnh viễn, còn lại 30 ngày trước lúc gửi) nằm TRONG câu ghi; phiếu đã xử lý không xem lại được.

**Architecture:** Một migration chỉ-thêm `0107_xac_minh_ho_so.sql`: view công bố `v_aud_cham_tai_khoan` của module `audit` (hình chiếu `audit_log` chỉ khoá: người làm, tài khoản bị chạm, tầng `TAO | VINH_VIEN | CUA_SO_30`, lúc) + chỉ mục `audit_log(target_type, target_id, staff_id)` + một trigger `parties` "người quyết ≠ người khai". `parties` (module nghiêm, không được đọc `audit_log`) đặt lính gác `NOT EXISTS (… v_aud_cham_tai_khoan …)` ngay trong câu `UPDATE pty_self_submission` chấp nhận / từ chối; mọi câu ghi sau trong cùng `db.batch` chỉ chạy khi câu đó thắng. Dữ kiện TÀI KHOẢN (ứng viên Quản trị / Nhân sự, quyền của chủ phiếu) tới `parties` qua hàm tiêm của gốc lắp ráp `ctx.taiKhoanXacMinh` (khuôn `ctx.isAssigned`). Luật thuần `src/modules/parties/xac-minh.ts` tính cùng kết luận cho giao diện, có bài "cùng bảng ca" đối chiếu với câu SQL. Hai ô quyền mới `party.verify`, `party.verify.attachment`; năm route ở cổng `accounts`; giao diện là một khối ở trang Quản lý tài khoản (`/staff`) — không trang mới, không mục menu (trần gói Đơn hàng).

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), `node:sqlite` + khung thử `tests/audit/harness.mjs`, `node --test` (Node 22), esbuild; không dependency runtime.

**Spec:** `docs/adr/ADR-0125-nguoi-xac-minh-ho-so-quan-tri-va-nhan-su.md` (đ1–đ6, hàng rào phải sửa cùng commit, tiêu chí nghiệm thu); `docs/adr/ADR-0122-…` đ3 (xác minh theo từng dòng, `CAN_XAC_MINH_LAI` cùng lô); `docs/adr/ADR-0124-…` đ2 (chấp nhận là một lô do `parties` ghi); `docs/adr/ADR-0121-…` đ4, đ7 ("mở lại 24 giờ", "ngoại lệ tạm" là chạm quyền truy cập); `docs/adr/ADR-0126-…` đ5 (nhật ký xác minh chỉ mang mã); Hiến chương `docs/ARCHITECTURE.md` 5.12, 5.20, 5.22, 5.23 (bảng thi hành dòng 5.23: "người xác minh ≠ người khai nằm trong câu ghi chấp nhận (lát H-4)"); `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/TRANG-GHEP.md` (dòng `party.verify*`). Kế hoạch mẫu khuôn: `docs/superpowers/plans/2026-10-17-goi-2-h3-tu-khai-ke-hoach.md` (nợ chuyển sang: `docs/BACKLOG.md` mục 36–38; `.superpowers/sdd/2026-10-17-goi-2-h3-tu-khai-ke-hoach/progress.md` M-6).

## Global Constraints

- Giao diện, câu báo lỗi (`message`), tài liệu, commit: tiếng Việt CÓ DẤU; mã lỗi máy (`verify_conflict`…) được, chữ hiện ra không chữ Anh, không mã thô (`TU_CHOI` phải ra "Bị từ chối", `KHONG_KHOP_GIAY_TO` phải ra nhãn). Gọi hệ thống là "Nền tảng".
- Không dependency runtime. Tệp được `*.test.ts` import trực tiếp import nhau KÈM đuôi `.ts`; `web/` import `src/shared` KHÔNG đuôi, không import `src/modules/`.
- Migration: đúng MỘT tệp mới `migrations/0107_xac_minh_ho_so.sql`, chỉ THÊM (`CREATE VIEW`, `CREATE INDEX`, `CREATE TRIGGER`); không `DROP`, không `ALTER TABLE`, không gieo; KHÔNG sửa `0103`, `0104`, `0105`. Bài kiểm tìm tệp theo ĐUÔI `_xac_minh_ho_so.sql`. **Không mở loại nối ảnh `SELF_SUBMISSION`** (trigger `pty_attachment_link_kind_ins` giữ nguyên — ruling R4).
- `parties` KHÔNG đọc bảng `audit_log` (module nghiêm; `src/architecture.test.ts`); chỉ đọc view `v_aud_cham_tai_khoan`. `parties` KHÔNG import `staff`; dữ kiện tài khoản chỉ qua `ctx.taiKhoanXacMinh()`.
- Lính gác tách nhiệm vụ nằm TRONG câu `UPDATE pty_self_submission` (chấp nhận VÀ từ chối); mọi câu ghi phụ thuộc mang điều kiện thắng `EXISTS (SELECT 1 FROM pty_self_submission s WHERE s.id = ? AND s.status = ? AND s.decided_by = ? AND s.decided_at = ?)`; nhật ký `onlyIf: "changes() > 0"` đứng ngay sau câu cuối cùng. Kiểm trước ở máy chủ (luật thuần) chỉ để trả lời đẹp, không thay lính gác.
- Nhật ký (`audit_log.detail`) chỉ mang mã và nhãn danh mục (mã phiếu, nhãn loại phiếu, tên loại giấy tờ, mã lý do, chữ "cờ chạm tài khoản"): KHÔNG ngày sinh, địa chỉ, số giấy tờ, nơi cấp, họ tên chủ phiếu (Hiến chương 5.20, ADR-0126 đ5).
- DTO hàng chờ theo DANH SÁCH CHO PHÉP; số giấy tờ ở hàng chờ / chi tiết LUÔN che (`cheSo`); câu SQL của hàng chờ và chi tiết KHÔNG chọn cột `document_number`. Chỉ `POST …/xem-so` trả số đủ, ghi nhật ký TRƯỚC, phản hồi `Cache-Control: no-store`, route nằm trong `BI_MAT` của lớp vé.
- Phiếu không ở `CHO_XAC_MINH`: chi tiết / xem số → 403 `submission_processed`; hàng chờ đã xử lý chỉ trả mã phiếu, loại, kết luận, mã lý do, người xử lý (nhãn), lúc, cờ chạm tài khoản.
- Mỗi route ghi đúng MỘT `db.batch` (lớp chống ghi trùng ADR-0094 — KHÔNG thêm mục vào `GHI_NHIEU_LAN`, `NGOAI_VE`).
- **Trần gói trang Đơn hàng `TRAN_ORDERS = 96_600` KHÔNG nới.** Đo 2026-10-17 bằng cùng tuỳ chọn esbuild của `src/goi-trang-nhe.test.ts`: 96 556 byte. Trong gói có `src/shared/permissions.ts`, `muc-giao-dien.ts`, `lan-gui-bi-mat.ts`, `start-page.ts`; KHÔNG có `audit-actions.ts`, `roles.ts`, `sw-policy.ts`, `tu-khai-hien-thi.ts`. Đã đo thử (bản sao ngoài kho): thêm hai dòng `row(...)` ngây thơ → **96 737 (vượt 137)**; thêm hàm dòng chung `quanTriNhanSu()` cho 4 dòng → 96 554; cộng `quanTri()` cho 10 dòng Quản trị + Toàn quyền → **95 968**. ⇒ Task 3 làm CẢ HAI hàm dòng chung (giá trị ô không đổi, bài ghim từng ô canh); KHÔNG thêm mục vào `muc-giao-dien.ts`; không import gì mới vào `web/orders.ts`.
- KHÔNG làm ở lát này: mở ảnh phiếu tự khai / loại nối `SELF_SUBMISSION` (BL-TK-ANH, H-5); phiếu xoá, ẩn danh hoá (H-5); mã ADR-0121 (lớp hai bắt buộc cho đối tác, "mở lại 24 giờ", "ngoại lệ tạm") — chỉ ĐẶT TÊN hai sự kiện; tự khai hồ sơ tổ chức (BL-TK-TO-CHUC); sửa luật vé chống ghi trùng.
- CẤM AI tự chạy: `git push`, merge vào `main`, `wrangler deploy`/`rollback`/`secret`, mọi lệnh `--remote`, mọi lệnh R2 thật. E2E chỉ trên D1 local tạm của `npm run test:e2e`.
- Không sửa luật chi phối chính mình: `CLAUDE.md` (kể cả `web/CLAUDE.md`, `src/CLAUDE.md`), `.claude/`, `playbook/`, `docs/adr/`, Phần I của `docs/ARCHITECTURE.md`. Dòng mới cho bảng kịch bản Chrome của `web/CLAUDE.md` chỉ ĐỀ XUẤT trong báo cáo (Task 6). `docs/quyen-hoan.json` không thêm mục hoãn.
- Mỗi task: bài đỏ trước, xanh sau; trước commit `npm test` và `npm run typecheck` phải xanh (`typecheck` KHÔNG phủ `*.test.ts`, `scripts/`, `tests/` — tự đọc lại tệp đó). Chạy MỘT bộ kiểm một lúc (bài đo giờ của hook nhạy tải). Ruling 17/10 của chủ: điều phối chỉ chạy bộ kiểm đủ MỘT lần cuối lát; trợ lý con vẫn tự chạy và dán kết quả.
- Số phiên bản nhật ký thay đổi: **2.13 TẠM** (đã kiểm 2026-10-17: nhánh này 2.12; các worktree khác không có 2.1x).
- Dòng đồng tác giả commit theo nhắc của môi trường lúc thi công.

## Review Focus

Năm tình huống ADR không nói thẳng mà dễ làm người dùng gặp lỗi nhất; mỗi dòng có bài ghim ở task sở hữu mã:

1. **Quản trị và Nhân sự cùng bấm "Chấp nhận" một phiếu** (hai lô gần như đồng thời) ⇒ đúng một người 200, người kia 409 `submission_not_pending` bằng câu tiếng Việt; đúng MỘT dòng `pty_verification`, MỘT giá trị được ghi, không dòng mồ côi (bài "Review Focus 1", Task 2 mức câu lệnh + Task 4 mức route).
2. **Người xác minh từng đặt lại PIN cho chủ phiếu 400 ngày trước** ⇒ vẫn bị chặn (vĩnh viễn); **mở khoá đăng nhập đúng 30 ngày trước lúc gửi phiếu** ⇒ bị chặn; **30 ngày + 1 ms** ⇒ được; đổi SĐT đăng nhập trong cửa sổ ⇒ bị chặn, sửa tên (không đổi SĐT) ⇒ không chặn (bài "Review Focus 2", Task 2).
3. **Người dùng rút phiếu (hoặc rút đồng ý) trong lúc người xác minh đang mở chi tiết** ⇒ bấm Chấp nhận / Từ chối / Xem đủ số đều 409/403 tiếng Việt, không dòng nào được ghi, không số nào trả về (bài "Review Focus 3", Task 4).
4. **Chủ phiếu được nâng lên Quản trị / Nhân sự sau khi gửi** ⇒ Quản trị khác bị cấp bậc chặn (theo quyền HIỆN TẠI của chủ phiếu); khi không còn ứng viên hợp lệ phiếu hiện "Chuyển Toàn quyền" cho mọi người xem (bài "Review Focus 4", Task 3).
5. **Phiếu CCCD mà số đã thuộc hồ sơ khác** ⇒ chấp nhận trả 409 `document_number_taken` tiếng Việt (trigger `person_document_cccd_other_person` của 0032 làm hỏng cả lô), phiếu vẫn chờ, không dòng nào ghi; chi tiết phiếu có cờ `trungHoSoKhac` để người xác minh chọn lý do "Số giấy tờ đã thuộc hồ sơ khác" (bài "Review Focus 5", Task 2 mức câu lệnh — route chặn sớm hơn khi chưa có ảnh, xem R18).

Rủi ro đã biết, KHÔNG có bài (ghi để người kiểm khỏi tìm): người Nhân sự đã tạo tài khoản không bao giờ xác minh được tài khoản đó (sự thật 20 — hệ quả ADR, vận hành cần người thứ hai); hàng chờ đọc MỌI tài khoản (~1000 dòng) và mọi dòng `v_aud_cham_tai_khoan` của các chủ phiếu trên trang mỗi lần mở — chưa đo trên D1 thật; tạo chỉ mục trên `audit_log` có sẵn dữ liệu production — thời gian migration chưa đo; hai người thông đồng (một tạo, một xác minh) không bị bắt (ADR-0125 đ5 "giới hạn nói thẳng"); tài khoản tạo trước khi có nhật ký hoặc do đồng bộ Sheet (`staff_id` rỗng) không có "người tạo".

## Bằng chứng số migration (kiểm 2026-10-17, chỉ đọc)

- Nhánh này (`worktree-ho-so-rieng-tu-2fa`, HEAD `3c7daf05`): lớn nhất `0105_ho_so_tu_khai.sql`. `main` (`git ls-tree --name-only main migrations/`): lớn nhất `0102_aut_mfa_email.sql`.
- `git log --all --name-only --format= -- 'migrations/010*' 'migrations/011*'`: 0100…0105 và **`0106_ve_ho_tro_2a.sql`** (commit `ea4e0f21e` "Vé hỗ trợ đợt 2a việc 1…", worktree `busy-pike-367e49`, chưa gộp). `ls .claude/worktrees/*/migrations`: chỉ `busy-pike-367e49` có 0106; không worktree nào có 0107+.
- **Số chọn: `0107`** (không phải 0106 như dự kiến trong lời giao). Nhánh nào gộp vào `main` trước mà chiếm `0107` thì chỉ đổi tên tệp (bài tìm theo đuôi). Kiểm lại lúc phát hành (`docs/HANDOFF-N1.md`).
- **Có thật cần migration không?** Có, và không tránh được: lính gác phải nằm trong câu ghi của `parties`; `parties` là module nghiêm nên không được nhắc `audit_log` (ngoại lệ `DOC_AUDIT_LOG_WONGUARD` của `src/architecture.test.ts` chỉ cho `orders`); câu SQL của module nghiêm phải tĩnh (`defineSql`) nên không nhận được mảnh SQL tiêm lúc chạy. Đường duy nhất là một view `v_aud_*` (khuôn `v_aud_account_event` 0075 mà `thongbao` — cũng nghiêm — đang đọc), và view chỉ tạo bằng migration. Chỉ mục và trigger đi kèm cùng tệp. KHÔNG cần cột mới (ruling R3).

## Sự thật đã kiểm khi soạn (ghi lại để người thi công không phải dò lại)

1. **Bảng `pty_verification` (0103) chưa có dòng nào được ghi bởi mã** (`grep pty_verification src` chỉ thấy bài kiểm): H-4 là lát đầu tiên ghi `DA_XAC_MINH` ⇒ từ lúc này ADR-0122 đ3 đòi `CAN_XAC_MINH_LAI` cùng lô khi giá trị đã xác minh đổi (Task 4).
2. **`pty_verification_target_ins`** đòi dòng đích tồn tại cùng hồ sơ (PERSON_DOCUMENT / CONTACT) hoặc thuộc tính đang dùng (ATTRIBUTE) ⇒ từ chối phiếu DIA_CHI / GIAY_TO KHÔNG có dòng đích ⇒ từ chối chỉ ghi trên dòng phiếu (`TU_CHOI`, `reason_code`, `decided_by`, `decided_at`) + nhật ký (ruling R3).
3. **Không có cột nối phiếu ↔ dòng xác minh** ⇒ khi chấp nhận, `pty_verification.id` = `pty_self_submission.id` (một phiếu → đúng một dòng xác minh; trigger `pty_verification_no_replace` của 0105 chặn trùng).
4. **Sự kiện đã có** (`src/shared/audit-actions.ts`, nhóm `staff`, ghi bằng `adminAudit` ⇒ `target_type = 'staff'`, `target_id` = tài khoản bị chạm, `staff_id` = người làm): `staff_created`, `pin_reset`, `passkey_removed`, `login_unlocked`, `permission_changed`, `account_roles_changed`, `staff_role_changed` (tên cũ của đổi vai), `staff_updated` (chi tiết chứa chữ `đổi SĐT đăng nhập` khi đổi SĐT — `src/modules/accounts/index.ts` hàm dựng `bits`), `mfa_reset` (tắt lớp hai của người khác, `POST /api/staff/:id/mfa-reset`, cùng lô với `mfaEnrollWindowStatement`). Các hành động nhóm `staff` còn lại: `staff_suspended`, `staff_reactivated`, `pin_changed`, `passkey_added`, `pin_set_by_passkey`, `staff_synced`, `session_policy_changed`, `session_revoked`, `mfa_enabled`, `mfa_removed`, `mfa_recovery_regenerated`.
5. **ADR-0121 CHƯA có mã**: không có route "mở lại 24 giờ" hay "ngoại lệ tạm" (chú thích ở `POST /api/staff/:id/mfa-reset`: "bên ngoài không bắt buộc, ADR-G1 chưa duyệt"). Cột `staff.mfa_grace_until`, `staff.mfa_enroll_until` chỉ được ghi ở `src/modules/staff/repository.ts` (`insert_staff` khi tạo, `mfa_grace_if_null`, `mfa_enroll_set`). ⇒ H-4 ĐẶT TÊN hai sự kiện `mfa_grace_reopened`, `mfa_exception_set`, xếp vào tầng VĨNH VIỄN của view ngay hôm nay, và dựng hai bài canh (phân loại vét cạn + người ghi cột hạn lớp hai) để lát ADR-0121 không thể lặng lẽ để hở vế vĩnh viễn (Task 1).
6. **`audit_log` chỉ có chỉ mục `order_id`, `created_at`** ⇒ lính gác quét cả bảng nếu không thêm `idx_audit_target(target_type, target_id, staff_id)`.
7. **`canManageAccount`** (`src/shared/roles.ts`): Toàn quyền quản mọi tài khoản; ADMIN/HR không quản tài khoản giữ ADMIN, SUPER_ADMIN hoặc HR ⇒ Quản trị cũng KHÔNG xác minh phiếu của Nhân sự (chặt hơn chữ ADR-0125 đ3; ruling R6, Q4).
8. **Cổng `accounts`** (ADMIN, SUPER_ADMIN, HR) là cổng duy nhất đúng ba cột giữ ô mới; `office` không có HR. Bài (4b) của `src/route-write-guard.test.ts` ghim ĐÚNG bảy route cổng `accounts` và đòi đầu thân `if (!can(<người gọi>, "account.*")) return …` ⇒ Task 3, 4 phải mở rộng bài này (thêm route vào `known`, thêm hai ô vào `ACCOUNTS_OPS`) — **đây là nới hàng rào có tên, người kiểm cần xem**.
9. **HR hôm nay `any` ở đúng 5 ô**: `account.create`, `account.view`, `account.edit`, `feedback.submit`, `assistant.ask`; `own` ở `feedback.view`, `party.document.view`, `party.self.view`, `party.self.submit` (đọc từ `MATRIX` 2026-10-17). "HR đúng năm ô" = tập ô `any` của HR trừ hai ngoại lệ của mọi tài khoản nội bộ (`feedback.submit`, `assistant.ask`) = {3 ô tài khoản, `party.verify`, `party.verify.attachment`}.
10. **Dòng `row("none","none","any","none","none","any","none","none","none","any")` đã có 2 lần** (`account.view`, `account.edit`) — đúng giá trị hai ô mới.
11. **`src/tu-khai-khong-len-nhan.test.ts`** (rào 5.23) ghim: chữ `pty_self_submission` chỉ ở `parties/repository.ts`; tập câu SQL đăng ký chạm bảng; năm hàm chỉ được gọi trong route `/api/parties/cua-toi*` ⇒ Task 2, 3, 4 mở rộng ĐÚNG từng route `/api/parties/xac-minh…` (liệt kê, không dùng tiền tố) — **nới có tên theo ADR-0125 đ1**.
12. **`src/giay-to-khong-lo-so.test.ts`** lọc route theo mẫu; route `/api/parties/xac-minh*` không tự vào ⇒ mở rộng bộ lọc (siết) và thêm ca.
13. **`src/shared/lan-gui-bi-mat.ts` NẰM TRONG gói Đơn hàng** ⇒ thêm `/api/parties/xac-minh/:pid/xem-so` tốn ≈ 40 byte (đã tính trong phương án hai hàm dòng chung).
14. **Router khớp route theo thứ tự khai**: năm route mới khai TRƯỚC `GET /api/parties/:id` và mọi route `/api/parties/:id…`.
15. **Nợ H-1 `PUT /api/parties/:id` chặn khi thân có khoá `birthDate` kể cả không đổi**: `grep birthDate web/` rỗng — hôm nay KHÔNG form nào gửi khoá này. Sửa phía máy chủ ("bằng giá trị đang lưu thì coi như vắng") sẽ biến route thành chỗ DÒ ngày sinh (200 khi đoán đúng, 403 khi sai) cho người không có `party.personal.view` ⇒ giữ máy chủ chặt (ruling R9).
16. **Gộp hồ sơ** (`src/modules/parties/gop.ts`): hồ sơ phụ có tài khoản bị chặn (`merge_source_has_account`) nên hồ sơ phụ hầu như không có phiếu; nhưng `party_id` của phiếu bất biến, phiếu đang chờ của hồ sơ phụ (nếu có) sẽ treo ⇒ R20 + Q3.
17. **Khung thử** (`tests/audit/harness.mjs` `world()`) dựng app từ `src/index.ts` thật ⇒ hàm tiêm mới tự có trong khung thử; `ghiDe` KHÔNG được thêm khoá mới.
18. **Nền của R2 đã kiểm:** `src/architecture.test.ts` kiểm ranh giới bằng EXPLAIN trên một schema "ranh giới" trong đó **view công bố `v_*` được thay bằng bảng rỗng cùng cột** (chú thích dòng 3) ⇒ câu của `parties` đọc `v_aud_cham_tai_khoan` được tính là "đọc view của module audit", hợp lệ khi có cạnh `parties → audit` — cạnh này ĐÃ có (`ALLOWED_EDGES.parties = ["locations", "audit"]`); không bị quy về "đọc TRỰC TIẾP audit_log". Chủ của view lấy từ `docs/data-dictionary.json` ⇒ mục view phải ghi module `audit` (Task 1 Step 9). Tiền lệ: `thongbao` (nghiêm) đọc `v_aud_account_event` với cạnh `thongbao → audit`.
19. **Ghép hằng chuỗi vào `defineSql` có tiền lệ** (`auth/mfa-repo.ts` `${F_COLS}`, `thongbao/repository.ts` `${DOI_CHON}`): `defineSql` chỉ đòi chuỗi TĨNH lúc nạp mô-đun, hằng ghép lúc nạp vẫn tĩnh ⇒ `CHAM_CUA_NGUOI(…)` / `DA_THANG` của Task 2 hợp lệ (tham số `?n` vẫn là tham số SQL, không ghép giá trị người dùng).
20. **Chỉ Nhân sự và Toàn quyền tạo tài khoản** (ADR-0071 đ1b) ⇒ người Nhân sự đã tạo phần lớn tài khoản đối tác sẽ KHÔNG BAO GIỜ xác minh được các tài khoản đó (`TAO` không hết hạn — ADR-0125 đ5 vế b). Đây là hệ quả của ADR đã duyệt, không phải câu hỏi; vận hành cần ít nhất một Nhân sự / Quản trị KHÁC người tạo. Hàng chờ phải đưa phiếu xác minh được lên trước (R23) để người bị chặn không chỉ thấy toàn dòng "không xác minh được".

## Câu hỏi / ruling

Phần "Cần chủ trả lời" là điều chạm dữ liệu / quyền mà ADR chưa chốt. Kế hoạch đã chọn phương án **hẹp / an toàn** để thi công không bị chặn; chủ chọn khác thì sửa trước khi migration lên production (0107 chưa áp ở đâu — sửa được). Danh sách gom ở cuối tệp.

**Ruling đã áp (bề mặt, siết, hoặc đảo ngược được):**

- **R1 — Số migration 0107** (0106 đã bị nhánh vé hỗ trợ 2a chiếm — mục "Bằng chứng").
- **R2 — Lính gác qua VIEW, dữ kiện tài khoản qua HÀM TIÊM.** ADR-0125 đ5 cho chọn "NOT EXISTS (…) hoặc view `v_aud_*`, gốc lắp ráp tiêm vào `parties`". Câu ghi của module nghiêm phải tĩnh ⇒ view `v_aud_cham_tai_khoan` (công bố bởi `audit`, tên hằng ở `src/modules/audit/cham-tai-khoan.ts` qua `audit/index.ts`) là phần nằm TRONG câu ghi. Phần không đọc được bằng SQL của `parties` — ứng viên Quản trị / Nhân sự và quyền hiện tại của chủ phiếu (bảng `staff`, `stf_permission`) — tới qua `ctx.taiKhoanXacMinh()` do gốc lắp ráp tiêm (khuôn `ctx.isAssigned`).
- **R3 — Dòng xác minh:** chấp nhận ⇒ một dòng `pty_verification` có `id` = mã phiếu, `outcome = 'DA_XAC_MINH'`, `created_by` = người xác minh, `created_at` = `decided_at`, `verifier_touched_account` tính TRONG câu `INSERT … SELECT` từ cùng view. Từ chối ⇒ KHÔNG dòng `pty_verification` (không có dòng đích cho địa chỉ / giấy tờ); kết quả nằm ở dòng phiếu (trạng thái một chiều, bất biến) + nhật ký. Không cột mới.
- **R4 — Ảnh:** KHÔNG chạm loại nối `SELF_SUBMISSION` (cổng phát hành H-3 + BL-TEP-PHAT-LAI-500 + BL-TK-ANH). Ô `party.verify.attachment` ở lát này mở **số đủ của phiếu đang chờ** (`POST /api/parties/xac-minh/:pid/xem-so`); route ảnh của phiếu thêm cùng lát mở loại nối (Q1).
- **R5 — Bảng phân loại "chạm quyền truy cập"** (hằng `CHAM_TAI_KHOAN`, khớp từng chữ với view): `TAO` = {`staff_created`}; `VINH_VIEN` = {`pin_reset`, `mfa_reset`, `mfa_grace_reopened`, `mfa_exception_set`}; `CUA_SO_30` = {`passkey_removed`, `login_unlocked`, `permission_changed`, `account_roles_changed`, `staff_role_changed`} + `staff_updated` khi chi tiết chứa `CHI_TIET_DOI_SDT` (= `"đổi SĐT đăng nhập"`, hằng dùng chung với nơi ghi ở `accounts`); `KHONG_CHAM` = mọi hành động nhóm `staff` còn lại, mỗi mục một lý do. `staff_role_changed` vào cửa sổ 30 ngày vì cùng nghĩa "đổi quyền hay gán vai" (siết). `staff_reactivated` tạm để `KHONG_CHAM` cho đúng chữ ADR — Q2.
- **R6 — Cấp bậc = `canManageAccount`** theo quyền HIỆN TẠI của chủ phiếu (Quản trị không xác minh phiếu của Quản trị, Toàn quyền, Nhân sự; Nhân sự không xác minh Quản trị, Toàn quyền, Nhân sự). Kiểm ở máy chủ trước lô (như mọi route tài khoản), không nằm trong câu ghi. Q4 xác nhận vế "Quản trị không xác minh Nhân sự".
- **R7 — Xem đủ số đòi CÙNG điều kiện như xác minh** (cấp bậc + tách nhiệm vụ + phiếu đang chờ): người không được xác minh thì không có lý do xem số (siết).
- **R8 — Phiếu ghi phiên bản chính sách CŨ vẫn xử lý được** (đóng BL-TK-PHIEU-BAN-CU): đồng ý lúc gửi còn hiệu lực trừ khi rút; rút đồng ý thì lô H-3 đã rút phiếu.
- **R9 — Nợ `birthDate` của `PUT /api/parties/:id`:** giữ máy chủ chặt (sự thật 15); ghi bẫy vào `docs/CHANGE-GUIDE.md`: form nào sau này thêm ô ngày sinh phải BỎ khoá khi không đổi. Không đổi hợp đồng API.
- **R10 — Giao diện ở trang Quản lý tài khoản** (`/staff`, `web/staff.ts` gọi `web/xac-minh-hang-cho.ts`): trang duy nhất cả HR, ADMIN, SUPER cùng vào; không trang mới, không mục menu (trần gói).
- **R11 — Trần gói:** hai hàm dòng chung `quanTriNhanSu()` (4 dòng) + `quanTri()` (10 dòng) ở `permissions.ts` (số đo ở Global Constraints). Không nới trần.
- **R12 — Chủ phiếu không còn gắn đúng hồ sơ của phiếu** (tài khoản `created_by` không có hoặc `party_id` khác): Quản trị / Nhân sự không xử lý (`khong_tai_khoan`); phiếu "Chuyển Toàn quyền"; Toàn quyền xử lý được (đóng cửa an toàn: không suy diễn chủ phiếu).
- **R13 — Từ chối cũng qua lính gác tách nhiệm vụ** (ADR-0125 đ5: "trong câu ghi chấp nhận hay từ chối").
- **R14 — Chấp nhận GIAY_TO:** có dòng hiện hành cùng loại ⇒ dòng mới là GIA HẠN (`previous_id` = dòng hiện hành); không có ⇒ dòng mới `previous_id = NULL`. Giá trị chép NGUYÊN VĂN từ phiếu (nội dung phiếu bất biến — trigger `pty_self_submission_content`).
- **R15 — Người xác minh thấy họ tên hồ sơ** (`pty_party.display_name`) để đối chiếu — không SĐT, email, vai, quan hệ (Q4).
- **R16 — `CAN_XAC_MINH_LAI` ở đúng hai đường đổi giá trị TẠI CHỖ:** đổi ngày sinh qua `PUT /api/parties/:id` (đích ATTRIBUTE `NGAY_SINH`) và sửa sai giấy tờ `POST …/documents/:did/correct` (đích PERSON_DOCUMENT), chỉ khi dòng xác minh mới nhất của đích là `DA_XAC_MINH`. Liên hệ không sửa tại chỗ (chỉ thêm / đóng); gia hạn, gộp tạo dòng MỚI (chưa xác minh) nên không cần.
- **R17 — Danh sách lý do từ chối là hằng** `LY_DO_TU_CHOI` ở `src/shared/xac-minh-hien-thi.ts` (một nguồn cho máy chủ và giao diện), không bảng, không ô chữ tự do. Đổi chữ nhãn = bề mặt; thêm / bớt mã = chủ duyệt.
- **R18 — Phiếu GIAY_TO khi chưa có ảnh:** hằng `CHAP_NHAN_GIAY_TO_KHI_CHUA_CO_ANH = false` ⇒ Chấp nhận phiếu giấy tờ trả 409 `can_anh_giay_to` ("Phiếu giấy tờ chưa có ảnh để đối chiếu — chưa chấp nhận được. Có thể từ chối với lý do phù hợp."); Từ chối vẫn được. Ngày sinh, địa chỉ chấp nhận được. Một dòng đảo ngược nếu chủ chọn khác (Q1).
- **R19 — Trigger CSDL "người quyết ≠ người khai"** (lớp hai cho vế (a)); vế (b)(c) chỉ ở câu ghi + bất biến `R-PTY-16` (trigger không đọc view của module khác — khuôn 5.3 của 0105).
- **R20 — Phiếu của hồ sơ đã gộp:** chấp nhận 409 `ho_so_da_gop`; từ chối được với lý do `HO_SO_DA_GOP`. Không đổi luật gộp ở lát này (Q3).
- **R21 — Cửa sổ 30 ngày:** biên dưới = `strftime('%Y-%m-%dT%H:%M:%fZ', s.created_at, '-30 days')`, so chuỗi ISO với `audit_log.created_at` (`toISOString()`); KHÔNG dùng `datetime()` (khác khuôn, so chuỗi sai lặng lẽ). Bao gồm biên (`>=`). Luật thuần dùng `Date.parse(...) - 30 * 86_400_000` → `toISOString()` (UTC không có giờ mùa hè ⇒ trùng nhau; bài biên ±1 ms ghim).
- **R22 — "Chuyển Toàn quyền" là nhãn CHUNG** (không theo người xem): không còn tài khoản đang hoạt động giữ ADMIN hoặc HR, không giữ SUPER_ADMIN, mà `xetNguoiXacMinh(...).duoc`.
- **R23 — Hàng chờ:** câu SQL đọc MỌI phiếu đang chờ (trần an toàn 5 000 dòng, cũ trước — không `LIMIT 50` trong SQL, vì lọc cấp bậc và tách nhiệm vụ làm ở máy chủ sau khi đọc); người không phải Toàn quyền chỉ thấy phiếu của tài khoản mình quản được (cấp bậc); sắp **phiếu xác minh được lên trước**, trong mỗi nhóm cũ trước, rồi lấy 50 dòng; phiếu bị tách nhiệm vụ chặn hiện với nhãn "Bạn không xác minh được phiếu này" (sự thật 20). Đã xử lý: 50 phiếu mới nhất; không trang thứ hai.

## Bản đồ tệp

| Tệp | Tạo / sửa | Việc |
|---|---|---|
| `migrations/0107_xac_minh_ho_so.sql` | tạo | view + chỉ mục + trigger (Task 1) |
| `src/migrations-xac-minh-ho-so.test.ts` | tạo | bài migration (Task 1) |
| `src/migrations-ho-so-tu-khai.test.ts` | sửa | bài "đứng cuối" (nếu có) → "đứng sau 0105" (Task 1) |
| `src/modules/audit/cham-tai-khoan.ts` + `cham-tai-khoan.test.ts`, `src/modules/audit/index.ts` | tạo / sửa | hằng phân loại, bài vét cạn, bài khớp view, bài người ghi cột hạn lớp hai (Task 1) |
| `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts` | sửa | hai tên sự kiện ADR-0121 (Task 1); ba hành động xác minh (Task 3) |
| `src/modules/accounts/index.ts` | sửa | dùng hằng `CHI_TIET_DOI_SDT` (Task 1) |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` | sửa / sinh lại | view + chỉ mục (Task 1) |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | sửa | `R-PTY-14`, `R-PTY-15`, `R-PTY-16` (Task 1) |
| `src/modules/parties/xac-minh.ts` + `xac-minh.test.ts` | tạo | luật thuần (Task 2) |
| `src/shared/xac-minh-hien-thi.ts` + `xac-minh-hien-thi.test.ts` | tạo | lý do từ chối, nhãn lý do chặn (Task 2) |
| `src/modules/parties/repository.ts` | sửa | câu hàng chờ / chi tiết / số / quyết / ghi giá trị / dòng xác minh (Task 2, 4) |
| `src/modules/parties/xac-minh-lenh.test.ts` | tạo | bài mức câu lệnh: lính gác, đồng thời, biên 30 ngày, cùng bảng ca (Task 2) |
| `src/shared/router.ts`, `src/index.ts`, `src/modules/staff/index.ts`, `src/modules/staff/repository.ts` | sửa | hàm tiêm `taiKhoanXacMinh` (Task 3) |
| `src/shared/permissions.ts`, `permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.ts` (sinh lại) | sửa | hai ô quyền + hai hàm dòng chung (Task 3) |
| `src/modules/parties/index.ts` | sửa | năm route (Task 3, 4) + `CAN_XAC_MINH_LAI` ở PUT / correct (Task 4) |
| `src/modules/parties/xac-minh-route.test.ts` | tạo | bài route trên SQLite thật (Task 3, 4) |
| `src/route-access.test.ts`, `src/route-write-guard.test.ts`, `src/tu-khai-khong-len-nhan.test.ts`, `src/giay-to-khong-lo-so.test.ts`, `src/shared/lan-gui-bi-mat.ts` (+ bài T16 nếu ghim) | sửa | ảnh chụp route, cổng accounts, rào 5.23, không lộ số, BI_MAT (Task 3, 4) |
| `web/xac-minh-hang-cho.ts`, `web/staff.ts`, `public/staff.html`, `public/app.css` | tạo / sửa | khối "Hàng chờ xác minh" (Task 5) |
| `src/xac-minh-giao-dien.test.ts` | tạo | rào tĩnh giao diện (Task 5) |
| `docs/evidence/2026-10-17-xac-minh/kich-ban/xac-minh-smoke.mjs` | tạo | kịch bản Chrome (Task 5) |
| `tests/e2e/xac-minh.mjs`, `tests/e2e/run.mjs` | tạo / sửa | e2e (Task 6) |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`, `docs/HANDOFF-N1.md`, `docs/BACKLOG.md`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts` | sửa | tài liệu, sổ hàng rào, runbook, nhật ký thay đổi 2.13 tạm (Task 6) |

## Nhóm giao, loại việc và người kiểm

| Nhóm | Task | Loại | Người kiểm độc lập (vai `nguoi-kiem-doc-lap`, chỉ đọc) |
|---|---|---|---|
| A | 1. Migration 0107 + phân loại "chạm quyền truy cập" + tên sự kiện ADR-0121 + bất biến | **VIỆC LỚN (dữ liệu, luật tách nhiệm vụ)** | **bắt buộc ngay sau Task 1** |
| B | 2. Luật thuần + câu ghi có lính gác + bài mức câu lệnh | **VIỆC LỚN (quyền — lính gác)** | gộp vào kiểm nhóm C |
| C | 3. Hai ô quyền + hàm tiêm + hàng chờ / chi tiết / xem số | **VIỆC LỚN (quyền, dữ liệu)** | gộp vào kiểm nhóm C |
| C | 4. Chấp nhận / từ chối + `CAN_XAC_MINH_LAI` | **VIỆC LỚN (quyền, dữ liệu)** | **bắt buộc ngay sau Task 4, phủ Task 2–4** |
| D | 5. Giao diện hàng chờ + kịch bản Chrome | nhỏ (giao diện) | gộp vào kiểm cuối |
| D | 6. E2E, tài liệu, sổ hàng rào, phá thử, bộ kiểm đủ | nghiệm thu | **kiểm cuối lát, phủ toàn lát** |

Vì sao ô quyền ở nhóm C chứ không ở nhóm A: `src/permission-enforcement.test.ts` đỏ khi một ô của `MATRIX` không route nào hỏi, và lối hoãn duy nhất (`docs/quyen-hoan.json`) có hạn do chủ xác nhận — không thêm mục hoãn. Nên ô quyền đi cùng commit với route đầu tiên hỏi nó (tiền lệ Task 3 của H-3). Người kiểm sau nhóm A kiểm dữ liệu + luật tách nhiệm vụ; người kiểm sau nhóm C kiểm quyền.

Người thi công KHÔNG tự nghiệm thu (N8): chỉ báo "đạt" dựa trên báo cáo người kiểm + test.

**Giới hạn không kiểm được ở lát này:** (a) không chạy trên D1 production — view, chỉ mục, `strftime` chỉ thử trên SQLite của Node và D1 local của `wrangler dev`; (b) kịch bản Chrome cần Chrome + axe ngoài repo — thiếu `AXE_JS` thì ghi **"chưa kiểm giao diện"**, không khai đạt; (c) chưa thử iPhone thật; (d) không đo tải hàng chờ với ~1000 tài khoản thật; (e) tiêu chí "Nhân sự mở ảnh của phiếu đang chờ" của ADR-0125 chỉ đạt ở phần SỐ ĐỦ — ảnh chờ BL-TK-ANH (Q1); (f) "hai người thông đồng" ngoài phạm vi luật (ADR nói thẳng).

---

### Task 1: Migration 0107 — view chạm tài khoản, chỉ mục, trigger người quyết ≠ người khai, phân loại vét cạn, tên sự kiện ADR-0121, bất biến (VIỆC LỚN — dữ liệu)

**Files:**
- Create: `migrations/0107_xac_minh_ho_so.sql`
- Create: `src/migrations-xac-minh-ho-so.test.ts`
- Create: `src/modules/audit/cham-tai-khoan.ts`, `src/modules/audit/cham-tai-khoan.test.ts`
- Modify: `src/modules/audit/index.ts` (công bố hằng), `src/shared/audit-actions.ts` (hai tên), `src/shared/lich-su-doi-tac.ts` (phân loại hai tên — `typecheck` đỏ nếu quên), `src/modules/accounts/index.ts` (dùng `CHI_TIET_DOI_SDT`)
- Modify: `src/migrations-ho-so-tu-khai.test.ts` (nếu có khẳng định "tệp cuối cùng" thì đổi thành "đứng sau 0103"; cùng cách sự thật 7 của H-3)
- Modify: `docs/data-dictionary.json` (view `v_aud_cham_tai_khoan`, chỉ mục; hạng N1 cho cả bốn cột view); Regenerate: `docs/DATA-DICTIONARY.md` (`npm run dict`)
- Modify: `scripts/audit-checks.mjs` (`R-PTY-14`, `R-PTY-15`, `R-PTY-16` ngay sau `R-PTY-13`), `src/audit-invariants.test.ts`

**Interfaces:**
- Consumes: bảng `audit_log`, `pty_self_submission` (0105), `pty_verification` (0103); `AUDIT_ACTIONS` (`src/shared/audit-actions.ts`).
- Produces:
  - View `v_aud_cham_tai_khoan(actor_id TEXT, account_id TEXT, loai TEXT /* 'TAO'|'VINH_VIEN'|'CUA_SO_30' */, at TEXT)`.
  - `export const CHI_TIET_DOI_SDT = "đổi SĐT đăng nhập";`
  - `export const CHAM_TAI_KHOAN: { TAO: readonly AuditAction[]; VINH_VIEN: readonly AuditAction[]; CUA_SO_30: readonly AuditAction[]; CUA_SO_30_THEO_CHI_TIET: readonly { action: AuditAction; chua: string }[]; KHONG_CHAM: Readonly<Partial<Record<AuditAction, string>>> }` — công bố qua `src/modules/audit/index.ts`.
  - `export type LoaiCham = "TAO" | "VINH_VIEN" | "CUA_SO_30";`
  - Hai hành động nhật ký mới (chỉ tên, chưa ai ghi): `mfa_grace_reopened`, `mfa_exception_set`.
  - Trigger `pty_self_submission_decider_not_author`.

- [ ] **Step 1: Viết bài migration (đỏ)** — `src/migrations-xac-minh-ho-so.test.ts`, khuôn `src/migrations-ho-so-tu-khai.test.ts` (nạp mọi migration theo thứ tự vào `node:sqlite` trong bộ nhớ):

```ts
// Bài migration 0107 (ADR-0125 đ5; lát H-4 Gói 2). Tìm tệp theo ĐUÔI. Phá thử: bỏ 'pin_reset' khỏi tầng VINH_VIEN của view → (b) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const MIG = new URL("../migrations/", import.meta.url);
const FILES = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
const FILE = FILES.find((f) => f.endsWith("_xac_minh_ho_so.sql"))!;
function db(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  for (const f of FILES) d.exec(readFileSync(new URL(f, MIG), "utf8"));
  return d;
}
const T = "2026-10-17T00:00:00.000Z";
function ghiNhatKy(d: DatabaseSync, v: { id: string; actor: string | null; action: string; target: string; at: string; detail?: string; targetType?: string }) {
  d.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)")
    .run(v.id, v.actor, v.action, v.targetType ?? "staff", v.target, v.detail ?? null, v.at);
}

test("(a) tệp 0107 có, đứng sau 0105, chỉ THÊM (không DROP, không ALTER, không INSERT)", () => {
  assert.ok(FILE, "thiếu migrations/*_xac_minh_ho_so.sql");
  assert.ok(FILES.indexOf(FILE) > FILES.findIndex((f) => f.endsWith("_ho_so_tu_khai.sql")));
  const sql = readFileSync(new URL(FILE, MIG), "utf8").replace(/--.*$/gm, "");
  assert.doesNotMatch(sql, /\b(DROP|ALTER|INSERT|DELETE|UPDATE\s+\w+\s+SET)\b/i);
});

test("(b) view phân tầng đúng: tạo → TAO; đặt lại PIN, tắt lớp hai, hai sự kiện ADR-0121 → VINH_VIEN; năm hành động + đổi SĐT → CUA_SO_30; còn lại không vào", () => {
  const d = db();
  const A = "acc-1", X = "actor-1";
  const vao: [string, string | undefined, string | null][] = [
    ["staff_created", undefined, "TAO"], ["pin_reset", undefined, "VINH_VIEN"], ["mfa_reset", undefined, "VINH_VIEN"],
    ["mfa_grace_reopened", undefined, "VINH_VIEN"], ["mfa_exception_set", undefined, "VINH_VIEN"],
    ["passkey_removed", undefined, "CUA_SO_30"], ["login_unlocked", undefined, "CUA_SO_30"], ["permission_changed", undefined, "CUA_SO_30"],
    ["account_roles_changed", undefined, "CUA_SO_30"], ["staff_role_changed", undefined, "CUA_SO_30"],
    ["staff_updated", 'tên "A" → "B"; đổi SĐT đăng nhập', "CUA_SO_30"],
    ["staff_updated", 'tên "A" → "B"', null], ["staff_suspended", undefined, null], ["session_revoked", undefined, null], ["pin_changed", undefined, null],
  ];
  vao.forEach(([action, detail], i) => ghiNhatKy(d, { id: `a${i}`, actor: X, action, target: A, at: T, detail }));
  ghiNhatKy(d, { id: "sync", actor: null, action: "staff_created", target: A, at: T }); // đồng bộ Sheet: không có người tạo
  ghiNhatKy(d, { id: "khac", actor: X, action: "pin_reset", target: "pty-1", at: T, targetType: "party" }); // không phải tài khoản
  const rows = d.prepare("SELECT loai, COUNT(*) AS n FROM v_aud_cham_tai_khoan WHERE account_id = ? AND actor_id = ? GROUP BY loai ORDER BY loai").all(A, X);
  assert.deepEqual(rows.map((r) => [r.loai, Number(r.n)]), [["CUA_SO_30", 6], ["TAO", 1], ["VINH_VIEN", 4]]);
  assert.equal(Number(d.prepare("SELECT COUNT(*) AS n FROM v_aud_cham_tai_khoan WHERE actor_id IS NULL").get()!.n), 0);
});

test("(c) view chỉ có bốn cột khoá — không detail (khuôn v_aud_account_event)", () => {
  const cols = db().prepare("SELECT name FROM pragma_table_info('v_aud_cham_tai_khoan')").all().map((r) => r.name);
  assert.deepEqual(cols, ["actor_id", "account_id", "loai", "at"]);
});

test("(d) chỉ mục idx_audit_target có và được dùng cho lính gác", () => {
  const plan = db().prepare("EXPLAIN QUERY PLAN SELECT 1 FROM v_aud_cham_tai_khoan WHERE account_id = ? AND actor_id = ?").all("a", "b");
  assert.ok(plan.some((r) => String(r.detail).includes("idx_audit_target")), JSON.stringify(plan));
});

test("(e) trigger: người khai không tự chấp nhận / tự từ chối phiếu của mình; RUT của chính mình vẫn được", () => {
  // dựng chính sách + đồng ý + phiếu như bài (e) của migrations-ho-so-tu-khai.test.ts (cùng helper)
  // UPDATE … SET status='DA_CHAP_NHAN', decided_by = created_by → throws /self_submission_decider_is_author/
  // UPDATE … SET status='TU_CHOI', reason_code='KHONG_KHOP_GIAY_TO', decided_by = created_by → throws cùng mã
  // UPDATE … SET status='RUT', decided_by = created_by → OK
});
```

Viết đủ thân bài (e) bằng helper dựng hồ sơ / chính sách / đồng ý / phiếu sẵn có trong `src/migrations-ho-so-tu-khai.test.ts` (chép hàm, không import chéo tệp test).

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/migrations-xac-minh-ho-so.test.ts`
Expected: FAIL — `thiếu migrations/*_xac_minh_ho_so.sql`.

- [ ] **Step 3: Viết migration**

```sql
-- Migration 0107 — ADR-0125 (accepted 2026-10-16) đ5: người xác minh hồ sơ (lát H-4 Gói 2). CHỈ THÊM. Module audit (view + chỉ mục) và parties (một trigger).
-- KHÔNG bảng mới, KHÔNG cột mới, KHÔNG gieo, KHÔNG mở loại nối ảnh SELF_SUBMISSION (ruling R4 kế hoạch 2026-10-17-goi-2-h4-xac-minh).
-- v_aud_cham_tai_khoan = hình chiếu audit_log CHỈ KHOÁ (khuôn v_aud_account_event 0075): ai (actor_id) đã TẠO hay CHẠM QUYỀN TRUY CẬP tài khoản nào (account_id), tầng, lúc.
-- Danh sách hành động khớp TỪNG CHỮ với hằng CHAM_TAI_KHOAN (src/modules/audit/cham-tai-khoan.ts) — bài cham-tai-khoan.test.ts đối chiếu. Đổi danh sách = migration MỚI
-- tạo lại view (DROP VIEW + CREATE VIEW) + sửa hằng cùng commit. Dòng không có người làm (đồng bộ Sheet, staff_id NULL) không vào view (ADR-0125 đ5 "giới hạn nói thẳng").
-- staff_updated chỉ vào khi chi tiết chứa chữ của hằng CHI_TIET_DOI_SDT (đổi SĐT đăng nhập) — accounts ghi chữ đó bằng chính hằng ấy.
CREATE INDEX idx_audit_target ON audit_log(target_type, target_id, staff_id);

CREATE VIEW v_aud_cham_tai_khoan AS
  SELECT staff_id AS actor_id, target_id AS account_id,
         CASE WHEN action = 'staff_created' THEN 'TAO'
              WHEN action IN ('pin_reset', 'mfa_reset', 'mfa_grace_reopened', 'mfa_exception_set') THEN 'VINH_VIEN'
              ELSE 'CUA_SO_30' END AS loai,
         created_at AS at
  FROM audit_log
  WHERE target_type = 'staff' AND target_id IS NOT NULL AND staff_id IS NOT NULL
    AND (action IN ('staff_created', 'pin_reset', 'mfa_reset', 'mfa_grace_reopened', 'mfa_exception_set',
                    'passkey_removed', 'login_unlocked', 'permission_changed', 'account_roles_changed', 'staff_role_changed')
         OR (action = 'staff_updated' AND instr(COALESCE(detail, ''), 'đổi SĐT đăng nhập') > 0));

-- Vế (a) của ADR-0125 đ5 ở lớp CSDL (lớp chính: lính gác trong câu ghi của parties). Vế (b)(c) KHÔNG ở trigger: trigger chỉ đọc bảng pty_* (khuôn 0105).
CREATE TRIGGER pty_self_submission_decider_not_author BEFORE UPDATE ON pty_self_submission
WHEN NEW.status IN ('DA_CHAP_NHAN', 'TU_CHOI') AND NEW.decided_by IS OLD.created_by
BEGIN SELECT RAISE(ABORT, 'self_submission_decider_is_author: người xác minh phải khác người khai'); END;
```

- [ ] **Step 4: Chạy lại, xác nhận xanh**

Run: `node --test src/migrations-xac-minh-ho-so.test.ts src/migrations-ho-so-tu-khai.test.ts src/migrations-ho-so-tep.test.ts`
Expected: PASS (sửa bài "đứng cuối" của tệp 0105 nếu đỏ đúng dự kiến).

- [ ] **Step 5: Bài phân loại vét cạn + khớp view + người ghi cột hạn lớp hai (đỏ)** — `src/modules/audit/cham-tai-khoan.test.ts`:

```ts
// HÀNG RÀO "chạm quyền truy cập" (ADR-0125 đ5; lát H-4 Gói 2). (1) MỌI hành động nhóm staff được xếp vào ĐÚNG MỘT tầng (TAO / VINH_VIEN / CUA_SO_30 / theo chi tiết /
// KHONG_CHAM có lý do) — thêm hành động tài khoản mới mà quên xếp thì đỏ (giữ vế vĩnh viễn không hở khi lát ADR-0121 thêm sự kiện). (2) Hằng khớp TỪNG CHỮ với view của
// migration *_xac_minh_ho_so.sql. (3) Chữ đổi SĐT là MỘT hằng, nơi ghi (accounts) dùng chính hằng đó. (4) Câu SQL GHI cột hạn lớp hai (mfa_grace_until, mfa_enroll_until)
// = đúng tập ghim — câu mới (vd "mở lại 24 giờ" của ADR-0121) phải ghi sự kiện tầng VINH_VIEN cùng lô và được thêm vào đây có lý do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIT_ACTIONS } from "../../shared/audit-actions.ts";
import { CHAM_TAI_KHOAN, CHI_TIET_DOI_SDT } from "./cham-tai-khoan.ts";

const nhomStaff = Object.entries(AUDIT_ACTIONS).filter(([, v]) => v.group === "staff").map(([k]) => k).sort();
const xep = [
  ...CHAM_TAI_KHOAN.TAO, ...CHAM_TAI_KHOAN.VINH_VIEN, ...CHAM_TAI_KHOAN.CUA_SO_30,
  ...CHAM_TAI_KHOAN.CUA_SO_30_THEO_CHI_TIET.map((x) => x.action), ...Object.keys(CHAM_TAI_KHOAN.KHONG_CHAM),
];

test("(1) mọi hành động nhóm staff được xếp đúng một tầng; KHONG_CHAM có lý do", () => {
  assert.deepEqual([...xep].sort(), nhomStaff, "hành động nhóm staff chưa xếp tầng hoặc xếp trùng");
  assert.equal(new Set(xep).size, xep.length, "một hành động ở hai tầng");
  for (const [a, lyDo] of Object.entries(CHAM_TAI_KHOAN.KHONG_CHAM)) assert.ok(lyDo && lyDo.trim().length > 10, `${a}: thiếu lý do`);
  for (const a of ["pin_reset", "mfa_reset", "mfa_grace_reopened", "mfa_exception_set"]) assert.ok(CHAM_TAI_KHOAN.VINH_VIEN.includes(a as never), `${a} phải VĨNH VIỄN (ADR-0125 đ5)`);
});

test("(2) hằng khớp từng chữ với view của migration", () => {
  const mig = new URL("../../../migrations/", import.meta.url);
  const f = readdirSync(mig).find((x) => x.endsWith("_xac_minh_ho_so.sql"))!;
  const view = readFileSync(new URL(f, mig), "utf8").split(/CREATE VIEW v_aud_cham_tai_khoan/)[1]!.split(";")[0]!;
  const inVinhVien = view.match(/WHEN action IN \(([^)]*)\) THEN 'VINH_VIEN'/)![1]!.match(/'([a-z_]+)'/g)!.map((s) => s.slice(1, -1));
  assert.deepEqual([...inVinhVien].sort(), [...CHAM_TAI_KHOAN.VINH_VIEN].sort());
  const inTatCa = view.match(/AND \(action IN \(([^)]*)\)/)![1]!.match(/'([a-z_]+)'/g)!.map((s) => s.slice(1, -1));
  assert.deepEqual([...inTatCa].sort(), [...CHAM_TAI_KHOAN.TAO, ...CHAM_TAI_KHOAN.VINH_VIEN, ...CHAM_TAI_KHOAN.CUA_SO_30].sort());
  for (const x of CHAM_TAI_KHOAN.CUA_SO_30_THEO_CHI_TIET) assert.ok(view.includes(`action = '${x.action}' AND instr(COALESCE(detail, ''), '${x.chua}') > 0`), x.action);
});

test("(3) chữ đổi SĐT là MỘT hằng; accounts ghi bằng hằng đó, không viết tay", () => {
  assert.equal(CHI_TIET_DOI_SDT, "đổi SĐT đăng nhập");
  assert.deepEqual(CHAM_TAI_KHOAN.CUA_SO_30_THEO_CHI_TIET, [{ action: "staff_updated", chua: CHI_TIET_DOI_SDT }]);
  const acc = readFileSync(new URL("../accounts/index.ts", import.meta.url), "utf8");
  assert.match(acc, /CHI_TIET_DOI_SDT/);
  assert.doesNotMatch(acc.replace(/\/\/.*$/gm, ""), /"đổi SĐT đăng nhập"/, "accounts phải dùng hằng, không viết tay chữ");
});

test("(4) câu SQL GHI cột hạn lớp hai = đúng tập ghim", () => {
  const SRC = fileURLToPath(new URL("../../", import.meta.url));
  const tep = (d: string): string[] => readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? tep(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
  const ghi: string[] = [];
  for (const p of tep(SRC)) {
    for (const m of readFileSync(p, "utf8").matchAll(/defineSql\(\s*"([a-z-]+)",\s*"([a-z_]+)",\s*[`"]([^`"]*)[`"]/g)) {
      if (/\b(UPDATE|INSERT)\b/i.test(m[3]!) && /mfa_grace_until|mfa_enroll_until/.test(m[3]!)) ghi.push(`${m[1]}/${m[2]}`);
    }
  }
  // Ghim 2026-10-17: tạo tài khoản (ân hạn lúc tạo), đặt ân hạn khi NULL (trở thành nội bộ / kích hoạt lại — không trao quyền đăng nhập thay ai),
  // cửa sổ bật lại 24 giờ (CHỈ trong lô mfa_reset — đã là tầng VINH_VIEN). Thêm câu mới ⇒ ghi sự kiện tầng VINH_VIEN cùng lô rồi mới thêm vào đây.
  assert.deepEqual(ghi.sort(), ["staff/insert_staff", "staff/mfa_enroll_set", "staff/mfa_grace_if_null"].sort());
});
```

Người thi công kiểm tên khoá thật của câu tạo tài khoản ở `src/modules/staff/repository.ts` (dòng có `INSERT INTO staff (… mfa_grace_until)`) và thay `staff/insert_staff` cho đúng; nếu câu đó KHÔNG dùng `defineSql` dạng `defineSql("staff", "<khoá>", …)` thì mở rộng bộ bóc cho đúng khuôn của tệp (không bỏ ca).

- [ ] **Step 6: Chạy, xác nhận đỏ**

Run: `node --test src/modules/audit/cham-tai-khoan.test.ts`
Expected: FAIL — không tìm thấy `./cham-tai-khoan.ts`.

- [ ] **Step 7: Viết hằng, tên sự kiện, dùng hằng ở accounts**

`src/modules/audit/cham-tai-khoan.ts`:

```ts
// "Chạm quyền truy cập" (ADR-0125 đ5; lát H-4 Gói 2) — MỘT nguồn tên, khớp từng chữ với view v_aud_cham_tai_khoan (migration *_xac_minh_ho_so.sql).
// Thuần, không I/O. Đổi danh sách = migration mới tạo lại view + sửa tệp này cùng commit (bài cham-tai-khoan.test.ts).
import type { AuditAction } from "../../shared/audit-actions.ts";

/** Chữ nhật ký `staff_updated` khi đổi SĐT đăng nhập — accounts GHI bằng hằng này, view NHẬN bằng chính chữ này. */
export const CHI_TIET_DOI_SDT = "đổi SĐT đăng nhập";
export type LoaiCham = "TAO" | "VINH_VIEN" | "CUA_SO_30";

export const CHAM_TAI_KHOAN = {
  TAO: ["staff_created"],
  // Trao quyền đăng nhập thay: áp vĩnh viễn (chủ duyệt 2026-10-16 "bịt kẽ hở 30 ngày"). Hai tên ADR-0121 đặt trước, CHƯA ai ghi.
  VINH_VIEN: ["pin_reset", "mfa_reset", "mfa_grace_reopened", "mfa_exception_set"],
  CUA_SO_30: ["passkey_removed", "login_unlocked", "permission_changed", "account_roles_changed", "staff_role_changed"],
  CUA_SO_30_THEO_CHI_TIET: [{ action: "staff_updated", chua: CHI_TIET_DOI_SDT }],
  KHONG_CHAM: {
    staff_suspended: "Ngưng tài khoản lấy mất quyền đăng nhập, không trao quyền cho ai.",
    staff_reactivated: "Kích hoạt lại trả quyền cho chính chủ; ngoài danh sách của ADR-0125 đ5 — chờ chủ quyết (Q2 kế hoạch H-4).",
    pin_changed: "Chính chủ tự đổi PIN của mình.",
    passkey_added: "Chính chủ tự bật Face ID.",
    pin_set_by_passkey: "Chính chủ đặt PIN mới bằng Face ID của mình.",
    staff_synced: "Đồng bộ Sheet do hệ thống làm, không có người làm.",
    session_policy_changed: "Chính sách chung, không nhắm một tài khoản.",
    session_revoked: "Gỡ phiên chỉ lấy mất quyền đăng nhập.",
    mfa_enabled: "Chính chủ tự bật lớp hai.",
    mfa_removed: "Chính chủ tự gỡ lớp hai của mình.",
    mfa_recovery_regenerated: "Chính chủ tự tạo mã dự phòng.",
  },
} as const satisfies {
  TAO: readonly AuditAction[]; VINH_VIEN: readonly AuditAction[]; CUA_SO_30: readonly AuditAction[];
  CUA_SO_30_THEO_CHI_TIET: readonly { action: AuditAction; chua: string }[]; KHONG_CHAM: Readonly<Partial<Record<AuditAction, string>>>;
};
```

`src/modules/audit/index.ts`: `export { CHAM_TAI_KHOAN, CHI_TIET_DOI_SDT, type LoaiCham } from "./cham-tai-khoan";` (đúng kiểu import không đuôi của tệp `index.ts` module cũ — xem dòng import hiện có).

`src/shared/audit-actions.ts` thêm cạnh `mfa_reset`:

```ts
  // ADR-0121 đ4, đ7 + ADR-0125 đ5: TÊN đặt trước ở lát H-4 (chưa route nào ghi). Lát ADR-0121 PHẢI ghi đúng hai tên này, target_type 'staff', target_id = tài khoản,
  // staff_id = người làm, CÙNG LÔ với thay đổi — nếu không, vế "vĩnh viễn" của luật tách nhiệm vụ xác minh hở (view v_aud_cham_tai_khoan). KHÔNG chi tiết.
  mfa_grace_reopened: { label: "Mở lại đăng nhập 24 giờ khi chưa bật bảo mật hai lớp", group: "staff" },
  mfa_exception_set: { label: "Đặt ngoại lệ tạm bảo mật hai lớp", group: "staff" },
```

`src/shared/lich-su-doi-tac.ts`: xếp hai tên vào cùng nhóm với `mfa_reset` (đọc tệp; `typecheck` chỉ ra chỗ thiếu).

`src/modules/accounts/index.ts` (hàm dựng `bits` của `PATCH /api/staff/:id`): thay chữ viết tay bằng `CHI_TIET_DOI_SDT` nhập từ `../audit`. Bài `src/modules/accounts/patch-staff.test.ts` ("vẫn phải nói rõ có đổi SĐT đăng nhập") phải vẫn xanh.

- [ ] **Step 8: Bất biến (đỏ rồi xanh)** — `scripts/audit-checks.mjs`, ngay sau `R-PTY-13`, cùng khuôn mục:

```js
// R-PTY-14 (ADR-0125, ruling R3 kế hoạch H-4): phiếu ĐÃ CHẤP NHẬN phải có ĐÚNG dòng xác minh cùng mã, DA_XAC_MINH, cùng người, cùng lúc.
`SELECT COUNT(*) AS n FROM pty_self_submission s
  WHERE s.status = 'DA_CHAP_NHAN' AND NOT EXISTS (SELECT 1 FROM pty_verification v
    WHERE v.id = s.id AND v.outcome = 'DA_XAC_MINH' AND v.created_by = s.decided_by AND v.created_at = s.decided_at)`,
// R-PTY-15 (ADR-0125 đ5 vế a): phiếu chấp nhận / từ chối bởi CHÍNH người khai.
`SELECT COUNT(*) AS n FROM pty_self_submission WHERE status IN ('DA_CHAP_NHAN', 'TU_CHOI') AND decided_by = created_by`,
// R-PTY-16 (ADR-0125 đ5 vế b, c): dòng xác minh KHÔNG mang cờ mà người xác minh từng tạo / chạm (vĩnh viễn) / chạm trong 30 ngày trước lúc gửi — lính gác bị lách.
`SELECT COUNT(*) AS n FROM pty_verification v JOIN pty_self_submission s ON s.id = v.id
  WHERE v.outcome = 'DA_XAC_MINH' AND v.verifier_touched_account = 0 AND EXISTS (SELECT 1 FROM v_aud_cham_tai_khoan c
    WHERE c.account_id = s.created_by AND c.actor_id = v.created_by
      AND c.at <= v.created_at -- chỉ sự kiện CÓ TRƯỚC lúc xác minh: đặt lại PIN SAU khi đã xác minh không biến dòng cũ thành "lách"
      AND (c.loai IN ('TAO', 'VINH_VIEN') OR (c.loai = 'CUA_SO_30' AND c.at >= strftime('%Y-%m-%dT%H:%M:%fZ', s.created_at, '-30 days'))))`,
```

`src/audit-invariants.test.ts`: mỗi mã một bài dựng trạng thái lỗi trong DB thử (R-PTY-15: gỡ trigger `pty_self_submission_decider_not_author` trong DB thử rồi ghi; R-PTY-14: chấp nhận phiếu mà không ghi dòng xác minh; R-PTY-16: chèn `pin_reset` của chính người xác minh TRƯỚC lúc xác minh rồi ghi `pty_verification` cờ 0) ⇒ `expected: 1`; trạng thái sạch ⇒ 0; **ca bắt buộc của R-PTY-16:** cùng người đặt lại PIN cho chủ phiếu SAU lúc xác minh ⇒ 0 (không đỏ giả sau triển khai — `audit-invariants --db remote` chạy sau mỗi lần deploy). Đỏ trước (mã chưa có ⇒ bài không tìm thấy mục), xanh sau.

- [ ] **Step 9: Sổ dữ liệu** — `docs/data-dictionary.json`: thêm view `v_aud_cham_tai_khoan` (module `audit`, bốn cột, `hangDuLieu` N1) và chỉ mục `idx_audit_target` theo khuôn mục `v_aud_account_event`; `npm run dict`.

- [ ] **Step 10: Chạy bộ kiểm của task**

Run: `node --test src/migrations-xac-minh-ho-so.test.ts src/modules/audit/cham-tai-khoan.test.ts src/audit-invariants.test.ts src/architecture.test.ts src/hang-du-lieu.test.ts src/modules/accounts/patch-staff.test.ts src/shared/audit-actions.test.ts`, rồi `npm run typecheck`, rồi `npm test`.
Expected: PASS; `typecheck` 0 lỗi.

**Tiêu chí nghiệm thu Task 1:** (1) view trả đúng tầng cho 15 ca của bài (b), không có dòng thiếu người làm; (2) xoá một tên khỏi tầng VINH_VIEN của view ⇒ bài (2) đỏ; (3) thêm một hành động nhóm `staff` giả vào `AUDIT_ACTIONS` ⇒ bài (1) đỏ; (4) người khai tự quyết phiếu ⇒ CSDL chặn; (5) ba bất biến đỏ đúng ca, xanh khi sạch; (6) `EXPLAIN` dùng `idx_audit_target`.

- [ ] **Step 11: Commit**

```bash
git add migrations/0107_xac_minh_ho_so.sql src/migrations-xac-minh-ho-so.test.ts src/migrations-ho-so-tu-khai.test.ts src/modules/audit/ src/shared/audit-actions.ts src/shared/lich-su-doi-tac.ts src/modules/accounts/index.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md scripts/audit-checks.mjs src/audit-invariants.test.ts
git commit -m "Xác minh hồ sơ: view chạm tài khoản, trigger người quyết khác người khai, tên hai sự kiện ADR-0121, bất biến (ADR-0125)"
```

**→ Người kiểm độc lập nhóm A** (chỉ đọc): đọc 0107 + hằng; tự chạy lại Step 10; thử ít nhất ba đột biến (bỏ một tên tầng VINH_VIEN, đổi `instr` thành so bằng, bỏ `staff_id IS NOT NULL`) và báo bài nào bắt.

---

### Task 2: Luật thuần xác minh + câu ghi có lính gác + bài mức câu lệnh (VIỆC LỚN — lính gác)

**Files:**
- Create: `src/modules/parties/xac-minh.ts`, `src/modules/parties/xac-minh.test.ts`
- Create: `src/shared/xac-minh-hien-thi.ts`, `src/shared/xac-minh-hien-thi.test.ts`
- Modify: `src/modules/parties/repository.ts` (câu mới — liệt kê ở Interfaces)
- Create: `src/modules/parties/xac-minh-lenh.test.ts`
- Modify: `src/tu-khai-khong-len-nhan.test.ts` (bài (2) `CAU_GHIM`, bài (3) `HAM` — thêm đúng tên câu / hàm mới)

**Interfaces:**
- Consumes: view `v_aud_cham_tai_khoan` (Task 1; kiểu `LoaiCham` khai lại tại chỗ, cùng ba chữ); `canManageAccount` (`src/shared/roles.ts`); `cheSo` (`giay-to.ts`); `Result` (`rules.ts`).
- Produces (luật thuần `xac-minh.ts`):

```ts
export interface ChamTaiKhoan { actorId: string; accountId: string; loai: LoaiCham; at: string }
export interface TaiKhoanTom { id: string; permissions: readonly PermissionCode[]; active: boolean; partyId: string | null }
export interface PhieuXet { id: string; partyId: string; createdBy: string; createdAt: string }
export type LyDoChan = "nguoi_khai" | "khong_tai_khoan" | "cap_bac" | "da_cham";
export interface KetLuanXet { duoc: boolean; lyDo: LyDoChan | null; coCham: boolean }
export function moc30Ngay(createdAtIso: string): string;
export function coChamTaiKhoan(cham: readonly ChamTaiKhoan[], actorId: string, phieu: PhieuXet): boolean;
export function xetNguoiXacMinh(v: { nguoi: TaiKhoanTom; phieu: PhieuXet; chuPhieu: TaiKhoanTom | null; cham: readonly ChamTaiKhoan[] }): KetLuanXet;
export function chuyenToanQuyen(phieu: PhieuXet, chuPhieu: TaiKhoanTom | null, ds: readonly TaiKhoanTom[], cham: readonly ChamTaiKhoan[]): boolean;
export function kiemTuChoi(body: Record<string, unknown> | null): Result<{ lyDo: MaLyDoTuChoi }>;
export const CHAP_NHAN_GIAY_TO_KHI_CHUA_CO_ANH = false; // ruling R18 / Q1
export function lyDoKhongChapNhan(v: { loai: string; daGop: boolean; coAnh: boolean }): { code: string; message: string } | null;
export function loiLoChapNhan(e: unknown): { status: 409; code: string; message: string } | null; // trigger 0032 / one_way / decider
```

- Produces (dùng chung `src/shared/xac-minh-hien-thi.ts`, thuần, không import):

```ts
export const LY_DO_TU_CHOI = {
  KHONG_DOC_DUOC: "Thông tin không đọc được hoặc không rõ",
  KHONG_KHOP_GIAY_TO: "Thông tin khai không khớp giấy tờ",
  GIAY_TO_HET_HAN: "Giấy tờ đã hết hạn",
  SAI_LOAI_GIAY_TO: "Sai loại giấy tờ",
  TRUNG_HO_SO_KHAC: "Số giấy tờ đã thuộc hồ sơ khác",
  KHONG_PHAI_CHINH_CHU: "Không phải thông tin của chính chủ",
  CHUA_DOI_CHIEU_DUOC: "Chưa đối chiếu được với bản gốc",
  HO_SO_DA_GOP: "Hồ sơ đã gộp vào hồ sơ khác",
} as const;
export type MaLyDoTuChoi = keyof typeof LY_DO_TU_CHOI;
export const laMaLyDoTuChoi = (v: unknown): v is MaLyDoTuChoi => typeof v === "string" && Object.hasOwn(LY_DO_TU_CHOI, v);
export const nhanLyDoTuChoi = (c: string): string => (Object.hasOwn(LY_DO_TU_CHOI, c) ? LY_DO_TU_CHOI[c as MaLyDoTuChoi] : "Lý do khác");
export const NHAN_LY_DO_CHAN: Readonly<Record<string, string>> = {
  nguoi_khai: "Đây là phiếu của chính bạn.",
  khong_tai_khoan: "Phiếu không còn gắn đúng tài khoản — chuyển Toàn quyền.",
  cap_bac: "Tài khoản này ngoài phạm vi bạn quản lý.",
  da_cham: "Bạn đã tạo hoặc từng hỗ trợ đăng nhập cho tài khoản này — để người khác xác minh.",
};
```

- Produces (repository, mọi câu `defineSql("parties", …)`, số tham số cố định):
  - `listPhieuCho(db, tran = 5000): Promise<PhieuChoRow[]>` — khoá `list_pending_self_submissions` (cũ trước, `LIMIT ?1` = trần an toàn; route lọc + sắp + cắt 50 — R23): `id, party_id, subject_kind, document_type_code, created_at, created_by, display_name, merged` (KHÔNG `document_number`, KHÔNG trường khai).
  - `listPhieuDaXuLy(db, limit = 50): Promise<PhieuXongRow[]>` — khoá `list_decided_self_submissions`: `s.id, s.subject_kind, s.status, s.reason_code, s.decided_by, s.decided_at, v.verifier_touched_account` (`LEFT JOIN pty_verification v ON v.id = s.id`), `WHERE s.status IN ('DA_CHAP_NHAN','TU_CHOI')`.
  - `timPhieuChoXet(db, id): Promise<PhieuChiTietRow | null>` — khoá `find_self_submission_for_verify`: mọi trường khai TRỪ `document_number` (có `number_key` để tính `cheSo` và cờ trùng), `status`, `party_id`, `created_by`, `created_at`, `merged`.
  - `soDuCuaPhieuCho(db, id): Promise<{ document_number: string; type_name: string } | null>` — khoá `find_pending_self_submission_number`: `WHERE s.id = ?1 AND s.status = 'CHO_XAC_MINH' AND s.document_number IS NOT NULL`.
  - `chamCuaTaiKhoan(db, accountIds: readonly string[]): Promise<ChamTaiKhoan[]>` — khoá `list_account_touches`: `SELECT actor_id, account_id, loai, at FROM v_aud_cham_tai_khoan WHERE account_id IN (SELECT value FROM json_each(?1))`.
  - `trungSoHoSoKhac(db, partyId, numberKey, typeCode): Promise<boolean>` — khoá `self_submission_number_elsewhere` (dòng `pty_person_document` chưa huỷ của hồ sơ KHÁC cùng `number_key`, cùng loại).
  - `quyetPhieuStatement(db, v: { id: string; ketLuan: "DA_CHAP_NHAN" | "TU_CHOI"; lyDo: string | null; actorId: string; at: string; laToanQuyen: boolean }): D1PreparedStatement` — khoá `decide_self_submission`.
  - `ghiNgaySinhTuPhieuStatement`, `ghiDiaChiTuPhieuStatement`, `ghiGiayToTuPhieuStatement`, `lamMoiHoSoTuPhieuStatement`, `ghiXacMinhTuPhieuStatement` — năm câu phụ thuộc, khoá `accept_self_submission_birth_date`, `accept_self_submission_address`, `accept_self_submission_document`, `accept_self_submission_touch_party`, `accept_self_submission_verification`; mỗi câu nhận `{ id, actorId, at, … }` và mang điều kiện thắng.

- [ ] **Step 1: Bài luật thuần (đỏ)** — `src/modules/parties/xac-minh.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuyenToanQuyen, coChamTaiKhoan, kiemTuChoi, lyDoKhongChapNhan, moc30Ngay, xetNguoiXacMinh, type ChamTaiKhoan, type TaiKhoanTom } from "./xac-minh.ts";

const GUI = "2026-10-17T08:00:00.000Z";
const phieu = { id: "p1", partyId: "pty-u", createdBy: "u", createdAt: GUI };
const chu: TaiKhoanTom = { id: "u", permissions: ["PARTNER"], active: true, partyId: "pty-u" };
const hr: TaiKhoanTom = { id: "hr", permissions: ["HR"], active: true, partyId: "pty-hr" };
const adm: TaiKhoanTom = { id: "adm", permissions: ["ADMIN"], active: true, partyId: "pty-adm" };
const sup: TaiKhoanTom = { id: "sup", permissions: ["SUPER_ADMIN"], active: true, partyId: "pty-sup" };
const cham = (actorId: string, loai: ChamTaiKhoan["loai"], at: string): ChamTaiKhoan => ({ actorId, accountId: "u", loai, at });

test("moc30Ngay: đúng 30 ngày UTC, khuôn toISOString", () => {
  assert.equal(moc30Ngay(GUI), "2026-09-17T08:00:00.000Z");
});

test("Review Focus 2: vĩnh viễn và biên 30 ngày", () => {
  assert.equal(coChamTaiKhoan([cham("hr", "VINH_VIEN", "2025-09-12T00:00:00.000Z")], "hr", phieu), true, "đặt lại PIN 400 ngày trước vẫn chặn");
  assert.equal(coChamTaiKhoan([cham("hr", "CUA_SO_30", "2026-09-17T08:00:00.000Z")], "hr", phieu), true, "đúng biên 30 ngày: chặn");
  assert.equal(coChamTaiKhoan([cham("hr", "CUA_SO_30", "2026-09-17T07:59:59.999Z")], "hr", phieu), false, "30 ngày + 1 ms: được");
  assert.equal(coChamTaiKhoan([cham("hr", "TAO", "2020-01-01T00:00:00.000Z")], "hr", phieu), true, "người tạo: chặn mãi");
  assert.equal(coChamTaiKhoan([cham("adm", "VINH_VIEN", GUI)], "hr", phieu), false, "người khác chạm: không chặn hr");
});

test("xetNguoiXacMinh: người khai, cấp bậc, chạm, Toàn quyền là chốt cuối có cờ", () => {
  assert.deepEqual(xetNguoiXacMinh({ nguoi: { ...chu }, phieu, chuPhieu: chu, cham: [] }), { duoc: false, lyDo: "nguoi_khai", coCham: false });
  assert.deepEqual(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: chu, cham: [] }), { duoc: true, lyDo: null, coCham: false });
  assert.equal(xetNguoiXacMinh({ nguoi: adm, phieu, chuPhieu: { ...chu, permissions: ["HR"] }, cham: [] }).lyDo, "cap_bac", "Quản trị không xác minh Nhân sự (canManageAccount)");
  assert.equal(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: { ...chu, permissions: ["ADMIN"] }, cham: [] }).lyDo, "cap_bac");
  assert.deepEqual(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: chu, cham: [cham("hr", "TAO", GUI)] }), { duoc: false, lyDo: "da_cham", coCham: true });
  assert.deepEqual(xetNguoiXacMinh({ nguoi: sup, phieu, chuPhieu: chu, cham: [cham("sup", "VINH_VIEN", GUI)] }), { duoc: true, lyDo: null, coCham: true });
  assert.equal(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: null, cham: [] }).lyDo, "khong_tai_khoan");
  assert.equal(xetNguoiXacMinh({ nguoi: hr, phieu, chuPhieu: { ...chu, partyId: "pty-khac" }, cham: [] }).lyDo, "khong_tai_khoan");
  assert.equal(xetNguoiXacMinh({ nguoi: sup, phieu, chuPhieu: null, cham: [] }).duoc, true, "R12: Toàn quyền xử lý được phiếu mất gắn");
});

test("Review Focus 4: Chuyển Toàn quyền khi không còn Quản trị / Nhân sự hợp lệ đang hoạt động", () => {
  assert.equal(chuyenToanQuyen(phieu, chu, [hr, adm, sup], [cham("hr", "TAO", GUI)]), false, "còn adm");
  assert.equal(chuyenToanQuyen(phieu, chu, [hr, adm, sup], [cham("hr", "TAO", GUI), cham("adm", "VINH_VIEN", GUI)]), true);
  assert.equal(chuyenToanQuyen(phieu, chu, [{ ...hr, active: false }, sup], []), true, "tài khoản ngưng không tính");
  assert.equal(chuyenToanQuyen(phieu, { ...chu, permissions: ["ADMIN"] }, [hr, adm, sup], []), true, "chủ phiếu thành Quản trị: hr cấp bậc chặn; adm khác cũng chặn");
  assert.equal(chuyenToanQuyen(phieu, chu, [{ ...adm, permissions: ["ADMIN", "SUPER_ADMIN"] }], []), true, "tài khoản giữ Toàn quyền không tính là Quản trị");
});

test("kiemTuChoi: chỉ mã thuộc danh sách đóng, không chữ tự do", () => {
  assert.deepEqual(kiemTuChoi({ lyDo: "KHONG_KHOP_GIAY_TO" }), { ok: true, value: { lyDo: "KHONG_KHOP_GIAY_TO" } });
  for (const b of [{ lyDo: "khác" }, { lyDo: "" }, {}, null, { lyDo: "KHONG_KHOP_GIAY_TO", ghiChu: "x" }]) assert.equal(kiemTuChoi(b as never).ok, false, JSON.stringify(b));
});

test("lyDoKhongChapNhan: hồ sơ đã gộp; giấy tờ chưa ảnh (R18)", () => {
  assert.equal(lyDoKhongChapNhan({ loai: "NGAY_SINH", daGop: true, coAnh: false })?.code, "ho_so_da_gop");
  assert.equal(lyDoKhongChapNhan({ loai: "GIAY_TO", daGop: false, coAnh: false })?.code, "can_anh_giay_to");
  assert.equal(lyDoKhongChapNhan({ loai: "DIA_CHI", daGop: false, coAnh: false }), null);
});
```

Cùng step: `src/shared/xac-minh-hien-thi.test.ts` — mọi mã lý do khớp khuôn `reason_code` của 0105 (`^[A-Z0-9_]{2,40}$`), nhãn tiếng Việt có dấu không rỗng, `nhanLyDoTuChoi("XYZ") === "Lý do khác"`, bốn khoá `NHAN_LY_DO_CHAN` khớp `LyDoChan`.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/modules/parties/xac-minh.test.ts src/shared/xac-minh-hien-thi.test.ts`
Expected: FAIL — không tìm thấy mô-đun.

- [ ] **Step 3: Viết luật thuần**

```ts
// Luật thuần XÁC MINH phiếu tự khai (ADR-0125 đ3, đ5, đ6; lát H-4 Gói 2) — module parties. Không I/O. Cùng kết luận với lính gác TRONG câu ghi
// (repository decide_self_submission) — bài xac-minh-lenh.test.ts "cùng bảng ca" đối chiếu. Luật này chỉ để trả lời đẹp; câu ghi mới là hàng rào.
import { canManageAccount } from "../../shared/roles.ts";
import type { PermissionCode } from "../../shared/permissions.ts";
import { laMaLyDoTuChoi, type MaLyDoTuChoi } from "../../shared/xac-minh-hien-thi.ts";
import type { Result } from "./rules.ts";

// Khai LẠI kiểu tầng tại chỗ (parties chỉ được import audit qua index.ts, mà index.ts của audit kéo router — tệp thuần chạy bằng node --test không nạp được).
// Ba giá trị khớp cột `loai` của view v_aud_cham_tai_khoan; bài migration (b) ghim ba chữ này.
export type LoaiCham = "TAO" | "VINH_VIEN" | "CUA_SO_30";
const NGAY_MS = 86_400_000;
export const moc30Ngay = (createdAtIso: string): string => new Date(Date.parse(createdAtIso) - 30 * NGAY_MS).toISOString();

export function coChamTaiKhoan(cham: readonly ChamTaiKhoan[], actorId: string, phieu: PhieuXet): boolean {
  const moc = moc30Ngay(phieu.createdAt);
  return cham.some((c) => c.actorId === actorId && c.accountId === phieu.createdBy && (c.loai !== "CUA_SO_30" || c.at >= moc));
}

export function xetNguoiXacMinh(v: { nguoi: TaiKhoanTom; phieu: PhieuXet; chuPhieu: TaiKhoanTom | null; cham: readonly ChamTaiKhoan[] }): KetLuanXet {
  if (v.nguoi.id === v.phieu.createdBy) return { duoc: false, lyDo: "nguoi_khai", coCham: false };
  const laToanQuyen = v.nguoi.permissions.includes("SUPER_ADMIN");
  const gan = v.chuPhieu !== null && v.chuPhieu.partyId === v.phieu.partyId;
  if (!gan && !laToanQuyen) return { duoc: false, lyDo: "khong_tai_khoan", coCham: false };
  if (gan && !canManageAccount(v.nguoi.permissions, v.chuPhieu!.permissions)) return { duoc: false, lyDo: "cap_bac", coCham: false };
  const coCham = coChamTaiKhoan(v.cham, v.nguoi.id, v.phieu);
  if (coCham && !laToanQuyen) return { duoc: false, lyDo: "da_cham", coCham };
  return { duoc: true, lyDo: null, coCham };
}

export function chuyenToanQuyen(phieu: PhieuXet, chuPhieu: TaiKhoanTom | null, ds: readonly TaiKhoanTom[], cham: readonly ChamTaiKhoan[]): boolean {
  return !ds.some((t) => t.active && !t.permissions.includes("SUPER_ADMIN") && (t.permissions.includes("ADMIN") || t.permissions.includes("HR"))
    && xetNguoiXacMinh({ nguoi: t, phieu, chuPhieu, cham }).duoc);
}

export function kiemTuChoi(body: Record<string, unknown> | null): Result<{ lyDo: MaLyDoTuChoi }> {
  if (!body || Object.keys(body).some((k) => k !== "lyDo") || !laMaLyDoTuChoi(body.lyDo)) return { ok: false, message: "Hãy chọn một lý do từ chối trong danh sách." };
  return { ok: true, value: { lyDo: body.lyDo } };
}

export const CHAP_NHAN_GIAY_TO_KHI_CHUA_CO_ANH = false;
export function lyDoKhongChapNhan(v: { loai: string; daGop: boolean; coAnh: boolean }): { code: string; message: string } | null {
  if (v.daGop) return { code: "ho_so_da_gop", message: "Hồ sơ này đã gộp vào hồ sơ khác — chỉ từ chối được (lý do «Hồ sơ đã gộp vào hồ sơ khác»)." };
  if (v.loai === "GIAY_TO" && !v.coAnh && !CHAP_NHAN_GIAY_TO_KHI_CHUA_CO_ANH) {
    return { code: "can_anh_giay_to", message: "Phiếu giấy tờ chưa có ảnh để đối chiếu — chưa chấp nhận được. Có thể từ chối với lý do phù hợp." };
  }
  return null;
}

export function loiLoChapNhan(e: unknown): { status: 409; code: string; message: string } | null {
  const m = e instanceof Error ? e.message : "";
  if (m.includes("person_document_cccd_other_person")) return { status: 409, code: "document_number_taken", message: "Số giấy tờ này đã thuộc một hồ sơ khác — không chấp nhận được. Hãy từ chối với lý do «Số giấy tờ đã thuộc hồ sơ khác» hoặc báo Toàn quyền." };
  if (m.includes("self_submission_decider_is_author")) return { status: 409, code: "verify_self", message: "Không xác minh phiếu của chính mình." };
  // Cùng một người bấm ở hai thẻ trong cùng mili-giây: lô sau thấy mình "thắng" (cùng decided_by, decided_at) và đụng dòng xác minh cùng mã ⇒ 409, không 500.
  if (m.includes("verification_no_replace")) return { status: 409, code: "submission_not_pending", message: "Phiếu đã được xử lý hoặc đã rút." };
  return null;
}
```

Kiểu `Result` lấy đúng dạng `{ ok: true; value } | { ok: false; message }` của `rules.ts` (đọc tệp; nếu khoá khác thì theo tệp). `xac-minh-hien-thi.ts` viết đúng khối ở Interfaces.

- [ ] **Step 4: Chạy lại, xác nhận xanh**

Run: `node --test src/modules/parties/xac-minh.test.ts src/shared/xac-minh-hien-thi.test.ts`
Expected: PASS.

- [ ] **Step 5: Bài mức câu lệnh (đỏ)** — `src/modules/parties/xac-minh-lenh.test.ts`. Dựng SQLite đủ migration (khuôn `src/migrations-xac-minh-ho-so.test.ts`) + bọc `D1Database` của khung thử (dùng lại cách `tests/audit/harness.mjs` bọc `node:sqlite` thành `prepare/bind/batch` — import helper đó nếu có, không tự viết lại). Các bài:

```ts
// (1) Lính gác TRONG câu ghi: hr từng TAO / VINH_VIEN / CUA_SO_30 trong cửa sổ ⇒ quyetPhieuStatement đổi 0 dòng; Toàn quyền (laToanQuyen) ⇒ 1 dòng.
// (2) Review Focus 1: hai lô chấp nhận NGAY_SINH của hr và adm chạy LẦN LƯỢT trên cùng DB (D1 tuần tự hoá lô) ⇒ lô sau: UPDATE 0 dòng và MỌI câu phụ thuộc 0 dòng;
//     đếm: pty_verification = 1 (id = mã phiếu), pty_person.birth_date = giá trị khai, audit self_submission_accepted = 1.
// (3) Cùng bảng ca: với 12 ca (người × lịch sử chạm × biên ±1 ms), mỗi ca một DB riêng: kết luận xetNguoiXacMinh(...).duoc === (meta.changes của quyetPhieuStatement === 1)
//     — trừ vế cấp bậc (không nằm trong câu ghi — R6) nên chỉ dựng ca cấp bậc hợp lệ.
// (4) Cờ chạm: Toàn quyền từng pin_reset ⇒ dòng pty_verification có verifier_touched_account = 1; không chạm ⇒ 0.
// (5) Review Focus 5: phiếu GIAY_TO CCCD có number_key trùng dòng của hồ sơ khác ⇒ db.batch ném lỗi chứa person_document_cccd_other_person;
//     loiLoChapNhan(e).code === "document_number_taken"; sau lô: phiếu vẫn CHO_XAC_MINH, 0 dòng pty_verification, 0 dòng giấy tờ mới.
// (6) Chấp nhận GIAY_TO khi đã có dòng hiện hành cùng loại ⇒ dòng mới previous_id = dòng hiện hành (R14); chưa có ⇒ previous_id NULL.
// (7) Chấp nhận DIA_CHI ⇒ một liên hệ ADDRESS mới, value = address_value của phiếu, chính = 1 khi chưa có ADDRESS mở, 0 khi đã có.
// (8) Từ chối ⇒ status TU_CHOI, reason_code đúng mã, KHÔNG dòng pty_verification.
// (9) Phiếu đã RUT ⇒ quyetPhieuStatement 0 dòng (Review Focus 3 ở mức câu).
// (10) Biên 30 ngày ở SQL: login_unlocked đúng moc30Ngay(created_at) ⇒ chặn; trước 1 ms ⇒ không chặn (chuỗi ISO thật, không datetime()).
```

Viết đủ thân từng bài; mỗi bài tự dựng hồ sơ / chính sách / đồng ý / phiếu bằng helper chép từ `src/migrations-ho-so-tu-khai.test.ts`, chèn nhật ký bằng `INSERT INTO audit_log` thẳng (bài mức câu lệnh được phép — module audit không có trong lô).

- [ ] **Step 6: Chạy, xác nhận đỏ**

Run: `node --test src/modules/parties/xac-minh-lenh.test.ts`
Expected: FAIL — `quyetPhieuStatement` chưa có.

- [ ] **Step 7: Viết câu lệnh** — `src/modules/parties/repository.ts`, cạnh khối phiếu tự khai của H-3:

```ts
// ---- Xác minh phiếu tự khai (ADR-0125; lát H-4 Gói 2) -------------------------------------------------------------------------------------------------
// LÍNH GÁC TÁCH NHIỆM VỤ nằm TRONG câu quyết (ADR-0125 đ5; Hiến chương 5.23 bảng thi hành). ?3 = người xác minh, ?4 = 1 nếu người đó giữ Toàn quyền (chốt cuối,
// chỉ bỏ vế b, c — vế a luôn áp + trigger 0107). View v_aud_cham_tai_khoan do module audit công bố (parties không đọc audit_log). Biên 30 ngày: strftime %f (R21).
const CHAM_CUA_NGUOI = (actor: string, alias: string) =>
  `EXISTS (SELECT 1 FROM v_aud_cham_tai_khoan c WHERE c.account_id = ${alias}.created_by AND c.actor_id = ${actor}
     AND (c.loai IN ('TAO', 'VINH_VIEN') OR (c.loai = 'CUA_SO_30' AND c.at >= strftime('%Y-%m-%dT%H:%M:%fZ', ${alias}.created_at, '-30 days'))))`;
const DECIDE = defineSql(
  "parties",
  "decide_self_submission",
  `UPDATE pty_self_submission SET status = ?2, reason_code = ?5, decided_at = ?6, decided_by = ?3, updated_at = ?6, updated_by = ?3
   WHERE id IN (SELECT s.id FROM pty_self_submission s WHERE s.id = ?1 AND s.status = 'CHO_XAC_MINH' AND s.created_by <> ?3
                  AND (?4 = 1 OR NOT ${CHAM_CUA_NGUOI("?3", "s")}))`,
);
export const quyetPhieuStatement = (db: D1Database, v: { id: string; ketLuan: "DA_CHAP_NHAN" | "TU_CHOI"; lyDo: string | null; actorId: string; at: string; laToanQuyen: boolean }): D1PreparedStatement =>
  db.prepare(DECIDE).bind(v.id, v.ketLuan, v.actorId, v.laToanQuyen ? 1 : 0, v.ketLuan === "TU_CHOI" ? v.lyDo : null, v.at);

// Điều kiện THẮNG cho mọi câu phụ thuộc trong cùng lô (parties không có wonGuard — module nghiêm): chính dòng phiếu đã mang người + lúc của lô này.
const DA_THANG = `EXISTS (SELECT 1 FROM pty_self_submission w WHERE w.id = ?1 AND w.status = 'DA_CHAP_NHAN' AND w.decided_by = ?2 AND w.decided_at = ?3)`;
const ACCEPT_BIRTH = defineSql("parties", "accept_self_submission_birth_date",
  `UPDATE pty_person SET birth_date = (SELECT s.birth_date FROM pty_self_submission s WHERE s.id = ?1), updated_at = ?3, updated_by = ?2
   WHERE party_id = (SELECT s.party_id FROM pty_self_submission s WHERE s.id = ?1) AND ${DA_THANG}`);
const ACCEPT_ADDRESS = defineSql("parties", "accept_self_submission_address",
  `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, created_by, updated_at, updated_by)
   SELECT ?4, s.party_id, 'ADDRESS', s.address_value, ?5, NULL,
          CASE WHEN EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = s.party_id AND c.contact_kind_code = 'ADDRESS' AND c.valid_to_date IS NULL) THEN 0 ELSE 1 END,
          ?6, ?3, ?2, ?3, ?2
   FROM pty_self_submission s WHERE s.id = ?1 AND ${DA_THANG}`);
const ACCEPT_DOCUMENT = defineSql("parties", "accept_self_submission_document",
  `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
     previous_id, created_at, created_by, updated_at, updated_by)
   SELECT ?4, s.party_id, s.document_type_code, s.document_number, s.number_key, s.license_class_code, s.issued_date, s.issued_place, s.expiry_date,
          ?5, ?3, ?2, ?3, ?2
   FROM pty_self_submission s WHERE s.id = ?1 AND ${DA_THANG}`);
const ACCEPT_TOUCH_PARTY = defineSql("parties", "accept_self_submission_touch_party",
  `UPDATE pty_party SET updated_at = ?3, updated_by = ?2 WHERE id = (SELECT s.party_id FROM pty_self_submission s WHERE s.id = ?1) AND ${DA_THANG}`);
const ACCEPT_VERIFICATION = defineSql("parties", "accept_self_submission_verification",
  `INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
   SELECT s.id, s.party_id, ?4, ?5, ?6, 'DA_XAC_MINH', NULL, CASE WHEN ${CHAM_CUA_NGUOI("?2", "s")} THEN 1 ELSE 0 END, ?3, ?2, ?3, ?2
   FROM pty_self_submission s WHERE s.id = ?1 AND ${DA_THANG}`);
```

Hàm `ghi…TuPhieuStatement` bind theo đúng số tham số trên (`?1` mã phiếu, `?2` người xác minh, `?3` lúc; `?4…` riêng từng câu: mã dòng mới, `value_normalized` tính bằng luật chuẩn hoá liên hệ hiện có của `rules.ts`, ngày VN `vnToday`, `previous_id`, đích xác minh `('ATTRIBUTE', NULL, 'NGAY_SINH')` / `('CONTACT', <mã liên hệ mới>, NULL)` / `('PERSON_DOCUMENT', <mã giấy tờ mới>, NULL)`). Kiểm cột thật của `pty_contact_point` (`valid_to_date`?) và `pty_person`, `pty_party` trước khi chép — câu trên viết theo `INSERT_CONTACT`, `UPDATE_PERSON` hiện có; tên cột sai thì `defineSql` EXPLAIN của `architecture.test.ts` đỏ. Các câu đọc (`list_pending_self_submissions`, `list_decided_self_submissions`, `find_self_submission_for_verify`, `find_pending_self_submission_number`, `list_account_touches`, `self_submission_number_elsewhere`) viết theo Interfaces; `find_self_submission_for_verify` và hai câu danh sách KHÔNG chọn `document_number`.

- [ ] **Step 8: Mở rộng rào 5.23 (có tên)** — `src/tu-khai-khong-len-nhan.test.ts`: thêm đúng tên câu mới vào `CAU_GHIM`, đúng tên hàm mới vào `HAM`; chú thích đầu tệp thêm câu "ADR-0125 đ1 (lát H-4): năm route /api/parties/xac-minh… được đọc phiếu ĐANG CHỜ để xác minh — liệt kê từng route ở bài (3)". (Danh sách route của bài (3) mở ở Task 3, 4 khi route có thật.)

- [ ] **Step 9: Chạy bộ kiểm của task**

Run: `node --test src/modules/parties/xac-minh.test.ts src/shared/xac-minh-hien-thi.test.ts src/modules/parties/xac-minh-lenh.test.ts src/tu-khai-khong-len-nhan.test.ts src/architecture.test.ts`, rồi `npm run typecheck`, rồi `npm test`.
Expected: PASS.

**Tiêu chí nghiệm thu Task 2:** (1) bỏ `NOT ${CHAM_CUA_NGUOI…}` khỏi `DECIDE` ⇒ bài (1), (3) đỏ; (2) bỏ `DA_THANG` khỏi một câu phụ thuộc ⇒ bài (2) đỏ (dòng mồ côi); (3) đổi `'-30 days'` thành `'-29 days'` ⇒ bài (10) và (3) đỏ; (4) cùng bảng ca 12/12 khớp; (5) không câu đọc nào chọn `document_number` ngoài `find_pending_self_submission_number`.

- [ ] **Step 10: Commit**

```bash
git add src/modules/parties/xac-minh.ts src/modules/parties/xac-minh.test.ts src/shared/xac-minh-hien-thi.ts src/shared/xac-minh-hien-thi.test.ts src/modules/parties/repository.ts src/modules/parties/xac-minh-lenh.test.ts src/tu-khai-khong-len-nhan.test.ts
git commit -m "Xác minh hồ sơ: luật tách nhiệm vụ, câu quyết có lính gác trong câu ghi, câu chép nguyên văn giá trị khai (ADR-0125)"
```

---

### Task 3: Hai ô quyền + hàm tiêm tài khoản + hàng chờ / chi tiết / xem đủ số (VIỆC LỚN — quyền, dữ liệu)

**Files:**
- Modify: `src/shared/permissions.ts` (hai ô + hai hàm dòng chung), `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts` (ghim dòng PARTNER), các bài ghim nguyên dòng khác đỏ theo, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.ts` (sinh lại theo cách H-3 Task 3)
- Modify: `src/shared/router.ts` (`TaiKhoanXacMinh`, `Ctx.taiKhoanXacMinh`, `AppOptions.injected.taiKhoanXacMinh`), `src/index.ts`, `src/modules/staff/index.ts`, `src/modules/staff/repository.ts`
- Modify: `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts` (ba hành động: `self_submission_accepted`, `self_submission_rejected`, `self_submission_number_viewed`)
- Modify: `src/modules/parties/index.ts` (ba route đọc), `src/shared/contracts.ts` (DTO)
- Create: `src/modules/parties/xac-minh-route.test.ts`
- Modify: `src/route-access.test.ts`, `src/route-write-guard.test.ts` (bài 4b), `src/tu-khai-khong-len-nhan.test.ts` (bài (3)), `src/giay-to-khong-lo-so.test.ts`, `src/shared/lan-gui-bi-mat.ts` (+ bài T16 nếu ghim danh sách)

**Interfaces:**
- Consumes: mọi thứ Task 1, 2 Produces.
- Produces:

```ts
// src/shared/router.ts
export interface TaiKhoanXacMinh { id: string; permissions: readonly PermissionCode[]; active: boolean; partyId: string | null }
// Ctx: /** ADR-0125 đ3, đ5 — mọi tài khoản (id, quyền hiện tại, đang hoạt động, hồ sơ). Gốc lắp ráp tiêm (parties không import staff). MỘT truy vấn D1. Chưa đăng nhập → []. */
taiKhoanXacMinh: () => Promise<TaiKhoanXacMinh[]>;
// AppOptions.injected: /** BẮT BUỘC trong mã chạy thật (src/index.ts: taiKhoanChoXacMinh của staff). */
taiKhoanXacMinh: (env: Env) => Promise<TaiKhoanXacMinh[]>;
// src/modules/staff/index.ts — HÀM CÔNG BỐ
export async function taiKhoanChoXacMinh(db: D1Database): Promise<TaiKhoanXacMinh[]>;
// src/shared/contracts.ts
export interface PhieuChoXacMinhDto { id: string; loai: string; tenHoSo: string; guiLuc: string; chuyenToanQuyen: boolean; xacMinhDuoc: boolean; lyDoKhong: string | null }
export interface PhieuDaXuLyDto { id: string; loai: string; ketLuan: "DA_CHAP_NHAN" | "TU_CHOI"; lyDo: string | null; nguoiXuLy: string; luc: string; coChamTaiKhoan: boolean }
export interface PhieuXacMinhChiTietDto {
  id: string; loai: string; tenHoSo: string; guiLuc: string; daGop: boolean;
  ngaySinh: string | null; diaChi: string | null;
  giayTo: { tenLoai: string; soChe: string | null; hang: string | null; ngayCap: string | null; noiCap: string | null; hetHan: string | null; coDongHienHanhCungLoai: boolean; trungHoSoKhac: boolean } | null;
  xacMinhDuoc: boolean; lyDoKhong: string | null; coAnh: boolean;
}
```

Route (cổng `accounts`, khai TRƯỚC mọi `/api/parties/:id…`):
- `GET /api/parties/xac-minh?trang=cho|da-xu-ly` — `if (!can(staff, "party.verify")) return …` → `{ phieu: PhieuChoXacMinhDto[] }` hoặc `{ phieu: PhieuDaXuLyDto[] }`.
- `GET /api/parties/xac-minh/:pid` — `party.verify`; không có → 404; không đang chờ → 403 `submission_processed`; ngoài cấp bậc (không Toàn quyền) → 404 (không lộ có phiếu) → `PhieuXacMinhChiTietDto`, `Cache-Control: no-store`.
- `POST /api/parties/xac-minh/:pid/xem-so` — `party.verify.attachment`; phiếu đang chờ, có số, `xetNguoiXacMinh(...).duoc` (R7) → `db.batch([auditStatement(self_submission_number_viewed, detail "phiếu <id> · <tên loại giấy tờ>")])` RỒI mới trả `{ so }`, `Cache-Control: no-store`; nằm trong `BI_MAT`.

- [ ] **Step 1: Bài ô quyền (đỏ)** — `src/shared/permissions.test.ts`:

```ts
test("ADR-0125 đ1, đ2: party.verify / party.verify.attachment — ADMIN, HR, SUPER_ADMIN any; mọi cột khác none; HR vẫn không Danh bạ, không dữ liệu cá nhân", () => {
  for (const op of ["party.verify", "party.verify.attachment"] as const) {
    assert.deepEqual(MATRIX[op], { SALES: "none", ACCOUNTING: "none", ADMIN: "any", FIELD: "none", PARTNER: "none", SUPER_ADMIN: "any", INTERN: "none", DRIVER: "none", DRIVER_PARTNER: "none", HR: "any" });
  }
  assert.equal(MATRIX["party.view"].HR, "none");
  assert.equal(MATRIX["party.personal.view"].HR, "none");
  assert.equal(MATRIX["party.document.reveal"].ADMIN, "none");
  assert.equal(MATRIX["party.document.reveal"].HR, "none");
});

test("ADR-0125: HR đúng năm ô `any` ngoài hai ô của mọi tài khoản nội bộ", () => {
  const MOI_TAI_KHOAN = new Set(["feedback.submit", "assistant.ask"]);
  const hrAny = Object.entries(MATRIX).filter(([, r]) => r.HR === "any").map(([k]) => k).filter((k) => !MOI_TAI_KHOAN.has(k)).sort();
  assert.deepEqual(hrAny, ["account.create", "account.edit", "account.view", "party.verify", "party.verify.attachment"]);
});
```

Cùng step: thêm hai ô vào bài ghim nguyên dòng HR (`"party.verify": "any", "party.verify.attachment": "any", // ADR-0125 đ1`), bài ghim dòng PARTNER (`none`), bài 1024 tập con quyền cho hai ô (khuôn bài "ADR-0124 đ4 (lát H-3)"), bảng từng ô / ảnh chụp bảng quyền. Không thêm vào `ADMIN_NONE_OPS` (Quản trị `any`).

- [ ] **Step 2: Bài route (đỏ)** — `src/modules/parties/xac-minh-route.test.ts` (khung thử `world()` + `seedStaff`, khuôn `tu-khai-route.test.ts`; chèn nhật ký chạm bằng `INSERT INTO audit_log` thẳng vào `w.sqlite`):

```ts
// Ca bắt buộc (mỗi ca một test):
// (r1) Bán hàng, Kế toán, Đối tác, Tài xế đối tác: GET /api/parties/xac-minh → 403 (cổng accounts); HR, ADMIN, SUPER → 200.
// (r2) HR: GET /api/parties → 403 (vẫn không vào Danh bạ — ADR-0125 đ2); GET /api/parties/:id của chủ phiếu → 403.
// (r3) Hàng chờ HR: thấy phiếu của Đối tác; KHÔNG thấy phiếu của Quản trị / Nhân sự khác (cấp bậc); phiếu hr từng tạo tài khoản → xacMinhDuoc=false, lyDoKhong = NHAN_LY_DO_CHAN.da_cham.
// (r3b) R23 chống đói hàng chờ: 50 phiếu CŨ của tài khoản do hr tạo + 1 phiếu MỚI hr xác minh được ⇒ phiếu xác minh được nằm trong 50 dòng trả về, ở ĐẦU danh sách.
// (r4) Review Focus 4: chủ phiếu đổi quyền thành ADMIN sau khi gửi ⇒ với mọi người xem chuyenToanQuyen = true; Toàn quyền thấy phiếu, xacMinhDuoc = true.
// (r5) DTO hàng chờ / chi tiết: tập khoá ĐÚNG như contracts; không khoá nào chứa số đủ; giayTo.soChe = cheSo(number_key); không có SĐT, email, vai.
// (r6) Chi tiết phiếu đã RUT / đã xử lý → 403 submission_processed; phiếu không tồn tại → 404; phiếu ngoài cấp bậc → 404.
// (r7) Xem đủ số: HR hợp lệ → 200 { so } và ĐÚNG MỘT dòng audit self_submission_number_viewed có detail không chứa số / number_key; dòng nhật ký có created_at ≤ lúc trả lời.
//      Người bị tách nhiệm vụ chặn → 409 verify_conflict, 0 dòng nhật ký. Phiếu đã xử lý → 403, 0 dòng nhật ký. Phiếu không có số (NGAY_SINH) → 404.
// (r8) "Nhật ký trước": làm hỏng câu audit (ghiDe không được — dùng cách bài reveal hiện có ở giay-to-route.test.ts) ⇒ route 500 và KHÔNG trả số.
// (r9) Phản hồi chi tiết và xem số có Cache-Control: no-store.
```

Viết đủ thân từng ca theo khuôn `tu-khai-route.test.ts` (setup, `w.call(...)`, đếm dòng bằng `w.sqlite.prepare(...)`). Ca (r8) dựng theo đúng cách bài "xem đủ số ghi nhật ký trước" của `src/modules/parties/giay-to-route.test.ts` đang làm cho `POST …/documents/:did/reveal`.

- [ ] **Step 3: Chạy, xác nhận đỏ**

Run: `node --test src/shared/permissions.test.ts src/modules/parties/xac-minh-route.test.ts`
Expected: FAIL — ô chưa có; route 404.

- [ ] **Step 4: Viết ô quyền + hai hàm dòng chung** — `src/shared/permissions.ts`, cạnh `chiToanQuyen`/`tuPhucVu`:

```ts
/** Hàng "Quản trị + Toàn quyền": ADMIN, SUPER_ADMIN `any`, mọi cột khác `none`. Hàm dùng chung để gói giao diện gọn (trần gói Đơn hàng — src/goi-trang-nhe.test.ts,
 * KHÔNG nới; kế hoạch H-4 R11). Giá trị y như viết tay; bài ghim từng ô ở permissions.test.ts canh. */
const quanTri = (): Row => row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none");
/** Hàng "Quản trị + Toàn quyền + Nhân sự" (ba cột của cổng accounts): như trên, thêm HR `any`. */
const quanTriNhanSu = (): Row => row("none", "none", "any", "none", "none", "any", "none", "none", "none", "any");
```

Thay MỌI `row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none")` bằng `quanTri()` (10 chỗ) và MỌI `row("none", "none", "any", "none", "none", "any", "none", "none", "none", "any")` bằng `quanTriNhanSu()` (`account.view`, `account.edit`), rồi thêm sau `"party.privacy.policy"`:

```ts
  // ADR-0125 đ1 (accepted 2026-10-16; lát H-4 Gói 2): HÀNG CHỜ XÁC MINH — xem trường khai của phiếu ĐANG CHỜ (số che), chấp nhận nguyên văn / từ chối theo danh sách đóng.
  // Cột ADMIN, HR, SUPER_ADMIN (đảo ADR-0083 đ2, thay ADR-0071 đ1e chỉ trong phạm vi phiếu đang chờ — HR vẫn party.view = none). Còn hỏi cấp bậc canManageAccount
  // và tách nhiệm vụ (đ5 — lính gác trong câu ghi). Route: GET /api/parties/xac-minh*, POST …/:pid/chap-nhan, POST …/:pid/tu-choi (cổng accounts).
  "party.verify": quanTriNhanSu(),
  // ADR-0125 đ1: XEM ĐỦ SỐ (và ảnh — lát mở loại nối SELF_SUBMISSION) CHỈ của phiếu ĐANG CHỜ; nhật ký ghi TRƯỚC, không chứa số. Route: POST /api/parties/xac-minh/:pid/xem-so.
  "party.verify.attachment": quanTriNhanSu(),
```

- [ ] **Step 5: Đo trần gói ngay**

Run: `node --test src/goi-trang-nhe.test.ts`
Expected: PASS; ghi số byte vào báo cáo (dự kiến ≈ 96 000). Nếu đỏ: KHÔNG nới trần — dừng, báo điều phối kèm số đo và danh sách tệp `src/shared` trong gói (metafile `inputs`).

- [ ] **Step 6: Hàm tiêm** — `src/modules/staff/repository.ts`: `defineSql("staff", "tai_khoan_cho_xac_minh", "SELECT s.id, s.active, s.party_id, (SELECT json_group_array(p.permission_code) FROM stf_permission p WHERE p.staff_id = s.id …hiệu lực theo đúng điều kiện câu đọc quyền hiện có…) AS perms FROM staff s")` (chép điều kiện "quyền đang hiệu lực" từ câu đọc quyền hiện có của `staff/repository.ts`, không tự nghĩ); `src/modules/staff/index.ts` công bố `taiKhoanChoXacMinh`; `src/index.ts` thêm `taiKhoanXacMinh: (env) => taiKhoanChoXacMinh(env.DB),` vào `injected`; `src/shared/router.ts` thêm kiểu + đưa vào `ctx` (chưa đăng nhập → `[]`, không truy vấn). Kiểm `src/passkey-off.test.ts` và mọi nơi dựng `AppOptions` bằng tay (grep `isAssigned: async`) — thêm `taiKhoanXacMinh: async () => []` cho khớp kiểu.

- [ ] **Step 7: Ba route đọc** — `src/modules/parties/index.ts`, khai TRƯỚC `GET /api/parties/:id`. Khung thân route chi tiết (hai route còn lại cùng khuôn):

```ts
route("GET", "/api/parties/xac-minh/:pid", "accounts", async ({ env, staff, params, taiKhoanXacMinh }) => {
  if (!can(staff, "party.verify")) return error(403, "forbidden", "Bạn không có quyền xác minh hồ sơ.");
  const p = await timPhieuChoXet(env.DB, params.pid!);
  if (!p) return error(404, "not_found", "Không tìm thấy phiếu.");
  const ds = await taiKhoanXacMinh();
  const chuPhieu = ds.find((t) => t.id === p.created_by) ?? null;
  const nguoi = ds.find((t) => t.id === staff.id) ?? { id: staff.id, permissions: staff.permissions, active: true, partyId: staff.partyId ?? null };
  const phieuXet = { id: p.id, partyId: p.party_id, createdBy: p.created_by, createdAt: p.created_at };
  const kl = xetNguoiXacMinh({ nguoi, phieu: phieuXet, chuPhieu, cham: await chamCuaTaiKhoan(env.DB, [p.created_by]) });
  if (kl.lyDo === "cap_bac") return error(404, "not_found", "Không tìm thấy phiếu.");
  if (p.status !== "CHO_XAC_MINH") return error(403, "submission_processed", "Phiếu đã được xử lý hoặc đã rút — không xem lại được.");
  // … dựng PhieuXacMinhChiTietDto theo danh sách cho phép (cheSo(p.number_key), trungSoHoSoKhac, coDongHienHanhCungLoai, coAnh = false — R4) …
  return json(dto, { headers: { "Cache-Control": "no-store" } });
}),
```

Kiểm chữ ký thật của `json()` (`src/shared/http.ts`) và tên khoá `ctx` cho hàm tiêm; nếu `json` không nhận tham số thứ hai thì làm theo cách route `…/documents/:did/reveal` hiện đặt `no-store`. Câu 403 / 404 lấy từ hằng cục bộ đầu khối (khuôn `FORBIDDEN_WRITE()`). Hàng chờ: `listPhieuCho` (mọi phiếu chờ, trần 5 000) → lọc cấp bậc (trừ Toàn quyền) → một lần `chamCuaTaiKhoan` cho mọi `created_by` → `xetNguoiXacMinh` + `chuyenToanQuyen` từng dòng → sắp xác minh được trước, cũ trước → cắt 50 → DTO (R23). Đã xử lý: `listPhieuDaXuLy` → nhãn người xử lý qua `ctx.nhanNhanVien` (đã có) → DTO (lọc cấp bậc như trên; `coChamTaiKhoan` = cột `verifier_touched_account` = 1).

- [ ] **Step 8: Hàng rào đi kèm**
  - `src/route-access.test.ts`: ba dòng mới `access: "accounts"` kèm chú thích ADR-0125.
  - `src/route-write-guard.test.ts` bài (4b): thêm `"GET /api/parties/xac-minh"`, `"GET /api/parties/xac-minh/:pid"`, `"POST /api/parties/xac-minh/:pid/xem-so"` vào `known`; thêm `"party.verify"`, `"party.verify.attachment"` vào `ACCOUNTS_OPS` (chú thích: "ADR-0125 đ1 — ô xác minh mở ở cổng accounts; nới có tên, kế hoạch H-4 sự thật 8"). Ca phản chứng của bài giữ nguyên.
  - `src/tu-khai-khong-len-nhan.test.ts` bài (3): thêm ĐÚNG ba route trên vào danh sách route được gọi hàm phiếu.
  - `src/giay-to-khong-lo-so.test.ts`: mở rộng bộ lọc route với `^\/api\/parties\/xac-minh` (KHÔNG bắt route khác), thêm ca: chi tiết không chứa số, nhật ký xem số không chứa số; route xem số là route trả số DUY NHẤT của nhóm này.
  - `src/shared/lan-gui-bi-mat.ts`: thêm `"/api/parties/xac-minh/:pid/xem-so", // ADR-0125 (lát H-4): phản hồi có số đủ của phiếu đang chờ`; cập nhật bài T16 nếu nó ghim danh sách.
  - `src/shared/audit-actions.ts`: `self_submission_accepted: { label: "Chấp nhận phiếu tự khai hồ sơ", group: "party" }`, `self_submission_rejected: { label: "Từ chối phiếu tự khai hồ sơ", group: "party" }`, `self_submission_number_viewed: { label: "Xem đủ số giấy tờ của phiếu tự khai", group: "party" }`; xếp vào `lich-su-doi-tac.ts` cùng chỗ `self_submission_created`.

- [ ] **Step 9: Chạy bộ kiểm của task**

Run: `node --test src/shared/permissions.test.ts src/modules/parties/xac-minh-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts src/tu-khai-khong-len-nhan.test.ts src/giay-to-khong-lo-so.test.ts src/goi-trang-nhe.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/architecture.test.ts`, rồi `npm run typecheck`, rồi `npm test`.
Expected: PASS. (`permission-enforcement` xanh vì hai ô đều có route hỏi: `party.verify` ở hai GET, `party.verify.attachment` ở xem số.)

**Tiêu chí nghiệm thu Task 3:** (1) đổi cột HR của `party.verify` thành `none` ⇒ bài "năm ô" + ghim dòng HR + 1024 đỏ; (2) HR vẫn 403 ở Danh bạ; (3) DTO không có số đủ, SĐT, email; (4) xem số: nhật ký trước, không số trong nhật ký, `no-store`, trong `BI_MAT`; (5) gói Đơn hàng ≤ 96 600 (số đo ghi báo cáo); (6) phiếu đã xử lý → 403.

- [ ] **Step 10: Commit**

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc-ten.ts src/shared/tro-ly-cau-truc.ts src/shared/router.ts src/index.ts src/modules/staff/ src/shared/audit-actions.ts src/shared/lich-su-doi-tac.ts src/modules/parties/index.ts src/shared/contracts.ts src/modules/parties/xac-minh-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/tu-khai-khong-len-nhan.test.ts src/giay-to-khong-lo-so.test.ts src/shared/lan-gui-bi-mat.ts
git commit -m "Xác minh hồ sơ: hai ô quyền cho Quản trị và Nhân sự, hàng chờ, chi tiết phiếu, xem đủ số ghi nhật ký trước (ADR-0125)"
```

---

### Task 4: Chấp nhận / từ chối + đánh dấu cần xác minh lại (VIỆC LỚN — quyền, dữ liệu)

**Files:**
- Modify: `src/modules/parties/index.ts` (hai route ghi; khối `PUT /api/parties/:id` và `POST /api/parties/:id/documents/:did/correct`)
- Modify: `src/modules/parties/repository.ts` (`updatePartyStatements` nhận cờ; câu `CAN_XAC_MINH_LAI`)
- Modify: `src/modules/parties/xac-minh-route.test.ts` (thêm ca), `src/modules/parties/giay-to-route.test.ts` (ca sửa sai), bài PUT hiện có của ngày sinh (tệp chứa "Review Focus 1" của H-1 — `grep -ln "birthDate" src/modules/parties/*.test.ts`)
- Modify: `src/route-access.test.ts`, `src/route-write-guard.test.ts` (4b), `src/tu-khai-khong-len-nhan.test.ts` (3)

**Interfaces:**
- Consumes: Task 2 câu lệnh + luật; Task 3 route đọc, hàm tiêm.
- Produces:
  - `POST /api/parties/xac-minh/:pid/chap-nhan` (thân `{}`) → 200 `{ ok: true }` | 403 / 404 / 409 (`verify_self`, `verify_conflict`, `submission_not_pending`, `ho_so_da_gop`, `can_anh_giay_to`, `document_number_taken`).
  - `POST /api/parties/xac-minh/:pid/tu-choi` (thân `{ lyDo: MaLyDoTuChoi }`) → 200 `{ ok: true }` | 400 `invalid_input` | 403 / 404 / 409 (`verify_self`, `verify_conflict`, `submission_not_pending`).
  - `canXacMinhLaiStatement(db, v: { partyId: string; targetKind: "ATTRIBUTE" | "PERSON_DOCUMENT"; targetId: string | null; attributeCode: string | null; expectedUpdatedAt: string; actorId: string; at: string }): D1PreparedStatement` — hai khoá `mark_reverify_attribute` (điều kiện `(SELECT updated_at FROM pty_party WHERE id = ?partyId) = ?expected`) và `mark_reverify_document` (điều kiện `(SELECT updated_at FROM pty_person_document WHERE id = ?targetId AND party_id = ?partyId) = ?expected`), cùng thêm `AND (SELECT outcome FROM pty_verification WHERE party_id = … AND target_kind = … AND <đích> ORDER BY created_at DESC, rowid DESC LIMIT 1) = 'DA_XAC_MINH'`; `outcome = 'CAN_XAC_MINH_LAI'`, `created_by` = người sửa, `id` mới. Đặt TRƯỚC câu đổi mốc (Step 4).

- [ ] **Step 1: Bài route (đỏ)** — thêm vào `src/modules/parties/xac-minh-route.test.ts`:

```ts
// (w1) HR chấp nhận NGAY_SINH ⇒ 200; pty_person.birth_date = giá trị khai; phiếu DA_CHAP_NHAN, decided_by = HR; pty_verification id = phiếu, DA_XAC_MINH, cờ 0;
//      audit self_submission_accepted detail "phiếu <id> · Ngày sinh" (không ngày sinh); GET chi tiết sau đó → 403 submission_processed.
// (w2) ADMIN từ chối DIA_CHI với KHONG_KHOP_GIAY_TO ⇒ 200; status TU_CHOI, reason_code đúng; 0 dòng pty_verification; 0 liên hệ mới; audit detail có mã lý do, không địa chỉ.
// (w3) Từ chối với lyDo ngoài danh sách / có khoá ghiChu ⇒ 400, không ghi.
// (w4) Người khai tự chấp nhận (tài khoản lai ADMIN + PARTNER tự khai rồi tự bấm) ⇒ 409 verify_self, không ghi.
// (w5) HR đã TẠO tài khoản chủ phiếu (audit staff_created) ⇒ chấp nhận 409 verify_conflict; từ chối cũng 409 (R13); 0 dòng ghi.
// (w6) ADMIN đặt lại PIN cho chủ phiếu 400 ngày trước lúc gửi ⇒ 409; ADMIN mở khoá đăng nhập 31 ngày trước ⇒ 200.
// (w7) Toàn quyền từng đặt lại PIN ⇒ 200, pty_verification.verifier_touched_account = 1; hàng chờ đã xử lý hiện coChamTaiKhoan = true; audit detail có "cờ chạm tài khoản".
// (w8) Review Focus 1: chấp nhận lần hai (người khác) ⇒ 409 submission_not_pending; vẫn đúng 1 dòng pty_verification.
// (w9) Review Focus 3: người dùng rút phiếu rồi người xác minh bấm chấp nhận / từ chối / xem số ⇒ 409 / 409 / 403; 0 dòng ghi.
// (w10) R18: chấp nhận GIAY_TO ⇒ 409 can_anh_giay_to; từ chối GIAY_TO với TRUNG_HO_SO_KHAC ⇒ 200.
// (w11) R20: phiếu của hồ sơ đã gộp (dựng bằng cách đặt merged_into_id thẳng trong DB thử) ⇒ chấp nhận 409 ho_so_da_gop; từ chối với HO_SO_DA_GOP ⇒ 200.
// (w12) Chủ phiếu ngoài cấp bậc (chủ phiếu là HR khác, người bấm là HR) ⇒ 404 (không lộ phiếu).
// (w13) R16: sau (w1), ADMIN đổi ngày sinh qua PUT /api/parties/:id ⇒ thêm đúng 1 dòng pty_verification CAN_XAC_MINH_LAI (ATTRIBUTE NGAY_SINH) cùng lô;
//       PUT không đổi ngày sinh ⇒ không thêm; PUT khi chưa từng xác minh ⇒ không thêm.
```

Cùng step, `giay-to-route.test.ts`: sửa sai dòng giấy tờ đã có `DA_XAC_MINH` (chèn thẳng dòng `pty_verification` trong DB thử) ⇒ thêm đúng 1 dòng `CAN_XAC_MINH_LAI` PERSON_DOCUMENT; dòng chưa xác minh ⇒ không thêm.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/modules/parties/xac-minh-route.test.ts src/modules/parties/giay-to-route.test.ts`
Expected: FAIL — route 404; không dòng `CAN_XAC_MINH_LAI`.

- [ ] **Step 3: Viết route chấp nhận** (từ chối cùng khuôn, chỉ có `UPDATE` + nhật ký):

```ts
route("POST", "/api/parties/xac-minh/:pid/chap-nhan", "accounts", async ({ env, staff, params, taiKhoanXacMinh }) => {
  if (!can(staff, "party.verify")) return error(403, "forbidden", "Bạn không có quyền xác minh hồ sơ.");
  const p = await timPhieuChoXet(env.DB, params.pid!);
  if (!p) return error(404, "not_found", "Không tìm thấy phiếu.");
  const ds = await taiKhoanXacMinh();
  const nguoi = ds.find((t) => t.id === staff.id) ?? { id: staff.id, permissions: staff.permissions, active: true, partyId: staff.partyId ?? null };
  const phieuXet = { id: p.id, partyId: p.party_id, createdBy: p.created_by, createdAt: p.created_at };
  const kl = xetNguoiXacMinh({ nguoi, phieu: phieuXet, chuPhieu: ds.find((t) => t.id === p.created_by) ?? null, cham: await chamCuaTaiKhoan(env.DB, [p.created_by]) });
  if (kl.lyDo === "cap_bac") return error(404, "not_found", "Không tìm thấy phiếu.");
  if (p.status !== "CHO_XAC_MINH") return error(409, "submission_not_pending", "Phiếu đã được xử lý hoặc đã rút.");
  if (kl.lyDo === "nguoi_khai") return error(409, "verify_self", "Không xác minh phiếu của chính mình.");
  if (!kl.duoc) return error(409, "verify_conflict", NHAN_LY_DO_CHAN[kl.lyDo!]!);
  const chan = lyDoKhongChapNhan({ loai: p.subject_kind, daGop: p.merged === 1, coAnh: false });
  if (chan) return error(409, chan.code, chan.message);
  const at = new Date().toISOString();
  const laToanQuyen = staff.permissions.includes("SUPER_ADMIN");
  const lo = [quyetPhieuStatement(env.DB, { id: p.id, ketLuan: "DA_CHAP_NHAN", lyDo: null, actorId: staff.id, at, laToanQuyen }), ...cauGhiGiaTri(env.DB, p, staff.id, at)];
  lo.push(auditStatement(env.DB, { staffId: staff.id, action: "self_submission_accepted", at, targetType: "party", targetId: p.party_id,
    detail: `phiếu ${p.id} · ${nhanLoaiPhieu(p.subject_kind)}${kl.coCham ? " · cờ chạm tài khoản" : ""}` }, "changes() > 0"));
  let kq: D1Result[];
  try { kq = await env.DB.batch(lo); } catch (e) { const l = loiLoChapNhan(e); if (l) return error(l.status, l.code, l.message); throw e; }
  if ((kq[0]!.meta.changes ?? 0) === 0) {
    const lai = await timPhieuChoXet(env.DB, p.id);
    return lai && lai.status === "CHO_XAC_MINH" ? error(409, "verify_conflict", NHAN_LY_DO_CHAN.da_cham!) : error(409, "submission_not_pending", "Phiếu đã được xử lý hoặc đã rút.");
  }
  return json({ ok: true });
}),
```

`cauGhiGiaTri(db, p, actorId, at)` (hàm cục bộ của `index.ts`, gọi trong thân route — rào 5.23 bài (3)): theo `p.subject_kind` trả `[ghiNgaySinhTuPhieuStatement, lamMoiHoSoTuPhieuStatement, ghiXacMinhTuPhieuStatement(ATTRIBUTE NGAY_SINH)]` / `[ghiDiaChiTuPhieuStatement(mã mới), lamMoiHoSo…, ghiXacMinh…(CONTACT, mã mới)]` / `[ghiGiayToTuPhieuStatement(mã mới, previousId = dòng hiện hành cùng loại hoặc null — R14), lamMoiHoSo…, ghiXacMinh…(PERSON_DOCUMENT, mã mới)]`. Câu `ghiXacMinh…` LUÔN đứng cuối trước nhật ký (nhật ký `changes() > 0` đọc câu đó).

- [ ] **Step 4: `CAN_XAC_MINH_LAI` ở hai đường cũ** — theo đúng khuôn khoá lạc quan sẵn có của `parties` ("mọi câu sửa hồ sơ mang cùng điều kiện mốc cập nhật … câu sửa pty_party đứng CUỐI"): câu đánh dấu đứng TRƯỚC câu đổi mốc, mang CÙNG điều kiện khoá lạc quan với câu sửa, nên trong cùng giao dịch nó ghi khi và chỉ khi câu sửa ghi; nhật ký giữ nguyên vị trí và `changes() > 0` của nó (không đọc `audit_log`, không so mốc để đoán ai thắng).
  - `PUT /api/parties/:id`: khi `doiNgaySinh`, `updatePartyStatements` nhận tham số tuỳ chọn `canXacMinhLai?: { actorId: string; at: string }` và chèn `canXacMinhLaiStatement(… ATTRIBUTE, NGAY_SINH, expectedUpdatedAt = v.expectedUpdatedAt …)` vào TRƯỚC câu sửa `pty_party` (câu cuối) của mảng.
  - `POST …/documents/:did/correct`: chèn `canXacMinhLaiStatement(… PERSON_DOCUMENT, did, expectedUpdatedAt = mốc client gửi …)` NGAY TRƯỚC `updatePersonDocStatement` (câu sửa giấy tờ đã mang `expectedUpdatedAt`); nhật ký `party_document_corrected` vẫn đứng ngay sau câu sửa.

- [ ] **Step 5: Hàng rào đi kèm** — `src/route-access.test.ts` (hai dòng), `src/route-write-guard.test.ts` bài (4b) `known` thêm hai route ghi, `src/tu-khai-khong-len-nhan.test.ts` bài (3) thêm hai route, `src/giay-to-khong-lo-so.test.ts` ca: phản hồi chấp nhận / từ chối và nhật ký không chứa số.

- [ ] **Step 6: Chạy bộ kiểm của task**

Run: `node --test src/modules/parties/xac-minh-route.test.ts src/modules/parties/giay-to-route.test.ts src/modules/parties/xac-minh-lenh.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/tu-khai-khong-len-nhan.test.ts src/giay-to-khong-lo-so.test.ts src/audit-invariants.test.ts src/architecture.test.ts`, rồi `npm run typecheck`, rồi `npm test`.
Expected: PASS.

**Tiêu chí nghiệm thu Task 4:** 13 ca (w1)–(w13) xanh; bỏ `quyetPhieuStatement` ra khỏi đầu lô (ghi giá trị trước) ⇒ (w5)/(w8) đỏ; `R-PTY-14..16` = 0 sau toàn bộ bài; không route nào ngoài năm route `/api/parties/xac-minh…` gọi hàm phiếu (bài (3)).

- [ ] **Step 7: Commit**

```bash
git add src/modules/parties/index.ts src/modules/parties/repository.ts src/modules/parties/xac-minh-route.test.ts src/modules/parties/giay-to-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/tu-khai-khong-len-nhan.test.ts src/giay-to-khong-lo-so.test.ts
git commit -m "Xác minh hồ sơ: chấp nhận nguyên văn, từ chối theo danh sách đóng, đánh dấu cần xác minh lại khi giá trị đổi (ADR-0125, ADR-0122 đ3)"
```

**→ Người kiểm độc lập nhóm C** (chỉ đọc, phủ Task 2–4): tự chạy lại Step 6 của Task 4 + `node --test src/goi-trang-nhe.test.ts`; thử đột biến: bỏ lính gác khỏi `DECIDE`, bỏ `DA_THANG` một câu, đổi cột HR một ô, đảo thứ tự nhật ký / trả số ở xem số, bỏ route khỏi `BI_MAT`; đọc lại ba chỗ nới có tên (4b, rào 5.23 bài (3), bài phân loại) xem có rộng hơn cần không.

---

### Task 5: Giao diện "Hàng chờ xác minh" ở trang Quản lý tài khoản + kịch bản Chrome (nhỏ — giao diện)

**Files:**
- Create: `web/xac-minh-hang-cho.ts`
- Modify: `web/staff.ts` (gọi khối khi `can(staff, "party.verify")`), `public/staff.html` (một `<section id="xac-minh">` rỗng), `public/app.css` (khối `.xm-*`, giá trị qua token)
- Create: `src/xac-minh-giao-dien.test.ts`
- Create: `docs/evidence/2026-10-17-xac-minh/kich-ban/xac-minh-smoke.mjs`

**Interfaces:**
- Consumes: DTO Task 3; route Task 3, 4; `LY_DO_TU_CHOI`, `nhanLyDoTuChoi`, `NHAN_LY_DO_CHAN` (`src/shared/xac-minh-hien-thi`), `nhanLoaiPhieu` (`src/shared/tu-khai-hien-thi`), `h()` (`web/dom.ts`), `api()` (`web/api.ts`).
- Produces: `export function dungHangChoXacMinh(goc: HTMLElement, staff: StaffProfile): void`.

- [ ] **Step 1: Rào tĩnh (đỏ)** — `src/xac-minh-giao-dien.test.ts`:

```ts
// Rào tĩnh khối Hàng chờ xác minh (ADR-0125 đ6; web/CLAUDE.md). Phá thử: thêm h("textarea") vào khung từ chối → (2) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const ma = readFileSync(new URL("../web/xac-minh-hang-cho.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
test("(1) không innerHTML; chỉ import src/shared không đuôi; không import src/modules", () => {
  assert.doesNotMatch(ma, /innerHTML|outerHTML|insertAdjacentHTML/);
  assert.doesNotMatch(ma, /src\/modules\//);
  assert.doesNotMatch(ma, /from "\.\.\/src\/shared\/[^"]+\.ts"/);
});
test("(2) từ chối chỉ chọn trong danh sách đóng — không ô chữ tự do", () => {
  assert.doesNotMatch(ma, /h\("textarea"|type:\s*"text"/);
  assert.match(ma, /LY_DO_TU_CHOI/);
});
test("(3) không sửa trường khai: không gọi PUT /api/parties, không route liên hệ / giấy tờ", () => {
  assert.doesNotMatch(ma, /"PUT"|\/contacts|\/documents/);
});
test("(4) không ghi số đủ vào bộ nhớ lâu dài (localStorage / sessionStorage / caches)", () => {
  assert.doesNotMatch(ma, /localStorage|sessionStorage|caches\./);
});
test("(5) web/orders.ts không nhập khối này (trần gói)", () => {
  assert.doesNotMatch(readFileSync(new URL("../web/orders.ts", import.meta.url), "utf8"), /xac-minh/);
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/xac-minh-giao-dien.test.ts`
Expected: FAIL — không có tệp.

- [ ] **Step 3: Dựng khối** — `web/xac-minh-hang-cho.ts` bằng `h()`: tiêu đề "Hàng chờ xác minh", hai nút chuyển "Đang chờ" / "Đã xử lý"; mỗi thẻ phiếu chờ: loại (`nhanLoaiPhieu`), họ tên, "Gửi lúc" (giờ VN qua hàm định dạng sẵn có), nhãn "Chuyển Toàn quyền" khi `chuyenToanQuyen`, câu `lyDoKhong` khi `!xacMinhDuoc` (nút xử lý ẩn). Bấm thẻ ⇒ khung chi tiết: trường khai; số che + nút "Xem đủ số" (hộp xác nhận "Mỗi lần xem được ghi vào nhật ký. Xem số?"; số hiện trong khung, mất khi đóng khung, không lưu); nút "Chấp nhận" (xác nhận "Chấp nhận nguyên văn thông tin khai? Người xác minh không sửa được thông tin.") và "Từ chối" (danh sách nút chọn một lý do từ `LY_DO_TU_CHOI`, nút "Gửi từ chối" chỉ bật khi đã chọn). Lỗi 409 / 403 hiện `message` của máy chủ; sau 200 đóng khung, tải lại danh sách, không mở lại được phiếu. Thẻ "Đã xử lý": mã phiếu (6 ký tự đầu), loại, "Đã xác minh" / "Bị từ chối · <nhãn lý do>", người xử lý, lúc, nhãn "Người xác minh từng tạo hoặc chạm tài khoản" khi `coChamTaiKhoan`. Ô chọn 16px, CSS qua token đầu `public/app.css`. `web/staff.ts`: gọi `dungHangChoXacMinh(...)` khi `can(staff, "party.verify")` (Toàn quyền, Quản trị, Nhân sự).

- [ ] **Step 4: Chạy lại + dựng**

Run: `node --test src/xac-minh-giao-dien.test.ts src/goi-trang-nhe.test.ts`, rồi `npm run build:web`, rồi `npm run typecheck`.
Expected: PASS; gói Đơn hàng không đổi byte so với cuối Task 3.

- [ ] **Step 5: Kịch bản Chrome** — `docs/evidence/2026-10-17-xac-minh/kich-ban/xac-minh-smoke.mjs` theo khuôn `docs/evidence/2026-10-17-tu-khai/kich-ban/tu-khai-smoke.mjs` (D1 tạm, dữ liệu thử ghi rõ "thử", kiểm axe khi có `AXE_JS`, rộng **1040** và **390**): (1) Đối tác thử khai ngày sinh + địa chỉ + giấy tờ (qua API); (2) Nhân sự mở `/staff` thấy hàng chờ 3 phiếu, mở chi tiết, "Xem đủ số", chấp nhận ngày sinh, từ chối địa chỉ với một lý do, chấp nhận giấy tờ ⇒ thấy câu "chưa có ảnh"; (3) Nhân sự mở `/parties` ⇒ bị chặn; (4) Quản trị mở `/staff` ⇒ tab "Đã xử lý" có 2 dòng, không xem lại được chi tiết; (5) Toàn quyền mở SAU CÙNG (kho cookie chung). Chụp ảnh từng bước cả hai bề rộng vào `docs/evidence/2026-10-17-xac-minh/anh/`. Chạy thêm các kịch bản bảng `web/CLAUDE.md` yêu cầu cho `web/staff.ts`: `quyen-thieu-quan-tri-smoke.mjs`, `va3-smoke.mjs`, `dot-a-smoke.mjs` (ghi rõ chỗ đỏ sẵn "nhat-ky: thẻ đã dựng xong" từ ADR-0038 nếu còn).

Run: `AXE_JS=<đường dẫn axe.min.js> node docs/evidence/2026-10-17-xac-minh/kich-ban/xac-minh-smoke.mjs`
Expected: `SMOKE OK`, 0 vi phạm axe. Thiếu `AXE_JS` ⇒ báo cáo ghi **"chưa kiểm màu (thiếu AXE_JS)"**, không khai đạt.

**Tiêu chí nghiệm thu Task 5:** năm bài tĩnh xanh; kịch bản Chrome có `AXE_JS` OK ở 1040 và 390; ảnh thật đủ hai bề rộng để chủ duyệt một lượt; gói Đơn hàng không tăng.

- [ ] **Step 6: Commit**

```bash
git add web/xac-minh-hang-cho.ts web/staff.ts public/staff.html public/app.css src/xac-minh-giao-dien.test.ts docs/evidence/2026-10-17-xac-minh/
git commit -m "Xác minh hồ sơ: khối Hàng chờ xác minh ở trang Quản lý tài khoản, kịch bản Chrome và ảnh hai bề rộng (ADR-0125)"
```

---

### Task 6: E2E, tài liệu, sổ hàng rào, phá thử, nhật ký thay đổi, bộ kiểm đủ (nghiệm thu)

**Files:**
- Create: `tests/e2e/xac-minh.mjs`; Modify: `tests/e2e/run.mjs`
- Modify: `docs/SYSTEM-DESIGN.md` (§5 view mới; §7 năm route; §8 hai ô + luật tách nhiệm vụ), `docs/CHANGE-GUIDE.md` (công thức "thêm hành động chạm tài khoản" — xếp tầng ở `cham-tai-khoan.ts` + migration tạo lại view; bẫy `birthDate` R9; bẫy `lan-gui-bi-mat.ts` nằm trong gói Đơn hàng), `docs/HANDOFF-N1.md` (runbook: 0107 đi SAU 0103–0105, kiểm số vì 0106 của nhánh vé hỗ trợ; xác minh vô hại khi chưa có chính sách đăng; việc của chủ), `docs/BACKLOG.md` (mục 39 nợ H-4; đóng BL-TK-PHIEU-BAN-CU theo R8), `docs/SO-HANG-RAO.md`, `src/shared/changelog.ts` (2.13 TẠM), `src/shared/app-info.test.ts`

- [ ] **Step 1: E2E (đỏ trước khi thêm vào run.mjs là không có; viết rồi chạy)** — `tests/e2e/xac-minh.mjs`, đăng nhập luôn qua `login()`/`session()` của `tests/e2e/lib.mjs`, POST kèm `Origin`:

```js
// Kịch bản (mỗi bước một assert, đếm trên D1 local tạm). Tài khoản Đối tác và Nhân sự đều do TOÀN QUYỀN tạo (nếu Nhân sự tạo Đối tác thì bước 2–4 đỏ vì `TAO`).
// 1. Toàn quyền đăng chính sách thử; Đối tác đồng ý, gửi phiếu NGAY_SINH, DIA_CHI, GIAY_TO.
// 1b. Nhân sự tạo thêm Đối tác B; B đăng nhập, đồng ý, tự khai NGAY_SINH; Nhân sự chấp nhận → 409 verify_conflict (người tạo không xác minh — sự thật 20); Quản trị chấp nhận → 200.
// 2. Nhân sự (tài khoản do Toàn quyền tạo) GET /api/parties/xac-minh → 3 phiếu; GET /api/parties → 403.
// 3. Nhân sự xem đủ số GIAY_TO → 200; GET /api/audit bằng Toàn quyền: dòng self_submission_number_viewed không chứa số.
// 4. Nhân sự chấp nhận NGAY_SINH → 200; lần hai bằng Quản trị → 409 submission_not_pending.
// 5. Quản trị từ chối DIA_CHI (KHONG_KHOP_GIAY_TO) → 200; chấp nhận GIAY_TO → 409 can_anh_giay_to.
// 6. Quản trị đặt lại PIN cho Đối tác; Đối tác ĐĂNG NHẬP LẠI bằng PIN mới (phiên cũ đã hết), gửi phiếu DIA_CHI mới; Quản trị chấp nhận → 409 verify_conflict; Nhân sự chấp nhận → 200.
// 7. Chi tiết phiếu đã xử lý → 403 submission_processed.
// 8. Đối tác GET /api/parties/cua-toi: ngày sinh mới, phiếu trạng thái "Đã xác minh" / "Bị từ chối".
// Cuối: audit-invariants (run.mjs tự chạy) — R-PTY-14..16 = 0.
```

Run: `npm run test:e2e -- xac-minh` (cần mạng; tắt `wrangler dev` mồ côi trước), rồi `npm run test:e2e` đủ.
Expected: xanh; `audit-invariants` thoát 0. Nếu gặp 500 thân null dưới tải: chạy lại MỘT lần và ghi vào báo cáo (bộ nhớ "e2e: 500 thân null"), không sửa mã vì nó.

- [ ] **Step 2: Phá thử thật (P16) và ghi sổ** — mỗi phép: sửa cố ý → chạy bài → ĐỎ (chép dòng `not ok …`) → hoàn nguyên → xanh; `git status` sạch sau cùng. Danh sách tối thiểu:
  1. Bỏ `NOT ${CHAM_CUA_NGUOI…}` khỏi `DECIDE` ⇒ `xac-minh-lenh.test.ts` (1), (3) + `xac-minh-route.test.ts` (w5) đỏ.
  2. `'-30 days'` → `'-29 days'` ở `CHAM_CUA_NGUOI` ⇒ (10) đỏ.
  3. Bỏ `'pin_reset'` khỏi tầng VINH_VIEN của view (bản sao tạm của migration trong DB thử) ⇒ `cham-tai-khoan.test.ts` (2) + `migrations-xac-minh-ho-so.test.ts` (b) đỏ.
  4. Thêm `mfa_test_x: { label: "x", group: "staff" }` vào `AUDIT_ACTIONS` ⇒ `cham-tai-khoan.test.ts` (1) đỏ.
  5. Thêm câu `defineSql("staff","thu_x","UPDATE staff SET mfa_grace_until = ?2 WHERE id = ?1")` ⇒ (4) đỏ.
  6. Viết tay `"đổi SĐT đăng nhập"` lại vào accounts ⇒ (3) đỏ.
  7. Cột HR của `party.verify` → `none` ⇒ "HR đúng năm ô" + ghim dòng HR + 1024 đỏ.
  8. Bỏ trigger `pty_self_submission_decider_not_author` (DB thử) ⇒ `migrations-xac-minh-ho-so.test.ts` (e) đỏ.
  9. Đảo thứ tự "ghi nhật ký rồi trả số" ở xem số ⇒ (r8) đỏ.
  10. Bỏ `/api/parties/xac-minh/:pid/xem-so` khỏi `BI_MAT` ⇒ bài T16 / `lan-gui` tương ứng đỏ (nếu không bài nào đỏ: ghi "chưa có hàng rào máy — dựa vào kỷ luật" và thêm bài siết).
  11. `R-PTY-16`: đổi `= 0` thành `= 2` trong câu ⇒ bài bất biến đỏ.

`docs/SO-HANG-RAO.md`: một dòng cho mỗi hàng rào mới (ô xác minh; lính gác tách nhiệm vụ; view + phân loại vét cạn; người ghi cột hạn lớp hai; trigger người quyết ≠ người khai; R-PTY-14/15/16; xem số nhật ký trước + `BI_MAT`; rào tĩnh giao diện), cột "Đã thấy chặn thật" chép dòng `not ok` thật; ghi rõ phần **dựa vào kỷ luật**: lát ADR-0121 dựng BẢNG ngoại lệ tạm mới (không ghi cột hạn) thì bài (4) không bắt — mục `BL-XM-ADR0121` ở BACKLOG.

- [ ] **Step 3: Tài liệu + nhật ký thay đổi** — `src/shared/changelog.ts` mục **2.13** (TẠM, ngày 2026-10-17), chữ cho người dùng: "Quản trị và Nhân sự có Hàng chờ xác minh ở trang Quản lý tài khoản: xem thông tin người dùng tự khai, chấp nhận nguyên văn hoặc từ chối kèm lý do. Người đã tạo tài khoản hoặc từng hỗ trợ đăng nhập cho người đó không xác minh được phiếu của họ."; sửa `src/shared/app-info.test.ts` theo khuôn lần trước. `docs/BACKLOG.md` mục **39. Xác minh hồ sơ — nợ lát H-4 (`BL-XM-…`)**: `BL-XM-ADR0121` (lát ADR-0121 phải ghi `mfa_grace_reopened` / `mfa_exception_set` cùng lô; bảng ngoại lệ mới cần thêm vào view / bài), `BL-XM-ANH` (route ảnh phiếu đi cùng BL-TK-ANH), `BL-XM-TAI-HANG-CHO` (đo tải với ~1000 tài khoản), `BL-XM-THONG-DONG` (ADR nói thẳng), câu trả lời Q1–Q5 khi có.

- [ ] **Step 4: Bộ kiểm đủ**

Run: `npm run typecheck`, rồi `npm test`, rồi `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts src/claude-cong-xanh.test.ts`.
Expected: 0 lỗi; mọi bước thoát 0. Đỏ mà không xanh được ⇒ báo cáo ghi nguyên văn **BỘ KIỂM CHƯA XANH** kèm tên bài và lý do.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/xac-minh.mjs tests/e2e/run.mjs docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/HANDOFF-N1.md docs/BACKLOG.md docs/SO-HANG-RAO.md src/shared/changelog.ts src/shared/app-info.test.ts
git commit -m "Xác minh hồ sơ: kịch bản e2e, sổ hàng rào có phá thử thật, tài liệu, nhật ký thay đổi 2.13 tạm (ADR-0125)"
```

**Báo cáo Task 6 phải kèm:** số byte gói Đơn hàng cuối lát; dòng ĐỀ XUẤT cho bảng kịch bản Chrome của `web/CLAUDE.md` (`web/xac-minh-hang-cho.ts`, khối xác minh của `web/staff.ts` → `xac-minh-smoke.mjs` + `quyen-thieu-quan-tri-smoke.mjs`) — chủ duyệt, AI không sửa; danh sách ruling đã áp; câu hỏi Q1–Q5 còn mở.

**→ Người kiểm độc lập cuối lát** (chỉ đọc, phủ toàn lát `3c7daf05..HEAD`): đọc ADR-0125 đối chiếu từng tiêu chí nghiệm thu; tự chạy `npm run typecheck`, `npm test`, `npm run test:e2e -- xac-minh`; lặp ít nhất bốn phép phá thử của Step 2.

---

## Câu hỏi gom cho chủ

Chỉ điều chạm dữ liệu / quyền mà ADR chưa chốt. Không câu nào chặn thi công: kế hoạch đã áp phương án khuyến nghị (an toàn, đảo ngược được bằng một commit, vì 0107 chưa áp ở đâu).

1. **Phiếu giấy tờ khi chưa có ảnh (R4, R18).** Người dùng chưa gửi được ảnh (chờ lát đường xoá). Khuyến nghị: **chưa cho chấp nhận phiếu giấy tờ cho tới khi có ảnh** (từ chối vẫn được; ngày sinh, địa chỉ chấp nhận bình thường); ảnh của phiếu mở cùng lát tải ảnh. Phương án khác: cho chấp nhận khi người xác minh đã xem bản gốc trực tiếp (nhanh hơn, nhưng số CCCD vào hồ sơ mà không có bằng chứng lưu lại).
2. **"Kích hoạt lại tài khoản" có tính là chạm quyền truy cập không?** ADR chỉ liệt kê năm hành động 30 ngày. Kích hoạt lại trả quyền đăng nhập cho chính chủ, không trao cho người làm. Khuyến nghị: **thêm vào nhóm 30 ngày** (siết, không hại ai); hôm nay để ngoài cho đúng chữ ADR.
3. **Phiếu đang chờ của hồ sơ bị gộp (M-6).** Hiện: chấp nhận bị chặn, người xác minh từ chối với lý do "Hồ sơ đã gộp". Khuyến nghị: **thêm luật chặn gộp khi hồ sơ phụ còn phiếu chờ** (người dùng rút hoặc người xác minh xử lý trước) — không đổi dữ liệu nào. Phương án khác: lô gộp tự đóng phiếu (cần chọn ai đứng tên người quyết).
4. **Phạm vi nhìn của người xác minh.** (a) Nhân sự thấy **họ tên** chủ phiếu để đối chiếu (không SĐT, email, vai) — khuyến nghị: đồng ý. (b) Theo luật cấp bậc chung, **Quản trị không xác minh phiếu của Nhân sự** (chữ ADR chỉ nói Quản trị, Toàn quyền) — khuyến nghị: giữ theo luật cấp bậc chung.
5. **Hai điểm nhỏ về dữ liệu.** (a) Toàn quyền **từ chối** phiếu của tài khoản mình từng chạm: không có dòng xác minh để gắn cờ (chỉ nhật ký ghi "cờ chạm tài khoản") — khuyến nghị: chấp nhận như vậy vì từ chối không ghi giá trị nào. (b) Bảy thuộc tính xác minh gieo sẵn (q1): lát này chỉ dùng "Ngày sinh" — khuyến nghị: **giữ nguyên bảy dòng**, không đổi.
