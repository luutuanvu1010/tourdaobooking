# Thông báo hệ thống — lượt 1 (chuông, hộp thông báo, tin Toàn quyền) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuông có số chưa đọc + hộp thông báo hai ngăn (tin về đơn là hình chiếu của `audit_log`, tin thủ công do Toàn quyền gửi, có loại quan trọng bắt "Đã hiểu") đúng đặc tả và bản mẫu đã duyệt.

**Architecture:** Module mới `thongbao` (tiền tố `ntf_`, hạng STRICT) không ai import; nó đọc view công bố của `audit`, `orders`, `dispatch`, `staff` và sở hữu 4 bảng tin thủ công/xác nhận/mốc đọc. Mọi luật "ai thấy gì, câu gì, chưa đọc bao nhiêu" nằm trong MỘT hàm thuần `locHopThongBao` ở `src/shared/thong-bao.ts`, dùng cho cả số đỏ lẫn danh sách. Giao diện: chuông + ngăn + dải trong `web/shell.ts`, trang `/gui-thong-bao` cho Toàn quyền.

**Trạng thái:** **CHỦ ĐÃ DUYỆT** trong chat 2026-09-27 ("Ok duyệt. Thi công với trợ lý Subagent"), gồm cả mục "Phụ thuộc ADR-0030". Thi công theo cách subagent-driven (mỗi task một trợ lý làm + một trợ lý kiểm). HDV bấm "Từ chối" **chưa** lên chuông (đặc tả §2 K7) — `v_aud_order_event` ở Task 3 KHÔNG có `order_handler_refused`.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), giao diện thuần dựng bằng `h()`, esbuild, `node --test`, e2e `tests/e2e/*.mjs`, kịch bản Chrome CDP.

**Spec:** `docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md` (lượt 1 ĐÃ DUYỆT) · `docs/adr/ADR-0034-thong-bao-he-thong-hop-thong-bao.md` (accepted) · bản mẫu `docs/design/thong-bao-mockup/ban-mau-thong-bao.html` (ĐÃ DUYỆT — chuẩn nghiệm thu giao diện). Lượt 2 (Web Push, ADR-0036) **không** thuộc kế hoạch này.

## Global Constraints

- Giao diện, lỗi, tài liệu, commit: tiếng Việt CÓ DẤU; không chữ Anh/mã thô lộ ra người dùng (CLAUDE.md §7).
- Không `innerHTML` trong `web/`; dựng bằng `h()`; nội dung tin thủ công chỉ vào DOM bằng chuỗi con của `h()` (textContent), giữ xuống dòng bằng `white-space: pre-line`.
- CSS mới đặt **cuối** `public/app.css`, sau mốc PWA: **chỉ token**, không hex/rgb/px (trừ `1px`)/rem/em (`tests/e2e/pwa.mjs` quét). Token mới khai ở `:root`. Ô gõ 16px.
- Migration duy nhất `migrations/0025_thong_bao.sql`; chỉ THÊM; không `DELETE`/`OR REPLACE` trên bảng `ntf_*`; không xoá cứng (thu hồi = `valid_to`).
- Mọi bảng `ntf_*` loại `table` có `created_at`/`updated_at` NOT NULL và `created_by`/`updated_by` `TEXT` NULL, không khoá ngoại.
- Nhật ký `notice_*` **không** chép nội dung/tiêu đề tin (chỉ mã tin); không SĐT/email/MST trong nhật ký.
- "Toàn công ty" = tài khoản có ít nhất một quyền khác `PARTNER` (K3); nhãn lưu `noi-bo`.
- Tên người làm chỉ gửi xuống trình duyệt khi `can(người xem, "order.history.view", { ownerId, assigned })` đúng (K1).
- Người xem không thấy tin do chính mình làm/gửi (E3, K6).
- Hộp: 30 ngày, tối đa 100 tin; tin quan trọng chưa "Đã hiểu" giữ quá 30 ngày (X4). Số đỏ chỉ đếm ngăn "Của tôi", hiện tối đa "9+".
- `notice.send` = chỉ `SUPER_ADMIN`. Route gửi/thu hồi/xem đã gửi/xem ai đã hiểu: cổng `admin` + `can(staff,"notice.send")` **trước mọi truy vấn**.
- Không sửa ADR-0022: sự kiện Bảng tin giữ 5 khoá; `thongBaoNoi` giữ nguyên hành vi.
- Không `git push`, không deploy, không lệnh ghi remote (CLAUDE.md §8). Commit nhỏ, thông điệp tiếng Việt, thân nói vì sao.
- **Lệch đường dẫn so với đặc tả §6.4 (đã báo chủ khi trình kế hoạch):** hai đường ghi tự phục vụ là `POST /api/account/thong-bao/da-doc` và `POST /api/account/thong-bao/:id/da-hieu` (đặc tả ghi `/api/thong-bao/…`), vì hàng rào `src/route-write-guard.test.ts` luật (1) chỉ nhận mục "ngoại lệ" dưới `/api/account/*`. Cổng (`staff`), hành vi, quyền không đổi. Khi thi công xong, sửa bảng §6.4 của đặc tả cho khớp bằng một dòng lịch sử có ngày (tài liệu mô tả đường dẫn, không đổi quyết định).

## Review Focus

1. **Tên lọt qua JSON** khi người xem không có `order.history.view` với đơn (Bán hàng xem đơn người khác, HDV mọi đơn) — phản hồi thô không được chứa tên, kể cả trường phụ. Test: Task 2 (luật thuần) + Task 5 (e2e so chuỗi JSON).
2. **Tài khoản chỉ-Đối-tác nhận tin "Toàn công ty"** — không được. Tài khoản Đối tác + Bán hàng thì được. Test: Task 2 + Task 6 (e2e).
3. **Bấm "Gửi" hai lần / mạng chậm** → hai tin trùng. Người dùng mong một tin. Test: Task 6 (`clientRequestId` + e2e gửi lại cùng mã → cùng id, 1 dòng).
4. **Tài khoản mới tạo sau khi đã có nhiều tin** — số đỏ không được đổ dồn tin cũ (mốc mặc định = ngày tạo tài khoản). Test: Task 2 + Task 5.
5. **Số đỏ lệch danh sách** (vd tin của chính mình, tin đã thu hồi, tin quan trọng quá 30 ngày) — số luôn bằng số tin `chuaDoc && cuaToi` trong danh sách ngăn "Của tôi". Test: Task 2 (thuộc tính trên bộ dữ liệu trộn) + Task 5 (e2e so hai route).


## Phụ thuộc ADR-0030 (nhánh `thi-cong-tu-choi-huy-hdv`)

Ghi theo tin điều phối 2026-09-27 (không phải lời duyệt kế hoạch). Nhánh `thi-cong-tu-choi-huy-hdv` đang thi công R1 của ADR-0030 (đã xong T1d, feed553). Hai nhánh sửa chung nhiều tệp; nhánh nào gộp sau phải gộp tay cẩn thận.

1. **Chỗ sửa chung:**
   - `src/modules/dispatch/index.ts`, route `PUT /api/orders/:id/handler`: Task 4 (ghi `order_claimed`) trùng ADR-0030 Task 1.1 (chốt Nhận, loại tài khoản lai). Sau gộp route vẫn phải có **đúng một** `baoThayDoi` (`bang-tin-guard.test.ts`).
   - `src/shared/bang-tin.ts`: ADR-0030 Task 1.4 sửa `nhanKetNoi`, `nhanSuKien` (`handlerTruoc` có thể là "không biết"), `thongBaoNoi` (thêm ca tài khoản lai); Task 2.4 thêm `tu_choi`. Task 1 của kế hoạch này tách `duocThayTinDon` khỏi `thongBaoNoi` trong cùng tệp.
   - `src/route-access.test.ts`: phía này 73 → 77 (Task 5) → 81 (Task 6); ADR-0030 +1 ở R1, +1 ở R2. Khi gộp, số cuối = tổng cả hai phía, không lấy số của một bên.
   - Các tệp khác: `src/shared/audit-actions.ts`; `src/shared/permissions.ts` + `permissions.test.ts`; phần đuôi `src/shared/contracts.ts` và `public/app.css`; `web/shell.ts` (điều hướng HDV của ADR-0030 Task 1.8); `web/account.ts`; `tests/e2e/dispatch.mjs`; `src/architecture.test.ts`; `src/index.ts`.
2. **Một nguồn luật:** hộp thông báo giữ thiết kế lọc bằng giao nhãn với `nhanKetNoi` — **không** viết thêm luật quyền bằng tay trong `locHopThongBao`. Nhờ vậy luật loại tài khoản lai của ADR-0030 (đặt trong `nhanKetNoi`) tự áp cho hộp. Nếu ADR-0030 gộp **trước**: điều kiện lai nó thêm vào `thongBaoNoi` phải chuyển vào `duocThayTinDon` khi làm Task 1.
3. **Đổi kỳ vọng có chủ đích (không phải lỗi):** khi ADR-0030 R1 lên (FIELD có `dispatch.claim`, tài khoản lai bị loại), hai ca đổi kết quả theo ADR-0030 S20-6:
   - Task 1: `duocThayTinDon(ai("FIELD"), true)` từ `false` thành `true`.
   - Task 2, bài "Đối tác/Thực tập không có tin về đơn; HDV chỉ thấy tin chờ nhận khi có dispatch.claim": ca của HDV đổi theo. Người gộp sửa kỳ vọng và ghi dòng "đổi có chủ đích theo ADR-0030 S20-6" trong thông điệp commit.
4. **Chọn HDV lúc lập (ADR-0030 Task 1.3, commit 86c53f4 bên nhánh đó — đính chính của điều phối 2026-09-27):** khi lập đơn có chọn người phụ trách (kể cả người lập tự chọn chính mình), lô lập ghi **cả** dòng `created` **lẫn** dòng `order_handler_changed` ("từ chưa có người phụ trách sang <tên>"), cùng một mốc: `audit_log.created_at` hai dòng = `orders.created_at` = `valid_from_at` của dòng HANDLE (bên đó khoá bằng so bằng tuyệt đối; lệch +1 ms thì đỏ). Không ghi `order_claimed`. Để giữ đặc tả §4.1 (lập đơn = **một** tin):
   - Task 5 tính cờ `cung_lo_lap` (dòng `order_handler_changed` có dòng `created` cùng đơn, **cùng** `created_at`); Task 2 `loaiTinDon` trả `null` khi `cungLoLap` → không có tin `giao`. Test thuần ở Task 2 khoá luật này ngay.
   - Phân loại `lap`/`cho_nhan` không đổi: `first_at` = `created_at` → `f.first_at > e.created_at` sai → `lap`.
   - Ca e2e (lập đơn kèm HDV → đúng **một** tin `lap`, không `giao`, không `cho_nhan`): thêm vào `tests/e2e/thongbao.mjs` **sau khi** ADR-0030 Task 1.3 lên main; trước đó ghi "chưa kiểm được, chờ ADR-0030".
   - Luật này dựa vào bất biến "cùng mốc" của nhánh ADR-0030. Nếu sau này lô lập đổi cách lấy giờ (hai `new Date()` khác nhau) thì tin `giao` thừa sẽ quay lại — ca e2e trên là chỗ bắt.
5. **Hệ quả hiển thị (điều phối đã báo chủ):** sau R1, mỗi đơn mới chưa chọn HDV làm số đỏ của **mọi** HDV có quyền nhận tăng 1.
6. **Hợp đồng `bang-tin.ts` đổi ở ADR-0030 Task 1.4 (commit c38c224 bên nhánh đó):** `nhanSuKien` nhận `handlerTruoc: TrangThaiPhuTrach | null` (`null` = không biết, không bao giờ coi là "chưa ai"; thêm luật (b) gắn `cho-nhan` khi BIẾT trước chưa ai); `nhanKetNoi` chỉ cho `cho-nhan` khi `can(dispatch.claim) && !holdsPartner(staff)`; `thongBaoNoi` có `holdsPartner` ở ca `tao_cho_nhan`. Việc của nhánh này, tuỳ nhánh nào lên main trước:
   - Task 1: `duocThayTinDon` lấy đúng điều kiện `!choNhan || (can(staff, "dispatch.claim") && !holdsPartner(staff))` và bật ca test tài khoản lai `duocThayTinDon(SALES+PARTNER, true) === false`.
   - Task 2: `locHopThongBao` truyền `handlerTruoc: null`; **giữ** `.filter((t) => t !== "cho-nhan")` vì luật (a) vẫn gắn `cho-nhan` theo trạng thái hiện tại, còn nhãn này do loại tin quyết.
   - Kiểm sau gộp: `grep -n "handlerTruoc: TrangThaiPhuTrach | null" src/shared/bang-tin.ts` có kết quả ⇒ không còn chỗ nào của `thong-bao.ts` truyền `{ coNguoi: false, staffId: null }` làm `handlerTruoc`.


## Sửa sau rà soát trước thi công (2026-09-27, sau khi gộp main 1.21 / ADR-0035) — ĐỨNG TRÊN chữ của từng Task

Người rà chỉ-đọc đối chiếu kế hoạch với mã sau khi gộp main. Bốn chỗ chặn đã sửa thẳng trong Task 1, 2, 5. Các điểm dưới đây **thắng** chữ của Task tương ứng khi hai bên khác nhau; người thi công làm theo đây.

