# Bán hàng phụ trách đơn (Phần 1 luồng việc theo vai) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi đơn có một ô «Bán hàng phụ trách» riêng. Người lập mời được một Bán hàng, và người được mời có 15 phút giờ hành chính ưu tiên. Ai xác nhận hoặc nhận thì người đó phụ trách. Đơn quá 15 phút chưa có Bán hàng phụ trách thì hiện thẻ cảnh báo ở Trang chủ.

**Architecture:**
- `dispatch` sở hữu ba bảng mới: ô Bán hàng phụ trách, lời mời, chính sách giờ hành chính.
- `orders` giữ ý định mời trên đơn nháp, bằng một cột. Nó nhận câu lệnh và hàm đọc của `dispatch` qua gốc lắp ráp (`src/index.ts`), vì `orders` không import `dispatch`.
- Quyền «được giao» của ô mới là danh sách trắng năm ô, qua một cờ tiêm riêng; không nới `isOrderHandler`.
- Luật thuần (đồng hồ, lời mời, ai nhận, ai thấy thẻ) nằm ở một tệp `src/shared/`, dùng chung cho máy chủ và giao diện.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), esbuild, `node --test`, e2e `tests/e2e/*.mjs`, kịch bản Chrome `docs/evidence/**/kich-ban/*.mjs`.

**Spec:** `docs/adr/ADR-0142-ban-hang-phu-trach-don.md` (quyết định; **thắng** bản thiết kế khi lệch) và `docs/superpowers/specs/2026-10-27-ban-hang-phu-trach-don-design.md` (luật L1–L11, trang ghép B.9, tiêu chí B.10). Người thi công đọc **cả hai** trước Task 1. Hai chỗ ADR đã thay thiết kế:
- danh sách trắng không có `order.modify`, nên Bán hàng phụ trách chưa được huỷ;
- không nới `isOrderHandler`.

## Bảng việc (sổ sống của đợt — cập nhật cột Trạng thái khi xong mỗi task)

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 0 | Điều kiện bắt đầu | chủ đã duyệt dòng làm rõ ADR-0136 Đ10 / ADR-0034 đ5 (phiên sửa hộp thư); nhánh hộp thư (`0120`) đã vào `main`; nhánh này dựng trên `main` mới nhất. **Trước Task 5** cần thêm: chủ duyệt bốn dòng lịch sử nội bộ (Task 5) và giữ hoặc đổi cách xử tài khoản lai (Review Focus 4) | chưa |
| 1 | Luật thuần: đồng hồ, lời mời, ai nhận, ai thấy thẻ, danh sách trắng | `src/shared/ban-hang-phu-trach.test.ts` + `xac-nhan-don.test.ts` đỏ→xanh | chưa làm |
| 2 | Migration: ba bảng `dispatch`, view (cả view gác nhật ký), cột mời trên `orders`, dựng lại khoá Đã giao | bài migration + NT-R6 xanh; `data-dictionary` + `npm run dict`; ba dòng sổ hàng rào | chưa làm |
| 3 | `dispatch`: SQL, câu lệnh, hàm công bố; gốc lắp ráp | `dispatch/ban-hang.test.ts` + `architecture.test.ts` xanh; `typecheck` 0 lỗi | chưa làm |
| 4 | Quyền: hàng `order.confirm.review`, ba ô mới, danh sách trắng | bài ghim quyền, bài đổi theo hàng mới, rào quét mã xanh | chưa làm |
| 5 | Route: mời, ghi nhận, Còn vé, nhận / từ chối / đổi, danh sách, thẻ, chính sách | e2e `ban-hang-phu-trach.mjs` đủ ca | chưa làm |
| 6 | Thông báo: Bảng tin, hộp thư (view mới + nguồn người nhận), báo đẩy | bài thuần + ca thông báo của e2e | chưa làm |
| 7 | Giao diện + kịch bản Chrome + ảnh cho chủ | `ban-hang-phu-trach-smoke.mjs` 390 + 1040 xanh; ảnh gửi chủ | chưa làm |
| 8 | Tài liệu, Trợ giúp, nhật ký thay đổi, bất biến | `audit-invariants --db local` thoát 0 | chưa làm |
| 9 | Bộ dài MỘT lần + người kiểm độc lập + lệnh cho chủ | `npm test`, `typecheck`, `build:web`, `test:e2e` xanh; người kiểm báo «đạt» | chưa làm |

## Global Constraints
- **Chữ người dùng thấy:** tiếng Việt **có dấu**, không chữ Anh hay mã thô. Gọi hệ thống là «Nền tảng». Không dùng chữ «tự do» mà dùng «Chờ Bán hàng nhận». Thẻ cũ đổi nhãn thành «Đơn chưa có HDV nhận». Nút Nhận của ô cũ đổi thành «Nhận làm HDV».
- **Giao diện** (luật đầy đủ ở `web/CLAUDE.md`): không `innerHTML`, dựng bằng `h()`; giá trị CSS vào token; ô gõ 16px.
- **Thời gian:** dấu thời gian lưu ISO UTC. Giờ hành chính tính theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè), mọi ngày trong tuần. «Còn N phút» là phút giờ hành chính.
- **Không xoá cứng.** Bảng mới chỉ thêm; «khép» chỉ một lần. Mỗi đơn chỉ một dòng mở, chặn bằng chỉ mục duy nhất có điều kiện **và** kiểm ở mã (Hiến chương 5.1).
- **Ranh giới module:**
  - `dispatch` là module «nghiêm»: SQL qua `defineSql`, khai tệp ở `STRICT` của `src/architecture.test.ts`.
  - SQL mới của `orders` chỉ đặt ở tệp nửa nghiêm `src/modules/orders/xac-nhan-repo.ts`, không viết vào `repository.ts`.
  - `orders` không import `dispatch`; mọi thứ đi qua `ctx`. Đọc xuyên module chỉ qua view `v_dsp_*`.
- **Migration:** chỉ thêm tệp mới. Số = số lớn nhất trong `migrations/` + 1, kiểm **mọi nhánh và worktree chưa gộp** ngay trước khi tạo tệp. `0120` đã có ở nhánh hộp thư; view `v_aud_order_event` phải dựng trên định nghĩa **mới nhất** trong `migrations/`.
- **Nhật ký** (`audit_log`): không SĐT, email, MST. Hành động mới khai ở `src/shared/audit-actions.ts`, có nhãn tiếng Việt. Tin gửi Đối tác, Thực tập không kèm tên người làm (ADR-0131 đ3).
- **Chính sách:** ba con số 15 phút, 07:00 (phút 420), 17:00 (phút 1020), ở dòng gieo có id cố định `gieo-ban-hang`. **Mốc phát hành** = `created_at` của dòng gieo (khuôn `gieo-han-muc` của `0117`). Bảng chỉ thêm (trigger cấm sửa, cấm xoá), nên thêm dòng mới không đổi mốc này.
- **Danh sách trắng** «được giao» của Bán hàng phụ trách: `order.history.view`, `order.trip.edit`, `order.passenger.write`, `dispatch.assign`, `trip.call_ack`. **Không** có `order.modify`, vì Bán hàng phụ trách chưa được huỷ.
- **Đối tác / Thực tập:** thấy **tên** Bán hàng phụ trách trên đơn của chính mình. `GET /api/dispatch/handlers` giữ nguyên 403 với họ.
- **Mã bất biến mới:** `R-DSP-8` trở đi (`R-DSP-5…7` đã dùng).
- **Câu nối vào lô có sẵn phải gác «lệnh chính đã thắng».** Luật lô hiện có: bên thua tự thành 0 dòng vì mọi câu mang cùng điều kiện; một câu `INSERT` không gác vẫn chạy khi lệnh chính đổi 0 dòng, để lại dữ liệu mồ côi.
  - Câu của `dispatch` nối vào lô của `orders` gác bằng id nhật ký của lệnh đơn, qua view `v_aud_order_ban_hang` (Task 2, khuôn `v_aud_order_cmd` của `0089`). `dispatch` không đọc `audit_log` trực tiếp.
  - Câu đi sau câu chính của chính `dispatch` gác bằng id dòng vừa mở.
- **Lịch sử đơn:** bốn hành động mới gắn đơn nằm ở danh sách cho phép của lịch sử nội bộ (không tên người; chi tiết không có tên hay mã). Danh sách đó có bản «chủ duyệt» trong bài thử, nên bốn dòng này chờ chủ duyệt trước Task 5. Ở lịch sử Đối tác, chúng nằm ở danh sách **ẩn**: Đối tác chỉ thấy tên Bán hàng phụ trách trên đơn, đúng câu trả lời «Chỉ hiện tên». Người soạn tự quyết, có ghi trong báo cáo cho chủ.
- **Hộp thư tính theo trạng thái hiện tại** (khuôn `handlerTruoc` giả ở `src/shared/thong-bao.ts`, quanh dòng 192). Người cũ khi Đổi, và X sau khi lời mời đã khép, chỉ nhận qua Bảng tin và báo đẩy lúc sự kiện, không có dòng hộp thư. Người soạn tự quyết theo tiền lệ của ô HDV.
- **Chạy kiểm:** giữa chừng chỉ chạy `node --test <tệp liên quan>` và `npm run typecheck`. `npm test` và `npm run test:e2e` mỗi bộ chạy **một lần**, ở Task 9.
- **Việc lớn:** sau Task 9 phải có người kiểm độc lập chỉ đọc (`nguoi-kiem-doc-lap`). Người thi công không tự nghiệm thu. AI không `git push`, không deploy, không áp migration remote.

