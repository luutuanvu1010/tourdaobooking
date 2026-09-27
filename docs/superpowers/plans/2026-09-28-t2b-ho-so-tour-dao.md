# T2b — Tour Đảo là hồ sơ tổ chức (ADR-0024 điều 6) — Kế hoạch thi công

> **ĐỌC TRƯỚC — kế hoạch đã bị thay một phần trong lúc thi công (2026-09-28).** Nguồn: chỉ đạo của điều phối và câu trả lời của chủ, ghi đủ ở sổ thi công `docs/superpowers/plans/2026-09-28-t2b-thi-cong-nhat-ky.md` mục 4 (Ruling D1–D13, T1–T8). Chỗ nào dưới đây lệch các điểm sau thì các điểm sau THẮNG:
> - **Số migration là `0030`** (`migrations/0030_ho_so_cong_ty_chu.sql`), không phải 0028 (0028, 0029 đã chia cho nhánh khác — D1, D13). Test tìm tệp theo đuôi tên: `src/migrations-ho-so-cong-ty-chu.test.ts` (T1), không phải `src/migrations-0028.test.ts`.
> - **Task 3 thay theo ADR-0043** (chủ trả lời "cho Super Admin đổi"): KHÔNG có chỉ mục duy nhất một phần `pty_party_role_owner_company_uq`, KHÔNG có trigger cấm đóng kiểu cũ. Thay bằng ba trigger `pty_party_role_owner_company_switch` (chèn dòng mở mới ⇒ đóng dòng cũ), `…_keep_last` (không đóng được dòng mở cuối), `…_no_reopen` (không mở lại). Mọi chỗ nói "chỉ mục", "409 `owner_company_exists`", "phương án A/B", "vai không bao giờ đổi được" dưới đây là PHƯƠNG ÁN CŨ.
> - **Đổi công ty chủ** = người giữ `company.legal.write` gán vai cho hồ sơ TỔ CHỨC khác, không gắn nơi, không ngày kết thúc, ngày bắt đầu = HÔM NAY (T6, ADR-0043 điều 2). Kết thúc vai → 409 `owner_company_locked` kể cả Toàn quyền. Gán lại cho chính hồ sơ đang giữ → 409 `owner_company_already`; đổi lại trong ngày → 409 `owner_company_same_day`.
> - **Task 9 bỏ** (chủ chọn 2A — quan hệ giữ `admin.manage`).
> - **Mã vai gieo `active = 0`** (T2), lựa chọn "Công ty chủ" chỉ hiện với người giữ ô (Task 10 tối thiểu theo D7 + D12).
> - **Chữ người dùng thấy không nói "Toàn quyền"** — dùng "người phụ trách hệ thống" (D5).
> - Số bản nhật ký thay đổi tạm "1.30" (D9).

> **Cho người thi công (AI):** BẮT BUỘC dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans để làm theo từng task. Các bước dùng ô `- [ ]` để đánh dấu. Đây là **việc lớn** theo `CLAUDE.md` §3 (dữ liệu: migration + dữ liệu thật; quyền: ô mới trong `MATRIX`; luật: đề xuất sửa `docs/ARCHITECTURE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`). Người thi công **không tự nghiệm thu**: Task 16 là người kiểm độc lập chỉ đọc. AI **không deploy**: chủ dự án tự chạy `npm run day-len` rồi `npm run trien-khai` (Task 17).

**Mục tiêu:** Tour Đảo có **một** hồ sơ tổ chức trong module `parties`, đánh dấu bằng mã vai "Công ty chủ". Mọi nơi đọc tên, mã số thuế, địa chỉ, hotline, email của công ty (`GET /api/company` cho biên nhận, `GET /api/auth/config` cho chân trang đăng nhập) đều đi qua **một** hàm công bố của `parties`. Chỉ Toàn quyền sửa được hồ sơ đó. Vai "Công ty chủ" được chặn hai lớp: ở route và ở cơ sở dữ liệu.

**Kiến trúc (một đoạn):**
- Migration chỉ-thêm `0028_ho_so_cong_ty_chu.sql` làm bốn việc:
  - thêm mã vai `OWNER_COMPANY` (nhóm `OTHER`, không sinh quyền);
  - thêm chỉ mục duy nhất một phần "tối đa một dòng mở của vai này";
  - thêm trigger cấm đóng (Task 3, phụ thuộc câu trả lời 6.5);
  - chép hồ sơ tổ chức Tour Đảo từ `company_profile` bằng `INSERT … SELECT`.
- `parties/index.ts` công bố đúng một hàm mới là `ownerCompany(db)`.
- Module `company` giữ route `GET /api/company` và đọc qua hàm đó (cạnh mới `company → parties`).
- Module `auth` thêm hai trường vào `GET /api/auth/config` (cạnh mới `auth → parties`).
- Năm route ghi hồ sơ trong `parties` hỏi ô mới `company.legal.write` (chỉ `SUPER_ADMIN`) khi đụng hồ sơ công ty chủ hoặc mã vai công ty chủ.
- Trang đăng nhập giữ nguyên hình thức; chỉ đổi nguồn chữ tên và mã số thuế. Chữ tĩnh vẫn giữ làm dự phòng.

**Công nghệ:** TypeScript, Cloudflare Worker + D1, `node --test` (Node 22 chạy `.ts` trực tiếp), `node:sqlite` cho test, khung `tests/audit/harness.mjs` (cả ứng dụng thật trên SQLite), e2e `tests/e2e/*`, kịch bản Chrome (CDP).

**Nguồn chuẩn tắc (không được đổi nội dung):**
- Đề xuất đã duyệt `docs/superpowers/specs/2026-09-27-de-xuat-t2b-ho-so-tour-dao.md`. Chủ duyệt nguyên văn "duyệt T2b" ngày 2026-09-28. Lúc lập kế hoạch, tệp này chỉ có trên nhánh `dac-ta-van-chuyen`.
- `docs/adr/ADR-0024-do-thi-module-hoan-tat-pricing-billing-receipt.md`: điều 6 và bổ sung 6.1–6.6, trạng thái "accepted phần điều 6". Điều 1–5 **vẫn proposed**, không thi công ở đây.
- `docs/adr/ADR-0038-thao-tac-im-lang-cua-toan-quyen-va-gop-y-chi-toan-quyen.md` điều 7 (accepted, nhánh `worktree-an-nhat-ky-toan-quyen`).
- Hiến chương `docs/ARCHITECTURE.md` Phần I (đã duyệt): 2.1 "Chính Tour Đảo cũng là một hồ sơ tổ chức… tra qua **một** hàm công bố", và 5.1 "bất biến … có hai lớp".

**Nhánh thi công:** tạo worktree mới từ `main` **sau khi** `main` đã có cả nhánh ADR-0038 lẫn nhánh `dac-ta-van-chuyen` (Task 0 kiểm). Tên gợi ý: `t2b-ho-so-tour-dao`. Không dùng nhánh kế hoạch này để thi công.

**Nhật ký thi công:** `docs/superpowers/plans/2026-09-28-t2b-thi-cong-nhat-ky.md` (khung trống đi kèm kế hoạch này).

**Mốc đo lúc lập kế hoạch:** `main` = `5dc4732` (bản 1.25). Mọi `tệp:dòng` dưới đây đo trên mốc đó.

Task 0 bước 8 đo lại sau khi gộp nhánh ADR-0038:
- Nhánh đó chỉ thay một dòng của `src/modules/auth/index.ts` (dòng 69), nên dự kiến không lệch số dòng.
- Nhánh `thi-cong-tu-choi-huy-hdv` có sửa `src/architecture.test.ts`, `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/shared/contracts.ts`, `scripts/audit-checks.mjs`. Nếu nó gộp trước thì số dòng ở các tệp này sẽ lệch.

---

## 0. Sửa một tiền đề của lời giao việc (đọc trước)

Lời giao việc ghi: "coi ô `company.legal.write` là có sẵn". **Sự thật đo được thì khác:**
- Ô này **không có** trong mã của nhánh `worktree-an-nhat-ky-toan-quyen` (đỉnh nhánh lúc đo là `d6468e7`).
  - Lệnh đo: `git grep -n "company.legal" worktree-an-nhat-ky-toan-quyen -- src docs/quyen-hoan.json` → rỗng.
  - Ô cũng không có trên `main`.
- ADR-0038 điều 7 nói nguyên văn: *"Hôm nay chưa có route sửa riêng; việc T2b (hồ sơ tổ chức Tour Đảo) khi thi công thêm ô `company.legal.write` = chỉ `SUPER_ADMIN` và hỏi ô đó ở mọi route ghi hồ sơ công ty chủ — không dùng `admin.manage`."*
- ADR-0024 6.4 nói: *"Nếu phần này lên `main` trước ADR-0038 thì tự khai ô vào `MATRIX`; nhánh gộp sau không khai lặp."*

⇒ Kế hoạch có **task thêm ô** (Task 7), trong phạm vi hai văn bản đã duyệt nói trên.
- Task 0 bước 2 kiểm ô đã có trên `main` chưa. Trường hợp dự kiến là **chưa có**, khi đó Task 7 thêm ô.
- Nếu ai đó đã thêm thì không khai lặp, chỉ kiểm giá trị là chỉ `SUPER_ADMIN`.
- Ô mới phải vào **cùng commit** với lời hỏi `can(…, "company.legal.write")` ở route. Nếu tách commit thì hàng rào 1 (`src/permission-enforcement.test.ts`) đỏ: "Ô không được máy chủ hỏi ở đâu".

---

## 1. Mười điểm đã chốt (mỗi điểm dẫn tệp:dòng)

### 1.1 Tên mã vai và tên hàm công bố

| Thứ | Chốt | Nguồn / lý do |
|---|---|---|
| Mã vai (dữ liệu ở `pty_role_type`) | **`OWNER_COMPANY`** | Mọi mã vai hiện có là tiếng Anh viết hoa (`migrations/0011_parties.sql:74-76`, `migrations/0024_vai_quyen_mac_dinh.sql:12-22`); cột `code` có `CHECK (code = upper(code))` (`0011:69`). |
| Tên hiển thị | **"Công ty chủ"** | Chữ của đề xuất và ADR-0024 6.5. |
| Nhóm | **`OTHER`**, `sort_order` 30, `active` 1 | Không sinh quyền vì `src/shared/roles.ts:7-10` chỉ liệt kê vai `INTERNAL`/`EXTERNAL`, và `src/roles-schema.test.ts:22-23` chỉ đối chiếu hai nhóm đó ⇒ không cần sửa `roles.ts`. Số 30 đặt sau mọi vai hiện có (10–24). |
| Hằng dùng chung server ↔ giao diện | `OWNER_COMPANY_ROLE` trong tệp thuần **mới** `src/shared/cong-ty-chu.ts` | `src/CLAUDE.md` dòng 9: "Luật dùng ở cả server và giao diện = một tệp thuần trong `src/shared/`". Tệp này **không** được chứa chuỗi tên bảng vai hồ sơ (R-N1-12, `src/architecture.test.ts:413-421`). |
| Hàm công bố của `parties` | **`ownerCompany(db: D1Database): Promise<OwnerCompany \| null>`** | Theo lối đặt tên tiếng Anh của `src/modules/parties/index.ts:25-52` (`accountRolesOf`, `partySummary`…). Trả `{ partyId, displayName, legalName, taxCode, address, hotline, email }`. |

Vì sao **một** hàm trả **cả** định danh chứ không có hàm riêng trả id:
- Điều 6 đòi *"công bố một hàm trả id hồ sơ đó"*. Id có trong kết quả (`partyId`).
- 6.2 đòi *"mọi nơi đọc qua một hàm công bố"*.
- Hai hàm (một trả id, một trả định danh) sẽ trái chữ "một" của cả hai câu.
- Câu SQL "hồ sơ này có phải công ty chủ" dùng trong route là hàm **nội bộ** của `repository.ts`. Nó **không** được xuất lại từ `index.ts`.

### 1.2 Cạnh module

**Hiện trạng:**
- `GET /api/company` ở **module `company`**: `src/modules/company/index.ts:14-18`.
  - Nó đọc bảng `company_profile` qua `src/modules/company/repository.ts:14`.
  - `ALLOWED_EDGES` ghi `company: []` (`src/architecture.test.ts:24`).
  - Không module nào import `company`; chỉ gốc lắp ráp `src/index.ts:16` import nó.
- `GET /api/auth/config` ở **module `auth`**: `src/modules/auth/index.ts:103-105`.
  - Cạnh hiện có: `auth: ["staff", "maintenance"]` (`src/architecture.test.ts:21`).

**Chọn:**
- **Giữ route `GET /api/company` ở `company`** và thêm cạnh **`company → parties`**. Cạnh này có nguyên chữ trong đề xuất §5 mục "Module".
- Thêm cạnh **`auth → parties`**. Cạnh này suy thẳng từ 6.2:
  - Route cấu hình nằm ở `auth` và phải trả tên + MST "qua một hàm công bố của `parties`".
  - Muốn gọi hàm đó thì `auth` phải import `parties/index.ts`.
- Không cạnh nào khác. Vì vậy **không có câu hỏi cho chủ** về cạnh.

**Vì sao không chuyển route vào `parties`** (phương án còn lại của §5):
- Chuyển thì module `company` còn lại không route, không câu SQL nào được dùng.
- Luồng dữ liệu vẫn giữ nguyên hai tầng: `parties` giữ dữ liệu; `company` giữ **danh sách trắng** năm trường công khai (`CompanyDto`, `src/shared/contracts.ts:380-388`, cố ý không có Zalo/logo).
- ADR-0024 điều 2 (còn proposed) vẽ sẵn `receipt → … company`: module `company` còn chỗ đứng.

**Vì sao không dùng các lối khác:**
- Không đi `auth → company`: thêm một bước trung gian, và cạnh đó không có trong §5 hay 6.2.
- Không tiêm hàm qua gốc lắp ráp: tiêm chỉ dành cho gọi **ngược** chiều phụ thuộc (`docs/CHANGE-GUIDE.md` công thức b, bẫy cuối). `auth → parties` không ngược chiều (chứng minh dưới).

**Chứng minh không tạo vòng** (đồ thị ở `src/architecture.test.ts:18-38`):
1. Cạnh ra của `parties` chỉ gồm `locations` và `audit` (dòng 34); `locations` → `audit` (dòng 31); `audit` → không gì (dòng 20).
   - Tập tới được từ `parties` = {`locations`, `audit`}. Tập này không chứa `company` hay `auth`.
   - ⇒ Thêm `company → parties` và `auth → parties` không khép được vòng nào.
2. Hôm nay `auth` **đã** phụ thuộc `parties` bắc cầu: `auth → staff` (dòng 21) và `staff → parties` (dòng 35).
   - Cạnh mới không đổi tập phụ thuộc của `auth`, chỉ làm thẳng đường.
   - Sơ đồ tầng ở `docs/ARCHITECTURE.md:170-181` vẽ `auth, staff` dưới các module nghiệp vụ. Sơ đồ này đã lỏng từ khi có `staff → parties`, nên cần đề xuất sửa chữ (Task 13).
3. Một thứ tự tô-pô hợp lệ sau khi thêm cạnh (mỗi module chỉ trỏ tới module đứng trước nó): `audit, locations, parties, maintenance, staff, company, auth, accounts, catalog, orders, dispatch, feedback, thongbao, bangtin`.
4. Máy kiểm: test "đồ thị phụ thuộc module không có vòng" (`src/architecture.test.ts:118-128`) chạy lại ở Task 5 và Task 6.

**Hệ quả buộc phải ghi rõ (Ruling R1 của kế hoạch):**
- Module nghiêm (`STRICT`, `src/architecture.test.ts:41-51`) phải đăng ký **ít nhất một** câu SQL; thiếu thì test ở `:325-330` đỏ.
- 6.3 bắt `company` thôi đọc cột pháp lý, nên `company/repository.ts` sẽ **không còn câu SQL nào được dùng**.
- Hai lối nhanh đều bị cấm:
  - chuyển `company` sang `LEGACY` là **nới** hàng rào (Điều 9.4);
  - chuyển sang `KHONG_DB` thì sai, vì `company` vẫn sở hữu bảng `company_profile` và phải chuyển `env.DB` cho `parties`.
- **Chốt:** `company/repository.ts` giữ **đúng một** câu đọc cột **không pháp lý** còn thuộc module (`logo_url`, 6.3). Câu này tạm **chưa nơi nào gọi**, là chỗ giữ tới lượt thu hồi `company_profile` (expand–contract).
- Kèm một bài kiểm **siết** mới: không câu SQL nào của `company` được nhắc cột pháp lý (Task 5).
- Đây là mã chờ, để hàng rào hiện có còn đúng mà không bị nới. Người kiểm độc lập phải phán quyết điểm này (Task 16, mục soát 7).

### 1.3 Số migration: **0028**

Kết quả quét lúc lập kế hoạch (2026-09-28):
- Lệnh liệt kê nhánh: `git for-each-ref --format='%(refname:short)' refs/heads`, ra 41 nhánh.
- Rồi chạy `git ls-tree --name-only <nhánh> migrations/` cho **từng** nhánh.
- Bảng dưới ghi số lớn nhất ≥ 0019 của mỗi nhánh:

| Nhánh | Số lớn nhất ≥ 0019 |
|---|---|
| `worktree-an-nhat-ky-toan-quyen` (ADR-0038) | **0027** (`0027_v_stf_toan_quyen.sql`) |
| `main`, `dac-ta-van-chuyen`, `worktree-thong-bao-he-thong`, `worktree-agent-aa7d23379c3035075` (nhánh kế hoạch này) | 0026 |
| `thi-cong-tu-choi-huy-hdv` | 0025 (chỉ `0025_thong_bao.sql`, trùng tên với `main`; nhánh này **không** có migration riêng — kế hoạch của nó ghi "Không migration") |
| `a0-danh-muc-cho-lap-don`, `bang-tin`, `be-mat-tao-don`, `claude/tourdao-sales-audit-62ea81`, `dac-ta-don-tu-do-hdv`, `danh-muc-lap-don`, `gd2-cong-va-bang`, `ghi-trang-thai-1-16`, `ghi-trang-thai-1-18`, `hien-chuong-kien-truc`, `ke-hoach-gd2`, `ke-hoach-tu-choi-huy-hdv`, `mot-ngay-ca-don`, `ra-soat-luat-goc`, `sua-e2e-chot-chan-sheet`, `sua-trang-thai-hien-chuong`, `sua-vi-tri-chuong`, `thong-bao-tuc-thi`, `trang-thai-1-12`, `va-lo-ho-so-1-9`, `worktree-agent-a9441c370e4ac49ff`, `worktree-doi-ten-khai-niem` | 0024 |
| `dang-nhap-sat-day-cho-gop`, `dot-e-the-don-gon-va-bieu-tuong`, `gop-trang-chu-moi`, `ke-hoach-gd1-adr-0013`, `quyet-dinh-24-9-va-ba-luat`, `sua-huong-dan-truy-van-chi-doc`, `va-lo-ho-so-gd1`, `worktree-hang-rao-quyen` | 0023 |
| `kiem-toan-doi-tac`, `worktree-kiem-tra-giao-dien`, `worktree-trang-chu-moi` | 0022 |
| `canh-bao-don-trung`, `kiem-toan-ontology` | không có tệp nào ≥ 0019 |

**Kết luận quét:**
- Không nhánh nào có `0028` hay số lớn hơn. Không nhánh nào có `0019`.
- Đặc tả Vận chuyển lượt 1a (nhánh `dac-ta-van-chuyen`, `docs/superpowers/specs/2026-09-27-de-xuat-adr-0039-van-chuyen-luot-1a.md:100`) đã giữ chỗ: *"T2b dự kiến lấy 0028 ⇒ 1a từ 0029"*.
- ⇒ Tên tệp: **`migrations/0028_ho_so_cong_ty_chu.sql`**.
- Task 0 bước 4 **quét lại** lúc thi công. Nếu có nhánh đã lấy 0028 thì lấy số trống kế tiếp, sửa mọi chỗ "0028" trong kế hoạch và nhật ký, rồi báo điều phối (đặc tả 1a đang giả định 0028).