- **R1 (Task 1):** ca tài khoản lai `duocThayTinDon(SALES+PARTNER, true) === false` KHÔNG thêm lúc này (đỏ trên main: văn phòng + có `dispatch.claim`, chưa có `holdsPartner`). Bật khi gộp ADR-0030 Task 1.4 (mục Phụ thuộc điểm 6).
- **R2 (Task 2):** thêm test thuần: 150 tin "Của tôi" chưa đọc → `soChuaDoc === 100` và bằng số tin `chuaDoc` trong danh sách ngăn "Của tôi".
- **R3 (Task 3):** test migration chèn `audit_log`/`dsp_assignment` phải tạo sẵn dòng `staff` và `orders` thật trước (khuôn `seedOrder` ở `src/migrations-0021.test.ts:10-24`), vì `node:sqlite` bật `foreign_keys`. Bỏ bước kiểm chỉ mục `audit_log(created_at)`: đã có `idx_audit_created` (`migrations/0007_*.sql`). Không thêm `integrityEdges` cho hai cạnh nội bộ module `thongbao` (sổ chỉ dùng cho cạnh xuyên module). Tên test "26 thao tác" ở `src/shared/permissions.test.ts` đổi theo số thật (27).
- **R4 (Task 4):** thêm vào danh sách tệp `tests/e2e/dispatch.mjs` — dòng ~213 (sau tự nhận: lọc `order_claimed` thay `order_handler_changed`, chi tiết "từ chưa có người phụ trách sang …") và ~277 (vòng tranh nhận: đếm `order_claimed`). Đổi có chủ đích, ghi trong thân commit.
- **R5 (Task 5):** tạo đơn e2e bằng `orderInput()` có sẵn ở `tests/e2e/lib.mjs` (~dòng 146): `call(cookie, "POST", "/api/orders", orderInput())` sau `ensureFakeCatalog()`; bỏ chỉ dẫn "chép `input` ở orders.mjs". Route `da-hieu`: tra tin theo id (đọc thẳng `ntf_notice` + nhóm nhận, không qua cửa sổ 30 ngày) để lần bấm thứ hai với tin đã hiểu vẫn trả OK như đặc tả §7; tin không tồn tại / đã thu hồi / không thuộc nhóm nhận → 404.
- **R6 (Task 6):** `da-gui` gọi `listStaffAccounts` MỘT lần ngoài vòng lặp. Tài khoản chỉ-Đối-tác trong e2e tạo thẳng bằng `POST /api/staff { …, permissions: ["PARTNER"] }` như `tests/e2e/dispatch.mjs:~34` (thay cách đổi vai). "Tin chống trùng" gửi với `quanTrong: false` để không để lại dải nhắc trên DB dev.
- **R7 (Task 7 — shell sau ADR-0035):** dòng `append(byId("topbar"), [avatarEl, search, newOrderBtn])` không còn; `thanhCongViec(...)` được gọi hai lần (khung tạm từ bản nhớ khung và khung thật). Gọi `ganThongBao(byId("topbar"), staff)` **chỉ** ngay sau lời gọi `thanhCongViec(initials(staff.fullName), seesAll, canCreate, false)` của khung thật và trước `addNav(...)`. Chuông KHÔNG mang `data-khung-tam`. `#strips` tạo lười ngay trong `setMaintenanceStrip`/`ganThongBao` (cái nào chạy trước tạo), không mang `data-khung-tam`.
- **R8 (Task 7 — vị trí chuông đúng bản mẫu):** chèn nút chuông ngay TRƯỚC `.topbar-new` (không có thì thêm cuối topbar) → DOM: avatar, ô tìm, chuông, Tạo đơn. Máy tính: chuông nằm giữa ô tìm và "Tạo đơn"; tài khoản không có ô tìm thì `.bell` mang `margin-left:auto`. Điện thoại: thứ tự logo – chuông – avatar như bản mẫu (dùng `order`/`margin-left` qua `#topbar:has(> .bell)`); bỏ luật `.bell + .bar-avatar` trong chữ Task 7. Đối chiếu bằng mắt với bản mẫu ở cả hai khổ.
- **R9 (Task 7/8 — kịch bản Chrome bắt buộc theo `web/CLAUDE.md`):** Task 7 sửa `setMaintenanceStrip`/`.maint-strip` → chạy thêm `v1-bao-tri.mjs`; Task 8 sửa `web/account.ts` → chạy thêm `dot-c-smoke.mjs`. `hienThongBao` nằm ở `web/toast.ts`.
- **R10 (Task 8 — trang mới sau ADR-0035):** thêm `"/gui-thong-bao"` và `"/js/gui-thong-bao.js"` vào `PRECACHE` (`src/shared/sw-policy.ts`) cùng `PAGES`. Tham số `superAdmin` mới của `addNav`/`navGroups`/`sidebar` mặc định `false`; ba chỗ gọi `addNav` (khung tạm, nhánh mất mạng, khung thật): chỉ khung thật truyền `hasPermission(staff, "SUPER_ADMIN")` — bản nhớ khung khoá 5 trường (`src/khung-nho-web.test.ts`), KHÔNG thêm trường. Trang `gui-thong-bao.ts` không `return` ở cấp đầu module: dùng khuôn `if (!can(staff, "notice.send")) showError(…); else { … }` như `web/staff.ts:~370`.
- **R11 (Task 9):** thêm `thongbao` vào danh sách module / "Module nghiêm" của `src/CLAUDE.md` (chỉ tên cho khớp mã; nếu hook chặn thì để diff cho chủ). Sửa đặc tả bằng một dòng lịch sử có ngày: §6.4 (đường `/api/account/thong-bao/*`) và §6.6 (hộp là ngăn trong khung app theo bản mẫu, không có trang `web/thong-bao.ts`).
- **Hoãn có ghi (không làm lượt này):** đo CPU `tom-tat` (đặc tả §6.2) → Task 10 ghi "chưa đo" vào nhật ký; `goiSom` cho `tom-tat`/`da-gui` (ADR-0035 điều 2) và chuông không số ở khung tạm (tránh nhảy bố cục) → nợ ghi nhật ký, cần chủ chọn nếu muốn.

---

## Bản đồ tệp

| Tệp | Trách nhiệm |
|---|---|
| `src/shared/bang-tin.ts` (sửa) | tách `duocThayTinDon` khỏi `thongBaoNoi` (không đổi hành vi) |
| `src/shared/thong-bao.ts` (mới) + `.test.ts` | luật thuần: loại tin, nhãn, câu, lọc hộp, số chưa đọc, kiểm đầu vào tin thủ công, "nội bộ" |
| `src/shared/contracts.ts` (sửa) | DTO của 8 route |
| `src/shared/audit-actions.ts` (sửa) | `order_claimed`, nhóm `notice` + 3 hành động |
| `src/shared/permissions.ts` (+ `.test.ts`) (sửa) | ô `notice.send` |
| `migrations/0025_thong_bao.sql` (mới) + `src/migrations-0025.test.ts` | 4 bảng, trigger chỉ-thêm, 4 view công bố |
| `src/modules/dispatch/service.ts`, `index.ts` (sửa) | ghi `order_claimed` khi tự nhận |
| `src/modules/thongbao/repository.ts`, `index.ts` (mới) | SQL `defineSql` + 8 route |
| `src/index.ts`, `src/architecture.test.ts`, `src/route-access.test.ts`, `src/route-write-guard.test.ts` (sửa) | đăng ký module, cạnh, tiền tố, ảnh chụp route |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sửa) | bảng/view mới |
| `tests/e2e/thongbao.mjs` (mới), `tests/e2e/dispatch.mjs` (sửa), `tests/e2e/run.mjs` (sửa) | hành vi API |
| `web/icons.ts`, `web/shell.ts`, `web/thong-bao-ui.ts` (mới), `web/thong-bao-logic.ts` (mới) + `src/thong-bao-web.test.ts` | chuông, ngăn, dải |
| `public/gui-thong-bao.html`, `web/gui-thong-bao.ts` (mới), `web/account.ts`, `src/shared/sw-policy.ts`, `package.json` (sửa) | trang Gửi thông báo |
| `public/app.css` (sửa) | khối CSS "Thông báo — chỉ token" |
| `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (sửa) | hàng rào, tài liệu mô tả |
| `docs/evidence/2026-09-27-thong-bao/kich-ban/thong-bao-smoke.mjs` (mới) | kịch bản Chrome đối chiếu bản mẫu |

---

### Task 1: Tách điều kiện "được thấy tin về đơn" khỏi `thongBaoNoi`

**Files:**
- Modify: `src/shared/bang-tin.ts:95-108`
- Test: `src/shared/bang-tin.test.ts`

**Interfaces:**
- Produces: `export function duocThayTinDon(staff: PermissionHolder, choNhan: boolean): boolean` — `true` khi `staff` là văn phòng hoặc Hướng dẫn viên, và (nếu `choNhan`) có `dispatch.claim`.

- [ ] **Step 1: Viết test đỏ** — thêm cuối `src/shared/bang-tin.test.ts`:

```ts
test("duocThayTinDon: văn phòng/HDV thấy; Đối tác/Thực tập không; tin chờ nhận cần dispatch.claim", () => {
  const ai = (...p: PermissionCode[]) => ({ id: "x", permissions: p });
  assert.equal(duocThayTinDon(ai("SALES"), false), true);
  assert.equal(duocThayTinDon(ai("ACCOUNTING"), false), true);
  assert.equal(duocThayTinDon(ai("FIELD"), false), true);
  assert.equal(duocThayTinDon(ai("PARTNER"), false), false);
  assert.equal(duocThayTinDon(ai("INTERN"), false), false);
  assert.equal(duocThayTinDon(ai("SALES"), true), true);       // SALES có dispatch.claim
  assert.equal(duocThayTinDon(ai("ACCOUNTING"), true), false); // Kế toán không nhận đơn
  assert.equal(duocThayTinDon(ai("FIELD"), true), false);      // hôm nay FIELD dispatch.claim = none (ADR-0030 R1 đổi thành true — có chủ đích)
});
```
Thêm `duocThayTinDon` và `type PermissionCode` vào import đầu tệp test (import `PermissionCode` từ `./permissions.ts`).

- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/bang-tin.test.ts` → FAIL `duocThayTinDon is not a function` (hoặc lỗi import).

- [ ] **Step 3: Cài đặt** — trong `src/shared/bang-tin.ts`, thay thân `thongBaoNoi` bằng:

```ts
/**
 * Tài khoản có được thấy tin về đơn không (TD-4, dùng chung cho thông báo nổi và hộp thông báo — ADR-0034 điều 3). Đối tác/Thực tập
 * (không văn phòng, không Hướng dẫn viên) không bao giờ (Q-C ADR-0022, điều 12 ADR-0014). Tin "chờ nhận" chỉ cho ai nhận được đơn chưa có người.
 */
export function duocThayTinDon(staff: PermissionHolder, choNhan: boolean): boolean {
  const vanPhong = isOffice(staff);
  if (!vanPhong && !hasPermission(staff, "FIELD")) return false;
  return !choNhan || can(staff, "dispatch.claim");   // ADR-0030 Task 1.4 đã lên main → `(can(staff, "dispatch.claim") && !holdsPartner(staff))`
}

export function thongBaoNoi(staff: PermissionHolder, suKien: SuKienDon): ThongBaoNoi | null {
  if (!duocThayTinDon(staff, suKien.thayDoi === "tao_cho_nhan")) return null;
  const dungCau = CAU_THONG_BAO[suKien.thayDoi];
  if (!dungCau) return null;
  return { cau: dungCau(suKien.maDon), lienKet: isOffice(staff) ? `/order?id=${suKien.orderId}` : "/account" };
}
```

- [ ] **Step 4: Chạy, thấy xanh** — `node --test src/shared/bang-tin.test.ts` → PASS (kể cả 6 ca `thongBaoNoi` cũ, chứng minh không đổi hành vi). Rồi `npm test` → xanh.

- [ ] **Step 5: Commit**

```bash
git add src/shared/bang-tin.ts src/shared/bang-tin.test.ts
git commit -m "Bảng tin: tách duocThayTinDon khỏi thongBaoNoi (ADR-0034 điều 3)

Vì sao: hộp thông báo cần đúng điều kiện 'được thấy tin về đơn' của thông báo nổi
nhưng thongBaoNoi trả null cho loại không có câu; tách để dùng chung, không đổi hành vi."
```

---

### Task 2: Luật thuần của hộp thông báo `src/shared/thong-bao.ts`

**Files:**
- Create: `src/shared/thong-bao.ts`
- Test: `src/shared/thong-bao.test.ts`
- Modify: `src/shared/contracts.ts` (thêm DTO)

**Interfaces:**
- Consumes: `duocThayTinDon`, `nhanKetNoi`, `nhanSuKien`, `TrangThaiPhuTrach` (bang-tin.ts); `can`, `hasPermission`, `isOffice`, `PermissionHolder`, `PermissionCode`, `PERMISSION_CODES` (permissions.ts).
- Produces (contracts.ts):

```ts
export type LoaiTin = "thu_cong" | "lap" | "cho_nhan" | "nhan" | "giao" | "xac_nhan" | "huy";
export interface TinDto {
  id: string;
  loai: LoaiTin;
  /** Câu đã dựng ở máy chủ (tin về đơn) hoặc tiêu đề (tin thủ công). Không chứa tên người làm nếu người xem không được xem lịch sử đơn. */
  cau: string;
  maDon: string | null;
  noiDung: string | null;       // chỉ tin thủ công
  nguoiGui: string | null;      // chỉ tin thủ công
  quanTrong: boolean;
  daHieuLuc: string | null;     // tin quan trọng: lúc người xem bấm Đã hiểu
  lienKet: string | null;       // tin về đơn
  luc: string;                  // ISO UTC
  cuaToi: boolean;
  chuaDoc: boolean;
  mo: boolean;                  // tin chờ nhận đã có người nhận (X2)
}
export interface HopThongBaoResponse { tin: TinDto[]; soChuaDoc: number }
export interface TomTatThongBaoResponse { soChuaDoc: number; quanTrongChuaHieu: { id: string; tieuDe: string; nguoiGui: string; luc: string }[] }
export type NguoiNhanTin = "noi-bo" | PermissionCode[];
export interface GuiThongBaoRequest { tieuDe: string; noiDung: string; nguoiNhan: NguoiNhanTin; quanTrong: boolean; clientRequestId: string }
export interface TinDaGuiDto { id: string; tieuDe: string; nguoiNhan: NguoiNhanTin; quanTrong: boolean; luc: string; thuHoiLuc: string | null; soNguoiNhan: number; soDaHieu: number }
export interface DaGuiResponse { tin: TinDaGuiDto[] }
export interface NguoiDaHieuResponse { daHieu: { ten: string; quyen: string; luc: string }[]; chuaHieu: { ten: string; quyen: string }[] }
```

- Produces (thong-bao.ts):

```ts
export const HANH_DONG_TIN_DON = ["created", "order_claimed", "order_handler_changed", "confirmed", "cancelled", "order_cancelled_by_field"] as const;
export interface DongDon { id: string; orderId: string; maDon: string; action: string; actorId: string | null; tenNguoiLam: string | null;
  luc: string; ownerId: string; phuTrach: TrangThaiPhuTrach; lapChuaCoNguoi: boolean; cungLoLap: boolean }
export interface DongThuCong { id: string; tieuDe: string; noiDung: string; quanTrong: boolean; nhan: string[]; nguoiGuiId: string;
  tenNguoiGui: string; luc: string; thuHoi: boolean; daHieuLuc: string | null }
export function loaiTinDon(d: DongDon): Exclude<LoaiTin, "thu_cong"> | null;
export function laNoiBo(staff: PermissionHolder): boolean;
export function nhanNguoiNhan(n: NguoiNhanTin): string[];            // "noi-bo" → ["noi-bo"]; ["SALES"] → ["quyen:SALES"]
export function nhanThayTinThuCong(staff: PermissionHolder, nhan: string[]): boolean;
export function locHopThongBao(staff: PermissionHolder, vao: { don: DongDon[]; thuCong: DongThuCong[]; docDenLuc: string; now: string; ngan: "cua-toi" | "tat-ca" }): HopThongBaoResponse;
export function kiemTinThuCong(raw: unknown): { ok: true; value: GuiThongBaoRequest } | { ok: false; message: string };
export const NGAY_GIU_TIN = 30;
export const TOI_DA_TIN = 100;
```

- [ ] **Step 1: Viết test đỏ** — `src/shared/thong-bao.test.ts`:

```ts
// Luật thuần của hộp thông báo (ADR-0034, đặc tả 2026-09-27-thong-bao-he-thong-design.md §4–§5). Một hàm lọc cho cả số đỏ lẫn danh sách.
import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemTinThuCong, laNoiBo, locHopThongBao, loaiTinDon, nhanNguoiNhan, nhanThayTinThuCong, type DongDon, type DongThuCong } from "./thong-bao.ts";
import type { PermissionCode } from "./permissions.ts";

const NOW = "2026-09-27T02:40:00.000Z";
const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const LAN = ai("lan", "SALES"), HUNG = ai("hung", "SALES"), MAI = ai("mai", "ACCOUNTING"), VU = ai("vu", "SUPER_ADMIN");
const TAM = ai("tam", "FIELD"), BX = ai("bx", "PARTNER"), NGAN = ai("ngan", "INTERN"), LAI = ai("lai", "PARTNER", "SALES");
const don = (o: Partial<DongDon>): DongDon => ({ id: "e" + Math.random(), orderId: "o1", maDon: "TD-20260927-0001", action: "created", actorId: "hung",
  tenNguoiLam: "Hùng", luc: "2026-09-27T02:00:00.000Z", ownerId: "hung", phuTrach: { coNguoi: true, staffId: "hung" }, lapChuaCoNguoi: false, cungLoLap: false, ...o });
const tin = (o: Partial<DongThuCong>): DongThuCong => ({ id: "n" + Math.random(), tieuDe: "Tiêu đề", noiDung: "Nội dung", quanTrong: false, nhan: ["noi-bo"],
  nguoiGuiId: "vu", tenNguoiGui: "Vũ", luc: "2026-09-27T01:30:00.000Z", thuHoi: false, daHieuLuc: null, ...o });
const hop = (staff: ReturnType<typeof ai>, d: DongDon[], t: DongThuCong[] = [], ngan: "cua-toi" | "tat-ca" = "tat-ca", docDenLuc = "2026-09-26T00:00:00.000Z") =>
  locHopThongBao(staff, { don: d, thuCong: t, docDenLuc, now: NOW, ngan });

test("loaiTinDon: map hành động nhật ký → loại tin", () => {
  assert.equal(loaiTinDon(don({ action: "created" })), "lap");
  assert.equal(loaiTinDon(don({ action: "created", lapChuaCoNguoi: true })), "cho_nhan");
  assert.equal(loaiTinDon(don({ action: "order_claimed" })), "nhan");
  assert.equal(loaiTinDon(don({ action: "order_handler_changed" })), "giao");
  // Chọn người phụ trách ngay lúc lập (kể cả tự chọn mình): lô lập ghi created + order_handler_changed CÙNG mốc → chỉ một tin "lap" (đặc tả §4.1)
  assert.equal(loaiTinDon(don({ action: "order_handler_changed", cungLoLap: true })), null);
  assert.equal(loaiTinDon(don({ action: "confirmed" })), "xac_nhan");
  assert.equal(loaiTinDon(don({ action: "cancelled" })), "huy");
  assert.equal(loaiTinDon(don({ action: "order_cancelled_by_field" })), "huy");
  assert.equal(loaiTinDon(don({ action: "updated" })), null);
});

test("K1: tên chỉ có khi người xem được xem lịch sử đơn; không lọt ở trường nào", () => {
  const d = [don({ ownerId: "hung", phuTrach: { coNguoi: true, staffId: "hung" } })];
  assert.match(hop(MAI, d).tin[0]!.cau, /^Hùng vừa lập đơn mới TD-20260927-0001$/);   // Kế toán: history any
  const lan = hop(LAN, d);                                                            // Bán hàng, không lập/không phụ trách
  assert.equal(lan.tin[0]!.cau, "Có đơn mới TD-20260927-0001");
  assert.ok(!JSON.stringify(lan).includes("Hùng"), "JSON không được chứa tên");
  assert.ok(!JSON.stringify(hop(TAM, d)).includes("Hùng"), "HDV (history none) không thấy tên");
  const cuaLan = [don({ ownerId: "lan", actorId: "tri", tenNguoiLam: "Trị", action: "confirmed", phuTrach: { coNguoi: true, staffId: "lan" } })];
  assert.equal(hop(LAN, cuaLan).tin[0]!.cau, "Trị vừa xác nhận đơn TD-20260927-0001");  // đơn của Lan → có tên
  assert.equal(hop(LAN, [don({ actorId: null, tenNguoiLam: null, ownerId: "lan" })]).tin[0]!.cau, "Có đơn mới TD-20260927-0001"); // hệ thống → không tên
});

test("E3: không thấy tin do chính mình làm hoặc gửi (K6)", () => {
  assert.equal(hop(HUNG, [don({})]).tin.length, 0);
  assert.equal(hop(VU, [], [tin({ nguoiGuiId: "vu" })]).tin.length, 0);
});

test("Đối tác/Thực tập không có tin về đơn; HDV chỉ thấy tin chờ nhận khi có dispatch.claim", () => {
  const d = [don({ action: "created", lapChuaCoNguoi: true, ownerId: "bx", actorId: "bx", phuTrach: { coNguoi: false, staffId: null } })];
  assert.equal(hop(BX, [don({ ownerId: "bx" })]).tin.length, 0);
  assert.equal(hop(NGAN, d).tin.length, 0);
  assert.equal(hop(TAM, d).tin.length, 0);
  const lan = hop(LAN, d, [], "cua-toi");
  assert.equal(lan.tin[0]!.loai, "cho_nhan");
  assert.equal(lan.tin[0]!.cuaToi, true);
  assert.equal(hop(MAI, d, [], "cua-toi").tin.length, 0);
  assert.equal(hop(MAI, d, [], "tat-ca").tin.length, 0);           // Kế toán không có dispatch.claim → không thấy tin chờ nhận ở ngăn nào (đặc tả §4.2(2))
});

test("X2: tin chờ nhận đã có người → mờ; nhãn cho-nhan chỉ áp cho dòng lập đơn", () => {
  const lap = don({ action: "created", lapChuaCoNguoi: true, ownerId: "bx", actorId: "bx", phuTrach: { coNguoi: true, staffId: "hung" } });
  const xn = don({ action: "confirmed", ownerId: "bx", actorId: "hung", phuTrach: { coNguoi: false, staffId: null } });
  const r = hop(LAN, [lap, xn], [], "cua-toi");
  assert.equal(r.tin.length, 1, "dòng xác nhận của đơn chưa có người KHÔNG vào 'Của tôi'");
  assert.equal(r.tin[0]!.mo, true);
});

test("Hai ngăn + số chưa đọc chỉ đếm 'Của tôi', luôn bằng số tin cuaToi&&chuaDoc", () => {
  const d = [
    don({ action: "order_claimed", ownerId: "lan", actorId: "hung", luc: "2026-09-27T02:10:00.000Z" }),   // của Lan
    don({ action: "created", ownerId: "hung", actorId: "hung", luc: "2026-09-27T02:20:00.000Z" }),        // đơn khác
    don({ action: "created", ownerId: "lan", actorId: "lan" }),                                            // của chính Lan
  ];
  const t = [tin({ luc: "2026-09-27T01:00:00.000Z" }), tin({ thuHoi: true }), tin({ nhan: ["quyen:ACCOUNTING"] })];
  const cua = hop(LAN, d, t, "cua-toi", "2026-09-27T00:00:00.000Z");
  const tat = hop(LAN, d, t, "tat-ca", "2026-09-27T00:00:00.000Z");
  assert.equal(cua.tin.length, 2);
  assert.equal(tat.tin.length, 3);
  for (const r of [cua, tat]) assert.equal(r.soChuaDoc, cua.tin.filter((x) => x.cuaToi && x.chuaDoc).length);
  assert.equal(hop(LAN, d, t, "cua-toi", NOW).soChuaDoc, 0, "mở hộp = đọc hết");
  assert.deepEqual(cua.tin.map((x) => x.luc), [...cua.tin.map((x) => x.luc)].sort().reverse(), "mới nhất trên cùng");
});

test("K3: 'Toàn công ty' = nội bộ; Đối tác thuần không nhận, Đối tác + Bán hàng nhận", () => {
  assert.deepEqual(nhanNguoiNhan("noi-bo"), ["noi-bo"]);
  assert.deepEqual(nhanNguoiNhan(["SALES", "PARTNER"]), ["quyen:PARTNER", "quyen:SALES"]);
  assert.equal(laNoiBo(BX), false);
  assert.equal(laNoiBo(NGAN), true);
  assert.equal(laNoiBo(LAI), true);
  assert.equal(nhanThayTinThuCong(BX, ["noi-bo"]), false);
  assert.equal(nhanThayTinThuCong(BX, ["quyen:PARTNER"]), true);
  assert.equal(nhanThayTinThuCong(LAI, ["noi-bo"]), true);
  assert.equal(nhanThayTinThuCong(MAI, ["quyen:SALES"]), false);
});

test("X4: 30 ngày; tin quan trọng chưa Đã hiểu giữ quá 30 ngày; tối đa 100", () => {
  const cu = "2026-08-20T00:00:00.000Z";
  assert.equal(hop(LAN, [don({ ownerId: "lan", luc: cu })]).tin.length, 0);
  assert.equal(hop(LAN, [], [tin({ luc: cu })]).tin.length, 0);
  assert.equal(hop(LAN, [], [tin({ luc: cu, quanTrong: true })]).tin.length, 1);
  assert.equal(hop(LAN, [], [tin({ luc: cu, quanTrong: true, daHieuLuc: "2026-08-21T00:00:00.000Z" })]).tin.length, 0);
  const nhieu = Array.from({ length: 150 }, (_, i) => don({ ownerId: "lan", luc: new Date(Date.parse(NOW) - i * 60000).toISOString() }));
  assert.equal(hop(LAN, nhieu).tin.length, 100);
});

test("kiemTinThuCong: bắt lỗi bằng câu tiếng Việt; cắt khoảng trắng; giữ xuống dòng", () => {
  const ok = kiemTinThuCong({ tieuDe: "  Lịch nghỉ  ", noiDung: "Dòng 1\nDòng 2", nguoiNhan: "noi-bo", quanTrong: true, clientRequestId: "11111111-1111-4111-8111-111111111111" });
  assert.ok(ok.ok && ok.value.tieuDe === "Lịch nghỉ" && ok.value.noiDung === "Dòng 1\nDòng 2");
  const sai = (o: object) => { const r = kiemTinThuCong({ tieuDe: "A", noiDung: "B", nguoiNhan: "noi-bo", quanTrong: false, clientRequestId: "11111111-1111-4111-8111-111111111111", ...o }); return r.ok ? "" : r.message; };
  assert.match(sai({ tieuDe: " " }), /tiêu đề/i);
  assert.match(sai({ tieuDe: "x".repeat(121) }), /120/);
  assert.match(sai({ noiDung: "" }), /nội dung/i);
  assert.match(sai({ noiDung: "x".repeat(2001) }), /2000/);
  assert.match(sai({ nguoiNhan: [] }), /nhóm/i);
  assert.match(sai({ nguoiNhan: ["BOSS"] }), /nhóm/i);
  assert.match(sai({ quanTrong: "có" }), /quan trọng/i);
  assert.match(sai({ clientRequestId: "abc" }), /mã yêu cầu/i);
});
```

- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/thong-bao.test.ts` → FAIL (không tìm thấy module `./thong-bao.ts`).

- [ ] **Step 3: Thêm DTO** — dán khối `LoaiTin … NguoiDaHieuResponse` ở mục Interfaces vào cuối `src/shared/contracts.ts` (thêm `import type { PermissionCode } from "./permissions";` nếu tệp chưa có).

- [ ] **Step 4: Cài đặt** — `src/shared/thong-bao.ts`:

```ts
// THÔNG BÁO HỆ THỐNG (ADR-0034) — luật thuần dùng chung server ↔ web/: tin về đơn là HÌNH CHIẾU của audit_log; một hàm lọc cho cả số đỏ
// lẫn danh sách. Không I/O. Luật quyền chỉ qua can()/hasPermission/isOffice và các hàm của bang-tin.ts — không viết tay luật mới.
import { duocThayTinDon, nhanKetNoi, nhanSuKien, type TrangThaiPhuTrach } from "./bang-tin.ts";
import { can, hasPermission, isOffice, PERMISSION_CODES, type PermissionCode, type PermissionHolder } from "./permissions.ts";
import type { GuiThongBaoRequest, HopThongBaoResponse, LoaiTin, NguoiNhanTin, TinDto } from "./contracts.ts";

export const HANH_DONG_TIN_DON = ["created", "order_claimed", "order_handler_changed", "confirmed", "cancelled", "order_cancelled_by_field"] as const;
export const NGAY_GIU_TIN = 30;
export const TOI_DA_TIN = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DongDon {
  id: string; orderId: string; maDon: string; action: string; actorId: string | null; tenNguoiLam: string | null;
  luc: string; ownerId: string; phuTrach: TrangThaiPhuTrach; lapChuaCoNguoi: boolean;
  cungLoLap: boolean; // order_handler_changed cùng mốc với dòng created của đơn = chọn người phụ trách LÚC LẬP (ADR-0030 Task 1.3) → không thành tin riêng
}
export interface DongThuCong {
  id: string; tieuDe: string; noiDung: string; quanTrong: boolean; nhan: string[]; nguoiGuiId: string;
  tenNguoiGui: string; luc: string; thuHoi: boolean; daHieuLuc: string | null;
}
type LoaiTinDon = Exclude<LoaiTin, "thu_cong">;

export function loaiTinDon(d: DongDon): LoaiTinDon | null {
  switch (d.action) {
    case "created": return d.lapChuaCoNguoi ? "cho_nhan" : "lap";
    case "order_claimed": return "nhan";
    case "order_handler_changed": return d.cungLoLap ? null : "giao";
    case "confirmed": return "xac_nhan";
    case "cancelled": case "order_cancelled_by_field": return "huy";
    default: return null;
  }
}

const CAU: Record<LoaiTinDon, { coTen: (ten: string, ma: string) => string; khongTen: (ma: string) => string }> = {
  lap: { coTen: (t, m) => `${t} vừa lập đơn mới ${m}`, khongTen: (m) => `Có đơn mới ${m}` },
  cho_nhan: { coTen: (t, m) => `${t} vừa lập đơn ${m}, chưa có người phụ trách`, khongTen: (m) => `Có đơn mới ${m}, chưa có người phụ trách` },
  nhan: { coTen: (t, m) => `${t} vừa nhận đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa có người nhận` },
  giao: { coTen: (t, m) => `${t} vừa giao đơn ${m} cho người khác phụ trách`, khongTen: (m) => `Đơn ${m} vừa đổi người phụ trách` },
  xac_nhan: { coTen: (t, m) => `${t} vừa xác nhận đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa được xác nhận` },
  huy: { coTen: (t, m) => `${t} vừa huỷ đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa bị huỷ` },
};

/** "Toàn công ty" (K3): có ít nhất một quyền khác PARTNER. */
export const laNoiBo = (staff: PermissionHolder): boolean => staff.permissions.some((p) => p !== "PARTNER");
export function nhanNguoiNhan(n: NguoiNhanTin): string[] {
  return n === "noi-bo" ? ["noi-bo"] : [...new Set(n)].map((p) => `quyen:${p}`).sort();
}
export function nhanThayTinThuCong(staff: PermissionHolder, nhan: string[]): boolean {
  return nhan.some((t) => (t === "noi-bo" ? laNoiBo(staff) : t.startsWith("quyen:") && hasPermission(staff, t.slice(6) as PermissionCode)));
}

export function locHopThongBao(
  staff: PermissionHolder,
  vao: { don: DongDon[]; thuCong: DongThuCong[]; docDenLuc: string; now: string; ngan: "cua-toi" | "tat-ca" },
): HopThongBaoResponse {
  const moc = new Date(Date.parse(vao.now) - NGAY_GIU_TIN * 86400000).toISOString();
  const ketNoi = new Set(nhanKetNoi(staff));
  const tat: TinDto[] = [];
  for (const d of vao.don) {
    if (d.luc < moc || d.actorId === staff.id) continue;
    const loai = loaiTinDon(d);
    if (!loai || !duocThayTinDon(staff, loai === "cho_nhan")) continue;
    // Hộp KHÔNG biết người phụ trách trước sự kiện. Nhãn cho-nhan do chính loại tin quyết (dòng dưới), nên bỏ mọi cho-nhan nhanSuKien suy ra.
    // Hôm nay (ADR-0030 chưa lên main) nhanSuKien chưa nhận null → truyền { coNguoi: false, staffId: null }; kết quả đúng nhờ .filter.
    // KHI GỘP ADR-0030 Task 1.4: đổi thành handlerTruoc: null ("không biết" — không bao giờ coi là "chưa ai", NT-3). Mục "Phụ thuộc ADR-0030" điểm 6.
    const nhan = nhanSuKien({ ownerId: d.ownerId, handlerTruoc: { coNguoi: false, staffId: null }, handlerSau: d.phuTrach })
      .filter((t) => t !== "cho-nhan");
    if (loai === "cho_nhan") nhan.push("cho-nhan");
    const chung = nhan.filter((t) => ketNoi.has(t));
    if (!chung.length) continue;
    const cuaToi = chung.some((t) => t !== "tat-ca");
    const coTen = d.tenNguoiLam !== null && can(staff, "order.history.view", { ownerId: d.ownerId, assigned: d.phuTrach.staffId === staff.id });
    tat.push({
      id: d.id, loai, maDon: d.maDon, noiDung: null, nguoiGui: null, quanTrong: false, daHieuLuc: null,
      cau: coTen ? CAU[loai].coTen(d.tenNguoiLam!, d.maDon) : CAU[loai].khongTen(d.maDon),
      lienKet: isOffice(staff) ? `/order?id=${d.orderId}` : "/account",
      luc: d.luc, cuaToi, chuaDoc: d.luc > vao.docDenLuc, mo: loai === "cho_nhan" && d.phuTrach.coNguoi,
    });
  }
  for (const t of vao.thuCong) {
    if (t.thuHoi || t.nguoiGuiId === staff.id || !nhanThayTinThuCong(staff, t.nhan)) continue;
    const conGiu = t.luc >= moc || (t.quanTrong && t.daHieuLuc === null);
    if (!conGiu) continue;
    tat.push({
      id: t.id, loai: "thu_cong", cau: t.tieuDe, maDon: null, noiDung: t.noiDung, nguoiGui: t.tenNguoiGui, quanTrong: t.quanTrong,
      daHieuLuc: t.daHieuLuc, lienKet: null, luc: t.luc, cuaToi: true, chuaDoc: t.luc > vao.docDenLuc, mo: false,
    });
  }
  tat.sort((a, b) => (a.luc < b.luc ? 1 : a.luc > b.luc ? -1 : 0));
  const cua = tat.filter((x) => x.cuaToi).slice(0, TOI_DA_TIN);
  const soChuaDoc = cua.filter((x) => x.chuaDoc).length;      // đếm trên ĐÚNG danh sách ngăn "Của tôi" trả về → số đỏ không bao giờ lệch danh sách (Review Focus 5)
  const tin = vao.ngan === "cua-toi" ? cua : tat.slice(0, TOI_DA_TIN);
  return { tin, soChuaDoc };
}

