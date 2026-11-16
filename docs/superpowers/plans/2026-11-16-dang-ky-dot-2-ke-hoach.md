# Đăng ký đối tác — đợt 2: kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Hồ sơ có ngày 16/11/2026. Viết sau khi chủ duyệt ADR-0212, ADR-0213 cùng ngày («duyệt, có điều chỉnh , số 2- lên bản thận trước. 1 và 3 như khuyến nghị, chốt kế hoạch»). ADR thắng mọi chữ của kế hoạch này khi lệch.

**Goal:** Danh sách vai đăng ký lấy từ một nguồn trong CSDL; biểu mẫu khớp nơi lưu (có máy canh); một phiếu khai cá nhân kèm tổ chức tuỳ chọn; tổ chức là hồ sơ không đăng nhập, có đúng một người quản lý và các thành viên; người dùng chọn tư cách theo từng đơn; đơn của thành viên qua người quản lý trước khi lên Tour Đảo.

**Architecture:** Ba mốc phát hành, mỗi mốc tự đứng được. **Lượt A** (ADR-0212): `parties` công bố danh sách vai từ `pty_role_type`; `dang-ky` thêm bảng anh em `dk_submission_org`, kết luận Danh bạ của tổ chức, mục xác minh tổ chức; lô duyệt sinh hồ sơ tổ chức và nối «Người liên hệ của». **Lượt B1** (ADR-0213 phần người quản lý): quan hệ `MANAGER_OF`/`MEMBER_OF` trong `pty_party_relationship`, LC-1c tạo lại, tư cách theo đơn do gốc lắp ráp kiểm (`benDangThayMat`), cờ `quanLyBenDat` trong `can()`, lệnh văn phòng chuyển quyền quản lý. **Lượt B2** (ADR-0213 phần thành viên): mã vào tổ chức, chế độ thành viên, bảng `ord_member_submit`, ngoại lệ có tên ở `xem-don-nhap.ts`, tin cho người quản lý. Lô ghi chung luôn ghép từ câu chưa chạy của module chủ; ràng buộc cứng ở trigger, máy chủ trả câu rõ trước lô.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 + R2 (`HO_SO`), Email (`EMAIL`), `node --test`, esbuild; không dependency runtime.

**Spec:** `docs/adr/ADR-0212-vai-dang-ky-la-du-lieu-bieu-mau-khop-noi-luu-phieu-co-phan-to-chuc.md`, `docs/adr/ADR-0213-thao-tac-theo-tu-cach-nguoi-quan-ly-va-thanh-vien-to-chuc-loi-moi.md`; đặc tả `docs/superpowers/specs/2026-11-16-dang-ky-dot-2-ca-nhan-va-to-chuc.md`; trang ghép và trang trình `docs/superpowers/specs/2026-11-16-dang-ky-dot-2-luot-duyet/TRANG-GHEP.md`, `TRINH-CHU.md` (bảng «Chữ đề xuất»: tên đầu là tên đã chốt). Mẫu cách làm: kế hoạch và nhật ký đợt 1 `docs/superpowers/plans/2026-11-15-dang-ky-dot-1-*.md`.

## Global Constraints

- Việc lớn: mỗi task chạm dữ liệu, quyền, tiền hoặc tài khoản có **người kiểm độc lập chỉ đọc** (agent `nguoi-kiem-doc-lap`) trước khi sang task kế; người thi công không tự nghiệm thu (CLAUDE.md §3, Hiến pháp N8).
- Mỗi task: bài **đỏ trước, xanh sau**; `npm run typecheck` 0 lỗi; tự đọc lại tệp `*.test.ts` mới (typecheck không phủ). Bộ dài (`npm test`, e2e, Chrome) chạy đủ **một lần** ở Task 18 của mỗi mốc.
- Tệp bài mới phải có dòng trong `scripts/thoi-gian-test.json` (giây đo thật) — bài học đợt 1 Task 11.
- Migration chỉ thêm tệp mới. `0170`–`0172` đã áp remote: mọi trigger, view cần đổi đều **DROP + CREATE trong tệp mới** (`guard-tep` chặn sửa tệp cũ). Số tệp chốt ở Task 0 (mốc A) và kiểm lại đầu Task 9 (B1), Task 15 (B2); kế hoạch không ghi số đoán. Trong lúc mốc chưa nhập `main`, task sau được nối thêm vào tệp migration của mốc đó (như đợt 1).
- SQL module nghiêm qua `defineSql`; `orders` chỉ viết SQL mới ở tệp nửa nghiêm `src/modules/orders/chang-hanh-khach-repo.ts`; module khác chỉ import qua `index.ts`; đọc xuyên module qua view `v_<tiền tố>_*` chỉ khoá + nhãn; không thêm cạnh vào `ALLOWED_EDGES` (gốc lắp ráp tiêm hàm khi cần).
- Không thêm mã quyền. Đúng **một** hàng quyền mới: `partner.org.manager.write` (Task 10). Bản đồ quyền và ảnh chụp (`src/shared/permissions.test.ts`) sửa cùng commit.
- Luật tiền không đổi: mọi tệp sổ vàng, bài tiền liệt kê ở ADR-0213 Đ4.3 xanh **không sửa đáp án**.
- Ngày dân sự `vnToday(new Date())` truyền làm tham số; dấu thời gian ISO UTC.
- Nhật ký, lịch sử phiếu, câu báo lỗi, lời mời không chứa SĐT, email, mã số thuế, số GPKD, số giấy tờ. Số GPKD và mã số thuế trên phiếu là N3; mã vào tổ chức chỉ lưu bản băm (N4).
- Chữ giao diện tra `docs/BANG-THAM-CHIEU.md`; chữ mới thêm vào `src/shared/bang-tham-chieu*.ts` đúng tên đầu của bảng «Chữ đề xuất»: «Hồ sơ tổ chức», «Người quản lý tổ chức», «Thành viên», «Tư cách», «Chỉ soạn», «Soạn và gửi người quản lý xác nhận», «Mã vào tổ chức», «Chuyển quyền quản lý». Tên hai loại quan hệ ở Danh bạ: «Người quản lý của», «Thành viên của». Chữ khác chưa có trong bảng: khai «chờ chọn» theo công thức z34, không tự đặt thêm khái niệm.
- Giao diện: dựng bằng `h()`, ô gõ 16px, không `innerHTML`. Trần gói trang Đơn hàng (`src/goi-trang-nhe.test.ts`) chủ vừa nới 16/11: ô Tư cách viết gọn; nếu vẫn vượt thì gom **một** câu hỏi «Duyệt nới» vào báo cáo cuối mốc, không tự nới.
- Tệp luật (`CLAUDE.md`, `web/CLAUDE.md`, `.claude/`, `docs/adr/`) chỉ người điều phối sửa bằng công cụ sửa tệp; trợ lý chạy nền không sửa.
- Gieo dòng vào bảng tra cứu dùng chung (`pty_relationship_type`, `pty_verification_requirement`) thì `grep` `tests/e2e` tìm bài ghim danh sách (hôm nay: `parties.mjs`, `tai-xe-doi-tac.mjs`, `tien-xe-thue.mjs`, `tu-choi-bao-ban.mjs`, `chuyen-khach.mjs` nhắc loại quan hệ) và chạy lại e2e đó.
- Mỗi hàng rào mới: một dòng ở `docs/SO-HANG-RAO.md` kèm ngày **quan sát chặn thật** (sửa cố ý → đỏ → hoàn nguyên), ghi trong bước của task sở hữu.
- AI không chạy lệnh ghi lên production; không `git push`, không merge vào `main`, không `wrangler deploy`, không migration remote. Lệnh `npm run day-len`, `npm run trien-khai` do chủ chạy.

## Mốc phát hành và thời hạn

Chủ cho phát hành **trước** buổi diễn tập khôi phục 25/11/2026 (khoá `xay_tren_cho_phep_adr_0212_0213`, `docs/quyen-hoan.json`). Còn khoảng tám ngày nên chia ba mốc, mỗi mốc có mục nhật ký thay đổi và khối runbook riêng:

| Mốc | Task | Người dùng được gì | Mục tiêu sẵn sàng |
|---|---|---|---|
| A | 0–8, rồi 18 | vai từ một nguồn, loại Kế toán thêm duyệt được, ô Giới tính, phiếu kèm tổ chức (người đăng ký phải có vai cá nhân), hồ sơ tổ chức sinh khi duyệt, nối «Người liên hệ của» | 19/11 |
| B1 | 9–14, rồi 18 | tổ chức có người quản lý; người quản lý thay mặt tổ chức lập đơn, thấy đơn và công nợ tổ chức; văn phòng chuyển quyền quản lý; phiếu «chỉ tổ chức» và Công ty lữ hành mở được | 22/11 |
| B2 | 15–17, rồi 18 | mã vào tổ chức, thành viên, hai chế độ, đơn thành viên qua người quản lý | 24/11 |

- **Luật cắt:** mốc nào chưa có người kiểm độc lập toàn mốc báo ĐẠT trước **24/11 12:00** thì **chờ sau buổi diễn tập**, không dồn. Mốc A dùng được một mình; nếu B chưa kịp, chỉ phát hành A.
- **B1 không có thành viên thao tác:** ở B1 ô Tư cách chỉ liệt kê tổ chức người đó là **người quản lý** (Ruling R4). Dòng «Thành viên của» chỉ sinh từ lệnh chuyển quyền (người quản lý cũ) và chưa cho tư cách gì tới B2. Dù vậy B1 đã ép Đ8.1: đơn có bên đặt là tổ chức chỉ người quản lý có hiệu lực gửi lên Tour Đảo.
- **Bật phần tổ chức cho công chúng:** phần tổ chức của biểu mẫu chỉ hiện, và máy chủ chỉ nhận, khi phiên bản chính sách riêng tư **đang hiệu lực** mang dấu «Thu thông tin tổ chức» (Task 4). Phát hành A trước khi chủ đăng chính sách phiên bản có dấu đó thì phần tổ chức tự ẩn; mọi phần còn lại của A vẫn chạy.

## Review Focus

1. **Mã số thuế viết kiểu có hậu tố chi nhánh hoặc dấu cách** (`0123456789-001`, `0123 456 789`): khoá chuẩn hoá giữ hậu tố, bỏ khoảng trắng; hai cách viết của cùng một mã đối chiếu ra cùng hồ sơ tổ chức — bài ở Task 5 (chuẩn hoá) và Task 6 (đối chiếu).
2. **Số GPKD có chữ, dấu gạch, khoảng trắng** (`41A8 001234`): khoá chuẩn hoá giống luật `number_key` của giấy tờ cá nhân; GPKD đã thuộc tổ chức khác bị chặn 409 trước lô, không lỗi thô của trigger — Task 5, Task 7.
3. **Mã vào tổ chức gõ chữ thường, thiếu dấu gạch, thừa khoảng trắng** (`ab12cd34`): nhận như `AB12-CD34`; gõ sai vẫn tính vào trần 5 lần mỗi giờ — Task 15.
4. **Hai người văn phòng bấm «Chuyển quyền quản lý» cùng lúc** cho cùng tổ chức: đúng một lệnh thắng, tổ chức luôn có đúng một người quản lý, người thua nhận 409 câu rõ — Task 10.
5. **Thành viên rời tổ chức (hoặc bị gỡ) khi nháp đang chờ người quản lý:** người quản lý vẫn thấy, gửi lên hoặc huỷ được; thành viên không lưu, không rút được nữa; không sinh tiền — Task 16.

## Tên thật thay tên giữ chỗ của ADR