**Nhắc bẫy "migration siết B5"** (`CLAUDE.md` §10; `docs/CHANGE-GUIDE.md` công thức d):
- `wrangler d1 migrations apply` áp **mọi** migration chưa áp. Migration "siết" B5 (`staff_party_required`) không được lọt vào `migrations/` trước lần phát hành 2.
- `src/migrations-n1.test.ts:235` nhận ra B5 theo **tên tệp** (`isContractMigration`: tên chứa `staff_party_required`).
- `src/migrations-n1.test.ts:246` coi **mọi trigger tên `staff_%`/`stf_%`** là trigger siết. Vì vậy:
  - tên tệp 0028 **không** chứa `staff_party_required`;
  - tên trigger mới bắt đầu bằng **`pty_`** (theo lối tránh tên của `lc1_…` ở `migrations/0024_vai_quyen_mac_dinh.sql:72-74`).
- Số `0019` vẫn để trống cho B5 (`docs/CHANGE-GUIDE.md` công thức d): **không dùng**.

### 1.4 Gieo dữ liệu hồ sơ Tour Đảo: **bằng migration, chép bằng `INSERT … SELECT`** (không runbook)

Hai luật phải trích nguyên văn:
- `migrations/0020_partner_super_admin_permission_types.sql:3`: *"-- Không gieo SĐT của chủ dự án ở đây (CLAUDE.md §10, bài học từ F-12): gán SUPER_ADMIN cho tài khoản chủ bằng SQL runbook lúc thi công, KHÔNG migration."*
- `migrations/0024_vai_quyen_mac_dinh.sql:4`: *"-- (đặc tả §14). Không gieo SĐT/tên thật ở đây."*

Đề xuất §5 viết: *"Hotline công ty là thông tin công khai (đã in trên trang đăng nhập)."* **Sửa một chi tiết:**
- Trang đăng nhập **không** in hotline. Nó in số "Hỗ trợ kỹ thuật" (`public/login.html:37`).
- Hotline in trên **mọi ảnh biên nhận** gửi khách (`headerBlock` của `src/shared/order-confirmation.ts`, đọc từ `GET /api/company`).
- Vậy kết luận "hotline là thông tin công khai" vẫn đúng, chỉ lý do khác.

**Vì sao chọn migration:**
- Mọi giá trị riêng của công ty (tên pháp lý, MST, địa chỉ, hotline, Zalo, email) được **chép** từ dòng `company_profile` đã có sẵn trong D1, bằng `INSERT … SELECT … FROM company_profile WHERE id = 'default'`.
  - Tệp migration **không chứa** một SĐT, MST hay email viết tay nào.
  - Vậy hai luật trên không bị chạm, dù đọc hẹp ("dữ liệu cá nhân") hay rộng ("không số điện thoại nào trong migration").
- Chữ viết tay duy nhất là **tên hiển thị** "Công ty TNHH Tour Đảo" (tên doanh nghiệp, không phải tên người) và tên vai "Công ty chủ".
- Task 2 có bài kiểm quét văn bản tệp 0028 để **chặn** dãy số dài giống SĐT/MST và ký tự `@`.
- Gieo bằng migration thì mọi D1 (local, e2e, D1 tạm của kịch bản Chrome và `scripts/dev-iphone.mjs`, production) đều có đúng một hồ sơ công ty chủ ngay khi áp. Nhờ vậy bất biến R-PTY-1 (Task 4) xanh ở mọi nơi, không cần một bước tay xen giữa.

**Việc của chủ trước khi phát hành:**
- Chạy một truy vấn **chỉ đọc**. Truy vấn chỉ in độ dài và cờ, **không in giá trị** (mục 7, bước 2).
- Mục đích: chắc chắn dòng `company_profile` trên production qua được `CHECK` của `pty_organization` (`migrations/0011_parties.sql:28-38`: MST 10–14 ký tự, tên/địa chỉ ≤ 300) và hotline chuẩn hoá được.
- Nếu không qua được, migration sẽ lỗi lúc áp. `wrangler` dừng, không hỏng gì, nhưng phát hành bị chặn.

**Nếu người kiểm độc lập hoặc chủ vẫn đòi runbook:**
- **Dừng Task 2** và hỏi điều phối. Chuyển sang runbook làm đổi thứ tự phát hành: R-PTY-1 sẽ đỏ trong `npm run trien-khai` cho tới khi gieo tay xong.
- Lệnh gieo khi đó do **chủ** chạy, **mỗi câu một** `npx wrangler d1 execute tourdao-sales-db --remote --command "…"`.
  - Cùng các câu `INSERT … SELECT` như Task 2, không có số viết tay.
  - **Không** dùng `--file`, vì cổng `/import` từ chối OAuth, lỗi 10000.

### 1.5 Hai lớp chặn vai "Công ty chủ" (6.5) — viết theo **phương án A**

**(i) Lớp route** (Task 8), ở `src/modules/parties/index.ts`:
- `POST /api/parties/:id/roles`, dòng 291–314:
  - hồ sơ `:id` là công ty chủ **hoặc** mã vai gửi lên là `OWNER_COMPANY` → 403, trừ khi `can(staff, "company.legal.write")`;
  - câu hỏi "hồ sơ là công ty chủ" đứng **trước** khi đọc thân yêu cầu.
- `POST /api/parties/:id/roles/:rid/end`, dòng 316–335: dòng vai `:rid` có mã `OWNER_COMPANY` **hoặc** hồ sơ là công ty chủ → 403, cùng điều kiện.
- Số dòng khớp đề xuất (291-297, 316-324) trên `5dc4732`.

**(ii) Lớp cơ sở dữ liệu** (Task 2 và Task 3):
- Chỉ mục `pty_party_role_owner_company_uq` trên `pty_party_role(role_type_code) WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL`.
- Trigger `pty_party_role_owner_company_keep` cấm đóng dòng mở khi không có dòng mở thay thế.

**Đã thử trên SQLite nháp** (`node:sqlite`, schema dựng từ mọi `migrations/*.sql` của `5dc4732`, thêm đúng chỉ mục + trigger trên):

| Thao tác | Kết quả |
|---|---|
| mở dòng thứ hai cho hồ sơ khác | `UNIQUE constraint failed: pty_party_role.role_type_code` (SQLite báo **theo cột**, không theo tên chỉ mục) |
| mở dòng thứ hai cùng hồ sơ | `party_role_overlap: …` (trigger cũ `0011:95-99` chặn trước) |
| đóng dòng mở duy nhất | `owner_company_role_locked: …` |
| đóng rồi mở trong một giao dịch | trigger chặn |
| mở rồi đóng trong một giao dịch | chỉ mục chặn |
| chèn một dòng **đã đóng** cho hồ sơ khác | **lọt** |
| đổi mã vai của dòng mở | **lọt** |
| đổi hồ sơ của dòng mở | **lọt** |
| xoá dòng mở | **lọt** |

⇒ Khẳng định của điều phối **đúng**: có chỉ mục thì không thứ tự nào trong một lô vừa đóng dòng cũ vừa mở dòng mới. Vai này **không bao giờ đóng hay chuyển được**. Bốn đường "lọt" chỉ làm được bằng SQL gõ tay; xem câu hỏi Q1 ở mục 10.

Chủ đã được hỏi:
- **A** = giữ như duyệt (đổi pháp nhân phải qua quyết định mới).
- **B** = bỏ trigger cấm đóng.

Kế hoạch viết theo **A**:
- **Task 3 (trigger) được đánh dấu "PHỤ THUỘC câu trả lời của chủ (6.5)".** Nếu chủ chọn B thì bỏ Task 3, và phải có **ADR mới** (văn bản đã duyệt có trigger). Chưa có ADR đó thì không phát hành phần vai.

Route "gán"/"kết thúc" với mã vai này **không bao giờ** được lộ lỗi SQLite thô:
- `constraintProblem` (`src/modules/parties/index.ts:65-72`) thêm hai ánh xạ, đều 409 và có thông báo tiếng Việt:
  - `owner_company_locked` cho trigger;
  - `owner_company_exists` cho chỉ mục.
- Route "kết thúc" hôm nay **không có** `try/catch` (dòng 329-332). Nếu không thêm `try/catch`, lỗi của trigger thành 500.
- Toàn quyền đi qua lớp (i) rồi bị lớp (ii) chặn, nhận 409. Đây là bằng chứng đầu–cuối rằng lớp (ii) có thật (e2e Task 8).

### 1.6 Mỗi hàng rào mới có một bước P16 và một dòng sổ hàng rào

Mỗi task dựng hàng rào có bước "sửa cố ý → thấy đỏ → hoàn nguyên → xanh". Người làm chép **nguyên văn** thông báo đỏ vào nhật ký. Task 12 gom thành các dòng mới ở `docs/SO-HANG-RAO.md` (khuôn năm cột có sẵn: "Hàng rào | Chặn cái gì | Cơ chế | Đã thấy chặn thật | Ghi chú").
- Cột **"Đã thấy chặn thật"** để trống cho người thi công điền: ngày + phép đột biến + thông báo đỏ.
- Chưa có ngày thì hàng rào đó chỉ là **lời khuyên** (luật Sổ hàng rào, `CLAUDE.md` §3).
- Danh sách chín hàng rào mới và phép đột biến của từng cái: Task 12.

### 1.7 Test hồi quy (đề xuất §5 → test cụ thể)

| Yêu cầu §5 | Test đơn vị (trong `npm test`) | E2E (`npm run test:e2e`) |
|---|---|---|
| Bán hàng sửa hồ sơ công ty chủ → 403 | `src/modules/parties/cong-ty-chu.test.ts` (khung harness): SALES, ACCOUNTING × `PUT`, `…/contacts`, `…/contacts/:cid/end` → **đúng 403**, không ghi, không dòng nhật ký | `tests/e2e/company.mjs` khối "quyền" |
| Quản trị (không có `company.legal.write`) gán hoặc kết thúc vai "công ty chủ" → 403 | cùng tệp: ADMIN gán `OWNER_COMPANY` cho hồ sơ khác → **403 (không phải 409)**; ADMIN kết thúc dòng vai công ty chủ → **403 (không phải 409/500)**; ADMIN thêm vai bất kỳ lên hồ sơ công ty chủ → 403 | như trên |
| Gán vai "công ty chủ" thứ hai → CSDL chặn | `src/migrations-0028.test.ts` (SQLite thật); harness: Toàn quyền gán → **409 `owner_company_exists`** | Toàn quyền gán → 409, thân không có chữ `SQLITE`/`constraint`/`UNIQUE` |
| `/api/auth/config` có tên + MST | `src/modules/auth/cau-hinh-cong-ty.test.ts` (harness): đúng tên hiển thị + MST đọc từ D1; đọc hồ sơ lỗi → vẫn 200, hai trường `null` | `tests/e2e/turnstile.mjs:35` (khoá đúng tập trường); `company.mjs` so với D1 |
| Biên nhận vẫn in đúng | `src/modules/company/cong-khai.test.ts`: `GET /api/company` = đúng năm giá trị **chép từ `company_profile`**, so với D1, không gõ số | `company.mjs`; kịch bản Chrome `v1-xac-nhan-png.mjs` chạy lại không sửa |
| `audit-invariants`: đúng một hồ sơ mở vai | `src/audit-invariants.test.ts`: `R-PTY-1` ca xanh, hai ca đỏ, và "dữ liệu khoẻ ⇒ 0 vi phạm" | bước cuối `run.mjs` (`--strict`) |

Nguyên tắc chung cho mọi test quyền:
- Khẳng định **đúng mã 403**, không chỉ "không 2xx".
- Lý do: lớp CSDL trả 409. Nếu test chỉ đòi "bị từ chối" thì một lỗ ở route sẽ bị lớp CSDL che mất, và phép đột biến P16 của route không đỏ.

### 1.8 Trang đăng nhập (6.2)

**Hình thức giữ nguyên:**
- Chân trang ở `public/login.html:43-46`: `<footer class="login-info">`, hai `<span>`, lớp `login-company-name`/`login-address`.
- Không đổi CSS (`public/app.css:744-746, 755, 763`). Không thêm yêu cầu mạng.
- `web/login.ts:386-388` giữ `releaseText`; chỉ sửa chú thích dòng 386–387 cho đúng nguồn mới.

**Chỉ đổi nguồn chữ:**
- Thêm `id="company-name"` vào `<span class="login-company-name">`, và bọc số MST trong `<span id="company-tax">…</span>` (**giữ nguyên** số đang có trong tệp).
- `fetchConfig()` (`web/login.ts:332-348`) gọi hàm thuần `chanTrangCongTy(config)` (`src/shared/cong-ty-chu.ts`). Chỉ khi hàm trả giá trị hợp lệ mới thay `textContent` (không `innerHTML`).
- Hai trường mới của `GET /api/auth/config`:
  - `companyName` = **tên hiển thị** của hồ sơ công ty chủ;
  - `companyTaxCode` = MST.
- Thêm hai trường, không thêm yêu cầu mạng (đúng chữ 6.2).

**Chữ tĩnh làm dự phòng:**
- Chưa tải xong cấu hình, cấu hình lỗi/chậm, hoặc `login.js` cũ còn trong cache của service worker → chữ tĩnh hiện nguyên.
- Máy chủ: đọc hồ sơ lỗi thì hai trường là `null`, cấu hình đăng nhập (Turnstile, bảo trì, Face ID, phiên bản) **vẫn** trả 200. Chân trang không bao giờ được làm hỏng đăng nhập.

**Địa chỉ** vẫn là chữ tĩnh:
- 6.2 duyệt đúng **hai** trường (tên, MST).
- Chữ tĩnh sửa theo dữ liệu hồ sơ ("tỉnh/Tỉnh", 6.2). Hai chỗ lệch khác: xem Q2.
- Bài so khớp chữ tĩnh với dữ liệu gieo dùng **chuỗi đã chuẩn hoá** (chữ thường tiếng Việt, NFC, bỏ dấu câu, gộp khoảng trắng), không so từng ký tự.

**Kịch bản Chrome** (theo `web/CLAUDE.md:33` và `:42`):
- Chạy `v1-dang-nhap.mjs` (sửa bước a, thêm bước a2, sửa bước e) và `dot-c-smoke.mjs`.
- Chạy trên `main` **trước** (Task 0) để biết cái nào đỏ sẵn.

### 1.9 Tài liệu kèm theo (Task 13)

- **Sổ dữ liệu:** `docs/data-dictionary.json` → bảng `company_profile` thêm `deprecatedColumns: ["company_name", "tax_code", "address", "hotline", "zalo_number", "email"]` (thôi được đọc, 6.3; khuôn có sẵn ở bảng `staff`). Rồi chạy `npm run dict`. Không có bảng/view mới.
- **Tài liệu mô tả (thua mã, sửa trong cùng nhánh):**
  - `docs/SYSTEM-DESIGN.md` §5 (dòng 227, bất biến SQL, bảng migration), §6 (i), §7 (dòng 484 + dòng `/api/auth/config` + route hồ sơ), §8 (ô mới), §9 (dòng 603, 658), §14 (gộp hồ sơ phải từ chối công ty chủ; thu hồi `company_profile`), §17 (dòng 840–841).
  - `docs/CHANGE-GUIDE.md` §1 (dòng 21), §2 d (đoạn "Số kế tiếp" đang ghi cũ), §2 j (viết lại đoạn "Thông tin công ty"), §2 u, §3, §4 (bẫy mới).
  - `tests/e2e/README.md` (dòng mô tả `company.mjs`).
- **Nhật ký thay đổi:** mục mới đầu `src/shared/changelog.ts` + sửa chuỗi kỳ vọng ở `src/shared/app-info.test.ts`.
  - **Số bản chốt LÚC GỘP:** lấy số trống kế tiếp. Hiện nhiều nhánh xếp hàng: nhánh ADR-0038 đang mang 1.26.
  - Không viết số lúc làm Task 1–14 (Task 15).
- **Tệp luật: CHỈ ĐỀ XUẤT diff (N9)**, trong `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` do người thi công tạo ở Task 13:
  - `docs/ARCHITECTURE.md` (Phần II dòng 175 và sơ đồ tầng 170–181; bảng thi hành dòng 141 "2.1");
  - `src/CLAUDE.md` (dòng 20);
  - `web/CLAUDE.md` (bảng "Sửa tệp nào thì chạy kịch bản nào");
  - `CLAUDE.md` gốc §10 (một bẫy).
  - Không tự sửa các tệp này. Chủ duyệt diff **trước** `day-len` (Task 17).

### 1.10 Tiêu chí nghiệm thu

Tiêu chí viết bằng hành vi kiểm được: xem mục 3.
- **Việc lớn:** có người kiểm độc lập chỉ-đọc ở cuối (Task 16).
- **Không deploy:** chủ chạy `npm run day-len -- <nhánh>` rồi `npm run trien-khai` (có migration 0028).

---

## 2. Ràng buộc chung

- Giao diện, thông báo lỗi, tài liệu, commit: **tiếng Việt có dấu**; không chữ Anh hay mã thô lộ ra người dùng (mã lỗi máy như `owner_company_locked` chỉ nằm ở trường `code`).
- Không `innerHTML`; dựng DOM bằng `h()` / `textContent` (`web/CLAUDE.md`).
- Module chỉ import module khác qua `index.ts`. Chỉ `parties` nhắc tên bảng vai hồ sơ (R-N1-12). `src/shared/` không import `src/modules/`.
- SQL mới của `parties` và `company` đi qua `defineSql`, câu tĩnh, tham số đánh số `?N` (module nghiêm).
- **Kiểm quyền:** lời gọi `can(staff, "<ô>")` viết **thẳng** trong thân handler, và kết quả dẫn tới `return` từ chối.
  - Hàng rào 2 (`src/route-write-guard.test.ts`) không đi vào hàm con.
  - **Không** thêm tên hàm vào `GUARDS`, **không** thêm ô vào `ADMIN_OPS` (thêm = nới hàng rào).
  - Câu tra dữ liệu "hồ sơ này có phải công ty chủ" là hàm con được (không phải kiểm quyền).
- **Không** viết SĐT, MST, email của công ty vào mã, test, kịch bản hay tài liệu mới. So sánh luôn với giá trị đọc từ D1 hoặc từ một API khác.
- **Không** viết cứng id hồ sơ công ty chủ ngoài `migrations/0028_*.sql` (điều 6; Task 2 có bài kiểm).
- Không sửa `docs/quyen-hoan.json` (ô mới được hỏi ngay, không hoãn).
- Không `git push`, không merge `main`, không `wrangler deploy`, không lệnh `--remote` nào; hook chặn (`CLAUDE.md` §8).
- Mỗi hành vi mới: test **đỏ trước, xanh sau**. Ghi dòng đỏ vào nhật ký thi công.
- `npm run typecheck` không phủ `*.test.ts`, `scripts/`, `tests/`: tự đọc lại tệp test mới trước khi commit.

## 3. Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20)

1. `npm test` xanh; `npm run typecheck` 0 lỗi; `npm run build:web` chạy được; `npm run test:e2e` đủ bộ xanh. Đỏ sẵn có trên `main` (đo ở Task 0) ghi riêng, không tính cho T2b.
2. **Dữ liệu sau migration** (D1 dựng mới):
   - đúng **một** dòng `pty_party_role` đang mở với mã `OWNER_COMPANY`;
   - hồ sơ của nó là `ORGANIZATION`, `active = 1`, tên hiển thị "Công ty TNHH Tour Đảo";
   - `legal_name`/`tax_code`/`address` **bằng đúng** giá trị của `company_profile`;
   - liên hệ "Hotline" (PHONE, chính), "Zalo" (PHONE, phụ, nếu có), email (EMAIL, chính, nếu có) bằng đúng giá trị nguồn;
   - `value_normalized` của SĐT = `normalizePhone()`;
   - `company_profile` **không đổi** một ô nào.