export function kiemTinThuCong(raw: unknown): { ok: true; value: GuiThongBaoRequest } | { ok: false; message: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const tieuDe = typeof r.tieuDe === "string" ? r.tieuDe.trim() : "";
  const noiDung = typeof r.noiDung === "string" ? r.noiDung.trim() : "";
  if (!tieuDe) return { ok: false, message: "Chưa có tiêu đề. Viết một câu ngắn nói tin này về việc gì." };
  if (tieuDe.length > 120) return { ok: false, message: "Tiêu đề tối đa 120 ký tự." };
  if (!noiDung) return { ok: false, message: "Chưa có nội dung." };
  if (noiDung.length > 2000) return { ok: false, message: "Nội dung tối đa 2000 ký tự." };
  const n = r.nguoiNhan;
  const hopLe = n === "noi-bo" || (Array.isArray(n) && n.length > 0 && n.every((p) => (PERMISSION_CODES as readonly unknown[]).includes(p)));
  if (!hopLe) return { ok: false, message: "Chưa chọn nhóm nhận hợp lệ. Chọn Toàn công ty hoặc tick ít nhất một nhóm." };
  if (typeof r.quanTrong !== "boolean") return { ok: false, message: "Thiếu lựa chọn tin quan trọng." };
  if (typeof r.clientRequestId !== "string" || !UUID.test(r.clientRequestId)) return { ok: false, message: "Thiếu mã yêu cầu. Tải lại trang rồi gửi lại." };
  return { ok: true, value: { tieuDe, noiDung, nguoiNhan: n as NguoiNhanTin, quanTrong: r.quanTrong, clientRequestId: r.clientRequestId } };
}
```
(Lưu ý: tên loại dùng `LoaiTinDon` nội bộ; test chỉ import những gì liệt kê ở Interfaces.)

- [ ] **Step 5: Chạy, thấy xanh** — `node --test src/shared/thong-bao.test.ts` → PASS. `npm test` → xanh. `npm run typecheck` → 0 lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/shared/thong-bao.ts src/shared/thong-bao.test.ts src/shared/contracts.ts
git commit -m "Thông báo: luật thuần lọc hộp thông báo, câu tin, kiểm tin thủ công (ADR-0034)

Vì sao: một hàm duy nhất quyết ai thấy gì, câu gì, chưa đọc bao nhiêu — số đỏ và
danh sách không thể lệch; tên chỉ dựng khi có order.history.view (K1)."
```

---

### Task 3: Dữ liệu — migration 0025, hành động nhật ký, ô quyền, đăng ký kiến trúc

