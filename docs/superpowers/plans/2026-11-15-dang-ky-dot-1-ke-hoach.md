# Đăng ký đối tác — đợt 1: kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đối tác cá nhân tự đăng ký bằng phiếu; Quản trị xác minh, Nhân sự duyệt; lô duyệt sinh hồ sơ, tài khoản (tắt), cấp độ đại lý mặc định; người được duyệt tự đặt PIN; mọi tài khoản hiện dấu xác minh.

**Architecture:** Module mới `dang-ky` (tiền tố `dk_`, nghiêm) giữ phiếu, phiên đăng ký, quyết định; `parties` giữ tệp chờ, danh sách mục bắt buộc, view dữ kiện xác minh; `staff` thêm biến thể tạo tài khoản tắt; `pricing` giữ chính sách cấp mặc định. Lô duyệt và lô kích hoạt do gốc lắp ráp ghép từ câu lệnh chưa chạy của từng module; câu đầu chèn dòng quyết định, trigger `RAISE` làm hỏng cả lô khi điều kiện sai. Người đăng ký đi route `public` có kiểm cookie ký riêng trong thân route.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 + R2 (`HO_SO`), Email Service (`EMAIL`), `node --test`, esbuild; không dependency runtime.

**Spec:** ADR đã duyệt (thắng mọi chữ của kế hoạch này khi lệch): `docs/adr/ADR-0206-…`, `ADR-0207-…`, `ADR-0208-…`, `ADR-0209-…`, `ADR-0210-…`; Hiến chương 5.29 (`docs/ARCHITECTURE.md`); trang ghép `docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-a/TRANG-GHEP.md`, `…-luot-b/TRANG-GHEP.md`; chữ và con số `…-luot-a/PHU-LUC.md`, `…-luot-b/TRINH-CHU.md` (bảng «Chữ chờ bạn chọn»).

## Global Constraints

- Việc lớn (dữ liệu, quyền, tiền, luật): mỗi task chạm dữ liệu hoặc quyền có người kiểm độc lập chỉ đọc (agent `nguoi-kiem-doc-lap`); người thi công không tự nghiệm thu (CLAUDE.md §3).
- Mỗi task: bài **đỏ trước, xanh sau**; `npm run typecheck` 0 lỗi; `npm test` chạy đủ MỘT lần ở cuối mỗi nhóm task (không chạy lại sau mỗi bước).
- Migration chỉ thêm tệp mới; số đặt lúc thi công = số lớn nhất ở **mọi nhánh và worktree** + 1 (lúc viết kế hoạch: lớn nhất 0166 ở nhánh khác ⇒ đợt này dự kiến 0167–0170; kiểm lại bằng `git ls-tree` trước khi đặt).
- SQL module nghiêm qua `defineSql`; module khác chỉ import qua `index.ts`; đọc xuyên module qua view `v_<tiền tố>_*`; ghi chung lô bằng câu lệnh chưa chạy.
- Không thêm mã quyền nào; chỉ thêm hàng vào `MATRIX` (`src/shared/permissions.ts`); bản đồ quyền và ảnh chụp sửa cùng commit.
- Ngày dân sự theo `vnToday(new Date())` truyền làm tham số; không `date('now')`.
- Nhật ký (`audit_log`) và lịch sử phiếu không chứa SĐT, email, số giấy tờ, ngày sinh, địa chỉ, khoá kho.
- Chữ hiện cho người dùng: tiếng Việt có dấu; tra `docs/BANG-THAM-CHIEU.md`; chữ chưa có thì thêm vào `src/shared/bang-tham-chieu*.ts` đúng chữ «khuyến nghị» ở trang trình (chủ đã duyệt «chữ theo khuyến nghị»).
- Giao diện: dựng bằng `h()`, ô gõ 16px, trang mới khai `PAGES` và script `build:web`.
- Con số (hạn mã, trần, hạn phiếu, hạn kích hoạt, hạn ẩn danh) là dòng chính sách; giá trị gieo đúng bảng «Con số đề xuất» ở `…-luot-a/PHU-LUC.md`.
- AI không chạy lệnh ghi lên production; không `wrangler deploy`, không migration remote, không `git push`.
- Công tắc đăng ký gieo **Tắt**.

**Thứ tự làm:** 0 → 1 → 2 → 3 → **5 → 4** → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13. Người kiểm độc lập chỉ đọc sau mỗi task có ghi «Người kiểm độc lập»; các task còn lại gom kiểm ở Task 13.

## Review Focus

1. **Hai người bấm cùng lúc** (hai lần «Gửi», hai người duyệt, duyệt đúng lúc phiếu bị từ chối): đúng một kết quả, không tài khoản thừa — bài ở Task 6, Task 8.
2. **Ảnh HEIC chụp trực tiếp trên iPhone** không thu nhỏ được trên Safari: gửi nguyên được, không lỗi 413 khi ≤ 5 MB — bài ở Task 5 (cỡ) và kịch bản thử iPhone ở Task 13.
3. **Email viết hoa / có khoảng trắng** (`An@Gmail.com `) coi là cùng danh tính với `an@gmail.com` — bài ở Task 3.
4. **Người đăng ký mở trang trạng thái sau khi phiên hết hạn**: được mời xin mã mới, không lộ gì của phiếu — bài ở Task 4.
5. **Số điện thoại viết kiểu +84 / có dấu cách** so trùng đúng với tài khoản sẵn có ở bước kiểm trước lô — bài ở Task 8 (dùng `normalizePhone` sẵn có).