## Review Focus
1. **X mất quyền Bán hàng hoặc bị ngưng trong 15 phút của mình.** Người khác phải nhận được ngay; X bấm Nhận thì 403. Lúc ghi nhận mà X đã mất quyền thì không mời. Bài: Task 1, Task 5 (ca R1).
2. **Đơn bị huỷ trong 15 phút của X.** Lời mời khép `HUY_DON`; X bấm Nhận thì 409 «Đơn đã huỷ»; đơn không vào thẻ. Bài: Task 5 (ca R2).
3. **Mốc đúng biên.** 17:00:00 ⇒ hạn 07:15 hôm sau; 07:00:00 ⇒ 07:15; giữ giây. «Còn N phút» lúc 17:30 cho hạn 07:10 hôm sau ⇒ 10, không phải 820. Bài: Task 1.
4. **Tài khoản lai Bán hàng + Đối tác.**
   - Không có trong danh sách mời; bấm Nhận thì 403; không hưởng ngoại lệ Quản trị.
   - Bấm Còn vé trên đơn chờ của người khác (ADR-0136 cho phép) thì đơn vẫn được xác nhận, nhưng **không** mở ô cho người bấm và **không** khép lời mời. Đơn sang «Chờ Bán hàng nhận», vì QĐ2(c) cấm người giữ quyền Đối tác giữ ô.
   - Đây là cách người soạn áp QĐ2(c), chủ có thể đổi trước Task 5. Phương án khác: chặn 403, nhưng như vậy là bớt quyền ADR-0136 đã cho.
   - Bài: Task 5 (ca R4, `gieoTaiKhoanLai`, cả hai đường).
5. **Hai người bấm cùng lúc.** Gồm cả hai trường hợp:
   - X và Quản trị bấm cùng lúc;
   - Rút lại chen vào giữa lúc đọc và lúc ghi của Còn vé.

   Kỳ vọng:
   - đúng một lô thắng; không bao giờ có hai dòng mở;
   - lô thua không để lại ô Bán hàng hay lời mời mồ côi trên đơn nháp;
   - bên thua nhận 409 kèm câu tiếng Việt, không 500.

   Bài: Task 3 (hai lô đua), Task 5 (ca 6, hai bài đua mở rộng).

---

### Task 1: Luật thuần

**Files:**
- Create: `src/shared/ban-hang-phu-trach.ts`, `src/shared/ban-hang-phu-trach.test.ts`
- Modify: `src/shared/xac-nhan-don.ts` (`hanXacNhan`, `duocQuyetDinh`), `src/shared/xac-nhan-don.test.ts` (ca 22–06 cũ đổi đáp án theo ADR-0142 Đ5)

**Interfaces — Produces:**
- `export interface KhungGioHanhChinh { phutUuTien: number; tuPhut: number; denPhut: number; mocPhatHanh: string }`
- `export function congPhutGioHanhChinh(mocIso: string, phut: number, khung: Pick<KhungGioHanhChinh, "tuPhut" | "denPhut">): string` — trả ISO UTC.
- `export function phutGioHanhChinhConLai(nowIso: string, hanIso: string, khung: Pick<KhungGioHanhChinh, "tuPhut" | "denPhut">): number` — làm tròn lên, ≥ 0.
- `export type KetQuaLoiMoi = "NHAN" | "TU_CHOI" | "NGUOI_KHAC" | "HUY_DON" | "RUT_LAI";`
- `export function trangThaiLoiMoi(i: { hanIso: string; nowMs: number; xConHopLe: boolean; daKhep: boolean }): "UU_TIEN" | "HET_UU_TIEN" | "DA_KHEP"`
- `export type LyDoKhongNhan = "da_co_nguoi" | "don_huy" | "qua_ngay_di" | "don_cu" | "dang_cho_nguoi_khac" | "khong_du_quyen" | "tai_khoan_lai" | "don_nhap";`
- `export function duocNhanBanHang(i: { giuBanHang: boolean; laQuanTriHoacToanQuyen: boolean; giuDoiTac: boolean; laX: boolean; uuTienCuaNguoiKhac: boolean; daCoNguoi: boolean; donHuy: boolean; quaNgayDi: boolean; laDonCu: boolean; laNhap: boolean }): { ok: true } | { ok: false; lyDo: LyDoKhongNhan }`
- `export function vaoTheCanhBao(i: { ghiNhanLuc: string | null; nowMs: number; khung: KhungGioHanhChinh; coBanHang: boolean; donHuy: boolean; quaNgayDi: boolean; daGiao: boolean; hoanThanh: boolean }): boolean`
- `export function cachThayTheCanhBao(w: PermissionHolder, don: { laNguoiLap: boolean; choXacNhan: boolean }): "day_du" | "chi_so" | "khong"`. Kết quả:
  - Bán hàng / Quản trị / Toàn quyền ⇒ `day_du`;
  - Kế toán ⇒ `day_du` với đơn đã xác nhận, `chi_so` với đơn chờ;
  - người lập ⇒ `day_du` với đơn của mình;
  - người khác ⇒ `khong`.
- `export const QUYEN_DUOC_GIAO_BAN_HANG = ["order.history.view", "order.trip.edit", "order.passenger.write", "dispatch.assign", "trip.call_ack"] as const;`
- `export function duocGiaoTheoO(op: OperationCode, i: { laNguoiPhuTrach: boolean; laBanHangPhuTrach: boolean }): boolean`
- `export const HANH_DONG_GAC_BAN_HANG = ["confirmed", "order_confirm_requested", "order_confirm_withdrawn", "cancelled", "order_cancelled_by_field"] as const;` — tập hành động của view `v_aud_order_ban_hang` (Task 2 so tập).
- `export function laVaChamOBanHang(e: unknown): boolean` — nhận lỗi UNIQUE của chỉ mục `dsp_sales_owner_open_uq` (khuôn `isOpenHandlerCollision` ở `src/modules/dispatch/rules.ts`). Lỗi khác ⇒ `false`, để không nuốt lỗi thật.
- Đổi: `hanXacNhan(guiLucIso: string, khung: Pick<KhungGioHanhChinh, "tuPhut" | "denPhut">): string`
- Đổi: `duocQuyetDinh(i: { laNguoiLap; laNoiBo; coQuyenXetDuyet; choTuXacNhan; uuTienCuaNguoiKhac: boolean; laQuanTriHoacToanQuyen: boolean; giuDoiTac: boolean }): boolean`. Khi `uuTienCuaNguoiKhac` ⇒ `false`, trừ trường hợp `laQuanTriHoacToanQuyen && !giuDoiTac`.

