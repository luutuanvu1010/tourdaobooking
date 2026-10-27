# Bán hàng phụ trách đơn (Phần 1 luồng việc theo vai) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi đơn có một ô «Bán hàng phụ trách» riêng. Người lập mời được một Bán hàng; người được mời có 15 phút giờ hành chính ưu tiên; ai xác nhận / nhận thì người đó phụ trách. Đơn chưa có Bán hàng phụ trách quá 15 phút thì hiện thẻ cảnh báo ở Trang chủ.

**Architecture:**
- `dispatch` sở hữu hai bảng mới (ô Bán hàng phụ trách, lời mời) và dòng chính sách giờ hành chính.
- `orders` chỉ giữ ý định mời trên đơn nháp (một cột). `orders` nhận câu lệnh và hàm đọc của `dispatch` qua gốc lắp ráp (`src/index.ts`), vì `orders` không import `dispatch`.
- Quyền «được giao» của ô mới là danh sách trắng, qua một cờ tiêm riêng; không nới `isOrderHandler`.
- Luật thuần (đồng hồ, trạng thái lời mời, ai nhận được, đơn nào vào thẻ) ở một tệp `src/shared/` dùng chung máy chủ và giao diện.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), esbuild, `node --test`, e2e `tests/e2e/*.mjs`, kịch bản Chrome (`docs/evidence/**/kich-ban/*.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-27-ban-hang-phu-trach-don-design.md` (mục B là luật L1–L11, B.9 trang ghép, B.10 tiêu chí). Quyết định: `docs/adr/ADR-0142-ban-hang-phu-trach-don.md`. Người thi công đọc **cả hai** trước Task 1.

## Bảng việc (sổ sống của đợt — cập nhật cột Trạng thái khi xong mỗi task)

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 1 | Luật thuần: đồng hồ giờ hành chính, lời mời, ai nhận, thẻ | bài `src/shared/ban-hang-phu-trach.test.ts` + `xac-nhan-don.test.ts` đỏ→xanh | chưa làm |
| 2 | Migration: hai bảng `dispatch`, chính sách, view, cột mời trên `orders` | bài migration đỏ→xanh; `data-dictionary` + `npm run dict` | chưa làm |
| 3 | `dispatch`: SQL, câu lệnh, hàm công bố; gốc lắp ráp tiêm vào `ctx` | bài `dispatch/ban-hang.test.ts` xanh; `typecheck` 0 lỗi | chưa làm |
| 4 | Quyền: hàng `order.confirm.review`, ba ô mới, danh sách trắng «được giao» | các bài ghim quyền + bài rào mới xanh | chưa làm |
| 5 | Route: mời lúc lập, ghi nhận, quyết định, nhận / từ chối / đổi, danh sách, thẻ | e2e `ban-hang-phu-trach.mjs` các ca của B.10 | chưa làm |
| 6 | Thông báo: Bảng tin, hộp thư (view mới), báo đẩy | bài thuần + e2e ca thông báo | chưa làm |
| 7 | Giao diện: form, trang đơn, thẻ đơn, Trang chủ; kịch bản Chrome; ảnh cho chủ | kịch bản `ban-hang-phu-trach-smoke.mjs` 390 + 1040 xanh; ảnh gửi chủ | chưa làm |
| 8 | Tài liệu, Trợ giúp theo vai, nhật ký thay đổi, bất biến dữ liệu | `audit-invariants --db local` thoát 0; bài nhật ký xanh | chưa làm |
| 9 | Chạy bộ dài MỘT lần + người kiểm độc lập + lệnh cho chủ | `npm test`, `typecheck`, `build:web`, `test:e2e` xanh; người kiểm báo «đạt» | chưa làm |

## Global Constraints
- Chữ người dùng thấy: tiếng Việt **có dấu**, không chữ Anh hay mã thô. Gọi hệ thống là «Nền tảng». Không dùng chữ «tự do»; dùng «Chờ Bán hàng nhận».
- Giao diện: không `innerHTML` (dựng bằng `h()`); giá trị CSS vào token ở đầu `public/app.css`; ô gõ 16px; luật đầy đủ `web/CLAUDE.md`.
- Thời gian: dấu thời gian ISO UTC; giờ hành chính tính theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè).
- Không xoá cứng. Bảng mới chỉ thêm; «khép» một lần. Một dòng mở mỗi đơn, chặn bằng chỉ mục duy nhất có điều kiện **và** kiểm ở mã (Hiến chương 5.1).
- `dispatch` là module «nghiêm»: SQL qua `defineSql` (`src/shared/sql-registry.ts`), câu tĩnh. `orders` không import `dispatch`, mọi thứ qua `ctx`. Đọc xuyên module chỉ qua view `v_dsp_*`.
- Migration: chỉ thêm tệp mới. Số = số lớn nhất trong `migrations/` + 1, kiểm **mọi nhánh và worktree chưa gộp** ngay trước khi tạo tệp. Phiên «Sửa hộp thông báo thiếu tin chờ xác nhận» đang chạy song song và sẽ lấy một số, đồng thời định nghĩa lại `v_aud_order_event`. Task 6 phải dựng trên bản view mới nhất trong `migrations/` lúc làm.
- Nhật ký (`audit_log`): không SĐT, email, MST. Hành động mới khai ở `src/shared/audit-actions.ts` có nhãn tiếng Việt.
- Ba con số chính sách: 15 phút, 07:00 (phút 420), 17:00 (phút 1020).
- Quyền «được giao» của Bán hàng phụ trách chỉ gồm: `order.modify`, `order.history.view`, `order.trip.edit`, `order.passenger.write`, `dispatch.assign`, `trip.call_ack`.
- Giữa chừng chỉ chạy `node --test <tệp liên quan>` + `npm run typecheck`. `npm test` và `npm run test:e2e` mỗi bộ chạy **một lần** ở Task 9.
- Việc lớn (dữ liệu + quyền): sau Task 9 phải có người kiểm độc lập chỉ đọc (`nguoi-kiem-doc-lap`). Người thi công không tự nghiệm thu. AI không `git push`, không deploy, không áp migration remote.