| Tên giữ chỗ (ADR) | Tên thật |
|---|---|
| `vaiDangKyDuoc` (Đ1) | `vaiDangKyDuoc(db): Promise<VaiDangKy[]>` xuất ở `src/modules/parties/index.ts`; kiểu `VaiDangKy = { ma: string; ten: string; nhom: "EXTERNAL" \| "OTHER"; laLoaiDoiTac: boolean }` ở `src/shared/dang-ky-vai.ts` |
| bảng điều kiện vai (Đ2) | `src/shared/dang-ky-vai.ts`: `phanCuaVai(v: VaiDangKy): "CA_NHAN" \| "CHI_TO_CHUC" \| "CA_NHAN_HOAC_TO_CHUC"`; `lyDoChuaMoDuoc(v: VaiDangKy, mt: MoiTruongMo): string \| null`; `MoiTruongMo = { coThayMatToChuc: boolean; chinhSachCoToChuc: boolean; coOBangLai: boolean }` |
| «ADR-0213 đã thi công» | hằng **duy nhất** `DA_CO_THAY_MAT_TO_CHUC: boolean` ở `src/shared/dang-ky-vai.ts` (Ruling R1) |
| `dk_submission_org` (Đ4) | giữ tên. Cột: `id`, `registration_id`, `version`, `display_name`, `legal_name`, `tax_code`, `tax_key`, `address`, `invoice_email`, `phone_value`, `phone_key`, `gpkd_number`, `gpkd_key`, `gpkd_issued_date`, `gpkd_issued_place`, `extra_type_code`, `extra_number`, `extra_key`, `extra_issued_date`, `extra_issued_place`, `extra_expiry_date`, `authority_confirmed_at`, `created_at`, `erased_at` |
| `org_role_code`, `org_match_kind`, `org_match_party_id` (Đ4) | giữ tên, cột mới của `dk_registration`; B2 thêm `invite_id` |
| ô ảnh tổ chức | `slot` = `GPKD`, `GIAY_PHEP_THEM` (cạnh `CCCD_MAT_TRUOC`, `CCCD_MAT_SAU` ở `src/modules/dang-ky/rules.ts`) |
| tệp ánh xạ (Đ9) | `src/shared/dang-ky-truong.ts`: `TRUONG_DANG_KY: readonly TruongDangKy[]`, `CHO_O: readonly { cot: string; hetHan: string }[]` |
| bài khớp cột (Đ9) | `src/dang-ky-truong-khop-cot.test.ts` |
| dấu chính sách có phần tổ chức (Đ7) | cột `pty_privacy_policy.covers_org_data` (0/1) — tên hiện: «Thu thông tin tổ chức» (Ruling R2) |
| `MANAGER_OF`, `MEMBER_OF` (ADR-0213 Đ2) | giữ mã; `name` = «Người quản lý của», «Thành viên của» |
| view liên kết | `v_pty_org_link (relationship_id, person_party_id, org_party_id, kind, valid_from_date)` chỉ dòng đang mở; `kind` ∈ `MANAGER`, `MEMBER` |
| `benDangThayMat(actor, tuCach)` | `ctx.benDangThayMat(tuCach: string \| undefined): Promise<{ ok: true; benDat: string; laToChuc: boolean } \| { ok: false; res: Response }>` tiêm từ `src/index.ts`; thân lệnh lập đơn có trường `tuCach` = mã hồ sơ của tư cách |
| cờ `quanLyBenDat` (Đ5) | trường mới `OperationContext.quanLyBenDat?: boolean`; tiêm `ctx.laQuanLyCuaBen(partyId: string \| null): Promise<boolean>` |
| người quản lý «có hiệu lực» (Đ2.8) | `nguoiQuanLyCoHieuLuc(db, orgPartyId): Promise<{ staffId: string; partyId: string } \| null>` ở `src/index.ts` (ghép view `parties` + `staff`) |
| `partner.org.manager.write` | giữ tên, `quanLyBanHang()` |
| `pty_org_invite` | giữ tên; mã định danh tiền tố `MV` (kiểm trùng ở `src/shared/ma-dinh-danh.ts` trước khi dùng) |
| `pty_org_member_mode` | giữ tên; giá trị `CHI_SOAN`, `SOAN_VA_GUI`; không có dòng ⇒ `SOAN_VA_GUI` |
| `ord_member_submit` | giữ tên; trạng thái `MO`, `DA_GUI_LEN`, `TRA_LAI`, `DA_RUT` |
| yêu cầu chuyển quyền (Đ6) | bảng `pty_org_transfer_request` (chỉ thêm; `MO`, `DA_XU_LY`, `DA_HUY`) |
| `acting_party_id` | giữ tên, cột của `audit_log`; điền trong câu từ cột cùng tên của đơn (Ruling R3) |
| tư cách của đơn (Đ3.6 «thuộc tính của đơn») | hai cột mới của `orders`, ghi trong câu `INSERT INTO orders` lúc lập, không bao giờ sửa: `acting_party_id TEXT` (hồ sơ của tư cách; NULL = đơn văn phòng hoặc đơn lập trước B1) và `acting_link_kind TEXT CHECK (acting_link_kind IS NULL OR acting_link_kind IN ('CA_NHAN','MANAGER','MEMBER'))` (Ruling R9) |

## Tệp chính

- Tạo: `src/shared/dang-ky-vai.ts` (+ test), `src/shared/dang-ky-truong.ts`, `src/dang-ky-truong-khop-cot.test.ts`, `src/vai-mot-nguon.test.ts`, `src/ben-thay-mat-xep-nhom.test.ts`, `src/shared/to-chuc.ts` (luật thuần của tổ chức: chuẩn hoá mã số thuế, GPKD, mã vào tổ chức, chế độ, `duocGuiLenTourDao`) + test, `src/modules/parties/to-chuc-route.ts` (+ test), `src/modules/parties/loi-moi.ts` (+ test), `src/modules/orders/thanh-vien-route.ts` (+ test), `tests/e2e/dang-ky-to-chuc.mjs`, `tests/e2e/to-chuc-thanh-vien.mjs`, `web/to-chuc.ts` (màn «Thành viên» của người quản lý), `docs/superpowers/specs/2026-11-16-chinh-sach-rieng-tu-ban-nhap/PHAN-THEM-TO-CHUC.md`, nhật ký thi công `docs/superpowers/plans/2026-11-16-dang-ky-dot-2-thi-cong-nhat-ky.md`.
- Sửa nhiều: `src/modules/dang-ky/{phieu-route,chinh-sach-route,xin-ma-route,xac-minh-route,duyet-route,repository,rules,xac-minh}.ts`, `src/shared/dang-ky-hien-thi.ts`, `src/shared/dau-xac-minh.ts`, `src/modules/parties/{index,repository,rules,tu-khai}.ts`, `src/modules/staff/index.ts`, `src/index.ts`, `src/shared/permissions.ts`, `src/shared/xem-don-nhap.ts`, `src/shared/booker.ts`, `src/modules/orders/{index,xac-nhan-route,xac-nhan-chung}.ts`, `src/modules/billing/index.ts`, `src/modules/audit/repository.ts`, `scripts/audit-checks.mjs`, `scripts/cau-doc-doi-tac-thieu-vai-tro.mjs`, `web/dang-ky.ts`, `web/dang-ky-hang-cho.ts`, `web/order-form.ts`, `web/parties.ts`, `docs/data-dictionary.json`.

---

### Task 0: Nhận `main`, chốt số migration, mở nhật ký

**Files:** Create `docs/superpowers/plans/2026-11-16-dang-ky-dot-2-thi-cong-nhat-ky.md`.

- [ ] **Step 1:** `git fetch origin` rồi nhận bản mới nhất vào nhánh: `git merge origin/main` (hoặc `main` cục bộ nếu đi trước `origin/main` — so bằng `git log --oneline origin/main..main`). Không push. Có xung đột thì giải trên nhánh, không đụng `main`.
- [ ] **Step 2:** Liệt kê migration mọi nhánh và worktree chưa gộp:
  ```bash
  for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin); do git ls-tree --name-only "$b" migrations/ 2>/dev/null; done | sed 's#migrations/##' | sort -u | tail -5
  git worktree list
  ```
  Số mốc A = số lớn nhất + 1 (lúc viết kế hoạch: lớn nhất `0172` ở mọi nhánh — chỉ để tham khảo, phải chạy lại). Ghi số vào nhật ký thi công dòng «Ruling: số migration mốc A = …». Tên tệp: `<số>_dang_ky_to_chuc.sql`.
- [ ] **Step 3:** `npm run typecheck` và `node --test src/architecture.test.ts src/migrations-dang-ky.test.ts` xanh trên nhánh sau khi nhận `main` (bài dài để Task 18).
- [ ] **Step 4:** Commit «Nhận main, chốt số migration đợt 2 (mốc A)».

### Task 1 (A): Vai đăng ký là dữ liệu, một nguồn, bài canh lệch

**Files:**
- Create: `src/shared/dang-ky-vai.ts`, `src/shared/dang-ky-vai.test.ts`, `src/vai-mot-nguon.test.ts`
- Modify: `src/modules/parties/index.ts` (+ `vaiDangKyDuoc`), `src/modules/dang-ky/chinh-sach-route.ts` (`kiemThanChinhSach`, `dto`), `src/modules/dang-ky/xin-ma-route.ts` (`cauHinhDangKy`: loại mở = giao của chính sách với danh sách lúc này, kèm tên), `src/modules/dang-ky/phieu-route.ts` (`luuNhapPhieu`, `guiPhieu` dùng cùng giao), `src/shared/dang-ky-hien-thi.ts` (bỏ `VAI_MO_DUOC_CHO_PHIEU_CA_NHAN`), `src/shared/bang-tham-chieu-khai-niem.ts` (mục «Nhận đăng ký mới» bỏ tên hằng cũ), `web/dang-ky.ts` (bỏ `tenVai`/`ROLES`; tên từ cấu hình máy chủ), `scripts/audit-checks.mjs` (+ `R-DK-6`, `R-DK-7`), `src/audit-invariants.test.ts`, `src/modules/dang-ky/chinh-sach-route.test.ts`, `docs/SO-HANG-RAO.md`

**Interfaces:**
- Produces: `vaiDangKyDuoc(db)` — mọi `pty_role_type` có `active = 1` và (`role_group = 'EXTERNAL'` hoặc `is_partner_label = 1`), sắp theo `sort_order`; dùng lại `listRoleTypes`, không câu SQL mới. `DA_CO_THAY_MAT_TO_CHUC = false` (Task 13 bật). `phanCuaVai`: `TRAVEL_AGENCY` ⇒ `CHI_TO_CHUC`; `laLoaiDoiTac` ⇒ `CA_NHAN_HOAC_TO_CHUC`; còn lại ⇒ `CA_NHAN`. `lyDoChuaMoDuoc`: `TRAVEL_AGENCY` khi `!coThayMatToChuc` hoặc `!chinhSachCoToChuc`; `DRIVER_EXTERNAL` khi `!coOBangLai` (hôm nay luôn false: hằng `CO_O_BANG_LAI = false` cùng tệp) — câu nói thiếu gì.
- `GET /api/dang-ky/chinh-sach` trả `loaiCoThe: { ma, ten, laLoaiDoiTac, lyDoChuaMo: string | null }[]`; `GET /api/dang-ky/cau-hinh` trả `loaiMo: { ma, ten, phan }[]` (thay `string[]`).

- [ ] **Step 1: Bài đỏ.** `dang-ky-vai.test.ts`: bảng ca của `phanCuaVai`, `lyDoChuaMoDuoc` (Công ty lữ hành thiếu một trong hai điều kiện ⇒ câu; Tài xế đối tác ⇒ câu nhắc ô bằng lái và bước chọn nhà xe; `LD_X` ⇒ null). `chinh-sach-route.test.ts`: chèn dòng `pty_role_type` `LD_TEST` có cờ ⇒ có trong `loaiCoThe` với tên từ bảng; tắt ⇒ biến mất; mở `LD_TEST` ⇒ 200; mở vai nội bộ (`ACCOUNTANT`…), vai `OTHER` không cờ (`CARRIER`) ⇒ 400; mở `TRAVEL_AGENCY` hôm nay ⇒ 400 câu của `lyDoChuaMoDuoc`; mở `DRIVER_EXTERNAL` ⇒ 400. Cấu hình công khai: chính sách còn mã `LD_TEST` đã tắt ⇒ không có trong `loaiMo`; `PUT /api/dang-ky/phieu` với mã đó ⇒ 400 `CAU_PHIEU.loaiDong`. `src/vai-mot-nguon.test.ts`: quét `src/`, `web/` (trừ `*.test.ts`, `migrations/`, `scripts/`) — không tệp nào ngoài `src/shared/roles.ts` có mảng chuỗi chứa từ hai mã vai đối tác trở lên; quét `web/dang-ky.ts` không import `roles`. **Chạy bản quét trước** trên mã hôm nay: mỗi chỗ tìm thấy hoặc sửa (đọc từ nguồn), hoặc vào danh sách cho phép **kèm lý do từng dòng** (ví dụ bộ quyền mặc định, luật bán) — người kiểm độc lập đọc danh sách đó.
- [ ] **Step 2:** Chạy — FAIL.
- [ ] **Step 3:** Viết. Duyệt kiểm lại lúc duyệt (Đ1.4) để Task 2.
- [ ] **Step 4:** Bất biến: `R-DK-6` (Đ1.5 b) — dòng `pty_role_type` có `is_partner_label = 1` mà `active` khác `prc_beneficiary_role.active` cùng mã (đếm, `fail`); `R-DK-7` (Đ1.5 c) — dòng `dk_policy` hiện hành có mã trong `open_role_codes` không có ở `pty_role_type` (đếm, `fail`). Ca trong `src/audit-invariants.test.ts`: dữ liệu sạch 0; lệch ⇒ 1.
- [ ] **Step 5:** PASS: `node --test src/shared/dang-ky-vai.test.ts src/vai-mot-nguon.test.ts src/modules/dang-ky/chinh-sach-route.test.ts src/modules/dang-ky/xin-ma-route.test.ts src/modules/dang-ky/phieu-route.test.ts src/audit-invariants.test.ts`. Quan sát chặn thật: thêm tạm `const X = ["GUIDE_FREELANCE","TAXI_DRIVER"]` vào một tệp `web/` ⇒ bài quét đỏ → hoàn nguyên; ghi dòng `docs/SO-HANG-RAO.md` («một nguồn vai đối tác»; `R-DK-6`, `R-DK-7`).
- [ ] **Step 6:** Commit «Vai đăng ký đọc từ pty_role_type, một nguồn, bài canh lệch (ADR-0212 Đ1, Đ2)». **Người kiểm độc lập** đọc Task 1.

### Task 2 (A): Duyệt một loại do Kế toán thêm

**Files:**
- Modify: `src/modules/staff/index.ts` (+ `createPartnerAccountOnPartyStatements`), `src/modules/staff/repository.ts` (dùng lại `INSERT_ADJUSTMENT`), `src/index.ts` (`loDuyetDangKy` nhận mã không phải `RoleCode` khi là loại đối tác), `src/shared/dang-ky-duyet.ts` (`roleCode: string`, thêm `laLoaiDoiTac: boolean`), `src/modules/dang-ky/duyet-route.ts` (kiểm vai theo `vaiDangKyDuoc`, 409 khi loại đã tắt)
- Test: `src/modules/dang-ky/duyet-route.test.ts`, `src/modules/staff/tai-khoan-dang-ky.test.ts`, `src/so-vang-dang-ky-loai-doi-tac.test.ts` (mới)

**Interfaces:**
- Produces: `createPartnerAccountOnPartyStatements(db, { partyId: string; phone: string; reason: string }, actorId: string, at: string): Promise<{ id: string; statements: D1PreparedStatement[] }>` — `staff` tắt + **một** dòng `stf_permission` `PARTNER` + **một** dòng `stf_permission_adjustment` `ADD PARTNER` (lý do `reason`, không dữ liệu cá nhân). Task 13 dùng lại cho người chỉ làm cho tổ chức.
- `duyetPhieu`: `roleCode` hợp lệ khi có trong `vaiDangKyDuoc` lúc duyệt; là `RoleCode` nhóm bên ngoài ⇒ đường cũ (`roleAssignmentProblem`, `createAccountOnPartyStatements`); là loại đối tác ⇒ biến thể mới, không qua `roleAssignmentProblem`. Loại không còn trong danh sách ⇒ 409 `role_inactive` «Loại đối tác này đã tắt. Hãy chọn loại khác hoặc từ chối phiếu.»