3. **`GET /api/company`** (công khai):
   - đúng năm khoá cũ, giá trị = bản chép (không đổi so với trước T2b);
   - đổi `pty_organization.legal_name` → API đổi theo;
   - đổi `company_profile.company_name` → API **không** đổi (6.3);
   - đóng liên hệ email → `email: null`;
   - không còn liên hệ "Hotline" đang mở → 404 "Chưa có thông tin công ty.".
4. **`GET /api/auth/config`:**
   - `companyName` = tên hiển thị, `companyTaxCode` = MST của hồ sơ công ty chủ;
   - đọc hồ sơ lỗi → vẫn 200 với đủ trường cũ, hai trường mới `null`.
5. **SALES, ACCOUNTING:**
   - `PUT /api/parties/:id`, `POST …/contacts`, `POST …/contacts/:cid/end` trên hồ sơ công ty chủ → **403**, không ghi, không dòng nhật ký;
   - trên hồ sơ tổ chức thường → như cũ (200/201).
6. **ADMIN** (không có `company.legal.write`):
   - ba route ở mục 5 trên hồ sơ công ty chủ → **403**;
   - `POST …/roles` lên hồ sơ công ty chủ (mã bất kỳ) → **403**;
   - `POST …/roles` mã `OWNER_COMPANY` lên hồ sơ khác → **403**;
   - `POST …/roles/:rid/end` dòng vai công ty chủ → **403**;
   - mọi ca trên đều không ghi, không nhật ký;
   - ADMIN thêm `CUSTOMER` cho hồ sơ thường → 201 (không chặn quá tay);
   - ADMIN thêm quan hệ "Người liên hệ của" với hồ sơ công ty chủ → **201**: giữ `admin.manage` theo chữ 6.4 + ADR-0038 điều 7. Ca này đổi thành 403 nếu chủ chọn khoá (Task 9).
7. **SUPER_ADMIN:**
   - `PUT`/`contacts` trên hồ sơ công ty chủ → 200/201, có nhật ký;
   - gán `OWNER_COMPANY` cho hồ sơ khác → **409 `owner_company_exists`**;
   - kết thúc dòng vai công ty chủ → **409 `owner_company_locked`** (phương án A);
   - thân lỗi tiếng Việt, không có chữ `SQLITE`/`constraint`/`UNIQUE`;
   - sau mọi ca: vẫn đúng một dòng mở.
8. **SQLite thật** (`src/migrations-0028.test.ts`):
   - dòng mở thứ hai bị chặn (hồ sơ khác, và cùng hồ sơ);
   - đóng dòng mở duy nhất bị chặn;
   - đóng-rồi-mở và mở-rồi-đóng trong **một** giao dịch đều bị chặn (A).
9. **`GET /api/parties/:id` hồ sơ công ty chủ:** `editable` = `false` cho SALES, ADMIN; `true` cho SUPER_ADMIN.
10. **Danh bạ:**
    - ô "Thêm công việc" không có "Công ty chủ";
    - dòng vai "Công ty chủ" không có nút "Kết thúc" (hiện "Cố định");
    - hồ sơ công ty chủ chỉ hiện nút sửa/thêm với người có `editable`.
    - Kiểm bằng Chrome, có ảnh.
11. **Đăng nhập:**
    - chân trang hiện `<tên hiển thị> · MST <MST>` lấy từ cấu hình (Chrome: đổi tên hiển thị trong D1 tạm → tải lại → chân trang đổi theo);
    - chặn/500 cấu hình → chữ tĩnh;
    - ảnh 390×844 và 1040×800 không khác bố cục so với ảnh đo trên `main` (Task 0);
    - trang vẫn **không** gọi `GET /api/company`.
12. **Biên nhận:** `v1-xac-nhan-png.mjs` xanh như trên `main`.
13. **Kiến trúc:**
    - `ALLOWED_EDGES` có `company: ["parties"]` và `auth` thêm `"parties"`, không vòng;
    - `parties/index.ts` xuất **đúng một** hàm mới (`ownerCompany`) cùng kiểu `OwnerCompany`;
    - không câu SQL nào của `company` nhắc cột pháp lý;
    - không tệp nào ngoài `migrations/0028_*.sql` chứa id hồ sơ công ty chủ.
14. **Sổ hàng rào:** các dòng mới ở `docs/SO-HANG-RAO.md`, mỗi dòng có ngày thấy chặn thật (P16).
15. **Tài liệu:** tài liệu mô tả khớp mã; tệp đề xuất diff luật có mặt; chủ đã duyệt nó trước khi gộp.
16. **Người kiểm độc lập** chỉ-đọc xác nhận 1–15 bằng cách đọc mã thật và tự chạy lại lệnh.
17. **AI không deploy.** Sau khi chủ chạy `npm run trien-khai`: `audit-invariants --db remote` đạt (gồm R-PTY-1); `kiem-phien-ban.mjs --sau-deploy` đạt.

## 4. Điểm dễ hỏng mà task chưa tự nhiên phủ (Review Focus)

1. **Lớp CSDL che lỗ ở route.**
   - ADMIN gán `OWNER_COMPANY` cho hồ sơ khác mà route quên hỏi ô → CSDL vẫn chặn (409).
   - Test phải đòi **403**, và P16 của route phải đỏ vì 409 ≠ 403.
2. **Route "kết thúc vai" không có `try/catch` hôm nay** (`src/modules/parties/index.ts:329-332`). Thiếu nó thì trigger thành 500 và lộ lỗi SQLite.
3. **Thứ tự 403 trước 400:** câu "hồ sơ là công ty chủ" hỏi **trước** `readJson`, để 400 không lộ trước 403. Theo khuôn GĐ1, `docs/superpowers/plans/2026-09-24-gd1-adr-0013-thi-cong.md` "Review Focus" mục 4.
4. **Hàm công bố thứ hai lén xuất hiện:** `isOwnerCompanyParty` chỉ nằm trong `repository.ts`; không thêm vào khối `export {…}` của `parties/index.ts:25`.
5. **Cấu hình đăng nhập hỏng theo hồ sơ:** `ownerCompany()` ném lỗi thì `/api/auth/config` phải vẫn 200 (`.catch` → `null` + một dòng log). Nếu không, widget Turnstile và nút Face ID chết theo.
6. **Migration có số viết tay:** bài quét văn bản chặn. Nhưng người thi công phải tự xoá chú thích có số trước khi chạy bài quét (bài quét bỏ chú thích `--`).
7. **E2E không được đóng vai công ty chủ.** Phương án A không cho mở lại, nên e2e chỉ đổi và khôi phục **liên hệ** và **tên** trong `finally`. Ca 404 dùng "đóng liên hệ Hotline" (khôi phục được), không xoá dòng vai.
8. **Danh sách khoá đúng từng mã:**
   - `tests/e2e/parties.mjs:16-19` khoá **nguyên** danh sách mã vai của `/api/parties/meta` → sẽ đỏ, sửa ở Task 2.
   - `tests/e2e/turnstile.mjs:35` khoá **nguyên** tập trường của `/api/auth/config` → sửa ở Task 6.
   - `tests/e2e/maintenance.mjs:201` cấm chữ `phone` trong thân cấu hình → không thêm hotline vào cấu hình.
9. **Nhánh gộp song song:**
   - `thi-cong-tu-choi-huy-hdv` cũng sửa `permissions.ts`, `permissions.test.ts`, `architecture.test.ts`, `contracts.ts`, `audit-checks.mjs`.
   - Nhánh ADR-0038 sửa `permissions.ts`, `permissions.test.ts`, `tests/e2e/parties.mjs`.
   - Ai gộp sau thì gộp tay các khối đó. Ghi vào nhật ký.

---

## 5. Sơ đồ tệp

| Tệp | Việc | Task |
|---|---|---|
| `src/shared/cong-ty-chu.ts` (mới) + `.test.ts` | hằng `OWNER_COMPANY_ROLE`; hàm thuần `chanTrangCongTy` | 1 |
| `migrations/0028_ho_so_cong_ty_chu.sql` (mới) | mã vai, chỉ mục, hồ sơ + tổ chức + liên hệ + dòng vai (Task 2); trigger (Task 3) | 2, 3 |
| `src/migrations-0028.test.ts` (mới) | dữ liệu gieo, chuẩn hoá SĐT, không số viết tay, không id cứng, chỉ mục, trigger | 2, 3 |
| `tests/e2e/parties.mjs` | thêm `OWNER_COMPANY` vào danh sách mã vai (dòng 16–19) | 2 |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | kiểm `R-PTY-1` | 4 |
| `src/modules/parties/repository.ts` | câu `owner_company`, `is_owner_company`; `roleRowGroup` → `roleRowOf` (thêm mã vai) | 5, 7, 8 |
| `src/modules/parties/index.ts` | xuất `ownerCompany`; 5 route ghi; `respondParty`; `constraintProblem`; `try/catch` route kết thúc vai | 5, 7, 8 |
| `src/modules/company/{index,repository,rules}.ts` (+ `rules.test.ts`, `cong-khai.test.ts`, `khong-doc-cot-phap-ly.test.ts` mới) | route đọc qua `ownerCompany`; câu giữ chỗ `logo_url`; bài siết 6.3 | 5 |
| `src/architecture.test.ts` | `ALLOWED_EDGES`: `company: ["parties"]`, `auth` thêm `"parties"` (kèm chú thích) | 5, 6 |
| `tests/e2e/company.mjs` | viết lại: nguồn là hồ sơ, so với D1, khối quyền | 5, 8 |
| `src/shared/contracts.ts` | `AuthConfigResponse.companyName`, `.companyTaxCode` | 6 |
| `src/modules/auth/index.ts` (+ `cau-hinh-cong-ty.test.ts` mới) | cấu hình trả hai trường; lỗi → `null` | 6 |
| `tests/e2e/turnstile.mjs` | khoá tập trường mới (dòng 35) | 6 |
| `src/shared/permissions.ts`, `src/shared/permissions.test.ts` | ô `company.legal.write`; bảng `ADR`; `ADMIN_NONE_OPS` | 7 |
| `src/modules/parties/cong-ty-chu.test.ts` (mới) | hồi quy quyền cả ứng dụng (harness) | 7, 8 (9) |
| `web/parties.ts` | ô thêm vai, nút "Kết thúc", khối vai của hồ sơ công ty chủ | 10 |
| `docs/evidence/2026-09-28-t2b/kich-ban/t2b-danh-ba-smoke.mjs` (mới) + README | Chrome: Danh bạ theo ba tài khoản | 10 |
| `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs` | thêm khẳng định "ô thêm công việc không có Công ty chủ" | 10 |
| `public/login.html`, `web/login.ts`, `src/chan-trang-dang-nhap.test.ts` (mới) | chân trang đọc cấu hình; chữ tĩnh dự phòng; bài so khớp | 11 |
| `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` | bước a, a2 (mới), e | 11 |
| `docs/SO-HANG-RAO.md` | các dòng mới | 12 |
| `docs/data-dictionary.json` → `docs/DATA-DICTIONARY.md`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`; `tests/e2e/README.md`; `src/shared/app-info.ts` (chú thích dòng 4) | tài liệu mô tả | 13 |
| `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` (mới) | đề xuất diff luật (không tự sửa luật) | 13 |
| `src/shared/changelog.ts`, `src/shared/app-info.test.ts` | nhật ký thay đổi (số chốt lúc gộp) | 15 |
| `docs/superpowers/plans/2026-09-28-t2b-thi-cong-nhat-ky.md` | nhật ký thi công | mọi task |

---

## 6. Các task

### Task 0: Điều kiện trước, mốc, soát

- [ ] **Bước 1 — hai ADR đã lên `main`.**
  - Chạy `git ls-tree --name-only main docs/adr/ | grep -E "0024|0038"`. Kỳ vọng hai tệp `ADR-0024-…` và `ADR-0038-…`.
  - Rồi chạy `git show main:docs/adr/ADR-0024-do-thi-module-hoan-tat-pricing-billing-receipt.md | sed -n 3p`. Phải có chữ "accepted phần điều 6".
  - Thiếu một trong hai → **DỪNG**, báo điều phối. Thứ tự đã hẹn: nhánh ADR-0038 lên trước, `dac-ta-van-chuyen` lên sau, rồi mới thi công.
- [ ] **Bước 2 — ô `company.legal.write`:** chạy `grep -n '"company.legal.write"' src/shared/permissions.ts` trên worktree mới (tạo từ `main`).
  - **Dự kiến rỗng** (mục 0) → Task 7 thêm ô.
  - Có sẵn → ghi nhật ký, kiểm đúng `row("none", "none", "none", "none", "none", "any", "none")`, và ở Task 7 **bỏ** các bước thêm ô (giữ các bước route).
- [ ] **Bước 3 — dừng dây chuyền:** `node -e 'console.log(JSON.stringify(require("./docs/quyen-hoan.json").phat_hien))'` → kỳ vọng `[]`.
  - Có phát hiện HIGH chạm `parties`/`company`/`auth` → **DỪNG**, hỏi (luật "dừng dây chuyền", `CLAUDE.md` §3).
- [ ] **Bước 4 — số migration:**
  - Chạy `ls migrations/`, kỳ vọng số lớn nhất `0027`.
  - Quét lại mọi nhánh: `git for-each-ref --format='%(refname:short)' refs/heads`, rồi `git ls-tree --name-only <nhánh> migrations/ | grep -E "/00(19|2[0-9]|3[0-9])"` **cho từng nhánh** (worktree cô lập không chạy được vòng lặp; chạy từng lệnh).
  - Có nhánh mang `0028_*` → lấy số trống kế tiếp, sửa mọi chỗ "0028" và báo điều phối.
- [ ] **Bước 5 — mốc test:** `npm ci`, `npm test`, `npm run typecheck`. Ghi số test, số lỗi.
  - Ca đo CPU của `src/claude-guard.test.ts` đỏ vì máy bận → ghi `uptime`, chạy lại riêng tệp đó lúc máy rảnh; không sửa tệp đó.
- [ ] **Bước 6 — mốc e2e (cần mạng):** `npm run test:e2e`. Ghi kịch bản đỏ sẵn có (nếu có) vào nhật ký mục "Đỏ sẵn có trên main".
- [ ] **Bước 7 — mốc Chrome trên `main`.**
  - Chạy `npm run build:web`, rồi chạy (lệnh ở đầu từng tệp / README cùng thư mục):
    - `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` (cần mạng, ≈ 9 phút);
    - `docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs`;
    - `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`;
    - `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs`;
    - `docs/evidence/2026-09-21-v1-0/kich-ban/v1-xac-nhan-png.mjs`.
  - Ghi số dòng ✓/✗ và **giữ ảnh** màn đăng nhập 390×844 và 1040×800 (bước i của `v1-dang-nhap.mjs`) làm ảnh gốc so bố cục ở Task 11.
  - Nhật ký Thông báo lượt 1 ghi `dot-c-smoke.mjs` (nút bảo trì cần Toàn quyền) và `v1-bao-tri.mjs` là **đỏ sẵn có**. Đừng đuổi theo chúng như lỗi của T2b.
- [ ] **Bước 8 — soát số dòng trích dẫn** của kế hoạch này trên `main` mới (đặc biệt nếu `thi-cong-tu-choi-huy-hdv` đã gộp). Ghi độ lệch vào nhật ký.
- [ ] **Bước 9 — soát khẳng định "đúng số lượng / đúng danh sách"** sẽ lệch vì mọi D1 mới có thêm một hồ sơ tổ chức kèm 2–3 liên hệ:
  - Chạy `grep -rn "roleTypes\|parties.length\|matches.length\|count(\*)[^\"]*pty_\|FROM pty_contact_point" tests src docs/evidence/*/kich-ban`.
  - Đã biết:
    - `tests/e2e/parties.mjs:16-19` (danh sách mã vai) → sửa ở Task 2;
    - `tests/e2e/turnstile.mjs:35` (dòng 36 sau khi gộp nhánh ADR-0038) khoá nguyên tập trường của cấu hình → sửa ở Task 6.
  - Đã xem và **không** ảnh hưởng:
    - `tests/audit/doi-tac.test.mjs:66-72` dùng `find`/`some`;
    - `dot-a-smoke.mjs` đòi `>= 1` thẻ;
    - `src/migrations-n1.test.ts:181,201` dựng tới `0011`/`0012`;
    - `tests/e2e/maintenance.mjs:37-39, 198-201, 247-248` và `tests/e2e/passkey.mjs:37-38` chỉ đọc trường con (`r.body.maintenance`, `r.body.passkey`), **không** khoá tập trường của cấu hình. Các `deepEqual(r.body, …)` còn lại của hai tệp là API khác.
  - Lưu ý: `tests/e2e/maintenance.mjs:201` đòi thân cấu hình **không** khớp `/allowed|…|phone/i`.
    - Hai trường mới (`companyName`, `companyTaxCode`) và giá trị của chúng không chứa các chữ đó.
    - **Đừng** thêm hotline vào cấu hình.
  - Ghi mọi chỗ mới tìm thấy.
- [ ] **Bước 10 — mở nhật ký thi công** `docs/superpowers/plans/2026-09-28-t2b-thi-cong-nhat-ky.md`: điền mốc, nhánh, câu trả lời của chủ (nếu đã có).

---

### Task 1: Hằng mã vai và hàm thuần chân trang (`src/shared/cong-ty-chu.ts`)

**Tệp:** tạo `src/shared/cong-ty-chu.ts`, `src/shared/cong-ty-chu.test.ts`.
**Giao diện tạo ra:**
- `OWNER_COMPANY_ROLE = "OWNER_COMPANY"`.
- `chanTrangCongTy(cfg: unknown): { ten: string; mst: string } | null`.

- [ ] **Bước 1: Viết test đỏ** `src/shared/cong-ty-chu.test.ts`:

```ts
// ADR-0024 điều 6 / 6.2 — hằng mã vai "Công ty chủ" và chữ chân trang đăng nhập (thuần, dùng chung server ↔ giao diện).
import { test } from "node:test";
import assert from "node:assert/strict";
import { OWNER_COMPANY_ROLE, chanTrangCongTy } from "./cong-ty-chu.ts";

test("mã vai công ty chủ là OWNER_COMPANY (dữ liệu ở migration 0028 — src/migrations-0028.test.ts đối chiếu)", () => {
  assert.equal(OWNER_COMPANY_ROLE, "OWNER_COMPANY");
});

test("chanTrangCongTy: nhận tên + MST hợp lệ (cắt khoảng trắng); thiếu/sai → null để trang giữ chữ tĩnh", () => {
  assert.deepEqual(chanTrangCongTy({ companyName: "  Công ty Thử  ", companyTaxCode: " 0312345678 " }), { ten: "Công ty Thử", mst: "0312345678" });
  assert.deepEqual(chanTrangCongTy({ companyName: "Công ty Thử", companyTaxCode: "0312345678-001" }), { ten: "Công ty Thử", mst: "0312345678-001" });
  const bad: unknown[] = [
    null, undefined, 1, "x", {},
    { companyName: null, companyTaxCode: null },
    { companyName: "", companyTaxCode: "0312345678" },
    { companyName: "A", companyTaxCode: "123" },
    { companyName: "A", companyTaxCode: "031234567890123" },
    { companyName: "A", companyTaxCode: "03123x5678" },
    { companyName: "x".repeat(201), companyTaxCode: "0312345678" },
    { companyName: 5, companyTaxCode: "0312345678" },
  ];
  for (const b of bad) assert.equal(chanTrangCongTy(b), null, JSON.stringify(b));
});
```

(Số `0312345678` là MST **giả** đã dùng ở `tests/e2e/parties.mjs:58`, không phải MST của Tour Đảo.)

- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/shared/cong-ty-chu.test.ts`. Kỳ vọng FAIL: không tìm thấy module `./cong-ty-chu.ts`.
- [ ] **Bước 3: Viết mã tối thiểu** `src/shared/cong-ty-chu.ts`:

```ts
// Hồ sơ "công ty chủ" — ADR-0024 điều 6 (accepted phần điều 6, chủ duyệt 2026-09-28). Tệp THUẦN, một nguồn cho máy chủ (module parties)
// và giao diện (web/login.ts, web/parties.ts). Không nhắc tên bảng vai hồ sơ ở đây (R-N1-12 — src/architecture.test.ts).

/** Mã vai đánh dấu hồ sơ tổ chức Tour Đảo. DỮ LIỆU ở bảng loại vai (migration 0028), nhóm OTHER: không sinh quyền (không có trong roles.ts). */
export const OWNER_COMPANY_ROLE = "OWNER_COMPANY";

