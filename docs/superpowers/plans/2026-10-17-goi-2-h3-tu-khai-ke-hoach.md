# Gói 2 hồ sơ riêng tư — lát H-3 (người dùng tự khai hồ sơ): Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi tài khoản (kể cả Đối tác, Tài xế đối tác) xem được hồ sơ của chính mình (số che), đọc và đồng ý chính sách riêng tư phiên bản hiện hành, rồi gửi / rút **phiếu tự khai** ngày sinh, địa chỉ, giấy tờ — giá trị khai là ĐỀ XUẤT, không ghi đè giá trị hiện hành, không lên nhãn / đơn / chứng từ; Toàn quyền đăng được phiên bản chính sách mới; chưa có chính sách hay chưa đồng ý thì không gửi được.

**Architecture:** Một migration chỉ-thêm `0105_ho_so_tu_khai.sql` của module `parties` (bảng `pty_self_submission`: nội dung bất biến, trạng thái đi một chiều, trigger đồng ý + một phiếu đang chờ mỗi loại; vá lỗ `INSERT OR REPLACE` của ba bảng chỉ-thêm 0103). Một tệp luật thuần `src/modules/parties/tu-khai.ts`, một tệp nhãn dùng chung `src/shared/tu-khai-hien-thi.ts`, năm route mới trong `src/modules/parties/index.ts` (cổng `staff` cho bốn route "của tôi", cổng `admin` cho route đăng chính sách), ba ô quyền mới. Giao diện là MỘT khối ở trang Tôi (`web/ho-so-cua-toi.ts` gọi từ `web/account.ts`) — không trang mới, không mục menu mới (trần gói Đơn hàng). Không ảnh: loại nối `SELF_SUBMISSION` của kho tệp vẫn đóng (ruling R1).

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), `node:sqlite` + khung thử `tests/audit/harness.mjs`, `node --test` (Node 22), esbuild; không dependency runtime.

**Spec:** `docs/adr/ADR-0124-nguoi-dung-tu-khai-ho-so-cua-minh.md` (đ1–đ6, tiêu chí nghiệm thu); `docs/adr/ADR-0126-quyen-rieng-tu-yeu-cau-xoa-an-danh-hoa-luu-giu.md` đ1 (chính sách + đồng ý; KHÔNG làm đ2–đ9); `docs/adr/ADR-0122-…` đ5 (ngày sinh / địa chỉ chỉ chính chủ + `party.personal.view`); `docs/adr/ADR-0123-…` (kho tệp — chỉ để giữ loại nối `SELF_SUBMISSION` đóng); `docs/adr/ADR-0125-…` (chỉ để thiết kế vòng đời phiếu cho H-4 dùng — KHÔNG làm xác minh); Hiến chương `docs/ARCHITECTURE.md` 5.8, 5.20, 5.21, 5.22, 5.23, 5.24, 5.25; đặc tả `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/` (`DE-XUAT-ADR.md` mục ADR-H3, ADR-H4; `PHUONG-AN.md` §2.1, §2.2, §2.5; `TRANG-GHEP.md` §1, §2 dòng `party.self.*`, `party.privacy.policy`, `party.document.view`, §3 dòng `GET /api/me/ho-so`, `POST /api/me/ho-so/phieu`, §3b; `KE-HOACH-SUY-RA.md` dòng H-4 "Tự khai" + "Cổng phát hành" — xem ruling R0 về lệch số lát).

**Kế hoạch mẫu khuôn:** `docs/superpowers/plans/2026-10-16-goi-2-h0-h1-ke-hoach.md`, `docs/superpowers/plans/2026-10-16-goi-2-h2-kho-tep-ke-hoach.md` (cùng nhánh). Nợ / lo ngại của hai lát trước: `.superpowers/sdd/2026-10-16-goi-2-*/progress.md` và `task-*-report.md`.

## Global Constraints

- Giao diện, câu báo lỗi (`message`), tài liệu, commit: tiếng Việt CÓ DẤU; mã lỗi máy (`consent_required`…) được, chữ hiện ra thì không chữ Anh, không mã thô (`CHO_XAC_MINH` phải ra "Chờ xác minh"). Gọi hệ thống là "Nền tảng".
- Không dependency runtime. Tệp được `*.test.ts` import trực tiếp (`tu-khai.ts`, `repository.ts`, `tu-khai-hien-thi.ts`) import nhau KÈM đuôi `.ts`; `web/` import `src/shared` KHÔNG đuôi, không import `src/modules/`.
- Migration: đúng MỘT tệp mới `migrations/0105_ho_so_tu_khai.sql`, chỉ THÊM (không `DROP`, không `ALTER TABLE` bảng cũ, không `INSERT` gieo dữ liệu); không sửa tệp nào đã có (kể cả `0103`, `0104` của nhánh này). Bài kiểm tìm tệp theo ĐUÔI `_ho_so_tu_khai.sql`.
- **KHÔNG gieo chính sách riêng tư, KHÔNG viết văn bản pháp lý thật, KHÔNG có cột / con số thời hạn xoá** (ADR-0126 đ2 — lát H-5, chờ luật sư). Chữ chính sách trong bài kiểm / e2e / kịch bản Chrome là chữ thử ghi rõ "thử".
- Phạm vi "của mình": hồ sơ = `staff.partyId` của PHIÊN; KHÔNG BAO GIỜ đọc mã hồ sơ từ đường dẫn hay thân lệnh. Ô hỏi bằng chuỗi nguyên văn `can(staff, "party.self.view", { ownerId: staff.id })` / `can(staff, "party.self.submit", { ownerId: staff.id })` / `can(staff, "party.privacy.policy")`.
- Nhật ký (`audit_log.detail`) chỉ mang mã và nhãn danh mục (mã phiếu, nhãn loại phiếu, tên loại giấy tờ, số phiên bản): KHÔNG ngày sinh, địa chỉ, số giấy tờ, nơi cấp, chữ chính sách (Hiến chương 5.20).
- DTO "của tôi" theo DANH SÁCH CHO PHÉP, giống nhau cho mọi quyền; số giấy tờ LUÔN che (`cheSo`), kể cả với chính chủ; câu SQL đọc phiếu KHÔNG chọn cột `document_number`.
- Giá trị tự khai chưa xác minh KHÔNG được đọc ở bất kỳ đường nào ngoài bốn route `/api/parties/cua-toi*` (5.23) — không view `v_pty_*`, không hàm công bố, không `respondParty`.
- Mỗi route ghi đúng MỘT `db.batch` (lớp chống ghi trùng ADR-0094 — KHÔNG thêm mục vào `GHI_NHIEU_LAN`, `NGOAI_VE`).
- **Trần gói trang Đơn hàng `TRAN_ORDERS = 96_600` KHÔNG nới.** Đo 2026-10-17: 96 382 byte (dư 218). `permissions.ts` và `muc-giao-dien.ts` nằm trong gói đó; `audit-actions.ts`, `contracts.ts` (chỉ kiểu) thì không. ⇒ ô quyền mới dùng hàm dòng chung; KHÔNG thêm mục nào vào `src/shared/muc-giao-dien.ts`; không import gì mới vào `web/orders.ts`.
- KHÔNG làm ở lát này: hàng chờ xác minh, chấp nhận / từ chối, ô `party.verify*` (H-4); phiếu xoá, ẩn danh hoá, ô `party.erasure.request` (H-5); lớp hai bắt buộc cho đối tác (ADR-0121); tự khai của hồ sơ TỔ CHỨC; tải ảnh của người dùng (ruling R1).
- CẤM AI tự chạy: `git push`, merge vào `main`, `wrangler deploy`/`rollback`/`secret`, mọi lệnh `--remote`, mọi lệnh R2 thật. E2E chỉ trên D1 local tạm của `npm run test:e2e`.
- Không sửa luật chi phối chính mình: `CLAUDE.md` (kể cả `web/CLAUDE.md`, `src/CLAUDE.md`), `.claude/`, `playbook/`, `docs/adr/`, Phần I của `docs/ARCHITECTURE.md`. Dòng mới cho bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" của `web/CLAUDE.md` chỉ ĐỀ XUẤT trong báo cáo (Task 6).
- Mỗi task: bài đỏ trước, xanh sau; trước commit `npm test` và `npm run typecheck` phải xanh (`typecheck` KHÔNG phủ `*.test.ts`, `scripts/`, `tests/` — tự đọc lại tệp đó). Chạy MỘT bộ kiểm một lúc (bài đo giờ của hook nhạy tải).
- Số phiên bản nhật ký thay đổi: **2.12 TẠM** (không trùng 2.8, 2.9, 2.10, 2.11).
- Dòng đồng tác giả commit theo nhắc của môi trường lúc thi công.

## Review Focus

Năm tình huống ADR không nói thẳng mà dễ làm người dùng gặp lỗi nhất; mỗi dòng có bài ghim ở task sở hữu mã:

1. **Toàn quyền đăng phiên bản chính sách mới trong lúc người dùng đang mở trang Tôi** — người đó bấm "Đồng ý" hay "Gửi xác minh" với mã phiên bản cũ ⇒ 409 `policy_changed` bằng câu tiếng Việt, không dòng nào được ghi; tải lại thấy hộp đồng ý phiên bản mới (bài "Review Focus 1", Task 3 + Task 4).
2. **Tài khoản lai Bán hàng + Đối tác, Đối tác thuần, Tài xế đối tác** nhận ĐÚNG tập khoá của DTO (không vai, quan hệ, gộp, tài khoản, người tạo, mốc tạo) — cùng tập như Bán hàng (bài "Review Focus 2", Task 3 + Task 4).
3. **Khai số CCCD đã thuộc người khác** ⇒ vẫn 201 như mọi số khác; phản hồi không có chữ nào cho biết số đã có (không biến route thành chỗ dò số) (bài "Review Focus 3", Task 4).
4. **Bấm "Gửi" hai lần** (cùng vé ⇒ phát lại; khác vé ⇒ 409 `submission_pending`) chỉ sinh MỘT phiếu; rút hai lần, rút phiếu đã bị từ chối ⇒ 409 `submission_not_pending`; rút phiếu của người khác ⇒ 404 (bài "Review Focus 4", Task 4).
5. **Tài khoản gắn hồ sơ tổ chức / chưa gắn hồ sơ / hồ sơ đã gộp** ⇒ trang Tôi vẫn mở (GET 200) với một câu lời thường; mọi lệnh ghi 409 tiếng Việt; không dòng `pty_consent` / `pty_self_submission` nào (bài "Review Focus 5", Task 3 + Task 4).

Rủi ro đã biết, KHÔNG có bài (ghi để người kiểm khỏi tìm): toàn văn chính sách tới 20 000 ký tự đi kèm MỖI lần mở trang Tôi của người có hồ sơ (≈ 60 KB UTF-8, chưa đo trên 4G); thứ tự chạy giữa nhiều trigger `BEFORE INSERT` cùng bảng SQLite không được tài liệu hoá — bài migration chỉ dựng ca mà đúng MỘT điều kiện trigger sai; hai lần "Đồng ý" song song khác vé có thể sinh hai dòng `DONG_Y` liền nhau (vô hại, chỉ-thêm).

## Bằng chứng số migration (kiểm 2026-10-17, chỉ đọc)

- Nhánh này (`worktree-ho-so-rieng-tu-2fa`, HEAD `ceca2c1b`): tệp lớn nhất `0104_ho_so_tep.sql` (`ls migrations | tail`: …0102, 0103, 0104). `main` (`git ls-tree --name-only main migrations/`): lớn nhất `0102_aut_mfa_email.sql`. Checkout gốc (`ls <gốc>/migrations | tail -3`): 0100, 0101, 0102.
- Mọi ref đã commit của mọi nhánh (`git log --all --name-only --format= -- 'migrations/010*' 'migrations/011*'`): chỉ có 0100, 0101, 0102, 0103, 0104 — không nhánh nào có 0105 trở lên. `0098_dua_don_theo_nhom_va_diem_nhanh.sql` có ở commit `b96948d51` (ADR-0118, chưa gộp) — không lấp.
- Thư mục `migrations/` (kể cả tệp CHƯA commit) của cả 13 worktree trong `.claude/worktrees/`: lớn nhất 0102 ở `busy-pike-367e49`, `dong-giai-thich-email`, `hai-lop-email`, `stoic-heisenberg-72c05d`; 0104 chỉ ở worktree này.
- **Số chọn: `0105`**, tệp `migrations/0105_ho_so_tu_khai.sql`. Nhánh nào gộp vào `main` trước mà chiếm `0105` thì chỉ đổi tên tệp (bài tìm theo đuôi). Kiểm lại lúc phát hành (`docs/HANDOFF-N1.md`).

## Sự thật đã kiểm khi soạn (ghi lại để người thi công không phải dò lại)

1. **Cây làm việc KHÔNG bằng HEAD lúc soạn.** `git status` có 4 tệp sửa chưa commit của phiên khác (vòng sửa / phá thử của lát H-2: `scripts/release-lib.mjs`, `src/modules/parties/index.ts`, `src/release-lib.test.ts`, `tests/e2e/ho-so-tep.mjs`). Kế hoạch soạn trên `ceca2c1b`, trỏ tên hàm chứ không số dòng. Người thi công bắt đầu từ commit ĐÓNG vòng sửa H-2 (điều phối xác nhận cây sạch trước Task 1); đừng commit lẫn thay đổi của phiên khác. Cập nhật cuối buổi soạn: commit `49ffdda4` (đóng vòng sửa H-2) đã lưu các thay đổi đó — chỉ chạm `scripts/release-lib.mjs`, `src/release-lib.test.ts`, `tests/e2e/ho-so-tep.mjs` và ba tài liệu; không chạm `migrations/` hay `src/modules/parties/index.ts` ⇒ kế hoạch không đổi.
2. **Gói Đơn hàng 96 382 / 96 600 byte** (đo bằng esbuild cùng tuỳ chọn `src/goi-trang-nhe.test.ts`); trong gói: `src/shared/permissions.ts` 8 002 byte, `src/shared/muc-giao-dien.ts` 10 173 byte; `audit-actions.ts` không có. Ước ba ô mới bằng hàm dòng chung ≈ +142 byte ⇒ còn ≈ 76.
3. **`can()` so `ctx.ownerId === who.id`** (`allows` trong `permissions.ts`) ⇒ route tự phục vụ truyền `{ ownerId: staff.id }`.
4. **`SUPER_ADMIN = any` ở MỌI ô** (bài "ADR-0014 điều 2" của `permissions.test.ts`) ⇒ hàng ô tự phục vụ là `own` ×9 + `any` cho SUPER_ADMIN (TRANG-GHEP ghi `own` cả cột SUPER — không khác thực tế vì route luôn lấy `staff.partyId`; ghi ở ruling R6).
5. **Bài `ADMIN_NONE_OPS`** hỏi `can(admin, op, { ownerId: "x" })` ⇒ ô `own` của ADMIN cho `false` ⇒ ba ô mới phải vào danh sách (chắc đỏ, sửa cùng commit).
6. **`src/shared/lich-su-doi-tac.ts`**: kiểu `_phanLoaiDay` làm `npm run typecheck` đỏ khi hành động nhật ký mới chưa vào `LICH_SU_DOI_TAC_CHO_PHEP` hoặc `LICH_SU_DOI_TAC_AN`.
7. **`src/migrations-ho-so-tep.test.ts` bài (a)** khẳng định `files.at(-1) === FILE` ⇒ đỏ ngay khi có 0105 (chắc đỏ — Task 1 sửa thành "đứng sau 0103").
8. **`src/giay-to-khong-lo-so.test.ts`** lọc route theo `/\/documents|\/giay-to/` — route `/api/parties/cua-toi*` không tự vào; Task 4 mở rộng bộ lọc (siết) và thêm ca vào `TUYEN`. Bộ lọc KHÔNG được bắt `/api/van-chuyen/ban/cua-toi` (route của tài xế) ⇒ dùng `^\/api\/parties\/cua-toi`.
9. **Lỗ `INSERT OR REPLACE` của 0103** ở `pty_consent`, `pty_privacy_policy`, `pty_verification` (người kiểm nhóm A của H-2 nêu, gom hỏi chủ) — H-3 là lát đầu tiên GHI hai bảng đầu ⇒ vá bằng trigger `_no_replace` (siết, cộng thêm).
10. **Router khớp route theo thứ tự khai**: route mới phải khai TRƯỚC `GET /api/parties/:id` và mọi route `/api/parties/:id…`, nếu không đường `cua-toi` / `chinh-sach-rieng-tu` bị hiểu là mã hồ sơ (cổng `office` ⇒ Đối tác nhận 403).
11. **Cổng `staff` là cổng duy nhất PARTNER, DRIVER_PARTNER qua** (`OFFICE_GATE`, `ORDERS_GATE` không có DRIVER_PARTNER; `office` không có PARTNER).
12. **`StaffProfile.partyId` đã có trong `GET /api/auth/me`** ⇒ giao diện quyết hiện khối bằng `staff.partyId && can(staff, "party.self.view", { ownerId: staff.id })`; không đổi hợp đồng `/api/auth/me`.
13. **Nợ H-1:** `PUT /api/parties/:id` chặn khi thân có khoá `birthDate` kể cả không đổi; nút "Đóng" ADDRESS của chính chủ 403. Khối mới KHÔNG gọi `PUT /api/parties/:id` hay route liên hệ — nên hai nợ này không chạm tới (bài tĩnh ở Task 5).
14. **Lớp vé ADR-0094** gắn tự động mọi lệnh ghi qua `api()` (`web/api.ts`) — giao diện không phải làm gì; khung thử có thể không mô phỏng vé (bài "bấm hai lần" ở mức route chỉ ghim "một phiếu"; ca phát lại thật ở e2e `chong-ghi-trung`).
16. **Đã chạy thử khi soạn (bản sao tạm ngoài kho, `node --test` một tệp, SQLite trong bộ nhớ):** SQL migration 0105 ở Task 1 Step 3 + bài Task 1 Step 1 → 12/12 đạt (một ca ban đầu đỏ vì hai trigger cùng bắn — đã sửa ca cho chỉ một điều kiện sai); bài `migrations-ho-so-tep` có 0105 → (a) đỏ đúng dự kiến, sau chỗ sửa Step 5 → 8/8. Bài route / quyền / giao diện CHƯA chạy thử (cần mã sản phẩm).
15. **Ba lần trước** (bài số lạ, `giay-to-khong-lo-so`, `nhat-ky-hang`) đòi mọi cột N3 mới có bài sinh dữ liệu THẬT qua route (`PHU_TRACH`) — trong lúc chưa có route thì vào `MIEN` có lý do (Task 1 → Task 4 chuyển).

## Câu hỏi / ruling

Phần "Cần chủ trả lời" là điều chạm dữ liệu / quyền / pháp lý mà ADR chưa chốt. Kế hoạch đã chọn phương án **hẹp / an toàn** để thi công không bị chặn; chủ chọn khác thì sửa trước khi migration lên production (bảng mới rỗng, đổi được).

**Cần chủ trả lời (không chặn thi công; Q1 chặn việc BẬT trên production):**

- **Q1 — Bật tự khai trên production trước khi có đường xoá (H-5)?** `KE-HOACH-SUY-RA.md` "Cổng phát hành" đòi: tự khai / tải ảnh của người dùng và đường xoá lên cùng bản, hoặc đường xoá lên trước. H-3 KHÔNG thu ảnh (R1) nhưng thu số CCCD dạng chữ (N3) và ngày sinh, địa chỉ (N2). Đã chọn: mã H-3 lên production được, nhưng **tự khai chỉ BẬT khi Toàn quyền đăng chính sách riêng tư** (không gieo bản nào — không có chính sách thì không ai gửi được). Khuyến nghị: chủ KHÔNG đăng chính sách trên production trước khi (a) luật sư duyệt chữ chính sách, (b) H-5 có đường xoá. Ghi vào runbook `docs/HANDOFF-N1.md` (Task 6). Chủ muốn chặn bằng máy thì thêm bài "không route `/api/parties/cua-toi/phieu` khi thiếu route thực hiện phiếu xoá" — bài đó sẽ ĐỎ ngay hôm nay nên chưa dựng.
- **Q2 — Rút đồng ý thì phiếu đang chờ ra sao?** Đã chọn: rút đồng ý ⇒ **rút luôn mọi phiếu đang chờ của hồ sơ trong CÙNG lô** (giao diện báo trước bằng câu xác nhận); bất biến `R-PTY-13` canh "không phiếu đang chờ nào của người không còn đồng ý". Phương án khác: chặn rút đồng ý khi còn phiếu chờ (người dùng phải rút từng phiếu trước).
- **Q3 — Hồ sơ TỔ CHỨC (tài khoản công ty lữ hành, ADR-0018 đ9) tự khai?** Đã chọn: ở H-3 chỉ XEM (tên, liên hệ), không gửi phiếu, không đồng ý; câu "Hồ sơ tổ chức chưa tự khai được trên Nền tảng. Hãy báo quản trị viên để cập nhật." Khai tên pháp lý / MST / giấy phép là lát riêng (cần chủ quyết trường nào).
- **Q4 — Nơi đăng chính sách và hiệu lực.** Đã chọn: ô mới `party.privacy.policy` (chỉ Toàn quyền, tên tạm của TRANG-GHEP); khung "Đăng chính sách riêng tư mới" nằm trong khối "Hồ sơ của tôi" ở trang Tôi của Toàn quyền (không trang riêng — giữ trần gói). Hiệu lực = lúc đăng (không hẹn ngày tương lai; trigger chặn phiên bản mới hiệu lực lùi về trước bản cũ).
- **Q5 — Phiếu đang chờ khi có phiên bản chính sách mới.** Đã chọn ở H-3: phiếu giữ nguyên mã phiên bản người khai đã đồng ý lúc gửi (bằng chứng 5.21), không tự rút. Lát H-4 quyết người xác minh có xử lý phiếu của phiên bản cũ không (đề xuất: được, vì đồng ý lúc gửi còn hiệu lực trừ khi rút).

**Ruling đã áp (bề mặt, siết, hoặc đảo ngược được; ghi lại để người kiểm thấy):**

- **R0 — Lệch số lát.** Điều phối gọi lát này là **H-3**; `KE-HOACH-SUY-RA.md` gọi tự khai là **H-4** (và gộp cả xác minh vào đó). Kế hoạch này chỉ làm phần tự khai + chính sách + đồng ý; xác minh là "H-4" của điều phối (ADR-0125). Không sửa đặc tả (hồ sơ có ngày).
- **R1 — KHÔNG mở loại nối `SELF_SUBMISSION`; phiếu chỉ chữ.** Lý do: (a) cổng phát hành của `KE-HOACH-SUY-RA.md` ("không bao giờ có bản production thu ảnh giấy tờ mà chưa có đường xoá"); (b) `BL-TEP-PHAT-LAI-500` ghi "phải giải trước lát giao diện tải ảnh" (`src/shared/lan-gui-no.ts`); (c) ruling Q1 của H-2: tải ảnh chỉ Toàn quyền; (d) ảnh của phiếu chỉ người xác minh mở (ô `party.verify.attachment` — H-4). Trigger `pty_attachment_link_kind_ins` giữ nguyên (migration không có `DROP TRIGGER`). Thêm bài cổng phát hành (Task 1) xanh "rỗng" có chủ ý, canh lát sau.
- **R2 — Tên trạng thái** theo lời giao: `CHO_XAC_MINH → DA_CHAP_NHAN | TU_CHOI | RUT` (thay tên tạm `CHO / CHAP_NHAN` của `PHUONG-AN.md` §2.1).
- **R3 — Vòng đời phiếu (khuôn ruling Q3 của H-2):** không xoá dòng; NỘI DUNG (hồ sơ, loại, phiên bản chính sách, mọi trường khai, người khai, mốc tạo) bất biến; `status` đi MỘT chiều từ `CHO_XAC_MINH` sang một trong ba trạng thái cuối, cùng lúc `decided_at`, `decided_by` (`TU_CHOI` kèm `reason_code` — mã danh sách đóng của H-4). H-3 chỉ ghi `→ RUT`. H-4 cần thêm cột thì `ALTER TABLE … ADD COLUMN` (không dựng lại bảng chỉ-thêm); H-5 (ẩn danh hoá) tạo lại `pty_self_submission_content` / `_status_one_way` với điều kiện miễn hẹp (ADR-0126 đ3).
- **R4 — Một phiếu = một loại** (`NGAY_SINH` | `DIA_CHI` | `GIAY_TO`); tối đa MỘT phiếu đang chờ cho mỗi (hồ sơ, loại, loại giấy tờ). Loại là mã mở (`CHECK` khuôn) + trigger đóng ba loại — loại mới (vd họ tên, giới tính) mở bằng TẠO LẠI trigger (khuôn ruling R6 của H-2).
- **R5 — Chỉ hồ sơ CÁ NHÂN tự khai**: khoá ngoại `party_id → pty_person(party_id)` (lớp CSDL) + route 409 `self_person_only` (lớp máy chủ). Hồ sơ công ty chủ là hồ sơ tổ chức nên bị chặn theo cùng đường.
- **R6 — Phạm vi own:** hàng `tuPhucVu()` = `own` ×9 + SUPER_ADMIN `any`; route truyền `{ ownerId: staff.id }`, hồ sơ = `staff.partyId`. Toàn quyền vẫn chỉ được phục vụ hồ sơ của chính phiên.
- **R7 — N7, giấy tờ của chính mình (TRANG-GHEP: "chọn một").** Chọn: Đối tác / Tài xế đối tác xem giấy tờ của mình **qua `party.self.view`** (khối "Hồ sơ của tôi", số che, cùng hàm `listPersonDocuments` + `cheSo`). Ô `party.document.view` và route `GET /api/parties/documents/mine` KHÔNG đổi (Đối tác vẫn `none` ở ô đó; khối "Giấy tờ của tôi" của nhân viên nội bộ giữ nguyên). Một nguồn dữ liệu, hai lối đọc có ô riêng — nới cho Đối tác chỉ qua ô mới đúng như ADR-0124 Hệ quả.
- **R8 — Không kiểm trùng CCCD lúc gửi phiếu** (Review Focus 3): kiểm ở bước chấp nhận (H-4 — trigger 0032 "một CCCD một người" chặn lúc ghi vào `pty_person_document`; cờ cho người xác minh).
- **R9 — Không ô `party.erasure.request` ở H-3** (ADR-0124 đ4 liệt kê nhưng thuộc H-5): ô không route nào hỏi làm `src/permission-enforcement.test.ts` đỏ.
- **R10 — Không thêm mục vào `muc-giao-dien.ts`** (trần gói Đơn hàng); khối nằm thẳng ở trang Tôi như tiền lệ `#my-docs`.
- **R11 — Vá `INSERT OR REPLACE`** của `pty_consent`, `pty_privacy_policy`, `pty_verification` + trigger "phiên bản mới không hiệu lực lùi" của `pty_privacy_policy` (siết, cộng thêm).
- **R12 — "Giống giá trị hiện có"**: phiếu `NGAY_SINH` trùng ngày sinh đang có, `DIA_CHI` trùng (không phân biệt hoa thường) một địa chỉ đang mở ⇒ 409 `same_as_current`. Giấy tờ không kiểm (có thể là gia hạn).
- **R13 — Danh sách phiếu trả 50 phiếu mới nhất**; không trang thứ hai ở H-3.
- **R14 — Phiếu `GIAY_TO` dùng nguyên luật `kiemThemGiayTo`** (số theo loại, hạng bắt buộc với GPLX, ngày cấp / hết hạn); loại đã ngưng ⇒ 400.
- **R15 — Nhân sự (HR):** hai ô `own` mới là ô "của mọi tài khoản" (như `feedback.view`); bài ghim dòng HR thêm hai ô `own` + `party.privacy.policy = none`. Bài "HR đúng năm ô" thuộc H-4.
- **R16 — Hạng dữ liệu:** `birth_date`, `address_value` = **N2**; `document_number`, `number_key`, `issued_place` = **N3**; mọi cột khác = N1 (khớp `pty_person_document`).
- **R17 — Chữ DTO:** không trả lý do từ chối ở H-3 (danh sách đóng của H-4 chưa có).

