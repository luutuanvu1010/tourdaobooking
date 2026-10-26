# Bước Xác nhận đơn, Đón/không đón, QR sau xác nhận, Bảng điều khiển — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đơn có dịch vụ "cần xác nhận" phải qua một người nội bộ kiểm vé trước khi thành đơn đã xác nhận; mỗi dịch vụ bắt buộc chọn Đón/Không đón theo khung giờ; QR và email chỉ ra sau xác nhận; mọi tuỳ chọn nằm ở một trang Bảng điều khiển của Toàn quyền.

**Architecture:** Không đổi giá trị `orders.status` (CHECK ba giá trị từ `0003`). "Chờ xác nhận" = đơn `draft` có một dòng yêu cầu xác nhận còn mở ở bảng mới `ord_confirm_request` (module `orders`). Cờ theo dịch vụ, khung giờ đón, công tắc tự xác nhận là ba bảng chính sách chỉ-thêm theo khuôn `ord_manual_service_policy` (`0052`) / `vc_leg_template` (`0059`). Email gửi từ module `receipt` qua một hàm do gốc lắp ráp tiêm vào route của `orders` (orders không được import `billing`/`thongbao`).

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), giao diện thuần dựng bằng `h()`, esbuild, `node --test`, e2e `tests/e2e/*.mjs`, kịch bản Chrome trong `docs/evidence/**/kich-ban/`.

**Spec:** `docs/superpowers/specs/2026-10-19-xac-nhan-don-design.md` (đọc kỹ mục 5b, 5c — chúng thắng các dòng phía trên); luồng thực tế: `docs/superpowers/specs/2026-10-19-xac-nhan-don-luong-thuc-te.md`. **Từ 25/10 (Đợt 2 + 3):** `docs/adr/ADR-0135-nhap-rieng-tu-khong-thu.md`, `docs/adr/ADR-0136-buoc-xac-nhan-don-va-gui-don.md` (thắng đề xuất 19/10 khi lệch), `docs/superpowers/specs/2026-10-25-chinh-sach-ban-va-gui-don/TRANG-GHEP.md` (mục 2, 3, 3b, 5, 6) và `docs/superpowers/specs/2026-10-19-xac-nhan-don/TRANG-GHEP-LUOT-1.md` mục 3, 3b.

## Global Constraints

- Giao diện, lỗi, tài liệu, commit: tiếng Việt CÓ DẤU; gọi hệ thống là "Nền tảng"; không lộ mã thô (`draft`, `PICKUP`…) ra người dùng.
- Migration: Đợt 1 đã dùng **0115** (lên bản 2.23). **Cập nhật 25/10:** migration Đợt 3 = **0119 tạm** (kiểm 25/10: `main` có tới 0118, không nhánh/worktree nào ≥ 0119); kiểm lại `ls migrations` + `git fetch origin --prune` + `git branch --no-merged origin/main` / `git branch -r --no-merged origin/main` / `git worktree list` ngay trước khi tạo tệp. ADR: 0134, 0135, 0136 đã dùng và duyệt; số cũ «0133», «0137» trong kế hoạch này đã lỗi thời — đề xuất «thư + QR» (Đợt 4) cần số mới khi trình lại.
- Bảng mới tiền tố `ord_`, chỉ-thêm (trigger `RAISE(ABORT,'ord_policy_append_only: …')` chặn UPDATE/DELETE, trừ chỗ ghi rõ), danh sách giá trị kiểm ở MÃ không `CHECK` liệt kê; thêm vào `docs/data-dictionary.json` + `npm run dict`.
- SQL mới của `orders` chỉ ở tệp nửa nghiêm (`defineSql`), tệp mới phải vào `NUA_NGHIEM` (`src/architecture.test.ts:159`).
- Ô quyền mới: khai ở `src/shared/permissions.ts` `MATRIX`, cập nhật bảng `ADR` trong `src/shared/permissions.test.ts`, ba bài ghim hàng DRIVER/DRIVER_PARTNER/HR, `TEN_THAO_TAC` (`src/shared/tro-ly-cau-truc-ten.ts`), ca trong `tests/e2e/permissions.mjs`; máy chủ phải gọi `can(…, "<ô>")` viết thẳng.
- Hành động nhật ký mới: `src/shared/audit-actions.ts` + xếp vào `src/shared/lich-su-noi-bo.ts` VÀ `src/shared/lich-su-doi-tac.ts`; không ghi SĐT/email/MST, không ghi địa chỉ thư.
- Khung giờ đón mặc định (gieo trong migration, giờ 24h): `07:30–08:00`, `08:00–08:30`, `08:30–09:00`, `09:00–09:30`, `09:30–10:00`; câu lưu ý mặc định nguyên văn: **"Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động."**
- Hạn xác nhận: **15 phút**, cố định; khoảng **22:00–06:00 giờ Việt Nam không tính**.
- Lý do huỷ khi chọn Hết vé: mã có sẵn `HET_CHO` (`src/shared/ly-do-huy.ts`), máy chủ tự gán, không cần `order.cancel.classify`.
- Người xác nhận: SALES, ACCOUNTING, ADMIN, SUPER_ADMIN, FIELD. Không: PARTNER, INTERN, DRIVER, DRIVER_PARTNER, HR.
- Không `innerHTML`; giá trị CSS vào token `public/app.css`; ô gõ 16px; trang mới khai `PAGES`/`PRECACHE` (`src/shared/sw-policy.ts`), `build:web`, lối vào ở `src/shared/muc-giao-dien.ts`.
- CẤM AI chạy: `git push`, merge, `wrangler deploy`, migration/ghi remote. Mỗi đợt kết thúc bằng `nguoi-kiem-doc-lap` chỉ đọc (việc lớn: quyền, dữ liệu, tiền).

## Review Focus

1. Đơn trộn một dịch vụ thường + một dịch vụ "cần xác nhận" → cả đơn phải qua bước xác nhận; chỉ dịch vụ thường thì luồng cũ. (Task 3.1 `canXacNhan`.)
2. Gửi xác nhận lúc 21:55 → hạn 06:10 sáng hôm sau; gửi lúc 23:00 → hạn 06:15; gửi đúng 06:00 → 06:15. (Task 3.1 `hanXacNhan`.)
3. Hai người cùng quyết định một đơn (một Còn vé, một Hết vé) → đúng một người thắng, người kia nhận 409 "vừa có người đổi", không có hai dòng quyết định. (Task 3.3 bài đua.)
4. Toàn quyền bỏ cờ "cần xác nhận" khi đơn đang chờ → yêu cầu đang mở vẫn quyết định được; đơn nháp mới của dịch vụ đó không còn phải gửi. (Task 3.3.)
5. Khách không có email / gửi thư hỏng → việc xác nhận vẫn thắng, thư hỏng chỉ ghi log `event:"order_mail_failed"` không có địa chỉ. (Task 4.2.)
6. Đơn đã xác nhận TRƯỚC ngày áp dụng (cột chọn đón NULL) → không bị đòi chọn lại khi sửa chuyến/huỷ. (Task 1.2.)
7. HDV được người lập chọn sẵn lúc tạo đơn → khi đơn còn nháp/đang chờ: HDV đó KHÔNG mở được đơn (404), KHÔNG nhận tin `order_handler_changed`; khi đơn được xác nhận: HDV nhận tin xác nhận và mở được đơn. (Task 2.1.)
8. HDV chưa phụ trách mở đơn ĐANG CHỜ để xác nhận → 200, thấy tiền chỉ đọc, KHÔNG thấy SĐT/email khách. (Task 3.3.)
9. Người lập sửa đơn khi đang chờ → 409, phải "Rút lại" trước. (Task 3.3.)
10. Đối tác có chặng dưới mốc, không dịch vụ cờ → Gửi đơn vào nhánh A (201), **không** bị 409 `short_notice_required` lúc gửi; mốc chỉ chặn lúc Còn vé. (Task 3.4 ca 3; Task 3.3 ca m.)
11. Dịch vụ dòng riêng «không cần» + nhóm «cần» → không phải qua bước; ngược lại thì phải; dịch vụ nhập tay (không mã) không gắn cờ được. (Task 3.1, 3.3 ca k.)
12. Nháp đã có khoản thu (nháp cũ) → Gửi xác nhận / Gửi đơn nhánh A bị từ chối, đơn vẫn nháp, không mở yêu cầu; nhánh B vẫn xác nhận; hàm kiểm khoản thu không được tiêm → 503, không đoán. (Task 3.3 ca n; Task 3.4 ca 7.)
13. Tài khoản lai Bán hàng + Đối tác: đơn mình lập → `/status` confirmed 409 `partner_submit_required`; đơn chờ của người khác → vẫn quyết định được; đơn chờ của chính mình → không tự quyết. (Task 3.4 ca 4; Task 3.3 ca p.)
14. Form lập mới: lưu thành công mà Gửi đơn thất bại → chuyển sang trang nháp vừa lưu kèm lỗi; bấm lần hai không tạo nháp trùng. Gửi đơn lần hai sau khi thành công → 409, không thêm dòng yêu cầu. (Task 3.5; Task 3.4 ca 6.)
15. Kế toán (không giữ `order.cancel.classify`) bấm Hết vé → huỷ được với lý do `HET_CHO`. (Task 3.3 ca d.)

---

## Đợt 0 — Hồ sơ quyết định (chủ duyệt trước khi thi công Đợt 2–4)

> **Trạng thái 25/10: xong.** ADR-0134 + ADR-0135 chủ duyệt 19/10; ADR-0136 (đề xuất gốc + bản bổ sung 25/10) chủ duyệt 25/10, bản chép ở `docs/adr/`. Các bước «DỪNG chờ duyệt» dưới đây đã qua; chữ giữ nguyên làm lịch sử. Đề xuất «thư + QR» (Đợt 4, số tạm 0137) **chưa trình**, cần số mới.

### Task 0.1: Ba đề xuất ADR + trang ghép

**Files:**
Bốn đề xuất, chia **hai lượt duyệt** (mỗi lượt ≤ 3 quyết định chạm quyền/dữ liệu, CLAUDE.md §9):
- **Lượt 1** (mở Đợt 1–2):
  - `docs/superpowers/specs/2026-10-19-xac-nhan-don/DE-XUAT-ADR-0134-don-khong-don-khung-gio.md` (cột chọn đón theo dịch vụ, khung giờ trên chặng, giờ đầu khung = `pickup_time`)
  - `…/DE-XUAT-ADR-0135-nhap-rieng-tu-khong-thu.md` (nháp chỉ người tạo đọc; nháp không ghi thu; bỏ ô Trả trước; hàng chờ nhận chỉ đơn đã xác nhận; HDV chọn sẵn không thấy nháp)
- **Lượt 2** (mở Đợt 3–4):
  - `…/DE-XUAT-ADR-0136-buoc-xac-nhan-don.md` (trạng thái "chờ yêu cầu" giữ `draft`; ô quyền `order.confirm.review`; nới đọc có giới hạn cho người xét duyệt; tự xác nhận theo công tắc)
  - `…/DE-XUAT-ADR-0137-thu-xac-nhan-va-qr-may-chu.md` (gửi email ra ngoài cho người đặt + nhân viên lập; thư huỷ; dựng ảnh QR phía máy chủ → nới `src/vendor-qr.test.ts` thêm MỘT tệp được nhắc `vendor/qrcode`; thay ADR-0108 đ3 C3 phần "chỉ `web/qr-ve.ts`")
- Mỗi lượt kèm một `TRANG-GHEP-LUOT-<n>.md` theo CLAUDE.md §9: (1) bảng `orders`/`ord_confirm_request` chứa loại gì; (2) từng ô quyền chạm (`order.view` cho nháp, `order.confirm.review`, `payment.receive` khi nháp, `order.pool.view`); (3) cổng canh cửa, gồm chỗ giao diện ẩn/hiện bị đổi nghĩa (nút QR, ô Trả trước, thẻ "Đơn nháp" Trang chủ, hàng chờ nhận HDV, nút Xác nhận/Gửi xác nhận).
- Rà `docs/quyen-hoan.json`: ghi "không xây trên lỗ đang hở" kèm lý do (TNV-G1 bị né nhờ "nháp không ghi thu") — trừ nháp CŨ đã có khoản thu (xem Task 2.2 Step 0).
- **Câu hỏi kèm lượt 1 (đụng phân hệ Vận chuyển đã đóng sổ):** lịch chung điều phối (`lichChungChang` → `dieu-phoi-lenh.ts:747`, trường `nhap`, `soNhap`) hôm nay hiện chặng của đơn nháp (mã đơn, giờ đón, đặt gấp) để điều phối nhìn trước. Khuyến nghị: chỉ hiện chặng của đơn **đã gửi xác nhận**, bỏ nháp chưa gửi. Chưa có câu trả lời thì Task 2.1 KHÔNG đụng `lichChungChang`.

- [ ] **Step 1:** Viết bốn tệp, mỗi ADR ≤ 1 trang, nêu phương án bị bác. Không đặt vào `docs/adr/` (AI không tự duyệt).
- [ ] **Step 2:** `npm test` (bài sổ/ADR không đỏ). Commit: `Đề xuất ADR-0134…0136 và trang ghép hai lượt cho bước Xác nhận đơn (chờ chủ duyệt)`.
- [ ] **Step 3:** DỪNG: Đợt 1–2 chờ duyệt lượt 1; Đợt 3–4 chờ duyệt lượt 2. Soạn lượt 2 trong lúc thi công Đợt 1–2 được.

---