- [ ] **Step 1: Bài đỏ.** Duyệt phiếu với `LD_TEST`: hồ sơ có đúng **một** vai (`LD_TEST`), tài khoản có đúng quyền `PARTNER`, có một dòng chỉnh tay `ADD PARTNER`; `R-DK-4`, `R-LC-1c` không đỏ (hai kiểm đã nhận `v_pty_party_partner_label`, chạy lại để chắc). Tắt `LD_TEST` giữa xác minh và duyệt ⇒ 409 `role_inactive`, không dòng nào sinh. **Lưu vai ở Quản lý tài khoản** cho tài khoản đó với danh sách vai rỗng (`PUT /api/staff/:id/roles`, `roles: []`, giữ `adds: ["PARTNER"]`) ⇒ còn quyền Đối tác, vai `LD_TEST` không bị đóng (ADR-0212 Đ3 «chưa kiểm»: `roleChangeStatements` bỏ qua dòng không phải `RoleCode`; nếu route từ chối danh sách rỗng thì ghi nhật ký thi công và báo điều phối — không tự nới). Sổ vàng mới: loại `LD_TEST` có mức riêng ở bậc mặc định, đơn đầu tiên của tài khoản xác nhận được, hoa hồng đúng mức đó, không bị giữ «thiếu mức».
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS cùng `node --test src/so-vang*.test.ts src/hoa-hong-mot-nguon.test.ts`.
- [ ] **Step 5:** Commit «Duyệt loại đối tác do Kế toán thêm: một vai, quyền Đối tác chỉnh tay (ADR-0212 Đ3)». **Người kiểm độc lập** đọc Task 2.

### Task 3 (A): Tệp ánh xạ trường ↔ cột, bài khớp cột, ô Giới tính

**Files:**
- Create: `src/shared/dang-ky-truong.ts`, `src/dang-ky-truong-khop-cot.test.ts`
- Modify: `src/modules/dang-ky/phieu-route.ts` (`TRUONG_GUI`, `TRUONG_GIAY_TO` dựng từ tệp ánh xạ), `web/dang-ky.ts` (ô dựng từ tệp ánh xạ; thêm ô «Giới tính» tuỳ chọn dùng `kiemGioiTinh` sẵn có), `docs/SO-HANG-RAO.md`

**Interfaces:**
- Produces: `interface TruongDangKy { khoa: string; phan: "CA_NHAN" | "TO_CHUC"; nhom?: "giayTo" | "toChuc" | "giayPhepThem"; bang: "dk_submission" | "dk_submission_org" | "dk_registration" | "pty_registration_attachment"; cot: readonly string[]; noiLuu: readonly string[] | "CHI_PHIEU"; batBuoc: boolean }`. `khoa` = tên trường trong thân lệnh gửi (`hoTen`, `gioiTinh`, `ngaySinh`…); `cot` ghi «một trường → ba cột» cho họ tên. `CHO_O = [{ cot: "license_class_code", hetHan: "2027-03-31" }]` (hạn: lúc mở Tài xế đối tác; Ruling R7). `COT_HE_THONG: Readonly<Record<string, readonly string[]>>` — danh sách có tên cột hệ thống / máy tính từng bảng (`id`, `registration_id`, `version`, `phone_key`, `number_key`, `tax_key`, `gpkd_key`, `extra_key`, `policy_id`, `consented_at`, `created_at`, `erased_at`…). `document_type_code` ghi «giá trị cố định CCCD».
- Consumes (cho chiều 3–4): CSDL SQLite trong bộ nhớ đã áp mọi migration — đúng cách `src/hang-du-lieu.test.ts` đọc cột.

- [ ] **Step 1: Bài đỏ** `dang-ky-truong-khop-cot.test.ts`, bốn chiều của ADR-0212 Đ9: (1) tập ô `web/dang-ky.ts` dựng (đọc qua tệp ánh xạ — bài quét chuỗi `TRUONG_DANG_KY` là nguồn ô duy nhất, không khai ô tay) = tập khoá; (2) tập trường máy chủ nhận = tập khoá; (3) cột `dk_submission` (và `dk_submission_org` khi bảng có — Task 5) trừ `COT_HE_THONG` = tập cột tệp ánh xạ trỏ tới; (4) cột người dùng khai của `pty_person`, `pty_organization`, `pty_person_document`, `pty_organization_document` (trừ danh sách có tên) đều có trường trỏ tới; mục `CHO_O` quá `hetHan` ⇒ đỏ. Hôm nay chiều (1) đỏ vì thiếu ô Giới tính.
- [ ] **Step 2:** FAIL. **Step 3:** Viết tệp ánh xạ, đổi hai nơi dùng; thêm ô Giới tính. **Step 4:** PASS + `phieu-route.test.ts`.
- [ ] **Step 5:** Quan sát chặn thật: thêm tạm cột `ghi_chu_thu TEXT` vào bảng trong bài (bản sao CSDL) ⇒ đỏ chiều 3 → hoàn nguyên; bỏ tạm khoá `gioiTinh` khỏi máy chủ ⇒ đỏ chiều 2 → hoàn nguyên. Dòng `docs/SO-HANG-RAO.md`.
- [ ] **Step 6:** Commit «Tệp ánh xạ trường đăng ký và bài khớp cột; thêm ô Giới tính (ADR-0212 Đ8, Đ9)».

### Task 4 (A): Dấu «Thu thông tin tổ chức» của chính sách riêng tư, phần thêm cho bản nháp

**Files:**
- Create: migration `<số A>_dang_ky_to_chuc.sql` (phần `parties`: `ALTER TABLE pty_privacy_policy ADD COLUMN covers_org_data INTEGER NOT NULL DEFAULT 0 CHECK (covers_org_data IN (0, 1))`; DROP + CREATE `v_pty_privacy_current`, `v_pty_privacy_effective` thêm cột); `docs/superpowers/specs/2026-11-16-chinh-sach-rieng-tu-ban-nhap/PHAN-THEM-TO-CHUC.md`
- Modify: `src/modules/parties/tu-khai.ts` (`kiemChinhSach` nhận `coPhanToChuc: boolean`, mặc định false), route đăng chính sách và repository của nó, `web/` form «Đăng chính sách riêng tư mới» (ô tích «Bản này có phần thu thông tin tổ chức»), `src/modules/dang-ky/repository.ts` (`chinhSachRiengTuHienHanh` trả thêm `coToChuc`), `src/modules/dang-ky/xin-ma-route.ts` (`cauHinhDangKy` trả `phanToChucMo: boolean`), `docs/data-dictionary.json` + `npm run dict`

**Interfaces:**
- Produces: `phanToChucMo(db, at): Promise<boolean>` trong `dang-ky/repository.ts` = phiên bản chính sách riêng tư đang hiệu lực có `covers_org_data = 1`. Task 1 `lyDoChuaMoDuoc` nhận `chinhSachCoToChuc` từ đây; Task 5 dùng ở lệnh gửi.

- [ ] **Step 1: Bài đỏ:** đăng chính sách không tích ⇒ `covers_org_data = 0`; có tích ⇒ 1; bảng vẫn không sửa được (trigger cũ); `GET /api/dang-ky/cau-hinh` trả `phanToChucMo` đúng theo bản đang hiệu lực (bản mới hẹn giờ tương lai chưa tính); `GET /api/chinh-sach-rieng-tu` công khai **không** lộ cờ (chỉ phiên bản, ngày, toàn văn).
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS (+ bài sẵn có của chính sách riêng tư, `tep-cho.test.ts` cho view).
- [ ] **Step 5:** Soạn `PHAN-THEM-TO-CHUC.md` (hồ sơ có ngày, trỏ về `BAN-NHAP.md`, không sửa bản cũ): một ô chữ thêm vào «Mục đích thu thập» và các đoạn thêm vào toàn văn — (a) thu tên tổ chức, tên pháp lý, mã số thuế, địa chỉ, email nhận hoá đơn, số điện thoại tổ chức, số và ảnh GPKD, giấy phép thêm; mục đích: xác minh tổ chức, lập hoá đơn về sau; (b) người đăng ký khai thay tổ chức và tự xác nhận được phép; (c) giữ: phiếu không duyệt ẩn danh cùng hạn phần cá nhân, ảnh xoá ngay; duyệt rồi thành hồ sơ tổ chức; (d) lượt B2: số điện thoại người được mời vào tổ chức lưu khi người đó **chưa** đồng ý gì, mục đích duy nhất là so khớp lúc nhận mã, xoá 30 ngày sau khi lời mời kết thúc (Ruling R6); (e) chỗ `[ĐIỀN: …]` cho luật sư. Kèm hướng dẫn: khi đăng, tích ô «Bản này có phần thu thông tin tổ chức». Kiểm độ dài: mục đích ≤ 2.000, toàn văn ≤ 20.000 ký tự sau khi ghép.
- [ ] **Step 6:** Commit «Chính sách riêng tư có dấu thu thông tin tổ chức; phần thêm cho bản nháp (ADR-0212 Đ7)». **Người kiểm độc lập** đọc Task 4.

### Task 5 (A): Phần tổ chức của phiếu — bảng, trigger, lệnh gửi

**Files:**
- Modify: migration `<số A>_dang_ky_to_chuc.sql` (phần `dang-ky`), `src/modules/dang-ky/{phieu-route,repository,rules}.ts`, `src/shared/dang-ky-truong.ts` (trường tổ chức), `src/shared/dang-ky-hien-thi.ts` (câu báo mới), `src/shared/contracts.ts` (`PhieuDangKyDto.toChuc`, không số đủ), `src/modules/dang-ky/tep-route.ts` (+ ô `GPKD`, `GIAY_PHEP_THEM`), `src/hang-du-lieu.test.ts` (cột mới vào tập ghim N3/N2), `src/giay-to-khong-lo-so.test.ts` (+ mã số thuế, số GPKD), `docs/data-dictionary.json` + `npm run dict`
- Create: `src/shared/to-chuc.ts`, `src/shared/to-chuc.test.ts`
- Test: `src/modules/dang-ky/phieu-route.test.ts`, `src/migrations-dang-ky.test.ts`

**Interfaces:**
- Migration (dang-ky): bảng `dk_submission_org` (cột ở bảng tên thật; `UNIQUE(registration_id, version)`; `CHECK` hình thức như `dk_submission`); trigger `dk_submission_org_version` (chỉ chèn đúng `current_version` mới của lần gửi — cùng khuôn `dk_submission_version`), `dk_submission_org_content` (không sửa), `dk_submission_org_erase_shape` (ẩn danh một lần, khuôn `dk_submission_erase_shape`), `dk_submission_org_no_delete`. `ALTER TABLE dk_registration ADD COLUMN org_role_code TEXT`, `org_match_kind TEXT CHECK (… IN ('NEW','EXISTING'))`, `org_match_party_id TEXT` và trigger `dk_registration_org_match_shape` thay `CHECK` (không thêm được `CHECK` nhiều cột bằng `ALTER`): `(org_match_kind = 'EXISTING') = (org_match_party_id IS NOT NULL)`. DROP + CREATE `dk_registration_immutable` (thêm `org_role_code` khoá sau lần gửi đầu), `dk_registration_return_clear` (xoá cả `org_match_*`), `dk_decision_guard` (đòi `org_match_kind` khi bản khai đang duyệt có dòng `dk_submission_org`). Thêm cột `dk_policy`: không.
- Produces (`src/shared/to-chuc.ts`): `chuanHoaMaSoThue(raw: string): { hien: string; khoa: string } | null` (10 số, hoặc 10 số + `-` + 3 số; bỏ khoảng trắng; khoá = chữ số và hậu tố); `chuanHoaSoGpkd(raw): { hien; khoa } | null` (dùng lại luật `number_key` của giấy tờ cá nhân); `kiemPhanToChuc(raw: Record<string, unknown>, dm: DanhMucGiayToToChuc, homNay: string): Result<PhanToChucMoi>`.
- Lệnh gửi: thân thêm khoá `toChuc` (vắng/null = không có phần tổ chức) và `loaiToChuc` đi qua `PUT` nháp. Kiểm theo thứ tự: phần tổ chức có mà `phanToChucMo` sai ⇒ 409 `org_section_closed`; vai «chỉ tổ chức» mà không có phần tổ chức ⇒ 400; phần tổ chức có mà vai cá nhân là `DRIVER_EXTERNAL` ⇒ 400; vai cá nhân rỗng và `!DA_CO_THAY_MAT_TO_CHUC` ⇒ 400 «Hãy chọn một vai cá nhân»; gửi lại bỏ phần tổ chức khi `org_role_code` đã khoá ⇒ 400; thiếu ảnh GPKD khi có phần tổ chức ⇒ 400. Mục bắt buộc `ROLE` đổi nghĩa (Đ4): đạt khi có vai cá nhân **hoặc** vai của tổ chức — sửa `mucChuaDapUng` và nhãn `NHAN_MUC_CHO_NGUOI_DANG_KY.ROLE` thành chữ chờ chọn «Vai người dùng xin đăng ký (của bạn hoặc của tổ chức)».
- Lô gửi: `guiChenStatement` → **`guiChenToChucStatement`** (cùng phiên bản) → `guiTienStatement` → lịch sử. Không dòng `pty_*`, `staff` nào.