/** 10–14 ký tự chữ số/gạch, như CHECK của cột mã số thuế ở hồ sơ tổ chức (migrations/0011). */
const MST_RE = /^[0-9][0-9-]{9,13}$/;

/** Chữ chân trang đăng nhập từ GET /api/auth/config (ADR-0024 6.2). Thiếu hoặc sai → null: trang GIỮ chữ tĩnh (dự phòng khi chưa tải xong / lỗi mạng). */
export function chanTrangCongTy(cfg: unknown): { ten: string; mst: string } | null {
  if (!cfg || typeof cfg !== "object") return null;
  const { companyName, companyTaxCode } = cfg as Record<string, unknown>;
  if (typeof companyName !== "string" || typeof companyTaxCode !== "string") return null;
  const ten = companyName.trim();
  const mst = companyTaxCode.trim();
  if (ten.length === 0 || ten.length > 200 || !MST_RE.test(mst)) return null;
  return { ten, mst };
}
```

- [ ] **Bước 4: Chạy, thấy xanh:** `node --test src/shared/cong-ty-chu.test.ts` → PASS. Rồi chạy `node --test src/architecture.test.ts` → xanh (R-N1-12 không bắt vì tệp không nhắc tên bảng).
- [ ] **Bước 5: Commit.** Thông điệp commit: "Hằng mã vai Công ty chủ và chữ chân trang đăng nhập (ADR-0024 điều 6, 6.2)". Thân: một nguồn cho máy chủ và giao diện; giá trị sai thì trang giữ chữ tĩnh.

---

### Task 2: Migration 0028 — mã vai, chỉ mục, hồ sơ Tour Đảo (chưa có trigger)

**Tệp:**
- Tạo `migrations/0028_ho_so_cong_ty_chu.sql` và `src/migrations-0028.test.ts`.
- Sửa `tests/e2e/parties.mjs:16-19`.

**Giao diện tạo ra:** dữ liệu. Bảng loại vai có `OWNER_COMPANY`; chỉ mục `pty_party_role_owner_company_uq`; một hồ sơ tổ chức mở vai đó.

- [ ] **Bước 1: Sinh ba id cố định MỘT lần** (tiền lệ `migrations/0010_locations.sql:28-35`: id gieo giống nhau ở mọi môi trường):
  - Chạy `node -e 'for (const k of ["ho so","hotline","zalo","email","vai"]) console.log(k, crypto.randomUUID())'`.
  - Chép năm UUID vào tệp migration ở năm chỗ trống `<ID_HO_SO>`, `<ID_HOTLINE>`, `<ID_ZALO>`, `<ID_EMAIL>`, `<ID_VAI>`.
  - **Không** chép chúng vào kế hoạch, nhật ký, mã hay test (bài kiểm ở bước 3 chặn id hồ sơ).
- [ ] **Bước 2: Viết test đỏ** `src/migrations-0028.test.ts`. Khuôn: `src/modules/company/migration.test.ts`, `src/migrations-0024.test.ts`. Tối thiểu các ca sau, mỗi ca một `test(...)`:

```ts
// Kiểm migration 0028 (ADR-0024 điều 6): hồ sơ tổ chức Tour Đảo, mã vai OWNER_COMPANY, chỉ mục "một dòng mở". Dựng schema bằng node:sqlite từ migrations/*.sql.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { OWNER_COMPANY_ROLE } from "./shared/cong-ty-chu.ts";
import { normalizePhone } from "./shared/phone.ts";
import { PARTY_ID_RE } from "./shared/party-id.ts";
import { ROLE_CODES } from "./shared/roles.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.startsWith("0028_"))!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => { const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON"); for (const f of list) db.exec(sqlOf(f)); return db; };
const all = () => open(files);
const before = () => open(files.filter((f) => f < FILE));
const goc = (db: DatabaseSync) => ({ ...(db.prepare("SELECT * FROM company_profile WHERE id = 'default'").get() as Record<string, unknown>) });
const owners = (db: DatabaseSync) => db.prepare(
  `SELECT p.id, p.party_kind, p.display_name, p.active, o.legal_name, o.tax_code, o.address, o.invoice_email, r.location_id
   FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id LEFT JOIN pty_organization o ON o.party_id = p.id
   WHERE r.role_type_code = ? AND r.valid_to_date IS NULL`).all(OWNER_COMPANY_ROLE).map((r) => ({ ...r })) as Record<string, unknown>[];
```

Các ca:
- (a) Có **đúng một** tệp `0028_*`. Tên không chứa `staff_party_required`. Trigger mới (nếu có) không tên `staff_%`/`stf_%`.
- (b) Bảng loại vai có dòng `OWNER_COMPANY`: `name` "Công ty chủ", `role_group` `OTHER`, `active` 1. Và `!ROLE_CODES.includes("OWNER_COMPANY")` (không sinh quyền).
- (c) `owners(all())` có **đúng 1** phần tử, và phần tử đó thoả tất cả:
  - `party_kind` `ORGANIZATION`, `active` 1, `display_name` "Công ty TNHH Tour Đảo", `location_id` null;
  - `legal_name`/`tax_code`/`address` **bằng** `goc(db).company_name`/`.tax_code`/`.address`;
  - `invoice_email` null;
  - id khớp `PARTY_ID_RE`.
- (d) Liên hệ của hồ sơ đó:
  - đúng một PHONE nhãn "Hotline" `is_primary = 1`, `value` = `goc.hotline`, `value_normalized` = `normalizePhone(goc.hotline)`;
  - nếu `goc.zalo_number` khác rỗng: đúng một PHONE nhãn "Zalo" `is_primary = 0`, cùng cách so;
  - nếu `goc.email` khác rỗng: đúng một EMAIL `is_primary = 1`, `value_normalized` = `goc.email.toLowerCase()`;
  - mọi id liên hệ và id dòng vai khớp `/^(?:ptr-)?[0-9a-f-]{36}$/` (`ROW_ID_RE`, `src/modules/parties/rules.ts:13`: nút "Đóng" và "Kết thúc" của giao diện dùng được).
- (e) **Chuẩn hoá SĐT bằng SQL khớp `normalizePhone`** với mọi dạng viết. Với từng mẫu **giả** `"0901 234 567"`, `"+84 901 234 567"`, `"0901.234.567"`, `"(0901) 234-567"`, `"84901234567"`:
  - `before()`;
  - `UPDATE company_profile SET hotline = ?, zalo_number = ?`;
  - `db.exec(sqlOf(FILE))`;
  - hai `value_normalized` PHONE phải bằng `normalizePhone(mẫu)`.
- (f) Không có Zalo/email ở nguồn (`UPDATE … SET zalo_number = NULL, email = NULL` trước khi áp) → không sinh liên hệ đó. Không có dòng `'default'` → không sinh hồ sơ nào (`owners` rỗng; R-PTY-1 ở Task 4 sẽ báo).
- (g) `company_profile` **không đổi**: `goc` trước = sau khi áp. Văn bản tệp (bỏ chú thích `--`) không có `DROP`, `ALTER`, `UPDATE company_profile`, `DELETE`.
- (h) **Không số viết tay** (luật `0020:3`, `0024:4`):

```ts
test("0028: tệp không chứa SĐT/MST/email viết tay — mọi giá trị riêng của công ty CHÉP từ company_profile", () => {
  const code = sqlOf(FILE).replace(/--.*$/gm, "").replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "");
  assert.doesNotMatch(code, /\d[\d .()+-]{7,}\d/, "dãy số dài giống SĐT/MST");
  assert.doesNotMatch(code, /@/, "email viết tay");
});
```

- (i) **Không id cứng** (ADR-0024 điều 6).
  - Lấy `id` từ `owners(all())[0]`.
  - Duyệt đệ quy `src`, `web`, `scripts`, `tests`, `public` (bỏ `node_modules`, `public/js`, `public/sw.js`; chỉ đọc tệp `.ts .mjs .js .json .html .css`).
  - Không tệp nào chứa chuỗi id, **trừ** chính tệp test này (nó không chứa id viết tay; nó đọc id từ CSDL).
- (j) **Chỉ mục (6.5 ii):**
  - trên `all()`, chèn hồ sơ tổ chức thứ hai rồi chèn dòng vai `OWNER_COMPANY` mở cho nó → `assert.throws(…, /UNIQUE constraint failed: pty_party_role\.role_type_code/)`;
  - chèn dòng mở thứ hai cho **chính** hồ sơ công ty chủ (ngày khác) → throws `/party_role_overlap/`;
  - chèn một dòng **đã đóng** cho hồ sơ khác → **không** throw. Ghi rõ trong tên test là "giới hạn đã biết — Q1".
- [ ] **Bước 3: Chạy, thấy đỏ:** `node --test src/migrations-0028.test.ts`. Kỳ vọng FAIL ở ca (a): `FILE` undefined.
- [ ] **Bước 4: Viết migration** `migrations/0028_ho_so_cong_ty_chu.sql`:

```sql
-- Migration 0028 — ADR-0024 điều 6 (accepted phần điều 6, chủ dự án duyệt 2026-09-28; bổ sung 6.1–6.6): Tour Đảo là MỘT hồ sơ tổ chức, đánh dấu
-- bằng mã vai OWNER_COMPANY ("Công ty chủ", nhóm OTHER — không sinh quyền). CHỈ THÊM. company_profile KHÔNG bị sửa/xoá (6.3: cột pháp lý thôi
-- được đọc; thu hồi theo expand–contract ở lần phát hành sau). Giá trị riêng của công ty CHÉP bằng INSERT … SELECT: tệp này không có SĐT/MST/email
-- viết tay (luật ở đầu 0020 và 0024; src/migrations-0028.test.ts quét). id cố định giữa mọi môi trường (tiền lệ 0010), nhưng MÃ không dùng id:
-- tra bằng mã vai qua hàm công bố ownerCompany của module parties.

INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('OWNER_COMPANY', 'Công ty chủ', 30, 'OTHER');

-- 6.5 (ii): tối đa MỘT dòng đang mở của vai này trên TOÀN bảng (mọi hồ sơ, mọi nơi). SQLite báo vi phạm là
-- "UNIQUE constraint failed: pty_party_role.role_type_code" — module parties ánh xạ thành 409 owner_company_exists.
CREATE UNIQUE INDEX pty_party_role_owner_company_uq ON pty_party_role(role_type_code)
  WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL;

INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at)
SELECT '<ID_HO_SO>', 'ORGANIZATION', 'Công ty TNHH Tour Đảo', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM company_profile WHERE id = 'default';

INSERT INTO pty_organization (party_id, legal_name, tax_code, address, invoice_email, created_at, updated_at)
SELECT '<ID_HO_SO>', company_name, tax_code, address, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM company_profile WHERE id = 'default';