## Bản đồ tệp

| Tệp | Tạo / sửa | Việc |
|---|---|---|
| `migrations/0105_ho_so_tu_khai.sql` | tạo | bảng phiếu + trigger + vá no_replace (Task 1) |
| `src/migrations-ho-so-tu-khai.test.ts` | tạo | bài migration (Task 1) |
| `src/migrations-ho-so-tep.test.ts` | sửa | bài (a) "đứng sau 0103" (Task 1) |
| `src/cong-phat-hanh-anh-tu-khai.test.ts` | tạo | cổng phát hành ảnh tự khai (Task 1) |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` | sửa / sinh lại | bảng + hạng (Task 1) |
| `src/hang-du-lieu.test.ts` | sửa | `N3_GHIM` (Task 1) |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | sửa | `COT_N3_NHAT_KY`, `R-PTY-13` (Task 1) |
| `tests/audit/nhat-ky-hang.mjs` | sửa | `MIEN` (Task 1) → `PHU_TRACH` (Task 4) |
| `src/modules/parties/tu-khai.ts` + `tu-khai.test.ts` | tạo | luật thuần (Task 2) |
| `src/shared/tu-khai-hien-thi.ts` + `tu-khai-hien-thi.test.ts` | tạo | nhãn dùng chung (Task 2) |
| `src/shared/permissions.ts`, `permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.ts` (sinh lại) | sửa | ba ô quyền (Task 3) |
| `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts` | sửa | DTO, năm hành động nhật ký (Task 3) |
| `src/modules/parties/repository.ts` | sửa | câu SQL chính sách / đồng ý / phiếu (Task 3, 4) |
| `src/modules/parties/index.ts` | sửa | năm route (Task 3, 4) |
| `src/modules/parties/tu-khai-route.test.ts` | tạo | bài route trên SQLite thật (Task 3, 4) |
| `src/route-access.test.ts` | sửa | ảnh chụp route (Task 3, 4) |
| `src/giay-to-khong-lo-so.test.ts` | sửa | bộ lọc + ca `cua-toi` + cột N3 mới (Task 4) |
| `src/tu-khai-khong-len-nhan.test.ts` | tạo | rào 5.23 (Task 4) |
| `web/ho-so-cua-toi.ts`, `web/account.ts`, `public/account.html`, `public/app.css` | tạo / sửa | khối "Hồ sơ của tôi" (Task 5) |
| `src/ho-so-cua-toi-giao-dien.test.ts` | tạo | rào tĩnh giao diện (Task 5) |
| `docs/evidence/2026-10-17-tu-khai/kich-ban/tu-khai-smoke.mjs` | tạo | kịch bản Chrome (Task 5) |
| `tests/e2e/tu-khai.mjs`, `tests/e2e/run.mjs` | tạo / sửa | e2e (Task 6) |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`, `docs/HANDOFF-N1.md`, `docs/BACKLOG.md`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts` | sửa | tài liệu, sổ hàng rào, runbook, nhật ký thay đổi 2.12 tạm (Task 6) |

## Nhóm giao, loại việc và người kiểm

| Nhóm | Task | Loại | Người kiểm độc lập (vai `nguoi-kiem-doc-lap`, chỉ đọc) |
|---|---|---|---|
| A | 1. Migration 0105 + sổ dữ liệu + bất biến + cổng phát hành | **VIỆC LỚN (dữ liệu)** | **bắt buộc ngay sau Task 1** |
| B | 2. Luật thuần + nhãn | nhỏ | gộp vào kiểm nhóm C |
| B | 3. Ô quyền + chính sách + đồng ý + "Hồ sơ của tôi" (GET) | **VIỆC LỚN (quyền, dữ liệu)** | gộp vào kiểm nhóm C |
| C | 4. Phiếu tự khai: gửi / rút + rào 5.23 + không lộ số | **VIỆC LỚN (quyền, dữ liệu)** | **bắt buộc ngay sau Task 4, phủ Task 2–4** |
| D | 5. Giao diện trang Tôi + kịch bản Chrome | nhỏ (giao diện) | gộp vào kiểm cuối |
| D | 6. E2E, tài liệu, sổ hàng rào, phá thử, bộ kiểm đủ | nghiệm thu | **kiểm cuối lát, phủ toàn lát** |

Người thi công KHÔNG tự nghiệm thu (N8): chỉ báo "đạt" dựa trên báo cáo người kiểm + test.

**Giới hạn không kiểm được ở lát này:** (a) không chạy trên D1 production (AI không chạy lệnh remote) — thứ tự trigger và `COALESCE` trong chỉ mục duy nhất một phần chỉ thử trên SQLite của Node và D1 local của `wrangler dev`; (b) kịch bản Chrome cần Chrome + axe ngoài repo — không có thì ghi **"chưa kiểm giao diện"**, không khai đạt; (c) chưa thử iPhone thật (ô ngày `type="date"` của Safari); (d) chữ chính sách là chữ thử — văn bản thật do chủ + luật sư; (e) tải ≈ 60 KB chính sách trên mạng di động chưa đo; (f) không có người dùng thật đọc câu chữ — chủ duyệt một lượt bằng ảnh.

---

### Task 1: Migration 0105 — `pty_self_submission`, vá no_replace, sổ dữ liệu, bất biến R-PTY-13, cổng phát hành (VIỆC LỚN — dữ liệu)

**Files:**
- Create: `migrations/0105_ho_so_tu_khai.sql`
- Create: `src/migrations-ho-so-tu-khai.test.ts`
- Create: `src/cong-phat-hanh-anh-tu-khai.test.ts`
- Modify: `src/migrations-ho-so-tep.test.ts` (bài (a))
- Modify: `docs/data-dictionary.json` (mảng `tables`, khoá `hangDuLieu`); Regenerate: `docs/DATA-DICTIONARY.md` (`npm run dict`)
- Modify: `src/hang-du-lieu.test.ts` (`N3_GHIM`)
- Modify: `scripts/audit-checks.mjs` (`COT_N3_NHAT_KY`, mục `R-PTY-13` ngay sau `R-PTY-12`)
- Modify: `src/audit-invariants.test.ts` (bài `R-PTY-13`)
- Modify: `tests/audit/nhat-ky-hang.mjs` (`MIEN`)

**Interfaces:**
- Consumes: `pty_person`, `pty_privacy_policy`, `pty_consent`, `pty_person_document_type`, `pty_license_class`, `pty_verification`, `pty_attachment(_link)` (migration 0032, 0103, 0104).
- Produces (task sau dựa vào đúng tên này):
  - Bảng `pty_self_submission(id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date, status, decided_at, decided_by, reason_code, created_at, created_by, updated_at, updated_by)`.
  - Mã lỗi trigger: `self_submission_kind_closed`, `self_submission_new_not_pending`, `self_submission_no_consent`, `self_submission_pending_exists`, `self_submission_no_replace`, `self_submission_no_delete`, `self_submission_content`, `self_submission_status_one_way`, `consent_no_replace`, `privacy_policy_no_replace`, `privacy_policy_valid_from_back`, `verification_no_replace`.
  - Kiểm định kỳ `R-PTY-13` (fail).

- [ ] **Step 1: Viết bài đỏ `src/migrations-ho-so-tu-khai.test.ts`**

```ts
// Kiểm migration phiếu tự khai (ADR-0124, ADR-0126 đ1; module parties; lát H-3 Gói 2). Chèn / sửa THẲNG bằng SQL — chứng minh chặn nằm ở CSDL (lớp cuối nếu route có
// lỗ). Tệp tìm theo ĐUÔI tên. Vòng đời (ruling R3 kế hoạch 2026-10-17-goi-2-h3-tu-khai): nội dung bất biến, trạng thái một chiều. Mỗi ca chỉ để ĐÚNG MỘT điều kiện
// trigger sai (thứ tự chạy giữa các trigger BEFORE INSERT không được tài liệu hoá). Mọi giá trị là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ho_so_tu_khai.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.slice(0, files.indexOf(FILE)));
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));
const cotCua = (db: DatabaseSync, t: string): string[] => rows(db, `PRAGMA table_info(${t})`).map((r) => String(r.name));
const AT = "2026-10-17T03:00:00.000Z";
const AT2 = "2026-10-17T03:05:00.000Z";
const AT3 = "2026-10-17T03:10:00.000Z";
let n = 0;

function nguoi(db: DatabaseSync, id: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, `Người ${id}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, `Người ${id}`, AT, AT);
  return id;
}
function toChuc(db: DatabaseSync, id: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, `Tổ chức ${id}`, AT, AT);
  db.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  return id;
}
const chinhSach = (db: DatabaseSync, id: string, version: number, at = AT) =>
  db.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'Mục đích thử', 'Toàn văn thử', ?, ?, 's-sup', ?, 's-sup')`).run(id, version, at, at, at);
const dongY = (db: DatabaseSync, party: string, policy: string, decision = "DONG_Y", at = AT) =>
  db.prepare(`INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 's-1', ?, 's-1')`)
    .run(`c-${++n}`, party, policy, decision, at, at);
function phieu(db: DatabaseSync, party: string, x: Record<string, unknown> = {}): string {
  const id = String(x.id ?? `ph-${++n}`);
  const kind = String(x.subject_kind ?? "NGAY_SINH");
  const v: Record<string, unknown> = {
    policy_id: "pol-1", birth_date: kind === "NGAY_SINH" ? "1990-05-06" : null, address_value: kind === "DIA_CHI" ? "1 Đường Thử" : null,
    document_type_code: kind === "GIAY_TO" ? "HEALTH_CHECK" : null, document_number: null, number_key: null, license_class_code: null,
    issued_date: null, issued_place: null, expiry_date: null, status: "CHO_XAC_MINH", decided_at: null, decided_by: null, reason_code: null, created_by: "s-1", ...x,
  };
  db.prepare(`INSERT ${x.orReplace ? "OR REPLACE " : ""}INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code,
      document_number, number_key, license_class_code, issued_date, issued_place, expiry_date, status, decided_at, decided_by, reason_code, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, party, kind, v.policy_id as string, v.birth_date as string | null, v.address_value as string | null, v.document_type_code as string | null,
    v.document_number as string | null, v.number_key as string | null, v.license_class_code as string | null, v.issued_date as string | null,
    v.issued_place as string | null, v.expiry_date as string | null, v.status as string, v.decided_at as string | null, v.decided_by as string | null,
    v.reason_code as string | null, AT, v.created_by as string | null, AT, "s-1",
  );
  return id;
}
/** Người p1 + chính sách v1 + p1 đã đồng ý v1. */
function coBan(): DatabaseSync {
  const db = all();
  nguoi(db, "p1");
  chinhSach(db, "pol-1", 1);
  dongY(db, "p1", "pol-1");
  return db;
}
const trangThai = (db: DatabaseSync, id: string) => rows(db, "SELECT status FROM pty_self_submission WHERE id = ?", id)[0]?.status;

test("(a) đúng MỘT tệp đuôi _ho_so_tu_khai.sql, là tệp mới nhất; chỉ THÊM: không DROP, không ALTER TABLE, không INSERT gieo dữ liệu", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp *_ho_so_tu_khai.sql, thấy ${MATCHES.join(", ")}`);
  assert.equal(files.at(-1), FILE, "migration tự khai phải là tệp mới nhất của nhánh");
  const code = sqlOf(FILE).split("\n").filter((d) => !d.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(code, /\bDROP\b/i);
  assert.doesNotMatch(code, /\bALTER\s+TABLE\b/i);
  assert.doesNotMatch(code, /^\s*INSERT\b/im, "không gieo chính sách / phiếu (ADR-0126 đ1, đ2)");
});

test("(b) cột của pty_self_submission đúng như kế hoạch; không cột thời hạn xoá", () => {
  const db = all();
  assert.deepEqual(cotCua(db, "pty_self_submission"), [
    "id", "party_id", "subject_kind", "policy_id", "birth_date", "address_value", "document_type_code", "document_number", "number_key", "license_class_code",
    "issued_date", "issued_place", "expiry_date", "status", "decided_at", "decided_by", "reason_code", "created_at", "created_by", "updated_at", "updated_by",
  ]);
});

test("(c) đúng tập trigger mới; trigger cũ của 0103 / 0104 còn nguyên", () => {
  const db = before();
  const truoc = new Set(triggers(db));
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.has(t)), [
    "pty_consent_no_replace", "pty_privacy_policy_no_replace", "pty_privacy_policy_valid_from_ins",
    "pty_self_submission_consent_ins", "pty_self_submission_content", "pty_self_submission_kind_ins",
    "pty_self_submission_no_delete", "pty_self_submission_no_replace", "pty_self_submission_one_pending_ins", "pty_self_submission_status_ins", "pty_self_submission_status_one_way",
    "pty_verification_no_replace",
  ]);
  for (const t of truoc) assert.ok(triggers(db).includes(t), `trigger cũ ${t} bị mất`);
});

test("(d) đường đúng: ba loại phiếu của người đã đồng ý phiên bản hiện hành", () => {
  const db = coBan();
  phieu(db, "p1");
  phieu(db, "p1", { subject_kind: "DIA_CHI" });
  phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "CCCD", document_number: "079 000 000 111", number_key: "079000000111", issued_place: "Nơi cấp thử", issued_date: "2020-01-01", expiry_date: "2035-01-01" });
  assert.equal(rows(db, "SELECT count(*) n FROM pty_self_submission WHERE status = 'CHO_XAC_MINH'")[0]!.n, 3);
});

test("(e) đồng ý: chưa đồng ý / đã rút / người KHÁC đồng ý / phiên bản cũ ⇒ self_submission_no_consent; đồng ý lại ⇒ được", () => {
  const db = all();
  nguoi(db, "p1");
  nguoi(db, "p2");
  chinhSach(db, "pol-1", 1);
  assert.throws(() => phieu(db, "p1"), /self_submission_no_consent/, "chưa đồng ý");
  dongY(db, "p2", "pol-1");
  assert.throws(() => phieu(db, "p1"), /self_submission_no_consent/, "người khác đồng ý không tính");
  dongY(db, "p1", "pol-1", "DONG_Y", AT);
  dongY(db, "p1", "pol-1", "RUT", AT2);
  assert.throws(() => phieu(db, "p1"), /self_submission_no_consent/, "đã rút");
  dongY(db, "p1", "pol-1", "DONG_Y", AT3);
  phieu(db, "p1");
  chinhSach(db, "pol-2", 2, AT3);
  assert.throws(() => phieu(db, "p1", { subject_kind: "DIA_CHI" }), /self_submission_no_consent/, "phiếu ghi phiên bản cũ khi đã có phiên bản mới");
  assert.throws(() => phieu(db, "p1", { subject_kind: "DIA_CHI", policy_id: "pol-2" }), /self_submission_no_consent/, "chưa đồng ý phiên bản mới");
  dongY(db, "p1", "pol-2", "DONG_Y", AT3);
  phieu(db, "p1", { subject_kind: "DIA_CHI", policy_id: "pol-2" });
});

test("(f) CHECK hình dạng: trường phải khớp loại; ngày, độ dài, số + khoá số cùng có; hồ sơ tổ chức bị khoá ngoại chặn", () => {
  const db = coBan();
  toChuc(db, "o1");
  dongY(db, "o1", "pol-1");
  for (const [ten, party, x] of [
    ["NGAY_SINH thiếu ngày", "p1", { birth_date: null }],
    ["NGAY_SINH kèm địa chỉ", "p1", { address_value: "1 Đường Thử" }],
    ["ngày sinh trước 1900", "p1", { birth_date: "1899-12-31" }],
    ["ngày sinh sai khuôn", "p1", { birth_date: "06/05/1990" }],
    ["DIA_CHI 201 ký tự", "p1", { subject_kind: "DIA_CHI", address_value: "a".repeat(201) }],
    ["GIAY_TO số không khoá", "p1", { subject_kind: "GIAY_TO", document_number: "123" }],
    ["GIAY_TO hết hạn trước ngày cấp", "p1", { subject_kind: "GIAY_TO", issued_date: "2020-01-02", expiry_date: "2020-01-01" }],
    ["NGAY_SINH kèm ngày cấp", "p1", { issued_date: "2020-01-01" }],
    ["khoá số chữ thường", "p1", { subject_kind: "GIAY_TO", document_number: "ab12", number_key: "ab12" }],
    ["CCCD không số (luật 0032)", "p1", { subject_kind: "GIAY_TO", document_type_code: "CCCD" }],
    ["GPLX thiếu hạng (luật 0032)", "p1", { subject_kind: "GIAY_TO", document_type_code: "GPLX", document_number: "790000000111", number_key: "790000000111" }],
    ["hạng kèm loại không phải GPLX", "p1", { subject_kind: "GIAY_TO", license_class_code: "B" }],
    ["không người khai", "p1", { created_by: null }],
  ] as const) assert.throws(() => phieu(db, party, x as Record<string, unknown>), /CHECK constraint failed/, ten);
  assert.throws(() => phieu(db, "o1"), /FOREIGN KEY constraint failed/, "hồ sơ tổ chức (ruling R5)");
  assert.throws(() => phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "KHONG_CO" }), /FOREIGN KEY constraint failed/, "loại giấy tờ lạ");
});

test("(g) loại phiếu đóng: HO_TEN ⇒ self_submission_kind_closed; chữ thường ⇒ CHECK", () => {
  const db = coBan();
  assert.throws(() => phieu(db, "p1", { subject_kind: "HO_TEN", birth_date: null }), /self_submission_kind_closed/);
  assert.throws(() => phieu(db, "p1", { subject_kind: "ngay_sinh", birth_date: null }), /CHECK constraint failed/);
});

test("(h) phiếu mới luôn ở CHO_XAC_MINH", () => {
  const db = coBan();
  assert.throws(() => phieu(db, "p1", { status: "RUT", decided_at: AT, decided_by: "s-1" }), /self_submission_new_not_pending/);
});

test("(i) một phiếu đang chờ mỗi (hồ sơ, loại, loại giấy tờ); INSERT OR REPLACE không ghi đè", () => {
  const db = coBan();
  const a = phieu(db, "p1");
  assert.throws(() => phieu(db, "p1", { birth_date: "1991-01-01" }), /self_submission_pending_exists/);
  phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "CCCD", document_number: "079000000111", number_key: "079000000111" });
  phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "HEALTH_CHECK" }); // loại giấy tờ khác: được
  db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = 's-1', updated_at = ? WHERE id = ?").run(AT2, AT2, a);
  const b = phieu(db, "p1", { birth_date: "1991-01-01" }); // đã rút phiếu cũ: khai lại được
  assert.throws(() => phieu(db, "p1", { id: a, subject_kind: "DIA_CHI", orReplace: true }), /self_submission_no_replace/);
  assert.equal(trangThai(db, a), "RUT", "dòng cũ còn nguyên sau INSERT OR REPLACE bị chặn");
  assert.equal(trangThai(db, b), "CHO_XAC_MINH");
});

test("(j) bất biến: không xoá; không sửa nội dung; trạng thái chỉ đi một chiều, kèm mốc / người xử lý / lý do từ chối", () => {
  const db = coBan();
  const a = phieu(db, "p1");
  assert.throws(() => db.prepare("DELETE FROM pty_self_submission WHERE id = ?").run(a), /self_submission_no_delete/);
  // Sửa nội dung KÈM chuyển trạng thái hợp lệ — để chỉ trigger nội dung sai (chạm dòng đang chờ mà không đổi trạng thái thì trigger một chiều cũng bắn; thứ tự không định).
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET birth_date = '1991-01-01', status = 'RUT', decided_at = ?, decided_by = 's-1' WHERE id = ?").run(AT2, a), /self_submission_content/);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET policy_id = 'pol-x', status = 'RUT', decided_at = ?, decided_by = 's-1' WHERE id = ?").run(AT2, a), /self_submission_content/);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET updated_at = ? WHERE id = ?").run(AT2, a), /self_submission_status_one_way/, "chạm dòng đang chờ mà không đổi trạng thái");
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'RUT' WHERE id = ?").run(a), /CHECK constraint failed/, "rút thiếu mốc / người");
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', decided_at = ?, decided_by = 's-2' WHERE id = ?").run(AT2, a), /CHECK constraint failed/, "từ chối thiếu lý do");
  db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = 's-1', updated_at = ?, updated_by = 's-1' WHERE id = ?").run(AT2, AT2, a);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'CHO_XAC_MINH', decided_at = NULL, decided_by = NULL WHERE id = ?").run(a), /self_submission_status_one_way/);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'DA_CHAP_NHAN', decided_at = ?, decided_by = 's-2' WHERE id = ?").run(AT3, a), /self_submission_status_one_way/);
});

test("(k) vá INSERT OR REPLACE của 0103 (ruling R11) + phiên bản chính sách không hiệu lực lùi", () => {
  const db = coBan();
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c-x', 'p1', 'pol-1', 'DONG_Y', ?, 's-1', ?, 's-1')").run(AT, AT);
  assert.throws(() => db.prepare("INSERT OR REPLACE INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c-x', 'p1', 'pol-1', 'DONG_Y', ?, 's-2', ?, 's-2')").run(AT2, AT2), /consent_no_replace/);
  assert.throws(() => db.prepare(`INSERT OR REPLACE INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('pol-1', 2, 'x', 'y', ?, ?, 's-sup', ?, 's-sup')`).run(AT2, AT2, AT2), /privacy_policy_no_replace/);
  assert.equal(rows(db, "SELECT version FROM pty_privacy_policy WHERE id = 'pol-1'")[0]!.version, 1, "bản cũ còn nguyên");
  chinhSach(db, "pol-2", 2, AT3);
  assert.throws(() => chinhSach(db, "pol-3", 3, AT2), /privacy_policy_valid_from_back/);
  db.prepare(`INSERT INTO pty_verification (id, party_id, target_kind, attribute_code, outcome, created_at, created_by, updated_at, updated_by)
    VALUES ('v-1', 'p1', 'ATTRIBUTE', 'NGAY_SINH', 'DA_XAC_MINH', ?, 's-2', ?, 's-2')`).run(AT, AT);
  assert.throws(() => db.prepare(`INSERT OR REPLACE INTO pty_verification (id, party_id, target_kind, attribute_code, outcome, created_at, created_by, updated_at, updated_by)
    VALUES ('v-1', 'p1', 'ATTRIBUTE', 'NGAY_SINH', 'DA_XAC_MINH', ?, 's-3', ?, 's-3')`).run(AT2, AT2), /verification_no_replace/);
});

