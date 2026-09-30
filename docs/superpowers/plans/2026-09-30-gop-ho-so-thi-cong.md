# Gộp hồ sơ cá nhân trùng — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **CHỈ BẮT ĐẦU THI CÔNG KHI CHỦ DỰ ÁN XÁC NHẬN DUYỆT ADR-0068 BẰNG LỜI** (hiện `proposed`). Trước lời duyệt đó, không task nào dưới đây được chạy — kể cả Task 0. Khi hỏi duyệt, gom luôn các câu ở mục "Điểm dừng" vào **cùng một lần hỏi** (CLAUDE.md §3).

**Goal:** Quản trị / Toàn quyền gộp được hai hồ sơ cá nhân trùng (hồ sơ phụ A trỏ về hồ sơ chính B, chỉ chuyển phần còn sửa được, sổ sách giữ nguyên), xem được danh sách "Hồ sơ nghi trùng", và máy chủ chặn tạo hồ sơ trùng khi Thêm tài khoản.

**Architecture:** Cột `pty_party.merged_into_id` / `merged_at` + bốn trigger bất biến (migration mới). Module `parties` có hàm THUẦN tính kế hoạch gộp (`src/modules/parties/gop.ts`) và bộ dựng lô câu lệnh CHƯA chạy có lính gác trạng thái (`gop-lo.ts`); phần của module khác (đơn: đổi người đặt; điều phối, vận chuyển: "đang bận"; sổ tiền: đếm dòng nợ; tài khoản: SĐT đăng nhập) tới `parties` qua **một hàm tiêm ở gốc lắp ráp** (`ctx.gopHoSo`, khuôn `ctx.isAssigned`) — **không thêm cạnh nào vào `ALLOWED_EDGES`**. Route gộp ghép MỘT `db.batch()`: liên hệ → công việc → quan hệ → giấy tờ → câu đổi người đặt đơn → câu lật A → hai dòng nhật ký.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), `node --test` chạy `.ts` trực tiếp, khung thử `tests/audit/harness.mjs` (cả ứng dụng trên `node:sqlite`), esbuild, giao diện thuần dựng bằng `h()`.

**Spec:** `docs/superpowers/specs/2026-09-30-gop-ho-so/dac-ta.md` + `docs/superpowers/specs/2026-09-30-gop-ho-so/ADR-0068-gop-ho-so-ca-nhan.md` (người thi công đọc CẢ HAI trước Task 0; tiêu chí G1–G16, T1–T3, C1–C3 ở §2 đặc tả).

---

## Điểm dừng — phải hỏi chủ (gom một lần, cùng lúc xin duyệt ADR-0068)

Các câu dưới đây chạm dữ liệu / hợp đồng giữa các phần, nên KHÔNG tự quyết (CLAUDE.md §3, P8). Kế hoạch đã viết theo phương án **(Khuyến nghị)**; chủ chọn khác thì sửa đúng bước có nhãn `[Dừng Qn]`.

| # | Câu hỏi | Phương án (Khuyến nghị đứng đầu) | Bước phụ thuộc |
|---|---|---|---|
| Q1 | **Số migration.** `main` tới `0050`, nhánh chưa gộp đã dùng tới `0053`. | (Khuyến nghị) `0054_gop_ho_so.sql`, xác nhận với phiên điều phối chung trước khi gộp; test tìm tệp theo ĐUÔI tên nên đổi số chỉ đổi tên tệp. | Task 1 |
| Q2 | **Nhà xe cá nhân có xe.** ADR-0068 Đ1 viết "hồ sơ cá nhân không có xe", nhưng mã thật cho phép: trigger `vc_vehicle_owner_ins` (0039) nhận chủ xe là BẤT KỲ hồ sơ đang mở vai `CARRIER`, view `v_pty_carrier_driver` (0038) có nhánh riêng cho nhà xe CÁ NHÂN. Gộp A (nhà xe cá nhân có xe) sẽ chuyển vai Nhà xe sang B, xe vẫn đứng tên A (đã ẩn, không còn là nhà xe) — chuyến sau của xe đó vướng trigger `vc_trip_vehicle_carrier_*`. | (Khuyến nghị) **Từ chối 409 `merge_source_owns_vehicle`** khi A đang đứng tên xe nào (mọi trạng thái); muốn gộp thì đổi chủ xe trước. / (b) cho gộp, xe ở lại A (chấp nhận xe "mồ côi"). / (c) chuyển chủ xe sang B trong cùng lô (chạm bảng `vc_vehicle` của module khác — cần ADR bổ sung). | Task 3 bước "chặn xe", Task 4 (đếm xe) |
| Q3 | **Hai hàm công bố mới cho gốc lắp ráp.** `van-chuyen` hôm nay chỉ công bố `mocToiThieuHienHanh` (chú thích đầu `src/modules/van-chuyen/index.ts`), `billing` chỉ công bố `soTienBienNhan`. Kế hoạch thêm `viecXeCuaNguoi` (van-chuyen) và `soDongNoCuaNguoi` (billing), CHỈ `src/index.ts` gọi — không thêm cạnh phụ thuộc, có bài siết "chỉ gốc lắp ráp nhắc tên" như `mocToiThieuHienHanh`. | (Khuyến nghị) chấp nhận (không nới hàng rào máy nào; chỉ mở rộng bề mặt công bố theo khuôn đã duyệt). / (b) bỏ số dòng công nợ khỏi xem trước (G10 thiếu một mục) và bỏ kiểm "đang ở chuyến chưa chốt" (G11 thiếu một ca) — không khuyến nghị. | Task 4 |
| Q4 | **C1 "gõ SĐT hoặc tên thì hiện hồ sơ khớp".** Bảng API §4 của đặc tả không có route đọc "khớp theo tên" nên giao diện chỉ biết danh sách khi bấm Tạo (409). | (Khuyến nghị) thêm **một route đọc** `GET /api/staff/ho-so-khop?phone=&ten=` (cổng `admin`, ô `admin.manage`, trả ĐÚNG danh sách mà 409 `party_match_exists` sẽ trả — một hàm nguồn). / (b) không thêm route: khối C1 chỉ hiện sau lần bấm Tạo đầu tiên (từ thân 409) — lệch chữ "gõ … thì hiện". | Task 8 bước C1, Task 9 |
| Q5 | **Dòng bắt đầu SAU hôm nay** (công việc / quan hệ của A có ngày bắt đầu trong tương lai): câu đóng dòng đòi `ngày đóng ≥ ngày bắt đầu`, nên không đóng được bằng "hôm nay". ADR không nói. | (Khuyến nghị) **từ chối 409 `merge_source_future_row`**: "Hồ sơ phụ có công việc / quan hệ bắt đầu sau hôm nay — kết thúc hoặc sửa dòng đó trước khi gộp." / (b) đóng dòng đó bằng chính ngày bắt đầu của nó và mở dòng tương ứng ở B từ ngày đó. | Task 3 |

Ngoài bảng: **không có cạnh phụ thuộc mới** trong `ALLOWED_EDGES` (kế hoạch đã chọn gốc lắp ráp). Nếu người thi công thấy bắt buộc phải thêm cạnh → DỪNG, soạn tệp `docs/superpowers/plans/2026-09-30-gop-ho-so-de-xuat-luat.md` trình chủ (Hiến pháp Điều 9.4), không tự thêm.

## Quyết định tự áp (suy ra từ luật đã duyệt — ghi lại, không hỏi)

- **R1 — Lính gác chống đua là lính gác TRẠNG THÁI trên `pty_party`, không phải `wonGuard`.** `parties` là module nghiêm, không được đọc `audit_log` (CHANGE-GUIDE §f "Bẫy"). Mọi câu trong lô mang điều kiện `(SELECT count(*) FROM pty_party g WHERE g.id IN (A, B) AND g.active = 1 AND g.merged_into_id IS NULL) = 2`; câu lật A đứng sau cùng (trước nhật ký), tự có điều kiện `active = 1 AND merged_into_id IS NULL`; hai dòng nhật ký `changes() > 0`. Lô thua: mọi câu thành không-làm-gì, câu lật `changes = 0` → 409 `merge_lost_race`.
- **R2 — Câu đổi người đặt đơn nằm TRƯỚC câu lật A** (nó chỉ thấy `v_pty_party_label.active`, lính gác "A còn active = 1" mất hiệu lực sau câu lật). Đặt ở tệp nửa nghiêm mới `src/modules/orders/nguoi-dat-gop-repo.ts` (thêm vào `NUA_NGHIEM` — siết). `updated_at` của đơn tăng NGHIÊM NGẶT (khuôn `nextStamp`) để khoá lạc quan của người đang sửa đơn bắt được.
- **R3 — Không chuỗi gộp (Đ3):** vì `merged_into_id` chỉ đặt một lần, hồ sơ đã có hồ sơ khác gộp VÀO nó thì không làm hồ sơ phụ được → 409 `merge_source_is_target` + trigger chặn. Mã lỗi này và `merge_order_invalid` (đơn cũ lệch tiền — Đ1 bước 5 "câu lỗi nêu mã đơn") là mã mới ngoài §4 đặc tả — giả định bề mặt, tên đổi được.
- **R4 — Cấp bậc với bên thứ ba:** mỗi hồ sơ ở đầu kia của quan hệ bị chuyển / đóng cũng qua `ctx.partyAccount` (khuôn route kết thúc quan hệ đã xét cả hai đầu) → 403 nếu người gộp không quản được.
- **R5 — Lý do huỷ giấy tờ:** bảng `pty_person_document` chỉ có `voided_at`, không có cột lý do → lý do cố định "đã gộp vào hồ sơ khác" chỉ nằm ở `detail` của dòng nhật ký `party_merged`.
- **R6 — LC-3 không tới được qua route** (chỉ vai nhóm `OTHER` được chuyển, vai tài khoản của A đã bị chặn ở Đ2) — vẫn kiểm trong hàm thuần và có test ở mức hàm thuần; trigger `pty_party_role_group_conflict_*` là lưới cuối.
- **R7 — "Dòng còn mở"** = `valid_to_date IS NULL OR valid_to_date > hôm nay (giờ VN)`; dòng đóng đúng hôm nay coi là "vừa kết thúc".
- **R8 — Tên chuẩn hoá** (T1, C2, ô gõ lại tên): `s.normalize("NFC").toLocaleLowerCase("vi").trim().replace(/\s+/g, " ")` — một hàm ở `src/shared/ho-so-trung.ts`, giữ dấu.
- **R9 — Hàm tiêm lười** (router gọi `opts.injected.gopHoSo(env)` bên trong từng phương thức), để các bài dựng `createApp` với `injected` cũ (`src/shared/router.test.ts`) không vỡ.

## Global Constraints

- Tiếng Việt CÓ DẤU cho mọi chữ người dùng thấy, câu lỗi, tài liệu, commit; không lộ mã thô (`merge_*`) ra giao diện — giao diện hiện `message`.
- Nhật ký (`audit_log.detail`) và phản hồi xem trước, câu lỗi: **không** SĐT (trừ bảng xem trước cho người giữ `admin.manage` — đặc tả G10), **không** email trong nhật ký, **không bao giờ** số giấy tờ ở bất kỳ đâu (ADR-0040).
- Không xoá cứng; không sửa migration đã áp; ngày dân sự theo giờ VN (`vnToday`), dấu thời gian ISO UTC.
- Module nghiêm (`parties`, `staff`, `dispatch`, `van-chuyen`, `billing`): SQL chỉ qua `defineSql` ở tệp đã khai trong `STRICT`/`NUA_NGHIEM`, `.prepare(<hằng>)`.
- Không thêm ô vào `MATRIX`, không đổi bản đồ quyền: route mới hỏi `can(staff, "admin.manage")` viết thẳng ở cấp thân handler (luật (4) `src/route-write-guard.test.ts`).
- Không thêm cạnh vào `ALLOWED_EDGES` (xem Điểm dừng).
- Giao diện: không `innerHTML`, dựng bằng `h()`; giá trị CSS qua token (dùng lớp có sẵn: `card`, `alert warn`, `btn btn-danger`, `items`, `muted`, `badge`); ô gõ 16px (mặc định của `input` trong `app.css`).
- Đồng bộ nhân viên từ Google Sheet **không đổi hành vi** (C3).
- Commit nhỏ, tiếng Việt: tiêu đề nói việc, thân nói vì sao; kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Việc lớn (dữ liệu + quyền): thi công xong phải có người kiểm độc lập chỉ-đọc (Task 12) trước khi báo "đạt".

## Review Focus

Năm ca đặc tả ngụ ý mà dễ vỡ nhất khi người dùng thật chạm vào — mỗi dòng có test ở task sở hữu mã:

1. **B đã có liên hệ chính cùng loại, và có người thêm liên hệ chính cho B đúng lúc gộp** → X sang B không phải chính, Y giữ chính; nếu chỉ mục `pty_contact_primary_uq` vỡ giữa chừng thì trả 409 `merge_lost_race` tiếng Việt, không 500 (Task 3 "G5", Task 6 "đua liên hệ chính").
2. **A là người đặt của một đơn nháp mà nhân viên khác đang mở sửa** → sau gộp `updated_at` của đơn tăng nghiêm ngặt, lần lưu mang mốc cũ khớp 0 dòng (bị khoá lạc quan) — kể cả khi hai việc rơi cùng mili-giây (Task 4 "mốc tăng nghiêm ngặt", Task 6 "G7").
3. **Hai lô gộp cùng một A cùng lúc** (bấm đúp / hai người) → đúng một thành công, lần kia 409, B không bị nhân đôi liên hệ / công việc (Task 5 "G13 tất định", Task 6 "G13 qua route").
4. **Tên có dấu dạng NFD** (gõ trên iPhone / dán từ nơi khác) và khoảng trắng thừa → vẫn khớp NAME ở danh sách nghi trùng, ở C2, và ô "gõ lại tên" (Task 2, Task 6 "xác nhận NFD", Task 8).
5. **A là nhà xe cá nhân, có người khác "Tài xế của" A** → vai Nhà xe được mở ở B TRƯỚC quan hệ "Tài xế của" → B (trigger `pty_relationship_drives_for_carrier` kiểm lúc chèn); B là tài xế của A → chỉ đóng (không B↔B) (Task 3, Task 5 "nhà xe cá nhân").

---

## Bản đồ tệp

| Tệp | Tạo / Sửa | Trách nhiệm |
|---|---|---|
| `docs/adr/ADR-0068-gop-ho-so-ca-nhan.md`, `docs/adr/README.md` | Tạo / Sửa | ADR đã duyệt + dòng mục lục (Task 0) |
| `migrations/0054_gop_ho_so.sql` | Tạo | Hai cột + chỉ mục + bốn trigger G14 |
| `src/migrations-gop-ho-so.test.ts` | Tạo | G14 trên SQLite thật |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` | Sửa | ghi chú hai cột mới |
| `src/shared/ho-so-trung.ts` (+ `.test.ts`) | Tạo | `chuanHoaTen`, `capNghiTrung`, nhãn lý do khớp — thuần, dùng cả server lẫn web |
| `src/modules/parties/gop.ts` (+ `gop.test.ts`) | Tạo | Hàm thuần `keHoachGop` (Đ1 bước 1–4, Đ2) |
| `src/modules/parties/gop-lo.ts` (+ `gop-lo.test.ts`) | Tạo | Dựng lô câu lệnh có lính gác từ kế hoạch |
| `src/modules/parties/repository.ts` | Sửa | câu gộp có lính gác, đọc cột gộp, lọc hồ sơ đã gộp, đọc cho nghi trùng |
| `src/modules/parties/index.ts` | Sửa | route preview / merge / duplicates, `mergedInto`/`mergedFrom`, G16, `hoSoCaNhanKhop` |
| `src/modules/parties/gop-route.test.ts`, `nghi-trung.test.ts` | Tạo | G1–G3, G7, G9–G13, G16, T1 trên khung thử |
| `src/modules/orders/nguoi-dat-gop-repo.ts` (+ `nguoi-dat-gop.test.ts`), `src/modules/orders/index.ts` | Tạo / Sửa | đọc đơn theo người đặt, câu đổi người đặt |
| `src/modules/dispatch/repository.ts`, `index.ts` | Sửa | `soDonDangPhuTrachCua` |
| `src/modules/van-chuyen/chuyen-repo.ts`, `index.ts` | Sửa | `viecXeCuaNguoi` [Dừng Q3] |
| `src/modules/billing/repository.ts`, `index.ts` | Sửa | `soDongNoCuaNguoi` [Dừng Q3] |
| `src/modules/staff/repository.ts`, `index.ts` | Sửa | `soDangNhapTheoHoSo`, `hoSoKhopKhiTaoTaiKhoan`, lỗi `party_merged` |
| `src/modules/accounts/index.ts` | Sửa | C2 ở `POST /api/staff`, route `GET /api/staff/ho-so-khop` [Dừng Q4] |
| `src/shared/router.ts`, `src/index.ts` | Sửa | kiểu + tiêm `gopHoSo` |
| `src/shared/contracts.ts`, `src/shared/audit-actions.ts` | Sửa | DTO mới, hành động `party_merged` |
| `src/architecture.test.ts`, `src/route-access.test.ts`, `src/giay-to-khong-lo-so.test.ts`, `src/audit-invariants.test.ts` | Sửa | siết mới, ảnh chụp route, ca giấy tờ, bất biến |
| `scripts/audit-checks.mjs` | Sửa | `R-PTY-MERGE-1..4` |
| `web/parties.ts`, `public/parties.html`, `web/staff.ts` | Sửa | hộp gộp, dải đã gộp, nghi trùng, khối C1 |
| `docs/evidence/2026-09-30-gop-ho-so/kich-ban/gop-ho-so-smoke.mjs` | Tạo | kịch bản Chrome |
| `tests/e2e/gop-ho-so.mjs`, `tests/e2e/run.mjs` | Tạo / Sửa | e2e mỏng |
| `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/BACKLOG.md`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts`, `web/CLAUDE.md` (bảng Chrome — chỉ đề xuất, xem Task 11) | Sửa | tài liệu |

Mọi lệnh chạy ở thư mục worktree `/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/gop-ho-so` (nhánh `worktree-gop-ho-so`).

---

### Task 0: Đưa ADR đã duyệt vào `docs/adr/` và ghi số giữ chỗ

**Files:**
- Create: `docs/adr/ADR-0068-gop-ho-so-ca-nhan.md` (chép từ `docs/superpowers/specs/2026-09-30-gop-ho-so/ADR-0068-gop-ho-so-ca-nhan.md`)
- Modify: `docs/adr/README.md` (bảng mục lục + mục "Số migration đã giữ chỗ")

**Interfaces:** không có mã.

- [ ] **Step 1: Xác nhận chủ đã duyệt bằng lời.** Ghi nguyên văn câu duyệt của chủ + ngày vào nhật ký thi công mới `docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong-nhat-ky.md` (tạo tệp, mục "Lời duyệt" + "Trả lời Q1–Q5"). Không có câu duyệt → dừng cả kế hoạch.

- [ ] **Step 2: Chép ADR và đổi dòng trạng thái.** Lưu ý: `.claude/settings.json` có luật `ask` cho `Edit(docs/adr/**)` — chủ phải bấm đồng ý; đó là hàng rào đúng, KHÔNG lách: **không** dùng `cp`/`mv`/`cat >` trong Bash để ghi vào `docs/adr/`. Đọc bản nháp bằng công cụ Read, rồi tạo `docs/adr/ADR-0068-gop-ho-so-ca-nhan.md` bằng công cụ **Write** (nội dung = nguyên văn bản nháp, chỉ đổi dòng trạng thái như dưới) để hộp hỏi quyền hiện ra cho chủ.

Dòng trạng thái trong `docs/adr/ADR-0068-gop-ho-so-ca-nhan.md`:

```markdown
- **Trạng thái:** **accepted** 2026-MM-DD (chủ dự án duyệt bằng lời — nguyên văn ở `docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong-nhat-ky.md`). Bản nháp gốc giữ ở `docs/superpowers/specs/2026-09-30-gop-ho-so/`.
```

(Thay `2026-MM-DD` bằng ngày thật của lời duyệt.) Nếu chủ trả lời Q2/Q5 khác khuyến nghị, thêm một gạch "Trả lời điểm dừng" dưới mục Quyết định của ADR ghi đúng lựa chọn.

- [ ] **Step 3: Thêm dòng mục lục** vào bảng ADR của `docs/adr/README.md` (đặt sau dòng lớn nhất hiện có; nếu 0066/0067 đã có dòng thì đứng sau chúng):

```markdown
| [0068](ADR-0068-gop-ho-so-ca-nhan.md) | **Gộp hồ sơ cá nhân trùng:** hồ sơ phụ trỏ về hồ sơ chính (`pty_party.merged_into_id`, đặt một lần, không chuỗi), chỉ chuyển liên hệ / công việc / quan hệ / giấy tờ còn hiệu lực và người đặt của đơn chưa giao, chưa huỷ; sổ sách (đơn đã giao, chuyến, tiền, nhật ký) giữ ở hồ sơ phụ; Quản trị + Toàn quyền (`admin.manage` + cấp bậc); không tách lại; danh sách "Hồ sơ nghi trùng"; chặn tạo trùng ở `POST /api/staff`; migration `0054` (giữ chỗ). Thi hành ADR-0001 điều 8 (thu hẹp về hồ sơ cá nhân) | một chiều (cột, dữ liệu đổi chủ) | **accepted** 2026-MM-DD |
```

Và thêm vào danh sách "Số migration đã giữ chỗ":

```markdown
- 0054: ADR-0068 (gộp hồ sơ cá nhân — cột `merged_into_id`/`merged_at` + trigger) — giữ chỗ 2026-09-30, nhánh `worktree-gop-ho-so`; xác nhận với phiên điều phối chung trước khi gộp (nếu trùng thì đổi tên tệp, test tìm theo đuôi `_gop_ho_so.sql`).
```

- [ ] **Step 4: Kiểm lại số migration ở mọi nhánh chưa gộp** (lệnh chỉ đọc, chạy từng nhánh một — không dùng vòng lặp phức tạp):

```bash
git branch --list
git ls-tree --name-only main migrations/ | tail -3
```

Với mỗi nhánh còn mở có thể giữ migration (tên gợi ý: `*dieu-phoi*`, `*so-tien*`, `*nhom-dich-vu*`, `*bao-tin*`), chạy `git ls-tree --name-only <nhánh> migrations/ | tail -3`. Số lớn nhất thấy được + 1 phải ≤ 0054; nếu `0054` đã bị dùng → dùng số trống kế tiếp và đổi tên tệp ở Task 1 (ghi vào nhật ký thi công).

- [ ] **Step 5: Commit**

```bash
git add docs/adr/ADR-0068-gop-ho-so-ca-nhan.md docs/adr/README.md docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong-nhat-ky.md
git commit -m "$(cat <<'EOF'
ADR-0068 accepted: gộp hồ sơ cá nhân trùng + giữ chỗ migration 0054

Chủ dự án duyệt bằng lời (nguyên văn ở nhật ký thi công). Chép bản nháp vào
docs/adr/, thêm mục lục và số migration giữ chỗ để phiên khác không đặt trùng.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1: Migration — cột gộp + trigger G14

**Files:**
- Create: `migrations/0054_gop_ho_so.sql` [Dừng Q1 — số]
- Create: `src/migrations-gop-ho-so.test.ts`
- Modify: `docs/data-dictionary.json` (mục `pty_party`), sinh lại `docs/DATA-DICTIONARY.md`

**Interfaces:**
- Produces: cột `pty_party.merged_into_id TEXT NULL REFERENCES pty_party(id)`, `pty_party.merged_at TEXT NULL` (ISO UTC); trigger `pty_party_merge_no_insert`, `pty_party_merge_set_once`, `pty_party_merge_target`, `pty_party_merge_no_reopen` (mã lỗi RAISE mở đầu lần lượt `party_merge_insert:`, `party_merge_set_once:`, `party_merge_target:`, `party_merge_no_reopen:`).

- [ ] **Step 1: Viết test đỏ** `src/migrations-gop-ho-so.test.ts`:

```ts
// Kiểm migration *_gop_ho_so.sql (ADR-0068 Đ3, tiêu chí G14): hai cột gộp trên pty_party + bốn trigger bất biến — đặt MỘT lần, không đổi / xoá, không trỏ
// chính mình, đích là hồ sơ cá nhân đang dùng chưa gộp và chưa ai trỏ vào nguồn (không chuỗi), đặt kèm active = 0 và mốc gộp, không mở lại. Dựng schema THẬT
// từ migrations/*.sql bằng node:sqlite; tệp tìm theo ĐUÔI tên (đổi số chỉ đổi tên tệp).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_gop_ho_so.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const triggers = (db: DatabaseSync): string[] => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string }[]).map((r) => r.name);

const AT = "2026-09-30T03:00:00.000Z";
function nguoi(db: DatabaseSync, id: string, kind: "PERSON" | "ORGANIZATION" = "PERSON"): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").run(id, kind, `Hồ sơ ${id}`, AT, AT);
  return id;
}
const gop = (db: DatabaseSync, a: string, b: string, at: string | null = AT, active = 0) =>
  db.prepare("UPDATE pty_party SET active = ?, merged_into_id = ?, merged_at = ?, updated_at = ? WHERE id = ?").run(active, b, at, AT, a);
const dong = (db: DatabaseSync, id: string) => db.prepare("SELECT active, merged_into_id AS m, merged_at AS t FROM pty_party WHERE id = ?").get(id) as { active: number; m: string | null; t: string | null };

test("(a) đúng một tệp *_gop_ho_so.sql; thêm đúng hai cột và bốn trigger pty_party_merge_*", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_gop_ho_so.sql, thấy: ${JSON.stringify(MATCHES)}`);
  const db = open(files.filter((f) => f < FILE));
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.includes(t)), ["pty_party_merge_no_insert", "pty_party_merge_no_reopen", "pty_party_merge_set_once", "pty_party_merge_target"]);
  const cot = (db.prepare("PRAGMA table_info(pty_party)").all() as { name: string }[]).map((c) => c.name);
  assert.ok(cot.includes("merged_into_id") && cot.includes("merged_at"));
});

test("(b) gộp hợp lệ: A (cá nhân, đang dùng) vào B (cá nhân, đang dùng, chưa gộp) — active = 0 + mốc cùng câu", () => {
  const db = all();
  nguoi(db, "a"); nguoi(db, "b");
  gop(db, "a", "b");
  assert.deepEqual({ ...dong(db, "a") }, { active: 0, m: "b", t: AT });
});

test("(c) G14: không đổi / xoá merged_into_id đã đặt, không đổi mốc gộp", () => {
  const db = all();
  nguoi(db, "a"); nguoi(db, "b"); nguoi(db, "c");
  gop(db, "a", "b");
  assert.throws(() => db.prepare("UPDATE pty_party SET merged_into_id = 'c' WHERE id = 'a'").run(), /party_merge_set_once/);
  assert.throws(() => db.prepare("UPDATE pty_party SET merged_into_id = NULL, merged_at = NULL WHERE id = 'a'").run(), /party_merge_set_once/);
  assert.throws(() => db.prepare("UPDATE pty_party SET merged_at = '2026-10-01T00:00:00.000Z' WHERE id = 'a'").run(), /party_merge_set_once/);
});

test("(d) G14: không trỏ chính mình; đích đã gộp (chuỗi) / đã ngưng / là tổ chức / không có → chặn; nguồn đang là đích của hồ sơ khác → chặn", () => {
  const db = all();
  for (const id of ["a", "b", "c", "d", "e"]) nguoi(db, id);
  nguoi(db, "o", "ORGANIZATION");
  assert.throws(() => gop(db, "a", "a"), /party_merge_target/);
  gop(db, "b", "c");
  assert.throws(() => gop(db, "a", "b"), /party_merge_target/, "đích b đã gộp → chuỗi");
  db.prepare("UPDATE pty_party SET active = 0 WHERE id = 'd'").run();
  assert.throws(() => gop(db, "a", "d"), /party_merge_target/, "đích đang ngưng");
  assert.throws(() => gop(db, "a", "o"), /party_merge_target/, "đích là tổ chức");
  assert.throws(() => gop(db, "o", "a"), /party_merge_target/, "nguồn là tổ chức");
  assert.throws(() => gop(db, "c", "e"), /party_merge_target/, "c đang là đích của b → c không gộp tiếp được");
  assert.equal(dong(db, "a").m, null);
});

test("(e) G14: đặt merged_into_id mà active còn 1, hoặc thiếu mốc gộp → chặn", () => {
  const db = all();
  nguoi(db, "a"); nguoi(db, "b");
  assert.throws(() => gop(db, "a", "b", AT, 1), /party_merge_target/);
  assert.throws(() => gop(db, "a", "b", null), /party_merge_target/);
  assert.throws(() => db.prepare("UPDATE pty_party SET merged_at = ? WHERE id = 'a'").run(AT), /party_merge_target/, "mốc mà không đích");
});

test("(f) G14: không mở lại hồ sơ đã gộp (active về 1); hồ sơ mới không mang sẵn dấu gộp", () => {
  const db = all();
  nguoi(db, "a"); nguoi(db, "b");
  gop(db, "a", "b");
  assert.throws(() => db.prepare("UPDATE pty_party SET active = 1 WHERE id = 'a'").run(), /party_merge_no_reopen/);
  assert.throws(
    () => db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at, merged_into_id, merged_at) VALUES ('x', 'PERSON', 'X', 0, ?, ?, 'b', ?)").run(AT, AT, AT),
    /party_merge_insert/,
  );
  // Hồ sơ CHƯA gộp vẫn ngưng / mở lại bình thường (không bị trigger vướng).
  db.prepare("UPDATE pty_party SET active = 0 WHERE id = 'b'").run();
  db.prepare("UPDATE pty_party SET active = 1 WHERE id = 'b'").run();
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/migrations-gop-ho-so.test.ts`
Expected: FAIL — `phải có đúng một tệp *_gop_ho_so.sql, thấy: []`.

- [ ] **Step 3: Viết migration** `migrations/0054_gop_ho_so.sql`:

```sql
-- Migration 0054 — ADR-0068 Đ3 (gộp hồ sơ cá nhân trùng; accepted — xem docs/adr/ADR-0068-gop-ho-so-ca-nhan.md). CHỈ THÊM. Số 0054 là số GIỮ CHỖ — xác nhận
-- với phiên điều phối chung trước khi gộp main; test tìm tệp theo ĐUÔI tên. Trigger chỉ đọc bảng của chính module parties (Hiến chương 5.3); tên bắt đầu
-- pty_ (không staff_/stf_ — src/migrations-n1.test.ts coi đó là trigger siết B5). REFERENCES chỉ được khi mặc định NULL (SQLite ADD COLUMN).
ALTER TABLE pty_party ADD COLUMN merged_into_id TEXT REFERENCES pty_party(id);
ALTER TABLE pty_party ADD COLUMN merged_at TEXT;
CREATE INDEX pty_party_merged_into_ix ON pty_party(merged_into_id) WHERE merged_into_id IS NOT NULL;

-- Hồ sơ mới không bao giờ sinh ra ở trạng thái "đã gộp".
CREATE TRIGGER pty_party_merge_no_insert BEFORE INSERT ON pty_party
WHEN NEW.merged_into_id IS NOT NULL OR NEW.merged_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'party_merge_insert: hồ sơ mới không được mang sẵn dấu đã gộp'); END;

-- Đặt MỘT lần: đã có đích thì không đổi đích, không xoá, không đổi mốc.
CREATE TRIGGER pty_party_merge_set_once BEFORE UPDATE OF merged_into_id, merged_at ON pty_party
WHEN OLD.merged_into_id IS NOT NULL AND (NEW.merged_into_id IS NOT OLD.merged_into_id OR NEW.merged_at IS NOT OLD.merged_at)
BEGIN SELECT RAISE(ABORT, 'party_merge_set_once: hồ sơ đã gộp — không đổi hay bỏ dấu gộp'); END;

-- Lúc đặt: đích và mốc đi cùng nhau; không trỏ chính mình; nguồn ngưng dùng cùng câu; cả hai là cá nhân; đích đang dùng, chưa gộp; nguồn chưa là đích của
-- hồ sơ nào (không chuỗi — ADR-0068 Đ3).
CREATE TRIGGER pty_party_merge_target BEFORE UPDATE OF merged_into_id, merged_at ON pty_party
WHEN OLD.merged_into_id IS NULL AND (NEW.merged_into_id IS NOT NULL OR NEW.merged_at IS NOT NULL) AND (
  NEW.merged_into_id IS NULL OR NEW.merged_at IS NULL
  OR NEW.merged_into_id = NEW.id
  OR NEW.active <> 0
  OR NEW.party_kind <> 'PERSON'
  OR NOT EXISTS (SELECT 1 FROM pty_party t WHERE t.id = NEW.merged_into_id AND t.party_kind = 'PERSON' AND t.active = 1 AND t.merged_into_id IS NULL)
  OR EXISTS (SELECT 1 FROM pty_party s WHERE s.merged_into_id = NEW.id))
BEGIN SELECT RAISE(ABORT, 'party_merge_target: gộp phải từ hồ sơ cá nhân sang hồ sơ cá nhân đang dùng, chưa gộp, không chuỗi, kèm ngưng dùng và mốc gộp'); END;

-- Hồ sơ đã gộp không mở lại.
CREATE TRIGGER pty_party_merge_no_reopen BEFORE UPDATE OF active ON pty_party
WHEN OLD.merged_into_id IS NOT NULL AND NEW.active <> 0
BEGIN SELECT RAISE(ABORT, 'party_merge_no_reopen: hồ sơ đã gộp — không bật lại'); END;
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `node --test src/migrations-gop-ho-so.test.ts`
Expected: PASS (6 bài).

- [ ] **Step 5: Quan sát hàng rào chặn thật (P16).** Tạm xoá vế `OR EXISTS (SELECT 1 FROM pty_party s WHERE s.merged_into_id = NEW.id)` trong `0054_gop_ho_so.sql` → chạy lại lệnh Step 4 → phải thấy `not ok … (d)` với thông báo `c đang là đích của b …` → hoàn nguyên → xanh. Chép nguyên câu đỏ vào nhật ký thi công (dùng cho dòng `docs/SO-HANG-RAO.md` ở Task 10).

- [ ] **Step 6: Sổ dữ liệu.** Trong `docs/data-dictionary.json`, sửa mục `pty_party` (đang là `{ "name": "pty_party", "module": "parties", "kind": "table" }`) thành:

```json
    {
      "name": "pty_party",
      "module": "parties",
      "kind": "table",
      "note": "merged_into_id (NULL = chưa gộp) + merged_at (ISO UTC): hồ sơ phụ đã gộp vào hồ sơ chính (ADR-0068) — đặt MỘT lần cùng active = 0, không chuỗi, không mở lại (trigger pty_party_merge_*); tham chiếu sổ sách cũ vẫn trỏ hồ sơ phụ, gom theo người thì đi theo merged_into_id một bước"
    },
```

Run: `npm run dict`
Expected: thoát 0; `git diff --stat docs/DATA-DICTIONARY.md` có thay đổi ở dòng `pty_party`.

- [ ] **Step 7: Chạy bộ migration cũ** (bảo đảm không vỡ bài chụp schema nào):

Run: `node --test src/migrations-*.test.ts src/audit-invariants.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 8: Commit**

```bash
git add migrations/0054_gop_ho_so.sql src/migrations-gop-ho-so.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md
git commit -m "$(cat <<'EOF'
Migration 0054: cột gộp hồ sơ + trigger bất biến (ADR-0068 Đ3)

Hồ sơ phụ trỏ về hồ sơ chính một lần duy nhất, không chuỗi, không mở lại —
CSDL giữ, không chỉ dựa vào máy chủ. Số 0054 là số giữ chỗ.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Luật thuần dùng chung — chuẩn hoá tên và cặp nghi trùng

**Files:**
- Create: `src/shared/ho-so-trung.ts`
- Create: `src/shared/ho-so-trung.test.ts`

**Interfaces:**
- Produces:
  - `chuanHoaTen(s: string): string`
  - `type LyDoKhop = "PHONE" | "NAME" | "LOGIN_PHONE"`; `NHAN_LY_DO_KHOP: Record<LyDoKhop, string>`
  - `interface CapNghiTrung { aId: string; bId: string; lyDo: LyDoKhop[] }` (aId < bId theo thứ tự chuỗi)
  - `capNghiTrung(v: { hoSo: { id: string; ten: string }[]; sdtLienHe: { partyId: string; so: string }[]; sdtDangNhap: { partyId: string; so: string }[] }, gioiHan?: number): { cap: CapNghiTrung[]; conNua: boolean }`

- [ ] **Step 1: Viết test đỏ** `src/shared/ho-so-trung.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_LY_DO_KHOP, capNghiTrung, chuanHoaTen } from "./ho-so-trung.ts";