-- 6.1: Hotline (PHONE, chính) và Zalo (PHONE, phụ) phân biệt bằng nhãn; email là EMAIL. value_normalized theo đúng quy tắc normalizePhone
-- (src/shared/phone.ts): bỏ khoảng trắng . - ( ), đổi +84… / 84 (11 chữ số) về 0… — bài kiểm so từng dạng viết.
INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
SELECT '<ID_HOTLINE>', '<ID_HO_SO>', 'PHONE', v,
       CASE WHEN x LIKE '+84%' THEN '0' || substr(x, 4) WHEN x LIKE '84%' AND length(x) = 11 THEN '0' || substr(x, 3) ELSE x END,
       'Hotline', 1, date('now', '+7 hours'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (SELECT hotline AS v, replace(replace(replace(replace(replace(replace(replace(hotline, ' ', ''), char(9), ''), char(10), ''), '.', ''), '-', ''), '(', ''), ')', '') AS x
      FROM company_profile WHERE id = 'default' AND hotline IS NOT NULL AND trim(hotline) <> '');

INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
SELECT '<ID_ZALO>', '<ID_HO_SO>', 'PHONE', v,
       CASE WHEN x LIKE '+84%' THEN '0' || substr(x, 4) WHEN x LIKE '84%' AND length(x) = 11 THEN '0' || substr(x, 3) ELSE x END,
       'Zalo', 0, date('now', '+7 hours'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (SELECT zalo_number AS v, replace(replace(replace(replace(replace(replace(replace(zalo_number, ' ', ''), char(9), ''), char(10), ''), '.', ''), '-', ''), '(', ''), ')', '') AS x
      FROM company_profile WHERE id = 'default' AND zalo_number IS NOT NULL AND trim(zalo_number) <> '');

INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
SELECT '<ID_EMAIL>', '<ID_HO_SO>', 'EMAIL', email, lower(email), NULL, 1, date('now', '+7 hours'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM company_profile WHERE id = 'default' AND email IS NOT NULL AND trim(email) <> '';

-- Dòng vai "Công ty chủ": không gắn nơi; ngày dân sự theo giờ Việt Nam (như 0012 dùng '+7 hours').
INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
SELECT '<ID_VAI>', '<ID_HO_SO>', 'OWNER_COMPANY', NULL, date('now', '+7 hours'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM company_profile WHERE id = 'default';
```

(Chữ `date('now', '+7 hours')` trong migration theo tiền lệ `0012` (`date(s.created_at, '+7 hours')`), vì migration không gọi được `vnToday`. Đây không phải `date('now')` trần mà `CLAUDE.md` §7 cấm.)

- [ ] **Bước 5: Chạy, thấy xanh:** `node --test src/migrations-0028.test.ts` → PASS mọi ca. Rồi `npm test`, kỳ vọng xanh:
  - `src/roles-schema.test.ts` không đỏ vì nhóm `OTHER`;
  - `src/audit-invariants.test.ts` ca "dữ liệu khoẻ" chưa có kiểm mới nên vẫn xanh.
- [ ] **Bước 6: Sửa e2e** `tests/e2e/parties.mjs:16-19`: thêm `"OWNER_COMPANY"` vào danh sách đã sắp. Thêm một dòng khẳng định:

```js
assert.deepEqual(r.body.roleTypes.find((t) => t.code === "OWNER_COMPANY"), { code: "OWNER_COMPANY", name: "Công ty chủ", group: "OTHER", active: true });
```

- [ ] **Bước 7: Áp local, e2e phần hồ sơ:** `npm run db:migrate:local`, rồi `npm run test:e2e -- parties` → xanh (trước bước 6 thì dòng 16 đỏ; ghi dòng đỏ đó vào nhật ký).
- [ ] **Bước 8: P16 cho chỉ mục.**
  - Tạm xoá câu `CREATE UNIQUE INDEX …` khỏi tệp 0028, rồi chạy `node --test src/migrations-0028.test.ts` → phải đỏ ở ca (j). Chép nguyên văn dòng đỏ.
  - Hoàn nguyên (`git checkout -- migrations/0028_ho_so_cong_ty_chu.sql` nếu đã commit, hoặc sửa lại), chạy lại → xanh.
  - Làm tương tự cho ca (h): tạm viết một số 10 chữ số giả vào một câu `SELECT` → đỏ → hoàn nguyên.
- [ ] **Bước 9: Commit.** Thông điệp: "Migration 0028: hồ sơ tổ chức Tour Đảo và mã vai Công ty chủ (ADR-0024 điều 6)". Thân: chép từ `company_profile` bằng `INSERT … SELECT` nên không có số viết tay; chỉ mục giữ tối đa một dòng mở; trigger để task sau vì phụ thuộc câu trả lời 6.5.

---

### Task 3: Trigger cấm đóng vai "Công ty chủ" — **PHỤ THUỘC câu trả lời của chủ (6.5)**

> Chủ chọn **A** (giữ như duyệt) → làm task này. Chủ chọn **B** (bỏ trigger) → **BỎ** task này, ghi vào nhật ký, và báo điều phối rằng cần **ADR mới** (văn bản đã duyệt có trigger); chưa có ADR mới thì không phát hành. Chưa có câu trả lời → làm các task khác trước; không commit task này.

**Tệp:** sửa `migrations/0028_ho_so_cong_ty_chu.sql` (tệp chưa áp remote nên sửa được) và `src/migrations-0028.test.ts`.

- [ ] **Bước 1: Viết test đỏ:**

```ts
test("0028 (6.5, phương án A): đóng dòng mở duy nhất bị chặn; đóng-rồi-mở và mở-rồi-đóng trong MỘT giao dịch đều bị chặn — vai không đóng/chuyển được", () => {
  const db = all();
  const [ho] = owners(db);
  const vai = (db.prepare("SELECT id FROM pty_party_role WHERE role_type_code = ? AND valid_to_date IS NULL").get(OWNER_COMPANY_ROLE) as { id: string }).id;
  assert.throws(() => db.prepare("UPDATE pty_party_role SET valid_to_date = date('now', '+8 hours') WHERE id = ?").run(vai), /owner_company_role_locked/);
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('11111111-2222-4333-8444-555555555555', 'ORGANIZATION', 'Pháp nhân thử', 'x', 'x')`);
  const moi = `INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at)
               VALUES ('66666666-7777-4888-8999-000000000000', '11111111-2222-4333-8444-555555555555', '${OWNER_COMPANY_ROLE}', date('now', '+31 days'), 'x', 'x')`;
  const dong = `UPDATE pty_party_role SET valid_to_date = date('now', '+30 days') WHERE id = '${vai}'`;
  for (const lo of [[dong, moi], [moi, dong]]) {
    db.exec("BEGIN");
    assert.throws(() => { for (const s of lo) db.exec(s); });
    db.exec("ROLLBACK");
  }
  assert.equal(owners(db).length, 1);
  assert.equal(owners(db)[0]!.id, ho!.id);
});
```

- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/migrations-0028.test.ts`. Kỳ vọng FAIL: "Missing expected exception", vì câu đóng thành công khi chưa có trigger.
- [ ] **Bước 3: Thêm trigger** vào **cuối** tệp 0028:

```sql
-- 6.5 (ii) vế 2 — theo phương án A của chủ dự án (giữ như duyệt). Cùng chỉ mục ở trên, KHÔNG thứ tự nào trong một lô vừa đóng dòng cũ vừa mở dòng
-- mới (đóng trước → trigger chặn; mở trước → chỉ mục chặn): vai này không bao giờ đóng hay chuyển được; đổi pháp nhân = quyết định mới của chủ.
-- Tên bắt đầu bằng pty_ (không staff_/stf_: src/migrations-n1.test.ts coi đó là trigger siết B5).
CREATE TRIGGER pty_party_role_owner_company_keep BEFORE UPDATE OF valid_to_date ON pty_party_role
WHEN OLD.role_type_code = 'OWNER_COMPANY' AND OLD.valid_to_date IS NULL AND NEW.valid_to_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pty_party_role o WHERE o.role_type_code = 'OWNER_COMPANY' AND o.valid_to_date IS NULL AND o.id <> OLD.id)
BEGIN SELECT RAISE(ABORT, 'owner_company_role_locked: vai công ty chủ không kết thúc được khi không có dòng mở thay thế'); END;
```

- [ ] **Bước 4: Chạy, thấy xanh:** `node --test src/migrations-0028.test.ts` → PASS. Rồi `npm test`.
- [ ] **Bước 5: P16:** tạm xoá khối `CREATE TRIGGER … END;` → test bước 1 đỏ (chép nguyên văn) → hoàn nguyên → xanh.
- [ ] **Bước 6: Commit.** Thông điệp: "Migration 0028: trigger cấm kết thúc vai Công ty chủ (ADR-0024 6.5, phương án A)". Thân ghi rõ hệ quả: vai không đóng hay chuyển được.
- [ ] **Bước 7 (CHỈ khi chủ chọn Q1-b, mục 10):**
  - Thêm vào 0028 các trigger chặn:
    - `UPDATE OF role_type_code, party_id` trên dòng mở của vai này;
    - `DELETE` dòng của vai này;
    - `INSERT` dòng **đã đóng** của vai này.
  - Mỗi trigger một ca test đỏ trước, rồi P16 riêng.
  - Nhớ: khi có trigger chặn `DELETE`, ca đỏ của `R-PTY-1` (Task 4) phải `DROP TRIGGER` trước khi xoá dòng.
  - Q1-b cần văn bản quyết định mới do chủ duyệt (sửa nội dung 6.5): **không** làm bước này chỉ dựa vào lời nói trong chat.

---

### Task 4: Bất biến `R-PTY-1` — đúng một hồ sơ đang mở vai "Công ty chủ"

**Tệp:** sửa `scripts/audit-checks.mjs` (mảng `CHECKS`) và `src/audit-invariants.test.ts`.

- [ ] **Bước 1: Viết test đỏ** (thêm vào cuối `src/audit-invariants.test.ts`; import `OWNER_COMPANY_ROLE` từ `./shared/cong-ty-chu.ts`):

```ts
test("R-PTY-1 (ADR-0024 điều 6): sau 0028 có đúng một hồ sơ công ty chủ → 0; mất dòng mở → 1; hai dòng mở (chỉ mục bị gỡ) → 1; mã vai trong SQL = hằng của mã", () => {
  const c = one("R-PTY-1");
  assert.equal(c.level, "fail");
  assert.match(c.sql, new RegExp(`'${OWNER_COMPANY_ROLE}'`), "một nguồn mã vai: câu kiểm dùng đúng mã của src/shared/cong-ty-chu.ts");
  let db = build();
  assert.equal(violations(db, c), 0);
  db.exec(`DELETE FROM pty_party_role WHERE role_type_code = '${OWNER_COMPANY_ROLE}'`);
  assert.equal(violations(db, c), 1, "không còn hồ sơ công ty chủ");
  db = build();
  db.exec("DROP INDEX pty_party_role_owner_company_uq");
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at)
           VALUES ('ptr-thu-hai', 'pty-xa', '${OWNER_COMPANY_ROLE}', '2026-09-28', '${T1}', '${T1}')`);
  assert.equal(violations(db, c), 1, "hai hồ sơ cùng mở vai");
});
```

(`build()` ở `src/audit-invariants.test.ts:45-63` áp mọi migration > 0011, nên có 0028 và `pty-xa` là hồ sơ không tài khoản. Nếu Task 3 bước 7 (Q1-b) đã thêm trigger chặn `DELETE` thì thêm `DROP TRIGGER <tên>` trước câu `DELETE`.)

- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/audit-invariants.test.ts`. Kỳ vọng FAIL: "phải có đúng một kiểm R-PTY-1".
- [ ] **Bước 3: Thêm kiểm** vào `CHECKS` ở `scripts/audit-checks.mjs`, sau khối R-LC:

```js
  // ---- Hồ sơ công ty chủ (ADR-0024 điều 6). Chỉ mục 0028 chặn dòng mở thứ hai, trigger 0028 chặn đóng; kiểm này là LƯỚI THỨ HAI cho SQL chạy tay:
  // bắt "mất dòng" (xoá / đổi mã vai) và "chỉ mục bị gỡ". KHÔNG bắt được "chuyển dòng sang hồ sơ khác" (vẫn đúng một) — xem câu hỏi Q1 của kế hoạch T2b.
  // D1 chưa áp 0028 → báo vi phạm (0 dòng), đúng: chưa có hồ sơ công ty chủ. `npm run trien-khai` chạy kiểm này SAU khi áp migration.
  {
    code: "R-PTY-1",
    what: "đúng một hồ sơ đang mở vai công ty chủ (OWNER_COMPANY)",
    sql: "SELECT CASE WHEN count(*) = 1 THEN 0 ELSE 1 END FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL",
    level: "fail",
  },
```

(Trang ghép của lượt 1 Hoàn tất đơn, `docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md:67`, gọi cùng bất biến này là `R-BIL-7`. Lượt đó phải **dùng lại** `R-PTY-1`, không thêm kiểm trùng. Ghi vào nhật ký mục Nợ.)

- [ ] **Bước 4: Chạy, thấy xanh:** `node --test src/audit-invariants.test.ts` → PASS, kể cả ca "dữ liệu khoẻ: MỌI kiểm … 0 vi phạm" (dòng 108–113). Rồi `npm test`.
- [ ] **Bước 5: P16:**
  - (a) Đổi `count(*) = 1` thành `count(*) >= 1` → ca "hai dòng mở" đỏ → hoàn nguyên.
  - (b) Đổi mã trong câu thành `'OWNER_COMPANX'` → ca "dữ liệu khoẻ" đỏ (vi phạm 1) → hoàn nguyên.
  - Chép nguyên văn cả hai dòng đỏ.
- [ ] **Bước 6: Commit.** Thông điệp: "Kiểm bất biến R-PTY-1: đúng một hồ sơ công ty chủ (ADR-0024 điều 6)".

---

### Task 5: Hàm công bố `ownerCompany`; `GET /api/company` đọc hồ sơ; module `company` thôi đọc cột pháp lý

**Tệp:**
- Sửa `src/modules/parties/repository.ts`, `src/modules/parties/index.ts`, `src/modules/company/index.ts`, `src/modules/company/repository.ts`, `src/architecture.test.ts:24`, `tests/e2e/company.mjs`.
- Tạo `src/modules/company/rules.ts` + `rules.test.ts`, `src/modules/company/cong-khai.test.ts`, `src/modules/company/khong-doc-cot-phap-ly.test.ts`.

**Giao diện tạo ra:**
- `export async function ownerCompany(db: D1Database): Promise<OwnerCompany | null>`.
- `export interface OwnerCompany { partyId: string; displayName: string; legalName: string | null; taxCode: string | null; address: string | null; hotline: string | null; email: string | null }`.
- Cả hai xuất từ `src/modules/parties/index.ts`.
- `toCompanyDto(c): CompanyDto | null` ở `company/rules.ts`.

- [ ] **Bước 1: Viết test đỏ (luật thuần)** `src/modules/company/rules.test.ts`:
  - `toCompanyDto(null)` → `null`;
  - thiếu một trong `legalName`/`taxCode`/`address`/`hotline` (null hoặc chuỗi rỗng) → `null`;
  - đủ → `{ name: legalName, taxCode, address, hotline, email }` với `email` `null` khi trống;
  - **không** có khoá `zalo`/`partyId`/`displayName` trong kết quả (`Object.keys` đúng năm khoá của `CompanyDto`).
- [ ] **Bước 2: Viết test đỏ (cả ứng dụng)** `src/modules/company/cong-khai.test.ts`, khung `world()` của `tests/audit/harness.mjs` như `src/modules/parties/ho-so-co-tai-khoan.test.ts:6`:
  - `GET /api/company` → 200.
  - `json.company` **deepEqual** giá trị đọc bằng `w.q("SELECT company_name, tax_code, address, hotline, email FROM company_profile WHERE id = 'default'")`, ánh xạ sang năm khoá. **Không gõ số.**
  - Lấy id: `w.q("SELECT party_id FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL")[0].party_id` (tệp test không bị R-N1-12 quét).
  - `UPDATE company_profile SET company_name = 'KHÔNG ĐƯỢC ĐỌC'` → `name` **không** đổi (6.3).
  - `UPDATE pty_organization SET legal_name = 'CÔNG TY THỬ' WHERE party_id = ?` → `name` = "CÔNG TY THỬ".
  - Đóng liên hệ EMAIL (`UPDATE pty_contact_point SET valid_to_date = '2026-09-28' WHERE party_id = ? AND contact_kind_code = 'EMAIL'`) → `email` `null`.
  - Đóng liên hệ nhãn Hotline → 404, `error.code` `not_found`, thông báo có chữ "công ty".
- [ ] **Bước 3: Viết test đỏ (hàng rào 6.3)** `src/modules/company/khong-doc-cot-phap-ly.test.ts`:

```ts
// ADR-0024 6.3: cột pháp lý của company_profile THÔI được đọc. Siết (Điều 9.4 cho phép siết): (1) module company không đăng ký câu SQL nào nhắc các cột đó;
// (2) ngoài module company và tệp test, không tệp mã nào nhắc tên bảng company_profile (một nguồn định danh = hồ sơ công ty chủ, H5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import "./repository.ts";
import { registeredSql } from "../../shared/sql-registry.ts";

const COT_PHAP_LY = /\b(company_name|tax_code|address|hotline|zalo_number|email)\b/i;
test("6.3: module company không còn câu SQL nào đọc cột pháp lý của company_profile", () => {
  const mine = registeredSql().filter((e) => e.module === "company");
  assert.ok(mine.length >= 1, "module nghiêm vẫn phải có ít nhất một câu đăng ký (architecture.test.ts)");
  assert.deepEqual(mine.filter((e) => COT_PHAP_LY.test(e.sql)).map((e) => e.name), []);
});
test("6.3: ngoài src/modules/company/ (và *.test.ts), không tệp .ts nào trong src/, web/ nhắc company_profile", () => {
  /* duyệt đệ quy CHỈ tệp .ts, bỏ *.test.ts và *.d.ts — như walk() của src/architecture.test.ts. Không quét tệp .txt:
     src/release-lib.fixtures/migrations-list-con-cho.txt có tên tệp migration 0002_company_profile.sql, là dữ liệu mẫu hợp lệ. */
});
```

- [ ] **Bước 4: Chạy, thấy đỏ:** `node --test src/modules/company/rules.test.ts src/modules/company/cong-khai.test.ts src/modules/company/khong-doc-cot-phap-ly.test.ts`. Kỳ vọng:
  - `rules.ts` chưa có;
  - `cong-khai` đỏ ở ca "KHÔNG ĐƯỢC ĐỌC" (route còn đọc `company_profile`);
  - hàng rào 6.3 đỏ vì câu `find` đọc `company_name…`, và vì `src/shared/app-info.ts:4` nhắc `company_profile`.
- [ ] **Bước 5: Mã `parties`.** Trong `src/modules/parties/repository.ts`, thêm (cạnh các câu đọc):

```ts
// ADR-0024 điều 6 / 6.2: hồ sơ "công ty chủ" = hồ sơ đang mở vai ?1. LIMIT 2 để nơi gọi phân biệt "đúng một" với "không có / hơn một"
// (chỉ mục 0028 chặn hơn một). Hotline = liên hệ PHONE đang mở có nhãn "Hotline" (6.1; không phân biệt hoa thường), ưu tiên liên hệ chính rồi mới
// nhất; email = liên hệ EMAIL đang mở, ưu tiên liên hệ chính. KHÔNG trả Zalo (chưa nơi nào đọc; CompanyDto cố ý không có).
const OWNER_COMPANY = defineSql(
  "parties",
  "owner_company",
  `SELECT p.id, p.display_name, o.legal_name, o.tax_code, o.address,
     (SELECT c.value FROM pty_contact_point c WHERE c.party_id = p.id AND c.contact_kind_code = 'PHONE' AND c.valid_to_date IS NULL AND lower(trim(c.label)) = 'hotline'
       ORDER BY c.is_primary DESC, c.valid_from_date DESC, c.created_at DESC, c.id LIMIT 1) AS hotline,
     (SELECT c.value FROM pty_contact_point c WHERE c.party_id = p.id AND c.contact_kind_code = 'EMAIL' AND c.valid_to_date IS NULL
       ORDER BY c.is_primary DESC, c.valid_from_date DESC, c.created_at DESC, c.id LIMIT 1) AS email
   FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id LEFT JOIN pty_organization o ON o.party_id = p.id
   WHERE r.role_type_code = ?1 AND r.valid_to_date IS NULL LIMIT 2`,
);
export interface OwnerCompanyRow { id: string; display_name: string; legal_name: string | null; tax_code: string | null; address: string | null; hotline: string | null; email: string | null }
export async function ownerCompanyRows(db: D1Database, roleCode: string): Promise<OwnerCompanyRow[]> {
  return (await db.prepare(OWNER_COMPANY).bind(roleCode).all<OwnerCompanyRow>()).results;
}
```

Trong `src/modules/parties/index.ts`:
- import `OWNER_COMPANY_ROLE` từ `"../../shared/cong-ty-chu"` và `ownerCompanyRows` từ `"./repository"`;
- thêm hàm dưới đây ngay sau `partySummary` (dòng 49–52);
- **không** thêm tên nào khác vào khối `export {…}` ở dòng 25.

```ts
/** Định danh Tour Đảo cho nơi đọc ngoài module (ADR-0024 điều 6 + 6.2). Trường có thể null: dữ liệu hồ sơ tổ chức cho phép trống. */
export interface OwnerCompany { partyId: string; displayName: string; legalName: string | null; taxCode: string | null; address: string | null; hotline: string | null; email: string | null }
/**
 * HÀM CÔNG BỐ DUY NHẤT về định danh Tour Đảo (ADR-0024 điều 6, 6.2; Hiến chương 2.1): hồ sơ đang mở vai OWNER_COMPANY_ROLE ("Công ty chủ").
 * Mọi nơi đọc tên / MST / địa chỉ / hotline / email của công ty đi qua đây (GET /api/company, GET /api/auth/config). Không viết cứng id.
 * null khi không có ĐÚNG một hồ sơ như vậy. Nơi gọi tự quyết khi thiếu trường (GET /api/company: 404).
 */
export async function ownerCompany(db: D1Database): Promise<OwnerCompany | null> {
  const rows = await ownerCompanyRows(db, OWNER_COMPANY_ROLE);
  if (rows.length !== 1) return null;
  const r = rows[0]!;
  return { partyId: r.id, displayName: r.display_name, legalName: r.legal_name, taxCode: r.tax_code, address: r.address, hotline: r.hotline, email: r.email };
}
```

- [ ] **Bước 6: Mã `company`.**
  - `src/modules/company/rules.ts` (thuần, import kiểu bằng đuôi `.ts`):

```ts
// Luật thuần của module company: dựng danh sách trắng năm trường công khai (CompanyDto) từ định danh hồ sơ công ty chủ (ADR-0024 6.2).
import type { CompanyDto } from "../../shared/contracts.ts";
type Nguon = { legalName: string | null; taxCode: string | null; address: string | null; hotline: string | null; email: string | null };
const co = (v: string | null): v is string => typeof v === "string" && v.trim().length > 0;
/** Thiếu tên pháp lý / MST / địa chỉ / hotline → null (route trả 404 như khi chưa có thông tin công ty). Email trống → null. */
export function toCompanyDto(c: Nguon | null): CompanyDto | null {
  if (!c || !co(c.legalName) || !co(c.taxCode) || !co(c.address) || !co(c.hotline)) return null;
  return { name: c.legalName, taxCode: c.taxCode, address: c.address, hotline: c.hotline, email: co(c.email) ? c.email : null };
}
```

  - `src/modules/company/index.ts`: sửa chú thích đầu tệp ở dòng 1–3. Bỏ câu "Đáy đồ thị … không import module nào"; ghi: đọc định danh qua `ownerCompany` của `parties` (ADR-0024 6.2); `company_profile` chỉ còn `logo_url` (6.3). Route mới:

```ts
route("GET", "/api/company", "public", async ({ env }) => {
  const dto = toCompanyDto(await ownerCompany(env.DB));
  if (!dto) return error(404, "not_found", "Chưa có thông tin công ty.");
  return json({ company: dto } satisfies CompanyResponse);
}),
```

  - `src/modules/company/repository.ts` (**Ruling R1**, mục 1.2) thay toàn bộ bằng:

```ts
// SQL của bảng module company sở hữu (company_profile). ADR-0024 6.3: các cột pháp lý THÔI được đọc — nguồn định danh là hồ sơ công ty chủ
// (module parties). Module nghiêm cần ít nhất một câu đăng ký (src/architecture.test.ts); câu dưới đọc cột CÒN thuộc module (logo_url, thương hiệu)
// và CHƯA nơi nào gọi — chỗ giữ tới lượt thu hồi company_profile (expand–contract). Không thêm cột pháp lý vào đây (khong-doc-cot-phap-ly.test.ts).
import { defineSql } from "../../shared/sql-registry.ts";

const FIND_LOGO = defineSql("company", "find_logo", "SELECT logo_url FROM company_profile WHERE id = 'default'");
export async function findLogoUrl(db: D1Database): Promise<string | null> {
  return (await db.prepare(FIND_LOGO).first<{ logo_url: string | null }>())?.logo_url ?? null;
}
```

  - `src/architecture.test.ts:24` sửa thành: `company: ["parties"], // ADR-0024 điều 6 (6.2): GET /api/company đọc định danh Tour Đảo qua hàm công bố ownerCompany của parties; company_profile chỉ còn logo_url (6.3)`.
  - `src/shared/app-info.ts:4`: sửa chú thích. Thông tin pháp lý của công ty nằm ở **hồ sơ công ty chủ** (module `parties`, hàm `ownerCompany`), đọc qua `GET /api/company`.
- [ ] **Bước 7: Chạy, thấy xanh:** chạy lại ba tệp ở bước 4, cùng `node --test src/architecture.test.ts` (cạnh mới, không vòng, SQL nghiêm, R-N1-12). Rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 8: E2E `tests/e2e/company.mjs`** (viết lại dòng 15–63). **Không** gõ số nào.
  - Đọc `ho` = hồ sơ công ty chủ bằng `sqlRows` (khuôn SQL như bước 2), và `goc` = dòng `company_profile`.
  - Khẳng định công khai: 200, `no-store`, đúng năm khoá, `body.company` = ánh xạ của `goc`.
  - Đổi `pty_organization.legal_name` → đổi theo.
  - Đổi `company_profile.company_name` → không đổi.
  - Đóng email → `null`.
  - Đóng Hotline → 404.
  - `finally` khôi phục **mọi** thứ đã đổi: tên, `valid_to_date = NULL` cho liên hệ đã đóng, `company_profile`.
  - Giữ khối 405 cho `POST/PUT/PATCH/DELETE`.
  - Chạy `npm run test:e2e -- company`.
- [ ] **Bước 9: P16:**
  - (a) Đổi `FIND_LOGO` thành `SELECT logo_url, company_name …` → hàng rào 6.3 đỏ → hoàn nguyên.
  - (b) Cho route đọc lại `company_profile` (tạm khôi phục `findCompany` cũ và gọi nó) → `cong-khai.test.ts` đỏ ở ca "KHÔNG ĐƯỢC ĐỌC" → hoàn nguyên.
  - Chép nguyên văn.
- [ ] **Bước 10: Commit.** Thông điệp: "GET /api/company đọc hồ sơ công ty chủ qua hàm công bố ownerCompany (ADR-0024 6.2, 6.3)". Thân: cạnh company → parties; module company giữ một câu `logo_url` chờ lượt thu hồi.

---

### Task 6: `GET /api/auth/config` trả tên và MST (cạnh `auth → parties`)

**Tệp:**
- Sửa `src/shared/contracts.ts:61-68`, `src/modules/auth/index.ts:103-105` (+ import), `src/architecture.test.ts:21`, `tests/e2e/turnstile.mjs:35`.
- Tạo `src/modules/auth/cau-hinh-cong-ty.test.ts`.

- [ ] **Bước 1: Viết test đỏ** `src/modules/auth/cau-hinh-cong-ty.test.ts` (khung harness):
  - (a) Ca bình thường:
    - `GET /api/auth/config` → 200;
    - `companyName` = `display_name` và `companyTaxCode` = `tax_code` của hồ sơ công ty chủ, đọc bằng `w.q(...)`;
    - vẫn có `turnstileSiteKey`, `maintenance`, `passkey`, `version`.
  - (b) Ca lỗi đọc hồ sơ:
    - `w.sqlite.exec("ALTER TABLE pty_organization RENAME TO pty_organization_tam")` rồi gọi lại → **vẫn 200**;
    - `companyName === null`, `companyTaxCode === null`;
    - bốn trường cũ còn đủ.
- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/modules/auth/cau-hinh-cong-ty.test.ts`. Kỳ vọng FAIL: `companyName` undefined.
- [ ] **Bước 3: Mã.**
  - `src/shared/contracts.ts`, trong `AuthConfigResponse`:

```ts
  /** Tên hiển thị của hồ sơ công ty chủ (ADR-0024 6.2) — chân trang đăng nhập. null = chưa có / đọc lỗi → trang giữ chữ tĩnh. */
  companyName: string | null;
  /** Mã số thuế của hồ sơ công ty chủ (6.2). null như trên. */
  companyTaxCode: string | null;
```

  - `src/modules/auth/index.ts`: thêm `import { ownerCompany } from "../parties";`. Route cấu hình:

```ts
route("GET", "/api/auth/config", "public", async ({ env }) => {
  // ADR-0024 6.2: tên + MST của hồ sơ công ty chủ cho chân trang đăng nhập. Đọc lỗi KHÔNG được làm hỏng cấu hình đăng nhập (Turnstile, bảo trì, Face ID):
  // ghi một dòng log rồi trả null — trang giữ chữ tĩnh.
  const [maintenance, company] = await Promise.all([
    getMaintenanceState(env.DB),
    ownerCompany(env.DB).catch((e: unknown) => {
      console.error(JSON.stringify({ level: "error", event: "company_config_failed", message: e instanceof Error ? e.message : String(e) }));
      return null;
    }),
  ]);
  return json({
    turnstileSiteKey: turnstileSiteKey(env), maintenance: toStatus(maintenance), passkey: passkeyRelyingParty(env) !== null, version: APP_VERSION,
    companyName: company?.displayName ?? null, companyTaxCode: company?.taxCode ?? null,
  } satisfies AuthConfigResponse);
}),
```

  - `src/architecture.test.ts:21` sửa thành: `auth: ["staff", "maintenance", "parties"], // … ; parties: ADR-0024 6.2 — GET /api/auth/config trả tên + MST công ty chủ (chỉ đọc; auth vốn đã tới parties bắc cầu qua staff)`.
- [ ] **Bước 4: Chạy, thấy xanh:** tệp bước 1, cùng `node --test src/architecture.test.ts` → xanh. Rồi `npm test`, `npm run typecheck` (cả ba tsconfig: `web/login.ts` dùng kiểu này).
- [ ] **Bước 5: E2E** `tests/e2e/turnstile.mjs:35` (dòng 36 sau khi gộp nhánh ADR-0038; đây là chỗ DUY NHẤT khoá nguyên tập trường của cấu hình — Task 0 bước 9).
  - Đọc `ho` (tên hiển thị, MST) bằng `sqlRows` (import từ `./lib.mjs`).
  - Thêm `companyName: ho.display_name, companyTaxCode: ho.tax_code` vào đối tượng `deepEqual`.
  - Chạy `npm run test:e2e -- turnstile company`. Chạy trước khi sửa dòng 35 thì đỏ; ghi dòng đỏ vào nhật ký.
- [ ] **Bước 6: P16:** bỏ `.catch(…)` → ca (b) thành 500 → đỏ → hoàn nguyên. Chép nguyên văn.
- [ ] **Bước 7: Commit.** Thông điệp: "Cấu hình đăng nhập trả tên và mã số thuế công ty từ hồ sơ công ty chủ (ADR-0024 6.2)". Thân: cạnh auth → parties; lỗi đọc hồ sơ không làm hỏng đăng nhập.

---

### Task 7: Ô `company.legal.write`; chặn sửa định danh và liên hệ của hồ sơ công ty chủ; `editable`

**Tệp:**
- Sửa `src/shared/permissions.ts` (sau dòng 74), `src/shared/permissions.test.ts` (bảng `ADR` dòng 9–36, `ADMIN_NONE_OPS` dòng 179), `src/modules/parties/repository.ts`, `src/modules/parties/index.ts` (dòng 148–153, 228–243, 246–267, 269–286).
- Tạo `src/modules/parties/cong-ty-chu.test.ts`.

> Task 0 bước 2 thấy ô **đã có** → bỏ bước 1–3 phần "ô" (không khai lặp), giữ phần route.

- [ ] **Bước 1: Viết test đỏ (bảng quyền).**
  - `src/shared/permissions.test.ts`, bảng `ADR`, thêm: `"company.legal.write": ["none", "none", "none", "none", "none", "any", "none"], // ADR-0038 điều 7 + ADR-0024 6.4: chỉ Toàn quyền sửa hồ sơ công ty chủ`.
  - Thêm `"company.legal.write"` vào `ADMIN_NONE_OPS` (dòng 179 trên `5dc4732`).
  - **Đếm lại** số thao tác trong chú thích ngay trên nó, theo `main` lúc thi công, rồi sửa số và thêm lý do "chỉ Toàn quyền sửa hồ sơ công ty chủ (ADR-0038 điều 7)".
  - Nhánh ADR-0038 thêm ba ô chỉ Toàn quyền (`account.access.manage`, `staff.sheet.sync`, `audit.view`), nên con số trên `main` sẽ không còn là "Năm" như ở `5dc4732`.
- [ ] **Bước 2: Viết test đỏ (cả ứng dụng)** `src/modules/parties/cong-ty-chu.test.ts`.
  - Khung `world()`/`seedStaff()` như `src/modules/parties/ho-so-co-tai-khoan.test.ts:17-27`: SALES, ACCOUNTING, ADMIN, SUPER_ADMIN.
  - `CT` = id hồ sơ công ty chủ đọc bằng `w.q` theo mã vai.
  - `logCount(CT)` như dòng 30 của tệp mẫu.
  - Các ca (mỗi ca khẳng định **đúng mã**):
    - SALES, ACCOUNTING × `PUT /api/parties/CT` (đổi tên), `POST /api/parties/CT/contacts`, `POST /api/parties/CT/contacts/<id Hotline>/end` → **403**. Dữ liệu và `logCount` không đổi.
    - ADMIN × ba route trên → **403**, không đổi gì.
    - SUPER_ADMIN × `PUT` (gửi **đúng** giá trị đang có + `expectedUpdatedAt`) → **200**, có một dòng nhật ký `party_updated`; `POST …/contacts` → **201**.
    - Đối chứng không chặn quá tay: SALES tạo một hồ sơ tổ chức thường rồi `PUT` nó → **200**.
    - `GET /api/parties/CT`: `editable` = `false` với SALES và ADMIN, `true` với SUPER_ADMIN.
- [ ] **Bước 3: Chạy, thấy đỏ:** `node --test src/shared/permissions.test.ts src/modules/parties/cong-ty-chu.test.ts`. Kỳ vọng:
  - permissions đỏ "MATRIX và ADR phải có cùng danh sách thao tác";
  - harness đỏ vì SALES `PUT` = 200.
- [ ] **Bước 4: Mã.**
  - `src/shared/permissions.ts`, thêm dòng vào `MATRIX` (sau `notice.send`): `"company.legal.write": row("none", "none", "none", "none", "none", "any", "none"), // sửa định danh (tên, MST, địa chỉ), điểm liên hệ, vai của hồ sơ công ty chủ — chỉ Toàn quyền (ADR-0038 điều 7, ADR-0024 6.4)`.
  - `src/modules/parties/repository.ts`:

```ts
// ADR-0024 6.4: hồ sơ ?1 có đang mở vai ?2 (OWNER_COMPANY_ROLE) không — câu tra dữ liệu dùng NỘI BỘ module (route ghi, respondParty). KHÔNG xuất qua index.ts.
const IS_OWNER_COMPANY = defineSql("parties", "is_owner_company", "SELECT 1 AS x FROM pty_party_role WHERE party_id = ?1 AND role_type_code = ?2 AND valid_to_date IS NULL LIMIT 1");
export async function isOwnerCompanyParty(db: D1Database, partyId: string, roleCode: string): Promise<boolean> {
  return (await db.prepare(IS_OWNER_COMPANY).bind(partyId, roleCode).first()) !== null;
}
```

  - `src/modules/parties/index.ts`:
    - thêm hằng `const OWNER_COMPANY_FORBIDDEN = () => error(403, "forbidden", "Chỉ Toàn quyền được sửa hồ sơ công ty chủ (tên, mã số thuế, địa chỉ, liên hệ, công việc).");`.
    - Hàm `laCongTyChu = (db: D1Database, id: string) => isOwnerCompanyParty(db, id, OWNER_COMPANY_ROLE)` (không `export`).
    - Ba route `PUT`, `…/contacts`, `…/contacts/:cid/end`: thay dòng kiểm quyền (dòng 233–234, 251–252, 274–275) bằng khuôn dưới. Lời gọi `can()` viết **thẳng** trong thân, dẫn tới `return`:

```ts
const [acc, chu] = await Promise.all([ctx.partyAccount(id), laCongTyChu(env.DB, id)]);
// ADR-0024 6.4 + ADR-0038 điều 7: hồ sơ công ty chủ — chỉ ô company.legal.write; party.write và party.staff.write từ chối hồ sơ này.
if (chu ? !can(staff, "company.legal.write") : acc.linked ? !(can(staff, "party.staff.write") && acc.manageable) : !can(staff, "party.write")) {
  return chu ? OWNER_COMPANY_FORBIDDEN() : FORBIDDEN_WRITE();
}
```

    - `respondParty` (dòng 148–153):

```ts
const [detail, acc, chu] = await Promise.all([getPartyDetail(ctx.env.DB, id), ctx.partyAccount(id), laCongTyChu(ctx.env.DB, id)]);
if (!detail) return NOT_FOUND();
const editable = chu ? can(ctx.staff, "company.legal.write") : acc.linked ? can(ctx.staff, "party.staff.write") && acc.manageable : can(ctx.staff, "party.write");
```

- [ ] **Bước 5: Chạy, thấy xanh:** `node --test src/shared/permissions.test.ts src/modules/parties/cong-ty-chu.test.ts src/modules/parties/ho-so-co-tai-khoan.test.ts src/permission-enforcement.test.ts src/route-write-guard.test.ts` → xanh (hàng rào 1 thấy ô được hỏi; hàng rào 2 thấy `can(` được dùng). Rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 6: P16:** lần lượt thay `!can(staff, "company.legal.write")` bằng `false` ở **từng** route (`PUT`, `contacts`, `contacts/end`) → ca SALES tương ứng đỏ (200/201 ≠ 403) → hoàn nguyên sau mỗi lần. Chép ba dòng đỏ.
- [ ] **Bước 7: Commit.** Thông điệp: "Chỉ Toàn quyền sửa hồ sơ công ty chủ: ô company.legal.write (ADR-0038 điều 7, ADR-0024 6.4)". Thân: ô do T2b thêm theo ADR-0038 điều 7; `party.write` từ chối hồ sơ này; `editable` tính cùng điều kiện với route ghi.

---

### Task 8: Lớp (i) ở hai route vai, ánh xạ lỗi CSDL, e2e quyền

**Tệp:** sửa `src/modules/parties/index.ts` (dòng 65–72, 291–314, 316–335), `src/modules/parties/repository.ts` (dòng 369–373, 397–399), `src/modules/parties/cong-ty-chu.test.ts`, `tests/e2e/company.mjs`.

- [ ] **Bước 1: Viết test đỏ** (thêm vào `cong-ty-chu.test.ts`). `VAI` = id dòng vai công ty chủ; `KHAC` = một hồ sơ tổ chức thường tạo trong test.
  - ADMIN `POST /api/parties/CT/roles` `{ roleTypeCode: "CUSTOMER" }` → **403**.
  - ADMIN `POST /api/parties/KHAC/roles` `{ roleTypeCode: "OWNER_COMPANY" }` → **403**. Hôm nay là 409 nhờ chỉ mục: đỏ đúng chỗ, vì phải là 403 ở route.
  - ADMIN `POST /api/parties/CT/roles/VAI/end` `{}` → **403**. Hôm nay có trigger thì là 500.
  - SUPER_ADMIN `POST /api/parties/KHAC/roles` `{ roleTypeCode: "OWNER_COMPANY" }` → **409**, `error.code` `owner_company_exists`. Thân không khớp `/SQLITE|constraint|UNIQUE/i`.
  - SUPER_ADMIN `POST /api/parties/CT/roles/VAI/end` `{}` → **409** `owner_company_locked` (A; bỏ ca này nếu Task 3 bị bỏ). Thân không khớp `/SQLITE|constraint|RAISE/i`.
  - Sau mọi ca: đúng một dòng mở của vai; `logCount(CT)` không đổi với mọi 403 và 409.
  - Đối chứng không chặn quá tay: ADMIN thêm `CUSTOMER` cho `KHAC` → **201**.
  - Ca giữ hành vi theo chữ 6.4, **phụ thuộc câu 2** (Task 9): ADMIN `POST /api/parties/CT/relationships` (một hồ sơ người làm "Người liên hệ của" CT) → **201**. Chú thích ca này: "giữ admin.manage theo chữ 6.4 + ADR-0038 điều 7; đổi thành 403 nếu chủ chọn khoá — Task 9".
- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/modules/parties/cong-ty-chu.test.ts`. Ghi đúng các mã thực nhận: 409, 500… ≠ 403 và 409 mong đợi.
- [ ] **Bước 3: Mã.**
  - `repository.ts`: đổi `ROLE_ROW_GROUP` thành `SELECT t.role_group, r.role_type_code FROM … WHERE r.id = ?1 AND r.party_id = ?2`. Đổi `roleRowGroup` thành `roleRowOf(db, partyId, roleId): Promise<{ group: string; code: string } | null>`.
  - `index.ts`, trong `constraintProblem` (thêm **trước** dòng `party_role_overlap`):

```ts
if (/owner_company_role_locked/.test(m)) return error(409, "owner_company_locked", "Công việc “Công ty chủ” không kết thúc được: hệ thống luôn cần đúng một hồ sơ công ty chủ. Đổi pháp nhân cần quyết định mới của chủ dự án.");
if (/UNIQUE constraint failed: pty_party_role\.role_type_code/.test(m)) return error(409, "owner_company_exists", "Đã có hồ sơ công ty chủ. Không gán công việc “Công ty chủ” cho hồ sơ thứ hai.");
```

  - Route thêm vai (dòng 291–314). Sau dòng kiểm `acc`, **trước** `readJson`:

```ts
// ADR-0024 6.4: mọi công việc trên hồ sơ công ty chủ — chỉ company.legal.write; hỏi TRƯỚC khi đọc thân (không để 400 lộ trước 403).
if ((await laCongTyChu(env.DB, id)) && !can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
```

    Và sau `ACCOUNT_ROLE()`:

```ts
// ADR-0024 6.5 (i): mã vai "Công ty chủ" trên BẤT KỲ hồ sơ nào — chỉ company.legal.write. Lớp (ii) (chỉ mục 0028) vẫn chặn dòng mở thứ hai, kể cả Toàn quyền.
if (parsed.value.roleTypeCode === OWNER_COMPANY_ROLE && !can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
```

  - Route kết thúc vai (dòng 316–335):

```ts
const row = await roleRowOf(env.DB, id, rid);
if (isAccountGroup(row?.group ?? null)) return ACCOUNT_ROLE();
// ADR-0024 6.4 + 6.5 (i). Toàn quyền đi qua; lớp (ii) (trigger 0028) quyết — ánh xạ ở constraintProblem.
if ((row?.code === OWNER_COMPANY_ROLE || (await laCongTyChu(env.DB, id))) && !can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
const now = new Date();
const to = validateEndDate(await readJson(request), vnToday(now));
if (!to.ok) return error(400, "invalid_input", to.message);
const at = now.toISOString();
let results: D1Result[];
try {
  results = await env.DB.batch([
    endRoleStatement(env.DB, id, rid, to.value, staff.id, at),
    auditStatement(env.DB, { staffId: staff.id, action: "party_role_ended", at, targetType: "party", targetId: id }, "changes() > 0"),
  ]);
} catch (e) {
  const problem = constraintProblem(e);
  if (problem) return problem;
  throw e;
}
if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
return respondParty(ctx, id);
```

- [ ] **Bước 4: Chạy, thấy xanh:** `node --test src/modules/parties/cong-ty-chu.test.ts src/modules/parties/ho-so-co-tai-khoan.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts` → xanh. Rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 5: E2E** `tests/e2e/company.mjs`, thêm khối "quyền trên hồ sơ công ty chủ" (API thật, D1 local):
  - Tài khoản: `session(ACCOUNTS.salesA)`, `session(ACCOUNTS.admin)`, `session(ACCOUNTS.superAdmin)` (`tests/e2e/lib.mjs:14-21`).
  - Các ca của bước 1 cho `PUT`, `contacts`, `roles`, `roles/:rid/end`.
  - Thêm: đếm dòng `audit_log` có `target_id` = id hồ sơ trước và sau → không đổi với 403 và 409.
  - Cuối khối: `sqlRows("SELECT count(*) AS n FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL")` = 1.
  - Chạy `npm run test:e2e -- company parties`.
- [ ] **Bước 6: P16:**
  - (a) Thay hai điều kiện `company.legal.write` ở route thêm vai bằng `false` → ca ADMIN `OWNER_COMPANY` đỏ (409 ≠ 403) và ca ADMIN `CUSTOMER` trên CT đỏ (201 ≠ 403) → hoàn nguyên.
  - (b) Làm như (a) ở route kết thúc → đỏ (409 ≠ 403) → hoàn nguyên.
  - (c) Xoá hai dòng ánh xạ mới trong `constraintProblem` → ca Toàn quyền đỏ (500 ≠ 409) → hoàn nguyên.
  - Chép nguyên văn cả ba.
- [ ] **Bước 7: Commit.** Thông điệp: "Chặn gán và kết thúc công việc Công ty chủ ở route, báo lỗi rõ khi cơ sở dữ liệu chặn (ADR-0024 6.5)". Thân: hai lớp; route kết thúc vai có `try/catch` để không lộ lỗi SQLite.

---

### Task 9: Khoá route quan hệ của hồ sơ công ty chủ — **PHỤ THUỘC câu 2 của điều phối**

> Điều phối đang hỏi chủ (câu 2): giữ Quản trị thêm/kết thúc "Người liên hệ của Tour Đảo" (khuyến nghị, đúng chữ 6.4 + ADR-0038 điều 7), hay khoá chỉ Toàn quyền (cần ADR mới).
> - Mặc định của kế hoạch này là **GIỮ `admin.manage`** (Task 8 có ca 201 ghi lại hành vi đó).
> - Chủ chọn **giữ** → không làm task này.
> - Chủ chọn **khoá** → chỉ làm khi đã có ADR mới được chủ duyệt, kèm trang ghép (`CLAUDE.md` §9).

**Tệp:** `src/modules/parties/index.ts` (dòng 339–365, 367–388), `src/modules/parties/cong-ty-chu.test.ts`, `tests/e2e/company.mjs`.

- [ ] **Bước 1: Test đỏ:** đổi ca "ADMIN thêm quan hệ với CT → 201" thành **403**. Thêm: ADMIN kết thúc quan hệ đó → 403; SUPER_ADMIN → 201/200.
- [ ] **Bước 2: Chạy, thấy đỏ** (201 ≠ 403).
- [ ] **Bước 3: Mã:**
  - Route thêm quan hệ: sau khi biết `id` và đầu kia `other`, nếu một trong hai là công ty chủ và `!can(staff, "company.legal.write")` → `OWNER_COMPANY_FORBIDDEN()`.
  - Route kết thúc: xét `id`, `ends.from`, `ends.to`.
  - Lời gọi `can()` viết thẳng trong thân.
- [ ] **Bước 4: Xanh** (`node --test` cùng bốn tệp như Task 8 bước 4; e2e `company`).
- [ ] **Bước 5: P16:** bỏ điều kiện → ca ADMIN đỏ → hoàn nguyên.
- [ ] **Bước 6: Commit** (thông điệp dẫn số ADR mới).

---

### Task 10: Giao diện Danh bạ (`web/parties.ts`)

**Tệp:**
- Sửa `web/parties.ts` (dòng 262–265, 305–307) và `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs` (quanh dòng 111–115).
- Tạo `docs/evidence/2026-09-28-t2b/kich-ban/t2b-danh-ba-smoke.mjs` + `docs/evidence/2026-09-28-t2b/README.md`.

Đây là việc **bề mặt, đảo ngược được** (giả định G5). Máy chủ đã chặn ở Task 7 và Task 8; giao diện chỉ ẩn/hiện.

- [ ] **Bước 1: Kịch bản Chrome đỏ trước** `t2b-danh-ba-smoke.mjs`:
  - Dựng trên `startEnv()` của `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`; tài khoản `ACCOUNTS` có sẵn trong đó.
  - **Mỗi tài khoản mở trang sau cùng, lần lượt** (bẫy kho cookie chung, `web/CLAUDE.md:29`).
  - Mở `/parties`, tìm "Tour Đảo", mở chi tiết hồ sơ công ty chủ.
  - Khẳng định:
    - (a) SALES: không có nút "Lưu thông tin", không có "Thêm liên hệ";
    - (b) ADMIN: không có khối "Thêm công việc"; có dòng chữ "Chỉ Toàn quyền thêm hoặc kết thúc công việc của hồ sơ công ty chủ."; dòng vai "Công ty chủ" không có nút "Kết thúc";
    - (c) SUPER_ADMIN: có "Lưu thông tin"; dòng "Công ty chủ" hiện "Cố định"; ô "Công việc" không có mục "Công ty chủ";
    - (d) axe không vi phạm critical/serious.
  - Chụp ảnh 390 và 1040.
  - Chạy `npm run build:web`, rồi chạy kịch bản → đỏ ở (b)/(c). Ghi vào nhật ký.
- [ ] **Bước 2: Mã `web/parties.ts`.**
  - `import { OWNER_COMPANY_ROLE } from "../src/shared/cong-ty-chu";`.
  - Trong `openDetail`: `const congTyChu = p.roles.some((r) => r.roleTypeCode === OWNER_COMPANY_ROLE && r.validTo === null);` và `const suaVai = admin && (!congTyChu || p.editable);`.
  - Dòng 262–264: ô hành động của dòng vai. Nếu `r2.roleTypeCode === OWNER_COMPANY_ROLE && !r2.validTo` thì hiện `h("span", { class: "muted" }, "Cố định")`. Ngược lại giữ logic cũ nhưng thay `admin` bằng `suaVai`.
  - Dòng 265: thêm `&& t.code !== OWNER_COMPANY_ROLE` vào bộ lọc.
  - Dòng 305–307: `suaVai ? <khối thêm> : h("p", { class: "muted" }, congTyChu ? "Chỉ Toàn quyền thêm hoặc kết thúc công việc của hồ sơ công ty chủ." : "Chỉ quản trị viên thêm hoặc kết thúc công việc.")`.
  - Quan hệ: **không đổi** (câu 2; Task 9 nếu khoá thì thêm điều kiện tương tự).
- [ ] **Bước 3: Thêm khẳng định vào `vai-smoke.mjs`** cạnh dòng 115: `assert.ok(!options.includes("Công ty chủ"), …)`.
- [ ] **Bước 4: Xanh:** `npm run typecheck`, `npm run build:web`, rồi chạy `t2b-danh-ba-smoke.mjs`, `vai-smoke.mjs`, `dot-a-smoke.mjs` (`web/CLAUDE.md:41`) → xanh. So với mốc Task 0.
- [ ] **Bước 5: P16:** bỏ `&& t.code !== OWNER_COMPANY_ROLE` → `vai-smoke.mjs` và `t2b-danh-ba-smoke.mjs` (c) đỏ → hoàn nguyên. Chép nguyên văn.
- [ ] **Bước 6: README** `docs/evidence/2026-09-28-t2b/README.md`: lệnh chạy, số dòng ✓, ảnh, giới hạn (không phải iPhone thật).
- [ ] **Bước 7: Commit.** Thông điệp: "Danh bạ: ẩn nút sửa và công việc Công ty chủ theo quyền (ADR-0024 6.4, 6.5)". Thân: giao diện chỉ ẩn/hiện, máy chủ đã chặn.

---

### Task 11: Trang đăng nhập — chân trang đọc cấu hình, chữ tĩnh dự phòng

**Tệp:**
- Sửa `public/login.html:42-46`, `web/login.ts` (import, `fetchConfig` dòng 332–348, chú thích dòng 386–387), `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` (`EXPECT` dòng 37–45, bước a dòng 211–226, bước e quanh dòng 325–350) và README bằng chứng cùng thư mục.
- Tạo `src/chan-trang-dang-nhap.test.ts`.

- [ ] **Bước 1: Viết test đỏ (bài so khớp)** `src/chan-trang-dang-nhap.test.ts`:
  - Đọc `public/login.html`. Tách bằng biểu thức chính quy chữ trong `#company-name`, `#company-tax`, `.login-address`.
  - Dựng CSDL từ mọi `migrations/*.sql` bằng `node:sqlite`. Đọc `display_name`, `tax_code`, `address` của hồ sơ công ty chủ (theo mã vai `OWNER_COMPANY_ROLE`).
  - Khẳng định:
    - `chuan(tĩnh tên) === chuan(display_name)`;
    - MST tĩnh (chỉ lấy chữ số và gạch) `===` `tax_code`;
    - `chuan(tĩnh địa chỉ) === chuan(address)`.
  - Hàm `chuan` (chỉ nằm trong tệp test):

```ts
/** Chuẩn hoá để so khớp (ADR-0024 6.2: "không so từng ký tự"): NFC, chữ thường tiếng Việt, bỏ dấu câu, gộp khoảng trắng. */
const chuan = (s: string) => s.normalize("NFC").toLocaleLowerCase("vi").replace(/[.,;:·]/g, " ").replace(/\s+/g, " ").trim();
```

- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/chan-trang-dang-nhap.test.ts`. Kỳ vọng FAIL: chưa có `#company-name`/`#company-tax` trong HTML.
- [ ] **Bước 3: HTML** `public/login.html:42-46`.
  - Sửa chú thích dòng 42 thành: chân trang theo bản thiết kế; tên + MST do `web/login.ts` thay từ `GET /api/auth/config` (ADR-0024 6.2); chữ tĩnh là dự phòng.
  - Dòng 44: `<span><span id="company-name" class="login-company-name">Công ty TNHH Tour Đảo</span> · MST <span id="company-tax">…giữ nguyên số đang có…</span></span>`.
  - Dòng 45: **theo câu Q2**, mặc định (a) = đúng phần đã duyệt: chỉ đổi "tỉnh" → "Tỉnh", phần còn lại giữ nguyên chữ của bản thiết kế. Chỉ khi chủ chọn (b) mới chép đúng chữ địa chỉ của dữ liệu gieo `migrations/0002_company_profile.sql:20`: "19 Đường B2, Khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, Tỉnh Khánh Hoà". Cả hai cách đều qua bài so khớp (chuỗi đã chuẩn hoá bỏ hoa/thường và dấu câu).
  - Không đổi lớp CSS, không thêm phần tử khối.
- [ ] **Bước 4: TS** `web/login.ts`.
  - `import { chanTrangCongTy } from "../src/shared/cong-ty-chu";`.
  - Trong `fetchConfig`, ngay sau `siteKey = config.turnstileSiteKey;`: `apDungChanTrang(config);`. Hàm:

```ts
/** ADR-0024 6.2: tên + MST ở chân trang lấy từ cấu hình; thiếu/sai → giữ chữ tĩnh của public/login.html (dự phòng khi chưa tải xong, lỗi mạng, bản máy chủ cũ). */
function apDungChanTrang(config: unknown): void {
  const c = chanTrangCongTy(config);
  if (!c) return;
  byId("company-name").textContent = c.ten;
  byId("company-tax").textContent = c.mst;
}
```

  - Sửa chú thích dòng 386–387 thành: chân trang (tên · MST) đọc `GET /api/auth/config`, địa chỉ là chữ tĩnh; trang vẫn KHÔNG gọi `GET /api/company`.
- [ ] **Bước 5: Chạy, thấy xanh:** `node --test src/chan-trang-dang-nhap.test.ts`, `npm run typecheck`, `npm run build:web`, `npm test`, `npm run test:e2e -- pwa`.
- [ ] **Bước 6: Kịch bản Chrome** `v1-dang-nhap.mjs`.
  - **Bước a:**
    - thay câu đọc `company_profile` (dòng 211) bằng câu đọc hồ sơ công ty chủ (`display_name`, `tax_code`) trên `envA.sql`;
    - `chanTrang[0]` kỳ vọng = `` `${ho.display_name} · MST ${ho.tax_code}` ``;
    - `chanTrang[1]` = chữ `.login-address` **đọc từ `public/login.html`** (không gõ lại);
    - bỏ các hằng `EXPECT` về công ty nếu không còn dùng;
    - giữ khẳng định "không gọi GET /api/company".
  - **Bước a2 (mới), "chân trang đi theo cấu hình":**
    - `envA.sql("UPDATE pty_party SET display_name = 'Công ty Thử Chân Trang' WHERE id = (SELECT party_id FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL)")`;
    - mở lại trang → `chanTrang[0]` bắt đầu bằng "Công ty Thử Chân Trang ·";
    - khôi phục tên trong `finally`.
  - **Bước e:** ở hai ca cấu hình bị chặn / 500 (quanh dòng 336), khẳng định thêm `chanTrang[0]` = chữ tĩnh trong `public/login.html`.
  - Sửa dòng mô tả bước (đầu tệp, dòng 10–24) và README bằng chứng.
  - Chạy (cần mạng, ≈ 9 phút) → xanh. **So ảnh** 390×844 và 1040×800 của bước i với ảnh gốc Task 0: bố cục không đổi. Ghi kết luận vào nhật ký.
- [ ] **Bước 7: Kịch bản khác:** `dot-c-smoke.mjs` (`web/CLAUDE.md:42`) và `v1-xac-nhan-png.mjs` (biên nhận; không sửa mã biên nhận) → so với mốc Task 0, không có đỏ mới.
- [ ] **Bước 8: P16:**
  - (a) Tạm bỏ lời gọi `apDungChanTrang(config)` → bước a2 đỏ → hoàn nguyên.
  - (b) Tạm đổi chữ tĩnh tên trong `public/login.html` → `src/chan-trang-dang-nhap.test.ts` đỏ → hoàn nguyên.
  - Chép nguyên văn.
- [ ] **Bước 9: Commit.** Thông điệp: "Trang đăng nhập: tên và mã số thuế ở chân trang đọc từ hồ sơ công ty chủ, chữ tĩnh làm dự phòng (ADR-0024 6.2)". Thân: hình thức giữ nguyên theo bản thiết kế; địa chỉ sửa theo dữ liệu hồ sơ.

---

### Task 12: Sổ hàng rào — gom P16 thành dòng mới

**Tệp:** `docs/SO-HANG-RAO.md` (thêm dòng vào bảng, trước mục "Cách thêm dòng").

- [ ] **Bước 1:** Thêm các dòng dưới. Cột "Đã thấy chặn thật" điền từ nhật ký (ngày + phép đột biến + thông báo đỏ nguyên văn + hoàn nguyên → xanh). **Không** để trống khi xin kiểm độc lập.

| Hàng rào | Chặn cái gì | Cơ chế | Đã thấy chặn thật | Ghi chú |
|---|---|---|---|---|
| `can(staff, "company.legal.write")` ở `PUT /api/parties/:id`, `POST …/contacts`, `POST …/contacts/:cid/end`, `POST …/roles`, `POST …/roles/:rid/end` (ADR-0024 6.4, 6.5 (i); ADR-0038 điều 7) + `src/modules/parties/cong-ty-chu.test.ts` + e2e `company.mjs` | Người không giữ Toàn quyền sửa định danh / liên hệ / công việc của hồ sơ công ty chủ, hoặc gán / kết thúc công việc "Công ty chủ" ở bất kỳ hồ sơ nào | Lời hỏi viết thẳng trong thân route (hàng rào 2 canh "có hỏi"); test chạy cả ứng dụng qua `tests/audit/harness.mjs` | _(người thi công điền: ngày · đột biến Task 7 bước 6 và Task 8 bước 6 · dòng đỏ · hoàn nguyên)_ | Test phải đòi **đúng 403**: lớp CSDL trả 409 nên "không 2xx" sẽ che lỗ. KHÔNG canh route quan hệ (câu 2, Task 9). |
| Chỉ mục `pty_party_role_owner_company_uq` (migration 0028) + `src/migrations-0028.test.ts` | Dòng MỞ thứ hai của vai "Công ty chủ" (mọi hồ sơ), kể cả SQL chạy tay | Chỉ mục duy nhất một phần của SQLite/D1 | _(điền: Task 2 bước 8)_ | Không chặn chèn dòng ĐÃ ĐÓNG, đổi mã vai, đổi hồ sơ, xoá dòng (Q1). |
| Trigger `pty_party_role_owner_company_keep` (0028; phụ thuộc 6.5 — A) | Đóng dòng mở duy nhất, kể cả đóng-rồi-mở trong một lô | Trigger `BEFORE UPDATE OF valid_to_date` | _(điền: Task 3 bước 5)_ | Cùng chỉ mục ⇒ vai không đóng/chuyển được. Không chặn xoá, đổi mã, đổi hồ sơ (Q1). |
| Ánh xạ lỗi CSDL ở `constraintProblem` + `try/catch` route kết thúc vai | Lỗi SQLite thô (500) lộ ra khi chỉ mục/trigger chặn | 409 `owner_company_exists` / `owner_company_locked` kèm thông báo tiếng Việt | _(điền: Task 8 bước 6 (c))_ | Dựa vào chuỗi thông báo của SQLite ("UNIQUE constraint failed: pty_party_role.role_type_code"); đổi phiên bản D1 thì chạy lại e2e. |
| `R-PTY-1` (`scripts/audit-checks.mjs`) + `src/audit-invariants.test.ts` | Dữ liệu thật không có ĐÚNG một hồ sơ mở vai công ty chủ | SQL chỉ đọc sau mỗi lần triển khai | _(điền: Task 4 bước 5)_ | KHÔNG bắt "chuyển dòng sang hồ sơ khác" (vẫn đúng một). D1 chưa áp 0028 → báo vi phạm (đúng). |
| `src/modules/company/khong-doc-cot-phap-ly.test.ts` (ADR-0024 6.3) | Câu SQL của module `company` đọc lại cột pháp lý của `company_profile`; tệp mã ngoài module `company` nhắc `company_profile` | Quét chữ trên SQL đã đăng ký + quét tên bảng ở `src/`, `web/` | _(điền: Task 5 bước 9)_ | Quét chữ, không EXPLAIN tới cột. |
| `src/migrations-0028.test.ts` ca "không id cứng" + "không số viết tay" | id hồ sơ công ty chủ xuất hiện ngoài migration; SĐT/MST/email viết tay trong migration 0028 | Quét văn bản tệp | _(điền: Task 2 bước 8)_ | Chỉ quét tệp 0028 cho "số viết tay". |
| `src/chan-trang-dang-nhap.test.ts` (bài so khớp) | Chữ tĩnh chân trang đăng nhập lệch dữ liệu gieo của hồ sơ công ty chủ | So chuỗi đã chuẩn hoá | _(điền: Task 11 bước 8 (b))_ | Không so với dữ liệu production. |
| Kịch bản Chrome `v1-dang-nhap.mjs` bước a2 + `vai-smoke.mjs` khẳng định "không có Công ty chủ" + `t2b-danh-ba-smoke.mjs` | Chân trang không đi theo cấu hình; ô thêm công việc còn mục "Công ty chủ"; nút sửa hiện sai người | Chrome thật (CDP), ngoài `npm test` | _(điền: Task 10 bước 5, Task 11 bước 8 (a))_ | Không chạy trong CI; cần mạng (đăng nhập). |

- [ ] **Bước 2:** Chạy `git diff --stat` để kiểm chỉ `docs/SO-HANG-RAO.md` đổi. Commit, thông điệp: "Sổ hàng rào: các hàng rào của hồ sơ công ty chủ (T2b), kèm ngày thấy chặn thật".

---

### Task 13: Tài liệu mô tả, sổ dữ liệu, đề xuất diff luật

- [ ] **Bước 1 — sổ dữ liệu:** `docs/data-dictionary.json`, bảng `company_profile`, thêm `"deprecatedColumns": ["company_name", "tax_code", "address", "hotline", "zalo_number", "email"]`. Chạy `npm run dict`, rồi `npm test`: bài `src/architecture.test.ts:524` kiểm cột có thật; bài sổ kiểm `DATA-DICTIONARY.md` khớp bản sinh.
- [ ] **Bước 2 — `docs/SYSTEM-DESIGN.md`** (tài liệu mô tả, thua mã):
  - §5:
    - dòng 227 `company_profile`: cột pháp lý thôi được đọc (ADR-0024 6.3), nguồn là hồ sơ công ty chủ;
    - mục "Bất biến do SQL giữ": thêm chỉ mục + trigger 0028;
    - bảng migration: thêm dòng 0028.
  - §6 (i): hồ sơ công ty chủ, ai sửa được.
  - §7:
    - dòng 484: nguồn của `GET /api/company`;
    - dòng `/api/auth/config`: hai trường mới;
    - các route `/api/parties*`: 403/409 mới.
  - §8: ô `company.legal.write`.
  - §9:
    - dòng 603;
    - đoạn "Màn Đăng nhập" dòng 658: chân trang đọc cấu hình, chữ tĩnh dự phòng.
  - §14:
    - "gộp hồ sơ (N2) phải từ chối hồ sơ công ty chủ" (6.4);
    - "thu hồi `company_profile` theo expand–contract" (6.3).
  - §17 dòng 840–841: K2 có hồ sơ Tour Đảo; K3.
- [ ] **Bước 3 — `docs/CHANGE-GUIDE.md`:**
  - §1 dòng 21: thông tin công ty = hồ sơ công ty chủ (`parties.ownerCompany`), sửa ở Danh bạ bởi Toàn quyền.
  - §2 d: đoạn "Số kế tiếp" (đang ghi cũ `0024`) cập nhật theo `ls migrations/` lúc đó.
  - §2 j: viết lại đoạn "Thông tin công ty" và "Đổi thông tin công ty" (không còn "sửa dòng `company_profile`"; giao diện sửa = màn Danh bạ, chỉ Toàn quyền).
  - §2 u: vai `OWNER_COMPANY` nhóm OTHER, không sinh quyền, không gán hay kết thúc được qua Danh bạ.
  - §3: dòng cho `src/shared/cong-ty-chu.ts` và chân trang (→ `v1-dang-nhap.mjs`), `migrations/0028` (→ e2e đủ bộ).
  - §4 bẫy mới:
    - (1) vai "Công ty chủ" không kết thúc/chuyển được (phương án A) — e2e đừng thử đóng;
    - (2) đóng liên hệ "Hotline" của hồ sơ công ty chủ làm `GET /api/company` 404 (biên nhận báo lỗi) — thêm Hotline mới **trước** khi đóng cái cũ;
    - (3) thêm trường vào `/api/auth/config` phải sửa `tests/e2e/turnstile.mjs:35`;
    - (4) `R-PTY-1` báo vi phạm trên D1 chưa áp 0028.
- [ ] **Bước 4 — `tests/e2e/README.md`:** dòng `company.mjs` (dòng 35) mô tả lại.
- [ ] **Bước 5 — đề xuất diff luật (KHÔNG tự sửa, N9):** tạo `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md`. Mỗi mục một khối diff + lý do một câu:
  - `docs/ARCHITECTURE.md`:
    - dòng 175: `company` đọc định danh qua `parties.ownerCompany`, `company_profile` chỉ còn `logo_url`;
    - sơ đồ tầng dòng 170–181: ghi `parties` nằm dưới `auth`/`staff` như `ALLOWED_EDGES` thật;
    - bảng thi hành dòng 141 "2.1": cưỡng chế = chỉ mục + trigger 0028, `R-PTY-1`, test route; lệch còn = địa chỉ chân trang tĩnh, `company_profile` chưa thu hồi.
  - `src/CLAUDE.md` dòng 20: mã vai `OWNER_COMPANY` chỉ đánh dấu hồ sơ **đích** phải hỏi thêm `company.legal.write` (siết, không bao giờ cho thêm quyền), ADR-0024 6.4.
  - `web/CLAUDE.md` bảng dòng 28–47: hai dòng mới (`src/shared/cong-ty-chu.ts`/chân trang → `v1-dang-nhap.mjs`; phần công ty chủ của `web/parties.ts` → `t2b-danh-ba-smoke.mjs`).
  - `CLAUDE.md` gốc §10: một gạch bẫy "Hồ sơ công ty chủ".
- [ ] **Bước 6 — nhật ký thi công:** điền đủ bảng task, Ruling, nợ (mục "R-BIL-7 → dùng lại R-PTY-1"; "gộp hồ sơ phải từ chối công ty chủ"; `findLogoUrl` chờ lượt thu hồi).
- [ ] **Bước 7:** Commit, thông điệp: "Tài liệu T2b: sổ dữ liệu, thiết kế hệ thống, cẩm nang; đề xuất sửa luật chờ chủ duyệt".

---

### Task 14: Kiểm toàn bộ (người thi công — tự khai, chưa phải nghiệm thu)

- [ ] `npm test`, `npm run typecheck`, `npm run build:web` → xanh / 0 lỗi. Ghi số test.
- [ ] Tắt mọi `wrangler dev` mồ côi, rồi `npm run test:e2e` đủ bộ (cần mạng). Đuôi `audit-invariants --strict` phải có `R-PTY-1` đạt. Đỏ sẵn có trên `main` (Task 0) ghi riêng.
- [ ] `node scripts/audit-invariants.mjs --db local` (sau `npm run db:migrate:local`) → "Mọi bất biến đạt".
- [ ] `node --test "tests/audit/*.test.mjs"` → không đỏ mới so với mốc (ca `FINDING` là hành vi cố ý).
- [ ] Các kịch bản Chrome của Task 10, 11 → đã xanh trên đỉnh nhánh (chạy lại nếu có commit sau đó).
- [ ] Ghi tất cả vào nhật ký mục "Kết quả kiểm của người thi công (tự khai)".

---

### Task 15: Nhật ký thay đổi — số bản chốt LÚC GỘP

- [ ] **Bước 1: Chọn số.**
  - Đọc mục đầu `CHANGELOG` trên `main` **mới nhất** (`src/shared/changelog.ts`). Kiểm các nhánh đang xếp hàng có sửa tệp đó: `git log --oneline main..<nhánh> -- src/shared/changelog.ts` cho từng nhánh còn mở (nhánh ADR-0038 mang 1.26 lúc lập kế hoạch).
  - Lấy số trống kế tiếp **sau khi** các nhánh đứng trước đã lên `main`. Nếu phải gộp trước khi biết thì ghi số dự kiến và ghi rõ trong nhật ký "đổi khi gộp".
- [ ] **Bước 2: Mục mới** (loại `doi`, lời thường, ≤ 160 ký tự mỗi gạch, không chữ kỹ thuật). Gợi ý:
  - "Tên và mã số thuế công ty ở cuối trang đăng nhập nay lấy từ hồ sơ công ty trong Danh bạ; sửa một nơi là đổi khắp nơi."
  - "Chỉ Toàn quyền được sửa thông tin pháp lý và số liên hệ của Tour Đảo trong Danh bạ."
  - Sửa chuỗi kỳ vọng `formatReleaseLine` ở `src/shared/app-info.test.ts` **cùng commit**.
- [ ] **Bước 3:** `node --test src/shared/changelog.test.ts src/shared/app-info.test.ts`. Rồi `node scripts/kiem-phien-ban.mjs` (GET công khai, chỉ đọc) → thoát 0 (1 = quên tăng số; 2 = không đọc được production, KHÔNG phải đạt).
- [ ] **Bước 4:** Commit, thông điệp: "Nhật ký thay đổi <số>: hồ sơ công ty chủ".

---

### Task 16: Người kiểm độc lập (chỉ đọc) — bắt buộc

- [ ] Giao `subagent_type: nguoi-kiem-doc-lap`, **không** phải người thi công. Đầu vào: kế hoạch này, nhật ký, `git diff main...<nhánh>`. Việc phải làm:
  1. Đọc mã thật **năm** route ghi của `parties` (và route quan hệ nếu Task 9 đã làm): mọi đường tới câu ghi đều qua lời hỏi `company.legal.write` khi đụng hồ sơ hoặc mã vai công ty chủ.
  2. Tự chạy lại `npm test`, `npm run typecheck`, `node --test src/migrations-0028.test.ts src/modules/parties/cong-ty-chu.test.ts src/modules/company/*.test.ts src/modules/auth/cau-hinh-cong-ty.test.ts src/audit-invariants.test.ts src/architecture.test.ts`.
  3. Tự làm **ít nhất bốn** phép đột biến của Task 12 trên bản sao (không commit) và thấy đỏ.
  4. Kiểm tệp 0028: không SĐT/MST/email viết tay, không `UPDATE`/`DELETE` `company_profile`, tên trigger `pty_…`, tên tệp không phải B5.
  5. Kiểm `parties/index.ts` xuất **đúng một** hàm mới; `isOwnerCompanyParty`/`laCongTyChu` không bị xuất.
  6. Kiểm không vòng; cạnh mới đúng hai; lập luận mục 1.2.
  7. **Phán quyết Ruling R1:** câu `find_logo` chưa nơi nào gọi, để giữ đúng hàng rào "module nghiêm có ít nhất một câu SQL" mà không nới nó. Chấp nhận, hay đề nghị cách khác trình chủ.
  8. Đọc `tests/e2e/company.mjs`: khôi phục đủ trong `finally`; không gõ số.
  9. Đối chiếu tiêu chí mục 3, từng dòng.
- [ ] Người kiểm chỉ báo cáo, không sửa. Người điều phối ghi kết quả vào nhật ký mục "Kiểm độc lập". Có phát hiện Nghiêm trọng/Quan trọng → quay lại task liên quan, rồi kiểm lại phạm vi sửa.

---

### Task 17: Gộp và phát hành (chủ dự án tự chạy — AI chỉ chuẩn bị)

- [ ] AI kiểm lại: chủ đã trả lời 6.5 (A/B), câu 2 (quan hệ), Q1–Q3; chủ đã **duyệt** `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md`. Chưa duyệt → không đưa lệnh gộp. Sửa các tệp luật đúng như diff đã duyệt, thành commit riêng trên nhánh.
- [ ] AI đưa chủ: truy vấn chỉ đọc trước phát hành (mục 7 bước 2), rồi lệnh gộp và lệnh triển khai (mục 7 bước 4–5). **Có migration 0028** ⇒ **cần chạy `npm run trien-khai`** sau `day-len`.
- [ ] Sau khi chủ báo xong: AI kiểm bằng lệnh chỉ đọc và GET công khai.
  - `node scripts/kiem-phien-ban.mjs --sau-deploy`.
  - `curl -s https://booking.tourdao.vn/api/auth/config`: có `companyName`, `companyTaxCode`.
  - `curl -s https://booking.tourdao.vn/api/company`: 200, năm khoá.
  - Ghi trạng thái vào `docs/HANDOFF-N1.md` trên một nhánh ghi trạng thái (như các lần trước).

---

## 7. Việc của chủ dự án (gom một lần)

1. **Trả lời câu hỏi** ở mục 10 (và hai câu điều phối đang hỏi: 6.5 A/B, câu 2 quan hệ) — một lần, trước Task 3 và Task 11.
2. **Trước khi phát hành — chạy một truy vấn CHỈ ĐỌC** trên D1 thật. Truy vấn chỉ in độ dài và cờ 0/1, **không in** số điện thoại, mã số thuế hay địa chỉ. Chạy trong ứng dụng Terminal, ở thư mục repo gốc:

```
cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales
```

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT length(company_name) AS do_dai_ten, length(tax_code) AS do_dai_mst, (tax_code GLOB '*[^0-9-]*') AS mst_co_ky_tu_khac, length(address) AS do_dai_dia_chi, length(replace(replace(replace(replace(replace(hotline, ' ', ''), '.', ''), '-', ''), '(', ''), ')', '')) AS so_ky_tu_hotline, (zalo_number IS NOT NULL AND trim(zalo_number) <> '') AS co_zalo, (email IS NOT NULL AND trim(email) <> '') AS co_email FROM company_profile WHERE id = 'default'"
```

   Kỳ vọng:
   - `do_dai_ten` từ 1 tới 300;
   - `do_dai_mst` từ 10 tới 14;
   - `mst_co_ky_tu_khac` = 0;
   - `do_dai_dia_chi` ≤ 300;
   - `so_ky_tu_hotline` = 10 (hoặc 12 nếu viết dạng +84).

   Chép kết quả gửi lại cho AI. Lệch thì **chưa** triển khai.
3. **Duyệt đề xuất sửa luật** `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` (Task 13 bước 5).
4. **Gộp nhánh** (Terminal, thư mục repo gốc như trên): `npm run day-len -- <tên nhánh thi công>`
5. **Triển khai** (cần, vì có đổi app và migration `0028`): `npm run trien-khai`. Lệnh tự làm các bước: điểm khôi phục, test, áp migration, deploy, kiểm dữ liệu (có `R-PTY-1`), cổng phiên bản.
6. **Thử tay sau triển khai:**
   - tài khoản Toàn quyền mở Danh bạ → hồ sơ "Công ty TNHH Tour Đảo" có nút "Lưu thông tin";
   - tài khoản Bán hàng mở cùng hồ sơ → không có nút sửa;
   - trang đăng nhập hiện đúng tên và mã số thuế;
   - mở một biên nhận cũ → vẫn đúng;
   - thử trên iPhone thật.

## 8. Trang ghép (cập nhật từ đề xuất §6 — `CLAUDE.md` §9)

| Hỏi | Trả lời |
|---|---|
| Bảng `pty_party` chứa những loại thực thể nào sau khi áp? | người, tổ chức (khách, đại lý, nhân sự, hướng dẫn viên/tài xế chưa tài khoản…) **+ đúng một "công ty chủ"** (tổ chức, vai `OWNER_COMPANY`). |
| Dòng bản đồ quyền nào chạm bảng này, áp cho loại mới thế nào? | `party.view` — **không đổi** (văn phòng xem được hồ sơ công ty chủ).<br>`party.write` — **loại trừ** công ty chủ.<br>`party.staff.write` — không áp (hồ sơ tổ chức không gắn tài khoản; `src/modules/staff/index.ts:292` từ chối tạo tài khoản trên hồ sơ tổ chức).<br>`admin.manage` — vai trên hồ sơ công ty chủ và mã vai `OWNER_COMPANY` **loại trừ**; quan hệ **giữ** (chờ câu 2).<br>**`company.legal.write`** (MỚI, chỉ `SUPER_ADMIN`, T2b thêm theo ADR-0038 điều 7) — định danh, liên hệ, vai của công ty chủ.<br>Gộp hồ sơ (chưa có mã) — phải loại trừ khi xây. |
| Cổng nào canh cửa nào? | Năm route ghi `/api/parties*` ở mục 3.5–3.7: lời hỏi trong thân route (403).<br>CSDL: chỉ mục 0028 (một dòng mở) + trigger 0028 (cấm đóng, phương án A).<br>`GET /api/company` (công khai): chỉ năm trường của `CompanyDto`.<br>`GET /api/auth/config` (công khai): chỉ tên hiển thị + MST.<br>`R-PTY-1`: phát hiện sau triển khai. |

## 9. Hoàn tác

**Lùi Worker về bản trước sau khi `0028` đã áp: an toàn về dữ liệu.**
- Migration chỉ thêm. Mã cũ vẫn đọc `company_profile`, bảng này còn nguyên, nên biên nhận và đăng nhập như trước.
- Trong lúc chạy mã cũ:
  - hồ sơ công ty chủ **không được che**: mã cũ không biết `company.legal.write`, Bán hàng sửa được như hồ sơ tổ chức thường. Không ảnh hưởng nơi nào, vì mã cũ không đọc hồ sơ đó;
  - Quản trị bấm "Kết thúc" công việc "Công ty chủ" thì trigger chặn và mã cũ trả 500;
  - ô "Thêm công việc" cũ có mục "Công ty chủ", gán thì chỉ mục chặn (500).
- Chấp nhận được. Chủ quyết có lùi hay không.

**Gỡ migration:**
- D1 không có lệnh "lùi migration". Gỡ chỉ mục/trigger/dữ liệu phải bằng **migration mới** (`DROP TRIGGER`/`DROP INDEX`…) và là **quyết định mới** (sửa 6.5).

**Time Travel:** `npm run trien-khai` in lệnh khôi phục điểm trước khi áp. Chủ tự quyết.

## 10. CÂU HỎI CHO CHỦ

**Đã hỏi, đang chờ (điều phối hỏi — kế hoạch chỉ viết task phụ thuộc, không hỏi lại):**
- **6.5 — A hay B:** kế hoạch viết theo A; **Task 3** phụ thuộc. B ⇒ bỏ Task 3 + cần ADR mới.
- **Câu 2 — quan hệ "Người liên hệ của Tour Đảo":** kế hoạch giữ Quản trị làm được (đúng chữ 6.4 + ADR-0038 điều 7). **Task 9** phụ thuộc: khoá ⇒ cần ADR mới + trang ghép.

**Câu mới** (mỗi câu một dòng; đều **không chặn** thi công các task khác; có mặc định):
- **Q1 — Chặn thêm ở cơ sở dữ liệu bốn cách "lách" chỉ làm được bằng lệnh gõ tay?** Bốn cách:
  - chuyển công việc "Công ty chủ" sang hồ sơ khác;
  - đổi mã của dòng đó;
  - xoá dòng đó;
  - chèn một dòng "Công ty chủ" đã đóng (lịch sử giả) cho hồ sơ khác.
  
  Các phương án:
  - (a) giữ như duyệt: chỉ cấm "đóng";
  - (b) chặn cả bốn: sửa nội dung 6.5 nên cần văn bản quyết định mới.
  
  **Khuyến nghị (b):** cách "chuyển sang hồ sơ khác" không bị bài kiểm dữ liệu phát hiện (vẫn đúng một hồ sơ). Mặc định (a). Nếu chọn (b) thì làm Task 3 bước 7.
- **Q2 — Sửa chữ địa chỉ tĩnh ở chân trang đăng nhập tới đâu?** Ngoài "tỉnh → Tỉnh" (đã duyệt), chữ tĩnh còn lệch dữ liệu ở "đường → Đường" và thiếu dấu phẩy sau "B2".
  - (a) chỉ sửa "Tỉnh";
  - (b) sửa cả ba cho khớp đúng dữ liệu hồ sơ.
  - **Khuyến nghị (b)**, đúng nguyên tắc 6.2 "sửa theo dữ liệu hồ sơ".
  - **Mặc định (a)** khi chưa có câu trả lời: màn này chủ đã duyệt theo bản thiết kế, nên không tự đổi chữ ngoài phần đã duyệt. Nếu chọn (b) thì làm lại Task 11 bước 3 (sửa một dòng HTML).
- **Q3 — Chân trang đăng nhập hiện "tên gọi" hay "tên pháp lý"?**
  - (a) Chân trang hiện **tên gọi** của hồ sơ, gieo đúng chữ đang hiện "Công ty TNHH Tour Đảo" nên màn hình không đổi. Biên nhận giữ **tên pháp lý** viết HOA như cũ.
  - (b) Chân trang cũng dùng tên pháp lý: sẽ hiện chữ HOA, khác bản thiết kế.
  - **Khuyến nghị và mặc định (a).**

## 11. Giả định đã ghi (P8 — bề mặt, đảo ngược được; chủ không cần trả lời trừ khi muốn đổi)

- **G1:** Tên gọi gieo = "Công ty TNHH Tour Đảo" (chữ đang hiện ở `public/login.html:44`); tên pháp lý = `company_profile.company_name` (Q3).
- **G2:** Hotline = liên hệ PHONE đang mở có nhãn "Hotline" (không phân biệt hoa thường), ưu tiên liên hệ chính.
  - Không có → `GET /api/company` 404 (giữ hợp đồng `CompanyDto`, `src/shared/contracts.ts:385`).
  - Zalo **không** thay cho hotline.
- **G3:** `ownerCompany` không lọc theo cờ "Đang dùng" của hồ sơ: định danh công ty không mất vì một lần bỏ tích.
- **G4:** id của các dòng gieo cố định trong migration (tiền lệ 0010); mã tra bằng mã vai.
- **G5:** Danh bạ ẩn nút theo `editable`, bỏ "Công ty chủ" khỏi ô thêm, dòng vai đó hiện "Cố định" (Task 10).
- **G6:** Đọc hồ sơ lỗi → cấu hình đăng nhập trả `null` cho hai trường, vẫn 200.
- **G7 (Ruling R1):** module `company` giữ một câu `logo_url` chưa nơi nào gọi. Người kiểm độc lập phán quyết.
- **G8:** Mã lỗi:
  - 403 `forbidden` với thông báo riêng cho hồ sơ công ty chủ;
  - 409 `owner_company_exists` / `owner_company_locked`.
- **G9:** Mã kiểm bất biến `R-PTY-1`. Lượt Hoàn tất đơn dùng lại, không thêm `R-BIL-7`.
- **G10:** Mọi so sánh trong test, kịch bản dùng giá trị đọc từ D1 hoặc từ API khác, không gõ số của công ty.

## 12. Tự rà kế hoạch (người lập kế hoạch, 2026-09-28)

- Đủ mười điểm của lời giao việc: mục 1.1–1.10. Mỗi điểm có `tệp:dòng` đo trên `5dc4732`.
- Kế hoạch **không** chứa SĐT, MST, email hay UUID thật của Tour Đảo. Số MST xuất hiện (`0312345678`) là số giả của `tests/e2e/parties.mjs:58`. Số SĐT xuất hiện là mẫu giả `0901 234 567`. Lệnh của chủ chỉ in độ dài.
- Mọi task ghi hành vi có đỏ trước, xanh sau, lệnh kiểm cụ thể, bước P16 cho hàng rào mới. Task 3 và Task 9 đánh dấu phụ thuộc câu trả lời.
- Chỗ sửa tiền đề của lời giao việc (ô `company.legal.write` chưa có ở nhánh ADR-0038): mục 0.
- Chỗ **chưa chắc**, để người kiểm độc lập xem:
  1. Ruling R1 (câu SQL giữ chỗ).
  2. Chuỗi lỗi của D1 cho chỉ mục một phần. Đã đo trên `node:sqlite`; D1 bọc thêm tiền tố — e2e Task 8 xác nhận.
  3. `date('now', '+7 hours')` trong migration theo tiền lệ `0012`.
  4. Kịch bản Chrome đỏ sẵn có trên `main`: chỉ biết qua nhật ký Thông báo, chưa đo lại.