---

### Task 0: Cổng — thư tới được địa chỉ lạ

Không mã. Dừng toàn bộ kế hoạch nếu không đạt.

- [ ] **Step 1:** Chủ gửi một Góp ý trên production (khoá `FEEDBACK_NOTIFY_EMAIL` đã đặt 15/11 là một Gmail chưa khai với Cloudflare) trong lúc AI chạy `npx wrangler tail tourdao-sales --format json --search email` (chỉ đọc).
- [ ] **Step 2:** Đạt khi chủ nhận được thư (kể cả ở Thư rác) **hoặc** cột `fbk_ticket.notified_at` của yêu cầu đó có giá trị (chủ chạy câu đọc). Không đạt: đọc dòng log «Gửi email báo admin thất bại», sửa cấu hình (thường là `FEEDBACK_MAIL_FROM` phải có đuôi `@booking.tourdao.vn`, do chủ đặt lại), thử lại. Ba lần không đạt ⇒ dừng, trình chủ cách xác nhận khác.
- [ ] **Step 3:** Ghi kết quả vào nhật ký thi công `docs/superpowers/plans/2026-11-15-dang-ky-dot-1-thi-cong-nhat-ky.md` (tạo mới).

### Task 1: Module `dang-ky` và bảng `dk_*`

**Files:**
- Create: `migrations/0167_dang_ky.sql`; `src/modules/dang-ky/index.ts`, `repository.ts`, `rules.ts`, `rules.test.ts`; `src/migrations-dang-ky.test.ts`
- Modify: `src/index.ts` (mảng `modules`), `src/architecture.test.ts` (`STRICT`, `ALLOWED_EDGES`), `src/shared/ma-dinh-danh.ts` (tiền tố `DK`, loại «Phiếu đăng ký»), `docs/data-dictionary.json` + `npm run dict`

**Interfaces:**
- Produces bảng: `dk_policy` (chính sách, chỉ thêm, `valid_from_at`), `dk_registration` (phiếu: `id` dạng `DK_XXXXXXXX`, `kind` = `'PERSON'` (trigger mở loại, khuôn `pty_self_submission_kind_ins`), `status`, `role_code`, `current_version`, `party_id`, `staff_id`, `activated_at`, `erased_at`, mốc giờ), `dk_identity` (`registration_id`, `provider` = `'EMAIL'`, `subject` = email chuẩn hoá, `contact_email`, `erased_at`; chỉ mục duy nhất có điều kiện: một phiếu đang mở mỗi `(provider, subject)`), `dk_submission` (bản khai bất biến: cột theo `pty_person`/`pty_person_document`/`pty_contact_point`, `policy_id`, `consented_at`, `referrer_text`), `dk_item_result` (kết luận từng mục, chỉ thêm), `dk_decision` (quyết định duyệt / kích hoạt, chỉ thêm, `super_admin_flag`), `dk_event` (lịch sử lệnh, chỉ thêm: `actor_kind` ∈ `'REGISTRANT'|'STAFF'|'AGENT'`), `dk_email_code` (băm, `expires_at`, `attempts`; xoá được).
- `status` (CHECK): `'DANG_DIEN'|'CHO_XAC_MINH'|'CAN_BO_SUNG'|'CHO_DUYET'|'DA_DUYET'|'TU_CHOI'|'DA_RUT'|'HET_HAN'`.
- `rules.ts`: `chuyenHopLe(tu: TrangThai, den: TrangThai): boolean` — đúng đồ thị ADR-0206 Đ4.

- [ ] **Step 1: Bài migration đỏ** (`src/migrations-dang-ky.test.ts`, khuôn `src/migrations-ho-so-tu-khai.test.ts`): bản khai không sửa được (`dk_submission_content`); trạng thái kết thúc không đổi được; chuyển trái đồ thị bị chặn; danh tính thứ hai cho cùng email khi phiếu còn mở bị chặn; dòng `dk_policy` không sửa, không xoá; gieo đúng một dòng chính sách với `registration_open = 0` và các con số của PHU-LUC.
- [ ] **Step 2:** `node --test src/migrations-dang-ky.test.ts` — FAIL (tệp migration chưa có).
- [ ] **Step 3:** Viết `0167_dang_ky.sql`, module rỗng có `routes: []`, đăng ký `STRICT`, cạnh `dang-ky → parties | staff | auth | audit | pricing` (chỉ `index.ts`), tiền tố `DK`.
- [ ] **Step 4:** Bài `rules.test.ts` cho `chuyenHopLe` (mọi cặp trạng thái), rồi viết hàm. `node --test src/modules/dang-ky/rules.test.ts src/migrations-dang-ky.test.ts src/architecture.test.ts src/shared/ma-dinh-danh.test.ts` — PASS.
- [ ] **Step 5:** `npm run dict`, typecheck, commit «Module dang-ky và bảng dk_ (ADR-0206)».

