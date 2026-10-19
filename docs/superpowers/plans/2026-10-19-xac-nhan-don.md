# Bước Xác nhận đơn, Đón/không đón, QR sau xác nhận, Bảng điều khiển — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đơn có dịch vụ "cần xác nhận" phải qua một người nội bộ kiểm vé trước khi thành đơn đã xác nhận; mỗi dịch vụ bắt buộc chọn Đón/Không đón theo khung giờ; QR và email chỉ ra sau xác nhận; mọi tuỳ chọn nằm ở một trang Bảng điều khiển của Toàn quyền.

**Architecture:** Không đổi giá trị `orders.status` (CHECK ba giá trị từ `0003`). "Chờ xác nhận" = đơn `draft` có một dòng yêu cầu xác nhận còn mở ở bảng mới `ord_confirm_request` (module `orders`). Cờ theo dịch vụ, khung giờ đón, công tắc tự xác nhận là ba bảng chính sách chỉ-thêm theo khuôn `ord_manual_service_policy` (`0052`) / `vc_leg_template` (`0059`). Email gửi từ module `receipt` qua một hàm do gốc lắp ráp tiêm vào route của `orders` (orders không được import `billing`/`thongbao`).

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), giao diện thuần dựng bằng `h()`, esbuild, `node --test`, e2e `tests/e2e/*.mjs`, kịch bản Chrome trong `docs/evidence/**/kich-ban/`.

**Spec:** `docs/superpowers/specs/2026-10-19-xac-nhan-don-design.md` (đọc kỹ mục 5b, 5c — chúng thắng các dòng phía trên); luồng thực tế: `docs/superpowers/specs/2026-10-19-xac-nhan-don-luong-thuc-te.md`.

## Global Constraints

- Giao diện, lỗi, tài liệu, commit: tiếng Việt CÓ DẤU; gọi hệ thống là "Nền tảng"; không lộ mã thô (`draft`, `PICKUP`…) ra người dùng.
- Migration kế tiếp: **0112** (kiểm lại `ls migrations` + `git branch -r --no-merged origin/main` VÀ nhánh cục bộ `git branch --no-merged origin/main` / `git worktree list`, ngay trước khi tạo tệp). ADR kế tiếp: **0133** (tạm; kiểm lại `git log --all` mọi nhánh trước khi cấp).
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

---

## Đợt 0 — Hồ sơ quyết định (chủ duyệt trước khi thi công Đợt 2–4)

### Task 0.1: Ba đề xuất ADR + trang ghép

**Files:**
Bốn đề xuất, chia **hai lượt duyệt** (mỗi lượt ≤ 3 quyết định chạm quyền/dữ liệu, CLAUDE.md §9):
- **Lượt 1** (mở Đợt 1–2):
  - `docs/superpowers/specs/2026-10-19-xac-nhan-don/DE-XUAT-ADR-0133-don-khong-don-khung-gio.md` (cột chọn đón theo dịch vụ, khung giờ trên chặng, giờ đầu khung = `pickup_time`)
  - `…/DE-XUAT-ADR-0134-nhap-rieng-tu-khong-thu.md` (nháp chỉ người tạo đọc; nháp không ghi thu; bỏ ô Trả trước; hàng chờ nhận chỉ đơn đã xác nhận; HDV chọn sẵn không thấy nháp)
- **Lượt 2** (mở Đợt 3–4):
  - `…/DE-XUAT-ADR-0135-buoc-xac-nhan-don.md` (trạng thái "chờ yêu cầu" giữ `draft`; ô quyền `order.confirm.review`; nới đọc có giới hạn cho người xét duyệt; tự xác nhận theo công tắc)
  - `…/DE-XUAT-ADR-0136-thu-xac-nhan-va-qr-may-chu.md` (gửi email ra ngoài cho người đặt + nhân viên lập; thư huỷ; dựng ảnh QR phía máy chủ → nới `src/vendor-qr.test.ts` thêm MỘT tệp được nhắc `vendor/qrcode`; thay ADR-0108 đ3 C3 phần "chỉ `web/qr-ve.ts`")