- [ ] **Step 1: Viết bài đỏ.** Dùng `vn()` / `doiVn()` theo khuôn `xac-nhan-don.test.ts`:
  ```ts
  const K = { tuPhut: 420, denPhut: 1020 };
  test("16:55 + 15 phút ⇒ 07:10 hôm sau", () => assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T16:55"), 15, K)), "2026-10-28T07:10"));
  // 06:00 ⇒ 07:15 · 10:00 ⇒ 10:15 · 17:00 đúng ⇒ 07:15 hôm sau · 07:00 đúng ⇒ 07:15 · 10:00:30 ⇒ 10:15:30 · Chủ nhật vẫn tính
  test("còn lại tính phút hành chính: 17:30 với hạn 07:10 hôm sau ⇒ 10", () => assert.equal(phutGioHanhChinhConLai(vn("2026-10-27T17:30"), vn("2026-10-28T07:10"), K), 10));
  test("X mất quyền ⇒ HET_UU_TIEN ngay", () => assert.equal(trangThaiLoiMoi({ hanIso: SAU_10P, nowMs: BAY_GIO, xConHopLe: false, daKhep: false }), "HET_UU_TIEN"));
  test("Quản trị nhận thay trong ưu tiên ⇒ ok", () => assert.deepEqual(duocNhanBanHang({ ...CO_SO, laQuanTriHoacToanQuyen: true, uuTienCuaNguoiKhac: true }), { ok: true }));
  // Bán hàng khác trong ưu tiên ⇒ dang_cho_nguoi_khac · giữ quyền Đối tác ⇒ tai_khoan_lai (kể cả Quản trị lai) · đơn nháp ⇒ don_nhap
  // thẻ: mỗi điều kiện loại một ca (huỷ, qua ngày đi, đã giao, hoàn thành, ghi nhận trước mocPhatHanh, chưa đủ 15 phút)
  // cachThayTheCanhBao: Kế toán + đơn chờ ⇒ "chi_so"; HDV thuần ⇒ "khong"; Đối tác người lập ⇒ "day_du"
  test("order.modify không cộng Bán hàng phụ trách (chưa cho huỷ)", () => assert.equal(duocGiaoTheoO("order.modify", { laNguoiPhuTrach: false, laBanHangPhuTrach: true }), false));
  // order.money.edit ⇒ false · trip.call_ack ⇒ true
  // laVaChamOBanHang: UNIQUE dsp_sales_owner.order_id ⇒ true · UNIQUE dsp_assignment ⇒ false · lỗi CHECK ⇒ false
  ```
  Ở `xac-nhan-don.test.ts`: ca ban đêm cũ đổi đáp án theo khung 07–17; thêm ca `duocQuyetDinh` có `uuTienCuaNguoiKhac`.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/ban-hang-phu-trach.test.ts src/shared/xac-nhan-don.test.ts`.
- [ ] **Step 3: Viết mã.** Thuật toán đồng hồ:
  1. Đổi mốc sang phút giờ Việt Nam.
  2. Trước `tuPhut` ⇒ nhảy tới `tuPhut` cùng ngày. Từ `denPhut` trở đi ⇒ nhảy tới `tuPhut` hôm sau.
  3. Tiêu `min(còn lại, denPhut − hiện tại)`, rồi lặp lại bước 2.
  4. Giữ phần giây của mốc gốc.

  Hàm không đọc `Date.now()`.
- [ ] **Step 4: Chạy, thấy xanh**, rồi chạy `npm run typecheck`.
- [ ] **Step 5: Commit** — `Luật thuần Bán hàng phụ trách: đồng hồ giờ hành chính 07–17, lời mời, ai nhận, ai thấy thẻ (ADR-0142)`.

### Task 2: Migration

**Files:**
- Create: `migrations/<số>_ban_hang_phu_trach.sql`
- Create: `src/migrations-ban-hang-phu-trach.test.ts` (tìm tệp theo đuôi tên, theo khuôn `src/migrations-xac-nhan.test.ts`)
- Modify: `docs/data-dictionary.json` (bảng, view, cột, hạng dữ liệu), rồi `npm run dict`
- Modify: `docs/SO-HANG-RAO.md` — ba dòng, mỗi dòng kèm ngày quan sát chặn thật:
  - chỉ mục một dòng mở;
  - trigger khép một lần;
  - trigger chính sách chỉ thêm.

**Interfaces — Produces:**
- **Bảng `dsp_sales_owner`:** `(id, order_id, party_id, valid_from_at, valid_to_at NULL, created_at, created_by, updated_at, updated_by, closed_by NULL)`.
  - Chỉ mục duy nhất `dsp_sales_owner_open_uq ON (order_id) WHERE valid_to_at IS NULL`.
  - Trigger: cấm `DELETE`. `UPDATE` chỉ được đặt `valid_to_at`, `closed_by`, `updated_*`, và chỉ **một lần** (từ NULL).
  - Trigger khoá Đã giao theo khuôn `0044`, đọc `v_ord_order_state`.
- **Bảng `dsp_sales_invite`:** `(id, order_id, invitee_party_id, invited_by, recorded_at, priority_until_at, closed_at NULL, closed_by NULL, outcome NULL, created_at, updated_at, updated_by)`.
  - `outcome` là tập đóng (Hiến chương 2.2): `CHECK (outcome IN ('NHAN','TU_CHOI','NGUOI_KHAC','HUY_DON','RUT_LAI'))`.
  - `CHECK` ba cột khép (`closed_at`, `closed_by`, `outcome`) cùng NULL hoặc cùng có.
  - Chỉ mục duy nhất: một dòng mở mỗi đơn. Trigger chỉ thêm, khép một lần.
- **Bảng `dsp_sales_policy`:** `(id, valid_from_at, priority_minutes, work_start_minute, work_end_minute, created_at, created_by)`.
  - Chỉ thêm: trigger `dsp_sales_policy_no_update`, `dsp_sales_policy_no_delete`, theo khuôn `migrations/0117_han_muc_tu_choi.sql` dòng 58–63.
  - Chỉ mục duy nhất trên `valid_from_at`.
  - `CHECK priority_minutes` 1–120.
  - `CHECK 0 ≤ work_start_minute < work_end_minute ≤ 1440`.
  - Dòng gieo id `gieo-ban-hang`: 15, 420, 1020, `valid_from_at = created_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')` (lúc áp migration = lúc phát hành).
- **View:**
  - `v_dsp_sales_owner(order_id, staff_id, party_id, name)`: dòng mở, theo khuôn `v_dsp_order_handler`.
  - `v_dsp_sales_invite_open(order_id, staff_id, party_id, name, recorded_at, priority_until_at)`.
  - `v_dsp_sales_policy_current(priority_minutes, work_start_minute, work_end_minute, release_cutoff_at)`: dòng có `valid_from_at` lớn nhất; `release_cutoff_at = (SELECT created_at FROM dsp_sales_policy WHERE id = 'gieo-ban-hang')`.
  - `v_aud_order_ban_hang(id, order_id)` (module audit): `SELECT id, order_id FROM audit_log WHERE order_id IS NOT NULL AND action IN (<HANH_DONG_GAC_BAN_HANG>)`.
    - Chỉ có khoá: không chi tiết, không người, không giờ. Khuôn và lời hoàn tác theo `migrations/0089_aud_order_cmd.sql`.
    - Không mở rộng `v_aud_order_cmd`, vì tập hành động đó gắn với máy đồng bộ chuyến.
- **Cột `orders.sales_invitee_party_id TEXT NULL`.** Kèm `DROP TRIGGER orders_delivered_lock` + `CREATE TRIGGER` lại với **đủ** danh sách cột, có cột mới. Theo khuôn `0044` dòng 38–45; bài NT-R6 (`src/migrations-orders-da-giao.test.ts`) phải xanh.