### Task 2: Cookie đăng ký, bảo trì cho người không tài khoản, bộ đếm `dk:`

**Files:**
- Create: `src/modules/dang-ky/phien.ts`, `phien.test.ts`; `src/dang-ky-route-dong.test.ts`
- Modify: `src/shared/maintenance.ts` (+ `chanNguoiKhongTaiKhoan`), `src/shared/maintenance.test.ts`

**Interfaces:**
- Produces: `DK_COOKIE = "td_dang_ky"`; `taoPhienDangKy(secret: string, registrationId: string, identityId: string, nowMs: number): Promise<string>`; `docPhienDangKy(request: Request, env: Env, nowMs: number, policy: { idleMin: number; maxHours: number }): Promise<{ registrationId: string; identityId: string } | null>` — khoá dẫn xuất `hmacBytes(SESSION_SECRET, "td-dang-ky-v1")` (khuôn `pendingKey` ở `src/modules/auth/mfa-rules.ts`), dữ liệu ký mang tiền tố `dk1.`.
- Produces: `chanNguoiKhongTaiKhoan(state: MaintenanceState): boolean` (bảo trì bật ⇒ true).
- Produces khoá bộ đếm: `dkEmailKey(email) = "dk:email:" + email`, `dkIpKey(ip) = "dk:ip:" + ip` (dùng `reserveAttempts`, `clearAttempts` xuất từ `auth`).

- [ ] **Step 1: Bài đỏ** `phien.test.ts`: cookie đúng thì đọc ra mã phiếu; sai chữ ký, quá `idleMin`, quá `maxHours` ⇒ null; **`verifySessionToken` từ chối cookie đăng ký** và **`docPhienDangKy` từ chối `td_session`**; `maintenance.test.ts`: `chanNguoiKhongTaiKhoan` đúng khi bật.
- [ ] **Step 2:** chạy — FAIL.
- [ ] **Step 3:** viết hai hàm và hằng.
- [ ] **Step 4:** bài `src/dang-ky-route-dong.test.ts`: quét `src/` tìm mọi route gọi `docPhienDangKy`; tập đó phải đúng danh sách `ROUTE_DANG_KY` khai trong bài (bắt đầu rỗng, các task sau thêm). Chạy — PASS.
- [ ] **Step 5:** commit «Phiên đăng ký ký riêng, bảo trì cho người không tài khoản (ADR-0206 Đ5, Đ8)».

### Task 3: Route công khai — cấu hình, chính sách riêng tư, xin mã, nhập mã

**Files:**
- Modify: `src/modules/dang-ky/index.ts`, `repository.ts`; `src/modules/parties/index.ts` (route `GET /api/chinh-sach-rieng-tu`); `src/shared/lan-gui-mien.ts`; `src/route-access.test.ts` (SNAPSHOT); `src/lan-gui-phu-route.test.ts` không đổi danh sách `CONG_KHAI_DA_BIET`
- Create: `src/modules/dang-ky/mail.ts` (thư mã, câu chữ riêng), `src/modules/dang-ky/xin-ma-route.test.ts`

**Interfaces:**
- Consumes: `turnstileGate` (Task này xuất thêm từ `auth/index.ts`), `reserveAttempts`, `sendMail` qua `cauHinhThu` (`src/shared/gui-thu.ts`), `chanNguoiKhongTaiKhoan`, `taoPhienDangKy`.
- Produces route: `GET /api/dang-ky/cau-hinh`, `GET /api/chinh-sach-rieng-tu`, `POST /api/dang-ky/ma` (thân `{ email, turnstileToken }`; luôn 200 `{ ok: true }`), `POST /api/dang-ky/xac-nhan` (thân `{ email, ma }`; đúng ⇒ đặt cookie, trả `{ trangThai }`).
- `chuanHoaEmail(raw: string): string | null` trong `rules.ts` (trim, chữ thường, kiểm dạng).