const NFD = "Nguyễn Phú Hải"; // "Nguyễn Phú Hải" dạng tổ hợp rời (NFD)

test("chuanHoaTen: NFC, chữ thường kiểu Việt, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa (kể cả khoảng trắng không ngắt); GIỮ dấu", () => {
  assert.equal(chuanHoaTen("  NGUYỄN   Phú HẢI "), "nguyễn phú hải");
  assert.equal(chuanHoaTen(NFD), chuanHoaTen("Nguyễn Phú Hải"));
  assert.notEqual(chuanHoaTen("Nguyễn Phú Hai"), chuanHoaTen("Nguyễn Phú Hải"), "giữ dấu: Hai ≠ Hải");
  assert.equal(chuanHoaTen("ĐẶNG"), "đặng");
});

test("capNghiTrung: một cặp xuất hiện MỘT lần dù khớp nhiều lý do; lý do gộp và xếp PHONE, NAME, LOGIN_PHONE", () => {
  const r = capNghiTrung({
    hoSo: [{ id: "b", ten: "Nguyễn Phú Hải" }, { id: "a", ten: NFD }, { id: "c", ten: "Trần Văn C" }],
    sdtLienHe: [{ partyId: "a", so: "0901000001" }, { partyId: "b", so: "0901000001" }, { partyId: "c", so: "0902000002" }],
    sdtDangNhap: [{ partyId: "b", so: "0902000002" }],
  });
  assert.deepEqual(r.cap, [
    { aId: "a", bId: "b", lyDo: ["PHONE", "NAME"] },
    { aId: "b", bId: "c", lyDo: ["LOGIN_PHONE"] },
  ]);
  assert.equal(r.conNua, false);
});

test("capNghiTrung: SĐT / SĐT đăng nhập của hồ sơ KHÔNG nằm trong danh sách xét (đã gộp, đã ngưng, tổ chức) bị bỏ qua; một hồ sơ hai số cùng người không tự thành cặp", () => {
  const r = capNghiTrung({
    hoSo: [{ id: "a", ten: "A" }, { id: "b", ten: "B" }],
    sdtLienHe: [{ partyId: "a", so: "0901" }, { partyId: "a", so: "0901" }, { partyId: "x", so: "0901" }, { partyId: "b", so: "0902" }],
    sdtDangNhap: [{ partyId: "x", so: "0902" }, { partyId: "b", so: "0902" }],
  });
  assert.deepEqual(r.cap, []);
});

test("capNghiTrung: nhiều lý do đứng trước; cắt ở giới hạn và báo conNua", () => {
  const hoSo = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, ten: "Trùng Tên" }));
  const r = capNghiTrung({ hoSo, sdtLienHe: [{ partyId: "p3", so: "09" }, { partyId: "p4", so: "09" }], sdtDangNhap: [] }, 3);
  assert.equal(r.cap.length, 3);
  assert.deepEqual(r.cap[0], { aId: "p3", bId: "p4", lyDo: ["PHONE", "NAME"] });
  assert.equal(r.conNua, true);
});

test("NHAN_LY_DO_KHOP: đủ ba lý do, chữ tiếng Việt", () => {
  assert.deepEqual(Object.keys(NHAN_LY_DO_KHOP).sort(), ["LOGIN_PHONE", "NAME", "PHONE"]);
  for (const v of Object.values(NHAN_LY_DO_KHOP)) assert.match(v, /[à-ỹ]/);
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/shared/ho-so-trung.test.ts`
Expected: FAIL — `Cannot find module '…/ho-so-trung.ts'`.

- [ ] **Step 3: Cài đặt** `src/shared/ho-so-trung.ts`:

```ts
// Luật THUẦN của "hồ sơ nghi trùng" (ADR-0068 Đ8, Đ9; đặc tả T1, C1, C2) — dùng CHUNG máy chủ (parties: danh sách nghi trùng, hồ sơ khớp khi tạo tài khoản, ô
// "gõ lại tên" khi gộp) và giao diện (web/parties.ts, web/staff.ts). Không I/O. So tên GIỮ dấu: `lower()` của SQLite không thường hoá chữ có dấu nên việc so
// làm ở đây, bằng JS.

export type LyDoKhop = "PHONE" | "NAME" | "LOGIN_PHONE";
export const NHAN_LY_DO_KHOP: Record<LyDoKhop, string> = {
  PHONE: "Cùng số điện thoại",
  NAME: "Cùng họ tên",
  LOGIN_PHONE: "Số đăng nhập của tài khoản trùng số liên hệ",
};
const THU_TU: readonly LyDoKhop[] = ["PHONE", "NAME", "LOGIN_PHONE"];

/** Tên để so: Unicode NFC, chữ thường kiểu Việt, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa (cả khoảng trắng không ngắt). GIỮ dấu. */
export function chuanHoaTen(s: string): string {
  return s.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
}

export interface CapNghiTrung { aId: string; bId: string; lyDo: LyDoKhop[] }

/**
 * Các cặp hồ sơ nghi trùng trong tập `hoSo` (nơi gọi đã lọc: cá nhân, đang dùng, chưa gộp). Một cặp một lần, lý do gộp lại. SĐT của hồ sơ ngoài tập bị bỏ qua.
 * Xếp: nhiều lý do trước, rồi theo id. Cắt ở `gioiHan` (mặc định 300) và báo `conNua`.
 */
export function capNghiTrung(
  v: { hoSo: { id: string; ten: string }[]; sdtLienHe: { partyId: string; so: string }[]; sdtDangNhap: { partyId: string; so: string }[] },
  gioiHan = 300,
): { cap: CapNghiTrung[]; conNua: boolean } {
  const trongTap = new Set(v.hoSo.map((h) => h.id));
  const theoCap = new Map<string, Set<LyDoKhop>>();
  const them = (x: string, y: string, lyDo: LyDoKhop) => {
    if (x === y) return;
    const [a, b] = x < y ? [x, y] : [y, x];
    const k = `${a}|${b}`;
    const s = theoCap.get(k) ?? new Set<LyDoKhop>();
    s.add(lyDo);
    theoCap.set(k, s);
  };
  const nhom = (ds: { key: string; id: string }[]): string[][] => {
    const m = new Map<string, Set<string>>();
    for (const d of ds) m.set(d.key, (m.get(d.key) ?? new Set()).add(d.id));
    return [...m.values()].filter((s) => s.size > 1).map((s) => [...s]);
  };
  const lienHe = v.sdtLienHe.filter((c) => trongTap.has(c.partyId));
  for (const ids of nhom(lienHe.map((c) => ({ key: c.so, id: c.partyId })))) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) them(ids[i]!, ids[j]!, "PHONE");
  for (const ids of nhom(v.hoSo.map((h) => ({ key: chuanHoaTen(h.ten), id: h.id })))) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) them(ids[i]!, ids[j]!, "NAME");
  for (const d of v.sdtDangNhap) {
    if (!trongTap.has(d.partyId)) continue;
    for (const c of lienHe) if (c.so === d.so) them(d.partyId, c.partyId, "LOGIN_PHONE");
  }
  const cap = [...theoCap.entries()]
    .map(([k, s]) => {
      const [aId, bId] = k.split("|") as [string, string];
      return { aId, bId, lyDo: THU_TU.filter((l) => s.has(l)) };
    })
    .sort((x, y) => y.lyDo.length - x.lyDo.length || x.aId.localeCompare(y.aId) || x.bId.localeCompare(y.bId));
  return { cap: cap.slice(0, gioiHan), conNua: cap.length > gioiHan };
}
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `node --test src/shared/ho-so-trung.test.ts`
Expected: PASS (5 bài).

- [ ] **Step 5: Commit**

```bash
git add src/shared/ho-so-trung.ts src/shared/ho-so-trung.test.ts
git commit -m "$(cat <<'EOF'
Luật thuần hồ sơ nghi trùng: chuẩn hoá tên giữ dấu + ghép cặp (ADR-0068 Đ8)

Một nguồn cho máy chủ và giao diện; so tên bằng JS vì lower() của SQLite
không thường hoá chữ có dấu, và phải chịu được chữ tổ hợp rời (NFD).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Hàm thuần tính kế hoạch gộp (parties)

**Files:**
- Create: `src/modules/parties/gop.ts`
- Create: `src/modules/parties/gop.test.ts`

**Interfaces:**
- Consumes: không có (thuần, chỉ kiểu).
- Produces (Task 5, 6 dùng đúng tên này):

```ts
export type NhomVai = "INTERNAL" | "EXTERNAL" | "OTHER";
export interface LienHeGop { id: string; kind: string; value: string; valueNormalized: string; label: string | null; isPrimary: boolean; validFrom: string; validTo: string | null }
export interface CongViecGop { id: string; code: string; name: string; group: NhomVai; locationId: string | null; locationName: string | null; validFrom: string; validTo: string | null }
export interface QuanHeGop { id: string; typeCode: string; typeName: string; fromId: string; fromName: string; toId: string; toName: string; validFrom: string; validTo: string | null }
export interface GiayToGop { id: string; typeCode: string; typeName: string; className: string | null; previousId: string | null; voided: boolean; current: boolean }
export interface HoSoGop { id: string; kind: "PERSON" | "ORGANIZATION"; displayName: string; active: boolean; mergedIntoId: string | null; laCongTyChu: boolean; coTaiKhoan: boolean; coHoSoTroVao: boolean; lienHe: LienHeGop[]; congViec: CongViecGop[]; quanHe: QuanHeGop[]; giayTo: GiayToGop[] }
export interface NgoaiGop { phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number; donLechTien: string[] }
export type MaChanGop = "merge_same" | "merge_not_person" | "merge_inactive" | "merge_owner_company" | "merge_both_accounts" | "merge_source_has_account" | "merge_source_account_role" | "merge_role_group_conflict" | "merge_source_busy" | "merge_source_is_target" | "merge_source_future_row" | "merge_order_invalid" | "merge_source_owns_vehicle";
export interface LyDoChan { code: MaChanGop; message: string }
export interface KeHoachGop {
  chan: LyDoChan[];
  lienHe: { dong: LienHeGop[]; mo: { tu: LienHeGop; chinh: boolean }[]; bo: LienHeGop[] };
  congViec: { dong: CongViecGop[]; mo: CongViecGop[]; bo: { cv: CongViecGop; lyDo: "DA_CO" | "VUA_KET_THUC" }[] };
  quanHe: { dong: QuanHeGop[]; mo: { tu: QuanHeGop; fromId: string; toId: string }[]; chiDong: { qh: QuanHeGop; lyDo: "HAI_DAU_LA_MOT" | "DA_CO" | "VUA_KET_THUC" }[] };
  giayTo: { huy: GiayToGop[]; chep: GiayToGop[]; giu: GiayToGop[] };
  benThu3: string[];
}
export function keHoachGop(a: HoSoGop, b: HoSoGop, ngoai: NgoaiGop, homNay: string): KeHoachGop;
```

`huy` theo thứ tự PHẢI chạy (mới → cũ trong từng chuỗi gia hạn); `chep` = mọi dòng hiện hành của loại được chuyển; `dong` = mọi dòng còn mở của A (R7).

- [ ] **Step 1: Viết test đỏ** `src/modules/parties/gop.test.ts`:

```ts
// Hàm thuần kế hoạch gộp (ADR-0068 Đ1 bước 1–4, Đ2; đặc tả G4–G8, G11). Mỗi tiêu chí một ca, viết TRƯỚC khi có mã.
import { test } from "node:test";
import assert from "node:assert/strict";
import { keHoachGop, type CongViecGop, type GiayToGop, type HoSoGop, type KeHoachGop, type LienHeGop, type NgoaiGop, type QuanHeGop } from "./gop.ts";

const HOM_NAY = "2026-10-01";
const hs = (id: string, x: Partial<HoSoGop> = {}): HoSoGop => ({
  id, kind: "PERSON", displayName: `Người ${id}`, active: true, mergedIntoId: null, laCongTyChu: false, coTaiKhoan: false, coHoSoTroVao: false,
  lienHe: [], congViec: [], quanHe: [], giayTo: [], ...x,
});
const RANH: NgoaiGop = { phuTrachDon: 0, laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0, donLechTien: [] };
const sdt = (id: string, so: string, x: Partial<LienHeGop> = {}): LienHeGop => ({ id, kind: "PHONE", value: so, valueNormalized: so, label: null, isPrimary: false, validFrom: "2026-09-01", validTo: null, ...x });
const cv = (id: string, code: string, x: Partial<CongViecGop> = {}): CongViecGop => ({ id, code, name: code, group: "OTHER", locationId: null, locationName: null, validFrom: "2026-09-01", validTo: null, ...x });
const qh = (id: string, fromId: string, toId: string, x: Partial<QuanHeGop> = {}): QuanHeGop => ({ id, typeCode: "CONTACT_OF", typeName: "Người liên hệ của", fromId, fromName: fromId, toId, toName: toId, validFrom: "2026-09-01", validTo: null, ...x });
const gt = (id: string, typeCode: string, x: Partial<GiayToGop> = {}): GiayToGop => ({ id, typeCode, typeName: typeCode, className: null, previousId: null, voided: false, current: true, ...x });
const ma = (k: KeHoachGop) => k.chan.map((c) => c.code);
const ke = (a: HoSoGop, b: HoSoGop, ngoai: Partial<NgoaiGop> = {}) => keHoachGop(a, b, { ...RANH, ...ngoai }, HOM_NAY);

test("G1 nền: A có SĐT chính + Lái cano ở bến L1, B có tài khoản, không SĐT → chuyển cả hai, không chặn; mọi dòng mở của A đều đóng", () => {
  const k = ke(hs("a", { lienHe: [sdt("c1", "0901", { isPrimary: true })], congViec: [cv("r1", "BOAT_CAPTAIN", { locationId: "L1" })] }), hs("b", { coTaiKhoan: true }));
  assert.deepEqual(ma(k), []);
  assert.deepEqual(k.lienHe.mo.map((m) => [m.tu.id, m.chinh]), [["c1", true]]);
  assert.deepEqual(k.congViec.mo.map((r) => r.id), ["r1"]);
  assert.deepEqual(k.lienHe.dong.map((c) => c.id), ["c1"]);
  assert.deepEqual(k.congViec.dong.map((r) => r.id), ["r1"]);
});

test("G4 liên hệ: B đã có cùng số (chuẩn hoá) đang mở → bỏ vì đã có, không nhân đôi; A vẫn đóng dòng đó", () => {
  const k = ke(hs("a", { lienHe: [sdt("c1", "0901", { isPrimary: true })] }), hs("b", { lienHe: [sdt("c9", "0901", { isPrimary: true })] }));
  assert.deepEqual(k.lienHe.mo, []);
  assert.deepEqual(k.lienHe.bo.map((c) => c.id), ["c1"]);
  assert.deepEqual(k.lienHe.dong.map((c) => c.id), ["c1"]);
});

test("G5 liên hệ chính: B có SĐT chính Y, A có SĐT chính X → X sang B KHÔNG chính; B không có email chính → email chính của A giữ cờ chính", () => {
  const k = ke(
    hs("a", { lienHe: [sdt("x", "0901", { isPrimary: true }), sdt("e", "a@vidu.vn", { kind: "EMAIL", isPrimary: true })] }),
    hs("b", { lienHe: [sdt("y", "0902", { isPrimary: true })] }),
  );
  assert.deepEqual(k.lienHe.mo.map((m) => [m.tu.id, m.chinh]).sort(), [["e", true], ["x", false]]);
});

test("G4 công việc: B đang có cùng việc cùng nơi → bỏ (DA_CO); B vừa kết thúc hôm nay → bỏ (VUA_KET_THUC, không vướng trigger chồng lấn); B kết thúc hôm qua → chuyển", () => {
  const a = hs("a", { congViec: [cv("r1", "BOAT_CAPTAIN", { locationId: "L1" }), cv("r2", "GUIDE", { locationId: "L1" }), cv("r3", "AGENT")] });
  const b = hs("b", {
    congViec: [
      cv("s1", "BOAT_CAPTAIN", { locationId: "L1" }),
      cv("s2", "GUIDE", { locationId: "L1", validTo: HOM_NAY }),
      cv("s3", "AGENT", { validTo: "2026-09-30" }),
      cv("s4", "BOAT_CAPTAIN", { locationId: "L2" }),
    ],
  });
  const k = ke(a, b);
  assert.deepEqual(k.congViec.bo.map((x) => [x.cv.id, x.lyDo]), [["r1", "DA_CO"], ["r2", "VUA_KET_THUC"]]);
  assert.deepEqual(k.congViec.mo.map((r) => r.id), ["r3"]);
});

test("R7: dòng đã đóng trước hôm nay hoặc đúng hôm nay của A không chuyển, không đóng lại", () => {
  const k = ke(hs("a", { lienHe: [sdt("c1", "0901", { validTo: HOM_NAY })], congViec: [cv("r1", "AGENT", { validTo: "2026-09-20" })] }), hs("b"));
  assert.deepEqual([k.lienHe.dong, k.lienHe.mo, k.congViec.dong, k.congViec.mo], [[], [], [], []]);
});

test("G6 quan hệ: A 'Người liên hệ của' C → B–C mở, A–C đóng, C vào danh sách bên thứ ba; quan hệ A↔B chỉ đóng (không sinh B↔B); B đã có quan hệ y hệt → chỉ đóng", () => {
  const a = hs("a", { quanHe: [qh("q1", "a", "c"), qh("q2", "b", "a"), qh("q3", "a", "d")] });
  const b = hs("b", { quanHe: [qh("q2", "b", "a"), qh("q9", "b", "d")] });
  const k = ke(a, b);
  assert.deepEqual(k.quanHe.mo.map((m) => [m.tu.id, m.fromId, m.toId]), [["q1", "b", "c"]]);
  assert.deepEqual(k.quanHe.chiDong.map((x) => [x.qh.id, x.lyDo]), [["q2", "HAI_DAU_LA_MOT"], ["q3", "DA_CO"]]);
  assert.deepEqual(k.quanHe.dong.map((x) => x.id), ["q1", "q2", "q3"]);
  assert.deepEqual(k.benThu3, ["c", "d"]);
});

test("Review Focus 5: A là nhà xe cá nhân, D 'Tài xế của' A → vai Nhà xe chuyển sang B, quan hệ thành D → B; B là tài xế của A → chỉ đóng", () => {
  const a = hs("a", { congViec: [cv("r1", "CARRIER")], quanHe: [qh("q1", "d", "a", { typeCode: "DRIVES_FOR" }), qh("q2", "b", "a", { typeCode: "DRIVES_FOR" })] });
  const k = ke(a, hs("b"));
  assert.deepEqual(k.congViec.mo.map((r) => r.code), ["CARRIER"]);
  assert.deepEqual(k.quanHe.mo.map((m) => [m.fromId, m.toId, m.tu.typeCode]), [["d", "b", "DRIVES_FOR"]]);
  assert.deepEqual(k.quanHe.chiDong.map((x) => x.lyDo), ["HAI_DAU_LA_MOT"]);
});

test("G8 giấy tờ: A có bằng lái hiện hành, B không → huỷ ở A, chép sang B; B đã có bằng lái hiện hành → giữ ở A (không huỷ, không chép)", () => {
  const k1 = ke(hs("a", { giayTo: [gt("g1", "GPLX", { className: "D2" })] }), hs("b"));
  assert.deepEqual([k1.giayTo.huy.map((d) => d.id), k1.giayTo.chep.map((d) => d.id), k1.giayTo.giu], [["g1"], ["g1"], []]);
  const k2 = ke(hs("a", { giayTo: [gt("g1", "GPLX")] }), hs("b", { giayTo: [gt("h1", "GPLX")] }));
  assert.deepEqual([k2.giayTo.huy, k2.giayTo.chep, k2.giayTo.giu.map((d) => d.id)], [[], [], ["g1"]]);
});

test("G8 chuỗi gia hạn CCCD: hai dòng cùng số (c2 gia hạn c1), B không có CCCD → huỷ c2 TRƯỚC rồi c1; chép đúng một dòng (c2); dòng đã huỷ sẵn bỏ qua", () => {
  const a = hs("a", { giayTo: [gt("c1", "CCCD", { current: false }), gt("c2", "CCCD", { previousId: "c1" }), gt("c0", "CCCD", { voided: true, current: false })] });
  const k = ke(a, hs("b"));
  assert.deepEqual(k.giayTo.huy.map((d) => d.id), ["c2", "c1"]);
  assert.deepEqual(k.giayTo.chep.map((d) => d.id), ["c2"]);
});

test("G11: mỗi điều kiện chặn một mã riêng (409 ở route)", () => {
  const ca: [string, HoSoGop, HoSoGop, Partial<NgoaiGop>][] = [
    ["merge_same", hs("a"), hs("a"), {}],
    ["merge_not_person", hs("a", { kind: "ORGANIZATION" }), hs("b"), {}],
    ["merge_inactive", hs("a"), hs("b", { active: false }), {}],
    ["merge_inactive", hs("a", { mergedIntoId: "z" }), hs("b"), {}],
    ["merge_owner_company", hs("a"), hs("b", { laCongTyChu: true }), {}],
    ["merge_source_has_account", hs("a", { coTaiKhoan: true }), hs("b"), {}],
    ["merge_both_accounts", hs("a", { coTaiKhoan: true }), hs("b", { coTaiKhoan: true }), {}],
    ["merge_source_account_role", hs("a", { congViec: [cv("r", "DRIVER_INTERNAL", { group: "INTERNAL" })] }), hs("b"), {}],
    ["merge_source_busy", hs("a"), hs("b"), { phuTrachDon: 2 }],
    ["merge_source_busy", hs("a"), hs("b"), { laiChuyen: 1 }],
    ["merge_source_busy", hs("a"), hs("b"), { toLaiChuyen: 1 }],
    ["merge_source_busy", hs("a"), hs("b"), { chuXeChuyen: 1 }],
    ["merge_source_is_target", hs("a", { coHoSoTroVao: true }), hs("b"), {}],
    ["merge_source_future_row", hs("a", { congViec: [cv("r", "AGENT", { validFrom: "2026-10-05" })] }), hs("b"), {}], // [Dừng Q5]
    ["merge_order_invalid", hs("a"), hs("b"), { donLechTien: ["TD-0001"] }],
    ["merge_source_owns_vehicle", hs("a"), hs("b"), { soXe: 1 }], // [Dừng Q2]
  ];
  for (const [code, a, b, ngoai] of ca) assert.ok(ma(ke(a, b, ngoai)).includes(code as never), `${code}: ${JSON.stringify(ma(ke(a, b, ngoai)))}`);
  const busy = ke(hs("a"), hs("b"), { phuTrachDon: 2, laiChuyen: 1 }).chan.find((c) => c.code === "merge_source_busy")!;
  assert.match(busy.message, /phụ trách 2 đơn/);
  assert.match(busy.message, /lái 1 chuyến/);
  assert.match(ke(hs("a"), hs("b"), { donLechTien: ["TD-0001"] }).chan[0]!.message, /TD-0001/);
  for (const [, a, b, ngoai] of ca) for (const c of ke(a, b, ngoai).chan) assert.match(c.message, /[à-ỹ]/, `câu tiếng Việt có dấu: ${c.code}`);
});

test("R6 LC-3 (chỉ tới được ở mức hàm thuần): B giữ vai nội bộ, A giữ vai bên ngoài → có merge_role_group_conflict (kèm merge_source_account_role)", () => {
  const k = ke(hs("a", { congViec: [cv("r", "TRAVEL_AGENCY", { group: "EXTERNAL" })] }), hs("b", { congViec: [cv("s", "SALES_STAFF", { group: "INTERNAL" })] }));
  assert.deepEqual(ma(k).sort(), ["merge_role_group_conflict", "merge_source_account_role"]);
});

