# Khắc phục kiểm toán — Đợt 0: lớp chống ghi trùng chung (ADR-0094, bản mở rộng) + quyền tiền chỉ Toàn quyền (ADR-0090) — Kế hoạch thi công

> **Vai của tài liệu này:** **lập kế hoạch** (Hiến pháp P15). Người lập không thi công, không tự nghiệm thu. Mỗi luồng thi công ở **phiên riêng, worktree riêng**. Sau mỗi phần việc lớn (dữ liệu, quyền, tiền, luật) có **người kiểm độc lập chỉ đọc** (CLAUDE.md §3, N8).
>
> **Tên đích khi đưa vào kho:** `docs/superpowers/plans/2026-10-02-khac-phuc-audit-01-dot-0-chong-ghi-trung-quyen-tien.md`. Tên này đã được trỏ từ lộ trình `2026-10-02-khac-phuc-audit-00-lo-trinh.md`.
>
> **Mốc mã:** đã đọc trên `main` = `fc268abe` (ngày 2026-10-02). Các trích dẫn lấy từ ADR/đặc tả cũng đã đối chiếu lại: `src/modules/orders/repository.ts:1383`, `src/modules/van-chuyen/rules.ts:152-161`, `migrations/0033_van_chuyen_xe.sql:96-98` (bảng + `CHECK … BETWEEN`), `migrations/0041_chinh_sach_dieu_phoi.sql:14-16` (đầu bảng; dòng cuối `:36` theo ADR, chưa đối chiếu), `src/modules/thongbao/index.ts:198`, `web/sessions.ts:137-140` (nút gộp đọc `s.datLaiPinDuoc`). Mọi `tệp:dòng` dưới đây đã đối chiếu tại mốc này. Số dòng trong ADR-0094 lấy theo `93233953`, nên **có chỗ lệch**; ở đâu lệch thì bảng §3 ghi lại. Người thi công **grep lại** trước khi sửa, không chép số dòng từ ADR.
>
> **Căn cứ:**
> - `docs/adr/ADR-0094-lop-chong-ghi-trung-chung.md` (accepted 2/10). Gọi tắt "ADR-94", kèm số điều đ1…đ10, A-1…A-11, H1…H10, T1…T12.
> - Đặc tả `docs/superpowers/specs/2026-10-02-lop-chong-ghi-trung-chung-de-xuat.md` (gọi tắt "đặc tả", kèm số mục). Khi đặc tả và ADR khác nhau, **ADR thắng**.
> - `docs/adr/ADR-0090-tai-khoan-quyen-tien-chi-toan-quyen.md` (accepted 2/10). Gọi tắt "ADR-90".
> - `docs/quyen-hoan.json` mục **F-02** (HIGH, hạn **2026-10-15**).
>
> **Khuôn:** văn phong và cách chia task theo `2026-10-01-van-chuyen-con-lai-01-viec-nho.md` và `2026-10-01-tro-ly-thong-minh-thi-cong.md`. Mỗi task ghi: tệp chạm → bài đỏ trước → làm xanh → lệnh kiểm → commit.

---

## 0. Tóm tắt (cho điều phối)

- **Hai luồng chạy song song**, khác vùng mã, khác lần phát hành:
  - **Luồng Q** (ADR-90): nhỏ (S–M). Không migration, không bí mật.
    - Phát hành **riêng, sớm**, không chờ khoá HMAC.
  - **Luồng L** (ADR-94, bản mở rộng): lớn (L). Có migration `0074`, một bí mật mới, router, `web/api.ts`.
    - Đây là **đường găng** của hạn F-02 (15/10).
    - Đợt 1 (TNV-G1, cũng hạn 15/10) chỉ chờ L4b (router) qua kiểm độc lập.
- **Phần đóng F-02 trước 15/10** (A-9): bản mở rộng lên production **và** T12 đạt. Bản mở rộng gồm L0–L13:
  - bảng vé + bảng chính sách gieo 365;
  - module `lan-gui`;
  - router "có vé thì áp, thiếu vé cho qua và đếm";
  - `web/api.ts` + mô-đun vòng đời vé;
  - `Location` cho route 201;
  - sửa `web/dieu-phoi-ui.ts:32`;
  - cổng kiểm khoá trong `npm run trien-khai`;
  - H1–H5, H7 (H6, H9 phần CSDL quan sát được ngay).
- **Để sau (A-11, trước ngày thứ 90 kể từ bản mở rộng):**
  - màn "Thời hạn giữ vé" (T7, T9, T11 phần máy chủ);
  - Cron dọn vé (T8, T10, H8, H10);
  - ngoại lệ có tên `XOA_CUNG_VE_HET_HAN`;
  - hai mã nhật ký `lan_gui_*`.
- **Để sau nữa (bản siết, chủ ra lệnh):** thiếu vé ⇒ 400 (đ7, A-6).
- **Migration dự kiến:** **`0074_lan_gui.sql`** (số lớn nhất đang có ở mọi nhánh/thư mục là `0073`; `0071` đã cấp cho Vận chuyển Đợt 3). Lúc thi công phải đo lại; xem §4.

---

## 1. Phạm vi

### 1.1 Trong Đợt 0
| Mã | Việc | Căn cứ |
|---|---|---|
| L0–L15 | Lớp vé, bản mở rộng | ADR-94 đ1–đ7, đ8a (chỉ bảng + gieo), đ10, A-1, A-7 (tên bảng), A-9, A-10 |
| Q0–Q7 | Quyền tiền chỉ Toàn quyền: (i) đặt lại PIN, (ii) gán vai Kế toán / cộng tay quyền tiền, (iii) tạo tài khoản mang quyền tiền; cờ giao diện theo dòng | ADR-90 đ0–đ2, đ4 |

### 1.2 Ngoài Đợt 0 (ghi rõ để không nở phạm vi)
- **ADR-94, bản sau (A-11):** màn thời hạn, Cron dọn, H8, H10, T7–T11 (trừ phần `CHECK` của T11), nhật ký `lan_gui_thoi_han_changed` / `lan_gui_ve_da_don`, ngoại lệ `XOA_CUNG_VE_HET_HAN`. Phác ở §11.
- **ADR-94, bản siết** (đ7 giai đoạn 2): phác ở §11.
- **ADR-94, gộp ba cơ chế cũ** (Góp ý, Thông báo, Vận chuyển `requestId`): đ10 ghi là việc riêng về sau. Đợt 0 **chỉ** sửa `web/dieu-phoi-ui.ts:32`.
- **Lớp nghiệp vụ** (ADR-94 đ9; ADR-0092 đ6, đ6a; cảnh báo đơn trùng): đợt khác.
- **ADR-90 (iv)** (tắt bảo mật hai lớp): chỉ áp khi ADR-0074 Phần B/C thi công. Đợt 0 để lại một bài `todo` có tên.
- **ADR-90 đ3, phần "gửi tin cho Toàn quyền khi Quản trị ngưng tài khoản Kế toán":** **chờ chủ** (câu C2 ở §13). Lý do: "Của tôi" của Thông báo hiện chỉ đọc sự kiện **đơn** (`v_aud_order_event`, `src/modules/thongbao/repository.ts:2-18`). Muốn có tin này thì cần một view mới (tức là migration, mà ADR-90 ghi "không migration") hoặc một cạnh module mới (nới hàng rào).

---

## 2. Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20)

### 2.1 ADR-94 — lấy nguyên T1–T12, ghi rõ đợt nào chứng minh

| Mã | Hành vi kiểm được | Chứng minh ở | Đợt |
|---|---|---|---|
| T1 | Tắt mạng sau khi bấm "Ghi lần thu", bật lại, bấm lại ⇒ đơn có **một** lần thu; màn báo "Lần bấm trước đã được ghi" | e2e `tests/e2e/chong-ghi-trung.mjs` ca 12 (API) + Chrome mất mạng giả lập qua CDP (khuôn `cuoc-smoke.mjs`) | Đợt 0 |
| T2 | Bấm đúp "Lập đơn" ⇒ **một** đơn | H1 (harness) + e2e ca 11 + Chrome bấm đúp | Đợt 0 |
| T3 | Lập đơn, mất phản hồi, iOS tắt Nền tảng, mở lại, gửi lại cùng nội dung ⇒ **một** đơn; mở trang đơn đã tạo | **iPhone thật — việc của chủ** (§9 bước 6). Máy: bài đơn vị L8 (vé sống qua "tải lại trang" bằng `localStorage` giả) | Đợt 0 (chủ) |
| T4 | Hai lần thu thật giống hệt nhau, nối tiếp, cả hai thành công ⇒ **hai** dòng | H4: bài đơn vị L8 + ca e2e | Đợt 0 |
| T5 | Sửa số tiền sau khi mất mạng rồi gửi ⇒ lớp vé **không** chặn | ca e2e (vé mới ⇒ 2 dòng) | Đợt 0 |
| T6 | Đổi `access` một route ghi đang có đăng nhập sang `public` mà không có dòng trong tệp miễn ⇒ H2 đỏ; thêm dòng miễn cho route không tồn tại ⇒ H2 đỏ | L6, hai phép đột biến | Đợt 0 |
| T7 | Quản trị gọi route đổi thời hạn ⇒ 403; giao diện Quản trị không có màn / ô "Thời hạn giữ vé" | — | **bản sau** |
| T8 | Rút từ 365 xuống sàn ⇒ trong 7 ngày chờ Cron không xoá vé còn trong hạn cũ | — | **bản sau** |
| T9 | Kéo dài từ sàn lên 365 ⇒ lượt Cron kế dùng 365 | — | **bản sau** |
| T10 | Cron chỉ xoá trước mốc cắt **và** trước mốc sàn; mỗi lô ≤ 5.000, mỗi lượt ≤ 50 lô, mỗi lô có xoá đúng một dòng nhật ký cùng lô; thiếu chính sách ⇒ không xoá; Sheet lỗi ⇒ lượt dọn vẫn chạy | — | **bản sau** |
| T11 | "Không dọn" ⇒ Cron không xoá. Số ngày dưới sàn ⇒ máy chủ từ chối; chèn thẳng CSDL bị `CHECK` chặn | Phần `CHECK`: **L1 (Đợt 0)**. Phần máy chủ và Cron: bản sau | tách |
| T12 | Kịch bản F-02 chạy lại đạt: 11, 12, 13, HD10, KT03, KT04, **gắn cùng một vé** ở hai lần gửi, có bản trong `tests/e2e/` | L11 | Đợt 0 |

### 2.2 ADR-94 — tiêu chí thêm (người lập thêm, vì thiếu trong ADR)
- **T13 (bất biến lô).** Có dòng `lg_lan_gui` ⇔ lô ghi đầu tiên của lệnh đã thành công.
  - Kiểm: ép lô nghiệp vụ hỏng bằng trigger RAISE trên SQLite ⇒ không có vé, gửi lại chạy như mới.
  - Kiểm: ép câu vé hỏng ⇒ không có dữ liệu nghiệp vụ.
- **T14 (thiếu vé, giai đoạn 1).** Gửi không có `Idempotency-Key` ⇒ hành vi cũ (redteam R1 vẫn ra 2 đơn khi **không** gửi vé), và có đúng một dòng log `thieu_ma_lan_gui` mang mẫu route, không có id hay dữ liệu cá nhân.
- **T15 (thiếu khoá).** Thiếu hoặc ngắn khoá HMAC ⇒ `checkConfig` báo, mọi API trả 500 `server_misconfigured`. Cổng `trien-khai` dừng **trước** khi deploy nếu tên khoá chưa có trong `wrangler secret list`.
- **T16 (không lộ dữ liệu).**
  - Dòng `lg_lan_gui` không chứa thân, SĐT, PIN, số giấy tờ; `duong` là **mẫu route**, `ket_qua` chỉ là đường dẫn nội bộ chứa id.
  - `localStorage` `lg:<staffId>` chỉ có mã băm và vé; không có mục nào cho route trong danh sách bí mật.