## Đợt 1 — Đón/Không đón và khung giờ (ADR-0134)

### Task 1.1: Migration 0114 + luật thuần khung giờ

**Files:**
- Create: `migrations/0114_chon_don_khung_gio.sql`
- Create: `src/shared/khung-gio-don.ts`, `src/shared/khung-gio-don.test.ts`
- Create: `src/migrations-chon-don.test.ts`
- Modify: `docs/data-dictionary.json`, chạy `npm run dict`

**Interfaces — Produces:**
- Cột `order_service.pickup_choice TEXT NULL` (giá trị mã `'DON' | 'KHONG_DON'`, NULL = chưa chọn / đơn cũ).
- Cột `ord_transfer_leg.pickup_slot_end TEXT NULL` (HH:MM; NULL = "Giờ khác" hoặc chưa chọn). CHECK định dạng như `pickup_time`; CHECK `pickup_slot_end IS NULL OR (pickup_time IS NOT NULL AND pickup_slot_end > pickup_time)`.
- Bảng `ord_pickup_slot_policy(id, slots_json TEXT NOT NULL, note TEXT NOT NULL CHECK(length(note) BETWEEN 1 AND 200), valid_from_at TEXT NOT NULL UNIQUE, created_at, created_by, updated_at, updated_by)` + hai trigger chỉ-thêm; gieo một dòng với 5 khung + câu lưu ý ở Global Constraints.
- `export type LuaChonDon = "DON" | "KHONG_DON"`; `export interface KhungGio { tu: string; den: string }`;
  `export function kiemDanhSachKhung(raw: unknown): { ok: true; khung: KhungGio[] } | { ok: false; loi: string }` (1–12 khung, HH:MM, `tu < den`, không chồng nhau, sắp tăng);
  `export function nhanKhung(k: KhungGio): string` → `"07:30–08:00"`.

- [ ] **Step 1: Bài đỏ** `src/shared/khung-gio-don.test.ts`:
  ```ts
  test("khung mặc định hợp lệ và nhãn 24 giờ", () => {
    const r = kiemDanhSachKhung([{tu:"07:30",den:"08:00"},{tu:"08:00",den:"08:30"},{tu:"08:30",den:"09:00"},{tu:"09:00",den:"09:30"},{tu:"09:30",den:"10:00"}]);
    assert.equal(r.ok, true); assert.equal(nhanKhung({tu:"07:30",den:"08:00"}), "07:30–08:00");
  });
  test("chồng nhau, ngược giờ, sai định dạng, rỗng, 13 khung → lỗi tiếng Việt", …);
  ```
  `src/migrations-chon-don.test.ts`: áp mọi migration lên SQLite tạm (khuôn `src/migrations-chinh-sach-dieu-phoi.test.ts`), khẳng định: dòng gieo đúng 5 khung + câu lưu ý; UPDATE/DELETE `ord_pickup_slot_policy` ném `ord_policy_append_only`; `pickup_slot_end` "08:00" với `pickup_time` "08:30" bị CHECK chặn; đơn cũ có `pickup_choice` NULL.
- [ ] **Step 2:** `node --test src/shared/khung-gio-don.test.ts src/migrations-chon-don.test.ts` → FAIL (chưa có tệp).
- [ ] **Step 3:** Viết migration + `khung-gio-don.ts`; cập nhật data-dictionary (hạng dữ liệu từng cột) + `npm run dict`.
- [ ] **Step 4:** Chạy lại hai bài → PASS; `npm run db:migrate:local` không lỗi.
- [ ] **Step 5:** Commit `Migration 0114: chọn đón theo dịch vụ, khung giờ trên chặng, chính sách khung giờ`.

### Task 1.2: Máy chủ — lưu, đọc, cổng "phải chọn đón"

**Files:**
- Modify: `src/shared/contracts.ts` (`ServiceInput.pickupChoice?: LuaChonDon | null` ~:382; `OrderServiceDto.pickupChoice: LuaChonDon | null`; `LegInput.pickupSlotEnd?: string` ~:434; `LegDto.pickupSlotEnd: string | null` ~:465)
- Modify: `src/shared/chang-dua-don.ts` (`kiemChang` nhận `pickupSlotEnd`), `src/modules/orders/chang-hanh-khach-repo.ts` (`LEG_INSERT_COLS`, `legInsert*`, đọc DTO), `src/modules/orders/repository.ts` (`SERVICE_COLS`/`serviceInserts` ~:851)
- Create: `src/shared/cong-chon-don.ts`, `src/shared/cong-chon-don.test.ts`
- Modify: route chính sách: `src/modules/orders/index.ts` — `GET /api/cai-dat/khung-gio-don` (cổng `orders`, `can(staff,"order.create")`), `POST /api/cai-dat/khung-gio-don` (cổng `admin`, `can(staff,"settings.ops")`) theo đúng khuôn `/api/cai-dat/nhap-tay` (:744–753): mốc `max(now, moiNhat+1ms)`, một `db.batch([insert, auditStatement(action:"pickup_slot_policy_changed")])`, va UNIQUE → 409.
- Modify: `src/shared/audit-actions.ts`, `lich-su-noi-bo.ts`, `lich-su-doi-tac.ts` (hành động `pickup_slot_policy_changed`, nhóm hệ thống, ẩn với Đối tác).
- Test: `tests/e2e/chon-don.mjs` (thêm vào `ALL`, `THOI_GIAN` của `tests/e2e/run.mjs`)

**Interfaces — Produces:**
- `export function thieuChonDon(services: readonly { pickupChoice: LuaChonDon | null; soChangMo: number }[]): number[]` — chỉ số các dịch vụ chưa chọn, hoặc chọn `DON` mà 0 chặng mở. `KHONG_DON` mà còn chặng mở → cũng lỗi.
- Câu lỗi 409 `pickup_choice_required`: "Dịch vụ thứ {n} chưa chọn Đón hay Không đón." (thêm vào `src/shared/order-errors.ts`).
- Cổng chạy ở: route xác nhận hiện có (`POST /api/orders/:id/status` nhánh confirmed, :1411) và route gửi xác nhận (Task 3.3). KHÔNG chạy khi lưu nháp, KHÔNG chạy với đơn đã `confirmed`/`cancelled` (Review Focus 6).

- [ ] **Step 1: Bài đỏ** `cong-chon-don.test.ts`: NULL → `[0]`; `DON` + 0 chặng → `[0]`; `KHONG_DON` + 1 chặng → `[0]`; `DON`+1, `KHONG_DON`+0 → `[]`.
  e2e `chon-don.mjs`: lưu nháp không chọn → 201; xác nhận → 409 `pickup_choice_required`; chọn `KHONG_DON` → xác nhận 200; chặng có `pickupSlotEnd` "08:00", `pickupTime` "07:30" → đọc lại đúng; POST khung giờ bằng Bán hàng → 403, bằng Toàn quyền → 201 rồi GET thấy khung mới; đơn đã xác nhận từ trước (gieo `pickup_choice` NULL) → huỷ được 200.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Cài đặt như Files; `withLegs` (`src/modules/orders/rules.ts:52-80`) giữ luật "mọi dịch vụ có khoá `legs` hoặc không dịch vụ nào"; thêm luật tương tự cho `pickupChoice` (thiếu khoá ở mọi dịch vụ = client cũ → giữ NULL, không lỗi).
- [ ] **Step 4:** `node --test src/shared/cong-chon-don.test.ts && npm test && npm run typecheck && npm run test:e2e -- chon-don orders chang-hanh-khach dua-don-dau-cuoi` → PASS.
- [ ] **Step 5:** Commit `Máy chủ: lưu lựa chọn đón và khung giờ, chặn xác nhận khi dịch vụ chưa chọn đón`.

### Task 1.3: Giao diện — Đón/Không đón bắt buộc, chọn khung hoặc "Giờ khác"

**Files:**
- Modify: `web/khoi-dua-don.ts` (khối 0 chặng :486-490 thay bằng hai nút chọn "Đón" / "Không đón"; ô giờ :289-290 thay bằng hàng khung giờ + "Giờ khác" mở `<input type="time">`; câu lưu ý dưới hàng khung, màu phụ)
- Modify: `src/shared/chang-form.ts` (`ChangNhap.pickupSlotEnd: string`; `legInput` gửi `pickupSlotEnd` khi chọn khung), `src/shared/service-form.ts` (`toServiceInput` gửi `pickupChoice`), `web/service-card.ts`, `src/shared/dong-gap-the.ts` (chip "Chưa chọn đón" khi `pickupChoice` NULL)
- Modify: `web/order-form.ts` :199-201 — mẫu `ONE_WAY`/`ROUND_TRIP` → gợi ý sẵn "Đón" (vẫn hiện là đã chọn, người lập đổi được); `NONE` → chưa chọn (KHÔNG mặc định "Không đón").
- Test: `src/shared/chang-form.test.ts`, `src/shared/dong-gap-the.test.ts`, kịch bản Chrome mới `docs/evidence/2026-10-19-xac-nhan-don/kich-ban/chon-don-smoke.mjs`

**Interfaces — Consumes:** `KhungGio`, `nhanKhung` (Task 1.1); `GET /api/cai-dat/khung-gio-don` → `{ khung: KhungGio[]; luuY: string; doiDuoc: boolean }` (khai `KhungGioDonResponse` ở `contracts.ts`, Task 1.2).

