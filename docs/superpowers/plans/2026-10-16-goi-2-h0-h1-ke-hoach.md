# Gói 2 hồ sơ riêng tư — lát H-0 (hạng dữ liệu cá nhân) và H-1 (mô hình dữ liệu hồ sơ mở rộng): Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi cột chứa dữ liệu về con người mang hạng N0–N4 có máy canh (H-0), rồi thêm chỗ lưu ngày sinh, địa chỉ cá nhân, giấy tờ tổ chức, sổ xác minh, chính sách riêng tư và đồng ý, kèm siết đường đọc để Bán hàng, Kế toán không thấy ngày sinh và địa chỉ (H-1).

**Architecture:** H-0 thêm khoá `hangDuLieu` vào sổ dữ liệu `docs/data-dictionary.json` (mỗi cột của mọi bảng và view một hạng), một bài so sổ ↔ schema thật, một kiểm dữ liệu `R-PD-1` cho cột N3 và một bộ dò nhật ký dùng trong các bài chạy cả ứng dụng. H-1 là một migration chỉ-thêm `0103_ho_so_mo_rong.sql` của module `parties` (khuôn `0032_giay_to_cua_nguoi.sql`), một ô quyền mới `party.personal.view`, một luật thuần `src/modules/parties/rieng-tu.ts` quyết ai xem/ghi được hai trường riêng tư, và sửa các route `/api/parties*` có sẵn để lọc DTO và chặn ghi. Không thêm route mới, không thêm màn nhập.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), `node:sqlite` cho bài kiểm, `node --test` (Node 22), esbuild; không dependency runtime.

**Spec:** `docs/adr/ADR-0122-ho-so-mo-rong-giay-to-to-chuc-va-xac-minh-tung-dong.md`, `docs/adr/ADR-0126-quyen-rieng-tu-yeu-cau-xoa-an-danh-hoa-luu-giu.md` (điều 1), Hiến chương `docs/ARCHITECTURE.md` điều 5.20–5.25; đặc tả `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/` (`KE-HOACH-SUY-RA.md` dòng H-0, H-1; `PHUONG-AN.md` §2.1, §2.8; `TRANG-GHEP.md` §2 dòng `party.view`, `party.personal.view`, `party.write`).

**Review Focus:** năm dòng ở CUỐI tệp (theo yêu cầu điều phối), mỗi dòng đã có bài kiểm ở task sở hữu.

## Global Constraints

- Giao diện, thông báo lỗi (`message`), tài liệu, commit: tiếng Việt CÓ DẤU; không chữ Anh lộ ra người dùng (mã lỗi máy như `personal_forbidden` được, chữ hiện ra thì không). Gọi hệ thống là "Nền tảng".
- Không dependency runtime. Tệp trong `src/shared/` và mọi tệp có `*.test.ts` chạy trực tiếp phải import nhau KÈM đuôi `.ts`.
- Migration: đúng MỘT tệp mới `migrations/0103_ho_so_mo_rong.sql`, chỉ THÊM; không sửa tệp đã có trên `main`. Không gieo dữ liệu cá nhân, không gieo văn bản chính sách, **không có cột hay con số thời hạn xoá** (ADR-0126 đ2: con số chờ luật sư).
- `parties` là module nghiêm: SQL đi qua `defineSql` (câu tĩnh); thân trigger chỉ đọc bảng `pty_*` (Hiến chương 5.3).
- Bảng mới: `created_at`/`updated_at` `TEXT NOT NULL`, `created_by`/`updated_by` `TEXT NULL` không khoá ngoại; khoá ngoại `NO ACTION`; người thao tác (người xác minh, người đồng ý, người đăng chính sách) ghi ở `created_by` — KHÔNG khoá ngoại sang `staff` (cạnh `parties → staff` bị `src/architecture.test.ts` từ chối).
- Ngày dân sự theo giờ Việt Nam (`vnToday(new Date())`), dấu thời gian ISO UTC.
- Nhật ký (`audit_log.detail`) không chứa SĐT, email, MST, số giấy tờ, nơi cấp, ngày sinh, địa chỉ cá nhân, IP, mọi giá trị N3/N4 (Hiến chương 5.20, 5.12).
- Mặc định từ chối; ô quyền mới phải được hỏi bằng chuỗi nguyên văn `can(staff, "party.personal.view")` trong `src/modules/**` (bài `src/permission-enforcement.test.ts`).
- CẤM AI tự chạy: `git push`, merge vào `main`, `wrangler deploy`/`rollback`/`secret`, mọi lệnh `--remote`. E2E chỉ chạy trên D1 local tạm của `npm run test:e2e`.
- Không sửa luật chi phối chính mình: `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`, Phần I và bảng thi hành của `docs/ARCHITECTURE.md` (chỉ đề xuất — xem ruling R22).
- Mỗi task: bài đỏ trước, xanh sau; trước commit `npm test` và `npm run typecheck` phải xanh (`typecheck` KHÔNG phủ `*.test.ts`, `scripts/`, `tests/` — tự đọc lại tệp đó).
- Số phiên bản tạm của bản phát hành: **2.10** (ruling R21).

## Bằng chứng số migration (kiểm 2026-10-16)

- `main` (5748c123) và nhánh này: tệp lớn nhất `0102_aut_mfa_email.sql`; `main` là tổ tiên của `HEAD`.
- `git log --all --name-only --format= -- migrations/ | sort -u | tail` → lớn nhất `0102_aut_mfa_email.sql`; có `0098_dua_don_theo_nhom_va_diem_nhanh.sql` (commit `b96948d51`) chỉ ở các nhánh CHƯA gộp (`claude/tour-dao-booking-audit-bc6c77`, `worktree-agent-a5efc1907cfeb6e57`; ADR-0118, `docs/HANDOFF-N1.md` dòng 14) — số `0098` đã được giữ, KHÔNG lấp.
- `git ls-tree --name-only <nhánh> migrations/` cho từng nhánh chưa gộp (`git branch --no-merged main`: `canh-bao-don-trung`, `claude/clever-hertz-0f1b61`, `claude/elegant-dhawan-997fa2`, `claude/so-vang-van-chuyen`, `claude/stoic-heisenberg-72c05d`, ba nhánh `*-audit-*`, `kiem-toan-ontology`, `worktree-agent-a455127…`, `worktree-agent-a5efc19…`, `worktree-agent-a9baef1…`, `worktree-trang-chu-momo-lenh-thiet-ke`, `worktree-agent-a91d356…`): không nhánh nào có tệp `0103` trở lên.
- Thư mục `migrations/` (kể cả tệp chưa commit) của 13 worktree trong `git worktree list` và checkout gốc: lớn nhất `0102`.
- B5 (`staff_party_required`) giữ số `0019` riêng (CHANGE-GUIDE d), không đụng.
- **Số chọn: `0103`**, tệp `migrations/0103_ho_so_mo_rong.sql`. Bài kiểm tìm theo ĐUÔI `_ho_so_mo_rong.sql`, nên nhánh nào gộp trước thì chỉ đổi tên tệp.

## Câu hỏi / ruling

Phần "Cần chủ trả lời" là điều chạm cấu trúc dữ liệu mà ADR chưa chốt. Kế hoạch đã chọn phương án an toàn để thi công không bị chặn; nếu chủ chọn khác thì sửa trước khi migration lên production (bảng mới còn rỗng, đổi được).

**Cần chủ trả lời (không chặn thi công, chặn phát hành nếu chủ chọn khác):**

- **Q1 — Danh sách thuộc tính xác minh được của `pty_verification`.** ADR-0122 đ3 nói "theo từng dòng (giấy tờ, liên hệ, thuộc tính)" nhưng không liệt kê thuộc tính. Để không đóng cứng một điều đoán vào bảng chỉ-thêm, danh sách là **dữ liệu**: bảng tra cứu `pty_verification_attribute` (mã, tên, áp cho người hay tổ chức; khuôn `pty_contact_kind`), `pty_verification.attribute_code` khoá ngoại sang đó. Thêm / ngưng thuộc tính về sau = một migration chèn hay ngưng một dòng, không dựng lại bảng. Bảy dòng gieo đề xuất: `HO_TEN`, `NGAY_SINH`, `GIOI_TINH` (người) và `TEN_PHAP_LY`, `MA_SO_THUE`, `DIA_CHI_TO_CHUC`, `EMAIL_HOA_DON` (tổ chức). Chủ chỉ cần xác nhận hay sửa danh sách trước khi lát H-2 ghi dòng xác minh đầu tiên.
- **Q2 — Đồng ý theo cả phiên bản chính sách hay theo từng mục đích.** Hiến chương 5.21 nói "đồng ý với đúng phiên bản đó"; `PHUONG-AN.md` §2.1 ghi thêm cột "mục đích". Đã chọn: một dòng đồng ý cho CẢ phiên bản (không cột mục đích). Muốn tách theo mục đích về sau thì thêm bảng mới, không phải sửa bảng này.

**Ruling đã áp (bề mặt hoặc siết, đảo ngược được; ghi lại để người kiểm thấy):**

- **R1 — Nơi ghi hạng:** khoá mới cấp đầu `hangDuLieu` trong `docs/data-dictionary.json` (`{ "<bảng hoặc view>": { "<cột>": "N2" } }`), không gắn vào từng mục bảng — vì ba bài `src/migrations-giay-to-cua-nguoi.test.ts` (j), `src/migrations-van-chuyen-xe.test.ts` (k), `src/migrations-chinh-sach-dieu-phoi.test.ts` (f) so nguyên mục bảng bằng `deepEqual`.
- **R2 — Phủ MỌI cột của MỌI bảng và view** (lúc kiểm: 122 bảng / 1321 cột, 42 view / 157 cột), không chỉ bảng `pty_*`: chỉ cách này làm "cột mới chưa có hạng thì đỏ" đúng nghĩa chữ của 5.20. Cột không phải dữ liệu người mang N1; N0 chưa dùng (cột "công khai" duy nhất là thông tin công ty chủ, nằm chung cột với tổ chức khác nên lấy hạng cao hơn).
- **R3 — Chữ tự do = N2** (`note`, `body`, `place_text`, `noi_dung`, `tieu_de`, `cau_hoi`, `tra_loi`, `detail` của nhật ký, `title`, `context`, `reason` không có `CHECK` liệt kê) — phía an toàn của "N1–N2" ở `PHUONG-AN.md` §2.8. Lý do dạng mã (có `CHECK` liệt kê) = N1. Chữ của danh mục, cấu hình (ghi chú dịch vụ, kho tri thức trợ lý) = N1.
- **R4 — Cột dùng chung cho doanh nghiệp và hộ kinh doanh / cá nhân:** `pty_organization.legal_name`, `tax_code`, `address`, `invoice_email` = N2 (MST không nằm trong danh sách N3 nguyên văn của 5.20; nhật ký vẫn cấm MST theo 5.12). Số, khoá số, nơi cấp của `pty_organization_document` = N3 (5.20 ghi "số giấy phép của hộ kinh doanh" là N3). Nơi cấp giấy tờ người = N3 (khớp chú thích migration `0032`: "Số và nơi cấp … không bao giờ vào nhật ký"). `pty_bank_account.*` = N1 (chỉ hồ sơ công ty chủ, theo §2.8).
- **R5 — N4 không dò trên D1 production.** Dò N4 phải so từng giá trị băm với mọi dòng nhật ký (≈ số tài khoản × số dòng nhật ký) — quá nặng cho bước `audit-invariants --db remote` của `npm run trien-khai` (lỗi chạy = thoát mã 2, chặn phát hành). N4 dò trong bài chạy cả ứng dụng (`tests/audit/nhat-ky-hang.mjs`); N3 dò cả hai nơi (bài toàn tuyến + `R-PTY-4`/`R-PD-1`).
- **R6 — Cấp bậc cho `party.personal.view`:** Quản trị không thấy ngày sinh / địa chỉ của hồ sơ gắn tài khoản mình không quản được (Quản trị khác, Toàn quyền) — theo `TRANG-GHEP.md` §2 ("Quản trị theo cấp bậc"); ADR-0122 không nói, chọn phía siết.
- **R7 — Chính chủ xem được của mình nhưng KHÔNG ghi trực tiếp** (kể cả Toàn quyền): Hiến chương 5.23 coi giá trị chủ thể tự khai là đề xuất, phải người khác xác minh. Ghi của chính mình → 403 `personal_self`.
- **R8 — `ADDRESS` chỉ cho hồ sơ CÁ NHÂN** (địa chỉ tổ chức ở `pty_organization.address` — một nơi, N7): route trả 400, CSDL có trigger. Chuẩn hoá: NFC, gộp khoảng trắng, chữ thường; tối đa 200 ký tự (CHECK có sẵn của `pty_contact_point.value`).
- **R9 — Gộp hồ sơ (ADR-0068):** liên hệ `ADDRESS` đi theo như mọi liên hệ khác (mã gộp xử lý liên hệ theo loại chung; chỉ Quản trị, Toàn quyền gộp được và họ giữ ô mới); ngày sinh KHÔNG chép sang hồ sơ chính (ở lại hồ sơ phụ, chỉ đọc). Ghi nợ: chủ muốn chép thì làm ở lát sau.
- **R10 — Ngày sinh:** từ `1900-01-01` tới hôm nay giờ VN. `CHECK` chỉ chặn sai lịch và trước 1900 (SQLite từ chối `date('now')` trong `CHECK` — đã thử: "non-deterministic use of date() in a CHECK constraint"); "không ở tương lai" kiểm ở mã (`kiemNgaySinh`).
- **R11 — Không có màn nhập ở H-1.** Chỉ API: Quản trị / Toàn quyền gửi `birthDate`, liên hệ `kind: "ADDRESS"`. Giao diện chỉ đổi nhãn "Địa chỉ" ở bảng liên hệ Danh bạ (để không hiện nhầm "Email").
- **R12 — Gửi trường riêng tư khi không có quyền ⇒ 403, không lặng lẽ bỏ qua.** 403 trả SAU khi đọc thân (phải đọc thân mới biết có trường đó); ô ghi chung (`party.write`…) vẫn hỏi TRƯỚC như cũ.
- **R13 — Mã lý do từ chối** (`pty_verification.reason_code`): chỉ `CHECK` khuôn mã; danh sách đóng sống ở mã (lát H-4), không `CHECK` liệt kê.
- **R14 — Cờ "Toàn quyền là chốt cuối"** (`verifier_touched_account`, ADR-0125 đ5) thêm ngay vì nghĩa đã chốt ở ADR đã duyệt.
- **R15 — `CAN_XAC_MINH_LAI` chưa gắn vào đường sửa ở H-1** (chưa có dòng `DA_XAC_MINH` nào để "mất"); gắn ở lát đầu tiên ghi `DA_XAC_MINH` (H-2).
- **R16 — Chính sách / đồng ý ở H-1 chỉ có bảng:** không gieo chính sách, không route đăng chính sách hay đồng ý, ô `party.privacy.policy` để H-4 (thêm ô mà chưa route nào hỏi thì `permission-enforcement.test.ts` đỏ).
- **R17 — Năm loại giấy tờ tổ chức gieo sẵn** (tên đề xuất, Quản trị sửa được ở H-2): `GPKD` (mã cố định, không hạn), `TRAVEL_DOMESTIC`, `TRAVEL_INTERNATIONAL`, `ACCOMMODATION`, `TRANSPORT`.
- **R18 — `erased_at` không thêm ở H-1** cho bảng giấy tờ tổ chức: lát H-5 thêm cho cả hai bảng giấy tờ cùng lúc và tạo lại trigger.
- **R19 — Chặn giấy tờ của chính công ty chủ** (`TRANG-GHEP.md` §1) làm ở route lát H-2, không trigger.
- **R20 — Trạng thái hiện tại của một dòng xác minh = dòng mới nhất**; H-1 chỉ có chỉ mục, cách xếp hoà (cùng mili-giây) quyết ở H-2.
- **R21 — Số phiên bản tạm 2.10:** `main` đang 2.8; worktree `stoic-heisenberg-72c05d` giữ 2.9; `busy-pike` cũng ghi 2.8. Phiên phát hành kiểm lại ở bước A.0 của `docs/HANDOFF-N1.md`.
- **R22 — Bảng thi hành Hiến chương dòng 5.20** (`docs/ARCHITECTURE.md`, "dựa vào kỷ luật") AI không tự sửa (N9). Sau khi người kiểm độc lập xác nhận H-0, trình chủ câu thay: *"`src/hang-du-lieu.test.ts` (mọi cột có hạng; tên dạng dữ liệu người ≥ N2; ghim tập N3/N4) + `R-PD-1`/`R-PTY-4` + `tests/audit/nhat-ky-hang.mjs`; đã quan sát chặn thật <ngày>"*.
- **R23 — Lệch số lát trong tài liệu:** bảng thi hành Hiến chương ghi 5.21 "lát H-3", 5.22 "lát H-2"; `KE-HOACH-SUY-RA.md` ghi đồng ý ở H-4, tệp ở H-3. Không sửa (luật); báo chủ trong báo cáo.
- **R24 — Nhánh khác thêm migration sau khi H-0 gộp** sẽ đỏ `src/hang-du-lieu.test.ts` tới khi gắn hạng cho cột mới (nhánh `0098` của ADR-0118 cũng vậy) — đúng thiết kế; ghi vào CHANGE-GUIDE công thức d.
- **R25 — Cờ "số GPKD lệch mã số thuế" (ADR-0122 đ2) hoãn sang H-2:** cờ dành cho người xác minh, mà H-1 chưa có route ghi giấy tờ tổ chức hay màn xác minh. Lát H-2 tính cờ ở route (so `number_key` của dòng GPKD với `pty_organization.tax_code` đã chuẩn hoá), không thêm cột lưu cờ.
- **R26 — Đường đọc ngoài `/api/parties*` đã rà (2026-10-16), không cần task riêng:** chỉ `src/modules/parties/` đọc `pty_contact_point`; không view `v_pty_*` nào chiếu giá trị liên hệ (riêng `v_pty_owner_company` chỉ chiếu Hotline / email của tổ chức, không thể là `ADDRESS`); `GET /api/parties/lookup`, `findPartiesByPhone`, `hoSoCaNhanKhop` chỉ so `PHONE`; DTO danh sách chỉ có `primaryPhone`; câu đọc liên hệ của `getPartyDetail` trả cả dòng đã đóng (route đóng liên hệ thấy được dòng `ADDRESS` để chặn). Hai chỗ trả liên hệ đủ loại là `respondParty` (lọc ở Task 5) và xem trước gộp (`admin`, chỉ Quản trị / Toàn quyền — người giữ ô mới; CHƯA kiểm cấp bậc khi hai hồ sơ gộp có gắn tài khoản cấp trên — người kiểm Task 5 xem `chanCo` ở `src/modules/parties/gop.ts`). Người kiểm Task 5 rà lại bằng `grep -rn "pty_contact_point\|contact_kind_code\|birth_date" src migrations`.

## Bản đồ tệp

| Tệp | Tạo / sửa | Việc |
|---|---|---|
| `docs/data-dictionary.json` | sửa | khoá `hangDuLieu` (H-0); 6 bảng mới + hạng cột mới (H-1) |
| `scripts/data-dictionary-lib.mjs` | sửa | sinh mục "Hạng dữ liệu cá nhân" trong `docs/DATA-DICTIONARY.md` |
| `docs/DATA-DICTIONARY.md` | sinh lại | `npm run dict` |
| `src/hang-du-lieu.test.ts` | tạo | bài sổ hạng ↔ schema |
| `scripts/audit-checks.mjs` | sửa | `COT_N3_NHAT_KY`, `R-PD-1` (H-0); `R-PTY-7…10` (H-1) |
| `src/audit-invariants.test.ts` | sửa | bài cho các kiểm mới |
| `tests/audit/nhat-ky-hang.mjs` | tạo | bộ dò nhật ký N3/N4 + sổ phụ trách |
| `src/nhat-ky-hang.test.ts` | tạo | bài cho bộ dò + sổ phụ trách |
| `src/giay-to-khong-lo-so.test.ts`, `src/hai-lop-email-khong-lo.test.ts` | sửa | gọi bộ dò ở cuối luồng |
| `migrations/0103_ho_so_mo_rong.sql` | tạo | migration H-1 |
| `src/migrations-ho-so-mo-rong.test.ts` | tạo | bài migration |
| `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts` | sửa | ô `party.personal.view` |
| `src/modules/parties/rieng-tu.ts` + `.test.ts` | tạo | luật thuần xem / ghi trường riêng tư |
| `src/shared/lien-he.ts` + `.test.ts` | tạo | nhãn loại liên hệ dùng chung (máy chủ + giao diện) |
| `src/modules/parties/rules.ts`, `rules.test.ts` | sửa | `ADDRESS`, `kiemNgaySinh`, `birthDate` trong tạo / sửa |
| `src/shared/contracts.ts` | sửa | `ContactPointDto.kind`, `PartyDto.birthDate?` |
| `src/modules/parties/repository.ts`, `index.ts` | sửa | đọc / ghi `birth_date`, lọc DTO, chặn ghi, tìm kiếm chỉ SĐT/email |
| `src/modules/parties/rieng-tu-route.test.ts` | tạo | bài route trên SQLite thật |
| `web/parties.ts` | sửa | nhãn loại liên hệ |
| `tests/e2e/ho-so-rieng-tu.mjs`, `tests/e2e/run.mjs` | tạo / sửa | kịch bản API thật |
| `src/shared/changelog.ts` | sửa | mục 2.10 |
| `docs/SO-HANG-RAO.md`, `docs/CHANGE-GUIDE.md`, `docs/SYSTEM-DESIGN.md` | sửa | tài liệu mô tả + sổ hàng rào |

## Loại việc và người kiểm

| Task | Loại | Người kiểm độc lập (vai `nguoi-kiem-doc-lap`, chỉ đọc) |
|---|---|---|
| 1. Hạng dữ liệu cho mọi cột | nhỏ (sổ dữ liệu + bài) | kiểm chung ở cuối (Task 6) |
| 2. Nhật ký không chứa N3/N4 | nhỏ (bài + kiểm chỉ đọc) | kiểm chung ở cuối |
| 3. Migration 0103 + bất biến | **VIỆC LỚN (dữ liệu)** | **bắt buộc ngay sau Task 3** |
| 4. Ô quyền + luật thuần + kiểm đầu vào | **VIỆC LỚN (quyền)** | kiểm gộp với Task 5 |
| 5. Route: lọc DTO, chặn ghi, tìm kiếm, e2e | **VIỆC LỚN (quyền)** | **bắt buộc ngay sau Task 5** |
| 6. Tài liệu, nhật ký thay đổi, bộ kiểm đủ, phá thử | nhỏ + nghiệm thu | người kiểm cuối nhánh chạy lại phá thử |

Người thi công KHÔNG tự nghiệm thu (N8): chỉ báo "đạt" dựa trên báo cáo người kiểm + test.

---

### Task 1: Hạng N0–N4 cho mọi cột (Hiến chương 5.20) — lát H-0 phần sổ

**Files:**
- Create: `src/hang-du-lieu.test.ts`
- Create (tạm, KHÔNG commit): `/tmp/sinh-hang-du-lieu.mjs`
- Modify: `docs/data-dictionary.json` (thêm khoá cuối `hangDuLieu`)
- Modify: `scripts/data-dictionary-lib.mjs` (hàm `renderDictionaryMarkdown`)
- Regenerate: `docs/DATA-DICTIONARY.md` (`npm run dict`)
- Modify: `docs/SO-HANG-RAO.md`, `docs/CHANGE-GUIDE.md` (công thức d bước 3 + công thức mới z19), `docs/SYSTEM-DESIGN.md` §5

**Interfaces:**
- Consumes: schema dựng từ `migrations/*.sql`; `docs/data-dictionary.json` (`tables`, `views`).
- Produces: khoá `hangDuLieu: Record<string, Record<string, "N0"|"N1"|"N2"|"N3"|"N4">>` trong `docs/data-dictionary.json` — Task 2, Task 3 đọc khoá này. Tập N3 lúc kết thúc task: `pty_person_document.document_number`, `.issued_place`, `.number_key`; tập N4: `aut_mfa_email_code.code_hash`, `aut_mfa_factor.secret_enc`, `aut_mfa_recovery_code.code_hash`, `aut_trusted_device.token_hash`, `staff.pin_hash`.