- [ ] **Step 1: Bài đỏ** `xin-ma-route.test.ts` (khung `tests/audit/harness.mjs`, `world()`): thiếu khoá Turnstile ⇒ 503; công tắc tắt + email mới ⇒ 200 nhưng không gửi thư, không mở phiếu; vượt 3/15 phút theo email, 10/15 phút theo IP, 60/giờ toàn Nền tảng ⇒ 200, không gửi; email đã có tài khoản ⇒ câu trả lời giống hệt ca thường; mã sai 5 lần ⇒ mã hết hiệu lực; **`An@Gmail.com ` và `an@gmail.com` là một danh tính** (Review Focus 3); bảo trì bật ⇒ 503; bộ đếm `ip:` của đăng nhập không đổi sau 20 lần xin mã; `GET /api/chinh-sach-rieng-tu` chưa có bản ⇒ `{ dangCapNhat: true }`, có bản ⇒ chỉ `phienBan`, `hieuLucTu`, `noiDung`.
- [ ] **Step 2:** chạy — FAIL.
- [ ] **Step 3:** viết route, thư (chủ đề «Mã xác nhận đăng ký Tour Đảo», thân chỉ mã + mã phiếu), mục `congKhai` cho `POST /api/dang-ky/ma`, `POST /api/dang-ky/xac-nhan` (lý do: «người đăng ký chưa có tài khoản — ADR-0206 Đ7, chủ duyệt 15/11»).
- [ ] **Step 4:** chạy bài + `route-access`, `lan-gui-phu-route` — PASS.
- [ ] **Step 5:** commit.

### Task 4: Route của phiếu — xem, lưu nháp, gửi, rút

**Files:**
- Modify: `src/modules/dang-ky/index.ts`, `repository.ts`, `rules.ts`; `src/shared/lan-gui-mien.ts`; `src/dang-ky-route-dong.test.ts`
- Create: `src/modules/dang-ky/phieu-route.test.ts`; `src/shared/dang-ky-hien-thi.ts` (nhãn trạng thái, nhãn lý do — chữ ở PHU-LUC)

**Interfaces:**
- Consumes: luật kiểm của tự khai (`kiemPhieuTuKhai`, `kiemThemGiayTo`, `parseBirthDate`… — `parties` xuất qua `index.ts`), view `v_pty_verification_requirement` và `v_pty_privacy_current` (id + version bản chính sách hiện hành) — **cả hai tạo ở migration `0168` của Task 5**, nên làm Task 5 trước Task 4.
- Produces route: `GET /api/dang-ky/phieu`, `PUT /api/dang-ky/phieu`, `POST /api/dang-ky/phieu/gui`, `POST /api/dang-ky/phieu/rut`; DTO `PhieuDangKyDto` ở `src/shared/contracts.ts` (không có số giấy tờ đủ, không khoá kho).
- Loại đối tác mở: đọc `dk_policy.open_role_codes` (gieo `GUIDE_FREELANCE,HOTEL_RECEPTION,TAXI_DRIVER,COLLABORATOR`; **không** `TRAVEL_AGENCY`).

- [ ] **Step 1: Bài đỏ**: không cookie / cookie hết hạn ⇒ 401 và không lộ gì (Review Focus 4); cookie phiếu A gọi phiếu B ⇒ 404; gửi khi chưa có chính sách / chưa đồng ý bản hiện hành ⇒ 409 câu tiếng Việt; gửi thiếu mục bắt buộc ⇒ 400; **gửi không sinh dòng `pty_party`, `pty_attachment`, `staff`** (đếm trước, sau); bấm «Gửi» hai lần ⇒ một `dk_submission`; `CAN_BO_SUNG` sửa và gửi lại ⇒ bản khai mới, về `CHO_XAC_MINH`; rút ⇒ `DA_RUT`; chọn `TRAVEL_AGENCY` ⇒ 400; quét `dk_event`, `audit_log` không có email, SĐT, số giấy tờ.
- [ ] **Step 2:** FAIL. **Step 3:** viết. **Step 4:** PASS (+ thêm 4 route vào `ROUTE_DANG_KY`, 3 mục `congKhai`). **Step 5:** commit.

### Task 5: Tệp chờ của phiếu (`parties`)

**Files:**
- Create: `migrations/0168_tep_cho_dang_ky.sql`; `src/modules/parties/tep-cho.ts`, `tep-cho.test.ts`; `src/modules/dang-ky/tep-route.test.ts`
- Modify: `src/modules/parties/index.ts` (xuất câu lệnh), `repository.ts`; `src/modules/dang-ky/index.ts` (route `POST /api/dang-ky/phieu/tep`); `src/kho-tep-ho-so.test.ts` (số đếm `put`/`get` sửa có chủ đích); `src/shared/lan-gui-mien.ts`

**Interfaces:**
- Produces bảng `pty_registration_attachment` (cột chép `pty_attachment` trừ `party_id`; thêm `registration_id TEXT NOT NULL`, `slot TEXT NOT NULL`, `transferred_at`; trigger chỉ thêm, mốc một chiều; chuyển xong thì `content_hash` về NULL).
- Cũng trong `0168` (vì Task 4 cần sớm): bảng `pty_verification_requirement` (chỉ thêm, `valid_from_at`, gieo cá nhân `ATTRIBUTE:HO_TEN`, `ATTRIBUTE:NGAY_SINH`, `DOCUMENT:CCCD`; mã chỉ trong tập đóng `MUC_XAC_MINH_MO` khai ở `src/shared/dau-xac-minh.ts`), view `v_pty_verification_requirement`, view `v_pty_privacy_current`.
- Produces (xuất ở `parties/index.ts`): `cauTepChoMoi(db, { registrationId, slot, contentKind, byteSize, contentHash, actorRef }): { id: string; storageKey: string; statements: D1PreparedStatement[] }`; `datKhoTepCho(env, id, storageKey, bytes): Promise<boolean>`; `cauChuyenTepCho(db, { registrationId, version, partyId, documentId, approverId, at }): D1PreparedStatement[]` (Task 8 dùng); `cauGoTepCho(db, registrationId, lyDo, at): D1PreparedStatement[]` (Task 4 rút, Task 6 từ chối, Task 9 hết hạn).
- Trần (đọc `dk_policy`): 5 MB/tệp, 8 tệp/phiếu, 20 tệp/giờ/IP.