- Mỗi lượt kèm một `TRANG-GHEP-LUOT-<n>.md` theo CLAUDE.md §9: (1) bảng `orders`/`ord_confirm_request` chứa loại gì; (2) từng ô quyền chạm (`order.view` cho nháp, `order.confirm.review`, `payment.receive` khi nháp, `order.pool.view`); (3) cổng canh cửa, gồm chỗ giao diện ẩn/hiện bị đổi nghĩa (nút QR, ô Trả trước, thẻ "Đơn nháp" Trang chủ, hàng chờ nhận HDV, nút Xác nhận/Gửi xác nhận).
- Rà `docs/quyen-hoan.json`: ghi "không xây trên lỗ đang hở" kèm lý do (TNV-G1 bị né nhờ "nháp không ghi thu") — trừ nháp CŨ đã có khoản thu (xem Task 2.2 Step 0).
- **Câu hỏi kèm lượt 1 (đụng phân hệ Vận chuyển đã đóng sổ):** lịch chung điều phối (`lichChungChang` → `dieu-phoi-lenh.ts:747`, trường `nhap`, `soNhap`) hôm nay hiện chặng của đơn nháp (mã đơn, giờ đón, đặt gấp) để điều phối nhìn trước. Khuyến nghị: chỉ hiện chặng của đơn **đã gửi xác nhận**, bỏ nháp chưa gửi. Chưa có câu trả lời thì Task 2.1 KHÔNG đụng `lichChungChang`.

- [ ] **Step 1:** Viết bốn tệp, mỗi ADR ≤ 1 trang, nêu phương án bị bác. Không đặt vào `docs/adr/` (AI không tự duyệt).
- [ ] **Step 2:** `npm test` (bài sổ/ADR không đỏ). Commit: `Đề xuất ADR-0133…0136 và trang ghép hai lượt cho bước Xác nhận đơn (chờ chủ duyệt)`.
- [ ] **Step 3:** DỪNG: Đợt 1–2 chờ duyệt lượt 1; Đợt 3–4 chờ duyệt lượt 2. Soạn lượt 2 trong lúc thi công Đợt 1–2 được.

---

## Đợt 1 — Đón/Không đón và khung giờ (ADR-0133)

### Task 1.1: Migration 0112 + luật thuần khung giờ

**Files:**
- Create: `migrations/0112_chon_don_khung_gio.sql`
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
- [ ] **Step 5:** Commit `Migration 0112: chọn đón theo dịch vụ, khung giờ trên chặng, chính sách khung giờ`.

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

## Đợt 2 — Nháp riêng tư, nháp không thu tiền, bỏ ô Trả trước (ADR-0134)

### Task 2.1: Luật thuần "ai đọc được đơn" + áp ở mọi đường đọc

**Files:**
- Create: `src/shared/xem-don-nhap.ts`, `src/shared/xem-don-nhap.test.ts`
- Modify (mỗi chỗ gọi `xemDuocDon` SAU `can(order.view)` hiện có): `src/modules/orders/index.ts` — `GET /api/orders` (:835, lọc ở `dieuKienDanhSach` repository.ts:505: nháp chỉ `o.staff_id = ?` của người gọi, trừ đơn đang chờ khi người gọi có `order.confirm.review` — nhánh này bật ở Task 3.3), `GET /api/orders/:id` (:956), `/passengers` (:1244), `/thuong-mai` (:1504), `/api/orders/dashboard` (:784: `draftCount` = nháp của chính người gọi), `/api/orders/dem-nhap` (:794); `src/modules/receipt/index.ts` (:22, :39); `src/modules/billing/index.ts` (`GET /payments` :57, `nhap-ke-toan` :220, `POST /api/ledger/balances` :251 bỏ đơn nháp người khác); `lichChungChang` (`orders/index.ts:438`) CHỈ sửa theo câu trả lời của chủ ở Đợt 0 (khuyến nghị: `legLichChungNhapRows` chỉ lấy nháp có yêu cầu mở); `donCuaNguoiDat` (`nguoi-dat-gop-repo.ts`) chỉ đếm, không trả mã đơn nháp người khác.
- Modify: `src/modules/orders/repository.ts:592` `listPoolSources` → chỉ `status = 'confirmed'`; `src/modules/dispatch/index.ts:157` nhận đơn: đơn `draft` → 409 `order_not_confirmed` (câu: "Đơn chưa xác nhận, chưa nhận được.").
- Modify: Bảng tin `src/shared/bang-tin.ts` `nhanSuKien` (:96): sự kiện của đơn nháp chỉ gửi người lập (bỏ nhãn `tat-ca`); `src/shared/thong-bao.ts` tin `lap` của nháp chỉ người lập.
- Test: `src/shared/xem-don-nhap.test.ts`, `tests/e2e/nhap-rieng-tu.mjs`