## Review Focus
1. **X mất quyền Bán hàng hoặc bị ngưng tài khoản trong 15 phút của mình.** Người khác phải nhận được ngay, không phải chờ hết hạn; X bấm Nhận nhận 403. Bài: Task 1 (`trangThaiLoiMoi` với `xConHopLe: false`), Task 5 (e2e ca R1).
2. **Đơn bị huỷ trong 15 phút của X.** Lời mời khép `HUY_DON`; X bấm Nhận nhận 409 «Đơn đã huỷ»; đơn không vào thẻ. Bài: Task 5 (e2e ca R2).
3. **Mốc đúng biên.** Ghi nhận đúng 17:00:00 thì hạn là 07:15 hôm sau; đúng 07:00:00 thì 07:15; giây được giữ (10:00:30 → 10:15:30). Bài: Task 1.
4. **Tài khoản lai Bán hàng + Đối tác.** Không có trong danh sách mời, không nhận được ô (403), không được nhận thay. Bài: Task 5 (e2e ca R4, dùng `gieoTaiKhoanLai`).
5. **Hai tab của cùng X, hoặc X và Quản trị bấm cùng lúc.** Đúng một lô thắng; cơ sở dữ liệu không bao giờ có hai dòng mở; bên thua nhận 409 có câu tiếng Việt, không 500. Bài: Task 3 (bài SQL hai lô đua), Task 5 (e2e ca 6).

---

### Task 1: Luật thuần

**Files:**
- Create: `src/shared/ban-hang-phu-trach.ts`
- Create: `src/shared/ban-hang-phu-trach.test.ts`
- Modify: `src/shared/xac-nhan-don.ts` (`hanXacNhan`, `duocQuyetDinh`)
- Modify: `src/shared/xac-nhan-don.test.ts` (ca 22–06 cũ đổi đáp án theo ADR-0142 Đ5)

**Interfaces:**
- Produces:
  - `export interface KhungGioHanhChinh { phutUuTien: number; tuPhut: number; denPhut: number; mocPhatHanh: string }` (phút trong ngày giờ VN; `mocPhatHanh` ISO UTC).
  - `export function congPhutGioHanhChinh(mocIso: string, phut: number, khung: Pick<KhungGioHanhChinh, "tuPhut" | "denPhut">): string` → ISO UTC.
  - `export type KetQuaLoiMoi = "NHAN" | "TU_CHOI" | "NGUOI_KHAC" | "HUY_DON" | "RUT_LAI";`
  - `export function trangThaiLoiMoi(i: { hanIso: string; nowMs: number; xConHopLe: boolean; daKhep: boolean }): "UU_TIEN" | "HET_UU_TIEN" | "DA_KHEP"`
  - `export type LyDoKhongNhan = "da_co_nguoi" | "don_huy" | "qua_ngay_di" | "don_cu" | "dang_cho_nguoi_khac" | "khong_du_quyen" | "tai_khoan_lai";`
  - `export function duocNhanBanHang(i: { giuBanHang: boolean; laQuanTriHoacToanQuyen: boolean; giuDoiTac: boolean; laX: boolean; uuTienCuaNguoiKhac: boolean; daCoNguoi: boolean; donHuy: boolean; quaNgayDi: boolean; laDonCu: boolean }): { ok: true } | { ok: false; lyDo: LyDoKhongNhan }`
  - `export function vaoTheCanhBao(i: { ghiNhanLuc: string | null; nowMs: number; khung: KhungGioHanhChinh; coBanHang: boolean; donHuy: boolean; quaNgayDi: boolean; daGiao: boolean; hoanThanh: boolean }): boolean`
  - `export const QUYEN_DUOC_GIAO_BAN_HANG = ["order.modify", "order.history.view", "order.trip.edit", "order.passenger.write", "dispatch.assign", "trip.call_ack"] as const;`
  - `export function duocGiaoTheoO(op: OperationCode, i: { laNguoiPhuTrach: boolean; laBanHangPhuTrach: boolean }): boolean`, chỉ cộng `laBanHangPhuTrach` khi `op` thuộc danh sách trắng.
  - Đổi `hanXacNhan(guiLucIso: string, khung: Pick<KhungGioHanhChinh, "tuPhut" | "denPhut">): string`: 15 phút giờ hành chính, gọi `congPhutGioHanhChinh`.
  - Đổi `duocQuyetDinh(i: { laNguoiLap; laNoiBo; coQuyenXetDuyet; choTuXacNhan; uuTienCuaNguoiKhac: boolean; laQuanTriHoacToanQuyen: boolean }): boolean`. Khi `uuTienCuaNguoiKhac` ⇒ `false`, trừ khi `laQuanTriHoacToanQuyen`.