- [ ] **Step 1: Viết bài đỏ.** Bài kiểm:
  - có đúng một tệp;
  - không dựng lại bảng;
  - trên D1 trong bộ nhớ: hai dòng mở cùng đơn ⇒ lỗi; khép lần hai ⇒ lỗi; `DELETE` ⇒ lỗi; `outcome` lạ ⇒ lỗi;
  - dòng chính sách gieo `gieo-ban-hang` đúng 15 / 420 / 1020;
  - thêm dòng chính sách mới ⇒ `release_cutoff_at` không đổi;
  - `UPDATE` hoặc `DELETE` trên bảng chính sách ⇒ lỗi;
  - tập hành động của `v_aud_order_ban_hang` bằng đúng `HANH_DONG_GAC_BAN_HANG` (so tập, khuôn `src/migrations-dong-bo-chuyen.test.ts`).
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/migrations-ban-hang-phu-trach.test.ts`; lúc này chưa có tệp migration. Riêng NT-R6, làm theo thứ tự:
  1. viết câu `ALTER TABLE orders ADD COLUMN` trước;
  2. chạy `node --test src/migrations-orders-da-giao.test.ts`, thấy đỏ;
  3. rồi mới thêm phần dựng lại trigger.

  Đó là lần quan sát rào chặn thật.
- [ ] **Step 3: Viết migration, `data-dictionary`, `npm run dict`, ba dòng sổ hàng rào.**
- [ ] **Step 4: Chạy, thấy xanh**, rồi `npm run db:migrate:local`, kỳ vọng áp không lỗi.
- [ ] **Step 5: Commit** — `Migration Bán hàng phụ trách: ô riêng, lời mời, chính sách giờ hành chính; cột mời trên đơn nháp (ADR-0142)`.

### Task 3: `dispatch` — SQL, câu lệnh, hàm công bố; gốc lắp ráp

**Files:**
- Create: `src/modules/dispatch/ban-hang.ts`, `src/modules/dispatch/ban-hang.test.ts`
- Modify: `src/architecture.test.ts` — thêm `{ module: "dispatch", file: "modules/dispatch/ban-hang.ts" }` vào `STRICT`, cạnh dòng `han-muc-repo.ts`.
- Modify: `src/modules/dispatch/index.ts` (xuất hàm), `src/shared/router.ts` (`Ctx` và `AppOptions.injected`), `src/index.ts` (tiêm vào).
- Modify — bộ giả trong bài thử, chỉ để `typecheck` sạch (hàm `ctx` gọi lười, nên thiếu hàm mới không làm đỏ bài):
  - `src/shared/router.test.ts`: các bộ `injected`;
  - `src/passkey-off.test.ts`: một `Ctx` giả;
  - `src/modules/auth/an-danh-phien.test.ts`: bộ riêng, ép `as never`.

  Khung thử dùng `APP_OPTIONS` thật qua `taoAppChoKhungThu` (`src/index.ts`), nên không cần sửa.

**Interfaces:**
- Consumes: Task 1 (`KhungGioHanhChinh`, `KetQuaLoiMoi`), bảng / view của Task 2.
- Produces — các hàm xuất ở `dispatch/index.ts`. `Ctx` dùng cùng tên, bỏ tham số `env` / `db`.
  - **Hàm đọc:**
    - `kiemBanHangMoi(db, staffId: string): Promise<{ ok: true; partyId: string; name: string } | { ok: false; message: string }>` — điều kiện: đang hoạt động, có hồ sơ, giữ `SALES`, không giữ `PARTNER`.
    - `danhSachBanHangMoi(db): Promise<{ staffId: string; name: string }[]>`.
    - `khungGioHanhChinh(db): Promise<KhungGioHanhChinh | null>`.
    - `laBanHangPhuTrach(db, staffId: string, orderId: string): Promise<boolean>` — bỏ qua đơn nháp, theo khuôn `IS_HANDLER`.
    - `banHangCuaDon(db, orderIds: readonly string[]): Promise<Map<string, { staffId: string; name: string }>>`.
    - `loiMoiMoCua(db, orderId: string): Promise<{ staffId: string; name: string; hanIso: string; xConHopLe: boolean } | null>`.
  - **Câu lệnh chưa chạy.** Không có hàm bọc câu chung: mỗi biến thể là một câu `defineSql` tĩnh.
    - **Cách gác:**
      - Câu nối vào lô của `orders` mang `auditId`, là id dòng nhật ký của lệnh đơn. `orders` chọn id này trước, như `opts.auditId` của `soanXacNhan`.
      - Câu đó gác bằng `EXISTS (SELECT 1 FROM v_aud_order_ban_hang WHERE id = ?auditId AND order_id = ?orderId)`.
      - Câu đi sau câu chính trong route riêng của `dispatch` gác bằng id dòng vừa mở.
    - `cauMoLoiMoi(db, x: { orderId; inviteePartyId; invitedBy; at; hanIso; auditId }): D1PreparedStatement` — gác theo nhật ký.
    - `cauMoBanHangBatBuoc(db, x: { id; orderId; partyId; actorId; at; auditId }): D1PreparedStatement` — `INSERT … SELECT … WHERE <gác nhật ký>`, **không** có `NOT EXISTS`. Dùng cho Còn vé và tự mời mình.
      - Lệnh đơn thua ⇒ 0 dòng.
      - Ô đã có người ⇒ chỉ mục duy nhất làm **cả lô** hỏng, đúng ADR Đ4.
    - `cauKhepLoiMoiSauLenhDon(db, x: { orderId; outcome: KetQuaLoiMoi; at; actorId; auditId }): D1PreparedStatement` — khép dòng mở nếu có, gác theo nhật ký. Dùng cho Còn vé, Hết vé / Huỷ, Rút lại, `/status` huỷ, `handler-cancel`.
    - `cauMoBanHangNeuTrong(db, x: { id; orderId; partyId; actorId; at }): D1PreparedStatement` — `INSERT … WHERE NOT EXISTS` (khuôn `insertHandlerIfNoneStatement`). Câu chính của route Nhận phụ trách.
    - `cauKhepLoiMoiSauNhan(db, x: { orderId; outcome: "NHAN" | "NGUOI_KHAC"; at; actorId; ownerRowId }): D1PreparedStatement` — gác bằng `EXISTS (SELECT 1 FROM dsp_sales_owner WHERE id = ?ownerRowId)`.
    - `cauTuChoiLoiMoi(db, x: { orderId; inviteePartyId; at; actorId }): D1PreparedStatement` — câu chính của Từ chối: khép bằng `TU_CHOI` dòng mở của đúng người được mời.
    - `cauDoiBanHang(db, x: { orderId; partyIdCu: string | null; idMoi: string; partyIdMoi: string | null; actorId; at }): D1PreparedStatement[]`, gồm ba câu theo thứ tự:
      1. đóng dòng mở đúng `partyIdCu` — khoá lạc quan: người khác vừa đổi ⇒ 0 dòng;
      2. mở dòng `idMoi` nếu `partyIdMoi` khác `null`, với `WHERE NOT EXISTS` dòng mở;
      3. khi có người mới: khép lời mời mở bằng `NGUOI_KHAC`, gác bằng `idMoi`.
    - **Nhật ký của route riêng `dispatch`:** gác theo câu quyết định thắng thua — dòng `idMoi` đã có, câu đóng đổi một dòng khi gỡ, hoặc câu chính `changes() > 0`. Theo khuôn route Nhận HDV hiện có ở `src/modules/dispatch/index.ts`.
    - `banHangThang(kq: D1Result[], viTri: number): boolean`
  - **Gốc lắp ráp:** `Ctx` thêm `isSalesOwner(orderId)`, `kiemBanHangMoi(staffId)`, `gioHanhChinh()`, `loiMoiMoCua(orderId)`, `banHangCuaDon(orderIds)`, cùng nhóm hàm dựng câu ở trên, đã bọc `env.DB`.

- [ ] **Step 1: Viết bài đỏ** trên D1 thử, theo khuôn `dispatch/nhan-don.test.ts`:
  - `kiemBanHangMoi` loại HDV thuần, Kế toán, tài khoản lai Bán hàng + Đối tác, tài khoản ngưng;
  - **hai lô đua** `cauMoBanHangNeuTrong` ⇒ đúng một `changes = 1`, chỉ một dòng mở; câu `cauKhepLoiMoiSauNhan` của bên thua không ghi gì;
  - `cauMoBanHangBatBuoc` với `auditId` không có trong view ⇒ 0 dòng, không lỗi;
  - lô có `cauMoBanHangBatBuoc` (auditId có thật) khi ô đã có người ⇒ cả lô hỏng (`db.batch` ném lỗi), các câu khác trong lô không còn hiệu lực, và `laVaChamOBanHang` nhận đúng lỗi đó;
  - `cauKhepLoiMoiSauLenhDon` với `auditId` không có thật ⇒ lời mời vẫn mở;
  - `laBanHangPhuTrach` trên đơn nháp ⇒ `false`;
  - `cauDoiBanHang` khép lời mời mở bằng `NGUOI_KHAC`;
  - `danhSachBanHangMoi` không có khoá `phone` / `email`.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/modules/dispatch/ban-hang.test.ts`.
- [ ] **Step 3: Viết mã + nối `router.ts`, `src/index.ts`**, theo khuôn `isAssigned` / `newOrderHandler` / `mocToiThieu`. Sửa các bộ `injected` giả.
- [ ] **Step 4: Chạy, thấy xanh** — bài trên, `node --test src/architecture.test.ts src/passkey-off.test.ts src/shared/router.test.ts src/modules/auth/an-danh-phien.test.ts`, rồi `npm run typecheck`.
- [ ] **Step 5: Commit** — `dispatch: ô Bán hàng phụ trách và lời mời — câu lệnh, hàm đọc, tiêm qua gốc lắp ráp`.

### Task 4: Quyền và danh sách trắng

**Files:**
- Modify: `src/shared/permissions.ts`
  - `order.confirm.review` → `row("any", "none", "any", "none", "none", "any", "none", "none", "none", "none")`.
  - Ô mới `dispatch.sales.claim` = `row("any", "none", "any", "none", "none", "any", "none", "none", "none", "none")`.
  - Ô mới `dispatch.sales.assign` = khuôn `quanTri()`.
  - Ô mới `dispatch.sales.invitees` = cùng hàng `order.create`.
- Modify: `src/shared/tro-ly-cau-truc-ten.ts` (`TEN_THAO_TAC`): thêm «nhận Bán hàng phụ trách», «đổi Bán hàng phụ trách», «xem danh sách Bán hàng để mời»; sửa tên lời thường của `order.confirm.review`.
- Modify — lời gọi `can()` của **năm** ô danh sách trắng có truyền `assigned`. Gọi `isSalesOwner` **một lần** mỗi request.
  - **Cách viết:** tính `assigned` ra **biến trước**, rồi mới gọi `can(staff, op, { ownerId, assigned })`. Lý do: bài `src/bang-su-kien-van-chuyen.test.ts` (quanh dòng 272–284) quét thân route tìm `can(staff, "<ô>", {` rồi cắt tới dấu `}` đầu tiên. Viết `assigned: duocGiaoTheoO(op, { … })` ngay trong `can(` sẽ làm bài đỏ.
  - `src/modules/orders/index.ts`: các chỗ `order.trip.edit`, `order.passenger.write`, `order.history.view`. Lời gọi `order.modify` **giữ nguyên**.
  - **`GET /api/orders/:id`:**
    - Hôm nay route dùng một `scope` chung cho `order.view`, `money.view`, `contact.view`, `accounting.entry.view`, `order.terms.view`, `order.history.view`, `order.modify`.
    - Thêm `isSalesOwner` vào `Promise.all` đầu route, rồi dựng `scopeDuocGiao = { ownerId, assigned: assigned || laBanHangPhuTrach }`.
    - `scopeDuocGiao` **chỉ** dùng ở hai lời gọi `order.history.view` (khối `history` và `lichSuSoKhach`). Mọi ô khác giữ `scope` cũ, để nút huỷ và ô tiền không rò theo cờ mới.
    - DTO `OrderDetailResponse` thêm `laBanHangPhuTrach: boolean`.
  - **`src/modules/van-chuyen/index.ts`:**
    - `quyenGoiBaoCua` (dòng 200–201) **không** đổi chữ ký. Thêm một hàm gộp dùng chung `giaoChoGoiBao(isAssigned, isSalesOwner) = async (id) => (await isAssigned(id)) || (await isSalesOwner(id))`, rồi đổi đối số ở **mọi** chỗ gọi `quyenGoiBaoCua(staff, isAssigned)` (khoảng 25 chỗ, dòng 1237–2425) thành `quyenGoiBaoCua(staff, giaoChoGoiBao(isAssigned, isSalesOwner))`.
    - Dòng 2391, 2413 (`trip.call_ack` có `isAssigned`) đổi theo cùng cách.
    - Hai chỗ `assigned: true` để nguyên.
  - **`src/modules/dispatch/rules.ts`:** `mayChangeHandler` và `handlerChangeVerdict` nhận thêm `laBanHangPhuTrach: boolean` (ô `dispatch.assign`). Nối cờ vào **cả hai** route gọi chúng:
    - `PUT /api/orders/:id/handler` (`src/modules/dispatch/index.ts`, quanh dòng 227–231);
    - route `tu-choi-truoc` (quanh dòng 484).