- **T17 (ghi phụ trước lô chính không ăn vé).** Ở "Lập đơn" có thân kiểu cũ (`demThanCu`, `src/modules/orders/index.ts:672`): ép lô chính hỏng ⇒ gửi lại **không** nhận nhầm "đã ghi". Đây là bẫy 4 của đặc tả §3.5, nằm đúng route lõi của F-02.
- **T18 (thiếu phần tiêm).** Dựng app không có `injected.lanGui` ⇒ mọi route ghi có đăng nhập bị từ chối (không lặng lẽ tắt lớp).
- **T19 (phát lại an toàn).** `ket_qua` đi qua `safeNext` (`src/shared/safe-next.ts`) trước `location.replace`; giá trị ngoài đường dẫn nội bộ ⇒ chỉ tải lại trang.

### 2.3 ADR-90
| Mã | Hành vi kiểm được |
|---|---|
| Q-T1 | Hàm "có quyền tiền" suy từ `MATRIX` cho ra **đúng** `["ACCOUNTING","SUPER_ADMIN"]` hôm nay (đ0). Thêm một mã quyền giữ một trong bốn ô ⇒ hàm tự nhận, không sửa tay danh sách |
| Q-T2 | Quản trị `POST /api/staff/:id/reset-pin` lên tài khoản Kế toán ⇒ **403**, câu đúng đ1. PIN, Face ID, phiên của Kế toán **không** đổi; nhật ký không có `pin_reset` (kịch bản QT04) |
| Q-T3 | Quản trị / Nhân sự gán vai Kế toán, hoặc cộng tay `ACCOUNTING` (kể cả chỉnh tay "ngủ"), cho tài khoản bất kỳ ⇒ 403 (`PUT /api/staff/:id/roles`) |
| Q-T4 | Nhân sự tạo tài khoản mang vai Kế toán hoặc quyền tiền qua **cả hai đường** của `POST /api/staff` (vai: `:403`; quyền cũ: `:437`) ⇒ 403; không có dòng `staff` mới |
| Q-T5 | Quản trị vẫn **mở khoá**, **đổi tên**, **ngưng** tài khoản Kế toán ⇒ 200 (đ3) |
| Q-T6 | Toàn quyền làm được cả bốn việc ở Q-T2…Q-T4 ⇒ 200/201 |
| Q-T7 | Giao diện của Quản trị và Nhân sự: nút "Đặt lại PIN" không hiện ở dòng tài khoản có quyền tiền (màn Quản lý tài khoản và màn Phiên); ô vai Kế toán và ô cộng tay quyền tiền khoá hoặc ẩn. Cờ do **máy chủ** tính theo dòng (đ2) |
| Q-T8 | `PUT /api/staff/:id/permissions` vẫn chỉ Toàn quyền (`src/modules/accounts/index.ts:528`). Bài ghim, không đổi mã |
| Q-T9 | Kịch bản QT04 (`~/Documents/danh-gia-ux/2026-10-01/kich-ban/vai-qt.mjs:405`) chép thành e2e trong kho; chạy lại: ba cửa đều 403 |

---

## 3. Hiện trạng đã kiểm trên `main` (`fc268abe`)

| Điều | Tệp:dòng | Ghi chú / lệch so với ADR |
|---|---|---|
| Số route ghi | `grep -h -o -E 'route\("(POST\|PUT\|PATCH\|DELETE)"' src/modules/*/index.ts \| wc -l` = **134** | ADR ghi 133. Thêm 1 route ở `giao-dien`. Tức **129** route có đăng nhập ở **13** module, 5 công khai ở `auth` |
| Chỗ `, 201)` | accounts 3, billing 4, feedback 2, orders 2, catalog 1, locations 1, parties 6, van-chuyen 9 = **28** | Khớp "ít nhất 28"; dạng khác (vd `thongbao/index.ts:198`) do L0 rà |
| `WRITE_METHODS` | `src/shared/router.ts:194` | khớp |
| `createApp` | `src/shared/router.ts:271` | khớp |
| `checkConfig` → 500 | `src/shared/router.ts:287-291` | khớp |
| Cổng bảo trì | `src/shared/router.ts:302-303` | |
| Cổng `access` | `src/shared/router.ts:306-309` | ADR ghi `:297-310` |
| Gọi handler | `src/shared/router.ts:312` | chỗ chèn lớp vé: sau `:309`, trước `:312` |
| Bắt lỗi ngoài cùng (`order_delivered` → 409) | `src/shared/router.ts:347-360` | lỗi trigger huỷ cả lô ⇒ không có vé, đúng ý |
| `checkAuthConfig` | `src/modules/auth/index.ts:40-45`; `MIN_SECRET_LENGTH = 32` ở `:37` | nơi thêm kiểm khoá mới |
| Gắn `checkConfig`, mảng `modules`, phần tiêm | `src/index.ts:55-58` | |
| `taoAppChoKhungThu` | `src/index.ts:170-171` | trải `APP_OPTIONS.injected`, nên khung thử tự có `lanGui` |
| `scheduled` | `src/index.ts:177-178` | ADR ghi `:176-177`; dùng ở bản sau |
| Cron | `wrangler.jsonc:10` `*/15 * * * *` | khớp |
| `api()` | `web/api.ts:76`; `fetch` ở `:87`; hết giờ 45 giây ở `:67` | `api()` **không biết** ai đăng nhập (xem L9) |
| `fetch` ghi ngoài `api()` | `web/api.ts:48` (`session-ended`), `web/maintenance-screen.ts:92` (`logout`) | đều công khai; `maintenance-screen.ts:72` là GET |
| Vận chuyển bỏ `requestId` sau 5xx | `web/dieu-phoi-ui.ts:32` `dangCho = e instanceof ApiError ? null : lenh;` | khớp đ10 |
| e2e `call()` | `tests/e2e/lib.mjs:41-49` (`fetch` ở `:42`) | |
| e2e gọi `fetch` thẳng | chinh-sach-phien, catalog, giao-dien, platform, pwa, phien, run, thongbao (8 tệp, ngoài `lib.mjs`) | khớp "8 tệp"; rà ở bản siết |
| Khung thử | `tests/audit/harness.mjs`: `fakeD1` `:43-66` (`batch` `:60`), `env` `:122`, `exec.waitUntil` **không làm gì** `:125` | **Hai điểm mù** (L5): (a) `fakeD1.batch` nhận mọi đối tượng có `.sql/.args`, nên lỗi "quên gỡ bọc" không lộ; (b) không chờ được việc chạy nền ở bước 6 |
| redteam R1, R2 | `tests/audit/redteam.test.mjs:35-54` | nằm **ngoài** `npm test` (`:4`) |
| Thiếu khoá với khung thử | env khung thử `:122`; `tests/e2e/run.mjs:134` (`--var SESSION_SECRET`); `scripts/dev-iphone.mjs`; `src/passkey-off.test.ts` | thêm khoá bắt buộc là **mọi** bài khung thử trả 500 nếu quên một chỗ |
| Kiểu `Env` | `worker-configuration.d.ts:8` (`SESSION_SECRET`), khai tay `BANG_TIN_HAN_GIAY?` ở `:17` | AI không ghi được `.dev.vars` (hook tệp cấm), nên khai **tay** tên khoá mới theo khuôn `:14-17` |
| Ghi phụ trước lô chính | `src/modules/orders/index.ts:672` (`lap_don`), `:738` (`luu_nhap`) — `demThanCu` | nguy cơ T17 |
| Ghi hai lần mỗi lệnh | reset-pin `src/modules/accounts/index.ts:663-673` (lô rồi `unlockPhone`); unlock `:707`; PUT roles nhánh `guarded` `:629-636` (hai lô); PUT permissions nhánh `guarded` `:563-565` | hạt giống danh sách nợ H5 (L12) |
| Handler nuốt lỗi UNIQUE | `POST /api/staff` `src/modules/accounts/index.ts:421` (đường vai) và `:451` (đường cũ) (`isUniqueViolation` → `PHONE_TAKEN`) | ca thật cho H1 "handler nuốt lỗi đụng vé" |
| Ngoại lệ xoá cứng | `XOA_CUNG_NHAP` `src/architecture.test.ts:155`; R-N1-9 `:404-406`; bài "chỉ co lại" `:793-800`; ADR-0003 bảng mới `:331` | ADR ghi `:153`, `:402-404`, `:791-798`, `:329-351` |
| Ranh giới module | `ALLOWED_EDGES` `src/architecture.test.ts:20`; `STRICT` `:69`; `LEGACY` `:91` | |
| Bốn ô tiền | `src/shared/permissions.ts:105` (`payment.refund`), `:110` (`order.complete`), `:114` (`ledger.write`), `:120` (`accounting.entry.mark`) — cột 2 (ACCOUNTING) và 6 (SUPER_ADMIN) = `any`, ADMIN = `none` | thứ tự cột: `PERMISSION_CODES` `:5` |
| Ô liên quan | `account.access.manage` `:129`; `account.create` `:134` (SUPER_ADMIN, HR); `settings.ops` `:141`; `auth.session.policy` `:189` | |
| Vai Kế toán | `src/shared/roles.ts:33` `superAdminOnly: false` | khớp ADR-90 |
| Danh sách LC-4 | `SUPER_ADMIN_GRANTED` `src/shared/roles.ts:56`; `canManageAccount` `:63` đọc **chính danh sách này** | **Không được** thêm `ACCOUNTING` vào đây: Quản trị sẽ mất cả đổi tên / ngưng Kế toán, trái ADR-90 đ3 |
| `highPermissionProblem` | `src/shared/roles.ts:158` | |
| Bài ghim danh sách vai chỉ-Toàn-quyền | `src/shared/roles.test.ts:24` | bài đỏ tự nhiên khi đổi `ACCOUNTANT` |
| Route tài khoản | `POST /api/staff` `:387` (đường vai `:403`, đường cũ `:437`); `PATCH` `:470`; `PUT …/permissions` `:523` (chỉ Toàn quyền `:528`); `PUT …/roles` `:590` (`:605`); `reset-pin` `:655` (`mayManage` `:662`); `unlock` `:700`; cờ `datLaiPinDuoc` `:735` | tất cả ở `src/modules/accounts/index.ts` |
| Nút "Đặt lại PIN" | `web/staff.ts:93-95`, `:148-150` (điều kiện `canAccessManage && quanDuoc(s)`), `canAccessManage` `:402`, `quanDuoc` `:71` | đ2 đòi cờ máy chủ theo dòng |
| Khoá ô vai / quyền | `web/role-picker.ts:22-23` (`roleLocked` theo `superAdminOnly`; `permLocked` theo `SUPER_ADMIN_GRANTED`), ẩn vai `:74` | |
| Cổng `trien-khai` | `scripts/release-lib.mjs:218` (`trienKhai`), `wrangler whoami` `:236` | nơi thêm cổng kiểm tên khoá |
| F-02 | `docs/quyen-hoan.json` mục `F-02` | `ke_hoach` nói đợt hạn 15/10 phải gồm các lệnh mới của ADR-0089/0088 — xem câu C1 |

---

## 4. Số migration