- [ ] **Step 1: Viết bài đỏ** ở `ban-hang-phu-trach.test.ts`. Dùng lại `vn()` / `doiVn()` theo khuôn của `xac-nhan-don.test.ts`.
  ```ts
  const K = { tuPhut: 420, denPhut: 1020 };
  test("16:55 + 15 phút ⇒ 07:10 hôm sau", () => assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T16:55"), 15, K)), "2026-10-28T07:10"));
  test("06:00 ⇒ 07:15", () => assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T06:00"), 15, K)), "2026-10-27T07:15"));
  test("10:00 ⇒ 10:15", …);  test("17:00 đúng ⇒ 07:15 hôm sau", …);  test("07:00 đúng ⇒ 07:15", …);
  test("giữ giây: 10:00:30 ⇒ 10:15:30", …);  test("Chủ nhật vẫn tính (mọi ngày)", …);
  test("X mất quyền ⇒ HET_UU_TIEN ngay", () => assert.equal(trangThaiLoiMoi({ hanIso: SAU_10P, nowMs: BAY_GIO, xConHopLe: false, daKhep: false }), "HET_UU_TIEN"));
  test("Quản trị nhận thay trong ưu tiên ⇒ ok", () => assert.deepEqual(duocNhanBanHang({ …, laQuanTriHoacToanQuyen: true, uuTienCuaNguoiKhac: true }), { ok: true }));
  test("Bán hàng khác trong ưu tiên ⇒ dang_cho_nguoi_khac", …);
  test("giữ quyền Đối tác ⇒ tai_khoan_lai, kể cả khi có Bán hàng", …);
  test("thẻ: bỏ đơn huỷ / qua ngày đi / đã giao / hoàn thành / ghi nhận trước mocPhatHanh / chưa đủ 15 phút", …);   // mỗi điều kiện một ca
  test("duocGiaoTheoO: order.money.edit không cộng Bán hàng phụ trách", () => assert.equal(duocGiaoTheoO("order.money.edit", { laNguoiPhuTrach: false, laBanHangPhuTrach: true }), false));
  test("duocGiaoTheoO: trip.call_ack có cộng", …);
  ```
  Ở `xac-nhan-don.test.ts`: ca ban đêm cũ (22:00–06:00) đổi đáp án theo khung 07–17; thêm ca `duocQuyetDinh` với `uuTienCuaNguoiKhac`.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/ban-hang-phu-trach.test.ts src/shared/xac-nhan-don.test.ts`. Kỳ vọng: FAIL vì chưa có hàm; ca ban đêm sai đáp án.
- [ ] **Step 3: Viết mã.** Thuật toán đồng hồ: đổi mốc sang phút giờ VN. Nếu trước `tuPhut` thì nhảy tới `tuPhut` cùng ngày. Nếu `≥ denPhut` thì nhảy tới `tuPhut` hôm sau. Tiêu `min(còn lại, denPhut − hiện tại)`, lặp tới hết. Giữ phần giây của mốc gốc. Không đọc `Date.now()` trong hàm; mọi «bây giờ» là tham số.
- [ ] **Step 4: Chạy, thấy xanh** (cùng lệnh) + `npm run typecheck`.
- [ ] **Step 5: Commit** — `Luật thuần Bán hàng phụ trách: đồng hồ giờ hành chính 07–17, lời mời, ai nhận, thẻ (ADR-0142)`.

### Task 2: Migration

**Files:**
- Create: `migrations/<số>_ban_hang_phu_trach.sql` (số: kiểm theo Global Constraints)
- Create: `src/migrations-ban-hang-phu-trach.test.ts` (tìm tệp theo đuôi tên, khuôn `src/migrations-xac-nhan.test.ts`)
- Modify: `docs/data-dictionary.json` (bảng, view, cột, hạng dữ liệu N1/N2), rồi `npm run dict`

**Interfaces:**
- Produces:
  - Bảng `dsp_sales_owner(id, order_id, party_id, valid_from_at, valid_to_at NULL, created_at, created_by, closed_by NULL)`.
    - Chỉ mục duy nhất `dsp_sales_owner_open_uq ON (order_id) WHERE valid_to_at IS NULL`.
    - Trigger: cấm `DELETE`; chỉ cho `UPDATE` đặt `valid_to_at` + `closed_by` từ NULL **một lần**; cấm đổi cột khác.
    - Trigger khoá Đã giao: theo khuôn của migration 0044 cho `HANDLE`, đọc view công bố trạng thái đơn.
  - Bảng `dsp_sales_invite(id, order_id, invitee_party_id, invited_by, recorded_at, priority_until_at, closed_at NULL, closed_by NULL, outcome NULL)`.
    - `CHECK (outcome IN ('NHAN','TU_CHOI','NGUOI_KHAC','HUY_DON','RUT_LAI'))`. `CHECK` khép đủ bộ: `closed_at`, `closed_by`, `outcome` cùng NULL hoặc cùng có.
    - Chỉ mục duy nhất một dòng mở mỗi đơn. Trigger chỉ thêm, khép một lần như trên.
  - Bảng `dsp_sales_policy(id, valid_from_at, priority_minutes, work_start_minute, work_end_minute, release_cutoff_at, created_by)`, chỉ thêm.
    - `CHECK`: `priority_minutes` 1–120; `0 ≤ work_start_minute < work_end_minute ≤ 1440`.
    - Dòng gieo: 15, 420, 1020, `release_cutoff_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')` (lúc áp migration = lúc phát hành).
  - View `v_dsp_sales_owner(order_id, staff_id, party_id, name)`: dòng mở, nối tài khoản / tên như `v_dsp_order_handler`.
  - View `v_dsp_sales_policy_current`: dòng hiệu lực mới nhất.
  - Cột `orders.sales_invitee_party_id TEXT NULL`: ý định mời trên đơn nháp, `orders` ghi.

