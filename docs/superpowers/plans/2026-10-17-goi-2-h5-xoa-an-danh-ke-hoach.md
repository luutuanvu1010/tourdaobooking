# Gói 2 hồ sơ riêng tư — lát H-5 (yêu cầu xoá, ẩn danh hoá, lưu giữ, sổ phiên bỏ IP/User-Agent): Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng tự gửi (và rút) **yêu cầu xoá dữ liệu của chính mình** ở trang Tôi; Quản trị (theo cấp bậc) hoặc Toàn quyền xem trước "sẽ xoá gì / phải giữ gì" rồi bấm **Thực hiện** — MỘT lô có tên của `parties` ẩn danh hoá số giấy tờ, phiếu tự khai, liên hệ, ngày sinh (tên theo luật giữ), quyết xoá ảnh, xoá IP/User-Agent của sổ phiên; ảnh rời kho R2 SAU lô qua hàng "chờ xoá" của ADR-0123; danh sách **ảnh hết lý do giữ** (5.25) hiện được để người có quyền bấm xoá; thời hạn xử lý và thời hạn giữ phiên chỉ đọc từ dữ liệu chính sách — **không con số nào trong mã hay migration**.

**Architecture:** Một migration `0108_xoa_an_danh.sql` của `parties`: cột `erased_at` cho `pty_person_document` và `pty_self_submission`, TẠO LẠI bốn trigger chặn sửa (`_superseded`, `_voided`, `_content`, `_status_one_way`) với miễn trừ đúng chuyển "ẩn danh hoá", thêm trigger **dạng chuyển** (chỉ đúng dấu ẩn danh) và **đóng băng** (dòng đã ẩn danh không sửa nữa), bảng phiếu `pty_erasure_request`, hai cột số ngày (rỗng được) trên `pty_privacy_policy`, trigger chặn gộp hồ sơ đang/đã có phiếu xoá. `aut_session` KHÔNG cần migration (không trigger chặn sửa). Câu ghi sổ phiên do `auth` cấp, tới `parties` qua hàm tiêm `ctx.cauAnDanhPhien` (khuôn `ctx.gopHoSo.cauDoiDon`); số ngày giữ phiên tới route sổ phiên (module `accounts`) qua hàm tiêm `ctx.hanGiuPhienNgay` — không cạnh phụ thuộc mới. Luật thuần `src/modules/parties/xoa-an-danh.ts` (xét gửi / xét xử lý / giữ tên / phần giữ lại / lý do xoá ảnh) có bài "cùng bảng ca" với câu SQL. Hai ô quyền: `party.erasure.request` (`tuPhucVu()`), `party.erasure.process` (`quanTri()`).

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite) + R2 (binding `HO_SO`), `node:sqlite` + khung thử `tests/audit/harness.mjs`, `node --test` (Node 22), esbuild; không dependency runtime.

**Spec:** `docs/adr/ADR-0126-quyen-rieng-tu-yeu-cau-xoa-an-danh-hoa-luu-giu.md` (đ2–đ9, tiêu chí nghiệm thu); Hiến chương `docs/ARCHITECTURE.md` 5.5, 5.11, 5.16, 5.20, 5.24, 5.25 (bảng thi hành dòng 5.24, 5.25: "chỉ MỘT lệnh có tên được ghi đè, bài quét các đường ghi khác"; "danh sách xoá ngay hiện được, không Cron ghi"); `docs/adr/ADR-0123-…` đ6, đ7 (xoá R2 sau lô, "chờ xoá"); `docs/adr/ADR-0124-…` đ4 (`party.erasure.request` cho mọi quyền); `docs/adr/ADR-0125-…` (phiếu tự khai đã xử lý); `docs/adr/ADR-0122-…` đ3 (`CAN_XAC_MINH_LAI`); hồ sơ gốc `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/` — `PHUONG-AN.md` §2.5 (luồng phiếu xoá, bảng giữ ảnh, sao lưu), §2.8 (kiểm kê cột), `SUY-RA.md` X2, X3, X10, X12, X13, `TRANG-GHEP.md` (dòng `party.erasure.*`, cổng §3), `KE-HOACH-SUY-RA.md` dòng H-5 (tiêu chí, ba phép phá thử) và "Cổng phát hành". Kế hoạch mẫu khuôn: `docs/superpowers/plans/2026-10-17-goi-2-h4-xac-minh-ke-hoach.md`.

**Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục). Chủ gia hạn có ghi lý do 2026-10-16, hạn mới **2026-11-05** (`docs/quyen-hoan.json`). Qua hạn mà chưa diễn tập hay gia hạn tiếp thì `npm test` đỏ — bản phát hành mang lát này tự bị chặn. Phần "bản ngoài D1 + chạy lại phiếu sau khôi phục" (đ7) là phần trực tiếp đứng trên lỗ này.

## Global Constraints

- Giao diện, câu báo lỗi (`message`), tài liệu, commit: tiếng Việt CÓ DẤU; mã lỗi máy được, chữ hiện ra không chữ Anh, không mã thô (`DA_THUC_HIEN` phải ra "Đã thực hiện", `PHIEN_DA_BO_IP` phải ra nhãn). Gọi hệ thống là "Nền tảng".
- Không dependency runtime. Tệp được `*.test.ts` import trực tiếp import nhau KÈM đuôi `.ts`; `web/` import `src/shared` KHÔNG đuôi, không import `src/modules/`.
- Migration: đúng MỘT tệp mới `migrations/0108_xoa_an_danh.sql` (bài tìm theo ĐUÔI `_xoa_an_danh.sql`). Được: `ALTER TABLE … ADD COLUMN`, `CREATE TABLE/INDEX/TRIGGER`, và `DROP TRIGGER` + `CREATE TRIGGER` CÙNG TÊN cho đúng bốn trigger liệt kê ở Task 1. KHÔNG `DROP TABLE`, không dựng lại bảng, không `INSERT`/`UPDATE`/`DELETE`, không gieo. KHÔNG sửa `0103`, `0104`, `0105`, `0107`.
- **Không con số thời hạn** trong mã, migration, `wrangler.jsonc`: hai cột `erasure_days`, `session_retention_days` không `DEFAULT`; không hằng / giá trị dự phòng (`?? 20`, `|| 30`). Thiếu số ⇒ phiếu không có hạn, không cảnh báo quá hạn, nút ẩn danh hoá phiên cũ trả 409. Bài kiểm tĩnh ở Task 4 (khuôn ở Step tương ứng).
- **Dấu ẩn danh** (một nguồn, `src/modules/parties/xoa-an-danh.ts` khớp từng chữ với trigger): số giấy tờ = `'XOA' || upper(replace(<mã dòng>, '-', ''))` — duy nhất theo dòng, KHÔNG suy ra từ số thật (không băm số: CCCD 12 chữ số dò ngược được); nơi cấp = rỗng; ngày sinh trên phiếu tự khai = `'1900-01-01'` (CHECK của 0105 cấm rỗng); địa chỉ trên phiếu = `'Đã xoá'`; liên hệ: `value = 'Đã xoá'`, `value_normalized = 'XOA'`, đóng hiệu lực; tên thay (khi không phải giữ) = `'Người đã xoá dữ liệu'`; IP / User-Agent của phiên = rỗng (`NULL`). **Mọi DTO đọc các cột này phải nhìn `erased_at` (hoặc dấu liên hệ) và KHÔNG BAO GIỜ hiện giá trị dấu như dữ liệu thật** (Review Focus 1).
- `parties` không import `auth`, `staff`, `orders`; `accounts` không import `parties`. Câu ghi `aut_session` chỉ do `auth` dựng (`src/modules/auth/index.ts`), ghép lô qua hàm tiêm. `pty_party_role` chỉ được nhắc trong `parties` (bài `src/architecture.test.ts`).
- Nhật ký chỉ mang mã và số đếm (mã phiếu, mã hồ sơ, mã lý do, số dòng theo loại): KHÔNG tên, số giấy tờ, ngày sinh, địa chỉ, SĐT, email, IP (Hiến chương 5.20, ADR-0126 đ5, `SUY-RA.md` X3).
- Mỗi route ghi đúng MỘT `db.batch` mang vé chống ghi trùng (ADR-0094), TRỪ ba route có việc R2 nằm giữa (Thực hiện, Xoá ảnh, Chạy lại) — thêm vào `GHI_NHIEU_LAN` (`src/shared/lan-gui-no.ts`) có lý do, khuôn hai mục kho tệp của H-2. Không thêm mục `NGOAI_VE`.
- **Trần gói trang Đơn hàng `TRAN_ORDERS = 96_600` KHÔNG nới.** Đo 2026-10-17 bằng đúng tuỳ chọn esbuild của `src/goi-trang-nhe.test.ts`: **96 004 byte** (dư 596). Trong gói có `src/shared/permissions.ts`, `muc-giao-dien.ts`, `lan-gui-bi-mat.ts`, `start-page.ts`, `hai-lop-hien-thi.ts`, `session-ended.ts`. Hai ô mới dùng LẠI hàm dòng chung `tuPhucVu()`, `quanTri()` (mỗi ô ≈ 30 byte sau nén). KHÔNG thêm mục vào `muc-giao-dien.ts`, KHÔNG thêm route vào `lan-gui-bi-mat.ts` (không route nào của lát trả giá trị bí mật), không import gì mới vào `web/orders.ts`. Task 4, 5 đo lại và ghi số vào báo cáo.
- KHÔNG làm ở lát này: mở loại nối ảnh `SELF_SUBMISSION` / tải ảnh tự khai (BL-TK-ANH, BL-TEP-PHAT-LAI-500 chưa giải); mã ADR-0121 (lớp hai bắt buộc cho đối tác); diễn tập khôi phục HC-5.19; phiếu xoá cho hồ sơ TỔ CHỨC và cho khách KHÔNG có tài khoản (Quản trị lập phiếu thay — Q6); ẩn danh `staff.phone` (đ9: giữ); gỡ Face ID / yếu tố lớp hai / `login_attempt` khi xoá; rà chữ tự do (ghi chú đơn, góp ý, câu hỏi trợ lý); báo Quản trị qua Bảng tin / thông báo khi có phiếu mới (BACKLOG); công cụ chạy lại phiếu khi bản khôi phục D1 không còn dòng phiếu (BACKLOG, đi cùng diễn tập HC-5.19).
- CẤM AI tự chạy: `git push`, merge vào `main`, `wrangler deploy`/`rollback`/`secret`, mọi lệnh `--remote`, mọi lệnh R2 thật. E2E chỉ trên D1 local tạm của `npm run test:e2e`.
- Không sửa luật chi phối chính mình: `CLAUDE.md` (kể cả `web/CLAUDE.md`, `src/CLAUDE.md`), `.claude/`, `playbook/`, `docs/adr/`, Phần I của `docs/ARCHITECTURE.md`. Dòng mới cho bảng kịch bản Chrome của `web/CLAUDE.md` chỉ ĐỀ XUẤT trong báo cáo (Task 8). `docs/quyen-hoan.json` không thêm mục hoãn.
- Mỗi task: bài đỏ trước, xanh sau; trước commit `npm test` và `npm run typecheck` phải xanh (`typecheck` KHÔNG phủ `*.test.ts`, `scripts/`, `tests/` — tự đọc lại). Chạy MỘT bộ kiểm một lúc. Ruling 17/10 của chủ: điều phối chỉ chạy bộ kiểm đủ MỘT lần cuối lát; trợ lý con vẫn tự chạy và dán kết quả.
- Số phiên bản nhật ký thay đổi: **2.14 TẠM** (kiểm 2026-10-17: nhánh này đã có 2.13; không worktree nào khác và checkout gốc không có `version: "2.14"`).
- Dòng đồng tác giả commit theo nhắc của môi trường lúc thi công.

## Review Focus

Năm tình huống ADR không nói thẳng mà dễ làm người dùng gặp lỗi nhất; mỗi dòng có bài ghim ở task sở hữu mã:

1. **Dấu ẩn danh lộ ra như dữ liệu thật** — sau khi thực hiện phiếu, trang Tôi hiện "Ngày sinh 01/01/1900", Danh bạ hiện số `XOA…`, "Xem đủ số" của Toàn quyền trả `XOA…`, hàng chờ xác minh hiện địa chỉ "Đã xoá" như giá trị khai ⇒ mọi DTO trả `daXoa: true` / `null` thay vì dấu; số giấy tờ đã xoá hiện "Đã xoá", không có nút "Xem đủ số" (bài "Review Focus 1", Task 5 mức route trên đủ năm route đọc: `GET /api/parties/cua-toi`, `GET /api/parties/:id/documents`, `POST …/documents/:did/reveal`, `GET /api/parties/xac-minh?trang=da-xu-ly`, `GET /api/parties/:id`).
2. **Hai người cùng bấm "Thực hiện", hoặc người dùng bấm "Rút" đúng lúc Quản trị bấm "Thực hiện"** ⇒ đúng một kết quả; không ẩn danh nửa chừng; người thua nhận 409 tiếng Việt; không dòng nhật ký `party_erased` nào khi phiếu đã rút (bài "Review Focus 2", Task 2 mức câu lệnh + Task 5 mức route).
3. **Người đã rút đồng ý, hoặc khi chưa có chính sách nào được đăng, vẫn gửi được yêu cầu xoá** (quyền xoá không phụ thuộc đồng ý); phiếu tự khai đang chờ của họ được rút cùng lô với lúc gửi; trong lúc phiếu xoá đang chờ thì không gửi được phiếu tự khai mới (409 + trigger) (bài "Review Focus 3", Task 4).
4. **Hồ sơ đã gộp** — dòng giấy tờ ĐÃ HUỶ và liên hệ ĐÃ ĐÓNG của hồ sơ phụ (vẫn chứa số, SĐT thật) và ảnh có `party_id` là hồ sơ phụ đều bị ẩn danh / quyết xoá; sau đó gộp hồ sơ đã xoá (hai chiều) bị chặn 409 (bài "Review Focus 4", Task 2 mức câu lệnh + Task 5 route gộp).
5. **Kho R2 hỏng giữa chừng** ⇒ phiếu vẫn "Đã thực hiện", ảnh tải về trả 404 NGAY (vì `purged_at` đã ghi) dù đối tượng còn trong kho; tệp hiện ở "chờ xoá", bấm "Chạy lại" xoá được; bản ngoài D1 chưa chép thì hiện cờ và chạy lại được (bài "Review Focus 5", Task 5).

Rủi ro đã biết, KHÔNG có bài (ghi để người kiểm khỏi tìm): điểm khôi phục Time Travel của D1 còn giữ dữ liệu đã ẩn danh trong số ngày Cloudflare giữ (chưa kiểm số ngày — `PHUONG-AN.md` §2.5); khôi phục D1 về trước lúc phiếu được TẠO thì phiếu mất khỏi D1, bản ngoài có mã phiếu + mã hồ sơ nhưng chưa có công cụ chạy lại (BACKLOG, HC-5.19); câu ẩn danh sổ phiên do `auth` cấp không mang lính gác "phiếu đã thắng" của `parties` (5.3 cấm câu `auth` đọc bảng `pty_*`) — nếu phiếu thua cuộc đua với "Từ chối" thì IP của người yêu cầu vẫn bị xoá (vô hại: chính họ yêu cầu xoá; câu tự lặp an toàn); lịch sử chuyến xe cũ của tài xế đọc tên qua view nhãn — tên tài xế luôn giữ (R8) nên không vỡ, nhưng chưa có bài; chữ tự do không rà (phiếu trả lời nói thẳng); `device_label` (hạng N2, dựng từ User-Agent) giữ nguyên theo chữ ADR (Q4).

## Bằng chứng số migration (kiểm 2026-10-17, chỉ đọc)

- `ls migrations`: lớn nhất ở nhánh này là `0107_xac_minh_ho_so.sql` (0106 trống ở nhánh này).
- `git log --all --name-only --format= -- 'migrations/0106*' 'migrations/0107*' 'migrations/0108*' 'migrations/0109*' 'migrations/011*'`: chỉ `0106_ve_ho_tro_2a.sql` (nhánh vé hỗ trợ) và `0107_xac_minh_ho_so.sql` (nhánh này).
- `ls .claude/worktrees/*/migrations | grep 01(0[6-9]|1)`: chỉ một `0106_ve_ho_tro_2a.sql`, một `0107_xac_minh_ho_so.sql`.
- **Số chọn: `0108`.** Nhánh nào vào `main` trước mà chiếm `0108` thì chỉ đổi tên tệp (bài tìm theo đuôi). Kiểm lại lúc phát hành.
- Ghi chú: lệnh gộp kiểm `git branch --no-merged` + `git ls-tree` cho từng nhánh trong MỘT dòng lệnh bị bộ chặn worktree từ chối khi soạn kế hoạch; người thi công chạy lại hai lệnh trên (mỗi lệnh riêng) trước Task 1.
- **Có thật cần migration không?** Có: (a) `pty_person_document_superseded`/`_voided` (0032) chặn MỌI sửa trên dòng đã gia hạn / đã huỷ — mà dòng đó vẫn chứa số thật (gộp hồ sơ huỷ dòng của hồ sơ phụ, gia hạn giữ dòng cũ); (b) `pty_self_submission_content` và `_status_one_way` (0105) chặn mọi sửa nội dung và mọi sửa trên phiếu đã xử lý; (c) cần bảng phiếu `pty_erasure_request` (đ2) và chỗ chứa số ngày trong dữ liệu chính sách. `aut_session` (0065) không có trigger nên phần sổ phiên không cần migration.

## Sự thật đã kiểm khi soạn (ghi lại để người thi công không phải dò lại)

1. **ADR-0124 đ4 cho `party.erasure.request` "cho mọi quyền, phạm vi own"**, trang ghép ghi `own` ở cả mười cột kể cả `DRIVER_PARTNER`. Ruling R9 của H-3 chỉ HOÃN ô này sang H-5 (ô không route nào hỏi thì `src/permission-enforcement.test.ts` đỏ) — **không loại Tài xế đối tác**. ⇒ `tuPhucVu()` (mọi cột `own`, Toàn quyền `any` theo ADR-0014 đ2; route chỉ phục vụ hồ sơ của phiên — tiền lệ `party.self.submit`).
2. **`party.erasure.process`**: trang ghép ADMIN any, SUPER any, còn lại none (HR none) ⇒ `quanTri()`.
3. **CHECK buộc giá trị giữ chỗ:** `pty_self_submission`: `(subject_kind = 'NGAY_SINH') = (birth_date IS NOT NULL)`, `(subject_kind = 'DIA_CHI') = (address_value IS NOT NULL)`, CCCD/GPLX bắt buộc số; `pty_person_document`: CCCD/GPLX bắt buộc số, `(document_number IS NULL) = (number_key IS NULL)`, độ dài số 1–40; `pty_person.given_name` NOT NULL (1–60); `pty_party.display_name` NOT NULL (1–200); `pty_contact_point.value`/`value_normalized` NOT NULL (1–200), `valid_to_date >= valid_from_date`. ⇒ dấu ẩn danh ở Global Constraints.
4. **Trigger 0032 bắn khi ẩn danh:** `_identity` (không đổi người, loại, dòng trước, mốc tạo — ẩn danh không đổi các cột này: qua); `_cccd_one_person_upd` (bắn khi đổi `number_key`; dấu duy nhất theo dòng nên không trùng; dòng đã huỷ bị bỏ qua vì điều kiện `NEW.voided_at IS NULL`); `_superseded`, `_voided` (chặn — phải tạo lại).
5. **Trigger 0105/0107 bắn khi ẩn danh phiếu tự khai:** `_content` (chặn — tạo lại); `_status_one_way` (`OLD.status <> 'CHO_XAC_MINH' OR NEW.status = 'CHO_XAC_MINH'` ⇒ chặn MỌI sửa trên phiếu đã xử lý / đã rút — tạo lại); `pty_self_submission_decider_not_author` (chỉ bắn khi `NEW.decided_by IS OLD.created_by` ở trạng thái quyết — ẩn danh không đổi `decided_by`: qua).
6. **Gộp hồ sơ** (`src/modules/parties/gop-lo.ts`): liên hệ của hồ sơ phụ ĐÓNG rồi mở bản sao ở hồ sơ chính; giấy tờ của hồ sơ phụ HUỶ (`voided_at`) rồi chép sang hồ sơ chính; ảnh giữ `party_id` = hồ sơ phụ, thêm dòng nối sang dòng giấy tờ mới. Hồ sơ phụ có tài khoản bị chặn gộp (`merge_source_has_account`) ⇒ người yêu cầu luôn ở hồ sơ CHÍNH; tập hồ sơ cần xoá = hồ sơ của phiên + mọi hồ sơ có `merged_into_id` = nó (một bước — ADR-0068 Đ3).
7. **Hàm tiêm dùng lại được:** `ctx.taiKhoanXacMinh()` (mọi tài khoản: id, quyền hiện tại, đang hoạt động, hồ sơ — cấp bậc và "tài khoản của hồ sơ"); `ctx.gopHoSo.donNguoiDat(partyId)` → `{ doi, giuDaGiao, giuDaHuy, … }`, `ctx.gopHoSo.soDongNo(partyId)`, `ctx.gopHoSo.viecCua(partyId)` (việc đang mở: phụ trách đơn, lái chuyến, chủ xe…). `ctx.gopHoSo.cauDoiDon` là tiền lệ "module khác cấp câu ghi, `parties` ghép lô".
8. **Cạnh module** (`src/architecture.test.ts` `ALLOWED_EDGES`): `parties → locations, audit`; `auth → staff, maintenance, parties`; `accounts → staff, auth, audit`. Route quản sổ phiên (`/api/sessions/*`, ô `auth.session.*`) nằm ở `accounts` (vì ghi nhật ký cùng lô).
9. **Kho tệp** (`src/modules/parties/kho-tep.ts`): `xoaKhoiKho(db, kho, ds, luc)` xoá từng đối tượng rồi `markTepR2Deleted`; lỗi không ném, dòng còn "chờ xoá" (R-PTY-12, `GET /api/parties/tep-cho-xoa`, `POST …/chay-lai` — cả hai ô `party.attachment.view` = chỉ Toàn quyền). Cặp câu "quyết xoá một tệp + nhật ký" `cauDatChoXoa` (index.ts) ghi chú sẵn "dùng chung … phiếu xoá (lát H-5)". `purge_reason` CHECK `^[A-Z0-9_]{2,40}$`.
10. **Cổng phát hành** `src/cong-phat-hanh-anh-tu-khai.test.ts` đã giữ chỗ tên route `POST /api/parties/phieu-xoa/:<chữ thường>/thuc-hien` (hằng `DUONG_THUC_HIEN_XOA`) — dùng ĐÚNG đường này.
11. **Điều kiện Q1 hôm nay dựa vào kỷ luật** (`docs/HANDOFF-N1.md` mục runbook `0105`; dòng "Điều kiện Q1" ở `docs/SO-HANG-RAO.md`): không đăng chính sách riêng tư trên production trước khi (1) luật sư duyệt chữ, (2) lát H-5 có đường xoá.
12. **Rào "Hồ sơ của tôi"** `src/ho-so-cua-toi-giao-dien.test.ts` cho `web/ho-so-cua-toi.ts` chỉ gọi `/api/parties/cua-toi*` và `POST /api/parties/chinh-sach-rieng-tu` ⇒ route người dùng đặt dưới `/api/parties/cua-toi/phieu-xoa…` (rào không phải nới).
13. **`src/tu-khai-khong-len-nhan.test.ts`** ghim: chữ `pty_self_submission` chỉ ở `parties/repository.ts`; tập câu SQL đăng ký chạm bảng; hàm phiếu chỉ được gọi trong các route liệt kê ⇒ Task 2, 4, 5 mở rộng đúng từng câu / từng route (nới có tên). `src/giay-to-khong-lo-so.test.ts` lọc route theo mẫu ⇒ mở rộng bộ lọc cho `/api/parties/phieu-xoa`, `/api/parties/anh-can-xoa`.
14. **`aut_session.ip`, `user_agent` cho phép rỗng** (CHECK chỉ độ dài); giao diện đã hiện "không rõ"/"—" khi rỗng (`web/account.ts` dòng IP của phiên, `web/sessions.ts` cột IP). `toSessionDto` (`src/modules/auth/session-ledger.ts`) đưa `ip` ra, không đưa `user_agent`. `device_label` hạng N2, dựng từ User-Agent lúc cấp phiên.
15. **Nhóm nhật ký** `system` có sẵn (`src/shared/audit-actions.ts`) ⇒ hành động ẩn danh phiên cũ xếp `system`, không vào nhóm `staff` (khỏi phải xếp tầng ở `CHAM_TAI_KHOAN`).
16. **Bất biến đang có** R-PTY-11 (tệp có dòng nối), R-PTY-13, R-PTY-14 (phiếu chấp nhận có dòng xác minh), R-PTY-15, R-PTY-16: ẩn danh không xoá dòng nối, không xoá dòng xác minh, không đổi `status`/`decided_*` của phiếu đã xử lý ⇒ không bất biến nào đỏ. Mã kế tiếp: `R-PTY-17`.
17. Ba route có việc R2 nằm giữa phải vào `GHI_NHIEU_LAN` (tiền lệ `POST /api/parties/:id/documents/:did/tep`, `POST /api/parties/tep-cho-xoa/chay-lai`).