**Files:**
- Create: `migrations/0025_thong_bao.sql`, `src/migrations-0025.test.ts`
- Modify: `src/shared/audit-actions.ts`, `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/architecture.test.ts` (TABLE_PREFIX, VIEW_PREFIX), `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sinh), `docs/quyen-hoan.json` (mục hoãn tạm cho `notice.send` — gỡ ở Task 6)

**Interfaces:**
- Produces: bảng `ntf_notice(id, tieu_de, noi_dung, quan_trong, client_request_id, valid_to, created_at, created_by, updated_at, updated_by)`, `ntf_notice_target(notice_id, tag, …4 cột dấu vết)`, `ntf_ack(notice_id, staff_id, …4 cột)`, `ntf_read_mark(staff_id, doc_den_luc, …4 cột)`; view `v_aud_order_event(id, order_id, staff_id, action, created_at)`, `v_ord_order_owner(id, staff_id)`, `v_dsp_first_handler(order_id, first_at)`; hành động `order_claimed`, `notice_sent`, `notice_revoked`, `notice_acknowledged` (nhóm `notice` = "Thông báo"); ô `notice.send`.

- [ ] **Step 1: Viết test đỏ** — `src/migrations-0025.test.ts` (theo mẫu `src/migrations-0021.test.ts`: dựng DB tạm bằng `node:sqlite` `DatabaseSync`, chạy mọi `migrations/*.sql` đã sắp):

```ts
// Migration 0025 — Thông báo hệ thống (ADR-0034): 4 bảng ntf_*, ntf_ack chỉ-thêm, 3 view công bố.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DIR = join(import.meta.dirname, "..", "migrations");
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(DIR, f), "utf8"));
  return db;
}
const T = "2026-09-27T01:00:00.000Z";

test("0025: có đủ bảng và view", () => {
  const db = moi();
  const ten = (type: string) => (db.prepare(`SELECT name FROM sqlite_master WHERE type = ? ORDER BY name`).all(type) as { name: string }[]).map((r) => r.name);
  for (const t of ["ntf_ack", "ntf_notice", "ntf_notice_target", "ntf_read_mark"]) assert.ok(ten("table").includes(t), t);
  for (const v of ["v_aud_order_event", "v_dsp_first_handler", "v_ord_order_owner"]) assert.ok(ten("view").includes(v), v);
});

test("0025: ntf_ack chỉ-thêm (không sửa, không xoá)", () => {
  const db = moi();
  db.prepare(`INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by) VALUES ('n1','A','B',1,'r1',?,'vu',?,'vu')`).run(T, T);
  db.prepare(`INSERT INTO ntf_ack (notice_id, staff_id, created_at, created_by, updated_at, updated_by) VALUES ('n1','lan',?,'lan',?,'lan')`).run(T, T);
  assert.throws(() => db.exec(`UPDATE ntf_ack SET staff_id = 'x'`), /append_only/);
  assert.throws(() => db.exec(`DELETE FROM ntf_ack`), /append_only/);
});

test("0025: một client_request_id của cùng người gửi chỉ một tin", () => {
  const db = moi();
  const ins = db.prepare(`INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'A','B',0,'r1',?,'vu',?,'vu')`);
  ins.run("n1", T, T);
  assert.throws(() => ins.run("n2", T, T), /UNIQUE/);
});

test("0025: v_aud_order_event chỉ lấy 6 hành động về đơn", () => {
  const db = moi();
  const ins = db.prepare(`INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, 'o1', 's1', ?, ?)`);
  ["created", "updated", "order_claimed", "confirmed", "trip_updated"].forEach((a, i) => ins.run("a" + i, a, T));
  const acts = (db.prepare(`SELECT action FROM v_aud_order_event ORDER BY action`).all() as { action: string }[]).map((r) => r.action);
  assert.deepEqual(acts, ["confirmed", "created", "order_claimed"]);
});
```
(Nếu `audit_log` có cột NOT NULL khác ngoài các cột trên — kiểm `migrations/0007_*.sql:9-18` — thêm giá trị cho đủ.)

Thêm vào `src/shared/permissions.test.ts`, trong bảng `ADR` (dòng 9-36):

```ts
  "notice.send": ["none", "none", "none", "none", "none", "any", "none"], // ADR-0034 điều 7: chỉ Toàn quyền gửi/thu hồi tin thủ công
```
và thêm `"notice.send"` vào `ADMIN_NONE_OPS` (dòng ~177-184).

- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/migrations-0025.test.ts src/shared/permissions.test.ts` → FAIL (thiếu bảng; `MATRIX và ADR phải có cùng danh sách thao tác`).

- [ ] **Step 3: Viết migration** — `migrations/0025_thong_bao.sql`:

```sql
-- Migration 0025 — Thông báo hệ thống lượt 1 (module thongbao, ADR-0034). Đặc tả: docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md. Chỉ THÊM.
-- Tin về đơn KHÔNG có bảng: là hình chiếu của audit_log qua v_aud_order_event (ADR-0034 điều 1). Bảng dưới đây chỉ cho tin thủ công.

CREATE TABLE ntf_notice (
  id                TEXT PRIMARY KEY,
  tieu_de           TEXT NOT NULL CHECK (length(trim(tieu_de)) BETWEEN 1 AND 120),
  noi_dung          TEXT NOT NULL CHECK (length(trim(noi_dung)) BETWEEN 1 AND 2000),
  quan_trong        INTEGER NOT NULL DEFAULT 0 CHECK (quan_trong IN (0, 1)),
  client_request_id TEXT NOT NULL,                     -- chống gửi trùng khi bấm hai lần (cùng người gửi)
  valid_to          TEXT,                              -- UTC; NULL = còn hiệu lực; đặt = đã thu hồi (không xoá cứng)
  created_at        TEXT NOT NULL,
  created_by        TEXT,                              -- người gửi (WHO: không khoá ngoại)
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
CREATE UNIQUE INDEX ntf_notice_request_uq ON ntf_notice(created_by, client_request_id);
CREATE INDEX ntf_notice_created_ix ON ntf_notice(created_at);

CREATE TABLE ntf_notice_target (
  notice_id  TEXT NOT NULL REFERENCES ntf_notice(id),
  tag        TEXT NOT NULL CHECK (tag = 'noi-bo' OR tag GLOB 'quyen:[A-Z]*'),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (notice_id, tag)
);

CREATE TABLE ntf_ack (
  notice_id  TEXT NOT NULL REFERENCES ntf_notice(id),
  staff_id   TEXT NOT NULL,                            -- người bấm "Đã hiểu" (không khoá ngoại)
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (notice_id, staff_id)
);
CREATE TRIGGER ntf_ack_frozen_update BEFORE UPDATE ON ntf_ack
BEGIN SELECT RAISE(ABORT, 'append_only: xác nhận đã hiểu không sửa được'); END;
CREATE TRIGGER ntf_ack_frozen_delete BEFORE DELETE ON ntf_ack
BEGIN SELECT RAISE(ABORT, 'append_only: xác nhận đã hiểu không xoá được'); END;

CREATE TABLE ntf_read_mark (
  staff_id    TEXT PRIMARY KEY,                        -- mỗi tài khoản một mốc; chỉ chính tài khoản đặt
  doc_den_luc TEXT NOT NULL,                           -- UTC: mọi tin tới lúc này coi là đã đọc (mở hộp = đọc hết)
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);

-- View công bố (đọc xuyên module chỉ qua view — ADR-0002). Chủ sở hữu ghi ở docs/data-dictionary.json.
CREATE VIEW v_aud_order_event AS                        -- module audit
  SELECT id, order_id, staff_id, action, created_at FROM audit_log
  WHERE order_id IS NOT NULL
    AND action IN ('created', 'order_claimed', 'order_handler_changed', 'confirmed', 'cancelled', 'order_cancelled_by_field');
CREATE VIEW v_ord_order_owner AS                        -- module orders: người lập đơn
  SELECT id, staff_id FROM orders;
CREATE VIEW v_dsp_first_handler AS                      -- module dispatch: lúc đơn có người phụ trách LẦN ĐẦU (X2)
  SELECT order_id, MIN(valid_from_at) AS first_at FROM dsp_assignment
  WHERE task_kind_code = 'HANDLE' AND order_id IS NOT NULL GROUP BY order_id;
```
Trước khi chốt, chạy `grep -n "INDEX" migrations/0004_audit_log.sql migrations/0007_*.sql`: nếu `audit_log` **chưa** có chỉ mục trên `created_at`, thêm `CREATE INDEX audit_log_created_ix ON audit_log(created_at);` vào cuối tệp (chỉ mục thuộc module `audit`, ghi chú trong data-dictionary).

- [ ] **Step 4: Hành động nhật ký** — `src/shared/audit-actions.ts`: thêm `notice: "Thông báo",` vào `AUDIT_GROUPS` (trước `system`), và vào `AUDIT_ACTIONS`:

```ts
  order_claimed: { label: "Tự nhận phụ trách đơn", group: "order" },
  notice_sent: { label: "Gửi thông báo", group: "notice" },
  notice_revoked: { label: "Thu hồi thông báo", group: "notice" },
  notice_acknowledged: { label: "Xác nhận đã hiểu thông báo", group: "notice" },
```

- [ ] **Step 5: Ô quyền** — `src/shared/permissions.ts`, trong `MATRIX` sau `"settings.ops"`:

```ts
  "notice.send": row("none", "none", "none", "none", "none", "any", "none"), // gửi/thu hồi thông báo thủ công, xem ai đã hiểu — chỉ Toàn quyền (ADR-0034 điều 7)
```
Và vì chưa có route gọi `can(…,"notice.send")` tới Task 6, thêm mục hoãn **tạm** vào `docs/quyen-hoan.json` → `thao_tac`:

```json
{ "ma": "notice.send", "ly_do": "ADR-0034: route gửi thông báo thi công ở Task 6 cùng nhánh.", "ke_hoach": "Gỡ mục này ở Task 6 khi route gọi can(staff, \"notice.send\").", "han": "2026-10-15", "nguoi_chiu_trach_nhiem": "chủ dự án" }
```

- [ ] **Step 6: Đăng ký kiến trúc + sổ dữ liệu**
  - `src/architecture.test.ts`: thêm `ntf_: "thongbao"` vào `TABLE_PREFIX`; thêm `aud: "audit"` vào `VIEW_PREFIX`. (Module `thongbao` chưa có thư mục nên chưa khai `ALLOWED_EDGES` — làm ở Task 5.)
  - `docs/data-dictionary.json`: thêm `"thongbao"` vào `modules`; thêm 4 bảng `{ "name": "ntf_notice", "module": "thongbao", "kind": "table" }` (tương tự `ntf_notice_target`, `ntf_ack`, `ntf_read_mark`); thêm 3 view: `{ "name": "v_aud_order_event", "module": "audit", "columns": ["id","order_id","staff_id","action","created_at"] }`, `{ "name": "v_ord_order_owner", "module": "orders", "columns": ["id","staff_id"] }`, `{ "name": "v_dsp_first_handler", "module": "dispatch", "columns": ["order_id","first_at"] }`; `integrityEdges`: `{ "fromTable": "ntf_notice_target", "toTable": "ntf_notice", "note": "nhóm nhận của tin" }`, `{ "fromTable": "ntf_ack", "toTable": "ntf_notice", "note": "xác nhận đã hiểu" }`.
  - Chạy `npm run dict`.

- [ ] **Step 7: Chạy, thấy xanh** — `npm test` → xanh (gồm `architecture.test.ts` bài ADR-0003 cột dấu vết, ADR-0002 tiền tố, sổ dữ liệu khớp schema; `permissions.test.ts`; `permission-enforcement.test.ts` nhờ mục hoãn). `npm run db:migrate:local` → áp 0025 không lỗi.

- [ ] **Step 8: Commit**

```bash
git add migrations/0025_thong_bao.sql src/migrations-0025.test.ts src/shared/audit-actions.ts src/shared/permissions.ts src/shared/permissions.test.ts src/architecture.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md docs/quyen-hoan.json
git commit -m "Thông báo: migration 0025 (bảng ntf_*, 3 view công bố), ô notice.send, hành động nhật ký (ADR-0034)

Vì sao: tin về đơn đọc qua view của audit/orders/dispatch (một nguồn sự thật);
tin thủ công và xác nhận đã hiểu là thực thể riêng, ntf_ack chỉ-thêm; chống gửi
trùng bằng client_request_id. notice.send hoãn tạm tới Task 6."
```

---

### Task 4: Ghi `order_claimed` khi tự nhận đơn

**Files:**
- Modify: `src/modules/dispatch/service.ts:7-33`, `src/modules/dispatch/index.ts:~135-157`
- Test: `tests/e2e/dispatch.mjs`

**Interfaces:**
- Consumes: `thayDoiCuaHandler` (bang-tin.ts), `order_claimed` (Task 3).
- Produces: `HandlerChange.tuNhan: boolean` (bắt buộc).

- [ ] **Step 1: Viết test đỏ** — trong `tests/e2e/dispatch.mjs`, ngay sau ca "nhân viên tự nhận đơn chưa có người" (khoảng dòng 73, nơi gọi `PUT /api/orders/:id/handler` với chính mình), thêm:

```js
{
  const rows = await sqlRows(`SELECT action FROM audit_log WHERE order_id = '${orderIdTuNhan}' AND action IN ('order_claimed','order_handler_changed') ORDER BY created_at DESC LIMIT 1`);
  assert.equal(rows[0]?.action, "order_claimed", "tự nhận đơn chưa có người phải ghi order_claimed (ADR-0034 §4.3)");
}
```
(đặt đúng tên biến id đơn mà ca đó dùng; import `sqlRows` từ `./lib.mjs` nếu chưa có). Và sau ca "đổi người phụ trách A→B" thêm khẳng định tương tự với `"order_handler_changed"`.

- [ ] **Step 2: Chạy, thấy đỏ** — `npm run test:e2e -- dispatch` → FAIL `'order_handler_changed' !== 'order_claimed'`.

- [ ] **Step 3: Cài đặt** — `service.ts`: thêm `tuNhan: boolean;` vào `HandlerChange`, và trong `handlerChangeStatements` đổi `action: "order_handler_changed"` thành `action: c.tuNhan ? "order_claimed" : "order_handler_changed"`. Trong `index.ts` route `PUT /api/orders/:id/handler`: tính `const thayDoi = thayDoiCuaHandler({ nguoiGoi: staff.id, handlerTruoc: truoc, handlerSau: { coNguoi: true, staffId: input.staffId } });` **trước** khi dựng lô, truyền `tuNhan: thayDoi === "nhan"` vào `handlerChangeStatements`, và dùng lại `thayDoi` trong `baoThayDoi({ orderId, thayDoi, handlerTruoc: truoc })` (giữ đúng MỘT lời gọi `baoThayDoi` giữa hai `return` cuối — `src/bang-tin-guard.test.ts`). Mọi nơi khác gọi `handlerChangeStatements` (grep) truyền `tuNhan: false` trừ khi cùng luật.

- [ ] **Step 4: Chạy, thấy xanh** — `npm test` (gồm `bang-tin-guard.test.ts`) → xanh; `npm run test:e2e -- dispatch bangtin` → xanh.

- [ ] **Step 5: Commit**

```bash
git add src/modules/dispatch/service.ts src/modules/dispatch/index.ts tests/e2e/dispatch.mjs
git commit -m "Phân công: ghi order_claimed khi tự nhận đơn chưa có người (ADR-0034 §4.3)

Vì sao: hộp thông báo đọc nhật ký; phải phân biệt 'Hùng vừa nhận đơn' với 'giao
đơn cho người khác'. Dùng lại thayDoiCuaHandler, không thêm luật mới."
```

---

### Task 5: Module `thongbao` — đọc hộp, tóm tắt, đã đọc, đã hiểu

**Files:**
- Create: `src/modules/thongbao/repository.ts`, `src/modules/thongbao/index.ts`, `tests/e2e/thongbao.mjs`
- Modify: `src/index.ts`, `src/architecture.test.ts` (`ALLOWED_EDGES`, `STRICT`), `src/route-access.test.ts` (`MODULES`, `SNAPSHOT`, số route), `tests/e2e/run.mjs`

**Interfaces:**
- Consumes: `locHopThongBao`, `HANH_DONG_TIN_DON`, `NGAY_GIU_TIN`, `DongDon`, `DongThuCong` (Task 2); `auditStatement` (audit); `getStaffAccount` (staff — trả `StaffAccount` có `createdAt`); view Task 3.
- Produces: `thongbaoModule: AppModule`; route `GET /api/thong-bao?ngan=cua-toi|tat-ca` → `HopThongBaoResponse`; `GET /api/thong-bao/tom-tat` → `TomTatThongBaoResponse`; `POST /api/account/thong-bao/da-doc` → `{ ok: true }`; `POST /api/account/thong-bao/:id/da-hieu` → `{ ok: true, luc }`. Hai đường ghi tự phục vụ đặt dưới `/api/account/*` vì luật (1) của `src/route-write-guard.test.ts` chỉ cho mục "ngoại lệ" ở đó (không có ô MATRIX "tự phục vụ"); route vẫn thuộc module `thongbao`.

- [ ] **Step 1: Viết test e2e đỏ** — `tests/e2e/thongbao.mjs`:

```js
// Hộp thông báo (ADR-0034): tin về đơn là hình chiếu của nhật ký; K1 ẩn tên; E3; hai ngăn; số chưa đọc = danh sách.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, ensureFakeCatalog, login, randomPhone, session, sql } from "./lib.mjs";

const A = await session(ACCOUNTS.salesA), B = await session(ACCOUNTS.salesB), KT = await session(ACCOUNTS.accountant), TQ = await session(ACCOUNTS.superAdmin);
assert.equal((await call(null, "GET", "/api/thong-bao")).status, 401);

// A lập đơn: CHÉP NGUYÊN đối tượng `input` ở tests/e2e/orders.mjs:19-47 (thân tạo đơn hợp lệ trên danh mục giả) vào đây, rồi:
await ensureFakeCatalog();
const taoDon = async (cookie) => {
  const x = await call(cookie, "POST", "/api/orders", input);
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return x.body.order; // có .id và .orderCode
};
const don = await taoDon(A);
const tatKT = (await call(KT, "GET", "/api/thong-bao?ngan=tat-ca")).body;
const tin = tatKT.tin.find((t) => t.maDon === don.orderCode);
assert.ok(tin && tin.cau.startsWith(ACCOUNTS.salesA.name + " vừa lập đơn"), "Kế toán thấy tên người lập");
assert.equal(tin.cuaToi, false);
const tatB = await call(B, "GET", "/api/thong-bao?ngan=tat-ca");
const tinB = tatB.body.tin.find((t) => t.maDon === don.orderCode);
assert.ok(tinB, "B thấy tin lập đơn ở ngăn Tất cả");
// Chỉ kiểm tin của ĐÚNG đơn này: dữ liệu e2e cũ (dispatch.mjs, orders.mjs) có đơn A lập mà B phụ trách → B được thấy tên A hợp lệ ở đó.
assert.ok(!JSON.stringify(tinB).includes(ACCOUNTS.salesA.name), "K1: Bán hàng B không thấy tên A ở đơn không phải của mình");
const tuA = (await call(A, "GET", "/api/thong-bao?ngan=tat-ca")).body;
assert.ok(!tuA.tin.some((t) => t.maDon === don.orderCode), "E3: A không thấy tin của chính mình");
console.log("✓ tin về đơn: K1, E3");

// Số chưa đọc = số tin cuaToi&&chuaDoc; mở hộp = đọc hết
for (const c of [A, B, KT]) {
  const tt = (await call(c, "GET", "/api/thong-bao/tom-tat")).body;
  const cua = (await call(c, "GET", "/api/thong-bao?ngan=cua-toi")).body;
  assert.equal(tt.soChuaDoc, cua.tin.filter((t) => t.chuaDoc).length);
}
assert.equal((await call(KT, "POST", "/api/account/thong-bao/da-doc")).status, 200);
assert.equal((await call(KT, "GET", "/api/thong-bao/tom-tat")).body.soChuaDoc, 0);
console.log("✓ số chưa đọc khớp danh sách; mở hộp = đọc hết");

// Tài khoản mới tạo sau khi có tin: không đổ dồn tin cũ (mốc = ngày tạo tài khoản)
await sql(`UPDATE staff SET created_at = '${new Date().toISOString()}' WHERE phone = '${ACCOUNTS.accountant.phone}'`);
await sql(`DELETE FROM ntf_read_mark WHERE staff_id = (SELECT id FROM staff WHERE phone = '${ACCOUNTS.accountant.phone}')`);
assert.equal((await call(KT, "GET", "/api/thong-bao/tom-tat")).body.soChuaDoc, 0);
console.log("✓ tài khoản mới không bị đổ dồn tin cũ");

// Đã hiểu: tin không tồn tại / không thuộc nhóm nhận → 404
assert.equal((await call(A, "POST", `/api/account/thong-bao/${randomUUID()}/da-hieu`)).status, 404);
console.log("THONGBAO (đọc) OK");
```
Thêm `"thongbao"` vào `ALL` ở `tests/e2e/run.mjs`, **trước** `"maintenance"`.

- [ ] **Step 2: Chạy, thấy đỏ** — `npm run test:e2e -- thongbao` → FAIL 404 ở `/api/thong-bao`.

- [ ] **Step 3: Repository** — `src/modules/thongbao/repository.ts`:

```ts
// SQL của module thongbao (bảng ntf_*; ADR-0034). Mọi câu qua defineSql, tham số ?N. Đọc xuyên module CHỈ qua view công bố:
// v_aud_order_event (audit), v_ord_order_label + v_ord_order_owner (orders), v_dsp_order_handler + v_dsp_first_handler (dispatch), v_stf_staff_label (staff).
// Không DELETE, không OR REPLACE (R-N1-9).
import { defineSql } from "../../shared/sql-registry.ts";
import type { DongDon, DongThuCong } from "../../shared/thong-bao.ts";

const LIST_DON = defineSql("thongbao", "list_don", `
  SELECT e.id, e.order_id, o.order_code AS ma_don, e.action, e.staff_id AS actor_id, s.label AS ten_nguoi_lam, e.created_at AS luc,
         w.staff_id AS owner_id, (h.order_id IS NOT NULL) AS co_nguoi, h.staff_id AS handler_staff_id,
         (f.first_at IS NULL OR f.first_at > e.created_at) AS lap_chua_co_nguoi,
         (e.action = 'order_handler_changed' AND EXISTS (SELECT 1 FROM v_aud_order_event c
            WHERE c.order_id = e.order_id AND c.action = 'created' AND c.created_at = e.created_at)) AS cung_lo_lap
  FROM v_aud_order_event e
  JOIN v_ord_order_label o ON o.id = e.order_id
  JOIN v_ord_order_owner w ON w.id = e.order_id
  LEFT JOIN v_dsp_order_handler h ON h.order_id = e.order_id
  LEFT JOIN v_dsp_first_handler f ON f.order_id = e.order_id
  LEFT JOIN v_stf_staff_label s ON s.id = e.staff_id
  WHERE e.created_at >= ?1
  ORDER BY e.created_at DESC LIMIT 3000`);
const LIST_THU_CONG = defineSql("thongbao", "list_thu_cong", `
  SELECT n.id, n.tieu_de, n.noi_dung, n.quan_trong, n.created_by, COALESCE(s.label, '') AS ten_nguoi_gui, n.created_at, (n.valid_to IS NOT NULL) AS thu_hoi,
         (SELECT group_concat(t.tag, ' ') FROM ntf_notice_target t WHERE t.notice_id = n.id) AS tags,
         (SELECT a.created_at FROM ntf_ack a WHERE a.notice_id = n.id AND a.staff_id = ?2) AS da_hieu_luc
  FROM ntf_notice n LEFT JOIN v_stf_staff_label s ON s.id = n.created_by
  WHERE n.valid_to IS NULL AND (n.created_at >= ?1 OR (n.quan_trong = 1 AND NOT EXISTS (SELECT 1 FROM ntf_ack a WHERE a.notice_id = n.id AND a.staff_id = ?2)))
  ORDER BY n.created_at DESC LIMIT 500`);
const GET_MARK = defineSql("thongbao", "get_mark", `SELECT doc_den_luc FROM ntf_read_mark WHERE staff_id = ?1`);
const UPSERT_MARK = defineSql("thongbao", "upsert_mark", `
  INSERT INTO ntf_read_mark (staff_id, doc_den_luc, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?2, ?1, ?2, ?1)
  ON CONFLICT (staff_id) DO UPDATE SET doc_den_luc = excluded.doc_den_luc, updated_at = excluded.updated_at, updated_by = excluded.updated_by`);
const INSERT_ACK = defineSql("thongbao", "insert_ack", `
  INSERT INTO ntf_ack (notice_id, staff_id, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?2, ?3, ?2)
  ON CONFLICT (notice_id, staff_id) DO NOTHING`);

interface DonRow { id: string; order_id: string; ma_don: string; action: string; actor_id: string | null; ten_nguoi_lam: string | null; luc: string;
  owner_id: string; co_nguoi: number; handler_staff_id: string | null; lap_chua_co_nguoi: number; cung_lo_lap: number }
interface ThuCongRow { id: string; tieu_de: string; noi_dung: string; quan_trong: number; created_by: string; ten_nguoi_gui: string; created_at: string;
  thu_hoi: number; tags: string | null; da_hieu_luc: string | null }

export async function listDon(db: D1Database, tu: string): Promise<DongDon[]> {
  const r = (await db.prepare(LIST_DON).bind(tu).all<DonRow>()).results;
  return r.map((x) => ({ id: x.id, orderId: x.order_id, maDon: x.ma_don, action: x.action, actorId: x.actor_id, tenNguoiLam: x.ten_nguoi_lam, luc: x.luc,
    ownerId: x.owner_id, phuTrach: { coNguoi: x.co_nguoi === 1, staffId: x.handler_staff_id }, lapChuaCoNguoi: x.lap_chua_co_nguoi === 1, cungLoLap: x.cung_lo_lap === 1 }));
}
export async function listThuCong(db: D1Database, tu: string, staffId: string): Promise<DongThuCong[]> {
  const r = (await db.prepare(LIST_THU_CONG).bind(tu, staffId).all<ThuCongRow>()).results;
  return r.map((x) => ({ id: x.id, tieuDe: x.tieu_de, noiDung: x.noi_dung, quanTrong: x.quan_trong === 1, nhan: (x.tags ?? "").split(" ").filter(Boolean),
    nguoiGuiId: x.created_by, tenNguoiGui: x.ten_nguoi_gui, luc: x.created_at, thuHoi: x.thu_hoi === 1, daHieuLuc: x.da_hieu_luc }));
}
export const getMark = async (db: D1Database, staffId: string) => (await db.prepare(GET_MARK).bind(staffId).first<{ doc_den_luc: string }>())?.doc_den_luc ?? null;
export const upsertMarkStatement = (db: D1Database, staffId: string, at: string) => db.prepare(UPSERT_MARK).bind(staffId, at);
export const insertAckStatement = (db: D1Database, noticeId: string, staffId: string, at: string) => db.prepare(INSERT_ACK).bind(noticeId, staffId, at);
```
(Nếu `ON CONFLICT … DO UPDATE` bị bài R-N1-9 hiểu nhầm là `OR REPLACE` — không phải — giữ nguyên; nếu bài EXPLAIN của architecture từ chối subquery tương quan, tách `tags`/`da_hieu_luc` thành hai câu riêng.)

- [ ] **Step 4: Route đọc** — `src/modules/thongbao/index.ts` (phần đọc; phần gửi thêm ở Task 6):

```ts
// Module thongbao (ADR-0034): hộp thông báo + tin thủ công. Không module nào import module này. Luật lọc ở src/shared/thong-bao.ts (một hàm).
import { auditStatement } from "../audit";
import { getStaffAccount } from "../staff";
import type { HopThongBaoResponse, TomTatThongBaoResponse } from "../../shared/contracts";
import { UUID_RE, error, json } from "../../shared/http";
import { NGAY_GIU_TIN, locHopThongBao, nhanThayTinThuCong } from "../../shared/thong-bao";
import { route, type AppModule } from "../../shared/router";
import type { StaffProfile } from "../../shared/contracts";
import { getMark, insertAckStatement, listDon, listThuCong, upsertMarkStatement } from "./repository";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy thông báo.");

async function hop(db: D1Database, staff: StaffProfile, ngan: "cua-toi" | "tat-ca"): Promise<HopThongBaoResponse> {
  const now = new Date().toISOString();
  const tu = new Date(Date.now() - NGAY_GIU_TIN * 86400000).toISOString();
  const [don, thuCong, mark] = await Promise.all([listDon(db, tu), listThuCong(db, tu, staff.id), getMark(db, staff.id)]);
  // Chưa từng mở hộp: mốc = ngày tạo tài khoản (không đổ dồn tin cũ lên người mới — đặc tả §4.4).
  const docDenLuc = mark ?? (await getStaffAccount(db, staff.id))?.createdAt ?? now;
  return locHopThongBao(staff, { don, thuCong, docDenLuc, now, ngan });
}

export const thongbaoModule: AppModule = {
  name: "thongbao",
  routes: [
    route("GET", "/api/thong-bao/tom-tat", "staff", async ({ env, staff }) => {
      const h = await hop(env.DB, staff, "cua-toi");
      const quanTrongChuaHieu = h.tin.filter((t) => t.loai === "thu_cong" && t.quanTrong && t.daHieuLuc === null)
        .map((t) => ({ id: t.id, tieuDe: t.cau, nguoiGui: t.nguoiGui ?? "", luc: t.luc }));
      return json({ soChuaDoc: h.soChuaDoc, quanTrongChuaHieu } satisfies TomTatThongBaoResponse);
    }),
    route("POST", "/api/account/thong-bao/da-doc", "staff", async ({ env, staff }) => {
      await upsertMarkStatement(env.DB, staff.id, new Date().toISOString()).run();
      return json({ ok: true });
    }),
    route("GET", "/api/thong-bao", "staff", async ({ env, staff, url }) => {
      const ngan = url.searchParams.get("ngan") === "cua-toi" ? "cua-toi" : "tat-ca";
      return json(await hop(env.DB, staff, ngan) satisfies HopThongBaoResponse);
    }),
    route("POST", "/api/account/thong-bao/:id/da-hieu", "staff", async ({ env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const tu = new Date(Date.now() - NGAY_GIU_TIN * 86400000).toISOString();
      const t = (await listThuCong(env.DB, tu, staff.id)).find((x) => x.id === id);
      if (!t || t.thuHoi || !t.quanTrong || !nhanThayTinThuCong(staff, t.nhan)) return NOT_FOUND();
      const at = new Date().toISOString();
      await env.DB.batch([
        insertAckStatement(env.DB, id, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "notice_acknowledged", at, targetType: "notice", targetId: id }, "changes() > 0"),
      ]);
      return json({ ok: true, luc: t.daHieuLuc ?? at });
    }),
  ],
};
```
Lưu ý: route tĩnh (`/tom-tat`, `/da-doc`) khai TRƯỚC route có `:id`. `targetType: "notice"` hợp lệ vì `AuditTargetType = AuditGroup` và Task 3 đã thêm nhóm `notice`.

- [ ] **Step 5: Đăng ký**
  - `src/index.ts`: `import { thongbaoModule } from "./modules/thongbao";` và thêm `thongbaoModule` vào mảng `modules` (sau `feedbackModule`).
  - `src/architecture.test.ts`: `ALLOWED_EDGES` thêm `thongbao: ["audit", "orders", "dispatch", "staff"], // ADR-0034: đọc view công bố (sự kiện đơn, người lập, người phụ trách, nhãn) + auditStatement + getStaffAccount; không module nào import thongbao`; `STRICT` thêm `{ module: "thongbao", file: "modules/thongbao/repository.ts" }`.
  - `src/route-access.test.ts`: `MODULES` thêm `{ entry: "./modules/thongbao/index.ts", exportName: "thongbaoModule" }`; `SNAPSHOT` thêm 4 dòng `{ method: "GET", path: "/api/thong-bao", access: "staff" }`, `{ method: "POST", path: "/api/account/thong-bao/:id/da-hieu", access: "staff" }`, `{ method: "POST", path: "/api/account/thong-bao/da-doc", access: "staff" }`, `{ method: "GET", path: "/api/thong-bao/tom-tat", access: "staff" }` (đúng thứ tự sắp theo path rồi method); đổi hai số `73` → `77`, sửa chữ "12 module" → "13 module" ở chú thích/tên test.
  - `docs/quyen-hoan.json` → `cua_ghi`: thêm hai mục "ngoại lệ" đúng khuôn các route `/api/account/*` sẵn có:
    ```json
    { "method": "POST", "path": "/api/account/thong-bao/da-doc", "loai": "ngoại lệ", "ly_do": "Tự phục vụ: đặt mốc đã đọc hộp thông báo của chính mình (ADR-0034 điều 6); id lấy từ phiên." },
    { "method": "POST", "path": "/api/account/thong-bao/:id/da-hieu", "loai": "ngoại lệ", "ly_do": "Tự phục vụ: xác nhận chính mình đã hiểu tin quan trọng gửi tới mình (ADR-0034 điều 8); thân kiểm người gọi thuộc nhóm nhận." }
    ```
    Không thêm `can()` giả vào hai route này. `npm test` phải xanh ở `route-write-guard.test.ts` (luật (1), (2)).

- [ ] **Step 6: Chạy, thấy xanh** — `npm test` → xanh; `npm run typecheck` → 0 lỗi; `npm run test:e2e -- thongbao` → xanh.

- [ ] **Step 7: Commit**

```bash
git add src/modules/thongbao src/index.ts src/architecture.test.ts src/route-access.test.ts tests/e2e/thongbao.mjs tests/e2e/run.mjs docs/quyen-hoan.json
git commit -m "Thông báo: module thongbao — đọc hộp, tóm tắt, đã đọc, đã hiểu (ADR-0034)

Vì sao: hộp là hình chiếu của nhật ký qua view công bố; mốc đọc mặc định là ngày
tạo tài khoản để người mới không bị đổ dồn tin cũ; e2e khoá K1 (không tên trong
JSON) và số chưa đọc = danh sách."
```

---

### Task 6: Gửi, thu hồi, xem đã gửi, xem ai đã hiểu (Toàn quyền)

**Files:**
- Modify: `src/modules/thongbao/repository.ts`, `src/modules/thongbao/index.ts`, `src/route-access.test.ts`, `src/route-write-guard.test.ts` (`ADMIN_OPS`), `docs/quyen-hoan.json` (gỡ mục hoãn `notice.send`), `docs/SO-HANG-RAO.md`, `tests/e2e/thongbao.mjs`

**Interfaces:**
- Consumes: `kiemTinThuCong`, `nhanNguoiNhan`, `nhanThayTinThuCong` (Task 2); `listStaffAccounts` (staff: `StaffAccount[]` có `active`, `permissions`, `fullName`); `PERMISSION_LABEL` (permissions.ts).
- Produces: `POST /api/thong-bao` (201 `{ id }`; gửi lại cùng `clientRequestId` → 200 cùng `id`), `GET /api/thong-bao/da-gui` → `DaGuiResponse`, `GET /api/thong-bao/:id/nguoi-da-hieu` → `NguoiDaHieuResponse`, `POST /api/thong-bao/:id/thu-hoi` (200; lần hai 409 `"Tin đã được thu hồi."`).

- [ ] **Step 1: Viết test e2e đỏ** — nối vào cuối `tests/e2e/thongbao.mjs` (trước dòng `console.log("THONGBAO … OK")`, đổi dòng đó thành `THONGBAO OK`):

```js
const ADMIN = await session(ACCOUNTS.admin);
// Tài khoản CHỈ Đối tác: tạo bằng Quản trị rồi đổi vai sang Cộng tác viên (cùng cách tests/e2e/roles.mjs:48-51).
const dtPhone = randomPhone();
let rr = await call(ADMIN, "POST", "/api/staff", { fullName: `Đối Tác ${Date.now().toString(36)}`, phone: dtPhone, permissions: ["SALES"] });
assert.equal(rr.status, 201, JSON.stringify(rr.body));
const dtPin = rr.body.pin;
rr = await call(ADMIN, "PUT", `/api/staff/${rr.body.staff.id}/roles`, { roles: ["COLLABORATOR"] });
assert.deepEqual(rr.body.staff.permissions, ["PARTNER"]);
const DT = (await login(dtPhone, dtPin)).cookie;
const than = (o = {}) => ({ tieuDe: "Đổi cổng đón Cầu Đá", noiDung: "Từ 01/10 đón ở cổng số 2.\nĐến sớm 15 phút.", nguoiNhan: "noi-bo", quanTrong: true, clientRequestId: randomUUID(), ...o });
assert.equal((await call(ADMIN, "POST", "/api/thong-bao", than())).status, 403, "Quản trị không gửi được (chỉ Toàn quyền)");
assert.equal((await call(TQ, "POST", "/api/thong-bao", than(), undefined)).status, 201);
const b = than({ tieuDe: "Tin chống trùng" });
const r1 = await call(TQ, "POST", "/api/thong-bao", b), r2 = await call(TQ, "POST", "/api/thong-bao", b);
assert.equal(r1.body.id, r2.body.id, "gửi lại cùng clientRequestId → cùng tin");
assert.equal((await call(TQ, "POST", "/api/thong-bao", than({ tieuDe: "" }))).status, 400);
console.log("✓ gửi: chỉ Toàn quyền, chống trùng, kiểm đầu vào");

const tt = (await call(A, "GET", "/api/thong-bao/tom-tat")).body;
const qt = tt.quanTrongChuaHieu.find((x) => x.tieuDe === "Đổi cổng đón Cầu Đá");
assert.ok(qt, "Bán hàng thấy tin quan trọng ở dải");
assert.equal((await call(A, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`)).status, 200);
assert.ok(!(await call(A, "GET", "/api/thong-bao/tom-tat")).body.quanTrongChuaHieu.some((x) => x.id === qt.id), "bấm Đã hiểu → dải tắt");
const ai = (await call(TQ, "GET", `/api/thong-bao/${qt.id}/nguoi-da-hieu`)).body;
assert.ok(ai.daHieu.some((x) => x.ten === ACCOUNTS.salesA.name));
assert.equal((await call(ADMIN, "GET", `/api/thong-bao/${qt.id}/nguoi-da-hieu`)).status, 403);
const log = await sql(`SELECT detail FROM audit_log WHERE action LIKE 'notice_%'`);
assert.ok(!JSON.stringify(log).includes("cổng số 2"), "nhật ký không chép nội dung tin");
console.log("✓ đã hiểu, ai đã hiểu, nhật ký không chứa nội dung");

// K3: Đối tác thuần không nhận "Toàn công ty"
assert.ok(!(await call(DT, "GET", "/api/thong-bao?ngan=cua-toi")).body.tin.some((x) => x.id === qt.id));
console.log("✓ K3: Đối tác không nhận tin Toàn công ty");

assert.equal((await call(TQ, "POST", `/api/thong-bao/${qt.id}/thu-hoi`)).status, 200);
assert.equal((await call(TQ, "POST", `/api/thong-bao/${qt.id}/thu-hoi`)).status, 409);
assert.ok(!(await call(B, "GET", "/api/thong-bao?ngan=cua-toi")).body.tin.some((x) => x.id === qt.id), "thu hồi → biến khỏi hộp");
const s = (await call(TQ, "GET", "/api/thong-bao/da-gui")).body.tin.find((x) => x.id === qt.id);
assert.ok(s.thuHoiLuc);
console.log("✓ thu hồi");
```

- [ ] **Step 2: Chạy, thấy đỏ** — `npm run test:e2e -- thongbao` → FAIL 404/405 ở `POST /api/thong-bao`.

- [ ] **Step 3: SQL** — thêm vào `repository.ts`:

```ts
const FIND_BY_REQUEST = defineSql("thongbao", "find_by_request", `SELECT id FROM ntf_notice WHERE created_by = ?1 AND client_request_id = ?2`);
const INSERT_NOTICE = defineSql("thongbao", "insert_notice", `
  INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7)`);
const INSERT_TARGET = defineSql("thongbao", "insert_target", `
  INSERT INTO ntf_notice_target (notice_id, tag, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?3, ?4)`);
const REVOKE = defineSql("thongbao", "revoke", `UPDATE ntf_notice SET valid_to = ?2, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND valid_to IS NULL`);
const LIST_SENT = defineSql("thongbao", "list_sent", `
  SELECT n.id, n.tieu_de, n.quan_trong, n.created_at, n.valid_to,
         (SELECT group_concat(t.tag, ' ') FROM ntf_notice_target t WHERE t.notice_id = n.id) AS tags
  FROM ntf_notice n ORDER BY n.created_at DESC LIMIT 100`);
const LIST_ACKS = defineSql("thongbao", "list_acks", `SELECT staff_id, created_at FROM ntf_ack WHERE notice_id = ?1`);
const GET_NOTICE = defineSql("thongbao", "get_notice", `
  SELECT n.id, n.valid_to, (SELECT group_concat(t.tag, ' ') FROM ntf_notice_target t WHERE t.notice_id = n.id) AS tags FROM ntf_notice n WHERE n.id = ?1`);

export const findByRequest = async (db: D1Database, staffId: string, req: string) => (await db.prepare(FIND_BY_REQUEST).bind(staffId, req).first<{ id: string }>())?.id ?? null;
export const insertNoticeStatement = (db: D1Database, a: { id: string; tieuDe: string; noiDung: string; quanTrong: boolean; req: string; at: string; by: string }) =>
  db.prepare(INSERT_NOTICE).bind(a.id, a.tieuDe, a.noiDung, a.quanTrong ? 1 : 0, a.req, a.at, a.by);
export const insertTargetStatement = (db: D1Database, noticeId: string, tag: string, at: string, by: string) => db.prepare(INSERT_TARGET).bind(noticeId, tag, at, by);
export const revokeStatement = (db: D1Database, id: string, at: string, by: string) => db.prepare(REVOKE).bind(id, at, by);
export async function listSent(db: D1Database) {
  return (await db.prepare(LIST_SENT).all<{ id: string; tieu_de: string; quan_trong: number; created_at: string; valid_to: string | null; tags: string | null }>()).results;
}
export async function listAcks(db: D1Database, id: string) {
  return (await db.prepare(LIST_ACKS).bind(id).all<{ staff_id: string; created_at: string }>()).results;
}
export const getNotice = (db: D1Database, id: string) => db.prepare(GET_NOTICE).bind(id).first<{ id: string; valid_to: string | null; tags: string | null }>();
```

- [ ] **Step 4: Route** — thêm vào `thongbaoModule.routes` (import thêm `can`, `PERMISSION_LABEL` từ `../../shared/permissions`, `listStaffAccounts` từ `../staff`, `readJson` từ `../../shared/http`, `kiemTinThuCong`, `nhanNguoiNhan` từ `../../shared/thong-bao`, và các DTO). Route tĩnh `da-gui` khai trước `:id`:

```ts
const FORBIDDEN = () => error(403, "forbidden", "Chỉ Toàn quyền được gửi và quản lý thông báo.");
const nguoiNhanTu = (tags: string): NguoiNhanTin => (tags.split(" ").includes("noi-bo") ? "noi-bo" : tags.split(" ").filter(Boolean).map((t) => t.slice(6) as PermissionCode));
async function nguoiNhanCua(db: D1Database, tags: string[]) {
  return (await listStaffAccounts(db)).filter((s) => s.active && nhanThayTinThuCong(s, tags));
}

route("POST", "/api/thong-bao", "admin", async ({ env, staff, request }) => {
  if (!can(staff, "notice.send")) return FORBIDDEN();
  const v = kiemTinThuCong(await readJson(request));
  if (!v.ok) return error(400, "invalid_input", v.message);
  const cu = await findByRequest(env.DB, staff.id, v.value.clientRequestId);
  if (cu) return json({ id: cu }, 200);
  const id = crypto.randomUUID(), at = new Date().toISOString();
  const tags = nhanNguoiNhan(v.value.nguoiNhan);
  await env.DB.batch([
    insertNoticeStatement(env.DB, { id, tieuDe: v.value.tieuDe, noiDung: v.value.noiDung, quanTrong: v.value.quanTrong, req: v.value.clientRequestId, at, by: staff.id }),
    ...tags.map((t) => insertTargetStatement(env.DB, id, t, at, staff.id)),
    auditStatement(env.DB, { staffId: staff.id, action: "notice_sent", at, targetType: "notice", targetId: id, detail: `${tags.length} nhóm nhận` }),
  ]);
  return json({ id }, 201);
}),
route("GET", "/api/thong-bao/da-gui", "admin", async ({ env, staff }) => {
  if (!can(staff, "notice.send")) return FORBIDDEN();
  const rows = await listSent(env.DB);
  const tin: TinDaGuiDto[] = await Promise.all(rows.map(async (r) => {
    const tags = (r.tags ?? "").split(" ").filter(Boolean);
    const nhan = await nguoiNhanCua(env.DB, tags);
    const acks = r.quan_trong ? await listAcks(env.DB, r.id) : [];
    return { id: r.id, tieuDe: r.tieu_de, nguoiNhan: nguoiNhanTu(r.tags ?? ""), quanTrong: r.quan_trong === 1, luc: r.created_at, thuHoiLuc: r.valid_to,
      soNguoiNhan: nhan.filter((s) => s.id !== staff.id).length, soDaHieu: acks.filter((a) => nhan.some((s) => s.id === a.staff_id)).length };
  }));
  return json({ tin } satisfies DaGuiResponse);
}),
route("GET", "/api/thong-bao/:id/nguoi-da-hieu", "admin", async ({ env, staff, params }) => {
  if (!can(staff, "notice.send")) return FORBIDDEN();
  if (!UUID_RE.test(params.id!)) return NOT_FOUND();
  const n = await getNotice(env.DB, params.id!);
  if (!n) return NOT_FOUND();
  const nhan = (await nguoiNhanCua(env.DB, (n.tags ?? "").split(" ").filter(Boolean))).filter((s) => s.id !== staff.id);
  const acks = new Map((await listAcks(env.DB, n.id)).map((a) => [a.staff_id, a.created_at]));
  const quyen = (s: { permissions: readonly PermissionCode[] }) => s.permissions.map((p) => PERMISSION_LABEL[p]).join(", ");
  return json({
    daHieu: nhan.filter((s) => acks.has(s.id)).map((s) => ({ ten: s.fullName, quyen: quyen(s), luc: acks.get(s.id)! })),
    chuaHieu: nhan.filter((s) => !acks.has(s.id)).map((s) => ({ ten: s.fullName, quyen: quyen(s) })),
  } satisfies NguoiDaHieuResponse);
}),
route("POST", "/api/thong-bao/:id/thu-hoi", "admin", async ({ env, staff, params }) => {
  if (!can(staff, "notice.send")) return FORBIDDEN();
  if (!UUID_RE.test(params.id!)) return NOT_FOUND();
  const at = new Date().toISOString();
  const res = await env.DB.batch([
    revokeStatement(env.DB, params.id!, at, staff.id),
    auditStatement(env.DB, { staffId: staff.id, action: "notice_revoked", at, targetType: "notice", targetId: params.id! }, "changes() > 0"),
  ]);
  if ((res[0]?.meta.changes ?? 0) === 0) return (await getNotice(env.DB, params.id!)) ? error(409, "conflict", "Tin đã được thu hồi.") : NOT_FOUND();
  return json({ ok: true });
}),
```
(Tên cổng: tài khoản chỉ có `SUPER_ADMIN` qua cổng `admin` vì `ADMIN_GATE = ["ADMIN","SUPER_ADMIN"]`.)

- [ ] **Step 5: Hàng rào và sổ**
  - `src/route-write-guard.test.ts`: thêm `"notice.send"` vào `ADMIN_OPS`.
  - `src/route-access.test.ts`: thêm 4 dòng (`GET /api/thong-bao/da-gui` admin, `GET /api/thong-bao/:id/nguoi-da-hieu` admin, `POST /api/thong-bao` admin, `POST /api/thong-bao/:id/thu-hoi` admin); số `77` → `81`.
  - `docs/quyen-hoan.json`: **gỡ** mục hoãn `notice.send` (Task 3) — nay route gọi `can(staff, "notice.send")`.
  - **Quan sát chặn thật (P16):** tạm sửa `"notice.send"` của ADMIN trong `MATRIX` thành `"any"` → chạy `npm test` (đỏ ở `permissions.test.ts`) và `npm run test:e2e -- thongbao` (đỏ `201 !== 403`) → chép hai dòng đỏ kèm ngày → hoàn nguyên → xanh. Thêm dòng vào `docs/SO-HANG-RAO.md`:

```
| `can(staff, "notice.send")` ở `POST /api/thong-bao`, `GET /api/thong-bao/da-gui`, `GET /api/thong-bao/:id/nguoi-da-hieu`, `POST /api/thong-bao/:id/thu-hoi` (ADR-0034; e2e `tests/e2e/thongbao.mjs`) | Quản trị (không Toàn quyền) gửi/thu hồi thông báo, xem ai đã hiểu | Lời hỏi `can` đầu thân route + ô MATRIX khoá ở `permissions.test.ts` + `ADMIN_OPS` ở `route-write-guard.test.ts` | **<ngày>**: đột biến ô ADMIN = any → đỏ `<chép thông báo>` | Không canh tin về đơn (hình chiếu nhật ký, không có đường ghi riêng). |
```

- [ ] **Step 6: Chạy, thấy xanh** — `npm test`, `npm run typecheck`, `npm run test:e2e -- thongbao` → xanh.

- [ ] **Step 7: Commit**

```bash
git add src/modules/thongbao src/route-access.test.ts src/route-write-guard.test.ts docs/quyen-hoan.json docs/SO-HANG-RAO.md tests/e2e/thongbao.mjs
git commit -m "Thông báo: Toàn quyền gửi, thu hồi, xem đã gửi và ai đã hiểu (ADR-0034 điều 5–9)

Vì sao: chỉ notice.send (Toàn quyền) — đã quan sát hàng rào chặn thật; gửi lại
cùng mã yêu cầu trả cùng tin; nhật ký chỉ mã tin, không nội dung; 'Toàn công ty'
không tới tài khoản chỉ-Đối-tác (K3)."
```

---

### Task 7: Giao diện — chuông, ngăn thông báo, dải tin quan trọng (đúng bản mẫu)

**Files:**
- Create: `web/thong-bao-logic.ts`, `web/thong-bao-ui.ts`, `src/thong-bao-web.test.ts`
- Modify: `web/icons.ts` (icon `bell`, `megaphone`), `web/shell.ts` (gắn chuông + dải, nghe Bảng tin), `public/app.css` (khối cuối tệp)

**Interfaces:**
- Consumes: `api`, `ApiError` (web/api.ts); `TomTatThongBaoResponse`, `HopThongBaoResponse`, `TinDto` (contracts); sự kiện `window` `"don-thay-doi"`, `"can-tai-lai"` (web/bangtin.ts); `taoBoLamMoi` (web/lam-moi-logic.ts); `h`, `append`, `replaceChildren` (web/dom.ts).
- Produces: `web/thong-bao-logic.ts`: `export function nhanSo(n: number): string` ("" | "1".."9" | "9+"); `export function nhomTheoNgay(tin: TinDto[], homNay: string): { nhan: string; tin: TinDto[] }[]` (nhãn "Hôm nay" / "Hôm qua" / "dd/mm", theo giờ Việt Nam); `export function thoiGian(luc: string, now: string): string` ("x phút trước" <60′; "HH:mm" hôm nay; "Hôm qua HH:mm"; "dd/mm HH:mm"). `web/thong-bao-ui.ts`: `export function ganThongBao(topbar: HTMLElement, staff: StaffProfile): void`.

- [ ] **Step 1: Viết test đỏ** — `src/thong-bao-web.test.ts`:

```ts
// Logic hiển thị của chuông/hộp thông báo (web/thong-bao-logic.ts) — giờ Việt Nam, nhãn số "9+".
import { test } from "node:test";
import assert from "node:assert/strict";
import { nhanSo, nhomTheoNgay, thoiGian } from "../web/thong-bao-logic.ts";

test("nhanSo", () => { assert.equal(nhanSo(0), ""); assert.equal(nhanSo(3), "3"); assert.equal(nhanSo(9), "9"); assert.equal(nhanSo(10), "9+"); });
test("thoiGian theo giờ Việt Nam", () => {
  const now = "2026-09-27T02:40:00.000Z"; // 09:40 VN
  assert.equal(thoiGian("2026-09-27T02:35:00.000Z", now), "5 phút trước");
  assert.equal(thoiGian("2026-09-27T01:30:00.000Z", now), "08:30");
  assert.equal(thoiGian("2026-09-26T09:20:00.000Z", now), "Hôm qua 16:20");
  assert.equal(thoiGian("2026-09-24T03:00:00.000Z", now), "24/09 10:00");
  assert.equal(thoiGian("2026-09-26T17:30:00.000Z", now), "00:30"); // 00:30 VN ngày 27 = hôm nay
});
test("nhomTheoNgay giữ thứ tự, nhãn Hôm nay/Hôm qua/dd-mm", () => {
  const t = (luc: string) => ({ luc }) as never;
  const g = nhomTheoNgay([t("2026-09-27T01:00:00.000Z"), t("2026-09-26T09:00:00.000Z"), t("2026-09-24T09:00:00.000Z")], "2026-09-27T02:40:00.000Z");
  assert.deepEqual(g.map((x) => [x.nhan, x.tin.length]), [["Hôm nay", 1], ["Hôm qua", 1], ["24/09", 1]]);
});
```

- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/thong-bao-web.test.ts` → FAIL (không có module).

- [ ] **Step 3: Logic** — `web/thong-bao-logic.ts` (import `src/shared` kèm `.ts`, xem `web/lam-moi-logic.ts:1-3`):

```ts
// Logic hiển thị THUẦN của chuông/hộp thông báo (ADR-0034) — tách khỏi DOM để test bằng node --test.
import type { TinDto } from "../src/shared/contracts.ts";

const VN = 7 * 3600000;
const ngayVN = (iso: string) => new Date(Date.parse(iso) + VN).toISOString().slice(0, 10);
const gioVN = (iso: string) => new Date(Date.parse(iso) + VN).toISOString().slice(11, 16);
const ddmm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const homQua = (ymd: string) => new Date(Date.parse(ymd + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);

export const nhanSo = (n: number): string => (n <= 0 ? "" : n > 9 ? "9+" : String(n));
export function thoiGian(luc: string, now: string): string {
  const phut = Math.floor((Date.parse(now) - Date.parse(luc)) / 60000);
  if (phut >= 0 && phut < 60) return `${Math.max(phut, 1)} phút trước`;
  const d = ngayVN(luc), hn = ngayVN(now);
  if (d === hn) return gioVN(luc);
  if (d === homQua(hn)) return `Hôm qua ${gioVN(luc)}`;
  return `${ddmm(d)} ${gioVN(luc)}`;
}
export function nhomTheoNgay(tin: TinDto[], now: string): { nhan: string; tin: TinDto[] }[] {
  const hn = ngayVN(now), out: { nhan: string; tin: TinDto[] }[] = [];
  for (const t of tin) {
    const d = ngayVN(t.luc);
    const nhan = d === hn ? "Hôm nay" : d === homQua(hn) ? "Hôm qua" : ddmm(d);
    const cuoi = out[out.length - 1];
    if (cuoi?.nhan === nhan) cuoi.tin.push(t); else out.push({ nhan, tin: [t] });
  }
  return out;
}
```

- [ ] **Step 4: Chạy, thấy xanh** — `node --test src/thong-bao-web.test.ts` → PASS.

- [ ] **Step 5: Icon** — `web/icons.ts`, thêm vào `SHAPES` (nét 1.8, lưới 24):

```ts
  bell: [
    ["path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }],
    ["path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" }],
  ],
  megaphone: [
    ["path", { d: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" }],
    ["path", { d: "M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" }],
  ],
```
Và biểu tượng loại tin (dùng khoá có sẵn nếu trùng nghĩa; thêm nếu thiếu): `userPlus` (chờ nhận), `checkCircle` (nhận/xác nhận), `swap` (giao), `filePlus` (lập), `ban` (huỷ) — nét theo đúng path trong bản mẫu `docs/design/thong-bao-mockup/ban-mau-thong-bao.html` (biến `ICON`).

- [ ] **Step 6: UI** — `web/thong-bao-ui.ts`. Dựng đúng các khối của bản mẫu: nút chuông `.bell` (aria-label "Thông báo, N tin chưa đọc", aria-expanded), huy hiệu `.bell-count`; ngăn `.ntf-panel` (máy tính: bảng thả xuống dưới chuông, rộng `--w-ntf-panel`; điện thoại ≤640px: toàn màn hình, đầu ngăn nền `--c-primary` có nút Quay lại); hai tab `role="tab"` "Của tôi" (kèm số) / "Tất cả (n)"; câu gợi ý dưới tab (chữ đúng bản mẫu); danh sách nhóm theo ngày (`nhomTheoNgay`); mỗi tin: vòng biểu tượng theo loại (màu: chờ nhận = cát, nhận/xác nhận = xanh lá, huỷ = nguy hiểm, tin công ty = primary, quan trọng = cát đậm), câu (`t.cau` — là chuỗi, không HTML), dòng phụ (`chip` "Quan trọng · chưa bấm Đã hiểu" / "Đã hiểu" / "Đã có người nhận" + thời gian), tin `chuaDoc` tô nền `--c-ntf-unread` + chấm; tin `mo` giảm độ đậm. Chân ngăn: "Giữ tin trong 30 ngày. Tin quan trọng chưa bấm “Đã hiểu” được giữ tới khi bấm." Bấm tin về đơn → `location.href = t.lienKet`. Bấm tin thủ công → hộp đọc (`.ntf-dialog`, trên điện thoại là bảng trượt từ đáy — dùng khuôn `.sheet-root/.sheet` có sẵn): chip "Tin quan trọng", tiêu đề, dòng "Vũ (Toàn quyền) gửi hôm nay lúc 08:30 · Toàn công ty", thân `white-space: pre-line`, nút "Để sau" + "Đã hiểu" (quan trọng chưa hiểu) hoặc "Đóng". Dải `.ntf-strip` chèn ngay sau `#topbar` (cạnh `.maint-strip`): biểu tượng loa, "Tin quan trọng: <tiêu đề>", dòng phụ "<người gửi> gửi lúc HH:mm · còn N tin quan trọng khác", nút "Đọc và bấm Đã hiểu".

Luồng dữ liệu:

```ts
export function ganThongBao(topbar: HTMLElement, staff: StaffProfile): void {
  const bell = h("button", { type: "button", class: "bell", "aria-expanded": "false", "aria-label": "Thông báo" }, icon("bell", 22));
  const count = h("span", { class: "bell-count", hidden: true });
  bell.append(count);
  // Chèn TRƯỚC avatar/ô tìm kiếm/nút Tạo đơn (xem Step 7 về margin-left:auto).
  topbar.querySelector(".topbar-search, .bar-avatar, .topbar-new")?.before(bell) ?? topbar.append(bell);
  const taiTomTat = async () => {
    try {
      const t = await api<TomTatThongBaoResponse>("/api/thong-bao/tom-tat");
      count.textContent = nhanSo(t.soChuaDoc); count.hidden = t.soChuaDoc === 0;
      bell.setAttribute("aria-label", t.soChuaDoc ? `Thông báo, ${t.soChuaDoc} tin chưa đọc` : "Thông báo");
      veDai(t.quanTrongChuaHieu);
    } catch { /* mất mạng: giữ nguyên số cũ; không chặn trang */ }
  };
  const lamMoi = taoBoLamMoi(taiTomTat);
  window.addEventListener("don-thay-doi", () => void lamMoi.yeuCau());
  window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
  bell.addEventListener("click", () => void moNgan());   // moNgan: GET ?ngan=… rồi POST /da-doc, vẽ, đặt số về 0
  void taiTomTat();
}
```
Mở ngăn: gọi `GET /api/thong-bao?ngan=cua-toi` (và khi bấm tab "Tất cả" gọi `?ngan=tat-ca`), vẽ, **rồi** `POST /api/account/thong-bao/da-doc` và đặt số về 0 (tin `chuaDoc` vẫn tô nền trong lần mở này — E2). "Đã hiểu": `POST /api/account/thong-bao/:id/da-hieu` → hiện `hienThongBao({ cau: "Đã ghi nhận: bạn đã hiểu tin này", lienKet: … })` hoặc chữ tĩnh trong hộp, rồi `taiTomTat()`. Lỗi → câu tiếng Việt từ `ApiError.message`. Esc/bấm ra ngoài đóng ngăn; trả focus về chuông.

- [ ] **Step 7: Gắn vào khung** — `web/shell.ts`, sau dòng `append(byId("topbar"), [avatarEl, search, newOrderBtn]);` và trước `addNav(...)`: `ganThongBao(byId("topbar"), staff);`. Nhánh mất mạng (không có `staff`) không gắn chuông. CSS: chuông mang `margin-left: auto` ở khổ điện thoại (bỏ `margin-left:auto` của `.bar-avatar` khi có chuông: `.bell + .bar-avatar { margin-left: 0 }`), ở máy tính đứng giữa ô tìm kiếm và nút Tạo đơn (`.topbar-search` giữ `margin-left:auto`). Lưới máy tính `body.has-sidebar` hiện có `grid-template-rows: auto auto 1fr` với hàng 2 cho `.maint-strip`: bọc **cả hai dải** vào một phần tử `#strips` ở hàng 2 (sửa `setMaintenanceStrip` để chèn vào `#strips`), hoặc thêm hàng — chọn bọc `#strips` và sửa quy tắc `body.has-sidebar .maint-strip` thành `body.has-sidebar #strips`.