- [ ] **Step 1: Bài đỏ** `to-chuc.test.ts`: `0123456789-001`, ` 0123 456 789 ` ⇒ cùng khoá theo luật trên (Review Focus 1); mã 9 số, có chữ ⇒ null; GPKD `41A8 001234` và `41a8-001234` ⇒ cùng khoá (Review Focus 2). `phieu-route.test.ts`: sáu nhánh 400/409 ở trên; gửi phiếu có phần tổ chức ⇒ đúng một dòng `dk_submission_org` cùng `version`, đếm trước/sau `pty_party`, `pty_organization`, `pty_organization_document`, `pty_attachment`, `staff` không đổi; bấm «Gửi» hai lần ⇒ một dòng mỗi bảng; `dk_event`, `audit_log`, phản hồi lỗi không chứa mã số thuế, số GPKD. `migrations-dang-ky.test.ts`: sửa dòng `dk_submission_org` ⇒ hỏng; chèn sai phiên bản ⇒ hỏng; đổi `org_role_code` sau gửi ⇒ hỏng; «trả về xác minh» xoá `org_match_*`; quyết định `DUYET` khi có phần tổ chức mà `org_match_kind` rỗng ⇒ hỏng.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + `src/dang-ky-truong-khop-cot.test.ts` (chiều 3 nay gồm `dk_submission_org`), `src/hang-du-lieu.test.ts`, `src/giay-to-khong-lo-so.test.ts`.
- [ ] **Step 5:** Hạng dữ liệu (Đ7): cột phiếu `tax_code`, `gpkd_number`, `extra_number` N3; tên pháp lý, địa chỉ, email hoá đơn, số điện thoại N2. Nâng `pty_organization.tax_code` N2 → N3 trong `docs/data-dictionary.json` **nếu** `src/hang-du-lieu.test.ts` và các bài DTO vẫn xanh với biên nhận đang in mã số thuế (`src/modules/receipt/rules.ts`, `src/shared/cong-ty-chu.ts`, `src/shared/order-confirmation.ts`); đỏ thì giữ N2, ghi nhật ký thi công và đưa vào câu hỏi cuối mốc (Ruling R8).
- [ ] **Step 6:** Commit «Phiếu đăng ký có phần tổ chức: bảng dk_submission_org, lệnh gửi (ADR-0212 Đ2, Đ4, Đ7)». **Người kiểm độc lập** đọc Task 5.

### Task 6 (A): Xác minh phần tổ chức và đối chiếu Danh bạ tổ chức

**Files:**
- Modify: migration `<số A>_dang_ky_to_chuc.sql` (phần `parties`: DROP + CREATE `pty_verification_requirement_item_closed` thêm `ATTRIBUTE` ∈ `TEN_PHAP_LY, MA_SO_THUE, DIA_CHI_TO_CHUC, EMAIL_HOA_DON` và `DOCUMENT` = `GPKD`; gieo `ORGANIZATION`: `ATTRIBUTE:TEN_PHAP_LY`, `ATTRIBUTE:MA_SO_THUE`, `DOCUMENT:GPKD`), `src/shared/dau-xac-minh.ts` (`MUC_XAC_MINH_MO` thêm đúng các mã trên; thêm `MUC_XAC_MINH_MO_TO_CHUC`), `src/modules/parties/index.ts` (+ `mucXacMinhBatBuocToChuc`, `hoSoToChucKhop`), `src/modules/dang-ky/{xac-minh-route,xac-minh,repository}.ts`, `src/shared/dang-ky-hien-thi.ts` (nhãn mục tổ chức)
- Test: `src/modules/parties/tep-cho.test.ts` (đối chiếu tập ↔ trigger), `src/modules/dang-ky/xac-minh-route.test.ts`, `src/dau-xac-minh.test.ts` hoặc bài dấu sẵn có

**Interfaces:**
- Produces: `hoSoToChucKhop(db, v: { taxKey: string | null; gpkdKey: string | null; ten: string | null }): Promise<{ id: string; displayName: string; lyDo: ("MST" | "GPKD" | "TEN")[] }[]>` — chỉ hồ sơ `ORGANIZATION` đang dùng, chưa gộp; thứ tự mã số thuế → GPKD → tên. `toChucDichHopLe(db, partyId): Promise<{ code; message } | null>`.
- Route: `POST /api/dang-ky/phieu/:id/dat` thân thêm `hoSoToChuc?: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId }` — bắt buộc khi bản khai có phần tổ chức; ghi `org_match_*` cùng câu với `match_*`. `GET /api/dang-ky/phieu/:id` trả hai nhóm mục và danh sách hồ sơ tổ chức có thể trùng. Hàng chờ duyệt (`xemDeDuyet`) thêm `ketLuanDanhBaToChuc` và dòng «văn phòng sẽ giao người quản lý» khi `CO_SAN`.
- Kiểm trước khi đặt «đạt»: GPKD (khoá) đã thuộc tổ chức khác ⇒ 409; mã số thuế trùng hồ sơ tổ chức khác chưa gộp (trừ hồ sơ được chọn để gắn) ⇒ 409; hồ sơ đích không phải tổ chức / ngưng / đã gộp ⇒ 409.

- [ ] **Step 1: Bài đỏ:** hai nhóm mục; «đạt» thiếu kết luận Danh bạ tổ chức khi có phần tổ chức ⇒ 409; thiếu mục tổ chức bắt buộc ⇒ 409; đối chiếu: hồ sơ có MST `0123456789` hiện ra với phiếu khai `0123 456 789` (Review Focus 1); hồ sơ cá nhân không bao giờ hiện trong danh sách tổ chức; ba ca 409 ở trên; tập `MUC_XAC_MINH_MO` khớp trigger (bài sẵn có); dấu xác minh của hồ sơ tổ chức đang có trên bản thật không đổi kiểu hiển thị khi chưa có mục bắt buộc (đối chiếu ca tổ chức của Task 10 đợt 1).
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + `grep -rn "pty_verification_requirement\|HO_TEN.*NGAY_SINH" tests/e2e` rồi chạy e2e có ghim danh sách (ghi tên vào nhật ký, chạy ở Task 18).
- [ ] **Step 5:** Commit «Xác minh và đối chiếu Danh bạ cho phần tổ chức (ADR-0212 Đ5)». **Người kiểm độc lập** đọc Task 6.

### Task 7 (A): Lô duyệt sinh hồ sơ tổ chức

**Files:**
- Modify: `src/modules/parties/index.ts` (+ `cauMoHoSoToChucDangKy`, `cauGhiGiaTriToChuc`, `cauXacMinhToChucTuPhieu`, `cauChuyenTepChoToChuc`, `cauLienKetNguoiToChuc`), `src/modules/parties/repository.ts`, `src/modules/pricing/index.ts` (gọi lại `cauCapMacDinhChoHoSo` với hồ sơ tổ chức, không đổi chữ ký), `src/shared/dang-ky-duyet.ts` (+ `toChuc?: LoDuyetToChucVao`), `src/index.ts` (`loDuyetDangKy`), `src/modules/dang-ky/{duyet-route,repository}.ts` (+ `cauAnDanhBanKhaiToChuc`), `src/shared/audit-actions.ts` không đổi
- Test: `src/modules/dang-ky/duyet-route.test.ts`, `src/giay-to-khong-lo-so.test.ts`

**Interfaces:**
- `LoDuyetToChucVao = { hoSo: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId: string }; roleCode: string | null; displayName; legalName; taxCode; address; invoiceEmail; phone: { value; valueNormalized } | null; gpkd: OrgDocValues; giayPhepThem: OrgDocValues | null; mucDat: readonly { loai: "ATTRIBUTE" | "DOCUMENT"; ma: string }[] }`.
- Thứ tự lô (chèn sau câu 2 của đợt 1, mỗi module câu của bảng mình): 2b hồ sơ tổ chức mới (`newOrganizationStatements` sẵn có) hoặc không gì, mở vai của tổ chức nếu có → 2c **liên kết người ↔ tổ chức** (đứng trước câu cấp quyền): khi `!DA_CO_THAY_MAT_TO_CHUC` một dòng `CONTACT_OF` (người → tổ chức); khi đã bật thì Task 13 quyết → 4b giá trị tổ chức (`pty_organization` cột pháp lý; số điện thoại tổ chức thành liên hệ «Số điện thoại» của tổ chức khi chưa có; dòng `pty_organization_document` GPKD, giấy phép thêm — dòng gia hạn nếu hồ sơ có sẵn đã có dòng hiện hành cùng loại) → 5b dòng `pty_verification` (`ATTRIBUTE` với `party_id` tổ chức, `ORG_DOCUMENT` với `target_id` dòng giấy tờ) người và giờ **xác minh** → 7b tệp chờ `GPKD`, `GIAY_PHEP_THEM` thành tệp của hồ sơ tổ chức (đọc trước `pty_attachment` có nối được dòng giấy tờ tổ chức không; không nối được thì nối hồ sơ, ghi nhật ký thi công) → 8b cấp mặc định cho hồ sơ tổ chức theo vai của tổ chức → 10b ẩn danh `dk_submission_org` cùng câu ẩn danh bản khai. Nhật ký `staff_created` thêm «kèm hồ sơ tổ chức mới» / «gắn tổ chức có sẵn» (không tên, không MST).
- Kiểm trước lô (câu rõ, không lỗi thô): GPKD thuộc tổ chức khác ⇒ 409 (trigger `pty_organization_document_gpkd_one_org_ins` là lưới cuối); MST trùng ⇒ 409; hồ sơ tổ chức đích hết hợp lệ ⇒ 409. Hồ sơ tổ chức **có sẵn** đã mang đúng vai của tổ chức ⇒ bỏ câu mở vai (chỉ mục vai đang mở là duy nhất), khuôn `kiemHoSoDich` của hồ sơ cá nhân.

- [ ] **Step 1: Bài đỏ:** duyệt phiếu có phần tổ chức `MOI` ⇒ đúng một hồ sơ tổ chức, vai của tổ chức, dòng GPKD, dòng xác minh tổ chức (người và giờ xác minh), cấp mặc định trên hồ sơ tổ chức, đúng một `CONTACT_OF`, không `MANAGER_OF`; `CO_SAN` ⇒ không hồ sơ tổ chức mới, có `CONTACT_OF`; giả lỗi một câu giữa lô ⇒ không còn dòng nào; GPKD của tổ chức khác ⇒ 409 trước lô; `dk_submission_org` sau duyệt đúng khuôn ẩn danh; ảnh tổ chức chuyển, phiếu không duyệt thì ảnh tổ chức nhận quyết gỡ (khuôn ADR-0208); nhật ký và lịch sử không chứa MST, số GPKD.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + `node --test src/so-vang*.test.ts` (cấp mặc định không đổi đáp án).
- [ ] **Step 5:** Commit «Lô duyệt sinh hồ sơ tổ chức, nối Người liên hệ của (ADR-0212 Đ6)». **Người kiểm độc lập** đọc Task 7.

### Task 8 (A): Giao diện lượt A

**Files:**
- Modify: `web/dang-ky.ts` (ô vai từ máy chủ; công tắc «Tôi đăng ký cho cả tổ chức» chỉ hiện khi `phanToChucMo`; phần tổ chức dựng từ `TRUONG_DANG_KY`; ô ảnh GPKD; ô tích «Tôi được tổ chức cho phép đăng ký thay»), `web/dang-ky-hang-cho.ts` (hai nhóm mục, đối chiếu tổ chức, kết luận tổ chức ở màn duyệt), khối «Nhận đăng ký mới» của Toàn quyền (vai chưa đủ điều kiện hiện mờ kèm lý do), form đăng chính sách (ô tích), `src/shared/bang-tham-chieu*.ts` + sinh lại `docs/BANG-THAM-CHIEU.md`
- Create: `docs/evidence/2026-11-16-dang-ky-to-chuc/kich-ban/dang-ky-to-chuc-smoke.mjs` (khuôn `dang-ky-smoke.mjs` đợt 1)

- [ ] **Step 1:** `src/bang-tham-chieu.test.ts`, `src/giao-dien-hoi-bang-quyen.test.ts` — FAIL cho chữ, nút chưa khai.
- [ ] **Step 2:** Dựng giao diện; `npm run build:web`; typecheck; `src/goi-trang-nhe.test.ts` xanh.
- [ ] **Step 3:** Kịch bản Chrome 390 và 1280: Toàn quyền mở loại `LD_…` → đăng ký có phần tổ chức → xác minh hai nhóm → duyệt → đặt PIN; chụp ảnh vào thư mục bằng chứng. Người điều phối thêm dòng kịch bản vào bảng cuối `web/CLAUDE.md` bằng công cụ sửa tệp.
- [ ] **Step 4:** Commit «Giao diện đăng ký đợt 2 lượt A».

**Mốc A:** chạy Task 18 cho mốc A trước khi sang Task 9.

### Task 9 (B1): Liên kết người ↔ tổ chức, LC-1c tạo lại, cột nhật ký

**Files:**
- Create: migration `<số B1>_to_chuc_nguoi_quan_ly.sql` — số kiểm lại như Task 0 Step 2 trước khi đặt
- Modify: `src/modules/parties/rules.ts` (`validateRelationship` từ chối `MANAGER_OF`, `MEMBER_OF`: 400 «Người quản lý và thành viên của tổ chức chỉ đổi ở màn tổ chức»), `scripts/audit-checks.mjs` (`R-LC-1c`, `R-DK-4` mở rộng; + `R-TC-1`…`R-TC-4`), `scripts/cau-doc-doi-tac-thieu-vai-tro.mjs`, `src/audit-invariants.test.ts`, `src/migrations-to-chuc.test.ts` (mới), `docs/data-dictionary.json` + `npm run dict`, `docs/SO-HANG-RAO.md`