test("có chặn vẫn trả đủ phần chuyển / giữ / bỏ (xem trước hiện cả hai)", () => {
  const k = ke(hs("a", { lienHe: [sdt("c1", "0901")] }), hs("b"), { phuTrachDon: 1 });
  assert.deepEqual(ma(k), ["merge_source_busy"]);
  assert.equal(k.lienHe.mo.length, 1);
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/modules/parties/gop.test.ts`
Expected: FAIL — `Cannot find module '…/gop.ts'`.

- [ ] **Step 3: Cài đặt** `src/modules/parties/gop.ts`:

```ts
// Luật THUẦN của gộp hồ sơ cá nhân (ADR-0068 Đ1 bước 1–4, Đ2). Không I/O: route đọc hai hồ sơ + phần của module khác (qua ctx.gopHoSo) rồi gọi hàm này; bộ dựng
// lô (gop-lo.ts) biến kế hoạch thành câu lệnh. Dùng cho CẢ xem trước lẫn gộp thật (route gộp TÍNH LẠI, không tin xem trước). Không bao giờ chứa số giấy tờ.
// "Còn mở" = valid_to_date IS NULL hoặc > hôm nay (giờ VN) — dòng đóng đúng hôm nay coi là "vừa kết thúc" (kế hoạch R7).

export type NhomVai = "INTERNAL" | "EXTERNAL" | "OTHER";
export interface LienHeGop { id: string; kind: string; value: string; valueNormalized: string; label: string | null; isPrimary: boolean; validFrom: string; validTo: string | null }
export interface CongViecGop { id: string; code: string; name: string; group: NhomVai; locationId: string | null; locationName: string | null; validFrom: string; validTo: string | null }
export interface QuanHeGop { id: string; typeCode: string; typeName: string; fromId: string; fromName: string; toId: string; toName: string; validFrom: string; validTo: string | null }
export interface GiayToGop { id: string; typeCode: string; typeName: string; className: string | null; previousId: string | null; voided: boolean; current: boolean }
export interface HoSoGop {
  id: string;
  kind: "PERSON" | "ORGANIZATION";
  displayName: string;
  active: boolean;
  mergedIntoId: string | null;
  laCongTyChu: boolean;
  coTaiKhoan: boolean;
  /** Đã có hồ sơ khác gộp VÀO hồ sơ này (ADR-0068 Đ3 — không chuỗi). */
  coHoSoTroVao: boolean;
  lienHe: LienHeGop[];
  congViec: CongViecGop[];
  quanHe: QuanHeGop[];
  giayTo: GiayToGop[];
}
/** Phần của module khác, gốc lắp ráp đếm (ctx.gopHoSo) — parties không đọc dsp_ / vc_ / orders. */
export interface NgoaiGop { phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number; donLechTien: string[] }
export type MaChanGop =
  | "merge_same" | "merge_not_person" | "merge_inactive" | "merge_owner_company" | "merge_both_accounts" | "merge_source_has_account" | "merge_source_account_role"
  | "merge_role_group_conflict" | "merge_source_busy" | "merge_source_is_target" | "merge_source_future_row" | "merge_order_invalid" | "merge_source_owns_vehicle";
export interface LyDoChan { code: MaChanGop; message: string }
export interface KeHoachGop {
  chan: LyDoChan[];
  lienHe: { dong: LienHeGop[]; mo: { tu: LienHeGop; chinh: boolean }[]; bo: LienHeGop[] };
  congViec: { dong: CongViecGop[]; mo: CongViecGop[]; bo: { cv: CongViecGop; lyDo: "DA_CO" | "VUA_KET_THUC" }[] };
  quanHe: { dong: QuanHeGop[]; mo: { tu: QuanHeGop; fromId: string; toId: string }[]; chiDong: { qh: QuanHeGop; lyDo: "HAI_DAU_LA_MOT" | "DA_CO" | "VUA_KET_THUC" }[] };
  /** `huy` theo thứ tự PHẢI chạy (mới → cũ trong mỗi chuỗi gia hạn — trigger *_superseded). */
  giayTo: { huy: GiayToGop[]; chep: GiayToGop[]; giu: GiayToGop[] };
  /** Hồ sơ ở đầu kia của quan hệ bị chuyển / đóng — route xét cấp bậc từng hồ sơ (kế hoạch R4). */
  benThu3: string[];
}

const CAU: Record<Exclude<MaChanGop, "merge_source_busy" | "merge_order_invalid">, string> = {
  merge_same: "Hồ sơ phụ và hồ sơ chính phải là hai hồ sơ khác nhau.",
  merge_not_person: "Chỉ gộp được hai hồ sơ cá nhân (chưa gộp được hồ sơ tổ chức).",
  merge_inactive: "Một trong hai hồ sơ đã ngưng dùng hoặc đã gộp vào hồ sơ khác.",
  merge_owner_company: "Không gộp được hồ sơ công ty chủ.",
  merge_both_accounts: "Cả hai hồ sơ đều có tài khoản — không gộp được.",
  merge_source_has_account: "Hồ sơ phụ có tài khoản: hãy chọn hồ sơ có tài khoản làm hồ sơ chính.",
  merge_source_account_role: "Hồ sơ phụ đang giữ vai quyết định quyền đăng nhập (nội bộ hoặc bên ngoài) — kết thúc vai đó ở màn Quản lý tài khoản trước.",
  merge_role_group_conflict: "Sau khi gộp, hồ sơ chính sẽ vừa giữ vai nội bộ vừa giữ vai bên ngoài — không được.",
  merge_source_is_target: "Đã có hồ sơ khác gộp vào hồ sơ phụ này — hãy chọn nó làm hồ sơ chính (không gộp nối tiếp).",
  merge_source_future_row: "Hồ sơ phụ có công việc hoặc quan hệ bắt đầu sau hôm nay — kết thúc hoặc sửa dòng đó trước khi gộp.",
  merge_source_owns_vehicle: "Hồ sơ phụ đang đứng tên xe — đổi chủ xe ở mục Xe trước khi gộp.",
};
const chanCo = (code: keyof typeof CAU): LyDoChan => ({ code, message: CAU[code] });
const conMo = (validTo: string | null, homNay: string): boolean => validTo === null || validTo > homNay;
const cungNoi = (x: string | null, y: string | null): boolean => (x ?? "") === (y ?? "");

/** Thứ tự huỷ một nhóm giấy tờ cùng loại: luôn lấy dòng KHÔNG còn dòng gia hạn nào trong nhóm (mới nhất của chuỗi) trước. */
function thuTuHuy(ds: GiayToGop[]): GiayToGop[] {
  const con = [...ds].sort((x, y) => x.id.localeCompare(y.id));
  const ra: GiayToGop[] = [];
  while (con.length > 0) {
    const i = con.findIndex((r) => !con.some((x) => x.previousId === r.id));
    ra.push(con.splice(i === -1 ? 0 : i, 1)[0]!);
  }
  return ra;
}

export function keHoachGop(a: HoSoGop, b: HoSoGop, ngoai: NgoaiGop, homNay: string): KeHoachGop {
  const chan: LyDoChan[] = [];
  const ke: KeHoachGop = {
    chan,
    lienHe: { dong: [], mo: [], bo: [] },
    congViec: { dong: [], mo: [], bo: [] },
    quanHe: { dong: [], mo: [], chiDong: [] },
    giayTo: { huy: [], chep: [], giu: [] },
    benThu3: [],
  };
  if (a.id === b.id) {
    chan.push(chanCo("merge_same"));
    return ke;
  }

  // ---- Đ2: điều kiện ------------------------------------------------------------------------------------------------
  if (a.kind !== "PERSON" || b.kind !== "PERSON") chan.push(chanCo("merge_not_person"));
  if (!a.active || a.mergedIntoId !== null || !b.active || b.mergedIntoId !== null) chan.push(chanCo("merge_inactive"));
  if (a.laCongTyChu || b.laCongTyChu) chan.push(chanCo("merge_owner_company"));
  if (a.coTaiKhoan && b.coTaiKhoan) chan.push(chanCo("merge_both_accounts"));
  else if (a.coTaiKhoan) chan.push(chanCo("merge_source_has_account"));
  const vaiMoA = a.congViec.filter((r) => r.validFrom <= homNay && conMo(r.validTo, homNay));
  if (vaiMoA.some((r) => r.group !== "OTHER")) chan.push(chanCo("merge_source_account_role"));
  const nhomSau = new Set([...b.congViec.filter((r) => conMo(r.validTo, homNay)).map((r) => r.group), ...vaiMoA.map((r) => r.group)]);
  if (nhomSau.has("INTERNAL") && nhomSau.has("EXTERNAL")) chan.push(chanCo("merge_role_group_conflict"));
  const ban = [
    ngoai.phuTrachDon > 0 ? `phụ trách ${ngoai.phuTrachDon} đơn chưa xong` : null,
    ngoai.laiChuyen > 0 ? `lái ${ngoai.laiChuyen} chuyến chưa chốt` : null,
    ngoai.toLaiChuyen > 0 ? `đi kèm ${ngoai.toLaiChuyen} chuyến chưa chốt` : null,
    ngoai.chuXeChuyen > 0 ? `là nhà xe của ${ngoai.chuXeChuyen} chuyến chưa chốt` : null,
  ].filter((x): x is string => x !== null);
  if (ban.length > 0) chan.push({ code: "merge_source_busy", message: `Hồ sơ phụ đang có việc chưa xong: ${ban.join(", ")}. Đổi người trước khi gộp.` });
  if (a.coHoSoTroVao) chan.push(chanCo("merge_source_is_target"));
  // [Dừng Q5] — khuyến nghị: chặn dòng bắt đầu sau hôm nay (câu đóng dòng đòi ngày đóng ≥ ngày bắt đầu).
  if (a.congViec.some((r) => r.validFrom > homNay) || a.quanHe.some((x) => x.validFrom > homNay)) chan.push(chanCo("merge_source_future_row"));
  if (ngoai.donLechTien.length > 0) {
    chan.push({ code: "merge_order_invalid", message: `Đơn ${ngoai.donLechTien.join(", ")} của hồ sơ phụ đang lệch số tiền — sửa đơn trước khi gộp.` });
  }
  // [Dừng Q2] — khuyến nghị: chặn khi hồ sơ phụ đứng tên xe.
  if (ngoai.soXe > 0) chan.push(chanCo("merge_source_owns_vehicle"));

  // ---- Đ1 bước 1: liên hệ ---------------------------------------------------------------------------------------------
  const lhMoA = a.lienHe.filter((c) => conMo(c.validTo, homNay));
  const lhMoB = b.lienHe.filter((c) => conMo(c.validTo, homNay));
  ke.lienHe.dong = lhMoA;
  const daCoChinh = new Set(lhMoB.filter((c) => c.isPrimary).map((c) => c.kind));
  const trung = (x: LienHeGop, y: LienHeGop) => x.kind === y.kind && x.valueNormalized === y.valueNormalized;
  for (const c of [...lhMoA].sort((x, y) => Number(y.isPrimary) - Number(x.isPrimary))) {
    if (lhMoB.some((x) => trung(x, c)) || ke.lienHe.mo.some((m) => trung(m.tu, c))) {
      ke.lienHe.bo.push(c);
      continue;
    }
    const chinh = c.isPrimary && !daCoChinh.has(c.kind);
    if (chinh) daCoChinh.add(c.kind);
    ke.lienHe.mo.push({ tu: c, chinh });
  }

  // ---- Đ1 bước 2: công việc (chỉ nhóm OTHER được chuyển; nhóm tài khoản đã bị chặn ở trên) ------------------------------------------
  ke.congViec.dong = vaiMoA;
  for (const r of vaiMoA.filter((x) => x.group === "OTHER")) {
    const cung = b.congViec.filter((x) => x.code === r.code && cungNoi(x.locationId, r.locationId));
    if (cung.some((x) => conMo(x.validTo, homNay) || x.validFrom > homNay)) ke.congViec.bo.push({ cv: r, lyDo: "DA_CO" });
    else if (cung.some((x) => x.validTo === homNay)) ke.congViec.bo.push({ cv: r, lyDo: "VUA_KET_THUC" });
    else ke.congViec.mo.push(r);
  }

  // ---- Đ1 bước 3: quan hệ ----------------------------------------------------------------------------------------------
  const qhMoA = a.quanHe.filter((x) => x.validFrom <= homNay && conMo(x.validTo, homNay));
  ke.quanHe.dong = qhMoA;
  for (const x of qhMoA) {
    const khac = x.fromId === a.id ? x.toId : x.fromId;
    if (khac === b.id) {
      ke.quanHe.chiDong.push({ qh: x, lyDo: "HAI_DAU_LA_MOT" });
      continue;
    }
    if (!ke.benThu3.includes(khac)) ke.benThu3.push(khac);
    const fromId = x.fromId === a.id ? b.id : x.fromId;
    const toId = x.toId === a.id ? b.id : x.toId;
    const cung = b.quanHe.filter((y) => y.fromId === fromId && y.toId === toId && y.typeCode === x.typeCode);
    if (cung.some((y) => conMo(y.validTo, homNay) || y.validFrom > homNay)) ke.quanHe.chiDong.push({ qh: x, lyDo: "DA_CO" });
    else if (cung.some((y) => y.validTo === homNay)) ke.quanHe.chiDong.push({ qh: x, lyDo: "VUA_KET_THUC" });
    else ke.quanHe.mo.push({ tu: x, fromId, toId });
  }

  // ---- Đ1 bước 4 + Đ4: giấy tờ ----------------------------------------------------------------------------------------
  const theoLoai = new Map<string, GiayToGop[]>();
  for (const d of a.giayTo.filter((x) => !x.voided)) theoLoai.set(d.typeCode, [...(theoLoai.get(d.typeCode) ?? []), d]);
  for (const [loai, ds] of theoLoai) {
    if (b.giayTo.some((d) => d.typeCode === loai && d.current)) {
      ke.giayTo.giu.push(...ds);
      continue;
    }
    ke.giayTo.huy.push(...thuTuHuy(ds));
    ke.giayTo.chep.push(...ds.filter((d) => d.current));
  }
  return ke;
}
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `node --test src/modules/parties/gop.test.ts`
Expected: PASS (12 bài).

- [ ] **Step 5: Commit**

```bash
git add src/modules/parties/gop.ts src/modules/parties/gop.test.ts
git commit -m "$(cat <<'EOF'
Gộp hồ sơ: hàm thuần tính kế hoạch (ADR-0068 Đ1, Đ2)

Một hàm cho cả xem trước lẫn gộp thật: chuyển liên hệ / công việc / quan hệ /
giấy tờ còn hiệu lực, không nhân đôi, tránh chồng lấn ngày, huỷ chuỗi CCCD
đúng thứ tự; mọi điều kiện chặn ra mã riêng. Có test trước khi có mã.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Phần của module khác — hàm đọc / câu chưa chạy + tiêm `ctx.gopHoSo` ở gốc lắp ráp

**Files:**
- Create: `src/modules/orders/nguoi-dat-gop-repo.ts`, `src/modules/orders/nguoi-dat-gop.test.ts`
- Modify: `src/modules/orders/index.ts` (xuất lại hai hàm)
- Modify: `src/modules/dispatch/repository.ts`, `src/modules/dispatch/index.ts`; Create: `src/modules/dispatch/so-don-phu-trach.test.ts`
- Modify: `src/modules/van-chuyen/chuyen-repo.ts`, `src/modules/van-chuyen/index.ts`; Create: `src/modules/van-chuyen/viec-xe-cua-nguoi.test.ts` [Dừng Q3]
- Modify: `src/modules/billing/repository.ts`, `src/modules/billing/index.ts`; Create: `src/modules/billing/so-dong-no.test.ts` [Dừng Q3]
- Modify: `src/modules/staff/repository.ts`, `src/modules/staff/index.ts`
- Modify: `src/shared/router.ts`, `src/index.ts`, `src/architecture.test.ts`

**Interfaces:**
- Produces (Task 6, 7 dùng):

```ts
// src/shared/router.ts
export interface ViecCuaHoSo { phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number }
export interface DonCuaNguoiDatTom { doi: number; giuDaGiao: number; giuDaHuy: number; lechTien: string[] }
export interface GopHoSoNoi {
  viecCua: (partyId: string) => Promise<ViecCuaHoSo>;
  donNguoiDat: (partyId: string) => Promise<DonCuaNguoiDatTom>;
  cauDoiDon: (tuPartyId: string, sangPartyId: string, at: string) => D1PreparedStatement;
  soDongNo: (partyId: string) => Promise<number>;
  soDangNhap: () => Promise<{ partyId: string; phone: string }[]>;
}
// Ctx: gopHoSo: GopHoSoNoi;   AppOptions.injected: gopHoSo: (env: Env) => GopHoSoNoi;
// orders:     donCuaNguoiDat(db, partyId): Promise<DonCuaNguoiDatTom>; cauDoiNguoiDat(db, tu, sang, at): D1PreparedStatement
// dispatch:   soDonDangPhuTrachCua(db, partyId): Promise<number>
// van-chuyen: viecXeCuaNguoi(db, partyId): Promise<{ laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number }>
// billing:    soDongNoCuaNguoi(db, partyId): Promise<number>
// staff:      soDangNhapTheoHoSo(db): Promise<{ partyId: string; phone: string }[]>
```

- [ ] **Step 1: Test đỏ cho orders** `src/modules/orders/nguoi-dat-gop.test.ts`:

```ts
// ADR-0068 Đ1 bước 5 (G7): đơn nháp / đã xác nhận CHƯA giao của người đặt A đổi sang B, updated_at tăng NGHIÊM NGẶT (khoá lạc quan của người đang sửa đơn bắt
// được, kể cả cùng mili-giây — Review Focus 2); đơn đã giao / đã huỷ giữ A; lính gác "A còn đang dùng"; đơn lệch tiền được báo theo mã đơn.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { cauDoiNguoiDat, donCuaNguoiDat } from "./nguoi-dat-gop-repo.ts";

const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
function nguoi(w: any, id: string) {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, `Khách ${id}`, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, id, AT, AT);
}
/** Đơn `id` của người đặt `booker` ở trạng thái `trangThai` (nháp / xác nhận / đã giao / đã huỷ) — đi đúng các trigger (xác nhận cần dịch vụ có ngày). */
function don(w: any, id: string, booker: string, trangThai: "draft" | "confirmed" | "delivered" | "cancelled") {
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at, booker_party_id)
    VALUES (?, ?, ?, 'draft', 'Khách', '0900000099', 100000, 100000, 100000, ?, ?, ?)`).run(id, `TD-${id}`, SA, AT, AT, booker);
  w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-10-10')").run(`sv-${id}`, id);
  if (trangThai === "cancelled") w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
  if (trangThai === "confirmed" || trangThai === "delivered") w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, id);
  if (trangThai === "delivered") w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(AT, SA, id);
}
function nen() {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  nguoi(w, "pa"); nguoi(w, "pb"); nguoi(w, "pc");
  don(w, "o1", "pa", "draft"); don(w, "o2", "pa", "confirmed"); don(w, "o3", "pa", "delivered"); don(w, "o4", "pa", "cancelled"); don(w, "o5", "pc", "draft");
  return w;
}
const booker = (w: any, id: string) => w.q("SELECT booker_party_id b, updated_at u FROM orders WHERE id = ?", id)[0];

test("donCuaNguoiDat: đếm đơn sẽ đổi / giữ, không đơn lệch tiền", async () => {
  const w = nen();
  assert.deepEqual(await donCuaNguoiDat(w.env.DB, "pa"), { doi: 2, giuDaGiao: 1, giuDaHuy: 1, lechTien: [] });
});

test("G7: câu đổi người đặt chỉ chạm đơn nháp + đã xác nhận chưa giao; updated_at = mốc lô", async () => {
  const w = nen();
  const at = "2026-10-01T02:00:00.000Z";
  const [r] = await w.env.DB.batch([cauDoiNguoiDat(w.env.DB, "pa", "pb", at)]);
  assert.equal(r.meta.changes, 2);
  assert.deepEqual([booker(w, "o1"), booker(w, "o2")].map((x) => [x.b, x.u]), [["pb", at], ["pb", at]]);
  assert.deepEqual(["o3", "o4"].map((id) => booker(w, id).b), ["pa", "pa"]);
  assert.equal(booker(w, "o5").b, "pc");
});

test("Review Focus 2: đơn có updated_at BẰNG hoặc SAU mốc lô → vẫn tăng nghiêm ngặt (lần lưu mang mốc cũ khớp 0 dòng)", async () => {
  const w = nen();
  const at = "2026-10-01T02:00:00.000Z";
  w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = 'o1'").run(at);
  await w.env.DB.batch([cauDoiNguoiDat(w.env.DB, "pa", "pb", at)]);
  const sau = booker(w, "o1").u as string;
  assert.ok(sau > at, `mốc mới ${sau} phải > ${at}`);
  assert.equal(w.sqlite.prepare("UPDATE orders SET customer_name = 'X' WHERE id = 'o1' AND updated_at = ?").run(at).changes, 0, "lần lưu mang mốc cũ bị khoá lạc quan chặn");
});

test("lính gác: A đã ngưng (lô khác vừa gộp) → câu đổi không chạm dòng nào", async () => {
  const w = nen();
  w.sqlite.prepare("UPDATE pty_party SET active = 0 WHERE id = 'pa'").run();
  const [r] = await w.env.DB.batch([cauDoiNguoiDat(w.env.DB, "pa", "pb", "2026-10-01T02:00:00.000Z")]);
  assert.equal(r.meta.changes, 0);
});

test("đơn chưa giao đang lệch tiền (dữ liệu cũ) → trả mã đơn để máy chủ từ chối gộp", async () => {
  const w = nen();
  w.sqlite.exec("DROP TRIGGER orders_money_update"); // chỉ trong DB thử: gieo dữ liệu cũ lệch tiền
  w.sqlite.prepare("UPDATE orders SET total = 1 WHERE id = 'o2'").run();
  assert.deepEqual((await donCuaNguoiDat(w.env.DB, "pa")).lechTien, ["TD-o2"]);
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/modules/orders/nguoi-dat-gop.test.ts`
Expected: FAIL — `Cannot find module '…/nguoi-dat-gop-repo.ts'`.

- [ ] **Step 3: Cài đặt** `src/modules/orders/nguoi-dat-gop-repo.ts`:

```ts
// TỆP SQL "NỬA NGHIÊM" thứ ba của module orders (ADR-0068 Đ1 bước 5, Đ6; hằng `NUA_NGHIEM` ở src/architecture.test.ts): đọc đơn theo người đặt và câu CHƯA CHẠY đổi
// người đặt khi gộp hồ sơ. CHỈ gốc lắp ráp (src/index.ts) gọi — qua ctx.gopHoSo của route gộp ở parties (parties không import orders). Mọi câu qua defineSql,
// đọc hồ sơ CHỈ qua view công bố v_pty_party_label. Import đuôi .ts, không import module khác.
import { defineSql } from "../../shared/sql-registry.ts";

/** Cùng điều kiện với trigger orders_money_update (0007): đơn thoả điều kiện này thì MỌI câu UPDATE lên nó bị CSDL từ chối. */
const LECH_TIEN = `(o.subtotal < 0 OR o.discount < 0 OR o.deposit_amount < 0 OR o.total IS NOT o.subtotal - o.discount
  OR o.remaining_amount IS NOT o.total - o.deposit_amount OR o.remaining_amount < 0 OR (o.deposit_amount > 0 AND o.deposit_method IS NULL))`;
const DON_CUA_NGUOI_DAT = defineSql(
  "orders",
  "don_cua_nguoi_dat",
  `SELECT o.order_code, o.status, o.delivered_at, ${LECH_TIEN} AS lech FROM orders o WHERE o.booker_party_id = ?1 ORDER BY o.order_code`,
);
// ?1 người đặt cũ (A), ?2 người đặt mới (B), ?3 mốc lô (ISO UTC). updated_at tăng NGHIÊM NGẶT (khuôn nextStamp của repository.ts): mốc lô nếu lớn hơn, không
// thì mốc cũ + 1 mili-giây. Lính gác: A còn đang dùng (lô thua cuộc đua gộp — A đã bị lật — thì không chạm đơn nào), B là cá nhân đang dùng.
const DOI_NGUOI_DAT = defineSql(
  "orders",
  "doi_nguoi_dat_gop",
  `UPDATE orders SET booker_party_id = ?2,
     updated_at = CASE WHEN ?3 > updated_at THEN ?3 ELSE strftime('%Y-%m-%dT%H:%M:%fZ', updated_at, '+0.001 seconds') END
   WHERE booker_party_id = ?1 AND status IN ('draft', 'confirmed') AND delivered_at IS NULL
     AND EXISTS (SELECT 1 FROM v_pty_party_label WHERE id = ?1 AND active = 1)
     AND EXISTS (SELECT 1 FROM v_pty_party_label WHERE id = ?2 AND active = 1 AND party_kind = 'PERSON')`,
);

export interface DonCuaNguoiDatTom { doi: number; giuDaGiao: number; giuDaHuy: number; lechTien: string[] }
export async function donCuaNguoiDat(db: D1Database, partyId: string): Promise<DonCuaNguoiDatTom> {
  const { results } = await db.prepare(DON_CUA_NGUOI_DAT).bind(partyId).all<{ order_code: string; status: string; delivered_at: string | null; lech: number }>();
  const seDoi = results.filter((r) => r.status !== "cancelled" && r.delivered_at === null);
  return {
    doi: seDoi.length,
    giuDaGiao: results.filter((r) => r.delivered_at !== null).length,
    giuDaHuy: results.filter((r) => r.status === "cancelled").length,
    lechTien: seDoi.filter((r) => r.lech === 1).map((r) => r.order_code),
  };
}
export const cauDoiNguoiDat = (db: D1Database, tuPartyId: string, sangPartyId: string, at: string): D1PreparedStatement =>
  db.prepare(DOI_NGUOI_DAT).bind(tuPartyId, sangPartyId, at);
```

Thêm vào cuối khối export của `src/modules/orders/index.ts` (cạnh dòng `export { datGiaoStatement, hoanThanhStatement, … } from "./hoan-tat-repo";`):

```ts
// ADR-0068 Đ1 bước 5: CHỈ gốc lắp ráp gọi (ctx.gopHoSo của route gộp hồ sơ) — bài siết ở src/architecture.test.ts.
export { cauDoiNguoiDat, donCuaNguoiDat, type DonCuaNguoiDatTom } from "./nguoi-dat-gop-repo";
```

Thêm vào `NUA_NGHIEM` của `src/architecture.test.ts`:

```ts
  // ADR-0068 Đ1 bước 5 (SIẾT): đọc đơn theo người đặt + câu đổi người đặt khi gộp hồ sơ — mọi câu qua defineSql + EXPLAIN.
  { module: "orders", file: "modules/orders/nguoi-dat-gop-repo.ts" },
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `node --test src/modules/orders/nguoi-dat-gop.test.ts src/architecture.test.ts`
Expected: PASS (5 bài của tệp mới; bài EXPLAIN của architecture nhận thêm hai câu `orders.don_cua_nguoi_dat`, `orders.doi_nguoi_dat_gop`).

- [ ] **Step 5: Test đỏ cho dispatch** `src/modules/dispatch/so-don-phu-trach.test.ts`:

```ts
// ADR-0068 Đ2: "hồ sơ phụ đang là người phụ trách đơn chưa xong" — đếm dòng HANDLE đang mở trên đơn chưa huỷ, chưa giao.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { soDonDangPhuTrach } from "./repository.ts";

const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
test("đếm HANDLE mở của hồ sơ trên đơn chưa huỷ, chưa giao; dòng đã đóng, đơn đã huỷ, đơn đã giao, việc PICKUP không tính", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const P = `pty-${SA}`;
  for (const [id, st] of [["o1", "draft"], ["o2", "confirmed"], ["o3", "cancelled"], ["o4", "delivered"]] as const) {
    w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', 'K', '0900000099', 1, 1, 1, ?, ?)`).run(id, `TD-${id}`, SA, AT, AT);
    w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-10-10')").run(`sv-${id}`, id);
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)`)
      .run(`h-${id}`, id, P, AT, AT, AT);
    if (st === "cancelled") w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
    if (st === "confirmed" || st === "delivered") w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, id);
    if (st === "delivered") w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(AT, SA, id);
  }
  assert.equal(await soDonDangPhuTrach(w.env.DB, P), 2);
  w.sqlite.prepare("UPDATE dsp_assignment SET valid_to_at = ? WHERE id = 'h-o1'").run("2026-09-02T00:00:00.000Z");
  assert.equal(await soDonDangPhuTrach(w.env.DB, P), 1);
  assert.equal(await soDonDangPhuTrach(w.env.DB, "pty-khong-co"), 0);
});
```

- [ ] **Step 6: Cài đặt dispatch.** Thêm vào `src/modules/dispatch/repository.ts` (sau `ORDER_DELIVERED`):

```ts
/** ADR-0068 Đ2: số đơn CHƯA XONG (chưa huỷ, chưa Đã giao) mà hồ sơ ?1 đang là người phụ trách (HANDLE đang mở). Đọc trạng thái đơn qua view công bố của orders. */
const SO_DON_DANG_PHU_TRACH = defineSql(
  "dispatch",
  "so_don_dang_phu_trach",
  `SELECT count(*) AS n FROM dsp_assignment a JOIN v_ord_order_state o ON o.id = a.order_id
   WHERE a.party_id = ?1 AND a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL AND o.status <> 'cancelled' AND o.delivered_at IS NULL`,
);
export async function soDonDangPhuTrach(db: D1Database, partyId: string): Promise<number> {
  return (await db.prepare(SO_DON_DANG_PHU_TRACH).bind(partyId).first<{ n: number }>())?.n ?? 0;
}
```

Trong `src/modules/dispatch/index.ts`: thêm `soDonDangPhuTrach` vào dòng `import { … } from "./repository";` và thêm sau `cauBaoVeNguoiPhuTrach`:

```ts
/** ADR-0068 Đ2 — CHỈ gốc lắp ráp gọi (ctx.gopHoSo): hồ sơ `partyId` đang phụ trách bao nhiêu đơn chưa xong. Không có câu bảo vệ trong lô gộp: hồ sơ phụ không có
 * tài khoản nên không được giao mới (checkAssignee đòi tài khoản) — khe giữa kiểm và ghi chấp nhận được, R-PTY-MERGE-4 bắt nếu lọt. */
export const soDonDangPhuTrachCua = (db: D1Database, partyId: string): Promise<number> => soDonDangPhuTrach(db, partyId);
```

Run: `node --test src/modules/dispatch/so-don-phu-trach.test.ts` → Expected: PASS.

- [ ] **Step 7: Test đỏ cho van-chuyen** `src/modules/van-chuyen/viec-xe-cua-nguoi.test.ts` [Dừng Q3]:

```ts
// ADR-0068 Đ2 + [Dừng Q2]: việc xe đang mở của một hồ sơ — tài xế / tổ lái / nhà xe của chuyến chưa chốt (PLANNED, RUNNING) + số xe đứng tên.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, batDongHo, setup, taoChuyen, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { viecXeCuaNguoi } from "./chuyen-repo.ts";

test("tài xế chuyến PLANNED đếm 1; công ty chủ là nhà xe của chuyến + đứng tên xe; chuyến huỷ không tính", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const chu = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id as string;
    assert.deepEqual(await viecXeCuaNguoi(w.env.DB, `pty-${DRIVER}`), { laiChuyen: 1, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0 });
    assert.deepEqual(await viecXeCuaNguoi(w.env.DB, chu), { laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 1, soXe: 1 });
    w.sqlite.exec("DROP TRIGGER IF EXISTS vc_trip_status_transition"); // chỉ trong DB thử, nếu có trigger chuyển trạng thái: đặt thẳng CANCELLED
    w.sqlite.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'OTHER' WHERE id = ?").run(c.chuyen.id);
    assert.equal((await viecXeCuaNguoi(w.env.DB, `pty-${DRIVER}`)).laiChuyen, 0);
  } finally {
    tat();
  }
});
```

Ghi chú cho người thi công: nếu câu `UPDATE vc_trip SET status = 'CANCELLED' …` bị trigger khác của `0042` chặn (tên trigger in trong lỗi), thay bằng lệnh huỷ chuyến qua route mà `src/modules/van-chuyen/dieu-phoi.test.ts` dùng (tìm `huy` trong tệp đó) — không gỡ trigger lạ.

- [ ] **Step 8: Cài đặt van-chuyen.** Thêm vào cuối `src/modules/van-chuyen/chuyen-repo.ts`:

```ts
// ---- ADR-0068 Đ2 (gộp hồ sơ): việc xe đang mở của MỘT hồ sơ — CHỈ gốc lắp ráp gọi qua hàm công bố viecXeCuaNguoi ----------------------------------------
// "Chưa chốt" = chuyến PLANNED hoặc RUNNING. ?1 = hồ sơ. Chỉ đếm, không trả chuyến / xe.
const VIEC_XE_CUA_NGUOI = defineSql(
  "van-chuyen",
  "viec_xe_cua_nguoi",
  `SELECT
     (SELECT count(*) FROM vc_trip_driver d JOIN vc_trip t ON t.id = d.trip_id
       WHERE d.driver_party_id = ?1 AND d.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')) AS lai,
     (SELECT count(*) FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id
       WHERE a.kind = 'CREW' AND a.crew_party_id = ?1 AND a.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')) AS to_lai,
     (SELECT count(*) FROM vc_trip t WHERE t.carrier_party_id = ?1 AND t.status IN ('PLANNED', 'RUNNING')) AS chu_xe,
     (SELECT count(*) FROM vc_vehicle v WHERE v.owner_party_id = ?1) AS so_xe`,
);
export async function viecXeCuaNguoi(db: D1Database, partyId: string): Promise<{ laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number }> {
  const r = await db.prepare(VIEC_XE_CUA_NGUOI).bind(partyId).first<{ lai: number; to_lai: number; chu_xe: number; so_xe: number }>();
  return { laiChuyen: r?.lai ?? 0, toLaiChuyen: r?.to_lai ?? 0, chuXeChuyen: r?.chu_xe ?? 0, soXe: r?.so_xe ?? 0 };
}
```

Trong `src/modules/van-chuyen/index.ts`: sửa câu chú thích đầu tệp "ngoài AppModule chỉ xuất hàm công bố mocToiThieuHienHanh" thành "ngoài AppModule chỉ xuất hai hàm công bố cho gốc lắp ráp: mocToiThieuHienHanh (ADR-0049 D2) và viecXeCuaNguoi (ADR-0068 Đ2)", và thêm sau `mocToiThieuHienHanh`:

```ts
/** HÀM CÔNG BỐ (ADR-0068 Đ2) — CHỈ gốc lắp ráp gọi (ctx.gopHoSo của route gộp hồ sơ ở parties). Khe giữa kiểm và ghi chấp nhận được, R-PTY-MERGE-4 bắt nếu lọt. */
export { viecXeCuaNguoi } from "./chuyen-repo";
```

Run: `node --test src/modules/van-chuyen/viec-xe-cua-nguoi.test.ts` → Expected: PASS.

- [ ] **Step 9: Test + cài đặt billing** [Dừng Q3]. Test `src/modules/billing/so-dong-no.test.ts`:

```ts
// ADR-0068 G10: "số dòng công nợ còn hiệu lực của hồ sơ phụ" (giữ ở hồ sơ phụ, xem trước hiện số) — dòng đảo và dòng đã bị đảo không tính.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { soDongNoCuaNguoiRow } from "./repository.ts";

const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-30T01:00:00.000Z";
test("đếm dòng nợ còn hiệu lực theo người nợ hoặc người được nợ", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const P = `pty-${SA}`;
  const ct = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id as string;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('o1', 'TD-o1', ?, 'draft', 'K', '0900000099', 300000, 300000, 300000, ?, ?)`).run(SA, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv1', 'o1', 'Vé', 'perPax', 1, '2026-10-10')").run();
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'o1'").run(AT);
  w.sqlite.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES ('p1', 'RECEIPT', 'o1', NULL, NULL, '2026-09-30', NULL, ?, ?, ?, ?)`).run(AT, SA, AT, SA);
  const line = (id: string, reverses: string | null) =>
    w.sqlite.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, trip_id, order_service_id, receipt_id, reverses_line_id,
      created_at, created_by, updated_at, updated_by) VALUES (?, 'p1', ?, ?, 1000, 'HELD', 'o1', NULL, NULL, NULL, ?, ?, ?, ?, ?)`).run(id, reverses ? ct : P, reverses ? P : ct, reverses, AT, SA, AT, SA);
  line("l1", null);
  line("l2", null);
  line("l2r", "l2");
  assert.equal(await soDongNoCuaNguoiRow(w.env.DB, P), 1, "l1 còn hiệu lực; l2 đã bị đảo; l2r là dòng đảo");
  assert.equal(await soDongNoCuaNguoiRow(w.env.DB, "pty-khong-co"), 0);
});
```

Nếu một trigger của `0045` chặn chèn thẳng (lỗi in tên trigger), gieo đúng như hàm `lanThuBil` / `phieuBil` / `dongNoBil` của `src/audit-invariants.test.ts` (đã chạy xanh trên cùng schema) — thêm lần thu `bil_payment_receipt` trước rồi đặt `receipt_id` cho dòng nợ.

Cài đặt — thêm vào `src/modules/billing/repository.ts` (sau `LINE_REVERSED`):

```ts
// ADR-0068 G10 (gộp hồ sơ): số dòng nợ CÒN HIỆU LỰC (không phải dòng đảo, chưa bị đảo) có hồ sơ ?1 ở một chân. Chỉ đếm — không số tiền.
const SO_DONG_NO_CUA_NGUOI = defineSql(
  "billing",
  "so_dong_no_cua_nguoi",
  `SELECT count(*) AS n FROM bil_debt_line l
   WHERE (l.debtor_party_id = ?1 OR l.creditor_party_id = ?1) AND l.reverses_line_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM bil_debt_line x WHERE x.reverses_line_id = l.id)`,
);
export async function soDongNoCuaNguoiRow(db: D1Database, partyId: string): Promise<number> {
  return (await db.prepare(SO_DONG_NO_CUA_NGUOI).bind(partyId).first<{ n: number }>())?.n ?? 0;
}
```

Thêm vào `src/modules/billing/index.ts` (import `soDongNoCuaNguoiRow` từ `./repository`):

```ts
/** HÀM CÔNG BỐ (ADR-0068 G10) — CHỈ gốc lắp ráp gọi (ctx.gopHoSo): số dòng công nợ còn hiệu lực của một hồ sơ (dòng ở lại hồ sơ phụ khi gộp). */
export const soDongNoCuaNguoi = (db: D1Database, partyId: string): Promise<number> => soDongNoCuaNguoiRow(db, partyId);
```

Run: `node --test src/modules/billing/so-dong-no.test.ts` → Expected: PASS.

- [ ] **Step 10: staff — SĐT đăng nhập theo hồ sơ.** Thêm vào `src/modules/staff/repository.ts` (sau `ACCOUNT_OF_PARTY`):

```ts
// ADR-0068 Đ8 (lý do LOGIN_PHONE) + Đ9 (hồ sơ khớp có tài khoản?): SĐT đăng nhập của mọi tài khoản có hồ sơ; tài khoản của một tập hồ sơ (mảng JSON ?1).
const PHONES_BY_PARTY = defineSql("staff", "phones_by_party", "SELECT party_id, phone FROM staff WHERE party_id IS NOT NULL");
const ACCOUNTS_OF_PARTIES = defineSql("staff", "accounts_of_parties", "SELECT party_id FROM staff WHERE party_id IN (SELECT value FROM json_each(?1))");
export async function phonesByParty(db: D1Database): Promise<{ partyId: string; phone: string }[]> {
  return (await db.prepare(PHONES_BY_PARTY).all<{ party_id: string; phone: string }>()).results.map((r) => ({ partyId: r.party_id, phone: r.phone }));
}
export async function partiesWithAccount(db: D1Database, partyIds: readonly string[]): Promise<Set<string>> {
  if (partyIds.length === 0) return new Set();
  return new Set((await db.prepare(ACCOUNTS_OF_PARTIES).bind(JSON.stringify(partyIds)).all<{ party_id: string }>()).results.map((r) => r.party_id));
}
```

Trong `src/modules/staff/index.ts`: thêm `phonesByParty, partiesWithAccount` vào dòng import từ `./repository`, và thêm sau `nhanNhanVienTheoId`:

```ts
/** HÀM CÔNG BỐ (ADR-0068 Đ8) — CHỈ gốc lắp ráp gọi (ctx.gopHoSo.soDangNhap): SĐT đăng nhập theo hồ sơ, cho lý do "số đăng nhập trùng số liên hệ". */
export const soDangNhapTheoHoSo = (db: D1Database): Promise<{ partyId: string; phone: string }[]> => phonesByParty(db);
```

(`partiesWithAccount` dùng ở Task 8.)

- [ ] **Step 11: Kiểu + tiêm ở router.** Trong `src/shared/router.ts`, thêm sau kiểu `NewOrderHandler`:

```ts
/**
 * GỘP HỒ SƠ (ADR-0068 Đ2, Đ6, Đ8) — phần của module KHÁC mà route gộp / nghi trùng của `parties` cần. `parties` không import orders / dispatch / van-chuyen /
 * billing / staff và không đọc bảng của chúng: gốc lắp ráp nối (khuôn `isAssigned`, `mocToiThieu`). Mỗi phương thức là MỘT truy vấn D1 (trừ `cauDoiDon`:
 * câu CHƯA chạy, route gộp đặt nó TRƯỚC câu lật hồ sơ phụ trong cùng `db.batch()`).
 */
export interface ViecCuaHoSo { phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number }
export interface DonCuaNguoiDatTom { doi: number; giuDaGiao: number; giuDaHuy: number; lechTien: string[] }
export interface GopHoSoNoi {
  viecCua: (partyId: string) => Promise<ViecCuaHoSo>;
  donNguoiDat: (partyId: string) => Promise<DonCuaNguoiDatTom>;
  cauDoiDon: (tuPartyId: string, sangPartyId: string, at: string) => D1PreparedStatement;
  soDongNo: (partyId: string) => Promise<number>;
  soDangNhap: () => Promise<{ partyId: string; phone: string }[]>;
}
```

Thêm vào `interface Ctx` (sau `nhanNhanVien`):

```ts
  /** GỘP HỒ SƠ (ADR-0068) — do gốc lắp ráp tiêm; xem `GopHoSoNoi`. Lười: chỉ gọi hàm tiêm khi route dùng (khung thử cũ không có hàm này vẫn chạy route khác). */
  gopHoSo: GopHoSoNoi;
```

Thêm vào `AppOptions.injected` (sau `nhanNhanVien`):

```ts
    /** GỘP HỒ SƠ (ADR-0068). BẮT BUỘC trong mã chạy thật (`src/index.ts`). */
    gopHoSo: (env: Env) => GopHoSoNoi;
```

Trong `dispatch()` của `createApp`, thêm vào object ctx (sau `nhanNhanVien: …`):

```ts
      // Lười (kế hoạch R9): gọi opts.injected.gopHoSo(env) trong từng phương thức — app dựng bằng injected cũ (src/shared/router.test.ts) không vỡ ở route khác.
      gopHoSo: {
        viecCua: (id) => opts.injected.gopHoSo(env).viecCua(id),
        donNguoiDat: (id) => opts.injected.gopHoSo(env).donNguoiDat(id),
        cauDoiDon: (tu, sang, at) => opts.injected.gopHoSo(env).cauDoiDon(tu, sang, at),
        soDongNo: (id) => opts.injected.gopHoSo(env).soDongNo(id),
        soDangNhap: () => opts.injected.gopHoSo(env).soDangNhap(),
      },
```

- [ ] **Step 12: Nối ở gốc lắp ráp** `src/index.ts`. Sửa các dòng import:

```ts
import { billingModule, soDongNoCuaNguoi } from "./modules/billing";
import { dispatchModule, handledOrderIdsOf, handlerOf, isOrderHandler, newOrderHandler, ordersWithHandler, soDonDangPhuTrachCua } from "./modules/dispatch";
import { cauDoiNguoiDat, donCuaNguoiDat, findOrderRef, ordersModule } from "./modules/orders";
import { accountOfParty, nhanNhanVienTheoId, soDangNhapTheoHoSo } from "./modules/staff";
import { mocToiThieuHienHanh, vanChuyenModule, viecXeCuaNguoi } from "./modules/van-chuyen";
```

Thêm vào `injected` (sau `nhanNhanVien`):

```ts
    // GỘP HỒ SƠ (ADR-0068 Đ2, Đ6, Đ8): parties không import orders / dispatch / van-chuyen / billing / staff — gốc lắp ráp là NƠI DUY NHẤT gọi các hàm công bố này.
    gopHoSo: (env) => ({
      viecCua: async (partyId) => {
        const [phuTrachDon, xe] = await Promise.all([soDonDangPhuTrachCua(env.DB, partyId), viecXeCuaNguoi(env.DB, partyId)]);
        return { phuTrachDon, ...xe };
      },
      donNguoiDat: (partyId) => donCuaNguoiDat(env.DB, partyId),
      cauDoiDon: (tu, sang, at) => cauDoiNguoiDat(env.DB, tu, sang, at),
      soDongNo: (partyId) => soDongNoCuaNguoi(env.DB, partyId),
      soDangNhap: () => soDangNhapTheoHoSo(env.DB),
    }),
```

Và thêm một dòng vào khối chú thích đầu tệp: `// GỘP HỒ SƠ (ADR-0068): parties nhận "việc đang mở", đơn theo người đặt, câu đổi người đặt, số dòng nợ, SĐT đăng nhập qua ctx.gopHoSo — không cạnh phụ thuộc mới.`

- [ ] **Step 13: Bài siết "chỉ gốc lắp ráp nhắc tên"** — thêm vào `src/architecture.test.ts` ngay sau bài `mocToiThieuHienHanh`:

```ts
test("ADR-0068 Đ6 (siết): chỉ gốc lắp ráp (src/index.ts) và module chủ nhắc năm hàm công bố của gộp hồ sơ (bỏ chú thích)", () => {
  const CHU: Record<string, string> = {
    viecXeCuaNguoi: "src/modules/van-chuyen/",
    soDongNoCuaNguoi: "src/modules/billing/",
    soDonDangPhuTrachCua: "src/modules/dispatch/",
    cauDoiNguoiDat: "src/modules/orders/",
    soDangNhapTheoHoSo: "src/modules/staff/",
  };
  const problems: string[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel === "src/index.ts") continue;
    const text = maskSource(readFileSync(file, "utf8"), { strings: false, comments: true });
    for (const [ten, chu] of Object.entries(CHU)) if (!rel.startsWith(chu) && new RegExp(`\\b${ten}\\b`).test(text)) problems.push(`${rel}: ${ten}`);
  }
  assert.deepEqual(problems, [], "các hàm này tới parties qua ctx.gopHoSo — không module nào gọi thẳng");
});
```

- [ ] **Step 14: Chạy cả nhóm + typecheck**

Run: `node --test src/modules/orders/nguoi-dat-gop.test.ts src/modules/dispatch/so-don-phu-trach.test.ts src/modules/van-chuyen/viec-xe-cua-nguoi.test.ts src/modules/billing/so-dong-no.test.ts src/architecture.test.ts src/shared/router.test.ts`
Expected: PASS toàn bộ.

Run: `npm run typecheck`
Expected: 0 lỗi (thiếu `gopHoSo` trong `injected` của `src/index.ts` sẽ là lỗi `tsc` — chính là hàng rào "BẮT BUỘC").

- [ ] **Step 15: Commit**

```bash
git add src/modules/orders/nguoi-dat-gop-repo.ts src/modules/orders/nguoi-dat-gop.test.ts src/modules/orders/index.ts src/modules/dispatch/repository.ts src/modules/dispatch/index.ts src/modules/dispatch/so-don-phu-trach.test.ts src/modules/van-chuyen/chuyen-repo.ts src/modules/van-chuyen/index.ts src/modules/van-chuyen/viec-xe-cua-nguoi.test.ts src/modules/billing/repository.ts src/modules/billing/index.ts src/modules/billing/so-dong-no.test.ts src/modules/staff/repository.ts src/modules/staff/index.ts src/shared/router.ts src/index.ts src/architecture.test.ts
git commit -m "$(cat <<'EOF'
Gộp hồ sơ: phần của module khác tới parties qua ctx.gopHoSo (ADR-0068 Đ6)

parties không được import orders / dispatch / van-chuyen / billing / staff,
nên gốc lắp ráp nối: đơn theo người đặt + câu đổi người đặt (tệp nửa nghiêm
mới), việc đang mở, số dòng nợ, SĐT đăng nhập. Không thêm cạnh phụ thuộc;
bài siết bắt module nào gọi thẳng các hàm này.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Câu lệnh gộp có lính gác (parties) + bộ dựng lô

**Files:**
- Modify: `src/modules/parties/repository.ts`
- Create: `src/modules/parties/gop-lo.ts`
- Create: `src/modules/parties/gop-lo.test.ts`

**Interfaces:**
- Consumes: `KeHoachGop` (Task 3).
- Produces:
  - `PartyRow` thêm `merged_into_id: string | null; merged_at: string | null; merged_into_name: string | null`; `ContactRow` thêm `value_normalized: string`.
  - `docsForMerge(db, partyId): Promise<GopDocRow[]>` với `interface GopDocRow extends PersonDocFull { type_name: string; class_name: string | null }`.
  - `mergedFromOf(db, partyId): Promise<{ id: string; display_name: string; merged_at: string }[]>`.
  - `personsForMatch(db): Promise<{ id: string; display_name: string }[]>`; `openPersonPhones(db): Promise<{ party_id: string; value_normalized: string }[]>`; `listPartiesByIds(db, ids, today): Promise<PartyListRow[]>`.
  - `loGop(db, v: { a: string; b: string; ke: KeHoachGop; giayToDu: ReadonlyMap<string, GopDocRow>; homNay: string; at: string; actorId: string }): { truocDon: D1PreparedStatement[]; lat: D1PreparedStatement }`.
  - `LIST` và `LOOKUP` không còn trả hồ sơ đã gộp (kể cả khi `includeInactive`).

- [ ] **Step 1: Viết test đỏ** `src/modules/parties/gop-lo.test.ts`:

```ts
// Bộ dựng lô gộp (ADR-0068 Đ1) chạy trên SQLite THẬT (schema từ migrations): G13 tất định (hai lô từ CÙNG một kế hoạch chạy lần lượt — lô sau không đổi gì),
// G8 chuỗi CCCD (không vướng trigger *_superseded / *_cccd_one_person_ins), Review Focus 5 (vai Nhà xe có ở B TRƯỚC quan hệ "Tài xế của" → B),
// Review Focus 1 (B vừa có liên hệ chính sau khi tính kế hoạch → cả lô huỷ, không đổi gì).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { keHoachGop, type HoSoGop, type NgoaiGop } from "./gop.ts";
import { loGop } from "./gop-lo.ts";
import { docsForMerge } from "./repository.ts";

const AT = "2026-09-01T00:00:00.000Z";
const AT2 = "2026-10-01T03:00:00.000Z";
const HOM_NAY = "2026-10-01";
const RANH: NgoaiGop = { phuTrachDon: 0, laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0, donLechTien: [] };
const hs = (id: string, x: Partial<HoSoGop> = {}): HoSoGop => ({
  id, kind: "PERSON", displayName: id, active: true, mergedIntoId: null, laCongTyChu: false, coTaiKhoan: false, coHoSoTroVao: false, lienHe: [], congViec: [], quanHe: [], giayTo: [], ...x,
});
function nguoi(db: DatabaseSync, id: string) {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, id, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, id, AT, AT);
}
const lienHe = (db: DatabaseSync, id: string, party: string, so: string, chinh: 0 | 1) =>
  db.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
    VALUES (?, ?, 'PHONE', ?, ?, NULL, ?, '2026-09-01', ?, ?)`).run(id, party, so, so, chinh, AT, AT);
const vai = (db: DatabaseSync, id: string, party: string, code: string) =>
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-01', ?, ?)").run(id, party, code, AT, AT);
const quanHe = (db: DatabaseSync, id: string, from: string, to: string, type: string) =>
  db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-09-01', ?, ?)")
    .run(id, from, to, type, AT, AT);
const lh = (id: string, so: string, chinh: boolean) => ({ id, kind: "PHONE", value: so, valueNormalized: so, label: null, isPrimary: chinh, validFrom: "2026-09-01", validTo: null });
const cv = (id: string, code: string) => ({ id, code, name: code, group: "OTHER" as const, locationId: null, locationName: null, validFrom: "2026-09-01", validTo: null });
const q = (db: DatabaseSync, sql: string, ...a: unknown[]) => db.prepare(sql).all(...(a as never[])) as Record<string, unknown>[];
const lo = (D: unknown, a: HoSoGop, b: HoSoGop, giayToDu = new Map()) => {
  const l = loGop(D as D1Database, { a: a.id, b: b.id, ke: keHoachGop(a, b, RANH, HOM_NAY), giayToDu, homNay: HOM_NAY, at: AT2, actorId: "s-test" });
  return [...l.truocDon, l.lat];
};
const dem = (db: DatabaseSync) => q(db, `SELECT
  (SELECT count(*) FROM pty_contact_point WHERE party_id = 'pb' AND valid_to_date IS NULL) AS lh_b,
  (SELECT count(*) FROM pty_party_role WHERE party_id = 'pb' AND valid_to_date IS NULL) AS vai_b,
  (SELECT count(*) FROM pty_contact_point) AS lh, (SELECT count(*) FROM pty_party_role) AS vai`)[0];

test("G13 tất định: lô thứ nhất lật A; lô thứ hai (cùng kế hoạch) — câu lật changes = 0 và KHÔNG dòng nào đổi", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  lienHe(db, "c1", "pa", "0912000111", 1);
  vai(db, "r1", "pa", "BOAT_CAPTAIN");
  const a = hs("pa", { lienHe: [lh("c1", "0912000111", true)], congViec: [cv("r1", "BOAT_CAPTAIN")] });
  const r1 = await D.batch(lo(D, a, hs("pb")));
  assert.equal(r1.at(-1).meta.changes, 1);
  assert.deepEqual({ ...q(db, "SELECT active, merged_into_id m FROM pty_party WHERE id = 'pa'")[0] }, { active: 0, m: "pb" });
  const truoc = { ...dem(db) };
  assert.deepEqual(truoc.lh_b, 1);
  const r2 = await D.batch(lo(D, a, hs("pb")));
  assert.equal(r2.at(-1).meta.changes, 0);
  assert.deepEqual({ ...dem(db) }, truoc, "lô thua không chuyển thêm dòng nào");
});

test("G8 chuỗi CCCD: huỷ dòng gia hạn TRƯỚC rồi dòng gốc; B nhận một dòng mới cùng khoá số, không dòng trước; không trigger nào chặn", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, previous_id, created_at, updated_at)
    VALUES ('g1', 'pa', 'CCCD', '079111222333', '079111222333', NULL, ?, ?)`).run(AT, AT);
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, expiry_date, previous_id, created_at, updated_at)
    VALUES ('g2', 'pa', 'CCCD', '079111222333', '079111222333', '2040-01-01', 'g1', ?, ?)`).run(AT2, AT2);
  const du = await docsForMerge(D, "pa");
  const a = hs("pa", { giayTo: du.map((d) => ({ id: d.id, typeCode: d.document_type_code, typeName: d.type_name, className: d.class_name, previousId: d.previous_id, voided: d.voided_at !== null, current: d.is_current === 1 })) });
  await D.batch(lo(D, a, hs("pb"), new Map(du.map((d) => [d.id, d]))));
  assert.deepEqual(q(db, "SELECT id FROM pty_person_document WHERE party_id = 'pa' AND voided_at IS NULL"), []);
  const moi = q(db, "SELECT number_key k, previous_id p, expiry_date h FROM pty_person_document WHERE party_id = 'pb'");
  assert.deepEqual(moi.map((r) => ({ ...r })), [{ k: "079111222333", p: null, h: "2040-01-01" }]);
});

test("Review Focus 5: A là nhà xe cá nhân, D 'Tài xế của' A → sau lô B là nhà xe, D thuộc B (view v_pty_carrier_driver); không vướng trigger drives_for_carrier", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb"); nguoi(db, "pd");
  vai(db, "r1", "pa", "CARRIER");
  quanHe(db, "q1", "pd", "pa", "DRIVES_FOR");
  const a = hs("pa", {
    congViec: [cv("r1", "CARRIER")],
    quanHe: [{ id: "q1", typeCode: "DRIVES_FOR", typeName: "Tài xế của", fromId: "pd", fromName: "pd", toId: "pa", toName: "pa", validFrom: "2026-09-01", validTo: null }],
  });
  const r = await D.batch(lo(D, a, hs("pb")));
  assert.equal(r.at(-1).meta.changes, 1);
  assert.deepEqual(q(db, "SELECT driver_party_id d FROM v_pty_carrier_driver WHERE carrier_party_id = 'pb' ORDER BY d").map((x) => x.d), ["pb", "pd"]);
  assert.deepEqual(q(db, "SELECT * FROM v_pty_carrier_driver WHERE carrier_party_id = 'pa'"), []);
});

test("Review Focus 1: B có liên hệ chính SAU khi tính kế hoạch (kế hoạch mang cờ chính sang B) → chỉ mục duy nhất huỷ CẢ lô, không dòng nào đổi", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  lienHe(db, "c1", "pa", "0912000111", 1);
  const stmts = lo(D, hs("pa", { lienHe: [lh("c1", "0912000111", true)] }), hs("pb"));
  lienHe(db, "c9", "pb", "0913000999", 1); // người khác vừa thêm SĐT chính cho B
  const truoc = { ...dem(db) };
  await assert.rejects(D.batch(stmts), /UNIQUE constraint failed: pty_contact_point/);
  assert.deepEqual({ ...dem(db) }, truoc);
  assert.equal(q(db, "SELECT active FROM pty_party WHERE id = 'pa'")[0]!.active, 1);
});

test("Đ7: danh sách và tra SĐT không trả hồ sơ đã gộp, kể cả khi gồm hồ sơ đã ngưng", async () => {
  const { listParties, findPartiesByPhone } = await import("./repository.ts");
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb"); nguoi(db, "pc");
  lienHe(db, "c1", "pa", "0912000111", 1);
  db.prepare("UPDATE pty_party SET active = 0 WHERE id = 'pc'").run(); // ngưng thường — vẫn hiện khi includeInactive
  db.prepare("UPDATE pty_party SET active = 0, merged_into_id = 'pb', merged_at = ? WHERE id = 'pa'").run(AT2);
  const { rows } = await listParties(D, { today: HOM_NAY, kind: null, q: null, phoneLike: null, roleCode: null, locationId: null, includeInactive: true, limit: 50, offset: 0 });
  assert.ok(!rows.some((r) => r.id === "pa"));
  assert.ok(rows.some((r) => r.id === "pc"));
  assert.deepEqual(await findPartiesByPhone(D, "0912000111", HOM_NAY), []);
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/modules/parties/gop-lo.test.ts`
Expected: FAIL — `Cannot find module '…/gop-lo.ts'` (và `docsForMerge` chưa có).