- [ ] **Step 1: Viết bài đỏ.** Bài này:
  - kiểm có đúng một tệp và chỉ thêm (không `DROP TABLE`, không sửa trigger cũ);
  - trên D1 trong bộ nhớ (khuôn của bài migration khác), mở hai dòng mở cùng đơn ⇒ lỗi ràng buộc;
  - khép lần hai ⇒ lỗi;
  - `DELETE` ⇒ lỗi;
  - `outcome` ngoài danh sách ⇒ lỗi;
  - dòng chính sách gieo đúng 15 / 420 / 1020.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/migrations-ban-hang-phu-trach.test.ts`.
- [ ] **Step 3: Viết migration** + mục `data-dictionary.json`, rồi `npm run dict`.
- [ ] **Step 4: Chạy, thấy xanh**; thêm `npm run db:migrate:local`, kỳ vọng áp không lỗi.
- [ ] **Step 5: Commit** — `Migration Bán hàng phụ trách: ô riêng, lời mời, chính sách giờ hành chính (ADR-0142 QĐ1, QĐ3, Đ5)`.

### Task 3: `dispatch` — SQL, câu lệnh, hàm công bố; gốc lắp ráp

**Files:**
- Create: `src/modules/dispatch/ban-hang.ts` (câu `defineSql` + hàm đọc + hàm dựng câu lệnh)
- Create: `src/modules/dispatch/ban-hang.test.ts`
- Modify: `src/modules/dispatch/index.ts` (xuất hàm), `src/shared/router.ts` (`Ctx` và `AppOptions.injected`), `src/index.ts` (tiêm)

**Interfaces:**
- Consumes: Task 1 (`KhungGioHanhChinh`, `KetQuaLoiMoi`); bảng của Task 2.
- Produces (xuất ở `dispatch/index.ts`; tên `Ctx` cùng tên, đã bỏ `env`/`db`):
  - `kiemBanHangMoi(db, staffId: string): Promise<{ ok: true; partyId: string; name: string } | { ok: false; message: string }>`. Điều kiện: đang hoạt động, có hồ sơ, giữ `SALES`, không giữ `PARTNER`.
  - `danhSachBanHangMoi(db): Promise<{ staffId: string; name: string }[]>` — chỉ mã + tên, sắp theo tên.
  - `khungGioHanhChinh(db): Promise<KhungGioHanhChinh | null>`.
  - `laBanHangPhuTrach(db, staffId: string, orderId: string): Promise<boolean>`. Bỏ qua đơn nháp, như `IS_HANDLER`.
  - `banHangCuaDon(db, orderIds: readonly string[]): Promise<Map<string, { staffId: string; name: string }>>`.
  - `loiMoiMoCua(db, orderId: string): Promise<{ id: string; staffId: string; name: string; hanIso: string; xConHopLe: boolean } | null>`.
  - `cauMoLoiMoi(db, x: { orderId: string; inviteePartyId: string; invitedBy: string; at: string; hanIso: string }): D1PreparedStatement`.
  - `cauKhepLoiMoi(db, x: { orderId: string; outcome: KetQuaLoiMoi; at: string; actorId: string }): D1PreparedStatement` — khép dòng mở nếu có, không có thì 0 dòng.
  - `cauMoBanHang(db, x: { orderId: string; partyId: string; actorId: string; at: string }): D1PreparedStatement` — chèn chỉ khi chưa có dòng mở (khuôn `insertHandlerIfNoneStatement`).
  - `cauDoiBanHang(db, x: { orderId: string; partyId: string | null; actorId: string; at: string }): D1PreparedStatement[]` — đóng dòng cũ, mở dòng mới (hoặc chỉ đóng nếu `null`).
  - `banHangThang(kq: D1Result[], viTri: number): boolean` — câu mở ở vị trí `viTri` có `changes = 1`.
  - Gốc lắp ráp: `Ctx` thêm `isSalesOwner(orderId)`, `kiemBanHangMoi(staffId)`, `gioHanhChinh()`, `loiMoiMoCua(orderId)`, `banHangCuaDon(orderIds)`, cùng nhóm hàm dựng câu (`cauMoLoiMoi`, `cauKhepLoiMoi`, `cauMoBanHang`, `cauDoiBanHang`) bọc `env.DB`.

- [ ] **Step 1: Viết bài đỏ** `ban-hang.test.ts` trên D1 thử theo khuôn `dispatch/nhan-don.test.ts`:
  - `kiemBanHangMoi` loại HDV thuần, Kế toán, tài khoản lai Bán hàng + Đối tác, tài khoản ngưng;
  - **hai lô đua** cùng `cauMoBanHang` cho một đơn ⇒ đúng một `changes = 1`, đếm dòng mở = 1;
  - `laBanHangPhuTrach` trả `false` trên đơn nháp;
  - `cauKhepLoiMoi` gọi hai lần ⇒ lần hai 0 dòng, không lỗi;
  - `danhSachBanHangMoi` không có khoá `phone` / `email`.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/modules/dispatch/ban-hang.test.ts`.