- **Đã đo 2026-10-02:**
  - `ls migrations` trên `main` → lớn nhất `0069_gd_setting.sql`.
  - `git log --all --name-only -- 'migrations/0069*' 'migrations/007*' 'migrations/008*'` → `0070_tin_chuyen.sql` (nhánh `worktree-agent-a169271206f91c9c4`, `worktree-agent-a76ababaa4a5b3183`), `0072_vc_bang_gia_thue.sql`, `0073_vc_chi_phi_chuyen.sql` (nhánh `worktree-agent-a76ababaa4a5b3183`).
  - `ls .claude/worktrees/*/migrations/` (bắt cả tệp **chưa commit**) → không có gì ngoài `0069`, `0070`, `0072`, `0073`.
  - `0071` **đã cấp** cho Vận chuyển Đợt 3 (`docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-03-khung-ban-gio-lai.md:24,34`), tệp chưa tạo.
- **Số dự kiến: `0074_lan_gui.sql`.** Đợt 1 (ADR-0089), nếu có migration, lấy từ `0075` trở đi.
- **Cảnh báo:** số có thể phải đổi lúc thi công. Ở L0 và **lần nữa ngay trước day-len**:
  1. chạy lại ba lệnh trên;
  2. chạy `git branch --no-merged main`, rồi `git ls-tree --name-only <nhánh> migrations/` cho từng nhánh (CLAUDE.md §10).

  Trùng thì đổi tên tệp, sửa mọi chỗ trích (bài migration, `data-dictionary.json`, sổ thi công), chạy lại `npm test` + e2e đủ bộ. Migration chưa lên remote nên đổi được.
- **Số bản nhật ký phiên bản:** `1.68` là bản cuối trên `main` (`src/shared/changelog.ts:16`). `1.69`, `1.70` đã có nhánh chưa gộp giữ chỗ. Số bản của Đợt 0 **đánh lúc gộp**, không chốt ở đây.

---

## 5. Thứ tự, phụ thuộc, lịch

```
Luồng Q (ADR-90, phiên riêng):   Q0 → Q1 → Q2 → Q3 → Q5 → [kiểm độc lập Q6] → chủ: day-len + trien-khai (Q7)
                                             (Q4 chờ chủ — không chặn Q7)

Luồng L (ADR-94, phiên riêng):   L0 → L1 → L2 → L3 (+ phần gắn vé của L10) → L4a
                                 → [bài đỏ: khung thử + ca L5 + e2e L11, commit riêng] → L4b router (xanh)
                                 → [kiểm độc lập vòng 1: dữ liệu + router]
                                                              ├→ L5 (phần còn lại: redteam, đột biến H1) → L6 (H2)
                                                              ├→ L7 (Location + H7)
                                                              ├→ L8 (vòng đời vé, H4) → L9 (web/api.ts + dieu-phoi) → L10 (phần còn lại)
                                                              └→ L12 (H5, nợ ghi nhiều lần — T17)
                                 L10 + L12 → L11 (đủ ca, xanh) → L13 (cổng khoá trien-khai) → L14 (tài liệu, sổ hàng rào)
                                 → [kiểm độc lập vòng 2: toàn bản mở rộng] → chủ: secret put → day-len → trien-khai (L16)
Đợt 1 (ADR-0089) được bắt đầu khi L4b qua kiểm độc lập vòng 1 (nhánh mới tách từ nhánh Đợt 0 hoặc từ main sau khi gộp).
```

| Ngày (đề xuất) | Luồng L | Luồng Q |
|---|---|---|
| 3/10 | L0, L1, L2 | Q0, Q1, Q2 |
| 4–5/10 | L3, L4a | Q3, Q5, kiểm Q6 |
| 6–7/10 | L4b + kiểm vòng 1 | chủ: day-len + trien-khai bản quyền tiền |
| 7–9/10 | L5, L6, L7, L8, L12 | — |
| 9–11/10 | L9, L10, L11, L13, L14 | — |
| 11–12/10 | kiểm độc lập vòng 2, sửa | — |
| 13/10 | chủ: `wrangler secret put` → day-len → trien-khai | — |
| 14–15/10 | đệm: T12 đạt + kiểm sau deploy ⇒ đóng F-02 | — |

Trượt quá 12/10 mà kiểm vòng 2 chưa đạt thì **báo chủ ngay** và đề nghị gia hạn F-02 bằng diff có lý do (`docs/quyen-hoan.json`). Không ép phát hành.

---

## 6. Luồng Q — ADR-90 (quyền tiền chỉ Toàn quyền)

Việc lớn (quyền). Phiên riêng, worktree riêng (ví dụ `quyen-tien-toan-quyen`).

### Q0 (S) — Kiểm kê, sổ thi công
- **Tệp:** tạo `docs/superpowers/plans/2026-10-0x-dot-0-quyen-tien-nhat-ky.md`.
- **Việc:**
  - grep lại các dòng ở §3 (route tài khoản, `roles.ts`, `web/staff.ts`, `web/role-picker.ts`, `web/sessions.ts`).
  - Rà e2e nào hôm nay dùng **Quản trị / Nhân sự** để gán vai Kế toán, tạo Kế toán, hay đặt lại PIN Kế toán: `grep -n "ACCOUNTANT\|ACCOUNTING\|reset-pin" tests/e2e/*.mjs`. Ví dụ `tests/e2e/roles.mjs:13` tạo Kế toán bằng `SUPER`, giữ nguyên; các chỗ khác ghi danh sách vào sổ.
  - Rà kịch bản Chrome dùng Quản trị thao tác lên Kế toán (`vai-smoke.mjs`, `dot-a-smoke.mjs`, `va3-smoke.mjs`, `quyen-thieu-quan-tri-smoke.mjs`).
- **Kiểm:** `npm test` + `npm run typecheck` xanh trước khi sửa (mốc).

### Q1 (S) — Một hàm "có quyền tiền", suy từ bảng quyền
- **Tệp:** `src/shared/permissions.ts` (hoặc `src/shared/roles.ts`, cạnh `canManageAccount`), `src/shared/permissions.test.ts`.
- **Đỏ trước:** bài mới ở `permissions.test.ts`:
  - `MA_QUYEN_TIEN` = `["ACCOUNTING","SUPER_ADMIN"]` (Q-T1);
  - `coQuyenTien(["SALES"]) === false`, `coQuyenTien(["SALES","ACCOUNTING"]) === true`;
  - bốn ô `O_GHI_TIEN = ["ledger.write","payment.refund","order.complete","accounting.entry.mark"]` đều có ADMIN = `none` (đ0).

  Đỏ vì chưa có tên.
- **Xanh:** khai `O_GHI_TIEN` (ghim bốn ô theo đ0). `MA_QUYEN_TIEN = PERMISSION_CODES.filter(p => O_GHI_TIEN.some(o => MATRIX[o][p] !== "none"))`. `coQuyenTien(perms)`. Thuần, dùng chung máy chủ và `web/`.
- **Lệnh:** `node --test src/shared/permissions.test.ts` → `npm test` → `npm run typecheck`.

### Q2 (M) — Cổng máy chủ cho ba cửa
- **Tệp:** `src/shared/roles.ts` (`:33`, `highPermissionProblem` `:158`, `roleAssignmentProblem`), `src/shared/roles.test.ts`, `src/modules/accounts/index.ts` (reset-pin `:655-677`, cờ `:735`), bài khung thử mới `src/modules/accounts/quyen-tien.test.ts`.
- **Đỏ trước** (khung thử `tests/audit/harness.mjs`; gieo Quản trị, Nhân sự, Kế toán, Bán hàng, Toàn quyền như `tests/audit/redteam.test.mjs:17-25`):
  - Q-T2: Quản trị reset-pin Kế toán ⇒ hôm nay **200** (đỏ khi khẳng định 403).
  - Q-T3: Quản trị `PUT /api/staff/:id/roles` thêm `ACCOUNTANT` cho Bán hàng ⇒ hôm nay 200. Chỉnh tay `adds: ["ACCOUNTING"]` ⇒ hôm nay 200.
  - Q-T4: Nhân sự `POST /api/staff` với `roles: ["ACCOUNTANT"]` ⇒ hôm nay 201. Đường cũ `permissions: ["ACCOUNTING"]` ⇒ hôm nay 201.
  - Q-T5 (phải **giữ xanh**): Quản trị đổi tên, ngưng, mở khoá Kế toán ⇒ 200.
  - Q-T6: Toàn quyền làm cả bốn việc ⇒ 200/201.
  - `roles.test.ts:24` đổi kỳ vọng thành `["DIRECTOR","OPERATIONS_MANAGER","ACCOUNTANT","IT","HR_STAFF"]` (thứ tự theo `ROLE_CODES`) ⇒ đỏ.
- **Xanh:**
  1. `ROLES.ACCOUNTANT.superAdminOnly = true` (`roles.ts:33`). Hệ quả tự có: `web/role-picker.ts:74` ẩn vai Kế toán với người không phải Toàn quyền.
  2. Mở rộng **luật cấp/gỡ** cho mã quyền tiền ở `highPermissionProblem` và nhánh "chỉnh tay ngủ" của `roleAssignmentProblem`. **Không** sửa `SUPER_ADMIN_GRANTED` hay `canManageAccount` (§3).
     - Đổi `MA_QUYEN_TIEN` (cấp **hoặc** gỡ, theo dòng LC-4 ở bảng "Thay câu nào" của ADR-90) bởi người không phải Toàn quyền ⇒ `{ forbidden: true, message: "Tài khoản giữ tiền — chỉ người phụ trách hệ thống (Toàn quyền) làm việc này." }`.
     - Kiểm **trước** luật vai `VAI_QUAN_LY_MESSAGE`, để câu đúng đ1.
  3. reset-pin: sau `mayManage` (`:662`), thêm `if (coQuyenTien(t.permissions) && !can(ctx.staff, "admin.manage.superadmin")) return <403 câu đ1>`, **trước** mọi ghi.
  4. Cờ `datLaiPinDuoc` (`:735`) thêm cùng điều kiện, qua **một** hàm thuần dùng chung `datLaiPinDuoc(actor, target)`, để cổng và cờ không lệch.
  5. Đường cũ của `POST /api/staff` (`:437`) và `PUT …/permissions` (`:542`) đã gọi `highPermissionProblem`, nên tự được phủ. Q-T8 thêm bài ghim `:528`.
- **Ghi lại cho chủ (một dòng, không chặn):** `superAdminOnly = true` làm Quản trị **không gỡ** được vai Kế toán. Đây là hệ quả của dòng LC-4 trong ADR-90 ("cấp hoặc gỡ"); đ3 chỉ giữ cho Quản trị mở khoá, đổi tên, ngưng.
- **Lệnh:** `node --test src/shared/roles.test.ts src/roles-schema.test.ts src/modules/staff/account-roles.test.ts src/modules/accounts/quyen-tien.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts` → `npm test` → `npm run typecheck` → `npm run test:e2e -- roles admin permissions` (sửa e2e đã liệt kê ở Q0 nếu đỏ **vì đúng luật mới**; ghi từng chỗ vào sổ).
- **Commit:** "Quyền tiền chỉ Toàn quyền: chặn đặt lại PIN, gán vai/quyền tiền, tạo tài khoản tiền (ADR-0090)".

### Q3 (M) — Cờ máy chủ theo dòng + giao diện
- **Tệp:** `src/shared/contracts.ts` (thêm `datLaiPinDuoc: boolean` vào DTO dòng tài khoản của `GET /api/staff`), `src/modules/accounts/index.ts` (`:379` dựng DTO), `web/staff.ts` (`:93-95`, `:148-150` dùng `s.datLaiPinDuoc` thay `canAccessManage && quanDuoc(s)` cho **riêng** nút "Đặt lại PIN"), `web/role-picker.ts:23` (`permLocked` = `SUPER_ADMIN_GRANTED` ∪ `MA_QUYEN_TIEN`), `web/sessions.ts` (nút gộp đã đọc `datLaiPinDuoc` của `:735`; kiểm lại).
- **Đỏ trước:** khung thử: Quản trị `GET /api/staff` ⇒ dòng Kế toán `datLaiPinDuoc === false`, dòng Bán hàng `true`; Toàn quyền ⇒ cả hai `true`.
- **Lệnh:** `npm run typecheck` (cả ba tsconfig, vì `contracts.ts`) → `npm test` → `npm run build:web` → `npm run test:e2e` đủ bộ → kịch bản Chrome theo `web/CLAUDE.md`: `vai-smoke.mjs` (`docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/`), `va3-smoke.mjs`, `dot-a-smoke.mjs` (bước `nhat-ky` đỏ sẵn từ ADR-0038, ghi rõ), `quyen-thieu-quan-tri-smoke.mjs`. Thêm một bước vào `va3-smoke.mjs`: Quản trị không thấy "Đặt lại PIN" ở dòng Kế toán.