- [ ] **Step 3: Sửa đọc có sẵn trong `src/modules/parties/repository.ts`.**

(a) `PartyRow` thêm ba trường, `ContactRow` thêm `value_normalized`:

```ts
export interface PartyRow {
  id: string;
  party_kind: PartyKind;
  display_name: string;
  active: number;
  created_at: string;
  updated_at: string;
  family_name: string | null;
  middle_name: string | null;
  given_name: string | null;
  legal_name: string | null;
  tax_code: string | null;
  address: string | null;
  invoice_email: string | null;
  /** ADR-0068: hồ sơ chính mà hồ sơ này đã gộp vào (NULL = chưa gộp), mốc gộp, tên hồ sơ chính. */
  merged_into_id: string | null;
  merged_at: string | null;
  merged_into_name: string | null;
}
export interface ContactRow { id: string; contact_kind_code: string; value: string; value_normalized: string; label: string | null; is_primary: number; valid_from_date: string; valid_to_date: string | null }
```

(b) `FIND` và `CONTACTS_OF`:

```ts
const FIND = defineSql(
  "parties",
  "find",
  `SELECT p.id, p.party_kind, p.display_name, p.active, p.created_at, p.updated_at, pe.family_name, pe.middle_name, pe.given_name,
          o.legal_name, o.tax_code, o.address, o.invoice_email, p.merged_into_id, p.merged_at, t.display_name AS merged_into_name
   FROM pty_party p LEFT JOIN pty_person pe ON pe.party_id = p.id LEFT JOIN pty_organization o ON o.party_id = p.id LEFT JOIN pty_party t ON t.id = p.merged_into_id
   WHERE p.id = ?1`,
);
const CONTACTS_OF = defineSql(
  "parties",
  "contacts_of",
  `SELECT id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, valid_to_date FROM pty_contact_point WHERE party_id = ?1
   ORDER BY (valid_to_date IS NOT NULL), contact_kind_code, is_primary DESC, valid_from_date DESC`,
);
```

(c) Đ7 — trong `LIST` thêm một dòng ngay trước `AND (?7 = 1 OR p.active = 1)`, và trong `LOOKUP` thêm cùng dòng ngay sau dòng `WHERE p.id IN (…)`:

```sql
     AND NOT EXISTS (SELECT 1 FROM pty_party m WHERE m.id = p.id AND m.merged_into_id IS NOT NULL)
```

- [ ] **Step 4: Thêm câu gộp + đọc mới** vào cuối `src/modules/parties/repository.ts`:

```ts
// ---- Gộp hồ sơ cá nhân (ADR-0068) -----------------------------------------------------------------------------------------------------------------------
// Lính gác TRẠNG THÁI (kế hoạch R1): hai hồ sơ còn đang dùng và chưa gộp. parties là module nghiêm, không đọc audit_log nên KHÔNG dùng wonGuard; lô thua cuộc
// đua (hồ sơ phụ đã bị lật ở lô khác) → mọi câu thành không-làm-gì, câu lật changes = 0. Đoạn chữ tĩnh (không nhận đầu vào).
const LINH_GAC = (a: string, b: string): string => `(SELECT count(*) FROM pty_party g WHERE g.id IN (${a}, ${b}) AND g.active = 1 AND g.merged_into_id IS NULL) = 2`;

// ?1 id liên hệ, ?2 hồ sơ phụ, ?3 ngày đóng (hôm nay VN), ?4 lúc, ?5 người, ?6 hồ sơ chính
const GOP_DONG_LIEN_HE = defineSql(
  "parties",
  "gop_dong_lien_he",
  `UPDATE pty_contact_point SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND (valid_to_date IS NULL OR valid_to_date > ?3) AND ?3 >= valid_from_date AND ${LINH_GAC("?2", "?6")}`,
);
// ?1 id mới, ?2 hồ sơ chính, ?3 loại, ?4 giá trị, ?5 chuẩn hoá, ?6 ghi chú, ?7 chính, ?8 từ ngày, ?9 lúc, ?10 người, ?11 hồ sơ phụ
const GOP_MO_LIEN_HE = defineSql(
  "parties",
  "gop_mo_lien_he",
  `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?9, ?10 WHERE ${LINH_GAC("?11", "?2")}`,
);
// ?1 id vai, ?2 hồ sơ phụ, ?3 ngày đóng, ?4 lúc, ?5 người, ?6 hồ sơ chính
const GOP_DONG_VAI = defineSql(
  "parties",
  "gop_dong_vai",
  `UPDATE pty_party_role SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND (valid_to_date IS NULL OR valid_to_date > ?3) AND ?3 >= valid_from_date AND ${LINH_GAC("?2", "?6")}`,
);
// ?1 id mới, ?2 hồ sơ chính, ?3 mã vai, ?4 nơi, ?5 từ ngày, ?6 đến ngày, ?7 lúc, ?8 người, ?9 hồ sơ phụ
const GOP_MO_VAI = defineSql(
  "parties",
  "gop_mo_vai",
  `INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8 WHERE ${LINH_GAC("?9", "?2")}`,
);
// ?1 id quan hệ, ?2 hồ sơ phụ, ?3 ngày đóng, ?4 lúc, ?5 người, ?6 hồ sơ chính
const GOP_DONG_QUAN_HE = defineSql(
  "parties",
  "gop_dong_quan_he",
  `UPDATE pty_party_relationship SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND (from_party_id = ?2 OR to_party_id = ?2) AND (valid_to_date IS NULL OR valid_to_date > ?3) AND ?3 >= valid_from_date AND ${LINH_GAC("?2", "?6")}`,
);
// ?1 id mới, ?2 từ, ?3 tới, ?4 loại, ?5 từ ngày, ?6 đến ngày, ?7 lúc, ?8 người, ?9 hồ sơ phụ, ?10 hồ sơ chính
const GOP_MO_QUAN_HE = defineSql(
  "parties",
  "gop_mo_quan_he",
  `INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8 WHERE ${LINH_GAC("?9", "?10")}`,
);
// Huỷ một dòng giấy tờ của hồ sơ phụ (khoá lạc quan updated_at đã đọc). ?1 id, ?2 hồ sơ phụ, ?3 mốc đã đọc, ?4 lúc, ?5 người, ?6 hồ sơ chính
const GOP_HUY_GIAY_TO = defineSql(
  "parties",
  "gop_huy_giay_to",
  `UPDATE pty_person_document SET voided_at = ?4, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND updated_at = ?3 AND voided_at IS NULL AND ${LINH_GAC("?2", "?6")}`,
);
// Chép nội dung một dòng hiện hành sang hồ sơ chính (dòng MỚI, không dòng trước). Số CHỈ đi trong câu lệnh — không bao giờ vào DTO, nhật ký, câu lỗi.
// ?1 id mới, ?2 hồ sơ chính, ?3 loại, ?4 số, ?5 khoá số, ?6 hạng, ?7 ngày cấp, ?8 nơi cấp, ?9 hết hạn, ?10 lúc, ?11 người, ?12 hồ sơ phụ
const GOP_CHEP_GIAY_TO = defineSql(
  "parties",
  "gop_chep_giay_to",
  `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
     previous_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, ?10, ?11, ?10, ?11 WHERE ${LINH_GAC("?12", "?2")}`,
);
// Câu LẬT hồ sơ phụ — đứng SAU mọi câu chuyển và câu đổi người đặt đơn, NGAY TRƯỚC hai dòng nhật ký `changes() > 0`. ?1 phụ, ?2 chính, ?3 lúc, ?4 người.
const GOP_LAT = defineSql(
  "parties",
  "gop_lat",
  `UPDATE pty_party SET active = 0, merged_into_id = ?2, merged_at = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND ${LINH_GAC("?1", "?2")}`,
);

export interface GopDocRow extends PersonDocFull { type_name: string; class_name: string | null }
// MỌI dòng giấy tờ của hồ sơ (kể cả số — CHỈ để chép trong lô gộp; không bao giờ ra DTO). Thứ tự tạo.
const DOCS_FOR_MERGE = defineSql(
  "parties",
  "docs_for_merge",
  `SELECT d.id, d.party_id, d.document_type_code, t.name AS type_name, c.name AS class_name, d.document_number, d.number_key, d.license_class_code, d.issued_date,
          d.issued_place, d.expiry_date, d.previous_id, d.voided_at, d.updated_at, ${HIEN_HANH} AS is_current
   FROM pty_person_document d JOIN pty_person_document_type t ON t.code = d.document_type_code LEFT JOIN pty_license_class c ON c.code = d.license_class_code
   WHERE d.party_id = ?1 ORDER BY d.created_at, d.id`,
);
const MERGED_FROM = defineSql("parties", "merged_from", "SELECT id, display_name, merged_at FROM pty_party WHERE merged_into_id = ?1 ORDER BY merged_at, id");
// Hồ sơ nghi trùng (Đ8) + hồ sơ khớp khi tạo tài khoản (Đ9): hồ sơ cá nhân đang dùng, chưa gộp; SĐT liên hệ đang mở của chúng.
const PERSONS_FOR_MATCH = defineSql("parties", "persons_for_match", "SELECT id, display_name FROM pty_party WHERE party_kind = 'PERSON' AND active = 1 AND merged_into_id IS NULL");
const OPEN_PERSON_PHONES = defineSql(
  "parties",
  "open_person_phones",
  `SELECT c.party_id, c.value_normalized FROM pty_contact_point c JOIN pty_party p ON p.id = c.party_id
   WHERE c.contact_kind_code = 'PHONE' AND c.valid_to_date IS NULL AND p.party_kind = 'PERSON' AND p.active = 1 AND p.merged_into_id IS NULL`,
);
// ?1 hôm nay, ?2 mảng JSON id hồ sơ — dòng danh sách (tên, SĐT chính, công việc hôm nay) cho các id đã biết.
const LIST_BY_IDS = defineSql("parties", "list_by_ids", `${LIST_SELECT} WHERE p.id IN (SELECT value FROM json_each(?2)) ORDER BY p.sort_key COLLATE NOCASE, p.id`);

export async function docsForMerge(db: D1Database, partyId: string): Promise<GopDocRow[]> {
  return (await db.prepare(DOCS_FOR_MERGE).bind(partyId).all<GopDocRow>()).results;
}
export async function mergedFromOf(db: D1Database, partyId: string): Promise<{ id: string; display_name: string; merged_at: string }[]> {
  return (await db.prepare(MERGED_FROM).bind(partyId).all<{ id: string; display_name: string; merged_at: string }>()).results;
}
export async function personsForMatch(db: D1Database): Promise<{ id: string; display_name: string }[]> {
  return (await db.prepare(PERSONS_FOR_MATCH).all<{ id: string; display_name: string }>()).results;
}
export async function openPersonPhones(db: D1Database): Promise<{ party_id: string; value_normalized: string }[]> {
  return (await db.prepare(OPEN_PERSON_PHONES).all<{ party_id: string; value_normalized: string }>()).results;
}
export async function listPartiesByIds(db: D1Database, ids: readonly string[], today: string): Promise<PartyListRow[]> {
  if (ids.length === 0) return [];
  return (await db.prepare(LIST_BY_IDS).bind(today, JSON.stringify(ids)).all<PartyListRow>()).results;
}

type Nguoi = { a: string; b: string; at: string; actorId: string };
export const gopDongLienHeStatement = (db: D1Database, v: Nguoi & { id: string; homNay: string }): D1PreparedStatement =>
  db.prepare(GOP_DONG_LIEN_HE).bind(v.id, v.a, v.homNay, v.at, v.actorId, v.b);
export const gopMoLienHeStatement = (
  db: D1Database, v: Nguoi & { kind: string; value: string; valueNormalized: string; label: string | null; isPrimary: boolean; from: string },
): D1PreparedStatement => db.prepare(GOP_MO_LIEN_HE).bind(crypto.randomUUID(), v.b, v.kind, v.value, v.valueNormalized, v.label, v.isPrimary ? 1 : 0, v.from, v.at, v.actorId, v.a);
export const gopDongVaiStatement = (db: D1Database, v: Nguoi & { id: string; homNay: string }): D1PreparedStatement =>
  db.prepare(GOP_DONG_VAI).bind(v.id, v.a, v.homNay, v.at, v.actorId, v.b);
export const gopMoVaiStatement = (db: D1Database, v: Nguoi & { code: string; locationId: string | null; from: string; to: string | null }): D1PreparedStatement =>
  db.prepare(GOP_MO_VAI).bind(crypto.randomUUID(), v.b, v.code, v.locationId, v.from, v.to, v.at, v.actorId, v.a);
export const gopDongQuanHeStatement = (db: D1Database, v: Nguoi & { id: string; homNay: string }): D1PreparedStatement =>
  db.prepare(GOP_DONG_QUAN_HE).bind(v.id, v.a, v.homNay, v.at, v.actorId, v.b);
export const gopMoQuanHeStatement = (db: D1Database, v: Nguoi & { fromId: string; toId: string; typeCode: string; from: string; to: string | null }): D1PreparedStatement =>
  db.prepare(GOP_MO_QUAN_HE).bind(crypto.randomUUID(), v.fromId, v.toId, v.typeCode, v.from, v.to, v.at, v.actorId, v.a, v.b);
export const gopHuyGiayToStatement = (db: D1Database, v: Nguoi & { id: string; expectedUpdatedAt: string }): D1PreparedStatement =>
  db.prepare(GOP_HUY_GIAY_TO).bind(v.id, v.a, v.expectedUpdatedAt, v.at, v.actorId, v.b);
export const gopChepGiayToStatement = (db: D1Database, v: Nguoi & { du: GopDocRow }): D1PreparedStatement =>
  db.prepare(GOP_CHEP_GIAY_TO).bind(
    crypto.randomUUID(), v.b, v.du.document_type_code, v.du.document_number, v.du.number_key, v.du.license_class_code, v.du.issued_date, v.du.issued_place, v.du.expiry_date,
    v.at, v.actorId, v.a,
  );
export const gopLatStatement = (db: D1Database, v: Nguoi): D1PreparedStatement => db.prepare(GOP_LAT).bind(v.a, v.b, v.at, v.actorId);
```

- [ ] **Step 5: Bộ dựng lô** `src/modules/parties/gop-lo.ts`:

```ts
// Bộ dựng LÔ gộp hồ sơ (ADR-0068 Đ1) từ kế hoạch thuần (gop.ts): câu CHƯA chạy, mỗi câu mang lính gác trạng thái (repository.ts — kế hoạch R1). Thứ tự CỐ ĐỊNH:
// liên hệ (đóng A → mở B) → công việc (đóng A → mở B; vai Nhà xe có ở B TRƯỚC quan hệ "Tài xế của" → B — trigger drives_for_carrier kiểm lúc chèn) → quan hệ
// (đóng A → mở B) → giấy tờ (huỷ mới → cũ, rồi chép sang B — trigger *_superseded, *_cccd_one_person_ins). Route ghép tiếp: câu đổi người đặt đơn
// (ctx.gopHoSo.cauDoiDon, TRƯỚC câu lật) → `lat` → hai dòng nhật ký `changes() > 0`. Không import module khác (chạy được bằng node --test).
import type { KeHoachGop } from "./gop.ts";
import {
  gopChepGiayToStatement, gopDongLienHeStatement, gopDongQuanHeStatement, gopDongVaiStatement, gopHuyGiayToStatement, gopLatStatement, gopMoLienHeStatement,
  gopMoQuanHeStatement, gopMoVaiStatement, type GopDocRow,
} from "./repository.ts";

export interface LoGop { truocDon: D1PreparedStatement[]; lat: D1PreparedStatement }

export function loGop(
  db: D1Database,
  v: { a: string; b: string; ke: KeHoachGop; giayToDu: ReadonlyMap<string, GopDocRow>; homNay: string; at: string; actorId: string },
): LoGop {
  const { a, b, ke, homNay, at, actorId } = v;
  const n = { a, b, at, actorId };
  const du = (id: string): GopDocRow => {
    const r = v.giayToDu.get(id);
    if (!r) throw new Error(`loGop: thiếu dòng giấy tờ ${id} trong giayToDu`);
    return r;
  };
  const s: D1PreparedStatement[] = [
    ...ke.lienHe.dong.map((c) => gopDongLienHeStatement(db, { ...n, id: c.id, homNay })),
    ...ke.lienHe.mo.map((m) =>
      gopMoLienHeStatement(db, { ...n, kind: m.tu.kind, value: m.tu.value, valueNormalized: m.tu.valueNormalized, label: m.tu.label, isPrimary: m.chinh, from: homNay })),
    ...ke.congViec.dong.map((r) => gopDongVaiStatement(db, { ...n, id: r.id, homNay })),
    ...ke.congViec.mo.map((r) => gopMoVaiStatement(db, { ...n, code: r.code, locationId: r.locationId, from: homNay, to: r.validTo })),
    ...ke.quanHe.dong.map((x) => gopDongQuanHeStatement(db, { ...n, id: x.id, homNay })),
    ...ke.quanHe.mo.map((m) => gopMoQuanHeStatement(db, { ...n, fromId: m.fromId, toId: m.toId, typeCode: m.tu.typeCode, from: homNay, to: m.tu.validTo })),
    ...ke.giayTo.huy.map((d) => gopHuyGiayToStatement(db, { ...n, id: d.id, expectedUpdatedAt: du(d.id).updated_at })),
    ...ke.giayTo.chep.map((d) => gopChepGiayToStatement(db, { ...n, du: du(d.id) })),
  ];
  return { truocDon: s, lat: gopLatStatement(db, n) };
}
```

- [ ] **Step 6: Chạy, thấy xanh**

Run: `node --test src/modules/parties/gop-lo.test.ts src/modules/parties/*.test.ts src/architecture.test.ts`
Expected: PASS (5 bài mới; bài parties cũ vẫn xanh; bài EXPLAIN nhận thêm các câu `parties.gop_*`, `parties.docs_for_merge`, `parties.merged_from`, `parties.persons_for_match`, `parties.open_person_phones`, `parties.list_by_ids`).

- [ ] **Step 7: Quan sát lính gác chặn thật (P16).** Tạm xoá `AND ${LINH_GAC("?11", "?2")}` → thay bằng `1` trong `GOP_MO_LIEN_HE` (chỉ câu đó) → chạy `node --test src/modules/parties/gop-lo.test.ts` → phải thấy `not ok 1 - G13 tất định …` (lô thua chèn thêm liên hệ cho B: `lh_b` 1 → 2) → hoàn nguyên → xanh. Chép câu đỏ vào nhật ký thi công (dòng sổ hàng rào ở Task 10).

- [ ] **Step 8: Commit**

```bash
git add src/modules/parties/repository.ts src/modules/parties/gop-lo.ts src/modules/parties/gop-lo.test.ts
git commit -m "$(cat <<'EOF'
Gộp hồ sơ: câu lệnh có lính gác trạng thái + bộ dựng lô (ADR-0068 Đ1)

parties là module nghiêm nên không dùng wonGuard đọc nhật ký: mọi câu mang
điều kiện "hai hồ sơ còn đang dùng, chưa gộp", lô thua cuộc đua không đổi gì
(đã thấy đỏ khi gỡ lính gác). Thứ tự lô giữ trigger nhà xe và chuỗi CCCD.
Danh sách + tra SĐT bỏ hồ sơ đã gộp (Đ7).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Route xem trước / gộp, chi tiết "đã gộp", chặn ghi trên hồ sơ đã gộp (G1–G3, G7, G9–G13, G16)

**Files:**
- Modify: `src/shared/contracts.ts`, `src/shared/audit-actions.ts`
- Modify: `src/modules/parties/index.ts`
- Modify: `src/route-access.test.ts`
- Create: `src/modules/parties/gop-route.test.ts`
- Modify: `src/giay-to-khong-lo-so.test.ts` (thêm một bài)

**Interfaces:**
- Consumes: `keHoachGop` (Task 3), `loGop`, `docsForMerge`, `mergedFromOf` (Task 5), `ctx.gopHoSo` (Task 4), `chuanHoaTen` (Task 2).
- Produces:
  - `POST /api/parties/:id/merge/preview` body `{ intoPartyId }` → `200 MergePreviewResponse`; `POST /api/parties/:id/merge` body `{ intoPartyId, xacNhan }` → `200 PartyResponse` (hồ sơ chính).
  - `PartyDto` thêm `mergedInto: PartyMergeRef | null; mergedFrom: PartyMergeRef[]`.
  - Hành động nhật ký `party_merged`.
  - Mọi route ghi của `parties` trên hồ sơ đã gộp → `409 party_merged`.

- [ ] **Step 1: Hợp đồng.** Thêm vào `src/shared/contracts.ts`:

(a) trong `interface PartyDto` (sau `editable: boolean;`):

```ts
  /** ADR-0068: hồ sơ này đã gộp vào hồ sơ nào (null = chưa gộp). Hồ sơ đã gộp chỉ đọc (`editable` = false). */
  mergedInto: PartyMergeRef | null;
  /** ADR-0068: các hồ sơ đã gộp VÀO hồ sơ này. */
  mergedFrom: PartyMergeRef[];
```

(b) sau `PartyMetaResponse`:

```ts
// ---- Gộp hồ sơ cá nhân (ADR-0068) — liên hệ chỉ hiện cho người giữ admin.manage (vốn thấy liên hệ ở Danh bạ); KHÔNG BAO GIỜ số giấy tờ. ----
export interface PartyMergeRef { id: string; displayName: string; mergedAt: string }
export type MergeItemKind = "LIEN_HE" | "CONG_VIEC" | "QUAN_HE" | "GIAY_TO";
export interface MergeItemDto { loai: MergeItemKind; nhan: string; ghiChu: string | null }
export interface MergePreviewResponse {
  source: { id: string; displayName: string };
  target: { id: string; displayName: string };
  /** Lý do chặn (rỗng = gộp được). `message` tiếng Việt để hiện thẳng. */
  chan: { code: string; message: string }[];
  chuyen: MergeItemDto[];
  giu: MergeItemDto[];
  bo: MergeItemDto[];
  /** Số đơn đổi người đặt sang hồ sơ chính (nháp + đã xác nhận chưa giao). */
  donDoi: number;
  /** Số đơn giữ ở hồ sơ phụ (đã giao + đã huỷ). */
  donGiu: number;
  /** Số dòng công nợ còn hiệu lực giữ ở hồ sơ phụ (sổ "theo người" của hồ sơ chính không thấy). */
  dongNoGiu: number;
}
export type LyDoKhopDto = "PHONE" | "NAME" | "LOGIN_PHONE";
export interface PartyDuplicatePairDto { a: PartyListItemDto; b: PartyListItemDto; lyDo: LyDoKhopDto[]; aCoTaiKhoan: boolean; bCoTaiKhoan: boolean }
export interface PartyDuplicatesResponse { pairs: PartyDuplicatePairDto[]; conNua: boolean }
/** Hồ sơ cá nhân khớp khi Thêm tài khoản (ADR-0068 Đ9) — không SĐT của hồ sơ. */
export interface PartyMatchDto { id: string; displayName: string; lyDo: ("PHONE" | "NAME")[]; vai: string[]; coTaiKhoan: boolean }
export interface PartyMatchResponse { khop: PartyMatchDto[] }
```

(c) `src/shared/audit-actions.ts` — thêm sau `party_relationship_changed`:

```ts
  // ADR-0068: gộp hồ sơ — HAI dòng (hồ sơ phụ + hồ sơ chính), `detail` chỉ tên hai hồ sơ + số dòng chuyển theo loại (KHÔNG SĐT, email, số giấy tờ).
  party_merged: { label: "Gộp hồ sơ", group: "party" },
```

- [ ] **Step 2: Viết test đỏ** `src/modules/parties/gop-route.test.ts`:

```ts
// Route gộp hồ sơ trên CẢ ứng dụng (khung thử tests/audit/harness.mjs, SQLite thật) — ADR-0068, đặc tả G1–G3, G7, G9–G13, G16 + Review Focus 2, 4.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const DRIVER = "12121212-1212-4121-8121-121212121212";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const AT = "2026-09-01T00:00:00.000Z";
const SO_X = "0912000111";
const TEN = "Nguyễn Tiền Phương";
const HOM_NAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

function nen() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "Bán Hàng", ["SALES"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]], [ADM2, "0900000006", "Quản Trị Hai", ["ADMIN"]],
    [SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]], [FIELD, "0900000004", "Hướng Dẫn", ["FIELD"]], [ACC, "0900000005", "Kế Toán", ["ACCOUNTING"]],
    [PARTNER, "0900000008", "Đối Tác", ["PARTNER"]], [INTERN, "0900000009", "Thực Tập", ["INTERN"]], [DRIVER, "0900000010", "Tài Xế", ["DRIVER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Hồ sơ phụ A: khách có SĐT chính X + công việc "Lái cano" ở bến LOC. */
async function taoA(w: any, ten = TEN, so = SO_X): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: ten, contacts: [{ kind: "PHONE", value: so }] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.party.id as string;
  assert.equal((await w.call("POST", `/api/parties/${id}/roles`, { as: ADM, body: { roleTypeCode: "BOAT_CAPTAIN", locationId: LOC } })).status, 201);
  return id;
}
/** Hồ sơ chính B: tài khoản "Nhân viên kinh doanh" không SĐT liên hệ. Trả { staffId, partyId }. */
async function taoB(w: any, ten = TEN, phone = "0900000055"): Promise<{ staffId: string; partyId: string }> {
  const r = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: ten, phone, roles: ["SALES_STAFF"], taoHoSoMoi: true } });
  assert.equal(r.status, 201, r.text);
  return { staffId: r.json.staff.id, partyId: r.json.staff.partyId };
}
const gop = (w: any, as: string, a: string, b: string, xacNhan: string = TEN) => w.call("POST", `/api/parties/${a}/merge`, { as, body: { intoPartyId: b, xacNhan } });
const xemTruoc = (w: any, as: string, a: string, b: string) => w.call("POST", `/api/parties/${a}/merge/preview`, { as, body: { intoPartyId: b } });
function donCua(w: any, id: string, booker: string, trangThai: "draft" | "confirmed" | "delivered" | "cancelled") {
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at, booker_party_id)
    VALUES (?, ?, ?, 'draft', 'Khách', '0900000099', 100000, 100000, 100000, ?, ?, ?)`).run(id, `TD-${id.slice(-4)}`, SALES, AT, AT, booker);
  w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-12-10')").run(`sv-${id}`, id);
  if (trangThai === "cancelled") w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
  if (trangThai !== "draft" && trangThai !== "cancelled") w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, id);
  if (trangThai === "delivered") w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(AT, SUP, id);
}

test("G1 + G10: xem trước không ghi gì; gộp chuyển SĐT (chính) + Lái cano ở bến từ hôm nay; A ngưng, trỏ B; dòng của A đóng hôm nay; quyền tài khoản B không đổi", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const quyenTruoc = w.q("SELECT permission_type_code c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c", B.staffId);
  const soDongTruoc = w.q("SELECT (SELECT count(*) FROM pty_contact_point) a, (SELECT count(*) FROM pty_party_role) b, (SELECT count(*) FROM audit_log) c")[0];
  const p = await xemTruoc(w, ADM, A, B.partyId);
  assert.equal(p.status, 200, p.text);
  assert.deepEqual(p.json.chan, []);
  assert.deepEqual(p.json.chuyen.map((x: any) => [x.loai, x.ghiChu]), [["LIEN_HE", "liên hệ chính"], ["CONG_VIEC", null]]);
  assert.match(p.json.chuyen[0].nhan, new RegExp(SO_X));
  assert.deepEqual([p.json.donDoi, p.json.donGiu, p.json.dongNoGiu], [0, 0, 0]);
  assert.deepEqual(w.q("SELECT (SELECT count(*) FROM pty_contact_point) a, (SELECT count(*) FROM pty_party_role) b, (SELECT count(*) FROM audit_log) c")[0], soDongTruoc, "xem trước không ghi");

  const r = await gop(w, ADM, A, B.partyId);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.party.id, B.partyId);
  assert.deepEqual(w.q("SELECT value_normalized v, is_primary p, valid_from_date f FROM pty_contact_point WHERE party_id = ? AND valid_to_date IS NULL", B.partyId).map((x: any) => ({ ...x })),
    [{ v: SO_X, p: 1, f: HOM_NAY }]);
  assert.deepEqual(w.q("SELECT role_type_code c, location_id l, valid_from_date f FROM pty_party_role WHERE party_id = ? AND role_type_code = 'BOAT_CAPTAIN' AND valid_to_date IS NULL", B.partyId)
    .map((x: any) => ({ ...x })), [{ c: "BOAT_CAPTAIN", l: LOC, f: HOM_NAY }]);
  assert.deepEqual({ ...w.q("SELECT active, merged_into_id m FROM pty_party WHERE id = ?", A)[0] }, { active: 0, m: B.partyId });
  assert.deepEqual(w.q("SELECT valid_to_date t FROM pty_contact_point WHERE party_id = ? UNION ALL SELECT valid_to_date FROM pty_party_role WHERE party_id = ?", A, A).map((x: any) => x.t),
    [HOM_NAY, HOM_NAY]);
  assert.deepEqual(w.q("SELECT permission_type_code c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c", B.staffId), quyenTruoc);
});

test("G2 + G3 + Đ7: tra SĐT chỉ ra B; danh sách (kể cả gồm hồ sơ ngưng) không có A; A trả mergedInto, chỉ đọc; B trả mergedFrom", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  const tra = await w.call("GET", `/api/parties/lookup?phone=${SO_X}`, { as: SALES });
  assert.deepEqual(tra.json.matches.map((m: any) => m.id), [B.partyId]);
  const ds = await w.call("GET", `/api/parties?q=${encodeURIComponent("Tiền Phương")}&includeInactive=1`, { as: SALES });
  assert.ok(!ds.json.parties.some((x: any) => x.id === A));
  const ctA = (await w.call("GET", `/api/parties/${A}`, { as: ADM })).json.party;
  assert.deepEqual([ctA.mergedInto.id, ctA.mergedInto.displayName, ctA.editable], [B.partyId, TEN, false]);
  const ctB = (await w.call("GET", `/api/parties/${B.partyId}`, { as: ADM })).json.party;
  assert.deepEqual(ctB.mergedFrom.map((x: any) => x.id), [A]);
  assert.equal(ctB.mergedInto, null);
});

test("G7 + Review Focus 2: đơn nháp / đã xác nhận chưa giao đổi người đặt sang B và updated_at tăng; đã giao / đã huỷ giữ A", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const ids = ["00000000-0000-4000-8000-00000000d001", "00000000-0000-4000-8000-00000000d002", "00000000-0000-4000-8000-00000000d003", "00000000-0000-4000-8000-00000000d004"];
  donCua(w, ids[0]!, A, "draft"); donCua(w, ids[1]!, A, "confirmed"); donCua(w, ids[2]!, A, "delivered"); donCua(w, ids[3]!, A, "cancelled");
  const cu = w.q("SELECT updated_at u FROM orders WHERE id = ?", ids[0])[0].u as string;
  const p = await xemTruoc(w, ADM, A, B.partyId);
  assert.deepEqual([p.json.donDoi, p.json.donGiu], [2, 2]);
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  assert.deepEqual(ids.map((id) => w.q("SELECT booker_party_id b FROM orders WHERE id = ?", id)[0].b), [B.partyId, B.partyId, A, A]);
  assert.ok((w.q("SELECT updated_at u FROM orders WHERE id = ?", ids[0])[0].u as string) > cu);
  assert.equal(w.sqlite.prepare("UPDATE orders SET customer_name = 'Ghi đè' WHERE id = ? AND updated_at = ?").run(ids[0], cu).changes, 0, "lần lưu mang mốc cũ bị chặn");
});

test("G9: đúng HAI dòng party_merged (A và B), chỉ tên + số dòng — không SĐT, không email", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  const rows = w.q("SELECT target_id t, detail d FROM audit_log WHERE action = 'party_merged' ORDER BY target_id");
  assert.deepEqual(rows.map((x: any) => x.t).sort(), [A, B.partyId].sort());
  for (const x of rows) {
    assert.match(x.d, new RegExp(TEN));
    assert.doesNotMatch(x.d, /\d{6,}|@/);
  }
});

test("G11 qua route: hồ sơ phụ có tài khoản; hai bên có tài khoản; cùng hồ sơ; tổ chức; A đang phụ trách đơn → 409 kèm mã, không đổi gì", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const B2 = await taoB(w, "Người Thứ Hai", "0900000056");
  const org = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Đại Lý Thử" } })).json.party.id;
  const ca: [string, string, string][] = [
    [B.partyId, A, "merge_source_has_account"], [B.partyId, B2.partyId, "merge_both_accounts"], [A, A, "merge_same"], [org, B.partyId, "merge_not_person"],
  ];
  for (const [a, b, code] of ca) {
    const r = await gop(w, ADM, a, b, "bất kỳ");
    assert.equal(r.status, 409, `${code}: ${r.text}`);
    assert.equal(r.json.error.code, code);
  }
  const don = "00000000-0000-4000-8000-00000000d101";
  donCua(w, don, A, "draft");
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES ('h1', ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)`)
    .run(don, A, AT, AT, AT);
  const r = await gop(w, ADM, A, B.partyId);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "merge_source_busy");
  assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", A)[0].active, 1);
});

test("G12: Bán hàng / Kế toán / HDV / Đối tác / Thực tập / Tài xế → 403 ở cả hai route; Quản trị gộp vào hồ sơ của Quản trị khác → 403; Toàn quyền → được", async () => {
  const w = nen();
  const A = await taoA(w);
  for (const as of [SALES, ACC, FIELD, PARTNER, INTERN, DRIVER]) {
    assert.equal((await xemTruoc(w, as, A, `pty-${ADM2}`)).status, 403, `xem trước ${as}`);
    assert.equal((await gop(w, as, A, `pty-${ADM2}`)).status, 403, `gộp ${as}`);
  }
  const r = await gop(w, ADM, A, `pty-${ADM2}`);
  assert.equal(r.status, 403, r.text);
  assert.equal((await xemTruoc(w, ADM, A, `pty-${ADM2}`)).status, 403);
  // Tên hồ sơ của ADM2 là "Quản Trị Hai" — xác nhận gõ lại tên hồ sơ PHỤ (A).
  assert.equal((await gop(w, SUP, A, `pty-${ADM2}`)).status, 200);
});

test("G13 qua route: hai yêu cầu gộp cùng A cùng lúc → đúng một 200, một 409; B chỉ có MỘT dòng SĐT X", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const [r1, r2] = await Promise.all([gop(w, ADM, A, B.partyId), gop(w, ADM, A, B.partyId)]);
  assert.deepEqual([r1.status, r2.status].sort(), [200, 409]);
  const thua = r1.status === 409 ? r1 : r2;
  assert.ok(["merge_lost_race", "merge_inactive"].includes(thua.json.error.code), thua.text);
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND value_normalized = ? AND valid_to_date IS NULL", B.partyId, SO_X)[0].n, 1);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_merged'")[0].n, 2);
});

test("Review Focus 4 + xác nhận: gõ lại tên dạng NFD, chữ hoa, thừa khoảng trắng → được; gõ sai tên → 409 merge_confirm_mismatch, không đổi gì", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const sai = await gop(w, ADM, A, B.partyId, "Nguyễn Tiền");
  assert.equal(sai.status, 409);
  assert.equal(sai.json.error.code, "merge_confirm_mismatch");
  assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", A)[0].active, 1);
  assert.equal((await gop(w, ADM, A, B.partyId, `  ${TEN.normalize("NFD").toUpperCase()}  `)).status, 200);
});