test("(l) ruling R1: loại nối ảnh SELF_SUBMISSION VẪN đóng sau 0105", () => {
  const db = coBan();
  const a = phieu(db, "p1");
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES ('t-1', 'p1', ?, 'png', 1, ?, ?, 's-1', ?, 's-1')`).run(`pty/${"0".repeat(32)}`, "a".repeat(64), AT, AT);
  assert.throws(() => db.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES ('t-1', 'SELF_SUBMISSION', ?, ?, 's-1', ?, 's-1')").run(a, AT, AT), /attachment_link_kind_closed/);
});
```

- [ ] **Step 2: Chạy bài — phải đỏ**

Run: `node --test src/migrations-ho-so-tu-khai.test.ts`
Expected: FAIL — `MATCHES.length` 0 (`cần đúng một tệp *_ho_so_tu_khai.sql, thấy `), các bài khác ném `FILE` undefined.

- [ ] **Step 3: Viết `migrations/0105_ho_so_tu_khai.sql`**

```sql
-- Migration 0105 — ADR-0124 (accepted 2026-10-16) + ADR-0126 điều 1 (accepted 2026-10-16): phiếu TỰ KHAI hồ sơ (lát H-3 Gói 2). CHỈ THÊM. Module parties.
-- KHÔNG gieo chính sách riêng tư, KHÔNG gieo phiếu, KHÔNG có cột / con số thời hạn xoá (ADR-0126 đ2 — lát H-5, chờ luật sư).
-- Giá trị khai là ĐỀ XUẤT (Hiến chương 5.23): nằm ở phiếu, KHÔNG ghi vào pty_person / pty_contact_point / pty_person_document cho tới khi người KHÁC xác minh (lát H-4).
-- Hạng (5.20): birth_date, address_value N2; document_number, number_key, issued_place N3 — KHÔNG BAO GIỜ vào nhật ký, view công bố, câu báo lỗi. Bảng KHÔNG có view v_pty_*.
-- Trigger chỉ đọc bảng pty_* (5.3). Người khai / người xử lý ở created_by / decided_by — không khoá ngoại sang staff (ADR-0003).
-- Vòng đời (ruling R3 kế hoạch 2026-10-17-goi-2-h3-tu-khai): NỘI DUNG bất biến; status đi MỘT chiều CHO_XAC_MINH → DA_CHAP_NHAN | TU_CHOI | RUT, cùng lúc decided_at +
-- decided_by (TU_CHOI kèm reason_code — danh sách đóng của lát H-4). Lát H-3 chỉ ghi → RUT. Ảnh của phiếu: loại nối SELF_SUBMISSION của 0104 VẪN ĐÓNG (ruling R1).

CREATE TABLE pty_self_submission (
  id                  TEXT PRIMARY KEY,
  party_id            TEXT NOT NULL REFERENCES pty_person(party_id),     -- chỉ hồ sơ CÁ NHÂN (ruling R5); = staff.party_id của phiên lúc gửi
  subject_kind        TEXT NOT NULL CHECK (subject_kind = upper(subject_kind) AND length(subject_kind) BETWEEN 2 AND 30 AND subject_kind NOT GLOB '*[^A-Z_]*'),
  policy_id           TEXT NOT NULL REFERENCES pty_privacy_policy(id),    -- phiên bản chính sách người khai ĐÃ đồng ý lúc gửi (5.21)
  birth_date          TEXT CHECK (birth_date IS NULL OR (date(birth_date) IS birth_date AND birth_date >= '1900-01-01')),
  address_value       TEXT CHECK (address_value IS NULL OR length(trim(address_value)) BETWEEN 1 AND 200),
  document_type_code  TEXT REFERENCES pty_person_document_type(code),
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 40),
  number_key          TEXT CHECK (number_key IS NULL OR (number_key = upper(number_key) AND length(number_key) BETWEEN 1 AND 40)),
  license_class_code  TEXT REFERENCES pty_license_class(code),
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) IS issued_date),
  issued_place        TEXT CHECK (issued_place IS NULL OR length(trim(issued_place)) BETWEEN 1 AND 200),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) IS expiry_date),
  status              TEXT NOT NULL CHECK (status IN ('CHO_XAC_MINH', 'DA_CHAP_NHAN', 'TU_CHOI', 'RUT')),
  decided_at          TEXT,
  decided_by          TEXT,
  reason_code         TEXT CHECK (reason_code IS NULL OR (reason_code = upper(reason_code) AND length(reason_code) BETWEEN 2 AND 40 AND reason_code NOT GLOB '*[^A-Z0-9_]*')),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((subject_kind = 'NGAY_SINH') = (birth_date IS NOT NULL)),
  CHECK ((subject_kind = 'DIA_CHI') = (address_value IS NOT NULL)),
  CHECK ((subject_kind = 'GIAY_TO') = (document_type_code IS NOT NULL)),
  CHECK (subject_kind = 'GIAY_TO' OR (number_key IS NULL AND license_class_code IS NULL AND issued_date IS NULL AND issued_place IS NULL AND expiry_date IS NULL)),
  CHECK ((document_number IS NULL) = (number_key IS NULL)),
  -- Cùng luật hình dạng của pty_person_document (0032) để phiếu được chấp nhận ở H-4 không vỡ CHECK lúc chép sang: CCCD / GPLX bắt buộc số; hạng chỉ và bắt buộc với GPLX.
  CHECK (document_number IS NOT NULL OR document_type_code IS NULL OR document_type_code NOT IN ('CCCD', 'GPLX')),
  CHECK ((document_type_code IS 'GPLX') = (license_class_code IS NOT NULL)),
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK ((status = 'CHO_XAC_MINH') = (decided_at IS NULL)),
  CHECK ((status = 'CHO_XAC_MINH') = (decided_by IS NULL)),
  CHECK ((status = 'TU_CHOI') = (reason_code IS NOT NULL))
);
CREATE INDEX pty_self_submission_party_ix ON pty_self_submission(party_id, created_at);
CREATE INDEX pty_self_submission_cho_ix ON pty_self_submission(created_at) WHERE status = 'CHO_XAC_MINH';   -- hàng chờ của lát H-4
CREATE UNIQUE INDEX pty_self_submission_one_pending_uq ON pty_self_submission(party_id, subject_kind, COALESCE(document_type_code, '')) WHERE status = 'CHO_XAC_MINH';

-- Loại phiếu MỞ: ba loại của lát H-3 (mã mở — khuôn ruling R6 của H-2: loại mới mở bằng TẠO LẠI trigger, không dựng lại bảng chỉ-thêm). Sai khuôn thì để CHECK báo.
CREATE TRIGGER pty_self_submission_kind_ins BEFORE INSERT ON pty_self_submission
WHEN NEW.subject_kind NOT IN ('NGAY_SINH', 'DIA_CHI', 'GIAY_TO')
  AND NEW.subject_kind = upper(NEW.subject_kind) AND length(NEW.subject_kind) BETWEEN 2 AND 30 AND NEW.subject_kind NOT GLOB '*[^A-Z_]*'
BEGIN SELECT RAISE(ABORT, 'self_submission_kind_closed: loại phiếu này chưa mở'); END;
CREATE TRIGGER pty_self_submission_status_ins BEFORE INSERT ON pty_self_submission
WHEN NEW.status <> 'CHO_XAC_MINH'
BEGIN SELECT RAISE(ABORT, 'self_submission_new_not_pending: phiếu mới phải ở trạng thái chờ xác minh'); END;
-- Đồng ý (5.21, ADR-0124 đ3) — lớp CSDL (lớp máy chủ: route + lính gác trong câu ghi): quyết định MỚI NHẤT của chính hồ sơ với ĐÚNG phiên bản ghi trên phiếu là DONG_Y,
-- và phiên bản đó là phiên bản LỚN NHẤT (route chỉ đăng chính sách hiệu lực ngay — ruling Q4).
CREATE TRIGGER pty_self_submission_consent_ins BEFORE INSERT ON pty_self_submission
WHEN COALESCE((SELECT c.decision FROM pty_consent c WHERE c.party_id = NEW.party_id AND c.policy_id = NEW.policy_id ORDER BY c.created_at DESC, c.rowid DESC LIMIT 1), '') <> 'DONG_Y'
  OR NEW.policy_id IS NOT (SELECT p.id FROM pty_privacy_policy p ORDER BY p.version DESC LIMIT 1)
BEGIN SELECT RAISE(ABORT, 'self_submission_no_consent: chưa đồng ý phiên bản chính sách riêng tư hiện hành'); END;
-- Một phiếu ĐANG CHỜ mỗi (hồ sơ, loại, loại giấy tờ) — chạy TRƯỚC xử lý xung đột nên bắt cả INSERT OR REPLACE (bài học 0104). Thông điệp giữ chữ UNIQUE.
CREATE TRIGGER pty_self_submission_one_pending_ins BEFORE INSERT ON pty_self_submission
WHEN EXISTS (SELECT 1 FROM pty_self_submission s WHERE s.party_id = NEW.party_id AND s.subject_kind = NEW.subject_kind
               AND COALESCE(s.document_type_code, '') = COALESCE(NEW.document_type_code, '') AND s.status = 'CHO_XAC_MINH')
BEGIN SELECT RAISE(ABORT, 'self_submission_pending_exists: UNIQUE — đã có phiếu cùng loại đang chờ xác minh'); END;
CREATE TRIGGER pty_self_submission_no_replace BEFORE INSERT ON pty_self_submission
WHEN EXISTS (SELECT 1 FROM pty_self_submission s WHERE s.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'self_submission_no_replace: UNIQUE — mã phiếu đã có, không ghi đè'); END;
CREATE TRIGGER pty_self_submission_no_delete BEFORE DELETE ON pty_self_submission
BEGIN SELECT RAISE(ABORT, 'self_submission_no_delete: phiếu tự khai không xoá'); END;
-- Nội dung bất biến (lát H-5 tạo lại trigger này với điều kiện miễn hẹp của lệnh ẩn danh hoá — ADR-0126 đ3).
CREATE TRIGGER pty_self_submission_content BEFORE UPDATE ON pty_self_submission
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.subject_kind IS NOT OLD.subject_kind OR NEW.policy_id IS NOT OLD.policy_id
  OR NEW.birth_date IS NOT OLD.birth_date OR NEW.address_value IS NOT OLD.address_value OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.document_number IS NOT OLD.document_number OR NEW.number_key IS NOT OLD.number_key OR NEW.license_class_code IS NOT OLD.license_class_code
  OR NEW.issued_date IS NOT OLD.issued_date OR NEW.issued_place IS NOT OLD.issued_place OR NEW.expiry_date IS NOT OLD.expiry_date
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'self_submission_content: nội dung phiếu tự khai không sửa — rút rồi khai phiếu mới'); END;
-- Trạng thái một chiều: chỉ dòng ĐANG CHỜ được đổi, và phải đổi SANG trạng thái cuối (không "chạm" dòng đang chờ, không mở lại dòng đã xong).
CREATE TRIGGER pty_self_submission_status_one_way BEFORE UPDATE ON pty_self_submission
WHEN OLD.status <> 'CHO_XAC_MINH' OR NEW.status = 'CHO_XAC_MINH'
BEGIN SELECT RAISE(ABORT, 'self_submission_status_one_way: phiếu đã xử lý hoặc đã rút — không đổi trạng thái'); END;

-- Vá lỗ INSERT OR REPLACE của ba bảng chỉ-thêm ở 0103 (ruling R11; người kiểm nhóm A lát H-2 nêu): REPLACE xoá dòng cũ mà không chạy trigger xoá.
CREATE TRIGGER pty_consent_no_replace BEFORE INSERT ON pty_consent
WHEN EXISTS (SELECT 1 FROM pty_consent c WHERE c.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'consent_no_replace: UNIQUE — mã dòng đồng ý đã có, không ghi đè'); END;
CREATE TRIGGER pty_privacy_policy_no_replace BEFORE INSERT ON pty_privacy_policy
WHEN EXISTS (SELECT 1 FROM pty_privacy_policy p WHERE p.id = NEW.id OR p.version = NEW.version)
BEGIN SELECT RAISE(ABORT, 'privacy_policy_no_replace: UNIQUE — mã hoặc phiên bản chính sách đã có, không ghi đè'); END;
CREATE TRIGGER pty_privacy_policy_valid_from_ins BEFORE INSERT ON pty_privacy_policy
WHEN NEW.valid_from_at < COALESCE((SELECT MAX(p.valid_from_at) FROM pty_privacy_policy p), '')
BEGIN SELECT RAISE(ABORT, 'privacy_policy_valid_from_back: phiên bản mới không được hiệu lực trước phiên bản cũ'); END;
CREATE TRIGGER pty_verification_no_replace BEFORE INSERT ON pty_verification
WHEN EXISTS (SELECT 1 FROM pty_verification v WHERE v.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'verification_no_replace: UNIQUE — mã dòng xác minh đã có, không ghi đè'); END;
```

- [ ] **Step 4: Chạy bài migration — phải xanh**

Run: `node --test src/migrations-ho-so-tu-khai.test.ts`
Expected: PASS 12/12. Nếu một ca nhận thông điệp của trigger khác (thứ tự trigger), KHÔNG nới regex — sửa dữ liệu ca để chỉ một điều kiện sai.

- [ ] **Step 5: Sửa bài (a) của `src/migrations-ho-so-tep.test.ts` (chắc đỏ — sự thật 7)**

Thay dòng `assert.equal(files.at(-1), FILE, "migration kho tệp phải là tệp mới nhất của nhánh");` bằng:

```ts
  // Lát H-3 (0105) đứng sau tệp này: chỉ còn đòi kho tệp đứng SAU hồ sơ mở rộng (0103) mà nó dựa vào (kế hoạch 2026-10-17-goi-2-h3-tu-khai, sự thật 7).
  assert.ok(files.indexOf(FILE) > files.findIndex((f) => f.endsWith("_ho_so_mo_rong.sql")), "migration kho tệp phải đứng sau migration hồ sơ mở rộng");
```

Run: `node --test src/migrations-ho-so-tep.test.ts` — Expected: PASS.

- [ ] **Step 6: Viết bài đỏ cho sổ dữ liệu + bất biến**

`src/hang-du-lieu.test.ts` — thêm vào `N3_GHIM` (giữ thứ tự chữ cái):

```ts
  "pty_self_submission.document_number", "pty_self_submission.issued_place", "pty_self_submission.number_key",
```

`src/audit-invariants.test.ts` — thêm sau hai bài `R-PTY-12`:

```ts
test("R-PTY-13 (ADR-0124 đ3, Hiến chương 5.21): phiếu tự khai ĐANG CHỜ của người đã rút / chưa từng đồng ý phiên bản ghi trên phiếu — fail", () => {
  const c = one("R-PTY-13");
  assert.equal(c.level, "fail");
  const db = build();
  NGUOI_T(db, "p-tk");
  const at = "2026-10-17T03:00:00.000Z";
  db.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol-tk', 1, 'thử', 'thử', ?, ?, 's', ?, 's')").run(at, at, at);
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c1', 'p-tk', 'pol-tk', 'DONG_Y', ?, 's', ?, 's')").run(at, at);
  db.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, created_at, created_by, updated_at, updated_by)
    VALUES ('ph1', 'p-tk', 'NGAY_SINH', 'pol-tk', '1990-01-01', 'CHO_XAC_MINH', ?, 's', ?, 's')`).run(at, at);
  assert.equal(violations(db, c), 0);
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c2', 'p-tk', 'pol-tk', 'RUT', '2026-10-17T03:05:00.000Z', 's', '2026-10-17T03:05:00.000Z', 's')").run();
  assert.equal(violations(db, c), 1, "rút đồng ý mà phiếu vẫn chờ (route phải rút phiếu cùng lô)");
  db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = '2026-10-17T03:05:00.000Z', decided_by = 's', updated_at = '2026-10-17T03:05:00.000Z' WHERE id = 'ph1'").run();
  assert.equal(violations(db, c), 0, "phiếu đã rút không tính");
});
```

`tests/audit/nhat-ky-hang.mjs` — thêm vào `MIEN`:

```js
  "pty_self_submission.document_number": "lát H-3 Task 1 chỉ có bảng — Task 4 (route gửi phiếu) chuyển sang PHU_TRACH: src/giay-to-khong-lo-so.test.ts",
  "pty_self_submission.number_key": "lát H-3 Task 1 chỉ có bảng — Task 4 (route gửi phiếu) chuyển sang PHU_TRACH: src/giay-to-khong-lo-so.test.ts",
  "pty_self_submission.issued_place": "lát H-3 Task 1 chỉ có bảng — Task 4 (route gửi phiếu) chuyển sang PHU_TRACH: src/giay-to-khong-lo-so.test.ts",
```

Run: `node --test src/hang-du-lieu.test.ts src/audit-invariants.test.ts`
Expected: FAIL — hang-du-lieu "cột chưa có hạng" (21 cột `pty_self_submission.*`) và N3 ghim lệch; audit-invariants `one("R-PTY-13")` không tìm thấy.

- [ ] **Step 7: Sổ dữ liệu + kiểm định kỳ**

`docs/data-dictionary.json` — thêm vào mảng `tables` (cạnh các bảng `pty_*`):

```json
{ "name": "pty_self_submission", "module": "parties", "kind": "table", "note": "phiếu tự khai hồ sơ (ADR-0124; migration 0105): giá trị khai là ĐỀ XUẤT, không ghi đè hiện hành; nội dung bất biến, trạng thái một chiều CHO_XAC_MINH → DA_CHAP_NHAN / TU_CHOI / RUT; ghi kèm phiên bản chính sách đã đồng ý; chỉ hồ sơ cá nhân; không view công bố (5.23)" }
```

và vào `hangDuLieu`:

```json
"pty_self_submission": { "id": "N1", "party_id": "N1", "subject_kind": "N1", "policy_id": "N1", "birth_date": "N2", "address_value": "N2", "document_type_code": "N1", "document_number": "N3", "number_key": "N3", "license_class_code": "N1", "issued_date": "N1", "issued_place": "N3", "expiry_date": "N1", "status": "N1", "decided_at": "N1", "decided_by": "N1", "reason_code": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1" }
```

Run: `npm run dict` (sinh lại `docs/DATA-DICTIONARY.md`).

`scripts/audit-checks.mjs` — thêm vào `COT_N3_NHAT_KY`:

```js
  "pty_self_submission.document_number": { kiem: "R-PD-1", chuanHoa: false }, // ADR-0124 (lát H-3): số giấy tờ TỰ KHAI — nhật ký chỉ mang mã phiếu
  "pty_self_submission.number_key": { kiem: "R-PD-1", chuanHoa: true },
  "pty_self_submission.issued_place": { kiem: "R-PD-1", chuanHoa: false },
```

và vào `CHECKS`, ngay sau mục `R-PTY-12`:

```js
  // R-PTY-13 (ADR-0124 đ3, Hiến chương 5.21; lát H-3 Gói 2): phiếu tự khai ĐANG CHỜ mà quyết định đồng ý mới nhất của chủ phiếu với ĐÚNG phiên bản ghi trên phiếu không còn là
  // DONG_Y. Rút đồng ý phải rút phiếu cùng lô (route POST /api/parties/cua-toi/dong-y — ruling Q2). fail: người xác minh (lát H-4) không được xử lý phiếu như vậy.
  {
    code: "R-PTY-13",
    what: "phiếu tự khai đang chờ của người đã rút (hoặc chưa từng) đồng ý chính sách ghi trên phiếu",
    sql: "SELECT count(*) FROM pty_self_submission s WHERE s.status = 'CHO_XAC_MINH' AND COALESCE((SELECT c.decision FROM pty_consent c WHERE c.party_id = s.party_id AND c.policy_id = s.policy_id ORDER BY c.created_at DESC, c.rowid DESC LIMIT 1), '') <> 'DONG_Y'",
    level: "fail",
  },
```

Run: `node --test src/hang-du-lieu.test.ts src/audit-invariants.test.ts tests/audit/*.test.mjs 2>/dev/null; node --test src/hang-du-lieu.test.ts src/audit-invariants.test.ts`
Expected: PASS (nếu `src/audit-invariants.test.ts` có bài đối chiếu `COT_N3_NHAT_KY` ↔ cột N3 của sổ, nó cũng xanh vì ba cột đã có).

- [ ] **Step 8: Cổng phát hành ảnh tự khai — `src/cong-phat-hanh-anh-tu-khai.test.ts`**

```ts
// CỔNG PHÁT HÀNH GÓI 2 (KE-HOACH-SUY-RA.md "Cổng phát hành"; ruling R1 kế hoạch 2026-10-17-goi-2-h3-tu-khai): KHÔNG BAO GIỜ có bản dựng mang route để NGƯỜI DÙNG tự tải ảnh
// (giấy tờ của mình / ảnh của phiếu tự khai) mà thiếu route THỰC HIỆN PHIẾU XOÁ (lát H-5). Hôm nay chưa có route tải ảnh tự khai nên bài chính xanh "rỗng" — CÓ CHỦ Ý: nó canh
// lát sau. Bài thứ hai ghim bộ nhận diện để bài chính không rỗng về logic. Phá thử: thêm route giả `POST /api/parties/cua-toi/phieu/:pid/tep` vào partiesModule → đỏ → hoàn nguyên.
// Định nghĩa (đổi = sửa bài này, có lý do): "tải ảnh tự khai" = POST có đường bắt đầu /api/parties/cua-toi và chứa /tep; "thực hiện phiếu xoá" = POST khớp DUONG_THUC_HIEN_XOA
// (tên GIỮ CHỖ — lát H-5 đặt tên thật thì sửa hằng này cùng commit).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import type { AppModule } from "./shared/router.ts";

async function routesOf(entry: string, exportName: string): Promise<string[]> {
  const built = await esbuild.build({ entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
  const mod = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, AppModule>;
  return mod[exportName]!.routes.map((r) => `${r.method} ${r.path}`);
}
const DUONG_THUC_HIEN_XOA = /^POST \/api\/parties\/phieu-xoa\/:[a-z]+\/thuc-hien$/;
const laTaiAnhTuKhai = (k: string): boolean => /^POST \/api\/parties\/cua-toi(\/|$)/.test(k) && /\/tep(\/|$)/.test(k);

test("không có route tải ảnh tự khai nếu thiếu route thực hiện phiếu xoá", async () => {
  const r = await routesOf("./modules/parties/index.ts", "partiesModule");
  const taiAnh = r.filter(laTaiAnhTuKhai);
  if (taiAnh.length > 0) assert.ok(r.some((k) => DUONG_THUC_HIEN_XOA.test(k)), `có route tải ảnh tự khai (${taiAnh.join(", ")}) mà chưa có route thực hiện phiếu xoá`);
});

test("bộ nhận diện của cổng: nhận đúng đường tự khai, không nhận đường tải ảnh của Toàn quyền (H-2)", () => {
  assert.equal(laTaiAnhTuKhai("POST /api/parties/cua-toi/phieu/:pid/tep"), true);
  assert.equal(laTaiAnhTuKhai("POST /api/parties/cua-toi/tep"), true);
  assert.equal(laTaiAnhTuKhai("POST /api/parties/:id/documents/:did/tep"), false);
  assert.equal(laTaiAnhTuKhai("POST /api/parties/cua-toi/phieu"), false);
  assert.equal(DUONG_THUC_HIEN_XOA.test("POST /api/parties/phieu-xoa/:id/thuc-hien"), true);
});
```

Run: `node --test src/cong-phat-hanh-anh-tu-khai.test.ts` — Expected: PASS 2/2. Phá thử ngay (P16, ghi lại cho Task 6): thêm tạm `route("POST", "/api/parties/cua-toi/phieu/:pid/tep", "staff", async () => json({}))` vào mảng `routes` của `partiesModule` → chạy lại → `not ok 1 … có route tải ảnh tự khai` → hoàn nguyên → `git diff --stat src/modules/parties/index.ts` rỗng.

- [ ] **Step 9: Áp migration vào D1 local + bộ kiểm đủ**

Run: `npm run db:migrate:local` → Expected: áp `0105_ho_so_tu_khai.sql` không lỗi.
Run: `npm run typecheck` → 0 lỗi. Run: `npm test` → thoát 0 (một mình, không chạy song song bộ khác).

- [ ] **Step 10: Commit**

```bash
git add migrations/0105_ho_so_tu_khai.sql src/migrations-ho-so-tu-khai.test.ts src/migrations-ho-so-tep.test.ts src/cong-phat-hanh-anh-tu-khai.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md src/hang-du-lieu.test.ts scripts/audit-checks.mjs src/audit-invariants.test.ts tests/audit/nhat-ky-hang.mjs
git commit -m "Phiếu tự khai hồ sơ: migration 0105, vá ghi đè ở ba bảng chỉ-thêm, bất biến R-PTY-13, cổng phát hành ảnh tự khai (ADR-0124)"
```

Thân commit nói vì sao: giá trị khai là đề xuất (5.23), đồng ý phiên bản hiện hành là điều kiện (5.21), ảnh chưa mở vì chưa có đường xoá.

- [ ] **Step 11: Người kiểm độc lập (điều phối giao, vai `nguoi-kiem-doc-lap`)** — đọc migration + bài; tự phá ít nhất: bỏ từng trigger `pty_self_submission_*` trong bản sao SQLite của bài → bài tương ứng đỏ; nới `pty_self_submission_status_one_way` thành chỉ `OLD.status <> 'CHO_XAC_MINH'` → ca "chạm dòng đang chờ" đỏ; xoá `R-PTY-13` khỏi `CHECKS` → bài đỏ; xác nhận 18 trigger của 0103 và mọi trigger của 0104 còn nguyên; xác nhận không có `INSERT` gieo, không cột thời hạn.

---

### Task 2: Luật thuần phiếu tự khai + nhãn dùng chung (nhỏ)

**Files:**
- Create: `src/modules/parties/tu-khai.ts`, `src/modules/parties/tu-khai.test.ts`
- Create: `src/shared/tu-khai-hien-thi.ts`, `src/shared/tu-khai-hien-thi.test.ts`

**Interfaces:**
- Consumes: `kiemThemGiayTo`, `DanhMucGiayTo`, `GiayToNhap` (`./giay-to.ts`); `kiemNgaySinh`, `validateContact`, `Result` (`./rules.ts`).
- Produces:
  - `LOAI_PHIEU`, `type LoaiPhieu = "NGAY_SINH" | "DIA_CHI" | "GIAY_TO"`, `laLoaiPhieu(v): v is LoaiPhieu`
  - `type PhieuNhap = { loai: "NGAY_SINH"; ngaySinh: string } | { loai: "DIA_CHI"; diaChi: string } | { loai: "GIAY_TO"; giayTo: GiayToNhap }`
  - `kiemPhieuTuKhai(body: Record<string, unknown> | null, dm: DanhMucGiayTo): Result<PhieuNhap>`
  - `kiemChinhSach(body: Record<string, unknown> | null): Result<{ mucDich: string; noiDung: string }>`
  - `interface TinhTrangTuKhai { coHoSo: boolean; laCaNhan: boolean; daGop: boolean; coChinhSach: boolean; daDongY: boolean }`, `interface LyDo { code: string; message: string }`
  - `CAU_KHONG_GUI` (năm câu), `lyDoKhongGhi(t: Pick<TinhTrangTuKhai, "coHoSo" | "laCaNhan" | "daGop">): LyDo | null`, `lyDoKhongGui(t: TinhTrangTuKhai): LyDo | null`
  - (shared) `NHAN_LOAI_PHIEU`, `NHAN_TRANG_THAI_PHIEU`, `nhanLoaiPhieu(code: string): string`, `nhanTrangThaiPhieu(code: string): string`

- [ ] **Step 1: Viết bài đỏ `src/modules/parties/tu-khai.test.ts`**

```ts
// Luật thuần phiếu tự khai (ADR-0124; lát H-3 Gói 2). Câu báo lỗi tiếng Việt, KHÔNG nhắc lại giá trị khai.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_KHONG_GUI, kiemChinhSach, kiemPhieuTuKhai, lyDoKhongGhi, lyDoKhongGui } from "./tu-khai.ts";
import type { DanhMucGiayTo } from "./giay-to.ts";

const DM: DanhMucGiayTo = {
  loai: new Map([["CCCD", { hasExpiry: true, active: true }], ["GPLX", { hasExpiry: true, active: true }], ["HEALTH_CHECK", { hasExpiry: true, active: true }], ["CU", { hasExpiry: false, active: false }]]),
  hang: new Map([["B", { active: true }], ["D2", { active: true }]]),
  homNay: "2026-10-17",
};
const loi = (r: { ok: boolean; message?: string }) => (r.ok ? null : (r as { message: string }).message);

test("NGAY_SINH: hợp lệ (kể cả hôm nay); trống / sai khuôn / tương lai / trước 1900 / không phải chuỗi bị từ chối", () => {
  assert.deepEqual(kiemPhieuTuKhai({ loai: "NGAY_SINH", ngaySinh: "1990-05-06" }, DM), { ok: true, value: { loai: "NGAY_SINH", ngaySinh: "1990-05-06" } });
  assert.equal(kiemPhieuTuKhai({ loai: "NGAY_SINH", ngaySinh: "2026-10-17" }, DM).ok, true);
  for (const v of [undefined, null, "", "06/05/1990", "2026-10-18", "1899-12-31", 19900506]) assert.equal(kiemPhieuTuKhai({ loai: "NGAY_SINH", ngaySinh: v }, DM).ok, false, String(v));
  assert.equal(loi(kiemPhieuTuKhai({ loai: "NGAY_SINH" }, DM)), "Nhập ngày sinh.");
});

test("DIA_CHI: NFC + gộp khoảng trắng; trống / quá 200 ký tự bị từ chối; câu lỗi không chép địa chỉ", () => {
  const r = kiemPhieuTuKhai({ loai: "DIA_CHI", diaChi: "  12   Trần Phú,  Nha Trang " }, DM);
  assert.deepEqual(r, { ok: true, value: { loai: "DIA_CHI", diaChi: "12 Trần Phú, Nha Trang" } });
  assert.equal(loi(kiemPhieuTuKhai({ loai: "DIA_CHI", diaChi: "   " }, DM)), "Nhập địa chỉ.");
  const dai = kiemPhieuTuKhai({ loai: "DIA_CHI", diaChi: "9".repeat(201) }, DM);
  assert.equal(dai.ok, false);
  assert.doesNotMatch(loi(dai)!, /9{8}/);
});

test("GIAY_TO: dùng nguyên luật thêm giấy tờ — CCCD 12 số (khoảng trắng bỏ), GPLX cần hạng, loại ngưng dùng bị từ chối; câu lỗi không nhắc số", () => {
  const r = kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "079 000 000 111", issuedDate: "2020-01-01", expiryDate: "2035-01-01" } }, DM);
  assert.equal(r.ok, true);
  if (r.ok && r.value.loai === "GIAY_TO") assert.equal(r.value.giayTo.numberKey, "079000000111");
  const sai = kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "07900000011" } }, DM);
  assert.equal(loi(sai), "Số căn cước công dân phải đủ 12 chữ số.");
  assert.equal(kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "GPLX", number: "790000000111" } }, DM).ok, false, "GPLX thiếu hạng");
  assert.equal(kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "GPLX", number: "790000000111", classCode: "B" } }, DM).ok, true);
  assert.equal(kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "CU" } }, DM).ok, false, "loại đã ngưng");
  assert.equal(kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "HEALTH_CHECK", expiryDate: "2027-01-01" } }, DM).ok, true, "loại không bắt buộc số");
  assert.equal(loi(kiemPhieuTuKhai({ loai: "GIAY_TO" }, DM)), "Nhập thông tin giấy tờ.");
});

test("loại lạ / thân rỗng / khai hai loại một lần bị từ chối", () => {
  assert.equal(loi(kiemPhieuTuKhai(null, DM)), "Dữ liệu không hợp lệ.");
  assert.equal(loi(kiemPhieuTuKhai({ loai: "HO_TEN" }, DM)), "Chọn thông tin muốn khai: ngày sinh, địa chỉ hoặc giấy tờ.");
  assert.equal(loi(kiemPhieuTuKhai({ loai: "NGAY_SINH", ngaySinh: "1990-05-06", diaChi: "1 Đường Thử" }, DM)), "Mỗi lần chỉ khai một loại thông tin.");
});

test("kiemChinhSach: chuẩn hoá NFC + bỏ khoảng trắng hai đầu; rỗng / quá dài bị từ chối", () => {
  assert.deepEqual(kiemChinhSach({ mucDich: " Xác minh ", noiDung: " Toàn văn " }), { ok: true, value: { mucDich: "Xác minh", noiDung: "Toàn văn" } });
  assert.equal(kiemChinhSach({ mucDich: "", noiDung: "x" }).ok, false);
  assert.equal(kiemChinhSach({ mucDich: "x", noiDung: "y".repeat(20001) }).ok, false);
  assert.equal(kiemChinhSach({ mucDich: "x".repeat(2001), noiDung: "y" }).ok, false);
  assert.equal(kiemChinhSach(null).ok, false);
});

test("lyDoKhongGui: đúng thứ tự hồ sơ → loại → gộp → chính sách → đồng ý; lyDoKhongGhi chỉ ba lý do đầu", () => {
  const du = { coHoSo: true, laCaNhan: true, daGop: false, coChinhSach: true, daDongY: true };
  assert.equal(lyDoKhongGui(du), null);
  assert.deepEqual(lyDoKhongGui({ ...du, coHoSo: false, laCaNhan: false }), { code: "no_party", message: CAU_KHONG_GUI.chuaHoSo });
  assert.deepEqual(lyDoKhongGui({ ...du, laCaNhan: false }), { code: "self_person_only", message: CAU_KHONG_GUI.toChuc });
  assert.deepEqual(lyDoKhongGui({ ...du, daGop: true, coChinhSach: false }), { code: "party_merged", message: CAU_KHONG_GUI.daGop });
  assert.deepEqual(lyDoKhongGui({ ...du, coChinhSach: false, daDongY: false }), { code: "no_privacy_policy", message: CAU_KHONG_GUI.chuaChinhSach });
  assert.deepEqual(lyDoKhongGui({ ...du, daDongY: false }), { code: "consent_required", message: CAU_KHONG_GUI.chuaDongY });
  assert.equal(lyDoKhongGhi({ coHoSo: true, laCaNhan: true, daGop: false }), null);
  assert.equal(CAU_KHONG_GUI.chuaChinhSach, "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.");
});
```

`src/shared/tu-khai-hien-thi.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_LOAI_PHIEU, NHAN_TRANG_THAI_PHIEU, nhanLoaiPhieu, nhanTrangThaiPhieu } from "./tu-khai-hien-thi.ts";

test("nhãn tiếng Việt cho mọi loại / trạng thái phiếu; mã lạ (kể cả tên thuộc tính của Object) ra chữ trung tính, không lộ mã thô", () => {
  assert.deepEqual(Object.keys(NHAN_LOAI_PHIEU), ["NGAY_SINH", "DIA_CHI", "GIAY_TO"]);
  assert.deepEqual(Object.keys(NHAN_TRANG_THAI_PHIEU), ["CHO_XAC_MINH", "DA_CHAP_NHAN", "TU_CHOI", "RUT"]);
  assert.equal(nhanTrangThaiPhieu("CHO_XAC_MINH"), "Chờ xác minh");
  assert.equal(nhanTrangThaiPhieu("RUT"), "Đã rút");
  assert.equal(nhanLoaiPhieu("GIAY_TO"), "Giấy tờ");
  assert.equal(nhanLoaiPhieu("toString"), "Thông tin");
  assert.equal(nhanTrangThaiPhieu("LA"), "Không rõ");
});
```

- [ ] **Step 2: Chạy — phải đỏ**

Run: `node --test src/modules/parties/tu-khai.test.ts src/shared/tu-khai-hien-thi.test.ts`
Expected: FAIL `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Viết `src/modules/parties/tu-khai.ts`**

```ts
// Luật thuần phiếu TỰ KHAI hồ sơ (ADR-0124; Hiến chương 5.21, 5.23; lát H-3 Gói 2) — module parties. Không I/O, không SQL. Import kèm đuôi .ts.
// Giá trị khai là ĐỀ XUẤT: tệp này chỉ kiểm hình thức, không đọc / ghi giá trị hiện hành. Câu báo lỗi không nhắc lại giá trị khai (số giấy tờ, địa chỉ, ngày sinh).
import { kiemThemGiayTo, type DanhMucGiayTo, type GiayToNhap } from "./giay-to.ts";
import { kiemNgaySinh, validateContact, type Result } from "./rules.ts";

export const LOAI_PHIEU = ["NGAY_SINH", "DIA_CHI", "GIAY_TO"] as const;
export type LoaiPhieu = (typeof LOAI_PHIEU)[number];
export const laLoaiPhieu = (v: unknown): v is LoaiPhieu => typeof v === "string" && (LOAI_PHIEU as readonly string[]).includes(v);
export type PhieuNhap = { loai: "NGAY_SINH"; ngaySinh: string } | { loai: "DIA_CHI"; diaChi: string } | { loai: "GIAY_TO"; giayTo: GiayToNhap };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const TRUONG: Record<LoaiPhieu, "ngaySinh" | "diaChi" | "giayTo"> = { NGAY_SINH: "ngaySinh", DIA_CHI: "diaChi", GIAY_TO: "giayTo" };

/** Thân POST /api/parties/cua-toi/phieu (trừ chinhSachId — route kiểm): `{ loai, ngaySinh? | diaChi? | giayTo? }`. Trường của loại khác phải vắng (một phiếu một loại — R4). */
export function kiemPhieuTuKhai(body: Record<string, unknown> | null, dm: DanhMucGiayTo): Result<PhieuNhap> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const loai = body.loai;
  if (!laLoaiPhieu(loai)) return fail("Chọn thông tin muốn khai: ngày sinh, địa chỉ hoặc giấy tờ.");
  const thua = Object.values(TRUONG).filter((k) => k !== TRUONG[loai] && body[k] !== undefined && body[k] !== null);
  if (thua.length > 0) return fail("Mỗi lần chỉ khai một loại thông tin.");
  if (loai === "NGAY_SINH") {
    const r = kiemNgaySinh(body.ngaySinh, dm.homNay);
    if (!r.ok) return r;
    if (!r.value) return fail("Nhập ngày sinh.");
    return { ok: true, value: { loai, ngaySinh: r.value } };
  }
  if (loai === "DIA_CHI") {
    if (typeof body.diaChi !== "string" || !body.diaChi.trim()) return fail("Nhập địa chỉ.");
    const r = validateContact({ kind: "ADDRESS", value: body.diaChi });
    return r.ok ? { ok: true, value: { loai, diaChi: r.value.value } } : r;
  }
  const g = body.giayTo;
  if (!g || typeof g !== "object" || Array.isArray(g)) return fail("Nhập thông tin giấy tờ.");
  const r = kiemThemGiayTo(g as Record<string, unknown>, dm);
  return r.ok ? { ok: true, value: { loai, giayTo: r.value } } : r;
}