- [ ] **Step 1: Bài đỏ**: SVG/HTML/sai chữ ký ⇒ 415; > 5 MB ⇒ 413 (chặn trước khi đọc thân); tệp thứ 9 ⇒ 409; phiếu không ở `DANG_DIEN|CAN_BO_SUNG` ⇒ 409; cùng ô cùng băm ⇒ một dòng; kho giả lỗi ⇒ dòng «tải dở dang», 200, chạy lại xong; **không có route đọc tệp nhận cookie đăng ký**; HEIC 4,9 MB nhận được (Review Focus 2).
- [ ] **Step 2–4:** FAIL → viết → PASS. **Step 5:** commit.

### Task 6: Quyền mới, hàng chờ và bước xác minh

**Files:**
- Modify: `src/shared/permissions.ts` (hàng `registration.queue.view` = `quanTriNhanSu()`, `registration.policy.write` = `chiToanQuyen()`, `registration.agent.purge` = `chiToanQuyen()`), `src/shared/permissions.test.ts`; `src/modules/dang-ky/index.ts`
- Create: `src/modules/dang-ky/xac-minh.ts`, `xac-minh.test.ts`, `xac-minh-route.test.ts`

**Interfaces:**
- Route cổng `accounts`: `GET /api/dang-ky/hang-cho` (Quản trị, Toàn quyền: mọi phiếu chưa kết thúc; Nhân sự: chỉ `CHO_DUYET` và chưa kích hoạt); `GET /api/dang-ky/phieu/:id` (nội dung chỉ khi `party.verify` **và** `party.view`); `POST /api/dang-ky/phieu/:id/ket-luan` (thân `{ muc, dat, lyDo? }`); `POST /api/dang-ky/phieu/:id/xem-so`; `GET /api/dang-ky/phieu/:id/tep/:tid` (nhật ký trước, `no-store`, `nosniff`); `POST /api/dang-ky/phieu/:id/dat` (thân `{ hoSo: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId }, nguoiGioiThieuPartyId? }`), `/bo-sung` (thân `{ lyDo }`), `/tu-choi` (thân `{ lyDo }`).
- Tìm trùng: `hoSoCaNhanKhop` sẵn có + khớp số giấy tờ (`number_key`) qua hàm mới `hoSoTheoSoGiayTo(db, numberKey)` của `parties`.
- Lý do: chín mã ở `src/shared/dang-ky-hien-thi.ts` (bảy mã dùng lại từ `xac-minh-hien-thi.ts`, bỏ `HO_SO_DA_GOP`; thêm `KHONG_LIEN_LAC_DUOC`, `KHONG_THUOC_DIEN`).

- [ ] **Step 1: Bài đỏ**: Nhân sự gọi `ket-luan`, `xem-so`, `tep` ⇒ 403; Bán hàng, Kế toán gọi bất kỳ ⇒ 403; «đạt» khi còn mục chưa đạt hoặc chưa có kết luận Danh bạ ⇒ 409; `dat` chuyển `CHO_DUYET`; `bo-sung` ⇒ `CAN_BO_SUNG`, người đăng ký thấy nhãn lý do; `tu-choi` ⇒ `TU_CHOI` + tệp nhận quyết gỡ cùng lô; xử lý xong gọi lại `GET …/:id` ⇒ không còn nội dung; mở ảnh ghi nhật ký trước, nhật ký lỗi ⇒ không trả tệp.
- [ ] **Step 2–4:** FAIL → viết → PASS. **Step 5:** commit. **Người kiểm độc lập** đọc Task 6.

### Task 7: Biến thể tạo tài khoản tắt và chặn hỗ trợ đăng nhập

**Files:**
- Modify: `src/modules/staff/index.ts`, `repository.ts` (+ câu `INSERT_STAFF_INACTIVE`), `src/modules/staff/touch-credentials.test.ts`; `src/modules/accounts/index.ts` (reset-pin, unlock, `PATCH` kích hoạt lại, `mfa-reset`); `src/index.ts` (tiêm `ctx.chuaKichHoat`)
- Create: `src/modules/staff/tai-khoan-dang-ky.test.ts`; `src/modules/accounts/chua-kich-hoat.test.ts`