## Câu hỏi / ruling

Phần "Cần chủ trả lời" là điều chạm dữ liệu / quyền / pháp lý mà ADR chưa chốt. Kế hoạch đã chọn phương án **hẹp / an toàn / đúng chữ ADR** để thi công không bị chặn; `0108` chưa áp ở đâu nên chủ chọn khác thì sửa trước khi lên production. Danh sách gom ở cuối tệp.

**Ruling đã áp (bề mặt, siết, hoặc đảo ngược được):**

- **R1 — Số migration 0108** (mục "Bằng chứng").
- **R2 — Bảng nhận `erased_at`:** `pty_person_document` (đ3 nói thẳng) và `pty_self_submission` (chú thích 0105 dòng 73 đã hẹn "lát H-5 tạo lại trigger này với điều kiện miễn hẹp"; không làm thì số CCCD, ngày sinh, địa chỉ còn nguyên trong phiếu sau khi xoá). Chữ đ3 "Migration chỉ thêm cột `erased_at` và tạo lại trigger `_superseded`, `_voided`" viết trước khi bảng phiếu có mã ⇒ phần phiếu tự khai là **Q3** (đã áp, chủ xác nhận). `pty_organization_document` KHÔNG (lát chỉ hồ sơ cá nhân — R4). `pty_contact_point` KHÔNG cần cột: không trigger chặn sửa; trạng thái "đã xoá" = dấu + đóng.
- **R3 — Miễn trừ hai phần:** bốn trigger tạo lại chỉ thêm vế `AND NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)`; điều kiện HẸP nằm ở trigger **dạng chuyển** mới (`*_erase_shape`: đúng dấu, mọi cột khác giữ nguyên) và trigger **đóng băng** (`*_erased_frozen`: dòng đã ẩn danh không sửa nữa, kể cả đặt `erased_at` về rỗng). Ba phép phá thử của `KE-HOACH-SUY-RA.md` dòng H-5 áp vào trigger dạng chuyển / đóng băng (Task 1 Step 9).
- **R4 — Chỉ hồ sơ CÁ NHÂN.** `pty_erasure_request.party_id` tham chiếu `pty_person` + trigger chặn hồ sơ không phải cá nhân; tài khoản gắn hồ sơ tổ chức nhận 409 `erasure_person_only` (khuôn `self_person_only` của H-3). Hồ sơ công ty chủ là tổ chức nên bị chặn từ cấu trúc; luật thuần + route vẫn kiểm `laCongTyChu` trước (đ3 "Từ chối hồ sơ công ty chủ" có bài riêng). Tổ chức / khách không tài khoản: **Q6**.
- **R5 — Vòng đời phiếu:** `CHO_XU_LY → DA_THUC_HIEN | TU_CHOI | RUT`, một chiều; mỗi hồ sơ tối đa MỘT phiếu đang chờ; RUT chỉ chính người gửi; Thực hiện / Từ chối phải KHÁC người gửi (siết, khuôn "người duyệt không tự chi" ADR-0089). Một phạm vi duy nhất "toàn bộ dữ liệu cá nhân" (YAGNI — `PHUONG-AN.md` gợi ý chọn phạm vi; chưa ai đòi).
- **R6 — Thời hạn chụp lúc gửi:** câu `INSERT … SELECT` đọc chính sách HIỆN HÀNH (phiên bản lớn nhất) và tính `due_at = created_at + erasure_days ngày` ngay trong SQL; chính sách chưa có số hoặc chưa có chính sách ⇒ `policy_id`/`due_at` rỗng ⇒ "Chưa có thời hạn trong chính sách". Đăng chính sách mới sau đó KHÔNG đổi hạn của phiếu cũ (Hiến chương 5.6). Ngày lịch hay ngày làm việc: chờ luật sư (**Q1**); mã tính ngày lịch.
- **R7 — Quá hạn chỉ cảnh báo** (nhãn "Quá hạn" ở hàng chờ, sắp lên đầu); không Cron ghi (đ2, 5.11, `SUY-RA.md` X10).
- **R8 — Giữ tên** (đ3 "tên giữ nếu hồ sơ dính sổ tiền hay đơn đã giao"): giữ khi BẤT KỲ: tài khoản giữ quyền nào ngoài `PARTNER` (nhân viên, tài xế: tên là nhãn trên đơn họ lập / phụ trách, lệnh vận chuyển, nhật ký — ngoại lệ 5.20); `donNguoiDat.giuDaGiao + giuDaHuy > 0`; `soDongNo > 0`. Chỉ tài khoản thuần Đối tác chưa từng có đơn / sổ mới bị thay tên. Kết quả ghi vào `name_kept` của phiếu (một nguồn cho câu ghi). **Q5**.
- **R9 — Đang có việc mở thì chưa thực hiện:** `donNguoiDat.doi > 0` hoặc `viecCua(...)` có số > 0 ⇒ 409 `erasure_busy` ("Hồ sơ đang có đơn hoặc chuyến xe chưa xong — xử lý xong rồi thực hiện."). Siết, đảo ngược được; tránh làm hỏng chuyến đang chạy (giấy phép lái bị ẩn danh giữa chuyến).
- **R10 — Phiếu tự khai:** gửi phiếu xoá RÚT mọi phiếu tự khai đang chờ của hồ sơ cùng lô, người rút = người gửi (khuôn ruling I-2 của H-3 "rút đồng ý thì rút phiếu"); phiếu xoá đang chờ thì chặn phiếu tự khai mới (máy chủ 409 `erasure_open` + trigger). Gửi phiếu xoá KHÔNG đòi đồng ý chính sách. Thực hiện: rút nốt phiếu đang chờ (lưới, người rút = người xử lý) rồi ẩn danh MỌI phiếu của tập hồ sơ. Không tự ghi dòng "rút đồng ý" (rút đồng ý là việc của chính chủ; dòng đồng ý là bằng chứng, giữ).
- **R11 — Dòng xác minh:** thực hiện phiếu chèn `CAN_XAC_MINH_LAI` cho mọi đích (giấy tờ, liên hệ, thuộc tính `NGAY_SINH`) của tập hồ sơ mà dòng mới nhất là `DA_XAC_MINH` (ADR-0122 đ3: giá trị đã xác minh đổi thì cần xác minh lại) — để không có nhãn "Đã xác minh" cạnh dấu. Không sửa / xoá dòng xác minh cũ (chỉ-thêm).
- **R12 — Ảnh:** quyết xoá MỌI tệp chưa quyết xoá có `party_id` thuộc tập hồ sơ HOẶC nối tới dòng giấy tờ của tập hồ sơ — không phân biệt loại nối (khi `SELF_SUBMISSION` mở sau này vẫn phủ). Lý do `PHIEU_XOA`. Xoá kho SAU lô bằng `xoaKhoiKho`.
- **R13 — Sổ phiên:** "dấu ẩn danh" = `NULL` cho `ip`, `user_agent` (cột cho phép; giao diện đã hiện "không rõ"; không đổi DTO). Khi thực hiện: mọi phiên của tài khoản gắn hồ sơ (cả phiên đang sống). Định kỳ: nút tay "Ẩn danh hoá phiên cũ" của Toàn quyền (ô sẵn có `auth.session.policy` — không thêm ô, giữ trần gói) cho phiên đã kết thúc trước `bây giờ − session_retention_days`; chính sách chưa có số ⇒ 409 `chua_co_thoi_han`. Không backfill trong migration. `device_label` giữ (chữ đ8 chỉ nói IP, User-Agent — **Q4**).
- **R14 — Danh sách ảnh hết lý do giữ** (đ6, 5.25) là **hình chiếu đọc** tính lúc mở (không bảng, không Cron). Giữ khi có ít nhất một dòng nối tới: (a) dòng giấy tờ người / tổ chức HIỆN HÀNH (chưa huỷ, không có dòng gia hạn chưa huỷ, chưa ẩn danh) còn hạn (`expiry_date` rỗng hoặc ≥ hôm nay giờ VN) **và** chủ dòng còn ít nhất một vai `pty_party_role` chưa đóng (`valid_to_date` rỗng hoặc ≥ hôm nay); hoặc (b) phiếu tự khai đang chờ (phủ trước cho lúc mở `SELF_SUBMISSION`). Tài khoản bị ngưng không tính. Quy tắc nằm ở mã (đúng chữ đ6); "là dữ liệu chính sách" hiểu là toàn văn chính sách nêu quy tắc này (chủ viết) — không bảng quy tắc. Người bấm xoá: ô `party.erasure.process` (đ6 "Quản trị hay Toàn quyền"), Quản trị theo cấp bậc khi hồ sơ có tài khoản. Lý do quyết xoá `HET_LY_DO_GIU`. Mỗi lần tối đa 50 tệp.
- **R15 — Bản ngoài D1** (đ7): sau lô, đặt đối tượng `xoa/<mã phiếu>.json` vào kho `HO_SO` chứa `{ phieu, hoSo, luc }` (chỉ mã nội bộ, không dữ liệu cá nhân) rồi ghi `offsite_at`. Kho lỗi / không có binding ⇒ `offsite_at` rỗng, hiện cờ, bất biến R-PTY-19 (warn), "Chạy lại" chép lại. Runbook khôi phục có bước so danh sách `xoa/` với D1 (Task 8).
- **R16 — Gộp:** trigger + route chặn gộp khi một trong hai hồ sơ có phiếu `CHO_XU_LY` hoặc `DA_THUC_HIEN` (409 `merge_erasure`).
- **R17 — Phần giữ lại** (đ4) là hằng `PHAN_GIU_LAI` (mã + nhãn) ở `src/shared/xoa-an-danh-hien-thi.ts`; phiếu lưu danh sách MÃ đã áp lúc thực hiện (`retained_codes`, khuôn `^[A-Z0-9_,]+$`) để chữ trả lời không đổi theo mã sau này. Hai mã động: `TEN_HO_SO` (khi `name_kept = 1`), `SDT_DANG_NHAP` (đ9 — luôn có khi hồ sơ có tài khoản). Câu cuối cố định: "Căn cứ giữ lại: chưa được luật sư hay kế toán xác nhận." (đ4).
- **R18 — Lý do từ chối phiếu xoá** là danh sách đóng `LY_DO_TU_CHOI_XOA`: `CAN_GIU_THEO_LUAT` ("Dữ liệu đang phải giữ theo quy định pháp luật"), `NGUOI_DUNG_HUY_QUA_KENH_KHAC` ("Người dùng đã báo huỷ yêu cầu qua kênh khác"). Đổi chữ = bề mặt; thêm / bớt mã = chủ và luật sư duyệt (**Q1**).
- **R19 — Giao diện:** người dùng ở trang Tôi (`web/ho-so-cua-toi.ts`); người xử lý ở trang Danh bạ (`/parties`, `web/phieu-xoa.ts` — Quản trị và Toàn quyền đều vào được, Nhân sự không có ô); nút ẩn danh phiên cũ ở trang Phiên (`web/sessions.ts`, Toàn quyền). Không trang mới, không mục menu (trần gói).
- **R20 — Hai cột số ngày rỗng được, không trần trong CSDL** (CHECK chỉ `>= 1`). Có bắt buộc nhập khi đăng chính sách, có trần 30 ngày của chủ hay không: **Q2**.

## Bản đồ tệp

| Tệp | Tạo / sửa | Việc |
|---|---|---|
| `migrations/0108_xoa_an_danh.sql` | tạo | cột, bảng, trigger (Task 1) |
| `src/migrations-xoa-an-danh.test.ts` | tạo | bài migration + ba phép phá thử (Task 1) |
| `src/migrations-xac-minh-ho-so.test.ts` | sửa nếu có khẳng định "tệp cuối" | đổi thành "đứng sau 0105" (Task 1) |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` | sửa / sinh lại | bảng, cột mới + hạng N0–N4 (Task 1) |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | sửa | `R-PTY-17`…`R-PTY-20` (Task 1) |
| `src/modules/parties/xoa-an-danh.ts` + `xoa-an-danh.test.ts` | tạo | luật thuần (Task 2) |
| `src/shared/xoa-an-danh-hien-thi.ts` + `.test.ts` | tạo | nhãn, phần giữ lại, lý do (Task 2) |
| `src/modules/parties/repository.ts` | sửa | câu ghi / đọc phiếu xoá, ẩn danh, hình chiếu ảnh (Task 2, 6) |
| `src/modules/parties/xoa-an-danh-lenh.test.ts` | tạo | bài mức câu lệnh (Task 2) |
| `src/xoa-mot-lenh-co-ten.test.ts` | tạo | rào "chỉ một lệnh có tên ghi đè dòng đã khoá" (Task 2, siết ở Task 5) |
| `src/modules/auth/index.ts`, `src/modules/auth/repository.ts`, `src/modules/auth/an-danh-phien.test.ts` | sửa / tạo | hai câu ẩn danh phiên (Task 3) |
| `src/shared/router.ts`, `src/index.ts`, `src/modules/parties/index.ts` (hàm công bố `hanGiuPhienNgay`) | sửa | hai hàm tiêm (Task 3) |
| `src/shared/permissions.ts`, `permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.ts` (sinh lại) | sửa | hai ô (Task 4, 5) |
| `src/modules/parties/index.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts` | sửa | route, DTO, hành động nhật ký (Task 4, 5, 6) |
| `src/modules/parties/xoa-an-danh-route.test.ts`, `src/modules/parties/rieng-tu-route.test.ts` | tạo / sửa | bài route (Task 4–6) |
| `src/xoa-khong-so-thoi-han.test.ts` | tạo | rào "không con số thời hạn" (Task 4) |
| `src/cong-phat-hanh-anh-tu-khai.test.ts` | sửa | cổng phát hành thêm vế chính sách (Task 5) |
| `src/route-access.test.ts`, `src/route-write-guard.test.ts`, `src/tu-khai-khong-len-nhan.test.ts`, `src/giay-to-khong-lo-so.test.ts`, `src/shared/lan-gui-no.ts`, `src/kho-tep-ho-so.test.ts` (nếu ghim khuôn khoá `pty/`) | sửa | hàng rào đi kèm (Task 4–6) |
| `src/modules/accounts/index.ts`, `src/modules/accounts/an-danh-phien-cu.test.ts` | sửa / tạo | route ẩn danh phiên cũ (Task 6) |
| `web/ho-so-cua-toi.ts`, `web/phieu-xoa.ts`, `web/parties.ts`, `public/parties.html`, `web/sessions.ts`, `public/app.css` | sửa / tạo | giao diện (Task 7) |
| `src/xoa-an-danh-giao-dien.test.ts` | tạo | rào tĩnh giao diện (Task 7) |
| `docs/evidence/2026-10-17-xoa-an-danh/kich-ban/xoa-an-danh-smoke.mjs` | tạo | kịch bản Chrome (Task 7) |
| `tests/e2e/xoa-an-danh.mjs`, `tests/e2e/run.mjs` | tạo / sửa | e2e (Task 8) |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`, `docs/HANDOFF-N1.md`, `docs/BACKLOG.md`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts` | sửa | tài liệu, sổ hàng rào, runbook, nhật ký thay đổi 2.14 tạm (Task 8) |

## Nhóm giao, loại việc và người kiểm

| Nhóm | Task | Loại | Người kiểm độc lập (vai `nguoi-kiem-doc-lap`, chỉ đọc) |
|---|---|---|---|
| A | 1. Migration 0108 + bất biến + sổ dữ liệu | **VIỆC LỚN (dữ liệu, cửa một chiều)** | **bắt buộc ngay sau Task 1** |
| B | 2. Luật thuần + câu ghi ẩn danh + hình chiếu ảnh + bài mức câu lệnh | **VIỆC LỚN (dữ liệu)** | gộp vào kiểm nhóm C |
| B | 3. Câu ẩn danh sổ phiên + hai hàm tiêm | **VIỆC LỚN (dữ liệu)** | gộp vào kiểm nhóm C |
| C | 4. Ô `party.erasure.request` + chính sách có số ngày + route người dùng | **VIỆC LỚN (quyền, dữ liệu)** | gộp vào kiểm nhóm C |
| C | 5. Ô `party.erasure.process` + hàng chờ / xem trước / thực hiện / từ chối / chạy lại + chặn gộp + cổng phát hành | **VIỆC LỚN (quyền, dữ liệu)** | gộp vào kiểm nhóm C |
| C | 6. Danh sách ảnh hết lý do giữ + ẩn danh phiên cũ | **VIỆC LỚN (dữ liệu)** | **bắt buộc ngay sau Task 6, phủ Task 2–6** |
| D | 7. Giao diện + rào tĩnh + kịch bản Chrome | nhỏ (giao diện) | gộp vào kiểm cuối |
| D | 8. E2E, tài liệu, sổ hàng rào, phá thử, nhật ký thay đổi, bộ kiểm đủ | nghiệm thu | **kiểm cuối lát, phủ toàn lát** |

**Vì sao ô quyền ở nhóm C, không ở nhóm A như lời giao:** `src/permission-enforcement.test.ts` đỏ khi một ô của `MATRIX` không route nào hỏi, và lối hoãn duy nhất (`docs/quyen-hoan.json`) có hạn do chủ xác nhận — không thêm mục hoãn. Nên mỗi ô đi cùng commit với route đầu tiên hỏi nó (tiền lệ H-3 R9, H-4 Task 3): `party.erasure.request` ở Task 4, `party.erasure.process` ở Task 5. Người kiểm sau nhóm A kiểm dữ liệu + trigger; người kiểm sau nhóm C kiểm quyền + lô ghi.

Người thi công KHÔNG tự nghiệm thu (N8): chỉ báo "đạt" dựa trên báo cáo người kiểm + test.

**Giới hạn không kiểm được ở lát này:** (a) không chạy trên D1 production — trigger tạo lại, window function, `strftime` chỉ thử trên SQLite của Node và D1 local của `wrangler dev`; (b) không thử R2 thật (chỉ R2 giả của khung thử và `wrangler dev` local); (c) kịch bản Chrome cần Chrome + axe ngoài repo — thiếu `AXE_JS` thì ghi **"chưa kiểm màu (thiếu AXE_JS)"**; (d) chưa thử iPhone thật; (e) chưa diễn tập khôi phục (HC-5.19) nên bước "chạy lại phiếu sau khôi phục" chỉ là chữ runbook.

---

### Task 1: Migration 0108 — cột `erased_at`, bốn trigger tạo lại, dạng chuyển, đóng băng, bảng phiếu xoá, hai cột số ngày, chặn gộp, bất biến (VIỆC LỚN — dữ liệu)

**Files:**
- Create: `migrations/0108_xoa_an_danh.sql`
- Create: `src/migrations-xoa-an-danh.test.ts`
- Modify: `src/migrations-xac-minh-ho-so.test.ts` (chỉ khi có khẳng định "tệp cuối cùng")
- Modify: `docs/data-dictionary.json` (bảng `pty_erasure_request` module `parties`; cột `erased_at` ×2, `erasure_days`, `session_retention_days`; hạng: mọi cột phiếu N1, hai `erased_at` N1, hai số ngày N1); Regenerate: `docs/DATA-DICTIONARY.md` (`npm run dict`). Sửa luôn ghi chú bảng `aut_session` ("giữ vô hạn" → "IP/User-Agent ẩn danh khi thực hiện phiếu xoá và theo thời hạn giữ của chính sách — ADR-0126 đ8").
- Modify: `scripts/audit-checks.mjs` (`R-PTY-17`…`R-PTY-20` ngay sau `R-PTY-16`), `src/audit-invariants.test.ts`

**Interfaces:**
- Consumes: bảng `pty_person_document` (0032), `pty_self_submission` (0105, 0107), `pty_privacy_policy` (0103), `pty_party` (0011, 0056), `pty_person`, `pty_contact_point`, `pty_attachment` (0104), `aut_session` (0065), `staff`.
- Produces:
  - Cột `pty_person_document.erased_at TEXT`, `pty_self_submission.erased_at TEXT`, `pty_privacy_policy.erasure_days INTEGER`, `pty_privacy_policy.session_retention_days INTEGER`.
  - Bảng `pty_erasure_request(id, party_id, policy_id, due_at, status 'CHO_XU_LY'|'DA_THUC_HIEN'|'TU_CHOI'|'RUT', decided_at, decided_by, reason_code, name_kept, retained_codes, offsite_at, created_at, created_by, updated_at, updated_by)`.
  - Trigger mới: `pty_person_document_erase_shape`, `pty_person_document_erased_frozen`, `pty_self_submission_erase_shape`, `pty_self_submission_erased_frozen`, `pty_self_submission_erasure_open_ins`, `pty_erasure_request_*` (bảy cái ở Step 3), `pty_party_merge_erasure`. Trigger tạo lại: `pty_person_document_superseded`, `pty_person_document_voided`, `pty_self_submission_content`, `pty_self_submission_status_one_way`.
  - Mã lỗi CSDL (route dịch sang tiếng Việt): `person_document_erase_shape`, `person_document_erased`, `self_submission_erase_shape`, `self_submission_erased`, `self_submission_erasure_open`, `erasure_person_only`, `erasure_pending_exists`, `erasure_status_one_way`, `erasure_decider_is_requester`, `erasure_withdraw_not_requester`, `party_merge_erasure`.

- [ ] **Step 1: Viết bài migration (đỏ)** — `src/migrations-xoa-an-danh.test.ts`, khuôn `src/migrations-xac-minh-ho-so.test.ts` (nạp mọi migration theo thứ tự vào `node:sqlite` bộ nhớ; chép helper dựng hồ sơ / chính sách / đồng ý / phiếu từ `src/migrations-ho-so-tu-khai.test.ts`, không import chéo tệp test):

```ts
// Bài migration 0108 (ADR-0126 đ2, đ3, đ6; Hiến chương 5.24; lát H-5 Gói 2). Tìm tệp theo ĐUÔI. Ba phép phá thử của KE-HOACH-SUY-RA dòng H-5 ở Step 9 kế hoạch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const MIG = new URL("../migrations/", import.meta.url);
const FILES = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
const FILE = FILES.find((f) => f.endsWith("_xoa_an_danh.sql"))!;
function db(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  for (const f of FILES) d.exec(readFileSync(new URL(f, MIG), "utf8"));
  return d;
}
const T = "2026-10-17T00:00:00.000Z";
const T2 = "2026-10-17T01:00:00.000Z";
const DAU = (id: string) => "XOA" + id.replace(/-/g, "").toUpperCase();
const ID_A = "0b1e5c2a-0000-4000-8000-00000000000a"; // mã dòng dạng UUID như production (dấu dài 35 ký tự ≤ 40)
const ID_B = "0b1e5c2a-0000-4000-8000-00000000000b";