**Interfaces (migration, theo phần module):**
- `parties`: gieo `pty_relationship_type` `('MANAGER_OF','Người quản lý của',4)`, `('MEMBER_OF','Thành viên của',5)`; `ALTER TABLE pty_party_relationship ADD COLUMN replaced_by_id TEXT` (không khoá ngoại), `ADD COLUMN notice_state TEXT CHECK (notice_state IS NULL OR notice_state IN ('CHO','DA_GUI','KHONG_EMAIL'))` (Ruling R5); `CREATE UNIQUE INDEX pty_relationship_one_manager_uq ON pty_party_relationship(to_party_id) WHERE relationship_type_code = 'MANAGER_OF' AND valid_to_date IS NULL`; trigger (mỗi trigger một `RAISE`): `pty_relationship_org_link_person` (đầu từ là `PERSON`), `pty_relationship_org_link_org` (đầu tới là `ORGANIZATION` đang mở vai nhóm bên ngoài hoặc loại đối tác — đọc `v_pty_open_role` nối `v_pty_role_type`, khuôn `bil_credit_limit_party_ok`), `pty_relationship_org_link_not_both` (không vừa quản lý vừa thành viên cùng tổ chức), `pty_relationship_manager_close_needs_replacement` (`BEFORE UPDATE`: đóng `MANAGER_OF` khi tổ chức còn `MEMBER_OF` đang mở thì `replaced_by_id` bắt buộc); view `v_pty_org_link`; bảng `pty_org_transfer_request (id, org_party_id, requested_by_staff_id, proposed_person_party_id, status, created_at, closed_at, closed_by)` chỉ thêm, trigger trạng thái một chiều; bảng `pty_org_invite` để B2 (không tạo ở đây).
- `staff`: DROP + CREATE `lc1c_stf_permission_partner_needs_role` (giữ tên) thêm vế `OR EXISTS (SELECT 1 FROM staff s JOIN v_pty_org_link l ON l.person_party_id = s.party_id JOIN …tổ chức mang vai nhóm bên ngoài hoặc loại đối tác… WHERE s.id = NEW.staff_id)`; trigger anh em mới `lc1d_stf_permission_link_only_partner` — chèn quyền khác `PARTNER` cho tài khoản mà hồ sơ không có vai nhóm bên ngoài, không loại đối tác nhưng có liên kết ⇒ `RAISE`.
- `audit`: `ALTER TABLE audit_log ADD COLUMN acting_party_id TEXT`.
- `orders`: `ALTER TABLE orders ADD COLUMN acting_party_id TEXT`, `ADD COLUMN acting_link_kind TEXT CHECK (…)` (bảng tên thật); trigger `orders_acting_immutable` (`BEFORE UPDATE`: hai cột không đổi sau khi chèn). Trước khi viết: `git grep -n "INSERT INTO orders"` xác nhận mọi câu chèn ghi tên cột (để mã cũ lùi được an toàn, như HANDOFF kiểm 7/11); ghi kết quả vào nhật ký thi công.
- Bất biến: `R-LC-1c`, câu đọc của chủ và trigger cùng thêm vế liên kết (bài đối chiếu ba nơi ở `src/audit-invariants.test.ts`); `R-DK-4` thêm cùng vế; `R-TC-1` tổ chức có thành viên đang mở có đúng một người quản lý; `R-TC-2` mọi `replaced_by_id` trỏ dòng `MANAGER_OF` có thật, cùng tổ chức, mở cùng ngày; `R-TC-3` liên kết đang mở trỏ tới tài khoản giữ quyền nội bộ hoặc `DRIVER_PARTNER` (Đ2.6, `fail`); `R-TC-4` tổ chức có liên kết mà không có người quản lý có hiệu lực (Đ2.8, `warn`, liệt kê cho văn phòng).

- [ ] **Step 1: Bài đỏ** `migrations-to-chuc.test.ts` (ca ADR-0213 «Bài kiểm» dòng CSDL): `MANAGER_OF` thứ hai ⇒ hỏng; đóng người quản lý còn thành viên, thiếu `replaced_by_id` ⇒ hỏng; lô chuyển đúng thứ tự Đ2.4 (người mới đang là thành viên) ⇒ một người quản lý mới, người cũ thành thành viên; giả lỗi câu chèn ⇒ không gì đổi; đầu từ là tổ chức, đầu tới không mang vai được hưởng ⇒ hỏng; vừa quản lý vừa thành viên ⇒ hỏng. LC-1c: cấp `PARTNER` cho hồ sơ chỉ có liên kết ⇒ được; liên kết tới tổ chức không vai ⇒ không mở được liên kết (trigger hai đầu); cấp `SALES` cho tài khoản chỉ có liên kết ⇒ hỏng. Route Danh bạ chung với hai mã ⇒ 400.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + `src/audit-invariants.test.ts`, `src/roles-schema.test.ts`, các bài quan hệ của `parties`; `grep -rln "REFERRED_BY\|DRIVES_FOR\|CONTACT_OF" tests/e2e` ghi tên bài cho Task 18.
- [ ] **Step 5:** Quan sát chặn thật: bỏ tạm vế liên kết khỏi `R-LC-1c` ⇒ bài đối chiếu ba nơi đỏ → hoàn nguyên; chép tạm migration bỏ trigger `…_needs_replacement` ⇒ bài CSDL đỏ → hoàn nguyên. Dòng `docs/SO-HANG-RAO.md` cho chỉ mục duy nhất, bốn trigger, LC-1c mới, `lc1d`, `R-TC-*`.
- [ ] **Step 6:** Commit «Liên kết người quản lý, thành viên; LC-1c nhận liên kết (ADR-0213 Đ2, Đ9)». **Người kiểm độc lập** đọc Task 9.

### Task 10 (B1): Người quản lý có hiệu lực, lệnh văn phòng giao và chuyển quyền quản lý

**Files:**
- Modify: `src/shared/permissions.ts` (+ `"partner.org.manager.write": quanLyBanHang()`), `src/shared/permissions.test.ts`, `src/shared/audit-actions.ts` (hành động mới, nhãn tiếng Việt, nhóm `party`), `src/modules/audit/cham-tai-khoan.ts` + test (lý do có tên cho hành động chạm tài khoản), `src/index.ts` (+ `nguoiQuanLyCoHieuLuc`, tiêm `ctx.nguoiQuanLyCoHieuLuc`), `src/modules/parties/index.ts` (route mới qua `to-chuc-route.ts`)
- Create: `src/modules/parties/to-chuc-route.ts`, `src/modules/parties/to-chuc-route.test.ts`

**Interfaces:**
- `nguoiQuanLyCoHieuLuc(db, orgPartyId)` = liên kết `MANAGER_OF` đang mở **và** tài khoản của người đó `active = 1`, còn `PARTNER`, hồ sơ chưa gộp **và** tổ chức còn vai nhóm bên ngoài hoặc loại đối tác.
- Route cổng `office` (ba vai văn phòng qua được), ô `partner.org.manager.write`: `POST /api/parties/:id/to-chuc/nguoi-quan-ly` thân `{ personPartyId: string; nguoiCuThanhThanhVien: boolean; lyDo: MaLyDoToChuc }` (giao khi chưa có; chuyển khi đã có — lô đúng thứ tự Đ2.4, mã dòng mới sinh sẵn; thân mặc định `nguoiCuThanhThanhVien = true`); `POST /api/parties/:id/to-chuc/go-nguoi-quan-ly` thân `{ lyDo }` (chỉ khi không còn thành viên); `POST /api/parties/:id/to-chuc/go-thanh-vien` thân `{ personPartyId, lyDo }`; `GET /api/parties/:id/to-chuc` (người quản lý, thành viên, yêu cầu chuyển đang mở, trạng thái thư).
- Route cổng `staff` cho người quản lý có hiệu lực (vai trên đối tượng, không qua hàng quyền): `POST /api/to-chuc/:id/yeu-cau-chuyen` thân `{ personPartyId }` ⇒ một dòng `pty_org_transfer_request` + nhật ký; `POST /api/to-chuc/:id/go-thanh-vien`. Người quản lý gọi route `office` chuyển quyền ⇒ 403 (không qua cổng).
- `MaLyDoToChuc` (tập đóng, `src/shared/to-chuc.ts`): `THEO_YEU_CAU_TO_CHUC`, `NGUOI_QUAN_LY_NGHI_VIEC`, `GIAO_LAN_DAU`, `SAI_NGUOI`, `KHAC_DA_GOI_XAC_NHAN`; nhãn chờ chọn.
- Kiểm trước lô (Đ2.6, máy chủ): người được giao có tài khoản giữ `PARTNER`, đã được duyệt (kể cả chưa kích hoạt), không ngưng hẳn, không giữ quyền nội bộ, không `DRIVER_PARTNER` ⇒ còn lại 409. Chuyển qua lại trong ngày ⇒ 409 «Không chuyển lại cho người vừa thôi quản lý trong cùng ngày» (dịch lỗi trigger chống chồng lấn).
- Thư báo người quản lý cũ (Đ6): dòng `MANAGER_OF` vừa đóng nhận `notice_state = 'CHO'` (hoặc `KHONG_EMAIL` khi hồ sơ không có liên hệ «Email») trong lô; gửi trong `exec.waitUntil` sau lô bằng `guiThu` (khuôn `cauHinhThu`), xong thì một câu đặt `DA_GUI`; route `POST /api/parties/:id/to-chuc/gui-lai-thu` (ô `partner.org.manager.write`) gửi lại khi còn `CHO`. Thân thư: tên tổ chức và câu «bạn không còn là người quản lý tổ chức này, liên hệ Tour Đảo nếu không phải bạn yêu cầu»; không tên người mới, không số điện thoại.
- Nhật ký (hành động mới): `org_manager_assigned`, `org_manager_transferred`, `org_manager_removed`, `org_transfer_requested`, `org_member_removed`, `org_member_left`; `target_type = 'party'`, `target_id` = tổ chức; không số điện thoại.

- [ ] **Step 1: Bài đỏ** (ca ADR-0213 «Quyền»): người quản lý gọi chuyển ⇒ 403, gửi yêu cầu ⇒ 201; Bán hàng, Kế toán, Nhân sự gọi đổi người quản lý ⇒ 403; Quản lý bán hàng, Quản trị, Toàn quyền ⇒ được; gắn tài khoản nội bộ hay Tài xế đối tác ⇒ 409; người quản lý không có hiệu lực (tài khoản ngưng, mất `PARTNER`, hồ sơ gộp, tổ chức mất vai) ⇒ yêu cầu chuyển và gỡ thành viên 403, `R-TC-4` liệt kê tổ chức đó; **hai lệnh chuyển cùng lúc** ⇒ đúng một thắng, người thua 409, `R-TC-1` sạch (Review Focus 4); gỡ người quản lý khi còn thành viên ⇒ 409; thư: lô xong có `notice_state = 'CHO'`, thư giả lỗi ⇒ vẫn `CHO`, gửi lại ⇒ `DA_GUI`; nhật ký không có số điện thoại.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + `src/shared/permissions.test.ts`, `src/route-access.test.ts` (SNAPSHOT), `src/shared/cong-quyen.test.ts`, `src/modules/audit/cham-tai-khoan.test.ts`.
- [ ] **Step 5:** Commit «Người quản lý có hiệu lực; văn phòng giao, chuyển quyền quản lý (ADR-0213 Đ2.8, Đ6)». **Người kiểm độc lập** đọc Task 10.

### Task 11 (B1): Tư cách theo từng đơn, bên đặt chốt lúc lập, nhật ký thay mặt

**Files:**
- Modify: `src/index.ts` (tiêm `benDangThayMat`), `src/shared/router.ts` (kiểu `Ctx` thêm hàm tiêm — bắt buộc như `mocToiThieu`), `src/shared/booker.ts` (`benDatChoTaiKhoan`, `benDatDoiTacBiCam` nhận `benThayMat` thay `partyId`; + `tuCachCuaDon`), `src/modules/orders/index.ts` (`POST /api/orders`, `PUT /api/orders/:id`, `PUT /api/orders/:id/booker`, `benDatCuaTaiKhoan`), `src/modules/audit/repository.ts` (câu chèn điền `acting_party_id`), `src/modules/billing/index.ts` (`TU_DAT_TRA_SAU` thêm vế tổ chức đang gắn), các chỗ đọc `staff.partyId`/`actor.partyId` (xếp nhóm), `src/modules/parties/index.ts` (+ `GET /api/to-chuc/cua-toi`)
- Create: `src/ben-thay-mat-xep-nhom.test.ts`, `src/so-vang-thay-mat-to-chuc.test.ts`

**Interfaces:**
- `GET /api/to-chuc/cua-toi` (cổng `staff`): `{ tuCach: { partyId: string; ten: string; laToChuc: boolean }[] }` — tư cách cá nhân chỉ khi hồ sơ của mình mang vai đối tác riêng (Đ3.3); tổ chức: ở B1 chỉ nơi mình là người quản lý **có hiệu lực**, ở B2 thêm nơi mình là thành viên (Ruling R4).
- `benDangThayMat(tuCach)`: người không giữ `PARTNER`, hoặc giữ `PARTNER` mà **không có tư cách nào** (tài khoản Đối tác chưa có vai trò — ADR-0185, bản 2.79) ⇒ `{ ok: true, benDat: <đường `benDatCuaTaiKhoan` hôm nay> }`, không đổi hành vi. Có tư cách: `tuCach` vắng ⇒ tư cách cá nhân nếu có; chỉ có tư cách tổ chức mà vắng ⇒ 400 «Hãy chọn tư cách»; `tuCach` ngoài danh sách ⇒ 403 `not_acting_for_org` «Bạn không còn thay mặt tổ chức này».
- Lập đơn ghi `orders.acting_party_id` = hồ sơ của tư cách đã chọn và `acting_link_kind` = `CA_NHAN` | `MANAGER` | `MEMBER` (loại liên kết **lúc lập**) trong chính câu chèn đơn; đơn văn phòng và đường «không tư cách» ghi NULL. `tuCachCuaDon(acting_link_kind): "CA_NHAN" | "TO_CHUC" | null` (thuần, `src/shared/booker.ts`).
- Lưu nháp (`PUT /api/orders/:id`) khi đơn có `acting_party_id`: thân thiếu khoá bên đặt hoặc gửi **trùng** ⇒ giữ; gửi **khác** ⇒ 409 `booker_locked` «Đơn đã lập theo một tư cách nên không đổi bên đặt được. Hãy lập đơn mới.»; tư cách tổ chức mà người lưu không còn liên kết ⇒ 403 như trên. Đơn `acting_party_id` NULL (văn phòng, nháp lập trước B1): hành vi hôm nay.
- Ruling R3 — `audit_log.acting_party_id`: câu chèn duy nhất của `audit` thêm biểu thức con `(SELECT o.acting_party_id FROM orders o WHERE o.id = ?order_id AND o.acting_link_kind IN ('MANAGER','MEMBER'))` — chỉ khi thay mặt tổ chức. Không tham số mới ở `auditStatement`; bài quét: không tệp nào ngoài `src/modules/audit/` và câu chèn đơn chứa `acting_party_id`/`actingPartyId`. Câu nhật ký phải đứng **sau** câu chèn đơn trong lô (đọc lại thứ tự ở lập đơn). Khi người quản lý gửi nháp của thành viên, dòng nhật ký vẫn mang tổ chức (thuộc tính của đơn).
- Bài quét Đ4.4: `src/ben-thay-mat-xep-nhom.test.ts` liệt kê mọi chỗ `staff.partyId` / `actor.partyId` trong `src/` (trừ test) kèm nhóm `THAY_MAT` hoặc `CHINH_NGUOI`; chỗ mới chưa xếp ⇒ đỏ. Nhóm `THAY_MAT`: bên đặt khi lập, «Bên đặt của tôi» ở `/api/auth/me`, lọc danh mục theo luật bán, dịch vụ bị chặn bán, phiếu nộp tiền; còn lại `CHINH_NGUOI`. Chỗ `THAY_MAT` đọc qua `benDangThayMat` hoặc bên đặt đã chốt của đơn.