- Modify — tệp chung cho giao diện:
  - **`src/shared/order-view.ts`:**
    - `suaChuyenDuoc(viewer, ownerId, canModify, laBanHangPhuTrach)` và `suaKhachDuoc` đổi cùng chữ ký. Khi `!canModify && !laBanHangPhuTrach` ⇒ `false`; còn lại hỏi ô như cũ với `assigned: ownerId !== viewer.id`.
    - `orderActions`: đơn `confirmed` mà `!canModify` nhưng `canEditTrip` ⇒ `{ editTrip: true, cancel: false, noPermission: false, locked: true }`.
    - **Mốc Đã giao:** hôm nay `canModify` tự tắt khi đơn Đã giao (`orders/index.ts`, quanh dòng 1213), và máy chủ trả `DA_GIAO` ở `PUT …/trip`. Đường mới phải giữ đúng điều đó.
      - Thêm hàm thuần `banHangSuaDuoc(order: { deliveredAt: string | null }, laBanHangPhuTrach: boolean): boolean = laBanHangPhuTrach && order.deliveredAt === null`.
      - Hai hàm trên nhận **kết quả** của nó, không nhận cờ thô.
      - Ca bắt buộc: đơn Đã giao mà người xem là Bán hàng phụ trách ⇒ không có nút sửa chuyến, không có nút sửa khách.
    - Lý do: hôm nay giao diện suy phạm vi từ `canModify`, mà Bán hàng phụ trách không có `order.modify`. Không sửa thì họ sửa được ở máy chủ nhưng không thấy nút.
  - **`src/shared/order-view.test.ts`** (quanh dòng 136–166):
    - mô hình «máy chủ quyết» đổi thành ô `order.trip.edit` / `order.passenger.write` với `assigned = phụ trách HDV || Bán hàng phụ trách`;
    - thêm tổ hợp `laBanHangPhuTrach`;
    - ca bắt buộc: Bán hàng không phải người lập, không phụ trách HDV, là Bán hàng phụ trách ⇒ sửa chuyến được, sửa khách được, không có nút huỷ.
  - **`src/shared/handler-view.ts`** (`handlerControls`, ô `dispatch.assign`): nhận `laBanHangPhuTrach` từ DTO trang đơn.
  - **`src/shared/tin-chuyen.ts:269`** **không** đổi ở task này. `assigned` ở đó lấy từ `d.handlerStaffId` của `DongGioHen` (đường hộp thư), nên chuyển sang Task 6.
- Create: `src/ban-hang-khong-lan-o-tien.test.ts` — rào quét mã:
  - chữ `isSalesOwner` / `laBanHangPhuTrach` không có trong `src/modules/billing/`, `src/modules/receipt/`;
  - `duocGiaoTheoO` không bao giờ được gọi với `order.modify`, `order.cancel`, `order.money.edit`, `order.handover`, `payment.receive`, `dispatch.refuse`.
- **Test sẽ đỏ theo hàng mới** (Kế toán, HDV mất `order.confirm.review`). Người kiểm đã thử đổi đúng dòng hàng này trên bản sao: 30 bài đỏ trong 9 tệp.
  - `src/shared/`: `permissions.test.ts`, `thong-bao-xac-nhan.test.ts`, `viec-cua-ban-don-cho.test.ts`, `viec-cua-ban.test.ts`, `bang-tin.test.ts`.
  - `src/modules/orders/`: `xac-nhan-quyet-dinh.test.ts`, `xac-nhan-doc.test.ts`, `xac-nhan-trang-don.test.ts`.
  - `src/shared/tro-ly-cau-truc.test.ts`: đỏ vì tệp sinh ra chưa chạy lại. Chạy `node scripts/sinh-so-do-trang.mjs` ngay ở task này.
- **Bài ghim chạy lại:**
  - `src/shared/`: `cong-quyen.test.ts`, `order-view.test.ts`, `tro-ly-van-nghia.test.ts`;
  - `src/`: `route-write-guard.test.ts`, `giao-dien-hoi-bang-quyen.test.ts`, `bang-su-kien-van-chuyen.test.ts`;
  - `src/modules/orders/xem-don-theo-quyen.test.ts`.