- [ ] **Step 1: Bài đỏ:** `chang-form.test.ts` — chọn khung `{tu:"08:00",den:"08:30"}` → `legInput` ra `pickupTime:"08:00", pickupSlotEnd:"08:30"`; chọn "Giờ khác" 14:15 → `pickupSlotEnd` vắng; `dong-gap-the.test.ts` — dịch vụ `pickupChoice` null → chip "Chưa chọn đón".
- [ ] **Step 2:** Chạy → FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run build:web`; chạy `chon-don-smoke.mjs` ở 390 và 1040 (chọn Đón → chọn khung → lưu → mở lại thấy khung; chọn Không đón → khối gọn; không chọn → xác nhận báo lỗi đúng dịch vụ) và các kịch bản form theo bảng `web/CLAUDE.md` (`a2-smoke-form`, `dat-gap-smoke`, `danh-muc-lap-don-smoke`). Chụp ảnh 390 + 1040 vào `docs/evidence/2026-10-19-xac-nhan-don/`.
- [ ] **Step 5:** Commit `Form Tạo đơn: bắt buộc chọn Đón/Không đón, chọn khung giờ hoặc Giờ khác`.
- [ ] **Step 6:** `nguoi-kiem-doc-lap` cho Đợt 1 (dữ liệu: migration + hợp đồng API). Chỉ sang Đợt 2 khi báo cáo ĐẠT.

---

## Đợt 2 — Nháp riêng tư, nháp không thu tiền, bỏ ô Trả trước (ADR-0135)

> **Sửa 25/10 theo Ruling của nhật ký thi công, khớp ADR-0135 (duyệt 19/10) và ADR-0136 (duyệt 25/10).** Từ đây các task nêu route và hàm **theo tên**, không theo số dòng (số dòng cũ đã lệch ~200 dòng). Nguồn danh sách route, chỗ giao diện: `docs/superpowers/specs/2026-10-19-xac-nhan-don/TRANG-GHEP-LUOT-1.md` mục 3 và 3b — task dưới đây gọi tên từng hàng và cho mỗi hàng một bài; không chép lại bảng.
>
> **Phát hành chung với Đợt 3** (chủ chọn A, đặc tả 5f.1): nháp riêng tư lên một mình thì Quản trị không mở được nháp sát giờ để Đặt gấp. Thi công Đợt 2 trước được, nhưng không `day-len`/`trien-khai` riêng. ADR-0135 là **không migration, không đổi giá trị ô nào** — bài ghim giá trị ô (`permissions.test.ts`) không đổi ở Đợt 2.
>
> **Xây trên lỗ đang hở: TNV-G1**, với điều kiện đã chốt: nháp không ghi thu (Task 2.2) + chặn mở yêu cầu khi đơn đã có khoản thu (Task 3.3/3.4) + chủ đếm nháp cũ có khoản thu trước khi phát hành (Task 2.2 Step 0). Kiểm `docs/quyen-hoan.json` lại ngay trước phát hành.

### Task 2.1: Luật thuần "ai đọc được đơn" + các đường ĐỌC + số đếm + đổi tên thẻ nháp

**Files:**
- Create: `src/shared/xem-don-nhap.ts`, `src/shared/xem-don-nhap.test.ts`
- Modify (thay `can(order.view)` bằng `xemDuocDon`, tên route theo `src/modules/orders/index.ts`): `GET /api/orders` (+ `dieuKienDanhSach` trong `repository.ts`), `GET /api/orders/:id`, `GET …/passengers`, `GET …/thuong-mai`, `GET /api/orders/dashboard`, `GET /api/orders/dem-nhap`; `src/modules/receipt/index.ts` (biên nhận, QR); `src/modules/billing/index.ts` (`GET …/payments`, `nhap-ke-toan`, `POST /api/ledger/balances`: bỏ đơn nháp người khác); `donCuaNguoiDat` (`nguoi-dat-gop-repo.ts`): chỉ đếm, không trả mã đơn nháp người khác.
- Modify (hai đường mà kế hoạch 19/10 sót — trang ghép lượt 1 mục 3): `GET /api/van-chuyen/xe-cua-don/:orderId` (`src/modules/van-chuyen/index.ts`; nay trả 200 cho nháp người khác, phải 404 — nguồn đọc là view `v_ord_order_label`); `GET /api/dispatch/mine` và `findHandledOrderIds` (`src/modules/dispatch/repository.ts`, tập này cũng là `ctx.myHandledOrderIds` của `GET /api/orders`): bỏ đơn nháp khỏi tập "tôi phụ trách" (ADR-0135 Đ5).
- Modify (số đếm, ADR-0135 Đ3): `countDrafts` → nháp **của người gọi**; `unassignedCount` (`repository.ts`, cả `dashboard`) chỉ đếm đơn `confirmed`.
- Modify (đổi tên, chỗ chữ "Chờ xác nhận" của thẻ nháp phải nhường chỗ cho thẻ đơn chờ của Đợt 3 — trang ghép 25/10 mục 3b): `src/shared/pham-vi-so.ts` (khoá `choXacNhan` của `PHAM_VI_O_TRANG_CHU`, hôm nay phạm vi `TOAN_CONG_TY` → đổi tên `donNhap` **và** phạm vi `CUA_TOI`, vì số nháp nay là của chính người xem — ADR-0135 Đ3), `src/shared/viec-cua-ban.ts` (`KHOA_PHAM_VI`: `nhap: "choXacNhan"` → `"donNhap"`; nhãn thẻ giữ "Đơn nháp"), `web/home.ts` (ô điện thoại nhãn "Chờ xác nhận" của `draftCount` → "Đơn nháp"; huy hiệu "Đơn hàng" ở `web/shell.ts` đọc `dem-nhap` nên tự đúng theo máy chủ), `web/dieu-phoi.ts` (ô "ĐƠN NHÁP … chờ duyệt đặt gấp" đổi chữ ở Task 3.5, vì chỉ có nghĩa khi có yêu cầu mở).
- Test: `src/shared/xem-don-nhap.test.ts`, `src/modules/orders/dem-nhap.test.ts` (đếm theo người), `src/shared/pham-vi-so.test.ts` (bài `deepEqual` khoá phạm vi, sửa có chủ đích), `src/shared/viec-cua-ban.test.ts`, `tests/e2e/nhap-rieng-tu.mjs` (thêm vào `ALL` của `tests/e2e/run.mjs`)

**Interfaces — Produces:**
- `export function xemDuocDon(i: { coQuyenXem: boolean; status: OrderStatus; laNguoiLap: boolean; dangCho: boolean; xetDuyetDuoc: boolean }): boolean` — `coQuyenXem` = `can(staff,"order.view",{ownerId,assigned})` route tính sẵn; `confirmed`/`cancelled` → `coQuyenXem`; `draft` → `(laNguoiLap && coQuyenXem) || (dangCho && xetDuyetDuoc)`. **Thay** cho `if (!can(order.view)) 404` (không phải lớp thêm sau nó — nếu không HDV chưa phụ trách bị 404 trước khi tới nhánh xét duyệt, Review Focus 8). Trước Task 3.3: `dangCho = false`, `xetDuyetDuoc = false` (ô chưa có). Cùng luật cho tiền chỉ đọc: `money.view` HOẶC (`dangCho && xetDuyetDuoc`).
- 404 (không 403) khi không xem được.
- **Ngoại lệ có tên** (ADR-0135 Đ1): trang Nhật ký của Toàn quyền (ADR-0038 đ6) vẫn liệt kê dòng nhật ký của đơn nháp.

- [ ] **Step 0 (rà trước khi viết mã — trang ghép lượt 1 mục 3 "Chưa rà"):** liệt kê nơi module khác đọc đơn qua view công bố (`v_ord_order_label`, `v_ord_order_state`, `v_ord_order_owner`… — sổ tiền, Vận chuyển, Góp ý) có trả mã đơn nháp cho người khác không; ghi kết quả vào nhật ký thi công; mỗi chỗ tìm thấy thêm một dòng bài đỏ cùng Step 1.
- [ ] **Step 1: Bài đỏ.** `xem-don-nhap.test.ts`: bảng chân trị đủ 2×2×2 cho `draft` + hai ca `confirmed`/`cancelled`. `pham-vi-so.test.ts` / `viec-cua-ban.test.ts`: khoá `donNhap` phạm vi `CUA_TOI`, không khoá nào còn là `"choXacNhan"`. `dem-nhap.test.ts`: hai người có nháp đếm riêng. e2e `nhap-rieng-tu.mjs`: Bán hàng A lập nháp chọn sẵn HDV H → H: GET 404, không có tin; Bán hàng B, Kế toán, Quản trị, Toàn quyền: danh sách không có, GET chi tiết/`passengers`/`thuong-mai`/biên nhận/QR 404, tìm theo mã 0 kết quả, `dashboard.draftCount` = 0, `xe-cua-don` 404; `GET /api/dispatch/mine` của H không có đơn; `unassignedCount` không đếm nháp; A thấy đủ; Nhật ký của Toàn quyền vẫn có dòng `created` của nháp A.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt như Files. **Step 4:** `npm test && npm run typecheck && npm run build:web && npm run test:e2e -- nhap-rieng-tu orders dispatch permissions` → PASS. **Đo và ghi vào nhật ký** danh sách bài cũ đỏ vì 404 nháp (chưa có số đo cho Đợt 2); sửa dữ liệu gieo để chính người lập ghi/đọc nháp.
- [ ] **Step 5:** Commit `Đơn nháp chỉ người tạo đọc được; đếm theo người; đổi tên thẻ nháp`.

### Task 2.2: Nháp không ghi thu; QR chỉ đơn đã xác nhận; bỏ ô Trả trước

**Files:**
- Modify: `src/modules/billing/index.ts` — `POST /api/orders/:id/payments` và các route cọc (`coc.ts`): `info.status === "draft"` → 409 `order_draft_no_payment` ("Đơn chưa xác nhận, chưa ghi thu được."), **kể cả lệnh chuyển cọc mà đơn NHẬN là nháp** (ADR-0135 Đ7; cổng đặt ở đơn nhận, không ở đơn nguồn). Cờ `coTheGhiThu` thêm `info.status !== "draft"`.
- Modify: `src/modules/receipt/index.ts` — QR của đơn không `confirmed` → 409 `qr_requires_confirmed` (áp **mọi** đơn, ADR-0135 Đ8); `web/order.ts` nút QR thêm `order.status === "confirmed"`.
- Modify: `web/order-form.ts` (+ `public/order-form.html`) — bỏ ô "Thanh toán trước", "Hình thức", "Người thu tiền" và lời gọi ghi thu sau lưu; thanh dính cuối trang bỏ dòng "thanh toán trước". `src/shared/huong-dan-*.ts` sửa câu nhắc trả trước (phần Đối tác sửa tiếp ở Task 3.5).
- Test: `tests/e2e/so-tien.mjs`, `tests/e2e/qr-thanh-toan.mjs`, `tests/e2e/coc-don-huy.mjs` (thêm ca), `src/shared/service-form.test.ts` (sửa bài khoá thân có chủ đích), kịch bản `a2-smoke-form`.

- [ ] **Step 0 (trước phát hành, chủ chạy — AI không chạy lệnh remote):** đếm đơn nháp CŨ đã có khoản thu (sinh ra từ ô Trả trước). Chạy ở thư mục `tourdao-sales`:
  ```
  npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(DISTINCT o.id) AS so_don FROM orders o JOIN bil_payment_receipt r ON r.order_id = o.id WHERE o.status = 'draft'"
  ```
  Kết quả > 0 thì chủ quyết cách xử lý những đơn đó (huỷ chúng sẽ rơi vào lỗ TNV-G1) trước khi phát hành Đợt 2. Ghi kết quả vào nhật ký thi công. (Đợt 3 chặn thêm đường gửi xác nhận cho đúng những đơn này — Task 3.3.)
- [ ] **Step 1: Bài đỏ** e2e: ghi thu lên nháp → 409 `order_draft_no_payment`; chuyển cọc sang đơn nhận là nháp → 409; ghi thu sau xác nhận → 201; QR của nháp → 409 `qr_requires_confirmed`; QR sau xác nhận → 200. Bài thuần: thân POST tạo đơn không còn khoá trả trước.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run build:web && npm run test:e2e -- so-tien qr-thanh-toan coc-don-huy orders` + `a2-smoke-form` 390/1040 → PASS.
- [ ] **Step 5:** Commit `Nháp không ghi thu được, QR chỉ cho đơn đã xác nhận, bỏ ô Trả trước khỏi màn Tạo đơn`.

### Task 2.3: Các đường GHI, người phụ trách chọn sẵn, hàng chờ nhận, tin của nháp

**Files:**
- Modify (ADR-0135 Đ2 — **kế hoạch 19/10 chỉ nêu route đọc**; trang ghép lượt 1 mục 3 hàng "Route ghi của orders"): mọi route ghi lên đơn `draft` chỉ cho người lập, người khác (kể cả Toàn quyền, người phụ trách chọn sẵn) nhận **404**: `PUT /api/orders/:id`, `PUT …/trip`, `POST|PUT …/legs*` (gồm `close`, `replace`; `short-notice` xem ngay dưới), `POST …/passengers`, `PUT …/booker`, `POST …/status`, `POST …/cancel-reason`, `POST …/thuong-mai/:serviceId`, `POST …/chup-bu`, `POST …/money-edit` (hôm nay 409 `MONEY_EDIT_DRAFT` → 404 với người khác), và giao người phụ trách (`PUT …/handler`, module `dispatch`). Dùng **một** hàm dùng chung `chiNguoiLapGhiNhap` (đặt cạnh `xemDuocDon`), không rải điều kiện rời. `POST …/legs/:legId/short-notice` (Đặt gấp) hôm nay không hỏi `order.view`: sau Đợt 2 chỉ người lập ghi nháp, người khác **404**, **ngoại lệ có tên** (Đợt 3): route này mở cho nháp **đang có yêu cầu xác nhận mở** (người giữ `order.leg.short_notice`), nằm ngoài `khoaKhiCho`; nháp không chờ thì 404. `POST …/money-edit` **không có ngoại lệ** cho tới khi chủ duyệt Task 3.3b (hoãn): người khác luôn 404 với nháp.
- Modify: `src/modules/orders/repository.ts` `listPoolSources` → chỉ `status = 'confirmed'`; `src/modules/dispatch/index.ts` nhận đơn: đơn `draft` → 409 `order_not_confirmed` ("Đơn chưa xác nhận, chưa nhận được.").
- Modify: Bảng tin `src/shared/bang-tin.ts` `nhanSuKien`: sự kiện của đơn nháp chỉ gắn nhãn người lập (bỏ `tat-ca`, `cho-nhan`, nhãn người phụ trách trước/sau); `src/shared/thong-bao.ts`: tin của nháp (`lap`, `order_handler_changed`…) chỉ người lập. Khi đơn chuyển `confirmed`, tin `xac_nhan` tới người phụ trách như hôm nay (Review Focus 7).
- Modify: lịch chung điều phối — **ADR-0135 Đ9 đã chốt** (đặc tả 5d.1, không còn "chờ câu trả lời"): phần "nháp" chỉ gồm chặng của nháp có yêu cầu xác nhận còn mở. Bảng yêu cầu chưa có ở Đợt 2, nên Đợt 2 chỉ **tắt** phần nháp (`legLichChungNhapRows` trong `chang-hanh-khach-repo.ts`, nửa nghiêm `defineSql`); Task 3.3 nối lại theo bảng `ord_confirm_request`.
- Test: `src/shared/bang-tin.test.ts`, `src/shared/xem-don-nhap.test.ts`, `tests/e2e/nhap-rieng-tu.mjs` (thêm ca), `tests/e2e/dispatch.mjs` (ca hàng chờ nhận)