- [ ] **Step 3: Viết mã** + nối `src/shared/router.ts`, `src/index.ts` (khuôn `isAssigned` / `newOrderHandler` / `mocToiThieu`).
- [ ] **Step 4: Chạy, thấy xanh** + `npm run typecheck` + `node --test src/architecture.test.ts` (module nghiêm, cạnh phụ thuộc).
- [ ] **Step 5: Commit** — `dispatch: ô Bán hàng phụ trách và lời mời — câu lệnh, hàm đọc, tiêm qua gốc lắp ráp`.

### Task 4: Quyền và danh sách trắng «được giao»

**Files:**
- Modify: `src/shared/permissions.ts`
  - `order.confirm.review` → `row("any", "none", "any", "none", "none", "any", "none", "none", "none", "none")`.
  - Ô mới `dispatch.sales.claim` = `row("any", "none", "any", "none", "none", "any", "none", "none", "none", "none")`.
  - Ô mới `dispatch.sales.assign` = Quản trị + Toàn quyền (khuôn `quanTri()`).
  - Ô mới `dispatch.sales.invitees` = cùng hàng `order.create`.
- Modify: `src/shared/tro-ly-cau-truc-ten.ts` (`TEN_THAO_TAC`):
  - «nhận Bán hàng phụ trách»;
  - «đổi Bán hàng phụ trách»;
  - «xem danh sách Bán hàng để mời»;
  - sửa tên lời thường của `order.confirm.review` nếu đang nhắc Kế toán / HDV.
- Modify: mọi lời gọi `can()` của sáu ô danh sách trắng đang truyền `assigned`. Lời gọi ở `src/modules/orders/index.ts` (14 chỗ), `src/modules/orders/xac-nhan-route.ts` (2), `src/modules/van-chuyen/index.ts` (5 chỗ `trip.call_ack`), `src/modules/dispatch/rules.ts` (`mayChangeHandler`, `dispatch.assign`) đổi `assigned` thành `duocGiaoTheoO(op, { laNguoiPhuTrach, laBanHangPhuTrach: await isSalesOwner(id) })`. Gọi `isSalesOwner` một lần mỗi request.
- Modify: `src/shared/order-view.ts:152,161`, `src/shared/handler-view.ts` (`handlerControls`), `src/shared/tin-chuyen.ts:269`. Các tệp này nhận thêm `laBanHangPhuTrach` từ DTO (Task 5 gửi khoá này) để ẩn/hiện khớp máy chủ.
- Create: `src/ban-hang-khong-lan-o-tien.test.ts`. Rào quét mã: chữ `isSalesOwner` / `laBanHangPhuTrach` **không** xuất hiện trong `src/modules/billing/`, `src/modules/receipt/`. Mọi `can(` có cờ đó chỉ dùng op trong `QUYEN_DUOC_GIAO_BAN_HANG`.
- Test: `src/shared/permissions.test.ts`, `src/shared/cong-quyen.test.ts`, `src/shared/tro-ly-cau-truc.test.ts`, `src/permission-enforcement.test.ts`, `src/route-write-guard.test.ts`, `src/giao-dien-hoi-bang-quyen.test.ts`.