- [ ] **Step 1: Viết bài đỏ:**
  - ghim ba hàng mới và hàng `order.confirm.review` mới;
  - rào quét mã;
  - ca Bán hàng phụ trách mới ở `order-view.test.ts`;
  - sửa đáp án chín tệp ở trên theo hàng mới (Kế toán / HDV ⇒ không thấy thẻ, không nhận tin lúc gửi, quyết định ⇒ 403, mở đơn chờ ⇒ 404).
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/permissions.test.ts src/ban-hang-khong-lan-o-tien.test.ts src/shared/order-view.test.ts src/shared/viec-cua-ban-don-cho.test.ts src/shared/viec-cua-ban.test.ts src/shared/thong-bao-xac-nhan.test.ts src/shared/bang-tin.test.ts src/modules/orders/xac-nhan-quyet-dinh.test.ts src/modules/orders/xac-nhan-doc.test.ts src/modules/orders/xac-nhan-trang-don.test.ts`.
- [ ] **Step 3: Sửa `MATRIX`, `TEN_THAO_TAC` và các lời gọi.** `src/permission-enforcement.test.ts` sẽ đỏ «ô chưa được hỏi» cho ba ô mới cho tới Task 5. Đó là đỏ có chủ ý, ghi vào commit; không thêm mục hoãn vào `docs/quyen-hoan.json`.
- [ ] **Step 4: Chạy lại** mọi bài của Step 2 và bài ghim, rồi `npm run typecheck`. Kỳ vọng: xanh, trừ `permission-enforcement`. Quan sát rào quét mã **đỏ thật một lần**: cố ý thêm `isSalesOwner` vào một tệp `billing`, chạy rào, rồi hoàn nguyên. Ghi một dòng vào `docs/SO-HANG-RAO.md`, kèm ngày.
- [ ] **Step 5: Commit** — `Quyền ADR-0142: chỉ Bán hàng / Quản trị / Toàn quyền xác nhận đơn cần kiểm; ba ô Bán hàng phụ trách; «được giao» theo danh sách trắng (không huỷ)`.

### Task 5: Route

**Files:**
- Modify: `src/modules/orders/index.ts` và `src/modules/orders/xac-nhan-repo.ts` (SQL mới của `orders` chỉ ở tệp này).
  - **Mời lúc lập:** `POST /api/orders` và `PUT` đơn nháp nhận `banHangMoiStaffId: string | null`.
    - Kiểm bằng `ctx.kiemBanHangMoi`; sai ⇒ 400 `invalid_invitee`, không lưu.
    - Ghi `orders.sales_invitee_party_id`; `null` thì xoá ý định.
  - **Bốn điểm ghi nhận:** `/status` xác nhận, `gui-don` nhánh B, `gui-xac-nhan`, `gui-don` nhánh A. Ở mỗi điểm, khi đơn có `sales_invitee_party_id`:
    1. Gọi lại `ctx.kiemBanHangMoi`. Không còn hợp lệ ⇒ không mời; đơn thành Chờ Bán hàng nhận; người lập được báo.
    2. X là hồ sơ của chính người lập **và** đơn không cần kiểm ⇒ thêm `cauMoBanHangBatBuoc` (thiết kế L3).
    3. Còn lại ⇒ thêm `cauMoLoiMoi` với `hanIso = congPhutGioHanhChinh(at, khung.phutUuTien, khung)` và nhật ký `sales_invited`.

    Các câu này đi **cùng lô** và đứng **sau** câu xác nhận / mở yêu cầu.
    - Chúng mang `auditId` của dòng nhật ký `confirmed` / `order_confirm_requested` của lô đó.
    - Nơi gọi chọn `auditId` trước, như `opts.auditId` của `soanXacNhan`.
    - `soanHuyDon` đã trả `auditId`. Hai hàm chưa lộ `auditId` là `confirmOrder` (`repository.ts`, quanh dòng 1074, chưa có tham số `opts`) và `cancelOrderByHandler`: thêm theo cùng cách. Lô gửi xác nhận (`xac-nhan-route.ts`, quanh dòng 51) đã chọn `auditId` trước.
    - Nhật ký `sales_invited` cũng gác theo `auditId` đó.
  - **Route mới** `GET /api/orders/chua-co-ban-hang`, đặt **trước** `GET /api/orders/:id` trong mảng route (router lấy route khớp đầu tiên):
    - cổng `order.view`;
    - nguồn ứng viên: đơn chưa huỷ, `confirmed` (lúc ghi nhận = `confirmed_at`) hoặc `draft` có yêu cầu mở (lúc ghi nhận = `submitted_at`);
    - lọc bằng `vaoTheCanhBao` + `cachThayTheCanhBao` + `ctx.banHangCuaDon` + `ctx.gioHanhChinh`;
    - trả `{ don: TheDonDto[]; soDonChoXacNhanAn: number }`.
- Modify: `src/modules/orders/xac-nhan-route.ts`
  - **`quyet-dinh`:** cổng ưu tiên qua `duocQuyetDinh` mới.
    - `duocQuyetDinh` còn người gọi thứ hai: `src/modules/orders/xac-nhan-chung.ts` (quanh dòng 203, trường `quyetDinhDuoc` của DTO). Truyền cùng đầu vào.
    - **Còn vé** ⇒ lô `[...cauDau, ...xn.cau, khep, cauMoBanHangBatBuoc({ người bấm, auditId }), cauKhepLoiMoiSauLenhDon({ laX ? NHAN : NGUOI_KHAC, auditId })]`.
      - Người bấm giữ quyền Đối tác (tài khoản lai, Review Focus 4) ⇒ lô **không** có hai câu cuối: đơn được xác nhận, ô trống, lời mời giữ nguyên.
      - Trong `catch`, xét `laVaChamOBanHang(e)` **trước** `dichLoiXacNhan(e)`. Trúng ⇒ 409 `stale` «Đơn vừa có Bán hàng phụ trách, hãy tải lại.», không 500.
      - Lỗi khác ném tiếp.
    - **Hết vé / Huỷ** ⇒ thêm `cauKhepLoiMoiSauLenhDon({ HUY_DON, auditId của dòng huỷ })`.
  - **`rut-xac-nhan`:** thêm `cauKhepLoiMoiSauLenhDon({ RUT_LAI, auditId của dòng order_confirm_withdrawn })`.
  - **Hạn yêu cầu:** `hanXacNhan(guiLuc, await ctx.gioHanhChinh())`; thiếu khung ⇒ 503, như `mocToiThieu`.
  - **Mở rộng hai bài đua có sẵn** ở `src/modules/orders/xac-nhan-quyet-dinh.test.ts`: «Rút lại chen GIỮA lúc đọc và lúc ghi» (quanh dòng 198) và «Gửi lại chen sau Rút lại» (quanh dòng 215). Khẳng định thêm:
    - đơn có 0 dòng `dsp_sales_owner`;
    - lời mời vẫn đúng trạng thái trước lô thua.
- Modify — đường huỷ thêm `cauKhepLoiMoiSauLenhDon({ HUY_DON, auditId })`:
  - `/status` huỷ (`orders`);
  - `handler-cancel` (`dispatch`):
    - Route này import thẳng `cancelOrderByHandler` của `orders` (`dispatch/index.ts`, quanh dòng 298). `auditId` sinh bên trong `soanHuyDon`, còn `cauSauHuy` được dựng trước lúc gọi (quanh dòng 296).
    - Đổi tham số `cauSauHuy` thành hàm `(auditId: string) => D1PreparedStatement[]`.
    - Đặt hàm đó **trước** `noiChuyen`, để bài NT-6 (`src/dong-bo-chuyen-guard.test.ts`, quanh dòng 108) vẫn bóc đúng thân hàm.
- Create: `src/modules/dispatch/ban-hang-route.ts`, nối vào mảng route của `dispatchModule`:
  - **`GET /api/dispatch/ban-hang-moi`** (`dispatch.sales.invitees`) → `{ banHang: { staffId, name }[] }`.
  - **`GET /api/dispatch/ban-hang?orderIds=…`** (≤ 30) → `{ [orderId]: { banHang: { staffId, name } | null; loiMoi: { staffId, name, conPhut } | null; laBanHangPhuTrach: boolean } }`.
    - Chỉ đơn người gọi xem được qua `order.view`, **kể cả Đối tác / Thực tập** với đơn của mình. Họ chỉ nhận tên, không mã, không lời mời.
    - Khác `GET /api/dispatch/handlers`, route đó giữ 403.
  - **`POST /api/orders/:id/ban-hang/nhan`** (`dispatch.sales.claim`).
    - Chỉ đơn `confirmed`; đơn chờ xác nhận ⇒ 409 `can_quyet_dinh` «Đơn cần kiểm vé — hãy chọn Còn vé / Hết vé».
    - Cổng qua `duocNhanBanHang`.
    - Lô theo thứ tự: `cauMoBanHangNeuTrong({ id })` → nhật ký `sales_owner_claimed` với `changes() > 0` (đứng **ngay sau** câu chính, để `changes()` còn trỏ đúng câu đó) → `cauKhepLoiMoiSauNhan({ laX ? NHAN : NGUOI_KHAC, ownerRowId: id })`. Thua ⇒ 409.
  - **`POST /api/orders/:id/ban-hang/tu-choi`:** chỉ X, khi lời mời còn mở. Lô: `cauTuChoiLoiMoi` + nhật ký `sales_invite_refused` với `changes() > 0`.
  - **`PUT /api/orders/:id/ban-hang`** `{ staffId: string | null }` (`dispatch.sales.assign`).
    - Chỉ đơn `confirmed`; nháp ⇒ 409 `don_nhap`. Không chặn đơn cũ.
    - Người được đặt phải qua `kiemBanHangMoi`, hoặc là chính Quản trị / Toàn quyền đang gọi.
    - Lô: `cauDoiBanHang` + nhật ký `sales_owner_changed`.
  - **`GET` và `POST /api/cai-dat/ban-hang-phu-trach`** (`settings.ops`): đọc / thêm một dòng `dsp_sales_policy` (Đ5). Chỉ API, không giao diện. Theo khuôn `/api/cai-dat/xac-nhan-don` (`xac-nhan-route.ts`, quanh dòng 344):
    - `valid_from_at = max(lúc ghi, dòng mới nhất + 1 ms)`;
    - gửi đúng giá trị đang hiệu lực ⇒ 200, không ghi;
    - va UNIQUE ⇒ 409 `stale`.
- Modify: `src/shared/audit-actions.ts` thêm bốn hành động:
  - `sales_invited` «Mời Bán hàng phụ trách»;
  - `sales_owner_claimed` «Nhận Bán hàng phụ trách»;
  - `sales_owner_changed` «Đổi Bán hàng phụ trách»;
  - `sales_invite_refused` «Từ chối phụ trách đơn»;
  - `sales_policy_changed` «Đổi cài đặt Bán hàng phụ trách» (không gắn đơn).
  - Chi tiết (`detail`) của năm hành động không chứa tên, mã người hay SĐT.
- Modify — phân loại lịch sử (thiếu thì `src/shared/lich-su-noi-bo.test.ts` và `src/lich-su-don-doi-tac.test.ts` đỏ):
  - `src/shared/lich-su-noi-bo.ts`: cả bốn vào `LICH_SU_NOI_BO_CHO_PHEP`, giá trị `"giu"`. Việc này buộc sửa danh sách «chủ duyệt» `DUYET` trong `src/shared/lich-su-noi-bo.test.ts` (dòng 14–26, 41–43), nên **cần chủ duyệt bốn dòng này trước Task 5**. Chủ không duyệt thì đưa cả bốn vào `LICH_SU_NOI_BO_AN`.
  - Hành động thứ năm `sales_policy_changed` «Đổi cài đặt Bán hàng phụ trách» (nhật ký không gắn đơn của route chính sách): vào danh sách **ẩn** của cả hai lịch sử, như `confirm_policy_changed`;
  - `src/shared/lich-su-doi-tac.ts`: cả bốn vào `LICH_SU_DOI_TAC_AN`, **không** vào `LICH_SU_DOI_TAC_CHO_PHEP` (danh sách đó phải khớp danh sách chủ duyệt trong bài).
- Modify: `src/shared/contracts.ts` (DTO mới).
- Create: `tests/e2e/ban-hang-phu-trach.mjs` (khuôn `tests/e2e/xac-nhan-don.mjs`, mã danh mục giả `ZXN1` / `ZXN2`).
- Create: `src/ban-hang-ghep.test.ts` — bài ghép theo khuôn `src/dong-bo-chuyen-ghep.test.ts`:
  - mọi điểm gọi câu gác nhật ký của `dispatch` truyền `auditId` là id một dòng nhật ký của đúng đơn đó, hành động ∈ `HANH_DONG_GAC_BAN_HANG`;
  - danh sách route đã chạy bằng đúng các route có lời gọi.
- Modify: `tests/e2e/xac-nhan-don.mjs` — tài khoản Kế toán `ACC` được dùng ở 14 chỗ:
  - các chỗ đó gồm hàm `quyet` đọc danh sách chờ (quanh dòng 43), vòng (b) (74–80), đua `[ACC, SUPER]` (125), dòng 104 và 177;
  - đổi người bấm sang một tài khoản Bán hàng;
  - thêm ca Kế toán / HDV gọi `quyet-dinh` ⇒ 403.
- Modify: `tests/e2e/permissions.mjs` dòng 32: Kế toán và HDV gọi `GET /api/orders/cho-xac-nhan` nay nhận 403, vì route hỏi `order.confirm.review`.

**Interfaces:**
- Consumes: Task 1, Task 3 (`ctx.*`), Task 4 (ô quyền).
- Produces: các route và DTO trên (Task 6, Task 7 dùng).

- [ ] **Step 1: Viết e2e đỏ**, gồm các nhóm ca:
  - **B.10:** 14 ca của thiết kế. Ca 8 sửa theo ADR:
    - Bán hàng phụ trách **không** huỷ được ⇒ 403;
    - sửa thông tin chuyến được;
    - trang đơn trả `laBanHangPhuTrach: true`, `canModify: false`.
  - **Bốn ca của ADR-0142:**
    - Quản trị nhận thay trong ưu tiên ⇒ thành công, X có tin;
    - Bán hàng khác ⇒ 409;
    - Bán hàng phụ trách gọi `/status` huỷ ⇒ 403;
    - Đối tác thấy tên Bán hàng phụ trách, còn `handlers` ⇒ 403.
  - **Review Focus:**
    - R1: gỡ quyền Bán hàng của X ⇒ Y nhận ngay; lúc ghi nhận X đã mất quyền ⇒ không có dòng lời mời;
    - R2: đơn huỷ trong ưu tiên ⇒ X Nhận 409, lời mời `HUY_DON`;
    - R4: tài khoản lai.
  - **Lô nguyên khối:** chèn trước một dòng mở Bán hàng bằng SQL rồi bấm Còn vé ⇒ 409; đơn vẫn nháp; yêu cầu vẫn mở; không có dòng nhật ký `confirmed`.
  - **Đơn cũ:** lập rồi xác nhận một đơn, sau đó dùng SQL lùi `confirmed_at` về trước mốc phát hành ⇒ không vào thẻ, Nhận ⇒ 409 `don_cu`, nhưng Quản trị Đổi được. **Không** gieo mốc tương lai, vì D1 e2e dùng chung.
  - **Đổi:** Quản trị đổi trên đơn nháp ⇒ 409; đổi trên đơn đã có lời mời mở ⇒ lời mời khép `NGUOI_KHAC`.
- [ ] **Step 2: Chạy, thấy đỏ** — `npm run test:e2e -- ban-hang-phu-trach` (cần mạng).
- [ ] **Step 3: Viết mã route.** Thứ tự cổng: 403 quyền → đọc thân → 400 dạng → 404 / 409 trạng thái → ghi. Mỗi lệnh ghi là **một** `db.batch`.
- [ ] **Step 4: Chạy lại** e2e đó, `node --test src/permission-enforcement.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/ban-hang-ghep.test.ts src/modules/orders/xac-nhan-quyet-dinh.test.ts src/shared/lich-su-noi-bo.test.ts src/lich-su-don-doi-tac.test.ts`, rồi `npm run typecheck`. Kỳ vọng xanh.
- [ ] **Step 5: Commit** — `Route Bán hàng phụ trách: mời lúc lập, ghi nhận, Còn vé thành người phụ trách, nhận / từ chối / đổi, thẻ cảnh báo, chính sách`.

### Task 6: Thông báo

**Files:**
- Modify: `src/shared/bang-tin.ts`
  - `THAY_DOI` thêm `"moi_ban_hang"`, `"ban_hang_nhan"`, `"ban_hang_tu_choi"`, `"cho_ban_hang"`, `"doi_ban_hang"`.
  - `nhanSuKien` nhận thêm `banHang?: string | null`; thêm nhãn Bán hàng phụ trách cho `nhan`, `giao`, `huy`, `hoan_thanh`.
  - `thongBaoNoi`: câu tiếng Việt cho năm loại mới. Câu gửi Đối tác / Thực tập không có tên người làm.
- Modify: `src/modules/thongbao/repository.ts` (`LIST_DON`). Hộp thư tính người nhận lúc đọc, theo **trạng thái hiện tại**; đọc thêm `v_dsp_sales_owner` và `v_dsp_sales_invite_open`:
  - `sales_invited` ⇒ X khi lời mời còn mở, hoặc khi X đang là Bán hàng phụ trách;
  - yêu cầu có X ⇒ chỉ X trong ưu tiên;
  - Hoàn thành ⇒ Bán hàng phụ trách + người lập;
  - Đổi ⇒ người mới + người lập.

  Biết và chấp nhận: lời mời gửi lại cho một X khác làm sự kiện `sales_invited` cũ hiện thêm cho người mới, vì hộp thư chỉ biết trạng thái hiện tại.

  Người cũ khi Đổi, và X khi người khác đã nhận, **không** có dòng hộp thư. Họ nhận qua Bảng tin và báo đẩy lúc sự kiện (`baoThayDoi` truyền `banHangTruoc`), giống cách ô HDV làm hôm nay (`handlerTruoc` giả ở `src/shared/thong-bao.ts`, quanh dòng 192–194).
- Modify — đường giờ hẹn của chuyến:
  - `src/modules/thongbao/repository.ts` (câu đọc dòng giờ hẹn, quanh dòng 25–34 và 297) và `src/shared/thong-bao.ts` (quanh dòng 223): `DongGioHen` thêm `banHangStaffId: string | null`, lấy từ `v_dsp_sales_owner`;
  - `src/shared/tin-chuyen.ts:269` tính `assigned = d.handlerStaffId === người xem || d.banHangStaffId === người xem` (ô `trip.call_ack`, chuyển từ Task 4).
- Modify: `src/shared/thong-bao.ts` (`locHopThongBao`, `loaiTinDon`, `HANH_DONG_TIN_DON`), `src/shared/contracts.ts` (`LoaiTin`), `src/shared/web-push.ts` (`HANH_DONG_CUA_THAY_DOI`).
  - Báo đẩy chỉ có cho: lời mời → X; có Bán hàng phụ trách → người lập.
  - `cho_ban_hang` **không** báo đẩy.
- Modify: `src/index.ts` — `baoThayDoi` đọc thêm `banHangCuaDon`, và nhận `banHangTruoc` cho sự kiện Đổi.
- Create: `migrations/<số>_hop_thu_ban_hang.sql`: `DROP VIEW` + `CREATE VIEW v_aud_order_event`.
  - Chép điều kiện từ **bản mới nhất** trong `migrations/` (đã có phần `0120` của nhánh hộp thư).
  - Thêm `sales_invited`, `sales_owner_claimed`, `sales_owner_changed`, `sales_invite_refused`, `order_completed`.
  - Không thêm `order_handler_refused` (chủ đã quyết, xem `docs/CHANGE-GUIDE.md` mục hộp thư).
  - Sửa bài ghim view theo cách nhánh hộp thư đã làm.
- Test: `src/shared/bang-tin.test.ts`, `src/shared/thong-bao.test.ts`, `src/shared/web-push.test.ts` (tên theo tệp có sẵn), bài ghim view.

- [ ] **Step 1: Viết bài đỏ**, mỗi dòng của bảng L9 (thiết kế) cộng dòng «Đổi» một ca. Phải có:
  - Hoàn thành ⇒ Bán hàng phụ trách và người lập có tin trong hộp thư;
  - `cho_ban_hang` không có trong `nguoiNhanDay`;
  - yêu cầu có X ⇒ người khác giữ `order.confirm.review` không nhận tin trong ưu tiên;
  - Đối tác người lập ⇒ có trong hộp thư, không tin nổi, câu không có tên người làm.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/bang-tin.test.ts src/shared/thong-bao.test.ts src/shared/web-push.test.ts` + bài ghim view.