- [ ] **Step 1: Bài đỏ.** `bang-tin.test.ts`: `created` của nháp → chỉ nhãn người lập; `order_handler_changed` của nháp → không tới người phụ trách. e2e: với nháp của A, Bán hàng B / Kế toán / Quản trị / Toàn quyền / HDV chọn sẵn H gọi từng route ghi trên → 404 và đơn không đổi; A gọi → như cũ; hàng chờ nhận của HDV không có nháp; Nhận nháp → 409 `order_not_confirmed`; lịch chung điều phối không có chặng nháp.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run test:e2e -- nhap-rieng-tu orders dispatch bangtin thongbao gop-ho-so permissions chang-hanh-khach` → PASS (bài cũ nào đỏ vì dùng phiên người khác ghi nháp: sửa dữ liệu gieo để chính người lập ghi, ghi vào nhật ký).
- [ ] **Step 5:** Commit `Đơn nháp: mọi đường ghi chỉ người lập; hàng chờ nhận, tin, lịch chung không còn nháp`.
- [ ] **Step 6:** `nguoi-kiem-doc-lap` cho Đợt 2 (quyền + tiền). **Chưa phát hành** — chờ Đợt 3.

---

## Đợt 3 — Bước Xác nhận đơn + «Gửi đơn» của Đối tác (ADR-0136)

> **Sửa 25/10 theo Ruling của nhật ký** (xem bảng truy vết). Migration của Đợt 3: **0119 tạm** — kiểm ngày 25/10 sau `git fetch origin --prune`: `main` có tới `0118_muc_ta_gan_rieng`, không nhánh chưa gộp (cục bộ lẫn xa) và không worktree nào có số ≥ 0119 (số 0098 còn nằm ở hai nhánh cũ chưa gộp, không đụng). **Ngay trước khi tạo tệp** chạy lại: `ls migrations | tail -3`, `git fetch origin --prune`, và vòng `for b in $(git branch --no-merged origin/main --format='%(refname:short)') $(git branch -r --no-merged origin/main --format='%(refname:short)'); do git ls-tree --name-only "$b" migrations/; done` cùng `ls migrations` ở mọi `git worktree list`; lượt 2 (chính sách bán) cũng sẽ cần một số.
>
> **Cổng «luật bán» KHÔNG có trong kế hoạch này** (ADR chính sách bán, lượt 2, chưa duyệt): Gửi đơn / Gửi xác nhận / Còn vé chạy đủ các cổng còn lại; ca «luật bán chặn» (tiêu chí nghiệm thu 5) bỏ qua. Khi lượt 2 duyệt, thêm cổng ở một kế hoạch riêng.

**Bảng truy vết ADR-0136 → task** (mọi điều có bài đỏ ở task nêu):

| Điều | Task | Điều | Task |
|---|---|---|---|
| Đ1 cờ dịch vụ/nhóm, chặng dưới mốc | 3.1, 3.2, 3.3 | Đ9 hạn 15 phút, Trang chủ | 3.1, 3.5 |
| Đ2 yêu cầu mở, khép một lần | 3.2, 3.3 | Đ10 tin | 3.5 |
| Đ3 gửi/rút lại/khoá + chưa có khoản thu | 3.3 | Đ11 ảnh xác nhận | 3.5 |
| Đ4 ô `order.confirm.review` | 3.2 | Đ12 bỏ cờ khi chờ | 3.3 |
| Đ5 ai quyết, công tắc | 3.1, 3.3 | Đ13.1, 13.3, 13.4, 13.7 Gửi đơn | 3.4, 3.5 |
| Đ6 nới đọc có giới hạn | 2.1, 3.3 | Đ13.2 cổng lúc gửi | 3.4 |
| Đ7 Còn vé/Hết vé/Huỷ | 3.2b, 3.3 | Đ13.5 đường cũ đóng | 3.4 |
| Đ8 sửa tiền khi chờ | 3.3b (HOÃN, chủ duyệt sau) | Đ13.6 ô `order.submit` | 3.2, 3.4 |

### Task 3.1: Luật thuần — cần xác nhận (ba bước), hạn 15 phút trừ giờ đêm, ai quyết định được

**Files:**
- Create: `src/shared/xac-nhan-don.ts`, `src/shared/xac-nhan-don.test.ts`
- Create: `src/shared/gui-don-cau-bao.ts`, `src/shared/gui-don-cau-bao.test.ts` (hai câu báo nhánh, một nguồn cho máy chủ và giao diện)

**Interfaces — Produces:**
- `export function canXacNhan(i: { dichVu: readonly { ma: string | null; nhom: string | null }[]; coDichVu: ReadonlyMap<string, boolean>; coNhom: ReadonlyMap<string, boolean>; coChangDuoiMocChuaDatGap: boolean }): { can: boolean; vi: ("DICH_VU" | "DAT_GAP")[] }` — **Đ1 ba bước** cho từng dịch vụ: có dòng riêng trong `coDichVu` (khoá = `ma`) thì theo dòng đó; không có thì theo `coNhom` (khoá = `nhom` hiện hành); không có cả hai (hoặc `ma` null = dịch vụ nhập tay, không gắn cờ được) thì **không cần**. `DICH_VU` khi có ≥ 1 dịch vụ cần; `DAT_GAP` khi `coChangDuoiMocChuaDatGap` (chủ chọn A, đặc tả 5f.1). `coChangDuoiMocChuaDatGap` do route tính đúng cách `/status` tính cảnh báo mốc (`canhBaoMocCua` + `legDatGapByOrder`, ngưỡng `nguongMocVn` của `src/shared/moc-toi-thieu.ts`), kể cả ADR-0107 (Bán hàng tự đặt gấp ở các route sửa làm giảm số đơn vào `DAT_GAP`).
- `export function hanXacNhan(guiLucIso: string): string` — ISO UTC; 15 phút làm việc, bỏ 22:00–06:00 giờ VN (dùng hàm giờ VN có sẵn trong `src/shared/`, không `Date` cục bộ).
- `export type KetQuaXacNhan = "CON_VE" | "HET_VE" | "HUY"`
- `export function duocQuyetDinh(i: { laNguoiLap: boolean; laNoiBo: boolean; coQuyenXetDuyet: boolean; choTuXacNhan: boolean }): boolean` — `coQuyenXetDuyet && (!laNguoiLap || (laNoiBo && choTuXacNhan))`; `laNoiBo` = người lập không giữ PARTNER và không giữ INTERN.
- `export const CAU_BAO_GUI_DON: { A: string; B: string }` — **nguyên văn, kể cả dấu "&"**: A = «Đơn của bạn đã được gửi và chờ xác nhận», B = «Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên». Chữ này là giả định của người soạn về chỗ đặt (bề mặt, đổi được), nhưng **chữ** do chủ duyệt: bài ghim đúng từng ký tự.

- [ ] **Step 1: Bài đỏ.** `hanXacNhan` (giờ VN): gửi 10:00 → 10:15; 21:50 → 06:05 hôm sau; 21:55 → 06:10; 23:00 → 06:15; 05:59 → 06:15; 06:00 → 06:15. `canXacNhan`: dịch vụ không dòng riêng, nhóm «cần» → `can`; dịch vụ dòng riêng «không cần» + nhóm «cần» → **không** (dòng dịch vụ thắng); dịch vụ dòng riêng «cần» + nhóm «không cần» → `can`; không dòng nào → không cần; `ma` null → không cần; chặng dưới mốc, không cờ → `{can:true, vi:["DAT_GAP"]}`; cả hai → hai lý do; không gì → `{can:false, vi:[]}`. `duocQuyetDinh`: đủ bảng chân trị; INTERN/PARTNER lập thì không tự quyết dù công tắc bật. `gui-don-cau-bao.test.ts`: hai chuỗi bằng nguyên văn.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS (`node --test src/shared/xac-nhan-don.test.ts src/shared/gui-don-cau-bao.test.ts`). **Step 5:** Commit `Luật thuần bước xác nhận: cờ ba bước, hạn 15 phút trừ giờ đêm, ai được quyết định, hai câu báo Gửi đơn`.

### Task 3.2: Migration 0119 tạm + hai ô quyền + chính sách

**Files:**
- Create: `migrations/0119_yeu_cau_xac_nhan.sql` (số theo hộp trên), `src/migrations-xac-nhan.test.ts`
- Modify: `src/shared/permissions.ts` (hai ô mới; chú thích `order.modify`), `src/shared/tro-ly-cau-truc-ten.ts` (`TEN_THAO_TAC`), `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc.test.ts`, `docs/data-dictionary.json` + `npm run dict`

**Interfaces — Produces:**
- `ord_confirm_request(id, order_id NOT NULL REFERENCES orders(id), submitted_at, submitted_by, deadline_at, decided_at NULL, decided_by NULL, outcome NULL, ticket NULL, note NULL CHECK(length ≤ 300), created_at, updated_at)`; chỉ mục duy nhất một yêu cầu mở mỗi đơn: `UNIQUE(order_id) WHERE decided_at IS NULL`; trigger: UPDATE chỉ một lần, từ `decided_at IS NULL` sang đủ `decided_at/decided_by/outcome` (và `ticket` khi `outcome` ≠ `RUT_LAI`); cấm DELETE. Giá trị kiểm ở mã: `outcome` ∈ `XAC_NHAN | HUY | RUT_LAI`; `ticket` ∈ `CON_VE | HET_VE | HUY` (chính là `KetQuaXacNhan`; NULL với `RUT_LAI`).
- `ord_service_confirm_flag(id, scope, code, required INTEGER CHECK IN (0,1), valid_from_at, created_*, updated_*, UNIQUE(scope, code, valid_from_at))` chỉ-thêm (khuôn `vc_leg_template`). **Ruling 25/10:** `scope` ∈ `SERVICE | GROUP` (mã dịch vụ hoặc mã nhóm, kiểm ở mã); `required` 0/1 làm giá trị **cần / không cần** — không thêm cột trùng; dòng «không cần» ghi **tường minh** (`required = 0`) để dòng dịch vụ thắng dòng nhóm. Dòng hiệu lực = dòng mới nhất theo `valid_from_at ≤ bây giờ` của từng `(scope, code)`.
- `ord_confirm_policy(id, self_confirm_internal INTEGER CHECK IN (0,1), valid_from_at UNIQUE, …)` chỉ-thêm; gieo `self_confirm_internal = 1`.
- Ô `"order.confirm.review": row("any","any","any","any","none","any","none","none","none","none")` — thứ tự cột là `PERMISSION_CODES` (SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR).
- Ô `"order.submit": row("none","none","none","none","own","any","none","none","none","none")` (PARTNER `own`, SUPER_ADMIN `any`, còn lại `none`; đúng hàng đích ADR-0018 đ6; Toàn quyền `any` còn do bài «Toàn quyền = any ở mọi thao tác» bắt buộc). **Không** tách ô `order.confirm`; giá trị `order.modify` không đổi, chỉ đổi chú thích và `TEN_THAO_TAC["order.modify"]` (hôm nay «sửa, xác nhận, huỷ đơn») để nói rõ người lập giữ quyền Đối tác xác nhận bằng «Gửi đơn» — chữ cụ thể do người thi công chọn, có cụm «Gửi đơn».

- [ ] **Step 1: Bài đỏ.** `migrations-xac-nhan.test.ts` (khuôn `src/migrations-chon-don.test.ts`): hai yêu cầu mở cùng đơn → UNIQUE chặn; khép lần hai → trigger chặn; DELETE → chặn; policy gieo `1`; cờ `SERVICE` «không cần» và `GROUP` «cần» cùng tồn tại; cùng `(scope, code, valid_from_at)` hai lần → UNIQUE chặn. `permissions.test.ts`: bảng `ADR` khớp từng ô + ba bài ghim hàng DRIVER / DRIVER_PARTNER / HR cho cả hai ô (4 bài đỏ theo đo 25/10); `xem-don-theo-quyen.test.ts`: ghim hàng PARTNER; `tro-ly-cau-truc.test.ts`: `TEN_THAO_TAC` đủ hai ô (5 bài đỏ); chạy `node scripts/sinh-so-do-trang.mjs` để sinh lại tệp sinh của trợ lý.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm run typecheck && npm run db:migrate:local` PASS; `npm test` **còn đỏ có chủ đích** ở `src/permission-enforcement.test.ts` (và `route-access`) vì chưa có lời gọi `can(…,"order.confirm.review")` (đến Task 3.3) và `can(…,"order.submit")` (đến Task 3.4) — ghi rõ trong commit; hai ô thì số bài đỏ nhiều hơn số đo 25/10 (đo cho một ô).
- [ ] **Step 5:** Commit `Migration 0119: yêu cầu xác nhận, cờ dịch vụ/nhóm cần xác nhận, công tắc tự xác nhận; ô order.confirm.review và order.submit`.

### Task 3.2b: Tách lô xác nhận dùng chung (không đổi hành vi) — làm TRƯỚC Task 3.3

**Files:**
- Modify: `src/modules/orders/repository.ts`: `confirmOrder` hôm nay tự gọi `db.batch`; tách thành `soanXacNhan(...)` **trả mảng câu chưa chạy kèm bản chụp mức** (khuôn `soanHuyDon`), `confirmOrder` thành vỏ mỏng gọi `db.batch` — bản chụp mức (`docBangChoChup`, `chupDon`, `kemChup`) đi cùng mảng câu, nếu bỏ sót thì hoa hồng của đơn Còn vé / Gửi đơn nhánh B không được chụp (lỗi tiền âm thầm).
- Create: `src/modules/orders/xac-nhan-chung.ts` — nơi đặt `kiemCongXacNhan`, `chanDoanXacNhan` và các hàm riêng đang nằm trong `index.ts` mà cả `index.ts` lẫn `xac-nhan-route.ts` (3.3) cần (`chayLoNoiChuyen`, nhánh `STALE`/`RACED`/`GIA_DANH_MUC`, `canhBaoMocCua`): **tránh vòng import** `index.ts` ↔ `xac-nhan-route.ts`. `chanDoanXacNhan` là hàm thứ ba dùng chung: dịch kết quả thua của lô (`incomplete_trip`, `short_notice_required`, `STALE`) và lỗi trigger (`order_subtotal_mismatch`, `terms_*`) ở `/status` thành phản hồi — ba nơi gọi (`/status`, `quyet-dinh`, `gui-don` B) không chép lại. `src/modules/orders/chang-hanh-khach-repo.ts` (nửa nghiêm) vào Files: `ORDER_CONFIRM` nhận thêm vế điều kiện «yêu cầu còn mở» và `auditStatement` có id riêng cho khuôn `wonGuard` — **không** so `updated_at = at` để suy ra ai thắng (`nextStamp` có thể cho hai người cùng mốc).
- Modify: `src/modules/orders/index.ts`: các cổng nằm rải trong thân nhánh `confirmed` của `POST /api/orders/:id/status` (R2 giá danh mục, người lớn, chọn Đón/Không đón, mốc + đặt gấp, R3 trần giảm giá) gom thành **một** hàm `kiemCongXacNhan(i: { actor: StaffProfile; order: OrderRow; kiemMoc: boolean; mocToiThieu: MocToiThieu | null }): Promise<{ loi: Response } | { ok: true; chup: BanChup }>`; `mocToiThieu` truyền vào (route vẫn gọi `ctx.mocToiThieu` MỘT lần mỗi request, TC-26). `/status` gọi lại hai hàm này.
- Test: bài hiện có (`dat-gap*.test.ts`, `tran-giam-gia-don.test.ts`, `thuc-tap-gia-route.test.ts`, `chup-bu` và e2e `orders`, `chang-hanh-khach`) phải xanh **trước và sau** — đây là tách thuần.