test("(a) tệp 0108 có, đứng sau 0107; không DROP TABLE, không INSERT/UPDATE/DELETE; DROP chỉ đúng bốn trigger", () => {
  assert.ok(FILE, "thiếu migrations/*_xoa_an_danh.sql");
  assert.ok(FILES.indexOf(FILE) > FILES.findIndex((f) => f.endsWith("_xac_minh_ho_so.sql")));
  const sql = readFileSync(new URL(FILE, MIG), "utf8").replace(/--.*$/gm, "");
  assert.doesNotMatch(sql, /\bDROP\s+(TABLE|VIEW|INDEX)\b|\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bUPDATE\s+\w+\s+SET\b/i);
  const dropped = [...sql.matchAll(/DROP\s+TRIGGER\s+(\w+)/gi)].map((m) => m[1]).sort();
  assert.deepEqual(dropped, ["pty_person_document_superseded", "pty_person_document_voided", "pty_self_submission_content", "pty_self_submission_status_one_way"]);
  for (const t of dropped) assert.match(sql, new RegExp(`CREATE TRIGGER ${t}\\b`), `${t} phải được tạo lại cùng tên`);
});

test("(b) hai cột số ngày rỗng được, không DEFAULT, chỉ CHECK >= 1; migration không gieo chính sách", () => {
  const sql = readFileSync(new URL(FILE, MIG), "utf8").replace(/--.*$/gm, "");
  for (const c of ["erasure_days", "session_retention_days"]) {
    const dong = sql.split("\n").find((l) => l.includes(`ADD COLUMN ${c}`))!;
    assert.ok(dong, c);
    assert.doesNotMatch(dong, /DEFAULT|NOT NULL/i, `${c}: không DEFAULT, không NOT NULL (con số chờ luật sư)`);
    assert.match(dong, new RegExp(`${c} IS NULL OR ${c} >= 1`));
  }
});

test("(c) ẩn danh dòng giấy tờ HIỆN HÀNH, ĐÃ GIA HẠN THAY và ĐÃ HUỶ: chuyển hợp lệ qua", () => {
  // dựng người P có: dòng CCCD ID_A (đã có dòng gia hạn ID_B nối previous_id), ID_B hiện hành, một dòng GPLX đã huỷ — số thật 0790xxxxxxxx
  // UPDATE … SET erased_at = T2, document_number = DAU(id), number_key = DAU(id), issued_place = NULL, updated_at = T2 WHERE party_id = P → không lỗi
  // SELECT: mọi dòng document_number = DAU(id), number_key = DAU(id), issued_place IS NULL, erased_at = T2; expiry_date / issued_date / voided_at giữ nguyên
});

test("(d) dạng chuyển sai bị chặn: số khác dấu, giữ nơi cấp, đổi hạn / ngày cấp / hạng / huỷ cùng lúc đặt erased_at", () => {
  // mỗi biến thể một assert.throws(/person_document_erase_shape/): document_number = 'XOA123'; number_key = DAU(ID_B) trên dòng ID_A (dấu của DÒNG KHÁC);
  // issued_place giữ; expiry_date đổi; issued_date đổi; license_class_code đổi; voided_at đặt — trên cả dòng hiện hành lẫn dòng đã gia hạn ID_A
});

test("(e) dòng đã ẩn danh đóng băng: đặt erased_at về rỗng, đặt lại số thật, sửa hạn → đều bị chặn", () => {
  // sau (c): UPDATE SET erased_at = NULL → /person_document_erased/; UPDATE SET document_number = '079012345678' → cùng mã; UPDATE SET expiry_date = … → cùng mã
});

test("(f) sửa thường trên dòng đã gia hạn / đã huỷ (không phải ẩn danh) VẪN bị chặn như 0032", () => {
  // UPDATE … SET expiry_date = '2030-01-01' WHERE id = ID_A → /person_document_superseded/; trên dòng đã huỷ → /person_document_voided/
});

test("(g) phiếu tự khai: ẩn danh phiếu ĐÃ CHẤP NHẬN, ĐÃ TỪ CHỐI, ĐÃ RÚT qua; phiếu ĐANG CHỜ thì không (phải rút trước)", () => {
  // NGAY_SINH: birth_date → '1900-01-01'; DIA_CHI: address_value → 'Đã xoá'; GIAY_TO: document_number/number_key → DAU(id), issued_place → NULL; status / decided_* giữ
  // phiếu CHO_XAC_MINH: UPDATE SET erased_at … → /self_submission_erase_shape/
  // sai dạng (birth_date = NULL; address_value = 'x'; đổi status cùng lúc) → /self_submission_erase_shape/ (hoặc CHECK của 0105 với birth_date NULL)
  // sau ẩn danh: UPDATE SET erased_at = NULL → /self_submission_erased/
});

test("(h) sửa nội dung phiếu không phải ẩn danh VẪN bị chặn như 0105; đổi trạng thái phiếu đã xử lý VẪN bị chặn", () => {
  // UPDATE SET address_value = 'khác' WHERE status = 'CHO_XAC_MINH' → /self_submission_content/; UPDATE SET status = 'RUT' WHERE status = 'DA_CHAP_NHAN' → /self_submission_status_one_way/
});

test("(i) phiếu xoá: chỉ hồ sơ cá nhân; một phiếu chờ mỗi hồ sơ; INSERT OR REPLACE bị chặn; không xoá dòng", () => {
  // INSERT cho hồ sơ tổ chức → /erasure_person_only/; INSERT phiếu chờ thứ hai cùng hồ sơ → /erasure_pending_exists/;
  // INSERT OR REPLACE cùng id → /erasure_no_replace/; DELETE → /erasure_no_delete/; INSERT trạng thái khác CHO_XU_LY → /erasure_new_not_pending/
});

test("(j) phiếu xoá: trạng thái một chiều; người xử lý ≠ người gửi; RUT chỉ người gửi; bản ngoài một chiều, chỉ sau DA_THUC_HIEN", () => {
  // CHO_XU_LY → DA_THUC_HIEN bởi chính người gửi → /erasure_decider_is_requester/; → RUT bởi người khác → /erasure_withdraw_not_requester/
  // DA_THUC_HIEN → TU_CHOI → /erasure_status_one_way/; sửa due_at / party_id → /erasure_content/; CHO_XU_LY → CHO_XU_LY (chạm dòng) → /erasure_status_one_way/
  // offsite_at đặt khi TU_CHOI → CHECK; đặt lại lần hai → /erasure_offsite_one_way/
});

test("(k) phiếu xoá đang chờ chặn phiếu tự khai mới của cùng hồ sơ; phiếu xoá đã xong / đã rút thì không chặn", () => {
  // INSERT pty_self_submission khi có phiếu xoá CHO_XU_LY → /self_submission_erasure_open/; sau khi phiếu xoá RUT → INSERT được
});

test("(l) gộp hồ sơ bị chặn khi một trong hai hồ sơ có phiếu xoá đang chờ hoặc đã thực hiện (hai chiều)", () => {
  // UPDATE pty_party SET merged_into_id = B, merged_at = T WHERE id = A, với phiếu DA_THUC_HIEN ở A → /party_merge_erasure/; ở B → cùng mã; phiếu TU_CHOI → gộp được
});
```

Viết đủ thân từng bài theo chú thích (mỗi biến thể một `assert.throws(() => d.prepare(…).run(…), /mã/)`). Bài (c) PHẢI có dòng đã gia hạn thay và dòng đã huỷ (đây là chỗ trigger cũ chặn).

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/migrations-xoa-an-danh.test.ts`
Expected: FAIL — `thiếu migrations/*_xoa_an_danh.sql`.

- [ ] **Step 3: Viết migration**

```sql
-- Migration 0108 — ADR-0126 (accepted 2026-10-16) đ2, đ3, đ6; Hiến chương 5.24 (ẩn danh hoá = ngoại lệ có tên của 5.5), 5.25: phiếu xoá + ẩn danh hoá (lát H-5 Gói 2).
-- Module parties. CHỈ THÊM (ADD COLUMN, CREATE TABLE / INDEX / TRIGGER) + TẠO LẠI bốn trigger chặn sửa (DROP TRIGGER rồi CREATE TRIGGER CÙNG TÊN — không đụng bảng,
-- không dựng lại bảng: SUY-RA X2). KHÔNG gieo; KHÔNG con số thời hạn (hai cột số ngày rỗng được, không DEFAULT — con số chờ luật sư, ADR-0126 đ2).
-- Dấu ẩn danh số giấy tờ = 'XOA' || upper(replace(mã dòng, '-', '')): duy nhất theo dòng (không vướng trigger một CCCD một người), KHÔNG suy ra được từ số thật.
-- Hằng khớp TỪNG CHỮ với src/modules/parties/xoa-an-danh.ts (bài xoa-an-danh.test.ts đối chiếu). Miễn trừ hai phần (ruling R3 kế hoạch 2026-10-17-goi-2-h5): trigger
-- cũ chỉ miễn "đặt erased_at lần đầu"; trigger *_erase_shape giữ ĐÚNG dạng chuyển; *_erased_frozen đóng băng dòng đã ẩn danh. aut_session KHÔNG cần migration.

-- (1) Giấy tờ của người (0032)
ALTER TABLE pty_person_document ADD COLUMN erased_at TEXT;
DROP TRIGGER pty_person_document_superseded;
CREATE TRIGGER pty_person_document_superseded BEFORE UPDATE ON pty_person_document
WHEN EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
  AND NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_superseded: giấy tờ đã có dòng gia hạn — không sửa đè'); END;
DROP TRIGGER pty_person_document_voided;
CREATE TRIGGER pty_person_document_voided BEFORE UPDATE ON pty_person_document
WHEN OLD.voided_at IS NOT NULL AND NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_voided: dòng đã huỷ — không sửa'); END;
CREATE TRIGGER pty_person_document_erase_shape BEFORE UPDATE ON pty_person_document
WHEN OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL AND (
     NEW.document_number IS NOT (CASE WHEN OLD.document_number IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.number_key IS NOT (CASE WHEN OLD.number_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.issued_place IS NOT NULL
  OR NEW.license_class_code IS NOT OLD.license_class_code OR NEW.issued_date IS NOT OLD.issued_date
  OR NEW.expiry_date IS NOT OLD.expiry_date OR NEW.voided_at IS NOT OLD.voided_at)
BEGIN SELECT RAISE(ABORT, 'person_document_erase_shape: ẩn danh hoá chỉ thay số bằng dấu và xoá nơi cấp — không sửa cột khác'); END;
CREATE TRIGGER pty_person_document_erased_frozen BEFORE UPDATE ON pty_person_document
WHEN OLD.erased_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'person_document_erased: dòng đã ẩn danh hoá — không sửa'); END;

-- (2) Phiếu yêu cầu xoá (ADR-0126 đ2) — vòng đời một chiều CHO_XU_LY → DA_THUC_HIEN | TU_CHOI | RUT. due_at chụp lúc gửi từ chính sách hiện hành (rỗng = chưa có số).
CREATE TABLE pty_erasure_request (
  id              TEXT PRIMARY KEY,
  party_id        TEXT NOT NULL REFERENCES pty_person(party_id),          -- chỉ hồ sơ CÁ NHÂN (ruling R4); = staff.party_id của phiên lúc gửi
  policy_id       TEXT REFERENCES pty_privacy_policy(id),                 -- chính sách hiện hành lúc gửi; rỗng = chưa đăng bản nào
  due_at          TEXT,                                                   -- hạn xử lý = created_at + erasure_days (SQL tính lúc gửi); rỗng = chính sách chưa có số
  status          TEXT NOT NULL CHECK (status IN ('CHO_XU_LY', 'DA_THUC_HIEN', 'TU_CHOI', 'RUT')),
  decided_at      TEXT,
  decided_by      TEXT,
  reason_code     TEXT CHECK (reason_code IS NULL OR (length(reason_code) BETWEEN 2 AND 40 AND reason_code NOT GLOB '*[^A-Z0-9_]*')),
  name_kept       INTEGER CHECK (name_kept IS NULL OR name_kept IN (0, 1)),   -- quyết lúc thực hiện (ruling R8); câu ghi tên đọc cột này
  retained_codes  TEXT CHECK (retained_codes IS NULL OR (length(retained_codes) BETWEEN 2 AND 400 AND retained_codes NOT GLOB '*[^A-Z0-9_,]*')),
  offsite_at      TEXT,                                                   -- bản ngoài D1 (chỉ mã) đã chép (ADR-0126 đ7)
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((status = 'CHO_XU_LY') = (decided_at IS NULL)),
  CHECK ((status = 'CHO_XU_LY') = (decided_by IS NULL)),
  CHECK ((status = 'TU_CHOI') = (reason_code IS NOT NULL)),
  CHECK ((status = 'DA_THUC_HIEN') = (retained_codes IS NOT NULL)),
  CHECK ((status = 'DA_THUC_HIEN') = (name_kept IS NOT NULL)),
  CHECK (offsite_at IS NULL OR status = 'DA_THUC_HIEN'),
  CHECK ((policy_id IS NULL) <= (due_at IS NULL))
);
CREATE INDEX pty_erasure_request_party_ix ON pty_erasure_request(party_id, created_at);
CREATE INDEX pty_erasure_request_cho_ix ON pty_erasure_request(created_at) WHERE status = 'CHO_XU_LY';
CREATE UNIQUE INDEX pty_erasure_request_one_pending_uq ON pty_erasure_request(party_id) WHERE status = 'CHO_XU_LY';
CREATE TRIGGER pty_erasure_request_no_delete BEFORE DELETE ON pty_erasure_request
BEGIN SELECT RAISE(ABORT, 'erasure_no_delete: phiếu yêu cầu xoá không xoá'); END;
CREATE TRIGGER pty_erasure_request_no_replace BEFORE INSERT ON pty_erasure_request
WHEN EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'erasure_no_replace: UNIQUE — mã phiếu đã có, không ghi đè'); END;
CREATE TRIGGER pty_erasure_request_person_ins BEFORE INSERT ON pty_erasure_request
WHEN NOT EXISTS (SELECT 1 FROM pty_person p WHERE p.party_id = NEW.party_id)
BEGIN SELECT RAISE(ABORT, 'erasure_person_only: phiếu yêu cầu xoá chỉ cho hồ sơ cá nhân'); END;
CREATE TRIGGER pty_erasure_request_new_ins BEFORE INSERT ON pty_erasure_request
WHEN NEW.status <> 'CHO_XU_LY'
BEGIN SELECT RAISE(ABORT, 'erasure_new_not_pending: phiếu mới phải ở trạng thái chờ xử lý'); END;
CREATE TRIGGER pty_erasure_request_one_pending_ins BEFORE INSERT ON pty_erasure_request
WHEN EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.party_id = NEW.party_id AND r.status = 'CHO_XU_LY')
BEGIN SELECT RAISE(ABORT, 'erasure_pending_exists: UNIQUE — hồ sơ đã có phiếu yêu cầu xoá đang chờ'); END;
CREATE TRIGGER pty_erasure_request_content BEFORE UPDATE ON pty_erasure_request
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.policy_id IS NOT OLD.policy_id OR NEW.due_at IS NOT OLD.due_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'erasure_content: nội dung phiếu yêu cầu xoá không sửa'); END;
CREATE TRIGGER pty_erasure_request_status_one_way BEFORE UPDATE ON pty_erasure_request
WHEN (OLD.status = 'CHO_XU_LY' AND NEW.status = 'CHO_XU_LY')
  OR (OLD.status <> 'CHO_XU_LY' AND (NEW.status IS NOT OLD.status OR NEW.decided_at IS NOT OLD.decided_at OR NEW.decided_by IS NOT OLD.decided_by
      OR NEW.reason_code IS NOT OLD.reason_code OR NEW.name_kept IS NOT OLD.name_kept OR NEW.retained_codes IS NOT OLD.retained_codes))
BEGIN SELECT RAISE(ABORT, 'erasure_status_one_way: phiếu đã xử lý hoặc đã rút — không đổi'); END;
CREATE TRIGGER pty_erasure_request_decider BEFORE UPDATE ON pty_erasure_request
WHEN OLD.status = 'CHO_XU_LY' AND NEW.status IN ('DA_THUC_HIEN', 'TU_CHOI') AND NEW.decided_by IS OLD.created_by
BEGIN SELECT RAISE(ABORT, 'erasure_decider_is_requester: người xử lý phải khác người gửi phiếu'); END;
CREATE TRIGGER pty_erasure_request_withdraw BEFORE UPDATE ON pty_erasure_request
WHEN OLD.status = 'CHO_XU_LY' AND NEW.status = 'RUT' AND NEW.decided_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'erasure_withdraw_not_requester: chỉ người gửi được rút phiếu'); END;
CREATE TRIGGER pty_erasure_request_offsite_one_way BEFORE UPDATE OF offsite_at ON pty_erasure_request
WHEN OLD.offsite_at IS NOT NULL AND NEW.offsite_at IS NOT OLD.offsite_at
BEGIN SELECT RAISE(ABORT, 'erasure_offsite_one_way: mốc chép bản ngoài chỉ đặt một lần'); END;

-- (3) Phiếu tự khai (0105, 0107) — ẩn danh phiếu ĐÃ xử lý / đã rút (phiếu đang chờ phải rút trước, cùng lô). Giá trị giữ chỗ vì CHECK của 0105 cấm rỗng.
ALTER TABLE pty_self_submission ADD COLUMN erased_at TEXT;
DROP TRIGGER pty_self_submission_content;
CREATE TRIGGER pty_self_submission_content BEFORE UPDATE ON pty_self_submission
WHEN NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL) AND (
     NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.subject_kind IS NOT OLD.subject_kind OR NEW.policy_id IS NOT OLD.policy_id
  OR NEW.birth_date IS NOT OLD.birth_date OR NEW.address_value IS NOT OLD.address_value OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.document_number IS NOT OLD.document_number OR NEW.number_key IS NOT OLD.number_key OR NEW.license_class_code IS NOT OLD.license_class_code
  OR NEW.issued_date IS NOT OLD.issued_date OR NEW.issued_place IS NOT OLD.issued_place OR NEW.expiry_date IS NOT OLD.expiry_date
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by)
BEGIN SELECT RAISE(ABORT, 'self_submission_content: nội dung phiếu tự khai không sửa — rút rồi khai phiếu mới'); END;
DROP TRIGGER pty_self_submission_status_one_way;
CREATE TRIGGER pty_self_submission_status_one_way BEFORE UPDATE ON pty_self_submission
WHEN (OLD.status <> 'CHO_XAC_MINH' OR NEW.status = 'CHO_XAC_MINH') AND NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'self_submission_status_one_way: phiếu đã xử lý hoặc đã rút — không đổi trạng thái'); END;
CREATE TRIGGER pty_self_submission_erase_shape BEFORE UPDATE ON pty_self_submission
WHEN OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL AND (
     OLD.status = 'CHO_XAC_MINH' OR NEW.status IS NOT OLD.status OR NEW.decided_at IS NOT OLD.decided_at OR NEW.decided_by IS NOT OLD.decided_by
  OR NEW.reason_code IS NOT OLD.reason_code OR NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.subject_kind IS NOT OLD.subject_kind
  OR NEW.policy_id IS NOT OLD.policy_id OR NEW.document_type_code IS NOT OLD.document_type_code OR NEW.license_class_code IS NOT OLD.license_class_code
  OR NEW.issued_date IS NOT OLD.issued_date OR NEW.expiry_date IS NOT OLD.expiry_date OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.birth_date IS NOT (CASE WHEN OLD.birth_date IS NULL THEN NULL ELSE '1900-01-01' END)
  OR NEW.address_value IS NOT (CASE WHEN OLD.address_value IS NULL THEN NULL ELSE 'Đã xoá' END)
  OR NEW.document_number IS NOT (CASE WHEN OLD.document_number IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.number_key IS NOT (CASE WHEN OLD.number_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.issued_place IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'self_submission_erase_shape: ẩn danh hoá phiếu chỉ thay giá trị khai bằng dấu, trên phiếu đã xử lý hoặc đã rút'); END;
CREATE TRIGGER pty_self_submission_erased_frozen BEFORE UPDATE ON pty_self_submission
WHEN OLD.erased_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'self_submission_erased: phiếu đã ẩn danh hoá — không sửa'); END;
CREATE TRIGGER pty_self_submission_erasure_open_ins BEFORE INSERT ON pty_self_submission
WHEN EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.party_id = NEW.party_id AND r.status = 'CHO_XU_LY')
BEGIN SELECT RAISE(ABORT, 'self_submission_erasure_open: đang có yêu cầu xoá dữ liệu chờ xử lý — chưa gửi phiếu mới được'); END;

-- (4) Số ngày trong dữ liệu chính sách (ADR-0126 đ2, đ8; Hiến chương 5.25). Rỗng = chưa có số luật sư xác nhận ⇒ không hạn, không ẩn danh phiên cũ. KHÔNG DEFAULT.
ALTER TABLE pty_privacy_policy ADD COLUMN erasure_days INTEGER CHECK (erasure_days IS NULL OR erasure_days >= 1);
ALTER TABLE pty_privacy_policy ADD COLUMN session_retention_days INTEGER CHECK (session_retention_days IS NULL OR session_retention_days >= 1);

-- (5) Không gộp hồ sơ đang / đã có phiếu xoá (ruling R16) — hồ sơ phụ gộp vào hồ sơ đã ẩn danh sẽ mang dữ liệu thật vào một hồ sơ "đã xoá".
CREATE TRIGGER pty_party_merge_erasure BEFORE UPDATE OF merged_into_id ON pty_party
WHEN NEW.merged_into_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM pty_erasure_request r WHERE r.party_id IN (NEW.id, NEW.merged_into_id) AND r.status IN ('CHO_XU_LY', 'DA_THUC_HIEN'))
BEGIN SELECT RAISE(ABORT, 'party_merge_erasure: hồ sơ đang có hoặc đã thực hiện yêu cầu xoá dữ liệu — không gộp'); END;
```