- [ ] **Step 1: Bài đỏ:** lập đơn với tư cách tổ chức không gắn ⇒ 403; liên kết đóng rồi lưu nháp cũ ⇒ 403; bộ quyền giống hệt ở hai tư cách (so `staff.permissions` và `can` của mọi ô); ví dụ của chủ — anh Nam lập hai đơn «Lễ tân» và «Khách sạn Sunrise» ⇒ bên đặt và cấp đúng từng đơn; lưu nháp gửi bên đặt khác ⇒ 409, bên đặt không đổi; thân form cũ không khoá bên đặt ⇒ giữ; `audit_log.acting_party_id` = Sunrise ở đơn Sunrise, NULL ở đơn cá nhân và đơn văn phòng; ba đường cùng một đơn (văn phòng lập cho Sunrise; người quản lý thay mặt; ở B2 thêm thành viên) ⇒ **cùng dòng tiền tới từng đồng** (so dòng tiền, không so bản chụp); `TU_DAT_TRA_SAU` khi đích là tổ chức đang gắn ⇒ 403; bài quét xếp nhóm đỏ với một chỗ đọc mới.
  Thêm: tài khoản Đối tác chưa có vai trò (không tư cách nào) vẫn lập và lưu nháp như 2.79.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + `src/modules/orders/doi-tac-chua-co-vai-tro.test.ts` + mười bảy tệp ADR-0213 Đ4.3 (`node --test src/so-vang*.test.ts src/cong-no-dai-ly.test.ts src/kiem-dinh-ky-so-dai-ly.test.ts src/tra-sau-*.test.ts src/da-giao-khe-hoa-hong.test.ts src/phi-don-cap-khop-hoa-hong.test.ts src/hoa-hong-mot-nguon.test.ts`) xanh không sửa đáp án; `src/architecture.test.ts`.
- [ ] **Step 5:** Quan sát chặn thật: thêm tạm một dòng đọc `staff.partyId` ⇒ bài xếp nhóm đỏ → hoàn nguyên; dòng `docs/SO-HANG-RAO.md`.
- [ ] **Step 6:** Commit «Tư cách theo từng đơn, bên đặt chốt lúc lập, nhật ký thay mặt (ADR-0213 Đ3, Đ4)». **Người kiểm độc lập** đọc Task 11.

### Task 12 (B1): Người quản lý xem và gửi đơn của tổ chức, thấy công nợ

**Files:**
- Modify: `src/shared/permissions.ts` (`OperationContext.quanLyBenDat`; `allows` nhận mã quyền), `src/shared/permissions.test.ts`, `src/index.ts` (tiêm `laQuanLyCuaBen`), các route đơn xét bảy ô trong danh sách cho phép (dưới) và các câu danh sách / đếm của «Đơn của tôi»; `src/modules/orders/xac-nhan-route.ts` (`gui-don`), `src/modules/orders/xac-nhan-chung.ts` (`nguoiLapLaNguoiBam`, `canChotGioCuaNguoiLap` nhận người bấm là người lập **hoặc** người quản lý có hiệu lực của bên đặt), `src/modules/billing/index.ts` (sổ của tôi: người quản lý thêm sổ của tổ chức)
- Create: `src/quan-ly-ben-dat-truyen-co.test.ts` (bài quét như bài `assigned`), `src/shared/to-chuc.test.ts` thêm ca `duocGuiLenTourDao`

**Interfaces:**
- `can()`: với ô `own`/`ownOrAssigned`, vế «của mình» = `ownerId === who.id` **hoặc** (`quanLyBenDat === true` **và** mã quyền đang xét là `PARTNER`). Không mã quyền nào khác rộng ra. Định nghĩa viết một lần trong `permissions.ts`.
- Cờ chỉ mở đơn **đã gửi lên Tour Đảo** (đã xác nhận, đã huỷ, hoặc nháp đang có yêu cầu xác nhận mở — «đang chờ văn phòng»): route đọc đơn tính `quanLyBenDat = (status !== "draft" || coYeuCauMo) && await laQuanLyCuaBen(meta.bookerPartyId)`. Nháp khác vẫn theo `xem-don-nhap.ts` (B2 thêm ngoại lệ).
- **Danh sách cho phép các ô nhận cờ** (ghim trong bài quét, đỏ cả khi thiếu lẫn khi thừa): `order.view`, `money.view`, `order.history.view`, `contact.view`, `order.submit`, `dai-ly.nop.xem`, `payment.proof.view`. `order.modify`, `order.passenger.write`, `dai-ly.nop.ghi`, `ve.cap.send` **không** nhận cờ (người quản lý không sửa, không huỷ đơn đã gửi; ADR-0170 Đ1 giữ vé cho người lập). Ruling R13.
- **Danh sách và đếm lọc bằng SQL** («Đơn của tôi», số đếm, thẻ Trang chủ của Đối tác — đang lọc `orders.staff_id`): thêm vế «hoặc bên đặt thuộc tập tổ chức người gọi là người quản lý có hiệu lực, đơn đã gửi lên» — tập do gốc lắp ráp tiêm (`ctx.toChucToiQuanLy(): Promise<string[]>`), `orders` không đọc bảng `parties`. Liệt kê từng câu danh sách sửa trong nhật ký thi công.
- `duocGuiLenTourDao(v: { tuCach: "CA_NHAN" | "TO_CHUC" | null /* tuCachCuaDon(acting_link_kind) */; laNguoiLap: boolean; laQuanLyCoHieuLuc: boolean }): boolean` — `TO_CHUC` ⇒ chỉ khi `laQuanLyCoHieuLuc`; còn lại như hôm nay (người lập). `gui-don`: thay câu 409 `order_not_draft` «Chỉ gửi được đơn nháp của chính bạn» bằng `duocGuiLenTourDao`; sai ⇒ 403 `org_manager_required` «Chỉ người quản lý tổ chức gửi được đơn này lên Tour Đảo.». Mốc giờ, luật bán, kiểm vé, Trả sau xét lúc người bấm; nhật ký và yêu cầu xác nhận mở với **người gửi**; `orders.staff_id` giữ người lập.

- [ ] **Step 1: Bài đỏ:** người quản lý thấy đơn đã gửi của tổ chức (cả đơn đang chờ văn phòng) ở chi tiết **và** ở «Đơn của tôi», số đếm; thấy sổ công nợ, hạn mức, cấp của tổ chức; sửa / huỷ đơn tổ chức do người khác lập ⇒ 403; gửi vé (`ve.cap.send`) ⇒ 403; không thấy nháp của người khác (B1); tài khoản Bán hàng, Thực tập với cờ đúng ⇒ không rộng thêm; thành viên (dòng `MEMBER_OF` sinh từ chuyển quyền) không thấy đơn người khác (404) và sổ tổ chức; Toàn quyền, văn phòng giữ nguyên; `gui-don` đơn tư cách tổ chức do người quản lý lập ⇒ được; người quản lý mất hiệu lực ⇒ 403; bài quét: route xét các ô trên mà không truyền `quanLyBenDat` ⇒ đỏ; bài nháp riêng tư của ADR-0135 giữ xanh.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + bài `gui-don*` sẵn có (`gui-don-chot-gio`, `cong-tac-gio-don`, `doi-tac-chua-co-vai-tro`, `con-ve-chot-gio`, `dat-gap`), `src/shared/permissions.test.ts`.
- [ ] **Step 5:** Quan sát chặn thật: bỏ tạm cờ ở một route ⇒ bài quét đỏ → hoàn nguyên; dòng `docs/SO-HANG-RAO.md`.
- [ ] **Step 6:** Commit «Người quản lý thấy và gửi đơn của tổ chức (ADR-0213 Đ5, Đ8.1)». **Người kiểm độc lập** đọc Task 12.

### Task 13 (B1): Lô duyệt mở người quản lý cho tổ chức mới; bật thay mặt tổ chức

**Files:**
- Modify: `src/shared/dang-ky-vai.ts` (`DA_CO_THAY_MAT_TO_CHUC = true`), `src/index.ts` (`loDuyetDangKy` câu 2c), `src/modules/dang-ky/duyet-route.ts` (kiểm trước lô Đ7.7), `src/modules/staff/index.ts` (dùng `createPartnerAccountOnPartyStatements` cho vai cá nhân rỗng), `src/modules/dang-ky/phieu-route.ts`
- Test: `src/shared/dang-ky-vai.test.ts`, `src/modules/dang-ky/duyet-route.test.ts`, `src/modules/dang-ky/phieu-route.test.ts`

**Interfaces:**
- Từ B1, **phần tổ chức phải có vai của tổ chức** (vai nhóm bên ngoài hoặc loại đối tác — `phanCuaVai` ≠ `CA_NHAN`): lệnh gửi thiếu `loaiToChuc` ⇒ 400; lúc duyệt người duyệt chọn được vai khác cho tổ chức như với vai cá nhân. Thân lệnh duyệt đổi thành `{ roleCode: string | null; roleCodeToChuc: string | null; phienBan: number }` (`kiemDuyet`): `roleCode = null` chỉ khi phiếu có phần tổ chức và hằng bật; `roleCodeToChuc` bắt buộc khi có phần tổ chức. Phiếu mốc A đang chờ (có phần tổ chức, không vai tổ chức) duyệt sau B1 ⇒ người duyệt phải chọn vai tổ chức.
- Câu 2c khi hằng bật: hồ sơ tổ chức **mới** ⇒ một dòng `MANAGER_OF` (người → tổ chức), đứng **sau** câu mở vai của tổ chức (trigger hai đầu đòi vai được hưởng); tổ chức **có sẵn** ⇒ không dòng nào (B2 thêm `MEMBER_OF` khi có lời mời giữ chỗ). Không bao giờ `CONTACT_OF` mới; dòng `CONTACT_OF` từ mốc A giữ nguyên.
- Vai cá nhân rỗng ⇒ tài khoản qua `createPartnerAccountOnPartyStatements` (lý do «người làm cho tổ chức, đăng ký đợt 2»); câu liên kết đứng trước câu cấp quyền (LC-1c mới).
- Kiểm trước lô (Đ7.7): vai cá nhân rỗng + `org_match_kind = 'EXISTING'` + không lời mời giữ chỗ ⇒ 409 `org_member_needs_invite` «Người đăng ký chưa có vai riêng và chưa được tổ chức mời. Hãy trả phiếu về để họ chọn một vai cá nhân, hoặc chờ người quản lý tổ chức gửi mã vào tổ chức.» Không câu ghi nào chạy.

- [ ] **Step 1: Bài đỏ:** một bài đảo hằng (tham số hoá qua `MoiTruongMo` và đối số của lô) cho thấy ba hành vi đổi cùng lúc: `TRAVEL_AGENCY` mở được (khi chính sách có phần tổ chức), vai cá nhân rỗng gửi được, lô duyệt ghi `MANAGER_OF` thay `CONTACT_OF`. Duyệt tổ chức mới ⇒ đúng một `MANAGER_OF`, người đó là người quản lý có hiệu lực sau kích hoạt; tổ chức có sẵn chưa có người quản lý ⇒ sau duyệt không có `MANAGER_OF` nào; vai cá nhân rỗng + có sẵn ⇒ 409 trước lô, đếm dòng không đổi; tài khoản chỉ có liên kết có đúng `PARTNER` (dòng chỉnh tay), `R-DK-4`, `R-LC-1c` sạch.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + `node --test src/modules/dang-ky/*.test.ts`.
- [ ] **Step 5:** Commit «Lô duyệt mở người quản lý tổ chức mới; mở Công ty lữ hành và phiếu chỉ tổ chức (ADR-0212 Đ2, Đ4, Đ6; ADR-0213 Đ6, Đ7.7, Đ9)». **Người kiểm độc lập** đọc Task 13.

### Task 14 (B1): Giao diện lượt B1

**Files:** `web/order-form.ts` (ô «Tư cách» luôn hiện ở Tạo đơn, nhớ lựa chọn cuối trong `localStorage` bọc `try/catch`; người chỉ làm cho tổ chức chỉ thấy tên tổ chức), phiếu xác nhận và chi tiết đơn («Bên đặt: <tên tổ chức>»), `web/parties.ts` (chi tiết hồ sơ tổ chức: khối «Người quản lý tổ chức», nút «Chuyển quyền quản lý» chỉ hiện cho ba vai văn phòng, yêu cầu chuyển đang mở, trạng thái thư; ô chọn loại quan hệ không có hai loại mới), `web/to-chuc.ts` + trang mới khai `PAGES` (`src/shared/sw-policy.ts`) và `build:web` (màn của người quản lý: thành viên, gửi yêu cầu chuyển, gỡ thành viên, sổ công nợ tổ chức), Quản lý tài khoản (tài khoản chỉ có liên kết không còn «thiếu vai trò»), `src/shared/bang-tham-chieu*.ts`, kịch bản Chrome `docs/evidence/2026-11-16-dang-ky-to-chuc/kich-ban/to-chuc-b1-smoke.mjs`.