**Interfaces — Produces:** `soanXacNhan`, `kiemCongXacNhan` (chữ ký trên), dùng bởi `/status`, `quyet-dinh` (3.3), `gui-don` nhánh B (3.4).

- [ ] **Step 1:** Chạy `npm test` và `npm run test:e2e -- orders chang-hanh-khach` **trước khi sửa**, ghi kết quả. Viết bài mới `src/modules/orders/soan-xac-nhan.test.ts`: với một đơn mẫu, danh sách câu và bản chụp của `soanXacNhan` bằng đúng những gì lô cũ chạy (đỏ vì hàm chưa có).
- [ ] **Step 2:** FAIL. **Step 3:** Tách. **Step 4:** cùng hai lệnh Step 1 cho kết quả **y hệt** + `npm run typecheck`. **Step 5:** Commit `Tách lô xác nhận đơn thành hàm dùng chung (không đổi hành vi)`.

### Task 3.3: Route gửi xác nhận / rút lại / quyết định / danh sách chờ / cài đặt cờ

**Files:**
- Create: `src/modules/orders/xac-nhan-repo.ts` (nửa nghiêm, `defineSql`; thêm vào `NUA_NGHIEM` trong `src/architecture.test.ts`; đọc cờ bằng view `v_ctl_service_group` để lấy nhóm hiện hành của mã dịch vụ), `src/modules/orders/xac-nhan-route.ts` (đăng ký từ `index.ts`)
- Modify: `src/shared/router.ts` (`Ctx` thêm `daThuCuaDon`), `src/index.ts` (tiêm), `src/modules/billing/index.ts` (export `daThuCuaDon`)
- Modify: `src/modules/orders/index.ts` — nhánh `confirmed` của `POST /api/orders/:id/status`: nếu `canXacNhan(...).can` → 409 `confirm_request_required` ("Đơn có dịch vụ cần xác nhận, hãy bấm Gửi xác nhận.") — đặt SAU cổng `partner_submit_required` của Task 3.4.
- Modify: `src/shared/audit-actions.ts` + `lich-su-noi-bo.ts` + `lich-su-doi-tac.ts`: `order_confirm_requested`, `order_confirm_withdrawn`, `confirm_flag_changed`, `confirm_policy_changed` (quyết định dùng lại `confirmed`/`cancelled`, `detail` «Còn vé»/«Hết vé»).
- Test: `tests/e2e/xac-nhan-don.mjs` (vào `ALL`, `THOI_GIAN` của `run.mjs`), `src/modules/orders/xac-nhan-route.test.ts`
- Bài cũ phải sửa vì `/status` nay trả `confirm_request_required` (không còn `short_notice_required`) với đơn có chặng dưới mốc và thuộc diện cần xác nhận: `src/modules/orders/dat-gap.test.ts`, `dat-gap-sat-gio.test.ts`, `cam-ket-chang.test.ts`, `o-moi-chang.test.ts`, `thay-chang-route.test.ts`, e2e `chang-hanh-khach.mjs` — **đo lại khi làm** (số đo 25/10 không phủ). Đơn tự đặt gấp qua ADR-0107 không thuộc diện này.

**Interfaces — Consumes:** `canXacNhan`, `hanXacNhan`, `duocQuyetDinh`, `KetQuaXacNhan` (3.1); `thieuChonDon` (`src/shared/cong-chon-don.ts`); `xemDuocDon` (2.1); `cauHuyCoLyDo` (`huy-don-repo.ts`), `docLyDoHuy` (`src/shared/ly-do-huy.ts`), `soanXacNhan`, `kiemCongXacNhan` (3.2b).
**Interfaces — Produces:**
- `ctx.daThuCuaDon: (orderId: string) => Promise<number | null>` — gốc lắp ráp tiêm (`orders` KHÔNG đọc `bil_`, ADR-0024 đ4; khuôn `nhapKeToanCuaDon`); billing trả `daThu` ròng của `tienNhieuDon` (người thi công xác nhận nó đã trừ dòng đảo; nếu chưa thì tính tổng dòng gốc trừ dòng đảo). `null` = không tiêm (khung thử) ⇒ route **từ chối kín**: 503 `khoan_thu_chua_kiem` (khuôn `mocToiThieu`), không đoán «chưa có». **Định nghĩa «đã có khoản thu» = `daThu > 0`.**
- `POST /api/orders/:id/gui-xac-nhan` (cổng `orders`; người lập; `can(staff,"order.modify",{ownerId,assigned})`; đơn `draft`; `canXacNhan.can` đúng — sai thì 409 `confirm_not_required`; `thieuChonDon` rỗng; chưa có yêu cầu mở — có thì 409 `confirm_already_open`; **`daThuCuaDon` = 0 — có tiền thì 409 `confirm_blocked_has_payment` ("Đơn đã có khoản thu nên chưa gửi xác nhận được. Hãy báo Kế toán.")**) → 201 `{ yeuCau: YeuCauXacNhanDto }`; nhật ký `order_confirm_requested`; `baoThayDoi({thayDoi:"cho_xac_nhan"})`. **Phân nhánh theo mốc:** chặng dưới mốc chưa đặt gấp KHÔNG bị từ chối ở bước gửi — chính nó làm đơn thuộc diện cần xác nhận (`DAT_GAP`); mốc chỉ được kiểm lại lúc Còn vé. Không chạy R2/R3 ở bước này (Đ3 không liệt kê; giá của Thực tập xét theo người bấm Còn vé).
- `POST /api/orders/:id/rut-xac-nhan` (người lập; `order.modify`) → 200; yêu cầu `outcome = RUT_LAI`.
- `POST /api/orders/:id/quyet-dinh` thân `{ ketQua: KetQuaXacNhan; ngayDi?: string; gioDon?: { legId: string; pickupTime: string; pickupSlotEnd?: string }[]; lyDo?: string; ghiChu?: string; yeuCauId: string; updatedAt: string }` (`yeuCauId` = yêu cầu người xét duyệt đã đọc; Rút lại rồi Gửi lại y nguyên là yêu cầu KHÁC → 409) (sửa tiền đi route `money-edit`, không đi route này); kiểm `can(staff,"order.confirm.review")` + `duocQuyetDinh`; `CON_VE` → MỘT `db.batch` dựng từ `soanXacNhan` (kèm bản chụp mức), **thứ tự: (0) KIỂM TRƯỚC khi ghi** — mốc tối thiểu / đặt gấp tính trên **giờ và ngày MỚI** (cùng `canhBaoMocCua`, `nguongMocVn`, `confirmWindow`); dưới mốc chưa đặt gấp thì 409 `short_notice_required`, **không** ghi gì (nếu không người xét duyệt đổi sang khung sớm hơn để qua mặt mốc 6 giờ, vốn KHÔNG tắt được); **(1) đổi ngày / giờ đón** (điều kiện `EXISTS` yêu cầu `yeuCauId` còn mở — khuôn `LEG_UPDATE_GUARDED`) **→ (2) câu xác nhận đơn** (cùng điều kiện + khoá lạc quan) **→ (3) khép yêu cầu** (`XAC_NHAN`,`CON_VE`; điều kiện: đơn vừa thành `confirmed` bởi chính lô này). *Lệch nhỏ so với chữ ADR Đ7 «đổi giờ → khép → xác nhận»:* khép đứng SAU xác nhận, để câu xác nhận thua (mốc, `STALE`) không để lại yêu cầu đã khép mà đơn vẫn nháp; hành vi nhìn thấy được giống nhau; ghi ở nhật ký thi công và báo chủ. D1 chạy lô tuần tự không xen kẽ, nên bên thua thấy yêu cầu đã khép và mọi câu ghi của nó không ghi được dòng nào. Đổi ngày/giờ, **giả định của người soạn** (ADR chỉ nói "đổi ngày / giờ đón (nếu có)"): ghi `pickup_time`/`pickup_slot_end` của chặng đón còn mở (giờ phải thuộc khung ADR-0134 hoặc "Giờ khác" hợp lệ) và ngày đi của đơn (không quá khứ, giờ VN); sai → 400 `doi_gio_khong_hop_le`; nhật ký `confirmed` ghi «Còn vé, đổi giờ». `HET_VE` → đường huỷ của `/status` (`soanHuyDon` + `dongBoChuyen` + `chayLoNoiChuyen`, ADR-0104 Đ2) với `HET_CHO` **rồi mới** khép yêu cầu (`HUY`,`HET_VE`) — huỷ thua (khoá `updated_at`, gộp hồ sơ vẫn đổi mốc của nháp) thì yêu cầu còn mở; câu khác đứng sau cặp lý do–huỷ vì `daHuy` đọc kết quả của nó (`repository.ts`, `cauHuyCoLyDo`) — **không** hỏi `order.cancel.classify` (ngoại lệ ADR-0089 đ8); `HUY` → `docLyDoHuy` như hộp huỷ hiện có (có hỏi ô đó). Thắng/thua theo khuôn `wonGuard` (src/CLAUDE.md "Dữ liệu"); thua → 409 `RACED`. D1 không hoàn tác câu đã chạy khi câu sau có điều kiện trả `changes() = 0` (chỉ lỗi SQL mới hoàn tác cả lô) — vì vậy câu ghi đứng sau cùng điều kiện với câu thắng, và bài đua thử **cả hai chiều thua** (thua ở yêu cầu; thua ở khoá `updated_at` do Kế toán vừa sửa tiền) với kết quả: đơn, yêu cầu, chặng không lệch nhau.
- `GET /api/orders/cho-xac-nhan` (cổng `orders`, `can(staff,"order.confirm.review")`; khai như `GET /api/orders/pool`, trước `:id`) → `{ don: DonChoXacNhanDto[] }` (mã đơn, dịch vụ, ngày, số khách, giờ đón, tổng tiền, `hanLuc`, `quaHan`, nhãn «Cần Quản trị đặt gấp» khi `vi` có `DAT_GAP`) — KHÔNG tên khách/SĐT/email.
- `GET|POST /api/cai-dat/xac-nhan-don` (cổng `admin`, `settings.ops`): `GET` → `{ dongCo: {pham:"SERVICE"|"GROUP"; ma:string; canXacNhan:boolean}[]; tuXacNhanNoiBo:boolean }`; `POST` một thay đổi một lần (khuôn `/api/cai-dat/nhap-tay`); mã dịch vụ nhập tay (không mã) → 400.
- **Nới đọc (Đ6)** trong các route đọc của Task 2.1: truyền `dangCho` thật và `xetDuyetDuoc = can(staff,"order.confirm.review")`. DTO chi tiết cho người xét duyệt **không phải người lập**: bỏ `customerPhone`, `customerEmail`, `customerNote`, `paymentNote`, liên hệ người đặt (chỉ giữ `bookerName`) và họ tên, năm sinh hành khách; người xét duyệt đi **nhánh riêng**, bỏ qua cổng `money.view` / `contact.view` của `GET /api/orders/:id` (nếu không HDV chưa phụ trách nhận 403 `FORBIDDEN_VIEW`) và **không** dùng DTO hẹp của Đối tác (`holdsPartner`, kể cả tài khoản lai): cắt trường thay vì 403; **cách đọc của người soạn** (Đ6 chỉ liệt kê "dịch vụ, ngày, số khách, giờ đón, tiền"): `GET …/passengers`, biên nhận và QR của đơn chờ vẫn 404 với người xét duyệt không phải người lập — người kiểm xem lại.
- **Khoá khi chờ (Đ3):** một hàm `khoaKhiCho` gọi ở đầu mọi route ghi của người lập (cùng danh sách Task 2.3, **trừ** `short-notice` và `money-edit` đã nói ở đó; ô `order.leg.short_notice` của Bán hàng là `any` nên người lập Bán hàng đặt gấp lúc chờ là theo ô — không chặn thêm) → 409 `confirm_pending_locked` ("Đơn đang chờ xác nhận, hãy Rút lại trước khi sửa."), **kể cả `PUT …/booker`** (trang ghép 25/10 mục 5.4).
- **Sửa tiền khi chờ (Đ8): TÁCH RA Task 3.3b — HOÃN (chủ 26/10: «Hoãn phần này, làm phần còn lại trước»); không thi công cùng Đợt 3, và không phần nào khác của Đợt 2 + 3 được phụ thuộc vào nó.** Lý do (người kiểm vòng hai, đọc mã): đường điều chỉnh số khách chưa từng chạy trên đơn nháp; dòng điều chỉnh không đụng `orders.updated_at`; đường xác nhận đọc số đã lưu chứ không áp điều chỉnh (mã tự ghi «đơn nháp: chưa có dòng điều chỉnh»), nên bản chụp mức hoa hồng, trần giảm giá R3 và `khachLucXacNhan` tính từ số cũ; lưu nháp lại xoá–chèn dịch vụ làm dòng điều chỉnh trỏ mã đã mất. Tất cả liên quan tiền → CLAUDE.md §3.
- **Lịch chung (ADR-0135 Đ9):** `legLichChungNhapRows` lấy nháp có yêu cầu mở (nối với `ord_confirm_request`), thay phần "tắt" của Task 2.3.