- [ ] **Step 1: Viết bài đỏ:** ghim ba hàng mới, hàng `order.confirm.review` mới (ACCOUNTING, FIELD = `none`), và rào quét mã ở trên.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/permissions.test.ts src/ban-hang-khong-lan-o-tien.test.ts`.
- [ ] **Step 3: Sửa `MATRIX`, `TEN_THAO_TAC` và các lời gọi.** `permission-enforcement` sẽ đỏ «ô chưa được hỏi» cho ba ô mới tới Task 5. Ghi rõ trong commit là đỏ có chủ ý; không thêm mục hoãn vào `docs/quyen-hoan.json`.
- [ ] **Step 4: Chạy lại** các bài ở mục Test (trừ `permission-enforcement`) + `npm run typecheck`, kỳ vọng xanh. Quan sát rào quét mã đỏ thật một lần bằng cách cố ý thêm `isSalesOwner` vào một tệp `billing`, rồi hoàn nguyên. Ghi một dòng vào `docs/SO-HANG-RAO.md` kèm ngày quan sát.
- [ ] **Step 5: Commit** — `Quyền ADR-0142: chỉ Bán hàng / Quản trị / Toàn quyền xác nhận đơn cần kiểm; ba ô Bán hàng phụ trách; «được giao» theo danh sách trắng`.

### Task 5: Route

**Files:**
- Modify: `src/modules/orders/index.ts`:
  - `POST /api/orders` và `PUT` nháp nhận `banHangMoiStaffId: string | null`. Kiểm bằng `ctx.kiemBanHangMoi` → 400 `invalid_invitee` (không lưu), rồi ghi `orders.sales_invitee_party_id`.
  - Ghi nhận ở `POST /:id/status` (xác nhận).
- Modify: `src/modules/orders/xac-nhan-route.ts`:
  - ghi nhận ở `gui-xac-nhan`, `gui-don` nhánh A và B;
  - `quyet-dinh`: cổng ưu tiên qua `duocQuyetDinh` mới; Còn vé thêm `cauMoBanHang` cho người bấm + `cauKhepLoiMoi(NHAN | NGUOI_KHAC)` **cùng lô** `[...cauDau, ...xn.cau, khep, moBanHang, khepLoiMoi]`; Hết vé / Huỷ thêm `cauKhepLoiMoi(HUY_DON)`;
  - `rut-xac-nhan` thêm `cauKhepLoiMoi(RUT_LAI)`;
  - hạn yêu cầu dùng `hanXacNhan(guiLuc, await gioHanhChinh())`, thiếu khung thì 503 như `mocToiThieu`.
- **Bốn điểm ghi nhận** gồm `/status` xác nhận, `gui-don` nhánh B, `gui-xac-nhan` và `gui-don` nhánh A. Ở mỗi điểm, khi đơn có `sales_invitee_party_id`:
  1. Gọi lại `ctx.kiemBanHangMoi`, vì X có thể đã mất quyền kể từ lúc lưu nháp. Không còn hợp lệ ⇒ không mời; đơn thành Chờ Bán hàng nhận; người lập được báo.
  2. X là hồ sơ của chính người lập **và** đơn không cần kiểm ⇒ thêm `cauMoBanHang` ngay (thiết kế L3).
  3. Các trường hợp còn lại ⇒ thêm `cauMoLoiMoi` với `hanIso = congPhutGioHanhChinh(at, khung.phutUuTien, khung)` và nhật ký `sales_invited`.

  Các câu này nằm **cùng lô** với câu xác nhận / mở yêu cầu.
- Modify: đường huỷ ở `orders/index.ts` (`/status` huỷ) và `dispatch` (`handler-cancel`) thêm `cauKhepLoiMoi(HUY_DON)`. `PUT /api/orders/:id/ban-hang` **không** chặn đơn cũ: Quản trị gán được cho đơn trước mốc phát hành (thiết kế L10).
- Create: `src/modules/dispatch/ban-hang-route.ts` (route, nối vào mảng route của `dispatchModule`):
  - `GET /api/dispatch/ban-hang-moi` (`dispatch.sales.invitees`) → `{ banHang: { staffId, name }[] }`.
  - `GET /api/dispatch/ban-hang?orderIds=…` (≤ 30, khuôn `GET /api/dispatch/handlers`) → `{ [orderId]: { banHang: { staffId, name } | null; loiMoi: { staffId, name, conPhut } | null; laBanHangPhuTrach: boolean } }`. Chỉ đơn người gọi xem được (`order.view`).
  - `POST /api/orders/:id/ban-hang/nhan` (`dispatch.sales.claim`), chỉ đơn `confirmed`. Đơn đang chờ xác nhận ⇒ 409 `can_quyet_dinh` «Đơn cần kiểm vé — hãy chọn Còn vé / Hết vé». Cổng qua `duocNhanBanHang`; lô: `cauMoBanHang` + `cauKhepLoiMoi(laX ? NHAN : NGUOI_KHAC)` + nhật ký.
  - `POST /api/orders/:id/ban-hang/tu-choi`: chỉ X, trong ưu tiên hoặc khi lời mời còn mở. Lô: `cauKhepLoiMoi(TU_CHOI)` + nhật ký.
  - `PUT /api/orders/:id/ban-hang` `{ staffId: string | null }` (`dispatch.sales.assign`) → `cauDoiBanHang`; người được đặt qua `kiemBanHangMoi`, hoặc là chính Quản trị / Toàn quyền đang gọi.
  - `GET /api/orders/chua-co-ban-hang` → `{ donDaXacNhan: TheDonDto[]; soDonChoXacNhan: number }`, lọc theo L8 và người xem:
    - Kế toán: `donDaXacNhan` + con số;
    - người lập (Đối tác, Thực tập): chỉ đơn của mình;
    - Bán hàng, Quản trị, Toàn quyền: mọi đơn, kể cả đơn chờ (trong `donDaXacNhan` có cờ `choXacNhan`).
- Modify: `src/shared/audit-actions.ts`: `sales_invited` «Mời Bán hàng phụ trách», `sales_owner_claimed` «Nhận Bán hàng phụ trách», `sales_owner_changed` «Đổi Bán hàng phụ trách», `sales_invite_refused` «Từ chối phụ trách đơn». Không ghi SĐT.
- Modify: `src/shared/contracts.ts` (DTO mới).
- Create: `tests/e2e/ban-hang-phu-trach.mjs` (khuôn `tests/e2e/xac-nhan-don.mjs`, mã danh mục giả `ZXN1`/`ZXN2`).
- Modify: `tests/e2e/xac-nhan-don.mjs` (Kế toán, HDV gọi `quyet-dinh` nay 403), `tests/e2e/permissions.mjs` (ba ô mới, hàng mới).

**Interfaces:**
- Consumes: Task 1, Task 3 (`ctx.*`), Task 4 (ô quyền).
- Produces: các route và DTO trên (Task 6, Task 7 dùng).

- [ ] **Step 1: Viết e2e đỏ**: 14 ca của thiết kế B.10, hai ca của ADR-0142 (Quản trị nhận thay trong ưu tiên ⇒ thành công, X có tin; Bán hàng khác ⇒ 409), và các ca Review Focus:
  - R1: X bị gỡ quyền Bán hàng ⇒ Y nhận ngay.
  - R2: đơn huỷ trong ưu tiên ⇒ X Nhận 409; lời mời `HUY_DON`.
  - R4: tài khoản lai không có trong danh sách mời, Nhận ⇒ 403.

  Thêm hai ca riêng:
  - Còn vé hỏng giữa lô (ép bằng cách chiếm trước ô Bán hàng bằng SQL) ⇒ đơn vẫn nháp, yêu cầu vẫn mở;
  - đơn lập trước mốc phát hành (gieo `release_cutoff_at` tương lai) ⇒ không vào thẻ, không Nhận được.
- [ ] **Step 2: Chạy, thấy đỏ** — `npm run test:e2e -- ban-hang-phu-trach` (cần mạng). Kỳ vọng: FAIL vì chưa có route.
- [ ] **Step 3: Viết mã route.** Thứ tự cổng mỗi route: 403 quyền → đọc thân → 400 dạng → 404 / 409 trạng thái → ghi. Mỗi lệnh ghi là **một** `db.batch`; bên thua (`banHangThang` = false) ⇒ 409 `stale` kèm câu tiếng Việt.
- [ ] **Step 4: Chạy lại** e2e đó + `node --test src/permission-enforcement.test.ts src/route-access.test.ts src/route-write-guard.test.ts` + `npm run typecheck`. Kỳ vọng xanh; `permission-enforcement` hết đỏ từ Task 4.
- [ ] **Step 5: Commit** — `Route Bán hàng phụ trách: mời lúc lập, ghi nhận, Còn vé thành người phụ trách, nhận / từ chối / đổi, thẻ cảnh báo`.

### Task 6: Thông báo

**Files:**
- Modify: `src/shared/bang-tin.ts`
  - `THAY_DOI` thêm `"moi_ban_hang"`, `"ban_hang_nhan"`, `"ban_hang_tu_choi"`, `"cho_ban_hang"`;
  - `nhanSuKien` nhận thêm `banHang?: string | null` và thêm nhãn người nhận Bán hàng phụ trách cho `nhan`, `giao`, `huy`, `hoan_thanh`;
  - `thongBaoNoi`: câu tiếng Việt cho bốn loại mới.
- Modify: `src/shared/thong-bao.ts` (`locHopThongBao`, `loaiTinDon`, `HANH_DONG_TIN_DON`), `src/shared/contracts.ts` (`LoaiTin`), `src/shared/web-push.ts` (`HANH_DONG_CUA_THAY_DOI`). Báo đẩy chỉ cho: lời mời → X; có Bán hàng phụ trách → người lập. `cho_ban_hang` **không** báo đẩy.
- Modify: `src/index.ts` (`baoThayDoi` đọc thêm `banHangCuaDon`).
- Create: `migrations/<số>_hop_thu_ban_hang.sql`: `DROP VIEW` + `CREATE VIEW v_aud_order_event`.
  - Chép điều kiện từ **bản mới nhất** trong `migrations/`, kể cả phần phiên sửa hộp thư thêm.
  - Thêm `sales_invited`, `sales_owner_claimed`, `sales_owner_changed`, `sales_invite_refused`, `order_completed`.
  - Không thêm `order_handler_refused` (chủ đã quyết, `docs/CHANGE-GUIDE.md` mục hộp thư).
  - Sửa bài ghim ở `src/migrations-0025.test.ts`, hoặc thêm bài ghim mới cho view.
- Test: `src/shared/bang-tin.test.ts`, `src/shared/thong-bao.test.ts`, `src/shared/web-push.test.ts` (tên theo tệp có sẵn).

- [ ] **Step 1: Viết bài đỏ** theo bảng L9 của thiết kế, mỗi dòng một ca. Bốn ca cần có:
  - đơn hoàn thành ⇒ Bán hàng phụ trách và người lập có tin trong hộp thư;
  - `cho_ban_hang` ⇒ không có trong `nguoiNhanDay`;
  - yêu cầu xác nhận có X ⇒ người giữ `order.confirm.review` khác X không nhận tin trong ưu tiên;
  - Đối tác là người lập ⇒ có trong hộp thư, không tin nổi.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/bang-tin.test.ts src/shared/thong-bao.test.ts src/shared/web-push.test.ts src/migrations-0025.test.ts`.