test("G5 qua route: B đã có SĐT chính Y → X sang B không chính, Y giữ chính", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  w.sqlite.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
    VALUES ('ptc-y', ?, 'PHONE', '0913000999', '0913000999', NULL, 1, '2026-09-01', ?, ?)`).run(B.partyId, AT, AT);
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  assert.deepEqual(w.q("SELECT value_normalized v, is_primary p FROM pty_contact_point WHERE party_id = ? AND valid_to_date IS NULL ORDER BY v", B.partyId).map((x: any) => ({ ...x })),
    [{ v: SO_X, p: 0 }, { v: "0913000999", p: 1 }]);
});

test("G16: sau gộp, mọi route ghi của parties trên hồ sơ phụ → 409 party_merged; quan hệ trỏ TỚI hồ sơ đã gộp cũng 409", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const C = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Công Ty Khách" } })).json.party.id;
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  const cu = w.q("SELECT updated_at u FROM pty_party WHERE id = ?", A)[0].u;
  const cid = w.q("SELECT id FROM pty_contact_point WHERE party_id = ? LIMIT 1", A)[0].id;
  const rid = w.q("SELECT id FROM pty_party_role WHERE party_id = ? LIMIT 1", A)[0].id;
  const ca: [string, string, unknown][] = [
    ["PUT", `/api/parties/${A}`, { fullName: "Đổi Tên", active: false, expectedUpdatedAt: cu }],
    ["POST", `/api/parties/${A}/contacts`, { kind: "PHONE", value: "0914000444" }],
    ["POST", `/api/parties/${A}/contacts/${cid}/end`, {}],
    ["POST", `/api/parties/${A}/roles`, { roleTypeCode: "GUIDE" }],
    ["POST", `/api/parties/${A}/roles/${rid}/end`, {}],
    ["POST", `/api/parties/${A}/relationships`, { fromPartyId: A, toPartyId: C, relationshipTypeCode: "CONTACT_OF" }],
    ["POST", `/api/parties/${C}/relationships`, { fromPartyId: A, toPartyId: C, relationshipTypeCode: "CONTACT_OF" }],
    ["POST", `/api/parties/${A}/documents`, { typeCode: "HEALTH_CHECK", number: "SK1", expiryDate: "2030-01-01" }],
  ];
  for (const [m, path, body] of ca) {
    const r = await w.call(m, path, { as: SUP, body });
    assert.equal(r.status, 409, `${m} ${path}: ${r.text}`);
    assert.equal(r.json.error.code, "party_merged", `${m} ${path}`);
  }
  const tk = await w.call("POST", "/api/staff", { as: ADM, body: { partyId: A, phone: "0900000077", roles: ["SALES_STAFF"] } });
  assert.equal(tk.status, 409, tk.text);
});
```

- [ ] **Step 3: Chạy, thấy đỏ**

Run: `node --test src/modules/parties/gop-route.test.ts`
Expected: FAIL — các bài gộp nhận `404 not_found` (route chưa có); G16 nhận 200/201 thay vì 409.

- [ ] **Step 4: Cài đặt trong `src/modules/parties/index.ts`.**

(a) Import thêm (gộp vào các dòng import có sẵn):

```ts
import { auditStatement } from "../audit";
import type { MergeItemDto, MergePreviewResponse, PartyMergeRef } from "../../shared/contracts";
import { chuanHoaTen } from "../../shared/ho-so-trung";
import type { DonCuaNguoiDatTom } from "../../shared/router";
import { keHoachGop, type CongViecGop, type GiayToGop, type HoSoGop, type KeHoachGop, type NhomVai } from "./gop";
import { loGop } from "./gop-lo";
// thêm vào dòng import từ "./repository": docsForMerge, mergedFromOf, type GopDocRow
```

(b) Hằng + hàm dùng chung (đặt sau `constraintProblem`):

```ts
// ---- Gộp hồ sơ cá nhân (ADR-0068) ----------------------------------------------------------------------------------------------------------------------
const DA_GOP = () => error(409, "party_merged", "Hồ sơ này đã gộp vào hồ sơ khác — mở hồ sơ chính để sửa.");
const MERGE_FORBIDDEN = () =>
  error(403, "forbidden", "Tài khoản này không gộp được: hồ sơ chính (hoặc hồ sơ liên quan) gắn tài khoản mà bạn không quản lý được.");
const MERGE_LOST_RACE = () => error(409, "merge_lost_race", "Hồ sơ vừa được gộp hoặc sửa ở nơi khác — tải lại, xem trước lại rồi thử lại.");
const MERGE_CONFIRM = () => error(409, "merge_confirm_mismatch", "Gõ lại đúng tên hồ sơ phụ để xác nhận gộp.");
const LY_DO_HUY_GIAY_TO_GOP = "đã gộp vào hồ sơ khác"; // ADR-0068 Đ1 bước 4 — bảng giấy tờ không có cột lý do (kế hoạch R5): lý do nằm ở nhật ký
const intoParam = (b: Record<string, unknown> | null): string | null =>
  typeof b?.intoPartyId === "string" && PARTY_ID_RE.test(b.intoPartyId) ? b.intoPartyId : null;

interface HoSoDoc { hs: HoSoGop; giayToDu: GopDocRow[]; acc: PartyAccountVerdict }
interface TinhGop { A: HoSoDoc; B: HoSoDoc; ke: KeHoachGop; don: DonCuaNguoiDatTom; soNo: number; homNay: string }

async function docHoSoGop<A extends "admin">(ctx: Ctx<A>, id: string, nhom: ReadonlyMap<string, NhomVai>): Promise<HoSoDoc | null> {
  const db = ctx.env.DB;
  const [detail, acc, chu, docs, vao] = await Promise.all([getPartyDetail(db, id), ctx.partyAccount(id), laCongTyChu(db, id), docsForMerge(db, id), mergedFromOf(db, id)]);
  if (!detail) return null;
  const p = detail.party;
  return {
    acc,
    giayToDu: docs,
    hs: {
      id, kind: p.party_kind, displayName: p.display_name, active: p.active === 1, mergedIntoId: p.merged_into_id, laCongTyChu: chu, coTaiKhoan: acc.linked,
      coHoSoTroVao: vao.length > 0,
      lienHe: detail.contacts.map((c) => ({
        id: c.id, kind: c.contact_kind_code, value: c.value, valueNormalized: c.value_normalized, label: c.label, isPrimary: c.is_primary === 1, validFrom: c.valid_from_date,
        validTo: c.valid_to_date,
      })),
      congViec: detail.roles.map((r) => ({
        id: r.id, code: r.role_type_code, name: r.role_name, group: nhom.get(r.role_type_code) ?? "OTHER", locationId: r.location_id, locationName: r.location_name,
        validFrom: r.valid_from_date, validTo: r.valid_to_date,
      })),
      quanHe: detail.relationships.map((x) => ({
        id: x.id, typeCode: x.relationship_type_code, typeName: x.type_name, fromId: x.from_party_id, fromName: x.from_name, toId: x.to_party_id, toName: x.to_name,
        validFrom: x.valid_from_date, validTo: x.valid_to_date,
      })),
      giayTo: docs.map((d) => ({
        id: d.id, typeCode: d.document_type_code, typeName: d.type_name, className: d.class_name, previousId: d.previous_id, voided: d.voided_at !== null, current: d.is_current === 1,
      })),
    },
  };
}

/** Đọc hai hồ sơ + phần của module khác rồi tính kế hoạch (dùng cho CẢ xem trước lẫn gộp — gộp luôn tính lại, không tin xem trước). */
async function tinhGop<A extends "admin">(ctx: Ctx<A>, aId: string, bId: string, homNay: string): Promise<Response | TinhGop> {
  const nhom = new Map((await listRoleTypes(ctx.env.DB)).map((t) => [t.code, t.role_group as NhomVai]));
  const [A, B] = await Promise.all([docHoSoGop(ctx, aId, nhom), docHoSoGop(ctx, bId, nhom)]);
  if (!A || !B) return NOT_FOUND();
  // G12: hồ sơ chính gắn tài khoản mà người gộp không quản được (Quản trị khác / Toàn quyền) → 403 — luật cấp bậc có sẵn (staff tính qua ctx.partyAccount).
  if (B.acc.linked && !B.acc.manageable) return MERGE_FORBIDDEN();
  const [viec, don, soNo] = await Promise.all([ctx.gopHoSo.viecCua(aId), ctx.gopHoSo.donNguoiDat(aId), ctx.gopHoSo.soDongNo(aId)]);
  const ke = keHoachGop(A.hs, B.hs, { ...viec, donLechTien: don.lechTien }, homNay);
  // Kế hoạch R4: bên thứ ba của quan hệ bị chuyển / đóng cũng qua luật cấp bậc (như route kết thúc quan hệ xét cả hai đầu).
  for (const khac of ke.benThu3) {
    const v = await ctx.partyAccount(khac);
    if (v.linked && !v.manageable) return MERGE_FORBIDDEN();
  }
  return { A, B, ke, don, soNo, homNay };
}

const NHAN_BO_VAI = { DA_CO: "hồ sơ chính đã có", VUA_KET_THUC: "hồ sơ chính vừa kết thúc công việc này hôm nay" } as const;
const NHAN_CHI_DONG = {
  HAI_DAU_LA_MOT: "quan hệ giữa hai hồ sơ đang gộp — chỉ kết thúc",
  DA_CO: "hồ sơ chính đã có",
  VUA_KET_THUC: "hồ sơ chính vừa kết thúc quan hệ này hôm nay",
} as const;
/** Bảng xem trước (G10). Liên hệ hiện nguyên giá trị (người xem giữ admin.manage); giấy tờ chỉ loại + hạng, KHÔNG số. */
function xemTruocDto(t: TinhGop): MergePreviewResponse {
  const { A, B, ke } = t;
  const tenSau = (id: string, ten: string) => (id === B.hs.id ? B.hs.displayName : ten);
  const nhanLienHe = (c: { kind: string; value: string }) => `${c.kind === "PHONE" ? "Điện thoại" : "Email"} ${c.value}`;
  const nhanViec = (r: CongViecGop) => `${r.name} — ${r.locationName ?? "mọi nơi"}`;
  const nhanGiayTo = (d: GiayToGop) => (d.className ? `${d.typeName} ${d.className}` : d.typeName);
  const muc = (loai: MergeItemDto["loai"], nhan: string, ghiChu: string | null = null): MergeItemDto => ({ loai, nhan, ghiChu });
  return {
    source: { id: A.hs.id, displayName: A.hs.displayName },
    target: { id: B.hs.id, displayName: B.hs.displayName },
    chan: ke.chan.map((c) => ({ code: c.code, message: c.message })),
    chuyen: [
      ...ke.lienHe.mo.map((m) => muc("LIEN_HE", nhanLienHe(m.tu), m.chinh ? "liên hệ chính" : null)),
      ...ke.congViec.mo.map((r) => muc("CONG_VIEC", nhanViec(r))),
      ...ke.quanHe.mo.map((m) => muc("QUAN_HE", `${tenSau(m.fromId, m.tu.fromName)} — ${m.tu.typeName} — ${tenSau(m.toId, m.tu.toName)}`)),
      ...ke.giayTo.chep.map((d) => muc("GIAY_TO", nhanGiayTo(d))),
    ],
    giu: ke.giayTo.giu.map((d) => muc("GIAY_TO", nhanGiayTo(d), "hồ sơ chính đã có loại giấy tờ này")),
    bo: [
      ...ke.lienHe.bo.map((c) => muc("LIEN_HE", nhanLienHe(c), "hồ sơ chính đã có")),
      ...ke.congViec.bo.map((x) => muc("CONG_VIEC", nhanViec(x.cv), NHAN_BO_VAI[x.lyDo])),
      ...ke.quanHe.chiDong.map((x) => muc("QUAN_HE", `${x.qh.fromName} — ${x.qh.typeName} — ${x.qh.toName}`, NHAN_CHI_DONG[x.lyDo])),
    ],
    donDoi: t.don.doi,
    donGiu: t.don.giuDaGiao + t.don.giuDaHuy,
    dongNoGiu: t.soNo,
  };
}
/** Chi tiết nhật ký party_merged (G9): tên hai hồ sơ + số dòng theo loại. KHÔNG SĐT, email, số giấy tờ. */
function chiTietGop(t: TinhGop): string {
  const k = t.ke;
  const giayTo = k.giayTo.huy.length > 0 ? ` (dòng ở hồ sơ phụ huỷ, lý do: ${LY_DO_HUY_GIAY_TO_GOP})` : "";
  return `gộp "${t.A.hs.displayName}" vào "${t.B.hs.displayName}": liên hệ ${k.lienHe.mo.length}, công việc ${k.congViec.mo.length}, quan hệ ${k.quanHe.mo.length}, `
    + `giấy tờ ${k.giayTo.chep.length}${giayTo}, đơn đổi người đặt ${t.don.doi}`;
}
```

(c) `toDetail` + `respondParty` — thêm tham số `vao` và hai trường, hồ sơ đã gộp chỉ đọc:

```ts
function toDetail(
  d: { party: PartyRow; contacts: ContactRow[]; roles: RoleRow[]; relationships: RelationshipRow[] },
  today: string,
  access: { accountLinked: boolean; editable: boolean },
  vao: { id: string; display_name: string; merged_at: string }[],
): PartyDto {
  const p = d.party;
  const roles = d.roles.map(toRole);
  const openRoleCodes = roles.filter((r) => r.validFrom <= today && (r.validTo === null || r.validTo >= today)).map((r) => r.roleTypeCode);
  const mergedInto: PartyMergeRef | null = p.merged_into_id ? { id: p.merged_into_id, displayName: p.merged_into_name ?? "", mergedAt: p.merged_at ?? "" } : null;
  return {
    // … giữ nguyên mọi trường hiện có …
    ...access,
    mergedInto,
    mergedFrom: vao.map((r) => ({ id: r.id, displayName: r.display_name, mergedAt: r.merged_at })),
  };
}
```

Trong `respondParty`:

```ts
  const [detail, acc, chu, vao] = await Promise.all([getPartyDetail(ctx.env.DB, id), ctx.partyAccount(id), laCongTyChu(ctx.env.DB, id), mergedFromOf(ctx.env.DB, id)]);
  if (!detail) return NOT_FOUND();
  // ADR-0068 G16: hồ sơ đã gộp chỉ đọc.
  const editable = detail.party.merged_into_id === null
    && (chu ? can(ctx.staff, "company.legal.write") : acc.linked ? can(ctx.staff, "party.staff.write") && acc.manageable : can(ctx.staff, "party.write"));
  const today = vnToday(new Date());
  const party = toDetail(detail, today, { accountLinked: acc.linked, editable }, vao);
```

(d) Hai route mới — đặt ngay TRƯỚC khối `// ---- Tạo / xem / sửa` (đường dẫn dài hơn `/:id` nên không xung đột thứ tự):

```ts
    // ---- Gộp hồ sơ cá nhân (ADR-0068 Đ1, Đ2, Đ5): admin.manage + cấp bậc; xem trước không ghi gì; gộp TÍNH LẠI kế hoạch rồi chạy MỘT db.batch() --------------
    route("POST", "/api/parties/:id/merge/preview", "admin", async (ctx) => {
      const { request, params, staff } = ctx;
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id) return NOT_FOUND();
      const into = intoParam(await readJson(request));
      if (!into) return error(400, "invalid_input", "Chọn hồ sơ chính để gộp vào.");
      const t = await tinhGop(ctx, id, into, vnToday(new Date()));
      return t instanceof Response ? t : json(xemTruocDto(t) satisfies MergePreviewResponse);
    }),

    route("POST", "/api/parties/:id/merge", "admin", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id) return NOT_FOUND();
      const body = await readJson(request);
      const into = intoParam(body);
      if (!into) return error(400, "invalid_input", "Chọn hồ sơ chính để gộp vào.");
      const now = new Date();
      const t = await tinhGop(ctx, id, into, vnToday(now));
      if (t instanceof Response) return t;
      const dau = t.ke.chan[0];
      if (dau) return error(409, dau.code, dau.message);
      if (chuanHoaTen(typeof body?.xacNhan === "string" ? body.xacNhan : "") !== chuanHoaTen(t.A.hs.displayName)) return MERGE_CONFIRM();
      const at = now.toISOString();
      const lo = loGop(env.DB, { a: id, b: into, ke: t.ke, giayToDu: new Map(t.A.giayToDu.map((d) => [d.id, d])), homNay: t.homNay, at, actorId: staff.id });
      const detail = chiTietGop(t);
      // Thứ tự (kế hoạch R1, R2): phần parties → câu đổi người đặt đơn (thấy "A còn đang dùng") → câu LẬT A → hai dòng nhật ký `changes() > 0`.
      const stmts = [
        ...lo.truocDon,
        ctx.gopHoSo.cauDoiDon(id, into, at),
        lo.lat,
        auditStatement(env.DB, { staffId: staff.id, action: "party_merged", at, targetType: "party", targetId: id, detail }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "party_merged", at, targetType: "party", targetId: into, detail }, "changes() > 0"),
      ];
      let results: D1Result[];
      try {
        results = await env.DB.batch(stmts);
      } catch (e) {
        // Ai đó đổi một trong hai hồ sơ (liên hệ chính, công việc, giấy tờ, đơn) giữa lúc tính và lúc ghi → trigger / chỉ mục duy nhất huỷ CẢ lô.
        const m = e instanceof Error ? e.message : "";
        if (/UNIQUE constraint failed|party_role_overlap|party_relationship_overlap|person_document_|party_merge_|party_role_group_conflict|drives_for|money_invariant/.test(m)) {
          return MERGE_LOST_RACE();
        }
        throw e;
      }
      if ((results[stmts.length - 3]!.meta.changes ?? 0) === 0) return MERGE_LOST_RACE();
      return respondParty(ctx, into);
    }),
```

(e) G16 — chặn ghi trên hồ sơ đã gộp. Sửa đúng các chỗ sau (giữ thứ tự: 404 → 403 → **409 party_merged** → đọc thân):

- `PUT /api/parties/:id`: ngay sau khối `if (chu ? … ) { return … }` thêm `if (current.merged_into_id) return DA_GOP();`
- `POST /api/parties/:id/contacts`: ngay sau khối quyền thêm `if (detail.party.merged_into_id) return DA_GOP();`
- `POST /api/parties/:id/contacts/:cid/end`, `POST /api/parties/:id/roles/:rid/end`, `POST /api/parties/:id/relationships/:rid/end`, `POST /api/parties/:id/documents/:did/renew`, `POST /api/parties/:id/documents/:did/correct`: đổi dòng `if (!id || … || !(await findParty(env.DB, id))) return NOT_FOUND();` thành

```ts
      const hoSo = id ? await findParty(env.DB, id) : null;
      if (!id || !hoSo /* giữ các vế !cid / !rid có sẵn của route */) return NOT_FOUND();
```

  và thêm `if (hoSo.merged_into_id) return DA_GOP();` ngay sau lời kiểm quyền / cấp bậc của route đó.
- `POST /api/parties/:id/roles` và `POST /api/parties/:id/documents`: sau `if (acc.linked && !acc.manageable) return …;` thêm `if (party.merged_into_id) return DA_GOP();`
- `POST /api/parties/:id/relationships`: đổi `if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();` như trên, thêm `if (hoSo.merged_into_id) return DA_GOP();` sau lời kiểm cấp bậc; và sau dòng `const other = …` thêm:

```ts
      if ((await findParty(env.DB, other))?.merged_into_id) return DA_GOP(); // đầu kia đã gộp → trỏ quan hệ vào hồ sơ chính
```

- `src/modules/staff/index.ts` — `partySummary` (của parties) trả thêm `mergedIntoId`; `createAccountWithRolesStatements` trả mã riêng. Sửa `partySummary` trong `src/modules/parties/index.ts`:

```ts
export async function partySummary(db: D1Database, id: string): Promise<{ kind: "PERSON" | "ORGANIZATION"; active: boolean; displayName: string; mergedIntoId: string | null } | null> {
  const p = await findParty(db, id);
  return p ? { kind: p.party_kind, active: p.active === 1, displayName: p.display_name, mergedIntoId: p.merged_into_id } : null;
}
```

  Trong `src/modules/staff/index.ts`: kiểu `CreateWithRoles` nhánh lỗi thành `{ ok: false; message: string; code?: "party_merged" }`, và trong nhánh `existingPartyId` thêm TRƯỚC dòng `if (!party.active) …`:

```ts
    if (party.mergedIntoId) return { ok: false, code: "party_merged", message: "Hồ sơ này đã gộp vào hồ sơ khác — chọn hồ sơ chính." };
```

  Trong `src/modules/accounts/index.ts` (route `POST /api/staff`, đường vai): đổi `if (!created.ok) return error(409, "account_rule", created.message);` thành `if (!created.ok) return error(409, created.code ?? "account_rule", created.message);`

(f) `route-access.test.ts` — thêm hai dòng vào SNAPSHOT (cạnh các route parties) và nâng số:

```ts
  { method: "POST", path: "/api/parties/:id/merge/preview", access: "admin" }, // ADR-0068: xem trước gộp hồ sơ — admin.manage viết thẳng + cấp bậc
  { method: "POST", path: "/api/parties/:id/merge", access: "admin" }, // ADR-0068: gộp hồ sơ cá nhân — admin.manage + cấp bậc, một db.batch()
```

  Thêm dòng chú thích lịch sử `// 2026-09-30 (ADR-0068): + 2 route gộp hồ sơ (POST /api/parties/:id/merge/preview, …/merge) = 178.` và đổi ba số `176` thành `178`.

- [ ] **Step 5: Ca giấy tờ không lộ số** — thêm bài vào cuối `src/giay-to-khong-lo-so.test.ts`:

```ts
test("ADR-0068 G8/G10: gộp hồ sơ — xem trước, phản hồi gộp, câu lỗi, nhật ký KHÔNG chứa số giấy tờ; số đi đúng sang hồ sơ chính (xem đủ số)", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const tao = async (ten: string) => (await w.call("POST", "/api/parties", { as: SUP, body: { kind: "PERSON", fullName: ten, contacts: [] } })).json.party.id as string;
  const A = await tao("Gộp Dò Số");
  const B = await tao("Gộp Dò Số Chính");
  assert.equal((await w.call("POST", `/api/parties/${A}/documents`, { as: SUP, body: { typeCode: "CCCD", number: SO_CCCD, issuedPlace: NOI, expiryDate: "2035-01-01" } })).status, 201);
  assert.equal((await w.call("POST", `/api/parties/${A}/documents`, { as: SUP, body: { typeCode: "GPLX", number: SO_GPLX, classCode: "D2", expiryDate: "2031-01-01" } })).status, 201);
  const than: string[] = [];
  const p = await w.call("POST", `/api/parties/${A}/merge/preview`, { as: SUP, body: { intoPartyId: B } });
  than.push(p.text);
  assert.deepEqual(p.json.chuyen.filter((x: any) => x.loai === "GIAY_TO").map((x: any) => x.nhan).sort(), ["Căn cước công dân (CCCD)", "Giấy phép lái xe Hạng D2"]);
  const sai = await w.call("POST", `/api/parties/${A}/merge`, { as: SUP, body: { intoPartyId: B, xacNhan: "sai tên" } });
  than.push(sai.text);
  const r = await w.call("POST", `/api/parties/${A}/merge`, { as: SUP, body: { intoPartyId: B, xacNhan: "Gộp Dò Số" } });
  assert.equal(r.status, 200, r.text);
  than.push(r.text);
  const nhatKy = JSON.stringify(w.q("SELECT detail FROM audit_log"));
  for (const s of [...than, nhatKy]) for (const dau of DAU_SO_NGUOI) assert.ok(!s.includes(dau), `lộ số ${dau}`);
  assert.ok(!nhatKy.includes(NOI), "nơi cấp không vào nhật ký");
  const cccdB = w.q("SELECT id FROM pty_person_document WHERE party_id = ? AND document_type_code = 'CCCD'", B)[0].id;
  const xem = await w.call("POST", `/api/parties/${B}/documents/${cccdB}/reveal`, { as: SUP, body: {} });
  assert.equal(xem.json.number, SO_CCCD, "chống bài rỗng: số thật đã sang hồ sơ chính");
});
```

- [ ] **Step 6: Chạy, thấy xanh**

Run: `node --test src/modules/parties/gop-route.test.ts src/giay-to-khong-lo-so.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts src/shared/audit-actions.test.ts src/modules/parties/*.test.ts src/modules/accounts/*.test.ts`
Expected: PASS toàn bộ (gop-route: 10 bài).

Run: `npm run typecheck` → Expected: 0 lỗi.

- [ ] **Step 7: Commit**

```bash
git add src/shared/contracts.ts src/shared/audit-actions.ts src/modules/parties/index.ts src/modules/parties/gop-route.test.ts src/modules/staff/index.ts src/modules/accounts/index.ts src/route-access.test.ts src/giay-to-khong-lo-so.test.ts
git commit -m "$(cat <<'EOF'
Gộp hồ sơ: route xem trước / gộp, hồ sơ đã gộp chỉ đọc (ADR-0068)

Quản trị / Toàn quyền (admin.manage + cấp bậc) xem bảng chuyển / giữ / bỏ,
gõ lại tên rồi gộp trong một lô; máy chủ tính lại kế hoạch, không tin xem
trước. Hai dòng nhật ký không SĐT, không số giấy tờ. Mọi route ghi trên hồ
sơ đã gộp trả 409 để không ai sửa nhầm hồ sơ đã ẩn.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `GET /api/parties/duplicates` — danh sách hồ sơ nghi trùng (P2, T1)

**Files:**
- Modify: `src/modules/parties/index.ts`, `src/route-access.test.ts`
- Create: `src/modules/parties/nghi-trung.test.ts`

**Interfaces:**
- Consumes: `capNghiTrung` (Task 2), `personsForMatch`, `openPersonPhones`, `listPartiesByIds` (Task 5), `ctx.gopHoSo.soDangNhap` (Task 4).
- Produces: `GET /api/parties/duplicates` → `200 PartyDuplicatesResponse` (Task 9 dùng).

- [ ] **Step 1: Viết test đỏ** `src/modules/parties/nghi-trung.test.ts`:

```ts
// ADR-0068 Đ8, đặc tả T1 + Review Focus 4: cặp hồ sơ cá nhân đang dùng nghi trùng — cùng SĐT liên hệ mở, cùng tên chuẩn hoá (kể cả NFD), số đăng nhập của tài
// khoản trùng SĐT liên hệ của hồ sơ khác; một cặp một lần; hồ sơ ngưng / đã gộp không vào; chỉ admin.manage.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const nguoi = async (w: any, fullName: string, so?: string) => {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName, contacts: so ? [{ kind: "PHONE", value: so }] : [] } });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
};
const cap = (x: any) => [[x.a.id, x.b.id].sort().join("|"), x.lyDo.join(",")];

test("T1: PHONE, NAME (NFD), LOGIN_PHONE; một cặp một lần; hồ sơ ngưng không vào; cờ có tài khoản đúng", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  const p1 = await nguoi(w, "Nguyễn Phú Hải", "0912000111");
  const p2 = await nguoi(w, "Nguyễn Phú Hải".normalize("NFD"));
  const p3 = await nguoi(w, "Trần Văn Cường", "0912000111");
  const tk = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Lê Đăng Nhập", phone: "0900000088", roles: ["SALES_STAFF"], taoHoSoMoi: true } });
  assert.equal(tk.status, 201, tk.text);
  const pL = tk.json.staff.partyId as string;
  const p4 = await nguoi(w, "Người Giữ Số", "0900000088");
  const p5 = await nguoi(w, "Nguyễn Phú Hải");
  const u5 = w.q("SELECT updated_at u FROM pty_party WHERE id = ?", p5)[0].u;
  assert.equal((await w.call("PUT", `/api/parties/${p5}`, { as: ADM, body: { fullName: "Nguyễn Phú Hải", active: false, expectedUpdatedAt: u5 } })).status, 200);

  const r = await w.call("GET", "/api/parties/duplicates", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.pairs.map(cap).sort(), [
    [[p1, p2].sort().join("|"), "NAME"],
    [[p1, p3].sort().join("|"), "PHONE"],
    [[pL, p4].sort().join("|"), "LOGIN_PHONE"],
  ].sort());
  const dongL = r.json.pairs.find((x: any) => x.a.id === pL || x.b.id === pL);
  assert.equal(dongL.a.id === pL ? dongL.aCoTaiKhoan : dongL.bCoTaiKhoan, true);
  assert.equal(r.json.conNua, false);
  assert.equal((await w.call("GET", "/api/parties/duplicates", { as: SALES })).status, 403);
});

test("T3: không có hồ sơ trùng → danh sách rỗng", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  await nguoi(w, "Một Người", "0912000111");
  assert.deepEqual((await w.call("GET", "/api/parties/duplicates", { as: ADM })).json, { pairs: [], conNua: false });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/modules/parties/nghi-trung.test.ts`
Expected: FAIL — `GET /api/parties/duplicates` khớp route `GET /api/parties/:id` → 404 "Không tìm thấy hồ sơ." (id sai dạng).

- [ ] **Step 3: Cài đặt** — trong `src/modules/parties/index.ts`, import thêm `capNghiTrung` (từ `"../../shared/ho-so-trung"`), `PartyDuplicatesResponse` (contracts), `personsForMatch, openPersonPhones, listPartiesByIds` (repository), rồi khai route NGAY SAU route `GET /api/parties/lookup` (phải đứng TRƯỚC `GET /api/parties/:id`):

```ts
    // ---- Hồ sơ nghi trùng (ADR-0068 Đ8; T1) — chỉ đọc, admin.manage. Khai TRƯỚC GET /api/parties/:id. SĐT đăng nhập tới qua ctx.gopHoSo (parties không import staff).
    route("GET", "/api/parties/duplicates", "admin", async (ctx) => {
      const { env, staff } = ctx;
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const today = vnToday(new Date());
      const [nguoi, soLienHe, dangNhap] = await Promise.all([personsForMatch(env.DB), openPersonPhones(env.DB), ctx.gopHoSo.soDangNhap()]);
      const { cap, conNua } = capNghiTrung({
        hoSo: nguoi.map((p) => ({ id: p.id, ten: p.display_name })),
        sdtLienHe: soLienHe.map((c) => ({ partyId: c.party_id, so: c.value_normalized })),
        sdtDangNhap: dangNhap.map((d) => ({ partyId: d.partyId, so: d.phone })),
      });
      const theoId = new Map((await listPartiesByIds(env.DB, [...new Set(cap.flatMap((c) => [c.aId, c.bId]))], today)).map((r) => [r.id, toListItem(r)]));
      const coTaiKhoan = new Set(dangNhap.map((d) => d.partyId));
      return json({
        pairs: cap.flatMap((c) => {
          const a = theoId.get(c.aId);
          const b = theoId.get(c.bId);
          return a && b ? [{ a, b, lyDo: c.lyDo, aCoTaiKhoan: coTaiKhoan.has(c.aId), bCoTaiKhoan: coTaiKhoan.has(c.bId) }] : [];
        }),
        conNua,
      } satisfies PartyDuplicatesResponse);
    }),
```

`src/route-access.test.ts`: thêm `{ method: "GET", path: "/api/parties/duplicates", access: "admin" }, // ADR-0068 Đ8: hồ sơ nghi trùng — admin.manage, chỉ đọc`, dòng lịch sử `+ GET /api/parties/duplicates = 179`, đổi ba số `178` → `179`.

- [ ] **Step 4: Chạy, thấy xanh**

Run: `node --test src/modules/parties/nghi-trung.test.ts src/route-access.test.ts src/route-write-guard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/parties/index.ts src/modules/parties/nghi-trung.test.ts src/route-access.test.ts
git commit -m "$(cat <<'EOF'
Hồ sơ nghi trùng: GET /api/parties/duplicates (ADR-0068 Đ8)

Quản trị rà các cặp hồ sơ cá nhân cùng SĐT, cùng họ tên (so ở máy chủ, giữ
dấu, chịu chữ NFD) hoặc số đăng nhập trùng số liên hệ của người khác.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Chặn tạo trùng khi Thêm tài khoản — C2 ở máy chủ (+ route đọc cho C1) [Dừng Q4]

**Files:**
- Modify: `src/modules/parties/index.ts` (hàm công bố `hoSoCaNhanKhop`)
- Modify: `src/modules/staff/index.ts` (`hoSoKhopKhiTaoTaiKhoan`)
- Modify: `src/modules/accounts/index.ts` (C2 ở `POST /api/staff`, route `GET /api/staff/ho-so-khop`)
- Modify: `src/route-access.test.ts`
- Create: `src/modules/accounts/tao-trung.test.ts`
- Modify (nếu đỏ): các tệp test / e2e / kịch bản đang gọi `POST /api/staff` tạo hồ sơ mới trùng tên

**Interfaces:**
- Consumes: `chuanHoaTen` (Task 2), `personsForMatch`, `listPartiesByIds` (Task 5), `partiesWithAccount` (Task 4).
- Produces:
  - parties: `hoSoCaNhanKhop(db, v: { phone: string | null; ten: string | null }): Promise<{ id: string; displayName: string; lyDo: ("PHONE" | "NAME")[]; vai: string[] }[]>`
  - staff: `hoSoKhopKhiTaoTaiKhoan(db, v): Promise<PartyMatchDto[]>`
  - `POST /api/staff` không `partyId`, có khớp, không `taoHoSoMoi: true` → `409 { error: { code: "party_match_exists", message, khop: PartyMatchDto[] } }`
  - `GET /api/staff/ho-so-khop?phone=&ten=` → `200 PartyMatchResponse` [Dừng Q4]

- [ ] **Step 1: Viết test đỏ** `src/modules/accounts/tao-trung.test.ts`:

```ts
// ADR-0068 Đ9, đặc tả C2 (+ C1 route đọc — [Dừng Q4]): POST /api/staff không kèm hồ sơ có sẵn mà có hồ sơ cá nhân đang dùng khớp SĐT liên hệ hoặc tên chuẩn hoá
// → 409 party_match_exists kèm danh sách (id, tên, lý do, vai, có tài khoản) — KHÔNG SĐT của hồ sơ khác; có cờ taoHoSoMoi → tạo như cũ; không khớp → tạo như cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SO = "0912000111";
async function nen() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Nguyễn Phú Hải", contacts: [{ kind: "PHONE", value: SO }] } });
  const P = r.json.party.id as string;
  assert.equal((await w.call("POST", `/api/parties/${P}/roles`, { as: ADM, body: { roleTypeCode: "BOAT_CAPTAIN" } })).status, 201);
  return { w, P };
}
const tao = (w: any, body: Record<string, unknown>) => w.call("POST", "/api/staff", { as: ADM, body: { roles: ["SALES_STAFF"], ...body } });

test("C2: tên khớp (chữ thường, khoảng trắng thừa) → 409 kèm danh sách; không SĐT của hồ sơ khác; không tạo gì", async () => {
  const { w, P } = await nen();
  const truoc = w.q("SELECT count(*) n FROM staff")[0].n;
  const r = await tao(w, { fullName: "  nguyễn   phú HẢI ", phone: "0900000050" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "party_match_exists");
  assert.deepEqual(r.json.error.khop, [{ id: P, displayName: "Nguyễn Phú Hải", lyDo: ["NAME"], vai: ["Lái cano"], coTaiKhoan: false }]);
  assert.ok(!r.text.includes(SO), "không lộ SĐT của hồ sơ khác");
  assert.equal(w.q("SELECT count(*) n FROM staff")[0].n, truoc);
});

test("C2: SĐT đăng nhập trùng SĐT liên hệ của hồ sơ có sẵn → lý do PHONE", async () => {
  const { w, P } = await nen();
  const r = await tao(w, { fullName: "Tên Khác Hẳn", phone: SO });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error.khop.map((k: any) => [k.id, k.lyDo]), [[P, ["PHONE"]]]);
});

test("C2: có cờ taoHoSoMoi → tạo như cũ (hồ sơ MỚI); không khớp → tạo như cũ, không cần cờ; kèm partyId → không xét khớp", async () => {
  const { w, P } = await nen();
  const moi = await tao(w, { fullName: "Nguyễn Phú Hải", phone: "0900000050", taoHoSoMoi: true });
  assert.equal(moi.status, 201, moi.text);
  assert.notEqual(moi.json.staff.partyId, P);
  assert.equal((await tao(w, { fullName: "Hoàn Toàn Mới", phone: "0900000051" })).status, 201);
  const coSan = await tao(w, { partyId: P, phone: "0900000052", roles: ["SALES_STAFF"] });
  assert.equal(coSan.status, 201, coSan.text);
  assert.equal(coSan.json.staff.partyId, P);
});