### Q4 — đ3 "tin cho Toàn quyền khi Quản trị ngưng Kế toán": **CHỜ CHỦ** (câu C2)
Không thi công tới khi chủ chọn. Q7 không phụ thuộc Q4.

### Q5 (S) — e2e QT04 + hàng rào + đánh dấu (iv)
- **Tệp:** `tests/e2e/quyen-tien.mjs` (mới), `tests/e2e/run.mjs` (thêm vào `ALL`), `docs/SO-HANG-RAO.md`, `src/modules/accounts/quyen-tien.test.ts` (một bài `todo` "ADR-90 (iv) tắt hai lớp — chờ ADR-0074 Phần B").
- **Việc:**
  - Chép QT04 (`vai-qt.mjs:405-…`) thành e2e: Quản trị reset-pin Kế toán ⇒ 403 và `GET /api/audit?action=pin_reset` không có dòng mới.
  - Biến thể: Quản trị `PUT …/roles` thêm Kế toán cho Bán hàng ⇒ 403.
  - GD-P-01: Nhân sự tạo Kế toán ⇒ 403.
- **Quan sát chặn thật (P16):**
  - Xoá dòng kiểm ở reset-pin ⇒ `quyen-tien.test.ts` đỏ (chép thông báo) ⇒ hoàn nguyên ⇒ xanh.
  - Trả `ACCOUNTANT.superAdminOnly` về `false` ⇒ `roles.test.ts:24` + Q-T3 đỏ ⇒ hoàn nguyên.
  - Ghi **một dòng** `SO-HANG-RAO.md`: "Cổng quyền tiền chỉ Toàn quyền (ADR-0090)": chặn gì, cơ chế (`coQuyenTien` + ba route + cờ), ngày, thông báo đỏ.
  - Ghi chú: **không** canh (iv), **không** canh việc Quản trị đặt lại PIN Bán hàng/HDV để làm thay (ADR-0093).
- **Lệnh:** `npm run test:e2e -- quyen-tien` → `npm test`.