/** Thân POST /api/parties/chinh-sach-rieng-tu: `{ mucDich, noiDung }` — trần = CHECK của pty_privacy_policy (0103). */
export function kiemChinhSach(body: Record<string, unknown> | null): Result<{ mucDich: string; noiDung: string }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const mucDich = typeof body.mucDich === "string" ? body.mucDich.normalize("NFC").trim() : "";
  const noiDung = typeof body.noiDung === "string" ? body.noiDung.normalize("NFC").trim() : "";
  if (mucDich.length < 1 || mucDich.length > 2000) return fail("Mục đích thu thập cần từ 1 đến 2.000 ký tự.");
  if (noiDung.length < 1 || noiDung.length > 20000) return fail("Toàn văn chính sách cần từ 1 đến 20.000 ký tự.");
  return { ok: true, value: { mucDich, noiDung } };
}

export interface TinhTrangTuKhai { coHoSo: boolean; laCaNhan: boolean; daGop: boolean; coChinhSach: boolean; daDongY: boolean }
export interface LyDo { code: string; message: string }
export const CAU_KHONG_GUI = {
  chuaHoSo: "Tài khoản này chưa gắn hồ sơ nên chưa tự khai được. Hãy báo quản trị viên.",
  toChuc: "Hồ sơ tổ chức chưa tự khai được trên Nền tảng. Hãy báo quản trị viên để cập nhật.",
  daGop: "Hồ sơ của bạn đã được gộp vào hồ sơ khác. Hãy báo quản trị viên.",
  chuaChinhSach: "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.",
  chuaDongY: "Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi thông tin.",
} as const;
/** Lý do không GHI được gì (đồng ý, phiếu) vì HỒ SƠ — null = hồ sơ hợp lệ. */
export function lyDoKhongGhi(t: Pick<TinhTrangTuKhai, "coHoSo" | "laCaNhan" | "daGop">): LyDo | null {
  if (!t.coHoSo) return { code: "no_party", message: CAU_KHONG_GUI.chuaHoSo };
  if (!t.laCaNhan) return { code: "self_person_only", message: CAU_KHONG_GUI.toChuc };
  if (t.daGop) return { code: "party_merged", message: CAU_KHONG_GUI.daGop };
  return null;
}
/** Lý do không GỬI được phiếu — null = gửi được (một nguồn cho cờ `coTheGui` của GET và chặn của POST). */
export function lyDoKhongGui(t: TinhTrangTuKhai): LyDo | null {
  return lyDoKhongGhi(t)
    ?? (!t.coChinhSach ? { code: "no_privacy_policy", message: CAU_KHONG_GUI.chuaChinhSach } : null)
    ?? (!t.daDongY ? { code: "consent_required", message: CAU_KHONG_GUI.chuaDongY } : null);
}
```

`src/shared/tu-khai-hien-thi.ts`:

```ts
// Nhãn tiếng Việt của phiếu tự khai (ADR-0124; lát H-3 Gói 2) — MỘT nguồn cho máy chủ (chi tiết nhật ký) và giao diện (trang Tôi). Thuần, không import.
export const NHAN_LOAI_PHIEU: Readonly<Record<string, string>> = { NGAY_SINH: "Ngày sinh", DIA_CHI: "Địa chỉ", GIAY_TO: "Giấy tờ" };
export const NHAN_TRANG_THAI_PHIEU: Readonly<Record<string, string>> = { CHO_XAC_MINH: "Chờ xác minh", DA_CHAP_NHAN: "Đã xác minh", TU_CHOI: "Bị từ chối", RUT: "Đã rút" };
export const nhanLoaiPhieu = (c: string): string => (Object.hasOwn(NHAN_LOAI_PHIEU, c) ? NHAN_LOAI_PHIEU[c]! : "Thông tin");
export const nhanTrangThaiPhieu = (c: string): string => (Object.hasOwn(NHAN_TRANG_THAI_PHIEU, c) ? NHAN_TRANG_THAI_PHIEU[c]! : "Không rõ");
```

- [ ] **Step 4: Chạy — phải xanh**

Run: `node --test src/modules/parties/tu-khai.test.ts src/shared/tu-khai-hien-thi.test.ts` → PASS. Run: `npm run typecheck` → 0 lỗi. Run: `npm test` → thoát 0.

- [ ] **Step 5: Commit**

```bash
git add src/modules/parties/tu-khai.ts src/modules/parties/tu-khai.test.ts src/shared/tu-khai-hien-thi.ts src/shared/tu-khai-hien-thi.test.ts
git commit -m "Tự khai hồ sơ: luật thuần kiểm phiếu, chính sách và lý do không gửi được (ADR-0124)"
```

---

### Task 3: Ô quyền + đăng chính sách + đồng ý + "Hồ sơ của tôi" (GET) (VIỆC LỚN — quyền, dữ liệu)

**Files:**
- Modify: `src/shared/permissions.ts` (hàm `tuPhucVu`, ba ô)
- Modify: `src/shared/permissions.test.ts` (bảng ADR, `ADMIN_NONE_OPS`, ba bài ghim dòng DRIVER / DRIVER_PARTNER / HR, bài 1024 tập con mới)
- Modify: `src/modules/orders/xem-don-theo-quyen.test.ts` (`PARTNER_ROW`)
- Modify: `src/shared/tro-ly-cau-truc-ten.ts`; Regenerate: `src/shared/tro-ly-cau-truc.ts` (do `npm test` sinh lại — commit kèm)
- Modify: `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts`
- Modify: `src/modules/parties/repository.ts`, `src/modules/parties/index.ts`
- Create: `src/modules/parties/tu-khai-route.test.ts`
- Modify: `src/route-access.test.ts`

**Interfaces:**
- Consumes: Task 1 (bảng, mã lỗi trigger), Task 2 (`kiemChinhSach`, `lyDoKhongGhi`, `lyDoKhongGui`, `TinhTrangTuKhai`, `nhanLoaiPhieu`); sẵn có `getPartyDetail`, `listPersonDocuments`, `listPersonDocumentTypes`, `listLicenseClasses`, `cheSo`, `auditStatement`, `readJson`, `error`, `json`.
- Produces:
  - Ô `"party.self.view"`, `"party.self.submit"`, `"party.privacy.policy"` trong `MATRIX`.
  - `repository.ts`: `PolicyRow`, `PhieuRow`; `chinhSachHienHanh(db, nowIso): Promise<PolicyRow | null>`, `phienBanLonNhat(db): Promise<number>`, `dangChinhSachStatement(db, v)`, `quyetDinhDongYMoiNhat(db, partyId, policyId): Promise<"DONG_Y" | "RUT" | null>`, `ghiDongYStatement(db, v)`, `rutMoiPhieuChoStatement(db, { partyId, at, actorId })`, `listPhieuCuaHoSo(db, partyId): Promise<PhieuRow[]>`.
  - `index.ts`: `tinhTuKhai(db, staff, nowIso)`, `hoSoCuaToiDto(...)`, `phieuDto(...)`; route `POST /api/parties/chinh-sach-rieng-tu` (admin), `GET /api/parties/cua-toi` (staff), `POST /api/parties/cua-toi/dong-y` (staff).
  - `contracts.ts`: `LoaiPhieuTuKhai`, `TrangThaiPhieuTuKhai`, `GiayToCuaToiDto`, `HoSoCuaToiDto`, `ChinhSachRiengTuDto`, `PhieuTuKhaiGiayToDto`, `PhieuTuKhaiDto`, `HoSoCuaToiResponse`, `ChinhSachDangResponse`, `DongYResponse`, `PhieuTuKhaiTaoResponse`, `PhieuTuKhaiRutResponse`.
  - Hành động nhật ký: `privacy_policy_published`, `privacy_consent_given`, `privacy_consent_withdrawn`, `self_submission_created`, `self_submission_withdrawn`.

- [ ] **Step 1: Đo trần gói TRƯỚC khi sửa** — Run: `node --test src/goi-trang-nhe.test.ts` (PASS) rồi ghi số byte hiện tại của `web/orders.ts` vào báo cáo (lệnh đo nhanh: `node -e 'const {buildSync}=require("esbuild");const r=buildSync({entryPoints:["web/orders.ts"],bundle:true,format:"esm",target:"es2022",minify:true,write:false,define:{__BUILD_ID__:"\"thu\"",__APP_VERSION__:"\"1.0\"",__APP_RELEASE_DATE__:"\"2026-01-01\""}});console.log(r.outputFiles[0].contents.byteLength)'`). Kỳ vọng 96 382.

- [ ] **Step 2: Bài đỏ bảng quyền**

`src/shared/permissions.test.ts`:
- Bảng ADR (đầu tệp, cạnh `"party.attachment.view"`), thêm:

```ts
  "party.self.view": ["own", "own", "own", "own", "own", "any", "own", "own", "own", "own"], // ADR-0124 đ4 (lát H-3): hồ sơ của CHÍNH MÌNH — mọi tài khoản; SUPER any (ADR-0014 đ2) nhưng route chỉ phục vụ hồ sơ của phiên
  "party.self.submit": ["own", "own", "own", "own", "own", "any", "own", "own", "own", "own"], // ADR-0124 đ1, đ3, đ4: gửi / rút phiếu tự khai, đồng ý / rút đồng ý chính sách — của chính mình
  "party.privacy.policy": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0126 đ1: đăng chính sách riêng tư — chỉ Toàn quyền
```

- `ADMIN_NONE_OPS`, thêm:

```ts
  "party.self.view", "party.self.submit", // ADR-0124 đ4: ô `own` — Quản trị chỉ hồ sơ của chính mình (ngữ cảnh ownerId người khác → không)
  "party.privacy.policy", // ADR-0126 đ1: đăng chính sách riêng tư chỉ Toàn quyền
```

- Ba bài ghim dòng (`DRIVER_ROW`, dòng Tài xế đối tác, `HR_ROW`), thêm vào mỗi bảng:

```ts
    "party.self.view": "own", "party.self.submit": "own", // ADR-0124 đ4 (lát H-3): ngoại lệ có tên — hồ sơ của CHÍNH MÌNH, như mọi tài khoản
    "party.privacy.policy": "none", // ADR-0126 đ1
```

- Bài mới (cuối tệp):

```ts
test("ADR-0124 đ4 (lát H-3): party.self.view / party.self.submit trên cả 1024 tập con quyền — chính mình: được khi có ít nhất một quyền; người khác / không ngữ cảnh: chỉ khi có Toàn quyền; party.privacy.policy chỉ Toàn quyền", () => {
  let count = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const who = { id: "u1", permissions };
    const coSup = permissions.includes("SUPER_ADMIN");
    const ten = permissions.join("+") || "(không quyền)";
    for (const op of ["party.self.view", "party.self.submit"] as const) {
      assert.equal(can(who, op, { ownerId: "u1" }), permissions.length > 0, `${op} chính mình: ${ten}`);
      assert.equal(can(who, op, { ownerId: "u2" }), coSup, `${op} người khác: ${ten}`);
      assert.equal(can(who, op), coSup, `${op} không ngữ cảnh: ${ten}`);
    }
    assert.equal(can(who, "party.privacy.policy", { ownerId: "u1" }), coSup, `party.privacy.policy: ${ten}`);
    count++;
  }
  assert.equal(count, 1024);
});
```

`src/modules/orders/xem-don-theo-quyen.test.ts` — `PARTNER_ROW`, thêm:

```ts
    "party.self.view": "own", "party.self.submit": "own", // ADR-0124 đ4 + Hệ quả: NỚI có chủ ý — Đối tác xem / tự khai hồ sơ của CHÍNH MÌNH
    "party.privacy.policy": "none", // ADR-0126 đ1
```

Run: `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts`
Expected: FAIL — ô lạ trong bảng ADR / dòng ghim (`can()` trả false cho thao tác chưa có).

- [ ] **Step 3: Ba ô trong `src/shared/permissions.ts`**

Sau `chiToanQuyen`:

```ts
/** Hàng "tự phục vụ": mọi cột `own` (chính mình — route truyền `{ ownerId: staff.id }` và lấy hồ sơ từ `staff.partyId`), SUPER_ADMIN `any` (ADR-0014 điều 2 — Toàn quyền
 * any ở MỌI ô; route vẫn chỉ phục vụ hồ sơ của phiên). Một hàm dùng chung để gói giao diện gọn (trần gói Đơn hàng — src/goi-trang-nhe.test.ts, không nới). */
const tuPhucVu = (): Row => row("own", "own", "own", "own", "own", "any", "own", "own", "own", "own");
```

Trong `MATRIX`, ngay sau `"party.attachment.view"`:

```ts
  // ADR-0124 đ4 (accepted 2026-10-16; lát H-3 Gói 2): XEM hồ sơ của CHÍNH MÌNH (giá trị hiện hành, số che, chính sách riêng tư hiện hành, phiếu tự khai của mình) — mọi
  // tài khoản; NỚI có chủ ý cho Đối tác, Tài xế đối tác (ADR-0124 Hệ quả; ruling R7 — party.document.view KHÔNG đổi). Route: GET /api/parties/cua-toi (cổng staff).
  // Phạm vi own = staff.partyId của PHIÊN, không bao giờ từ đường dẫn / thân.
  "party.self.view": tuPhucVu(),
  // ADR-0124 đ1, đ3, đ4: GỬI / RÚT phiếu tự khai của chính mình và ĐỒNG Ý / RÚT ĐỒNG Ý chính sách riêng tư (Hiến chương 5.21). Route: POST /api/parties/cua-toi/dong-y,
  // POST /api/parties/cua-toi/phieu, POST /api/parties/cua-toi/phieu/:pid/rut (cổng staff).
  "party.self.submit": tuPhucVu(),
  // ADR-0126 đ1: ĐĂNG phiên bản chính sách riêng tư mới — chỉ Toàn quyền (ruling Q4: hiệu lực ngay lúc đăng). Route: POST /api/parties/chinh-sach-rieng-tu (cổng admin).
  "party.privacy.policy": chiToanQuyen(),
```

`src/shared/tro-ly-cau-truc-ten.ts`, cạnh `"party.attachment.view"`:

```ts
  "party.self.view": { ten: "xem hồ sơ của mình", moTa: "Xem thông tin hồ sơ của chính mình, chính sách riêng tư và các phiếu tự khai đã gửi." },
  "party.self.submit": { ten: "tự khai hồ sơ", moTa: "Đồng ý chính sách riêng tư, gửi và rút phiếu tự khai ngày sinh, địa chỉ, giấy tờ của chính mình." },
  "party.privacy.policy": { ten: "đăng chính sách riêng tư", moTa: "Đăng phiên bản mới của chính sách riêng tư; mọi người phải đồng ý lại trước khi tự khai." },
```

Run: `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts` → PASS.
Run: `node --test src/goi-trang-nhe.test.ts` → PASS (≤ 96 600). **Nếu đỏ: DỪNG, không nới trần, báo điều phối "BỘ KIỂM CHƯA XANH: goi-trang-nhe — <số byte>"** (phương án cho chủ: tách bản đồ quyền khỏi gói Đơn hàng ở lát riêng).
`src/permission-enforcement.test.ts` lúc này ĐỎ (ba ô chưa route nào hỏi) — đúng dự kiến, xanh ở Step 8; không thêm mục hoãn, không commit giữa chừng.

- [ ] **Step 4: Hợp đồng + nhật ký**

`src/shared/contracts.ts` (cuối nhóm hồ sơ):

```ts
// ---- Hồ sơ của tôi + chính sách riêng tư (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2) — DANH SÁCH CHO PHÉP, giống nhau cho mọi quyền (tiền lệ vá D-1). Số giấy tờ LUÔN che. ----
export type LoaiPhieuTuKhai = "NGAY_SINH" | "DIA_CHI" | "GIAY_TO";
export type TrangThaiPhieuTuKhai = "CHO_XAC_MINH" | "DA_CHAP_NHAN" | "TU_CHOI" | "RUT";
export interface GiayToCuaToiDto { loai: string; soChe: string | null; hetHan: string | null }
/** Giá trị HIỆN HÀNH (đã có trong hồ sơ). Hồ sơ tổ chức: ngaySinh null, diaChi [], giayTo []. */
export interface HoSoCuaToiDto { loai: "PERSON" | "ORGANIZATION"; hoTen: string; ngaySinh: string | null; diaChi: string[]; dienThoai: string[]; email: string[]; giayTo: GiayToCuaToiDto[] }
export interface ChinhSachRiengTuDto { id: string; phienBan: number; mucDich: string; noiDung: string; hieuLucTu: string }
export interface PhieuTuKhaiGiayToDto { loai: string; soChe: string | null; ngayCap: string | null; noiCap: string | null; hetHan: string | null }
/** Giá trị ĐỀ XUẤT của chính người xem (5.23) — chưa dùng ở đâu cho tới khi được xác minh. */
export interface PhieuTuKhaiDto { id: string; loai: LoaiPhieuTuKhai; trangThai: TrangThaiPhieuTuKhai; guiLuc: string; xuLyLuc: string | null; ngaySinh: string | null; diaChi: string | null; giayTo: PhieuTuKhaiGiayToDto | null }
/** `GET /api/parties/cua-toi`. `hoSo` null = tài khoản chưa gắn hồ sơ. `coTheGui` false thì `lyDoKhongGui` là câu tiếng Việt. `phieu`: 50 phiếu mới nhất. */
export interface HoSoCuaToiResponse {
  hoSo: HoSoCuaToiDto | null;
  chinhSach: ChinhSachRiengTuDto | null;
  dongY: boolean;
  coTheGui: boolean;
  lyDoKhongGui: string | null;
  phieu: PhieuTuKhaiDto[];
  loaiGiayTo: { ma: string; ten: string; coHan: boolean }[];
  hangGplx: { ma: string; ten: string }[];
}
/** `POST /api/parties/chinh-sach-rieng-tu` (chỉ Toàn quyền) — thân `{ mucDich, noiDung }`. */
export interface ChinhSachDangResponse { phienBan: number }
/** `POST /api/parties/cua-toi/dong-y` — thân `{ chinhSachId, quyetDinh: "DONG_Y" | "RUT" }`. Rút đồng ý rút luôn mọi phiếu đang chờ (ruling Q2). */
export interface DongYResponse { dongY: boolean }
/** `POST /api/parties/cua-toi/phieu` — thân `{ chinhSachId, loai, ngaySinh? | diaChi? | giayTo?: { typeCode, number?, classCode?, issuedDate?, issuedPlace?, expiryDate? } }`. */
export interface PhieuTuKhaiTaoResponse { phieuId: string }
/** `POST /api/parties/cua-toi/phieu/:pid/rut`. */
export interface PhieuTuKhaiRutResponse { phieuId: string; trangThai: "RUT" }
```

`src/shared/audit-actions.ts`, sau `party_attachment_purge_retried`:

```ts
  // ADR-0124, ADR-0126 đ1 (lát H-3 Gói 2): `detail` CHỈ MÃ / NHÃN — "phiên bản <n>", "phiếu <mã> · <nhãn loại>[ · <tên loại giấy tờ>]"; KHÔNG ngày sinh, địa chỉ, số, nơi cấp,
  // chữ chính sách (Hiến chương 5.20).
  privacy_policy_published: { label: "Đăng chính sách riêng tư", group: "system" },
  privacy_consent_given: { label: "Đồng ý chính sách riêng tư", group: "party" },
  privacy_consent_withdrawn: { label: "Rút đồng ý chính sách riêng tư", group: "party" },
  self_submission_created: { label: "Gửi phiếu tự khai hồ sơ", group: "party" },
  self_submission_withdrawn: { label: "Rút phiếu tự khai hồ sơ", group: "party" },