Ghi chú cho người thi công: `CHECK ((policy_id IS NULL) <= (due_at IS NULL))` nghĩa là "không có chính sách thì không có hạn". Nếu node:sqlite / D1 báo lỗi cú pháp ở `ALTER TABLE … ADD COLUMN … CHECK` thì dừng và báo (0103 đã dùng đúng dạng này cho `birth_date` — tiền lệ chạy được).

- [ ] **Step 4: Chạy lại, xác nhận xanh**

Run: `node --test src/migrations-xoa-an-danh.test.ts src/migrations-xac-minh-ho-so.test.ts src/migrations-ho-so-tu-khai.test.ts src/migrations-ho-so-tep.test.ts`
Expected: PASS (sửa bài "đứng cuối" của tệp 0107 nếu đỏ đúng dự kiến).

- [ ] **Step 5: Sổ dữ liệu** — thêm mục bảng / cột ở `docs/data-dictionary.json` (khuôn mục `pty_self_submission`), hạng ở `hangDuLieu`; `npm run dict`. Chạy `node --test src/data-dictionary*.test.ts` (hoặc bài hạng 5.20 tìm bằng `grep -ln hangDuLieu src/*.test.ts`) — xanh.

- [ ] **Step 6: Bất biến (đỏ rồi xanh)** — `scripts/audit-checks.mjs`, ngay sau `R-PTY-16`:

```js
  // R-PTY-17 (ADR-0126 đ3, Hiến chương 5.24): dòng đã ẩn danh còn số / nơi cấp thật — lớp hai cho trigger *_erase_shape (lát H-5).
  {
    code: "R-PTY-17",
    what: "dòng giấy tờ hoặc phiếu tự khai đã ẩn danh mà số không phải dấu ẩn danh hoặc còn nơi cấp",
    sql: `SELECT (SELECT COUNT(*) FROM pty_person_document WHERE erased_at IS NOT NULL AND (issued_place IS NOT NULL
             OR (document_number IS NOT NULL AND document_number <> 'XOA' || upper(replace(id, '-', '')))))
         + (SELECT COUNT(*) FROM pty_self_submission WHERE erased_at IS NOT NULL AND (issued_place IS NOT NULL
             OR (document_number IS NOT NULL AND document_number <> 'XOA' || upper(replace(id, '-', '')))
             OR (birth_date IS NOT NULL AND birth_date <> '1900-01-01') OR (address_value IS NOT NULL AND address_value <> 'Đã xoá')))`,
    level: "fail",
  },
  // R-PTY-18 (ADR-0126 đ3): phiếu ĐÃ THỰC HIỆN mà hồ sơ (và hồ sơ đã gộp vào nó) còn dữ liệu tạo TRƯỚC lúc thực hiện chưa ẩn danh.
  {
    code: "R-PTY-18",
    what: "phiếu yêu cầu xoá đã thực hiện mà còn giấy tờ, phiếu tự khai, liên hệ, ngày sinh hoặc ảnh chưa ẩn danh / chưa quyết xoá",
    sql: `SELECT COUNT(*) FROM pty_erasure_request r WHERE r.status = 'DA_THUC_HIEN' AND (
            EXISTS (SELECT 1 FROM pty_person_document d WHERE d.party_id IN (SELECT id FROM pty_party WHERE id = r.party_id OR merged_into_id = r.party_id)
                      AND d.created_at <= r.decided_at AND d.erased_at IS NULL)
         OR EXISTS (SELECT 1 FROM pty_self_submission s WHERE s.party_id = r.party_id AND s.created_at <= r.decided_at AND s.erased_at IS NULL)
         OR EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id IN (SELECT id FROM pty_party WHERE id = r.party_id OR merged_into_id = r.party_id)
                      AND c.created_at <= r.decided_at AND (c.value <> 'Đã xoá' OR c.value_normalized <> 'XOA' OR c.valid_to_date IS NULL))
         OR EXISTS (SELECT 1 FROM pty_person p WHERE p.party_id = r.party_id AND p.birth_date IS NOT NULL AND p.updated_at <= r.decided_at)
         OR EXISTS (SELECT 1 FROM pty_attachment a WHERE a.party_id IN (SELECT id FROM pty_party WHERE id = r.party_id OR merged_into_id = r.party_id)
                      AND a.created_at <= r.decided_at AND a.purged_at IS NULL))`,
    level: "fail",
  },
  // R-PTY-19 (ADR-0126 đ7; Hiến chương 5.16): bản ngoài D1 của phiếu đã thực hiện chưa chép sau 1 giờ — chạy lại ở POST /api/parties/phieu-xoa/chay-lai.
  {
    code: "R-PTY-19",
    what: "phiếu yêu cầu xoá đã thực hiện quá 1 giờ mà chưa chép bản ngoài D1 (chạy lại ở POST /api/parties/phieu-xoa/chay-lai)",
    sql: "SELECT COUNT(*) FROM pty_erasure_request WHERE status = 'DA_THUC_HIEN' AND offsite_at IS NULL AND decided_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')",
    level: "warn",
  },
  // R-PTY-20 (ADR-0126 đ8): phiên của tài khoản gắn hồ sơ có phiếu ĐÃ THỰC HIỆN, cấp TRƯỚC lúc thực hiện, còn IP hoặc User-Agent.
  {
    code: "R-PTY-20",
    what: "phiên đăng nhập cấp trước khi thực hiện phiếu xoá mà còn IP hoặc User-Agent",
    sql: `SELECT COUNT(*) FROM aut_session x JOIN staff st ON st.id = x.staff_id JOIN pty_erasure_request r ON r.party_id = st.party_id
          WHERE r.status = 'DA_THUC_HIEN' AND x.created_at <= r.decided_at AND (x.ip IS NOT NULL OR x.user_agent IS NOT NULL)`,
    level: "fail",
  },
```

`src/audit-invariants.test.ts`: mỗi mã một ca đỏ (chèn thẳng dòng vi phạm vào DB thử, khuôn ca `R-PTY-14`) + ca xanh. Dòng `pty_person` trong R-PTY-18 so `updated_at` — người thi công kiểm câu ghi ngày sinh ở Task 2 đặt `updated_at = decided_at` để ngày sinh khai SAU khi xoá (qua phiếu tự khai mới, chấp nhận sau) không bị tính là vi phạm.

- [ ] **Step 7: Chạy bộ kiểm của task**

Run: `node --test src/migrations-xoa-an-danh.test.ts src/audit-invariants.test.ts src/architecture.test.ts src/migrations-n1.test.ts`, rồi `npm run typecheck`, rồi `npm test`.
Expected: PASS. (`migrations-n1.test.ts` canh trigger siết B5 theo TÊN `staff_`/`stf_` — mọi trigger mới tên `pty_`.)

- [ ] **Step 8: Commit**

```bash
git add migrations/0108_xoa_an_danh.sql src/migrations-xoa-an-danh.test.ts src/migrations-xac-minh-ho-so.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md scripts/audit-checks.mjs src/audit-invariants.test.ts
git commit -m "Xoá dữ liệu: migration 0108 — phiếu yêu cầu xoá, ẩn danh hoá có dạng chuyển hẹp, đóng băng dòng đã ẩn danh, số ngày trong chính sách (ADR-0126)"
```

- [ ] **Step 9: Phá thử thật (P16) — ghi dòng `not ok` vào báo cáo, hoàn nguyên, `git status` sạch.** Làm trên bản SAO của migration nạp vào DB thử (sửa tạm tệp rồi `git checkout -- migrations/0108_xoa_an_danh.sql` — được vì tệp chưa trên `main`; hoặc chèn câu `DROP TRIGGER … ; CREATE TRIGGER …` nới trong bài thử tạm):
  1. **Đi ngược:** bỏ trigger `pty_person_document_erased_frozen` ⇒ bài (e) đỏ (đặt `erased_at` về rỗng qua được).
  2. **Điều kiện miễn quá rộng:** bỏ vế `OR NEW.expiry_date IS NOT OLD.expiry_date` khỏi `pty_person_document_erase_shape` ⇒ bài (d) đỏ ở ca "sửa `expiry_date` trên dòng đã gia hạn cùng lúc đặt `erased_at`". Biến thể 2b: xoá hẳn trigger `_erase_shape` ⇒ (d) đỏ toàn bộ.
  3. **Dấu trùng dòng khác:** đổi dấu trong `_erase_shape` thành `'XOA'` cố định (không theo mã dòng) ⇒ bài (c) đỏ ở trigger `person_document_cccd_other_person` (hai dòng CCCD hiện hành của hai người cùng `number_key`) — hoặc (d) ca "dấu của DÒNG KHÁC" qua được ⇒ đỏ.
  4. Bỏ vế `AND NOT (… erased_at …)` của `pty_self_submission_status_one_way` ⇒ bài (g) đỏ (ẩn danh phiếu đã chấp nhận bị chặn).

**Tiêu chí nghiệm thu Task 1:** 12 bài (a)–(l) xanh; bốn phép phá thử đỏ đúng chỗ rồi xanh lại; `R-PTY-17..20` có ca đỏ và ca xanh; sổ dữ liệu đủ hạng (bài 5.20 xanh); không trigger cũ nào bị nới ngoài đúng vế miễn "đặt `erased_at` lần đầu".

**→ Người kiểm độc lập nhóm A** (chỉ đọc): đọc `0108` đối chiếu ADR-0126 đ3, `SUY-RA.md` X2, sự thật 3–5; tự chạy Step 7; lặp ít nhất phép phá thử 1, 2, 3; xác nhận không `DROP TABLE`, không gieo, không con số thời hạn; xác nhận trigger `_identity`, `_cccd_one_person_*`, `_renew_ins`, `pty_self_submission_decider_not_author` KHÔNG bị đụng.

---

### Task 2: Luật thuần + câu ghi ẩn danh + hình chiếu ảnh hết lý do giữ + bài mức câu lệnh (VIỆC LỚN — dữ liệu)

**Files:**
- Create: `src/modules/parties/xoa-an-danh.ts`, `src/modules/parties/xoa-an-danh.test.ts`
- Create: `src/shared/xoa-an-danh-hien-thi.ts`, `src/shared/xoa-an-danh-hien-thi.test.ts`
- Modify: `src/modules/parties/repository.ts`
- Create: `src/modules/parties/xoa-an-danh-lenh.test.ts`, `src/xoa-mot-lenh-co-ten.test.ts` (Step 4b)
- Modify: `src/tu-khai-khong-len-nhan.test.ts` (tập câu SQL đăng ký chạm `pty_self_submission`: thêm đúng các khoá mới ở Step 3, có lý do "ADR-0126 đ3 — ẩn danh hoá")

**Interfaces:**
- Consumes: Task 1 (bảng, cột, trigger); `canManageAccount` (`src/shared/roles.ts`); `defineSql` (`src/shared/sql-registry.ts`).
- Produces:

```ts
// src/modules/parties/xoa-an-danh.ts — luật thuần, không I/O
export const DAU_TEN = "Người đã xoá dữ liệu";
export const DAU_LIEN_HE = { value: "Đã xoá", normalized: "XOA" } as const;
export const DAU_NGAY_SINH_PHIEU = "1900-01-01";
export const DAU_DIA_CHI_PHIEU = "Đã xoá";
export const LY_DO_XOA_TEP_PHIEU = "PHIEU_XOA";
export const LY_DO_XOA_TEP_HET_GIU = "HET_LY_DO_GIU";
export function dauSoGiayTo(id: string): string; // "XOA" + id bỏ "-" viết hoa — khớp trigger 0108
export type LyDoKhongGuiXoa = "khong_ho_so" | "khong_ca_nhan" | "cong_ty_chu" | "dang_cho";
export function xetGuiPhieuXoa(v: { coHoSo: boolean; laCaNhan: boolean; laCongTyChu: boolean; coPhieuCho: boolean }): LyDoKhongGuiXoa | null;
export type LyDoKhongXuLy = "nguoi_gui" | "cap_bac" | "khong_tai_khoan" | "cong_ty_chu" | "dang_ban";
export function xetXuLyPhieuXoa(v: {
  nguoi: { id: string; permissions: readonly PermissionCode[] };
  phieu: { createdBy: string };
  chuPhieu: { id: string; permissions: readonly PermissionCode[] } | null;
  laCongTyChu: boolean;
  viec: { doi: number; phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number };
}): LyDoKhongXuLy | null;
export function giuTen(v: { permissions: readonly PermissionCode[]; don: { giuDaGiao: number; giuDaHuy: number }; soDongNo: number }): boolean;
export function phanGiuLai(v: { giuTen: boolean; coTaiKhoan: boolean }): string[]; // mã theo thứ tự PHAN_GIU_LAI
export type TrangThaiHan = "chua_co_han" | "con_han" | "qua_han";
export function trangThaiHan(dueAt: string | null, nowIso: string): TrangThaiHan;
export type LyDoXoaAnh = "HET_HAN" | "DA_GIA_HAN" | "DA_HUY" | "DA_AN_DANH" | "HET_QUAN_HE" | "PHIEU_DA_XU_LY" | "KHONG_NOI";
// src/shared/xoa-an-danh-hien-thi.ts — dùng chung máy chủ + giao diện
export const PHAN_GIU_LAI: readonly { ma: string; nhan: string }[];
export const LY_DO_TU_CHOI_XOA: readonly { ma: "CAN_GIU_THEO_LUAT" | "NGUOI_DUNG_HUY_QUA_KENH_KHAC"; nhan: string }[];
export function nhanTrangThaiPhieuXoa(s: string): string;
export function nhanLyDoXoaAnh(s: string): string;
export const CAU_CAN_CU_GIU_LAI = "Căn cứ giữ lại: chưa được luật sư hay kế toán xác nhận.";
```

Câu ghi (repository.ts, `defineSql("parties", …)`, mỗi câu sau câu quyết mang lính gác `DA_THANG_XOA` = `EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.id = ?1 AND r.status = 'DA_THUC_HIEN' AND r.decided_by = ?2 AND r.decided_at = ?3)`; tập hồ sơ `TAP_HO_SO` = `(SELECT p.id FROM pty_party p WHERE p.id = ?4 OR p.merged_into_id = ?4)` — hằng ghép lúc nạp, tiền lệ sự thật 19 của H-4):

```ts
export function guiPhieuXoaStatement(db, v: { id: string; partyId: string; actorId: string; at: string }): D1PreparedStatement; // INSERT … SELECT chụp policy_id, due_at
export function rutPhieuTuKhaiKhiGuiXoaStatement(db, v: { phieuXoaId: string; partyId: string; actorId: string; at: string }): D1PreparedStatement; // RUT phiếu chờ, lính gác phiếu xoá vừa chèn
export function rutPhieuXoaStatement(db, v: { id: string; actorId: string; at: string }): D1PreparedStatement;
export function quyetPhieuXoaStatement(db, v: { id: string; actorId: string; at: string; giuTen: boolean; phanGiuLai: string }): D1PreparedStatement; // CHO_XU_LY → DA_THUC_HIEN
export function tuChoiPhieuXoaStatement(db, v: { id: string; actorId: string; at: string; lyDo: string }): D1PreparedStatement;
export function anDanhStatements(db, v: { id: string; partyId: string; actorId: string; at: string; homNay: string }): D1PreparedStatement[]; // thứ tự cố định Step 3
export function danhDauOffsiteStatement(db, v: { id: string; at: string }): D1PreparedStatement;
export function timPhieuXoa(db, id: string): Promise<PhieuXoaRow | null>;
export function listPhieuXoaCho(db): Promise<PhieuXoaRow[]>;          // mọi phiếu chờ, trần 5 000, quá hạn lên đầu rồi cũ trước
export function listPhieuXoaCuaHoSo(db, partyId: string): Promise<PhieuXoaRow[]>; // 20 dòng mới nhất
export function demXemTruocXoa(db, partyId: string): Promise<{ giayTo: number; phieuTuKhai: number; lienHe: number; coNgaySinh: boolean; tep: number }>;
export function listAnhHetLyDoGiu(db, homNay: string): Promise<AnhHetGiuRow[]>; // hình chiếu R14, trần 500
export function datChoXoaAnhHetGiuStatement(db, v: { tepId: string; actorId: string; at: string; homNay: string }): D1PreparedStatement; // lính gác: còn hết lý do giữ
export function tepChoXoaCuaPhieu(db, partyId: string): Promise<TepCanXoa[]>;
export function listPhieuChuaChepNgoai(db): Promise<{ id: string; party_id: string; decided_at: string }[]>;
```

- [ ] **Step 1: Bài luật thuần (đỏ)** — `src/modules/parties/xoa-an-danh.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dauSoGiayTo, giuTen, phanGiuLai, trangThaiHan, xetGuiPhieuXoa, xetXuLyPhieuXoa, DAU_NGAY_SINH_PHIEU, DAU_DIA_CHI_PHIEU } from "./xoa-an-danh.ts";

const VIEC0 = { doi: 0, phuTrachDon: 0, laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0 };

test("dấu số giấy tờ khớp TỪNG CHỮ với trigger của migration *_xoa_an_danh.sql; dài ≤ 40 với mã UUID", () => {
  assert.equal(dauSoGiayTo("0b1e5c2a-0000-4000-8000-00000000000a"), "XOA0B1E5C2A000040008000" + "00000000000A");
  assert.ok(dauSoGiayTo("0b1e5c2a-0000-4000-8000-00000000000a").length <= 40);
  const mig = new URL("../../../migrations/", import.meta.url);
  const sql = readFileSync(new URL(readdirSync(mig).find((f) => f.endsWith("_xoa_an_danh.sql"))!, mig), "utf8");
  assert.match(sql, /'XOA' \|\| upper\(replace\(OLD\.id, '-', ''\)\)/);
  assert.ok(sql.includes(`'${DAU_NGAY_SINH_PHIEU}'`) && sql.includes(`'${DAU_DIA_CHI_PHIEU}'`));
});

test("xét gửi: không hồ sơ / tổ chức / công ty chủ / đang có phiếu chờ → lý do; cá nhân hợp lệ → null (KHÔNG xét đồng ý chính sách)", () => {
  assert.equal(xetGuiPhieuXoa({ coHoSo: false, laCaNhan: false, laCongTyChu: false, coPhieuCho: false }), "khong_ho_so");
  assert.equal(xetGuiPhieuXoa({ coHoSo: true, laCaNhan: false, laCongTyChu: false, coPhieuCho: false }), "khong_ca_nhan");
  assert.equal(xetGuiPhieuXoa({ coHoSo: true, laCaNhan: true, laCongTyChu: true, coPhieuCho: false }), "cong_ty_chu");
  assert.equal(xetGuiPhieuXoa({ coHoSo: true, laCaNhan: true, laCongTyChu: false, coPhieuCho: true }), "dang_cho");
  assert.equal(xetGuiPhieuXoa({ coHoSo: true, laCaNhan: true, laCongTyChu: false, coPhieuCho: false }), null);
});

test("xét xử lý: người gửi; cấp bậc (Quản trị không xử lý phiếu của Quản trị / Nhân sự / Toàn quyền); chủ phiếu mất tài khoản → chỉ Toàn quyền; công ty chủ; đang bận", () => {
  const admin = { id: "a", permissions: ["ADMIN"] as const };
  const sup = { id: "s", permissions: ["SUPER_ADMIN"] as const };
  const p = { createdBy: "u" };
  assert.equal(xetXuLyPhieuXoa({ nguoi: { id: "u", permissions: ["SUPER_ADMIN"] }, phieu: p, chuPhieu: { id: "u", permissions: ["SUPER_ADMIN"] }, laCongTyChu: false, viec: VIEC0 }), "nguoi_gui");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["HR"] }, laCongTyChu: false, viec: VIEC0 }), "cap_bac");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: null, laCongTyChu: false, viec: VIEC0 }), "khong_tai_khoan");
  assert.equal(xetXuLyPhieuXoa({ nguoi: sup, phieu: p, chuPhieu: null, laCongTyChu: false, viec: VIEC0 }), null);
  assert.equal(xetXuLyPhieuXoa({ nguoi: sup, phieu: p, chuPhieu: { id: "u", permissions: ["PARTNER"] }, laCongTyChu: true, viec: VIEC0 }), "cong_ty_chu");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["PARTNER"] }, laCongTyChu: false, viec: { ...VIEC0, laiChuyen: 1 } }), "dang_ban");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["PARTNER"] }, laCongTyChu: false, viec: { ...VIEC0, doi: 2 } }), "dang_ban");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["DRIVER_PARTNER"] }, laCongTyChu: false, viec: VIEC0 }), null);
});

test("giữ tên (R8): mọi quyền ngoài PARTNER giữ; Đối tác có đơn đã giao / đã huỷ hoặc dòng nợ giữ; Đối tác trắng thì thay", () => {
  const don0 = { giuDaGiao: 0, giuDaHuy: 0 };
  assert.equal(giuTen({ permissions: ["SALES"], don: don0, soDongNo: 0 }), true);
  assert.equal(giuTen({ permissions: ["DRIVER_PARTNER"], don: don0, soDongNo: 0 }), true);
  assert.equal(giuTen({ permissions: ["PARTNER"], don: { giuDaGiao: 1, giuDaHuy: 0 }, soDongNo: 0 }), true);
  assert.equal(giuTen({ permissions: ["PARTNER"], don: don0, soDongNo: 3 }), true);
  assert.equal(giuTen({ permissions: ["PARTNER"], don: don0, soDongNo: 0 }), false);
});

test("phần giữ lại: luôn có danh sách cố định; TEN_HO_SO chỉ khi giữ tên; SDT_DANG_NHAP khi có tài khoản (đ9)", () => {
  assert.ok(phanGiuLai({ giuTen: false, coTaiKhoan: true }).includes("SDT_DANG_NHAP"));
  assert.ok(!phanGiuLai({ giuTen: false, coTaiKhoan: true }).includes("TEN_HO_SO"));
  assert.ok(phanGiuLai({ giuTen: true, coTaiKhoan: true }).includes("TEN_HO_SO"));
  for (const m of ["DON_BAN_CHUP", "HANH_KHACH", "LAN_THU", "SO_TIEN", "YEU_CAU_HOA_DON", "HO_TEN_NHAT_KY", "NHAT_KY_CU_SDT", "PHIEN_DA_BO_IP", "CHU_TU_DO"]) {
    assert.ok(phanGiuLai({ giuTen: false, coTaiKhoan: false }).includes(m), m);
  }
  assert.match(phanGiuLai({ giuTen: true, coTaiKhoan: true }).join(","), /^[A-Z0-9_,]+$/);
});

test("hạn: rỗng → chưa có hạn (không cảnh báo); trước hạn → còn hạn; đúng hạn và sau → quá hạn", () => {
  assert.equal(trangThaiHan(null, "2026-11-01T00:00:00.000Z"), "chua_co_han");
  assert.equal(trangThaiHan("2026-11-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"), "con_han");
  assert.equal(trangThaiHan("2026-11-01T00:00:00.000Z", "2026-11-01T00:00:00.000Z"), "qua_han");
});
```