- [ ] **Step 1: Viết bài đỏ `src/hang-du-lieu.test.ts`**

```ts
// HÀNG RÀO HẠNG DỮ LIỆU CÁ NHÂN (Hiến chương 5.20; lát H-0 Gói 2): MỌI cột của MỌI bảng và view trong schema thật (dựng từ migrations/*.sql bằng node:sqlite)
// có ĐÚNG một hạng N0–N4 ở docs/data-dictionary.json (khoá `hangDuLieu`) và ngược lại — cột mới chưa có hạng ⇒ đỏ.
// Hai lưới chống "gắn đại N1": (1) cột có tên mang dạng dữ liệu người (SĐT, email, tên, địa chỉ, ngày sinh, IP, số giấy tờ, bí mật) phải ≥ N2, trừ NGOAI_LE_TEN có
// lý do; (2) tập N3 và tập N4 ghim nguyên văn — hạ hạng một cột giấy tờ / bí mật ⇒ đỏ; thêm cột N3/N4 ⇒ sửa bài có chủ đích (và Task 2: COT_N3_NHAT_KY, PHU_TRACH).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const HANG = ["N0", "N1", "N2", "N3", "N4"] as const;
type Hang = (typeof HANG)[number];
const THU_BAC: Record<Hang, number> = { N0: 0, N1: 1, N2: 2, N3: 3, N4: 4 };
const dict = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as { hangDuLieu?: Record<string, Record<string, string>> };

function schema(): Map<string, string[]> {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const out = new Map<string, string[]>();
  const ten = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
  for (const { name } of ten) out.set(name, (db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).map((c) => c.name));
  return out;
}
const SCHEMA = schema();
function hangCua(): Map<string, Hang> {
  const m = new Map<string, Hang>();
  for (const [obj, cot] of Object.entries(dict.hangDuLieu ?? {})) for (const [c, h] of Object.entries(cot)) m.set(`${obj}.${c}`, h as Hang);
  return m;
}

/** Tên cột mang dạng dữ liệu người. Không gồm `token` (tl_luot_hoi.token_vao… là số đếm token của trợ lý, không phải bí mật). */
const MAU_TEN_NGUOI = /(^|_)(phone|phones|email|ip|user_agent|birth|full_name|family_name|middle_name|given_name|display_name|address|document_number|number_key|pin|secret|hash)($|_)|^customer_/;
/** Cột khớp mẫu nhưng KHÔNG phải dữ liệu về con người — mỗi mục một lý do. Thêm mục = quyết định có chủ đích. */
const NGOAI_LE_TEN: Record<string, string> = {
  "company_profile.address": "cột chết của bảng công ty cũ — dữ liệu công ty, không phải người",
  "company_profile.email": "cột chết của bảng công ty cũ — dữ liệu công ty, không phải người",
  "loc_location.address": "địa chỉ NƠI CHỐN (văn phòng, bến, khách sạn) — ADR-0105",
  "v_loc_location_dia_chi.address": "view chiếu lại loc_location.address — địa chỉ nơi chốn",
  "vc_dispatch_policy.office_phone": "số điện thoại văn phòng công ty",
  "vc_vehicle_document.document_number": "số giấy tờ XE — ADR-0040 D2 chỉ coi giấy tờ của người là dữ liệu cá nhân",
};
const N3_GHIM = ["pty_person_document.document_number", "pty_person_document.issued_place", "pty_person_document.number_key"];
const N4_GHIM = ["aut_mfa_email_code.code_hash", "aut_mfa_factor.secret_enc", "aut_mfa_recovery_code.code_hash", "aut_trusted_device.token_hash", "staff.pin_hash"];

test("5.20: mọi cột của mọi bảng và view có đúng một hạng N0–N4; sổ không thừa đối tượng / cột đã mất", () => {
  assert.ok(dict.hangDuLieu, "docs/data-dictionary.json thiếu khoá hangDuLieu (Hiến chương 5.20)");
  const h = hangCua();
  const thieu: string[] = [];
  for (const [obj, cols] of SCHEMA) for (const c of cols) if (!h.has(`${obj}.${c}`)) thieu.push(`${obj}.${c}`);
  assert.deepEqual(thieu, [], "cột chưa có hạng — thêm vào hangDuLieu (công thức z19 của docs/CHANGE-GUIDE.md)");
  const thua = [...h.keys()].filter((k) => {
    const [obj, c] = k.split(".");
    return !SCHEMA.get(obj!)?.includes(c!);
  });
  assert.deepEqual(thua, [], "hạng của cột / đối tượng không còn trong schema");
  const sai = [...h.entries()].filter(([, x]) => !(HANG as readonly string[]).includes(x)).map(([k, x]) => `${k}=${x}`);
  assert.deepEqual(sai, [], "hạng chỉ nhận N0, N1, N2, N3, N4");
});

test("5.20: cột có tên mang dạng dữ liệu người không dưới N2 (trừ ngoại lệ có lý do); ngoại lệ không thừa", () => {
  const h = hangCua();
  const khop = [...h.keys()].filter((k) => MAU_TEN_NGUOI.test(k.split(".")[1]!));
  const thap = khop.filter((k) => !(k in NGOAI_LE_TEN) && THU_BAC[h.get(k)!] < 2);
  assert.deepEqual(thap, [], "cột mang tên dữ liệu người đang dưới N2");
  assert.deepEqual(Object.keys(NGOAI_LE_TEN).filter((k) => !khop.includes(k)), [], "ngoại lệ thừa (cột đã đổi tên hoặc mất)");
  for (const [k, lyDo] of Object.entries(NGOAI_LE_TEN)) assert.ok(lyDo.trim().length > 10, `${k}: thiếu lý do`);
});

test("5.20: tập N3 (định danh) và N4 (bí mật xác thực) ghim nguyên văn", () => {
  const h = hangCua();
  const theo = (x: Hang) => [...h.entries()].filter(([, v]) => v === x).map(([k]) => k).sort();
  assert.deepEqual(theo("N3"), N3_GHIM);
  assert.deepEqual(theo("N4"), N4_GHIM);
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/hang-du-lieu.test.ts`
Expected: FAIL cả ba bài; bài đầu báo `docs/data-dictionary.json thiếu khoá hangDuLieu`.

- [ ] **Step 3: Viết bộ sinh tạm `/tmp/sinh-hang-du-lieu.mjs` (KHÔNG đặt trong repo, KHÔNG commit)**

```js
// Sinh khoá hangDuLieu một lần cho docs/data-dictionary.json: mọi cột = N1, trừ các tập N2/N3/N4 dưới đây (ruling R2–R4 của kế hoạch 2026-10-16-goi-2-h0-h1).
// Dùng: node /tmp/sinh-hang-du-lieu.mjs <thư mục worktree>
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = process.argv[2];
const db = new DatabaseSync(":memory:");
for (const f of readdirSync(`${ROOT}/migrations`).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(`${ROOT}/migrations/${f}`, "utf8"));

const N2 = new Set([
  "audit_log.detail", "aut_mfa_email_code.email_hash", "aut_mfa_factor.email", "aut_passkey.label", "aut_session.device_label", "aut_session.ip",
  "aut_session.user_agent", "aut_trusted_device.label", "bil_accounting_entry.reason", "bil_adjustment_request.reason", "bil_deposit_approval.reason",
  "bil_outside_refund.reason", "bil_payment_receipt.note", "bil_posting.reason", "dsp_assignment.place_text", "fbk_message.body", "fbk_ticket.context",
  "fbk_ticket.title", "ky_period_close.note", "login_attempt.key", "mnt_setting.allowed_phones", "ntf_notice.noi_dung", "ntf_notice.tieu_de",
  "ntf_push_sub.endpoint", "ntf_push_sub.thiet_bi", "ord_cancel_reason.note", "ord_passenger.birth_year", "ord_passenger.full_name", "ord_passenger.person_key",
  "ord_service_terms.reason", "ord_transfer_leg.dropoff_place", "ord_transfer_leg.pickup_place", "ord_transfer_leg.short_notice_note",
  "order_service.checkin_place", "order_service.note", "order_service.pickup_place", "orders.customer_email", "orders.customer_name", "orders.customer_note",
  "orders.customer_phone", "orders.payment_note", "prc_commission_rule.note", "prc_supply_term.note", "pty_contact_point.value",
  "pty_contact_point.value_normalized", "pty_organization.address", "pty_organization.invoice_email", "pty_organization.legal_name", "pty_organization.tax_code",
  "pty_party.display_name", "pty_person.family_name", "pty_person.gender", "pty_person.given_name", "pty_person.middle_name", "staff.full_name", "staff.phone",
  "stf_permission_adjustment.reason", "tl_hoi_dap.cau_hoi", "tl_hoi_dap.tra_loi", "vc_rental_rate.note", "vc_transfer_request.meet_place_text",
  "vc_trip_allocation.passenger_key", "vc_trip_cost_line.note", "vc_trip_stop.place_text",
  "v_aud_order_change.detail", "v_dsp_order_handler.label", "v_ord_passenger_key.person_key", "v_ord_passenger_row.person_key", "v_pty_party_label.display_name",
  "v_pty_party_label.sort_key", "v_pty_person_xung_ho.gender", "v_pty_person_xung_ho.given_name", "v_stf_staff_label.label", "v_stf_staff_xung_ho.gender",
  "v_stf_staff_xung_ho.given_name",
]);
const N3 = new Set(["pty_person_document.document_number", "pty_person_document.number_key", "pty_person_document.issued_place"]);
const N4 = new Set(["staff.pin_hash", "aut_mfa_factor.secret_enc", "aut_mfa_recovery_code.code_hash", "aut_mfa_email_code.code_hash", "aut_trusted_device.token_hash"]);

const path = `${ROOT}/docs/data-dictionary.json`;
const text = readFileSync(path, "utf8");
const dict = JSON.parse(text);
if (dict.hangDuLieu) throw new Error("sổ đã có hangDuLieu — không chạy lại");
const names = [...dict.tables.map((t) => t.name), ...dict.views.map((v) => v.name)].sort();
const cotCua = (n) => db.prepare(`PRAGMA table_info(${n})`).all().map((c) => c.name);
const coThat = new Set(names.flatMap((n) => cotCua(n).map((c) => `${n}.${c}`)));
for (const k of [...N2, ...N3, ...N4]) if (!coThat.has(k)) throw new Error(`không có cột ${k} — sửa danh sách`);
const dong = names.map((n) => {
  const cap = cotCua(n).map((c) => {
    const k = `${n}.${c}`;
    return `${JSON.stringify(c)}: "${N4.has(k) ? "N4" : N3.has(k) ? "N3" : N2.has(k) ? "N2" : "N1"}"`;
  });
  return `    ${JSON.stringify(n)}: { ${cap.join(", ")} }`;
});
const cuoi = text.lastIndexOf("\n  ]\n}");
if (cuoi < 0) throw new Error("không thấy đuôi mảng integrityEdges");
const moi = `${text.slice(0, cuoi)}\n  ],\n  "hangDuLieu": {\n${dong.join(",\n")}\n  }\n}\n`;
JSON.parse(moi);
writeFileSync(path, moi);
console.log(`đã ghi hạng cho ${names.length} đối tượng, ${coThat.size} cột`);
```

- [ ] **Step 4: Chạy bộ sinh**

Run: `node /tmp/sinh-hang-du-lieu.mjs /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/ho-so-rieng-tu-2fa`
Expected: `đã ghi hạng cho 164 đối tượng, 1478 cột` (số có thể lệch nếu `main` đổi — miễn không ném lỗi). Nếu ném `không có cột …`: DỪNG, báo điều phối (không tự đoán cột thay thế).

- [ ] **Step 5: Thêm mục hạng vào bản sinh tài liệu** — `scripts/data-dictionary-lib.mjs`, chèn ngay TRƯỚC dòng `out.push("");` cuối cùng trước `return out.join("\n");`... cụ thể: thay khối cuối hàm

```js
  out.push("## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)", "");
  for (const e of dict.integrityEdges) out.push(`- \`${e.fromTable}\` → \`${e.toTable}\` — ${e.note}`);
  out.push("");
  return out.join("\n");
```

bằng

```js
  out.push("## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)", "");
  for (const e of dict.integrityEdges) out.push(`- \`${e.fromTable}\` → \`${e.toTable}\` — ${e.note}`);
  out.push("");
  if (dict.hangDuLieu) {
    out.push(
      "## Hạng dữ liệu cá nhân (Hiến chương 5.20)",
      "",
      "> N0 công khai · N1 nội bộ · N2 cá nhân cơ bản · N3 định danh · N4 bí mật xác thực. Mọi cột **không** liệt kê dưới đây là **N1**. Bài `src/hang-du-lieu.test.ts` đòi mọi cột của mọi bảng và view có hạng.",
      "",
      "| Đối tượng | N0 | N2 | N3 | N4 |",
      "|---|---|---|---|---|",
    );
    for (const [ten, cot] of Object.entries(dict.hangDuLieu)) {
      if (Object.values(cot).every((x) => x === "N1")) continue;
      const theo = (h) => Object.entries(cot).filter(([, x]) => x === h).map(([c]) => `\`${c}\``).join(", ");
      out.push(`| \`${ten}\` | ${theo("N0")} | ${theo("N2")} | ${theo("N3")} | ${theo("N4")} |`);
    }
    out.push("");
  }
  return out.join("\n");
```

- [ ] **Step 6: Sinh lại tài liệu và chạy bài**

Run: `npm run dict && node --test src/hang-du-lieu.test.ts src/architecture.test.ts src/migrations-giay-to-cua-nguoi.test.ts src/migrations-van-chuyen-xe.test.ts src/migrations-chinh-sach-dieu-phoi.test.ts src/migrations-nha-xe-doi-tac.test.ts`
Expected: PASS hết (bài `docs/DATA-DICTIONARY.md khớp bản sinh` xanh; ba bài `deepEqual` mục bảng không đổi).

- [ ] **Step 7: Tài liệu mô tả + sổ hàng rào**

`docs/CHANGE-GUIDE.md` công thức d, bước 3 — thay câu

```
3. `docs/data-dictionary.json` (bảng: `name`, `module`, `kind`, `legacy?`; view: `columns`; `integrityEdges`; `deprecatedColumns`) → `npm run dict` (sinh `docs/DATA-DICTIONARY.md`).
```

bằng

```
3. `docs/data-dictionary.json` (bảng: `name`, `module`, `kind`, `legacy?`; view: `columns`; `integrityEdges`; `deprecatedColumns`; **hạng từng cột ở `hangDuLieu` — công thức z19**) → `npm run dict` (sinh `docs/DATA-DICTIONARY.md`). Cột mới (kể cả ở nhánh gộp sau) chưa có hạng thì `src/hang-du-lieu.test.ts` đỏ — đúng thiết kế.
```

Thêm công thức mới ngay trước `## 3. Ma trận "đổi cái gì → chạy kiểm nào"`:

```
### z19. Hạng dữ liệu cá nhân của một cột (Hiến chương 5.20 — lát H-0 Gói 2)

**Khi nào:** thêm / đổi tên cột hay view; đổi nghĩa một cột sang chứa dữ liệu người.

**Làm:**
1. `docs/data-dictionary.json` → `hangDuLieu["<bảng hoặc view>"]["<cột>"]` = `N0` công khai · `N1` nội bộ (mọi cột không về con người) · `N2` cá nhân cơ bản (tên, SĐT, email, địa chỉ, ngày sinh, năm sinh, giới tính, IP, thông tin máy, **mọi chữ tự do**) · `N3` định danh (số / nơi cấp giấy tờ của người, số giấy phép tổ chức, ảnh giấy tờ) · `N4` bí mật xác thực (băm PIN, khoá, mã một lần). Cột dùng chung doanh nghiệp / hộ kinh doanh lấy hạng cao hơn. `npm run dict`.
2. Cột N3 mới: thêm khoá vào `COT_N3_NHAT_KY` của `scripts/audit-checks.mjs` (kiểm `R-PD-1` dò nhật ký production) và vào `PHU_TRACH` hoặc `MIEN` (kèm lý do) của `tests/audit/nhat-ky-hang.mjs`; sửa `N3_GHIM` của `src/hang-du-lieu.test.ts`.
3. Cột N4 mới: vào `PHU_TRACH`/`MIEN` của `tests/audit/nhat-ky-hang.mjs` và `N4_GHIM`. N4 KHÔNG dò trên D1 production (ruling R5 của kế hoạch 2026-10-16-goi-2-h0-h1).
4. Cột có tên dạng dữ liệu người (`*_phone`, `*_email`, `address`…) mà thật không về con người: thêm vào `NGOAI_LE_TEN` của `src/hang-du-lieu.test.ts` kèm lý do.

**Kiểm:** `node --test src/hang-du-lieu.test.ts src/nhat-ky-hang.test.ts src/audit-invariants.test.ts src/architecture.test.ts`.
```

`docs/SYSTEM-DESIGN.md` §5 — thêm đoạn cuối mục:

```
**Hạng dữ liệu cá nhân (Hiến chương 5.20, từ lát H-0 Gói 2).** Mỗi cột của mỗi bảng và view mang một hạng N0–N4 ở `docs/data-dictionary.json` (khoá `hangDuLieu`; bản đọc: mục cuối `docs/DATA-DICTIONARY.md`). Bài `src/hang-du-lieu.test.ts` đỏ khi cột mới chưa có hạng. Nhật ký không chứa giá trị N3/N4: kiểm dữ liệu `R-PTY-4`, `R-PD-1` (N3, chạy cả production) và bộ dò `tests/audit/nhat-ky-hang.mjs` trong các bài chạy cả ứng dụng (N3 + N4).
```

`docs/SO-HANG-RAO.md` — thêm dòng cuối bảng:

```
| `src/hang-du-lieu.test.ts` (lát H-0 Gói 2, Hiến chương 5.20) | Cột mới chứa dữ liệu người lọt vào mà không phân hạng; cột tên người / SĐT / giấy tờ bị gắn hạng thấp cho nhanh; hạ hạng một cột giấy tờ hay bí mật | So schema thật (mọi bảng + view, dựng từ migrations) với `hangDuLieu` của sổ dữ liệu; mẫu tên dữ liệu người phải ≥ N2 trừ `NGOAI_LE_TEN`; tập N3, N4 ghim nguyên văn | Chưa ghi nhận — phá thử ở Task 6 của `docs/superpowers/plans/2026-10-16-goi-2-h0-h1-ke-hoach.md` (xoá hạng một cột → đỏ; `orders.customer_phone` đổi N1 → đỏ; `pty_person_document.number_key` đổi N2 → đỏ; hoàn nguyên) | Không chặn: cột tên vô nghĩa mà chứa dữ liệu người rồi bị gắn N1 (dựa vào người duyệt) |
```

- [ ] **Step 8: Chạy bộ kiểm chính và kiểu**

Run: `npm test && npm run typecheck`
Expected: xanh; typecheck 0 lỗi.

- [ ] **Step 9: Commit**

```bash
git add src/hang-du-lieu.test.ts docs/data-dictionary.json scripts/data-dictionary-lib.mjs docs/DATA-DICTIONARY.md docs/SO-HANG-RAO.md docs/CHANGE-GUIDE.md docs/SYSTEM-DESIGN.md
git commit -m "Hạng dữ liệu cá nhân N0–N4 cho mọi cột (Hiến chương 5.20, lát H-0)

Vì sao: điều 5.20 đòi mỗi cột về con người mang một hạng và cột mới chưa có hạng thì
bài kiểm đỏ. Sổ dữ liệu thêm khoá hangDuLieu phủ mọi bảng và view; bài mới so với schema
thật, chặn gắn hạng thấp cho cột mang tên dữ liệu người, ghim tập N3/N4."
```
(Thêm hai dòng đồng tác giả theo môi trường.)

---

### Task 2: Nhật ký không chứa giá trị N3/N4 — lát H-0 phần nhật ký

**Files:**
- Modify: `scripts/audit-checks.mjs` (hằng `COT_N3_NHAT_KY`, kiểm `R-PD-1`)
- Modify: `src/audit-invariants.test.ts` (import thêm `COT_N3_NHAT_KY`; hai bài)
- Create: `tests/audit/nhat-ky-hang.mjs`
- Create: `src/nhat-ky-hang.test.ts`
- Modify: `src/giay-to-khong-lo-so.test.ts`, `src/hai-lop-email-khong-lo.test.ts` (gọi bộ dò ở cuối luồng)
- Modify: `docs/SO-HANG-RAO.md`

**Interfaces:**
- Consumes: `hangDuLieu` (Task 1).
- Produces: `export const COT_N3_NHAT_KY: Record<string, { kiem: "R-PTY-4" | "R-PD-1"; chuanHoa?: boolean }>` (scripts/audit-checks.mjs); `export function cotN3N4(): string[]`, `export const PHU_TRACH: Record<string, string>`, `export const MIEN: Record<string, string>`, `export function doNhatKyHang(sqlite, phaiCoDuLieu: string[]): { lo: string[]; rong: string[] }` (tests/audit/nhat-ky-hang.mjs). Task 3 thêm khoá vào `COT_N3_NHAT_KY` và `MIEN`.

- [ ] **Step 1: Viết bài đỏ ở `src/audit-invariants.test.ts`**

Đổi dòng import kiểm (đầu tệp):

```ts
const { CHECKS, COT_N3_NHAT_KY } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as {
  CHECKS: Check[];
  COT_N3_NHAT_KY: Record<string, { kiem: string; chuanHoa?: boolean }>;
};
```

Thêm ngay sau bài `R-PTY-4 (ADR-0040 D2): …`:

```ts
test("R-PD-1 + COT_N3_NHAT_KY (Hiến chương 5.20): tập khoá = mọi cột BẢNG hạng N3 của sổ dữ liệu; kiểm được giao có thật; cột giao R-PD-1 có trong câu SQL", () => {
  const sd = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as { tables: { name: string }[]; hangDuLieu: Record<string, Record<string, string>> };
  const bang = new Set(sd.tables.map((t) => t.name));
  const n3 = Object.entries(sd.hangDuLieu)
    .filter(([o]) => bang.has(o))
    .flatMap(([o, c]) => Object.entries(c).filter(([, h]) => h === "N3").map(([k]) => `${o}.${k}`))
    .sort();
  assert.deepEqual(Object.keys(COT_N3_NHAT_KY).sort(), n3, "cột N3 mới phải có dòng ở COT_N3_NHAT_KY (scripts/audit-checks.mjs)");
  const pd = one("R-PD-1");
  assert.equal(pd.level, "warn-unless-strict");
  assert.match(pd.note ?? "", /dữ liệu cá nhân/);
  for (const [cot, v] of Object.entries(COT_N3_NHAT_KY)) {
    one(v.kiem);
    if (v.kiem !== "R-PD-1") continue;
    const [b, c] = cot.split(".");
    assert.ok(pd.sql.includes(`FROM ${b} x WHERE x.${c} IS NOT NULL`), `${cot} chưa có trong câu R-PD-1`);
  }
});

test("R-PD-1: nơi cấp giấy tờ người lọt nhật ký → 1; nhật ký chỉ có tên loại, ngày → 0", () => {
  const c = one("R-PD-1");
  const db = build();
  const id = giayToNguoi(db, { party: "pty-s-an", key: "079888777666" });
  db.prepare("UPDATE pty_person_document SET issued_place = ? WHERE id = ?").run("NOI CAP DANH DAU 77", id);
  const log = (lid: string, detail: string) =>
    db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES (?, 'party_document_added', 'party', 'pty-s-an', ?, ?)").run(lid, detail, T1);
  log("l-1", "Căn cước công dân (CCCD), hết hạn 2030-01-01");
  assert.equal(violations(db, c), 0);
  log("l-2", "nơi cấp NOI CAP DANH DAU 77");
  assert.equal(violations(db, c), 1);
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/audit-invariants.test.ts`
Expected: FAIL hai bài mới (`COT_N3_NHAT_KY` là `undefined`; `phải có đúng một kiểm R-PD-1`).