test("C2 đường cũ (danh sách quyền): cũng chặn khi khớp, cũng nhận cờ", async () => {
  const { w } = await nen();
  const r = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Nguyễn Phú Hải", phone: "0900000053", permissions: ["SALES"] } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "party_match_exists");
  assert.equal((await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Nguyễn Phú Hải", phone: "0900000053", permissions: ["SALES"], taoHoSoMoi: true } })).status, 201);
});

test("C1 [Dừng Q4]: GET /api/staff/ho-so-khop trả ĐÚNG danh sách của 409; Bán hàng → 403; thiếu cả hai tham số → rỗng", async () => {
  const { w, P } = await nen();
  const r = await w.call("GET", `/api/staff/ho-so-khop?phone=${SO}&ten=${encodeURIComponent("Nguyễn Phú Hải")}`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.khop.map((k: any) => [k.id, k.lyDo]), [[P, ["PHONE", "NAME"]]]);
  assert.equal((await w.call("GET", `/api/staff/ho-so-khop?phone=${SO}`, { as: SALES })).status, 403);
  assert.deepEqual((await w.call("GET", "/api/staff/ho-so-khop", { as: ADM })).json, { khop: [] });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/modules/accounts/tao-trung.test.ts`
Expected: FAIL — bài C2 nhận `201` thay vì `409`; bài C1 nhận 404/405.

- [ ] **Step 3: Cài đặt — parties.** Thêm vào `src/modules/parties/index.ts` (sau `partySummary`; import thêm `personsForMatch, listPartiesByIds` nếu chưa có và `chuanHoaTen`):

```ts
/**
 * HÀM CÔNG BỐ (ADR-0068 Đ9 — C1, C2) cho module staff: hồ sơ CÁ NHÂN đang dùng, chưa gộp, khớp SĐT liên hệ đang mở (`phone` đã chuẩn hoá) HOẶC tên chuẩn hoá
 * (`chuanHoaTen`, giữ dấu). Kèm tên công việc hôm nay. KHÔNG trả SĐT.
 */
export async function hoSoCaNhanKhop(db: D1Database, v: { phone: string | null; ten: string | null }): Promise<{ id: string; displayName: string; lyDo: ("PHONE" | "NAME")[]; vai: string[] }[]> {
  const today = vnToday(new Date());
  const tenChuan = v.ten ? chuanHoaTen(v.ten) : "";
  const [nguoi, theoSo, loai] = await Promise.all([
    tenChuan ? personsForMatch(db) : Promise.resolve([]),
    v.phone ? findPartiesByPhone(db, v.phone, today) : Promise.resolve([]),
    listRoleTypes(db),
  ]);
  const lyDo = new Map<string, ("PHONE" | "NAME")[]>();
  for (const r of theoSo) if (r.party_kind === "PERSON" && r.active === 1) lyDo.set(r.id, ["PHONE"]);
  for (const p of nguoi) if (chuanHoaTen(p.display_name) === tenChuan) lyDo.set(p.id, [...(lyDo.get(p.id) ?? []), "NAME"]);
  const tenVai = new Map(loai.map((t) => [t.code, t.name]));
  return (await listPartiesByIds(db, [...lyDo.keys()], today)).map((r) => ({
    id: r.id,
    displayName: r.display_name,
    lyDo: lyDo.get(r.id)!,
    vai: [...new Set((r.role_codes ?? "").split(",").filter(Boolean))].map((c) => tenVai.get(c) ?? c),
  }));
}
```

- [ ] **Step 4: Cài đặt — staff.** Trong `src/modules/staff/index.ts`: thêm `hoSoCaNhanKhop` vào dòng import từ `"../parties"`, `type PartyMatchDto` vào import từ contracts, và:

```ts
/** ADR-0068 Đ9: hồ sơ cá nhân khớp khi Thêm tài khoản — MỘT nguồn cho 409 party_match_exists và route đọc của màn Quản lý tài khoản. Không SĐT của hồ sơ. */
export async function hoSoKhopKhiTaoTaiKhoan(db: D1Database, v: { phone: string | null; ten: string | null }): Promise<PartyMatchDto[]> {
  const khop = await hoSoCaNhanKhop(db, v);
  const coTaiKhoan = await partiesWithAccount(db, khop.map((k) => k.id));
  return khop.map((k) => ({ ...k, coTaiKhoan: coTaiKhoan.has(k.id) }));
}
```

KHÔNG thêm kiểm khớp vào `createAccountWithRolesStatements` (dùng chung với đồng bộ Sheet — C3; route `sheet/apply` luôn truyền `existingPartyId: null` nên kiểm "hồ sơ đã gộp" của Task 6 không chạm luồng Sheet).

- [ ] **Step 5: Cài đặt — accounts.** Trong `src/modules/accounts/index.ts`: import `hoSoKhopKhiTaoTaiKhoan` từ `"../staff"`, `PartyMatchDto, PartyMatchResponse` từ contracts; thêm hằng sau `ROLE_MANAGED`:

```ts
// ADR-0068 Đ9 (C2): chặn tạo hồ sơ trùng ở MÁY CHỦ — không đặt trong createAccountWithRolesStatements (dùng chung với đồng bộ Sheet, C3 giữ nguyên).
const MATCH_EXISTS = (khop: PartyMatchDto[]) =>
  json({ error: { code: "party_match_exists", message: "Đã có hồ sơ cá nhân trùng số điện thoại hoặc họ tên. Chọn “Dùng hồ sơ này”, hoặc đánh dấu “Vẫn tạo hồ sơ mới” nếu là người khác.", khop } }, 409);
```

Trong route `POST /api/staff`, **đường vai**: ngay sau `if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();` thêm:

```ts
        if (!existingPartyId && body.taoHoSoMoi !== true) {
          const khop = await hoSoKhopKhiTaoTaiKhoan(db, { phone, ten: name.value ?? null });
          if (khop.length > 0) return MATCH_EXISTS(khop);
        }
```

**Đường cũ**: ngay sau `if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();` của nhánh đó thêm:

```ts
      if (body?.taoHoSoMoi !== true) {
        const khop = await hoSoKhopKhiTaoTaiKhoan(db, { phone, ten: name.value! });
        if (khop.length > 0) return MATCH_EXISTS(khop);
      }
```

[Dừng Q4] Route đọc — khai ngay sau route `GET /api/staff/sheet`:

```ts
    // ADR-0068 Đ9 (C1): giao diện Thêm tài khoản hỏi "có hồ sơ khớp không" TRONG LÚC GÕ — cùng một hàm với 409 party_match_exists (không hai luật).
    route("GET", "/api/staff/ho-so-khop", "admin", async ({ env, url, staff: admin }) => {
      if (!can(admin, "admin.manage")) return NOT_ADMIN();
      const phone = normalizePhone(url.searchParams.get("phone") ?? "");
      const ten = (url.searchParams.get("ten") ?? "").trim().slice(0, 200);
      if (!phone && !ten) return json({ khop: [] } satisfies PartyMatchResponse);
      return json({ khop: await hoSoKhopKhiTaoTaiKhoan(env.DB, { phone, ten: ten || null }) } satisfies PartyMatchResponse);
    }),
```

`src/route-access.test.ts`: thêm `{ method: "GET", path: "/api/staff/ho-so-khop", access: "admin" }, // ADR-0068 Đ9 (C1): hồ sơ khớp khi Thêm tài khoản — admin.manage`, dòng lịch sử `+ GET /api/staff/ho-so-khop = 180`, đổi ba số `179` → `180`. (Chủ chọn Q4 = (b) → bỏ route này, bỏ bài C1, giữ `179`.)

- [ ] **Step 6: Chạy, thấy xanh**

Run: `node --test src/modules/accounts/tao-trung.test.ts src/route-access.test.ts src/route-write-guard.test.ts`
Expected: PASS.

- [ ] **Step 7: Sửa các nơi đang tạo tài khoản mới trùng tên.** Tìm mọi lời gọi tạo tài khoản:

```bash
grep -rln '"/api/staff"' src tests docs/evidence --include='*.ts' --include='*.mjs'
```

Chạy `npm test`; mọi bài đỏ với `party_match_exists` là do tạo tài khoản mới mà tên / số trùng hồ sơ gieo sẵn — thêm `taoHoSoMoi: true` vào thân của ĐÚNG lời gọi đó (không thêm đại trà vào bài đang kiểm C2). Với `tests/e2e/*.mjs` và kịch bản Chrome gọi API tạo tài khoản: thêm `taoHoSoMoi: true` vào mọi thân `POST /api/staff` KHÔNG kèm `partyId` (mỗi lần chạy e2e dùng chung một D1 tạm cho mọi kịch bản — tên thử lặp giữa các kịch bản), trừ `tests/e2e/gop-ho-so.mjs` (Task 11). Kịch bản Chrome tạo tài khoản bằng BẤM form (tìm `add-name` trong `docs/evidence/**/kich-ban/*.mjs`) → ghi vào nhật ký thi công để chạy lại ở Task 9.

Run: `npm test`
Expected: xanh toàn bộ.

- [ ] **Step 8: Commit**

```bash
git add src/modules/parties/index.ts src/modules/staff/index.ts src/modules/accounts/index.ts src/modules/accounts/tao-trung.test.ts src/route-access.test.ts
git add -u src tests docs/evidence
git commit -m "$(cat <<'EOF'
Thêm tài khoản: máy chủ chặn tạo hồ sơ trùng (ADR-0068 Đ9, C2)

Lỗi gốc của hồ sơ trùng là Thêm tài khoản sinh hồ sơ mới không liên hệ.
Nay POST /api/staff trả 409 kèm các hồ sơ khớp số hoặc tên (không lộ số
của người khác) trừ khi người tạo chọn rõ "vẫn tạo hồ sơ mới". Đồng bộ từ
Sheet giữ nguyên (C3, ghi backlog).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Giao diện — hộp gộp, dải "đã gộp", màn nghi trùng, khối C1 + kịch bản Chrome

**Files:**
- Modify: `public/parties.html`, `web/parties.ts`
- Modify: `web/staff.ts`
- Create: `docs/evidence/2026-09-30-gop-ho-so/kich-ban/gop-ho-so-smoke.mjs`

**Interfaces:**
- Consumes: `PartyDto.mergedInto/mergedFrom`, `MergePreviewResponse`, `PartyDuplicatesResponse`, `PartyMatchResponse`, `chuanHoaTen`, `NHAN_LY_DO_KHOP`.
- Produces: không có (giao diện).

- [ ] **Step 1: HTML** — trong `public/parties.html`: thêm nút ở dòng nút của form tìm (sau nút `+ Hồ sơ mới`):

```html
 <button id="dup-btn" class="btn" type="button" hidden>Hồ sơ nghi trùng</button>
```

và hai khối ngay sau `<section id="detail" class="card" hidden></section>`:

```html
  <section id="merge" class="card" hidden aria-labelledby="merge-title"></section>
  <section id="dups" class="card" hidden aria-labelledby="dups-title"></section>
```

- [ ] **Step 2: `web/parties.ts` — phần dùng chung.** Thêm import và hằng:

```ts
import { NHAN_LY_DO_KHOP, chuanHoaTen } from "../src/shared/ho-so-trung";
const mergeEl = byId("merge");
const dupsEl = byId("dups");
/** Ngày (giờ VN) của một mốc ISO UTC, dạng dd/mm/yyyy. */
const ngayCuaMoc = (iso: string) => ngayVN(new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 10));
const lienKetHoSo = (id: string, ten: string) => {
  const a = h("a", { href: `/parties?id=${encodeURIComponent(id)}` }, ten);
  a.addEventListener("click", (e) => { e.preventDefault(); void openDetail(id); });
  return a;
};
```

- [ ] **Step 3: `openDetail` — dải "đã gộp", mục "đã gộp vào đây", nút Gộp, khoá sửa.** Trong `openDetail`, ngay sau `const p = r.party;` thêm:

```ts
  const daGop = p.mergedInto !== null;
  const quanTri = admin && !daGop; // hồ sơ đã gộp: ẩn mọi nút sửa (máy chủ vẫn trả 409 party_merged)
```

Đổi MỌI chỗ dùng `admin` bên trong `openDetail` (nút "Kết thúc" công việc / quan hệ, khối thêm công việc, khối thêm quan hệ) thành `quanTri`. Dựng khối gộp:

```ts
  const khoiGop: Child[] = [];
  if (p.mergedInto) {
    khoiGop.push(h("div", { class: "alert warn", role: "status" }, "Đã gộp vào ", lienKetHoSo(p.mergedInto.id, p.mergedInto.displayName),
      ` ngày ${ngayCuaMoc(p.mergedInto.mergedAt)}. Hồ sơ này chỉ còn để xem lịch sử.`));
  }
  const nutGop = quanTri && p.kind === "PERSON" && p.active && !p.accountLinked
    ? button("Gộp vào hồ sơ khác…", () => moHopGop({ id: p.id, displayName: p.displayName }, null), "btn btn-danger")
    : null;
  const muaDaGop = p.mergedFrom.length > 0
    ? [h("h3", null, "Hồ sơ đã gộp vào đây"), h("ul", null, ...p.mergedFrom.map((x) => h("li", null, lienKetHoSo(x.id, x.displayName), ` — gộp ngày ${ngayCuaMoc(x.mergedAt)}`)))]
    : [];
```

Trong `replaceChildren(detailEl, …)`: chèn `...khoiGop` ngay sau thẻ `h2`; chèn `...muaDaGop` ngay trước `giayTo`; đổi dòng nút cuối thành:

```ts
    h("div", { class: "actions", style: "margin-top:12px" }, nutGop, button("Đóng", () => { boCheSo.che(); detailEl.hidden = true; openId = null; }, "btn")),
```

- [ ] **Step 4: Hộp gộp.** Thêm hàm sau `openDetail`:

```ts
// ---- Gộp hồ sơ (ADR-0068; đặc tả §5): chọn hồ sơ chính → xem trước ba cột → gõ lại tên hồ sơ phụ → Gộp. Lý do chặn hiện trên bảng, nút Gộp tắt. -------------
function moHopGop(nguon: { id: string; displayName: string }, dichSan: { id: string; displayName: string } | null): void {
  let dich = dichSan;
  const tim = input("", { placeholder: "Tìm hồ sơ chính theo tên hoặc số điện thoại…", "aria-label": "Tìm hồ sơ chính" });
  const chon = h("select", { "aria-label": "Hồ sơ chính" });
  const bang = h("div", { "aria-live": "polite" });
  const xacNhan = input("", { placeholder: nguon.displayName, "aria-label": "Gõ lại tên hồ sơ phụ để xác nhận" });
  const nutGop = h("button", { type: "button", class: "btn btn-danger", disabled: true }, "Gộp");
  let chan = true;
  const capNhatNut = () => { nutGop.disabled = chan || !dich || chuanHoaTen(xacNhan.value) !== chuanHoaTen(nguon.displayName); };
  const cot = (tieuDe: string, ds: Api.MergeItemDto[]) =>
    h("div", null, h("h4", null, `${tieuDe} (${ds.length})`), ds.length
      ? h("ul", null, ...ds.map((x) => h("li", null, x.nhan, x.ghiChu ? h("span", { class: "muted" }, ` — ${x.ghiChu}`) : null)))
      : h("p", { class: "muted" }, "Không có."));
  const xemTruoc = async () => {
    if (!dich) return;
    const r = await act(() => api<Api.MergePreviewResponse>(`/api/parties/${nguon.id}/merge/preview`, { method: "POST", body: { intoPartyId: dich!.id } }));
    if (!r) return;
    chan = r.chan.length > 0;
    replaceChildren(
      bang,
      ...r.chan.map((c) => h("div", { class: "alert", role: "alert" }, c.message)),
      h("div", { class: "grid three" }, cot("Chuyển sang hồ sơ chính", r.chuyen), cot("Giữ ở hồ sơ này", r.giu), cot("Bỏ vì đã có", r.bo)),
      h("p", { class: "muted" }, `Đơn đổi người đặt sang hồ sơ chính: ${r.donDoi}. Đơn giữ ở hồ sơ này (đã giao, đã huỷ): ${r.donGiu}. Dòng công nợ giữ ở hồ sơ này: ${r.dongNoGiu}.`),
    );
    capNhatNut();
  };
  let hen: number | undefined;
  tim.addEventListener("input", () => {
    window.clearTimeout(hen);
    hen = window.setTimeout(async () => {
      if (tim.value.trim().length < 2) return replaceChildren(chon);
      const found = await act(() => api<Api.PartyListResponse>(`/api/parties?limit=10&kind=PERSON&q=${encodeURIComponent(tim.value.trim())}`));
      const ds = found?.parties.filter((x) => x.id !== nguon.id && x.active) ?? [];
      replaceChildren(chon, h("option", { value: "" }, "— chọn —"), ...ds.map((x) => h("option", { value: x.id }, x.displayName)));
    }, 300);
  });
  chon.addEventListener("change", () => {
    const o = chon.selectedOptions[0];
    dich = chon.value && o ? { id: chon.value, displayName: o.textContent ?? "" } : null;
    chan = true;
    replaceChildren(bang);
    capNhatNut();
    void xemTruoc();
  });
  xacNhan.addEventListener("input", capNhatNut);
  nutGop.addEventListener("click", () => {
    if (!dich) return;
    void act(async () => {
      const r = await api<Api.PartyResponse>(`/api/parties/${nguon.id}/merge`, { method: "POST", body: { intoPartyId: dich!.id, xacNhan: xacNhan.value } });
      mergeEl.hidden = true;
      await search();
      await openDetail(r.party.id);
    }, nutGop);
  });
  replaceChildren(
    mergeEl,
    h("h2", { id: "merge-title" }, `Gộp “${nguon.displayName}” vào hồ sơ khác`),
    h("p", { class: "muted" }, "Hồ sơ này sẽ ẩn khỏi Danh bạ; liên hệ, công việc, quan hệ, giấy tờ còn hiệu lực và đơn chưa giao chuyển sang hồ sơ chính. Không tách lại được."),
    dichSan ? h("p", null, "Hồ sơ chính: ", h("strong", null, dichSan.displayName)) : h("div", { class: "grid three" }, field("Tìm hồ sơ chính", tim), field("Hồ sơ chính", chon)),
    bang,
    field(`Gõ lại tên “${nguon.displayName}” để xác nhận`, xacNhan),
    h("div", { class: "actions" }, nutGop, button("Huỷ", () => { mergeEl.hidden = true; }, "btn")),
  );
  mergeEl.hidden = false;
  mergeEl.scrollIntoView({ block: "nearest" });
  if (dichSan) void xemTruoc();
}
```

- [ ] **Step 5: Màn "Hồ sơ nghi trùng".** Thêm hàm + nối nút:

```ts
// ---- Hồ sơ nghi trùng (ADR-0068 Đ8; T1–T3): chỉ người giữ admin.manage thấy nút; mỗi cặp có "Gộp…" (bên có tài khoản điền sẵn làm hồ sơ chính — T2). ----------
async function moNghiTrung(): Promise<void> {
  const r = await act(() => api<Api.PartyDuplicatesResponse>("/api/parties/duplicates"));
  if (!r) return;
  const dong = (x: Api.PartyDuplicatePairDto) => {
    const [phu, chinh] = x.aCoTaiKhoan ? [x.b, x.a] : [x.a, x.b];
    const nut = button("Gộp…", () => moHopGop({ id: phu.id, displayName: phu.displayName }, { id: chinh.id, displayName: chinh.displayName }), "btn");
    nut.disabled = x.aCoTaiKhoan && x.bCoTaiKhoan;
    return h("tr", null,
      h("td", null, lienKetHoSo(x.a.id, x.a.displayName), x.aCoTaiKhoan ? h("span", { class: "badge" }, "có tài khoản") : null),
      h("td", null, lienKetHoSo(x.b.id, x.b.displayName), x.bCoTaiKhoan ? h("span", { class: "badge" }, "có tài khoản") : null),
      h("td", { class: "muted" }, x.lyDo.map((l) => NHAN_LY_DO_KHOP[l]).join("; ")),
      h("td", null, nut));
  };
  replaceChildren(
    dupsEl,
    h("h2", { id: "dups-title" }, `Hồ sơ nghi trùng (${r.pairs.length}${r.conNua ? "+" : ""})`),
    r.pairs.length === 0
      ? h("p", { class: "empty" }, "Không thấy hồ sơ nghi trùng.")
      : h("div", { class: "table-wrap" }, h("table", { class: "items" }, h("tbody", null, ...r.pairs.map(dong)))),
    h("div", { class: "actions" }, button("Đóng", () => { dupsEl.hidden = true; }, "btn")),
  );
  dupsEl.hidden = false;
  dupsEl.scrollIntoView({ block: "nearest" });
}
```

Ở cuối tệp, sau `admin = can(me, "admin.manage");`:

```ts
const dupBtn = byId<HTMLButtonElement>("dup-btn");
dupBtn.hidden = !admin;
dupBtn.addEventListener("click", () => void moNghiTrung());
```

- [ ] **Step 6: `web/staff.ts` — khối C1** (thay nút gợi ý MỘT hồ sơ). Trước hết đổi dòng `const existingNote = h("div", { class: "muted", hidden: true });` thành `const existingNote = h("div", { id: "add-khop", class: "muted", hidden: true });` (kịch bản Chrome tìm khối theo id này — khối vai cũng có `li`). Rồi thay nguyên khối `addPhone.addEventListener("change", …)` bằng:

```ts
// ADR-0068 Đ9 (C1): gõ SĐT hoặc tên → liệt kê MỌI hồ sơ cá nhân khớp; phải chọn "Dùng hồ sơ này" hoặc tick "Vẫn tạo hồ sơ mới" thì nút Tạo mới mở. Máy chủ kiểm lại (409).
let khop: Api.PartyMatchDto[] = [];
const taoMoi = h("input", { type: "checkbox", style: "width:auto;display:inline;margin:0 6px 0 0" });
const nutTao = byId<HTMLFormElement>("add-form").querySelector<HTMLButtonElement>('button[type="submit"]')!;
const capNhatNutTao = () => { nutTao.disabled = khop.length > 0 && !existingPartyId && !taoMoi.checked; };
taoMoi.addEventListener("change", capNhatNutTao);
function veKhop(): void {
  if (khop.length === 0 || existingPartyId) {
    if (!existingPartyId) existingNote.hidden = true;
    capNhatNutTao();
    return;
  }
  replaceChildren(
    existingNote,
    h("p", null, "Đã có hồ sơ khớp — chọn một hồ sơ, hoặc tạo hồ sơ mới nếu là người khác:"),
    h("ul", null, ...khop.map((k) => {
      const dung = h("button", { type: "button", class: "btn btn-link", disabled: k.coTaiKhoan }, "Dùng hồ sơ này");
      dung.addEventListener("click", () => {
        existingPartyId = k.id;
        addName.value = k.displayName;
        addName.readOnly = true;
        replaceChildren(existingNote, `Sẽ tạo tài khoản cho hồ sơ có sẵn "${k.displayName}" (không tạo hồ sơ mới). Đổi số điện thoại hoặc tên để bỏ chọn.`);
        capNhatNutTao();
        void preselectRoles(k.id);
      });
      const lyDo = k.lyDo.map((l) => NHAN_LY_DO_KHOP[l]).join(", ");
      return h("li", null, h("strong", null, k.displayName), ` — ${lyDo}`, k.vai.length ? ` — ${k.vai.join(", ")}` : "", " ",
        k.coTaiKhoan ? h("span", { class: "muted" }, "(đã có tài khoản)") : dung);
    })),
    h("label", { class: "check" }, taoMoi, "Vẫn tạo hồ sơ mới (người khác trùng tên/số)"),
  );
  existingNote.hidden = false;
  capNhatNutTao();
}
let henKhop: number | undefined;
const traKhop = () => {
  clearExisting();
  taoMoi.checked = false;
  window.clearTimeout(henKhop);
  henKhop = window.setTimeout(async () => {
    const q = new URLSearchParams({ phone: addPhone.value.trim(), ten: addName.value.trim() });
    try {
      khop = (await api<Api.PartyMatchResponse>(`/api/staff/ho-so-khop?${q}`)).khop;
    } catch {
      khop = []; // mất mạng giữa lúc gõ: không chặn — máy chủ vẫn trả 409 khi bấm Tạo
    }
    veKhop();
  }, 400);
};
addPhone.addEventListener("input", traKhop);
addName.addEventListener("input", () => { if (!existingPartyId) traKhop(); });
```

Thêm `import { NHAN_LY_DO_KHOP } from "../src/shared/ho-so-trung";` ở đầu tệp. Trong trình xử lý `submit`: thân gửi đi thêm cờ khi đã tick — đổi dòng `const who = …` thành

```ts
  const who = existingPartyId ? { partyId: existingPartyId } : { fullName: addName.value, ...(taoMoi.checked ? { taoHoSoMoi: true } : {}) };
```

và bắt 409 từ máy chủ để hiện khối (khi route đọc chưa kịp trả): đổi `const r = await act(() => api<…>("/api/staff", …));` thành

```ts
  let r: Api.StaffWithPinResponse | undefined;
  try {
    r = await api<Api.StaffWithPinResponse>("/api/staff", { method: "POST", body });
  } catch (err) {
    if (err instanceof ApiError && err.code === "party_match_exists") {
      khop = ((err.details as { khop?: Api.PartyMatchDto[] } | undefined)?.khop) ?? [];
      veKhop();
      return;
    }
    return showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  }
```

và sau khi tạo xong (`if (r) { … }`) thêm `khop = []; taoMoi.checked = false; veKhop();`. (Nếu `ApiError` chưa import ở `web/staff.ts`, thêm vào dòng import từ `"./api"`.) [Dừng Q4 = (b)]: bỏ hàm `traKhop` và hai `addEventListener("input", …)`, chỉ giữ nhánh bắt 409.

- [ ] **Step 7: Build + typecheck**

Run: `npm run build:web && npm run typecheck`
Expected: build xong không lỗi; tsc 0 lỗi.

- [ ] **Step 8: Kịch bản Chrome** `docs/evidence/2026-09-30-gop-ho-so/kich-ban/gop-ho-so-smoke.mjs` (khung: `vc-lib.mjs` như `docs/evidence/2026-09-29-adr-0048/kich-ban/nha-xe-danh-ba-smoke.mjs`):

```js
// Kịch bản Chrome — gộp hồ sơ cá nhân (ADR-0068; đặc tả §5). Kiểm ở 1040 và 390:
//  1) 1040 Quản trị: hồ sơ phụ có nút "Gộp vào hồ sơ khác…"; hộp gộp: tìm hồ sơ chính → bảng ba cột; nút Gộp tắt tới khi gõ đúng tên; gộp → mở hồ sơ chính, có
//     mục "Hồ sơ đã gộp vào đây".
//  2) 1040: mở hồ sơ phụ theo ?id= → dải "Đã gộp vào …", không còn nút "Lưu thông tin" / "Thêm liên hệ" / "Gộp…".
//  3) 1040: "Hồ sơ nghi trùng" → số đếm ở đầu; một dòng có nút "Gộp…" mở hộp gộp điền sẵn hồ sơ chính.
//  4) 1040 Quản lý tài khoản: gõ tên trùng → khối liệt kê hồ sơ khớp, nút "Tạo tài khoản" tắt; tick "Vẫn tạo hồ sơ mới" → nút mở.
//  5) 390: hộp gộp + màn nghi trùng không tràn ngang; axe.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-30-gop-ho-so/kich-ban/gop-ho-so-smoke.mjs
process.env.OUT ??= "docs/evidence/2026-09-30-gop-ho-so";
const { ACCOUNTS, DESK, MOB, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, sleep } = await import("../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs");

const ADMIN = ACCOUNTS.admin;
const dem = boDem("GOP HO SO SMOKE");
const { env, call } = await dungMoiTruong([]);
const TEN = "Nguyễn Phú Hải Chrome";

const taoHoSo = async (body) => {
  const r = await call(ADMIN, "POST", "/api/parties", body);
  assert.equal(r.status, 201, r.text);
  return r.json.party.id;
};
const di = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await sleep(300);
  await p.waitFor(`document.readyState === "complete" && location.pathname + location.search === ${JSON.stringify(path)}`, `mở ${path}`, 10000);
};
const moHoSo = async (p, id) => {
  await di(p, `/parties?id=${id}`);
  await p.waitFor("!document.querySelector('#detail').hidden", "hồ sơ mở", 10000);
};
const go = (p, sel, text) => p.ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(text)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);

try {
  const phu = await taoHoSo({ kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "0912777111" }] });
  const chinh = await taoHoSo({ kind: "PERSON", fullName: TEN, contacts: [] });
  const phu2 = await taoHoSo({ kind: "PERSON", fullName: "Trần Nghi Trùng Chrome", contacts: [{ kind: "PHONE", value: "0912777222" }] });
  await taoHoSo({ kind: "PERSON", fullName: "Trần Nghi Trùng Chrome", contacts: [] });

  const p = await env.as(ADMIN, "/parties", DESK);
  try {
    await dem.step("1", "1040: nút Gộp → tìm hồ sơ chính → bảng ba cột → nút Gộp tắt tới khi gõ đúng tên → gộp → hồ sơ chính có mục “Hồ sơ đã gộp vào đây”", async () => {
      await moHoSo(p, phu);
      assert.equal(await p.ev(clickVisible("#detail", "Gộp vào hồ sơ khác…")), true);
      await p.waitFor("!document.querySelector('#merge').hidden", "hộp gộp mở", 10000);
      await go(p, '#merge input[aria-label="Tìm hồ sơ chính"]', "Phú Hải Chrome");
      await p.waitFor(`[...document.querySelectorAll('#merge select option')].some((o) => o.value === ${JSON.stringify(chinh)})`, "có hồ sơ chính", 10000);
      await p.ev(`(() => { const s = document.querySelector('#merge select'); s.value = ${JSON.stringify(chinh)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      await p.waitFor("[...document.querySelectorAll('#merge h4')].length === 3", "bảng ba cột", 10000);
      const cot = await p.ev("[...document.querySelectorAll('#merge h4')].map((x) => x.textContent.trim())");
      assert.deepEqual(cot.map((c) => c.replace(/ \(\d+\)$/, "")), ["Chuyển sang hồ sơ chính", "Giữ ở hồ sơ này", "Bỏ vì đã có"]);
      assert.equal(await p.ev("[...document.querySelectorAll('#merge button')].find((b) => b.textContent.trim() === 'Gộp').disabled"), true, "chưa gõ tên → tắt");
      await go(p, '#merge input[aria-label="Gõ lại tên hồ sơ phụ để xác nhận"]', `  ${TEN.toUpperCase()} `);
      assert.equal(await p.ev("[...document.querySelectorAll('#merge button')].find((b) => b.textContent.trim() === 'Gộp').disabled"), false, "gõ đúng tên (khác hoa thường) → mở");
      assert.equal(await p.ev(clickVisible("#merge", "Gộp")), true);
      await p.waitFor("[...document.querySelectorAll('#detail h3')].some((x) => x.textContent.trim() === 'Hồ sơ đã gộp vào đây')", "mục đã gộp vào đây", 10000);
      assert.equal(await p.ev("document.querySelector('#error').hidden"), true);
      assert.deepEqual(p.consoleErrors, [], JSON.stringify(p.consoleErrors));
      await shotFull(p, "gop-ho-so-1040.png");
    });

    await dem.step("2", "1040: hồ sơ phụ mở theo ?id= → dải “Đã gộp vào …”, không nút sửa", async () => {
      await moHoSo(p, phu);
      const s = await p.ev(`({ dai: document.querySelector('#detail .alert.warn')?.textContent ?? '', nut: [...document.querySelectorAll('#detail button')].map((b) => b.textContent.trim()) })`);
      assert.match(s.dai, /^Đã gộp vào/);
      for (const n of ["Lưu thông tin", "Thêm liên hệ", "Gộp vào hồ sơ khác…", "Thêm công việc"]) assert.ok(!s.nut.includes(n), `còn nút ${n}`);
    });

    await dem.step("3", "1040: “Hồ sơ nghi trùng” → số đếm ở đầu; “Gộp…” mở hộp gộp điền sẵn hồ sơ chính", async () => {
      await di(p, "/parties");
      await p.waitFor("!document.querySelector('#dup-btn').hidden", "nút nghi trùng hiện cho Quản trị", 10000);
      await p.ev("document.querySelector('#dup-btn').click(), true");
      await p.waitFor("!document.querySelector('#dups').hidden", "màn nghi trùng", 10000);
      assert.match(await p.ev("document.querySelector('#dups-title').textContent"), /^Hồ sơ nghi trùng \(\d+\+?\)$/);
      assert.equal(await p.ev(clickVisible("#dups", "Gộp…")), true);
      await p.waitFor("!document.querySelector('#merge').hidden && document.querySelector('#merge strong')", "hộp gộp điền sẵn", 10000);
      void phu2;
    });

    await dem.step("4", "1040 Quản lý tài khoản: gõ tên trùng → khối hồ sơ khớp, nút Tạo tắt; tick “Vẫn tạo hồ sơ mới” → mở", async () => {
      await di(p, "/staff");
      await go(p, "#add-name", "Trần Nghi Trùng Chrome");
      await p.waitFor("[...document.querySelectorAll('#add-khop li')].length >= 1", "khối hồ sơ khớp", 10000);
      assert.equal(await p.ev("document.querySelector('#add-form button[type=submit]').disabled"), true);
      await p.ev(`(() => { const c = [...document.querySelectorAll('#add-khop label.check input')].at(-1); c.click(); return true; })()`);
      assert.equal(await p.ev("document.querySelector('#add-form button[type=submit]').disabled"), false);
      await shotFull(p, "gop-ho-so-staff-1040.png");
    });
  } finally {
    p.close();
  }

  await dem.step("5", "390: màn nghi trùng + hộp gộp không tràn ngang" + axeNote(), async () => {
    const m = await env.as(ADMIN, "/parties", MOB);
    try {
      await m.waitFor("!document.querySelector('#dup-btn').hidden", "nút nghi trùng", 10000);
      await m.ev("document.querySelector('#dup-btn').click(), true");
      await m.waitFor("!document.querySelector('#dups').hidden", "màn nghi trùng", 10000);
      const tran = await m.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      assert.ok(tran <= 1, `không tràn ngang (${tran}px)`);
      await axe(m, "nghi trùng 390");
      await shotFull(m, "gop-ho-so-390.png");
    } finally {
      m.close();
    }
  });
} finally {
  await env.stop();
}
```

Chạy (cần Chrome + axe-core ngoài repo, xem `tests/e2e/README.md`):

```bash
npm run build:web
AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-09-30-gop-ho-so node docs/evidence/2026-09-30-gop-ho-so/kich-ban/gop-ho-so-smoke.mjs
```

Expected: 5/5 bước đạt, ba ảnh trong `docs/evidence/2026-09-30-gop-ho-so/`. Chạy lại các kịch bản theo bảng `web/CLAUDE.md` cho `web/parties.ts` (`t2b-danh-ba-smoke.mjs`, `giay-to-nguoi-smoke.mjs`, `nha-xe-danh-ba-smoke.mjs`, `dot-a-smoke.mjs` — lưu ý bảng đã ghi `dot-a-smoke.mjs` đỏ sẵn ở "nhat-ky: thẻ đã dựng xong") và cho `web/staff.ts` (`vai-smoke.mjs`, `va3-smoke.mjs`, `passkey-smoke.mjs`, `dot-a-smoke.mjs`) + các kịch bản Chrome ghi ở Task 8 Step 7. Ghi kết quả từng kịch bản vào nhật ký thi công.

- [ ] **Step 9: Commit**

```bash
git add public/parties.html web/parties.ts web/staff.ts docs/evidence/2026-09-30-gop-ho-so
git commit -m "$(cat <<'EOF'
Giao diện gộp hồ sơ + nghi trùng + khối hồ sơ khớp khi Thêm tài khoản (ADR-0068)

Quản trị thấy bảng chuyển / giữ / bỏ trước khi gộp và phải gõ lại tên; hồ
sơ đã gộp hiện dải "Đã gộp vào …" và không còn nút sửa; Thêm tài khoản liệt
kê mọi hồ sơ khớp thay cho một gợi ý duy nhất. Có kịch bản Chrome 1040 + 390.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Bất biến `R-PTY-MERGE-*` trong `audit-invariants` + quan sát chặn thật + sổ hàng rào (G15)

**Files:**
- Modify: `scripts/audit-checks.mjs`
- Modify: `src/audit-invariants.test.ts`
- Modify: `docs/SO-HANG-RAO.md`

**Interfaces:**
- Produces: năm kiểm mức `fail` — `R-PTY-MERGE-1` (không chuỗi, hai đầu là cá nhân), `-2` (hồ sơ đã gộp: ngưng dùng, có mốc, không còn liên hệ / công việc / quan hệ mở sau ngày gộp), `-3` (không gắn tài khoản), `-4` (không còn việc đang mở ở điều phối / vận chuyển — lưới cho khe giữa kiểm và ghi, Đ2), `-5` (đơn chưa giao, chưa huỷ không còn người đặt là hồ sơ đã gộp — lưới cho Đ1 bước 5). `-4`, `-5` là lưới THÊM ngoài G15 (siết).

- [ ] **Step 1: Viết test đỏ** — thêm vào cuối `src/audit-invariants.test.ts`:

```ts
// ---------------------------------------------------------------------------------------------------------------------
// ADR-0068 G15: R-PTY-MERGE-1..5 (gộp hồ sơ). Trigger của migration *_gop_ho_so là đường chặn thứ nhất; các kiểm này là lưới cho SQL chạy tay và cho khe
// giữa lúc kiểm và lúc ghi (việc điều phối / vận chuyển giao cho hồ sơ phụ ngay trước khi gộp).
function nguoiGop(db: DatabaseSync, id: string): void {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, id, T1, T1);
}
/** Gộp `a` vào `b` bằng SQL (mốc T2 → ngày gộp giờ VN 2026-09-21). */
const gopThang = (db: DatabaseSync, a: string, b: string) =>
  db.prepare("UPDATE pty_party SET active = 0, merged_into_id = ?, merged_at = ? WHERE id = ?").run(b, T2, a);
const MERGE = ["R-PTY-MERGE-1", "R-PTY-MERGE-2", "R-PTY-MERGE-3", "R-PTY-MERGE-4", "R-PTY-MERGE-5"];

test("R-PTY-MERGE: đúng năm kiểm mức fail; gộp khoẻ (liên hệ, vai, quan hệ đóng ĐÚNG ngày gộp) → 0 vi phạm", () => {
  assert.deepEqual(CHECKS.filter((c) => c.code.startsWith("R-PTY-MERGE")).map((c) => [c.code, c.level]), MERGE.map((c) => [c, "fail"]));
  const db = build();
  nguoiGop(db, "pa"); nguoiGop(db, "pb");
  db.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, valid_to_date, created_at, updated_at)
    VALUES ('c1', 'pa', 'PHONE', '0912', '0912', 1, '2026-09-01', '2026-09-21', ?, ?)`).run(T1, T1);
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES ('r1', 'pa', 'GUIDE', '2026-09-01', '2026-09-21', ?, ?)").run(T1, T1);
  gopThang(db, "pa", "pb");
  for (const code of MERGE) assert.equal(violations(db, one(code)), 0, code);
});

test("R-PTY-MERGE-2: hồ sơ đã gộp còn liên hệ / công việc / quan hệ mở → mỗi hồ sơ một vi phạm", () => {
  const db = build();
  for (const id of ["pa", "pb", "pc", "pd", "pe", "pf"]) nguoiGop(db, id);
  db.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at)
    VALUES ('c1', 'pa', 'PHONE', '0912', '0912', 1, '2026-09-01', ?, ?)`).run(T1, T1);
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r1', 'pc', 'GUIDE', '2026-09-01', ?, ?)").run(T1, T1);
  db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('q1', 'pe', 'pd', 'CONTACT_OF', '2026-09-01', ?, ?)").run(T1, T1);
  gopThang(db, "pa", "pb");
  gopThang(db, "pc", "pb");
  gopThang(db, "pe", "pf");
  assert.equal(violations(db, one("R-PTY-MERGE-2")), 3);
});

test("R-PTY-MERGE-3: hồ sơ đã gộp gắn tài khoản → 1", () => {
  const db = build();
  nguoiGop(db, "pb");
  const cuaAn = (db.prepare("SELECT party_id p FROM staff WHERE id = 's-an'").get() as { p: string }).p;
  gopThang(db, cuaAn, "pb");
  assert.equal(violations(db, one("R-PTY-MERGE-3")), 1);
});

test("R-PTY-MERGE-1: chuỗi gộp (chỉ tạo được khi gỡ trigger pty_party_merge_target) → 1", () => {
  const db = build();
  for (const id of ["pa", "pb", "pc"]) nguoiGop(db, id);
  db.exec("DROP TRIGGER pty_party_merge_target");
  gopThang(db, "pa", "pb");
  gopThang(db, "pb", "pc");
  assert.equal(violations(db, one("R-PTY-MERGE-1")), 1);
});

test("R-PTY-MERGE-4 + 5: hồ sơ đã gộp còn phụ trách đơn chưa xong / còn là người đặt của đơn nháp → mỗi kiểm 1; đơn đã huỷ không tính", () => {
  const db = build();
  nguoiGop(db, "pa"); nguoiGop(db, "pb");
  withHandler(db, "pa", "o-1");
  db.prepare("UPDATE orders SET booker_party_id = 'pa' WHERE id = 'o-1'").run();
  addOrder(db, "o-2");
  db.prepare("UPDATE orders SET booker_party_id = 'pa' WHERE id = 'o-2'").run();
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'o-2'").run();
  gopThang(db, "pa", "pb");
  assert.equal(violations(db, one("R-PTY-MERGE-4")), 1);
  assert.equal(violations(db, one("R-PTY-MERGE-5")), 1);
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/audit-invariants.test.ts`
Expected: FAIL — `phải có đúng một kiểm R-PTY-MERGE-2` (chưa có kiểm).

- [ ] **Step 3: Cài đặt** — thêm vào mảng `CHECKS` của `scripts/audit-checks.mjs`, ngay sau khối `R-PTY-1`:

```js
  // ---- Gộp hồ sơ cá nhân (ADR-0068 Đ3, G15). Trigger pty_party_merge_* (migration *_gop_ho_so) là đường chặn thứ nhất; đây là lưới cho SQL chạy tay (P21) và
  // cho khe giữa lúc kiểm và lúc ghi (R-PTY-MERGE-4, -5). "Ngày gộp" = ngày giờ VN của merged_at.
  {
    code: "R-PTY-MERGE-1",
    what: "không chuỗi gộp: hồ sơ đích của một lần gộp không tự gộp tiếp; hai đầu đều là hồ sơ cá nhân",
    sql: `SELECT count(*) FROM pty_party a JOIN pty_party b ON b.id = a.merged_into_id
     WHERE b.merged_into_id IS NOT NULL OR a.party_kind <> 'PERSON' OR b.party_kind <> 'PERSON'`,
    level: "fail",
  },
  {
    code: "R-PTY-MERGE-2",
    what: "hồ sơ đã gộp: ngưng dùng, có mốc gộp, không còn liên hệ / công việc / quan hệ mở sau ngày gộp",
    sql: `SELECT count(*) FROM pty_party a WHERE a.merged_into_id IS NOT NULL AND (a.active <> 0 OR a.merged_at IS NULL
       OR EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = a.id AND (c.valid_to_date IS NULL OR c.valid_to_date > date(a.merged_at, '+7 hours')))
       OR EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = a.id AND (r.valid_to_date IS NULL OR r.valid_to_date > date(a.merged_at, '+7 hours')))
       OR EXISTS (SELECT 1 FROM pty_party_relationship x WHERE (x.from_party_id = a.id OR x.to_party_id = a.id)
                    AND (x.valid_to_date IS NULL OR x.valid_to_date > date(a.merged_at, '+7 hours'))))`,
    level: "fail",
  },
  {
    code: "R-PTY-MERGE-3",
    what: "hồ sơ đã gộp không gắn tài khoản",
    sql: "SELECT count(*) FROM staff s JOIN pty_party a ON a.id = s.party_id WHERE a.merged_into_id IS NOT NULL",
    level: "fail",
  },
  {
    code: "R-PTY-MERGE-4",
    what: "hồ sơ đã gộp không còn là người phụ trách đơn chưa xong, tài xế / người đi kèm / nhà xe của chuyến chưa chốt",
    sql: `SELECT count(*) FROM pty_party a WHERE a.merged_into_id IS NOT NULL AND (
       EXISTS (SELECT 1 FROM dsp_assignment d JOIN orders o ON o.id = d.order_id WHERE d.party_id = a.id AND d.task_kind_code = 'HANDLE' AND d.valid_to_at IS NULL
                 AND o.status <> 'cancelled' AND o.delivered_at IS NULL)
       OR EXISTS (SELECT 1 FROM vc_trip_driver v JOIN vc_trip t ON t.id = v.trip_id WHERE v.driver_party_id = a.id AND v.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING'))
       OR EXISTS (SELECT 1 FROM vc_trip_allocation x JOIN vc_trip t ON t.id = x.trip_id WHERE x.kind = 'CREW' AND x.crew_party_id = a.id AND x.valid_to_at IS NULL
                    AND t.status IN ('PLANNED', 'RUNNING'))
       OR EXISTS (SELECT 1 FROM vc_trip t WHERE t.carrier_party_id = a.id AND t.status IN ('PLANNED', 'RUNNING')))`,
    level: "fail",
  },
  {
    code: "R-PTY-MERGE-5",
    what: "đơn chưa giao, chưa huỷ không còn người đặt là hồ sơ đã gộp",
    sql: `SELECT count(*) FROM orders o JOIN pty_party a ON a.id = o.booker_party_id
     WHERE a.merged_into_id IS NOT NULL AND o.status IN ('draft', 'confirmed') AND o.delivered_at IS NULL`,
    level: "fail",
  },
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `node --test src/audit-invariants.test.ts`
Expected: PASS (kể cả bài "dữ liệu khoẻ: MỌI kiểm … 0 vi phạm").

- [ ] **Step 5: Quan sát chặn thật trên D1 local (P16, G15).** Chạy ở thư mục worktree; chỉ đụng D1 LOCAL (không bao giờ `--remote`):

```bash
npm run db:migrate:local
```
```bash
npx wrangler d1 execute tourdao-sales-db --local --command "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-thu-gop-a', 'PERSON', 'Thử Gộp A', 1, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'), ('pty-thu-gop-b', 'PERSON', 'Thử Gộp B', 1, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')"
```
```bash
npx wrangler d1 execute tourdao-sales-db --local --command "UPDATE pty_party SET active = 0, merged_into_id = 'pty-thu-gop-b', merged_at = '2026-10-01T00:00:00.000Z' WHERE id = 'pty-thu-gop-a'"
```
```bash
npx wrangler d1 execute tourdao-sales-db --local --command "INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES ('ptc-thu-gop', 'pty-thu-gop-a', 'PHONE', '0999000111', '0999000111', 1, '2026-10-01', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')"
```
```bash
node scripts/audit-invariants.mjs --db local; echo "thoát $?"
```
Expected: dòng `R-PTY-MERGE-2` báo 1 vi phạm, `thoát 1`. Hoàn nguyên dữ liệu gieo:

```bash
npx wrangler d1 execute tourdao-sales-db --local --command "UPDATE pty_contact_point SET valid_to_date = '2026-10-01' WHERE id = 'ptc-thu-gop'"
```
```bash
node scripts/audit-invariants.mjs --db local; echo "thoát $?"
```
Expected: `R-PTY-MERGE-2` đạt (nếu D1 local có vi phạm CŨ ở kiểm khác, ghi rõ mã kiểm đó vào nhật ký — không phải do việc này). Chép hai lần in ra vào nhật ký thi công.

- [ ] **Step 6: Quan sát C2 chặn thật.** Tạm đổi điều kiện `if (!existingPartyId && body.taoHoSoMoi !== true)` (đường vai của `POST /api/staff`) thành `if (false)` → `node --test src/modules/accounts/tao-trung.test.ts` phải đỏ (`expected 409, actual 201`) → hoàn nguyên → xanh. Chép câu đỏ vào nhật ký.

- [ ] **Step 7: Sổ hàng rào** — thêm bốn dòng vào bảng của `docs/SO-HANG-RAO.md` (thay `<câu đỏ …>` bằng NGUYÊN VĂN câu đỏ đã chép ở Task 1 Step 5, Task 5 Step 7, Task 10 Step 5–6; ngày = ngày quan sát thật):

```markdown
| Trigger gộp hồ sơ `pty_party_merge_*` (`migrations/0054_gop_ho_so.sql`; bài `src/migrations-gop-ho-so.test.ts`; **ADR-0068 Đ3, G14**, từ 2026-MM-DD, CHƯA gộp) | Đặt / đổi / xoá `merged_into_id` sai: trỏ chính mình, chuỗi gộp, đích đã ngưng / là tổ chức, đặt mà không ngưng dùng, mở lại hồ sơ đã gộp, hồ sơ mới mang sẵn dấu gộp | Bốn trigger `BEFORE INSERT/UPDATE` trên `pty_party` | **2026-MM-DD:** xoá tạm vế "nguồn đang là đích" của `pty_party_merge_target` → `<câu đỏ Task 1 Step 5>` → hoàn nguyên → xanh | Chỉ canh cột gộp; việc chuyển liên hệ / vai / quan hệ là của máy chủ + R-PTY-MERGE-2 |
| Lính gác trạng thái của lô gộp hồ sơ (`LINH_GAC` ở `src/modules/parties/repository.ts`; bài `src/modules/parties/gop-lo.test.ts` "G13 tất định"; **ADR-0068 Đ2, G13**) | Hai lô gộp cùng một hồ sơ phụ (bấm đúp / hai người) chuyển dòng hai lần | Mỗi câu của lô có điều kiện "hai hồ sơ còn đang dùng, chưa gộp"; câu lật đứng cuối | **2026-MM-DD:** thay lính gác của `gop_mo_lien_he` bằng `1` → `<câu đỏ Task 5 Step 7>` → hoàn nguyên → xanh | Canh QUÊN ở từng câu có bài; câu mới thêm vào lô phải tự mang lính gác (người kiểm đọc mã) |
| Bất biến `R-PTY-MERGE-1..5` (`scripts/audit-checks.mjs` + `src/audit-invariants.test.ts`; **ADR-0068 G15**) | Dữ liệu gộp sai do SQL chạy tay hoặc khe giữa kiểm và ghi: chuỗi gộp, hồ sơ đã gộp còn liên hệ / vai / quan hệ mở, còn tài khoản, còn việc điều phối / vận chuyển, còn là người đặt đơn chưa giao | Câu SQL chỉ-đếm chạy trên D1 (`audit-invariants`, e2e chạy `--strict`); bài có ca xanh + ca đỏ trên `node:sqlite` | **2026-MM-DD:** D1 LOCAL — gieo liên hệ mở cho hồ sơ đã gộp → `<câu đỏ Task 10 Step 5>` (thoát 1) → đóng liên hệ → R-PTY-MERGE-2 đạt | Chỉ phát hiện sau khi xảy ra; không chặn |
| Chặn tạo hồ sơ trùng ở `POST /api/staff` (`src/modules/accounts/index.ts` `MATCH_EXISTS`; bài `src/modules/accounts/tao-trung.test.ts`; **ADR-0068 Đ9, C2**) | Thêm tài khoản sinh hồ sơ mới trong khi đã có hồ sơ cá nhân khớp SĐT / tên | Máy chủ trả 409 `party_match_exists` trừ khi có `partyId` hoặc cờ `taoHoSoMoi` | **2026-MM-DD:** đổi điều kiện thành `if (false)` → `<câu đỏ Task 10 Step 6>` → hoàn nguyên → xanh | Không áp cho đồng bộ nhân viên từ Sheet (C3 — backlog) |
```

- [ ] **Step 8: Commit**

```bash
git add scripts/audit-checks.mjs src/audit-invariants.test.ts docs/SO-HANG-RAO.md docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong-nhat-ky.md
git commit -m "$(cat <<'EOF'
Bất biến R-PTY-MERGE-1..5 + sổ hàng rào gộp hồ sơ (ADR-0068 G15)

Lưới thứ hai sau trigger: bắt chuỗi gộp, hồ sơ đã gộp còn dòng mở, còn tài
khoản, còn việc điều phối / vận chuyển hay đơn chưa giao (khe giữa lúc kiểm
và lúc ghi). Đã thấy từng hàng rào mới đỏ thật một lần rồi hoàn nguyên.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: e2e mỏng + tài liệu + nhật ký phiên bản + backlog

**Files:**
- Create: `tests/e2e/gop-ho-so.mjs`; Modify: `tests/e2e/run.mjs` (mảng `ALL`)
- Modify: `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/BACKLOG.md`
- Modify: `src/shared/changelog.ts`, `src/shared/app-info.test.ts`
- Modify: `docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong-nhat-ky.md` (mục "Đề xuất sửa luật")

- [ ] **Step 1: Kịch bản e2e** `tests/e2e/gop-ho-so.mjs`:

```js
// Gộp hồ sơ cá nhân (ADR-0068) — e2e MỎNG trên API thật (D1 local tạm, wrangler dev). Ca chi tiết ở npm test (khung thử). Ở đây: C2, T1, G1–G3, G7 (một đơn
// nháp), G9, G12 (Bán hàng 403), G13 (hai yêu cầu SONG SONG qua HTTP thật). Cuối lượt, run.mjs chạy audit-invariants --strict (có R-PTY-MERGE-*).
import assert from "node:assert/strict";
import { ACCOUNTS, call, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const tag = String(Date.now()).slice(-6);
const TEN = `Gộp Thử ${tag} Phương`;
const soX = randomPhone();

let r = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: soX }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const A = r.body.party.id;
assert.equal((await call(ADMIN, "POST", `/api/parties/${A}/roles`, { roleTypeCode: "BOAT_CAPTAIN" })).status, 201);

// C2: tạo tài khoản cùng tên, không cờ → 409 kèm A, không lộ SĐT của A; có cờ → 201
r = await call(ADMIN, "POST", "/api/staff", { fullName: TEN, phone: randomPhone(), roles: ["SALES_STAFF"] });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "party_match_exists");
assert.ok(r.body.error.khop.some((k) => k.id === A));
assert.ok(!JSON.stringify(r.body).includes(soX));
r = await call(ADMIN, "POST", "/api/staff", { fullName: TEN, phone: randomPhone(), roles: ["SALES_STAFF"], taoHoSoMoi: true });
assert.equal(r.status, 201, JSON.stringify(r.body));
const B = r.body.staff.partyId;
console.log("✓ C2: chặn tạo trùng; cờ “vẫn tạo hồ sơ mới”");

r = await call(ADMIN, "GET", "/api/parties/duplicates");
assert.equal(r.status, 200);
assert.ok(r.body.pairs.some((p) => [p.a.id, p.b.id].sort().join() === [A, B].sort().join() && p.lyDo.includes("NAME")));
console.log("✓ T1: cặp nghi trùng theo tên");

r = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(r.status, 201, JSON.stringify(r.body));
const donId = r.body.order.id;
await sql(`UPDATE orders SET booker_party_id = '${A}' WHERE id = '${donId}'`);

assert.equal((await call(SALES, "POST", `/api/parties/${A}/merge/preview`, { intoPartyId: B })).status, 403);
r = await call(ADMIN, "POST", `/api/parties/${A}/merge/preview`, { intoPartyId: B });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.chan, []);
assert.equal(r.body.donDoi, 1);
console.log("✓ G10 xem trước; G12 Bán hàng 403");

const [g1, g2] = await Promise.all([
  call(ADMIN, "POST", `/api/parties/${A}/merge`, { intoPartyId: B, xacNhan: TEN }),
  call(ADMIN, "POST", `/api/parties/${A}/merge`, { intoPartyId: B, xacNhan: TEN }),
]);
assert.deepEqual([g1.status, g2.status].sort(), [200, 409], `${JSON.stringify(g1.body)} ${JSON.stringify(g2.body)}`);
console.log("✓ G13: hai yêu cầu song song — một thành công");

r = await call(SALES, "GET", `/api/parties/lookup?phone=${soX}`);
assert.deepEqual(r.body.matches.map((m) => m.id), [B]);
r = await call(ADMIN, "GET", `/api/parties/${A}`);
assert.equal(r.body.party.mergedInto.id, B);
assert.equal(r.body.party.editable, false);
assert.equal((await sqlRows(`SELECT booker_party_id b FROM orders WHERE id = '${donId}'`))[0].b, B);
const nhatKy = await sqlRows(`SELECT target_id t, detail d FROM audit_log WHERE action = 'party_merged' AND target_id IN ('${A}', '${B}')`);
assert.equal(nhatKy.length, 2);
assert.ok(nhatKy.every((x) => !x.d.includes(soX)));
console.log("✓ G1–G3, G7, G9: SĐT sang B, A chỉ đọc, đơn nháp đổi người đặt, hai dòng nhật ký sạch");
```

Thêm `"gop-ho-so"` vào mảng `ALL` của `tests/e2e/run.mjs`, ngay sau `"parties"`.

Run: `npm run test:e2e -- gop-ho-so parties admin roles`
Expected: bốn kịch bản xanh + `audit-invariants` cuối lượt đạt (cần mạng — như mọi e2e).

- [ ] **Step 2: `docs/SYSTEM-DESIGN.md`** — tìm mục mô tả module `parties` / Danh bạ (`grep -n "parties\|Danh bạ" docs/SYSTEM-DESIGN.md | head`) và thêm đoạn:

```markdown
**Gộp hồ sơ cá nhân (ADR-0068).** Quản trị / Toàn quyền gộp hồ sơ phụ A vào hồ sơ chính B (`POST /api/parties/:id/merge/preview` → `…/merge`, ô `admin.manage` + luật cấp bậc). Một `db.batch()`: liên hệ, công việc nhóm OTHER, quan hệ, giấy tờ còn hiệu lực của A đóng / huỷ ở A và mở ở B (không nhân đôi, tránh chồng lấn ngày); đơn nháp / đã xác nhận chưa giao đổi người đặt sang B (câu của `orders` qua `ctx.gopHoSo`); A `active = 0`, `merged_into_id = B`; hai dòng nhật ký `party_merged`. Sổ sách (đơn đã giao / huỷ, chuyến, phiếu thu, công nợ, nhật ký) giữ A — gom "theo người" thì đi `merged_into_id` một bước. Hồ sơ đã gộp ẩn khỏi danh sách, tra SĐT, ô chọn khách; mở theo id thấy "Đã gộp vào …", mọi route ghi trả 409 `party_merged`. Không tách lại. `GET /api/parties/duplicates` liệt kê cặp nghi trùng (SĐT, tên chuẩn hoá giữ dấu, SĐT đăng nhập). `POST /api/staff` không kèm `partyId` mà có hồ sơ khớp → 409 `party_match_exists` trừ khi `taoHoSoMoi: true` (đồng bộ Sheet không đổi). Bất biến: trigger `pty_party_merge_*` + `R-PTY-MERGE-1..5`.
```

Cập nhật số route nếu tài liệu có ghi tổng (tìm `176`).

- [ ] **Step 3: `docs/CHANGE-GUIDE.md`** — (a) thêm một dòng vào bảng §1: `| Gộp hồ sơ / hồ sơ nghi trùng / chặn tạo trùng khi Thêm tài khoản | §2 z6 |`; (b) thêm công thức sau mục z5:

```markdown
### z6. Gộp hồ sơ cá nhân, hồ sơ nghi trùng, chặn tạo trùng (ADR-0068)

- **Luật gộp** ở MỘT hàm thuần `keHoachGop` (`src/modules/parties/gop.ts`, có `gop.test.ts`): thêm loại dữ liệu "sống" mới gắn với hồ sơ (vd một bảng mới có `party_id` còn sửa được) → quyết nó chuyển hay giữ, thêm vào kế hoạch + bộ dựng lô `gop-lo.ts` + preview; bảng CHỈ-THÊM / đông cứng thì giữ ở hồ sơ phụ và thêm vào xem trước nếu người gộp cần biết.
- **Mọi câu trong lô gộp phải mang lính gác `LINH_GAC`** (hai hồ sơ còn đang dùng, chưa gộp) — parties là module nghiêm, không có `wonGuard`. Câu của module khác (đổi người đặt đơn) tới qua `ctx.gopHoSo` và phải đứng TRƯỚC câu lật (`gop_lat`).
- **Phần của module khác** (việc đang mở, đơn theo người đặt, số dòng nợ, SĐT đăng nhập) chỉ gốc lắp ráp gọi — bài siết trong `src/architecture.test.ts` ("năm hàm công bố của gộp hồ sơ").
- **Route ghi mới của parties** phải trả 409 `party_merged` cho hồ sơ đã gộp (khuôn `DA_GOP()` sau lời kiểm quyền) và thêm ca vào bài G16 của `gop-route.test.ts`.
- **So tên** luôn bằng `chuanHoaTen` (`src/shared/ho-so-trung.ts`) — không so bằng `lower()` của SQLite.
- **Kiểm:** `node --test src/modules/parties/gop*.test.ts src/modules/parties/nghi-trung.test.ts src/modules/accounts/tao-trung.test.ts src/migrations-gop-ho-so.test.ts src/audit-invariants.test.ts` → `npm test` → `npm run test:e2e -- gop-ho-so parties admin` → Chrome `docs/evidence/2026-09-30-gop-ho-so/kich-ban/gop-ho-so-smoke.mjs`.
- **Bẫy:** tạo tài khoản mới bằng API (test, e2e, kịch bản) mà tên / số trùng hồ sơ có sẵn → 409 `party_match_exists`; thêm `taoHoSoMoi: true` nếu đúng là người khác.
```

(c) thêm hàng vào ma trận §3: `| src/modules/parties/gop*.ts, luật gộp, route gộp / nghi trùng | npm test + e2e gop-ho-so + Chrome gop-ho-so-smoke |`; (d) cập nhật mục "Số kế tiếp" của công thức d: thêm gạch `Cập nhật 2026-09-30 (nhánh gộp hồ sơ — ADR-0068): nhánh này thêm 0054_gop_ho_so.sql (giữ chỗ, CHƯA lên production).`

- [ ] **Step 4: `docs/BACKLOG.md`** — thêm cuối sổ:

```markdown
## N. Chặn hồ sơ trùng khi đồng bộ nhân viên từ Google Sheet

- **Ngày:** 2026-09-30 · **Nguồn:** ADR-0068 / đặc tả gộp hồ sơ C3 · **Trạng thái:** `ý tưởng`.
- **Hiện tại:** "Đồng bộ danh sách từ Google Sheet" tạo tài khoản + hồ sơ mới như trước, KHÔNG kiểm hồ sơ khớp tên / SĐT (chỉ `POST /api/staff` thủ công bị chặn — C2).
- **Còn vướng:** màn xem trước đồng bộ cần cột "hồ sơ khớp" và lựa chọn dùng hồ sơ có sẵn cho từng dòng; hàm dùng chung `createAccountWithRolesStatements` không được đổi hành vi ngầm.

## N+1. Báo cáo theo khách / sổ công nợ theo người gom qua hồ sơ đã gộp

- **Ngày:** 2026-09-30 · **Nguồn:** ADR-0068 mục Hệ quả · **Trạng thái:** `ý tưởng` (nợ cho module báo cáo / billing lượt sau).
- **Hiện tại:** sau khi gộp, đơn đã giao, chuyến, phiếu thu, công nợ, nhật ký vẫn trỏ hồ sơ phụ; sổ "theo người" của hồ sơ chính không thấy chúng. Xem trước gộp hiện số dòng công nợ giữ lại.
- **Cần:** mọi báo cáo "theo người" đi theo `merged_into_id` một bước (không chuỗi — trigger bảo đảm).

## N+2. Gộp hồ sơ tổ chức; nút "Không phải trùng"

- **Ngày:** 2026-09-30 · **Nguồn:** ADR-0068 (ngoài phạm vi bản đầu, chủ đồng ý) · **Trạng thái:** `tạm gác`.
- **Còn vướng:** tổ chức chạm xe (`vc_vehicle.owner_party_id`), công ty chủ, công nợ đại lý — cần ADR riêng. "Không phải trùng" cần bảng ghi cặp đã xác nhận khác người.
```

(Thay `N` bằng số mục kế tiếp của sổ.)

- [ ] **Step 5: Nhật ký phiên bản** — thêm mục vào ĐẦU `CHANGELOG` ở `src/shared/changelog.ts` (số theo main 1.45 — người gộp chốt số trống kế tiếp và ngày triển khai LÚC GỘP):

```ts
  {
    // Gộp hồ sơ cá nhân trùng (ADR-0068). Số "1.46" theo main 1.45; người gộp chốt số trống kế tiếp + ngày LÚC GỘP. Có migration 0054 (giữ chỗ).
    version: "1.46",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Danh bạ: Quản trị gộp được hai hồ sơ của cùng một người — xem trước phần chuyển sang, gõ lại tên rồi gộp. Không tách lại được." },
      { kind: "moi", text: "Danh bạ có mục \"Hồ sơ nghi trùng\": các cặp trùng số điện thoại hoặc họ tên để Quản trị rà và gộp." },
      { kind: "doi", text: "Thêm tài khoản: nếu đã có hồ sơ trùng số hoặc tên, app liệt kê để chọn dùng hồ sơ có sẵn thay vì tạo hồ sơ mới." },
    ],
  },