- [ ] **Step 1: Bài đỏ** `xac-nhan-don.mjs` (người lập ở các ca dưới là **Bán hàng hoặc Thực tập**; ca Đối tác nằm ở Task 3.4 vì cần Gửi đơn):
  - (a) Toàn quyền đánh dấu mã X cần xác nhận; Bán hàng lập đơn X → `/status` confirmed 409 `confirm_request_required`; gửi → 201; Bán hàng tự quyết khi công tắc tắt → 403.
  - (b) Kế toán xem `cho-xac-nhan` thấy đơn, không SĐT/email; HDV chưa phụ trách thấy; HCNS 403; chi tiết đơn chờ cho Kế toán 200 không SĐT/email/liên hệ, tiền chỉ đọc (Review Focus 8); `…/passengers` 404.
  - (c) Kế toán `CON_VE` đổi giờ 08:30 → đơn `confirmed`, chặng 08:30, yêu cầu khép (`XAC_NHAN`/`CON_VE`).
  - (d) **Kế toán (không giữ `order.cancel.classify`)** `HET_VE` → `cancelled`, lý do `HET_CHO`; `HUY` lý do khác → như hộp huỷ.
  - (e) Đua: hai lời quyết định song song → đúng một 200, một 409, đúng một dòng quyết định (Review Focus 3).
  - (f) Bán hàng lập, công tắc bật, tự quyết đơn mình → 200; Toàn quyền tắt công tắc → 403; Thực tập lập → không bao giờ tự quyết.
  - (g) Bỏ cờ X khi đơn đang chờ → vẫn quyết định được; nháp mới của X không còn phải gửi (Review Focus 4, Đ12).
  - (i) Chặng dưới mốc → `CON_VE` 409 `short_notice_required` như hôm nay (chỉ ở Còn vé; `/status` nay trả `confirm_request_required`).
  - (j) Đơn trộn dịch vụ thường + X → phải gửi (Review Focus 1).
  - (k) Cờ ba bước (Đ1): cờ `GROUP` «cần» cho nhóm G → đơn có dịch vụ thuộc G phải gửi; thêm dòng `SERVICE` «không cần» cho dịch vụ S của G → đơn chỉ có S không phải gửi; ngược lại dòng `SERVICE` «cần» thắng nhóm «không cần»; đổi nhóm của S → theo nhóm hiện hành; cờ mã nhập tay → 400.
  - (l) Người lập `PUT /:id`, `PUT …/booker`, `POST …/legs`, `POST …/passengers` khi đang chờ → 409 `confirm_pending_locked`; rút lại → `PUT` 200 (Review Focus 9).
  - (m) Bán hàng lập đơn KHÔNG có dịch vụ cờ, chặng đón cách 1 giờ (dưới mốc) → `/status` confirmed 409 `confirm_request_required`; gửi → 201 (**không** bị từ chối vì mốc); Kế toán thấy đơn trong danh sách chờ nhãn «Cần Quản trị đặt gấp», `CON_VE` → 409 `short_notice_required`; Quản trị đặt gấp rồi `CON_VE` → 200 (đặc tả 5f.1).
  - (n) **Chưa có khoản thu (Đ3, tiêu chí 7):** nháp có khoản thu (gieo qua khung thử) → `gui-xac-nhan` 409 `confirm_blocked_has_payment`, không dòng yêu cầu, đơn vẫn `draft`; khung thử không tiêm `daThuCuaDon` → 503 `khoan_thu_chua_kiem`.
  - (p) Chủ 26/10: tài khoản lai theo kiểu «một trong hai là đủ» — hợp quyền, đúng cách `can()` đang làm, có vai nào thì có quyền của vai đó; không nới Đ13.5 (người lập giữ Đối tác vẫn 409) và ADR-0135 Đ2 (nháp người khác vẫn 404). Ca: tài khoản lai Bán hàng + Đối tác quyết định đơn **chờ của người khác** → 200 (qua hàng `SALES` của `order.confirm.review`); đơn chờ của chính họ → 403.
  - (q) Lịch chung điều phối: chặng nháp chỉ hiện khi có yêu cầu mở.
  - (r) Tài khoản lai Bán hàng + Đối tác mở chi tiết đơn **chờ của người khác** → 200 với DTO đã cắt như người xét duyệt (không phải DTO hẹp của Đối tác); HDV chưa phụ trách (không `contact.view`) → 200 đã cắt, không 403.
  Bài thuần `xac-nhan-route.test.ts`: `khoaKhiCho`; DTO danh sách không có khoá tên/điện thoại/email.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run test:e2e -- xac-nhan-don nhap-rieng-tu orders permissions chong-ghi-trung dong-bo-chuyen` → PASS, **ngoại trừ** `permission-enforcement.test.ts` cho ô `order.submit` (xanh ở Task 3.4); route mới vào `route-write-guard` và `route-access` (thêm dòng ở đây, không ở 3.2).
- [ ] **Step 5:** Commit `Route gửi xác nhận, rút lại, quyết định; danh sách chờ; cờ dịch vụ/nhóm; chặn gửi khi đơn đã có khoản thu`.

### Task 3.3b: Sửa tiền khi đơn đang chờ (Đ8) — HOÃN, CHỦ DUYỆT SAU

**Trạng thái: HOÃN — chờ chủ duyệt sau** (chủ 26/10, nguyên văn: «Hoãn phần này, làm phần còn lại trước»). Phát hành Đợt 2 + 3 **không** có phần này: người khác (Kế toán, Quản trị) không sửa tiền được trên đơn đang chờ; muốn đổi tiền thì chọn Huỷ (kèm lý do) và người lập lập lại. Tiêu chí nghiệm thu 8 của ADR-0136 (Kế toán sửa giá rồi Còn vé) thuộc về task này, nên hoãn theo; ghi vào nhật ký thi công. Hai hướng dưới đây giữ nguyên để chủ chọn sau.

**Đã chốt (chủ):** giữ ADR-0023 đ4 — lý do là **mã đóng** trong `LY_DO_SUA_SO_KHACH` (`src/shared/so-khach-van-phong.ts`), không chữ tự gõ vào nhật ký (26/10); **số tiền phải đúng và khớp**: máy chủ tự tính lại bằng `planMoneyEdit`, không nhận số tiền từ trình duyệt (`docThanSuaSoKhach` đã từ chối mọi khoá ngoài `lyDo`, `services` bằng 400 `invalid_input` — **không** thêm mã `tien_khong_khop`).
**Chưa chốt (phải hỏi chủ, một câu):** ADR chỉ nói «sửa tiền khi chờ» chứ không nói đường nào. Hai hướng, cả hai chạm tiền:
- **Hướng 1 — xác nhận đọc số hiện hành đã áp điều chỉnh:** mở `POST /api/orders/:id/money-edit` cho nháp đang chờ (người không phải người lập, `can(staff,"order.money.edit",{ownerId})`, **không** truyền `assigned` — ADR-0135 Đ5); đường xác nhận (`soanXacNhan`) đọc số đã áp điều chỉnh và lô khoá theo `adj_seq` (khuôn `hoan-tat-repo.ts`); bản chụp mức, R3, `khachLucXacNhan` tính từ số hiện hành.
- **Hướng 2 — không cho sửa tiền khi chờ:** Kế toán/Quản trị chọn Huỷ (kèm lý do) và người lập lập lại; bỏ Đ8 khỏi phát hành này, ghi nợ. Rẻ nhất, an toàn nhất, nhưng trái chữ Đ8 đã duyệt → cần chủ đồng ý bỏ.
**Bài đỏ khi đã chọn Hướng 1:** (h) thân có chữ lý do tự gõ hoặc số tiền → 400 `invalid_input`; có mã lý do hợp lệ → 200, nhật ký có mã; người lập Thực tập không sửa được tiền; (h2) sửa số khách khi chờ → tổng do máy chủ tính, bằng tổng các dòng; `node scripts/audit-invariants.mjs --db local` thoát 0 **và** thêm bất biến kiểm dòng điều chỉnh trên đơn nháp (hôm nay không có kiểm nào, người kiểm không thấy `order_money_adjustment` trong `scripts/audit-invariants.mjs`); (o) Thực tập gửi đơn cần xác nhận, Kế toán sửa số khách một dòng (có mã lý do) rồi `CON_VE` → 200, luật giá không chặn (xét theo người bấm), **hoa hồng chụp khớp tiền hiệu lực**; (đua) sửa tiền chen giữa lúc bấm Còn vé → bên Còn vé thua 409 `STALE` hoặc dùng số mới — không bao giờ chụp số cũ; Rút lại → sửa → Gửi lại: dòng điều chỉnh cũ không mất lặng lẽ (cảnh báo hoặc vô hiệu có ghi nhật ký).


### Task 3.4: «Gửi đơn» của Đối tác + đóng đường cũ (Đ13) — làm TRƯỚC khi bật 409 ở `/status`

> **Thứ tự bắt buộc để `npm test` xanh ở mọi commit:** (1) lô xác nhận dùng chung đã tách ở Task 3.2b; (2) thêm route Gửi đơn; (3) **cùng một commit**: bật 409 `partner_submit_required` và chuyển mọi bài/kịch bản đang cho phiên Đối tác (hoặc tài khoản lai) tự xác nhận sang Gửi đơn. Đo ngày 25/10 (trang ghép 25/10 mục 6): ≥ 36 bài trong 10 tệp đỏ khi cổng chặn mọi người giữ PARTNER; cổng chặn chỉ người lập đỏ ít hơn — đo lại.

**Files:**
- Modify: `src/modules/orders/index.ts`: `/status` và `gui-don` dùng `kiemCongXacNhan` / `soanXacNhan` đã tách ở Task 3.2b (tham số `kiemMoc=false` ở bước phân nhánh lúc gửi); `confirmOrder`/`soanXacNhan` thêm tham số `ghiChu?: string` cho nhật ký `confirmed`.
- Create: route `POST /api/orders/:id/gui-don` trong `xac-nhan-route.ts`; `src/shared/permissions.ts` đã có ô (Task 3.2)
- Modify: `/status` nhánh confirmed và `POST …/gui-xac-nhan`: cổng `partner_submit_required` (xem dưới)
- Test: `tests/e2e/gui-don.mjs`, `src/modules/orders/gui-don-route.test.ts`; sửa: `src/so-la-doi-tac.test.ts` (10), `src/modules/orders/thuong-mai-route.test.ts` (10), `src/modules/thongbao/tin-doi-hop.test.ts` (4), `src/modules/orders/thuc-tap-gia-route.test.ts` (3), `src/lich-su-don-doi-tac.test.ts` (2), `src/modules/orders/ben-dat-doi-tac.test.ts` (2), `src/modules/orders/tran-giam-gia-don.test.ts` (2), `src/modules/orders/dat-gap.test.ts` (1), `src/modules/orders/hanh-khach-route.test.ts` (1), `src/so-la-thuong-mai-toan-nen-tang.test.ts` (1); e2e `nhap-tay-va-gia-doi-tac.mjs` (các lời gọi `confirm(P…)`), `nhap-ke-toan.mjs` (`donXacNhan` với phiên Đối tác, lai Bán hàng + Đối tác, lai Đối tác + HDV), `so-dai-ly-dot-2.mjs` (Đối tác tự xác nhận; vòng lặp «Đối tác không được hưởng» và tài khoản lai đang mong 403 câu Đối tác nay là 409). Cách sửa: gọi Gửi đơn thay `/status`. Bài R-N1-12 **giữ nguyên**.

**Interfaces — Produces (giả định của người soạn, ADR không đặt tên; bề mặt, đổi được):**
- `POST /api/orders/:id/gui-don` → nhánh A **201** `{ nhanh: "A"; thongBao: string; yeuCau: YeuCauXacNhanDto }`, nhánh B **200** `{ nhanh: "B"; thongBao: string }`; `thongBao` lấy từ `CAU_BAO_GUI_DON` (3.1). Khai `GuiDonResponse` trong `src/shared/contracts.ts`.
- **Thứ tự cổng** (mỗi cổng một mã/câu tiếng Việt): `can(staff,"order.submit",{ownerId})` → 403 (Thực tập); đọc đơn: không phải đơn nháp của người gọi → 404 (kể cả Toàn quyền gửi nháp người khác); đơn không `draft` → 409 `order_not_draft`; đã có yêu cầu mở → 409 `confirm_already_open`; `thieuChonDon` → 409 `pickup_choice_required`; `kiemCongXacNhan` (R2, R3, người lớn, theo **người gửi** — Đ13.2) → lỗi của đúng cổng đó; rồi phân nhánh bằng `canXacNhan`. **Cổng hỏng thì đơn ở lại nháp (đã lưu), không câu báo thứ ba.** (Cổng luật bán: không có ở kế hoạch này.) Ô `order.submit` là cổng duy nhất của quyền: **không** thêm kiểm `holdsPartner` — Toàn quyền không giữ PARTNER vẫn Gửi đơn được nháp của chính mình (giả định của người soạn).
- **Nhánh A** (`canXacNhan.can`, gồm chặng dưới mốc chưa đặt gấp — **không** bị từ chối vì mốc, cách đọc Đ13.2 ↔ Đ13.3 của người soạn: «mốc tối thiểu» ở nhánh A được kiểm lại lúc Còn vé): thêm cổng `daThuCuaDon = 0` (409 `confirm_blocked_has_payment`; null → 503); mở yêu cầu như `gui-xac-nhan`; nhật ký `order_confirm_requested`; tin gửi cho người giữ `order.confirm.review`. `canXacNhan` cần `ctx.mocToiThieu()` để tính `coChangDuoiMocChuaDatGap`: thiếu mốc → 503 `moc_toi_thieu_chua_co` như hôm nay (`gui-xac-nhan` cũng vậy), không đoán.
- **Nhánh B** (còn lại): chạy `confirmOrder` qua đủ lô hôm nay (chụp mức, mốc tối thiểu) **ngay trong lần gửi**, nhật ký `confirmed` ghi chú «tự xác nhận khi Đối tác gửi đơn»; đơn vào hàng chờ nhận; Bảng tin / tin như khi Đối tác tự xác nhận hôm nay, **người gửi không nhận tin «đã xác nhận»** về việc chính mình vừa làm (Đ10). Nhánh B **không** kiểm khoản thu (không mở đường tới TNV-G1).
- **Gửi đơn lần hai** (sau A hoặc B) → 409, không thêm dòng yêu cầu thứ hai.
- **Cổng `partner_submit_required`:** điều kiện = người gọi **là người lập đơn VÀ** `holdsPartner(staff)` (không cần tra quyền người lập vì nháp riêng tư). Đặt **ngay sau `can()`**, trước mọi cổng khác, ở **cấp route** của `POST /api/orders/:id/status` (nhánh `confirmed`) và `POST …/gui-xac-nhan` — **không** nằm trong `kiemCongXacNhan`, nếu không Gửi đơn nhánh B tự chặn mình. Phải là luật ở route vì `can()` lấy hợp các ô (tài khoản lai Bán hàng + Đối tác lọt qua hàng `SALES` của `order.modify`). Chỉ chặn **người lập**. Người giữ PARTNER không phải người lập vẫn quyết định được đơn chờ của người khác qua `order.confirm.review` (hàng `SALES`, đúng vai người phụ trách của ADR-0009); **không** cố giữ đường người phụ trách xác nhận nháp thường của người khác — ADR-0135 Đ2 (Đợt 2) đóng nó. Đây là hệ quả của ADR-0135 Đ2 lên câu thứ ba của Đ13.5 và tiêu chí nghiệm thu 4 của ADR-0136: **chủ chốt 26/10: «Đơn chờ thì quyết định được, nháp thường thì không»** (khớp ADR-0135 Đ2). Chữ câu thứ ba của Đ13.5 và tiêu chí nghiệm thu 4 («vẫn như hôm nay») phải hiểu hẹp lại: chỉ đơn **đang chờ**. ADR không sửa; ghi ở «Lệch cần chủ xử lý» của nhật ký thi công để chủ ra dòng bổ sung sau. Huỷ đơn của chính mình giữ như hôm nay.

- [ ] **Step 1: Bài đỏ** `gui-don.mjs` (phiên Đối tác thuần, lai Bán hàng + Đối tác, Thực tập, Toàn quyền):
  - (1) Đối tác lập đơn có dịch vụ thuộc nhóm «cần» → `gui-don` 201, `nhanh:"A"`, câu A nguyên văn, đơn vẫn `draft`, có một dòng yêu cầu mở; Đối tác `rut-xac-nhan` được.
  - (2) Đối tác gửi đơn không dịch vụ cần và không chặng dưới mốc → 200, `nhanh:"B"`, câu B nguyên văn, đơn `confirmed`, có trong hàng chờ nhận, nhật ký `confirmed` có «tự xác nhận khi Đối tác gửi đơn», Đối tác không nhận tin «đã xác nhận».
  - (3) Đối tác, không dịch vụ cờ, chặng dưới mốc → 201, nhánh A, `vi` có `DAT_GAP` (đặc tả 5f.1; **không** 409 `short_notice_required` lúc gửi).
  - (4) **Đ13.5 (sửa ca (a) của kế hoạch 19/10):** Đối tác lập đơn có dịch vụ cần xác nhận → `/status` confirmed nhận **409 `partner_submit_required`** (trước đây mong `confirm_request_required`); `gui-xac-nhan` cũng 409 `partner_submit_required`; phải gửi bằng `gui-don`. Tài khoản lai Bán hàng + Đối tác lập đơn → `/status` confirmed 409 `partner_submit_required`; lai quyết định (Còn vé) đơn **chờ của người khác** qua `quyet-dinh` → 200, còn nháp thường của người khác → 404 (hệ quả ADR-0135 Đ2: đường «người phụ trách xác nhận nháp của người khác» của ADR-0009 không còn; cách đọc của người soạn, báo chủ); Đối tác huỷ đơn mình kèm lý do → như hôm nay.
  - (5) Gửi đơn khi một cổng hỏng (thiếu chọn Đón, giá danh mục vừa đổi so với danh mục, thiếu người lớn) → đúng lỗi cổng đó, đơn vẫn `draft`, không mở yêu cầu.
  - (6) Thực tập gọi `gui-don` → 403; Toàn quyền gọi `gui-don` cho nháp của người khác → 404; gọi lần hai sau thành công → 409, một dòng yêu cầu.
  - (7) Gửi đơn nhánh A với đơn đã có khoản thu → 409 `confirm_blocked_has_payment`, đơn nháp, không yêu cầu; nhánh B với đơn có khoản thu → vẫn xác nhận.
  Bài thuần: `kiemCongXacNhan` không tự chặn khi gọi từ Gửi đơn; khung thử `permission-enforcement` thấy lời gọi `can(…,"order.submit")`.
- [ ] **Step 2:** FAIL. **Step 3:** Làm theo thứ tự (1)→(2)→(3) ở hộp trên; commit 1 `Route Gửi đơn (nhánh A/B), dùng lô đã tách ở 3.2b`, commit 2 `Đóng đường Xác nhận / Gửi xác nhận cũ với người lập giữ quyền Đối tác; chuyển bài và kịch bản sang Gửi đơn`.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run test:e2e -- gui-don xac-nhan-don nhap-tay-va-gia-doi-tac nhap-ke-toan so-dai-ly-dot-2 orders permissions` → PASS.
- [ ] **Step 5 (sổ hàng rào, CLAUDE.md §3):** các bài R2, R3, K1, D-1 từng đi qua `/status` bằng phiên Đối tác nay đi qua Gửi đơn: **quan sát lại đỏ → xanh** (sửa cố ý → đỏ → hoàn nguyên) rồi cập nhật ngày ở `docs/SO-HANG-RAO.md` cho giá Đối tác (DK-T3-01), giá Thực tập (ADR-0100), K1, lịch sử đơn Đối tác, trần giảm giá và các dòng liên quan; dòng chưa có ngày quan sát mới coi là lời khuyên.
- [ ] **Step 6:** Commit sổ hàng rào `Sổ hàng rào: quan sát lại các cổng giá/K1 qua Gửi đơn`.