- [ ] **Step 3: Viết mã** + migration.
- [ ] **Step 4: Chạy, thấy xanh** + `npm run db:migrate:local` + `npm run typecheck`; thêm ca thông báo vào e2e của Task 5 rồi chạy riêng file đó.
- [ ] **Step 5: Commit** — `Thông báo Bán hàng phụ trách: lời mời, nhận, từ chối, chờ Bán hàng nhận; hộp thư nhận hoàn thành`.

### Task 7: Giao diện

**Files:**
- Modify: `web/order-form.ts`: khối «Bán hàng phụ trách» cho mọi người lập, gọi `GET /api/dispatch/ban-hang-moi`. Dùng lại khuôn bảng chọn `web/assignee-picker.ts`, không nút Lưu riêng. Khối người phụ trách cũ đổi nhãn «Hướng dẫn viên» và lọc danh sách chỉ nhóm HDV (chỉ giao diện).
- Modify: `web/order.ts`:
  - dòng «Bán hàng: <tên>» / chip «Chờ Bán hàng nhận» / «Đang mời <X> · còn N phút»;
  - nút Nhận / Từ chối (chỉ X), Nhận phụ trách, Đổi Bán hàng (Quản trị, Toàn quyền). Với đơn chờ xác nhận, nút Nhận của X mở đúng bảng Còn vé / Hết vé hiện có;
  - nút Nhận của ô cũ đổi nhãn «Nhận làm HDV».