**Interfaces — Produces:**
- `export function xemDuocDon(i: { coQuyenXem: boolean; status: OrderStatus; laNguoiLap: boolean; dangCho: boolean; xetDuyetDuoc: boolean }): boolean` — `coQuyenXem` = kết quả `can(staff,"order.view",{ownerId,assigned})` route tính sẵn; `xetDuyetDuoc` = `can(staff,"order.confirm.review")` (Task 3.2; trước đó truyền `false`). `confirmed`/`cancelled` → `coQuyenXem`; `draft` → `(laNguoiLap && coQuyenXem) || (dangCho && xetDuyetDuoc)`. Đây là **thay** cho `if (!can(order.view)) 404` ở các route đọc đơn, không phải lớp thêm sau nó (nếu không, HDV chưa phụ trách bị 404 trước khi tới nhánh xét duyệt — Review Focus 8). Cùng luật cho tiền chỉ đọc: `money.view` HOẶC (`dangCho && xetDuyetDuoc`).
- Người phụ trách chọn sẵn trên đơn nháp: không xem được với tư cách người phụ trách; tin `order_handler_changed` của đơn nháp chỉ tới người lập; khi đơn chuyển `confirmed`, tin `xac_nhan` tới người phụ trách như hôm nay (Review Focus 7).
- Bảng tin / hộp thư: `nhanSuKien` (`bang-tin.ts:96`) với đơn `draft` chỉ trả nhãn người lập, TRỪ hành động `order_confirm_requested` (Task 3.4) trả thêm nhãn mới `"xet-duyet"`; `nhanKetNoi` của người giữ `order.confirm.review` có nhãn `"xet-duyet"`. Bài kiểm Task 2.1 phải khẳng định nhãn này đi qua bộ lọc nháp.
- 404 (không 403) khi không xem được, để không lộ đơn tồn tại.