### Task 3.5: Giao diện xác nhận + «Gửi đơn» + Trang chủ + ảnh xác nhận + Trợ giúp Đối tác

**Files:**
- Modify: `src/shared/order-view.ts` `orderActions(status, canModify, canEditTrip, cho?: { canXacNhan: boolean; dangCho: boolean; quyetDinhDuoc: boolean; giuDoiTacLap: boolean })` → thêm `send`, `withdraw`, `decide`, `submit`; `confirm` chỉ khi `!canXacNhan` và `!giuDoiTacLap`; người lập giữ PARTNER: `submit` (nháp), `withdraw` (đang chờ), không `confirm`/`send`.
- Modify: `web/order-form.ts` — người lập giữ PARTNER thấy nút chính **«Gửi đơn»** thay «Lưu, chờ xác nhận» (bấm = lưu rồi gửi); form sửa nháp giữ «Lưu thay đổi»; trang đơn nháp có nút Gửi đơn. Sau lưu **thành công** mà gửi **thất bại**: chuyển sang trang đơn nháp vừa tạo (`id` đã có) kèm câu lỗi, **không** để bấm lần hai tạo nháp trùng. `web/dat-gap-ui.ts` có ghi chú coi «Lưu, chờ xác nhận» là nút chính — xét lại khi đổi nhãn. Hai câu báo A/B từ `CAU_BAO_GUI_DON`; ở nhánh B, câu báo hiện **trước**, rồi hộp ảnh tự mở như hôm nay (Đ13.7).
- Modify: `web/order.ts` — nút «Gửi xác nhận» (không giữ PARTNER) / «Rút lại»; nút «Xác nhận đơn» ẩn với người lập giữ PARTNER; dải «Chờ xác nhận · còn N phút» (hoặc «Quá hạn»); bảng «Xác nhận đơn» (Còn vé / Hết vé / Huỷ kèm lý do, sửa ngày + giờ đón theo khung, lý do khi sửa tiền); ảnh «XÁC NHẬN ĐƠN DỊCH VỤ» tự bật chỉ khi đơn đã `confirmed` (nhánh B có ngay; nhánh A sau Còn vé — Đ11).
- Modify: `src/shared/viec-cua-ban.ts` thẻ mới `donCho` (khoá mới, khai phạm vi trong `PHAM_VI_O_TRANG_CHU` và `KHOA_PHAM_VI`; đếm, số quá hạn, `href` danh sách), hiện cho người có `order.confirm.review` — **cả điện thoại** (gỡ chặn của riêng thẻ này ở `web/home.ts`); `ICON_VIEC` trong `web/home.ts`. Thẻ cũ `nhap` (nháp) đã đổi tên ở Task 2.1.
- Create: `web/cho-xac-nhan.ts` + `public/cho-xac-nhan.html` (danh sách chờ), khai `PAGES`/`PRECACHE` (`src/shared/sw-policy.ts`), `build:web`, `TRANG` trong `muc-giao-dien.ts`; `web/dieu-phoi.ts` ô «ĐƠN NHÁP» đổi chữ thành «Chờ xác nhận».
- Modify: Danh mục Quản trị — **màn gán nhóm**: cảnh báo khi nhóm cũ hoặc nhóm mới của dịch vụ đang có cờ «cần xác nhận» (trang ghép 25/10 mục 3b, phần cờ; phần luật bán không vào).
- Modify: thông báo — `src/shared/thong-bao.ts` (`HANH_DONG_TIN_DON`, `loaiTinDon`, `CAU` cho `order_confirm_requested`: người nhận mọi người giữ `order.confirm.review`, giờ yên lặng giữ nguyên); `src/shared/bang-tin.ts` `nhanSuKien`: `order_confirm_requested` của nháp trả thêm nhãn `"xet-duyet"`, `nhanKetNoi` của người giữ ô có nhãn đó; `duocThayTinDon`: Đối tác / Thực tập nhận tin `xac_nhan`/`huy` của ĐƠN MÌNH LẬP, và người bấm nhận tin, **không kèm tên người làm** (ADR-0131 đ3).
- Modify: `src/shared/huong-dan-doi-tac.ts` — sửa **mọi** đoạn nhắc «Lưu, chờ xác nhận» và «Xác nhận đơn» (đếm hôm nay: 7 chỗ nhắc «chờ xác nhận» / «Xác nhận đơn») thành «Gửi đơn» và hai câu báo; sinh lại các tệp trợ lý.
- Test: `src/shared/order-view.test.ts`, `src/shared/viec-cua-ban.test.ts`, `src/shared/thong-bao.test.ts`, `src/shared/bang-tin.test.ts`, `src/shared/huong-dan.test.ts`, kịch bản `docs/evidence/2026-10-19-xac-nhan-don/kich-ban/xac-nhan-smoke.mjs`, `gui-don-smoke.mjs`