- [ ] **Step 3: Thêm hằng và kiểm vào `scripts/audit-checks.mjs`** — đặt hằng và đoạn dựng câu ngay TRƯỚC `export const CHECKS = [`:

```js
/**
 * Cột hạng N3 (Hiến chương 5.20) → kiểm nào dò cột đó trong audit_log.detail. `src/audit-invariants.test.ts` đòi tập khoá BẰNG tập cột BẢNG hạng N3 của
 * docs/data-dictionary.json (khoá hangDuLieu) — thêm cột N3 mà quên ở đây ⇒ đỏ. `chuanHoa: true` = so detail đã bỏ khoảng trắng . - / và viết HOA (cột đã chuẩn
 * hoá như number_key). N4 (bí mật xác thực) KHÔNG dò ở đây: phải so từng giá trị băm với mọi dòng nhật ký — quá nặng cho bước kiểm của `npm run trien-khai`;
 * N4 dò ở bài chạy cả ứng dụng (tests/audit/nhat-ky-hang.mjs).
 */
export const COT_N3_NHAT_KY = {
  "pty_person_document.document_number": { kiem: "R-PTY-4" }, // R-PTY-4 dò qua number_key (cùng số, đã chuẩn hoá)
  "pty_person_document.number_key": { kiem: "R-PTY-4" },
  "pty_person_document.issued_place": { kiem: "R-PD-1", chuanHoa: false },
};
const DETAIL_CHUAN = "upper(replace(replace(replace(replace(a.detail, ' ', ''), '.', ''), '-', ''), '/', ''))";
const DO_COT_N3 = Object.entries(COT_N3_NHAT_KY)
  .filter(([, v]) => v.kiem === "R-PD-1")
  .map(([cot, v]) => {
    const [bang, ten] = cot.split(".");
    return `EXISTS (SELECT 1 FROM ${bang} x WHERE x.${ten} IS NOT NULL AND length(x.${ten}) >= 8 AND instr(${v.chuanHoa ? DETAIL_CHUAN : "a.detail"}, x.${ten}) > 0)`;
  });
```

Thêm phần tử vào mảng `CHECKS`, ngay sau phần tử `R-PTY-4`:

```js
  // R-PD-1 (Hiến chương 5.20, lát H-0 Gói 2): nhật ký không chứa giá trị cột hạng N3 nào khác ngoài số giấy tờ người (đã có R-PTY-4). Danh sách cột: COT_N3_NHAT_KY.
  // Mức warn-unless-strict như R-PTY-4: nhật ký chỉ-thêm — một dòng lỡ ghi không xoá được, "fail" sẽ chặn vĩnh viễn mọi lần triển khai sau.
  {
    code: "R-PD-1",
    what: "nhật ký không chứa giá trị cột hạng N3 (nơi cấp giấy tờ, giấy phép tổ chức…)",
    sql: `SELECT count(*) FROM audit_log a WHERE a.detail IS NOT NULL AND (${DO_COT_N3.join(" OR ")})`,
    level: "warn-unless-strict",
    note: "nhật ký chỉ-thêm — không gỡ được; báo chủ dự án ngay, đây là dữ liệu cá nhân hạng N3 lọt vào nhật ký (tìm route ghi sai)",
  },
```

- [ ] **Step 4: Chạy lại**

Run: `node --test src/audit-invariants.test.ts`
Expected: PASS (kể cả bài "dữ liệu khoẻ: MỌI kiểm … 0 vi phạm").

- [ ] **Step 5: Viết bài đỏ cho bộ dò — `src/nhat-ky-hang.test.ts`**

```ts
// Bài đi kèm tests/audit/nhat-ky-hang.mjs (Hiến chương 5.20: nhật ký không chứa dữ liệu hạng N3, N4; lát H-0 Gói 2). Ba việc:
//  (1) MỌI cột BẢNG hạng N3/N4 của sổ dữ liệu có bài chạy cả ứng dụng chịu trách nhiệm sinh dữ liệu thật (PHU_TRACH) hoặc có tên ở MIEN kèm lý do — thêm cột
//      N3/N4 mà quên ⇒ đỏ;
//  (2) mỗi tệp ở PHU_TRACH thật sự gọi `doNhatKyHang(` và nhắc đúng tên cột (không khai suông);
//  (3) bộ dò bắt đúng: giá trị băm nằm trong detail ⇒ lộ; số giấy tờ viết cách quãng ⇒ vẫn lộ; detail sạch ⇒ không; cột phụ trách rỗng ⇒ báo "rỗng".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { MIEN, PHU_TRACH, cotN3N4, doNhatKyHang } from "../tests/audit/nhat-ky-hang.mjs";

test("(1) mọi cột N3/N4 có bài phụ trách hoặc được miễn có lý do; không trùng, không thừa", () => {
  const cot = cotN3N4() as string[];
  assert.ok(cot.length >= 8, `sổ dữ liệu phải có ít nhất 8 cột N3/N4, thấy ${cot.length}`);
  const pt = Object.keys(PHU_TRACH);
  const mien = Object.keys(MIEN);
  assert.deepEqual(pt.filter((k) => mien.includes(k)), [], "một cột không vừa phụ trách vừa miễn");
  assert.deepEqual([...pt, ...mien].sort(), cot);
  for (const [k, ly] of Object.entries(MIEN)) assert.ok(String(ly).trim().length > 10, `${k}: miễn phải có lý do`);
});

test("(2) tệp phụ trách thật sự gọi doNhatKyHang và nhắc tên cột trong danh sách phải có dữ liệu", () => {
  for (const [cot, tep] of Object.entries(PHU_TRACH) as [string, string][]) {
    const src = readFileSync(new URL(`../${tep}`, import.meta.url), "utf8");
    assert.match(src, /doNhatKyHang\(/, `${tep} chưa gọi doNhatKyHang`);
    assert.ok(src.includes(`"${cot}"`), `${tep} chưa nhắc "${cot}"`);
  }
});

function schema(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  return db;
}

test("(3) bộ dò: băm trong detail ⇒ lộ; số viết cách quãng ⇒ lộ; detail sạch ⇒ không; cột phụ trách rỗng ⇒ rỗng", () => {
  const db = schema();
  const AT = "2026-10-16T01:00:00.000Z";
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-1', 'PERSON', 'An', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-1', 'An', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s-1', '', '0900000001', 'pbkdf2$100000$MUOIBAYKYTU$abcdef0123456789', 'sales', 1, '${AT}', 'p-1')`);
  db.exec(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('d-1', 'p-1', 'CCCD', '079 888 777 666', '079888777666', '${AT}', '${AT}')`);
  const log = (id: string, detail: string) =>
    db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES (?, 'party_updated', 'party', 'p-1', ?, ?)").run(id, detail, AT);
  log("l-1", "cá nhân — đổi giới tính");
  let r = doNhatKyHang(db, ["staff.pin_hash", "pty_person_document.number_key", "aut_trusted_device.token_hash"]) as { lo: string[]; rong: string[] };
  assert.deepEqual(r.lo, []);
  assert.deepEqual(r.rong, ["aut_trusted_device.token_hash"]);
  log("l-2", "lỡ ghi pbkdf2$100000$MUOIBAYKYTU$abcdef0123456789");
  log("l-3", "CCCD 079.888.777-666");
  r = doNhatKyHang(db, []) as { lo: string[]; rong: string[] };
  assert.equal(r.lo.filter((x) => x.startsWith("staff.pin_hash ")).length, 1);
  assert.ok(r.lo.some((x) => x.startsWith("pty_person_document.number_key ")));
  assert.ok(r.lo.every((x) => !x.includes("079888777666") && !x.includes("abcdef0123456789")), "thông báo lộ không được in lại giá trị");
});
```

- [ ] **Step 6: Chạy để thấy đỏ**

Run: `node --test src/nhat-ky-hang.test.ts`
Expected: FAIL — `Cannot find module '…/tests/audit/nhat-ky-hang.mjs'`.

- [ ] **Step 7: Viết bộ dò `tests/audit/nhat-ky-hang.mjs`**

```js
// Bộ dò "nhật ký không chứa dữ liệu hạng N3, N4" (Hiến chương 5.20; lát H-0 Gói 2) — gọi ở CUỐI các bài chạy cả ứng dụng trên SQLite thật.
// Nguồn hạng: docs/data-dictionary.json (khoá hangDuLieu). Chỉ xét cột của BẢNG (view chiếu lại cột bảng). Giá trị dưới 8 ký tự bỏ qua (dễ trùng ngẫu nhiên).
// N4 chỉ dò ở đây, không dò trên D1 production (scripts/audit-checks.mjs): phải so từng giá trị băm với mọi dòng nhật ký — quá nặng cho bước kiểm của
// `npm run trien-khai`. N3 còn có kiểm dữ liệu R-PTY-4 / R-PD-1.
import { readFileSync } from "node:fs";

const DICT = JSON.parse(readFileSync(new URL("../../docs/data-dictionary.json", import.meta.url), "utf8"));
const BANG = new Set(DICT.tables.map((t) => t.name));

/** Mọi cột BẢNG hạng N3/N4, dạng "bảng.cột", đã sắp xếp. */
export function cotN3N4() {
  const out = [];
  for (const [obj, cot] of Object.entries(DICT.hangDuLieu ?? {})) {
    if (!BANG.has(obj)) continue;
    for (const [c, h] of Object.entries(cot)) if (h === "N3" || h === "N4") out.push(`${obj}.${c}`);
  }
  return out.sort();
}

/** Cột N3/N4 → bài chạy cả ứng dụng sinh dữ liệu THẬT cho cột đó (qua route) rồi gọi doNhatKyHang với cột trong danh sách phải có dữ liệu. */
export const PHU_TRACH = {
  "pty_person_document.document_number": "src/giay-to-khong-lo-so.test.ts",
  "pty_person_document.number_key": "src/giay-to-khong-lo-so.test.ts",
  "pty_person_document.issued_place": "src/giay-to-khong-lo-so.test.ts",
  "staff.pin_hash": "src/hai-lop-email-khong-lo.test.ts",
  "aut_mfa_factor.secret_enc": "src/hai-lop-email-khong-lo.test.ts",
  "aut_mfa_recovery_code.code_hash": "src/hai-lop-email-khong-lo.test.ts",
  "aut_mfa_email_code.code_hash": "src/hai-lop-email-khong-lo.test.ts",
  "aut_trusted_device.token_hash": "src/hai-lop-email-khong-lo.test.ts",
};

/** Cột N3/N4 chưa có route ghi nên chưa bài nào sinh được dữ liệu thật — kèm lý do và lát sẽ chuyển sang PHU_TRACH. */
export const MIEN = {};

const chuan = (s) => s.normalize("NFC").toUpperCase().replace(/[\s.\-/]/g, "");

/**
 * Dò mọi giá trị của mọi cột N3/N4 trong audit_log.detail (nguyên văn, hoặc đã bỏ khoảng trắng . - / và viết HOA).
 * `phaiCoDuLieu`: các cột bài gọi chịu trách nhiệm — cột nào không có giá trị ≥ 8 ký tự thì vào `rong` (chống bài rỗng).
 * Thông báo lộ KHÔNG in lại giá trị.
 */
export function doNhatKyHang(sqlite, phaiCoDuLieu) {
  const nhatKy = sqlite.prepare("SELECT id, action, detail FROM audit_log WHERE detail IS NOT NULL").all();
  const lo = [];
  const rong = [];
  for (const cot of cotN3N4()) {
    const [bang, ten] = cot.split(".");
    const giaTri = sqlite.prepare(`SELECT DISTINCT "${ten}" AS v FROM "${bang}" WHERE "${ten}" IS NOT NULL AND length("${ten}") >= 8`).all().map((r) => String(r.v));
    if (phaiCoDuLieu.includes(cot) && giaTri.length === 0) rong.push(cot);
    for (const v of giaTri) {
      const vc = chuan(v);
      for (const r of nhatKy) {
        const d = String(r.detail);
        if (d.includes(v) || (vc.length >= 8 && chuan(d).includes(vc))) lo.push(`${cot} lộ ở nhật ký ${r.action} (${r.id})`);
      }
    }
  }
  return { lo, rong };
}
```

- [ ] **Step 8: Chạy bài bộ dò — bài (1)(3) xanh, bài (2) đỏ**

Run: `node --test src/nhat-ky-hang.test.ts`
Expected: (1) và (3) PASS; (2) FAIL `src/giay-to-khong-lo-so.test.ts chưa gọi doNhatKyHang`.

- [ ] **Step 9: Gọi bộ dò trong hai bài toàn tuyến**

`src/giay-to-khong-lo-so.test.ts`: thêm import ngay dưới dòng import harness:

```ts
import { doNhatKyHang } from "../tests/audit/nhat-ky-hang.mjs";
```

và chèn ngay trước `});` đóng bài test THỨ NHẤT (bài tên "số giấy tờ của người chỉ rời máy chủ ở 'xem đủ số' …"):

```ts
  // Hiến chương 5.20 (lát H-0 Gói 2): dò MỌI cột N3/N4 của sổ dữ liệu trong nhật ký; bài này chịu trách nhiệm sinh dữ liệu thật cho cột giấy tờ người.
  const dsN3 = doNhatKyHang(w.sqlite, ["pty_person_document.document_number", "pty_person_document.number_key", "pty_person_document.issued_place"]);
  assert.deepEqual(dsN3.rong, [], "bài rỗng: cột N3 phụ trách chưa có dữ liệu thật");
  assert.deepEqual(dsN3.lo, [], "nhật ký chứa giá trị hạng N3/N4");
```

`src/hai-lop-email-khong-lo.test.ts`: thêm import ngay dưới dòng import harness:

```ts
import { doNhatKyHang } from "../tests/audit/nhat-ky-hang.mjs";
```

và chèn ngay SAU dòng `coStatus("/api/staff", 200);`:

```ts
    // Hiến chương 5.20 (lát H-0 Gói 2): bài này chịu trách nhiệm sinh dữ liệu thật cho các cột bí mật xác thực (N4) rồi dò chúng trong nhật ký.
    const dsN4 = doNhatKyHang(w.sqlite, ["staff.pin_hash", "aut_mfa_factor.secret_enc", "aut_mfa_recovery_code.code_hash", "aut_mfa_email_code.code_hash", "aut_trusted_device.token_hash"]);
    assert.deepEqual(dsN4.rong, [], "bài rỗng: cột N4 phụ trách chưa có dữ liệu thật");
    assert.deepEqual(dsN4.lo, [], "nhật ký chứa giá trị hạng N3/N4");
```

- [ ] **Step 10: Chạy cả bốn bài**

Run: `node --test src/nhat-ky-hang.test.ts src/giay-to-khong-lo-so.test.ts src/hai-lop-email-khong-lo.test.ts src/audit-invariants.test.ts`
Expected: PASS hết. Nếu `hai-lop-email-khong-lo` báo `rong` cho một cột N4 (luồng bài không sinh cột đó): DỪNG, báo điều phối kèm tên cột — không tự chuyển cột sang `MIEN`.

- [ ] **Step 11: Sổ hàng rào** — thêm hai dòng cuối bảng `docs/SO-HANG-RAO.md`:

```
| `R-PD-1` + bài đồng bộ `COT_N3_NHAT_KY` (`scripts/audit-checks.mjs`, `src/audit-invariants.test.ts`; lát H-0 Gói 2) | Nhật ký production chứa giá trị cột hạng N3 ngoài số giấy tờ người (nơi cấp, giấy phép tổ chức); cột N3 mới thêm mà quên dò | SQL chỉ đọc mức `warn-unless-strict` (e2e `--strict` ĐỎ, `npm run trien-khai` cảnh báo); bài so tập khoá hằng với tập N3 của sổ dữ liệu | Chưa ghi nhận — phá thử ở Task 6 của kế hoạch 2026-10-16-goi-2-h0-h1 (`>= 8` → `>= 200` ⇒ ca đỏ của bài R-PD-1 thành 0 ⇒ đỏ; bỏ một khoá khỏi hằng ⇒ bài đồng bộ đỏ; hoàn nguyên) | Không dò N4 trên D1 production (ruling R5) |
| `tests/audit/nhat-ky-hang.mjs` + `src/nhat-ky-hang.test.ts` (lát H-0 Gói 2) | Giá trị N3/N4 lọt nhật ký qua route; cột N3/N4 mới không có bài nào sinh dữ liệu để dò | Bộ dò chạy cuối `src/giay-to-khong-lo-so.test.ts` (N3) và `src/hai-lop-email-khong-lo.test.ts` (N4) trên SQLite thật, đọc hạng từ sổ dữ liệu; sổ `PHU_TRACH`/`MIEN` phải phủ đủ tập N3/N4 | Chưa ghi nhận — phá thử ở Task 6 (chèn tạm một dòng nhật ký chứa `pin_hash` trước lời gọi ⇒ đỏ; xoá một khoá khỏi `PHU_TRACH` ⇒ bài (1) đỏ; hoàn nguyên) | Không chặn: route không có trong hai bài đó |
```

- [ ] **Step 12: Bộ kiểm chính + kiểu, commit**

Run: `npm test && npm run typecheck`
Expected: xanh.

```bash
git add scripts/audit-checks.mjs src/audit-invariants.test.ts tests/audit/nhat-ky-hang.mjs src/nhat-ky-hang.test.ts src/giay-to-khong-lo-so.test.ts src/hai-lop-email-khong-lo.test.ts docs/SO-HANG-RAO.md
git commit -m "Nhật ký không chứa dữ liệu hạng N3/N4: kiểm R-PD-1 và bộ dò toàn tuyến (lát H-0)

Vì sao: Hiến chương 5.20 cấm nhật ký chứa dữ liệu định danh và bí mật xác thực. Cột N3
dò cả trên dữ liệu thật (R-PD-1, danh sách đồng bộ với sổ dữ liệu); N4 dò trong bài chạy
cả ứng dụng vì so từng giá trị băm trên D1 production quá nặng."
```

---

### Task 3: Migration 0103 — ngày sinh, ADDRESS, giấy tờ tổ chức, sổ xác minh, chính sách + đồng ý (VIỆC LỚN — dữ liệu)

**Files:**
- Create: `migrations/0103_ho_so_mo_rong.sql`
- Create: `src/migrations-ho-so-mo-rong.test.ts`
- Modify: `docs/data-dictionary.json` (6 bảng mới; `hangDuLieu` cho cột mới) → `npm run dict`
- Modify: `src/hang-du-lieu.test.ts` (`N3_GHIM`), `scripts/audit-checks.mjs` (`COT_N3_NHAT_KY` + `R-PTY-7…10`), `src/audit-invariants.test.ts`, `tests/audit/nhat-ky-hang.mjs` (`MIEN`)
- Modify: `docs/SYSTEM-DESIGN.md` §5, `docs/CHANGE-GUIDE.md` (d — số kế tiếp; y — giấy tờ tổ chức), `docs/SO-HANG-RAO.md`

**Interfaces:**
- Consumes: `hangDuLieu`, `COT_N3_NHAT_KY`, `MIEN` (Task 1–2).
- Produces (schema mà Task 5 và lát H-2…H-4 dựa vào):
  - `pty_person.birth_date TEXT NULL` (`YYYY-MM-DD`, ≥ `1900-01-01`).
  - `pty_contact_kind` có dòng `ADDRESS` ("Địa chỉ"); trigger `pty_contact_point_address_person_ins/_upd` (lỗi `contact_address_person_only`).
  - `pty_organization_document_type(code PK, name, has_expiry, sort_order, active, …)` gieo `GPKD`, `TRAVEL_DOMESTIC`, `TRAVEL_INTERNATIONAL`, `ACCOMMODATION`, `TRANSPORT`.
  - `pty_organization_document(id, party_id → pty_organization, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, previous_id, voided_at, …)`; lỗi trigger `organization_document_no_delete | _superseded | _voided | _identity | _renew_mismatch | _gpkd_other_org`.
  - `pty_verification_attribute(code PK, name, applies_to ∈ {PERSON, ORGANIZATION}, sort_order, active, …)` gieo 7 dòng (Q1).
  - `pty_verification(id, party_id, target_kind ∈ {PERSON_DOCUMENT, ORG_DOCUMENT, CONTACT, ATTRIBUTE}, target_id, attribute_code → pty_verification_attribute, outcome ∈ {DA_XAC_MINH, TU_CHOI, CAN_XAC_MINH_LAI}, reason_code, verifier_touched_account, …)` chỉ-thêm; lỗi `verification_target_mismatch`, `verification_append_only`.
  - `pty_privacy_policy(id, version, purposes, body, valid_from_at, …)` chỉ-thêm, phiên bản liên tiếp (lỗi `privacy_policy_version_gap`, `privacy_policy_append_only`).
  - `pty_consent(id, party_id, policy_id, decision ∈ {DONG_Y, RUT}, …)` chỉ-thêm (lỗi `consent_withdraw_without_consent`, `consent_append_only`).

- [ ] **Step 1: Viết bài đỏ `src/migrations-ho-so-mo-rong.test.ts`**

```ts
// Kiểm migration hồ sơ mở rộng (ADR-0122 + ADR-0126 đ1; module parties; lát H-1 Gói 2): ngày sinh, liên hệ ADDRESS chỉ cho người, giấy tờ TỔ CHỨC (khuôn
// pty_person_document của 0032), sổ xác minh chỉ-thêm, chính sách riêng tư có phiên bản + đồng ý chỉ-thêm. Chèn / sửa THẲNG bằng SQL — chứng minh chặn nằm
// ở CSDL (lớp cuối nếu route có lỗ). Tệp tìm theo ĐUÔI tên. Mọi số là số GIẢ. KHÔNG gieo chính sách, KHÔNG có cột thời hạn xoá (ADR-0126 đ2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ho_so_mo_rong.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.filter((f) => f < FILE));
const AT = "2026-10-16T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));
const cotCua = (db: DatabaseSync, t: string): string[] => rows(db, `PRAGMA table_info(${t})`).map((r) => String(r.name));

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
const key = (so: string) => so.normalize("NFC").toUpperCase().replace(/[\s.\-/]/g, "");
let n = 0;
interface Doc { id?: string; party: string; type: string; so?: string | null; cap?: string | null; het?: string | null; truoc?: string | null }
function ins(db: DatabaseSync, d: Doc): string {
  const id = d.id ?? `od-${++n}`;
  const so = d.so === undefined ? null : d.so;
  db.prepare(
    `INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, previous_id,
       voided_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, NULL, ?, NULL)`,
  ).run(id, d.party, d.type, so, so === null ? null : key(so), d.cap ?? null, d.het ?? null, d.truoc ?? null, AT, AT);
  return id;
}
const huy = (db: DatabaseSync, id: string) => db.prepare("UPDATE pty_organization_document SET voided_at = ?, updated_at = ? WHERE id = ?").run(AT, "2026-10-16T04:00:00.000Z", id);
const GPKD_A = "4201 234.567"; // số GIẢ; chuẩn hoá → 4201234567
const GPKD_B = "4209999999";

test("(a) đúng một tệp *_ho_so_mo_rong.sql, không phải B5; đúng 18 trigger mới, tên pty_*; không gieo dãy ≥ 8 chữ số, không '@'", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_ho_so_mo_rong.sql, thấy ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
  const db = before();
  const truoc = new Set(triggers(db));
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.has(t)), [
    "pty_consent_no_delete", "pty_consent_no_update", "pty_consent_withdraw_ins",
    "pty_contact_point_address_person_ins", "pty_contact_point_address_person_upd",
    "pty_organization_document_gpkd_one_org_ins", "pty_organization_document_gpkd_one_org_upd", "pty_organization_document_identity",
    "pty_organization_document_no_delete", "pty_organization_document_renew_ins", "pty_organization_document_superseded", "pty_organization_document_voided",
    "pty_privacy_policy_no_delete", "pty_privacy_policy_no_update", "pty_privacy_policy_version_ins",
    "pty_verification_no_delete", "pty_verification_no_update", "pty_verification_target_ins",
  ]);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n").replace(/'2026-[0-9T:.\-Z]+'/g, "''");
  assert.doesNotMatch(code, /\d{8,}/, "không gieo số giống SĐT / số giấy tờ");
  assert.doesNotMatch(code, /@/);
});

test("(b) pty_person.birth_date: ngày dân sự từ 1900; NULL được; sai lịch / trước 1900 / sai khuôn bị CHECK chặn; dòng có sẵn = NULL", () => {
  const db = all();
  const p = nguoi(db, "p-b");
  assert.equal(rows(db, "SELECT birth_date FROM pty_person WHERE party_id = ?", p)[0]!.birth_date, null);
  const dat = (v: string | null) => db.prepare("UPDATE pty_person SET birth_date = ? WHERE party_id = ?").run(v, p);
  dat("1990-05-17");
  dat("1900-01-01");
  dat(null);
  assert.throws(() => dat("1990-02-30"), /CHECK/);
  assert.throws(() => dat("1899-12-31"), /CHECK/);
  assert.throws(() => dat("17/05/1990"), /CHECK/);
});

test("(c) loại liên hệ ADDRESS có trong danh mục; chỉ hồ sơ CÁ NHÂN — chèn cho tổ chức, đổi loại sang ADDRESS, chuyển dòng ADDRESS sang tổ chức đều bị chặn", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT name, active FROM pty_contact_kind WHERE code = 'ADDRESS'"), [{ name: "Địa chỉ", active: 1 }]);
  const p = nguoi(db, "p-c");
  const o = toChuc(db, "o-c");
  const lh = (id: string, party: string, kind: string, v: string) =>
    db.prepare(
      "INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, 1, '2026-10-16', ?, ?)",
    ).run(id, party, kind, v, v.toLowerCase(), AT, AT);
  lh("c-1", p, "ADDRESS", "12 Trần Phú, Nha Trang");
  assert.throws(() => lh("c-2", o, "ADDRESS", "12 Trần Phú, Nha Trang"), /contact_address_person_only/);
  lh("c-3", o, "EMAIL", "hoadon@vidu.vn");
  assert.throws(() => db.prepare("UPDATE pty_contact_point SET contact_kind_code = 'ADDRESS' WHERE id = 'c-3'").run(), /contact_address_person_only/);
  assert.throws(() => db.prepare("UPDATE pty_contact_point SET party_id = ? WHERE id = 'c-1'").run(o), /contact_address_person_only/);
});

test("(d) danh mục giấy tờ tổ chức: 5 loại gieo đúng thứ tự; GPKD không hạn; mọi dòng đang dùng, người tạo NULL (hệ thống)", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT code, has_expiry FROM pty_organization_document_type ORDER BY sort_order"), [
    { code: "GPKD", has_expiry: 0 },
    { code: "TRAVEL_DOMESTIC", has_expiry: 1 },
    { code: "TRAVEL_INTERNATIONAL", has_expiry: 1 },
    { code: "ACCOMMODATION", has_expiry: 1 },
    { code: "TRANSPORT", has_expiry: 1 },
  ]);
  assert.equal(rows(db, "SELECT name FROM pty_organization_document_type WHERE code = 'GPKD'")[0]!.name, "Giấy chứng nhận đăng ký kinh doanh");
  assert.deepEqual(rows(db, "SELECT count(*) AS n FROM pty_organization_document_type WHERE active <> 1 OR created_by IS NOT NULL OR updated_by IS NOT NULL"), [{ n: 0 }]);
  // Thuộc tính xác minh được là dữ liệu (câu hỏi Q1 — danh sách đề xuất): ba của người, bốn của tổ chức.
  assert.deepEqual(rows(db, "SELECT code, applies_to FROM pty_verification_attribute ORDER BY sort_order"), [
    { code: "HO_TEN", applies_to: "PERSON" },
    { code: "NGAY_SINH", applies_to: "PERSON" },
    { code: "GIOI_TINH", applies_to: "PERSON" },
    { code: "TEN_PHAP_LY", applies_to: "ORGANIZATION" },
    { code: "MA_SO_THUE", applies_to: "ORGANIZATION" },
    { code: "DIA_CHI_TO_CHUC", applies_to: "ORGANIZATION" },
    { code: "EMAIL_HOA_DON", applies_to: "ORGANIZATION" },
  ]);
});

test("(e) giấy tờ tổ chức: chỉ hồ sơ TỔ CHỨC; GPKD phải có số; hết hạn không trước ngày cấp; loại khác không số vẫn được", () => {
  const db = all();
  const p = nguoi(db, "p-e");
  const o = toChuc(db, "o-e");
  assert.throws(() => ins(db, { party: p, type: "TRANSPORT" }), /FOREIGN KEY/, "giấy tờ tổ chức cho hồ sơ người");
  assert.throws(() => ins(db, { party: o, type: "GPKD" }), /CHECK/, "GPKD thiếu số");
  assert.throws(() => ins(db, { party: o, type: "TRANSPORT", cap: "2026-09-10", het: "2026-09-01" }), /CHECK/, "hết hạn trước ngày cấp");
  ins(db, { party: o, type: "TRANSPORT", het: "2030-01-01" });
  ins(db, { party: o, type: "GPKD", so: GPKD_A });
});

test("(f) một số GPKD thuộc đúng MỘT tổ chức: tổ chức khác cùng số (viết khác cách) → chặn; chính tổ chức đó gia hạn cùng số → được; sửa số thành số tổ chức khác → chặn; huỷ → số rảnh", () => {
  const db = all();
  const a = toChuc(db, "o-a");
  const b = toChuc(db, "o-b");
  const a1 = ins(db, { party: a, type: "GPKD", so: GPKD_A });
  assert.throws(() => ins(db, { party: b, type: "GPKD", so: "4201234567" }), /organization_document_gpkd_other_org/);
  const a2 = ins(db, { party: a, type: "GPKD", so: GPKD_A, truoc: a1 });
  const b1 = ins(db, { party: b, type: "GPKD", so: GPKD_B });
  assert.throws(
    () => db.prepare("UPDATE pty_organization_document SET document_number = ?, number_key = ? WHERE id = ?").run("4201234567", "4201234567", b1),
    /organization_document_gpkd_other_org/,
  );
  huy(db, a2);
  huy(db, a1);
  ins(db, { party: b, type: "GPKD", so: GPKD_A, truoc: b1 });
});

test("(g) khuôn 0032: không sửa đè dòng đã gia hạn; dòng đã huỷ không sửa (kể cả bỏ huỷ); không đổi tổ chức / loại / dòng trước / mốc tạo; không xoá; gia hạn đúng tổ chức, đúng loại, không tách nhánh", () => {
  const db = all();
  const o = toChuc(db, "o-g");
  const q = toChuc(db, "q-g");
  const d1 = ins(db, { party: o, type: "TRANSPORT", het: "2026-12-31" });
  ins(db, { party: o, type: "TRANSPORT", het: "2027-12-31", truoc: d1 });
  assert.throws(() => db.prepare("UPDATE pty_organization_document SET expiry_date = '2027-01-31' WHERE id = ?").run(d1), /organization_document_superseded/);
  assert.throws(() => ins(db, { party: o, type: "TRANSPORT", het: "2028-12-31", truoc: d1 }), /UNIQUE constraint failed: pty_organization_document\.previous_id/);
  const d2 = ins(db, { party: o, type: "ACCOMMODATION" });
  huy(db, d2);
  assert.throws(() => db.prepare("UPDATE pty_organization_document SET voided_at = NULL WHERE id = ?").run(d2), /organization_document_voided/);
  const d3 = ins(db, { party: o, type: "ACCOMMODATION" });
  for (const [set, arg] of [["party_id = ?", q], ["document_type_code = ?", "TRANSPORT"], ["previous_id = ?", d2], ["created_at = ?", "2026-01-01T00:00:00.000Z"], ["created_by = ?", "ai-do"]] as const) {
    assert.throws(() => db.prepare(`UPDATE pty_organization_document SET ${set} WHERE id = ?`).run(arg, d3), /organization_document_identity/, set);
  }
  assert.throws(() => db.prepare("DELETE FROM pty_organization_document WHERE id = ?").run(d3), /organization_document_no_delete/);
  assert.throws(() => ins(db, { party: q, type: "ACCOMMODATION", truoc: d3 }), /organization_document_renew_mismatch/, "nối sang tổ chức khác");
  assert.throws(() => ins(db, { party: o, type: "TRANSPORT", truoc: d3 }), /organization_document_renew_mismatch/, "nối sang loại khác");
  assert.throws(() => ins(db, { party: o, type: "ACCOMMODATION", truoc: d2 }), /organization_document_renew_mismatch/, "nối vào dòng đã huỷ");
});

function xm(db: DatabaseSync, o: { id: string; party: string; kind: string; target?: string | null; attr?: string | null; outcome: string; reason?: string | null; by?: string | null; touched?: number }) {
  const by = o.by === undefined ? "s-1" : o.by;
  db.prepare(
    `INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(o.id, o.party, o.kind, o.target ?? null, o.attr ?? null, o.outcome, o.reason ?? null, o.touched ?? 0, AT, by, AT, by);
}