- [ ] **Step 1: Bài đỏ** bảng chân trị đủ 2×2×2 cho `draft` + hai ca `confirmed/cancelled`. Bài thuần `bang-tin.test.ts`: sự kiện `created` của nháp → chỉ nhãn người lập; `order_confirm_requested` của nháp → có `"xet-duyet"`; `order_handler_changed` của nháp → không tới người phụ trách. e2e `nhap-rieng-tu.mjs`: Bán hàng A lập nháp chọn sẵn HDV H; H: GET 404, không có tin; Bán hàng B, Kế toán, Quản trị, Toàn quyền: danh sách không có, GET chi tiết 404, tìm theo mã 0 kết quả, `dashboard.draftCount` = 0; HDV: hàng chờ nhận không có, PUT handler → 409; A thấy đủ.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run test:e2e -- nhap-rieng-tu orders dispatch bangtin thongbao gop-ho-so permissions` → PASS.
- [ ] **Step 5:** Commit `Đơn nháp chỉ người tạo đọc được; hàng chờ nhận chỉ đơn đã xác nhận`.

### Task 2.2: Nháp không ghi thu; QR chỉ đơn đã xác nhận; bỏ ô Trả trước

**Files:**
- Modify: `src/modules/billing/index.ts` — `POST /api/orders/:id/payments` (:91) và các route cọc (:109–174): `info.status === "draft"` → 409 `order_draft_no_payment` ("Đơn chưa xác nhận, chưa ghi thu được."). Cờ `coTheGhiThu` (:82) thêm `info.status !== "draft"`.
- Modify: `src/modules/receipt/index.ts:39-56` — đơn không `confirmed` → 409 `qr_requires_confirmed`; `web/order.ts:528` thêm `order.status === "confirmed"`.
- Modify: `web/order-form.ts` — bỏ ô "Trả trước", "Hình thức", "Người nhận tiền" và lời gọi ghi thu sau lưu (:678–689); thanh dính cuối trang bỏ dòng "trả trước". `src/shared/huong-dan-*.ts` sửa câu nhắc trả trước.
- Test: `tests/e2e/so-tien.mjs`, `tests/e2e/qr-thanh-toan.mjs` (thêm ca), kịch bản `a2-smoke-form`.

- [ ] **Step 0 (trước phát hành, chủ chạy — AI không chạy lệnh remote):** đếm đơn nháp CŨ đã có khoản thu (sinh ra từ ô Trả trước). Chạy ở thư mục `tourdao-sales`:
  ```
  npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(DISTINCT o.id) AS so_don FROM orders o JOIN bil_payment_receipt r ON r.order_id = o.id WHERE o.status = 'draft'"
  ```
  Kết quả > 0 thì chủ quyết cách xử lý những đơn đó (huỷ chúng sẽ rơi vào lỗ TNV-G1) trước khi phát hành Đợt 2. Ghi kết quả vào nhật ký thi công.
- [ ] **Step 1: Bài đỏ** e2e: ghi thu lên nháp → 409 `order_draft_no_payment`; ghi thu sau xác nhận → 201; QR của nháp → 409; QR sau xác nhận → 200. Bài thuần: thân POST tạo đơn không còn khoá trả trước (sửa bài khoá thân trong `src/shared/service-form.test.ts` có chủ đích).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run test:e2e -- so-tien qr-thanh-toan coc-don-huy orders` + `a2-smoke-form` 390/1040 → PASS.
- [ ] **Step 5:** Commit `Nháp không ghi thu được, QR chỉ cho đơn đã xác nhận, bỏ ô Trả trước khỏi màn Tạo đơn`.
- [ ] **Step 6:** `nguoi-kiem-doc-lap` cho Đợt 2 (quyền + tiền).

---

## Đợt 3 — Bước Xác nhận đơn (ADR-0135)

### Task 3.1: Luật thuần — cần xác nhận, hạn 15 phút trừ giờ đêm, ai quyết định được

**Files:**
- Create: `src/shared/xac-nhan-don.ts`, `src/shared/xac-nhan-don.test.ts`

**Interfaces — Produces:**
- `export function canXacNhan(maDichVu: readonly string[], maCanXacNhan: ReadonlySet<string>): boolean`
- `export function hanXacNhan(guiLucIso: string): string` — ISO UTC; 15 phút làm việc, bỏ 22:00–06:00 giờ VN (dùng các hàm giờ VN có sẵn trong `src/shared/`, không `Date` cục bộ).
- `export type KetQuaXacNhan = "CON_VE" | "HET_VE" | "HUY"`
- `export function duocQuyetDinh(i: { laNguoiLap: boolean; laNoiBo: boolean; coQuyenXetDuyet: boolean; choTuXacNhan: boolean }): boolean` — `coQuyenXetDuyet && (!laNguoiLap || (laNoiBo && choTuXacNhan))`.

- [ ] **Step 1: Bài đỏ** (giờ VN): gửi 10:00 → 10:15; 21:50 → 06:05 hôm sau; 21:55 → 06:10 hôm sau; 23:00 → 06:15; 05:59 → 06:15; 06:00 → 06:15. `canXacNhan(["A","B"], {"B"})` → true; `([],…)` → false. `duocQuyetDinh` đủ bảng chân trị.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `Luật thuần bước xác nhận: cần xác nhận, hạn 15 phút trừ giờ đêm, ai được quyết định`.