- [ ] **Step 8: CSS** — cuối `public/app.css`, khối mới `/* ---------- Thông báo (ADR-0034) — chỉ token ---------- */`. Token mới ở `:root` (nhóm "Riêng của Island Booking System"): `--w-ntf-panel: 420px;`, `--h-ntf-panel: 560px;`, `--ntf-badge: 18px;`, `--ntf-icon: 36px;`, `--c-ntf-unread: #f4f9fd;`, `--z-ntf: 45;` (trên toast 40, dưới bảng trượt 50). Màu/khoảng cách lấy đúng giá trị của bản mẫu (đã dùng token của app). Chạy `npm run test:e2e -- pwa` để bộ quét xác nhận không có hex/px sau mốc.

- [ ] **Step 9: Kiểm** — `npm test`, `npm run build:web`, `npm run typecheck` (0 lỗi), `npm run test:e2e -- pwa thongbao` → xanh.

- [ ] **Step 10: Commit**

```bash
git add web/thong-bao-logic.ts web/thong-bao-ui.ts src/thong-bao-web.test.ts web/icons.ts web/shell.ts public/app.css
git commit -m "Thông báo: chuông, ngăn hai ngăn, dải tin quan trọng theo bản mẫu đã duyệt (ADR-0034)

Vì sao: số đỏ và danh sách lấy từ máy chủ (một hàm lọc); làm mới khi Bảng tin báo
có thay đổi, không mở kết nối mới; dựng bằng h(), nội dung tin là chữ thường."
```