```

`src/shared/lich-su-doi-tac.ts` — trong `LICH_SU_DOI_TAC_AN`, dòng ADR-0123, thêm:

```ts
  "privacy_policy_published", "privacy_consent_given", "privacy_consent_withdrawn", "self_submission_created", "self_submission_withdrawn", // ADR-0124: tự khai — không gắn đơn
```

- [ ] **Step 5: Bài đỏ route — `src/modules/parties/tu-khai-route.test.ts`**

```ts
// ADR-0124, ADR-0126 đ1 (lát H-3 Gói 2): chính sách riêng tư + đồng ý + "Hồ sơ của tôi" qua route thật (tests/audit/harness.mjs, SQLite thật). Phạm vi own = staff.partyId.
// Task 4 thêm phần phiếu ở cuối tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "55555555-5555-4555-8555-555555555555";
const DRVP = "66666666-6666-4666-8666-666666666666";
const HYB = "88888888-8888-4888-8888-888888888888";
const HR = "99999999-9999-4999-8999-999999999999";
const DRV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const NOP = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const GOP = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const AT = "2026-10-17T00:00:00.000Z";
const pty = (id: string) => `pty-${id}`;
const MUC_DICH = "Thử: xác minh danh tính, điền sẵn hoá đơn.";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000010", name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DRVP, phone: "0900000011", name: "Tài Xế Đối Tác", perms: ["DRIVER_PARTNER"] });
  seedStaff(w.sqlite, { id: HYB, phone: "0900000012", name: "Lai Bán Đối", perms: ["SALES", "PARTNER"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000013", name: "Nhân Sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: DRV, phone: "0900000014", name: "Tài Xế", perms: ["DRIVER"] });
  // Tài khoản gắn hồ sơ TỔ CHỨC (ADR-0018 đ9), tài khoản chưa gắn hồ sơ, tài khoản có hồ sơ đã gộp (ADR-0068) — gieo thẳng (Review Focus 5).
  seedStaff(w.sqlite, { id: ORG, phone: "0900000020", name: "Công Ty Thử", perms: ["PARTNER"] });
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('org-1', 'ORGANIZATION', 'Công Ty Lữ Hành Thử', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES ('org-1', '${AT}', '${AT}')`);
  w.sqlite.prepare("UPDATE staff SET party_id = 'org-1' WHERE id = ?").run(ORG);
  seedStaff(w.sqlite, { id: NOP, phone: "0900000021", name: "Chưa Hồ Sơ", perms: ["SALES"] });
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(NOP);
  seedStaff(w.sqlite, { id: GOP, phone: "0900000022", name: "Đã Gộp", perms: ["SALES"] });
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('gop-dich', 'PERSON', 'Hồ Sơ Chính', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('gop-dich', 'Hồ Sơ Chính', '${AT}', '${AT}')`);
  w.sqlite.prepare("UPDATE pty_party SET active = 0, merged_into_id = 'gop-dich', merged_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, pty(GOP));
  return w;
}
const dang = (w: any, noiDung = "Toàn văn chính sách THỬ") => w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as: SUP, body: { mucDich: MUC_DICH, noiDung } });
const cuaToi = async (w: any, as: string) => {
  const r = await w.call("GET", "/api/parties/cua-toi", { as });
  assert.equal(r.status, 200, r.text);
  return r.json;
};
const dongY = (w: any, as: string, chinhSachId: string, quyetDinh = "DONG_Y") => w.call("POST", "/api/parties/cua-toi/dong-y", { as, body: { chinhSachId, quyetDinh } });
const dem = (w: any, bang: string) => Number(w.q(`SELECT count(*) n FROM ${bang}`)[0].n);

test("chưa có chính sách: GET 200 chinhSach null, coTheGui false + câu 'Chưa có chính sách…'; đồng ý → 409 no_privacy_policy; không dòng nào", async () => {
  const w = setup();
  const d = await cuaToi(w, SALES);
  assert.equal(d.chinhSach, null);
  assert.equal(d.coTheGui, false);
  assert.equal(d.lyDoKhongGui, "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.");
  const r = await dongY(w, SALES, "khong-co");
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "no_privacy_policy");
  assert.equal(dem(w, "pty_consent"), 0);
});

test("đăng chính sách: Bán hàng / Đối tác 403 (cổng admin), Quản trị 403 (ô); Toàn quyền 201 phiên bản 1 rồi 2; thân sai 400; nhật ký chỉ 'phiên bản n'", async () => {
  const w = setup();
  for (const as of [SALES, PARTNER, ADM]) assert.equal((await w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as, body: { mucDich: "x", noiDung: "y" } })).status, 403, as);
  assert.equal((await w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as: SUP, body: { mucDich: "", noiDung: "y" } })).status, 400);
  let r = await dang(w);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.phienBan, 1);
  r = await dang(w, "Toàn văn chính sách THỬ bản hai");
  assert.equal(r.json.phienBan, 2);
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'privacy_policy_published' ORDER BY rowid").map((x: any) => x.detail);
  assert.deepEqual(nk, ["phiên bản 1", "phiên bản 2"]);
  assert.equal((await cuaToi(w, SALES)).chinhSach.phienBan, 2, "phiên bản hiện hành = bản mới nhất");
});

test("đồng ý cho MỌI loại tài khoản (Bán hàng, Đối tác, Tài xế đối tác, lai Bán hàng + Đối tác, Nhân sự, Tài xế): đồng ý → coTheGui; lặp → 409 consent_unchanged; rút → dongY false", async () => {
  const w = setup();
  await dang(w);
  for (const as of [SALES, PARTNER, DRVP, HYB, HR, DRV]) {
    const truoc = await cuaToi(w, as);
    assert.equal(truoc.dongY, false, as);
    assert.equal(truoc.lyDoKhongGui, "Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi thông tin.", as);
    let r = await dongY(w, as, truoc.chinhSach.id);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    const sau = await cuaToi(w, as);
    assert.equal(sau.dongY, true, as);
    assert.equal(sau.coTheGui, true, as);
    assert.equal(sau.lyDoKhongGui, null, as);
    r = await dongY(w, as, truoc.chinhSach.id);
    assert.equal(r.status, 409, as);
    assert.equal(r.json.error.code, "consent_unchanged", as);
    r = await dongY(w, as, truoc.chinhSach.id, "RUT");
    assert.equal(r.status, 200, as);
    assert.equal((await cuaToi(w, as)).dongY, false, as);
  }
  assert.equal(w.q("SELECT count(*) n FROM pty_consent WHERE created_by = ? AND party_id <> ?", PARTNER, pty(PARTNER))[0].n, 0, "dòng đồng ý luôn gắn hồ sơ của PHIÊN");
  assert.equal((await dongY(w, SALES, "khong-co", "BAT_KY")).status, 400);
});

test("Review Focus 1: có phiên bản mới trong lúc đang mở trang — đồng ý bằng mã phiên bản cũ ⇒ 409 policy_changed, không ghi", async () => {
  const w = setup();
  const cu = (await dang(w)) && (await cuaToi(w, PARTNER)).chinhSach.id;
  await dang(w, "Toàn văn chính sách THỬ bản hai");
  const truoc = dem(w, "pty_consent");
  const r = await dongY(w, PARTNER, cu);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "policy_changed");
  assert.equal(dem(w, "pty_consent"), truoc);
});

test("Review Focus 2: DTO 'Hồ sơ của tôi' đúng DANH SÁCH CHO PHÉP cho Đối tác, Tài xế đối tác, tài khoản lai, Bán hàng — không vai, quan hệ, gộp, tài khoản, mốc tạo", async () => {
  const w = setup();
  await dang(w);
  w.sqlite.prepare("UPDATE pty_person SET birth_date = '1988-04-23' WHERE party_id = ?").run(pty(DRV));
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, expiry_date, created_at, updated_at)
    VALUES ('doc-drv', ?, 'CCCD', '079 333 444 555', '079333444555', '2035-01-01', ?, ?)`).run(pty(DRV), AT, AT);
  for (const as of [PARTNER, DRVP, HYB, SALES, DRV]) {
    const d = await cuaToi(w, as);
    assert.deepEqual(Object.keys(d).sort(), ["chinhSach", "coTheGui", "dongY", "hangGplx", "hoSo", "loaiGiayTo", "lyDoKhongGui", "phieu"], as);
    assert.deepEqual(Object.keys(d.hoSo).sort(), ["diaChi", "dienThoai", "email", "giayTo", "hoTen", "loai", "ngaySinh"], as);
    assert.deepEqual(Object.keys(d.chinhSach).sort(), ["hieuLucTu", "id", "mucDich", "noiDung", "phienBan"], as);
    assert.doesNotMatch(JSON.stringify(d), /"(roles|relationships|mergedFrom|mergedInto|accountLinked|editable|createdAt|updatedAt|createdBy|staffId|partyId)"/, as);
  }
  const drv = await cuaToi(w, DRV);
  assert.equal(drv.hoSo.ngaySinh, "1988-04-23", "chính chủ thấy ngày sinh của mình");
  assert.deepEqual(drv.hoSo.giayTo, [{ loai: "Căn cước công dân (CCCD)", soChe: "••••4555", hetHan: "2035-01-01" }]);
  assert.deepEqual(Object.keys(drv.hoSo.giayTo[0]).sort(), ["hetHan", "loai", "soChe"]);
  assert.doesNotMatch(JSON.stringify(drv), /079333444555|079 333/, "số đủ không bao giờ ra DTO");
});

test("Review Focus 5: tài khoản tổ chức / chưa hồ sơ / hồ sơ đã gộp — GET 200 với câu lời thường; đồng ý 409 đúng mã; không dòng pty_consent", async () => {
  const w = setup();
  const cs = (await dang(w)).json && (await cuaToi(w, SALES)).chinhSach.id;
  for (const [as, ma, cau] of [
    [ORG, "self_person_only", "Hồ sơ tổ chức chưa tự khai được trên Nền tảng. Hãy báo quản trị viên để cập nhật."],
    [NOP, "no_party", "Tài khoản này chưa gắn hồ sơ nên chưa tự khai được. Hãy báo quản trị viên."],
    [GOP, "party_merged", "Hồ sơ của bạn đã được gộp vào hồ sơ khác. Hãy báo quản trị viên."],
  ] as const) {
    const d = await cuaToi(w, as);
    assert.equal(d.coTheGui, false, as);
    assert.equal(d.lyDoKhongGui, cau, as);
    if (as === NOP) assert.equal(d.hoSo, null);
    if (as === ORG) assert.deepEqual([d.hoSo.loai, d.hoSo.ngaySinh, d.hoSo.diaChi, d.hoSo.giayTo], ["ORGANIZATION", null, [], []]);
    const r = await dongY(w, as, cs);
    assert.equal(r.status, 409, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, ma, as);
  }
  assert.equal(dem(w, "pty_consent"), 0);
});

test("ruling Q2: rút đồng ý rút luôn MỌI phiếu đang chờ trong cùng lô (bất biến R-PTY-13); phiếu đã xong không bị đụng", async () => {
  const w = setup();
  await dang(w);
  const cs = (await cuaToi(w, PARTNER)).chinhSach.id;
  await dongY(w, PARTNER, cs);
  const chen = (id: string, kind: string, extra: string) =>
    w.sqlite.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, ${extra}, status, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, 'CHO_XAC_MINH', ?, ?, ?, ?)`).run(id, pty(PARTNER), kind, cs, kind === "NGAY_SINH" ? "1990-01-01" : "1 Đường Thử", AT, PARTNER, AT, PARTNER);
  chen("ph-a", "NGAY_SINH", "birth_date");
  chen("ph-b", "DIA_CHI", "address_value");
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', decided_at = ?, decided_by = ?, reason_code = 'THU', updated_at = ? WHERE id = 'ph-b'").run(AT, ADM, AT);
  const r = await dongY(w, PARTNER, cs, "RUT");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(w.q("SELECT id, status, decided_by FROM pty_self_submission ORDER BY id").map((x: any) => ({ ...x })), [
    { id: "ph-a", status: "RUT", decided_by: PARTNER },
    { id: "ph-b", status: "TU_CHOI", decided_by: ADM },
  ]);
  assert.deepEqual(w.q("SELECT action FROM audit_log WHERE action IN ('privacy_consent_withdrawn', 'self_submission_withdrawn') ORDER BY rowid").map((x: any) => x.action).sort(), ["privacy_consent_withdrawn", "self_submission_withdrawn"]);
});
```

Run: `node --test src/modules/parties/tu-khai-route.test.ts`
Expected: FAIL — 404 / 403 (route chưa có).

- [ ] **Step 6: SQL ở `src/modules/parties/repository.ts`** (cuối tệp, nhóm mới)

```ts
// ---- Chính sách riêng tư + đồng ý + phiếu tự khai (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2) ---------------------------------------------------------------
// Câu đọc phiếu KHÔNG chọn document_number (số đủ không bao giờ rời CSDL qua đường "của tôi"). Mọi câu chạm pty_self_submission chỉ dùng trong route /api/parties/cua-toi*
// (rào src/tu-khai-khong-len-nhan.test.ts — Hiến chương 5.23).
export interface PolicyRow { id: string; version: number; purposes: string; body: string; valid_from_at: string }
export interface PhieuRow {
  id: string; subject_kind: string; status: string; policy_id: string; birth_date: string | null; address_value: string | null; document_type_code: string | null;
  type_name: string | null; number_key: string | null; license_class_code: string | null; class_name: string | null; issued_date: string | null;
  issued_place: string | null; expiry_date: string | null; created_at: string; decided_at: string | null;
}
const CURRENT_POLICY = defineSql("parties", "current_privacy_policy",
  "SELECT id, version, purposes, body, valid_from_at FROM pty_privacy_policy WHERE valid_from_at <= ?1 ORDER BY version DESC LIMIT 1");
const MAX_POLICY_VERSION = defineSql("parties", "max_privacy_policy_version", "SELECT COALESCE(MAX(version), 0) AS v FROM pty_privacy_policy");
const INSERT_POLICY = defineSql("parties", "insert_privacy_policy",
  `INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6)`);
const LATEST_CONSENT = defineSql("parties", "latest_consent",
  "SELECT decision FROM pty_consent WHERE party_id = ?1 AND policy_id = ?2 ORDER BY created_at DESC, rowid DESC LIMIT 1");
const INSERT_CONSENT = defineSql("parties", "insert_consent",
  "INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6)");
const RUT_MOI_PHIEU_CHO = defineSql("parties", "withdraw_pending_self_submissions_of_party",
  `UPDATE pty_self_submission SET status = 'RUT', decided_at = ?2, decided_by = ?3, updated_at = ?2, updated_by = ?3
   WHERE party_id = ?1 AND status = 'CHO_XAC_MINH'`);
const LIST_PHIEU = defineSql("parties", "list_self_submissions_of_party",
  `SELECT s.id, s.subject_kind, s.status, s.policy_id, s.birth_date, s.address_value, s.document_type_code, t.name AS type_name, s.number_key,
          s.license_class_code, c.name AS class_name, s.issued_date, s.issued_place, s.expiry_date, s.created_at, s.decided_at
   FROM pty_self_submission s
   LEFT JOIN pty_person_document_type t ON t.code = s.document_type_code
   LEFT JOIN pty_license_class c ON c.code = s.license_class_code
   WHERE s.party_id = ?1 ORDER BY s.created_at DESC, s.id DESC LIMIT 50`);