**Interfaces:**
- Produces: `createAccountOnPartyStatements(db, { partyId: string; phone: string; roles: RoleCode[] }, actorId: string, at: string): { id: string; statements: D1PreparedStatement[]; permissions: PermissionCode[] }` — chỉ `staff` + `stf_permission` (+ chỉnh tay rỗng), `active = 0`, PIN ngẫu nhiên không trả ra; không sinh hồ sơ, không vai (vai do `parties` mở ở Task 8).
- Produces: `datPinKichHoatStatements(db, staffId, pinHash, at): D1PreparedStatement[]` (đặt PIN, `active = 1`, đẩy `credentials_changed_at`).
- Consumes: `ctx.chuaKichHoat(staffId): Promise<boolean>` do `dang-ky` công bố (phiếu `DA_DUYET`, `activated_at IS NULL`).

- [ ] **Step 1: Bài đỏ**: tài khoản tạo bằng biến thể có `active = 0`, có quyền đúng vai; đăng nhập PIN ⇒ 401 `invalid_credentials`; reset-pin, unlock, kích hoạt lại, tắt lớp hai cho tài khoản chưa kích hoạt ⇒ 409 câu «Tài khoản chưa kích hoạt — dùng "Gửi lại lời mời"»; tài khoản thường không bị ảnh hưởng.
- [ ] **Step 2–4:** FAIL → viết → PASS. **Step 5:** commit. **Người kiểm độc lập** đọc Task 7.

### Task 8: Lệnh duyệt (một lô có câu chốt)

**Files:**
- Modify: `src/modules/dang-ky/index.ts`, `repository.ts`; `src/modules/parties/index.ts` (xuất `cauMoHoSoDangKy`, `cauGhiGiaTriDaXacMinh`, `cauXacMinhTuPhieu`, `cauDongYTuPhieu`, `cauQuanHeGioiThieu`); `migrations/0167_dang_ky.sql` chưa áp remote nên trigger `dk_decision_guard` nằm trong đó (nếu 0167 đã lên `main` thì migration mới); một migration thêm loại quan hệ `REFERRED_BY` «Người giới thiệu của» (nối vào 0168 nếu chưa nhập `main`)
- Create: `src/modules/dang-ky/duyet-route.test.ts`

**Interfaces:**
- Route cổng `accounts`: `POST /api/dang-ky/phieu/:id/duyet` (thân `{ roleCode }`), `POST /api/dang-ky/phieu/:id/tu-choi-duyet`, `POST /api/dang-ky/phieu/:id/gui-lai-loi-moi`.
- Thứ tự câu trong lô: đúng ADR-0207 Đ5 (1 chốt → 2 hồ sơ + vai → 3 `createAccountOnPartyStatements` → 4 giá trị → 5 `pty_verification` (người xác minh, giờ xác minh) → 6 `pty_consent` (`created_by` = tài khoản mới) → 7 `cauChuyenTepCho` → 8 cấp mặc định (Task 11, bỏ qua tới khi có) → 9 quan hệ giới thiệu → 10 phiếu `DA_DUYET` + ẩn danh bản khai trừ danh tính → 11 `audit_log` `staff_created` trỏ tài khoản mới).
- Trigger `dk_decision_guard` RAISE khi: phiếu không `CHO_DUYET`; `version` khác `current_version`; chưa có kết luận Danh bạ; người duyệt = người xác minh và `super_admin_flag = 0`. Máy chủ đặt `super_admin_flag = 1` chỉ khi `can(staff, "admin.manage.superadmin")`.
- Kiểm trước lô: `findStaffByPhone(normalizePhone(sdt))` (Review Focus 5); hồ sơ đích hợp lệ; `pty_person_document_cccd_one_person` không trùng.

- [ ] **Step 1: Bài đỏ**: lô thành công sinh đúng 1 hồ sơ (hoặc 0 khi gắn), 1 tài khoản tắt, vai, quyền, dòng xác minh, dòng đồng ý, tệp chuyển, 1 dòng `staff_created` với `target_id` = tài khoản mới; giả lỗi câu giữa lô ⇒ không còn dòng nào; **phiếu bị từ chối giữa lúc bấm ⇒ cả lô hỏng, 409** (Review Focus 1); hai người duyệt cùng lúc ⇒ một thắng; người xác minh tự duyệt ⇒ 409; Toàn quyền làm cả hai ⇒ thành công + cờ; SĐT `+84 9…` trùng tài khoản `09…` ⇒ 409 trước lô; Nhân sự gắn hồ sơ có sẵn không xem được ⇒ thành công; người duyệt về sau không xác minh được phiếu tự khai của tài khoản đó.
- [ ] **Step 2–4:** FAIL → viết → PASS. **Step 5:** commit. **Người kiểm độc lập** đọc Task 8.

### Task 9: Kích hoạt và tác nhân dọn phiếu