```

Sửa `src/shared/app-info.test.ts` dòng kỳ vọng: `assert.equal(formatReleaseLine(), "Phiên bản 1.46 · ngày 1 tháng 10 năm 2026");`

Run: `node --test src/shared/changelog.test.ts src/shared/app-info.test.ts`
Expected: PASS.

- [ ] **Step 6: Đề xuất sửa luật (N9 — không tự sửa).** Ghi vào nhật ký thi công mục "Đề xuất sửa luật — chờ chủ duyệt" dòng đề xuất cho bảng Chrome của `web/CLAUDE.md`:

```markdown
| Gộp hồ sơ, hồ sơ nghi trùng, khối hồ sơ khớp khi Thêm tài khoản (ADR-0068): hộp gộp / dải "đã gộp" / màn nghi trùng của `web/parties.ts`, `#merge` / `#dups` / `#dup-btn` của `public/parties.html`, khối `#add-khop` của `web/staff.ts`, `src/shared/ho-so-trung.ts` | `gop-ho-so-smoke.mjs` ở `docs/evidence/2026-09-30-gop-ho-so/kich-ban/` (5 bước, 1040 + 390) + `t2b-danh-ba-smoke.mjs` + `vai-smoke.mjs` |
```

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/gop-ho-so.mjs tests/e2e/run.mjs docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/BACKLOG.md src/shared/changelog.ts src/shared/app-info.test.ts docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong-nhat-ky.md
git commit -m "$(cat <<'EOF'
Gộp hồ sơ: e2e mỏng, tài liệu, nhật ký phiên bản 1.46, backlog (ADR-0068)

e2e kiểm hai yêu cầu gộp song song qua HTTP thật và chặn tạo trùng; tài liệu
mô tả sửa cùng mã; ghi nợ đồng bộ Sheet (C3) và báo cáo theo người vào sổ.
Số 1.46 theo main 1.45 — người gộp chốt số lúc gộp.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Kiểm đủ + người kiểm độc lập (việc lớn: dữ liệu + quyền)

**Files:** không sửa mã. Ghi kết quả vào `docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong-nhat-ky.md`.

- [ ] **Step 1: Bộ kiểm đầy đủ** (máy rảnh — bài đo giờ của hook chạy riêng trong `npm test`):

```bash
npm test
```
```bash
npm run typecheck
```
```bash
npm run test:e2e
```
Expected: `npm test` thoát 0; `tsc` 0 lỗi; e2e mọi kịch bản xanh + `audit-invariants --strict` cuối lượt đạt. Chép số bài / số kịch bản vào nhật ký.

- [ ] **Step 2: Người kiểm độc lập** — gọi subagent `nguoi-kiem-doc-lap` (chỉ đọc) với lời giao:

```text
Kiểm độc lập nhánh worktree-gop-ho-so (ADR-0068 gộp hồ sơ cá nhân) — việc lớn: dữ liệu + quyền. CHỈ ĐỌC, chạy lại lệnh, báo cáo, không sửa.
Nguồn: docs/adr/ADR-0068-gop-ho-so-ca-nhan.md, docs/superpowers/specs/2026-09-30-gop-ho-so/dac-ta.md (§2 G1–G16, T1–T3, C1–C3),
kế hoạch docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong.md (điểm dừng Q1–Q5 + trả lời của chủ trong nhật ký thi công).
Kiểm tối thiểu:
1) Mọi câu trong lô gộp (repository.ts gop_*) có lính gác LINH_GAC; câu đổi người đặt đơn đứng TRƯỚC gop_lat; nhật ký hai dòng changes() > 0.
2) Không cạnh mới trong ALLOWED_EDGES; năm hàm công bố chỉ src/index.ts gọi; NUA_NGHIEM có nguoi-dat-gop-repo.ts.
3) Route merge/preview/duplicates/ho-so-khop: can(staff, "admin.manage") viết thẳng; luật cấp bậc cho hồ sơ chính VÀ bên thứ ba; 403 cho 6 quyền không phải quản trị.
4) Không số giấy tờ ở DTO xem trước / phản hồi / câu lỗi / nhật ký; không SĐT trong nhật ký và trong 409 party_match_exists.
5) G16: mọi route ghi của parties trả 409 party_merged trên hồ sơ đã gộp (đối chiếu danh sách route ghi thật với bài G16).
6) Đồng bộ Sheet (C3) không đổi hành vi: createAccountWithRolesStatements KHÔNG có kiểm khớp (chỉ thêm kiểm "hồ sơ đã gộp" ở nhánh existingPartyId — route sheet/apply luôn truyền existingPartyId: null, xem src/modules/accounts/index.ts route POST /api/staff/sheet/apply).
7) Chạy lại: npm test, npm run typecheck, node --test src/modules/parties/gop*.test.ts src/audit-invariants.test.ts; đọc mã thật, không tin báo cáo thi công.
Báo: ĐẠT / KHÔNG ĐẠT từng mục kèm tệp:dòng và lệnh đã chạy.
```

Mục KHÔNG ĐẠT → sửa theo đúng task sở hữu (đỏ → xanh), rồi gọi người kiểm lại cho mục đó. Chỉ báo "đạt" dựa trên báo cáo người kiểm + test.

- [ ] **Step 3: Báo chủ** (4 mục: Đã làm — Đã kiểm — Chưa làm/chưa kiểm — Cần bạn quyết), lời thường. Đưa lệnh chủ tự chạy (không AI chạy — CLAUDE.md §8), đứng ở thư mục gốc repo `tourdao-sales`:

```bash
npm run day-len -- worktree-gop-ho-so
```

Kèm dòng: **"có đổi app + migration 0054 → sau khi đẩy lên cần chạy `npm run trien-khai`"** (runbook `docs/HANDOFF-N1.md`; migration remote do chủ chạy). Chưa kiểm trên iPhone thật → nói rõ "chưa kiểm".

---

## Tự rà: yêu cầu đặc tả → task

| Yêu cầu (đặc tả / ADR) | Task | Bài kiểm |
|---|---|---|
| Đ1 bước 1 liên hệ (G4, G5) | 3, 5, 6 | `gop.test.ts` G4/G5; `gop-route.test.ts` G1, G5 |
| Đ1 bước 2 công việc, chồng lấn ngày (G4) | 3, 5 | `gop.test.ts` G4 công việc; R7 |
| Đ1 bước 3 quan hệ, B↔B (G6) | 3, 5 | `gop.test.ts` G6, Review Focus 5; `gop-lo.test.ts` nhà xe |
| Đ1 bước 4 giấy tờ + chuỗi CCCD (G8), Đ4 | 3, 5, 6 | `gop.test.ts` G8 ×2; `gop-lo.test.ts` CCCD; `giay-to-khong-lo-so.test.ts` bài ADR-0068 |
| Đ1 bước 5 đơn + `updated_at` (G7) | 4, 6 | `nguoi-dat-gop.test.ts`; `gop-route.test.ts` G7 |
| Đ1 bước 6 lật A; Đ3 trigger (G14) | 1, 5 | `migrations-gop-ho-so.test.ts` (b)–(f) |
| Đ1 bước 7 nhật ký hai dòng (G9) | 6 | `gop-route.test.ts` G9 |
| Đ1 xem trước số dòng công nợ (G10) | 4, 6 | `so-dong-no.test.ts`; `gop-route.test.ts` G1 + G10 |
| Đ2 điều kiện (G11) | 3, 4, 6 | `gop.test.ts` G11 (13 mã); `gop-route.test.ts` G11 qua route |
| Đ2 "đang bận" điều phối / vận chuyển | 4, 3, 10 | `so-don-phu-trach.test.ts`, `viec-xe-cua-nguoi.test.ts`; R-PTY-MERGE-4 |
| Đ2 cấp bậc (G12) | 6 | `gop-route.test.ts` G12 |
| Đ2 chống bấm đúp / hai người (G13) | 5, 6, 11 | `gop-lo.test.ts` G13 tất định; `gop-route.test.ts` G13; e2e song song |
| Đ2 LC-3 | 3 | `gop.test.ts` R6 (chỉ mức hàm thuần — R6) |
| Đ3 bất biến chỉ-đọc (G15) + quan sát chặn thật | 10 | `audit-invariants.test.ts` R-PTY-MERGE-*; D1 local |
| Đ5 quyền `admin.manage`, không ô MATRIX mới | 6, 7, 8 | `route-write-guard`, `permission-enforcement`, `route-access` |
| Đ6 ranh giới module, không cạnh mới | 4 | `architecture.test.ts` (cạnh, NUA_NGHIEM, siết năm hàm) |
| Đ7 đọc sau gộp, `mergedInto` / `mergedFrom` (G2, G3) | 5, 6, 9 | `gop-lo.test.ts` Đ7; `gop-route.test.ts` G2 + G3; Chrome bước 2 |
| G16 chặn ghi trên hồ sơ đã gộp | 6 | `gop-route.test.ts` G16 |
| Đ8 / P2 nghi trùng (T1, T3) | 2, 7, 9 | `ho-so-trung.test.ts`; `nghi-trung.test.ts`; Chrome bước 3 |
| T2 "Gộp…" điền sẵn, bên có tài khoản làm hồ sơ chính | 9 | Chrome bước 3 (đọc mã `moNghiTrung`) |
| Đ9 / C2 máy chủ | 8 | `tao-trung.test.ts` |
| C1 giao diện [Dừng Q4] | 8, 9 | `tao-trung.test.ts` C1; Chrome bước 4 |
| C3 Sheet không đổi + backlog | 8, 11 | người kiểm độc lập mục 6; `docs/BACKLOG.md` |
| §5 giao diện (hộp gộp, dải, mục đã gộp, 390 + 1040) | 9 | `gop-ho-so-smoke.mjs` + kịch bản cũ theo bảng `web/CLAUDE.md` |
| §3 data-dictionary + `npm run dict` | 1 | `git diff docs/DATA-DICTIONARY.md` |
| Review Focus 1–5 | 3, 4, 5, 6, 7 | ghi ở mục Review Focus |
| §7 kiểm độc lập (việc lớn) | 12 | báo cáo `nguoi-kiem-doc-lap` |
| Mục nhật ký phiên bản, SYSTEM-DESIGN, CHANGE-GUIDE | 11 | `changelog.test.ts`, `app-info.test.ts` |