export const chinhSachHienHanh = (db: D1Database, nowIso: string): Promise<PolicyRow | null> => db.prepare(CURRENT_POLICY).bind(nowIso).first<PolicyRow>();
export async function phienBanLonNhat(db: D1Database): Promise<number> {
  return (await db.prepare(MAX_POLICY_VERSION).first<{ v: number }>())?.v ?? 0;
}
export const dangChinhSachStatement = (db: D1Database, v: { id: string; version: number; mucDich: string; noiDung: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(INSERT_POLICY).bind(v.id, v.version, v.mucDich, v.noiDung, v.at, v.actorId);
export async function quyetDinhDongYMoiNhat(db: D1Database, partyId: string, policyId: string): Promise<"DONG_Y" | "RUT" | null> {
  return (await db.prepare(LATEST_CONSENT).bind(partyId, policyId).first<{ decision: "DONG_Y" | "RUT" }>())?.decision ?? null;
}
export const ghiDongYStatement = (db: D1Database, v: { id: string; partyId: string; policyId: string; quyetDinh: "DONG_Y" | "RUT"; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(INSERT_CONSENT).bind(v.id, v.partyId, v.policyId, v.quyetDinh, v.at, v.actorId);
export const rutMoiPhieuChoStatement = (db: D1Database, v: { partyId: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(RUT_MOI_PHIEU_CHO).bind(v.partyId, v.at, v.actorId);
export async function listPhieuCuaHoSo(db: D1Database, partyId: string): Promise<PhieuRow[]> {
  return (await db.prepare(LIST_PHIEU).bind(partyId).all<PhieuRow>()).results;
}
```

- [ ] **Step 7: Route ở `src/modules/parties/index.ts`**

Import thêm từ `./repository` (khối import sẵn có): `chinhSachHienHanh, phienBanLonNhat, dangChinhSachStatement, quyetDinhDongYMoiNhat, ghiDongYStatement, rutMoiPhieuChoStatement, listPhieuCuaHoSo, type PhieuRow` (và `type ContactRow, type PartyRow, type PersonDocRow` nếu chưa import). Thêm:

```ts
import { kiemChinhSach, lyDoKhongGhi, lyDoKhongGui, type LoaiPhieu, type TinhTrangTuKhai } from "./tu-khai";
import { nhanLoaiPhieu } from "../../shared/tu-khai-hien-thi";
```

và các kiểu `ChinhSachDangResponse, DongYResponse, HoSoCuaToiDto, HoSoCuaToiResponse, PhieuTuKhaiDto, TrangThaiPhieuTuKhai` vào khối `import type { … } from "../../shared/contracts"`.

Hàm trợ giúp (đặt trước `export const partiesModule`):

```ts
// ---- Hồ sơ của tôi + chính sách riêng tư (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2) ----------------------------------------------------------------------
const SELF_FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không có mục Hồ sơ của tôi.");
const POLICY_FORBIDDEN = () => error(403, "forbidden", "Chỉ Toàn quyền đăng chính sách riêng tư.");
const POLICY_CHANGED = () => error(409, "policy_changed", "Chính sách riêng tư vừa có phiên bản mới. Hãy đọc và đồng ý lại trước khi gửi.");
const POLICY_RACE = () => error(409, "policy_version_race", "Vừa có phiên bản chính sách khác được đăng. Tải lại rồi thử lại.");
const tuChoi = (l: { code: string; message: string }) => error(409, l.code, l.message);

/** Hồ sơ của PHIÊN + tình trạng tự khai. ADR-0124 đ4: own = staff.partyId — KHÔNG BAO GIỜ lấy mã hồ sơ từ đường dẫn hay thân lệnh. */
async function tinhTuKhai(db: D1Database, staff: StaffProfile, nowIso: string) {
  const [detail, chinhSach] = await Promise.all([staff.partyId ? getPartyDetail(db, staff.partyId) : Promise.resolve(null), chinhSachHienHanh(db, nowIso)]);
  const daDongY = detail && chinhSach ? (await quyetDinhDongYMoiNhat(db, detail.party.id, chinhSach.id)) === "DONG_Y" : false;
  const tt: TinhTrangTuKhai = {
    coHoSo: detail !== null, laCaNhan: detail?.party.party_kind === "PERSON", daGop: (detail?.party.merged_into_id ?? null) !== null, coChinhSach: chinhSach !== null, daDongY,
  };
  return { detail, chinhSach, tt };
}
const tenGiayTo = (typeName: string | null, typeCode: string, className: string | null): string => {
  const ten = typeName ?? typeCode;
  return className ? `${ten} hạng ${className}` : ten;
};
/** DTO "Hồ sơ của tôi" — DANH SÁCH CHO PHÉP, mọi quyền như nhau (tiền lệ vá D-1; ADR-0124 đ6). Không vai, quan hệ, gộp, tài khoản, người tạo, mốc. Số giấy tờ CHE. */
function hoSoCuaToiDto(d: { party: PartyRow; contacts: ContactRow[] }, giayTo: PersonDocRow[]): HoSoCuaToiDto {
  const mo = (k: string) => d.contacts.filter((c) => c.contact_kind_code === k && c.valid_to_date === null).map((c) => c.value);
  const caNhan = d.party.party_kind === "PERSON";
  return {
    loai: d.party.party_kind,
    hoTen: d.party.display_name,
    ngaySinh: caNhan ? d.party.birth_date : null,
    diaChi: caNhan ? mo("ADDRESS") : [],
    dienThoai: mo("PHONE"),
    email: mo("EMAIL"),
    giayTo: caNhan ? giayTo.map((r) => ({ loai: tenGiayTo(r.type_name, r.document_type_code, r.class_name), soChe: cheSo(r.number_key), hetHan: r.expiry_date })) : [],
  };
}
function phieuDto(r: PhieuRow): PhieuTuKhaiDto {
  return {
    id: r.id,
    loai: r.subject_kind as LoaiPhieu,
    trangThai: r.status as TrangThaiPhieuTuKhai,
    guiLuc: r.created_at,
    xuLyLuc: r.decided_at,
    ngaySinh: r.birth_date,
    diaChi: r.address_value,
    giayTo: r.document_type_code === null ? null : {
      loai: tenGiayTo(r.type_name, r.document_type_code, r.class_name), soChe: cheSo(r.number_key), ngayCap: r.issued_date, noiCap: r.issued_place, hetHan: r.expiry_date,
    },
  };
}
```

Ba route, khai TRƯỚC `route("GET", "/api/parties/tep-cho-xoa", …)` (tức trước mọi route `/api/parties/:id…` — sự thật 10):

```ts
    // ---- Hồ sơ của tôi + chính sách riêng tư (ADR-0124, ADR-0126 đ1; lát H-3) — khai TRƯỚC /api/parties/:id. Cổng staff: cổng duy nhất Đối tác, Tài xế đối tác qua. ----
    route("POST", "/api/parties/chinh-sach-rieng-tu", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "party.privacy.policy")) return POLICY_FORBIDDEN();
      const k = kiemChinhSach(await readJson(request));
      if (!k.ok) return error(400, "invalid_input", k.message);
      const at = new Date().toISOString();
      const version = (await phienBanLonNhat(env.DB)) + 1;
      try {
        await env.DB.batch([
          dangChinhSachStatement(env.DB, { id: crypto.randomUUID(), version, mucDich: k.value.mucDich, noiDung: k.value.noiDung, at, actorId: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "privacy_policy_published", at, targetType: "system", targetId: "chinh-sach-rieng-tu", detail: `phiên bản ${version}` }),
        ]);
      } catch (e) {
        if (/privacy_policy_(version_gap|no_replace|valid_from_back)|UNIQUE constraint failed: pty_privacy_policy/.test(e instanceof Error ? e.message : "")) return POLICY_RACE();
        throw e;
      }
      return json({ phienBan: version } satisfies ChinhSachDangResponse, 201);
    }),

    route("GET", "/api/parties/cua-toi", "staff", async ({ env, staff }) => {
      if (!can(staff, "party.self.view", { ownerId: staff.id })) return SELF_FORBIDDEN();
      const { detail, chinhSach, tt } = await tinhTuKhai(env.DB, staff, new Date().toISOString());
      const [giayTo, phieu, types, classes] = await Promise.all([
        detail && tt.laCaNhan ? listPersonDocuments(env.DB, detail.party.id, true) : Promise.resolve([]),
        detail ? listPhieuCuaHoSo(env.DB, detail.party.id) : Promise.resolve([]),
        listPersonDocumentTypes(env.DB),
        listLicenseClasses(env.DB),
      ]);
      const ly = lyDoKhongGui(tt);
      return json({
        hoSo: detail ? hoSoCuaToiDto(detail, giayTo) : null,
        chinhSach: chinhSach ? { id: chinhSach.id, phienBan: chinhSach.version, mucDich: chinhSach.purposes, noiDung: chinhSach.body, hieuLucTu: chinhSach.valid_from_at } : null,
        dongY: tt.daDongY,
        coTheGui: ly === null,
        lyDoKhongGui: ly?.message ?? null,
        phieu: phieu.map(phieuDto),
        loaiGiayTo: types.filter((t) => t.active === 1).map((t) => ({ ma: t.code, ten: t.name, coHan: t.has_expiry === 1 })),
        hangGplx: classes.filter((c) => c.active === 1).map((c) => ({ ma: c.code, ten: c.name })),
      } satisfies HoSoCuaToiResponse);
    }),

    route("POST", "/api/parties/cua-toi/dong-y", "staff", async ({ request, env, staff }) => {
      if (!can(staff, "party.self.submit", { ownerId: staff.id })) return SELF_FORBIDDEN();
      const body = await readJson(request);
      const quyetDinh = body?.quyetDinh;
      if (quyetDinh !== "DONG_Y" && quyetDinh !== "RUT") return error(400, "invalid_input", "Chọn đồng ý hoặc rút đồng ý.");
      const at = new Date().toISOString();
      const { detail, chinhSach, tt } = await tinhTuKhai(env.DB, staff, at);
      const chan = lyDoKhongGhi(tt);
      if (chan) return tuChoi(chan);
      const chuaCo = lyDoKhongGui({ ...tt, daDongY: true });
      if (chuaCo || !chinhSach) return tuChoi(chuaCo ?? { code: "no_privacy_policy", message: "" });
      if (body?.chinhSachId !== chinhSach.id) return POLICY_CHANGED();
      if ((quyetDinh === "DONG_Y") === tt.daDongY) {
        return error(409, "consent_unchanged", quyetDinh === "DONG_Y" ? "Bạn đã đồng ý phiên bản này rồi." : "Bạn chưa đồng ý phiên bản này nên không có gì để rút.");
      }
      const partyId = detail!.party.id;
      const lo: D1PreparedStatement[] = [
        ghiDongYStatement(env.DB, { id: crypto.randomUUID(), partyId, policyId: chinhSach.id, quyetDinh, at, actorId: staff.id }),
        auditStatement(env.DB, {
          staffId: staff.id, action: quyetDinh === "DONG_Y" ? "privacy_consent_given" : "privacy_consent_withdrawn", at, targetType: "party", targetId: partyId, detail: `phiên bản ${chinhSach.version}`,
        }),
      ];
      // Ruling Q2: rút đồng ý ⇒ rút luôn MỌI phiếu đang chờ của hồ sơ, CÙNG lô (bất biến R-PTY-13). Nhật ký chỉ khi có phiếu bị rút.
      if (quyetDinh === "RUT") {
        lo.push(
          rutMoiPhieuChoStatement(env.DB, { partyId, at, actorId: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "self_submission_withdrawn", at, targetType: "party", targetId: partyId, detail: "rút mọi phiếu đang chờ vì rút đồng ý" }, "changes() > 0"),
        );
      }
      await env.DB.batch(lo);
      return json({ dongY: quyetDinh === "DONG_Y" } satisfies DongYResponse);
    }),
```

(`lyDoKhongGui({ ...tt, daDongY: true })` khi hồ sơ hợp lệ chỉ còn trả `no_privacy_policy` hoặc null — một nguồn câu chữ.)

`src/route-access.test.ts` — thêm vào `SNAPSHOT` (cạnh các dòng `/api/parties/*`) và cập nhật dòng chú thích đếm (+3):

```ts
  { method: "POST", path: "/api/parties/chinh-sach-rieng-tu", access: "admin" }, // ADR-0126 đ1 (lát H-3): đăng chính sách riêng tư — thân hỏi party.privacy.policy (chỉ Toàn quyền)
  { method: "GET", path: "/api/parties/cua-toi", access: "staff" }, // ADR-0124 đ4: hồ sơ của TÔI — party.self.view own (staff.partyId); cổng staff để Đối tác, Tài xế đối tác vào được
  { method: "POST", path: "/api/parties/cua-toi/dong-y", access: "staff" }, // ADR-0124 đ3, 5.21: đồng ý / rút đồng ý — party.self.submit own; rút đồng ý rút phiếu đang chờ cùng lô
```

- [ ] **Step 8: Chạy — phải xanh**

Run: `node --test src/modules/parties/tu-khai-route.test.ts src/route-access.test.ts src/permission-enforcement.test.ts src/shared/permissions.test.ts src/goi-trang-nhe.test.ts`
Expected: PASS. Run: `npm run typecheck` → 0 lỗi (nếu `_phanLoaiDay` đỏ: thiếu hành động trong `LICH_SU_DOI_TAC_AN`). Run: `npm test` → thoát 0 (lần đầu sinh lại `src/shared/tro-ly-cau-truc.ts` — chạy lại lần hai phải xanh). Ghi số byte gói Đơn hàng sau sửa vào báo cáo.

- [ ] **Step 9: Commit**

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc-ten.ts src/shared/tro-ly-cau-truc.ts src/shared/contracts.ts src/shared/audit-actions.ts src/shared/lich-su-doi-tac.ts src/modules/parties/repository.ts src/modules/parties/index.ts src/modules/parties/tu-khai-route.test.ts src/route-access.test.ts
git commit -m "Hồ sơ của tôi: ô tự phục vụ, đăng chính sách riêng tư, đồng ý và rút đồng ý (ADR-0124, ADR-0126 đ1)"
```

---

### Task 4: Phiếu tự khai — gửi / rút, rào 5.23, không lộ số (VIỆC LỚN — quyền, dữ liệu)

**Files:**
- Modify: `src/modules/parties/repository.ts`, `src/modules/parties/index.ts`
- Modify: `src/modules/parties/tu-khai-route.test.ts` (thêm cuối tệp)
- Modify: `src/route-access.test.ts` (+2)
- Modify: `src/giay-to-khong-lo-so.test.ts` (bộ lọc, ca `TUYEN`, số / nơi cấp đánh dấu, danh sách `doNhatKyHang`)
- Modify: `tests/audit/nhat-ky-hang.mjs` (`MIEN` → `PHU_TRACH`)
- Create: `src/tu-khai-khong-len-nhan.test.ts`

**Interfaces:**
- Consumes: Task 1–3 (bảng, `tinhTuKhai`, `lyDoKhongGhi`, `kiemPhieuTuKhai`, `danhMucGiayTo` sẵn có, `nhanLoaiPhieu`, `SELF_FORBIDDEN`, `POLICY_CHANGED`, `tuChoi`).
- Produces:
  - `repository.ts`: `PhieuTimRow`; `ghiPhieuStatement(db, v)`, `timPhieuCuaHoSo(db, id, partyId): Promise<PhieuTimRow | null>`, `rutPhieuStatement(db, { id, partyId, at, actorId })`.
  - Route `POST /api/parties/cua-toi/phieu`, `POST /api/parties/cua-toi/phieu/:pid/rut` (staff).
  - Tập câu SQL chạm `pty_self_submission` (ghim ở rào 5.23): `insert_self_submission`, `list_self_submissions_of_party`, `find_self_submission_of_party`, `withdraw_self_submission`, `withdraw_pending_self_submissions_of_party`.

- [ ] **Step 1: Bài đỏ route — thêm vào cuối `src/modules/parties/tu-khai-route.test.ts`**

```ts
// ==== Phiếu tự khai (Task 4) ========================================================================================================================
const SO_KHAC = "079222333444"; // số GIẢ đã thuộc hồ sơ Quản trị (Review Focus 3)
async function sanSang(w: any, as: string): Promise<string> {
  if (!w.q("SELECT 1 FROM pty_privacy_policy").length) await dang(w);
  const cs = (await cuaToi(w, as)).chinhSach.id as string;
  assert.equal((await dongY(w, as, cs)).status, 200);
  return cs;
}
const gui = (w: any, as: string, body: Record<string, unknown>) => w.call("POST", "/api/parties/cua-toi/phieu", { as, body });
const rut = (w: any, as: string, pid: string) => w.call("POST", `/api/parties/cua-toi/phieu/${pid}/rut`, { as });

test("gửi ba loại phiếu: 201; giá trị HIỆN HÀNH không đổi (5.23); danh sách phiếu chỉ chứa số che; nhật ký chỉ mã + nhãn", async () => {
  const w = setup();
  const cs = await sanSang(w, PARTNER);
  let r = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
  assert.equal(r.status, 201, r.text);
  r = await gui(w, PARTNER, { chinhSachId: cs, loai: "DIA_CHI", diaChi: "86420 Đường Phiếu, Nha Trang" });
  assert.equal(r.status, 201, r.text);
  r = await gui(w, PARTNER, { chinhSachId: cs, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "079 111 222 333", issuedDate: "2021-01-01", issuedPlace: "NOI CAP PHIEU THU", expiryDate: "2036-01-01" } });
  assert.equal(r.status, 201, r.text);
  // 5.23: hồ sơ hiện hành, nhãn, giấy tờ không đổi
  assert.equal(w.q("SELECT birth_date b FROM pty_person WHERE party_id = ?", pty(PARTNER))[0].b, null);
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", pty(PARTNER))[0].n, 0);
  assert.equal(w.q("SELECT count(*) n FROM pty_person_document WHERE party_id = ?", pty(PARTNER))[0].n, 0);
  assert.equal(w.q("SELECT display_name n FROM v_pty_party_label WHERE id = ?", pty(PARTNER))[0].n, "Đối Tác");
  const hs = await w.call("GET", `/api/parties/${pty(PARTNER)}`, { as: SUP });
  assert.equal(hs.json.party.birthDate, null);
  assert.doesNotMatch(hs.text, /86420|1991-02-03|079111222333/);
  const d = await cuaToi(w, PARTNER);
  assert.deepEqual(d.phieu.map((p: any) => [p.loai, p.trangThai]), [["GIAY_TO", "CHO_XAC_MINH"], ["DIA_CHI", "CHO_XAC_MINH"], ["NGAY_SINH", "CHO_XAC_MINH"]]);
  for (const p of d.phieu) assert.deepEqual(Object.keys(p).sort(), ["diaChi", "giayTo", "guiLuc", "id", "loai", "ngaySinh", "trangThai", "xuLyLuc"]);
  assert.deepEqual(d.phieu[0].giayTo, { loai: "Căn cước công dân (CCCD)", soChe: "••••2333", ngayCap: "2021-01-01", noiCap: "NOI CAP PHIEU THU", hetHan: "2036-01-01" });
  assert.doesNotMatch(JSON.stringify(d), /079111222333|079 111/);
  const nk = JSON.stringify(w.q("SELECT action, detail FROM audit_log WHERE action LIKE 'self_submission_%'"));
  assert.match(nk, /Giấy tờ · Căn cước công dân/);
  assert.doesNotMatch(nk, /86420|1991-02-03|079111|NOI CAP PHIEU/);
});

test("chặn trước khi ghi: chưa đồng ý → 409 consent_required; phiên bản cũ → 409 policy_changed (Review Focus 1); thân sai → 400; không dòng nào", async () => {
  const w = setup();
  await dang(w);
  const cs = (await cuaToi(w, SALES)).chinhSach.id;
  let r = await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1990-01-01" });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "consent_required");
  await dongY(w, SALES, cs);
  await dang(w, "Toàn văn chính sách THỬ bản hai");
  r = await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1990-01-01" });
  assert.equal(r.json.error.code, "policy_changed");
  const cs2 = (await cuaToi(w, SALES)).chinhSach.id;
  await dongY(w, SALES, cs2);
  for (const body of [{ chinhSachId: cs2, loai: "HO_TEN" }, { chinhSachId: cs2, loai: "NGAY_SINH", ngaySinh: "2099-01-01" }, { chinhSachId: cs2, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "123" } }]) {
    const x = await gui(w, SALES, body);
    assert.equal(x.status, 400, JSON.stringify(body));
  }
  assert.equal(dem(w, "pty_self_submission"), 0);
});

test("Review Focus 3: khai số CCCD đã thuộc người khác ⇒ 201 như mọi số, phản hồi không có chữ nào cho biết số đã có", async () => {
  const w = setup();
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('doc-adm', ?, 'CCCD', ?, ?, ?, ?)`).run(pty(ADM), SO_KHAC, SO_KHAC, AT, AT);
  const cs = await sanSang(w, PARTNER);
  const r = await gui(w, PARTNER, { chinhSachId: cs, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: SO_KHAC } });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(Object.keys(r.json), ["phieuId"]);
  assert.doesNotMatch(r.text, /đã có|trùng|khác/i);
});

test("Review Focus 4: một phiếu đang chờ mỗi loại; rút → khai lại được; rút hai lần / phiếu đã bị từ chối → 409; phiếu người khác / mã lạ → 404", async () => {
  const w = setup();
  const cs = await sanSang(w, PARTNER);
  const a = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
  const b = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-04" });
  assert.equal(b.status, 409);
  assert.equal(b.json.error.code, "submission_pending");
  assert.equal(dem(w, "pty_self_submission"), 1, "bấm hai lần chỉ sinh MỘT phiếu");
  const pid = a.json.phieuId;
  assert.equal((await rut(w, SALES, pid)).status, 404, "phiếu của người khác như không tồn tại");
  assert.equal((await rut(w, PARTNER, crypto.randomUUID())).status, 404);
  assert.equal((await rut(w, PARTNER, "khong-phai-uuid")).status, 404);
  let r = await rut(w, PARTNER, pid);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { phieuId: pid, trangThai: "RUT" });
  r = await rut(w, PARTNER, pid);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "submission_not_pending");
  const c = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-04" });
  assert.equal(c.status, 201, "đã rút thì khai lại được");
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', decided_at = ?, decided_by = ?, reason_code = 'THU', updated_at = ? WHERE id = ?").run(AT, ADM, AT, c.json.phieuId);
  assert.equal((await rut(w, PARTNER, c.json.phieuId)).json.error.code, "submission_not_pending");
});

test("own lấy từ PHIÊN: thân mang partyId / party_id của người khác bị bỏ qua — phiếu luôn gắn hồ sơ của người gọi", async () => {
  const w = setup();
  const cs = await sanSang(w, SALES);
  const r = await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1990-01-01", partyId: pty(PARTNER), party_id: pty(PARTNER) });
  assert.equal(r.status, 201, r.text);
  assert.equal(w.q("SELECT party_id p, created_by c FROM pty_self_submission")[0].p, pty(SALES));
});

test("giống giá trị đang có (ruling R12): ngày sinh trùng / địa chỉ trùng (khác hoa thường) → 409 same_as_current", async () => {
  const w = setup();
  w.sqlite.prepare("UPDATE pty_person SET birth_date = '1988-04-23' WHERE party_id = ?").run(pty(SALES));
  w.sqlite.prepare("INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES ('cp-1', ?, 'ADDRESS', '1 Đường Cũ', '1 đường cũ', 1, '2026-01-01', ?, ?)").run(pty(SALES), AT, AT);
  const cs = await sanSang(w, SALES);
  assert.equal((await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1988-04-23" })).json.error.code, "same_as_current");
  assert.equal((await gui(w, SALES, { chinhSachId: cs, loai: "DIA_CHI", diaChi: "1 ĐƯỜNG CŨ" })).json.error.code, "same_as_current");
});

test("lính gác trong câu ghi: đồng ý bị rút trong khe giữa lúc đọc và lúc ghi ⇒ 409 consent_required, không phiếu", async () => {
  const w = setup();
  const cs = await sanSang(w, PARTNER);
  const goc = w.env.DB.batch.bind(w.env.DB);
  w.env.DB.batch = async (stmts: any[]) => {
    if (stmts.some((s) => String(s.sql).includes("INSERT INTO pty_self_submission"))) {
      w.sqlite.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c-khe', ?, ?, 'RUT', ?, ?, ?, ?)")
        .run(pty(PARTNER), cs, "2099-01-01T00:00:00.000Z", PARTNER, "2099-01-01T00:00:00.000Z", PARTNER);
    }
    return goc(stmts);
  };
  const r = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "consent_required");
  assert.equal(dem(w, "pty_self_submission"), 0);
});

test("Review Focus 5 (ghi): tài khoản tổ chức / chưa hồ sơ / đã gộp gửi phiếu → 409 đúng mã, không dòng", async () => {
  const w = setup();
  await dang(w);
  const cs = (await cuaToi(w, SALES)).chinhSach.id;
  for (const [as, ma] of [[ORG, "self_person_only"], [NOP, "no_party"], [GOP, "party_merged"]] as const) {
    const r = await gui(w, as, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1990-01-01" });
    assert.equal(r.status, 409, as);
    assert.equal(r.json.error.code, ma, as);
    assert.equal((await rut(w, as, crypto.randomUUID())).status, 404, as);
  }
  assert.equal(dem(w, "pty_self_submission"), 0);
});
```

Run: `node --test src/modules/parties/tu-khai-route.test.ts`
Expected: FAIL — các bài Task 4 nhận 404 (route chưa có); bài Task 3 vẫn xanh.

- [ ] **Step 2: SQL — thêm vào nhóm của Task 3 trong `repository.ts`**

```ts
export interface PhieuTimRow { id: string; subject_kind: string; status: string }
const INSERT_PHIEU = defineSql("parties", "insert_self_submission",
  `INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code, document_number, number_key,
     license_class_code, issued_date, issued_place, expiry_date, status, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'CHO_XAC_MINH', ?14, ?15, ?14, ?15
   WHERE (SELECT c.decision FROM pty_consent c WHERE c.party_id = ?2 AND c.policy_id = ?4 ORDER BY c.created_at DESC, c.rowid DESC LIMIT 1) = 'DONG_Y'`);
const FIND_PHIEU = defineSql("parties", "find_self_submission_of_party",
  "SELECT id, subject_kind, status FROM pty_self_submission WHERE id = ?1 AND party_id = ?2");
const RUT_PHIEU = defineSql("parties", "withdraw_self_submission",
  `UPDATE pty_self_submission SET status = 'RUT', decided_at = ?3, decided_by = ?4, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND party_id = ?2 AND status = 'CHO_XAC_MINH'`);

/** Lô gửi phiếu: câu có LÍNH GÁC đồng ý (đồng ý bị rút trong khe ⇒ không chèn, changes() = 0); trigger pty_self_submission_consent_ins là lớp thứ hai. */
export const ghiPhieuStatement = (db: D1Database, v: {
  id: string; partyId: string; loai: string; policyId: string; ngaySinh: string | null; diaChi: string | null;
  giayTo: { typeCode: string; number: string | null; numberKey: string | null; classCode: string | null; issuedDate: string | null; issuedPlace: string | null; expiryDate: string | null } | null;
  at: string; actorId: string;
}): D1PreparedStatement => {
  const g = v.giayTo;
  return db.prepare(INSERT_PHIEU).bind(
    v.id, v.partyId, v.loai, v.policyId, v.ngaySinh, v.diaChi, g?.typeCode ?? null, g?.number ?? null, g?.numberKey ?? null, g?.classCode ?? null,
    g?.issuedDate ?? null, g?.issuedPlace ?? null, g?.expiryDate ?? null, v.at, v.actorId,
  );
};
export const timPhieuCuaHoSo = (db: D1Database, id: string, partyId: string): Promise<PhieuTimRow | null> => db.prepare(FIND_PHIEU).bind(id, partyId).first<PhieuTimRow>();
export const rutPhieuStatement = (db: D1Database, v: { id: string; partyId: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(RUT_PHIEU).bind(v.id, v.partyId, v.at, v.actorId);
```

- [ ] **Step 3: Hai route — khai ngay sau `POST /api/parties/cua-toi/dong-y`**

Import thêm từ `./repository`: `ghiPhieuStatement, timPhieuCuaHoSo, rutPhieuStatement`; từ `./tu-khai`: `kiemPhieuTuKhai`; kiểu `PhieuTuKhaiTaoResponse, PhieuTuKhaiRutResponse`. Hằng lỗi (cạnh nhóm của Task 3):

```ts
const CONSENT_REQUIRED = () => error(409, "consent_required", "Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi thông tin.");
const SUBMISSION_PENDING = () => error(409, "submission_pending", "Bạn đã có một phiếu loại này đang chờ xác minh. Rút phiếu đó trước nếu muốn khai lại.");
const SUBMISSION_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy phiếu này.");
const SUBMISSION_NOT_PENDING = () => error(409, "submission_not_pending", "Phiếu này đã được xử lý hoặc đã rút.");
const SAME_AS_CURRENT = () => error(409, "same_as_current", "Thông tin này đã có trong hồ sơ của bạn.");
```

```ts
    route("POST", "/api/parties/cua-toi/phieu", "staff", async ({ request, env, staff }) => {
      if (!can(staff, "party.self.submit", { ownerId: staff.id })) return SELF_FORBIDDEN();
      const body = await readJson(request);
      const at = new Date().toISOString();
      const { detail, chinhSach, tt } = await tinhTuKhai(env.DB, staff, at);
      const chan = lyDoKhongGhi(tt);
      if (chan) return tuChoi(chan);
      if (!chinhSach) return tuChoi(lyDoKhongGui(tt)!);
      if (body?.chinhSachId !== chinhSach.id) return POLICY_CHANGED();
      if (!tt.daDongY) return CONSENT_REQUIRED();
      const { dm, tenLoai, tenHang } = await danhMucGiayTo(env.DB, vnToday(new Date()));
      const k = kiemPhieuTuKhai(body, dm);
      if (!k.ok) return error(400, "invalid_input", k.message);
      const p = detail!.party;
      const n = k.value;
      // Ruling R12: trùng giá trị đang có thì không tạo phiếu vô nghĩa. Giấy tờ không kiểm (gia hạn). KHÔNG kiểm trùng CCCD với người khác (R8 — không dò số).
      if (n.loai === "NGAY_SINH" && p.birth_date === n.ngaySinh) return SAME_AS_CURRENT();
      if (n.loai === "DIA_CHI" && detail!.contacts.some((c) => c.contact_kind_code === "ADDRESS" && c.valid_to_date === null && c.value.toLowerCase() === n.diaChi.toLowerCase())) {
        return SAME_AS_CURRENT();
      }
      const id = crypto.randomUUID();
      const g = n.loai === "GIAY_TO" ? n.giayTo : null;
      const chiTiet = `phiếu ${id} · ${nhanLoaiPhieu(n.loai)}${g ? ` · ${tenLoai(g.typeCode)}${g.classCode ? ` hạng ${tenHang(g.classCode)}` : ""}` : ""}`;
      try {
        const kq = await env.DB.batch([
          ghiPhieuStatement(env.DB, {
            id, partyId: p.id, loai: n.loai, policyId: chinhSach.id, ngaySinh: n.loai === "NGAY_SINH" ? n.ngaySinh : null, diaChi: n.loai === "DIA_CHI" ? n.diaChi : null,
            giayTo: g, at, actorId: staff.id,
          }),
          auditStatement(env.DB, { staffId: staff.id, action: "self_submission_created", at, targetType: "party", targetId: p.id, detail: chiTiet }, "changes() > 0"),
        ]);
        if ((kq[0]?.meta.changes ?? 0) !== 1) return CONSENT_REQUIRED(); // lính gác trong câu ghi: đồng ý bị rút trong khe
      } catch (e) {
        const m = e instanceof Error ? e.message : "";
        if (/self_submission_pending_exists|pty_self_submission_one_pending_uq/.test(m)) return SUBMISSION_PENDING();
        if (/self_submission_no_consent/.test(m)) return CONSENT_REQUIRED();
        if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Loại giấy tờ hoặc hạng không tồn tại.");
        throw e;
      }
      return json({ phieuId: id } satisfies PhieuTuKhaiTaoResponse, 201);
    }),

    route("POST", "/api/parties/cua-toi/phieu/:pid/rut", "staff", async ({ env, staff, params }) => {
      if (!can(staff, "party.self.submit", { ownerId: staff.id })) return SELF_FORBIDDEN();
      const pid = idParam(params, "pid", UUID_RE);
      if (!pid || !staff.partyId) return SUBMISSION_NOT_FOUND();
      const r = await timPhieuCuaHoSo(env.DB, pid, staff.partyId); // chỉ phiếu của HỒ SƠ PHIÊN — phiếu người khác như không tồn tại (không dò được)
      if (!r) return SUBMISSION_NOT_FOUND();
      if (r.status !== "CHO_XAC_MINH") return SUBMISSION_NOT_PENDING();
      const at = new Date().toISOString();
      const kq = await env.DB.batch([
        rutPhieuStatement(env.DB, { id: pid, partyId: staff.partyId, at, actorId: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "self_submission_withdrawn", at, targetType: "party", targetId: staff.partyId, detail: `phiếu ${pid} · ${nhanLoaiPhieu(r.subject_kind)}` }, "changes() > 0"),
      ]);
      if ((kq[0]?.meta.changes ?? 0) !== 1) return SUBMISSION_NOT_PENDING();
      return json({ phieuId: pid, trangThai: "RUT" } satisfies PhieuTuKhaiRutResponse);
    }),
```

`src/route-access.test.ts` — thêm (+2, sửa chú thích đếm):

```ts
  { method: "POST", path: "/api/parties/cua-toi/phieu", access: "staff" }, // ADR-0124 đ1, đ3: gửi phiếu tự khai — party.self.submit own; giá trị khai là đề xuất (5.23)
  { method: "POST", path: "/api/parties/cua-toi/phieu/:pid/rut", access: "staff" }, // rút phiếu ĐANG CHỜ của chính mình — phiếu người khác 404
```

Run: `node --test src/modules/parties/tu-khai-route.test.ts src/route-access.test.ts` → PASS.

- [ ] **Step 4: Bài đỏ "không lộ số" — `src/giay-to-khong-lo-so.test.ts`**

- Bộ lọc `TUYEN_THAT`: thay `.filter((k) => /\/documents|\/giay-to/.test(k.split(" ")[1]!))` bằng `.filter((k) => /\/documents|\/giay-to|^\/api\/parties\/cua-toi/.test(k.split(" ")[1]!))` (sự thật 8).
- Hằng đánh dấu (cạnh `SO_CCCD`): `const SO_PHIEU = "079666555444";` và `const NOI_PHIEU = "NOI CAP PHIEU DANH DAU";`; thêm `SO_PHIEU` vào mảng của `DAU_SO_NGUOI`.
- Bốn ca vào `TUYEN` (TX là tài xế công ty đã tạo ở đầu bài; `SUP` đăng chính sách):

```ts
    "GET /api/parties/cua-toi": async () => {
      await goi("Toàn quyền đăng chính sách (thử)", "POST", "/api/parties/chinh-sach-rieng-tu", SUP, { mucDich: "thử", noiDung: "thử" }, 201);
      await goi("hồ sơ của tôi", "GET", "/api/parties/cua-toi", TX, undefined, 200);
    },
    "POST /api/parties/cua-toi/dong-y": async () => {
      const cs = (await w.call("GET", "/api/parties/cua-toi", { as: TX })).json.chinhSach.id as string;
      await goi("đồng ý chính sách", "POST", "/api/parties/cua-toi/dong-y", TX, { chinhSachId: cs, quyetDinh: "DONG_Y" }, 200);
    },
    "POST /api/parties/cua-toi/phieu": async () => {
      const cs = (await w.call("GET", "/api/parties/cua-toi", { as: TX })).json.chinhSach.id as string;
      await goi("phiếu tự khai CCCD", "POST", "/api/parties/cua-toi/phieu", TX, { chinhSachId: cs, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "079 666 555 444", issuedPlace: NOI_PHIEU, expiryDate: "2036-01-01" } }, 201);
      await goi("hồ sơ của tôi sau khi khai", "GET", "/api/parties/cua-toi", TX, undefined, 200);
    },
    "POST /api/parties/cua-toi/phieu/:pid/rut": async () => {
      const cs = (await w.call("GET", "/api/parties/cua-toi", { as: TX })).json.chinhSach.id as string;
      const r = await goi("phiếu khám sức khoẻ để rút", "POST", "/api/parties/cua-toi/phieu", TX, { chinhSachId: cs, loai: "GIAY_TO", giayTo: { typeCode: "HEALTH_CHECK", number: SO_SUC_KHOE, expiryDate: ngay(30) } }, 201);
      await goi("rút phiếu", "POST", `/api/parties/cua-toi/phieu/${r.json.phieuId}/rut`, TX, undefined, 200);
    },
```

(Đặt bốn ca TRƯỚC các ca `/documents` của hồ sơ TX nếu thứ tự ảnh hưởng — `TUYEN` chạy theo thứ tự khoá đã khai; ca đầu phải là `GET /api/parties/cua-toi` vì nó đăng chính sách.)
- Phần (2) nhật ký: thêm `NOI_PHIEU` vào vòng `for (const noi of [NOI, NOI_MOI])`.
- Danh sách `doNhatKyHang`: thêm `"pty_self_submission.document_number", "pty_self_submission.number_key", "pty_self_submission.issued_place"`.

`tests/audit/nhat-ky-hang.mjs`: xoá ba mục `pty_self_submission.*` khỏi `MIEN`, thêm vào `PHU_TRACH`:

```js
  "pty_self_submission.document_number": "src/giay-to-khong-lo-so.test.ts",
  "pty_self_submission.number_key": "src/giay-to-khong-lo-so.test.ts",
  "pty_self_submission.issued_place": "src/giay-to-khong-lo-so.test.ts",
```

Run: `node --test src/giay-to-khong-lo-so.test.ts` → Expected PASS nếu route đúng (bài này viết SAU route nên phá thử ở Step 6 chứng minh nó có răng).

- [ ] **Step 5: Rào 5.23 — `src/tu-khai-khong-len-nhan.test.ts`**

```ts
// HÀNG RÀO 5.23 (ADR-0124 đ1, Hệ quả; lát H-3 Gói 2): giá trị TỰ KHAI chưa xác minh không bao giờ lên nhãn, đơn, chứng từ, Danh bạ. Chỉ bốn route /api/parties/cua-toi* đọc
// / ghi bảng pty_self_submission. Ba lưới: (1) chữ "pty_self_submission" chỉ ở src/modules/parties/repository.ts (ngoài tệp test); không view nào đọc bảng; (2) câu SQL đăng ký
// chạm bảng = ĐÚNG tập ghim; (3) trong index.ts, năm hàm repository chạm bảng chỉ xuất hiện trong khối import và trong thân route có đường bắt đầu /api/parties/cua-toi.
// Phá thử: gọi listPhieuCuaHoSo trong respondParty → (3) đỏ; thêm view chọn từ pty_self_submission vào migration → (1) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const BANG = "pty_self_submission";
const CAU_GHIM = ["find_self_submission_of_party", "insert_self_submission", "list_self_submissions_of_party", "withdraw_pending_self_submissions_of_party", "withdraw_self_submission"];
const HAM = ["ghiPhieuStatement", "listPhieuCuaHoSo", "timPhieuCuaHoSo", "rutPhieuStatement", "rutMoiPhieuChoStatement"];

function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return tepTs(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

test("(1) tên bảng chỉ ở parties/repository.ts; không view nào đọc bảng phiếu", () => {
  const co = tepTs(SRC).filter((p) => readFileSync(p, "utf8").includes(BANG)).map((p) => p.slice(SRC.length));
  assert.deepEqual(co, ["modules/parties/repository.ts"]);
  const mig = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(mig).filter((x) => x.endsWith(".sql"))) {
    for (const v of readFileSync(new URL(f, mig), "utf8").split(/;\s*\n/).filter((c) => /CREATE\s+VIEW/i.test(c))) assert.ok(!v.includes(BANG), `${f}: view đọc ${BANG}`);
  }
});

test("(2) câu SQL đăng ký chạm bảng phiếu = đúng tập ghim", async () => {
  await import("./modules/parties/repository.ts");
  const { registeredSql } = await import("./shared/sql-registry.ts");
  const ten = registeredSql().filter((e) => e.sql.includes(BANG)).map((e) => e.name).sort();
  assert.deepEqual(ten, CAU_GHIM);
});

test("(3) trong parties/index.ts, hàm chạm bảng phiếu chỉ được gọi trong thân route /api/parties/cua-toi*", () => {
  const src = readFileSync(join(SRC, "modules/parties/index.ts"), "utf8").replace(/^import[\s\S]*?from\s+"[^"]+";\s*$/gm, "");
  const khuc = src.split(/(?=\broute\(")/);
  const loi: string[] = [];
  for (const k of khuc) {
    const m = /^route\("[A-Z]+", "([^"]+)"/.exec(k);
    const duong = m?.[1] ?? "(ngoài route)";
    for (const h of HAM) if (new RegExp(`\\b${h}\\b`).test(k) && !duong.startsWith("/api/parties/cua-toi")) loi.push(`${h} ở ${duong}`);
  }
  assert.deepEqual(loi, []);
  for (const h of HAM) assert.ok(khuc.some((k) => new RegExp(`\\b${h}\\b`).test(k)), `chống bài rỗng: ${h} phải được dùng`);
});
```

Run: `node --test src/tu-khai-khong-len-nhan.test.ts` → PASS.

- [ ] **Step 6: Phá thử ngay (P16 — ghi lại cho Task 6, mỗi lần hoàn nguyên rồi `git diff --stat` chỉ còn thay đổi của task):**
  1. Trong route gửi phiếu, đổi `partyId: p.id` thành `partyId: String(body?.partyId ?? p.id)` → bài "own lấy từ PHIÊN" đỏ.
  2. Trong `phieuDto`, đổi `soChe: cheSo(r.number_key)` thành `soChe: r.number_key` → bài "gửi ba loại phiếu" và `giay-to-khong-lo-so` (3) đỏ.
  3. Thêm `void listPhieuCuaHoSo(ctx.env.DB, id);` vào đầu `respondParty` → rào 5.23 (3) đỏ.
  4. Bỏ `if (!tt.daDongY) return CONSENT_REQUIRED();` VÀ mệnh đề `WHERE (SELECT c.decision …) = 'DONG_Y'` của `INSERT_PHIEU` → bài "chặn trước khi ghi" vẫn 409 nhờ trigger (ghi: hai lớp — trigger là lớp cuối); rồi xoá thêm trigger `pty_self_submission_consent_ins` khỏi bản sao SQLite của khung thử (`w.sqlite.exec("DROP TRIGGER pty_self_submission_consent_ins")` tạm trong bài) → đỏ.
  5. Trong `chiTiet`, nối thêm `${g?.number}` → `giay-to-khong-lo-so` (2) đỏ.

- [ ] **Step 7: Bộ kiểm**

Run: `npm run typecheck` → 0 lỗi. Run: `npm test` → thoát 0. Run: `node --test src/goi-trang-nhe.test.ts` → PASS (Task 4 không chạm gói giao diện).

- [ ] **Step 8: Commit**

```bash
git add src/modules/parties/repository.ts src/modules/parties/index.ts src/modules/parties/tu-khai-route.test.ts src/route-access.test.ts src/giay-to-khong-lo-so.test.ts tests/audit/nhat-ky-hang.mjs src/tu-khai-khong-len-nhan.test.ts
git commit -m "Phiếu tự khai: gửi và rút phiếu của chính mình, rào giá trị tự khai không lên nhãn, số giấy tờ khai không lộ (ADR-0124)"
```

- [ ] **Step 9: Người kiểm độc lập (điều phối giao, phủ Task 2–4)** — đọc `tu-khai.ts`, năm route, DTO, SQL; tự phá ít nhất: (a) đọc mã hồ sơ từ thân; (b) bỏ `can(` của một route; (c) thêm khoá vào DTO; (d) đổi cổng một route `cua-toi` sang `office` (Đối tác phải 403 → bài DTO đỏ); (e) bỏ phần rút phiếu khi rút đồng ý; (f) nối số vào nhật ký. Xác nhận: không route nào ghi > 1 lô; `GHI_NHIEU_LAN` không đổi; trần gói Đơn hàng không đổi; `party.document.view` không đổi; không ô `party.erasure.request`.

---

### Task 5: Giao diện "Hồ sơ của tôi" ở trang Tôi + kịch bản Chrome (nhỏ — giao diện)

**Files:**
- Create: `web/ho-so-cua-toi.ts`
- Modify: `web/account.ts` (một import + một lời gọi), `public/account.html` (một `<section>`), `public/app.css` (một token + khối `.hs-*`)
- Create: `src/ho-so-cua-toi-giao-dien.test.ts`
- Create: `docs/evidence/2026-10-17-tu-khai/kich-ban/tu-khai-smoke.mjs`

**Interfaces:**
- Consumes: `GET /api/parties/cua-toi`, `POST /api/parties/cua-toi/dong-y`, `POST /api/parties/cua-toi/phieu`, `POST /api/parties/cua-toi/phieu/:pid/rut`, `POST /api/parties/chinh-sach-rieng-tu`; `Api.HoSoCuaToiResponse` (Task 3); `nhanLoaiPhieu`, `nhanTrangThaiPhieu` (Task 2); `can` (Task 3).
- Produces: `initHoSoCuaToi(staff: Api.StaffProfile, khung: HTMLElement, baoLoi: (m: string | null) => void): Promise<void>`.

- [ ] **Step 1: Rào tĩnh đỏ — `src/ho-so-cua-toi-giao-dien.test.ts`**

```ts
// Rào tĩnh của khối "Hồ sơ của tôi" (lát H-3 Gói 2): (1) chỉ gọi route /api/parties/cua-toi* và POST /api/parties/chinh-sach-rieng-tu — KHÔNG BAO GIỜ PUT /api/parties/:id hay route
// liên hệ (nợ khoá birthDate / nút Đóng ADDRESS của lát H-1 không chạm tới đây); (2) không innerHTML; (3) ẩn/hiện hỏi bảng quyền bằng can(), không hasPermission; (4) không
// ô tải tệp (ruling R1); (5) web/orders.ts không kéo khối này vào gói (trần gói Đơn hàng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../web/ho-so-cua-toi.ts", import.meta.url), "utf8");

test("(1) chỉ các route của khối; không PUT /api/parties/:id, không route liên hệ", () => {
  const duong = [...src.matchAll(/["`](\/api\/[^"`$]*)/g)].map((m) => m[1]!);
  assert.ok(duong.length >= 4, "chống bài rỗng");
  for (const d of duong) assert.ok(d.startsWith("/api/parties/cua-toi") || d === "/api/parties/chinh-sach-rieng-tu", `gọi route ngoài khối: ${d}`);
  assert.doesNotMatch(src, /method:\s*"PUT"/);
  assert.doesNotMatch(src, /\/contacts/);
});

test("(2)(3)(4) không innerHTML, hỏi can(), không hasPermission, không input type=file", () => {
  assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML/);
  assert.match(src, /can\(staff, "party\.self\.view", \{ ownerId: staff\.id \}\)/);
  assert.match(src, /can\(staff, "party\.privacy\.policy"\)/);
  assert.doesNotMatch(src, /hasPermission|holdsPartner/);
  assert.doesNotMatch(src, /type:\s*"file"/);
});

test("(5) web/orders.ts không import khối này", () => {
  assert.doesNotMatch(readFileSync(new URL("../web/orders.ts", import.meta.url), "utf8"), /ho-so-cua-toi/);
});
```

Run: `node --test src/ho-so-cua-toi-giao-dien.test.ts` → FAIL `ENOENT` (tệp chưa có).

- [ ] **Step 2: Viết `web/ho-so-cua-toi.ts`**

```ts
// "Hồ sơ của tôi" ở trang Tôi (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2): xem hồ sơ của mình (số CHE), đọc + đồng ý chính sách riêng tư, gửi / rút phiếu tự khai ngày sinh, địa
// chỉ, giấy tờ; Toàn quyền đăng phiên bản chính sách mới. Chỉ gọi /api/parties/cua-toi* và POST /api/parties/chinh-sach-rieng-tu (rào src/ho-so-cua-toi-giao-dien.test.ts).
// Ẩn/hiện hỏi bảng quyền (can — web/CLAUDE.md). Không innerHTML. Không ảnh (ruling R1). Sau mỗi lệnh ghi: location.replace (web/CLAUDE.md "Bẫy đã cắn thật").
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { nhanLoaiPhieu, nhanTrangThaiPhieu } from "../src/shared/tu-khai-hien-thi";
import { vnDateTimeText } from "../src/shared/vn-date";
import { h, replaceChildren } from "./dom";

type Staff = Api.StaffProfile;
type Du = Api.HoSoCuaToiResponse;
const THONG_BAO: Record<string, string> = { "da-gui": "Đã gửi. Người khác sẽ xác minh trước khi thông tin được dùng.", "da-luu": "Đã lưu." };
const tai = (co: string) => location.replace(`/account?hoso=${co}#ho-so-cua-toi`);
const cauLoi = (e: unknown) => (e instanceof ApiError ? e.message : "Không kết nối được. Kiểm tra mạng rồi thử lại.");

export async function initHoSoCuaToi(staff: Staff, khung: HTMLElement, baoLoi: (m: string | null) => void): Promise<void> {
  if (!staff.partyId || !can(staff, "party.self.view", { ownerId: staff.id })) return;
  let d: Du;
  try {
    d = await api<Du>("/api/parties/cua-toi");
  } catch (e) {
    baoLoi(cauLoi(e));
    return;
  }
  const co = new URLSearchParams(location.search).get("hoso") ?? "";
  replaceChildren(
    khung,
    h("h2", { id: "hs-heading" }, "Hồ sơ của tôi"),
    Object.hasOwn(THONG_BAO, co) ? h("div", { class: "alert ok", role: "status" }, THONG_BAO[co]!) : null,
    ...khoiHoSo(d),
    ...khoiChinhSach(d, baoLoi),
    d.coTheGui ? formKhai(d, baoLoi) : d.lyDoKhongGui ? h("p", { class: "muted" }, d.lyDoKhongGui) : null,
    ...khoiPhieu(d, baoLoi),
    can(staff, "party.privacy.policy") ? khoiDangChinhSach(d, baoLoi) : null,
  );
  khung.hidden = false;
}

function dong(nhan: string, giaTri: string): HTMLElement {
  return h("div", { class: "hs-dong" }, h("span", { class: "muted" }, nhan), h("span", null, giaTri));
}
function khoiHoSo(d: Du): (HTMLElement | null)[] {
  const s = d.hoSo;
  if (!s) return [];
  const caNhan = s.loai === "PERSON";
  return [
    h("h3", null, "Thông tin đang có"),
    dong("Họ tên", s.hoTen),
    caNhan ? dong("Ngày sinh", s.ngaySinh ? ngayVN(s.ngaySinh) : "Chưa có") : null,
    caNhan ? dong("Địa chỉ", s.diaChi.join("; ") || "Chưa có") : null,
    dong("Điện thoại", s.dienThoai.join(", ") || "Chưa có"),
    dong("Email", s.email.join(", ") || "Chưa có"),
    caNhan ? dong("Giấy tờ", s.giayTo.map((g) => `${g.loai}${g.soChe ? ` ${g.soChe}` : ""}${g.hetHan ? ` (hết hạn ${ngayVN(g.hetHan)})` : ""}`).join("; ") || "Chưa có") : null,
    h("p", { class: "muted" }, "Thông tin bạn gửi chỉ được dùng sau khi người khác xác minh. Trong lúc chờ, hồ sơ vẫn giữ thông tin cũ."),
  ];
}
function khoiChinhSach(d: Du, baoLoi: (m: string | null) => void): (HTMLElement | null)[] {
  const cs = d.chinhSach;
  if (!cs || !d.hoSo || d.hoSo.loai !== "PERSON") return [];
  const gui = async (quyetDinh: "DONG_Y" | "RUT") => {
    try {
      await api<Api.DongYResponse>("/api/parties/cua-toi/dong-y", { method: "POST", body: { chinhSachId: cs.id, quyetDinh } });
      tai("da-luu");
    } catch (e) {
      baoLoi(cauLoi(e));
    }
  };
  const vanBan = h("details", { class: "hs-chinh-sach-hop" }, h("summary", null, `Chính sách riêng tư (phiên bản ${cs.phienBan})`), h("p", null, cs.mucDich), h("div", { class: "hs-chinh-sach" }, cs.noiDung));
  if (d.dongY) {
    const nutRut = h("button", { class: "btn", type: "button" }, "Rút đồng ý");
    const xacNhan = h("div", { class: "hs-xac-nhan", hidden: true },
      h("p", null, "Rút đồng ý sẽ rút luôn mọi phiếu đang chờ xác minh. Bạn chắc chứ?"),
      h("button", { class: "btn btn-danger", type: "button", onclick: () => void gui("RUT") }, "Rút đồng ý"),
      h("button", { class: "btn", type: "button", onclick: () => { xacNhan.hidden = true; nutRut.hidden = false; } }, "Thôi"));
    nutRut.addEventListener("click", () => { nutRut.hidden = true; xacNhan.hidden = false; });
    return [vanBan, h("p", null, `Bạn đã đồng ý chính sách riêng tư phiên bản ${cs.phienBan}.`), nutRut, xacNhan];
  }
  const o = h("input", { type: "checkbox", id: "hs-dong-y" }) as HTMLInputElement;
  const nut = h("button", { class: "btn btn-primary", type: "button", disabled: true, onclick: () => void gui("DONG_Y") }, "Đồng ý") as HTMLButtonElement;
  o.addEventListener("change", () => { nut.disabled = !o.checked; });
  return [vanBan, h("label", { class: "hs-check", for: "hs-dong-y" }, o, h("span", null, `Tôi đã đọc và đồng ý chính sách riêng tư phiên bản ${cs.phienBan}.`)), nut];
}
function formKhai(d: Du, baoLoi: (m: string | null) => void): HTMLElement {
  const loai = h("select", { id: "hs-loai" },
    h("option", { value: "NGAY_SINH" }, "Ngày sinh"), h("option", { value: "DIA_CHI" }, "Địa chỉ"), h("option", { value: "GIAY_TO" }, "Giấy tờ")) as HTMLSelectElement;
  const ngaySinh = h("input", { type: "date", id: "hs-ngay-sinh", max: new Date().toISOString().slice(0, 10) }) as HTMLInputElement;
  const diaChi = h("input", { type: "text", id: "hs-dia-chi", maxlength: 200, autocomplete: "street-address" }) as HTMLInputElement;
  const loaiGiay = h("select", { id: "hs-loai-giay" }, ...d.loaiGiayTo.map((t) => h("option", { value: t.ma }, t.ten))) as HTMLSelectElement;
  const so = h("input", { type: "text", id: "hs-so", maxlength: 40, autocomplete: "off" }) as HTMLInputElement;
  const hang = h("select", { id: "hs-hang" }, h("option", { value: "" }, "—"), ...d.hangGplx.map((c) => h("option", { value: c.ma }, c.ten))) as HTMLSelectElement;
  const ngayCap = h("input", { type: "date", id: "hs-ngay-cap" }) as HTMLInputElement;
  const noiCap = h("input", { type: "text", id: "hs-noi-cap", maxlength: 200 }) as HTMLInputElement;
  const hetHan = h("input", { type: "date", id: "hs-het-han" }) as HTMLInputElement;
  const oNgay = h("label", null, "Ngày sinh", ngaySinh);
  const oDiaChi = h("label", null, "Địa chỉ", diaChi);
  const oHang = h("label", null, "Hạng (giấy phép lái xe)", hang);
  const oHetHan = h("label", null, "Ngày hết hạn", hetHan);
  const oGiay = h("div", null, h("label", null, "Loại giấy tờ", loaiGiay), h("label", null, "Số", so), oHang, h("label", null, "Ngày cấp", ngayCap), h("label", null, "Nơi cấp", noiCap), oHetHan);
  const hien = () => {
    oNgay.hidden = loai.value !== "NGAY_SINH";
    oDiaChi.hidden = loai.value !== "DIA_CHI";
    oGiay.hidden = loai.value !== "GIAY_TO";
    oHang.hidden = loaiGiay.value !== "GPLX";
    oHetHan.hidden = !(d.loaiGiayTo.find((t) => t.ma === loaiGiay.value)?.coHan ?? true);
  };
  loai.addEventListener("change", hien);
  loaiGiay.addEventListener("change", hien);
  hien();
  const rong = (v: string) => (v.trim() === "" ? null : v.trim());
  const form = h("form", { id: "hs-form", autocomplete: "off" },
    h("h3", null, "Khai thông tin để xác minh"), h("label", null, "Bạn muốn khai", loai), oNgay, oDiaChi, oGiay,
    h("button", { class: "btn btn-primary", type: "submit" }, "Gửi xác minh")) as HTMLFormElement;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const body: Record<string, unknown> = { chinhSachId: d.chinhSach!.id, loai: loai.value };
    if (loai.value === "NGAY_SINH") body.ngaySinh = ngaySinh.value;
    else if (loai.value === "DIA_CHI") body.diaChi = diaChi.value;
    else body.giayTo = { typeCode: loaiGiay.value, number: rong(so.value), classCode: oHang.hidden ? null : rong(hang.value), issuedDate: rong(ngayCap.value), issuedPlace: rong(noiCap.value), expiryDate: oHetHan.hidden ? null : rong(hetHan.value) };
    try {
      await api<Api.PhieuTuKhaiTaoResponse>("/api/parties/cua-toi/phieu", { method: "POST", body });
      tai("da-gui");
    } catch (e) {
      baoLoi(cauLoi(e));
    }
  });
  return form;
}
function khoiPhieu(d: Du, baoLoi: (m: string | null) => void): HTMLElement[] {
  if (d.phieu.length === 0) return [];
  return [
    h("h3", null, "Phiếu đã gửi"),
    ...d.phieu.map((p) => {
      const noiDung = p.loai === "NGAY_SINH" ? ngayVN(p.ngaySinh) : p.loai === "DIA_CHI" ? (p.diaChi ?? "") : p.giayTo ? `${p.giayTo.loai}${p.giayTo.soChe ? ` ${p.giayTo.soChe}` : ""}` : "";
      const dongP = h("div", { class: "hs-phieu" },
        h("strong", null, nhanLoaiPhieu(p.loai)), h("span", null, noiDung), h("span", { class: "muted" }, nhanTrangThaiPhieu(p.trangThai)),
        h("span", { class: "muted" }, `Gửi lúc ${vnDateTimeText(p.guiLuc)}`));
      if (p.trangThai === "CHO_XAC_MINH") {
        const nut = h("button", { class: "btn", type: "button" }, "Rút phiếu");
        const xacNhan = h("span", { class: "hs-xac-nhan", hidden: true },
          h("button", { class: "btn btn-danger", type: "button", onclick: async () => {
            try {
              await api<Api.PhieuTuKhaiRutResponse>(`/api/parties/cua-toi/phieu/${p.id}/rut`, { method: "POST" });
              tai("da-luu");
            } catch (e) {
              baoLoi(cauLoi(e));
            }
          } }, "Rút phiếu này"),
          h("button", { class: "btn", type: "button", onclick: () => { xacNhan.hidden = true; nut.hidden = false; } }, "Thôi"));
        nut.addEventListener("click", () => { nut.hidden = true; xacNhan.hidden = false; });
        dongP.append(nut, xacNhan);
      }
      return dongP;
    }),
  ];
}
function khoiDangChinhSach(d: Du, baoLoi: (m: string | null) => void): HTMLElement {
  const mucDich = h("textarea", { id: "hs-cs-muc-dich", maxlength: 2000, rows: 3 }) as HTMLTextAreaElement;
  const noiDung = h("textarea", { id: "hs-cs-noi-dung", maxlength: 20000, rows: 8 }) as HTMLTextAreaElement;
  if (d.chinhSach) {
    mucDich.value = d.chinhSach.mucDich;
    noiDung.value = d.chinhSach.noiDung;
  }
  const form = h("form", { id: "hs-dang-cs" },
    h("p", { class: "muted" }, "Đăng phiên bản mới thì mọi người phải đồng ý lại trước khi gửi thông tin. Chữ chính sách cần chủ dự án và luật sư duyệt trước khi đăng."),
    h("label", null, "Mục đích thu thập", mucDich), h("label", null, "Toàn văn chính sách", noiDung),
    h("button", { class: "btn btn-primary", type: "submit" }, "Đăng phiên bản mới")) as HTMLFormElement;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      await api<Api.ChinhSachDangResponse>("/api/parties/chinh-sach-rieng-tu", { method: "POST", body: { mucDich: mucDich.value, noiDung: noiDung.value } });
      tai("da-luu");
    } catch (e) {
      baoLoi(cauLoi(e));
    }
  });
  return h("details", { id: "hs-dang-chinh-sach" }, h("summary", null, "Đăng chính sách riêng tư mới"), form);
}
```

(Đã kiểm khi soạn: `h()` của `web/dom.ts` gắn thuộc tính `on…` là hàm bằng `addEventListener`; `ngayVN(iso: string | null)` ở `src/shared/giay-to-hien-thi.ts`, `vnDateTimeText(iso)` ở `src/shared/vn-date.ts`; `web/account.ts` có sẵn `const staff = await initShell()` và `const errorEl = byId("error")`; hàng `listPersonDocumentTypes` có `has_expiry`, `active`, hàng `listLicenseClasses` có `active`. `src/goi-trang-nhe.test.ts` chỉ có trần cho `web/orders.ts` — trang Tôi không có trần riêng.)

- [ ] **Step 3: Gắn vào trang Tôi**

`public/account.html` — ngay sau `<section id="myjobs" hidden></section>`:

```html
    <!-- Hồ sơ của tôi (ADR-0124, lát H-3): web/ho-so-cua-toi.ts chỉ hiện cho tài khoản có hồ sơ và ô party.self.view (mọi tài khoản, kể cả Đối tác). -->
    <section id="ho-so-cua-toi" class="card" aria-labelledby="hs-heading" hidden></section>
```

`web/account.ts` — import `import { initHoSoCuaToi } from "./ho-so-cua-toi";` và, cạnh lời gọi `initGiayToCuaToi`:

```ts
void initHoSoCuaToi(staff, byId("ho-so-cua-toi"), (m) => showError(errorEl, m));
```

`public/app.css` — trong `:root`, nhóm "Riêng của Tour Đảo Booking": `--h-hs-chinh-sach: 16rem;`. Khối mới đặt TRƯỚC mốc `/* ---------- app iPhone (PWA)` (vẫn chỉ token):

```css
/* ---------- Hồ sơ của tôi (ADR-0124, lát H-3) — chỉ token ---------- */
.hs-dong { display: flex; flex-wrap: wrap; gap: var(--s1) var(--s2); padding: var(--s1) 0; }
.hs-dong > .muted { min-width: 8em; }
.hs-chinh-sach { white-space: pre-line; max-height: var(--h-hs-chinh-sach); overflow: auto; padding: var(--s2); border: 1px solid var(--c-input-border); border-radius: var(--radius-sm); }
.hs-check { display: flex; gap: var(--s2); align-items: flex-start; }
.hs-check input { width: auto; margin-top: var(--s1); }
.hs-phieu { display: flex; flex-wrap: wrap; gap: var(--s1) var(--s2); align-items: baseline; padding: var(--s2) 0; border-top: 1px solid var(--c-input-border); }
.hs-xac-nhan { display: inline-flex; flex-wrap: wrap; gap: var(--s2); align-items: center; }
```

(`em` dùng ở khối TRƯỚC mốc PWA được — mốc quét chỉ áp sau dấu. Nếu muốn tuyệt đối token: thêm `--w-hs-nhan: 8em;` vào nhóm riêng và dùng `min-width: var(--w-hs-nhan)`.)

Run: `node --test src/ho-so-cua-toi-giao-dien.test.ts src/giao-dien-hoi-bang-quyen.test.ts src/goi-trang-nhe.test.ts` → PASS. Run: `npm run build:web` → thoát 0. Run: `npm run typecheck` → 0 lỗi. Run: `npm test` → thoát 0.

- [ ] **Step 4: Kịch bản Chrome — `docs/evidence/2026-10-17-tu-khai/kich-ban/tu-khai-smoke.mjs`**

```js
// Kịch bản Chrome — khối "Hồ sơ của tôi" ở trang Tôi (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2). D1 tạm của vc-lib (không đụng dữ liệu thật). Chữ chính sách là chữ THỬ.
// 1) Đối tác (390): chưa có chính sách → khối hiện, câu "Chưa có chính sách riêng tư…", không form.
// 2) Toàn quyền đăng chính sách qua API. Đối tác (390 + 1040): hộp đồng ý; tick + Đồng ý → tải lại, form hiện; MỌI ô gõ 16px; khai CCCD → "Đã gửi…", phiếu "Chờ xác minh",
//    số đủ không có trong DOM; axe.
// 3) Đối tác rút phiếu (bước xác nhận trong trang) → "Đã rút".
// 4) Toàn quyền: khung "Đăng chính sách riêng tư mới" hiện; Bán hàng: không có khung đó.
// Mở theo thứ tự Đối tác → Bán hàng → Toàn quyền (các trang dùng chung kho cookie — tài khoản mở sau cùng là Toàn quyền).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-10-17-tu-khai/kich-ban/tu-khai-smoke.mjs
import { ACCOUNTS, DESK, MOB, PARTNER, SUPER, assert, axe, axeNote, boDem, dungMoiTruong, shotFull, sleep } from "../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs";

const dem = boDem("TU KHAI SMOKE");
const { env, call } = await dungMoiTruong([PARTNER, SUPER]);
const SO = "079777888999"; // số GIẢ
const doc = (p) => p.ev(`(() => {
  const s = document.querySelector('#ho-so-cua-toi');
  const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
  return s && { hien: !s.hidden && s.getClientRects().length > 0, chu: t(s), form: !!s.querySelector('#hs-form'), dangCs: !!s.querySelector('#hs-dang-chinh-sach'),
    co16: [...s.querySelectorAll('input:not([type=checkbox]), select, textarea')].filter((e) => e.getClientRects().length > 0).map((e) => getComputedStyle(e).fontSize),
    html: document.documentElement.outerHTML };
})()`);
try {
  await dem.step("1", "Đối tác (390), chưa có chính sách: khối hiện, câu lời thường, không form", async () => {
    const p = await env.as(PARTNER, "/account", MOB);
    try {
      await p.waitFor("!document.querySelector('#ho-so-cua-toi').hidden", "khối Hồ sơ của tôi", 10000);
      const s = await doc(p);
      assert.ok(s.chu.includes("Chưa có chính sách riêng tư nên chưa gửi được thông tin."), s.chu);
      assert.equal(s.form, false);
      assert.equal(s.dangCs, false, "Đối tác không có khung đăng chính sách");
    } finally {
      p.close();
    }
  });
  const r = await call(SUPER, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: "THỬ — mục đích thử nghiệm", noiDung: "THỬ — toàn văn thử nghiệm, không phải văn bản pháp lý." });
  assert.equal(r.status, 201, r.text);
  for (const [id, ten, vp] of [["2a", "390", MOB], ["2b", "1040", DESK]]) {
    await dem.step(id, `Đối tác (${ten}): đồng ý → form; ô gõ 16px; khai → Đã gửi + Chờ xác minh; không số đủ trong DOM` + axeNote(), async () => {
      const p = await env.as(PARTNER, "/account", vp);
      try {
        await p.waitFor("!!document.querySelector('#ho-so-cua-toi h2')", "khối", 10000);
        if (!(await doc(p)).form) {
          await p.ev("document.querySelector('#hs-dong-y').click()");
          await p.ev("[...document.querySelectorAll('#ho-so-cua-toi button')].find((b) => b.textContent === 'Đồng ý').click()");
          await p.waitFor("!!document.querySelector('#hs-form')", "form sau khi đồng ý", 10000);
        }
        const s = await doc(p);
        assert.ok(s.co16.length > 0 && s.co16.every((f) => f === "16px"), `ô gõ phải 16px: ${s.co16.join(",")}`);
        if (id === "2a") {
          await p.ev(`(() => { const l = document.querySelector('#hs-loai'); l.value = 'GIAY_TO'; l.dispatchEvent(new Event('change'));
            const g = document.querySelector('#hs-loai-giay'); g.value = 'CCCD'; g.dispatchEvent(new Event('change'));
            document.querySelector('#hs-so').value = '${SO}'; document.querySelector('#hs-form').requestSubmit(); })()`);
          await p.waitFor("location.search.includes('hoso=da-gui') && !!document.querySelector('#ho-so-cua-toi .hs-phieu')", "phiếu sau khi gửi", 10000);
          const sau = await doc(p);
          assert.ok(sau.chu.includes("Đã gửi. Người khác sẽ xác minh trước khi thông tin được dùng."), sau.chu);
          assert.ok(sau.chu.includes("Chờ xác minh") && sau.chu.includes("••••8999"), sau.chu);
          assert.ok(!sau.html.includes(SO), "số đủ không được có trong DOM");
        }
        await axe(p, `ho-so-cua-toi ${ten}`);
        await shotFull(p, `tu-khai-doi-tac-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
  await dem.step("3", "Đối tác rút phiếu: bước xác nhận trong trang → Đã rút", async () => {
    const p = await env.as(PARTNER, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('#ho-so-cua-toi .hs-phieu button')", "nút rút", 10000);
      await p.ev("[...document.querySelectorAll('#ho-so-cua-toi .hs-phieu button')].find((b) => b.textContent === 'Rút phiếu').click()");
      await p.ev("[...document.querySelectorAll('#ho-so-cua-toi .hs-phieu button')].find((b) => b.textContent === 'Rút phiếu này').click()");
      await p.waitFor("location.search.includes('hoso=da-luu')", "tải lại sau khi rút", 10000);
      await sleep(500);
      assert.ok((await doc(p)).chu.includes("Đã rút"));
    } finally {
      p.close();
    }
  });
  await dem.step("4", "Bán hàng không có khung đăng chính sách; Toàn quyền có", async () => {
    const b = await env.as(ACCOUNTS.salesA, "/account", MOB);
    try {
      await b.waitFor("!!document.querySelector('#ho-so-cua-toi h2')", "khối Bán hàng", 10000);
      assert.equal((await doc(b)).dangCs, false);
    } finally {
      b.close();
    }
    const t = await env.as(SUPER, "/account", DESK);
    try {
      await t.waitFor("!!document.querySelector('#hs-dang-chinh-sach')", "khung đăng chính sách", 10000);
      await shotFull(t, "tu-khai-toan-quyen-1040.png");
    } finally {
      t.close();
    }
  });
} finally {
  await dem.end?.();
  await env.stop?.();
}
```

(Đối chiếu tên hàm với `vc-lib.mjs` thật trước khi chạy: `boDem().step`, `env.as`, `p.waitFor`, `p.ev`, `call`; nếu `vc-lib` có hàm kết thúc tên khác thì dùng đúng tên đó — kịch bản `giay-to-cua-toi-smoke.mjs` cùng thư mục là mẫu.)

- [ ] **Step 5: Chạy kịch bản Chrome (theo `web/CLAUDE.md`)**

Run (từ gốc repo, sau `npm run build:web`): `tu-khai-smoke.mjs` (lệnh ở đầu tệp), rồi `docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs` (bố cục 2 cột trang Tôi), `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/giay-to-cua-toi-smoke.mjs` (thứ tự khối `#me`, `#my-docs`). Expected: "SMOKE OK" cả ba (ghi rõ có / không `AXE_JS` — không có AXE_JS là xanh giả một phần). Nếu `dot-c-smoke` ghim đúng thứ tự mọi khối trang Tôi và đỏ vì khối mới: sửa kỳ vọng có lý do (khối mới nằm sau `#myjobs`). **Không chạy được Chrome thì báo "chưa kiểm giao diện" — không khai đạt.**

- [ ] **Step 6: Commit**

```bash
git add web/ho-so-cua-toi.ts web/account.ts public/account.html public/app.css src/ho-so-cua-toi-giao-dien.test.ts docs/evidence/2026-10-17-tu-khai/kich-ban/tu-khai-smoke.mjs
git commit -m "Trang Tôi: khối Hồ sơ của tôi — xem hồ sơ, đồng ý chính sách, gửi và rút phiếu tự khai (ADR-0124)"
```

---

### Task 6: E2E, tài liệu, sổ hàng rào, nhật ký thay đổi, phá thử, bộ kiểm đủ (nghiệm thu)

**Files:**
- Create: `tests/e2e/tu-khai.mjs`; Modify: `tests/e2e/run.mjs`
- Modify: `docs/SYSTEM-DESIGN.md` (§5 bảng + dòng migration 0105, §7 năm route, §8 ba ô), `docs/CHANGE-GUIDE.md` (§1, công thức z21 "Tự khai hồ sơ", §3 một dòng ma trận, §4 bẫy), `docs/SO-HANG-RAO.md`, `docs/HANDOFF-N1.md`, `docs/BACKLOG.md`
- Modify: `src/shared/changelog.ts`, `src/shared/app-info.test.ts`

**Interfaces:**
- Consumes: mọi route của Task 3–4; `tests/e2e/lib.mjs` (`ACCOUNTS`, `call`, `session`, `sqlRows`, `gieoTaiKhoanLai`).
- Produces: kịch bản e2e `tu-khai`; mục nhật ký thay đổi 2.12 tạm; dòng sổ hàng rào có ngày quan sát chặn thật.

- [ ] **Step 1: `tests/e2e/tu-khai.mjs`**

```js
// Tự khai hồ sơ (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2) trên API thật + D1 local tạm. CHẠY LẠI ĐƯỢC trên D1 đã có chính sách (chỉ-thêm): luôn đăng phiên bản MỚI rồi làm
// việc với nó; Đối tác / Tài xế đối tác là tài khoản dùng một lần. Ca "chưa có chính sách" ở khung thử (src/modules/parties/tu-khai-route.test.ts — SQLite mới mỗi lần).
import assert from "node:assert/strict";
import { ACCOUNTS, call, gieoTaiKhoanLai, session, sqlRows } from "./lib.mjs";

const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const tag = String(Date.now()).slice(-6);
const SO = `0796${tag}11`; // 12 chữ số GIẢ riêng của lần chạy
const DIA_CHI = `9${tag} Đường Tự Khai E2E, Nha Trang`;
const doiTac = await gieoTaiKhoanLai(`Đối Tác Tự Khai ${tag}`, ["PARTNER"]);
const taiXeDt = await gieoTaiKhoanLai(`Tài Xế Đối Tác Tự Khai ${tag}`, ["DRIVER_PARTNER"]);

let r = await call(ADMIN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: "thử", noiDung: "thử" });
assert.equal(r.status, 403);
console.log("✓ Quản trị không đăng được chính sách");
r = await call(TOAN_QUYEN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ e2e ${tag}`, noiDung: `THỬ — toàn văn e2e ${tag}, không phải văn bản pháp lý.` });
assert.equal(r.status, 201, JSON.stringify(r.body));
const phienBan = r.body.phienBan;
console.log(`✓ Toàn quyền đăng phiên bản ${phienBan}`);

for (const [ten, ck] of [["Đối tác", doiTac.cookie], ["Tài xế đối tác", taiXeDt.cookie], ["Bán hàng", SALES]]) {
  r = await call(ck, "GET", "/api/parties/cua-toi");
  assert.equal(r.status, 200, `${ten}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.chinhSach.phienBan, phienBan, ten);
  const cs = r.body.chinhSach.id;
  if (!r.body.dongY) {
    const x = await call(ck, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
    assert.equal(x.status, 409, ten);
    assert.equal(x.body.error.code, "consent_required", ten);
    assert.equal((await call(ck, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: cs, quyetDinh: "DONG_Y" })).status, 200, ten);
  }
}
console.log("✓ ba loại tài khoản mở được Hồ sơ của tôi; chưa đồng ý thì không gửi được; đồng ý xong");

const cs = (await call(doiTac.cookie, "GET", "/api/parties/cua-toi")).body.chinhSach.id;
r = await call(doiTac.cookie, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: cs, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: SO, expiryDate: "2036-01-01" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const pidGiay = r.body.phieuId;
r = await call(doiTac.cookie, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: cs, loai: "DIA_CHI", diaChi: DIA_CHI });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(doiTac.cookie, "GET", "/api/parties/cua-toi");
assert.ok(JSON.stringify(r.body).includes(`••••${SO.slice(-4)}`));
assert.ok(!JSON.stringify(r.body).includes(SO), "số đủ ra DTO");
console.log("✓ Đối tác gửi phiếu giấy tờ + địa chỉ; DTO chỉ số che");

r = await call(ADMIN, "GET", `/api/parties/${doiTac.partyId}`);
assert.equal(r.status, 200);
assert.ok(!JSON.stringify(r.body).includes(`9${tag}`), "địa chỉ tự khai lên Danh bạ trước khi xác minh");
r = await call(ADMIN, "GET", `/api/parties/${doiTac.partyId}/documents`);
assert.equal(r.status, 200);
assert.equal(r.body.documents.length, 0, "giấy tờ tự khai lên hồ sơ trước khi xác minh");
console.log("✓ giá trị tự khai chưa lên Danh bạ / giấy tờ (5.23)");

assert.equal((await call(SALES, "POST", `/api/parties/cua-toi/phieu/${pidGiay}/rut`)).status, 404);
assert.equal((await call(doiTac.cookie, "POST", `/api/parties/cua-toi/phieu/${pidGiay}/rut`)).status, 200);
assert.equal((await call(doiTac.cookie, "POST", `/api/parties/cua-toi/phieu/${pidGiay}/rut`)).status, 409);
console.log("✓ rút phiếu: người khác 404, chính mình 200, lần hai 409");

r = await call(doiTac.cookie, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: cs, quyetDinh: "RUT" });
assert.equal(r.status, 200, JSON.stringify(r.body));
const conCho = await sqlRows(`SELECT count(*) AS n FROM pty_self_submission WHERE party_id = '${doiTac.partyId}' AND status = 'CHO_XAC_MINH'`);
assert.equal(Number(conCho[0].n), 0, "rút đồng ý phải rút mọi phiếu đang chờ");
console.log("✓ rút đồng ý rút luôn phiếu đang chờ");

const nk = JSON.stringify(await sqlRows("SELECT action, detail FROM audit_log WHERE action LIKE 'self_submission_%' OR action LIKE 'privacy_%'"));
assert.ok(!nk.includes(SO) && !nk.includes(`9${tag}`), "nhật ký chứa số / địa chỉ tự khai");
console.log("✓ nhật ký chỉ mã");
```

`tests/e2e/run.mjs`: thêm `"tu-khai"` vào `ALL` ngay sau `"ho-so-tep"`, và `"tu-khai": 5` vào bảng thời lượng ước tính cạnh `"ho-so-tep": 5`; chú thích một dòng: "tự khai (ADR-0124): tài khoản Đối tác / Tài xế đối tác dùng một lần; đăng một phiên bản chính sách THỬ mỗi lần chạy".

Run: `npm run test:e2e -- tu-khai parties ho-so-rieng-tu ho-so-tep chong-ghi-trung pwa` → Expected: xanh cả bộ, gồm H5 ("ghi nhiều lần chỉ ở route có tên trong danh sách nợ" — bốn route mới phải ghi đúng một lần), và `audit-invariants` cuối e2e đạt (`R-PTY-13` ✓). Sau đó chạy đủ bộ khi máy rảnh: `npm run test:e2e`.

- [ ] **Step 2: Phá thử còn lại + ghi sổ hàng rào (P16)**

Mỗi phép: sửa cố ý → chạy → chép NGUYÊN thông báo đỏ → hoàn nguyên → xanh → `git status` sạch phần đó. Gom cả các phép đã làm ở Task 1 Step 8 và Task 4 Step 6. Thêm:
  1. `scripts/audit-checks.mjs` `R-PTY-13`: `<> 'DONG_Y'` → `= 'KHONG_CO'` → bài `R-PTY-13` đỏ.
  2. `permissions.ts`: cột PARTNER của `party.self.view` → `none` (viết tay một `row(...)` thay `tuPhucVu()` cho ô này) → `xem-don-theo-quyen` PARTNER_ROW + bài 1024 đỏ.
  3. `index.ts` route đồng ý: bỏ khối `if (quyetDinh === "RUT") lo.push(…)` → bài "ruling Q2" đỏ.
  4. `index.ts` `hoSoCuaToiDto`: thêm `createdAt: d.party.created_at` → bài "Review Focus 2" đỏ.

`docs/SO-HANG-RAO.md` — thêm các dòng (định dạng bảng hiện có; cột "Đã thấy chặn thật" ghi ngày + nguyên thông báo; ghi "CHƯA gộp" như các dòng H-2):
  - Trigger phiếu tự khai (`migrations/0105_ho_so_tu_khai.sql`; bài `src/migrations-ho-so-tu-khai.test.ts`) — chặn: phiếu không đồng ý phiên bản hiện hành, sửa nội dung, mở lại trạng thái, xoá, ghi đè; ghi chú: không chặn người có quyền ghi D1 trực tiếp.
  - Vá `INSERT OR REPLACE` ba bảng chỉ-thêm 0103 (cùng bài, ca (k)).
  - `R-PTY-13` (bất biến phiếu chờ ↔ đồng ý).
  - Rào 5.23 (`src/tu-khai-khong-len-nhan.test.ts`) — giới hạn: canh QUÊN (tên hàm / tên bảng), không canh SQL dựng động hay hàm bọc mới đặt tên khác.
  - Cổng phát hành ảnh tự khai (`src/cong-phat-hanh-anh-tu-khai.test.ts`) — giới hạn: chỉ quét module `parties`, nhận diện theo khuôn đường dẫn.
  - DTO danh sách cho phép "Hồ sơ của tôi" (bài "Review Focus 2").
  - Mở rộng bộ lọc `giay-to-khong-lo-so` sang `/api/parties/cua-toi*`.

- [ ] **Step 3: Tài liệu mô tả**

- `docs/SYSTEM-DESIGN.md` §5: một đoạn về `pty_self_submission` (vòng đời, đồng ý, không view) + dòng bảng migration `0105` (ghi kèm: dòng `0103` vẫn thiếu từ lát H-1 — thêm luôn cho đủ); §7: năm route (cổng, ô, mã lỗi chính: `no_privacy_policy`, `policy_changed`, `consent_required`, `consent_unchanged`, `submission_pending`, `submission_not_pending`, `same_as_current`, `self_person_only`, `no_party`, `party_merged`, `policy_version_race`); §8: ba ô.
- `docs/CHANGE-GUIDE.md`: §1 dòng "muốn thêm loại phiếu tự khai → z21"; công thức **z21 "Tự khai hồ sơ"**: thêm loại phiếu = tạo lại trigger `pty_self_submission_kind_ins` + CHECK hình dạng bằng cột mới (ADD COLUMN) + `LOAI_PHIEU` + nhãn + form; mọi đường đọc phiếu phải nằm trong route `cua-toi` (rào 5.23) hoặc hàng chờ H-4 (sửa rào có lý do); §3 ma trận: "đổi `web/ho-so-cua-toi.ts` → `tu-khai-smoke.mjs` + `dot-c-smoke.mjs`"; §4 bẫy: "bốn route `cua-toi` phải khai TRƯỚC `/api/parties/:id`", "rút đồng ý rút phiếu cùng lô (R-PTY-13)".
- `docs/HANDOFF-N1.md` — runbook lần phát hành có 0105: migration `0105` áp sau `0103`, `0104`; **tự khai chỉ bật khi Toàn quyền đăng chính sách — chủ KHÔNG đăng trên production trước khi luật sư duyệt chữ và H-5 có đường xoá (Q1)**; không cần lệnh Cloudflare mới.
- `docs/BACKLOG.md` — mục nợ lát H-3: (1) ảnh của phiếu tự khai (mở `SELF_SUBMISSION` cùng H-5 / sau `BL-TEP-PHAT-LAI-500`); (2) tự khai hồ sơ tổ chức (Q3); (3) phiếu theo phiên bản cũ khi có chính sách mới (Q5 — quyết ở H-4); (4) chính sách ≈ 60 KB mỗi lần mở trang Tôi (cân nhắc tải toàn văn theo yêu cầu); (5) phân trang danh sách phiếu (> 50).
- **Đề xuất (không sửa — N9)** dòng mới cho bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" của `web/CLAUDE.md`: "`web/ho-so-cua-toi.ts`, khối `#ho-so-cua-toi` của `public/account.html`, khối `.hs-*` của `public/app.css` | `tu-khai-smoke.mjs` ở `docs/evidence/2026-10-17-tu-khai/kich-ban/` + `dot-c-smoke.mjs` + `giay-to-cua-toi-smoke.mjs`" — đưa vào báo cáo cho chủ duyệt.

- [ ] **Step 4: Nhật ký thay đổi 2.12 tạm**

`src/shared/changelog.ts` — mục ĐẦU mảng:

```ts
  {
    // Gói 2 hồ sơ riêng tư, lát H-3 (ADR-0124, ADR-0126 đ1): khối "Hồ sơ của tôi" ở trang Tôi, chính sách riêng tư + đồng ý, phiếu tự khai (chưa có xác minh — lát H-4);
    // migration 0105. CÓ migration — cần trien-khai sau day-len. TỰ KHAI CHỈ BẬT KHI TOÀN QUYỀN ĐĂNG CHÍNH SÁCH (không gieo bản nào — ruling Q1).
    // Số 2.12 là số TẠM (không trùng 2.8 / 2.9 / 2.10 / 2.11 đang tạm ở các nhánh): phiên phát hành gộp / đánh số lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.12",
    date: "2026-10-17",
    items: [
      { kind: "moi", text: "Trang Tôi có mục Hồ sơ của tôi: xem thông tin của mình, đọc chính sách riêng tư và gửi ngày sinh, địa chỉ, giấy tờ để được xác minh." },
      { kind: "doi", text: "Thông tin bạn gửi chỉ được dùng sau khi người khác xác minh; chưa có chính sách riêng tư thì chưa gửi được." },
    ],
  },
```

`src/shared/app-info.test.ts`: `formatReleaseLine()` → `"Phiên bản 2.12 · ngày 17 tháng 10 năm 2026"`.

- [ ] **Step 5: Bộ kiểm đủ (một thứ một lúc)**

Run lần lượt: `npm run typecheck` (0 lỗi) → `npm test` (thoát 0, cả bước bài đo giờ) → `npm run build:web` (thoát 0) → `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts src/claude-cong-xanh.test.ts` (hàng rào hook không bị đụng) → e2e Step 1 → `node scripts/audit-invariants.mjs --db local --strict` (D1 local trống tài khoản có thể báo `R-N1-5` như lát H-2 — ghi rõ, không phải lỗi lát này; `R-PTY-13` ✓). Kịch bản Chrome ở Task 5 Step 5 (hoặc "chưa kiểm giao diện").

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/tu-khai.mjs tests/e2e/run.mjs docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/SO-HANG-RAO.md docs/HANDOFF-N1.md docs/BACKLOG.md src/shared/changelog.ts src/shared/app-info.test.ts
git commit -m "Tự khai hồ sơ: kịch bản e2e, tài liệu, sổ hàng rào, việc của chủ trước khi bật (ADR-0124)"
```

- [ ] **Step 7: Người kiểm độc lập cuối lát (điều phối giao)** — chạy lại toàn bộ Step 5; chạy lại các phép phá của Task 1, 4, 6; đối chiếu ADR-0124 "Tiêu chí nghiệm thu" (5 mục) và ADR-0126 đ1 với bài; xác nhận `git diff <base trước Task 1> --stat` không chạm `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`, migration đã có trên `main`; xác nhận không có ô `party.erasure.request`, `party.verify*`; không mục mới trong `GHI_NHIEU_LAN` / `NGOAI_VE`; trần gói Đơn hàng vẫn 96 600.

---

## Tự rà kế hoạch (writing-plans Self-Review)

1. **Phủ yêu cầu:** (1) migration + bảng chỉ-thêm + một chiều + hạng → Task 1; (2) đăng chính sách (chỉ Toàn quyền, không gieo), đọc chính sách, đồng ý / rút chỉ-thêm, chặn khi chưa đồng ý và khi chưa có chính sách → Task 3 + Task 4; (3) gửi / xem / rút phiếu own, DTO danh sách cho phép, ba ô + ảnh chụp + bài 1024 → Task 3 + Task 4; (4) 5.23 bài canh → Task 4 (hành vi + rào tĩnh); (5) giao diện + Chrome → Task 5; (6) tài liệu, sổ hàng rào, changelog 2.12 tạm, e2e → Task 6. ADR-0124 tiêu chí: gửi không đổi hiện hành (Task 4 bài 1), chưa đồng ý bị từ chối tiếng Việt (Task 4 bài 2), own 403/404 (Task 3 Review Focus 5, Task 4 Review Focus 4 + "own lấy từ PHIÊN"), DTO đối tác (Task 3 Review Focus 2), bản đồ quyền + ảnh chụp + sổ hàng rào (Task 3, Task 6). Phần "chỉ sau chấp nhận mới đổi" là H-4.
2. **Placeholder:** không có TBD; hai chỗ dặn đối chiếu thư viện thật (`h()` nhận `onclick`; tên hàm kết thúc của `vc-lib.mjs`) kèm cách làm thay thế cụ thể.
3. **Nhất quán tên:** `tinhTuKhai`, `hoSoCuaToiDto`, `phieuDto`, `lyDoKhongGhi`, `lyDoKhongGui`, `kiemPhieuTuKhai`, `kiemChinhSach`, `ghiPhieuStatement`, `timPhieuCuaHoSo`, `rutPhieuStatement`, `rutMoiPhieuChoStatement`, `listPhieuCuaHoSo`, năm tên câu SQL — dùng đúng ở Task 3, 4 và rào 5.23.
4. **Review Focus:** năm dòng đều có bài ở task sở hữu mã (Task 3, 4).