- [ ] **Step 3: Viết mã + migration.**
- [ ] **Step 4: Chạy, thấy xanh**, rồi `npm run db:migrate:local` và `npm run typecheck`. Thêm ca thông báo vào e2e của Task 5, chạy riêng tệp đó.
- [ ] **Step 5: Commit** — `Thông báo Bán hàng phụ trách: lời mời, nhận, từ chối, đổi, chờ Bán hàng nhận; hộp thư nhận hoàn thành`.

### Task 7: Giao diện

**Files:**
- Modify: `web/order-form.ts`
  - Thêm khối «Bán hàng phụ trách» cho mọi người lập, gọi `GET /api/dispatch/ban-hang-moi`. Bảng chọn theo khuôn `web/assignee-picker.ts`, không có nút Lưu riêng.
  - Khối người phụ trách cũ đổi nhãn «Hướng dẫn viên», danh sách chỉ nhóm HDV (chỉ đổi giao diện).
- Modify: `web/order.ts`
  - Hiện dòng «Bán hàng: <tên>», hoặc chip «Chờ Bán hàng nhận», hoặc «Đang mời <X> · còn N phút».
  - Nút: Nhận / Từ chối chỉ X thấy (đơn chờ xác nhận: Nhận mở bảng Còn vé / Hết vé có sẵn); Nhận phụ trách; Đổi Bán hàng (Quản trị, Toàn quyền, chỉ đơn đã xác nhận).
  - Nút Nhận của ô cũ đổi thành «Nhận làm HDV».
  - Đối tác / Thực tập chỉ thấy dòng tên, không nút.
  - Lời gọi `suaChuyenDuoc` / `suaKhachDuoc` (quanh dòng 1290, 1298) truyền `laBanHangPhuTrach` của DTO trang đơn; `web/order-form.ts` (quanh dòng 781, 788) cũng vậy.