test("(h) pty_verification: chỉ-thêm; khuôn dòng (thuộc tính ⇔ có mã thuộc tính, không id dòng; từ chối ⇔ có mã lý do; xác minh / từ chối phải có người); dòng được xác minh phải thuộc đúng hồ sơ", () => {
  const db = all();
  const p = nguoi(db, "p-h");
  const p2 = nguoi(db, "p2-h");
  const o = toChuc(db, "o-h");
  db.prepare("INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('gd-1', ?, 'CCCD', '079000000001', '079000000001', ?, ?)").run(p, AT, AT);
  const od = ins(db, { party: o, type: "GPKD", so: GPKD_B });
  xm(db, { id: "v-1", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "DA_XAC_MINH" });
  xm(db, { id: "v-2", party: o, kind: "ORG_DOCUMENT", target: od, outcome: "TU_CHOI", reason: "ANH_MO" });
  xm(db, { id: "v-3", party: p, kind: "ATTRIBUTE", attr: "NGAY_SINH", outcome: "CAN_XAC_MINH_LAI", by: null });
  xm(db, { id: "v-4", party: o, kind: "ATTRIBUTE", attr: "MA_SO_THUE", outcome: "DA_XAC_MINH", touched: 1 });
  assert.throws(() => xm(db, { id: "v-5", party: p2, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "giấy tờ của người khác");
  assert.throws(() => xm(db, { id: "v-6", party: o, kind: "ATTRIBUTE", attr: "NGAY_SINH", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "ngày sinh của tổ chức");
  assert.throws(() => xm(db, { id: "v-7", party: p, kind: "ATTRIBUTE", attr: "TEN_PHAP_LY", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "tên pháp lý của người");
  assert.throws(() => xm(db, { id: "v-8", party: p, kind: "CONTACT", target: "khong-co", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "liên hệ không có");
  assert.throws(() => xm(db, { id: "v-8b", party: p, kind: "ATTRIBUTE", attr: "LAM_DAI", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "thuộc tính không có trong danh mục");
  db.prepare("UPDATE pty_verification_attribute SET active = 0 WHERE code = 'GIOI_TINH'").run();
  assert.throws(() => xm(db, { id: "v-8c", party: p, kind: "ATTRIBUTE", attr: "GIOI_TINH", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "thuộc tính đã ngưng");
  assert.throws(() => xm(db, { id: "v-9", party: p, kind: "ATTRIBUTE", attr: null, outcome: "DA_XAC_MINH" }), /CHECK|verification_target_mismatch/, "thuộc tính thiếu mã (trigger đích chạy trước CHECK)");
  assert.throws(() => xm(db, { id: "v-10", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", attr: "NGAY_SINH", outcome: "DA_XAC_MINH" }), /CHECK/, "dòng giấy tờ mang mã thuộc tính");
  assert.throws(() => xm(db, { id: "v-11", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "TU_CHOI" }), /CHECK/, "từ chối thiếu lý do");
  assert.throws(() => xm(db, { id: "v-12", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "DA_XAC_MINH", reason: "ANH_MO" }), /CHECK/, "xác minh mang lý do");
  assert.throws(() => xm(db, { id: "v-13", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "DA_XAC_MINH", by: null }), /CHECK/, "xác minh không người");
  assert.throws(() => xm(db, { id: "v-14", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "LAM_DAI" }), /CHECK/, "kết luận lạ");
  assert.throws(() => xm(db, { id: "v-15", party: p, kind: "ATTRIBUTE", attr: "NGAY_SINH", outcome: "CAN_XAC_MINH_LAI", touched: 1, by: null }), /CHECK/, "cờ chốt cuối trên dòng cần xác minh lại");
  assert.throws(() => db.prepare("UPDATE pty_verification SET outcome = 'TU_CHOI', reason_code = 'ANH_MO' WHERE id = 'v-1'").run(), /verification_append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_verification WHERE id = 'v-1'").run(), /verification_append_only/);
});

const chinhSach = (db: DatabaseSync, id: string, version: number, by: string | null = "s-tq") =>
  db.prepare(
    "INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'Mục đích thử', 'Văn bản thử', ?, ?, ?, ?, ?)",
  ).run(id, version, AT, AT, by, AT, by);

test("(i) chính sách riêng tư: KHÔNG gieo dòng nào; đúng bộ cột (không cột thời hạn xoá); phiên bản liên tiếp từ 1; phải có người đăng; chỉ-thêm", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT count(*) AS n FROM pty_privacy_policy"), [{ n: 0 }]);
  assert.deepEqual(cotCua(db, "pty_privacy_policy"), ["id", "version", "purposes", "body", "valid_from_at", "created_at", "created_by", "updated_at", "updated_by"]);
  assert.throws(() => chinhSach(db, "cs-0", 2), /privacy_policy_version_gap/, "bắt đầu từ 2");
  chinhSach(db, "cs-1", 1);
  assert.throws(() => chinhSach(db, "cs-3", 3), /privacy_policy_version_gap/, "nhảy 1 → 3");
  assert.throws(() => chinhSach(db, "cs-x", 2, null), /CHECK/, "không người đăng");
  chinhSach(db, "cs-2", 2);
  assert.throws(() => db.prepare("UPDATE pty_privacy_policy SET body = 'Sửa' WHERE id = 'cs-1'").run(), /privacy_policy_append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_privacy_policy WHERE id = 'cs-1'").run(), /privacy_policy_append_only/);
});

test("(j) đồng ý: chỉ-thêm; rút chỉ khi đã đồng ý đúng phiên bản đó; phải có tài khoản bấm; quyết định lạ bị chặn", () => {
  const db = all();
  const p = nguoi(db, "p-j");
  chinhSach(db, "cs-1", 1);
  chinhSach(db, "cs-2", 2);
  const dy = (id: string, policy: string, decision: string, by: string | null = "s-1") =>
    db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, p, policy, decision, AT, by, AT, by);
  assert.throws(() => dy("dy-0", "cs-1", "RUT"), /consent_withdraw_without_consent/);
  dy("dy-1", "cs-1", "DONG_Y");
  assert.throws(() => dy("dy-2", "cs-2", "RUT"), /consent_withdraw_without_consent/, "rút phiên bản chưa đồng ý");
  dy("dy-3", "cs-1", "RUT");
  assert.throws(() => dy("dy-4", "cs-1", "DONG_Y", null), /CHECK/);
  assert.throws(() => dy("dy-5", "cs-1", "CO_LE"), /CHECK/);
  assert.throws(() => db.prepare("UPDATE pty_consent SET decision = 'DONG_Y' WHERE id = 'dy-3'").run(), /consent_append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_consent WHERE id = 'dy-1'").run(), /consent_append_only/);
});

test("(k) sổ dữ liệu: sáu bảng mới của parties (kind table); ngày sinh N2; số / khoá số / nơi cấp giấy tờ tổ chức N3", () => {
  const sd = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as {
    tables: { name: string; module: string; kind: string }[];
    hangDuLieu: Record<string, Record<string, string>>;
  };
  for (const t of ["pty_organization_document_type", "pty_organization_document", "pty_verification_attribute", "pty_verification", "pty_privacy_policy", "pty_consent"]) {
    const m = sd.tables.find((x) => x.name === t);
    assert.ok(m, t);
    assert.deepEqual({ name: m.name, module: m.module, kind: m.kind }, { name: t, module: "parties", kind: "table" });
  }
  assert.equal(sd.hangDuLieu.pty_person!.birth_date, "N2");
  for (const c of ["document_number", "number_key", "issued_place"]) assert.equal(sd.hangDuLieu.pty_organization_document![c], "N3", c);
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/migrations-ho-so-mo-rong.test.ts`
Expected: FAIL — `phải có đúng một tệp *_ho_so_mo_rong.sql, thấy []` (các bài sau lỗi theo).

- [ ] **Step 3: Viết migration `migrations/0103_ho_so_mo_rong.sql`**

```sql
-- Migration 0103 — ADR-0122 (accepted 2026-10-16) + ADR-0126 điều 1 (accepted 2026-10-16): hồ sơ mở rộng của module parties. CHỈ THÊM.
-- KHÔNG gieo dữ liệu cá nhân, KHÔNG gieo văn bản chính sách riêng tư, KHÔNG có cột / con số thời hạn xoá (ADR-0126 đ2: con số chờ luật sư — lát H-5).
-- Trigger chỉ đọc bảng của chính module (Hiến chương 5.3); tên bắt đầu pty_ (không staff_/stf_ — src/migrations-n1.test.ts coi đó là trigger siết B5).
-- Người thao tác (người xác minh, người đăng chính sách, tài khoản đồng ý) ghi ở created_by — KHÔNG khoá ngoại sang staff (ADR-0003; cạnh parties → staff không có).

-- (1) Ngày sinh (ADR-0122 đ1). NULL = chưa khai. "Không ở tương lai" kiểm ở máy chủ (CHECK không dùng được date('now')).
ALTER TABLE pty_person ADD COLUMN birth_date TEXT CHECK (birth_date IS NULL OR (date(birth_date) = birth_date AND birth_date >= '1900-01-01'));

-- (2) Địa chỉ cá nhân = loại liên hệ ADDRESS (ADR-0122 đ1, đ6). Chỉ hồ sơ CÁ NHÂN: địa chỉ tổ chức ở pty_organization.address (một nơi, N7).
INSERT INTO pty_contact_kind (code, name, sort_order) VALUES ('ADDRESS', 'Địa chỉ', 3);
CREATE TRIGGER pty_contact_point_address_person_ins BEFORE INSERT ON pty_contact_point
WHEN NEW.contact_kind_code = 'ADDRESS' AND NOT EXISTS (SELECT 1 FROM pty_person WHERE party_id = NEW.party_id)
BEGIN SELECT RAISE(ABORT, 'contact_address_person_only: địa chỉ cá nhân chỉ ghi cho hồ sơ cá nhân'); END;
CREATE TRIGGER pty_contact_point_address_person_upd BEFORE UPDATE OF contact_kind_code, party_id ON pty_contact_point
WHEN NEW.contact_kind_code = 'ADDRESS' AND NOT EXISTS (SELECT 1 FROM pty_person WHERE party_id = NEW.party_id)
BEGIN SELECT RAISE(ABORT, 'contact_address_person_only: địa chỉ cá nhân chỉ ghi cho hồ sơ cá nhân'); END;

-- (3) Giấy tờ của TỔ CHỨC (ADR-0122 đ2) — khuôn y hệt pty_person_document (0032). Danh mục loại do Quản trị sửa (màn hình ở lát H-2).
-- Mã 'GPKD' CỐ ĐỊNH (CHECK / trigger dưới đây dựa vào nó; đổi bằng ADR). Bốn loại còn lại là tên đề xuất, sửa được.
CREATE TABLE pty_organization_document_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  has_expiry  INTEGER NOT NULL DEFAULT 1 CHECK (has_expiry IN (0, 1)),    -- 0: loại không có ngày hết hạn; 1: có thể có (để trống = không hạn)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO pty_organization_document_type (code, name, has_expiry, sort_order, created_at, updated_at) VALUES
  ('GPKD', 'Giấy chứng nhận đăng ký kinh doanh', 0, 1, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('TRAVEL_DOMESTIC', 'Giấy phép kinh doanh dịch vụ lữ hành nội địa', 1, 2, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('TRAVEL_INTERNATIONAL', 'Giấy phép kinh doanh dịch vụ lữ hành quốc tế', 1, 3, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('ACCOMMODATION', 'Giấy chứng nhận xếp hạng cơ sở lưu trú', 1, 4, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('TRANSPORT', 'Giấy phép kinh doanh vận tải bằng xe ô tô', 1, 5, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z');

-- number_key = số đã chuẩn hoá (chữ HOA, bỏ khoảng trắng . - /) do máy chủ tính. Số và nơi cấp là dữ liệu hạng N3 (giấy phép của hộ kinh doanh — Hiến chương 5.20):
-- KHÔNG BAO GIỜ vào nhật ký, Bảng tin, thông báo. Gia hạn = THÊM dòng nối previous_id; nhập nhầm = voided_at; không xoá.
CREATE TABLE pty_organization_document (
  id                  TEXT PRIMARY KEY,
  party_id            TEXT NOT NULL REFERENCES pty_organization(party_id),
  document_type_code  TEXT NOT NULL REFERENCES pty_organization_document_type(code),
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 40),
  number_key          TEXT CHECK (number_key IS NULL OR (number_key = upper(number_key) AND length(number_key) BETWEEN 1 AND 40)),
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) = issued_date),
  issued_place        TEXT CHECK (issued_place IS NULL OR length(trim(issued_place)) BETWEEN 1 AND 200),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) = expiry_date),     -- NULL = không hạn
  previous_id         TEXT REFERENCES pty_organization_document(id),                            -- dòng này GIA HẠN dòng nào
  voided_at           TEXT,                                                                      -- huỷ dòng nhập nhầm (không xoá)
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK ((document_number IS NULL) = (number_key IS NULL)),
  CHECK (document_number IS NOT NULL OR document_type_code <> 'GPKD'),
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK (previous_id IS NULL OR previous_id <> id)
);
CREATE INDEX pty_organization_document_party_ix ON pty_organization_document(party_id);
CREATE INDEX pty_organization_document_number_ix ON pty_organization_document(document_type_code, number_key);
CREATE UNIQUE INDEX pty_organization_document_next_uq ON pty_organization_document(previous_id) WHERE previous_id IS NOT NULL AND voided_at IS NULL;

CREATE TRIGGER pty_organization_document_no_delete BEFORE DELETE ON pty_organization_document
BEGIN SELECT RAISE(ABORT, 'organization_document_no_delete: giấy tờ không xoá — nhập nhầm thì huỷ dòng'); END;
CREATE TRIGGER pty_organization_document_superseded BEFORE UPDATE ON pty_organization_document
WHEN EXISTS (SELECT 1 FROM pty_organization_document n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'organization_document_superseded: giấy tờ đã có dòng gia hạn — không sửa đè'); END;
CREATE TRIGGER pty_organization_document_voided BEFORE UPDATE ON pty_organization_document
WHEN OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'organization_document_voided: dòng đã huỷ — không sửa'); END;
CREATE TRIGGER pty_organization_document_identity BEFORE UPDATE ON pty_organization_document
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.previous_id IS NOT OLD.previous_id OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'organization_document_identity: không đổi tổ chức, loại, dòng trước, mốc tạo'); END;
CREATE TRIGGER pty_organization_document_renew_ins BEFORE INSERT ON pty_organization_document
WHEN NEW.previous_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM pty_organization_document p
  WHERE p.id = NEW.previous_id AND p.party_id = NEW.party_id AND p.document_type_code = NEW.document_type_code AND p.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'organization_document_renew_mismatch: dòng gia hạn phải nối dòng chưa huỷ của cùng tổ chức, cùng loại'); END;
-- Một số GPKD thuộc đúng MỘT tổ chức (khuôn CCCD của 0032): so party_id KHÁC nhau — tổ chức gia hạn giữ số cũ được. Dòng đã huỷ không tính.
CREATE TRIGGER pty_organization_document_gpkd_one_org_ins BEFORE INSERT ON pty_organization_document
WHEN NEW.document_type_code = 'GPKD' AND NEW.voided_at IS NULL AND EXISTS (
  SELECT 1 FROM pty_organization_document o
  WHERE o.document_type_code = 'GPKD' AND o.number_key = NEW.number_key AND o.party_id <> NEW.party_id AND o.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'organization_document_gpkd_other_org: số giấy chứng nhận đăng ký kinh doanh này đã thuộc một tổ chức khác'); END;
CREATE TRIGGER pty_organization_document_gpkd_one_org_upd BEFORE UPDATE OF number_key ON pty_organization_document
WHEN NEW.document_type_code = 'GPKD' AND NEW.voided_at IS NULL AND EXISTS (
  SELECT 1 FROM pty_organization_document o
  WHERE o.id <> NEW.id AND o.document_type_code = 'GPKD' AND o.number_key = NEW.number_key AND o.party_id <> NEW.party_id AND o.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'organization_document_gpkd_other_org: số giấy chứng nhận đăng ký kinh doanh này đã thuộc một tổ chức khác'); END;

-- (4) Kết quả xác minh theo TỪNG dòng (ADR-0122 đ3; Hiến chương 5.23) — CHỈ-THÊM. Trạng thái hiện tại của một đối tượng = dòng mới nhất (lát H-2).
-- target_kind: dòng giấy tờ người / giấy tờ tổ chức / liên hệ, hoặc một THUỘC TÍNH của hồ sơ (attribute_code — bảng tra cứu dưới đây, câu hỏi Q1 của kế hoạch).
-- reason_code: mã lý do từ chối (danh sách đóng sống ở mã — lát H-4; ADR-0125 đ6). verifier_touched_account: Toàn quyền là chốt cuối (ADR-0125 đ5).
-- Thuộc tính xác minh được là DỮ LIỆU (khuôn pty_contact_kind / loại giấy tờ), không CHECK liệt kê: thêm thuộc tính về sau = migration chèn một dòng, không dựng lại
-- bảng chỉ-thêm pty_verification. applies_to: thuộc tính của hồ sơ người hay tổ chức (trigger đích đọc cột này). Bảy dòng gieo là đề xuất (Q1).
CREATE TABLE pty_verification_attribute (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  applies_to  TEXT NOT NULL CHECK (applies_to IN ('PERSON', 'ORGANIZATION')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO pty_verification_attribute (code, name, applies_to, sort_order, created_at, updated_at) VALUES
  ('HO_TEN', 'Họ tên', 'PERSON', 1, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('NGAY_SINH', 'Ngày sinh', 'PERSON', 2, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('GIOI_TINH', 'Giới tính', 'PERSON', 3, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('TEN_PHAP_LY', 'Tên pháp lý', 'ORGANIZATION', 4, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('MA_SO_THUE', 'Mã số thuế', 'ORGANIZATION', 5, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('DIA_CHI_TO_CHUC', 'Địa chỉ tổ chức', 'ORGANIZATION', 6, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('EMAIL_HOA_DON', 'Email nhận hoá đơn', 'ORGANIZATION', 7, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z');

CREATE TABLE pty_verification (
  id                        TEXT PRIMARY KEY,
  party_id                  TEXT NOT NULL REFERENCES pty_party(id),
  target_kind               TEXT NOT NULL CHECK (target_kind IN ('PERSON_DOCUMENT', 'ORG_DOCUMENT', 'CONTACT', 'ATTRIBUTE')),
  target_id                 TEXT,
  attribute_code            TEXT REFERENCES pty_verification_attribute(code),
  outcome                   TEXT NOT NULL CHECK (outcome IN ('DA_XAC_MINH', 'TU_CHOI', 'CAN_XAC_MINH_LAI')),
  reason_code               TEXT CHECK (reason_code IS NULL OR (reason_code = upper(reason_code) AND length(reason_code) BETWEEN 2 AND 40)),
  verifier_touched_account  INTEGER NOT NULL DEFAULT 0 CHECK (verifier_touched_account IN (0, 1)),
  created_at                TEXT NOT NULL,
  created_by                TEXT,
  updated_at                TEXT NOT NULL,
  updated_by                TEXT,
  CHECK ((target_kind = 'ATTRIBUTE') = (attribute_code IS NOT NULL)),
  CHECK ((target_kind = 'ATTRIBUTE') = (target_id IS NULL)),
  CHECK ((outcome = 'TU_CHOI') = (reason_code IS NOT NULL)),
  CHECK (outcome = 'CAN_XAC_MINH_LAI' OR created_by IS NOT NULL),
  CHECK (verifier_touched_account = 0 OR outcome <> 'CAN_XAC_MINH_LAI')
);
CREATE INDEX pty_verification_party_ix ON pty_verification(party_id, created_at);
CREATE INDEX pty_verification_target_ix ON pty_verification(target_kind, target_id, attribute_code, created_at);
CREATE TRIGGER pty_verification_target_ins BEFORE INSERT ON pty_verification
WHEN (NEW.target_kind = 'PERSON_DOCUMENT' AND NOT EXISTS (SELECT 1 FROM pty_person_document d WHERE d.id = NEW.target_id AND d.party_id = NEW.party_id))
  OR (NEW.target_kind = 'ORG_DOCUMENT' AND NOT EXISTS (SELECT 1 FROM pty_organization_document d WHERE d.id = NEW.target_id AND d.party_id = NEW.party_id))
  OR (NEW.target_kind = 'CONTACT' AND NOT EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.id = NEW.target_id AND c.party_id = NEW.party_id))
  OR (NEW.target_kind = 'ATTRIBUTE' AND NOT EXISTS (
        SELECT 1 FROM pty_verification_attribute a WHERE a.code = NEW.attribute_code AND a.active = 1
          AND ((a.applies_to = 'PERSON' AND EXISTS (SELECT 1 FROM pty_person WHERE party_id = NEW.party_id))
            OR (a.applies_to = 'ORGANIZATION' AND EXISTS (SELECT 1 FROM pty_organization WHERE party_id = NEW.party_id)))))
BEGIN SELECT RAISE(ABORT, 'verification_target_mismatch: dòng được xác minh không thuộc hồ sơ này'); END;
CREATE TRIGGER pty_verification_no_update BEFORE UPDATE ON pty_verification
BEGIN SELECT RAISE(ABORT, 'verification_append_only: kết quả xác minh chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER pty_verification_no_delete BEFORE DELETE ON pty_verification
BEGIN SELECT RAISE(ABORT, 'verification_append_only: kết quả xác minh không xoá'); END;

-- (5) Chính sách riêng tư có phiên bản (ADR-0126 đ1; Hiến chương 5.21) — CHỈ-THÊM; phiên bản liên tiếp từ 1. Phiên bản hiện hành = valid_from_at lớn nhất ≤ bây giờ.
-- Không gieo dòng nào: chưa có chính sách thì không ai gửi được phiếu tự khai (ADR-0124 đ3). Chỉ Toàn quyền đăng (ô và route ở lát H-4).
CREATE TABLE pty_privacy_policy (
  id             TEXT PRIMARY KEY,
  version        INTEGER NOT NULL UNIQUE CHECK (version >= 1),
  purposes       TEXT NOT NULL CHECK (length(trim(purposes)) BETWEEN 1 AND 2000),   -- tóm tắt các mục đích thu dữ liệu
  body           TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 20000),      -- toàn văn chủ dự án duyệt
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  CHECK (created_by IS NOT NULL)
);
CREATE TRIGGER pty_privacy_policy_version_ins BEFORE INSERT ON pty_privacy_policy
WHEN NEW.version <> (SELECT COALESCE(MAX(version), 0) + 1 FROM pty_privacy_policy)
BEGIN SELECT RAISE(ABORT, 'privacy_policy_version_gap: phiên bản chính sách phải nối tiếp phiên bản trước'); END;
CREATE TRIGGER pty_privacy_policy_no_update BEFORE UPDATE ON pty_privacy_policy
BEGIN SELECT RAISE(ABORT, 'privacy_policy_append_only: chính sách đã đăng không sửa — đăng phiên bản mới'); END;
CREATE TRIGGER pty_privacy_policy_no_delete BEFORE DELETE ON pty_privacy_policy
BEGIN SELECT RAISE(ABORT, 'privacy_policy_append_only: chính sách đã đăng không xoá'); END;

-- (6) Đồng ý (ADR-0126 đ1; Hiến chương 5.21) — CHỈ-THÊM; đồng ý theo CẢ phiên bản (câu hỏi Q2 của kế hoạch); rút = dòng mới 'RUT'. created_by = tài khoản bấm.
CREATE TABLE pty_consent (
  id          TEXT PRIMARY KEY,
  party_id    TEXT NOT NULL REFERENCES pty_party(id),
  policy_id   TEXT NOT NULL REFERENCES pty_privacy_policy(id),
  decision    TEXT NOT NULL CHECK (decision IN ('DONG_Y', 'RUT')),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT,
  CHECK (created_by IS NOT NULL)
);
CREATE INDEX pty_consent_party_ix ON pty_consent(party_id, created_at);
CREATE TRIGGER pty_consent_withdraw_ins BEFORE INSERT ON pty_consent
WHEN NEW.decision = 'RUT' AND NOT EXISTS (SELECT 1 FROM pty_consent c WHERE c.party_id = NEW.party_id AND c.policy_id = NEW.policy_id AND c.decision = 'DONG_Y')
BEGIN SELECT RAISE(ABORT, 'consent_withdraw_without_consent: chưa đồng ý phiên bản này thì không có gì để rút'); END;
CREATE TRIGGER pty_consent_no_update BEFORE UPDATE ON pty_consent
BEGIN SELECT RAISE(ABORT, 'consent_append_only: đồng ý chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER pty_consent_no_delete BEFORE DELETE ON pty_consent
BEGIN SELECT RAISE(ABORT, 'consent_append_only: đồng ý không xoá'); END;
```

- [ ] **Step 4: Sổ dữ liệu cho bảng / cột mới**

Trong mảng `tables` của `docs/data-dictionary.json`, chèn ngay sau mục `pty_person_document`:

```json
    {
      "name": "pty_organization_document_type",
      "module": "parties",
      "kind": "table"
    },
    {
      "name": "pty_organization_document",
      "module": "parties",
      "kind": "table",
      "note": "giấy tờ của TỔ CHỨC (ADR-0122 đ2; migration 0103) — khuôn pty_person_document: gia hạn = dòng mới nối previous_id, huỷ dòng nhầm, không xoá; một số GPKD thuộc một tổ chức (trigger). Số, khoá số, nơi cấp hạng N3: KHÔNG vào nhật ký"
    },
    {
      "name": "pty_verification_attribute",
      "module": "parties",
      "kind": "table",
      "note": "danh mục thuộc tính hồ sơ xác minh được (migration 0103), là dữ liệu chứ không CHECK liệt kê; applies_to PERSON / ORGANIZATION; bảy dòng gieo là đề xuất (câu hỏi Q1 của kế hoạch 2026-10-16-goi-2-h0-h1)"
    },
    {
      "name": "pty_verification",
      "module": "parties",
      "kind": "table",
      "note": "kết quả xác minh theo từng dòng (ADR-0122 đ3; migration 0103), CHỈ-THÊM; dòng mới nhất là trạng thái hiện tại; người xác minh ở created_by"
    },
    {
      "name": "pty_privacy_policy",
      "module": "parties",
      "kind": "table",
      "note": "chính sách riêng tư có phiên bản (ADR-0126 đ1; migration 0103), CHỈ-THÊM, phiên bản liên tiếp; không gieo dòng nào; không có thời hạn xoá (chờ luật sư — lát H-5)"
    },
    {
      "name": "pty_consent",
      "module": "parties",
      "kind": "table",
      "note": "đồng ý / rút đồng ý theo cả phiên bản chính sách (ADR-0126 đ1; migration 0103), CHỈ-THÊM; tài khoản bấm ở created_by"
    },
```

Trong `hangDuLieu`: thêm `"birth_date": "N2"` vào cuối đối tượng `"pty_person"`, và thêm sáu dòng (vị trí bất kỳ trong `hangDuLieu`, giữ dấu phẩy JSON đúng):

```json
    "pty_consent": { "id": "N1", "party_id": "N1", "policy_id": "N1", "decision": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1" },
    "pty_organization_document": { "id": "N1", "party_id": "N1", "document_type_code": "N1", "document_number": "N3", "number_key": "N3", "issued_date": "N1", "issued_place": "N3", "expiry_date": "N1", "previous_id": "N1", "voided_at": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1" },
    "pty_organization_document_type": { "code": "N1", "name": "N1", "has_expiry": "N1", "sort_order": "N1", "active": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1" },
    "pty_privacy_policy": { "id": "N1", "version": "N1", "purposes": "N1", "body": "N1", "valid_from_at": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1" },
    "pty_verification_attribute": { "code": "N1", "name": "N1", "applies_to": "N1", "sort_order": "N1", "active": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1" },
    "pty_verification": { "id": "N1", "party_id": "N1", "target_kind": "N1", "target_id": "N1", "attribute_code": "N1", "outcome": "N1", "reason_code": "N1", "verifier_touched_account": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1" },
```

Rồi: `npm run dict`.

- [ ] **Step 5: Nối hàng rào H-0 với cột N3 mới**

`src/hang-du-lieu.test.ts` — thay `N3_GHIM`:

```ts
const N3_GHIM = [
  "pty_organization_document.document_number", "pty_organization_document.issued_place", "pty_organization_document.number_key",
  "pty_person_document.document_number", "pty_person_document.issued_place", "pty_person_document.number_key",
];
```

`scripts/audit-checks.mjs` — thêm ba khoá vào `COT_N3_NHAT_KY`:

```js
  "pty_organization_document.document_number": { kiem: "R-PD-1", chuanHoa: false },
  "pty_organization_document.number_key": { kiem: "R-PD-1", chuanHoa: true },
  "pty_organization_document.issued_place": { kiem: "R-PD-1", chuanHoa: false },
```

`tests/audit/nhat-ky-hang.mjs` — thay `export const MIEN = {};` bằng:

```js
export const MIEN = {
  "pty_organization_document.document_number": "chưa có route ghi giấy tờ tổ chức (lát H-1 chỉ có bảng) — lát H-2 chuyển sang src/giay-to-khong-lo-so.test.ts",
  "pty_organization_document.number_key": "chưa có route ghi giấy tờ tổ chức (lát H-1 chỉ có bảng) — lát H-2 chuyển sang src/giay-to-khong-lo-so.test.ts",
  "pty_organization_document.issued_place": "chưa có route ghi giấy tờ tổ chức (lát H-1 chỉ có bảng) — lát H-2 chuyển sang src/giay-to-khong-lo-so.test.ts",
};
```

- [ ] **Step 6: Bất biến mới — bài đỏ trong `src/audit-invariants.test.ts`** (thêm sau bài `R-PD-1: nơi cấp …` của Task 2):

```ts
function toChucMoi(db: DatabaseSync, id: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, `Tổ chức ${id}`, T1, T1);
  db.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, T1, T1);
  return id;
}
function giayToToChuc(db: DatabaseSync, o: { id: string; party: string; type?: string; key?: string | null; truoc?: string }): string {
  const type = o.type ?? "GPKD";
  const key = o.key === undefined ? `42000${o.id.length}0000` : o.key;
  db.prepare(
    `INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, previous_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(o.id, o.party, type, key, key, o.truoc ?? null, T1, T1);
  return o.id;
}

test("R-PTY-7 (ADR-0122 đ2): một số GPKD thuộc đúng một tổ chức — gia hạn cùng số của chính tổ chức → 0; hai tổ chức cùng số (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-7");
  assert.equal(c.level, "fail");
  const db = build();
  const a = toChucMoi(db, "o-a");
  const b = toChucMoi(db, "o-b");
  const a1 = giayToToChuc(db, { id: "ga-1", party: a, key: "4201234567" });
  giayToToChuc(db, { id: "ga-2", party: a, key: "4201234567", truoc: a1 });
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_organization_document_gpkd_one_org_ins");
  giayToToChuc(db, { id: "gb-1", party: b, key: "4201234567" });
  assert.equal(violations(db, c), 1);
});

test("R-PTY-8 (ADR-0122 đ2): dòng gia hạn giấy tờ tổ chức cùng tổ chức, cùng loại; tối đa một dòng gia hạn chưa huỷ — nối lệch (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-8");
  assert.equal(c.level, "fail");
  const db = build();
  const a = toChucMoi(db, "o-a");
  const b = toChucMoi(db, "o-b");
  const a1 = giayToToChuc(db, { id: "ga-1", party: a, type: "TRANSPORT", key: null });
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_organization_document_renew_ins");
  giayToToChuc(db, { id: "gb-1", party: b, type: "TRANSPORT", key: null, truoc: a1 });
  assert.equal(violations(db, c), 1);
});

test("R-PTY-9 (ADR-0122 đ3): mỗi dòng xác minh trỏ đúng dòng của đúng hồ sơ — đúng → 0; trỏ giấy tờ của hồ sơ khác (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-9");
  assert.equal(c.level, "fail");
  const db = build();
  const gd = giayToNguoi(db, { party: "pty-s-an", key: "079888777666" });
  const v = (id: string, party: string) =>
    db.prepare(
      "INSERT INTO pty_verification (id, party_id, target_kind, target_id, outcome, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'PERSON_DOCUMENT', ?, 'DA_XAC_MINH', ?, 's-admin', ?, 's-admin')",
    ).run(id, party, gd, T1, T1);
  v("v-1", "pty-s-an");
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_verification_target_ins");
  v("v-2", "pty-xa");
  assert.equal(violations(db, c), 1);
});

test("R-PTY-10 (ADR-0122 đ1): liên hệ ADDRESS chỉ ở hồ sơ cá nhân — người → 0; tổ chức (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-10");
  assert.equal(c.level, "fail");
  const db = build();
  const o = toChucMoi(db, "o-dc");
  const lh = (id: string, party: string) =>
    db.prepare(
      "INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES (?, ?, 'ADDRESS', '12 Trần Phú', '12 trần phú', 1, '2026-10-16', ?, ?)",
    ).run(id, party, T1, T1);
  lh("dc-1", "pty-s-an");
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_contact_point_address_person_ins");
  lh("dc-2", o);
  assert.equal(violations(db, c), 1);
});
```

Run: `node --test src/audit-invariants.test.ts`
Expected: FAIL bốn bài mới (`phải có đúng một kiểm R-PTY-7` …).

- [ ] **Step 7: Thêm bốn kiểm vào `scripts/audit-checks.mjs`** — ngay sau phần tử `R-PTY-6`:

```js
  // ---- Hồ sơ mở rộng (ADR-0122, migration *_ho_so_mo_rong — lát H-1 Gói 2). D1 chưa áp migration thì các câu dưới lỗi "no such table" → thoát mã 2;
  // `npm run trien-khai` chạy kiểm SAU khi áp. Lưới thứ hai sau trigger (bắt trigger bị gỡ nhầm hay SQL gõ tay đi vòng).
  {
    code: "R-PTY-7",
    what: "một số giấy chứng nhận đăng ký kinh doanh thuộc đúng một tổ chức (dòng chưa huỷ)",
    sql: `SELECT count(*) FROM (SELECT number_key FROM pty_organization_document WHERE document_type_code = 'GPKD' AND voided_at IS NULL AND number_key IS NOT NULL
          GROUP BY number_key HAVING count(DISTINCT party_id) > 1)`,
    level: "fail",
  },
  {
    code: "R-PTY-8",
    what: "dòng gia hạn giấy tờ tổ chức cùng tổ chức, cùng loại với dòng trước; mỗi dòng tối đa một dòng gia hạn chưa huỷ",
    sql: `SELECT (SELECT count(*) FROM pty_organization_document n JOIN pty_organization_document p ON p.id = n.previous_id
                  WHERE p.party_id <> n.party_id OR p.document_type_code <> n.document_type_code)
          + (SELECT count(*) FROM (SELECT previous_id FROM pty_organization_document WHERE previous_id IS NOT NULL AND voided_at IS NULL GROUP BY previous_id HAVING count(*) > 1))`,
    level: "fail",
  },
  {
    code: "R-PTY-9",
    what: "mỗi dòng xác minh trỏ đúng dòng giấy tờ / liên hệ của đúng hồ sơ",
    sql: `SELECT count(*) FROM pty_verification v WHERE
            (v.target_kind = 'PERSON_DOCUMENT' AND NOT EXISTS (SELECT 1 FROM pty_person_document d WHERE d.id = v.target_id AND d.party_id = v.party_id))
         OR (v.target_kind = 'ORG_DOCUMENT' AND NOT EXISTS (SELECT 1 FROM pty_organization_document d WHERE d.id = v.target_id AND d.party_id = v.party_id))
         OR (v.target_kind = 'CONTACT' AND NOT EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.id = v.target_id AND c.party_id = v.party_id))`,
    level: "fail",
  },
  {
    code: "R-PTY-10",
    what: "liên hệ địa chỉ (ADDRESS) chỉ ở hồ sơ cá nhân",
    sql: "SELECT count(*) FROM pty_contact_point c WHERE c.contact_kind_code = 'ADDRESS' AND NOT EXISTS (SELECT 1 FROM pty_person p WHERE p.party_id = c.party_id)",
    level: "fail",
  },
```

- [ ] **Step 8: Chạy bài của task**

Run: `node --test src/migrations-ho-so-mo-rong.test.ts src/audit-invariants.test.ts src/hang-du-lieu.test.ts src/nhat-ky-hang.test.ts src/architecture.test.ts src/migrations-n1.test.ts src/migrations-pty-person-gender.test.ts src/migrations-giay-to-cua-nguoi.test.ts`
Expected: PASS hết. (Bài `architecture.test.ts` kiểm cột kiểm toán, khoá ngoại `NO ACTION`, sổ dữ liệu khớp schema, `DATA-DICTIONARY.md` khớp bản sinh.)

- [ ] **Step 9: Áp migration local (D1 thật của wrangler, không remote)**

Run: `npm run db:migrate:local`
Expected: áp `0103_ho_so_mo_rong.sql` không lỗi (bắt lỗi cú pháp D1 mà `node:sqlite` cho qua).

- [ ] **Step 10: Tài liệu mô tả + sổ hàng rào**

`docs/SYSTEM-DESIGN.md` §5 — thêm vào phần module `parties`:

```
**Hồ sơ mở rộng (ADR-0122, ADR-0126 đ1; migration `0103` — lát H-1 Gói 2).** `pty_person.birth_date` (ngày dân sự, NULL = chưa khai); liên hệ loại `ADDRESS` (chỉ hồ sơ cá nhân — trigger `pty_contact_point_address_person_*`); `pty_organization_document_type` + `pty_organization_document` (khuôn giấy tờ người: gia hạn là dòng mới, huỷ dòng nhầm, một số GPKD một tổ chức); `pty_verification` (kết quả xác minh theo từng dòng, chỉ-thêm); `pty_privacy_policy` (phiên bản liên tiếp, chỉ-thêm, không gieo) và `pty_consent` (đồng ý / rút theo cả phiên bản, chỉ-thêm). Lát H-1 chưa có route ghi giấy tờ tổ chức, xác minh, chính sách hay đồng ý (lát H-2, H-4). Bất biến: `R-PTY-7…10`.
```

`docs/CHANGE-GUIDE.md` công thức d — thêm bullet đầu danh sách "Số kế tiếp (hiện tại)":

```
- Cập nhật 2026-10-16 (nhánh `worktree-ho-so-rieng-tu-2fa`, lát H-1 Gói 2): nhánh này thêm `0103_ho_so_mo_rong.sql` (CHƯA lên production). `main` dừng ở `0102`; `0098` đã giữ cho nhánh đưa đón theo nhóm (ADR-0118, chưa gộp). Số kế tiếp sau nhánh này: `0104` — vẫn quét mọi nhánh / worktree chưa gộp trước khi đặt. Từ lát H-0, cột mới phải có hạng ở `hangDuLieu` (công thức z19).
```

`docs/CHANGE-GUIDE.md` công thức y — thêm bước 9 cuối mục "Làm":

```
9. **Giấy tờ TỔ CHỨC (ADR-0122 đ2, migration `0103`):** bảng `pty_organization_document` theo đúng khuôn giấy tờ người (trigger `pty_organization_document_*`, lỗi `organization_document_*`); số, khoá số, nơi cấp hạng N3 (không vào nhật ký — `R-PD-1`). Lát H-1 CHƯA có route: route đầu tiên (lát H-2) phải thêm ca vào `TUYEN` của `src/giay-to-khong-lo-so.test.ts` và chuyển ba cột khỏi `MIEN` sang `PHU_TRACH` của `tests/audit/nhat-ky-hang.mjs`; chặn giấy tờ của chính công ty chủ ở route.
```

`docs/SO-HANG-RAO.md` — thêm dòng:

```
| `src/migrations-ho-so-mo-rong.test.ts` + `R-PTY-7…10` (lát H-1 Gói 2, ADR-0122) | Sửa / xoá dòng xác minh, chính sách, đồng ý; hai tổ chức cùng số GPKD; sửa đè giấy tờ tổ chức đã gia hạn; địa chỉ cá nhân ghi cho hồ sơ tổ chức; dòng xác minh trỏ dòng của hồ sơ khác | Trigger chỉ-thêm / một-số-một-tổ-chức / khuôn 0032 / chỉ-người trong migration `0103`, kiểm bằng SQL thẳng trên schema thật; bất biến chỉ đọc là lưới thứ hai | Chưa ghi nhận — phá thử ở Task 6 của kế hoạch 2026-10-16-goi-2-h0-h1 (gỡ `pty_organization_document_gpkd_one_org_ins` trong bản nháp migration ⇒ bài (f) đỏ; gỡ `pty_verification_no_update` ⇒ bài (h) đỏ; hoàn nguyên) | |
```

- [ ] **Step 11: Bộ kiểm chính + kiểu, commit**

Run: `npm test && npm run typecheck`
Expected: xanh. Nếu bài cũ ghim tập trigger / danh mục liên hệ ở phiên bản MỚI NHẤT đỏ vì dòng `ADDRESS` hoặc 18 trigger mới: sửa kỳ vọng cùng commit và ghi lý do trong thân commit (đã kiểm: `src/migrations-n1.test.ts` dùng `upTo("0011")` nên không đổi).

```bash
git add migrations/0103_ho_so_mo_rong.sql src/migrations-ho-so-mo-rong.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md src/hang-du-lieu.test.ts scripts/audit-checks.mjs src/audit-invariants.test.ts tests/audit/nhat-ky-hang.mjs docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/SO-HANG-RAO.md
git commit -m "Migration 0103: ngày sinh, địa chỉ cá nhân, giấy tờ tổ chức, sổ xác minh, chính sách riêng tư (ADR-0122, ADR-0126 đ1)

Vì sao: hồ sơ thiếu ngày sinh, địa chỉ, giấy tờ tổ chức và khái niệm đã xác minh. Bảng
xác minh, chính sách, đồng ý chỉ-thêm; giấy tờ tổ chức theo khuôn giấy tờ người đã có
người kiểm. Không gieo chính sách, không có thời hạn xoá (chờ luật sư)."
```

- [ ] **Step 12: Giao người kiểm độc lập (vai `nguoi-kiem-doc-lap`, chỉ đọc) — VIỆC LỚN dữ liệu**

Nội dung giao: đọc `migrations/0103_ho_so_mo_rong.sql` đối chiếu ADR-0122 đ1–đ4 và ADR-0126 đ1; chạy lại `node --test src/migrations-ho-so-mo-rong.test.ts src/audit-invariants.test.ts src/hang-du-lieu.test.ts` và `npm run db:migrate:local`; xác nhận không gieo dữ liệu cá nhân / văn bản chính sách / thời hạn xoá; thử một phép phá (gỡ một trigger chỉ-thêm trong bản sao tạm) thấy đỏ. Chỉ báo cáo, không sửa. Chưa có báo cáo "đạt" thì không sang Task 4.

---

### Task 4: Ô `party.personal.view`, luật thuần riêng tư, kiểm đầu vào ADDRESS / ngày sinh (VIỆC LỚN — quyền)

**Files:**
- Modify: `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts`
- Create: `src/modules/parties/rieng-tu.ts`, `src/modules/parties/rieng-tu.test.ts`
- Create: `src/shared/lien-he.ts`, `src/shared/lien-he.test.ts`
- Modify: `src/modules/parties/rules.ts`, `src/modules/parties/rules.test.ts`
- Modify: `src/shared/contracts.ts`

**Interfaces:**
- Consumes: không.
- Produces:
  - Ô quyền `"party.personal.view"`: `row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none")`.
  - `src/modules/parties/rieng-tu.ts`: `interface NguoiXem { coO: boolean; laChinhChu: boolean; hoSoCoTaiKhoan: boolean; quanDuocTaiKhoan: boolean }`; `xemDuocRiengTu(v: NguoiXem): boolean`; `ghiDuocRiengTu(v: NguoiXem): boolean`; `laLienHeRiengTu(kind: string): boolean`; `anTruongRiengTu(p: PartyDto): PartyDto`.
  - `src/shared/lien-he.ts`: `NHAN_LOAI_LIEN_HE: Record<ContactPointDto["kind"], string>`; `nhanLoaiLienHe(kind: string): string`.
  - `rules.ts`: `type ContactKind = "PHONE" | "EMAIL" | "ADDRESS"`; `CONTACT_KINDS`; `kiemNgaySinh(v: unknown, today: string): Result<string | null | undefined>`; `PartyCreate` PERSON thêm `birthDate: string | null`; `PartyUpdate` PERSON thêm `birthDate: string | null | undefined` (vắng = giữ); `validatePartyCreate(body, today?)`, `validatePartyUpdate(body, kind, today?)` (tham số `today` mặc định `vnToday(new Date())`).
  - `contracts.ts`: `ContactPointDto.kind: "PHONE" | "EMAIL" | "ADDRESS"`; `PartyDto.birthDate?: string | null` (VẮNG khoá khi người xem không được thấy).

- [ ] **Step 1: Bài đỏ cho bản đồ quyền**

`src/shared/permissions.test.ts` — bảng `ADR`, thêm ngay sau dòng `"party.staff.write": …`:

```ts
  "party.personal.view": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0122 đ5: ngày sinh + địa chỉ cá nhân của người khác — Quản trị (theo cấp bậc), Toàn quyền
```

Trong ba bài ghim nguyên dòng (`DRIVER` — "MỌI ô của Tài xế (DRIVER)", `DRIVER_PARTNER` — "MỌI ô của Tài xế đối tác", `HR` — "MỌI ô của Nhân sự (HR)"), ngay sau `"party.staff.write": "none",` của mỗi bảng, thêm:

```ts
    "party.personal.view": "none", // ADR-0122 đ5
```

`src/modules/orders/xem-don-theo-quyen.test.ts` bảng `PARTNER_ROW`, ngay sau `"party.staff.write": "none",` thêm `"party.personal.view": "none", // ADR-0122 đ5: Đối tác không xem ngày sinh / địa chỉ người khác`.

Run: `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts`
Expected: FAIL (MATRIX chưa có ô).

- [ ] **Step 2: Thêm ô** — `src/shared/permissions.ts`, ngay sau dòng `"party.staff.write": …`:

```ts
  // ADR-0122 đ5 (accepted 2026-10-16): xem / ghi NGÀY SINH và liên hệ ĐỊA CHỈ (ADDRESS) của hồ sơ người KHÁC — Quản trị + Toàn quyền. party.view (Bán hàng, Kế toán)
  // KHÔNG thấy hai trường này; chính chủ thấy của mình nhưng không ghi trực tiếp (Hiến chương 5.23). Quản trị còn theo luật cấp bậc khi hồ sơ gắn tài khoản
  // (ctx.partyAccount — ruling R6 của kế hoạch 2026-10-16-goi-2-h0-h1). Route: GET/PUT/POST /api/parties*, luật ở src/modules/parties/rieng-tu.ts.
  "party.personal.view": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"),
```

`src/shared/tro-ly-cau-truc-ten.ts`, ngay sau mục `"party.staff.write"`:

```ts
  "party.personal.view": { ten: "xem ngày sinh, địa chỉ cá nhân", moTa: "Xem và ghi ngày sinh, địa chỉ cá nhân của hồ sơ người khác trong Danh bạ." },
```

Run: `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc.test.ts`
Expected: PASS. (`src/permission-enforcement.test.ts` sẽ ĐỎ tới Task 5 vì chưa route nào hỏi ô — đúng dự kiến; KHÔNG thêm mục hoãn vào `docs/quyen-hoan.json`. Task 4 và Task 5 commit liền nhau; nếu phải dừng giữa hai task thì ghi BỘ KIỂM CHƯA XANH kèm tên bài này.)

- [ ] **Step 3: Bài đỏ cho nhãn liên hệ — `src/shared/lien-he.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_LOAI_LIEN_HE, nhanLoaiLienHe } from "./lien-he.ts";

test("nhãn loại liên hệ: ba loại có nhãn tiếng Việt; mã lạ ⇒ 'Liên hệ' (không lộ mã thô)", () => {
  assert.deepEqual(NHAN_LOAI_LIEN_HE, { PHONE: "Điện thoại", EMAIL: "Email", ADDRESS: "Địa chỉ" });
  assert.equal(nhanLoaiLienHe("ADDRESS"), "Địa chỉ");
  assert.equal(nhanLoaiLienHe("ZALO"), "Liên hệ");
});
```

Run: `node --test src/shared/lien-he.test.ts` → FAIL (tệp chưa có).

- [ ] **Step 4: `src/shared/lien-he.ts`**

```ts
// Nhãn tiếng Việt của loại liên hệ (ADR-0122 đ6: thêm ADDRESS) — MỘT nguồn cho máy chủ (xem trước gộp hồ sơ) và giao diện (bảng liên hệ Danh bạ). Thuần, không I/O.
import type { ContactPointDto } from "./contracts.ts";

export const NHAN_LOAI_LIEN_HE: Record<ContactPointDto["kind"], string> = { PHONE: "Điện thoại", EMAIL: "Email", ADDRESS: "Địa chỉ" };
export const nhanLoaiLienHe = (kind: string): string => (NHAN_LOAI_LIEN_HE as Record<string, string>)[kind] ?? "Liên hệ";
```

`src/shared/contracts.ts` — trong `ContactPointDto` đổi `kind: "PHONE" | "EMAIL";` thành:

```ts
  /** ADR-0122 đ6: thêm ADDRESS (địa chỉ cá nhân) — chỉ trả cho người giữ party.personal.view hoặc chính chủ (src/modules/parties/rieng-tu.ts). */
  kind: "PHONE" | "EMAIL" | "ADDRESS";
```

trong `PartyDto`, ngay sau dòng `gender: …`:

```ts
  /** ADR-0122 đ1, đ5: ngày sinh 'YYYY-MM-DD' | null. Khoá VẮNG MẶT khi người xem không giữ party.personal.view và không phải chính chủ (không phải null). */
  birthDate?: string | null;
```

Run: `node --test src/shared/lien-he.test.ts` → PASS.

- [ ] **Step 5: Bài đỏ cho luật thuần — `src/modules/parties/rieng-tu.test.ts`**

```ts
// ADR-0122 đ5 + Hiến chương 5.23: ai xem / ghi được ngày sinh và liên hệ ĐỊA CHỈ. Bảng ca theo vai thật (không chép lại công thức).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { PartyDto } from "../../shared/contracts.ts";
import { anTruongRiengTu, ghiDuocRiengTu, laLienHeRiengTu, xemDuocRiengTu } from "./rieng-tu.ts";

const CA: [string, Parameters<typeof xemDuocRiengTu>[0], boolean, boolean][] = [
  // tên ca, người xem, xem được, ghi được
  ["Bán hàng xem hồ sơ khách (không ô)", { coO: false, laChinhChu: false, hoSoCoTaiKhoan: false, quanDuocTaiKhoan: false }, false, false],
  ["Bán hàng xem hồ sơ của CHÍNH MÌNH", { coO: false, laChinhChu: true, hoSoCoTaiKhoan: true, quanDuocTaiKhoan: false }, true, false],
  ["Quản trị xem hồ sơ khách không tài khoản", { coO: true, laChinhChu: false, hoSoCoTaiKhoan: false, quanDuocTaiKhoan: false }, true, true],
  ["Quản trị xem hồ sơ tài khoản Bán hàng (quản được)", { coO: true, laChinhChu: false, hoSoCoTaiKhoan: true, quanDuocTaiKhoan: true }, true, true],
  ["Quản trị xem hồ sơ Quản trị khác / Toàn quyền (không quản được)", { coO: true, laChinhChu: false, hoSoCoTaiKhoan: true, quanDuocTaiKhoan: false }, false, false],
  ["Toàn quyền xem hồ sơ của CHÍNH MÌNH", { coO: true, laChinhChu: true, hoSoCoTaiKhoan: true, quanDuocTaiKhoan: true }, true, false],
];

test("xemDuocRiengTu / ghiDuocRiengTu: theo vai thật — chính chủ xem không ghi; cấp bậc chặn Quản trị", () => {
  for (const [ten, v, xem, ghi] of CA) {
    assert.equal(xemDuocRiengTu(v), xem, `xem — ${ten}`);
    assert.equal(ghiDuocRiengTu(v), ghi, `ghi — ${ten}`);
  }
});

test("laLienHeRiengTu: chỉ ADDRESS", () => {
  assert.equal(laLienHeRiengTu("ADDRESS"), true);
  assert.equal(laLienHeRiengTu("PHONE"), false);
  assert.equal(laLienHeRiengTu("EMAIL"), false);
});

test("anTruongRiengTu: bỏ KHOÁ birthDate và dòng ADDRESS, giữ SĐT / email; không sửa đối tượng gốc", () => {
  const goc = {
    id: "p", kind: "PERSON", displayName: "An", active: true, primaryPhone: "0911222333", roleCodes: [], familyName: null, middleName: null, givenName: "An",
    gender: null, birthDate: "1988-04-23", legalName: null, taxCode: null, address: null, invoiceEmail: null,
    contacts: [
      { id: "c1", kind: "PHONE", value: "0911222333", label: null, isPrimary: true, validFrom: "2026-10-16", validTo: null },
      { id: "c2", kind: "ADDRESS", value: "12 Trần Phú", label: null, isPrimary: true, validFrom: "2026-10-16", validTo: null },
    ],
    roles: [], relationships: [], createdAt: "x", updatedAt: "y", accountLinked: false, editable: true, mergedInto: null, mergedFrom: [],
  } satisfies PartyDto;
  const an = anTruongRiengTu(goc);
  assert.equal("birthDate" in an, false);
  assert.deepEqual(an.contacts.map((c) => c.kind), ["PHONE"]);
  assert.equal(goc.birthDate, "1988-04-23");
  assert.equal(goc.contacts.length, 2);
});
```

Run: `node --test src/modules/parties/rieng-tu.test.ts` → FAIL (tệp chưa có).

- [ ] **Step 6: `src/modules/parties/rieng-tu.ts`**

```ts
// Luật thuần: ai xem / ghi được NGÀY SINH và liên hệ ĐỊA CHỈ (ADDRESS) của một hồ sơ (ADR-0122 đ5; Hiến chương 5.20, 5.23). Không I/O.
// Xem: chính chủ, hoặc người giữ ô party.personal.view — với hồ sơ gắn tài khoản thì còn phải quản được tài khoản đó (cấp bậc, ruling R6).
// Ghi: như xem nhưng KHÔNG BAO GIỜ cho chính chủ (giá trị tự khai là đề xuất, người khác xác minh — 5.23; phiếu tự khai ở lát H-4).
import type { PartyDto } from "../../shared/contracts.ts";

export const LOAI_LIEN_HE_RIENG_TU = ["ADDRESS"] as const;
export interface NguoiXem {
  /** can(staff, "party.personal.view") — người gọi hỏi bằng chuỗi ô nguyên văn (bài permission-enforcement). */
  coO: boolean;
  /** staff.partyId === id hồ sơ. */
  laChinhChu: boolean;
  hoSoCoTaiKhoan: boolean;
  /** ctx.partyAccount(id).manageable — chỉ có nghĩa khi hoSoCoTaiKhoan. */
  quanDuocTaiKhoan: boolean;
}
const quaCapBac = (v: NguoiXem): boolean => !v.hoSoCoTaiKhoan || v.quanDuocTaiKhoan;
export const xemDuocRiengTu = (v: NguoiXem): boolean => v.laChinhChu || (v.coO && quaCapBac(v));
export const ghiDuocRiengTu = (v: NguoiXem): boolean => !v.laChinhChu && v.coO && quaCapBac(v);
export const laLienHeRiengTu = (kind: string): boolean => (LOAI_LIEN_HE_RIENG_TU as readonly string[]).includes(kind);

/** DTO cho người KHÔNG được xem: bỏ hẳn khoá birthDate (không để null — phân biệt "không được xem" với "chưa khai") và mọi dòng liên hệ riêng tư. */
export function anTruongRiengTu(p: PartyDto): PartyDto {
  const { birthDate: _boQua, ...con } = p;
  return { ...con, contacts: p.contacts.filter((c) => !laLienHeRiengTu(c.kind)) };
}
```

Run: `node --test src/modules/parties/rieng-tu.test.ts` → PASS.

- [ ] **Step 7: Bài đỏ cho kiểm đầu vào — thêm vào cuối `src/modules/parties/rules.test.ts`** (thêm `kiemNgaySinh`, `validateContactList`, `validatePartyCreate`, `validatePartyUpdate` vào dòng import từ `./rules.ts` nếu chưa có):

```ts
test("ADR-0122 đ6: liên hệ ADDRESS — chuẩn hoá NFC, gộp khoảng trắng, chữ thường; trống / quá 200 ký tự ⇒ lỗi; loại lạ ⇒ lời thường không mã Anh", () => {
  const r = validateContact({ kind: "ADDRESS", value: "  12   Trần Phú,\tNha Trang " });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.value, "12 Trần Phú, Nha Trang");
    assert.equal(r.value.valueNormalized, "12 trần phú, nha trang");
  }
  assert.equal(validateContact({ kind: "ADDRESS", value: "   " }).ok, false);
  assert.deepEqual(validateContact({ kind: "ADDRESS", value: "a".repeat(201) }), { ok: false, message: "Địa chỉ tối đa 200 ký tự." });
  assert.deepEqual(validateContact({ kind: "ZALO", value: "x" }), { ok: false, message: "Loại liên hệ không hợp lệ (điện thoại, email hoặc địa chỉ)." });
});

test("validateContactList: mỗi loại kể cả ADDRESS một liên hệ chính; dòng đầu của loại tự thành chính", () => {
  const r = validateContactList([{ kind: "ADDRESS", value: "1 A" }, { kind: "ADDRESS", value: "2 B" }]);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value.map((c) => c.isPrimary), [true, false]);
  assert.equal(validateContactList([{ kind: "ADDRESS", value: "1 A", isPrimary: true }, { kind: "ADDRESS", value: "2 B", isPrimary: true }]).ok, false);
});

test("kiemNgaySinh: vắng ⇒ undefined (giữ); '' / null ⇒ null (xoá); trước 1900, sau hôm nay, sai lịch ⇒ lỗi", () => {
  const HOM_NAY = "2026-10-16";
  assert.deepEqual(kiemNgaySinh(undefined, HOM_NAY), { ok: true, value: undefined });
  assert.deepEqual(kiemNgaySinh("", HOM_NAY), { ok: true, value: null });
  assert.deepEqual(kiemNgaySinh(null, HOM_NAY), { ok: true, value: null });
  assert.deepEqual(kiemNgaySinh("1988-04-23", HOM_NAY), { ok: true, value: "1988-04-23" });
  assert.deepEqual(kiemNgaySinh(HOM_NAY, HOM_NAY), { ok: true, value: HOM_NAY });
  assert.deepEqual(kiemNgaySinh("2026-10-17", HOM_NAY), { ok: false, message: "Ngày sinh phải từ năm 1900 tới hôm nay." });
  assert.deepEqual(kiemNgaySinh("1899-12-31", HOM_NAY), { ok: false, message: "Ngày sinh phải từ năm 1900 tới hôm nay." });
  assert.deepEqual(kiemNgaySinh("1990-02-30", HOM_NAY), { ok: false, message: "Ngày sinh không hợp lệ (YYYY-MM-DD)." });
  assert.deepEqual(kiemNgaySinh(19900101, HOM_NAY), { ok: false, message: "Ngày sinh không hợp lệ (YYYY-MM-DD)." });
});

test("validatePartyCreate / Update: ngày sinh cho người (vắng khi sửa = giữ); tổ chức gửi ngày sinh hoặc liên hệ ADDRESS ⇒ lỗi", () => {
  const HOM_NAY = "2026-10-16";
  const tao = validatePartyCreate({ kind: "PERSON", fullName: "Lê An", birthDate: "1988-04-23", contacts: [] }, HOM_NAY);
  assert.ok(tao.ok && tao.value.kind === "PERSON" && tao.value.birthDate === "1988-04-23");
  const taoVang = validatePartyCreate({ kind: "PERSON", fullName: "Lê An", contacts: [] }, HOM_NAY);
  assert.ok(taoVang.ok && taoVang.value.kind === "PERSON" && taoVang.value.birthDate === null);
  assert.deepEqual(validatePartyCreate({ kind: "ORGANIZATION", displayName: "Đại lý A", birthDate: "1988-04-23", contacts: [] }, HOM_NAY), { ok: false, message: "Hồ sơ tổ chức không có ngày sinh." });
  assert.deepEqual(
    validatePartyCreate({ kind: "ORGANIZATION", displayName: "Đại lý A", contacts: [{ kind: "ADDRESS", value: "1 A" }] }, HOM_NAY),
    { ok: false, message: "Địa chỉ của tổ chức ghi ở ô Địa chỉ của hồ sơ, không thêm như liên hệ." },
  );
  const sua = validatePartyUpdate({ fullName: "Lê An", active: true, expectedUpdatedAt: "x" }, "PERSON", HOM_NAY);
  assert.ok(sua.ok && sua.value.kind === "PERSON" && sua.value.birthDate === undefined, "vắng ô ⇒ undefined (route giữ giá trị đang lưu)");
  const suaXoa = validatePartyUpdate({ fullName: "Lê An", active: true, expectedUpdatedAt: "x", birthDate: "" }, "PERSON", HOM_NAY);
  assert.ok(suaXoa.ok && suaXoa.value.kind === "PERSON" && suaXoa.value.birthDate === null);
  assert.deepEqual(validatePartyUpdate({ displayName: "Đại lý A", active: true, expectedUpdatedAt: "x", birthDate: "1988-04-23" }, "ORGANIZATION", HOM_NAY), { ok: false, message: "Hồ sơ tổ chức không có ngày sinh." });
});
```

Run: `node --test src/modules/parties/rules.test.ts` → FAIL (`kiemNgaySinh` chưa có; ADDRESS bị từ chối).

- [ ] **Step 8: Sửa `src/modules/parties/rules.ts`**

Dòng import `vn-date`: `import { isISODate, vnToday } from "../../shared/vn-date.ts";`

Thay khối từ `export type ContactKind = "PHONE" | "EMAIL";` tới hết hàm `validateContactList` bằng:

```ts
/** ADR-0122 đ6: thêm ADDRESS (địa chỉ cá nhân — chỉ hồ sơ người; ai xem / ghi: src/modules/parties/rieng-tu.ts). */
export type ContactKind = "PHONE" | "EMAIL" | "ADDRESS";
export const CONTACT_KINDS: readonly ContactKind[] = ["PHONE", "EMAIL", "ADDRESS"];
const isContactKind = (v: unknown): v is ContactKind => typeof v === "string" && (CONTACT_KINDS as readonly string[]).includes(v);
export interface ContactInput {
  kind: ContactKind;
  value: string;
  valueNormalized: string;
  label: string | null;
  isPrimary: boolean;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(v: unknown): Result<ContactInput> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail("Liên hệ không hợp lệ.");
  const b = v as Record<string, unknown>;
  if (!isContactKind(b.kind)) return fail("Loại liên hệ không hợp lệ (điện thoại, email hoặc địa chỉ).");
  if (typeof b.value !== "string" || !b.value.trim()) return fail("Thiếu giá trị liên hệ.");
  let value = b.value.trim();
  let valueNormalized: string;
  if (b.kind === "PHONE") {
    const p = normalizePhone(value);
    if (!p) return fail("Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
    valueNormalized = p;
  } else if (b.kind === "EMAIL") {
    if (value.length > 200 || !EMAIL_RE.test(value)) return fail("Email không hợp lệ.");
    valueNormalized = value.toLowerCase();
  } else {
    // ADDRESS (ruling R8): NFC, gộp khoảng trắng; khoá so = chữ thường. Trần 200 = CHECK của pty_contact_point.value.
    value = squash(value.normalize("NFC"));
    if (value.length > 200) return fail("Địa chỉ tối đa 200 ký tự.");
    valueNormalized = value.toLowerCase();
  }
  if (value.length > 200) return fail("Liên hệ tối đa 200 ký tự.");
  let label: string | null = null;
  if (b.label !== undefined && b.label !== null && b.label !== "") {
    if (typeof b.label !== "string" || squash(b.label).length > 50) return fail("Ghi chú liên hệ tối đa 50 ký tự.");
    label = squash(b.label) || null;
  }
  if (b.isPrimary !== undefined && typeof b.isPrimary !== "boolean") return fail("isPrimary phải là true/false.");
  return { ok: true, value: { kind: b.kind, value, valueNormalized, label, isPrimary: b.isPrimary === true } };
}

/**
 * Danh sách liên hệ khi tạo hồ sơ (≤ 5). Chốt cờ chính CUỐI CÙNG cho từng loại: có đúng một dòng chính đánh dấu thì giữ, nhiều hơn một → lỗi,
 * không có → dòng đầu của loại đó là chính. Nhờ vậy câu INSERT dùng thẳng cờ, không phụ thuộc thứ tự chèn.
 */
export function validateContactList(v: unknown): Result<ContactInput[]> {
  if (v === undefined || v === null) return { ok: true, value: [] };
  if (!Array.isArray(v) || v.length > 5) return fail("Tối đa 5 liên hệ khi tạo hồ sơ.");
  const list: ContactInput[] = [];
  for (const item of v) {
    const c = validateContact(item);
    if (!c.ok) return c;
    list.push(c.value);
  }
  for (const kind of CONTACT_KINDS) {
    const of = list.filter((c) => c.kind === kind);
    if (of.filter((c) => c.isPrimary).length > 1) return fail("Mỗi loại liên hệ chỉ có một liên hệ chính.");
    if (of.length > 0 && !of.some((c) => c.isPrimary)) of[0]!.isPrimary = true;
  }
  return { ok: true, value: list };
}

/** Ngày sinh sớm nhất nhận (khớp CHECK của migration 0103). */
export const NGAY_SINH_SOM_NHAT = "1900-01-01";
/** ADR-0122 đ1 (ruling R10): `undefined` = vắng ô (sửa: giữ giá trị đang lưu); `null` / `""` = xoá; ngày `YYYY-MM-DD` từ 1900 tới hôm nay giờ VN. */
export function kiemNgaySinh(v: unknown, today: string): Result<string | null | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null || v === "") return { ok: true, value: null };
  if (typeof v !== "string" || !isISODate(v)) return fail("Ngày sinh không hợp lệ (YYYY-MM-DD).");
  if (v < NGAY_SINH_SOM_NHAT || v > today) return fail("Ngày sinh phải từ năm 1900 tới hôm nay.");
  return { ok: true, value: v };
}
```

Thay hai kiểu `PartyCreate` / `PartyUpdate`:

```ts
/** ADR-0084 Đ1: `gender` của hồ sơ người — tạo: NULL = chưa ghi; sửa: `undefined` = giữ nguyên giá trị đang lưu, NULL = xoá. ADR-0122 đ1: `birthDate` cùng quy ước. */
export type PartyCreate =
  | { kind: "PERSON"; name: PersonName; gender: GioiTinh | null; birthDate: string | null; contacts: ContactInput[] }
  | { kind: "ORGANIZATION"; org: OrgFields; contacts: ContactInput[] };
export type PartyUpdate =
  | { kind: "PERSON"; name: PersonName; gender: GioiTinh | null | undefined; birthDate: string | null | undefined; active: boolean; expectedUpdatedAt: string }
  | { kind: "ORGANIZATION"; org: OrgFields; active: boolean; expectedUpdatedAt: string };
```

Thêm ngay dưới hằng `KHONG_GIOI_TINH_TO_CHUC`:

```ts
/** Tổ chức không có ngày sinh; địa chỉ tổ chức ở pty_organization.address, không phải liên hệ ADDRESS (ruling R8). */
const KHONG_NGAY_SINH_TO_CHUC = (b: Record<string, unknown>): string | null =>
  b.birthDate === undefined || b.birthDate === null || b.birthDate === "" ? null : "Hồ sơ tổ chức không có ngày sinh.";
const DIA_CHI_TO_CHUC = "Địa chỉ của tổ chức ghi ở ô Địa chỉ của hồ sơ, không thêm như liên hệ.";
```

Thay `validatePartyCreate`:

```ts
export function validatePartyCreate(body: Record<string, unknown> | null, today: string = vnToday(new Date())): Result<PartyCreate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const contacts = validateContactList(body.contacts);
  if (!contacts.ok) return contacts;
  if (body.kind === "PERSON") {
    const name = personName(body);
    if (!name.ok) return name;
    const gender = kiemGioiTinh(body.gender);
    if (!gender.ok) return gender;
    const ngaySinh = kiemNgaySinh(body.birthDate, today);
    if (!ngaySinh.ok) return ngaySinh;
    return { ok: true, value: { kind: "PERSON", name: name.value, gender: gender.value ?? null, birthDate: ngaySinh.value ?? null, contacts: contacts.value } };
  }
  if (body.kind === "ORGANIZATION") {
    const khong = KHONG_GIOI_TINH_TO_CHUC(body) ?? KHONG_NGAY_SINH_TO_CHUC(body);
    if (khong) return fail(khong);
    if (contacts.value.some((c) => c.kind === "ADDRESS")) return fail(DIA_CHI_TO_CHUC);
    const org = orgFields(body);
    return org.ok ? { ok: true, value: { kind: "ORGANIZATION", org: org.value, contacts: contacts.value } } : org;
  }
  return fail("Loại hồ sơ phải là PERSON hoặc ORGANIZATION.");
}
```

Thay `validatePartyUpdate`:

```ts
/** Loại hồ sơ KHÔNG đổi được: `kind` lấy từ hồ sơ hiện có. */
export function validatePartyUpdate(body: Record<string, unknown> | null, kind: "PERSON" | "ORGANIZATION", today: string = vnToday(new Date())): Result<PartyUpdate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  if (typeof body.active !== "boolean") return fail("Trạng thái hoạt động phải là true/false.");
  if (kind === "PERSON") {
    const name = personName(body);
    if (!name.ok) return name;
    const gender = kiemGioiTinh(body.gender);
    if (!gender.ok) return gender;
    const ngaySinh = kiemNgaySinh(body.birthDate, today);
    if (!ngaySinh.ok) return ngaySinh;
    return { ok: true, value: { kind, name: name.value, gender: gender.value, birthDate: ngaySinh.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } };
  }
  const khong = KHONG_GIOI_TINH_TO_CHUC(body) ?? KHONG_NGAY_SINH_TO_CHUC(body);
  if (khong) return fail(khong);
  const org = orgFields(body);
  return org.ok ? { ok: true, value: { kind, org: org.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } } : org;
}
```

- [ ] **Step 9: Chạy bài thuần**

Run: `node --test src/modules/parties/rules.test.ts src/modules/parties/rieng-tu.test.ts src/shared/lien-he.test.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc.test.ts`
Expected: PASS. `npm run typecheck` lúc này sẽ đỏ ở `index.ts`/`repository.ts` (thiếu `birthDate` khi dựng `v` cho `updatePartyStatements`) — sửa ở Task 5; KHÔNG commit riêng Task 4 nếu typecheck đỏ. Task 4 và Task 5 commit chung một lần cuối Task 5 (hai đơn vị kiểm, một commit xanh), hoặc commit Task 4 sau khi đã thêm dòng `birthDate: …` tối thiểu ở route (Task 5 Step 3) để typecheck xanh.

---

### Task 5: Route — lọc DTO, chặn ghi, tìm kiếm chỉ SĐT/email, nhãn, e2e (VIỆC LỚN — quyền)

**Files:**
- Modify: `src/modules/parties/repository.ts` (`PartyRow`, `FIND`, `INSERT_PERSON`, `UPDATE_PERSON`, `LIST`, `newPersonStatements`, `updatePartyStatements`)
- Modify: `src/modules/parties/index.ts` (`toDetail`, `respondParty`, `chanGhiRiengTu`, POST/PUT `/api/parties*`, liên hệ, xem trước gộp)
- Create: `src/modules/parties/rieng-tu-route.test.ts`
- Modify: `web/parties.ts` (nhãn loại liên hệ)
- Create: `tests/e2e/ho-so-rieng-tu.mjs`; Modify: `tests/e2e/run.mjs` (mảng `ALL`)
- Modify: `docs/SO-HANG-RAO.md`

**Interfaces:**
- Consumes: `xemDuocRiengTu`, `ghiDuocRiengTu`, `laLienHeRiengTu`, `anTruongRiengTu` (`./rieng-tu`); `nhanLoaiLienHe` (`../../shared/lien-he`); `PartyCreate`/`PartyUpdate` mới (Task 4); cột `pty_person.birth_date`, loại `ADDRESS` (Task 3).
- Produces: `GET /api/parties/:id` (và mọi phản hồi `respondParty`) có khoá `party.birthDate` CHỈ khi người xem được thấy; mã lỗi 403 `personal_forbidden`, `personal_self`; 400 khi `ADDRESS` cho tổ chức. `newPersonStatements(db, { …, birthDate?: string | null }, …)`.

- [ ] **Step 1: Bài đỏ trên SQLite thật — `src/modules/parties/rieng-tu-route.test.ts`**

```ts
// ADR-0122 đ5 (lát H-1 Gói 2): ngày sinh + liên hệ ĐỊA CHỈ qua route thật (tests/audit/harness.mjs). Đọc: Bán hàng, Kế toán không thấy; Quản trị theo cấp bậc,
// Toàn quyền, chính chủ thấy. Ghi: thiếu ô ⇒ 403 personal_forbidden; chính chủ ⇒ 403 personal_self. PUT vắng birthDate giữ nguyên. Tìm kiếm không khớp địa chỉ.
// Nhật ký không chứa ngày sinh / địa chỉ. Xem trước gộp gọi đúng nhãn "Địa chỉ".
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const NGAY = "1988-04-23";
const SO_NHA = "975310";
const DIA_CHI = `${SO_NHA} Đường Thử, Nha Trang`;

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000002", name: "Bình", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000004", name: "Quản trị Hai", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const pty = (id: string) => `pty-${id}`;
async function taoKhach(w: any, ten = "Khách Riêng Tư", dc = DIA_CHI): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: ten, birthDate: NGAY, contacts: [{ kind: "PHONE", value: "0911222333" }, { kind: "ADDRESS", value: dc }] } });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
}
const ngaySinh = (w: any, id: string) => w.q("SELECT birth_date FROM pty_person WHERE party_id = ?", id)[0].birth_date;
const datNgaySinh = (w: any, id: string, v: string | null) => w.sqlite.prepare("UPDATE pty_person SET birth_date = ? WHERE party_id = ?").run(v, id);
const nhatKy = (w: any, id: string): string[] => w.q("SELECT detail FROM audit_log WHERE target_id = ? ORDER BY rowid", id).map((r: any) => String(r.detail ?? ""));
async function sua(w: any, as: string, id: string, them: Record<string, unknown>) {
  const cur = w.q("SELECT updated_at u, active a, display_name n FROM pty_party WHERE id = ?", id)[0];
  return w.call("PUT", `/api/parties/${id}`, { as, body: { fullName: cur.n, active: cur.a === 1, expectedUpdatedAt: cur.u, ...them } });
}

test("đọc: Bán hàng, Kế toán không có khoá birthDate, không dòng ADDRESS, không chữ ngày sinh / địa chỉ; Quản trị, Toàn quyền thấy đủ", async () => {
  const w = setup();
  const id = await taoKhach(w);
  for (const as of [SALES, ACC]) {
    const r = await w.call("GET", `/api/parties/${id}`, { as });
    assert.equal(r.status, 200, r.text);
    assert.equal("birthDate" in r.json.party, false, as);
    assert.deepEqual(r.json.party.contacts.map((c: any) => c.kind), ["PHONE"], as);
    assert.doesNotMatch(r.text, new RegExp(`${SO_NHA}|${NGAY}`), as);
  }
  for (const as of [ADM, SUP]) {
    const r = await w.call("GET", `/api/parties/${id}`, { as });
    assert.equal(r.json.party.birthDate, NGAY, as);
    assert.ok(r.json.party.contacts.some((c: any) => c.kind === "ADDRESS" && c.value === DIA_CHI), as);
  }
});

test("đọc: chính chủ (Bán hàng mở hồ sơ của mình) thấy ngày sinh của mình", async () => {
  const w = setup();
  datNgaySinh(w, pty(SALES), NGAY);
  const r = await w.call("GET", `/api/parties/${pty(SALES)}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.party.birthDate, NGAY);
});

test("đọc theo cấp bậc: Quản trị mở hồ sơ của Quản trị khác → không thấy; Toàn quyền mở → thấy", async () => {
  const w = setup();
  datNgaySinh(w, pty(ADM), NGAY);
  let r = await w.call("GET", `/api/parties/${pty(ADM)}`, { as: ADM2 });
  assert.equal(r.status, 200, r.text);
  assert.equal("birthDate" in r.json.party, false);
  r = await w.call("GET", `/api/parties/${pty(ADM)}`, { as: SUP });
  assert.equal(r.json.party.birthDate, NGAY);
});

test("ghi: Bán hàng gửi birthDate (tạo, sửa), thêm ADDRESS, đóng ADDRESS → 403 personal_forbidden, không ghi gì", async () => {
  const w = setup();
  const id = await taoKhach(w);
  let r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Khách Mới", birthDate: "1990-01-01", contacts: [] } });
  assert.equal(r.status, 403);
  assert.equal(r.json.error.code, "personal_forbidden");
  r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Khách Mới", contacts: [{ kind: "ADDRESS", value: "1 Đường Khác" }] } });
  assert.equal(r.status, 403);
  r = await sua(w, SALES, id, { birthDate: "1990-01-01" });
  assert.equal(r.status, 403);
  assert.equal(r.json.error.code, "personal_forbidden");
  assert.equal(ngaySinh(w, id), NGAY);
  r = await w.call("POST", `/api/parties/${id}/contacts`, { as: SALES, body: { kind: "ADDRESS", value: "1 Đường Khác" } });
  assert.equal(r.status, 403);
  const dc = w.q("SELECT id FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", id)[0].id as string;
  r = await w.call("POST", `/api/parties/${id}/contacts/${dc}/end`, { as: SALES, body: {} });
  assert.equal(r.status, 403);
  assert.equal(w.q("SELECT valid_to_date FROM pty_contact_point WHERE id = ?", dc)[0].valid_to_date, null, "địa chỉ vẫn mở");
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", id)[0].n, 1);
});

test("ghi: Toàn quyền sửa ngày sinh của CHÍNH MÌNH → 403 personal_self; Toàn quyền sửa ngày sinh của Quản trị → được", async () => {
  const w = setup();
  let r = await sua(w, SUP, pty(SUP), { birthDate: NGAY });
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.code, "personal_self");
  assert.equal(ngaySinh(w, pty(SUP)), null);
  r = await sua(w, SUP, pty(ADM), { birthDate: NGAY });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.party.birthDate, NGAY);
});

test("PUT vắng birthDate ⇒ giữ nguyên (Bán hàng đổi tên không xoá ngày sinh); '' ⇒ xoá; nhật ký 'đổi ngày sinh' không kèm giá trị", async () => {
  const w = setup();
  const id = await taoKhach(w);
  let r = await sua(w, SALES, id, { fullName: "Khách Đổi Tên" });
  assert.equal(r.status, 200, r.text);
  assert.equal(ngaySinh(w, id), NGAY, "Bán hàng đổi tên không được xoá ngày sinh họ không thấy");
  r = await sua(w, ADM, id, { birthDate: "" });
  assert.equal(r.status, 200, r.text);
  assert.equal(ngaySinh(w, id), null);
  const nk = nhatKy(w, id);
  assert.ok(nk.some((d) => d.includes("đổi ngày sinh")));
  for (const d of nk) assert.doesNotMatch(d, new RegExp(`${NGAY}|${SO_NHA}|Đường Thử`), "nhật ký không chứa ngày sinh / địa chỉ");
});

test("tìm kiếm Danh bạ: chữ số của địa chỉ không ra hồ sơ; số điện thoại vẫn ra", async () => {
  const w = setup();
  const id = await taoKhach(w);
  let r = await w.call("GET", `/api/parties?q=${SO_NHA}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.parties.some((p: any) => p.id === id), false, "tìm theo chữ số địa chỉ lộ người ở địa chỉ đó");
  r = await w.call("GET", "/api/parties?q=0911222333", { as: SALES });
  assert.equal(r.json.parties.some((p: any) => p.id === id), true);
});

test("ADDRESS cho hồ sơ tổ chức → 400; thêm địa chỉ cho người ghi nhật ký 'thêm địa chỉ' không kèm giá trị", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Đại lý A", contacts: [] } })).json.party.id as string;
  let r = await w.call("POST", `/api/parties/${o}/contacts`, { as: ADM, body: { kind: "ADDRESS", value: "1 Đường A" } });
  assert.equal(r.status, 400, r.text);
  const p = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Người Không Địa Chỉ", contacts: [] } })).json.party.id as string;
  r = await w.call("POST", `/api/parties/${p}/contacts`, { as: ADM, body: { kind: "ADDRESS", value: DIA_CHI } });
  assert.equal(r.status, 201, r.text);
  const nk = nhatKy(w, p);
  assert.ok(nk.includes("thêm địa chỉ"));
  for (const d of nk) assert.doesNotMatch(d, new RegExp(SO_NHA));
});

test("xem trước gộp hồ sơ: liên hệ địa chỉ mang nhãn 'Địa chỉ', không 'Email'", async () => {
  const w = setup();
  const a = await taoKhach(w, "Nguyễn Văn Gộp", "11 Đường Gộp, Nha Trang");
  const b = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Nguyễn Văn Gộp", contacts: [] } })).json.party.id as string;
  const r = await w.call("POST", `/api/parties/${a}/merge/preview`, { as: ADM, body: { intoPartyId: b } });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.chuyen.some((m: any) => m.loai === "LIEN_HE" && m.nhan.startsWith("Địa chỉ ")), JSON.stringify(r.json.chuyen));
  assert.equal(r.json.chuyen.some((m: any) => m.nhan.startsWith("Email ")), false);
});
```

Run: `node --test src/modules/parties/rieng-tu-route.test.ts`
Expected: FAIL (route chưa nhận `birthDate`, chưa lọc DTO, chưa chặn).

- [ ] **Step 2: Sửa `src/modules/parties/repository.ts`**

`PartyRow`: thêm `birth_date: string | null;` ngay sau `gender: string | null;`.

`FIND` — thay `pe.gender,` bằng `pe.gender, pe.birth_date,`:

```ts
  `SELECT p.id, p.party_kind, p.display_name, p.active, p.created_at, p.updated_at, pe.family_name, pe.middle_name, pe.given_name, pe.gender, pe.birth_date,
          o.legal_name, o.tax_code, o.address, o.invoice_email, p.merged_into_id, p.merged_at, t.display_name AS merged_into_name
   FROM pty_party p LEFT JOIN pty_person pe ON pe.party_id = p.id LEFT JOIN pty_organization o ON o.party_id = p.id LEFT JOIN pty_party t ON t.id = p.merged_into_id
   WHERE p.id = ?1`,
```

`LIST` — chỉ so liên hệ SĐT / email khi tìm (Review Focus 2):

```ts
          OR EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = p.id AND c.valid_to_date IS NULL AND c.contact_kind_code IN ('PHONE', 'EMAIL')
                     AND c.value_normalized LIKE ?4 ESCAPE '\\'))
```

`INSERT_PERSON`:

```ts
  `INSERT INTO pty_person (party_id, family_name, middle_name, given_name, gender, birth_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?7, ?8, ?5, ?6, ?5, ?6)`,
```

`UPDATE_PERSON`:

```ts
  `UPDATE pty_person SET family_name = ?2, middle_name = ?3, given_name = ?4, gender = ?8, birth_date = ?9, updated_at = ?5, updated_by = ?6
   WHERE party_id = ?1 AND (SELECT updated_at FROM pty_party WHERE id = ?1) = ?7`,
```

`newPersonStatements`: kiểu `input` thêm `birthDate?: string | null;` và dòng bind:

```ts
      db.prepare(INSERT_PERSON).bind(partyId, name.family, name.middle, name.given, at, actorId, input.gender ?? null, input.birthDate ?? null),
```

`updatePartyStatements`: kiểu nhánh PERSON thêm `birthDate: string | null;` (đã quyết ở route); dòng bind:

```ts
      db.prepare(UPDATE_PERSON).bind(id, v.name.family, v.name.middle, v.name.given, at, actorId, v.expectedUpdatedAt, v.gender, v.birthDate),
```

- [ ] **Step 3: Sửa `src/modules/parties/index.ts`**

Import thêm:

```ts
import type { StaffProfile } from "../../shared/contracts";
import { nhanLoaiLienHe } from "../../shared/lien-he";
import { anTruongRiengTu, ghiDuocRiengTu, laLienHeRiengTu, xemDuocRiengTu } from "./rieng-tu";
```

(`StaffProfile` gộp vào khối `import type { … } from "../../shared/contracts";` có sẵn.)

`toDetail` — ngay sau `gender: gioiTinhHopLe(p.gender),` thêm `birthDate: p.birth_date,`.

`xemTruocDto` — thay dòng `nhanLienHe`:

```ts
  const nhanLienHe = (c: { kind: string; value: string }) => `${nhanLoaiLienHe(c.kind)} ${c.value}`;
```

Ngay trên `async function respondParty`, thêm:

```ts
const RIENG_TU_FORBIDDEN = () => error(403, "personal_forbidden", "Tài khoản này không ghi được ngày sinh hay địa chỉ cá nhân của hồ sơ này.");
const RIENG_TU_CHINH_CHU = () => error(403, "personal_self", "Ngày sinh và địa chỉ của chính bạn cần người khác xác minh, chưa sửa trực tiếp ở đây được.");
const CHI_TIET_THEM_LIEN_HE: Record<string, string> = { PHONE: "thêm số điện thoại", EMAIL: "thêm email", ADDRESS: "thêm địa chỉ" };
/** ADR-0122 đ5: chặn GHI ngày sinh / liên hệ ADDRESS (null = được). `id` null = hồ sơ đang tạo (chưa ai là chính chủ, chưa tài khoản). */
function chanGhiRiengTu(staff: StaffProfile, id: string | null, acc: PartyAccountVerdict | null): Response | null {
  const v = { coO: can(staff, "party.personal.view"), laChinhChu: id !== null && staff.partyId === id, hoSoCoTaiKhoan: acc?.linked ?? false, quanDuocTaiKhoan: acc?.manageable ?? false };
  if (ghiDuocRiengTu(v)) return null;
  return v.laChinhChu ? RIENG_TU_CHINH_CHU() : RIENG_TU_FORBIDDEN();
}
```

Trong `respondParty`, thay dòng `return json({ party } satisfies PartyResponse, status);` bằng:

```ts
  // ADR-0122 đ5: ngày sinh + liên hệ ADDRESS chỉ cho chính chủ hoặc người giữ party.personal.view (Quản trị theo cấp bậc — ruling R6). Mọi phản hồi hồ sơ đi qua đây.
  const xem = xemDuocRiengTu({ coO: can(ctx.staff, "party.personal.view"), laChinhChu: ctx.staff.partyId === id, hoSoCoTaiKhoan: acc.linked, quanDuocTaiKhoan: acc.manageable });
  return json({ party: xem ? party : anTruongRiengTu(party) } satisfies PartyResponse, status);
```

Route `POST /api/parties` — sau `const v = parsed.value;` thêm:

```ts
      // ADR-0122 đ5 (ruling R12): gửi ngày sinh / địa chỉ khi không giữ ô ⇒ 403, không lặng lẽ bỏ.
      if ((v.kind === "PERSON" && v.birthDate !== null) || v.contacts.some((c) => laLienHeRiengTu(c.kind))) {
        const chan = chanGhiRiengTu(staff, null, null);
        if (chan) return chan;
      }
```

và trong lời gọi `newPersonStatements(env.DB, { name: v.name, gender: v.gender, contacts: v.contacts, contactsFrom: today }, …)` đổi thành `{ name: v.name, gender: v.gender, birthDate: v.birthDate, contacts: v.contacts, contactsFrom: today }`.

Route `PUT /api/parties/:id` — thay khối từ `const pv = parsed.value;` tới `const detail = …;` bằng:

```ts
      const pv = parsed.value;
      // ADR-0122 đ5: ô ngày sinh CÓ mặt (kể cả để xoá) ⇒ phải giữ party.personal.view, không phải chính chủ, qua cấp bậc. VẮNG ⇒ giữ giá trị đang lưu
      // (Review Focus 1: Bán hàng đổi tên không được xoá ngày sinh họ không thấy).
      if (pv.kind === "PERSON" && pv.birthDate !== undefined) {
        const chan = chanGhiRiengTu(staff, id, acc);
        if (chan) return chan;
      }
      const gioiTinhCu = gioiTinhHopLe(current.gender);
      const ngaySinhCu = current.birth_date;
      const v = pv.kind === "PERSON"
        ? { ...pv, gender: pv.gender === undefined ? gioiTinhCu : pv.gender, birthDate: pv.birthDate === undefined ? ngaySinhCu : pv.birthDate }
        : pv;
      const doiGioiTinh = v.kind === "PERSON" && v.gender !== gioiTinhCu;
      const doiNgaySinh = v.kind === "PERSON" && v.birthDate !== ngaySinhCu;
      const stmts = updatePartyStatements(env.DB, id, v, staff.id, at);
      // Nhật ký chỉ ghi "đổi giới tính" / "đổi ngày sinh" — KHÔNG giá trị (Hiến chương 5.20).
      const detail = `${KIND_LABEL[current.party_kind]}${doiGioiTinh ? " — đổi giới tính" : ""}${doiNgaySinh ? " — đổi ngày sinh" : ""}`;
```

(Câu `const at = new Date().toISOString();` đứng TRƯỚC khối này như cũ.)

Route `POST /api/parties/:id/contacts` — sau `const c = parsed.value;` thêm:

```ts
      if (laLienHeRiengTu(c.kind)) {
        if (detail.party.party_kind !== "PERSON") return error(400, "invalid_input", "Địa chỉ của tổ chức ghi ở ô Địa chỉ của hồ sơ, không thêm như liên hệ.");
        const chan = chanGhiRiengTu(staff, id, acc);
        if (chan) return chan;
      }
```

và thay `detail: c.kind === "PHONE" ? "thêm số điện thoại" : "thêm email"` bằng `detail: CHI_TIET_THEM_LIEN_HE[c.kind] ?? "thêm liên hệ"`.

Route `POST /api/parties/:id/contacts/:cid/end` — thay `const hoSo = id ? await findParty(env.DB, id) : null;` bằng `const chiTiet = id ? await getPartyDetail(env.DB, id) : null;`, đổi `!hoSo` thành `!chiTiet`, `hoSo.merged_into_id` thành `chiTiet.party.merged_into_id`; rồi ngay sau dòng `if (chiTiet.party.merged_into_id) return DA_GOP();` thêm:

```ts
      // ADR-0122 đ5 (Review Focus 4): đóng liên hệ ĐỊA CHỈ cũng là ghi trường riêng tư — kể cả khi người gọi đoán được id dòng.
      const lienHe = chiTiet.contacts.find((x) => x.id === cid);
      if (lienHe && laLienHeRiengTu(lienHe.contact_kind_code)) {
        const chan = chanGhiRiengTu(staff, id, acc);
        if (chan) return chan;
      }
```

`web/parties.ts` — import `import { nhanLoaiLienHe } from "../src/shared/lien-he";` và ở dòng dựng `contactRows` thay `h("td", null, c.kind === "PHONE" ? "Điện thoại" : "Email")` bằng `h("td", null, nhanLoaiLienHe(c.kind))`. (Không thêm lựa chọn "Địa chỉ" vào ô chọn loại — ruling R11.)

- [ ] **Step 4: Chạy bài route + bài liên quan**

Run: `node --test src/modules/parties/rieng-tu-route.test.ts src/modules/parties/gioi-tinh-route.test.ts src/modules/parties/gop-route.test.ts src/modules/parties/cong-ty-chu.test.ts src/modules/parties/ho-so-co-tai-khoan.test.ts src/permission-enforcement.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/architecture.test.ts src/giay-to-khong-lo-so.test.ts`
Expected: PASS hết (`permission-enforcement` nay xanh vì `index.ts` hỏi `can(…, "party.personal.view")`).

- [ ] **Step 5: Kịch bản e2e — `tests/e2e/ho-so-rieng-tu.mjs`**

```js
// Hồ sơ mở rộng (ADR-0122 đ5, lát H-1 Gói 2) trên API thật + D1 local tạm: ngày sinh và liên hệ ĐỊA CHỈ chỉ Quản trị / Toàn quyền thấy; Bán hàng, Kế toán không thấy,
// không tìm ra qua chữ số của địa chỉ, không ghi được (403); Bán hàng đổi tên không làm mất ngày sinh; nhật ký không chứa ngày sinh / địa chỉ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sqlRows } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const KE_TOAN = await session(ACCOUNTS.accountant);
const ADMIN = await session(ACCOUNTS.admin);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const tag = String(Date.now()).slice(-6);
const SO_NHA = `9${tag}`; // chữ số riêng của lần chạy — dò tìm kiếm và nhật ký
const DIA_CHI = `${SO_NHA} Đường Thử E2E, Nha Trang`;
const NGAY_SINH = "1988-04-23";

let r = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: `Khách Riêng Tư ${tag}`, birthDate: NGAY_SINH, contacts: [{ kind: "ADDRESS", value: DIA_CHI }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const id = r.body.party.id;
assert.equal(r.body.party.birthDate, NGAY_SINH);
assert.ok(r.body.party.contacts.some((c) => c.kind === "ADDRESS" && c.value === DIA_CHI));
console.log("✓ Quản trị tạo hồ sơ kèm ngày sinh + địa chỉ");

for (const [ten, ck] of [["Bán hàng", SALES], ["Kế toán", KE_TOAN]]) {
  r = await call(ck, "GET", `/api/parties/${id}`);
  assert.equal(r.status, 200, ten);
  assert.equal("birthDate" in r.body.party, false, `${ten} thấy khoá birthDate`);
  assert.doesNotMatch(JSON.stringify(r.body), new RegExp(`${SO_NHA}|${NGAY_SINH}`), `${ten} thấy ngày sinh / địa chỉ`);
}
assert.equal((await call(TOAN_QUYEN, "GET", `/api/parties/${id}`)).body.party.birthDate, NGAY_SINH);
console.log("✓ Bán hàng, Kế toán không thấy; Toàn quyền thấy");

r = await call(SALES, "GET", `/api/parties?q=${SO_NHA}`);
assert.equal(r.status, 200);
assert.equal(r.body.parties.some((p) => p.id === id), false, "tìm theo chữ số địa chỉ ra hồ sơ");
console.log("✓ tìm kiếm không khớp địa chỉ");

let hien = (await call(SALES, "GET", `/api/parties/${id}`)).body.party;
r = await call(SALES, "PUT", `/api/parties/${id}`, { fullName: `Khách Đổi Tên ${tag}`, active: true, expectedUpdatedAt: hien.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
hien = (await call(ADMIN, "GET", `/api/parties/${id}`)).body.party;
assert.equal(hien.birthDate, NGAY_SINH, "Bán hàng đổi tên làm mất ngày sinh");
console.log("✓ Bán hàng đổi tên, ngày sinh còn nguyên");

r = await call(SALES, "PUT", `/api/parties/${id}`, { fullName: hien.displayName, active: true, expectedUpdatedAt: hien.updatedAt, birthDate: "1990-01-01" });
assert.equal(r.status, 403);
assert.equal(r.body.error.code, "personal_forbidden");
r = await call(SALES, "POST", `/api/parties/${id}/contacts`, { kind: "ADDRESS", value: "1 Đường Khác" });
assert.equal(r.status, 403);
const dc = hien.contacts.find((c) => c.kind === "ADDRESS");
r = await call(SALES, "POST", `/api/parties/${id}/contacts/${dc.id}/end`, {});
assert.equal(r.status, 403);
r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName: `Khách Mới ${tag}`, birthDate: "1990-01-01", contacts: [] });
assert.equal(r.status, 403);
console.log("✓ Bán hàng ghi ngày sinh / địa chỉ → 403");

const nk = await sqlRows(`SELECT detail FROM audit_log WHERE target_id = '${id}'`);
assert.ok(nk.length >= 2);
for (const { detail } of nk) assert.doesNotMatch(String(detail ?? ""), new RegExp(`${SO_NHA}|${NGAY_SINH}|Đường Thử`), "nhật ký chứa ngày sinh / địa chỉ");
console.log("✓ nhật ký không chứa ngày sinh / địa chỉ");
```

`tests/e2e/run.mjs` — trong mảng `ALL`, thêm `"ho-so-rieng-tu"` ngay sau `"gop-ho-so"`.

- [ ] **Step 6: Chạy e2e (cần mạng; tắt mọi `wrangler dev` mồ côi trước)**

Run: `npm run build:web && npm run test:e2e -- ho-so-rieng-tu parties gop-ho-so permissions`
Expected: bốn kịch bản `✔`. (Bộ đủ + `audit-invariants --strict` chạy ở Task 6.)

- [ ] **Step 7: Kịch bản Chrome cho nhãn ở Danh bạ**

Chạy lại `dot-a-smoke.mjs` (`docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/`) và `t2b-danh-ba-smoke.mjs` (`docs/evidence/2026-09-28-t2b/kich-ban/`) theo bảng của `web/CLAUDE.md`, có `AXE_JS`. Expected: "SMOKE OK" cả hai. Không có Chrome trong môi trường: ghi "chưa kiểm Chrome" vào báo cáo, không nói đạt.

- [ ] **Step 8: Sổ hàng rào** — thêm dòng:

```
| `src/modules/parties/rieng-tu-route.test.ts` + e2e `tests/e2e/ho-so-rieng-tu.mjs` (lát H-1 Gói 2, ADR-0122 đ5) | Bán hàng, Kế toán thấy ngày sinh / địa chỉ cá nhân qua DTO hồ sơ hay qua tìm kiếm chữ số; ghi hai trường khi thiếu ô; chính chủ tự ghi; Quản trị đọc hồ sơ cấp trên; PUT đổi tên xoá mất ngày sinh | Route thật trên SQLite (harness) + API thật trên D1 local; luật một nơi `src/modules/parties/rieng-tu.ts`; ô `party.personal.view` (bài `permission-enforcement` đòi route hỏi) | Chưa ghi nhận — phá thử ở Task 6 (trả `party` thay vì `anTruongRiengTu(party)` ⇒ ca đọc đỏ; bỏ `contact_kind_code IN ('PHONE','EMAIL')` ở LIST ⇒ ca tìm kiếm đỏ; bỏ chặn ở route đóng liên hệ ⇒ ca đóng đỏ; hoàn nguyên) | Không chặn: DTO khác ngoài `/api/parties*` nếu sau này thêm trường — phải rà theo `TRANG-GHEP.md` §2 |
```

- [ ] **Step 9: Bộ kiểm chính + kiểu, commit (gồm cả Task 4)**

Run: `npm test && npm run typecheck`
Expected: xanh, 0 lỗi.

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc-ten.ts src/modules/parties/rieng-tu.ts src/modules/parties/rieng-tu.test.ts src/shared/lien-he.ts src/shared/lien-he.test.ts src/modules/parties/rules.ts src/modules/parties/rules.test.ts src/shared/contracts.ts src/modules/parties/repository.ts src/modules/parties/index.ts src/modules/parties/rieng-tu-route.test.ts web/parties.ts tests/e2e/ho-so-rieng-tu.mjs tests/e2e/run.mjs docs/SO-HANG-RAO.md
git commit -m "Ngày sinh và địa chỉ cá nhân chỉ Quản trị, Toàn quyền, chính chủ xem (ADR-0122 đ5)

Vì sao: Bán hàng, Kế toán đang xem được mọi hồ sơ qua party.view; thêm hai trường riêng
tư vào cùng DTO sẽ mở rộng phạm vi xem của họ. Thêm ô party.personal.view, một luật thuần
cho xem/ghi, lọc DTO, chặn ghi khi thiếu ô hoặc tự ghi của mình, tìm kiếm chỉ khớp SĐT/email."
```

- [ ] **Step 10: Giao người kiểm độc lập (vai `nguoi-kiem-doc-lap`, chỉ đọc) — VIỆC LỚN quyền**

Nội dung giao: đọc diff Task 4–5 đối chiếu ADR-0122 đ5, `TRANG-GHEP.md` §2 (dòng `party.view`, `party.personal.view`, `party.write`) và ruling R6, R7, R12; liệt kê MỌI đường trả `PartyDto` / `ContactPointDto` (grep `respondParty`, `toContact`, `ContactPointDto`, `contacts_of`) và xác nhận không đường nào trả `ADDRESS`/`birthDate` cho người không được xem; chạy lại `node --test src/modules/parties/rieng-tu-route.test.ts src/permission-enforcement.test.ts src/shared/permissions.test.ts` và `npm run test:e2e -- ho-so-rieng-tu`; thử một phép phá ở Review Focus. Chỉ báo cáo.

---

### Task 6: Nhật ký thay đổi, tài liệu mô tả, bộ kiểm đủ, phá thử hàng rào

**Files:**
- Modify: `src/shared/changelog.ts`
- Modify: `docs/SYSTEM-DESIGN.md` §7 (API hồ sơ), §8 (ô mới); `docs/CHANGE-GUIDE.md` công thức e (ô mới — ghi chú), `docs/SO-HANG-RAO.md` (điền ngày quan sát)

**Interfaces:**
- Consumes: mọi thứ của Task 1–5.
- Produces: mục nhật ký thay đổi 2.10 (số tạm); sổ hàng rào có ngày quan sát cho năm dòng mới.

- [ ] **Step 1: Mục nhật ký thay đổi** — thêm vào ĐẦU mảng `CHANGELOG` của `src/shared/changelog.ts`:

```ts
  {
    // Gói 2 hồ sơ riêng tư, lát H-0 + H-1 (Hiến chương 5.20; ADR-0122, ADR-0126 đ1): hạng dữ liệu cá nhân cho mọi cột; migration 0103 thêm ngày sinh, liên hệ địa chỉ,
    // giấy tờ tổ chức, sổ xác minh, chính sách riêng tư + đồng ý (chưa có màn nhập). CÓ migration — cần trien-khai sau day-len.
    // Số 2.10 là số TẠM (main 2.8; worktree stoic-heisenberg giữ 2.9 — kiểm 2026-10-16): phiên phát hành kiểm lại số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md).
    version: "2.10",
    date: "2026-10-16",
    items: [
      { kind: "doi", text: "Danh bạ: ngày sinh và địa chỉ cá nhân của một người chỉ Quản trị, Toàn quyền và chính người đó xem được. Bán hàng, Kế toán không thấy, và tìm theo chữ số của địa chỉ cũng không ra." },
      { kind: "doi", text: "Nền tảng đã có chỗ lưu giấy phép của công ty đối tác và kết quả xác minh hồ sơ. Màn nhập sẽ có ở bản sau." },
    ],
  },
```

Run: `node --test src/shared/changelog.test.ts src/shared/app-info.test.ts`
Expected: PASS.

- [ ] **Step 2: Tài liệu mô tả**

`docs/SYSTEM-DESIGN.md` §8 (bảng ô quyền): thêm dòng `party.personal.view` — Quản trị (theo cấp bậc), Toàn quyền; xem / ghi ngày sinh và liên hệ địa chỉ của hồ sơ người khác; chính chủ xem của mình, không ghi; luật ở `src/modules/parties/rieng-tu.ts` (ADR-0122 đ5).

`docs/SYSTEM-DESIGN.md` §7 (API hồ sơ): ghi `PartyDto.birthDate` (vắng khoá khi không được xem), `ContactPointDto.kind` thêm `ADDRESS`; 403 `personal_forbidden` / `personal_self`; tìm kiếm `GET /api/parties?q=` chỉ khớp SĐT, email, tên.

`docs/CHANGE-GUIDE.md` công thức e, thêm vào "Bẫy":

```
- **Trường riêng tư của hồ sơ (ngày sinh, liên hệ ADDRESS — ADR-0122 đ5):** mọi DTO hồ sơ mới phải đi qua `respondParty` hoặc gọi `xemDuocRiengTu`/`anTruongRiengTu` của `src/modules/parties/rieng-tu.ts`; đường ghi mới gọi `chanGhiRiengTu`. Thêm một loại liên hệ riêng tư = thêm vào `LOAI_LIEN_HE_RIENG_TU` và nhãn ở `src/shared/lien-he.ts`.
```

- [ ] **Step 3: Bộ kiểm đầy đủ**

Run: `npm test && npm run typecheck`
Expected: xanh, 0 lỗi.

Run: `npm run build:web && npm run test:e2e`
Expected: mọi kịch bản `✔`, bước cuối `audit-invariants --strict` thoát 0 (có `R-PD-1`, `R-PTY-7…10`).

- [ ] **Step 4: Phá thử từng hàng rào mới (sửa cố ý → đỏ → hoàn nguyên → xanh), ghi kết quả vào cột "Đã thấy chặn thật" của `docs/SO-HANG-RAO.md`** (ngày + phép đột biến + dòng đỏ quan sát được)

1. `docs/data-dictionary.json`: xoá `"birth_date": "N2"` khỏi `pty_person` → `node --test src/hang-du-lieu.test.ts` đỏ bài 1; đổi `orders.customer_phone` thành `"N1"` → đỏ bài 2; đổi `pty_person_document.number_key` thành `"N2"` → đỏ bài 3. Hoàn nguyên → xanh.
2. `scripts/audit-checks.mjs`: trong `DO_COT_N3` đổi `>= 8` thành `>= 200` → `node --test src/audit-invariants.test.ts` đỏ ca "R-PD-1: nơi cấp …"; bỏ khoá `pty_person_document.issued_place` khỏi `COT_N3_NHAT_KY` → đỏ bài đồng bộ. Hoàn nguyên.
3. `src/hai-lop-email-khong-lo.test.ts`: chèn tạm ngay trước lời gọi `doNhatKyHang` câu `w.sqlite.prepare("INSERT INTO audit_log (id, action, detail, created_at) VALUES ('pha-thu', 'staff_updated', (SELECT pin_hash FROM staff LIMIT 1), '2026-10-16T00:00:00.000Z')").run();` → bài đỏ ("nhật ký chứa giá trị hạng N3/N4"); xoá khoá `staff.pin_hash` khỏi `PHU_TRACH` → `src/nhat-ky-hang.test.ts` (1) đỏ. Hoàn nguyên.
4. `migrations/0103_ho_so_mo_rong.sql` (chưa lên `main`, sửa được): xoá trigger `pty_organization_document_gpkd_one_org_ins` → `node --test src/migrations-ho-so-mo-rong.test.ts` đỏ (a) và (f); xoá `pty_verification_no_update` → đỏ (a) và (h). Hoàn nguyên.
5. `src/modules/parties/index.ts`: trong `respondParty` trả `party` thay cho `xem ? party : anTruongRiengTu(party)` → `node --test src/modules/parties/rieng-tu-route.test.ts` đỏ ca đọc; bỏ `AND c.contact_kind_code IN ('PHONE', 'EMAIL')` ở `LIST` → đỏ ca tìm kiếm; bỏ khối chặn ở route đóng liên hệ → đỏ ca ghi. Hoàn nguyên.
6. `src/shared/permissions.ts`: đặt cột HR của `party.personal.view` = `"any"` → `node --test src/shared/permissions.test.ts` đỏ (bảng `ADR` và bài ghim dòng HR). Hoàn nguyên.

Sau mỗi phép: `git diff --stat` chỉ còn thay đổi ghi sổ hàng rào (không sót đột biến).

- [ ] **Step 5: Commit**

Run: `npm test && npm run typecheck`
Expected: xanh.

```bash
git add src/shared/changelog.ts docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/SO-HANG-RAO.md
git commit -m "Nhật ký thay đổi 2.10 (số tạm), tài liệu mô tả và ngày quan sát hàng rào của lát H-0, H-1

Vì sao: mỗi lần triển khai có mục nhật ký; sổ hàng rào chỉ tin một cơ chế khi đã thấy nó
chặn thật (P16) — ghi ngày và phép đột biến cho năm hàng rào mới."
```

- [ ] **Step 6: Người kiểm cuối nhánh (vai `nguoi-kiem-doc-lap`)** chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e -- ho-so-rieng-tu parties`, lặp lại ít nhất một phép phá của mỗi dòng sổ hàng rào mới, và đối chiếu ruling R1–R24. Báo cáo cuối việc cho chủ (CLAUDE.md §4) ghi: có migration → cần `npm run day-len` rồi `npm run trien-khai`; hai câu hỏi Q1, Q2; đề xuất câu bảng thi hành 5.20 (R22) chờ chủ duyệt.

---

## Tự rà kế hoạch (đã làm khi soạn)

- **Phủ đặc tả:** ADR-0122 đ1 (Task 3 migration + Task 4–5 đường ghi), đ2 (Task 3), đ3 (Task 3; gắn `CAN_XAC_MINH_LAI` hoãn H-2 — R15), đ4 (Task 1, 3), đ5 (Task 4–5), đ6 (Task 4); ADR-0126 đ1 (Task 3, không route — R16); Hiến chương 5.20 (Task 1–2). Tiêu chí ADR-0122 "nhật ký không chứa số giấy tờ, ngày sinh, địa chỉ" có bài ở Task 5 (`rieng-tu-route`, e2e) và Task 2.
- **Không placeholder:** mọi bước mã có khối mã; các chỗ "DỪNG, báo điều phối" là điểm dừng P8 có điều kiện cụ thể, không phải việc bỏ ngỏ.
- **Khớp tên:** `xemDuocRiengTu`, `ghiDuocRiengTu`, `laLienHeRiengTu`, `anTruongRiengTu`, `chanGhiRiengTu`, `nhanLoaiLienHe`, `kiemNgaySinh`, `doNhatKyHang`, `cotN3N4`, `PHU_TRACH`, `MIEN`, `COT_N3_NHAT_KY`, `R-PD-1`, `R-PTY-7…10` dùng thống nhất giữa các task.

## Review Focus

1. Bán hàng sửa tên một hồ sơ đã có ngày sinh (PUT không gửi `birthDate`) → ngày sinh phải còn nguyên — bài "PUT vắng birthDate ⇒ giữ nguyên" (Task 5) + e2e.
2. Bán hàng gõ chữ số của một địa chỉ vào ô tìm Danh bạ → không được ra hồ sơ người ở địa chỉ đó (lộ gián tiếp) — bài "tìm kiếm Danh bạ: chữ số của địa chỉ không ra hồ sơ" (Task 5) + e2e.
3. Quản trị mở hồ sơ của Quản trị khác hoặc Toàn quyền → không thấy ngày sinh / địa chỉ (cấp bậc, R6) — bài "đọc theo cấp bậc" (Task 5).
4. Bán hàng gọi "đóng liên hệ" với id dòng địa chỉ đoán được → 403, địa chỉ vẫn mở — ca cuối của bài "ghi: Bán hàng …" (Task 5) + e2e.
5. Người thêm migration mới gắn hạng N1 cho cột `*_phone` / `*_email` / `address` cho nhanh → bài đỏ — bài "cột có tên mang dạng dữ liệu người không dưới N2" (Task 1).