---

### Task 8: Trang "Gửi thông báo" cho Toàn quyền (đúng bản mẫu)

**Files:**
- Create: `public/gui-thong-bao.html`, `web/gui-thong-bao.ts`
- Modify: `web/shell.ts` (`navGroups`: mục "Gửi thông báo" khi có `SUPER_ADMIN`; `barTitleFor` truyền `true` cho cờ mới), `web/account.ts` (dòng liên kết trên điện thoại, chỉ `SUPER_ADMIN`), `src/shared/sw-policy.ts` (`PAGES` thêm `"/gui-thong-bao"`), `package.json` (`build:web` thêm `web/gui-thong-bao.ts`), `public/app.css`

**Interfaces:**
- Consumes: route Task 6; `GuiThongBaoRequest`, `DaGuiResponse`, `NguoiDaHieuResponse`, `PERMISSION_LABEL`, `PERMISSION_CODES`.

- [ ] **Step 1: Test đỏ** — `node --test src/shared/sw-policy.test.ts` sau khi tạo `public/gui-thong-bao.html` mà chưa thêm vào `PAGES` → FAIL (deepEqual danh sách trang). (Đây là hàng rào có sẵn; hành vi trang kiểm ở Task 9 bằng Chrome.)

- [ ] **Step 2: HTML** — `public/gui-thong-bao.html`: chép nguyên `<head>` của `public/help.html`, đổi `<title>Gửi thông báo — Island Booking System</title>`; `<body data-title="Gửi thông báo" data-back="/account">`; `<header id="topbar"></header><main><h1>Gửi thông báo</h1><p class="muted">Chỉ Toàn quyền thấy mục này</p><div id="error" class="alert" role="alert" hidden></div><div class="ntf-send"><form id="form" class="card" novalidate></form><section class="card"><h2>Đã gửi</h2><div id="sent"></div></section></div></main><script type="module" src="/js/gui-thong-bao.js"></script>`.