- Modify: `web/orders.ts` — thẻ đơn thêm dòng Bán hàng; mỗi trang một lời gọi `GET /api/dispatch/ban-hang?orderIds=`, không chờ.
- Modify: `web/home.ts`, `src/shared/viec-cua-ban.ts`, `src/shared/pham-vi-so.ts` (`PHAM_VI_O_TRANG_CHU`), `src/shared/pham-vi-so.test.ts`.
  - Khoá thẻ mới `"chuaBanHang"`, nhãn «Đơn chưa có Bán hàng phụ trách», `hien` theo `cachThayTheCanhBao`.
  - Thẻ `chuaPhuTrach` cũ đổi nhãn «Đơn chưa có HDV nhận».
  - Thẻ `donCho` giữ `can(w, "order.confirm.review")` nhưng **bỏ** dòng phụ «quá hạn», vì quá hạn nay hiện ở thẻ mới.
- Modify: `public/app.css` nếu cần token mới.
- Create: `docs/evidence/2026-10-27-ban-hang-phu-trach/kich-ban/ban-hang-phu-trach-smoke.mjs` (390 + 1040). Kịch bản:
  - Bán hàng mời, X nhận;
  - Bán hàng phụ trách (không phải người lập) thấy nút sửa thông tin chuyến và sửa khách; không thấy nút Huỷ, không thấy dòng «Chỉ … mới được sửa»;
  - Đối tác lập, mời, thấy tên;
  - Kế toán thấy thẻ (đơn chờ chỉ là số);
  - Quản trị nhận thay. Mở tab của tài khoản cần kiểm sau cùng, vì các tab dùng chung kho cookie.
- Modify: `web/CLAUDE.md` — chỉ **thêm dòng** kịch bản mới vào bảng, không đổi nghĩa quy tắc.
  - `chon-hdv-lap-don-smoke.mjs`, `xac-nhan-smoke.mjs`, `trang-chu-smoke.mjs`: sửa đúng các bước đổi nhãn / Kế toán mất nút.
  - Bước nào đã bị kịch bản mới thay thì ghi «thay bằng ban-hang-phu-trach-smoke.mjs» ở đầu tệp và không chạy lại.

- [ ] **Step 1: Chạy kịch bản mới, thấy đỏ** — `node docs/evidence/2026-10-27-ban-hang-phu-trach/kich-ban/ban-hang-phu-trach-smoke.mjs`. Cần `AXE_JS`; thiếu thì ghi rõ chưa kiểm màu.
- [ ] **Step 2: Viết giao diện**, làm một khổ cho tới khi xanh rồi mới sang khổ thứ hai.
- [ ] **Step 3: Chạy lại, thấy xanh**, rồi `npm run build:web` và `npm run typecheck`.
- [ ] **Step 4: Chụp ảnh thật** form, trang đơn, Trang chủ ở hai khổ, cho bốn vai: Bán hàng, Đối tác, Kế toán, Quản trị. **Chủ duyệt ảnh trước khi gộp.**
- [ ] **Step 5: Commit** — `Giao diện Bán hàng phụ trách: form mời, trang đơn, thẻ đơn, thẻ cảnh báo Trang chủ`.

### Task 8: Tài liệu, Trợ giúp, nhật ký thay đổi, bất biến

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` §5, §6, §7, §15; `docs/CHANGE-GUIDE.md`, gồm công thức và bẫy: danh sách trắng không có `order.modify`; không nới `isOrderHandler`; thêm cột `orders` thì phải dựng lại `orders_delivered_lock`.
- Modify: Trợ giúp theo vai Bán hàng, Đối tác, Kế toán, HDV (`src/shared/huong-dan-*.ts`). Bỏ mọi câu nói Kế toán / HDV bấm Còn vé.
- Modify: `src/shared/changelog.ts` + `src/shared/app-info.test.ts`. Số phiên bản **tạm** = số trên `main` lúc làm + 1, ghi «TẠM».
- Modify: `scripts/audit-checks.mjs` + `src/audit-invariants.test.ts`:
  - `R-DSP-8`: mỗi đơn có ≤ 1 dòng Bán hàng phụ trách mở;
  - `R-DSP-9`: mỗi đơn có ≤ 1 lời mời mở;
  - `R-DSP-10` (cảnh báo): lời mời mở trên đơn đã huỷ;
  - `R-DSP-11` (cảnh báo): người giữ ô Bán hàng phụ trách không còn giữ Bán hàng / Quản trị / Toàn quyền, hoặc có giữ Đối tác (khuôn `handlerAccountEligible`);
  - `R-DSP-12`: dòng gieo `gieo-ban-hang` của chính sách còn nguyên. Đây là mốc phát hành; trigger cấm xoá là lớp một. Khuôn `R-DSP-7`.
  - `src/audit-invariants.test.ts` đang ghim đúng danh sách `R-DSP-1…7`: thêm năm mã mới.

- [ ] **Step 1: Viết bài đỏ** cho năm bất biến và dòng nhật ký thay đổi.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/audit-invariants.test.ts src/shared/app-info.test.ts`.
- [ ] **Step 3: Viết mã và tài liệu.**
- [ ] **Step 4: Chạy, thấy xanh**, rồi `node scripts/audit-invariants.mjs --db local`, kỳ vọng thoát 0.
- [ ] **Step 5: Commit** — `Tài liệu, Trợ giúp, nhật ký thay đổi, bất biến cho Bán hàng phụ trách`.

### Task 9: Bộ kiểm dài một lần, người kiểm độc lập, lệnh cho chủ

- [ ] **Step 1:** Tắt mọi `wrangler dev` mồ côi, rồi chạy **một lần**: `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e`. Kỳ vọng: tất cả xanh. Bài nào đỏ thì ghi tên bài và lý do vào báo cáo, kể cả khi không do nhánh này.
- [ ] **Step 2:** Giao `nguoi-kiem-doc-lap` kiểm cả nhánh, theo ba điểm:
  1. Quyền: danh sách trắng, không huỷ, Kế toán / HDV mất đọc đơn chờ, Đối tác chỉ thấy tên, tài khoản lai.
  2. Dữ liệu: ba bảng, trigger, một dòng mở, khoá Đã giao có cột mới, migration không sửa tệp cũ.
  3. Lô Còn vé nguyên khối.

  Người kiểm tin số của Step 1, chỉ chạy lại bài liên quan. Sửa theo báo cáo, rồi kiểm lại đúng các điểm đã sửa.
- [ ] **Step 3:** Ghi mục «ĐANG CHỜ PHÁT HÀNH» ở `docs/HANDOFF-N1.md` (có migration, cần `npm run trien-khai`), và cập nhật bảng việc ở đầu tệp này.
  - Ghi chú trong mục đó: đơn ghi nhận trong khe giữa lúc áp migration và lúc `wrangler deploy` được tính là đơn mới, vì mốc phát hành là lúc áp migration.
  - `npm run trien-khai` chạy hai bước liền nhau nên khe rất ngắn; nếu thẻ cảnh báo có đơn ghi nhận trong khe đó thì rà tay (giống ghi chú của `R-DSP-6`).
- [ ] **Step 4:** Dựng nhánh trên `main` mới nhất của máy. Đưa chủ **một lần**, mỗi lệnh một khối, kèm `cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales`: `npm run day-len -- <nhánh>`, rồi `npm run trien-khai`. Ghi rõ «cần triển khai, có migration».