Bài `src/shared/xoa-an-danh-hien-thi.test.ts`: mọi mã ở `PHAN_GIU_LAI`, `LY_DO_TU_CHOI_XOA` có nhãn tiếng Việt có dấu, không chữ Anh; nhãn `HANH_KHACH` có cụm "chưa luật sư xác nhận" hoặc câu `CAU_CAN_CU_GIU_LAI` luôn đi kèm khi hiện; `nhanTrangThaiPhieuXoa` phủ đủ bốn trạng thái.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/modules/parties/xoa-an-danh.test.ts src/shared/xoa-an-danh-hien-thi.test.ts`
Expected: FAIL — module chưa có.

- [ ] **Step 3: Viết luật thuần + câu ghi.** `xetXuLyPhieuXoa` thứ tự: `nguoi_gui` (người xử lý = người gửi) → `cong_ty_chu` → (không Toàn quyền) `khong_tai_khoan` khi `chuPhieu` rỗng → (không Toàn quyền) `cap_bac` khi `!canManageAccount(nguoi.permissions, chuPhieu.permissions)` → `dang_ban` khi `viec.doi + phuTrachDon + laiChuyen + toLaiChuyen + chuXeChuyen + soXe > 0`. Toàn quyền cũng chịu `dang_ban`.

`anDanhStatements` trả mảng theo thứ tự CỐ ĐỊNH (người kiểm đối chiếu):
1. `an_danh_rut_phieu_cho` — `UPDATE pty_self_submission SET status = 'RUT', decided_at = ?3, decided_by = ?2, updated_at = ?3, updated_by = ?2 WHERE party_id IN TAP_HO_SO AND status = 'CHO_XAC_MINH' AND DA_THANG_XOA` (lưới — lúc gửi đã rút).
2. `an_danh_phieu_tu_khai` — `UPDATE pty_self_submission SET erased_at = ?3, birth_date = CASE WHEN birth_date IS NULL THEN NULL ELSE '1900-01-01' END, address_value = CASE WHEN address_value IS NULL THEN NULL ELSE 'Đã xoá' END, document_number = CASE WHEN document_number IS NULL THEN NULL ELSE 'XOA' || upper(replace(id, '-', '')) END, number_key = CASE WHEN number_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(id, '-', '')) END, issued_place = NULL, updated_at = ?3, updated_by = ?2 WHERE party_id IN TAP_HO_SO AND erased_at IS NULL AND DA_THANG_XOA`.
3. `an_danh_xac_minh_lai` — `INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by) SELECT lower(hex(randomblob(16))), v.party_id, v.target_kind, v.target_id, v.attribute_code, 'CAN_XAC_MINH_LAI', NULL, 0, ?3, ?2, ?3, ?2 FROM (SELECT party_id, target_kind, target_id, attribute_code, outcome, ROW_NUMBER() OVER (PARTITION BY party_id, target_kind, target_id, attribute_code ORDER BY created_at DESC, rowid DESC) AS n FROM pty_verification WHERE party_id IN TAP_HO_SO) v WHERE v.n = 1 AND v.outcome = 'DA_XAC_MINH' AND DA_THANG_XOA` (R11; đặt TRƯỚC câu đổi giá trị để thứ tự đọc "đánh dấu rồi đổi" giống H-4 R16). **`party_id` PHẢI là khoá phân nhóm đầu tiên:** đích `ATTRIBUTE` có `target_id` rỗng, thiếu `party_id` thì `NGAY_SINH` đã xác minh của hồ sơ chính và hồ sơ đã gộp vào rơi chung một nhóm, chỉ một bên được đánh dấu (ca (2) Task 2 ghim).
4. `an_danh_giay_to` — `UPDATE pty_person_document SET erased_at = ?3, document_number = CASE … 'XOA' || upper(replace(id, '-', '')) END, number_key = CASE … END, issued_place = NULL, updated_at = ?3, updated_by = ?2 WHERE party_id IN TAP_HO_SO AND erased_at IS NULL AND DA_THANG_XOA`.
5. `an_danh_lien_he` — `UPDATE pty_contact_point SET value = 'Đã xoá', value_normalized = 'XOA', label = NULL, is_primary = 0, valid_to_date = CASE WHEN valid_to_date IS NOT NULL THEN valid_to_date WHEN valid_from_date > ?5 THEN valid_from_date ELSE ?5 END, updated_at = ?3, updated_by = ?2 WHERE party_id IN TAP_HO_SO AND NOT (value = 'Đã xoá' AND value_normalized = 'XOA' AND valid_to_date IS NOT NULL) AND DA_THANG_XOA` (`?5` = `homNay` giờ VN — `vnToday`).
6. `an_danh_nguoi` — `UPDATE pty_person SET birth_date = NULL, family_name = CASE WHEN (SELECT name_kept FROM pty_erasure_request WHERE id = ?1) = 1 THEN family_name ELSE NULL END, middle_name = CASE … ELSE NULL END, given_name = CASE … ELSE 'Người đã xoá dữ liệu' END, updated_at = ?3, updated_by = ?2 WHERE party_id IN TAP_HO_SO AND DA_THANG_XOA`.
7. `an_danh_ten_ho_so` — `UPDATE pty_party SET display_name = 'Người đã xoá dữ liệu', updated_at = ?3, updated_by = ?2 WHERE id IN TAP_HO_SO AND (SELECT name_kept FROM pty_erasure_request WHERE id = ?1) = 0 AND DA_THANG_XOA`.
8. `an_danh_tep` — `UPDATE pty_attachment SET purged_at = ?3, purge_reason = 'PHIEU_XOA', content_hash = NULL, updated_at = ?3, updated_by = ?2 WHERE purged_at IS NULL AND (party_id IN TAP_HO_SO OR id IN (SELECT l.attachment_id FROM pty_attachment_link l JOIN pty_person_document d ON l.target_kind = 'PERSON_DOCUMENT' AND d.id = l.target_id WHERE d.party_id IN TAP_HO_SO)) AND DA_THANG_XOA` (R12).

Kiểm thứ tự trigger: câu 3 chạy khi dòng giấy tờ CHƯA ẩn danh — `pty_verification_target_ins` chỉ đòi dòng đích tồn tại cùng hồ sơ (qua). Câu 4 sau câu 3 nên dòng `CAN_XAC_MINH_LAI` trỏ đúng dòng. Câu 6 đặt `updated_at = decided_at` (R-PTY-18 dựa vào).

`quyetPhieuXoaStatement`: `UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN', decided_at = ?3, decided_by = ?2, name_kept = ?4, retained_codes = ?5, updated_at = ?3, updated_by = ?2 WHERE id = ?1 AND status = 'CHO_XU_LY' AND created_by <> ?2`.

`guiPhieuXoaStatement` (R6 — số ngày CHỈ trong SQL, đọc từ dòng chính sách):

```sql
INSERT INTO pty_erasure_request (id, party_id, policy_id, due_at, status, created_at, created_by, updated_at, updated_by)
SELECT ?1, ?2, p.id,
       CASE WHEN p.erasure_days IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?4, '+' || p.erasure_days || ' days') END,
       'CHO_XU_LY', ?4, ?3, ?4, ?3
FROM (SELECT 1) LEFT JOIN (SELECT id, erasure_days FROM pty_privacy_policy ORDER BY version DESC LIMIT 1) p ON 1 = 1
```

Hình chiếu `listAnhHetLyDoGiu(db, homNay)` (R14) — `SELECT a.id, a.party_id, a.created_at, <mã lý do bằng CASE theo thứ tự HET_QUAN_HE, DA_AN_DANH, DA_HUY, DA_GIA_HAN, HET_HAN, PHIEU_DA_XU_LY, KHONG_NOI> FROM pty_attachment a WHERE a.purged_at IS NULL AND a.stored_at IS NOT NULL AND NOT (${GIU_ANH(1)}) ORDER BY a.created_at LIMIT 500`, với `GIU_ANH` là **hàm của số thứ tự tham số** `const GIU_ANH = (n: number): string => \`…?${n}…\`` gọi lúc nạp mô-đun (chuỗi kết quả vẫn tĩnh — hợp lệ với `defineSql`, sự thật 19 của H-4), dùng CHUNG cho lính gác của `datChoXoaAnhHetGiuStatement` (gọi `GIU_ANH(<số của tham số homNay trong câu đó>)`) — tránh bẫy đánh số tham số lệch lặng lẽ giữa hai câu. Thân hàm (`?H` dưới đây = `?${n}`):

```sql
EXISTS (SELECT 1 FROM pty_attachment_link l JOIN pty_person_document d ON l.target_kind = 'PERSON_DOCUMENT' AND d.id = l.target_id
        WHERE l.attachment_id = a.id AND d.voided_at IS NULL AND d.erased_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)
          AND (d.expiry_date IS NULL OR d.expiry_date >= ?H)
          AND EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = d.party_id AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?H)))
OR EXISTS (SELECT 1 FROM pty_attachment_link l JOIN pty_organization_document d ON l.target_kind = 'ORG_DOCUMENT' AND d.id = l.target_id
        WHERE l.attachment_id = a.id AND d.voided_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM pty_organization_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)
          AND (d.expiry_date IS NULL OR d.expiry_date >= ?H)
          AND EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = d.party_id AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?H)))
OR EXISTS (SELECT 1 FROM pty_attachment_link l JOIN pty_self_submission s ON l.target_kind = 'SELF_SUBMISSION' AND s.id = l.target_id
        WHERE l.attachment_id = a.id AND s.status = 'CHO_XAC_MINH')
```

(`homNay` = `vnToday(new Date())` truyền vào, KHÔNG `date('now')`.) Luật thuần `lyDoXoaAnh(...)` tính cùng mã lý do từ dữ kiện đã đọc; bài "cùng bảng ca" ở Step 4.

- [ ] **Step 4: Bài mức câu lệnh (đỏ rồi xanh)** — `src/modules/parties/xoa-an-danh-lenh.test.ts` (DB thử nạp mọi migration; chạy lô bằng `BEGIN … COMMIT` của node:sqlite hoặc khung thử `db.batch` như `xac-minh-lenh.test.ts`):

```ts
// Ca bắt buộc (mỗi ca một test):
// (1) Lô thực hiện đầy đủ trên hồ sơ P có: CCCD hiện hành + CCCD cũ đã gia hạn + GPLX đã huỷ; liên hệ PHONE mở, EMAIL đã đóng, ADDRESS mở; ngày sinh;
//     phiếu tự khai DA_CHAP_NHAN (NGAY_SINH) + TU_CHOI (DIA_CHI) + RUT (GIAY_TO); dòng xác minh DA_XAC_MINH cho CCCD hiện hành và NGAY_SINH; hai tệp (một nối CCCD, một tải dở)
//     ⇒ mọi giá trị đúng dấu; dòng nghiệp vụ còn đủ (đếm trước = đếm sau); hai dòng CAN_XAC_MINH_LAI mới; hai tệp purged_at = lúc, lý do PHIEU_XOA, content_hash rỗng;
//     R-PTY-17, R-PTY-18 = 0 (chạy đúng câu SQL của scripts/audit-checks.mjs — import mảng kiểm, không chép câu).
// (2) Review Focus 4: hồ sơ phụ Q đã gộp vào P (dựng bằng lô gộp thật của gop-lo.ts) ⇒ dòng giấy tờ ĐÃ HUỶ, liên hệ ĐÃ ĐÓNG của Q và tệp có party_id = Q đều ẩn danh / quyết xoá;
//     CẢ P lẫn Q có dòng DA_XAC_MINH đích ATTRIBUTE NGAY_SINH (target_id rỗng) ⇒ HAI dòng CAN_XAC_MINH_LAI mới (một cho P, một cho Q) — bắt lỗi phân nhóm thiếu party_id.
// (3) Review Focus 2: câu quyết thua (phiếu đã RUT trước, hoặc người khác đã thực hiện) ⇒ mọi câu ẩn danh changes = 0, không dòng nhật ký party_erased, dữ liệu nguyên vẹn.
// (4) Lần thực hiện thứ hai (phiếu mới sau phiếu đã xong, dữ liệu mới khai sau) chỉ ẩn danh dòng chưa ẩn danh; dòng đã ẩn danh không đổi (trigger đóng băng không bắn vì WHERE loại).
// (5) name_kept = 1 ⇒ tên giữ; name_kept = 0 ⇒ given_name và display_name = DAU_TEN, family/middle rỗng.
// (6) Hồ sơ không có gì để xoá (chỉ có tên) ⇒ lô vẫn chạy, phiếu DA_THUC_HIEN.
// (7) Gửi phiếu: INSERT … SELECT khi CHƯA có chính sách ⇒ policy_id, due_at rỗng; chính sách erasure_days rỗng ⇒ due_at rỗng; chính sách có số (ghi trong bài: 7) ⇒ due_at = created_at + 7 ngày;
//     phiếu tự khai đang chờ được RUT cùng lô với decided_by = người gửi.
// (8) Hình chiếu ảnh (R14) — cùng bảng ca với lyDoXoaAnh: giấy tờ còn hạn + vai mở → KHÔNG hiện; hết hạn → HET_HAN; đã gia hạn thay → DA_GIA_HAN; đã huỷ → DA_HUY;
//     mọi vai đóng (valid_to_date hôm qua) → HET_QUAN_HE; vai đóng hôm nay → vẫn giữ; TÀI KHOẢN bị ngưng nhưng vai mở → KHÔNG hiện; giấy tờ không hạn + vai mở → KHÔNG hiện;
//     tệp chỉ nối phiếu tự khai đang chờ → KHÔNG hiện, phiếu đã từ chối / rút → PHIEU_DA_XU_LY (dựng bằng cách DROP trigger pty_attachment_link_kind_ins trong DB THỬ rồi chèn dòng nối);
//     tệp nối giấy tờ tổ chức còn hạn + vai mở → KHÔNG hiện.
// (9) Lính gác xoá ảnh: tệp đã có lại lý do giữ (thêm dòng nối sang giấy tờ còn hạn) giữa lúc đọc danh sách và lúc bấm ⇒ datChoXoaAnhHetGiuStatement changes = 0.
```

Run: `node --test src/modules/parties/xoa-an-danh-lenh.test.ts src/modules/parties/xoa-an-danh.test.ts src/shared/xoa-an-danh-hien-thi.test.ts src/tu-khai-khong-len-nhan.test.ts src/architecture.test.ts`
Expected: đỏ trước khi viết câu, xanh sau.

- [ ] **Step 4b: Rào "chỉ MỘT lệnh có tên được ghi đè dòng đã khoá" (ADR-0126 tiêu chí nghiệm thu cuối; bảng thi hành Hiến chương dòng 5.24)** — tạo `src/xoa-mot-lenh-co-ten.test.ts`, khuôn `src/tu-khai-khong-len-nhan.test.ts`:

```ts
// HÀNG RÀO 5.24: chỉ lệnh ẩn danh hoá có tên được ghi đè nội dung dòng đã khoá. Phá thử: đăng ký thêm
// defineSql("parties", "thu_x", "UPDATE pty_person_document SET erased_at = ?1 WHERE id = ?2") → (1) đỏ; gọi anDanhStatements trong route khác → (3) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// (1) Duyệt sổ câu SQL đã đăng ký (nạp mọi module như architecture.test.ts — dùng cùng cách nạp registry của tu-khai-khong-len-nhan.test.ts):
//     tập khoá có câu `UPDATE pty_person_document|pty_self_submission … SET … erased_at =` = ĐÚNG ["parties:an_danh_giay_to", "parties:an_danh_phieu_tu_khai"].
//     (Sửa thường nội dung dòng ĐÃ khoá — đã gia hạn / đã huỷ / đã xử lý / đã ẩn danh — vốn bị trigger chặn; miễn trừ CHỈ mở cho câu đặt erased_at, nên ghim câu đặt erased_at là đủ.)
// (2) Chữ `erased_at` trong câu SQL chỉ xuất hiện ở parties/repository.ts (ngoài migrations/ và scripts/audit-checks.mjs).
// (3) anDanhStatements( chỉ được gọi trong thân route "POST /api/parties/phieu-xoa/:pid/thuc-hien" của parties/index.ts (cắt thân route theo khuôn bài (3) của tu-khai-khong-len-nhan).
```

Viết đủ thân ba bài theo đúng cách bài mẫu đọc registry và cắt thân route (không tự nghĩ cách mới). Chạy đỏ trước (câu chưa đăng ký ⇒ (1) đỏ vì tập rỗng), xanh sau khi Step 3 xong. Dòng sổ hàng rào ở Task 8 Step 2.