- [ ] **Step 1: Bài đỏ.** `orderActions` đủ ca (nháp cần xác nhận không giữ PARTNER → `send` không `confirm`; người lập giữ PARTNER → `submit`, không `confirm`; đang chờ người lập → `withdraw`; người xét duyệt → `decide`). Thẻ `donCho` hiện cho FIELD trên điện thoại. Tin `order_confirm_requested` tới Kế toán + HDV, không tới Đối tác; `nhanSuKien` có `"xet-duyet"` (Review Focus 7). Đối tác nhận tin huỷ đơn mình không có tên người huỷ. **Trợ giúp** (`huong-dan.test.ts`): mẫu «Lưu, chờ xác nhận» và nút «Xác nhận đơn» **không còn** trong `huong-dan-doi-tac.ts` và có «Gửi đơn»; tên hộp ảnh «Xác nhận đơn để gửi khách» là tên hợp lệ (Đ11), giữ. `huong-dan-ban-hang.ts` cũng nhắc «Lưu, chờ xác nhận»: sửa cùng; thêm đoạn Gửi xác nhận / Rút lại / xét duyệt cho Bán hàng, Kế toán, HDV (bề mặt, không bắt buộc theo ADR).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run build:web`; `xac-nhan-smoke.mjs` và `gui-don-smoke.mjs` ở 390 + 1040 (Đối tác Gửi đơn nhánh A → Kế toán thấy thẻ Trang chủ → mở → Còn vé → Đối tác thấy đã xác nhận; Đối tác Gửi đơn nhánh B thấy câu B rồi hộp ảnh; gửi hỏng ở form mới → vào trang nháp vừa lưu; mở kịch bản tài khoản nào SAU CÙNG theo bẫy cookie §10); `a2-smoke-order`, `a2-smoke-form`, `dat-gap-smoke`, `trang-chu-smoke`, `v1-xac-nhan-png`. Ảnh 390 + 1040 cho Bán hàng, Đối tác, Kế toán, HDV.
- [ ] **Step 5:** Commit `Giao diện bước xác nhận và Gửi đơn: nút, danh sách chờ, thẻ Trang chủ, thông báo, Trợ giúp Đối tác`.

### Task 3.6: Hoàn tất phát hành chung Đợt 2 + 3

- [ ] **Step 1:** Rà các kịch bản Chrome trong `docs/evidence/**/kich-ban/` dùng phiên Đối tác (hoặc lai) bấm «Xác nhận đơn» / «Lưu, chờ xác nhận»: chuyển sang «Gửi đơn»; chạy lại.
- [ ] **Step 2:** `src/shared/changelog.ts` (mục mới đầu mảng, số tạm), `docs/SYSTEM-DESIGN.md` §5, §6, §7, §16 nếu có lệch, `docs/CHANGE-GUIDE.md` (công thức «dịch vụ cần xác nhận», «Gửi đơn», bẫy «nháp chỉ người tạo» và «`/status` 409 với người lập giữ quyền Đối tác»), `docs/data-dictionary.json` + `npm run dict`, `docs/HANDOFF-N1.md` (việc của chủ: đếm nháp cũ có khoản thu — Task 2.2 Step 0; đánh dấu dịch vụ/nhóm cần xác nhận sau phát hành qua `POST /api/cai-dat/xac-nhan-don`, vì giao diện cài đặt chờ Đợt 5; mặc định chưa đánh dấu nên đa số đơn Đối tác đi nhánh B).
- [ ] **Step 3:** `npm test && npm run typecheck && npm run build:web && npm run test:e2e` (toàn bộ) → PASS; `node scripts/audit-invariants.mjs --db local` thoát 0.
- [ ] **Step 4:** `nguoi-kiem-doc-lap` cho Đợt 3 (quyền + dữ liệu + tiền), kèm lại Đợt 2. Chỉ báo «đạt» theo báo cáo đó + test.
- [ ] **Step 5:** Báo chủ lệnh `npm run day-len`, ghi rõ «cần `npm run trien-khai`, có migration 0119 tạm (Đợt 3; Đợt 1 với 0115 đã lên bản 2.23); trước đó chủ chạy Task 2.2 Step 0». Nêu rõ: Task 3.3b (sửa tiền khi chờ) HOÃN, chưa có trong bản phát hành.

---

## Đợt 4 — Email kèm QR khi xác nhận, email + tin khi huỷ (ADR-0137)

> **Ngoài phạm vi lần sửa 25/10 và CHƯA được phép thi công:** đề xuất «thư + QR» chưa trình lại và số 0137 nay là ADR sổ đại lý. Khi trình lại, rà Task 4.2 theo luồng mới (đơn Đối tác nhánh B xác nhận ngay lúc Gửi đơn; nhánh A sau Còn vé).

### Task 4.1: Đọc email người nhận + dựng ảnh QR phía máy chủ

**Files:**
- Modify: `src/modules/parties/index.ts` — `export async function emailChinhCuaHoSo(db: D1Database, partyId: string): Promise<string | null>` (liên hệ `EMAIL`, `is_primary`, còn hiệu lực; SQL qua `defineSql` trong repo nghiêm của parties).
- Modify: `src/architecture.test.ts` `ALLOWED_EDGES.receipt` thêm `"staff"`; dùng `getStaffAccount(db,id)` (`src/modules/staff/index.ts:134`) lấy `partyId` người lập.
- Create: `src/modules/receipt/qr-anh.ts` — `export function anhQrGif(payload: string): Uint8Array` dùng `web/vendor/qrcode.js` (mức "M", lề 4, như `web/qr-ve.ts`); sửa `src/vendor-qr.test.ts` cho phép đúng HAI tệp nhắc `vendor/qrcode` (`web/qr-ve.ts`, `src/modules/receipt/qr-anh.ts`), hash thân giữ nguyên.
- Test: `src/modules/receipt/qr-anh.test.ts`, `tests/e2e/parties.mjs` (ca email chính)

- [ ] **Step 1: Kiểm khả năng** trước khi viết mã: đọc tài liệu Cloudflare Email Service (`developers.cloudflare.com/email-service`) xem `send()` có nhận `attachments` (kèm `contentId` để hiện trong thân) không; có gửi được tới địa chỉ BẤT KỲ bên ngoài (Gmail của khách) không hay chỉ địa chỉ đã xác minh; hạn mức gửi mỗi ngày. Hai nơi gửi hiện nay chỉ tới địa chỉ nhân viên/quản trị nên không chứng minh được gửi cho khách. Ghi kết luận vào nhật ký thi công. Nếu KHÔNG có đính kèm: thư không có ảnh QR, chỉ ghi số tài khoản, ngân hàng, số tiền, nội dung chuyển khoản; báo chủ trước khi đi tiếp (không tự thay bằng dịch vụ ảnh bên ngoài — lộ số tài khoản + số tiền).
- [ ] **Step 2: Bài đỏ** `qr-anh.test.ts`: payload mẫu từ `src/shared/vietqr.test.ts` → mảng byte bắt đầu bằng `GIF89a`/`GIF87a`, độ dài > 0; `vendor-qr.test.ts` vẫn chặn tệp thứ ba.
- [ ] **Step 3:** FAIL → cài đặt → PASS (`node --test src/modules/receipt/qr-anh.test.ts src/vendor-qr.test.ts && npm test`).
- [ ] **Step 4:** Commit `Đọc email chính của hồ sơ; dựng ảnh QR phía máy chủ cho thư xác nhận`.

### Task 4.2: Gửi thư khi xác nhận (đơn cần xác nhận) và khi huỷ (mọi đơn)

**Files:**
- Create: `src/modules/receipt/thu-don.ts` — `export async function guiThuDon(env: Env, i: { orderId: string; loai: "XAC_NHAN" | "HUY" }): Promise<void>` (không ném; mỗi người nhận một `guiThu`; hỏng → `console.error(JSON.stringify({level:"error",event:"order_mail_failed",message:lyDo}))`, không địa chỉ).
- Create: `src/shared/thu-don-noi-dung.ts`, `src/shared/thu-don-noi-dung.test.ts` — `export function noiDungThuXacNhan(d: ThuDonDuLieu): { subject: string; text: string; html: string }`, `noiDungThuHuy(...)`; escape HTML; nội dung: mã đơn, dịch vụ, ngày đi, khung giờ đón + câu lưu ý, tổng tiền, còn phải thu, ngân hàng/số tài khoản/chủ tài khoản, nội dung chuyển khoản, ảnh QR (theo kết luận Task 4.1); thư huỷ: mã đơn, dịch vụ, ngày, nhãn lý do — KHÔNG tên người huỷ.
- Modify: `src/shared/router.ts` (khai `guiThuDon` trong ctx), `src/index.ts` (tiêm, bọc `waitUntil`), `src/modules/orders/xac-nhan-route.ts` (sau thắng `CON_VE`/`HET_VE`/`HUY`), `src/modules/orders/index.ts` `/status` nhánh huỷ, `cancelOrderByHandler` (:497).
- Người nhận: email chính hồ sơ người đặt (`booker_party_id`); nếu không có hồ sơ → `orders.customer_email`; đơn qua đại lý → đại lý (người đặt), không gửi khách lẻ; + email chính hồ sơ nhân viên lập. Trùng địa chỉ → một thư. Thư xác nhận chỉ cho đơn đã qua bước xác nhận (có yêu cầu `XAC_NHAN`). Thư huỷ: nhân viên lập nhận cho mọi lần huỷ; **người đặt chỉ nhận khi đơn đã `confirmed` trước khi huỷ hoặc đã từng gửi xác nhận** [người soạn] — nháp riêng tư bị huỷ (lập lại, trùng đơn) không gửi khách vì khách chưa từng nhận gì về đơn đó.
- Test: `src/shared/thu-don-noi-dung.test.ts`, `tests/e2e/xac-nhan-don.mjs` (dùng bộ gửi giả ghi lại thư qua bộ mô phỏng `wrangler dev`)

- [ ] **Step 1: Bài đỏ:** nội dung có "07:30–08:00" + câu lưu ý nguyên văn, có số tiền định dạng VNĐ, không có SĐT khách, `<script>` trong tên dịch vụ bị escape; thư huỷ không chứa tên người huỷ. e2e: xác nhận Còn vé → 2 thư (người đặt + nhân viên lập); khách không email → 1 thư và đơn vẫn `confirmed` (Review Focus 5); huỷ đơn thường đã xác nhận → thư huỷ tới người đặt + nhân viên lập; huỷ nháp chưa gửi → chỉ thư nhân viên lập, không thư khách.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run test:e2e -- xac-nhan-don orders dispatch hai-lop-email` → PASS.
- [ ] **Step 5:** Commit `Thư xác nhận kèm QR cho đơn cần xác nhận; thư và tin báo huỷ cho người liên quan`.
- [ ] **Step 6:** `nguoi-kiem-doc-lap` cho Đợt 4 (gửi dữ liệu ra ngoài + tiền).

---

## Đợt 5 — Bảng điều khiển Toàn quyền

### Task 5.1: Trang `/bang-dieu-khien`

**Files:**
- Create: `public/bang-dieu-khien.html`, `web/bang-dieu-khien.ts`; khai `PAGES`/`PRECACHE`, `build:web`, `TRANG.bangDieuKhien` + `THANH_BEN` nhóm "THIẾT LẬP" + `TRANG_TOI` trong `src/shared/muc-giao-dien.ts` (`hien: (s) => can(s,"settings.ops")`); chụp lại `src/muc-giao-dien-hien-trang.json`.
- Thẻ (mỗi thẻ một tệp gắn được, khuôn `ganCaiDatNhapTay`): **Đơn hàng** — `web/xac-nhan-cai-dat.ts` (tìm + đánh dấu dịch vụ cần xác nhận, công tắc "Người nội bộ tự xác nhận đơn của mình", dòng chỉ đọc "Hạn xác nhận: 15 phút, không tính 22:00–06:00"), `web/nhap-tay-cai-dat.ts` (chuyển từ trang Tôi); **Đón khách** — `web/khung-gio-cai-dat.ts` (sửa khung + câu lưu ý; liên kết trang danh mục cho mẫu chặng); **Điều phối** — liên kết `/chinh-sach-dieu-phoi`; **Hệ thống** — khối bảo trì chuyển từ `web/account.ts:715-849` sang `web/bao-tri-cai-dat.ts`, liên kết `/sessions`, `/giao-dien`, `/tro-ly-cai-dat`.
- Modify: `web/account.ts` gỡ khối bảo trì + nhập tay (import :8 `vnLocalToIso`, :13, :14, :17; `public/account.html:16-19`), thay bằng một liên kết "Bảng điều khiển" cho Toàn quyền.
- Modify kịch bản Chrome theo: `v1-bao-tri.mjs:66-70`, `dot-c-smoke.mjs:98-128`, `nhap-tay-smoke.mjs` (bước b, f); thêm `docs/evidence/2026-10-19-xac-nhan-don/kich-ban/bang-dieu-khien-smoke.mjs`.
- Test: `src/shared/sw-policy.test.ts`, `src/muc-hien-mo-duoc-{1,2,3}.test.ts`, `npm run test:e2e -- pwa maintenance nhap-tay-va-gia-doi-tac`.

- [ ] **Step 1: Ảnh mẫu trước** (luật "xem trước bằng ảnh thật"): dựng trang tĩnh với dữ liệu thật, chụp 390 + 1040, trình chủ duyệt bố cục một lượt. Chưa duyệt thì không làm Step 2+.
- [ ] **Step 2: Bài đỏ:** `muc-hien-mo-duoc-*` thấy mục mới chỉ cho Toàn quyền; `sw-policy.test` đòi trang mới; kịch bản smoke: Quản trị mở `/bang-dieu-khien` → thông báo "Chỉ Toàn quyền…", không thẻ nào.
- [ ] **Step 3:** FAIL → cài đặt → `npm test && npm run typecheck && npm run build:web` + e2e trên + 4 kịch bản Chrome (390/1040) + `quyen-thieu-quan-tri-smoke`, `trang-chu-smoke` → PASS.
- [ ] **Step 4:** Commit `Trang Bảng điều khiển của Toàn quyền; chuyển bảo trì và nhập tay khỏi trang Tôi`.

### Task 5.2: Tài liệu, nhật ký thay đổi, sổ hàng rào

**Files:** `src/shared/changelog.ts` (mục mới đầu mảng, số tạm), `docs/SYSTEM-DESIGN.md` §6 (luồng), §5 (bảng), §7 (route), `docs/CHANGE-GUIDE.md` (công thức "dịch vụ cần xác nhận", bẫy "nháp chỉ người tạo"), `docs/SO-HANG-RAO.md` (chỉ hàng rào ĐÃ quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, ghi ngày), `src/shared/huong-dan-*.ts` (Gửi xác nhận, Đón/Không đón), `docs/HANDOFF-N1.md` "Việc còn treo" (việc của chủ: đổi mốc tối thiểu 360 → 30 phút trên `/chinh-sach-dieu-phoi`; đánh dấu dịch vụ cần xác nhận sau phát hành).

- [ ] **Step 1:** Viết; `npm run dict`; `npm test && npm run typecheck && npm run test:e2e` (toàn bộ) → PASS; `node scripts/audit-invariants.mjs --db local` thoát 0.
- [ ] **Step 2:** Commit `Tài liệu, hướng dẫn, nhật ký thay đổi và sổ hàng rào cho bước Xác nhận đơn`.
- [ ] **Step 3:** `nguoi-kiem-doc-lap` toàn nhánh; báo chủ lệnh `npm run day-len`, ghi rõ "cần `npm run trien-khai`, có migration 0114, 0115".