- Modify: `web/orders.ts` (thẻ đơn thêm dòng Bán hàng, một lời gọi `GET /api/dispatch/ban-hang?orderIds=` mỗi trang, không chờ), `web/home.ts` + `src/shared/viec-cua-ban.ts` (khoá thẻ mới `"chuaBanHang"`, nhãn «Đơn chưa có Bán hàng phụ trách»; `hien` theo năm nhóm của L8; thẻ `donCho` giữ `can(w, "order.confirm.review")`).
- Modify: `public/app.css` nếu cần token mới.
- Create: `docs/evidence/2026-10-27-ban-hang-phu-trach/kich-ban/ban-hang-phu-trach-smoke.mjs` (390 + 1040) — Bán hàng mời, X nhận, Đối tác lập + mời, Kế toán thấy thẻ, Quản trị nhận thay. Thứ tự tab: tài khoản cần kiểm sau cùng mở sau cùng (kho cookie chung).
- Modify: bảng kịch bản ở `web/CLAUDE.md`. Thêm dòng kịch bản mới. `chon-hdv-lap-don-smoke.mjs` và `xac-nhan-smoke.mjs`: sửa đúng các bước đổi nhãn / Kế toán mất nút; bước nào đã bị kịch bản mới thay thì ghi «thay bằng ban-hang-phu-trach-smoke.mjs» ở đầu tệp, không chạy lại.

- [ ] **Step 1: Chạy kịch bản mới, thấy đỏ** — `node docs/evidence/2026-10-27-ban-hang-phu-trach/kich-ban/ban-hang-phu-trach-smoke.mjs` (cần `AXE_JS`; thiếu biến thì ghi rõ là chưa kiểm màu).
- [ ] **Step 2: Viết giao diện, một khổ tới khi xanh, rồi khổ thứ hai.**
- [ ] **Step 3: Chạy lại, thấy xanh** + `npm run build:web` + `npm run typecheck`.
- [ ] **Step 4: Chụp ảnh thật** form, trang đơn, Trang chủ ở hai khổ, cho bốn vai (Bán hàng, Đối tác, Kế toán, Quản trị). Lưu vào thư mục bằng chứng. **Chủ duyệt ảnh trước khi gộp.**
- [ ] **Step 5: Commit** — `Giao diện Bán hàng phụ trách: form mời, trang đơn, thẻ đơn, thẻ cảnh báo Trang chủ`.

### Task 8: Tài liệu, Trợ giúp, nhật ký thay đổi, bất biến

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` §5 (bảng mới), §6 (luồng), §7 (route), §15 (từ «Bán hàng phụ trách», «Chờ Bán hàng nhận», «Lời mời»); `docs/CHANGE-GUIDE.md` (công thức + bẫy: danh sách trắng, không nới `isOrderHandler`).
- Modify: Trợ giúp theo vai (Bán hàng, Đối tác, Kế toán, HDV — tệp `src/shared/huong-dan-*.ts`). Bỏ mọi câu nói Kế toán / HDV bấm Còn vé.
- Modify: `src/shared/changelog.ts` + `src/shared/app-info.test.ts`. Số phiên bản **tạm** = số trên `main` lúc làm + 1, ghi chú «TẠM».
- Modify: `scripts/audit-checks.mjs` + `src/audit-invariants.test.ts`:
  - `R-DSP-5`: mỗi đơn ≤ 1 dòng Bán hàng phụ trách mở;
  - `R-DSP-6`: mỗi đơn ≤ 1 lời mời mở;
  - `R-DSP-7` (cảnh báo): lời mời mở trên đơn đã huỷ.

- [ ] **Step 1: Viết bài đỏ** cho ba bất biến và dòng nhật ký thay đổi.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/audit-invariants.test.ts src/shared/app-info.test.ts`.
- [ ] **Step 3: Viết mã + tài liệu.**
- [ ] **Step 4: Chạy, thấy xanh** + `node scripts/audit-invariants.mjs --db local` thoát 0.
- [ ] **Step 5: Commit** — `Tài liệu, Trợ giúp, nhật ký thay đổi, bất biến cho Bán hàng phụ trách`.

### Task 9: Bộ kiểm dài một lần, người kiểm độc lập, lệnh cho chủ

- [ ] **Step 1:** Tắt mọi `wrangler dev` mồ côi. Chạy **một lần**: `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e`. Kỳ vọng: tất cả xanh. Đỏ không do nhánh này thì ghi tên bài vào báo cáo; không im lặng bỏ qua.
- [ ] **Step 2:** Giao `nguoi-kiem-doc-lap` kiểm cả nhánh. Ba điểm:
  1. quyền: danh sách trắng, Kế toán / HDV mất đọc đơn chờ, tài khoản lai;
  2. dữ liệu: hai bảng, trigger, một dòng mở, migration không sửa tệp cũ;
  3. lô Còn vé nguyên khối.

  Người kiểm tin số của Step 1, chỉ chạy lại bài liên quan. Sửa theo báo cáo, rồi kiểm lại đúng các điểm đã sửa.
- [ ] **Step 3:** Ghi `docs/HANDOFF-N1.md` mục «ĐANG CHỜ PHÁT HÀNH» (có migration, cần `npm run trien-khai`). Cập nhật bảng việc ở đầu tệp này.
- [ ] **Step 4:** Nhánh phải dựng trên `main` mới nhất của máy. Đưa chủ **một lần**, mỗi lệnh một khối, kèm `cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales`: `npm run day-len -- <nhánh>` rồi `npm run trien-khai`. Ghi «cần triển khai, có migration».