### Q6 — Kiểm độc lập (bắt buộc, quyền)
Gọi subagent `nguoi-kiem-doc-lap`. Họ chỉ đọc, tự chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e -- quyen-tien roles admin permissions`. Đối chiếu Q-T1…Q-T9, đọc diff từng cửa, xác nhận `canManageAccount` **không** đổi.
- Báo cáo ghi vào sổ thi công.
- Chỉ báo "đạt" dựa trên báo cáo đó.

### Q7 — Việc của chủ (luồng Q)
1. `npm run day-len -- <nhánh>` (chạy trong Terminal thật, thư mục kho gốc). Lệnh đưa **một lần** (bộ nhớ "đừng nhắc lại lệnh day-len").
2. `npm run trien-khai`. **Có** đổi Nền tảng, nên phải triển khai. Không cần khoá mới, không migration.
3. AI ghi mục nhật ký phiên bản (bước A.0) **trước** day-len.

---

## 7. Luồng L — ADR-94, bản mở rộng

Việc lớn (dữ liệu + luật + mọi route ghi). Phiên riêng, worktree riêng (ví dụ `lop-chong-ghi-trung`).

**Tự chốt bề mặt** (đảo ngược được, ghi vào sổ):
- tên khoá `LAN_GUI_SECRET`, tối thiểu 32 ký tự như `SESSION_SECRET`;
- tệp miễn là tệp thuần `src/shared/lan-gui-mien.ts` (router cần đọc lúc chạy, không đặt ở `docs/`);
- danh sách bí mật `src/shared/lan-gui-bi-mat.ts`;
- danh sách nợ `src/shared/lan-gui-no.ts`;
- danh sách "tạo mà trả 200 ⇒ phát lại = tải lại" `src/shared/lan-gui-ket-qua.ts`.

### L0 (S) — Kiểm kê + sổ thi công
- **Tệp:** `docs/superpowers/plans/2026-10-0x-dot-0-lop-ve-nhat-ky.md`.
- **Việc:**
  1. Đo lại số migration (§4) và số bản.
  2. Đếm route ghi (134/129) và lập **bảng route** (module, phương thức, mẫu, `access`).
  3. Lập danh sách **route trả 201** (grep `, 201)` + dạng khác: `json(…, 201`, biến trạng thái) và **route tạo mà trả 200**.
  4. Lập danh sách **ứng viên ghi nhiều lần**: `grep -n "\.run()\|db.batch\|\.batch(" src/modules/*/index.ts src/modules/*/service.ts src/modules/*/*.ts`; đối chiếu hạt giống ở §3.
  5. Đếm `catch (` có thể nuốt lỗi `UNIQUE`/`CHECK` (`isUniqueViolation`, `ruleViolation`, `loiRangBuocChuyen` ở `src/modules/van-chuyen/rules.ts:152-161`).
  6. Rà hàm tiêm của gốc lắp ráp có **ghi**, hoặc trả câu lệnh để nối lô: `newOrderHandler`, `gopHoSo.cauDoiDon`. Các câu đó phải dựng từ `env` đã bọc (bẫy 6).
- **Kiểm:** `npm test` + `typecheck` xanh (mốc).

### L1 (M) — Migration `0074_lan_gui.sql` + từ điển dữ liệu
- **Tệp:** `migrations/0074_lan_gui.sql`, `src/migrations-lan-gui.test.ts` (mới), `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sinh).
- **Nội dung** (ADR-94 đ2, đ8a, A-1, A-3, A-7):
  - `lg_lan_gui` (`WITHOUT ROWID`):
    - cột: `staff_id TEXT NOT NULL`, `khoa TEXT NOT NULL`, `van_tay TEXT NOT NULL`, `duong TEXT NOT NULL`, `ma_tra INTEGER`, `ma_loi TEXT`, `ket_qua TEXT`, `so_lan_lap INTEGER NOT NULL DEFAULT 0`, `created_at TEXT NOT NULL`, `created_by TEXT`, `updated_at TEXT NOT NULL`, `updated_by TEXT`;
    - `PRIMARY KEY (staff_id, khoa)`;
    - chỉ mục `lg_lan_gui_created_at` trên `created_at`;
    - cột WHO không khoá ngoại (`src/architecture.test.ts:331`).
  - `lg_chinh_sach_giu`:
    - cột: `id TEXT PRIMARY KEY`, `so_ngay INTEGER NULL CHECK (so_ngay IS NULL OR so_ngay >= 90)`, `valid_from_at TEXT NOT NULL UNIQUE`, cột WHO;
    - trigger `…_no_update`, `…_no_delete` (khuôn `migrations/0033_van_chuyen_xe.sql:96-110`, `0041_chinh_sach_dieu_phoi.sql:14-36`);
    - gieo một dòng `so_ngay = 365`, `created_by NULL`.
- **Đỏ trước** (`src/migrations-lan-gui.test.ts`, khuôn bài migration có sẵn; tệp tìm theo **đuôi tên** như `*_aut_session.sql` để đổi số không vỡ bài):
  - đúng một tệp `*_lan_gui.sql`;
  - bảng `WITHOUT ROWID` có PK hai cột;
  - có chỉ mục `created_at`;
  - chèn `so_ngay = 30` ⇒ lỗi `CHECK` (**T11 phần CSDL, H9 phần CSDL**);
  - `UPDATE`/`DELETE` `lg_chinh_sach_giu` ⇒ RAISE;
  - đúng một dòng gieo `365`;
  - chèn trùng `(staff_id, khoa)` ⇒ lỗi khoá.
- **Xanh:** viết migration; thêm hai bảng vào `docs/data-dictionary.json` (module `lan-gui`, tiền tố `lg_`, mô tả "dữ liệu kỹ thuật, không dữ liệu cá nhân"); `npm run dict`.
- **Quan sát chặn thật:**
  - **H9 (phần CSDL):** đổi `>= 90` thành `>= 1` ⇒ bài đỏ ⇒ hoàn nguyên.
  - **H6:** quan sát ở **L2** (cần repository của `lan-gui`).
- **Tệp thêm:** `src/architecture.test.ts:178` (`TABLE_PREFIX` thêm `lg_: "lan-gui"`; thiếu thì bài bảng mới `:292-294` đỏ).
- **Lệnh:** `node --test src/migrations-lan-gui.test.ts src/architecture.test.ts` → `npm test` → `npm run db:migrate:local` → `npm run test:e2e` **đủ bộ** (đuôi `audit-invariants`).

### L2 (M) — Module `lan-gui` (nghiêm)
- **Tệp:** `src/modules/lan-gui/index.ts`, `repository.ts`, `rules.ts`, `rules.test.ts`; `src/architecture.test.ts` (`ALLOWED_EDGES` thêm `"lan-gui": []`; `STRICT` thêm `{ module: "lan-gui", file: "modules/lan-gui/repository.ts" }`); `src/index.ts` (phần tiêm `lanGui`).
- **Nội dung:**
  - `rules.ts` (thuần):
    - `kiemKhoa(s)`: 16–64 ký tự `[A-Za-z0-9-]`;
    - `vanTay(khoa, method, path, body)`: HMAC-SHA-256 qua `crypto.subtle`, chỉ máy chủ;
    - `phanLoai(dong, vanTayMoi, nowMs)` ⇒ `"khac_noi_dung" | "phat_lai" | "dang_xu_ly" | "phat_lai_khong_ro"` (đặc tả §3.3 bước 3a–3d, ngưỡng 10 giây);
    - `thanPhatLai(dong)` ⇒ hình phản hồi đ6 (200 `{da_ghi_truoc_do:true, ket_qua}` hoặc mã lỗi cũ + câu cố định).
  - `repository.ts` (`defineSql`, câu tĩnh):
    - `tra` (`SELECT … WHERE staff_id = ? AND khoa = ?`);
    - `cauChenVe(db, …)` (câu **chưa chạy**);
    - `capNhatKetQua` (`ma_tra`, `ma_loi`, `ket_qua`, `updated_at`, `updated_by`);
    - `tangLap` (`so_lan_lap = so_lan_lap + 1`, A-1).
  - `index.ts` công bố đúng các hàm trên; **không route** (màn thời hạn ở bản sau). Không cần vào mảng `modules` (`src/index.ts:55`) vì không có route. Kiểm bài "mọi module khai ALLOWED_EDGES" (`architecture.test.ts:205`) vẫn xanh.
- **Đỏ trước:** `rules.test.ts` cho cả bốn hàm (biên 15/16/64/65 ký tự; 9,9 giây / 10 giây; vân tay đổi khi đổi một byte thân, đổi khoá, đổi đường dẫn; thân rỗng băm phương thức + đường dẫn).
- **Quan sát chặn thật (H6):** tạm thêm `defineSql("lan-gui","thu_xoa","DELETE FROM lg_lan_gui WHERE …")` vào `repository.ts` ⇒ `src/architecture.test.ts` R-N1-9 (`:404-406`) đỏ "xoá cứng bảng lg_lan_gui" ⇒ hoàn nguyên. Phần "ngoại lệ thừa" của H6 thuộc bản sau.
- **Lệnh:** `node --test src/modules/lan-gui/rules.test.ts src/architecture.test.ts` → `npm test` → `npm run typecheck`.

### L3 (S) — Khoá bí mật: một task cho mọi nơi
- **Tệp** (sửa **trong cùng một commit**, nếu không mọi bài khung thử 500):
  - `src/index.ts:57`: `checkConfig` gộp `checkAuthConfig` (giữ nguyên, `src/modules/auth/index.ts:40`) với một hàm kiểm khoá do `lan-gui` công bố (`LAN_GUI_SECRET`, ≥ 32). **Không** nhét khoá của module khác vào `auth`;
  - `worker-configuration.d.ts` (khai tay `LAN_GUI_SECRET: string;` kèm chú thích theo khuôn `:14-17`, vì AI không ghi được `.dev.vars`);
  - `tests/audit/harness.mjs:122` (env thêm khoá giả);
  - `tests/e2e/run.mjs:134` (`--var LAN_GUI_SECRET:<giả>`);
  - `scripts/dev-iphone.mjs`;
  - `src/passkey-off.test.ts` (nếu tự dựng env);
  - `.dev.vars.example` (tên + cách tạo, giá trị trống);
  - `docs/CHANGE-GUIDE.md` công thức l (thêm khoá vào danh sách bí mật).
- **Đỏ trước:** bài ở `src/modules/lan-gui/rules.test.ts` + một ca khung thử: thiếu khoá ⇒ chuỗi lỗi và API trả 500; khoá 31 ký tự ⇒ lỗi; 32 ⇒ null (T15 phần máy chủ).
- **Chuyển sang đây phần gắn vé của L10** (`tests/e2e/lib.mjs` nhận tham số vé; mặc định vé mới mỗi lần gọi). Lý do: L5/L11 cần gửi vé để chụp lần **đỏ** trên mã chưa có router (xem L4b).
- **Việc của chủ đi kèm** (ghi vào sổ, không làm ở đây): chủ thêm `LAN_GUI_SECRET=…` vào `.dev.vars` của mình. Nếu chủ chạy `npm run types`, phải kiểm lại dòng khai tay (bẫy giống `BANG_TIN_HAN_GIAY`).
- **Lệnh:** `npm test` (toàn bộ, vì mọi bài khung thử phụ thuộc) → `npm run typecheck` → `npm run test:e2e -- platform`.

### L4a (L) — Bộ bọc cơ sở dữ liệu theo từng yêu cầu
- **Tệp:** `src/shared/lan-gui-boc.ts` (mới, chỉ phụ thuộc kiểu D1, không import module), `src/shared/lan-gui-boc.test.ts`; `tests/audit/harness.mjs` (chế độ nghiêm của `fakeD1`).
- **Nội dung:** `bocDb(dbGoc, { cauVe: () => D1PreparedStatement, demGhi })` trả đối tượng giống D1. Bảy bẫy của đặc tả §3.5, **mỗi bẫy một bài**:
  0. **Hợp đồng lỗi (ghim bằng bài):** khi lô đụng khoá `lg_lan_gui`, bộ bọc đặt cờ `dungVe` rồi **ném lại đúng lỗi gốc của D1** (chữ `UNIQUE constraint failed: lg_lan_gui…`). Nhờ vậy handler có `catch` nuốt `UNIQUE` (ví dụ `isUniqueViolation` ở `src/modules/accounts/index.ts:421`) thật sự bị thử ở H1 ca (e). Chữ lỗi của D1 thật phải ghi lại ở L4b (§14 mục 3).
  1. `prepare/bind` trả câu bọc nhớ SQL. `batch` **gỡ bọc** trước khi gọi D1 thật. Câu lạ (không do bộ bọc tạo, ví dụ câu do hàm tiêm dựng) ⇒ coi là câu ghi.
  2. Vé nối **cuối** lô ghi đầu tiên; kết quả của câu vé bị cắt khỏi mảng trả về. Bài: `kq[i]` theo vị trí không lệch (khuôn `orders/repository.ts:1383`).
  3. `.run()` lẻ và `INSERT … RETURNING` qua `.first()`/`.all()` ⇒ đi qua `batch([câu, vé])`, trả lại đúng hình. Câu đọc (`SELECT|WITH…SELECT|PRAGMA|EXPLAIN`) chạy thẳng.
  4. Chỉ lô ghi **đầu tiên** mang vé; đếm số lần ghi mỗi yêu cầu (cho H5).
  5. Lô đụng khoá chính `lg_lan_gui` ⇒ đặt cờ `dungVe`, ném lại lỗi gốc (mục 0), **từ chối** mọi lệnh ghi tiếp theo trong yêu cầu.
  6. (ở L4b) hàm tiêm nhận `env` đã bọc.
  7. Ranh giới: câu vé lấy từ `lan-gui` qua phần tiêm, không import.
- **Chế độ nghiêm `fakeD1`:** `batch` từ chối mọi câu **không** do chính `fakeD1` tạo (đánh dấu nội bộ). Nhờ vậy lỗi "quên gỡ bọc" đỏ ở khung thử, không chỉ lộ trên D1 thật. Bật mặc định; chạy `npm test` toàn bộ để thấy không bài cũ nào vỡ.
- **Đỏ trước:** từng bài bẫy trên `fakeD1` thật (SQLite). Đột biến bắt buộc: bỏ bước gỡ bọc ⇒ bài bẫy 1 đỏ **nhờ** chế độ nghiêm.
- **Lệnh:** `node --test src/shared/lan-gui-boc.test.ts` → `npm test` → `npm run typecheck`.

### L4b (L) — Router: bước 1–8, giai đoạn 1
- **Tệp:** `src/shared/router.ts` (`AppOptions.injected.lanGui` bắt buộc; chèn sau `:309`, trước `:312`); `src/index.ts` (tiêm bản thật); `src/shared/router.test.ts` (app dựng với phần tiêm cũ phải thêm `lanGui` giả, hoặc khẳng định bị từ chối — T18); `src/shared/lan-gui-mien.ts` (rỗng).
- **Việc** (đặc tả §3.3, ADR-94 đ3, đ6, đ7):
  - Chỉ áp cho `WRITE_METHODS` có `access ≠ public` và không nằm trong tệp miễn.
  - **Bước 1:** đọc `Idempotency-Key`.
    - Thiếu: `console.warn(JSON.stringify({ event: "thieu_ma_lan_gui", duong: "<METHOD> <mẫu route>" }))` rồi cho qua, không bọc (T14).
    - Sai dạng: 400 `ma_lan_gui_sai_dang`.
  - **Bước 2:** vân tay = HMAC của phương thức + **pathname + query string** (`url.pathname + url.search`) + thân, đọc từ `request.clone()` (đọc thân **một lần**; handler đọc bản gốc).
  - **Bước 3a–3d:** tra trước bằng `env` **gốc**. Phát lại thì gọi `tangLap` trong `exec.waitUntil`.
  - **Bước 4:** dựng `envBoc = { ...env, DB: bocDb(env.DB, …) }`. Truyền `envBoc` cho handler **và** cho mọi hàm tiêm gọi trong yêu cầu. `currentStaff`, `maintenanceBlock` giữ `env` gốc (đã chạy trước đó).
  - **Bước 5:** cờ `dungVe` ⇒ bỏ phản hồi của handler, tra lại vé, xử lý như 3a–3d.
  - **Bước 6:** có vé ⇒ `exec.waitUntil(capNhatKetQua(ma_tra, ma_loi khi 4xx, ket_qua = header Location))`.
  - **Bước 7:** handler trả lỗi mà không ghi vé ⇒ tra lại một lần.
  - **Bước 8:** handler ném ⇒ đã ghi vé thì lưu `ma_tra = 500` (nền), rồi ném tiếp cho khối bắt ngoài cùng (`:347`).
  - Phản hồi phát lại kèm header `Idempotent-Replayed: true`.
  - Thiếu `opts.injected.lanGui` ⇒ route ghi có đăng nhập trả 500 `server_misconfigured` (T18).
- **Đỏ trước — chụp TRƯỚC khi sửa router** (commit riêng trên nhánh, dán thông báo đỏ vào sổ):
  - các ca (a)–(j) của L5 trong `src/lan-gui-hanh-vi.test.ts` (đã gửi vé được nhờ khung thử L5 + `call()` nhận header). Trên mã chưa có router: ca (a) ra 2 đơn ⇒ đỏ;
  - `tests/e2e/chong-ghi-trung.mjs` (L11) chạy với vé ⇒ 2 dòng ở mỗi tình huống ⇒ đỏ, ghi số liệu;
  - `router.test.ts` với module giả (một route `POST` `staff`, một route `public`, một route trong tệp miễn): đếm lời gọi `lanGui.tra`; route public không gọi; thiếu `lanGui` ⇒ 500; thiếu vé ⇒ handler chạy + một dòng log.

  Vì vậy thứ tự commit là: khung thử L5 + bài L5 + e2e L11 (đỏ) → router (xanh). **Không** dùng cách "bỏ phần tiêm để tắt lớp": theo T18, bỏ phần tiêm ra 500, không ra 2 dòng.
- **Lệnh:** `node --test src/shared/router.test.ts` → `npm test` → `npm run typecheck` → `npm run test:e2e` **đủ bộ** (e2e chưa gửi vé ⇒ phải xanh như cũ: chứng minh giai đoạn 1 không phá gì).
- **Điểm dừng:** **kiểm độc lập vòng 1** (L1–L4b: dữ liệu + router). Qua thì báo điều phối: Đợt 1 bắt đầu được.

### L5 (M) — H1: hành vi qua router thật trên SQLite thật; R1/R2 thành hồi quy
- **Tệp:**
  - `tests/audit/harness.mjs`: `exec.waitUntil` **thu** promise, thêm `w.choNen()` để chờ hết. Promise vốn đã chạy, nên các bài cũ không đổi hành vi. `call()` nhận `headers["idempotency-key"]`.
  - `src/lan-gui-hanh-vi.test.ts` (mới, trong `npm test`).
  - `tests/audit/redteam.test.mjs:35-54`.
- **Thứ tự:** phần khung thử và các ca dưới đây viết và commit **trước** phần router của L4b; đó chính là bài đỏ của L4b. L5 sau L4b chỉ còn chuyển redteam và quan sát đột biến.
- **Móc chặn cho ca đồng thời:** `fakeD1` (SQLite) chạy tuần tự, nên hai yêu cầu có thể không cùng qua bước 3. Thêm một móc **chỉ cho khung thử** (rào: hai yêu cầu cùng qua bước tra trước rồi mới cho lô chạy), để ca (c), (e) tất định.
- **Ca:**
  - (a) `POST /api/orders` hai lần cùng vé ⇒ 1 đơn. Lần 2 trả 200 `da_ghi_truoc_do`, `ket_qua` = trang đơn, header `Idempotent-Replayed` (T2).
  - (b) cùng vé, khác thân ⇒ 422 `ma_lan_gui_khac_noi_dung`.
  - (c) đồng thời: `Promise.all` hai lần gọi cùng vé ⇒ 1 đơn.
  - (d) lỗi kiểm dữ liệu (400) ⇒ không có dòng vé; gửi lại thân đúng **cùng vé** chạy như mới. Thân khác ⇒ vé khác, theo quy tắc máy khách.
  - (e) **handler nuốt lỗi đụng vé** bằng route thật `POST /api/staff` (`:421`, `isUniqueViolation` → `PHONE_TAKEN`): hai lần đồng thời cùng vé ⇒ lần thua **không** nhận `phone_taken`, mà nhận "đã ghi".
  - (f) lô thua mà vẫn ghi vé (khuôn `LAST_ADMIN`, `PUT …/permissions` gỡ Quản trị cuối) ⇒ gửi lại nhận đúng 409 + mã lỗi cũ + câu cố định.
  - (g) T13: trigger RAISE ở lô nghiệp vụ ⇒ không vé.
  - (h) T16: đọc dòng vé, không có số điện thoại, tên, PIN; `duong` là mẫu.
  - (i) `POST /api/orders` có `newBooker` hai lần cùng vé ⇒ 1 hồ sơ (redteam R2).
  - (j) thiếu vé ⇒ 2 đơn + log `thieu_ma_lan_gui` (T14).
- **redteam:** R1, R2 giữ dạng "không gửi vé ⇒ FINDING (giai đoạn 1 cho qua)", thêm chú thích trỏ bài mới. Bài **hồi quy** thật nằm ở `src/lan-gui-hanh-vi.test.ts` (trong `npm test`), không nằm ở `tests/audit/` (ngoài `npm test`).
- **Quan sát chặn thật (H1):** tắt bước 3 (tra trước) **và** bỏ câu vé khỏi lô ⇒ ca (a), (c) đỏ (2 đơn) ⇒ hoàn nguyên. Bỏ **cả bước 5 lẫn bước 7** ⇒ ca (e) đỏ (lọt `phone_taken`). Chỉ bỏ bước 5 thì bước 7 vẫn cứu, nên không phải phép đột biến hợp lệ.
- **Lệnh:** `node --test src/lan-gui-hanh-vi.test.ts` → `node --test "tests/audit/*.test.mjs"` → `npm test`.

### L6 (S) — H2: phủ route + tệp miễn
- **Tệp:** `src/lan-gui-phu-route.test.ts` (mới); `src/shared/lan-gui-mien.ts`.
- **Luật bài:**
  - Bóc `route("METHOD","path","access",…)` ở `src/modules/*/index.ts` bằng bộ bóc của `src/route-write-guard.test.ts` (dùng lại, không chép).
  - Tập route ghi `access = "public"` phải **bằng đúng** 5 route `auth` đã biết (`/api/auth/login`, `/passkey/options`, `/passkey/login`, `/logout`, `/session-ended`) ∪ các mục trong tệp miễn có ghi `congKhai: true`.
  - Mỗi mục tệp miễn phải khớp một route thật và có `lyDo` không rỗng.
  - Router đọc **đúng** tệp này (import), kèm bài chạy: route trong tệp miễn không gọi `lanGui.tra`.
- **Quan sát chặn thật (T6):**
  - đổi `access` một route ghi (ví dụ `POST /api/feedback`) sang `public` ⇒ đỏ ⇒ hoàn nguyên;
  - thêm mục miễn `POST /api/khong-co` ⇒ đỏ ⇒ hoàn nguyên.
- **Lệnh:** `node --test src/lan-gui-phu-route.test.ts` → `npm test`.

### L7 (M) — `Location` cho route 201 (A-10) + H7
- **Tệp:** các `src/modules/*/index.ts` trong danh sách L0 (28 chỗ ở 8 module + dạng khác); `src/shared/lan-gui-ket-qua.ts` (route tạo mà trả 200 ⇒ "phát lại = tải lại", có lý do); `src/lan-gui-location.test.ts`; `tests/e2e/lib.mjs` (`call()` khẳng định 201 ⇒ có `Location`).
- **Luật:**
  - `Location` là đường dẫn trang **nội bộ, chỉ chứa id**, qua `safeNext` hợp lệ.
  - Lệnh ghi lên một đơn (lần thu, hoàn…) trỏ **trang đơn**.
  - Không đặt tên, SĐT hay chữ người dùng vào đường dẫn.
  - Dùng tham số `headers` của `json()` (`src/shared/http.ts:6`).
- **Đỏ trước:**
  - bài khung thử gọi một lượt mọi route tạo có trong khung thử, thu mọi phản hồi 201, khẳng định có `Location` khớp `^/[a-z0-9-]+(\?[a-z]+=[A-Za-z0-9-]+)?$`;
  - bài tĩnh: mỗi mục `lan-gui-ket-qua.ts` là route thật.

  Đỏ vì hôm nay không route nào gửi `Location`.
- **Quan sát chặn thật (H7):** bỏ `Location` ở `POST /api/orders` ⇒ đỏ ⇒ hoàn nguyên.
- **Lệnh:** `node --test src/lan-gui-location.test.ts` → `npm test` → `npm run typecheck` → `npm run test:e2e` đủ bộ (bắt nốt 201 ngoài khung thử).

### L8 (M) — Mô-đun vòng đời vé (thuần) + H4
- **Tệp:** `src/shared/lan-gui-ve.ts`, `src/shared/lan-gui-ve.test.ts`; `src/shared/lan-gui-bi-mat.ts` + bài "mục là route có thật".
  - Danh sách bí mật: `POST /api/account/change-pin`, `POST /api/account/pin-by-passkey`, `POST /api/staff/:id/reset-pin`, `/api/parties/:id/documents*`.
- **Nội dung** (đặc tả §3.2, ADR-94 đ5):
  - `moVe(dau)`: dùng lại vé đang mở, hoặc sinh `crypto.randomUUID()` và ghi **trước** khi gửi.
  - `dongVe` khi 2xx, khi 4xx trừ `409 dang_xu_ly`, và khi nhận `da_ghi_truoc_do`.
  - `giuVe` khi mất mạng, hết giờ, 5xx.
  - Kho lưu tiêm vào (`localStorage` thật hoặc giả; lỗi ⇒ bộ nhớ trang). Khoá `lg:<staffId>`; hạn 24 giờ; tối đa 50 mục. Mục chỉ chứa mã băm SHA-256 của **đúng chuỗi sẽ gửi** (phương thức + đường dẫn + `JSON.stringify(body)`).
  - Route bí mật ⇒ chỉ bộ nhớ trang.
- **Đỏ trước:**
  - **H4 / T4:** hai lần ghi thật giống hệt nhau, lần 1 nhận 201 ⇒ lần 2 có **vé khác**.
  - Lần 1 mất mạng ⇒ lần 2 **cùng vé**.
  - 5xx ⇒ giữ; 422 ⇒ đóng; 409 `dang_xu_ly` ⇒ giữ.
  - Mục quá 24 giờ bị bỏ; mục thứ 51 đẩy mục cũ nhất.
  - Route bí mật không bao giờ chạm kho lưu (T16).
  - "Tải lại trang" (kho giả còn nguyên) ⇒ cùng vé (máy cho T3).
- **Quan sát chặn thật (H4):** sửa `dongVe` không đóng khi 2xx ⇒ bài H4 đỏ ⇒ hoàn nguyên.
- **Lệnh:** `node --test src/shared/lan-gui-ve.test.ts` → `npm test` → `npm run typecheck` (`tsc -p web` cũng kiểm vì `web/` sẽ import).

### L9 (M) — `web/api.ts` + `web/dieu-phoi-ui.ts:32` + H3
- **Tệp:** `web/api.ts` (`:76-118`), `web/shell.ts` (báo id người đăng nhập cho `api.ts` sau `/api/auth/me`), `web/dieu-phoi-ui.ts:32`, `src/lan-gui-giao-dien.test.ts` (H3, khuôn `src/giao-dien-hoi-bang-quyen.test.ts`).
- **Việc:**
  - `api()` với phương thức ghi:
    - gọi `lan-gui-ve.ts` ⇒ header `Idempotency-Key`;
    - xử lý `409 dang_xu_ly`: chờ 1–2 giây, gửi lại cùng vé, tối đa 3 lần, rồi báo "Đang xử lý, chờ chút rồi bấm lại";
    - xử lý phản hồi có `Idempotent-Replayed` + `da_ghi_truoc_do`: hiện "Lần bấm trước đã được ghi", rồi `location.replace(safeNext(ket_qua))`, hoặc tải lại khi `null`/không hợp lệ (T19). Trả promise treo như `goLogin()` (`:58-64`), để màn gọi không nhận thân này.
  - **Id người đăng nhập:** `api.ts` công bố `datNguoiDangNhap(id)`; `initShell()` gọi sau `/api/auth/me`.
    - Trước khi biết id: vé chỉ ở bộ nhớ trang (an toàn, có thể mất khi iOS tắt Nền tảng trong vài trăm mili-giây đầu).
    - `goLogin()` **không** xoá vé (đặc tả §3.2 mục 7).
  - `dieu-phoi-ui.ts:32`: giữ `lenh` khi `ApiError` có `status >= 500` hoặc mã `dang_xu_ly`; chỉ bỏ khi 2xx/4xx (đ10).
  - **H3:** bài tĩnh. Mọi `fetch(` trong `web/` có phương thức ghi phải nằm trong danh sách đã biết:
    - `web/api.ts:48` (`session-ended`, công khai);
    - `web/api.ts:87` (chính `api()`, gắn vé);
    - `web/maintenance-screen.ts:92` (`logout`, công khai).
- **Đỏ trước:** H3 với `fetch("/api/x",{method:"POST"})` cố ý thêm vào một tệp `web/` ⇒ đỏ ⇒ hoàn nguyên. Bài thuần cho nhánh `dieu-phoi-ui` (hàm giữ/bỏ tách ra cho test được).
- **Lệnh:** `npm run typecheck` → `npm test` → `npm run build:web` → `npm run test:e2e -- pwa bangtin`.
- **Kịch bản Chrome theo `web/CLAUDE.md`:**
  - `v1-bao-tri.mjs` (phần bảo trì của `web/api.ts`);
  - `bang-tin-smoke.mjs` (`vuaLamBoiTabNay` trong `web/api.ts`);
  - ba kịch bản điều phối `dieu-phoi-smoke.mjs`, `chuyen-sua-smoke.mjs`, `chuyen-smoke.mjs` (chạm `web/dieu-phoi-ui.ts`);
  - `cuoc-smoke.mjs` (có mất mạng CDP);
  - ba `a2-smoke-*.mjs` (lập đơn).
  - **Thêm** một kịch bản `docs/evidence/2026-10-xx-lop-ve/kich-ban/lop-ve-smoke.mjs`:
    - T1: CDP offline sau khi bấm "Ghi lần thu", rồi online, bấm lại ⇒ một lần thu + câu báo;
    - T2: bấm đúp "Lập đơn" ⇒ một đơn;
    - 390 + 1040.

### L10 (S) — `tests/e2e/lib.mjs` tự gắn vé
- **Ghi chú thứ tự:** phần "nhận tham số vé" đã làm ở L3 (để chụp bài đỏ). Ở đây làm phần còn lại: mặc định gắn vé, `veTrong`, đếm `thieu_ma_lan_gui`.
- **Tệp:** `tests/e2e/lib.mjs:41-49`.
- **Việc:** `call()` mặc định gắn **vé mới mỗi lần gọi**, nên ngữ nghĩa e2e cũ giữ nguyên. Thêm tham số vé tường minh cho bài chống trùng; tham số `veTrong: true` để thử T14.
- **Lệnh:** `npm run test:e2e` đủ bộ. Đếm log `thieu_ma_lan_gui` của máy chủ e2e: chỉ còn các lời gọi `fetch` thẳng ở 8 tệp, ghi danh sách vào sổ cho bản siết.

### L11 (M) — T12: kịch bản F-02 thành e2e trong kho
- **Tệp:** `tests/e2e/chong-ghi-trung.mjs` (mới), `tests/e2e/run.mjs` (thêm vào `ALL`).
- **Nguồn** (ngoài kho, chỉ đọc):
  - `~/Documents/danh-gia-ux/2026-10-01/kich-ban/nhom-2.mjs:171` (11), `:218` (12), `:253` (13);
  - `vai-hd.mjs:565` (HD10). **Sửa sau vòng đối chiếu:** lấy nhánh **"Ghi lần thu"** gửi lại (lỗi thật: đã thu 400.000). **Không** lấy `/delivered` kèm thu: nhánh đó đã chống lặp đúng (409), nên không đỏ trước;
  - `vai-kt.mjs:284` (KT03: `/api/ledger/refunds`), `:332` (KT04: `/api/ledger/settlements`, `/api/ledger/adjustments`).
- **Ca:** mỗi tình huống gửi **hai lần cùng vé** ⇒ đúng một dòng nghiệp vụ, lần 2 nhận 200 `da_ghi_truoc_do`. Kèm:
  - T4: hai lần thu thật, vé khác ⇒ 2 dòng;
  - T5: đổi số tiền ⇒ vé khác ⇒ lớp không chặn;
  - đồng thời: `Promise.all` cùng vé ⇒ 1 dòng. **Không phải tình huống 15**: tình huống 15 là "xác nhận dựa trên bản cũ", thuộc gốc R9, Đợt 4;
  - **Lưu ý:** bản **không vé** của kịch bản gốc và redteam R1/R2 vẫn ra 2 bản ghi ở giai đoạn 1. Chúng chỉ là tiêu chí của **bản siết**;
  - 422 khác thân.

  Mỗi ca đọc lại số dòng bằng API, kèm `audit-invariants` cuối bộ.
- **Đỏ trước:** viết tệp **trước** phần router của L4b; chạy trên commit đó ⇒ 2 dòng mỗi tình huống ⇒ đỏ. Ghi số liệu vào sổ. (Không dùng cách bỏ phần tiêm: T18 làm nó ra 500.)
- **Lệnh:** `npm run test:e2e -- chong-ghi-trung` → đủ bộ.

### L12 (M) — H5: đo ghi nhiều lần + trả nợ route lõi F-02 (T17)
- **Tệp:** `src/shared/lan-gui-boc.ts` (log `lan_gui_ghi_nhieu_lan` + mẫu route, khi > 1 lần ghi), `src/shared/lan-gui-no.ts` (danh sách nợ có tên + lý do), `tests/e2e/run.mjs` (thu stdout của `wrangler dev`, cuối bộ đối chiếu với danh sách nợ), `src/modules/orders/index.ts:672, :738`.
- **Hạt giống nợ** (§3):
  - `POST /api/staff/:id/reset-pin` (lô rồi `unlockPhone`);
  - `POST /api/staff/:id/unlock` (kiểm lại: có thể chỉ một lần ghi);
  - `PUT /api/staff/:id/roles` nhánh `guarded`;
  - `PUT /api/staff/:id/permissions` nhánh `guarded`.

  Khi vé ở lô đầu và lô sau hỏng, người dùng nhận "đã ghi" nhưng phần sau chưa ghi. Chấp nhận ở giai đoạn 1, ghi nợ, trả trước bản siết.
- **Bắt buộc trả trước khi phát hành (T17):** `demThanCu` ở `POST /api/orders` và lưu nháp.
  - Hôm nay nó ghi bằng `.run()` **trước** lô chính, nên sẽ **ăn vé**.
  - Cách: đăng ký câu đếm là "ngoài vé" (tên cố định trong `lan-gui-no.ts`, bộ bọc chạy thẳng không gắn vé) **hoặc** nối nó vào lô chính. Người thi công chọn, ghi lý do.
  - **Đỏ trước:** ca khung thử: thân kiểu cũ + ép lô chính hỏng ⇒ gửi lại hôm nay nhận "đã ghi" (sai) ⇒ sửa ⇒ chạy như mới.
  - Rà thêm mọi route của đợt hạn F-02 (lập đơn, ghi lần thu, Đã giao kèm thu, Công ty đã nhận, hoàn, nộp/trả, điều chỉnh): không route nào được có ghi phụ **trước** lô chính.
- **Quan sát chặn thật (H5):** xoá một mục khỏi danh sách nợ ⇒ e2e cuối bộ đỏ, nêu tên route ⇒ hoàn nguyên.
- **Lệnh:** `npm test` → `npm run test:e2e` đủ bộ.

### L13 (S) — Cổng kiểm khoá trong `npm run trien-khai` (ADR-94 đ4)
- **Tệp:** `scripts/release-lib.mjs` (`trienKhai` `:218`, sau `wrangler whoami` `:236`, **trước** mọi bước ghi), `src/release-lib.test.ts`, `docs/QUY-TRINH-PHAT-HANH.md`, `docs/HANDOFF-N1.md` (runbook).
- **Việc:** chạy `npx wrangler secret list` (chỉ đọc, `CI=1`); phân tích tên; thiếu `LAN_GUI_SECRET` (hoặc thiếu `SESSION_SECRET`) ⇒ dừng, mã thoát ≠ 0, câu lời thường "Chưa đặt khoá … — chạy `npx wrangler secret put LAN_GUI_SECRET` rồi chạy lại".
- **Đỏ trước:** bài với `run` giả trả danh sách thiếu tên ⇒ `trienKhai` phải dừng trước bước migration/deploy (đếm lời gọi `run`).
- **Quan sát chặn thật:** bằng **hàm giả** (hook cấm AI chạy `wrangler secret …`). Lần chạy thật đầu tiên là của chủ.
- **Lệnh:** `node --test src/release-lib.test.ts` → `npm test` → `npm run typecheck`. **Không** chạy `npm run trien-khai` (cấm).

### L14 (S) — Tài liệu, sổ hàng rào, dòng trỏ
- **Tệp:**
  - `docs/SYSTEM-DESIGN.md` (§3–§4: một request ghi đi qua lớp vé; §5: hai bảng `lg_*`);
  - `docs/CHANGE-GUIDE.md`: công thức "thêm route ghi" (201 phải có `Location`; một lô; thân chứa bí mật ⇒ thêm vào `lan-gui-bi-mat.ts`; không nhét trường đổi theo từng lần gửi vào thân; không ghi phụ trước lô chính); dòng ma trận §3 cho các tệp `lan-gui*`;
  - `docs/SO-HANG-RAO.md`: dòng H1, H2, H3, H4, H5, H6, H7, H9 (phần CSDL), cổng khoá L13, mỗi dòng có ngày + thông báo đỏ đã chép;
  - `src/shared/changelog.ts` (mục phiên bản, số đánh lúc gộp);
  - `docs/quyen-hoan.json` F-02 `ke_hoach`: thêm trỏ tới kế hoạch này (không đóng);
  - dòng trỏ "đã thay bởi ADR-0094" ở đầu `docs/superpowers/specs/2026-09-22-chong-gui-trung.md` và tệp Oracle 2026-10-02 (ADR-94 bảng "Thay câu nào"; đây là đặc tả, không phải ADR).
- **Đề xuất cho chủ, không tự sửa (N9):**
  - diff `CLAUDE.md` §7/§10 (một dòng: lớp vé, khoá `LAN_GUI_SECRET`);
  - diff Hiến chương Phần I: K17 (A-8), lệch hẹp dòng 5.5. Ngoại lệ thứ hai cho "không xoá cứng" chỉ vào ở **bản sau**.

  Đặt ở `docs/superpowers/plans/2026-10-0x-dot-0-de-xuat-luat.md`.
- **Lệnh:** `npm run dict` (nếu chưa) → `npm test` → `npm run typecheck`.

### L15 — Kiểm độc lập vòng 2 (bắt buộc)
Subagent `nguoi-kiem-doc-lap`, chỉ đọc. Việc:
- tự chạy `npm test`, `npm run typecheck`, `npm run test:e2e` đủ bộ (đuôi `audit-invariants`);
- đối chiếu T1–T6, T11 (CSDL), T12–T19;
- soát bảy bẫy §3.5 trên mã thật;
- thử lại các phép đột biến của H1–H7, H9;
- đọc `localStorage` và dòng vé tìm dữ liệu cá nhân;
- xác nhận `canManageAccount` và ba cơ chế cũ không đổi.

Báo cáo vào sổ thi công. Có chỗ chặn thì sửa rồi kiểm lại.

### L16 — Việc của chủ (luồng L), theo thứ tự
1. **Trước mọi triển khai mang lớp này:** đặt khoá, chạy ở thư mục kho gốc, trong Terminal thật:
   ```
   openssl rand -base64 48 | tr -d '\n'
   ```
   rồi
   ```
   npx wrangler secret put LAN_GUI_SECRET
   ```
   (dán chuỗi vừa tạo). Thêm cùng tên vào `.dev.vars` của máy mình.
2. `npm run day-len -- <nhánh>`. AI đưa **một lần**, kèm dòng "chạy npm run trien-khai".
3. `npm run trien-khai`. Có migration `0074`, nên Worker cũ không lùi được qua migration. Cổng L13 tự kiểm khoá.
4. Sau triển khai:
   - AI kiểm bằng GET công khai + `kiem-phien-ban.mjs --sau-deploy` (có trong `trien-khai`) và `audit-invariants --db remote` (chỉ đọc).
   - Đếm `thieu_ma_lan_gui`: chủ xem nhật ký Worker. Lệnh chỉ đọc, AI soạn.
5. Kịch bản ghi dữ liệu **không** chạy trên production (cấm AI ghi production). T12 đạt = e2e `chong-ghi-trung` xanh trên bản đúng commit đã triển khai + kiểm sau deploy đạt.
6. **T3 (iPhone thật):** chủ lập đơn, tắt mạng ngay sau khi bấm, vuốt tắt Nền tảng, mở lại, bật mạng, bấm lại ⇒ một đơn, mở trang đơn.
7. Đủ 3 + 4 + 5 (và chủ trả lời câu C1) ⇒ AI xoá mục F-02 khỏi `docs/quyen-hoan.json` kèm dòng lịch sử, commit, chủ day-len (không cần triển khai).

---

## 8. Bảng hàng rào (mỗi dòng một dòng `docs/SO-HANG-RAO.md`)

| # | Task | Phép đột biến (sửa cố ý → đỏ → hoàn nguyên) | Đợt |
|---|---|---|---|
| H1 | L5 | bỏ tra trước + bỏ câu vé ⇒ 2 đơn; bỏ bước 5 **và** bước 7 ⇒ `phone_taken` lọt ra | 0 |
| H2 | L6 | route ghi sang `public`; mục miễn ma | 0 |
| H3 | L9 | `fetch` POST thẳng trong `web/` | 0 |
| H4 | L8 (+ ca e2e L11 T4) | `dongVe` không đóng khi 2xx | 0 |
| H5 | L12 | xoá một mục nợ | 0 |
| H6 | L2 | câu `DELETE FROM lg_lan_gui` tạm trong `lan-gui` ⇒ R-N1-9 đỏ. Nửa "ngoại lệ thừa" ở bản sau | 0 (một nửa) |
| H7 | L7 | bỏ `Location` ở `POST /api/orders` | 0 |
| H8 | bản sau | câu dọn bỏ điều kiện sàn | sau |
| H9 | L1 (CSDL); máy chủ ở bản sau | `CHECK >= 1` | 0 (một nửa) |
| H10 | bản sau | gọi hàm xoá từ một route | sau |
| Cổng khoá | L13 | `run` giả thiếu tên khoá | 0 |
| Quyền tiền | Q5 | bỏ kiểm ở reset-pin; trả `superAdminOnly` về `false` | 0 |
| Chế độ nghiêm `fakeD1` | L4a | bỏ bước gỡ bọc | 0 (hàng rào khung thử, ghi dòng riêng) |

---

## 9. Việc của chủ (tách khỏi việc AI)

| # | Việc | Khi nào | Luồng |
|---|---|---|---|
| 1 | Trả lời các câu ở §13 (C1, C2) | sớm, không chặn L0–L4b, Q0–Q3 | — |
| 2 | Day-len + triển khai bản quyền tiền | sau Q6 đạt | Q |
| 3 | `wrangler secret put LAN_GUI_SECRET` + thêm vào `.dev.vars` | **trước** bước 4 | L |
| 4 | Day-len + triển khai bản mở rộng | sau L15 đạt | L |
| 5 | Thử T3 trên iPhone thật | sau bước 4 | L |
| 6 | Duyệt (hoặc bác) đề xuất sửa `CLAUDE.md` / Hiến chương (K17, dòng 5.5) | bất kỳ lúc nào | L |
| 7 | Gia hạn F-02 bằng diff có lý do, **chỉ nếu** trượt quá 12/10 | khi AI báo | L |

---

## 10. Người kiểm độc lập

| Điểm | Phạm vi | Bắt buộc vì |
|---|---|---|
| Q6 | toàn luồng Q | quyền |
| L4b (vòng 1) | migration, module, khoá, bộ bọc, router | dữ liệu + luật + mọi route ghi; mở đường cho Đợt 1 |
| L15 (vòng 2) | toàn bản mở rộng | như trên + giao diện + cổng triển khai |
| Đóng F-02 | đọc bằng chứng L16 bước 3–5 | dừng dây chuyền (CLAUDE.md §3) |

Người thi công **không** tự báo "đạt" (N8). Báo cáo cuối cho chủ ghi rõ đã có người kiểm chưa.

---

## 11. Sau Đợt 0

### 11.1 Bản sau (A-11), trước ngày thứ 90 kể từ bản mở rộng
- **Điều kiện vào:** bản mở rộng đã lên production. Ghi ngày lên production vào sổ, cộng 90 ngày thành hạn trong `docs/quyen-hoan.json` (nếu chủ muốn có hạn máy canh).
- **Việc:**
  - route đọc/ghi thời hạn (`can(…, "settings.ops")`, A-2), màn "Thời hạn giữ vé" + ô Trang chủ ẩn/hiện bằng `can()` (T7);
  - lựa chọn 90/180/365/730/Không dọn (A-3), xác nhận khi rút ngắn (đ8d), chờ 7 ngày (A-4, T8, T9);
  - nhật ký `lan_gui_thoi_han_changed` + `lan_gui_ve_da_don` vào `SILENT_AUDIT_ACTIONS` (A-7);
  - Cron trong `waitUntil` **riêng** ở `src/index.ts:177-178`, khung [02:00, 02:15) giờ Việt Nam, lô ≤ 5.000, ≤ 50 lô (A-5, T10, T11);
  - ngoại lệ `XOA_CUNG_VE_HET_HAN` cạnh `XOA_CUNG_NHAP` (`src/architecture.test.ts:155`) + sửa bài "chỉ co lại" (`:796`). Đây là **nới**, đã có duyệt của ADR-94 đ8e; ghi rõ trong commit;
  - H8, H10, nửa sau của H6 và H9.
- **Phải thử trước trên D1 local (`wrangler dev`, không chỉ SQLite):** câu `DELETE … WHERE (staff_id, khoa) IN (SELECT … LIMIT ?)` và cách lấy số dòng đã xoá (`changes()` trong câu nhật ký cùng lô). Xem §12.

### 11.2 Bản siết (đ7 giai đoạn 2)
- **Điều kiện vào** (đủ cả hai, chủ ra lệnh):
  - (a) cột "Đăng nhập gần nhất" cho thấy mọi người đã dùng bản mới;
  - (b) `thieu_ma_lan_gui` = 0 trong **7** ngày liên tiếp (A-6).
- **Việc:**
  - router: thiếu vé ⇒ 400 "Nền tảng cần tải lại để dùng bản mới";
  - rà 8 tệp e2e gọi `fetch` thẳng (§3);
  - trả hết nợ H5;
  - cân nhắc gộp ba cơ chế cũ (đ10).

---

## 12. Rủi ro

| Rủi ro | Mức | Chặn bằng |
|---|---|---|
| Quên gỡ bọc ⇒ D1 thật từ chối mọi lô, trong khi khung thử vẫn xanh | **cao** | chế độ nghiêm `fakeD1` (L4a) + e2e đủ bộ trên `wrangler dev` (L4b) |
| Ghi phụ trước lô chính ăn vé ⇒ báo nhầm "đã ghi", **mất đơn** | **cao** | T17, L12 (trả nợ `demThanCu` trước phát hành); rà route đợt hạn |
| Thiếu khoá lúc triển khai ⇒ mọi API 500 | cao | L13 cổng chỉ-đọc + L16 bước 1 |
| Quên thêm khoá vào một nơi dựng env ⇒ bài khung thử 500 hàng loạt | vừa | L3 gom một task, chạy `npm test` toàn bộ |
| Màn nhét trường đổi theo lần gửi vào thân ⇒ mất chống trùng lặng lẽ | vừa | đ10 sửa Vận chuyển; H1 ca màn thật (Chrome `lop-ve-smoke`); công thức CHANGE-GUIDE |
| Phát lại khi người gửi đã mất quyền ⇒ chỉ nhận "đã ghi" + đường dẫn | thấp | trang đích tự kiểm quyền (trang ghép ADR-94) |
| `api()` chưa biết id người đăng nhập ở lời gọi sớm ⇒ vé chỉ ở bộ nhớ trang | thấp | chấp nhận (ghi trong sổ) |
| Đụng Đợt 1 (cùng `billing`, `orders`) | vừa | Đợt 1 tách nhánh sau L4b; L7 (`Location`) đụng `billing/index.ts` ⇒ gộp L7 trước khi Đợt 1 sửa cùng route, hoặc Đợt 1 tự thêm `Location` theo công thức mới |
| Trượt hạn 15/10 | vừa | lịch §5; báo chủ ngày 12/10 nếu kiểm vòng 2 chưa đạt |
| Đổi `ACCOUNTANT.superAdminOnly` làm đỏ e2e/Chrome đang dùng Quản trị thao tác Kế toán | thấp | Q0 rà trước, sửa bài theo luật mới, ghi từng chỗ |

---

## 13. Câu cần chủ quyết — CHỜ CHỦ (C1, C2)

> Phiên lập kế hoạch từng áp khuyến nghị cho C1, C2. **Vòng đối chiếu độc lập chỉ ra không được tự áp**:
> - C1 là xung đột giữa hai văn bản chuẩn tắc: ADR-0094 A-9 và trường `ke_hoach` của F-02 trong sổ dừng dây chuyền. CLAUDE.md §2 đòi dừng và hỏi.
> - C2 đổi chữ ADR-0090 đ4.
>
> Hai câu nay **chờ chủ**: câu (e), (f) ở lộ trình `00-lo-trinh.md`.
> - **Không chặn L0–L11, Q0–Q3.**
> - C1 chỉ chặn bước **đóng** F-02.
> - C2 chỉ chặn Q4 (tin cho Toàn quyền).
>
> Thông báo P18 bên dưới (Quản trị không gỡ được vai Kế toán) đã báo chủ trong phiên.

Nội dung gốc (giữ để truy vết):

- **C1. Khi nào đóng F-02.**
  - ADR-94 A-9: đóng khi **bản mở rộng** lên production **và** T12 đạt.
  - Trường `ke_hoach` của F-02 trong `docs/quyen-hoan.json` lại ghi: đợt hạn 15/10 phải gồm cả các lệnh **mới** của ADR-0089 (duyệt hoàn, chi hoàn cọc) và "Thay lần thu" của ADR-0088. ADR-0088 vẫn **proposed**.
  - Các route đó chưa tồn tại. Khi viết ra, chúng **tự** đi qua router (H2 canh).
  - **(A, khuyến nghị)** Đóng theo A-9. Đợt 1 thêm một ca e2e "gửi lặp cùng vé" cho duyệt hoàn / chi hoàn.
  - (B) Giữ F-02 mở tới khi Đợt 1 lên production. Cùng hạn 15/10 với TNV-G1, nên dễ phải gia hạn.
- **C2. ADR-90 đ3: tin "Quản trị ngưng tài khoản Kế toán" vào "Của tôi" của Toàn quyền.**
  - "Của tôi" hôm nay chỉ dựng từ sự kiện **đơn** (`v_aud_order_event`). Có ba cách:
    - **(A, khuyến nghị)** Thêm một view nhật ký tài khoản trong module `audit`. `thongbao` đã có cạnh tới `audit`, nên không nới ranh giới. Cần **một migration** (số kế tiếp sau `0074`). Việc này trái câu "không migration" của ADR-90 đ4, nên cần chủ đồng ý một dòng ghi bổ sung.
    - (B) Gửi bằng thông báo hệ thống (`ntf_notice`) từ `accounts`. Cần cạnh `accounts → thongbao`, tức là nới hàng rào ranh giới (Điều 9.4).
    - (C) Tạm bỏ tin, chỉ giữ nhật ký. Rủi ro: Toàn quyền không biết người duyệt tiền vừa bị ngưng.
- **Thông báo (không phải câu hỏi, P18):** Quản trị sẽ không **gỡ** được vai Kế toán nữa, không chỉ không cấp. Đây là hệ quả của dòng LC-4 trong ADR-90 ("cấp hoặc gỡ").

---

## 14. Điều chưa kiểm (ghi để không trình bày như sự thật)

1. Dạng câu `DELETE FROM lg_lan_gui WHERE (staff_id, khoa) IN (SELECT staff_id, khoa … ORDER BY created_at LIMIT ?)` trên **D1** (row-value `IN` + `LIMIT` trong câu con). Mới chạy trên SQLite cục bộ. Thuộc bản sau.
2. `changes()` **sau một `DELETE` có câu con**, dùng làm **giá trị** ghi vào nhật ký cùng lô. Trên production mới chứng minh dạng điều kiện `WHERE changes() > 0` (`src/modules/accounts/index.ts` — `adminAudit(…, "changes() > 0")`). Thuộc bản sau.
3. **Chữ lỗi chính xác** của D1 khi đụng khoá chính `lg_lan_gui` (đụng vé). Bộ bọc nhận diện bằng chữ đó. Phải ghi lại trên `wrangler dev` (L4b) và có bài ghim. SQLite cục bộ có thể khác D1.
4. Worker có huỷ việc đang làm khi máy khách ngắt kết nối không (đặc tả §8 mục 1). Thiết kế chịu được cả hai; bước 6 chạy trong `waitUntil`.
5. Giới hạn thời gian chạy Cron với 50 lô (A-5): chưa đo. Bản sau.
6. Dung lượng thật mỗi vé trên D1 (~0,45–0,55 KB đo trên SQLite) và số lệnh ghi mỗi ngày. Đo sau 30 ngày chạy thật bằng lệnh chỉ đọc do chủ chạy.
7. Số route ghi nhiều lần thật sự: chỉ có hạt giống ở §3, chưa đo đủ (L12 đo).
8. Danh sách đầy đủ "route tạo mà trả 200": chưa lập (L0).
9. `web/sessions.ts` có đọc đúng cờ `datLaiPinDuoc` ở mọi nút không: chưa đọc hết (Q3).
10. `tests/e2e/roles.mjs`, `admin.mjs`, `permissions.mjs` có ca nào dùng Quản trị / Nhân sự với Kế toán: mới thấy `roles.mjs:13` (dùng `SUPER`); chưa rà hết (Q0).
11. Kịch bản ngoài kho chưa đọc trọn: mới định vị dòng bắt đầu và route dùng của 11, 12, 13, HD10, KT03, KT04, QT04.
12. T3 cần iPhone thật. Máy chỉ mô phỏng được bằng kho lưu giả.
13. Số `0074` đúng tại 2026-10-02 theo commit và thư mục worktree. Nhánh ở máy khác hoặc chưa fetch thì không thấy.