**Files:**
- Modify: `src/modules/dang-ky/index.ts` (route `POST /api/dang-ky/phieu/dat-pin`, `public` + cookie), `src/shared/permissions.ts` (`MA_TAC_NHAN` + `DON_PHIEU_DANG_KY`, `QUYEN_TAC_NHAN`), `src/index.ts` (`scheduled`), `src/tac-nhan-tu-dong.test.ts`, `src/shared/lan-gui-mien.ts`, `src/dang-ky-route-dong.test.ts`
- Create: `src/modules/dang-ky/kich-hoat-route.test.ts`, `src/modules/dang-ky/don-phieu.ts`, `don-phieu.test.ts`

**Interfaces:**
- `POST /api/dang-ky/phieu/dat-pin` thân `{ ma, pin }`: mã email mới bắt buộc; lô: chèn `dk_decision` loại `KICH_HOAT` (trigger RAISE nếu chưa duyệt, đã kích hoạt, quá hạn) → `datPinKichHoatStatements` → ẩn danh danh tính → `audit_log` do tài khoản mới đứng tên (hành động mới `registration_activated`).
- `donPhieuDangKy(env, tacNhan, homNay): Promise<{ hetHan: number; anDanh: number; xoaKho: number; xoaMa: number }>` — bốn việc của ADR-0208 Đ8; một dòng nhật ký mang `agent_code`.

- [ ] **Step 1: Bài đỏ**: thiếu mã mới ⇒ 401; đặt PIN lần hai ⇒ 409; quá hạn ⇒ 409; sau kích hoạt `active = 1`, không cookie `td_session`, đăng nhập PIN vừa đặt vào được; không dòng `staff_reactivated`; tác nhân: phiếu `DANG_DIEN` 8 ngày ⇒ `HET_HAN` + tệp gỡ; phiếu từ chối 31 ngày ⇒ ẩn danh; phiếu duyệt quá hạn kích hoạt ⇒ danh tính ẩn danh; tác nhân có đúng một ô, không ô tiền.
- [ ] **Step 2–4:** FAIL → viết → PASS. **Step 5:** commit. **Người kiểm độc lập** đọc Task 9.

### Task 10: Dấu xác minh (ADR-0210)

**Files:**
- Create: `migrations/0169_dau_xac_minh.sql` (view `v_pty_verification_facts`; bảng mục bắt buộc đã có từ `0168`); `src/shared/dau-xac-minh.ts` (đã có `MUC_XAC_MINH_MO` từ Task 5), `dau-xac-minh.test.ts`
- Modify: `src/modules/parties/repository.ts` (đổi họ tên ghi `CAN_XAC_MINH_LAI` cho `HO_TEN` — mọi đường: sửa hồ sơ, `renameAccountStatements`); `src/modules/accounts/index.ts` (DTO danh sách tài khoản thêm `dauXacMinh`); `src/modules/parties/index.ts` (Danh bạ, chi tiết, `cua-toi`); `src/shared/permissions.ts` (`verification.requirement.write` = `chiToanQuyen()`)

**Interfaces:**
- `tinhDauXacMinh(dkien: DuKienXacMinh[], homNay: string): "DA" | "CHUA" | "CAN_LAI"` (thuần, dùng chung máy chủ + giao diện); trả thêm `null` khi hồ sơ không có tài khoản và không mang vai đối tác (không hiện dấu).

- [ ] **Step 1: Bài đỏ** (bảng ca chung cho hàm và view): chưa kết luận ⇒ CHUA; đủ + CCCD còn hạn ⇒ DA; sửa ngày sinh ⇒ CAN_LAI; **sửa họ tên (cả hai đường) ⇒ CAN_LAI**; CCCD hết hạn ⇒ CAN_LAI; gia hạn chưa xác minh ⇒ CAN_LAI; thêm mục bắt buộc ⇒ DA thành CAN_LAI; khách lẻ ⇒ null; ba màn trả cùng giá trị; Bán hàng không thấy ở Quản lý tài khoản; bài quét: không route đơn/tiền/đăng nhập nào đọc view.
- [ ] **Step 2–4:** FAIL → viết → PASS. **Step 5:** commit. **Người kiểm độc lập** đọc Task 10.

### Task 11: Cấp độ đại lý mặc định (ADR-0209)

**Files:**
- Create: `migrations/0170_cap_mac_dinh_dang_ky.sql` (`prc_signup_tier_policy` chỉ thêm + trigger); `src/modules/pricing/cap-mac-dinh.test.ts`
- Modify: `src/modules/pricing/index.ts` (route `GET|POST /api/pricing/cap-mac-dinh`; xuất `cauCapMacDinhChoHoSo`), `src/shared/permissions.ts` (`partner.signup_tier.write` = `quanLyBanHang()`); `src/modules/dang-ky/index.ts` (gắn câu 8 vào lô duyệt)

**Interfaces:**
- `cauCapMacDinhChoHoSo(db, { partyId, roleCode, ngayDuyet, approverId, at }): D1PreparedStatement` — `INSERT … SELECT … WHERE` lặp đủ điều kiện ADR-0209 Đ3 (chính sách hiệu lực ≠ «không đặt»; `prc_rate_tier.active = 1`; vai trong `v_prc_beneficiary_role` đang bật; không dòng `prc_party_tier` chưa huỷ có `COALESCE(valid_to_date,'9999-12-31') >= ngayDuyet`).