- [ ] **Step 1:** Bài bảng tham chiếu, `giao-dien-hoi-bang-quyen`, `sw-policy`, `goi-trang-nhe` — FAIL cho chữ và trang chưa khai.
- [ ] **Step 2:** Dựng; `npm run build:web`; typecheck; gói trang Đơn hàng vượt trần thì làm gọn trước, còn vượt thì ghi câu hỏi «Duyệt nới» cho cuối mốc.
- [ ] **Step 3:** Chrome 390 và 1280 (tài khoản mở sau cùng là người kiểm trên trang đó — kho cookie chung): Toàn quyền giao người quản lý → người quản lý chọn tư cách Sunrise, lập và gửi đơn → văn phòng xác nhận → người quản lý thấy sổ công nợ.
- [ ] **Step 4:** Commit «Giao diện tư cách và người quản lý tổ chức (lượt B1)».

**Mốc B1:** chạy Task 18 cho mốc B1.

### Task 15 (B2): Mã vào tổ chức

**Files:**
- Create: migration `<số B2>_to_chuc_thanh_vien.sql` (số kiểm lại như Task 0 Step 2), `src/modules/parties/loi-moi.ts`, `src/modules/parties/loi-moi.test.ts`
- Modify: `src/shared/to-chuc.ts` (`chuanHoaMaVao`, `sinhMaVao`), `src/modules/parties/index.ts` (route; câu chưa chạy cho lô duyệt và lô gửi phiếu), `src/modules/dang-ky/{phieu-route,duyet-route,don-phieu,repository}.ts`, `src/index.ts`, `src/shared/dang-ky-truong.ts` (trường `maVaoToChuc` — `noiLuu: "CHI_PHIEU"`, cột `invite_id`), `src/shared/ma-dinh-danh.ts` (tiền tố `MV`), `docs/data-dictionary.json` + `npm run dict`

**Interfaces:**
- Migration `parties`: `pty_org_invite (id, org_party_id, phone_key, code_hash, status, expires_at, held_registration_id, created_by, created_at, used_by_staff_id, used_at, cancelled_by, cancelled_at, erased_at)`; `status` ∈ `MO`, `GIU_CHO_PHIEU`, `DA_DUNG`, `DA_HUY`, `HET_HAN`; trigger chuyển một chiều, không xoá; `UNIQUE(code_hash)`; bảng `pty_org_invite_policy` (chỉ thêm, một dòng gieo: `per_org_per_day` 10, `open_per_org` 20, `per_phone_per_day` 3, `code_days` 7, `wrong_per_hour` 5). Migration `dang-ky`: `ALTER TABLE dk_registration ADD COLUMN invite_id TEXT`.
- Mã: 8 ký tự bảng chữ không nhầm lẫn (bỏ `0 O 1 I L`), hiện `XXXX-XXXX`; `chuanHoaMaVao(raw)` = chữ hoa, bỏ `-` và khoảng trắng, đúng 8 ký tự. Băm `HMAC-SHA256(khoá dẫn xuất hmacBytes(SESSION_SECRET, "td-ma-vao-to-chuc-v1"), mã chuẩn hoá)`.
- Route cổng `staff`, người quản lý có hiệu lực hoặc ô `partner.org.manager.write`: `POST /api/to-chuc/:id/loi-moi` thân `{ soDienThoai }` ⇒ **luôn cùng một câu và mã trạng thái** «Đã tạo lời mời. Mã: XXXX-XXXX, dùng được tới <ngày>. Hãy gửi mã này cho người được mời.» dù số có tài khoản hay chưa; vượt trần tổ chức (ngày / đang mở) ⇒ 409 câu nói thật; vượt trần theo số ⇒ 429 câu trung tính «Chưa tạo được lời mời cho số này lúc này, hãy thử lại sau», không mã. `POST /api/to-chuc/:id/loi-moi/:mid/huy`. Người được mời: `GET /api/to-chuc/loi-moi-cua-toi` (chỉ lời mời có `phone_key` trùng số đăng nhập), `POST /api/to-chuc/loi-moi/nhan` thân `{ ma }` hoặc `{ loiMoiId }` ⇒ kiểm số đăng nhập trùng, tài khoản hợp lệ (Đ2.6), còn hạn, **người mời vẫn còn quyền mời** ⇒ một lô: `DA_DUNG` → `MEMBER_OF` → nhật ký. Sai mã: `reserveAttempts` khoá `moi:staff:<id>` 5/giờ.
- Đường phiếu (Đ7.5): thân «gửi» có `maVaoToChuc` tuỳ chọn; máy chủ tra băm, phiếu chỉ lưu `invite_id`; đúng mã + còn hạn + số phiếu trùng ⇒ lời mời sang `GIU_CHO_PHIEU` cùng lô gửi; mã hợp lệ thay mục bắt buộc `ROLE`. Sai mã ⇒ 400 trung tính, đếm khoá `dk:moi:<identityId>`. Lô duyệt: so lại số của **bản khai đang duyệt** với `phone_key`; khác ⇒ bỏ giữ chỗ (`MO` nếu còn hạn, `HET_HAN` nếu quá) và không mở liên kết; khớp và người mời còn quyền ⇒ `MEMBER_OF` **trước** câu cấp quyền; người mời hết quyền ⇒ 409 trước lô. Phiếu kết thúc không duyệt ⇒ bỏ giữ chỗ trong lô kết thúc. Người mời huỷ lời mời đang giữ ⇒ được; người xác minh thấy dòng «lời mời đã bị huỷ».
- Dọn (Ruling R6): tác nhân `DON_PHIEU_DANG_KY` gọi thêm câu của `parties` — lời mời quá `expires_at` (trừ `GIU_CHO_PHIEU`) ⇒ `HET_HAN`; lời mời kết thúc quá 30 ngày ⇒ `phone_key` thay bằng dấu ẩn danh, `erased_at`. Không thêm mã tác nhân.

- [ ] **Step 1: Bài đỏ** (ca ADR-0213 «Lời mời»): số có và chưa có tài khoản ⇒ thân và mã trạng thái giống hệt; vượt trần theo số ⇒ câu trung tính, không mã; vượt trần tổ chức ⇒ câu nói thật; mã dùng lần hai, quá hạn, sai số ⇒ từ chối; `ab12cd34`, `AB12 CD34` nhận như `AB12-CD34`, gõ sai vẫn tính trần (Review Focus 3); phiếu không chứa mã (quét `dk_submission`, `dk_event`); lời mời giữ chỗ không hết hạn khi phiếu chờ; phiếu có mã hợp lệ gửi được dù vai cá nhân rỗng; bản khai gửi lại đổi số ⇒ duyệt không mở liên kết; lô duyệt mở liên kết trước câu cấp quyền; người mời mất quyền ⇒ 409 trước lô; nhật ký, lời mời, phản hồi không chứa số điện thoại; dọn ẩn danh đúng hạn.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + `src/modules/dang-ky/*.test.ts`, `src/tac-nhan-tu-dong.test.ts`.
- [ ] **Step 5:** Commit «Mã vào tổ chức theo số điện thoại (ADR-0213 Đ7)». **Người kiểm độc lập** đọc Task 15.

### Task 16 (B2): Chế độ thành viên, nháp chờ người quản lý, ngoại lệ có tên của ADR-0135, tin

**Files:**
- Modify: migration `<số B2>_to_chuc_thanh_vien.sql` (`pty_org_member_mode`; `ord_member_submit`; view `v_aud_order_notice_direct`), `src/shared/xem-don-nhap.ts`, `src/shared/xem-don-nhap.test.ts` (hoặc bài nháp riêng tư sẵn có), `src/shared/to-chuc.ts`, `src/modules/orders/chang-hanh-khach-repo.ts` (SQL `ord_member_submit`), `src/modules/orders/index.ts`, `src/modules/orders/xac-nhan-route.ts`, `src/index.ts` (tiêm `cheDoThanhVien`, cờ thành viên lúc lập), `src/modules/parties/to-chuc-route.ts` (đặt chế độ), `src/shared/thong-bao.ts` (`HANH_DONG_TIN_DON` hoặc tập tin đích danh), `src/modules/thongbao/` (câu `list_don` hợp thêm view mới), `src/shared/audit-actions.ts`, `src/architecture.test.ts` (khai `ord_member_submit` không thuộc `XOA_CUNG_NHAP`), `docs/data-dictionary.json` + `npm run dict`
- Create: `src/modules/orders/thanh-vien-route.ts`, `src/modules/orders/thanh-vien-route.test.ts`

**Interfaces:**
- `pty_org_member_mode (id, org_party_id, mode, valid_from_at, created_by, created_at)` chỉ thêm; hiện hành = dòng mới nhất `valid_from_at <= now`; không dòng ⇒ `SOAN_VA_GUI`. Route `PUT /api/to-chuc/:id/che-do` thân `{ cheDo }`: người quản lý có hiệu lực hoặc Toàn quyền (`admin.manage.superadmin`); Quản trị, Quản lý bán hàng, thành viên ⇒ 403; nhật ký `org_member_mode_set`.
- `ord_member_submit (id, order_id, member_staff_id, org_party_id, status, reason_code, opened_at, closed_at, closed_by)`; một dòng `MO` mỗi đơn (chỉ mục duy nhất có điều kiện); trigger trạng thái một chiều, không xoá; lưu nháp không xoá dòng này.
- `xem-don-nhap.ts` (một nơi): `xemDuocDon` và `chiNguoiLapGhiNhap` nhận thêm `ngoaiLeToChuc?: { laQuanLyCoHieuLuc: boolean; nguoiLapLaThanhVienLucLap: boolean; cheDo: "CHI_SOAN" | "SOAN_VA_GUI"; dangChoQuanLy: boolean }`. Người quản lý đọc / ghi nháp khi `laQuanLyCoHieuLuc && nguoiLapLaThanhVienLucLap && (cheDo === "CHI_SOAN" || dangChoQuanLy)`. Thành viên ghi nháp khi là người lập **và** không `dangChoQuanLy` **và** còn liên kết. Không ai khác thêm. «Thành viên lúc lập» = Ruling R10: `orders.acting_link_kind = 'MEMBER'` (ghi lúc lập ở Task 11, không đổi về sau — đứng vững cả khi chuyển quyền trong ngày).
- Route (cổng `orders`): `POST /api/orders/:id/gui-quan-ly` (thành viên, chế độ `SOAN_VA_GUI`) ⇒ dòng `MO` + nhật ký `order_member_submitted` (đích danh người quản lý); `POST /api/orders/:id/rut-gui-quan-ly` (thành viên) ⇒ `DA_RUT`; `POST /api/orders/:id/tra-lai` thân `{ lyDo: MaLyDoTraLai }` (người quản lý) ⇒ `TRA_LAI` + nhật ký `order_member_returned` (đích danh thành viên). `gui-don` của người quản lý trên nháp thành viên: đóng dòng `MO` thành `DA_GUI_LEN` trong cùng lô xác nhận / mở yêu cầu + nhật ký `order_member_forwarded` (đích danh thành viên). Thành viên gọi `gui-don` ⇒ 403 (Task 12). `MaLyDoTraLai` tập đóng: `SAI_DICH_VU`, `SAI_NGAY`, `SAI_SO_KHACH`, `KHONG_DAT_NUA`, `KHAC`.
- Tin (Ruling R11): ba hành động trên ghi `target_type = 'staff'`, `target_id` = người nhận; view mới `v_aud_order_notice_direct (id, order_id, staff_id, action, target_id, created_at)` của `audit`; `thongbao` hợp thêm view này vào hộp thông báo của người nhận. Không đổi `v_aud_order_event`. Tin bền vì đọc từ nhật ký (luôn còn để hiện lại); báo đẩy chạy sau lô, được phép thất lạc (5.16 «không quan trọng»). Lưu nháp vẫn không báo ai (ADR-0045).

- [ ] **Step 1: Bài đỏ** (ca ADR-0213 «Xem», «Đ8»): chế độ «Chỉ soạn» ⇒ người quản lý thấy mọi nháp thành viên; «Soạn và gửi» ⇒ chỉ nháp đã gửi tới; trả lại ⇒ thôi thấy; Toàn quyền và văn phòng không thấy nháp thành viên (404); thành viên A không thấy đơn thành viên B (404); trong lúc chờ thành viên sửa ⇒ 409, «Rút lại» được; người quản lý gửi lên ⇒ mốc giờ, luật bán xét lúc người quản lý bấm, `orders.staff_id` vẫn là thành viên; đổi chế độ không đổi nháp đang chờ; **thành viên bị gỡ khi nháp đang chờ** ⇒ người quản lý vẫn gửi lên / huỷ được, thành viên không lưu, không rút được, không dòng tiền mới (Review Focus 5); tin có mặt ở hộp thông báo đúng người nhận; mọi bài nháp riêng tư sẵn có của ADR-0135 xanh; bài kiến trúc khai `ord_member_submit` ngoài `XOA_CUNG_NHAP`.
- [ ] **Step 2:** FAIL. **Step 3:** Viết. **Step 4:** PASS + bài nháp riêng tư, `gui-don*`, `src/migrations-tin-cho-xac-nhan.test.ts`, `src/architecture.test.ts`, ca ba đường cùng dòng tiền ở `src/so-vang-thay-mat-to-chuc.test.ts` thêm đường thành viên.
- [ ] **Step 5:** Quan sát chặn thật: nới tạm `xemDuocDon` cho Toàn quyền đọc nháp thành viên ⇒ bài đỏ → hoàn nguyên; dòng `docs/SO-HANG-RAO.md` (ngoại lệ có tên của ADR-0135, chỉ mục một dòng chờ mỗi đơn).
- [ ] **Step 6:** Commit «Đơn thành viên qua người quản lý; hai chế độ; ngoại lệ nháp có tên (ADR-0213 Đ5, Đ8)». **Người kiểm độc lập** đọc Task 16.

### Task 17 (B2): Giao diện lượt B2

**Files:** `web/to-chuc.ts` (mời bằng số điện thoại, hiện mã một lần, huỷ lời mời, khối chế độ thành viên, danh sách nháp chờ, nút «Trả lại»), `web/order-form.ts` và chi tiết đơn (nút «Gửi người quản lý xác nhận» chỉ cho thành viên ở chế độ «Soạn và gửi»; «Gửi đơn» ẩn với thành viên khi bên đặt là tổ chức; câu «Tổ chức chưa có người quản lý, hãy liên hệ Tour Đảo»), trang Tôi (lời mời của tôi, nút «Nhận»), `web/dang-ky.ts` (ô «Mã vào tổ chức» tuỳ chọn), chi tiết hồ sơ tổ chức ở Danh bạ (Toàn quyền đặt chế độ), `src/shared/bang-tham-chieu*.ts`, kịch bản Chrome `…/to-chuc-b2-smoke.mjs`.