### Task 3.2: Migration 0113 + ô quyền + chính sách

**Files:**
- Create: `migrations/0113_yeu_cau_xac_nhan.sql`, `src/migrations-xac-nhan.test.ts`
- Modify: `src/shared/permissions.ts` (ô `"order.confirm.review": row(any, any, any, any, none, any, none, none, none, none)`), các bài ghim liệt kê ở Global Constraints, `docs/data-dictionary.json` + `npm run dict`

**Interfaces — Produces:**
- `ord_confirm_request(id, order_id NOT NULL REFERENCES orders(id), submitted_at, submitted_by, deadline_at, decided_at NULL, decided_by NULL, outcome NULL, ticket NULL, note NULL CHECK(length ≤ 300), created_at, updated_at)`; chỉ mục duy nhất một yêu cầu mở mỗi đơn: `UNIQUE(order_id) WHERE decided_at IS NULL`; trigger: chỉ cho UPDATE một lần từ `decided_at IS NULL` sang đủ bốn cột `decided_at/decided_by/outcome`(+`ticket` khi outcome khác `RUT_LAI`); cấm DELETE. Mã `outcome` kiểm ở mã: `XAC_NHAN | HUY | RUT_LAI`.
- `ord_service_confirm_flag(id, code, required INTEGER CHECK IN (0,1), valid_from_at, created_*, updated_*, UNIQUE(code, valid_from_at))` chỉ-thêm (khuôn `vc_leg_template`).
- `ord_confirm_policy(id, self_confirm_internal INTEGER CHECK IN (0,1), valid_from_at UNIQUE, …)` chỉ-thêm; gieo `self_confirm_internal = 1`.