- [ ] **Step 1: Bài đỏ**: Quản lý bán hàng, Quản trị, Toàn quyền đặt được; Kế toán, Bán hàng, Nhân sự ⇒ 403; lô duyệt ghi đúng một cấp riêng; **bốn ca không làm hỏng lô** (cấp riêng hẹn ngày mai; cấp riêng đóng ngày sắp tới; cấp bị tắt sau khi đặt; vai bị tắt) ⇒ lô thành công, không dòng mới; đổi chính sách sau duyệt không đổi cấp đã ghi; Nhân sự đổi vai ⇒ cấp theo vai mới; đơn đầu tiên tính hoa hồng đúng cấp (đường xác nhận thật); `node --test src/so-vang*.test.ts` xanh nguyên.
- [ ] **Step 2–4:** FAIL → viết → PASS. **Step 5:** commit. **Người kiểm độc lập** đọc Task 11.

### Task 12: Giao diện

**Files:**
- Create: `public/dang-ky.html`, `web/dang-ky.ts` (nhiều bước: email → mã → phiếu → ảnh → gửi; trang trạng thái; đặt PIN); `web/dang-ky-hang-cho.ts` (khối ở trang Quản lý tài khoản, cạnh `web/xac-minh-hang-cho.ts`); khối «Cấp cho đối tác tự đăng ký» ở `web/hoa-hong-cap.ts`; thành phần dấu `web/dau-xac-minh.ts`
- Modify: `public/login.html`, `web/login.ts` (lối «Đăng ký làm đối tác», luôn hiện); `src/shared/sw-policy.ts` (`PAGES` + `/dang-ky`, không đệm `/api/dang-ky/*`); `package.json` (`build:web` + `web/dang-ky.ts`); `src/shared/bang-tham-chieu*.ts` (chữ khuyến nghị), `npm run` sinh lại `docs/BANG-THAM-CHIEU.md`; `web/staff.ts`, `web/parties.ts`, `web/account.ts` (cột / dấu)

- [ ] **Step 1:** bài `src/bang-tham-chieu.test.ts`, `src/giao-dien-hoi-bang-quyen.test.ts`, `src/shared/sw-policy.test.ts` cập nhật — chạy, FAIL cho nút chưa khai.
- [ ] **Step 2:** dựng trang; ảnh thu nhỏ bằng `web/thu-nho-anh.ts` trước khi gửi.
- [ ] **Step 3:** các bài trên PASS; `npm run build:web`; typecheck.
- [ ] **Step 4:** kịch bản Chrome mới `docs/evidence/2026-11-15-dang-ky/kich-ban/dang-ky-smoke.mjs` (khuôn các `*-smoke.mjs` ở `docs/evidence/`; thêm một dòng vào bảng cuối `web/CLAUDE.md`), 390 và 1280: đăng ký → hàng chờ → xác minh → duyệt → đặt PIN → đăng nhập; chụp ảnh vào `docs/evidence/`.
- [ ] **Step 5:** commit.

### Task 13: Bất biến, sổ hàng rào, e2e, tài liệu, kiểm cuối

**Files:**
- Modify: `scripts/audit-checks.mjs` (+ `R-DK-1` phiếu `DA_DUYET` ⇔ có `staff_id`; `R-DK-2` phiếu kết thúc không còn tệp chờ chưa quyết gỡ; `R-DK-3` không khoá kho ở hai nơi; `R-DK-4` tài khoản sinh từ phiếu mang vai đối tác), `src/audit-invariants.test.ts`; `docs/SO-HANG-RAO.md` (mỗi rào: phá thử → đỏ → hoàn nguyên, ghi ngày); `docs/ARCHITECTURE.md` bảng thi hành dòng 5.29 (đổi «dựa vào kỷ luật» thành tên các bài); `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (công thức mới «đăng ký»), `docs/HANDOFF-N1.md` (runbook phát hành: công tắc Tắt, chính sách riêng tư chưa đăng thì không mở)
- Create: `tests/e2e/dang-ky.mjs`

- [ ] **Step 1:** e2e chuỗi đầy đủ + `audit-invariants --strict` — FAIL trước khi có bất biến, PASS sau.
- [ ] **Step 2:** `npm test` đủ bộ một lần; `npm run typecheck`; `npm run test:e2e -- dang-ky`.
- [ ] **Step 3:** thử iPhone thật bằng `node scripts/dev-iphone.mjs`: chụp căn cước bằng máy ảnh, ảnh HEIC, Face ID sau kích hoạt (ghi kết quả vào nhật ký thi công).
- [ ] **Step 4:** người kiểm độc lập đọc toàn nhánh (chỉ đọc), báo ĐẠT mới chuyển sang bước phát hành.
- [ ] **Step 5:** mục nhật ký thay đổi (bước A.0 của `docs/HANDOFF-N1.md`), commit; đưa chủ lệnh `npm run day-len` và `npm run trien-khai` (AI không chạy).