- [ ] **Step 1:** Bài bảng tham chiếu, `giao-dien-hoi-bang-quyen`, `goi-trang-nhe` — FAIL cho chữ, nút chưa khai.
- [ ] **Step 2:** Dựng; build; typecheck.
- [ ] **Step 3:** Chrome 390 và 1280: người quản lý mời → người được mời đăng ký bằng mã → được duyệt → soạn đơn tư cách tổ chức → gửi người quản lý → người quản lý gửi lên → văn phòng xác nhận → sổ công nợ tổ chức có dòng.
- [ ] **Step 4:** Commit «Giao diện thành viên, mã vào tổ chức (lượt B2)».

**Mốc B2:** chạy Task 18 cho mốc B2.

### Task 18: Kiểm toàn mốc và chuẩn bị phát hành (chạy ở mỗi mốc A, B1, B2)

**Files:** `scripts/audit-checks.mjs` (đã thêm ở các task), `tests/e2e/dang-ky-to-chuc.mjs` (mốc A: gửi phiếu có phần tổ chức → xác minh → duyệt → kích hoạt; mốc B1 thêm: phiếu «chỉ tổ chức» tổ chức mới → người quản lý; tổ chức có sẵn không mã ⇒ 409 trước lô), `tests/e2e/to-chuc-thanh-vien.mjs` (B2: mời → đăng ký bằng mã → soạn và gửi → xác nhận → sổ công nợ), `src/shared/changelog.ts`, `docs/HANDOFF-N1.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (công thức «tổ chức và tư cách»), nhật ký thi công.

- [ ] **Step 1:** `grep -rn` các bài e2e ghim danh sách loại quan hệ / mục xác minh (ghi ở Task 6, Task 9) và sửa có chủ đích.
- [ ] **Step 2:** `npm test` đủ bộ **một lần**; `npm run typecheck`; `npm run test:e2e -- dang-ky dang-ky-to-chuc <các bài ghim>` (B2 thêm `to-chuc-thanh-vien`); `node scripts/audit-invariants.mjs --db local` thoát 0. Đỏ thì sửa rồi chạy lại đúng phần đỏ, cuối cùng chạy đủ một lần nữa.
- [ ] **Step 3:** Người kiểm độc lập đọc **toàn mốc** (chỉ đọc), báo ĐẠT mới sang bước 4. Mốc chưa ĐẠT trước 24/11 12:00 ⇒ ghi «chờ sau diễn tập» vào HANDOFF.
- [ ] **Step 4:** Mục nhật ký thay đổi ở `src/shared/changelog.ts`: số phiên bản = bản production hiện hành + 0.01, **kiểm** bằng `node scripts/kiem-phien-ban.mjs` (không đoán từ tài liệu); mỗi mốc một mục.
- [ ] **Step 5:** Khối mới ở `docs/HANDOFF-N1.md` «ĐANG CHỜ NHẬP: Đăng ký đợt 2 — mốc <A|B1|B2>»: tên migration; điều kiện trước (mốc A: phần tổ chức chỉ mở khi chủ đăng chính sách riêng tư có ô «Thu thông tin tổ chức», văn bản ở `PHAN-THEM-TO-CHUC.md`, cần luật sư; mốc B1: chủ soát tài khoản công ty lữ hành đang có — không tự chuyển); câu hỏi gom của mốc (nếu có); và **Hoàn tác** đúng thứ tự:
  1. Bật chế độ bảo trì (trang Tôi › Chế độ bảo trì).
  2. Lùi mã về phiên bản Worker ghi ở bước triển khai của mốc này: `CI=1 npx wrangler rollback <mã phiên bản trước>` (đứng ở thư mục dự án; người soạn runbook kiểm cú pháp bằng `npx wrangler rollback --help` và dán đúng mã phiên bản in ở bước triển khai).
  3. Khôi phục D1 về điểm Time Travel ghi trước khi áp migration của mốc: `CI=1 npx wrangler d1 time-travel restore tourdao-sales-db --bookmark=<điểm khôi phục>`.
  4. Bật lại chế độ bảo trì nếu bước 3 đã đưa công tắc về trạng thái cũ (công tắc nằm trong D1), rồi `node scripts/audit-invariants.mjs --db remote` (thoát 0).
  5. Tắt chế độ bảo trì.
  Lý do thứ tự: mã cũ chạy được trên CSDL đã thêm bảng, cột (chỉ thêm); mã mới **không** chạy đúng trên CSDL cũ — nên lùi mã trước, khôi phục dữ liệu sau; bảo trì giữ hai khoảng trống đó không ai ghi. Nhiều mốc đã lên thì lùi lần lượt **ngược** thứ tự (B2 → B1 → A), mỗi lần đúng cặp phiên bản / điểm khôi phục của mốc đó. Phiếu, hồ sơ, liên kết, lời mời, đơn sinh sau điểm khôi phục mất cùng nhau; người đăng ký gửi lại được. Bước này **chưa từng diễn tập** (HC-5.19).
- [ ] **Step 6:** Commit «Đăng ký đợt 2 mốc <…>: nhật ký thay đổi, runbook, kiểm toàn mốc». Đưa chủ **một lần** lệnh `npm run day-len` rồi `npm run trien-khai` (đứng ở thư mục dự án), kèm dòng «cần triển khai, có migration». AI không chạy.

---

## Câu hỏi còn mở (đã tự quyết — Ruling)

- **R1.** Một tín hiệu «lượt B đã thi công»: hằng `DA_CO_THAY_MAT_TO_CHUC` ở `src/shared/dang-ky-vai.ts`, ba hành vi của ADR-0212 (mở Công ty lữ hành, vai cá nhân rỗng, `MANAGER_OF` thay `CONTACT_OF`) đều nhận nó làm đối số, có bài đảo hằng. Vì sao: một nguồn, máy chủ và giao diện dùng chung, đổi bằng một commit có người kiểm. Sai thì tốn: đổi thành cờ dữ liệu sau này, một tệp.
- **R2.** Dấu chính sách: cột `pty_privacy_policy.covers_org_data` đặt lúc đăng (bảng chỉ thêm), ô tích ở form đăng; phần tổ chức chỉ mở khi bản đang hiệu lực có dấu, ở cả ba chỗ (biểu mẫu ẩn, máy chủ từ chối lệnh gửi, Toàn quyền không mở vai «chỉ tổ chức»). Vì sao: ADR Đ7 đòi máy kiểm trên phiên bản chính sách, cột `purposes` là chữ tự do không kiểm được; không thêm công tắc riêng (YAGNI). Sai thì tốn: một cột và một ô tích.
- **R3.** `audit_log.acting_party_id` điền trong câu chèn duy nhất của `audit` bằng biểu thức con đọc `orders.acting_party_id` (khuôn `acting_role`), không tham số ở handler; Worker không có AsyncLocalStorage. Chỉ dòng có `order_id`, chỉ khi đơn lập thay mặt tổ chức. Sai thì tốn: dòng nhật ký không thuộc đơn (lệnh tổ chức) không có cột này — đích của chúng đã là tổ chức (`target_id`).
- **R4.** B1 chỉ cho tư cách tổ chức với người quản lý; thành viên có tư cách từ B2. Vì sao: thành viên mà không có luồng gửi người quản lý thì không làm được gì có ích, và tránh để lọt Đ8.1. Sai thì tốn: chủ thấy thành viên sớm hơn ba ngày.
- **R5.** Thư báo người quản lý cũ (Đ6) dùng cột `notice_state` trên dòng `MANAGER_OF` vừa đóng làm trạng thái chờ (5.16), có nút gửi lại. Vì sao: không thêm bảng hộp thư mới cho một loại thư. Sai thì tốn: chuyển sang bảng riêng, một migration.
- **R6.** Số điện thoại trên lời mời ẩn danh 30 ngày sau khi lời mời kết thúc (ADR không nói hạn), do tác nhân dọn phiếu đăng ký làm, không thêm mã tác nhân; phần thêm chính sách riêng tư nói rõ. Sai thì tốn: đổi một con số.
- **R7.** Hạn «chờ ô» của `license_class_code` đặt 31/03/2027 (ADR chỉ nói «có hạn»); tới hạn mà chưa mở Tài xế đối tác thì bài đỏ buộc chủ quyết gia hạn hay mở. Sai thì tốn: sửa một ngày.
- **R8.** Nâng `pty_organization.tax_code` lên N3 chỉ khi bài hạng dữ liệu và biên nhận vẫn xanh; đỏ thì giữ N2 và hỏi chủ cuối mốc A (biên nhận in mã số thuế của Tour Đảo và của đại lý). Sai thì tốn: một dòng từ điển.
- **R9.** Tư cách lưu trên đơn: hai cột `orders.acting_party_id`, `orders.acting_link_kind` ghi lúc lập, không sửa (ADR-0213 Đ3.6: tư cách là «thuộc tính của đơn»; ADR không liệt kê cột này ở mục Hệ quả, nên đây là chỗ người soạn thêm). Vì sao: suy ngược từ quyền người lập và liên kết hiện tại thì sai khi người đó đổi quyền, rời tổ chức hay chuyển quyền trong ngày; một cột giải R3, R9, R10 cùng lúc. Nháp lập trước B1 có NULL ⇒ hành vi hôm nay. Sai thì tốn: hai cột nullable thừa (mã cũ bỏ qua được vì mọi câu chèn ghi tên cột — Task 9 kiểm lại).
- **R10.** «Thành viên lúc lập» = `orders.acting_link_kind = 'MEMBER'`; quyết định đọc nháp không đọc nhật ký. Sai thì tốn: không đáng kể (cùng cột R9).
- **R13.** Cờ `quanLyBenDat` chỉ mở các ô xem và ô gửi (`order.view`, `money.view`, `order.history.view`, `contact.view`, `order.submit`, `dai-ly.nop.xem`, `payment.proof.view`); người quản lý không sửa, huỷ, gửi vé đơn người khác đã gửi lên. Vì sao: ADR-0213 Đ5 chỉ nói «thấy»; Đ8 nói «gửi»; ADR-0170 Đ1 giữ vé cho người lập. Sai thì tốn: thêm ô vào danh sách cho phép, có bài ghim.
- **R14.** Từ B1, phần tổ chức của phiếu bắt buộc có vai của tổ chức; người duyệt chọn lại được. Vì sao: trigger hai đầu của `MANAGER_OF` đòi tổ chức mang vai được hưởng — không có vai thì cả lô hỏng. Mốc A vẫn cho phần tổ chức không vai (chỉ nối «Người liên hệ của»). Sai thì tốn: nới lại một nhánh kiểm.
- **R11.** Tin cho người quản lý và thành viên đọc từ nhật ký qua view mới `v_aud_order_notice_direct` (đích danh `target_id`), không sửa `v_aud_order_event`; tin bền vì nhật ký chỉ thêm, báo đẩy được phép thất lạc. Vì sao: khớp 5.16 mà không cần hộp thư đi riêng; không đổi cột view đang có (ADR-0034 đ5). Sai thì tốn: thêm cột trạng thái gửi nếu chủ muốn báo đẩy bắt buộc.
- **R12.** Trần lời mời là dòng chính sách gieo sẵn ở `pty_org_invite_policy`, chưa có màn sửa ở đợt này. Sai thì tốn: một route kiểu chính sách đăng ký.

**Chỗ ADR lệch mã thật (ghi để người thi công biết, không đổi ADR):** ADR-0212 Đ3 «chưa kiểm đường lưu vai»: đọc mã thấy chỉnh tay nằm ở bảng `stf_permission_adjustment` (không phải cột của `stf_permission`), `roleChangeStatements` bỏ qua vai không phải `RoleCode` khi đóng — nên Task 2 dùng dòng chỉnh tay `ADD PARTNER` và ghim bằng bài; câu «một dòng `stf_permission` thường, đánh dấu chỉnh tay» hiểu là cặp hai dòng đó. ADR-0213 Đ8.6 «qua hộp thư đi»: tin trong ứng dụng của Nền tảng hôm nay đọc từ nhật ký, không có bảng hộp thư đi (R11). Đặc tả mục 2 «tài khoản quản lý của tổ chức» đã được ADR-0213 Đ1 thay (tổ chức không có tài khoản). `R-DK-4` và `R-LC-1c` hôm nay đã nhận hồ sơ mang loại đối tác (`v_pty_party_partner_label`), nên duyệt loại `LD_…` ở mốc A không cần sửa bất biến; hai kiểm này chỉ mở rộng ở B1 (vế liên kết).

## Tự soát

- **Phủ đặc tả:** ADR-0212 Đ1 → Task 1; Đ2 → Task 1, 5, 13; Đ3 → Task 2; Đ4 → Task 5; Đ5 → Task 6; Đ6 → Task 7, 13; Đ7 → Task 4, 5; Đ8 → Task 3; Đ9 → Task 3. ADR-0213 Đ1–Đ2 → Task 9, 10; Đ3–Đ4 → Task 11; Đ5 → Task 12, 16; Đ6 → Task 10; Đ7 → Task 15 (Đ7.7 ở Task 13); Đ8 → Task 12 (Đ8.1), 16; Đ9 → Task 9, 13. Giao diện → 8, 14, 17; e2e, bất biến, runbook → 18.
- **Tên nhất quán:** `DA_CO_THAY_MAT_TO_CHUC`, `vaiDangKyDuoc`, `createPartnerAccountOnPartyStatements`, `benDangThayMat`, `laQuanLyCuaBen`, `nguoiQuanLyCoHieuLuc`, `tuCachCuaDon`, `duocGuiLenTourDao`, `v_pty_org_link` dùng cùng một tên ở mọi task.
- **Review Focus:** năm dòng có bài ở Task 5, 6, 10, 15, 16.