- [ ] **Step 5: Chạy `npm run typecheck`, rồi `npm test`.** Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/parties/xoa-an-danh.ts src/modules/parties/xoa-an-danh.test.ts src/shared/xoa-an-danh-hien-thi.ts src/shared/xoa-an-danh-hien-thi.test.ts src/modules/parties/repository.ts src/modules/parties/xoa-an-danh-lenh.test.ts src/xoa-mot-lenh-co-ten.test.ts src/tu-khai-khong-len-nhan.test.ts
git commit -m "Xoá dữ liệu: luật thuần, lô ẩn danh hoá có lính gác, danh sách ảnh hết lý do giữ (ADR-0126 đ3, đ6)"
```

**Tiêu chí nghiệm thu Task 2:** chín ca (1)–(9) xanh; đổi `DA_THANG_XOA` của MỘT câu thành `1 = 1` ⇒ ca (3) đỏ; đổi `>= ?H` thành `> ?H` ở vế vai ⇒ ca (8) "vai đóng hôm nay" đỏ; bỏ `party_id` khỏi `PARTITION BY` ⇒ ca (2) đỏ; rào Step 4b đỏ khi đăng ký câu thứ ba đặt `erased_at`; `architecture.test.ts` xanh (không câu nào đọc bảng ngoài `pty_*`).

Ghi chú `xoa-mot-lenh-co-ten.test.ts` (3): Task 2 chưa có route nên bài (3) chỉ ghim "không lời gọi `anDanhStatements(` nào trong `index.ts`"; Task 5 Step 8 đổi thành "đúng một lời gọi, trong thân route thực hiện" (siết dần, ghi trong commit).

---

### Task 3: Câu ẩn danh sổ phiên của `auth` + hai hàm tiêm (VIỆC LỚN — dữ liệu)

**Files:**
- Modify: `src/modules/auth/repository.ts` (hai câu `defineSql("auth", …)`), `src/modules/auth/index.ts` (công bố)
- Create: `src/modules/auth/an-danh-phien.test.ts`
- Modify: `src/modules/parties/index.ts` (hàm công bố `hanGiuPhienNgay(db): Promise<number | null>` — đọc `session_retention_days` của chính sách phiên bản lớn nhất)
- Modify: `src/shared/router.ts` (`Ctx.cauAnDanhPhien`, `Ctx.hanGiuPhienNgay`, `AppOptions.injected.*`), `src/index.ts`; mọi nơi dựng `AppOptions` bằng tay (grep `taiKhoanXacMinh: async`) — thêm hai khoá cho khớp kiểu

**Interfaces:**
- Produces:

```ts
// src/modules/auth/index.ts
export const anDanhPhienCuaTaiKhoanStatement = (db: D1Database, staffId: string, at: string, by: string): D1PreparedStatement;
// UPDATE aut_session SET ip = NULL, user_agent = NULL, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND (ip IS NOT NULL OR user_agent IS NOT NULL)
export const anDanhPhienCuStatement = (db: D1Database, ketThucTruoc: string, at: string, by: string): D1PreparedStatement;
// UPDATE aut_session SET ip = NULL, user_agent = NULL, updated_at = ?2, updated_by = ?3 WHERE ended_at IS NOT NULL AND ended_at < ?1 AND (ip IS NOT NULL OR user_agent IS NOT NULL)
export function demPhienCanAnDanh(db: D1Database, ketThucTruoc: string): Promise<number>;
// src/shared/router.ts — Ctx
/** ADR-0126 đ8 — câu ẩn danh IP / User-Agent mọi phiên của MỘT tài khoản, do `auth` cấp, gốc lắp ráp tiêm (parties không import auth — khuôn gopHoSo.cauDoiDon).
 *  Không tiêm (khung thử cũ) → null ⇒ route Thực hiện trả 503, KHÔNG thực hiện thiếu phần sổ phiên. */
cauAnDanhPhien: (staffId: string, at: string, by: string) => D1PreparedStatement | null;
/** ADR-0126 đ8 — số ngày giữ IP / User-Agent của phiên đã kết thúc, đọc từ chính sách riêng tư hiện hành (parties). null = chưa có số. Gốc lắp ráp tiêm (accounts không import parties). */
hanGiuPhienNgay: () => Promise<number | null>;
```

- [ ] **Step 1: Bài (đỏ)** — `src/modules/auth/an-danh-phien.test.ts` (DB thử nạp migration):
  - (1) Ba phiên của tài khoản X (một đang sống, hai đã kết thúc) + một phiên của Y ⇒ `anDanhPhienCuaTaiKhoanStatement(X)` làm rỗng `ip`, `user_agent` đúng ba dòng của X; Y nguyên; `device_label`, `created_at`, `method`, `ended_at`, `end_reason` nguyên; số dòng `aut_session` không đổi.
  - (2) `anDanhPhienCuStatement(ketThucTruoc = T)` chỉ đổi phiên `ended_at < T`; phiên đang sống và phiên kết thúc đúng `T` nguyên; chạy lần hai `changes = 0`.
  - (3) `toSessionDto` của phiên đã ẩn danh trả `ip: null` (giao diện hiện "không rõ" — không đổi DTO).
  - (4) `hanGiuPhienNgay`: chưa chính sách → null; chính sách mới nhất có `session_retention_days` rỗng dù bản cũ có số → null (bản mới nhất thắng).
  - (5) Router: app dựng KHÔNG tiêm `cauAnDanhPhien` ⇒ `ctx.cauAnDanhPhien(...)` trả null; app thật (`src/index.ts`) trả câu khác null.

Run: `node --test src/modules/auth/an-danh-phien.test.ts` — Expected: FAIL.

- [ ] **Step 2: Viết hai câu, hàm công bố, hàm tiêm.** `src/index.ts` (`injected`): `cauAnDanhPhien: (env, staffId, at, by) => anDanhPhienCuaTaiKhoanStatement(env.DB, staffId, at, by)`, `hanGiuPhienNgay: (env) => hanGiuPhienNgay(env.DB)`. `router.ts`: `cauAnDanhPhien: (id, at, by) => (typeof opts.injected.cauAnDanhPhien === "function" ? opts.injected.cauAnDanhPhien(envH, id, at, by) : null)`, `hanGiuPhienNgay: () => (who && typeof opts.injected.hanGiuPhienNgay === "function" ? opts.injected.hanGiuPhienNgay(envH) : Promise.resolve(null))`.

- [ ] **Step 3: Chạy** `node --test src/modules/auth/an-danh-phien.test.ts src/shared/router.test.ts src/architecture.test.ts src/passkey-off.test.ts`, rồi `npm run typecheck`, rồi `npm test`. Expected: PASS (không cạnh `ALLOWED_EDGES` mới).

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/ src/modules/parties/index.ts src/shared/router.ts src/index.ts
git commit -m "Xoá dữ liệu: câu ẩn danh IP và thông tin máy của sổ phiên do auth cấp, tiêm qua gốc lắp ráp (ADR-0126 đ8)"
```

**Tiêu chí nghiệm thu Task 3:** năm ca xanh; `grep -n "aut_session" src/modules/parties src/modules/accounts` không thấy câu SQL mới; không cạnh module mới.

---

### Task 4: Ô `party.erasure.request` + chính sách có số ngày + route người dùng (VIỆC LỚN — quyền, dữ liệu)

**Files:**
- Modify: `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, bài ghim nguyên dòng đỏ theo, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.ts` (sinh lại theo cách H-3/H-4 Task 3)
- Modify: `src/modules/parties/rieng-tu.ts` (`kiemChinhSach` nhận `hanXuLyXoaNgay?`, `hanGiuPhienNgay?` — số nguyên ≥ 1 hoặc vắng / null), `src/modules/parties/repository.ts` (`dangChinhSachStatement` ghi hai cột), `src/modules/parties/rieng-tu.test.ts`, `src/modules/parties/rieng-tu-route.test.ts`
- Modify: `src/modules/parties/index.ts` (hai route mới; mở rộng `GET /api/parties/cua-toi`; `POST /api/parties/cua-toi/phieu` trả 409 `erasure_open`)
- Modify: `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts`
- Create: `src/modules/parties/xoa-an-danh-route.test.ts`, `src/xoa-khong-so-thoi-han.test.ts`
- Modify: `src/route-access.test.ts`, `src/tu-khai-khong-len-nhan.test.ts` (route được gọi hàm phiếu: thêm ĐÚNG `POST /api/parties/cua-toi/phieu-xoa`)

**Interfaces:**
- Consumes: Task 1–3.
- Produces:
  - Route (cổng `staff`, khai TRƯỚC `/api/parties/:id…`): `POST /api/parties/cua-toi/phieu-xoa` (thân `{ xacNhan: true }`) → 201 `{ id }` + `Location: /account` | 400 `invalid_input` | 403 | 409 `erasure_person_only` / `owner_company_protected` / `erasure_pending_exists`; `POST /api/parties/cua-toi/phieu-xoa/:id/rut` → 200 | 404 | 409 `erasure_not_pending`.
  - `GET /api/parties/cua-toi` thêm `phieuXoa: PhieuXoaCuaToiDto[]`, `coTheGuiXoa: boolean`, `lyDoKhongGuiXoa: string | null`; `chinhSach` thêm `hanXuLyXoaNgay: number | null`, `hanGiuPhienNgay: number | null`; mọi trường của hồ sơ / phiếu tự khai đã ẩn danh trả `null` + cờ `daXoa: true` (Review Focus 1).
  - `POST /api/parties/chinh-sach-rieng-tu` nhận thêm hai khoá tuỳ chọn.

```ts
export interface PhieuXoaCuaToiDto {
  id: string; trangThai: "CHO_XU_LY" | "DA_THUC_HIEN" | "TU_CHOI" | "RUT"; guiLuc: string;
  han: string | null;                  // null = "Chưa có thời hạn trong chính sách"
  xuLyLuc: string | null; lyDoTuChoi: string | null;
  phanGiuLai: string[];                // mã (giao diện gắn nhãn bằng PHAN_GIU_LAI); rỗng khi chưa thực hiện
}
```
  - Hành động nhật ký (nhóm `party`): `party_erasure_requested` ("Gửi yêu cầu xoá dữ liệu"), `party_erasure_withdrawn` ("Rút yêu cầu xoá dữ liệu"); detail CHỈ `phiếu <id>` (+ `· rút n phiếu tự khai đang chờ` khi có, số đếm lấy trước lô).

- [ ] **Step 1: Bài ô quyền (đỏ)** — `src/shared/permissions.test.ts`:

```ts
test("ADR-0124 đ4 (lát H-5): party.erasure.request — mọi cột own (kể cả Tài xế đối tác, Nhân sự), Toàn quyền any", () => {
  assert.deepEqual(MATRIX["party.erasure.request"], { SALES: "own", ACCOUNTING: "own", ADMIN: "own", FIELD: "own", PARTNER: "own", SUPER_ADMIN: "any", INTERN: "own", DRIVER: "own", DRIVER_PARTNER: "own", HR: "own" });
});
```

Cùng step: thêm ô vào bài ghim nguyên dòng HR (`own`), dòng PARTNER (`own`), bài 1024 tập con quyền (khuôn bài "ADR-0124 đ4 (lát H-3)"), ảnh chụp bảng quyền. Bài "HR đúng năm ô any" KHÔNG đổi (ô này `own`).

- [ ] **Step 2: Bài "không con số thời hạn" (đỏ)** — `src/xoa-khong-so-thoi-han.test.ts`:

```ts
// RÀO "không con số thời hạn" (ADR-0126 đ2: con số chờ luật sư; mã chỉ đọc từ dữ liệu chính sách). Phá thử: viết `row.erasure_days ?? 20` vào repository.ts → (1) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("..", import.meta.url));
const tep = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? tep(p) : /\.(ts|mjs|sql|jsonc)$/.test(p) && !/\.test\.ts$/.test(p) ? [p] : [];
});
const NGUON = [...tep(join(GOC, "src")), ...tep(join(GOC, "web")), ...tep(join(GOC, "migrations")), ...tep(join(GOC, "scripts")), join(GOC, "wrangler.jsonc")];
const TEN = "(erasure_days|session_retention_days|hanXuLyXoaNgay|hanGiuPhienNgay)";

test("(1) không giá trị dự phòng / gán số cho số ngày thời hạn ở mã, migration, cấu hình", () => {
  const sai = NGUON.filter((p) => new RegExp(`${TEN}\\s*(\\?\\?|\\|\\||=(?!=))\\s*\\d`).test(readFileSync(p, "utf8").replace(/\/\/.*$|--.*$/gm, "")));
  assert.deepEqual(sai, []);
});
test("(2) không DEFAULT cho hai cột, không INSERT chính sách trong migration", () => {
  for (const p of NGUON.filter((x) => x.endsWith(".sql"))) {
    const s = readFileSync(p, "utf8").replace(/--.*$/gm, "");
    assert.doesNotMatch(s, /(erasure_days|session_retention_days)[^,\n]*DEFAULT/i, p);
    assert.doesNotMatch(s, /INSERT\s+INTO\s+pty_privacy_policy/i, p);
  }
});
test("(3) hạn xử lý phiếu chỉ tính trong câu SQL đọc dòng chính sách (không tính ở TypeScript)", () => {
  const repo = readFileSync(join(GOC, "src/modules/parties/repository.ts"), "utf8");
  assert.match(repo, /'\+' \|\| p\.erasure_days \|\| ' days'/);
});
```

- [ ] **Step 3: Bài route (đỏ)** — `src/modules/parties/xoa-an-danh-route.test.ts` (khung thử `world()` + `seedStaff`, khuôn `tu-khai-route.test.ts`):

```ts
// (u1) Đối tác, Tài xế đối tác, Nhân sự, Bán hàng: POST /api/parties/cua-toi/phieu-xoa { xacNhan: true } → 201; đúng 1 dòng pty_erasure_request CHO_XU_LY của staff.partyId;
//      nhật ký party_erasure_requested detail khớp /^phiếu [0-9a-f-]{36}/ và không chứa tên / SĐT.
// (u2) Review Focus 3: người CHƯA đồng ý / ĐÃ RÚT đồng ý, và khi CHƯA có chính sách nào ⇒ vẫn 201 (policy_id, due_at rỗng); GET cua-toi trả han = null.
// (u3) Review Focus 3: có 2 phiếu tự khai đang chờ ⇒ cùng lô cả hai RUT, decided_by = người gửi; sau đó POST /api/parties/cua-toi/phieu → 409 erasure_open, 0 dòng mới.
// (u4) Gửi lần hai khi đang chờ → 409 erasure_pending_exists; tài khoản gắn hồ sơ TỔ CHỨC → 409 erasure_person_only; không hồ sơ → 409; thân thiếu xacNhan → 400.
// (u5) Đọc mã hồ sơ từ thân / đường dẫn bị bỏ qua: gửi { xacNhan: true, partyId: <hồ sơ khác> } ⇒ phiếu vẫn của staff.partyId.
// (u6) Rút: chính chủ → 200, RUT, decided_by = chính chủ; người khác (mã phiếu của người khác) → 404; phiếu đã xử lý → 409 erasure_not_pending.
// (u7) Chính sách: Toàn quyền đăng với hanXuLyXoaNgay = 7 ⇒ phiếu gửi sau có due_at = guiLuc + 7 ngày; đăng bản mới bỏ trống ⇒ phiếu cũ GIỮ hạn cũ (R6); hanXuLyXoaNgay = 0 / -1 / 1.5 / "7" → 400.
// (u8) GET cua-toi sau khi phiếu DA_THUC_HIEN (chạy lô Task 2 trực tiếp trong DB thử): hoSo.ngaySinh = null + daXoa; giấy tờ số = null + daXoa; phiếu tự khai giá trị = null + daXoa; phieuXoa[0].phanGiuLai không rỗng.
```

- [ ] **Step 4: Chạy, xác nhận đỏ** — `node --test src/shared/permissions.test.ts src/xoa-khong-so-thoi-han.test.ts src/modules/parties/xoa-an-danh-route.test.ts` — Expected: FAIL.

- [ ] **Step 5: Viết** — `permissions.ts`, sau `"party.privacy.policy"`:

```ts
  // ADR-0124 đ4 + ADR-0126 đ2 (lát H-5 Gói 2): GỬI / RÚT yêu cầu xoá dữ liệu của CHÍNH MÌNH — mọi tài khoản (kể cả Tài xế đối tác, Nhân sự — kế hoạch H-5 sự thật 1).
  // Phạm vi own = staff.partyId của PHIÊN. Không đòi đồng ý chính sách. Route: POST /api/parties/cua-toi/phieu-xoa, POST …/phieu-xoa/:id/rut (cổng staff).
  "party.erasure.request": tuPhucVu(),
```

Route gửi: `if (!can(staff, "party.erasure.request", { ownerId: staff.id })) return …` → đọc hồ sơ của phiên (`laCaNhan`, `laCongTyChu`, có phiếu chờ) → `xetGuiPhieuXoa` → kiểm thân `{ xacNhan: true }` → một lô `[guiPhieuXoaStatement, auditStatement(party_erasure_requested, "changes() > 0"), rutPhieuTuKhaiKhiGuiXoaStatement]` → bắt lỗi `erasure_pending_exists` / `erasure_person_only` của CSDL thành 409 tiếng Việt → `kemLocation(json({ id }, 201), "/account")`. `POST /api/parties/cua-toi/phieu`: kiểm có phiếu xoá chờ TRƯỚC lô → 409 `erasure_open` ("Bạn đang có yêu cầu xoá dữ liệu chờ xử lý — chưa gửi được thông tin mới."), và dịch lỗi trigger `self_submission_erasure_open` cùng câu.

- [ ] **Step 6: Đo trần gói ngay** — `node --test src/goi-trang-nhe.test.ts` + lệnh đo số byte (khuôn hàm `dung()` của bài, in `outputFiles[0].contents.byteLength`). Expected: PASS, ≈ 96 040; ghi số vào báo cáo. Đỏ ⇒ KHÔNG nới trần — dừng, báo điều phối kèm số đo.

- [ ] **Step 7: Hàng rào đi kèm** — `src/route-access.test.ts` (hai dòng `access: "staff"`), `src/tu-khai-khong-len-nhan.test.ts` (thêm ĐÚNG `POST /api/parties/cua-toi/phieu-xoa`), `src/ho-so-cua-toi-giao-dien.test.ts` không đổi (route nằm trong `/api/parties/cua-toi*`).

- [ ] **Step 8: Chạy bộ kiểm của task** — `node --test src/shared/permissions.test.ts src/xoa-khong-so-thoi-han.test.ts src/modules/parties/xoa-an-danh-route.test.ts src/modules/parties/rieng-tu-route.test.ts src/modules/parties/tu-khai-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts src/tu-khai-khong-len-nhan.test.ts src/goi-trang-nhe.test.ts src/modules/orders/xem-don-theo-quyen.test.ts`, rồi `npm run typecheck`, rồi `npm test`. Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc-ten.ts src/shared/tro-ly-cau-truc.ts src/modules/parties/ src/shared/contracts.ts src/shared/audit-actions.ts src/shared/lich-su-doi-tac.ts src/xoa-khong-so-thoi-han.test.ts src/route-access.test.ts src/tu-khai-khong-len-nhan.test.ts
git commit -m "Xoá dữ liệu: người dùng tự gửi và rút yêu cầu xoá ở Hồ sơ của tôi, thời hạn đọc từ chính sách (ADR-0126 đ2, ADR-0124 đ4)"
```

**Tiêu chí nghiệm thu Task 4:** tám ca (u1)–(u8) xanh; đổi cột DRIVER_PARTNER của ô thành `none` ⇒ bài ô + ghim dòng đỏ; phá thử `?? 20` ⇒ rào (1) đỏ; gói Đơn hàng ≤ 96 600 (số đo ghi báo cáo).

---

### Task 5: Ô `party.erasure.process` + hàng chờ, xem trước, thực hiện, từ chối, chạy lại + chặn gộp + cổng phát hành (VIỆC LỚN — quyền, dữ liệu)

**Files:**
- Modify: `src/shared/permissions.ts` (+ cùng bộ bài như Task 4), `src/modules/parties/index.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts`
- Modify: `src/modules/parties/xoa-an-danh-route.test.ts` (thêm ca), `src/modules/parties/gop-route.test.ts` (ca chặn gộp), `src/modules/parties/giay-to-route.test.ts` (ca Review Focus 1 ở danh sách giấy tờ và "xem đủ số"), `src/modules/parties/xac-minh-route.test.ts` (ca hàng đã xử lý không lộ dấu)
- Modify: `src/cong-phat-hanh-anh-tu-khai.test.ts`, `src/route-access.test.ts`, `src/route-write-guard.test.ts`, `src/giay-to-khong-lo-so.test.ts`, `src/shared/lan-gui-no.ts`, `src/kho-tep-ho-so.test.ts` (nếu ghim khoá `pty/`)

**Interfaces:**
- Consumes: Task 1–4; `ctx.taiKhoanXacMinh`, `ctx.gopHoSo.{donNguoiDat, soDongNo, viecCua}`, `ctx.cauAnDanhPhien`; `xoaKhoiKho` (`kho-tep.ts`); binding `env.HO_SO`.
- Produces — route cổng `admin` (thân hỏi `admin.manage` rồi `party.erasure.process` — khuôn route đăng chính sách), khai TRƯỚC `/api/parties/:id…`:
  - `GET /api/parties/phieu-xoa` → `{ phieu: PhieuXoaChoDto[] }` (chờ: quá hạn trước, rồi cũ trước; lọc cấp bậc trừ Toàn quyền; 50 dòng) + `{ daXuLy: PhieuXoaDaXuLyDto[] }` (50 dòng mới nhất).
  - `GET /api/parties/phieu-xoa/:pid` → `PhieuXoaXemTruocDto` (chỉ SỐ ĐẾM, không giá trị), `Cache-Control: no-store`; ngoài cấp bậc → 404.
  - `POST /api/parties/phieu-xoa/:pid/thuc-hien` (thân `{ xacNhan: true }`) → 200 `{ ok: true, conChoXoaKho: number, chuaChepNgoai: boolean }` | 403 / 404 / 409 (`erasure_self`, `erasure_busy`, `erasure_not_pending`, `owner_company_protected`) | 503 `erasure_unavailable` (thiếu hàm tiêm sổ phiên).
  - `POST /api/parties/phieu-xoa/:pid/tu-choi` (thân `{ lyDo: <mã LY_DO_TU_CHOI_XOA> }`) → 200 | 400 | 409.
  - `POST /api/parties/phieu-xoa/chay-lai` → `{ daChep: number, daXoaKho: number, conLoi: number }` — chép bản ngoài còn thiếu + xoá kho tệp lý do `PHIEU_XOA` / `HET_LY_DO_GIU` còn chờ.

```ts
export interface PhieuXoaChoDto { id: string; tenHoSo: string; guiLuc: string; han: string | null; trangThaiHan: "chua_co_han" | "con_han" | "qua_han"; xuLyDuoc: boolean; lyDoKhong: string | null }
export interface PhieuXoaDaXuLyDto { id: string; ketQua: "DA_THUC_HIEN" | "TU_CHOI" | "RUT"; nguoiXuLy: string | null; luc: string; lyDo: string | null; chuaChepNgoai: boolean }
export interface PhieuXoaXemTruocDto {
  id: string; tenHoSo: string; guiLuc: string; han: string | null; trangThaiHan: string;
  seXoa: { giayTo: number; phieuTuKhai: number; lienHe: number; ngaySinh: boolean; tep: number; phienDangNhap: boolean };
  giuTen: boolean; phanGiuLai: string[]; xuLyDuoc: boolean; lyDoKhong: string | null; hoSoGopVao: number;
}
```
  - Hành động nhật ký (nhóm `party`): `party_erased` ("Thực hiện yêu cầu xoá dữ liệu" — detail `phiếu <id> · giấy tờ a · phiếu tự khai b · liên hệ c · tệp d` theo số xem trước), `party_erasure_rejected` (detail `phiếu <id> · <mã lý do>`), `party_erasure_retried` (nhóm `system`, detail `chép n · xoá kho m · còn k`).

- [ ] **Step 1: Bài ô (đỏ)** — `party.erasure.process`: `{ SALES: "none", ACCOUNTING: "none", ADMIN: "any", FIELD: "none", PARTNER: "none", SUPER_ADMIN: "any", INTERN: "none", DRIVER: "none", DRIVER_PARTNER: "none", HR: "none" }`; ghim dòng HR/PARTNER `none`; 1024 tập con. Không thêm vào `ADMIN_NONE_OPS`.

- [ ] **Step 2: Bài route (đỏ)** — thêm vào `xoa-an-danh-route.test.ts`:

```ts
// (p1) Bán hàng, Kế toán, Nhân sự, Đối tác: GET /api/parties/phieu-xoa → 403; ADMIN, SUPER → 200.
// (p2) Hàng chờ ADMIN: thấy phiếu của Đối tác; KHÔNG thấy phiếu của Quản trị / Nhân sự / Toàn quyền (cấp bậc); Toàn quyền thấy hết; phiếu quá hạn (due_at quá khứ) ở đầu, nhãn qua_han;
//      phiếu không hạn → chua_co_han, KHÔNG nhãn quá hạn.
// (p3) Xem trước: chỉ số đếm; tập khoá ĐÚNG như contracts; không chuỗi nào khớp số giấy tờ / SĐT / ngày sinh đã gieo; Cache-Control no-store; ngoài cấp bậc → 404.
// (p4) Thực hiện (ADMIN, phiếu của Đối tác trắng): 200; mọi giá trị đúng dấu; tên thay DAU_TEN (giữ tên = false); phiên của tài khoản: ip, user_agent rỗng; nhật ký party_erased
//      không chứa tên cũ / số / SĐT; R-PTY-17..20 = 0; GET /api/parties/:id/documents/:did/tep (Toàn quyền) → 404 ngay.
// (p5) Review Focus 2: thực hiện lần hai (người khác) → 409 erasure_not_pending, đúng 1 dòng party_erased; người dùng rút rồi Quản trị bấm → 409, 0 thay đổi dữ liệu.
// (p6) Chính người gửi (tài khoản lai ADMIN + PARTNER tự gửi rồi tự bấm) → 409 erasure_self; Đối tác đang có đơn chưa giao (donNguoiDat.doi > 0 qua ghiDe của khung thử) → 409 erasure_busy.
// (p7) Review Focus 5: kho R2 giả ném lỗi khi delete ⇒ 200, conChoXoaKho = số tệp; GET /api/parties/tep-cho-xoa (Toàn quyền) liệt kê; POST /api/parties/phieu-xoa/chay-lai sau khi kho hết lỗi ⇒ xoá hết, R-PTY-12 = 0.
//      Kho ném lỗi khi put bản ngoài ⇒ chuaChepNgoai = true, offsite_at rỗng; chạy lại ⇒ đối tượng xoa/<id>.json có { phieu, hoSo, luc } (không khoá nào khác), offsite_at có.
// (p8) Khung thử KHÔNG tiêm cauAnDanhPhien ⇒ 503 erasure_unavailable, 0 thay đổi.
// (p9) Từ chối: lyDo ngoài danh sách / có khoá ghiChu → 400; hợp lệ → TU_CHOI; nhật ký có mã lý do; người dùng thấy nhãn lý do ở GET cua-toi.
// (p10) Review Focus 1 (năm route đọc): sau (p4) — GET cua-toi (chính chủ), GET /api/parties/:id (Quản trị), GET /api/parties/:id/documents (Quản trị: số che = null + daXoa),
//      POST …/documents/:did/reveal (Toàn quyền) → 409 document_erased "Giấy tờ này đã được xoá theo yêu cầu.", 0 dòng nhật ký xem số; GET /api/parties/xac-minh?trang=da-xu-ly không có trường giá trị.
// (p11) Review Focus 4: gộp hồ sơ X vào hồ sơ đã xoá (POST gộp) → 409 merge_erasure "Hồ sơ đang có hoặc đã thực hiện yêu cầu xoá dữ liệu — không gộp được."; chiều ngược cũng vậy.
// (p12) Tài khoản hồ sơ đã gộp: phiếu của P có hồ sơ phụ Q ⇒ xem trước hoSoGopVao = 1; thực hiện phủ Q (đếm như ca (2) Task 2).
```

**Khung thử — kiểm một lần trước khi viết (p6), (p8):** kế hoạch H-4 ghi `ghiDe` của khung thử KHÔNG được thêm khoá mới. Nếu khung thử không cho ghi đè `gopHoSo` / bỏ `cauAnDanhPhien` theo từng bài mà không thêm khoá vào `ghiDe`, thì: (p6) gieo một đơn THẬT chưa giao có người đặt là hồ sơ của Đối tác (qua route lập đơn trong khung thử) thay vì ghi đè; (p8) kiểm ở mức router như ca (5) Task 3 (app dựng không tiêm ⇒ route trả 503), không qua `world()`.

- [ ] **Step 3: Chạy, xác nhận đỏ.**

- [ ] **Step 4: Viết route Thực hiện** (Từ chối cùng khuôn: chỉ câu quyết + nhật ký):

```ts
route("POST", "/api/parties/phieu-xoa/:pid/thuc-hien", "admin", async ({ request, env, staff, params, taiKhoanXacMinh, gopHoSo, cauAnDanhPhien }) => {
  if (!can(staff, "admin.manage")) return ADMIN_ONLY();
  if (!can(staff, "party.erasure.process")) return ERASURE_FORBIDDEN();
  if ((await readJson(request))?.xacNhan !== true) return error(400, "invalid_input", "Cần xác nhận trước khi thực hiện.");
  const p = await timPhieuXoa(env.DB, params.pid!);
  if (!p) return error(404, "not_found", "Không tìm thấy phiếu.");
  const ds = await taiKhoanXacMinh();
  const chuPhieu = ds.find((t) => t.partyId === p.party_id) ?? null;
  const [don, no, viec, laCongTy] = await Promise.all([gopHoSo.donNguoiDat(p.party_id), gopHoSo.soDongNo(p.party_id), gopHoSo.viecCua(p.party_id), laCongTyChu(env.DB, p.party_id)]);
  const kl = xetXuLyPhieuXoa({ nguoi: { id: staff.id, permissions: staff.permissions }, phieu: { createdBy: p.created_by }, chuPhieu, laCongTyChu: laCongTy, viec: { doi: don.doi, ...viec } });
  if (kl === "cap_bac" || kl === "khong_tai_khoan") return error(404, "not_found", "Không tìm thấy phiếu.");
  if (p.status !== "CHO_XU_LY") return error(409, "erasure_not_pending", "Phiếu đã được xử lý hoặc đã rút.");
  if (kl) return error(409, MA_LOI_XU_LY[kl], NHAN_LY_DO_KHONG_XU_LY[kl]);
  const at = new Date().toISOString();
  const cauPhien = chuPhieu ? cauAnDanhPhien(chuPhieu.id, at, staff.id) : null;
  if (chuPhieu && !cauPhien) return error(503, "erasure_unavailable", "Chưa thực hiện được: thiếu phần xoá thông tin phiên đăng nhập. Hãy báo quản trị viên.");
  const giu = giuTen({ permissions: chuPhieu?.permissions ?? [], don, soDongNo: no });
  const dem = await demXemTruocXoa(env.DB, p.party_id);
  const lo = [
    quyetPhieuXoaStatement(env.DB, { id: p.id, actorId: staff.id, at, giuTen: giu, phanGiuLai: phanGiuLai({ giuTen: giu, coTaiKhoan: !!chuPhieu }).join(",") }),
    auditStatement(env.DB, { staffId: staff.id, action: "party_erased", at, targetType: "party", targetId: p.party_id,
      detail: `phiếu ${p.id} · giấy tờ ${dem.giayTo} · phiếu tự khai ${dem.phieuTuKhai} · liên hệ ${dem.lienHe} · tệp ${dem.tep}` }, "changes() > 0"),
    ...anDanhStatements(env.DB, { id: p.id, partyId: p.party_id, actorId: staff.id, at, homNay: vnToday(new Date(at)) }),
    ...(cauPhien ? [cauPhien] : []), // câu của auth: không lính gác pty_* (5.3) — tự lặp an toàn; rủi ro ghi ở Review Focus
  ];
  const kq = await env.DB.batch(lo);
  if ((kq[0]!.meta.changes ?? 0) === 0) return error(409, "erasure_not_pending", "Phiếu đã được xử lý hoặc đã rút.");
  // SAU lô (Hiến chương 5.16): xoá kho, rồi chép bản ngoài D1 — lỗi không làm hỏng kết quả, để lại trạng thái chờ thấy được.
  const kho = env.HO_SO;
  const xoa = kho ? await xoaKhoiKho(env.DB, kho, await tepChoXoaCuaPhieu(env.DB, p.party_id), () => new Date().toISOString()) : { daXoa: 0, loi: dem.tep };
  const chep = kho ? await chepBanNgoai(env.DB, kho, { id: p.id, partyId: p.party_id, luc: at }) : false;
  return json({ ok: true, conChoXoaKho: xoa.loi, chuaChepNgoai: !chep });
}),
```

`chepBanNgoai` (hàm cục bộ của `kho-tep.ts`, cùng tệp với `xoaKhoiKho` — bài `src/kho-tep-ho-so.test.ts` "chỉ parties chạm kho"): `await kho.put(\`xoa/${id}.json\`, JSON.stringify({ phieu: id, hoSo: partyId, luc }))` rồi `danhDauOffsiteStatement(...).run()`; lỗi → `console.error` mã sự kiện, trả `false`. Kiểm chữ ký thật của `readJson`, `ADMIN_ONLY`, `vnToday` trong `parties/index.ts` và đặt hằng câu lỗi đầu khối (khuôn `TEP_FORBIDDEN`).

- [ ] **Step 5: Review Focus 1 ở các route đọc có sẵn** — `GET /api/parties/:id/documents` (DTO giấy tờ: `erased_at` có ⇒ `soChe: null, daXoa: true`, không nút xem số), `POST …/documents/:did/reveal` (dòng đã ẩn danh ⇒ 409 `document_erased` TRƯỚC khi ghi nhật ký), `GET /api/parties/cua-toi` (hồ sơ / giấy tờ / phiếu), hàng chờ xác minh (phiếu `erased_at` có không bao giờ ở trạng thái chờ — trigger bảo đảm; hàng đã xử lý vốn không trả giá trị). Liên hệ có dấu: DTO liên hệ của `GET /api/parties/:id` bỏ dòng đã đóng như hiện nay (kiểm), nếu có hiện dòng đóng thì hiện "Đã xoá".
  - **Lỗi trigger mới ở route giấy tờ cũ:** gia hạn / sửa sai / huỷ trên dòng đã ẩn danh sẽ chạm `person_document_erased` (hoặc `person_document_erase_shape`). Thêm MỘT dòng vào `docProblem` (`src/modules/parties/index.ts`): `if (/person_document_erased|person_document_erase_shape/.test(m)) return error(409, "document_erased", "Giấy tờ này đã được xoá theo yêu cầu — không sửa được.");` + một ca ở `giay-to-route.test.ts` (sửa sai dòng đã ẩn danh → 409, không 500). Gia hạn từ dòng đã ẩn danh (chèn dòng MỚI nối `previous_id`) vẫn được — người dùng có thể khai lại giấy tờ mới.
  - Route tải ảnh của Toàn quyền (H-2, `POST …/documents/:did/tep`) nối ảnh mới vào dòng đã ẩn danh: chặn ở route bằng 409 `document_erased` (kiểm `erased_at` cùng chỗ kiểm "dòng hiện hành") + ca bài. Không thêm trigger (giữ migration hẹp); ghi `BL-XOA-ANH-DONG-DA-XOA` nếu sau này cần lớp CSDL.

- [ ] **Step 6: Chặn gộp ở route** — route gộp (`src/modules/parties/index.ts`, khối gộp) đọc "có phiếu xoá chờ / đã thực hiện" cho cả hai hồ sơ TRƯỚC lô → 409 `merge_erasure`; dịch lỗi trigger `party_merge_erasure` cùng câu.

- [ ] **Step 7: Cổng phát hành** — `src/cong-phat-hanh-anh-tu-khai.test.ts`: giữ nguyên bài cũ (hằng `DUONG_THUC_HIEN_XOA` đã khớp tên thật — sửa chú thích "GIỮ CHỖ" thành "tên thật, lát H-5"); thêm bài:

```ts
const DUONG_GUI_XOA = "POST /api/parties/cua-toi/phieu-xoa";
test("điều kiện Q1 (phần máy kiểm được): bản dựng có route đăng chính sách / gửi phiếu tự khai thì PHẢI có route gửi yêu cầu xoá và route thực hiện phiếu xoá", async () => {
  const r = await routesOf("./modules/parties/index.ts", "partiesModule");
  const coThuDuLieu = r.includes("POST /api/parties/chinh-sach-rieng-tu") || r.includes("POST /api/parties/cua-toi/phieu");
  if (coThuDuLieu) {
    assert.ok(r.includes(DUONG_GUI_XOA), "thiếu route người dùng gửi yêu cầu xoá");
    assert.ok(r.some((k) => DUONG_THUC_HIEN_XOA.test(k)), "thiếu route thực hiện phiếu xoá");
  }
});
```

Phá thử: bỏ route gửi yêu cầu xoá khỏi `partiesModule` ⇒ đỏ ⇒ hoàn nguyên.

- [ ] **Step 8: Hàng rào đi kèm**
  - `src/route-access.test.ts`: năm dòng `access: "admin"` kèm chú thích ADR-0126.
  - `src/route-write-guard.test.ts`: route cổng `admin` hỏi `admin.manage` viết thẳng trước (khuôn đăng chính sách) — nếu bài có danh sách route admin ghim thì thêm năm route.
  - `src/giay-to-khong-lo-so.test.ts`: mở rộng bộ lọc với `^\/api\/parties\/(phieu-xoa|anh-can-xoa)` (KHÔNG bắt route khác); ca: xem trước / thực hiện / nhật ký không chứa số.
  - `src/tu-khai-khong-len-nhan.test.ts`: thêm ĐÚNG `POST /api/parties/phieu-xoa/:pid/thuc-hien` (gọi câu ẩn danh phiếu tự khai).
  - `src/xoa-mot-lenh-co-ten.test.ts` bài (3): đổi từ "không lời gọi" thành "ĐÚNG một lời gọi `anDanhStatements(`, nằm trong thân route `POST /api/parties/phieu-xoa/:pid/thuc-hien`".
  - `src/shared/lan-gui-no.ts` `GHI_NHIEU_LAN`: `{ duong: "POST /api/parties/phieu-xoa/:pid/thuc-hien", lyDo: "ADR-0126 đ3, đ7; Hiến chương 5.16: lô ẩn danh hoá (mang vé) → xoá từng đối tượng kho R2 rồi đánh dấu đã-xoá-khỏi-kho → chép bản ngoài D1 rồi đánh dấu; kho nằm giữa nên không gộp được một lô. Lần sau hỏng thì phiếu vẫn 'Đã thực hiện', tệp còn 'chờ xoá' và bản ngoài còn cờ — chạy lại ở POST /api/parties/phieu-xoa/chay-lai." }` và `{ duong: "POST /api/parties/phieu-xoa/chay-lai", lyDo: "… tự lặp lại an toàn (xoá kho đã mất không lỗi; bản ngoài ghi đè cùng nội dung) …" }`.
  - `src/kho-tep-ho-so.test.ts`: nếu ghim mọi khoá kho bắt đầu `pty/` thì thêm ngoại lệ có tên `xoa/` (chỉ trong `chepBanNgoai`).

- [ ] **Step 9: Chạy bộ kiểm của task** — `node --test src/shared/permissions.test.ts src/modules/parties/xoa-an-danh-route.test.ts src/modules/parties/gop-route.test.ts src/modules/parties/giay-to-route.test.ts src/modules/parties/xac-minh-route.test.ts src/cong-phat-hanh-anh-tu-khai.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts src/giay-to-khong-lo-so.test.ts src/tu-khai-khong-len-nhan.test.ts src/lan-gui-no.test.ts src/kho-tep-ho-so.test.ts src/goi-trang-nhe.test.ts src/architecture.test.ts src/audit-invariants.test.ts`, rồi `npm run typecheck`, rồi `npm test`. Expected: PASS; ghi số byte gói Đơn hàng.

- [ ] **Step 10: Commit**

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc-ten.ts src/shared/tro-ly-cau-truc.ts src/modules/parties/ src/shared/contracts.ts src/shared/audit-actions.ts src/shared/lich-su-doi-tac.ts src/cong-phat-hanh-anh-tu-khai.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/giay-to-khong-lo-so.test.ts src/tu-khai-khong-len-nhan.test.ts src/xoa-mot-lenh-co-ten.test.ts src/shared/lan-gui-no.ts src/kho-tep-ho-so.test.ts
git commit -m "Xoá dữ liệu: hàng chờ, xem trước, thực hiện ẩn danh hoá một lô, từ chối, chạy lại kho và bản ngoài; chặn gộp hồ sơ đã xoá (ADR-0126)"
```

**Tiêu chí nghiệm thu Task 5:** mười hai ca (p1)–(p12) xanh; bỏ `quyetPhieuXoaStatement` khỏi đầu lô (ẩn danh trước) ⇒ (p5) đỏ; bỏ kiểm `erased_at` ở `reveal` ⇒ (p10) đỏ; cổng phát hành mới phá thử đỏ thật; `GHI_NHIEU_LAN` chỉ thêm đúng hai mục; gói Đơn hàng ≤ 96 600.

---

### Task 6: Danh sách ảnh hết lý do giữ + ẩn danh phiên cũ (VIỆC LỚN — dữ liệu)

**Files:**
- Modify: `src/modules/parties/index.ts` (hai route), `src/shared/contracts.ts`, `src/modules/parties/xoa-an-danh-route.test.ts`
- Modify: `src/modules/accounts/index.ts` (hai route), `src/shared/audit-actions.ts` (`sessions_anonymized`, nhóm `system`)
- Create: `src/modules/accounts/an-danh-phien-cu.test.ts`
- Modify: `src/route-access.test.ts`, `src/shared/lan-gui-no.ts` (`POST /api/parties/anh-can-xoa/xoa` vào `GHI_NHIEU_LAN`)

**Interfaces:**
- Produces:
  - `GET /api/parties/anh-can-xoa` (cổng `admin`; `admin.manage` rồi `party.erasure.process`) → `{ anh: AnhCanXoaDto[] }` — `AnhCanXoaDto { id: string; tenHoSo: string; loaiGiayTo: string | null; lyDo: LyDoXoaAnh; taiLuc: string }`; Quản trị chỉ thấy tệp của hồ sơ không tài khoản hoặc tài khoản mình quản được.
  - `POST /api/parties/anh-can-xoa/xoa` (thân `{ ids: string[] }`, 1–50 mã) → `{ daQuyet: number, boQua: number, conChoXoaKho: number }`: một lô gồm cặp `datChoXoaAnhHetGiuStatement` + `auditStatement(party_attachment_purged, detail "tệp <id> · HET_LY_DO_GIU", "changes() > 0")` mỗi tệp (khuôn `cauDatChoXoa`), rồi `xoaKhoiKho`.
  - `GET /api/sessions/an-danh-cu` (cổng `admin`, `auth.session.policy`) → `{ hanNgay: number | null, soPhien: number }`; `POST /api/sessions/an-danh-cu` → 409 `chua_co_thoi_han` khi `hanNgay` rỗng ("Chính sách riêng tư chưa có thời hạn giữ phiên — chưa ẩn danh được."), ngược lại một lô `[anDanhPhienCuStatement(ketThucTruoc), auditStatement(sessions_anonymized, targetType "system", detail "n phiên kết thúc trước <ngày giờ VN>", "changes() > 0")]` → `{ daAnDanh: number }`. `ketThucTruoc = new Date(Date.now() - hanNgay * 86_400_000).toISOString()` (hằng mili-giây một ngày không phải con số thời hạn — rào Task 4 chỉ bắt số gán cho tên số ngày).

- [ ] **Step 1: Bài (đỏ)**
  - `xoa-an-danh-route.test.ts` thêm: (a1) danh sách hiện đúng các ca R14 (dùng lại dữ kiện ca (8) Task 2) qua route; (a2) Nhân sự / Kế toán → 403; (a3) Quản trị không thấy tệp của tài khoản Quản trị khác; (a4) xoá 2 tệp hợp lệ + 1 tệp đã có lại lý do giữ ⇒ `daQuyet = 2, boQua = 1`, đúng 2 dòng nhật ký, tệp bị bỏ qua vẫn mở được; (a5) `ids` rỗng / 51 mã / mã sai khuôn → 400; (a6) kho ném lỗi ⇒ `conChoXoaKho = 2`, tệp hiện ở `tep-cho-xoa`; tải về hai tệp đã quyết → 404 ngay.
  - `src/modules/accounts/an-danh-phien-cu.test.ts`: (s1) chính sách chưa có số → GET `hanNgay: null`, POST 409, 0 dòng đổi; (s2) chính sách `session_retention_days = 30` (số chỉ có trong bài) ⇒ POST làm rỗng IP / User-Agent của phiên kết thúc trước mốc, phiên mới hơn và phiên đang sống nguyên, nhật ký không chứa IP; (s3) Quản trị → 403 (ô chỉ Toàn quyền); (s4) chạy lần hai `daAnDanh = 0`.

- [ ] **Step 2: Chạy, xác nhận đỏ; viết route; chạy lại** — `node --test src/modules/parties/xoa-an-danh-route.test.ts src/modules/accounts/an-danh-phien-cu.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts src/lan-gui-no.test.ts src/giay-to-khong-lo-so.test.ts src/architecture.test.ts`, rồi `npm run typecheck`, rồi `npm test`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/parties/index.ts src/shared/contracts.ts src/modules/parties/xoa-an-danh-route.test.ts src/modules/accounts/ src/shared/audit-actions.ts src/route-access.test.ts src/shared/lan-gui-no.ts
git commit -m "Xoá dữ liệu: danh sách ảnh hết lý do giữ để người có quyền bấm xoá, ẩn danh IP phiên cũ theo thời hạn của chính sách (ADR-0126 đ6, đ8)"
```

**Tiêu chí nghiệm thu Task 6:** mười ca xanh; không Cron mới (`grep -n "scheduled" src/index.ts` không thêm nhánh); không route nào tự ghi khi chỉ ĐỌC danh sách.

**→ Người kiểm độc lập nhóm C** (chỉ đọc, phủ Task 2–6): tự chạy Step 9 của Task 5 + Step 2 của Task 6; thử đột biến: bỏ `DA_THANG_XOA` một câu, bỏ kiểm cấp bậc ở hàng chờ, đổi cột HR của `party.erasure.process`, bỏ kiểm `erased_at` ở `reveal`, đổi thứ tự "quyết rồi ẩn danh", bỏ lính gác của `datChoXoaAnhHetGiuStatement`; đọc lại các chỗ nới có tên (`GHI_NHIEU_LAN` ba mục, rào 5.23, `giay-to-khong-lo-so`, `kho-tep-ho-so`) xem có rộng hơn cần không; xác nhận không cạnh module mới và không con số thời hạn.

---

### Task 7: Giao diện — Hồ sơ của tôi, Danh bạ, Phiên + rào tĩnh + kịch bản Chrome (nhỏ — giao diện)

**Files:**
- Modify: `web/ho-so-cua-toi.ts` (mục "Yêu cầu xoá dữ liệu"; hai ô số ngày ở khung đăng chính sách của Toàn quyền; hiện "Đã xoá" cho trường `daXoa`)
- Create: `web/phieu-xoa.ts` (khối "Yêu cầu xoá dữ liệu" + "Ảnh giấy tờ hết lý do giữ")
- Modify: `web/parties.ts` (gọi khối khi `can(staff, "party.erasure.process")`), `public/parties.html` (một `<section id="phieu-xoa">` rỗng), `web/sessions.ts` (khối "Ẩn danh hoá phiên cũ" khi `can(staff, "auth.session.policy")`), `public/app.css` (khối `.px-*`, giá trị qua token)
- Create: `src/xoa-an-danh-giao-dien.test.ts`, `docs/evidence/2026-10-17-xoa-an-danh/kich-ban/xoa-an-danh-smoke.mjs`

**Interfaces:**
- Consumes: DTO Task 4–6; `PHAN_GIU_LAI`, `LY_DO_TU_CHOI_XOA`, `CAU_CAN_CU_GIU_LAI`, `nhanTrangThaiPhieuXoa`, `nhanLyDoXoaAnh` (`src/shared/xoa-an-danh-hien-thi`), `h()` (`web/dom.ts`), `api()` (`web/api.ts`).
- Produces: `export function dungKhoiPhieuXoa(goc: HTMLElement, staff: StaffProfile): void`.

- [ ] **Step 1: Rào tĩnh (đỏ)** — `src/xoa-an-danh-giao-dien.test.ts`:

```ts
// Rào tĩnh giao diện xoá dữ liệu (ADR-0126; web/CLAUDE.md). Phá thử: thêm h("textarea") vào khung từ chối → (2) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const doc = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
const px = doc("web/phieu-xoa.ts");
const hs = doc("web/ho-so-cua-toi.ts");
test("(1) không innerHTML; chỉ import src/shared không đuôi; không import src/modules", () => {
  for (const ma of [px, hs]) {
    assert.doesNotMatch(ma, /innerHTML|outerHTML|insertAdjacentHTML/);
    assert.doesNotMatch(ma, /src\/modules\//);
    assert.doesNotMatch(ma, /from "\.\.\/src\/shared\/[^"]+\.ts"/);
  }
});
test("(2) từ chối chỉ chọn trong danh sách đóng — không ô chữ tự do", () => {
  assert.doesNotMatch(px, /h\("textarea"|type:\s*"text"/);
  assert.match(px, /LY_DO_TU_CHOI_XOA/);
});
test("(3) Thực hiện và Gửi yêu cầu xoá đều có bước xác nhận hai lần, câu có chữ 'không hoàn tác'", () => {
  assert.match(px, /không hoàn tác/);
  assert.match(hs, /không hoàn tác/);
  assert.match(hs, /xacNhan:\s*true/);
});
test("(4) trang Tôi chỉ gọi /api/parties/cua-toi* và POST chính sách (rào cũ vẫn giữ); khối Danh bạ chỉ gọi /api/parties/phieu-xoa*, /api/parties/anh-can-xoa*", () => {
  for (const m of hs.matchAll(/"(\/api\/[^"]+)"/g)) assert.match(m[1]!, /^\/api\/parties\/(cua-toi|chinh-sach-rieng-tu)/);
  for (const m of px.matchAll(/"(\/api\/[^"]+)"/g)) assert.match(m[1]!, /^\/api\/parties\/(phieu-xoa|anh-can-xoa)/);
});
test("(5) web/orders.ts không nhập các khối này (trần gói)", () => {
  assert.doesNotMatch(doc("web/orders.ts"), /phieu-xoa|xoa-an-danh/);
});
test("(6) không hiện dấu ẩn danh như dữ liệu: không chuỗi 1900-01-01, 'XOA' trong mã giao diện", () => {
  for (const ma of [px, hs]) assert.doesNotMatch(ma, /1900-01-01|"XOA/);
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ** — `node --test src/xoa-an-danh-giao-dien.test.ts src/ho-so-cua-toi-giao-dien.test.ts`.

- [ ] **Step 3: Dựng giao diện** bằng `h()`:
  - **Trang Tôi → Hồ sơ của tôi → "Yêu cầu xoá dữ liệu"**: đoạn giải thích ngắn ("Nền tảng sẽ xoá số giấy tờ, ảnh giấy tờ, địa chỉ, ngày sinh, liên hệ và thông tin máy đăng nhập của bạn. Một số thông tin phải giữ theo quy định — xem danh sách sau khi xử lý."), dòng thời hạn ("Thời hạn xử lý: N ngày kể từ khi gửi" hoặc "Chính sách chưa ghi thời hạn — Tour Đảo sẽ xử lý sớm nhất có thể"). Nút "Gửi yêu cầu xoá" → bước xác nhận thứ hai "Gửi yêu cầu? Sau khi được thực hiện, việc xoá không hoàn tác được. Thông tin đang chờ xác minh của bạn sẽ được rút." → gửi `{ xacNhan: true }` → `location.replace`. Khi có phiếu: thẻ trạng thái (nhãn tiếng Việt), "Gửi lúc", "Hạn", nút "Rút yêu cầu" khi đang chờ; khi đã thực hiện: danh sách "Phần được giữ lại" (nhãn `PHAN_GIU_LAI`) + câu `CAU_CAN_CU_GIU_LAI`; khi bị từ chối: nhãn lý do. Trường `daXoa` hiện "Đã xoá theo yêu cầu". Nút gửi phiếu tự khai ẩn khi `lyDoKhongGui` là phiếu xoá đang chờ (máy chủ trả).
  - **Khung đăng chính sách (Toàn quyền)**: hai ô số (`inputmode="numeric"`, 16px) "Số ngày xử lý yêu cầu xoá" và "Số ngày giữ IP và thông tin máy của phiên đã kết thúc", gợi ý "Để trống nếu chưa có số được luật sư xác nhận".
  - **Danh bạ → "Yêu cầu xoá dữ liệu"**: hai nút chuyển "Đang chờ" / "Đã xử lý"; thẻ phiếu: họ tên, gửi lúc, nhãn "Quá hạn" (màu cảnh báo qua token) / "Chưa có thời hạn"; câu `lyDoKhong` khi không xử lý được (nút ẩn). Bấm thẻ → khung xem trước: các số "sẽ xoá" (giấy tờ, phiếu tự khai, liên hệ, ngày sinh, ảnh, thông tin phiên), "Tên: giữ / thay bằng 'Người đã xoá dữ liệu'", danh sách phần giữ lại; nút "Thực hiện" (xác nhận: "Thực hiện xoá? Việc này không hoàn tác được.") và "Từ chối" (nút chọn một lý do từ `LY_DO_TU_CHOI_XOA`, "Gửi từ chối" chỉ bật khi đã chọn). Sau 200: hiện "Còn N ảnh chờ xoá khỏi kho" / "Chưa chép bản lưu ngoài" kèm nút "Chạy lại" nếu có.
  - **Danh bạ → "Ảnh giấy tờ hết lý do giữ"**: danh sách (họ tên, loại giấy tờ, lý do nhãn tiếng Việt, ngày tải), ô chọn (tối đa 50), nút "Xoá ảnh đã chọn" + xác nhận không hoàn tác.
  - **Trang Phiên (Toàn quyền)**: dòng "Ẩn danh IP và thông tin máy của N phiên đã kết thúc quá H ngày" + nút; khi `hanNgay` rỗng hiện "Chính sách riêng tư chưa có thời hạn giữ phiên" và nút tắt.

- [ ] **Step 4: Chạy lại + dựng** — `node --test src/xoa-an-danh-giao-dien.test.ts src/ho-so-cua-toi-giao-dien.test.ts src/goi-trang-nhe.test.ts src/giao-dien-hoi-bang-quyen.test.ts`, rồi `npm run build:web`, rồi `npm run typecheck`. Expected: PASS; gói Đơn hàng không đổi byte so với cuối Task 5.

- [ ] **Step 5: Kịch bản Chrome** — `docs/evidence/2026-10-17-xoa-an-danh/kich-ban/xoa-an-danh-smoke.mjs` theo khuôn `docs/evidence/2026-10-17-tu-khai/kich-ban/tu-khai-smoke.mjs` (D1 tạm, dữ liệu ghi rõ "thử", kiểm axe khi có `AXE_JS`, rộng **1040** và **390**): (1) Toàn quyền đăng chính sách thử với một số ngày; (2) Đối tác thử (đã có giấy tờ thử + một phiếu tự khai chờ) mở trang Tôi, gửi yêu cầu xoá hai bước ⇒ thấy "đang chờ", phiếu tự khai đã rút; (3) Quản trị mở Danh bạ, thấy phiếu, xem trước, thực hiện; (4) Đối tác mở lại trang Tôi ⇒ "Đã thực hiện", danh sách phần giữ lại, giấy tờ "Đã xoá theo yêu cầu"; (5) Quản trị mở hồ sơ Đối tác trong Danh bạ ⇒ không thấy số / dấu; (6) Toàn quyền mở trang Phiên ⇒ khối ẩn danh phiên cũ; mở SAU CÙNG (kho cookie chung). Chụp ảnh từng bước hai bề rộng vào `docs/evidence/2026-10-17-xoa-an-danh/anh/`. Chạy thêm các kịch bản bảng `web/CLAUDE.md` yêu cầu cho tệp đã chạm: `tu-khai-smoke.mjs` (Hồ sơ của tôi), `dot-c-smoke.mjs` (bố cục trang Tôi), `t2b-danh-ba-smoke.mjs`, `giay-to-nguoi-smoke.mjs`, `dot-a-smoke.mjs` (`web/parties.ts`), và kịch bản của `web/sessions.ts` nếu bảng có dòng (`grep -n sessions web/CLAUDE.md`).

Run: `AXE_JS=<đường dẫn axe.min.js> node docs/evidence/2026-10-17-xoa-an-danh/kich-ban/xoa-an-danh-smoke.mjs`
Expected: `SMOKE OK`, 0 vi phạm axe. Thiếu `AXE_JS` ⇒ báo cáo ghi **"chưa kiểm màu (thiếu AXE_JS)"**, không khai đạt.

- [ ] **Step 6: Commit**

```bash
git add web/ho-so-cua-toi.ts web/phieu-xoa.ts web/parties.ts public/parties.html web/sessions.ts public/app.css src/xoa-an-danh-giao-dien.test.ts docs/evidence/2026-10-17-xoa-an-danh/
git commit -m "Xoá dữ liệu: nút Yêu cầu xoá ở Hồ sơ của tôi, khối xử lý ở Danh bạ, ẩn danh phiên cũ ở trang Phiên, kịch bản Chrome và ảnh hai bề rộng (ADR-0126)"
```

**Tiêu chí nghiệm thu Task 7:** sáu bài tĩnh xanh; kịch bản Chrome có `AXE_JS` OK ở 1040 và 390; ảnh thật đủ hai bề rộng để chủ duyệt một lượt; gói Đơn hàng không tăng.

---

### Task 8: E2E, tài liệu, sổ hàng rào, phá thử, nhật ký thay đổi, bộ kiểm đủ (nghiệm thu)

**Files:**
- Create: `tests/e2e/xoa-an-danh.mjs`; Modify: `tests/e2e/run.mjs`
- Modify: `docs/SYSTEM-DESIGN.md` (§5 bảng / cột mới; §7 chín route; §8 hai ô + luật người xử lý ≠ người gửi + cấp bậc), `docs/CHANGE-GUIDE.md` (công thức "thêm bảng / cột chứa dữ liệu cá nhân ⇒ phải vào lô ẩn danh hoá `anDanhStatements` + `R-PTY-18` + DTO nhìn `erased_at`"; bẫy "dấu ẩn danh không được hiện như dữ liệu"; bẫy "hai cột số ngày rỗng = chưa có số luật sư"), `docs/HANDOFF-N1.md`, `docs/BACKLOG.md`, `docs/SO-HANG-RAO.md`, `src/shared/changelog.ts` (2.14 TẠM), `src/shared/app-info.test.ts`

- [ ] **Step 1: E2E** — `tests/e2e/xoa-an-danh.mjs`, đăng nhập luôn qua `login()`/`session()` của `tests/e2e/lib.mjs`, POST kèm `Origin`:

```js
// Kịch bản (mỗi bước một assert, đếm trên D1 local tạm). Đối tác do TOÀN QUYỀN tạo.
// 1. Toàn quyền đăng chính sách thử KHÔNG số ngày; Đối tác đồng ý, gửi phiếu tự khai NGAY_SINH, DIA_CHI (đang chờ). Toàn quyền thêm CCCD cho Đối tác (Danh bạ).
// 2. Đối tác POST /api/parties/cua-toi/phieu-xoa { xacNhan: true } → 201; GET cua-toi: phiếu CHO_XU_LY, han null; hai phiếu tự khai RUT; POST /api/parties/cua-toi/phieu → 409 erasure_open.
// 3. Quản trị GET /api/parties/phieu-xoa → có phiếu, trangThaiHan chua_co_han; GET xem trước → chỉ số đếm (không chuỗi số CCCD).
// 4. Quản trị POST …/thuc-hien { xacNhan: true } → 200; lần hai → 409 erasure_not_pending.
// 5. Toàn quyền POST /api/parties/:id/documents/:did/reveal → 409 document_erased; GET /api/audit: dòng party_erased không chứa số / tên cũ / SĐT.
// 6. Đối tác GET cua-toi: phiếu DA_THUC_HIEN, phanGiuLai có SDT_DANG_NHAP; giấy tờ daXoa; Đối tác vẫn đăng nhập lại được bằng PIN (staff.phone giữ — đ9).
// 7. Toàn quyền đăng chính sách mới với hanXuLyXoaNgay = 5, hanGiuPhienNgay = 1 (số chỉ trong kịch bản thử); GET /api/sessions/an-danh-cu → hanNgay 1; POST → 200.
// 8. Gộp một hồ sơ khác vào hồ sơ đã xoá → 409 merge_erasure.
// Cuối: audit-invariants (run.mjs tự chạy) — R-PTY-17, R-PTY-18, R-PTY-20 = 0; R-PTY-19 = 0 (hoặc warn có ghi lý do nếu D1 local không có binding HO_SO).
```

Run: `npm run test:e2e -- xoa-an-danh` (cần mạng; tắt `wrangler dev` mồ côi trước), rồi `npm run test:e2e` đủ.
Expected: xanh; `audit-invariants` thoát 0. Gặp 500 thân null dưới tải: chạy lại MỘT lần, ghi vào báo cáo (bộ nhớ "e2e: 500 thân null"), không sửa mã vì nó.

- [ ] **Step 2: Phá thử thật (P16) và ghi sổ** — mỗi phép: sửa cố ý → chạy bài → ĐỎ (chép dòng `not ok …`) → hoàn nguyên → xanh; `git status` sạch sau cùng. Tối thiểu:
  1. Bỏ trigger `pty_person_document_erased_frozen` ⇒ `migrations-xoa-an-danh.test.ts` (e) đỏ.
  2. Bỏ vế `expiry_date` của `_erase_shape` ⇒ (d) đỏ.
  3. Dấu cố định `'XOA'` ⇒ (c)/(d) đỏ.
  4. `row.erasure_days ?? 20` trong `repository.ts` ⇒ `xoa-khong-so-thoi-han.test.ts` (1) đỏ.
  5. `DA_THANG_XOA` → `1 = 1` ở câu `an_danh_giay_to` ⇒ `xoa-an-danh-lenh.test.ts` (3) đỏ.
  6. Bỏ kiểm `erased_at` ở `reveal` ⇒ route (p10) đỏ.
  7. Bỏ route gửi yêu cầu xoá ⇒ cổng phát hành bài mới đỏ.
  8. Cột HR của `party.erasure.process` → `any` ⇒ bài ô + "HR đúng năm ô" đỏ.
  9. `>= ?H` → `> ?H` ở vế vai của `GIU_ANH` ⇒ ca (8) Task 2 đỏ.
  10. `R-PTY-18`: bỏ vế liên hệ ⇒ bài bất biến ca liên hệ đỏ.
  11. Đăng ký thêm `defineSql("parties", "thu_x", "UPDATE pty_person_document SET erased_at = ?1 WHERE id = ?2")` ⇒ `xoa-mot-lenh-co-ten.test.ts` (1) đỏ; gọi `anDanhStatements(` trong route khác ⇒ (3) đỏ.
  12. Bỏ `party_id` khỏi `PARTITION BY` của `an_danh_xac_minh_lai` ⇒ `xoa-an-danh-lenh.test.ts` (2) đỏ.

`docs/SO-HANG-RAO.md`: một dòng cho mỗi hàng rào mới (rào "chỉ một lệnh có tên ghi đè dòng đã khoá" — bảng thi hành Hiến chương 5.24; dạng chuyển + đóng băng; bảng phiếu một chiều + người xử lý ≠ người gửi; chặn phiếu tự khai khi có phiếu xoá; chặn gộp; rào không con số thời hạn; lính gác lô ẩn danh; DTO không lộ dấu; cổng phát hành vế chính sách; R-PTY-17..20; rào tĩnh giao diện), cột "Đã thấy chặn thật" chép dòng `not ok` thật. **Sửa dòng "Điều kiện Q1"**: phần "bản dựng có đường xoá" nay là hàng rào máy (cổng phát hành); phần "luật sư duyệt chữ chính sách" và "chính sách có số ngày" vẫn **dựa vào kỷ luật** (trừ khi chủ chọn Q2 phương án bắt buộc). Ghi rõ **dựa vào kỷ luật**: câu ẩn danh sổ phiên không có lính gác phiếu; chạy lại phiếu sau khôi phục D1.

- [ ] **Step 3: Tài liệu + nhật ký thay đổi**
  - `src/shared/changelog.ts` mục **2.14** (TẠM, ngày thi công): "Bạn có thể gửi yêu cầu xoá dữ liệu cá nhân của mình ở Tôi → Hồ sơ của tôi. Quản trị xem trước và thực hiện: số giấy tờ, ảnh giấy tờ, địa chỉ, ngày sinh, liên hệ và thông tin máy đăng nhập được xoá; phần phải giữ theo quy định được liệt kê rõ. Danh bạ có danh sách ảnh giấy tờ đã hết lý do giữ để xoá." Sửa `src/shared/app-info.test.ts` theo khuôn lần trước.
  - `docs/HANDOFF-N1.md` mục mới **"Lần phát hành kế tiếp có xoá dữ liệu (ADR-0126 — Gói 2 lát H-5; migration `0108`) — RUNBOOK"**: trạng thái CHƯA phát hành; `0108` áp SAU `0103`–`0107`; kiểm số migration lúc phát hành (lệnh như mục `0107`); **không cần lệnh Cloudflare mới** (kho `HO_SO` đã có từ H-2); `0108` tạo lại bốn trigger — vô hại khi bảng rỗng hay có dữ liệu. **Việc của chủ:** (1) **không đăng chính sách riêng tư trên production trước khi luật sư duyệt chữ VÀ bản này đã lên** (điều kiện Q1 cập nhật; nhập hai số ngày khi luật sư đã xác nhận — để trống nếu chưa); (2) gửi luật sư bộ câu Q1; (3) duyệt ảnh `docs/evidence/2026-10-17-xoa-an-danh/anh/`; (4) trả lời Q2–Q6; (5) đặc tả diễn tập khôi phục (HC-5.19, hạn 2026-11-05) thêm bước: sau khôi phục D1, liệt kê kho `HO_SO` tiền tố `xoa/` (lệnh chỉ đọc chủ chạy), so với `pty_erasure_request`: phiếu có trong kho mà D1 còn `CHO_XU_LY` ⇒ bấm "Thực hiện" lại; phiếu không còn dòng trong D1 ⇒ ghi lại mã hồ sơ, chờ công cụ (BL-XOA-KHOI-PHUC).
  - `docs/BACKLOG.md` mục **40. Xoá dữ liệu — nợ lát H-5 (`BL-XOA-…`)**: `BL-XOA-TO-CHUC` (phiếu cho hồ sơ tổ chức / hộ kinh doanh — Q6), `BL-XOA-THAY-KHACH` (Quản trị lập phiếu thay khách không tài khoản — trang ghép, Q6), `BL-XOA-KHOI-PHUC` (công cụ chạy lại phiếu từ bản ngoài khi D1 không còn dòng — đi cùng diễn tập HC-5.19), `BL-XOA-BAO` (báo Quản trị khi có phiếu mới — hôm nay chỉ hàng chờ), `BL-XOA-TAI-KHOAN-NGUNG` (gỡ Face ID / yếu tố lớp hai / `staff.phone` khi tài khoản đã ngưng — đ9 chờ chủ), `BL-XOA-LOGIN-ATTEMPT` (`login_attempt.key` chứa SĐT — chưa kiểm dọn), `BL-XOA-SELF-SUBMISSION-ANH` (lát mở loại nối `SELF_SUBMISSION` phải giữ vế (b) của `GIU_ANH` và ca (8) Task 2), `BL-XOA-TRAN-30` (Q2), câu trả lời Q1–Q6 khi có. Cập nhật `BL-TEP-KHE-GOP` (ảnh nằm lại ở dòng đã huỷ của hồ sơ phụ nay hiện ở danh sách ảnh hết lý do giữ — `DA_HUY`).
  - `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`: như mục Files.

- [ ] **Step 4: Bộ kiểm đủ** — `npm run typecheck`, rồi `npm test`, rồi `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts src/claude-cong-xanh.test.ts`. Expected: 0 lỗi; mọi bước thoát 0. Đỏ mà không xanh được ⇒ báo cáo ghi nguyên văn **BỘ KIỂM CHƯA XANH** kèm tên bài và lý do.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/xoa-an-danh.mjs tests/e2e/run.mjs docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/HANDOFF-N1.md docs/BACKLOG.md docs/SO-HANG-RAO.md src/shared/changelog.ts src/shared/app-info.test.ts
git commit -m "Xoá dữ liệu: kịch bản e2e, sổ hàng rào có phá thử thật, runbook, tài liệu, nhật ký thay đổi 2.14 tạm (ADR-0126)"
```

**Báo cáo Task 8 phải kèm:** số byte gói Đơn hàng cuối lát; dòng ĐỀ XUẤT cho bảng kịch bản Chrome của `web/CLAUDE.md` (`web/phieu-xoa.ts`, mục xoá của `web/ho-so-cua-toi.ts`, khối ẩn danh của `web/sessions.ts` → `xoa-an-danh-smoke.mjs`) — chủ duyệt, AI không sửa; danh sách ruling đã áp; câu hỏi Q1–Q6 còn mở.

**→ Người kiểm độc lập cuối lát** (chỉ đọc, phủ toàn lát từ HEAD trước Task 1): đọc ADR-0126 đối chiếu từng tiêu chí nghiệm thu (sáu mục) và Hiến chương 5.24, 5.25; tự chạy `npm run typecheck`, `npm test`, `npm run test:e2e -- xoa-an-danh`; lặp ít nhất bốn phép phá thử của Step 2; xác nhận `git diff <HEAD trước Task 1> --stat` không chạm `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`, migration đã có trên `main`; không con số thời hạn; không Cron mới; trần gói Đơn hàng 96 600 không đổi.

---

## Câu hỏi gom cho chủ

Chỉ điều chạm dữ liệu / quyền / pháp lý mà ADR chưa chốt. Không câu nào chặn thi công: kế hoạch đã áp phương án an toàn, đảo ngược được (0108 chưa áp ở đâu). Câu có dấu **[luật sư]** cần người hiểu luật trả lời trước khi đăng chính sách trên production.

1. **[luật sư] Bộ câu cho luật sư (một lần gửi).** (a) Thời hạn trả lời yêu cầu xoá theo Nghị định 356/2025 Điều 5: 20 hay 30 ngày (Nền tảng chạy trên Cloudflare có tính là "có bên xử lý" không), tính ngày lịch hay ngày làm việc; (b) thời hạn giữ IP và thông tin máy của phiên đăng nhập đã kết thúc; (c) căn cứ của từng phần giữ lại trong phiếu trả lời (đơn kèm thông tin khách, danh sách hành khách ít nhất 3 năm, lần thu, sổ, yêu cầu hoá đơn, họ tên trong nhật ký, nhật ký cũ có SĐT, chữ tự do không rà); (d) khi nào được từ chối yêu cầu xoá (hôm nay hai lý do: "phải giữ theo pháp luật", "người dùng đã huỷ qua kênh khác"). Khuyến nghị: gửi nguyên bộ này; mã chạy được khi chưa có số (không hạn, không cảnh báo, Quản trị xử lý tay).
2. **Có bắt buộc nhập "số ngày xử lý yêu cầu xoá" khi đăng chính sách riêng tư không, và có chặn số lớn hơn 30 (lời anh 16/10) không?** Bắt buộc thì không ai đăng được chính sách thiếu con số luật sư đã xác nhận — biến một phần điều kiện "luật sư duyệt trước khi đăng" thành hàng rào máy, nhưng đổi cách đăng đã làm ở lát tự khai. Khuyến nghị: **bắt buộc nhập, chặn trên 30 ngày**. Hôm nay kế hoạch để trống được và không chặn trên (đúng chữ ADR).
3. **Ẩn danh luôn cả phiếu tự khai** (ngày sinh, địa chỉ, số giấy tờ người dùng đã khai) — ADR viết "migration chỉ thêm cột cho giấy tờ" khi bảng phiếu chưa có mã. Không làm thì sau khi "xoá", số CCCD và ngày sinh vẫn nằm trong phiếu cũ. Khuyến nghị: **đồng ý** (kế hoạch đã áp).
4. **Xoá thêm hai thứ ADR không nhắc:** giới tính của hồ sơ, và nhãn máy của phiên (ví dụ "iPhone · Safari", dựng từ thông tin máy). Xoá là không lấy lại được; giữ thì có thể xoá sau. Khuyến nghị: **xoá cả hai** (đều là dữ liệu cá nhân không có nghĩa vụ giữ). Hôm nay kế hoạch GIỮ cả hai cho đúng chữ ADR.
5. **Luật giữ tên:** tên được thay bằng "Người đã xoá dữ liệu" chỉ khi tài khoản thuần Đối tác và chưa từng có đơn hay dòng sổ; nhân viên và tài xế luôn giữ tên (tên đứng trên đơn họ lập, lệnh vận chuyển, nhật ký). Khuyến nghị: **đồng ý** (kế hoạch đã áp).
6. **[luật sư cho phần hộ kinh doanh] Hai nhóm chưa có đường xoá ở lát này:** tài khoản gắn hồ sơ công ty / hộ kinh doanh, và khách không có tài khoản (yêu cầu qua điện thoại — Quản trị lập phiếu thay như trang ghép đã vẽ). Khuyến nghị: **làm ở lát sau**, ưu tiên "Quản trị lập phiếu thay khách" trước khi đăng chính sách; hộ kinh doanh cần luật sư nói số giấy phép của hộ có là dữ liệu cá nhân phải xoá không.