- [ ] **Step 1: Bài đỏ** `migrations-xac-nhan.test.ts`: hai yêu cầu mở cùng đơn → UNIQUE chặn; quyết định lần hai → trigger chặn; DELETE → chặn; policy gieo `1`. `permissions.test.ts`: hàng `order.confirm.review` đúng bảng trên.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck` PASS. **Step 5:** Commit `Migration 0113: yêu cầu xác nhận, cờ dịch vụ cần xác nhận, công tắc tự xác nhận; ô quyền order.confirm.review`.

### Task 3.3: Route gửi / rút lại / quyết định

**Files:**
- Create: `src/modules/orders/xac-nhan-repo.ts` (nửa nghiêm, thêm vào `NUA_NGHIEM`), `src/modules/orders/xac-nhan-route.ts` (đăng ký từ `index.ts`)
- Modify: `src/modules/orders/index.ts:1411` — nhánh confirmed của `/status`: nếu `canXacNhan(...)` đúng → 409 `confirm_request_required` ("Đơn có dịch vụ cần xác nhận, hãy bấm Gửi xác nhận.").
- Modify: `src/shared/audit-actions.ts` + hai tệp lịch sử: `order_confirm_requested`, `order_confirm_withdrawn`, `confirm_flag_changed`, `confirm_policy_changed` (quyết định dùng lại `confirmed`/`cancelled` với `detail` "Còn vé"/"Hết vé").
- Test: `tests/e2e/xac-nhan-don.mjs`

**Interfaces — Produces (route):**
- `POST /api/orders/:id/gui-xac-nhan` (cổng `orders`, `can(staff,"order.modify",{ownerId,assigned})`, đơn `draft`, `canXacNhan` đúng, `thieuChonDon` rỗng, chưa có yêu cầu mở) → 201 `{ yeuCau: YeuCauXacNhanDto }`; nhật ký `order_confirm_requested`; `baoThayDoi({thayDoi:"cho_xac_nhan"})`.
- `POST /api/orders/:id/rut-xac-nhan` (chỉ người lập) → 200; yêu cầu `outcome = RUT_LAI`.
- `POST /api/orders/:id/quyet-dinh` thân `{ ketQua: KetQuaXacNhan; ngayDi?: string; gioDon?: { legId: string; pickupTime: string; pickupSlotEnd?: string }[]; lyDo?: string; ghiChu?: string; updatedAt: string }`; kiểm `can(staff,"order.confirm.review")` + `duocQuyetDinh`; `CON_VE` → MỘT `db.batch`: đổi ngày/giờ (nếu có) → khép yêu cầu (`XAC_NHAN`,`CON_VE`) → các câu của `confirmOrder` hiện có (mốc tối thiểu + đặt gấp giữ nguyên) ; `HET_VE` → khép yêu cầu (`HUY`,`HET_VE`) → `cauHuyCoLyDo` với `HET_CHO`; `HUY` → `docLyDoHuy` như hộp huỷ hiện có. Thắng/thua bằng khoá `updated_at` + `changes()>0` như `/status`; thua → 409 `RACED`.
- `GET /api/orders/cho-xac-nhan` (cổng `orders`, `can(staff,"order.confirm.review")`) → `{ don: DonChoXacNhanDto[] }` (mã đơn, dịch vụ, ngày, số khách, giờ đón, tổng tiền, `hanLuc`, `quaHan`) — KHÔNG có tên/SĐT/email khách.
- `GET|POST /api/cai-dat/xac-nhan-don` (cổng `admin`, `settings.ops`): danh sách mã cần xác nhận + công tắc tự xác nhận; POST một thay đổi một lần theo khuôn nhập tay.
- `xemDuocDon` (Task 2.1) nay nhận `dangCho` thật; DTO chi tiết đơn cho người xét duyệt không phải người lập: che `customerPhone`, `customerEmail`, liên hệ người đặt.
- Khoá khi chờ: `PUT /api/orders/:id` của NGƯỜI LẬP khi đơn có yêu cầu mở → 409 `confirm_pending_locked` ("Đơn đang chờ xác nhận, hãy Rút lại trước khi sửa.") — đặc tả Phần A mục 9.
- Sửa tiền khi đang chờ: `PUT /api/orders/:id` cho phép người không phải người lập NẾU đơn đang chờ VÀ `can(staff,"order.money.edit",{ownerId,assigned})`; tổng đổi mà thiếu `lyDoSuaTien` (≤300 ký tự) → 400; nhật ký `updated` kèm lý do.

- [ ] **Step 1: Bài đỏ** `xac-nhan-don.mjs`: (a) Toàn quyền đánh dấu mã X cần xác nhận; Đối tác lập đơn X → `/status` confirmed 409 `confirm_request_required`; gửi → 201; Đối tác tự quyết định → 403. (b) Kế toán xem `cho-xac-nhan` thấy đơn, không có SĐT; HDV thấy; HCNS 403. (c) Kế toán `CON_VE` đổi giờ 08:30 → đơn `confirmed`, chặng 08:30, yêu cầu khép. (d) Đơn khác: `HET_VE` → `cancelled`, lý do `HET_CHO`. (e) Đua: hai lời quyết định song song → đúng một 200, một 409, đúng một dòng quyết định (Review Focus 3). (f) Bán hàng nội bộ tự quyết định đơn mình: công tắc bật → 200; Toàn quyền tắt → 403. (g) Bỏ cờ X khi đơn đang chờ → vẫn quyết định được (Review Focus 4). (h) Sửa tiền khi chờ không lý do → 400; có lý do → 200. (i) Chặng dưới mốc → `CON_VE` 409 `short_notice_required` như hôm nay. (j) Đơn trộn dịch vụ thường + X → phải gửi (Review Focus 1). (k) HDV chưa phụ trách GET chi tiết đơn đang chờ → 200, không SĐT/email, tiền chỉ đọc (Review Focus 8). (l) Người lập PUT khi đang chờ → 409 `confirm_pending_locked`; rút lại → PUT 200 (Review Focus 9).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run test:e2e -- xac-nhan-don orders permissions chong-ghi-trung dong-bo-chuyen` → PASS (route mới vào `route-write-guard`, `permission-enforcement` xanh).
- [ ] **Step 5:** Commit `Route gửi, rút lại, quyết định xác nhận đơn; danh sách chờ xác nhận; cài đặt dịch vụ cần xác nhận`.