- [ ] **Step 3: TS** — `web/gui-thong-bao.ts`: `const staff = await initShell(); if (!can(staff, "notice.send")) { showError(byId("error"), "Chỉ Toàn quyền dùng được trang này."); return; }`. Form dựng bằng `h()` đúng bản mẫu: ô "Tiêu đề" (đếm `n/120`, `maxlength=120`, placeholder "Ví dụ: Lịch nghỉ lễ 2/9"), ô "Nội dung" (đếm `n/2000`), nhóm "Gửi cho": radio "Toàn công ty" (phụ đề "Nhân viên nội bộ, không gồm Đối tác") / "Chọn nhóm" + các ô chọn dạng viên thuốc theo `PERMISSION_CODES` với `PERMISSION_LABEL` (mờ khi chưa chọn "Chọn nhóm"), ô "Tin quan trọng" nền cát kèm giải thích, nút "Gửi thông báo". Gửi: sinh `clientRequestId = crypto.randomUUID()` **một lần cho mỗi bản nháp** (giữ nguyên nếu bấm lại khi lỗi mạng), khoá nút khi đang gửi (mẫu `act()` ở `web/feedback.ts:24-36`); thành công → xoá form, đổi `clientRequestId`, vẽ lại "Đã gửi", báo "Đã gửi cho …". Lỗi 400 → hiện đúng câu máy chủ trả.
  "Đã gửi": mỗi tin: tiêu đề, chip "Quan trọng"/"Đã thu hồi", dòng "Toàn công ty (nội bộ) · <thời gian>", với tin quan trọng: "x/y người đã bấm Đã hiểu" + thanh tiến độ; nút "Xem ai đã hiểu" (mở hai cột Đã hiểu (tên · quyền · giờ) / Chưa hiểu) và "Thu hồi" → khung xác nhận ngay trên trang (nền `--c-danger-soft`): "Thu hồi tin này? Tin sẽ biến khỏi hộp thông báo và dải nhắc của mọi người. Không hoàn tác được." + "Thu hồi" / "Giữ lại" (không dùng `confirm()`).

- [ ] **Step 4: Điều hướng** — `web/shell.ts`: thêm tham số `superAdmin: boolean` vào `navGroups(...)`, truyền `hasPermission(staff, "SUPER_ADMIN")` qua `sidebar()`/`addNav`; trong `navGroups`, nếu `superAdmin` thì đảm bảo nhóm QUẢN TRỊ có mục `{ href: "/gui-thong-bao", label: "Gửi thông báo", icon: "megaphone", active: (p) => p === "/gui-thong-bao" }` (tài khoản chỉ `SUPER_ADMIN` không có `ADMIN` vẫn thấy nhóm với mục này — bẫy 2 của khảo sát); `barTitleFor` gọi `navGroups(true, true, true, true, true, path)`. Tab "Tôi" sáng cho `/gui-thong-bao`. `web/account.ts`: thêm `hasPermission(staff, "SUPER_ADMIN") && h("a", { class: "row-link", href: "/gui-thong-bao" }, "Gửi thông báo", icon("next", 20))` vào danh sách liên kết.

- [ ] **Step 5: Đăng ký trang** — `PAGES` thêm `"/gui-thong-bao"`; `package.json` `build:web` thêm `web/gui-thong-bao.ts` vào lệnh esbuild đầu.

- [ ] **Step 6: Kiểm** — `npm test` (sw-policy xanh), `npm run build:web`, `npm run typecheck`, `npm run test:e2e -- pwa` → xanh.

- [ ] **Step 7: Commit**

```bash
git add public/gui-thong-bao.html web/gui-thong-bao.ts web/shell.ts web/account.ts src/shared/sw-policy.ts package.json public/app.css
git commit -m "Thông báo: trang Gửi thông báo cho Toàn quyền theo bản mẫu (ADR-0034)

Vì sao: soạn tin, chọn Toàn công ty (nội bộ) hoặc nhóm, đánh dấu quan trọng, xem
ai đã hiểu, thu hồi có bước xác nhận ngay trên trang; chống gửi trùng khi bấm lại."
```

---

### Task 9: Tài liệu mô tả + kịch bản Chrome đối chiếu bản mẫu

**Files:**
- Create: `docs/evidence/2026-09-27-thong-bao/kich-ban/thong-bao-smoke.mjs`, `docs/evidence/2026-09-27-thong-bao/README.md`
- Modify: `docs/SYSTEM-DESIGN.md` (§5 bảng/view mới, §7 8 route, §8 ô `notice.send`, §9 trang `/gui-thong-bao` + chuông), `docs/CHANGE-GUIDE.md` (công thức mới "thêm loại tin về đơn vào hộp thông báo": thêm hành động vào `v_aud_order_event` bằng migration mới + `HANH_DONG_TIN_DON` + `loaiTinDon` + bảng `CAU` + test), `web/CLAUDE.md` bảng "sửa tệp nào → kịch bản nào" thêm `web/thong-bao-ui.ts`, `web/gui-thong-bao.ts` → `thong-bao-smoke.mjs` (đề xuất diff — CLAUDE.md §3 N9: nếu hook chặn sửa tệp luật, để diff cho chủ)

- [ ] **Step 1: Kịch bản Chrome** — theo mẫu `docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs` (import `ACCOUNTS, ok, startEnv` từ `../../2026-09-20-a2/kich-ban/a2-cdp.mjs`; thêm `ACCOUNTS.superAdmin = { name: "Toàn Quyền", phone: "0900000207", pin: "246813", permissions: ["SUPER_ADMIN"] }`). Khổ: 390×844, 320×568, 768×1024, 1040×800, 1440×900. Các bước (mỗi bước chụp ảnh vào `../anh/`):
  a) Toàn quyền mở `/gui-thong-bao` ở 1040: form + "Đã gửi" hai cột; gửi tin quan trọng "Toàn công ty"; ở 390: một cột.
  b) Bán hàng (mở SAU CÙNG theo bẫy chung kho cookie) ở 390 và 1040: dải cát hiện; chuông có số; bấm chuông → ngăn hai tab, số về 0; bấm tin quan trọng → hộp đọc → "Đã hiểu" → dải tắt.
  c) Đo: không tràn ngang (`scrollWidth - innerWidth ≤ 0`), vùng chạm chuông/nút ≥ 44px, ngăn không vượt khung ở 320.
  d) **So bản mẫu từng khối** (bài học Đợt D): liệt kê trong README bảng "khối bản mẫu → ảnh thật → khớp/lệch": chuông + số, tab "Của tôi"/"Tất cả", câu gợi ý dưới tab, nhóm theo ngày, biểu tượng + màu theo loại, tin mờ "Đã có người nhận", chip quan trọng, chân ngăn, dải cát + nút, hộp đọc + "Để sau"/"Đã hiểu", form gửi (đếm ký tự, radio, viên thuốc nhóm, ô quan trọng), "Đã gửi" (tiến độ, xem ai đã hiểu, xác nhận thu hồi). Lệch nào cũng phải sửa hoặc ghi lý do để chủ duyệt.

- [ ] **Step 2: Chạy** — `npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-27-thong-bao/kich-ban/thong-bao-smoke.mjs` → "THONG BAO SMOKE OK — mọi bước ✓".

- [ ] **Step 3: Tài liệu mô tả** — sửa `SYSTEM-DESIGN.md`, `CHANGE-GUIDE.md` như mục Files.

- [ ] **Step 4: Kiểm toàn bộ** — `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` (toàn bộ), `node scripts/audit-invariants.mjs --db local` (thoát 0).

- [ ] **Step 5: Commit**

```bash
git add docs/evidence/2026-09-27-thong-bao docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md web/CLAUDE.md
git commit -m "Thông báo: kịch bản Chrome đối chiếu bản mẫu từng khối + tài liệu mô tả (ADR-0034)

Vì sao: giao diện phải khớp 100% bản mẫu chủ đã duyệt (E1, bài học Đợt D); đo nhiều
khổ màn, không chỉ 390/1040."
```

---

### Task 10: Kiểm độc lập (việc lớn — CLAUDE.md §3, Hiến pháp N8)

- [ ] **Step 1:** Giao subagent `nguoi-kiem-doc-lap` (chỉ đọc): đối chiếu mã với đặc tả §4–§8, §12 và ADR-0034; chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --db local`, kịch bản Chrome; kiểm Review Focus 1–5; mở ảnh so bản mẫu. Báo cáo CHẶN/NÊN SỬA/GHI CHÚ.
- [ ] **Step 2:** Sửa mọi CHẶN (mỗi sửa đỏ→xanh, commit riêng), mời kiểm lại tới khi ĐẠT.
- [ ] **Step 3:** Ghi nhật ký thi công `docs/superpowers/plans/2026-09-27-thong-bao-thi-cong-nhat-ky.md` (việc đã làm, ruling, nợ), nhắc bước triển khai cho chủ: mục nhật ký thay đổi (bước A.0) + `npm run trien-khai` (có migration 0025) theo `docs/QUY-TRINH-PHAT-HANH.md` — AI không tự deploy.