### Task 3.4: Giao diện xác nhận + Trang chủ + ảnh xác nhận

**Files:**
- Modify: `src/shared/order-view.ts:112` `orderActions(status, canModify, canEditTrip, cho?: { canXacNhan: boolean; dangCho: boolean; quyetDinhDuoc: boolean })` → thêm `send`, `withdraw`, `decide`; `confirm` chỉ khi `!canXacNhan`.
- Modify: `web/order.ts` — nút "Gửi xác nhận" / "Rút lại"; dải "Chờ xác nhận · còn N phút" (hoặc "Quá hạn"); bảng "Xác nhận đơn" (Còn vé / Hết vé / Huỷ kèm lý do, sửa ngày + giờ đón theo khung, lý do khi sửa tiền); ảnh xác nhận tự bật (:95–108, :1511) chỉ khi đơn không cần xác nhận hoặc đã `confirmed`.
- Modify: `src/shared/viec-cua-ban.ts` thẻ mới `choXacNhan` (đếm, số quá hạn, `href` danh sách), hiện cho người có `order.confirm.review` — **cả điện thoại** (gỡ chặn ở `web/home.ts:334` cho riêng thẻ này); `ICON_VIEC` (`web/home.ts:336`).
- Create: `web/cho-xac-nhan.ts` + `public/cho-xac-nhan.html` (danh sách chờ), khai `PAGES`/`PRECACHE`, `build:web`, `TRANG` trong `muc-giao-dien.ts`.
- Modify: thông báo — `src/shared/thong-bao.ts` `HANH_DONG_TIN_DON` + `loaiTinDon` + `CAU` cho `order_confirm_requested` (người nhận: mọi người `duocThayTinDon`, giờ yên lặng giữ nguyên); `src/shared/bang-tin.ts:152` `duocThayTinDon`: Đối tác/Thực tập nhận tin `xac_nhan`/`huy` của ĐƠN MÌNH LẬP (không kèm tên người làm — giữ ADR-0131).
- Test: `src/shared/order-view.test.ts`, `src/shared/viec-cua-ban.test.ts`, `src/shared/thong-bao.test.ts`, `src/shared/bang-tin.test.ts`; kịch bản `docs/evidence/2026-10-19-xac-nhan-don/kich-ban/xac-nhan-smoke.mjs`

- [ ] **Step 1: Bài đỏ:** `orderActions` đủ ca (nháp cần xác nhận → `send` không `confirm`; đang chờ người lập → `withdraw`; người xét duyệt → `decide`); thẻ `choXacNhan` hiện cho FIELD trên điện thoại; tin `order_confirm_requested` tới Kế toán + HDV, không tới Đối tác; Đối tác nhận tin huỷ đơn mình không có tên người huỷ.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npm test && npm run typecheck && npm run build:web`; `xac-nhan-smoke.mjs` 390 + 1040 (Đối tác gửi → Kế toán thấy thẻ Trang chủ → mở → Còn vé → Đối tác thấy đã xác nhận; mở kịch bản tài khoản nào SAU CÙNG theo bẫy cookie §10); `a2-smoke-order`, `trang-chu-smoke`, `v1-xac-nhan-png`. Ảnh 390 + 1040 cho Bán hàng, Đối tác, Kế toán, HDV.
- [ ] **Step 5:** Commit `Giao diện bước xác nhận: Gửi/Rút lại/Quyết định, danh sách chờ, thẻ Trang chủ, thông báo`.
- [ ] **Step 6:** `nguoi-kiem-doc-lap` cho Đợt 3 (quyền + dữ liệu + tiền).

---

## Đợt 4 — Email kèm QR khi xác nhận, email + tin khi huỷ (ADR-0136)

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
- [ ] **Step 3:** `nguoi-kiem-doc-lap` toàn nhánh; báo chủ lệnh `npm run day-len`, ghi rõ "cần `npm run trien-khai`, có migration 0112, 0113".
