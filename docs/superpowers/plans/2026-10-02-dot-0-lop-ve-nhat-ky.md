# Đợt 0 — luồng L (ADR-0094, bản mở rộng): sổ thi công

> **Vai:** thi công (Hiến pháp P15). Không lập kế hoạch lại, không tự nghiệm thu (N8). Kế hoạch: `2026-10-02-khac-phuc-audit-01-dot-0-chong-ghi-trung-quyen-tien.md` §7.
> **Nhánh / worktree:** `worktree-dot-0-luong-l` ở `.claude/worktrees/dot-0-luong-l`, tách từ `main` cục bộ `df6bc864` (chưa lên `origin/main`: nhánh mang theo cả các commit kế hoạch + gia hạn TNV-G1 của `gia-han-tnv-g1`).
> **Xây trên lỗ đang hở: F-02** (HIGH, hạn 2026-10-15, `docs/quyen-hoan.json`). Lớp này là cách vá. Nếu tới 12/10 kiểm độc lập vòng 2 chưa ĐẠT → báo chủ ngay.

## TRẠNG THÁI HIỆN TẠI — phiên sau đọc mục này trước (cập nhật 2026-10-02, commit `b604a937`)
- **XONG, đừng làm lại:** L0–L14 (checklist mục 1 đã đánh `[x]` cùng commit), "commit bài đỏ trước", kiểm độc lập vòng 1 **ĐẠT** + đã xử lý phát hiện N1/N2/G1/G5, vá 401 giữ vé, kịch bản Chrome (`lop-ve-smoke` 6/6; 7 kịch bản đỏ có sẵn GIỐNG nền `df6bc864`), sửa kiểm kiểu đỏ. Hàng rào H1–H7, H9 (CSDL), D1 giả nghiêm, T17, cổng khoá L13 đều có dòng ngày ở `docs/SO-HANG-RAO.md`.
- **Số đo cuối (đo bằng mã thoát):** `npm run typecheck` 0; `npm test` 2886/2886 + bài đo giờ; `build:web` 0; e2e đủ bộ 45/45 (chạy trên `b158fd4a`+; sau đó chỉ đổi `web/` + kiểu ⇒ chưa chạy lại e2e trên `b604a937`).
- **Vòng 2 (L15):** lần 1 trên `b604a937` = **KHÔNG ĐẠT** (1 CHẶN: PIN lộ ra localStorage qua `POST /api/account/passkeys/options`) — ĐÃ SỬA, xem mục "Kiểm độc lập vòng 2 — lần 1" cuối sổ. **ĐANG CHỜ** người kiểm xem lại phần sửa. Phiên sau: nếu không thấy mục "Kiểm độc lập vòng 2 — ĐẠT" bên dưới thì giao người kiểm xem lại `git diff b604a937 <đầu nhánh>` (không làm lại thi công).
- **Sau khi vòng 2 ĐẠT:** đánh `[x]` L15 ở checklist; đo lại số migration (mục "Việc phải làm LÚC GỘP"); đưa chủ MỘT lần `npm run day-len -- worktree-dot-0-luong-l` rồi `npm run trien-khai` (cần triển khai: migration 0074 + mã). Kiểm số phiên bản 1.71 lúc gộp.
- **Việc của chủ (không phải AI):** L16 (thử iPhone thật T3 sau triển khai); duyệt đề xuất luật `2026-10-02-dot-0-de-xuat-luat.md` ("duyệt 1–3"). Sau triển khai AI chạy lại T12 rồi mới đóng F-02 ở `docs/quyen-hoan.json`.
- **Chưa quan sát trên production:** chữ lỗi D1 khi đụng vé (N2) — mới thấy trên D1 local của `wrangler dev`.
- **`main` đã đi trước (đo 2026-10-02):** `main` = `667d3704`, luồng Q + Trang chủ 1.73 đã gộp và ĐÃ LÊN PRODUCTION bản **1.74**, migration `0075_tin_tai_khoan` ĐÃ ÁP remote. ⇒ Luồng L là nhánh gộp SAU: trước day-len phải gộp `main` vào nhánh, đánh lại nhật ký **1.71 → 1.75** (+ bài ghim `app-info.test.ts`), chạy lại H2 (số cứng 129), H5 (e2e đủ bộ), H7, typecheck + `npm test`; nếu có sửa mã sau gộp thì cho người kiểm xem phần chênh. `0074` áp SAU `0075` vẫn được (wrangler theo dõi theo TÊN tệp) — kiểm lại bằng `src/migrations-*.test.ts` sau gộp.
- **Ngoài phạm vi lượt này:** màn "Thời hạn giữ vé", Cron dọn, bản nghiêm (A-11; bài không-vé + redteam R1/R2 chỉ xanh ở bản nghiêm).

## Giữ chỗ số migration — **`0074_lan_gui.sql`** (đã lấy 2026-10-02)

Đo lại ở L0 (2026-10-02):
- `ls migrations` (main cục bộ `df6bc864`): lớn nhất `0070_tin_chuyen.sql`.
- `git log --all --name-only -- 'migrations/007*' 'migrations/008*'`: `0070_tin_chuyen`, `0071_khung_ban_gio_lai`, `0072_vc_bang_gia_thue`, `0073_vc_chi_phi_chuyen`.
- `ls .claude/worktrees/*/migrations/` (bắt cả tệp chưa commit): `0070` ×8, `0071`, `0072`, `0073` — không có gì ≥ `0074`.
- ⇒ luồng L lấy **`0074`**. Phiên luồng Q (chạy song song) và Đợt 1 lấy từ **`0075`** trở đi. Đo lại lần nữa ngay trước day-len.

Số bản nhật ký phiên bản: `main` cục bộ có `1.70` ở đầu `src/shared/changelog.ts` ⇒ bản của luồng L đánh **tạm `1.71`**, kiểm lại lúc gộp.

## Mốc ban đầu (trước khi sửa gì)
- `npm run typecheck`: 0 lỗi.
- `npm test`: bộ chính **2802/2802 xanh**. Bài đo giờ `src/claude-guard-thoi-gian.test.ts` **đỏ** ("lệnh dị dạng không làm hook quá giờ", 10,69 s > 10 s) — máy đang tải nặng (nhiều phiên song song). Không do luồng L; chạy lại khi máy rảnh.

## Tự chốt bề mặt (đảo ngược được — theo kế hoạch §7)
- Khoá `LAN_GUI_SECRET`, tối thiểu 32 ký tự.
- Tệp miễn `src/shared/lan-gui-mien.ts`; danh sách bí mật `src/shared/lan-gui-bi-mat.ts`; danh sách nợ `src/shared/lan-gui-no.ts`; "tạo mà trả 200 ⇒ phát lại = tải lại" `src/shared/lan-gui-ket-qua.ts`.
- **"Lô ghi đầu tiên" = lô ghi đầu tiên THÀNH CÔNG mang vé** (chưa ghi được vé thì lô ghi kế tiếp lại mang vé). Lý do: `createOrder` thử lại tới 3 lô khi trùng mã đơn (`src/modules/orders/repository.ts`, vòng `attempt`); lô thử thứ nhất hỏng thì không có vé, lô thử thứ hai phải mang vé — đúng bất biến "có vé ⇔ lô ghi của lệnh đã thành công".

## L0 — kiểm kê (2026-10-02, trên `df6bc864`)

### Route ghi
`grep -h -o -E 'route\("(POST|PUT|PATCH|DELETE)"' src/modules/*/index.ts | wc -l` = **134**; công khai (`"public"`) = 5, đều ở `auth` (`/api/auth/login`, `/passkey/options`, `/passkey/login`, `/logout`, `/session-ended`) ⇒ **129** route ghi có đăng nhập. Không có `route("` khai ngoài `src/modules/*/index.ts`.

### Route trả 201 (33 chỗ)
- Dạng `, 201)` thẳng: accounts `:282` (passkey), `:426`, `:456` (tạo tài khoản — thân có PIN); billing `:69`, `:203`, `:212`, `:221`; catalog `:190`; locations `:52`; feedback `:103`; orders `:700` (lập đơn), `:849`.
- Dạng hàm trả lời nhận mã: feedback `:169` (`d ? json(d, 201) : …`); parties `:618`, `:653` (`respondDocMeta`), `:712`, `:748` (`respondDocs`), `:897`, `:962`, `:1047`, `:1126` (`respondParty`); van-chuyen `:362`, `:431`, `:464` (`respondVehicle`), `:535`, `:561`, `:603`, `:627`, `:704`, `:731`.
- Dạng biến: thongbao `:231` (`win === id ? 201 : 200`), van-chuyen `:874` (`lap ? 200 : 201`).
- Route tạo mà trả 200: lập ở L7 (bài chạy thật bắt nốt).

### Ghi phụ TRƯỚC lô chính (nguy cơ T17)
- `demThanCu` (`src/modules/orders/repository.ts:1390`, `.run()` một dòng `client_outdated_body`, nuốt lỗi) gọi ở `POST /api/orders` (`index.ts:672`), lưu nháp `PUT /api/orders/:id` (`:738`), **và** `PUT /api/orders/:id/trip` (`:794`) — chỗ thứ ba kế hoạch chưa liệt kê.
- `POST /api/orders` KHÔNG đồng bộ Sheet trước lô (đã đọc `validationContext` → `getEffectiveServices` → `loadAll`: chỉ đọc). Chú thích "để không gọi Google Sheet" ở khung thử là cũ.
- `createOrder` có thể chạy tới 3 lô (thử lại khi trùng mã) — xử lý bằng luật "lô đầu tiên thành công" ở trên.

### Handler có thể nuốt lỗi `UNIQUE`
`isUniqueViolation`/`loiRangBuocChuyen`: `src/modules/accounts/index.ts` (tạo tài khoản), `src/modules/van-chuyen/dieu-phoi-route.ts`, `goi-bao-lenh.ts`, `rules.ts`.

### Hàm tiêm
- Nhận `envBoc` (câu của chúng vào chính lô của handler): `newOrderHandler`, `gopHoSo.cauDoiDon` (và các phương thức đọc của `gopHoSo`, `isAssigned`… — chỉ đọc, bọc vô hại).
- Giữ `env` GỐC (ghi trong `waitUntil`, không thuộc lô của lệnh): `baoThayDoi`, `baoThayDoiChuyen`, `dongBangTin` (`tatMayStatement(...).run()`), `giaoLoDay`. `currentStaff`, `maintenanceBlock` đã chạy trước, dùng `env` gốc.

### Bảng route ghi (module | phương thức | mẫu | access | tệp:dòng)
| module | PT | mẫu | access | nơi |
|---|---|---|---|---|
| accounts | POST | `/api/account/change-pin` | staff | src/modules/accounts/index.ts:202 |
| accounts | POST | `/api/account/passkeys/options` | staff | src/modules/accounts/index.ts:228 |
| accounts | POST | `/api/account/passkeys` | staff | src/modules/accounts/index.ts:257 |
| accounts | POST | `/api/account/passkeys/remove-all` | staff | src/modules/accounts/index.ts:294 |
| accounts | DELETE | `/api/account/passkeys/:id` | staff | src/modules/accounts/index.ts:314 |
| accounts | POST | `/api/account/pin-by-passkey/options` | staff | src/modules/accounts/index.ts:337 |
| accounts | POST | `/api/account/pin-by-passkey` | staff | src/modules/accounts/index.ts:352 |
| accounts | POST | `/api/staff` | accounts | src/modules/accounts/index.ts:387 |
| accounts | PATCH | `/api/staff/:id` | accounts | src/modules/accounts/index.ts:470 |
| accounts | PUT | `/api/staff/:id/permissions` | accounts | src/modules/accounts/index.ts:523 |
| accounts | PUT | `/api/staff/:id/roles` | accounts | src/modules/accounts/index.ts:590 |
| accounts | POST | `/api/staff/:id/reset-pin` | admin | src/modules/accounts/index.ts:655 |
| accounts | POST | `/api/staff/:id/passkeys/remove-all` | admin | src/modules/accounts/index.ts:679 |
| accounts | POST | `/api/staff/:id/unlock` | admin | src/modules/accounts/index.ts:700 |
| accounts | POST | `/api/sessions/:id/revoke` | admin | src/modules/accounts/index.ts:744 |
| accounts | PUT | `/api/sessions/policy` | admin | src/modules/accounts/index.ts:783 |
| auth | POST | `/api/auth/login` | public | src/modules/auth/index.ts:262 |
| auth | POST | `/api/auth/passkey/options` | public | src/modules/auth/index.ts:292 |
| auth | POST | `/api/auth/passkey/login` | public | src/modules/auth/index.ts:305 |
| auth | POST | `/api/auth/logout` | public | src/modules/auth/index.ts:341 |
| auth | POST | `/api/auth/session-ended` | public | src/modules/auth/index.ts:356 |
| billing | POST | `/api/orders/:id/payments` | orders | src/modules/billing/index.ts:60 |
| billing | POST | `/api/orders/:id/delivered` | orders | src/modules/billing/index.ts:75 |
| billing | POST | `/api/orders/:id/completed` | office | src/modules/billing/index.ts:93 |
| billing | POST | `/api/orders/:id/nhap-ke-toan` | office | src/modules/billing/index.ts:121 |
| billing | POST | `/api/ledger/balances` | orders | src/modules/billing/index.ts:137 |
| billing | POST | `/api/ledger/company-receipts/:receiptId/confirm` | office | src/modules/billing/index.ts:188 |
| billing | POST | `/api/ledger/settlements` | office | src/modules/billing/index.ts:198 |
| billing | POST | `/api/ledger/refunds` | office | src/modules/billing/index.ts:207 |
| billing | POST | `/api/ledger/adjustments` | office | src/modules/billing/index.ts:216 |
| catalog | POST | `/api/catalog/groups` | admin | src/modules/catalog/index.ts:169 |
| catalog | PATCH | `/api/catalog/groups/:code` | admin | src/modules/catalog/index.ts:193 |
| catalog | PUT | `/api/catalog/group-assignments` | admin | src/modules/catalog/index.ts:253 |
| catalog | POST | `/api/catalog/sync` | admin | src/modules/catalog/index.ts:293 |
| catalog | PATCH | `/api/catalog/:code` | admin | src/modules/catalog/index.ts:302 |
| catalog | POST | `/api/catalog/:code/ack` | admin | src/modules/catalog/index.ts:330 |
| catalog | DELETE | `/api/catalog/:code/override` | admin | src/modules/catalog/index.ts:344 |
| dispatch | PUT | `/api/orders/:id/handler` | orders | src/modules/dispatch/index.ts:156 |
| dispatch | POST | `/api/orders/:id/handler-cancel` | staff | src/modules/dispatch/index.ts:217 |
| dispatch | POST | `/api/orders/:id/handler-money-edit` | staff | src/modules/dispatch/index.ts:245 |
| feedback | POST | `/api/feedback` | staff | src/modules/feedback/index.ts:81 |
| feedback | POST | `/api/feedback/:id/messages` | staff | src/modules/feedback/index.ts:143 |
| feedback | PATCH | `/api/feedback/:id` | admin | src/modules/feedback/index.ts:173 |
| giao-dien | PUT | `/api/giao-dien` | admin | src/modules/giao-dien/index.ts:30 |
| locations | POST | `/api/locations` | admin | src/modules/locations/index.ts:36 |
| locations | PUT | `/api/locations/:id` | admin | src/modules/locations/index.ts:55 |
| maintenance | PUT | `/api/maintenance` | admin | src/modules/maintenance/index.ts:56 |
| orders | POST | `/api/cai-dat/nhap-tay` | admin | src/modules/orders/index.ts:512 |
| orders | POST | `/api/orders` | orders | src/modules/orders/index.ts:666 |
| orders | PUT | `/api/orders/:id` | orders | src/modules/orders/index.ts:727 |
| orders | PUT | `/api/orders/:id/trip` | orders | src/modules/orders/index.ts:784 |
| orders | POST | `/api/orders/:id/legs` | orders | src/modules/orders/index.ts:827 |
| orders | PUT | `/api/orders/:id/legs/:legId` | orders | src/modules/orders/index.ts:852 |
| orders | POST | `/api/orders/:id/legs/:legId/close` | orders | src/modules/orders/index.ts:870 |
| orders | POST | `/api/orders/:id/legs/:legId/short-notice` | orders | src/modules/orders/index.ts:891 |
| orders | POST | `/api/orders/:id/passengers` | orders | src/modules/orders/index.ts:934 |
| orders | PUT | `/api/orders/:id/booker` | orders | src/modules/orders/index.ts:955 |
| orders | POST | `/api/orders/:id/status` | orders | src/modules/orders/index.ts:979 |
| parties | POST | `/api/parties/document-types` | admin | src/modules/parties/index.ts:603 |
| parties | PUT | `/api/parties/document-types/:code` | admin | src/modules/parties/index.ts:621 |
| parties | POST | `/api/parties/license-classes` | admin | src/modules/parties/index.ts:638 |
| parties | PUT | `/api/parties/license-classes/:code` | admin | src/modules/parties/index.ts:656 |
| parties | POST | `/api/parties/:id/documents` | office | src/modules/parties/index.ts:686 |
| parties | POST | `/api/parties/:id/documents/:did/renew` | office | src/modules/parties/index.ts:715 |
| parties | POST | `/api/parties/:id/documents/:did/correct` | office | src/modules/parties/index.ts:751 |
| parties | POST | `/api/parties/:id/documents/:did/reveal` | office | src/modules/parties/index.ts:803 |
| parties | POST | `/api/parties/:id/merge/preview` | admin | src/modules/parties/index.ts:819 |
| parties | POST | `/api/parties/:id/merge` | admin | src/modules/parties/index.ts:830 |
| parties | POST | `/api/parties` | office | src/modules/parties/index.ts:881 |
| parties | PUT | `/api/parties/:id` | office | src/modules/parties/index.ts:907 |
| parties | POST | `/api/parties/:id/contacts` | office | src/modules/parties/index.ts:938 |
| parties | POST | `/api/parties/:id/contacts/:cid/end` | office | src/modules/parties/index.ts:965 |
| parties | POST | `/api/parties/:id/roles` | admin | src/modules/parties/index.ts:992 |
| parties | POST | `/api/parties/:id/roles/:rid/end` | admin | src/modules/parties/index.ts:1050 |
| parties | POST | `/api/parties/:id/relationships` | admin | src/modules/parties/index.ts:1088 |
| parties | POST | `/api/parties/:id/relationships/:rid/end` | admin | src/modules/parties/index.ts:1129 |
| thongbao | POST | `/api/account/thong-bao/may` | staff | src/modules/thongbao/index.ts:150 |
| thongbao | POST | `/api/account/thong-bao/may/huy` | staff | src/modules/thongbao/index.ts:162 |
| thongbao | POST | `/api/account/thong-bao/da-doc` | staff | src/modules/thongbao/index.ts:181 |
| thongbao | POST | `/api/account/thong-bao/:id/da-hieu` | staff | src/modules/thongbao/index.ts:189 |
| thongbao | POST | `/api/thong-bao` | admin | src/modules/thongbao/index.ts:205 |
| thongbao | POST | `/api/thong-bao/:id/thu-hoi` | admin | src/modules/thongbao/index.ts:265 |
| tro-ly | POST | `/api/tro-ly/hoi` | staff | src/modules/tro-ly/index.ts:164 |
| tro-ly | POST | `/api/tro-ly/cai-dat` | office | src/modules/tro-ly/index.ts:259 |
| tro-ly | POST | `/api/tro-ly/vai` | office | src/modules/tro-ly/index.ts:268 |
| tro-ly | POST | `/api/tro-ly/thu-khoa` | office | src/modules/tro-ly/index.ts:280 |
| tro-ly | POST | `/api/tro-ly/loi-dan` | office | src/modules/tro-ly/index.ts:307 |
| tro-ly | POST | `/api/tro-ly/ngu-canh` | office | src/modules/tro-ly/index.ts:321 |
| tro-ly | PUT | `/api/tro-ly/ngu-canh/:id` | office | src/modules/tro-ly/index.ts:332 |
| tro-ly | PUT | `/api/tro-ly/bo-nao` | office | src/modules/tro-ly/index.ts:352 |
| tro-ly | POST | `/api/tro-ly/thu` | office | src/modules/tro-ly/index.ts:379 |
| van-chuyen | POST | `/api/van-chuyen/xe` | office | src/modules/van-chuyen/index.ts:334 |
| van-chuyen | PUT | `/api/van-chuyen/xe/:id` | office | src/modules/van-chuyen/index.ts:371 |
| van-chuyen | POST | `/api/van-chuyen/xe/:id/giay-to` | office | src/modules/van-chuyen/index.ts:408 |
| van-chuyen | POST | `/api/van-chuyen/xe/:id/giay-to/:did/gia-han` | office | src/modules/van-chuyen/index.ts:434 |
| van-chuyen | POST | `/api/van-chuyen/xe/:id/giay-to/:did/sua-sai` | office | src/modules/van-chuyen/index.ts:467 |
| van-chuyen | POST | `/api/van-chuyen/chinh-sach-dieu-phoi` | office | src/modules/van-chuyen/index.ts:514 |
| van-chuyen | POST | `/api/van-chuyen/dieu-kien` | office | src/modules/van-chuyen/index.ts:543 |
| van-chuyen | POST | `/api/van-chuyen/dieu-kien/:id/dong` | office | src/modules/van-chuyen/index.ts:564 |
| van-chuyen | POST | `/api/van-chuyen/hang-bang` | office | src/modules/van-chuyen/index.ts:586 |
| van-chuyen | POST | `/api/van-chuyen/ly-do` | admin | src/modules/van-chuyen/index.ts:612 |
| van-chuyen | PUT | `/api/van-chuyen/ly-do/:code` | admin | src/modules/van-chuyen/index.ts:630 |
| van-chuyen | POST | `/api/van-chuyen/mau-chang/:code` | admin | src/modules/van-chuyen/index.ts:672 |
| van-chuyen | POST | `/api/van-chuyen/loai-giay-to-xe` | admin | src/modules/van-chuyen/index.ts:716 |
| van-chuyen | PUT | `/api/van-chuyen/loai-giay-to-xe/:code` | admin | src/modules/van-chuyen/index.ts:734 |
| van-chuyen | POST | `/api/van-chuyen/nguong-het-han` | admin | src/modules/van-chuyen/index.ts:751 |
| van-chuyen | POST | `/api/van-chuyen/chuyen` | office | src/modules/van-chuyen/index.ts:825 |
| van-chuyen | PUT | `/api/van-chuyen/chuyen/:id` | office | src/modules/van-chuyen/index.ts:877 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/phan-bo` | office | src/modules/van-chuyen/index.ts:903 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/rut` | office | src/modules/van-chuyen/index.ts:933 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/doi` | office | src/modules/van-chuyen/index.ts:954 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/huy` | office | src/modules/van-chuyen/index.ts:977 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/cap-nhat-diem` | office | src/modules/van-chuyen/index.ts:1000 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/cap-nhat-khach` | office | src/modules/van-chuyen/index.ts:1026 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/xuat-ben` | staff | src/modules/van-chuyen/index.ts:1082 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/diem/:sid/da-toi` | staff | src/modules/van-chuyen/index.ts:1105 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/don` | staff | src/modules/van-chuyen/index.ts:1126 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/vang` | staff | src/modules/van-chuyen/index.ts:1147 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/khach-huy` | staff | src/modules/van-chuyen/index.ts:1168 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/tra` | staff | src/modules/van-chuyen/index.ts:1189 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/ket-thuc` | staff | src/modules/van-chuyen/index.ts:1210 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/ket-thuc-gian-doan` | staff | src/modules/van-chuyen/index.ts:1231 |
| van-chuyen | POST | `/api/van-chuyen/cuoc-cua-toi/:id/thu-tu` | staff | src/modules/van-chuyen/index.ts:1252 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/xuat-ben` | office | src/modules/van-chuyen/index.ts:1277 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/diem/:sid/da-toi` | office | src/modules/van-chuyen/index.ts:1298 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/phan-bo/:aid/don` | office | src/modules/van-chuyen/index.ts:1317 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/phan-bo/:aid/vang` | office | src/modules/van-chuyen/index.ts:1336 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/phan-bo/:aid/khach-huy` | office | src/modules/van-chuyen/index.ts:1355 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/phan-bo/:aid/tra` | office | src/modules/van-chuyen/index.ts:1374 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/ket-thuc` | office | src/modules/van-chuyen/index.ts:1393 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/ket-thuc-gian-doan` | office | src/modules/van-chuyen/index.ts:1412 |
| van-chuyen | POST | `/api/van-chuyen/chuyen/:id/thu-tu` | office | src/modules/van-chuyen/index.ts:1431 |
| van-chuyen | POST | `/api/van-chuyen/chang/:legId/da-goi-bao` | office | src/modules/van-chuyen/index.ts:1476 |
| van-chuyen | POST | `/api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao` | office | src/modules/van-chuyen/index.ts:1498 |

## L1 — migration `0074_lan_gui.sql` (2026-10-02)
- Đỏ trước: `node --test src/migrations-lan-gui.test.ts` → 0/6 (chưa có tệp). Xanh: 6/6. `src/architecture.test.ts` + bài migration: 51/51.
- Từ điển: hai bảng vào `docs/data-dictionary.json` (module `lan-gui`, tiền tố `lg_`), `npm run dict`. `TABLE_PREFIX` thêm `lg_: "lan-gui"`.
- **H9 (phần CSDL) quan sát chặn thật 2026-10-02:** đổi `so_ngay >= 90` thành `>= 1` ⇒ `not ok 5 - (e) H9 phần CSDL … error: 'Missing expected exception.'` ⇒ hoàn nguyên ⇒ 6/6.
- `npm test`: bộ chính 2808/2808 xanh. Bài đo giờ hook đỏ (24,4 s; `uptime` tải trung bình 46 — máy quá tải bởi phiên khác), không do luồng L.
- Chưa chạy e2e ở L1 (gộp vào lần chạy e2e đủ bộ sau L3, vì e2e cần khoá mới).

## L2 — module `lan-gui` (2026-10-02)
- `src/modules/lan-gui/{index,rules,repository}.ts` + `rules.test.ts` (5 bài: T15 phần hàm kiểm khoá, vân tay HMAC đổi khi đổi byte thân / khoá / phương thức / đường dẫn / query, thân rỗng, không phải SHA-256 trơn). `ALLOWED_EDGES["lan-gui"] = []`, vào `STRICT`.
- **Lệch nhỏ so với kế hoạch (bề mặt, đảo ngược được):** `kiemKhoa`, `phanLoai`, `thanPhatLai` (+ `ketQuaDeLuu`, kiểu `DongVe`, `LanGuiNoi`) đặt ở `src/shared/lan-gui-luat.ts` thay vì `lan-gui/rules.ts` — router ở `src/shared/` không được import module (ADR-0002 điều 6). Module giữ phần có khoá bí mật (`vanTay`, `kiemCauHinhLanGui`). Bài: `src/shared/lan-gui-luat.test.ts` (8 bài; biên 15/16/64/65 ký tự, 9.999/10.000 ms).
- Thêm tên lời thường "Chống ghi trùng" vào `src/shared/tro-ly-cau-truc-ten.ts` (bài Đ1 của kho trợ lý đòi mọi thư mục module có tên) và sinh lại `tro-ly-cau-truc.ts`.
- **H6 quan sát chặn thật 2026-10-02:** thêm tạm `defineSql("lan-gui","thu_xoa","DELETE FROM lg_lan_gui WHERE created_at < ?1")` ⇒ `src/architecture.test.ts` đỏ: `'lan-gui.thu_xoa: xoá cứng bảng lg_lan_gui (R-N1-9: đóng hiệu lực hoặc active = 0, không DELETE/REPLACE)'` ⇒ hoàn nguyên ⇒ 45/45.

## L3 — khoá `LAN_GUI_SECRET` ở mọi nơi dựng môi trường (2026-10-02)
- Đỏ trước: `src/lan-gui-cau-hinh.test.ts` (qua khung thử, cả ứng dụng) ⇒ 1/5 (chưa có khoá, chưa có kiểm) ⇒ xanh 5/5 sau khi sửa.
- Sửa cùng một commit: `src/index.ts` (`checkConfig: checkAuthConfig(env) ?? checkLanGuiConfig(env)`), `worker-configuration.d.ts` (hai chỗ, khai tay), `tests/audit/harness.mjs` (`LAN_GUI_SECRET_GIA`), `tests/e2e/run.mjs` (`--var`), `scripts/dev-iphone.mjs`, `.dev.vars.example`, `docs/CHANGE-GUIDE.md` công thức l. `src/passkey-off.test.ts` gọi handler thẳng (không qua `checkConfig`) — không cần sửa. Phần "nhận tham số vé" của L10: `call(…, ip, { ve })` ở `tests/e2e/lib.mjs`.
- `npm test` 2826/2826; `npm run test:e2e -- platform` xanh (2/2, 39 giây).
- **Việc của chủ (ghi lại, không làm ở đây):** thêm dòng `LAN_GUI_SECRET=<≥ 32 ký tự, khác khoá thật>` vào `.dev.vars` của mỗi chỗ chạy `npm run dev`. Nếu chạy `npm run types`: kiểm lại hai dòng khai tay `LAN_GUI_SECRET` trong `worker-configuration.d.ts`.

## L4a — bộ bọc cơ sở dữ liệu theo từng yêu cầu (2026-10-02)
- `src/shared/lan-gui-boc.ts` + `src/shared/lan-gui-boc.test.ts` (12 bài: nhận câu đọc/ghi, nhận lỗi đụng vé (chữ SQLite và dạng D1 bọc tiền tố), bẫy 1 gỡ bọc + câu lạ, bẫy 2 vé cuối lô + cắt kết quả, bẫy 3 `.run()`/`.first()`/`.all()`/`.raw()` với `RETURNING`, bẫy 4 chỉ lô ghi đầu THÀNH CÔNG mang vé + đếm, bẫy 5 đụng vé ⇒ ném lại lỗi gốc + từ chối ghi tiếp, `dong()`).
- Ghi trung thực: bộ bọc viết TRƯỚC bài (không chụp đỏ từng bẫy); bù bằng phép đột biến dưới đây. Chữ lỗi D1 thật khi đụng vé: chưa ghi được (cần `wrangler dev`) — ghi ở L4b qua e2e.
- Chế độ nghiêm `fakeD1` (`tests/audit/harness.mjs`): `batch` từ chối câu không do chính D1 giả tạo; bật mặc định; toàn bộ `npm test` xanh 2838/2838 với chế độ này. Thêm móc `moc.truocTraVe` (chỉ khung thử) cho ca đồng thời L5.
- **Hàng rào "chế độ nghiêm fakeD1" quan sát chặn thật 2026-10-02:** bỏ bước gỡ bọc (`goBoc = s => s`) ⇒ `not ok 3 - bẫy 1 … error: 'fakeD1 nghiêm: câu thứ 0 của lô không do D1 này tạo (quên gỡ bọc?)'` (và 3 bài khác) ⇒ hoàn nguyên ⇒ 12/12.
- `npm run typecheck` 0 lỗi; `npm test` 2838/2838 + bài đo giờ xanh.

## Bài ĐỎ TRƯỚC router (L5 + L11 + router.test) — commit riêng (2026-10-02)
- `src/lan-gui-hanh-vi.test.ts` (ca a–j + vé sai dạng + phạm vi tài khoản), trên mã CHƯA có router lớp vé: **3 xanh / 10 đỏ** — đỏ: (a) 2 đơn, (b) không 422, (c) 2 đơn, (e) bên thua nhận `phone_taken`, (f) gửi lại nhận câu của handler "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động." thay vì câu cố định, (g2) câu vé hỏng mà đơn vẫn ghi, (h) không có dòng vé, (i) 2 hồ sơ, (j) không có log `thieu_ma_lan_gui`, vé sai dạng vẫn 201. Xanh sẵn (đúng — là bài canh): (d), (g), phạm vi tài khoản.
- `src/shared/router.test.ts` 3 ca mới (T18 thiếu phần tiêm ⇒ 500; có vé ⇒ tra đúng một lần, công khai/đọc không tra; T14 thiếu vé ⇒ chạy + đúng một dòng log): **3 đỏ**. `buildThrowing` (T-1) thêm `lanGui` giả vì T18.
- `tests/e2e/chong-ghi-trung.mjs` (T12: 11, 12, 13, HD10 nhánh "Ghi lần thu", KT03, KT04 + T4, T5, song song, 422) chạy `npm run test:e2e -- chong-ghi-trung` trên D1 local tạm: **đỏ** ở ca đầu — `AssertionError: 11 tuần tự lần 2 cùng vé phải là "đã ghi": 201 {"order":{… "orderCode":"TD-20261002-0002" …}}` (gửi lại cùng vé tạo đơn thứ hai). Kịch bản dừng ở lỗi đầu nên các ca sau chưa có số riêng.
- Khung thử: `exec.waitUntil` thu promise + `w.choNen()`; `w.raoTraVe(n)` (rào ca đồng thời, tự mở sau 2 giây để bài đỏ chứ không treo).
- Commit này CỐ Ý để `npm test` đỏ; router (L4b) commit ngay sau trong cùng lượt.

## L4b — router giai đoạn 1 (2026-10-02)
- `src/shared/router.ts`: `AppOptions.injected.lanGui` (bắt buộc); sau mọi cổng, chỉ route ghi có đăng nhập ngoài tệp miễn `src/shared/lan-gui-mien.ts` (rỗng). Bước 1 (thiếu vé ⇒ log `thieu_ma_lan_gui` + cho qua; sai dạng ⇒ 400 `ma_lan_gui_sai_dang`), bước 2 (HMAC của phương thức + `pathname+search` + thân thô từ `request.clone()`), 3a–3d (tra trước bằng env GỐC; 422 / 409 `dang_xu_ly` / phát lại 200 + `Idempotent-Replayed`, đếm lặp trong waitUntil), 4 (env BỌC cho handler + hàm tiêm vào lô; Bảng tin / đóng kết nối / gõ cửa giữ env gốc), 5 (đụng vé ⇒ bỏ phản hồi handler, tra lại), 6 (waitUntil ghi `ma_tra`, `ma_loi` khi 4xx, `ket_qua` = `Location` hợp lệ khi 2xx), 7 (handler báo lỗi mà không ghi vé ⇒ tra lại), 8 (handler ném: đã ghi vé ⇒ `ma_tra = 500`; chưa ⇒ tra lại rồi ném tiếp). `boc.dong()` sau handler: lệnh ghi trễ đi thẳng D1 gốc. Log `lan_gui_ghi_nhieu_lan` khi > 1 lần ghi (H5, đo).
- `src/index.ts`: `lanGui: lanGuiNoi`.
- Sau router: `src/lan-gui-hanh-vi.test.ts` + `router.test.ts` + `lan-gui-boc.test.ts` **53/53 xanh**.
- **Phát hiện khi làm xanh — bẫy T17 có thật trong khung thử:** thân đơn của bài (giống redteam) không có `legs` ⇒ "thân kiểu cũ" ⇒ `demThanCu` ghi dòng đếm bằng `.run()` TRƯỚC lô chính ⇒ dòng đếm mang vé ⇒ ca (d) (400 sau đó) và (g) (lô chính RAISE) để lại vé ⇒ gửi lại bị báo nhầm "đã ghi" (mất đơn). Sửa ngay (bắt buộc trước phát hành theo kế hoạch L12): lối có tên `dbNgoaiVe` (`src/shared/lan-gui-boc.ts`) — `demThanCu` ghi dòng đếm trên D1 gốc, không mang vé; danh sách nợ `src/shared/lan-gui-no.ts` (`NGOAI_VE`) + bài tĩnh `src/lan-gui-no.test.ts` (chỉ hàm có tên được gọi; mục thừa ⇒ đỏ). Chọn "ngoài vé" thay vì nối vào lô chính vì dòng đếm phải ghi cả khi lệnh bị từ chối 400.
  - **T17 quan sát chặn thật 2026-10-02:** đổi `const goc = dbNgoaiVe(db)` thành `const goc = db` ⇒ `not ok 1 - (g) T13: lô nghiệp vụ hỏng (trigger RAISE) ⇒ không vé; gửi lại cùng vé chạy như mới` ⇒ hoàn nguyên ⇒ xanh.
- Ca (c), (e), (f): bài dựng phiên TRƯỚC khi gửi đồng thời (khung thử tạo phiên ở lần gọi đầu; hai lần đồng thời đụng chỉ mục phiên một máy — lỗi của khung thử, không của lớp).
- **Kiểm L4b (2026-10-02):** `npm run typecheck` 0 lỗi; `npm test` bước 1 + bước 2 thoát 0 (bộ chính 2856/2856 + bài đo giờ); `npm run test:e2e` **đủ bộ 43/43 xanh** (599 giây, 3 nhóm; có `chong-ghi-trung` — nay XANH: 11, 12, 13, HD10, KT03, KT04, T4, T5, song song, 422 — và đuôi `audit-invariants`). Các kịch bản e2e cũ chưa gửi vé vẫn xanh ⇒ giai đoạn 1 không phá hành vi cũ.
- Đã thêm log không dữ liệu `lan_gui_dung_ve` / `lan_gui_loi_la` ở bộ bọc để xác nhận trên D1 thật rằng chữ lỗi đụng vé được nhận ra (§14 mục 3) — chưa đọc được log máy chủ e2e (run.mjs không in log wrangler ra tệp kết quả); ca song song của `chong-ghi-trung` xanh trên `wrangler dev` (có thể do bước 5 hoặc lưới bước 7/8 — chưa tách được). Ghi là **chưa kiểm** chữ lỗi D1 thật; L12 thu log máy chủ e2e sẽ trả lời.

## Kiểm độc lập vòng 1 — ĐÃ GIAO (2026-10-02)
- Người kiểm `nguoi-kiem-doc-lap`, chỉ đọc, trên bản sao riêng của commit `57e53a18` (L1–L4b). Chờ báo cáo; chưa báo ĐẠT.

## L5 — H1 + redteam (2026-10-02)
- Bài hành vi đã có từ commit đỏ; nay quan sát đột biến H1 (i) và (ii) — xem `docs/SO-HANG-RAO.md` dòng H1.
- `tests/audit/redteam.test.mjs`: R1/R2 giữ dạng FINDING (không vé ⇒ 2 bản ghi ở giai đoạn 1) + chú thích trỏ bài hồi quy có vé. `node --test tests/audit/redteam.test.mjs` 19/19.

## L6 — H2 (2026-10-02)
- `src/lan-gui-phu-route.test.ts` 3/3; tự bóc route bằng cùng khuôn với `src/route-write-guard.test.ts` (bộ bóc ở đó là hàm cục bộ của tệp test, import tệp test sẽ chạy cả bài của nó — nên chép khuôn regex, giữ cùng kiểm "số bóc = số lời gọi route(").
- Bài chạy "route trong tệp miễn không gọi tra" CHƯA có: tệp miễn đang rỗng, không dựng được ca thật mà không thêm mục giả vào mã chạy thật. Thay bằng bài (3) khoá câu điều kiện của router + bài router.test (route công khai / đọc không tra). Ghi là giới hạn.
- Đột biến T6 (hai phép) — xem `docs/SO-HANG-RAO.md` dòng H2.

## L8 — vòng đời vé (2026-10-02)
- `src/shared/lan-gui-ve.ts` + `src/shared/lan-gui-bi-mat.ts` (`BI_MAT` 7 route PIN/giấy tờ; `KHONG_VE` = 5 route công khai — máy khách không sinh vé ở đăng nhập vì thân có PIN) + `src/shared/lan-gui-ve.test.ts` (11 bài; đỏ trước: thiếu mô-đun). H4 quan sát chặn thật (sổ hàng rào).

## L13 — cổng khoá trong `npm run trien-khai` (2026-10-02)
- `scripts/release-lib.mjs` bước 1c: `npx wrangler secret list --format json` (chỉ TÊN) sau `whoami`, trước D1; thiếu `SESSION_SECRET` / `LAN_GUI_SECRET` ⇒ dừng, in lệnh `secret put`; lệnh lỗi / đầu ra lạ ⇒ dừng. Bài `src/release-lib.test.ts` đỏ trước 21 bài ⇒ xanh 75/75. Dạng đầu ra đối chiếu mã nguồn wrangler đang cài. Quan sát chặn bằng hàm giả (sổ hàng rào). `docs/QUY-TRINH-PHAT-HANH.md` bước 1c.

## Kiểm độc lập vòng 1 — **ĐẠT** (2026-10-02, commit `57e53a18`, L1–L4b)
- Người kiểm `nguoi-kiem-doc-lap`, chỉ đọc, bản sao `git archive` riêng. Tự chạy: typecheck 0 lỗi; `npm test` 2855/2856 (1 đỏ `src/standards.test.ts:78` vì bản sao không có `.git` — không phải lỗi mã); bài đo giờ xanh; `npm run test:e2e` đủ bộ thoát 0 (705 giây, có `chong-ghi-trung` + `audit-invariants`). Sáu phép đột biến (H9, H6, fakeD1 nghiêm, T17, H1-i, H1-ii) đều ĐỎ đúng chỗ. `canManageAccount` và ba cơ chế cũ không đổi.
- **CHẶN:** không.
- **NÊN SỬA:** N1 — bộ bọc: hai lệnh ghi ĐỒNG THỜI trong một yêu cầu cùng mang vé, lệnh sau đụng vé của chính lệnh trước (hôm nay không route nào chạy ghi đồng thời). N2 — chữ lỗi D1 thật khi đụng khoá vé chưa kiểm trên production (workerd cục bộ `d1 execute --local` trả `UNIQUE constraint failed: lg_x.staff_id, lg_x.khoa: SQLITE_CONSTRAINT (extended: …)` — mẫu khớp; bằng chứng gián tiếp).
- **GỢI Ý:** G1 `laCauDoc` coi `WITH … SELECT replace(…)` là câu ghi; G2 `.raw({columnNames})` trên câu ghi bỏ qua tuỳ chọn; G3 danh sách `GHI_NHIEU_LAN` rỗng (L12 đo); G4 thân sai UTF-8 (rất nhẹ); G5 dấu chấm cuối câu cố định khác ADR đ6.
- ⇒ **Mở khoá Đợt 1** (kế hoạch §5: Đợt 1 bắt đầu khi L4b qua kiểm độc lập vòng 1).

## L7 — `Location` cho route 201 + H7 (2026-10-02)
- 33 chỗ trả 201 gắn `Location` (trang nội bộ chỉ chứa id): `json(…, 201, { location })` hoặc `kemLocation(await respondX(…, 201), …)` (`src/shared/http.ts`; `trangDon(id)` = `/order?id=<id>`). Lần thu / hoàn / điều chỉnh trỏ trang đơn; nộp nhiều đơn ⇒ `/orders`; điều chỉnh không gắn đơn ⇒ `/home`; Danh bạ ⇒ `/parties?id=<id>`; xe ⇒ `/xe-chi-tiet?id=<id>`; chuyến ⇒ `/chuyen?id=<id>`; danh mục / cài đặt ⇒ trang danh mục tương ứng. `POST /api/thong-bao` gửi Location cả ở nhánh 200 (trùng clientRequestId).
- `src/shared/lan-gui-ket-qua.ts` (`TAO_TRA_200`) rỗng, có lý do: mọi route TẠO nay trả 201 + Location; route ghi trả 200 còn lại là sửa trên bản ghi đang mở (tải lại là đúng).
- H7 ba lớp: bài tĩnh `src/lan-gui-location.test.ts`; `call()` của khung thử NÉM khi 201 thiếu/sai Location (mọi bài khung thử thành bài canh — `npm test` 2877/2877 xanh); `call()` của e2e cũng vậy — **e2e đủ bộ 43/43 xanh** (bắt nốt 201 ngoài khung thử: không còn chỗ nào thiếu).
- H7 quan sát chặn thật (sổ hàng rào).
- `src/lan-gui-giao-dien.test.ts` (H3) đã viết, chưa quan sát đột biến (làm cùng L9).

## Xử lý phát hiện vòng 1 (2026-10-02)
- **N1 — đã sửa:** bộ bọc xếp hàng TUẦN TỰ mọi lệnh ghi trong một yêu cầu (hàng đợi promise, trước `dong()`); bài đỏ trước `lan-gui-boc.test.ts` "N1 … hai lệnh ghi ĐỒNG THỜI" (đỏ: `not ok 12`) ⇒ xanh; thêm ca "lệnh đầu hỏng khi lệnh hai đang chờ ⇒ lệnh hai mang vé".
- **N2 — giữ mở, ghi "chưa kiểm":** giữ log `lan_gui_dung_ve` / `lan_gui_loi_la`; L12 thu log máy chủ e2e; trên production chỉ thấy sau lần triển khai (chủ đọc nhật ký Worker). Dòng sổ hàng rào KHÔNG ghi "đã quan sát" cho chữ lỗi D1 production.
- **G1 — đã sửa:** `REPLACE` chỉ tính là ghi khi đi với `INTO`; bài đỏ trước ⇒ xanh.
- **G5 — đã sửa:** câu cố định đúng nguyên văn ADR đ6 ("Lần gửi trước đã bị từ chối, tải lại để xem", không dấu chấm).
- G2 (`.raw({columnNames})` trên câu ghi) — chưa nơi nào dùng; ghi lại, không sửa. G3 — L12. G4 — chấp nhận (thân sai UTF-8 cũng không qua kiểm JSON của handler).

## L9 — `web/api.ts` gửi vé + `dieu-phoi-ui.ts` + H3 (2026-10-02)
- `api()`: mở vé TRƯỚC khi gửi (mô-đun `src/shared/lan-gui-ve.ts`), header `Idempotency-Key`; máy chủ trả lời ⇒ `ketThuc` (đóng khi 2xx / 4xx trừ 409 `dang_xu_ly`, giữ khi 5xx); mất mạng / hết giờ ⇒ giữ; 409 `dang_xu_ly` ⇒ chờ 1,5 giây gửi lại CÙNG vé, tối đa 3 lần, rồi ném "Đang xử lý lần bấm trước, chờ chút rồi bấm lại."; phản hồi `Idempotent-Replayed` + `da_ghi_truoc_do` ⇒ báo ngắn "Lần bấm trước đã được ghi." (`hienBaoNgan`) rồi `location.replace(safeNext(ket_qua))` hoặc tải lại sau 1,2 giây, lời gọi treo (màn gọi không nhận thân này — T19). Không mở được vé (không có `crypto.subtle`, vd trang http qua IP LAN của `dev-iphone`) ⇒ gửi không vé (giai đoạn 1 cho qua).
- `datNguoiDangNhap(id)` gọi ở `web/shell.ts` ngay sau `/api/auth/me`; trước đó vé chỉ ở bộ nhớ trang. `goLogin()` không xoá vé.
- `web/dieu-phoi-ui.ts`: giữ `requestId` theo CÙNG luật `nenDongVe` (đ10) — 5xx / mất mạng / 409 `dang_xu_ly` giữ, 4xx khác bỏ.
- H3: `src/lan-gui-giao-dien.test.ts` (3 bài: fetch ghi ∈ danh sách; đ10 khoá câu `nenDongVe`; `api()` dùng mô-đun vòng đời vé + `safeNext`). Quan sát chặn thật (sổ hàng rào).
- Kiểm: `npm run typecheck` 0 lỗi; `npm run build:web` thoát 0; `npm test` 2883/2883 + bài đo giờ xanh; `npm run test:e2e -- pwa bangtin chong-ghi-trung` 4/4.
- Kịch bản Chrome theo `web/CLAUDE.md`: làm ở bước kế (chưa chạy tới dòng này).

## L10 — e2e tự gắn vé (2026-10-02)
- `tests/e2e/lib.mjs` `call()`: lệnh ghi mặc định mang vé MỚI mỗi lần gọi (nghĩa cũ giữ nguyên); `opts.ve` = đúng vé đó; `opts.veTrong: true` = không vé (T14). ⇒ toàn bộ e2e nay đi xuyên lớp vé trên D1 của `wrangler dev`.
- `tests/e2e/run.mjs` đọc log Worker (Local Explorer) mỗi nhóm: đếm `thieu_ma_lan_gui` theo route, `lan_gui_dung_ve`, `lan_gui_loi_la` (phải 0), và H5. Lệnh không vé còn lại ở e2e đủ bộ (đo 2/10): `POST /api/orders` ×3 (ca T14 cố ý + chuỗi `fetch` thẳng), `POST /api/account/pin-by-passkey` ×1 (`passkey.mjs` gọi `fetch` thẳng) — danh sách cho bản siết (kế hoạch §11.2: rà 8 tệp e2e gọi `fetch` thẳng).
- `chong-ghi-trung.mjs` thêm ca T14 (không vé ⇒ 2 đơn, giai đoạn 1 cho qua).

## L12 — H5 đo ghi nhiều lần + trả nợ "ghi phụ trước lô chính" (2026-10-02)
- **Đo lần 1 (e2e đủ bộ):** 9 route ghi > 1 lần — reset-pin, change-pin, unlock, catalog/sync, tro-ly/hoi, feedback, feedback/:id/messages, passkeys/options, pin-by-passkey.
- **Rà và trả nợ T17 (ghi phụ TRƯỚC lô chính, ăn vé):** ngoài `demThanCu` (đã sửa ở L4b) còn 3 chỗ cùng loại, đều ở `auth` và đều là sổ đếm / tiêu thách thức phải ghi cả khi lệnh bị từ chối:
  - `verifyPinThrottled` (Đổi PIN, Bật Face ID) — bài đỏ trước `src/lan-gui-hanh-vi.test.ts` ca (k): lô Đổi PIN hỏng ⇒ gửi lại nhận "đã ghi" mà PIN chưa đổi (`actual: true` ở `da_ghi_truoc_do`) ⇒ sửa `dbNgoaiVe` ⇒ xanh.
  - `limitChallenge` (thách thức Face ID), `checkPasskeyAssertion` (`markPasskeyUsed` — tiêu thách thức, chống dùng lại chữ ký).
  - Cả ba vào `NGOAI_VE` có lý do; bài tĩnh `src/lan-gui-no.test.ts` bắt ngay lần dùng chưa khai (đã thấy đỏ thật khi thêm `verifyPinThrottled`).
  - Rà route của đợt hạn F-02 (lập đơn, ghi lần thu, Đã giao kèm thu, Công ty đã nhận, hoàn, nộp/trả, điều chỉnh): KHÔNG route nào ghi > 1 lần, KHÔNG ghi phụ trước lô chính (trừ `demThanCu` đã sửa).
- **Đo lần 2:** còn 7 route — ghi nợ có tên + lý do trong `GHI_NHIEU_LAN` (`src/shared/lan-gui-no.ts`): reset-pin, pin-by-passkey (lô chính rồi `unlockPhone`), unlock (`unlockPhone` + nhật ký `.run()`), catalog/sync, tro-ly/hoi, feedback, feedback/:id/messages (dấu email trong waitUntil SAU lô chính). e2e đủ bộ **45/45 xanh**, H5 xanh, `lan_gui_loi_la` = 0.

## N2 — chữ lỗi D1 thật khi đụng vé (2026-10-02)
- Ca e2e `chong-ghi-trung` "N2": trigger tạm chèn trước đúng dòng vé ⇒ câu vé cuối lô đụng khoá trên D1 của `wrangler dev` (workerd, qua binding Worker). Lần chạy đầu: log `lan_gui_dung_ve` 1 lần, `lan_gui_loi_la` 0 ⇒ **mẫu chữ lỗi KHỚP trên D1 local**; nhưng máy chủ trả **500** — **lỗi thật của router:** handler NÉM LẠI lỗi đụng vé (`createOrder`) thì nhánh `catch` chưa xét cờ đụng vé. Bài đỏ trước trên khung thử ca (l) (`actual: 500`) ⇒ sửa nhánh `catch` (đụng vé ⇒ tra lại, không thấy ⇒ 409 `dang_xu_ly`) ⇒ xanh; e2e N2 ⇒ 409, cả lô huỷ.
- Ở luồng đồng thời thật, dòng vé của bên thắng có thật nên tra lại thấy ⇒ phát lại; lỗi 500 chỉ ở ca vé thắng không còn (như trigger ép). Vẫn **chưa quan sát trên production** (chỉ thấy sau lần triển khai — đếm `lan_gui_dung_ve` / `lan_gui_loi_la` ở nhật ký Worker).

## Chỗ L3 còn sót (phát hiện ở L9)
- Máy chủ của mọi kịch bản Chrome dựng ở `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs` (+ `docs/evidence/2026-09-19-pwa/kich-ban/kiem-tra-nang-cap-sw.mjs`) chưa có `LAN_GUI_SECRET` ⇒ đã thêm. CHANGE-GUIDE công thức l nay ghi cả hai tệp + lệnh `grep -rln SESSION_SECRET src tests scripts docs/evidence`.

## L14 — tài liệu (2026-10-02)
- `docs/SYSTEM-DESIGN.md` §3 (một request ghi qua lớp vé, bước 1–8), §5 (hai bảng `lg_*`, migration 0074), `http.ts`.
- `docs/CHANGE-GUIDE.md`: công thức **z11** "thêm route ghi"; dòng tra nhanh; dòng ma trận §3; công thức l (bí mật bắt buộc).
- `docs/SO-HANG-RAO.md`: H1, H2, H3, H4, H6 (một nửa), H7, H9 (CSDL), D1 giả nghiêm, T17, cổng khoá L13 — mỗi dòng có ngày + thông báo đỏ. H5 thêm sau phép đột biến.
- `docs/quyen-hoan.json` F-02: thêm trỏ sổ thi công + e2e trong kho (KHÔNG đóng).
- Dòng trỏ "đã thay bởi ADR-0094" ở đầu `specs/2026-09-22-chong-gui-trung.md` và `specs/2026-10-02-chong-trung-moi-lenh-ghi-theo-oracle.md`.
- `src/shared/changelog.ts` mục **1.71** (tạm — KIỂM LẠI LÚC GỘP: nhánh `trang-chu-quan-tri` đang giữ 1.73 tạm); bài ghim `src/shared/app-info.test.ts` cập nhật.
- Đề xuất sửa luật cho chủ: `docs/superpowers/plans/2026-10-02-dot-0-de-xuat-luat.md` (CLAUDE.md §7/§10, K17; dòng 5.5 để bản sau).

## Vá 401 giữ vé (2026-10-02, góp ý người soát trước vòng 2)
- **Lỗi:** `api()` gọi `ketThuc` trước nhánh 401 ⇒ `nenDongVe({status:401})` = đóng vé. Kịch bản F-02: mất phản hồi (giữ vé) → phiên bị đá (ADR-0075) → bấm lại nhận 401 (cổng đăng nhập, chưa tới lớp vé) → vé bị đóng → đăng nhập lại bấm lại ⇒ vé MỚI ⇒ ghi lần thu thứ hai. Trái ADR-0094 đ3 + đặc tả §3.2 mục 7.
- **Sửa:** `nenDongVe`: 401 ⇒ GIỮ (cổng đăng nhập trả lời, không phải lệnh; không gì được ghi dưới vé). **Diễn giải (ghi lại cho chủ):** đ5 viết "đóng khi 4xx" — hiểu là "khi máy chủ trả lời LỆNH"; 401 của cổng phiên không phải câu trả lời của lệnh. Không đổi chữ ADR. `web/dieu-phoi-ui.ts` dùng chung `nenDongVe` nên Vận chuyển cũng giữ `requestId` khi 401.
- Đỏ trước: `src/shared/lan-gui-ve.test.ts` "401 … GIỮ vé; đăng nhập lại, tải lại trang ⇒ CÙNG vé" (`not ok 4`) ⇒ xanh 12/12. Chrome `lop-ve-smoke.mjs` thêm bước T1b (SQL kết thúc phiên giữa chừng): trên luật cũ ĐỎ, luật mới **6/6 xanh** (390 + 1040).

## Kịch bản Chrome theo `web/CLAUDE.md` cho `web/api.ts`, `web/dieu-phoi-ui.ts` (2026-10-02)
- Nhánh (`b158fd4a` + vá 401 chưa có lúc chạy): `dieu-phoi-smoke` ✓, `chuyen-smoke` ✓; ĐỎ: `v1-bao-tri` (11 ✓ / 8 ✗), `bang-tin-smoke` (31 / 7), `chuyen-sua-smoke` (12 / 2), `cuoc-smoke` (9 / 5), `a2-smoke-form` (dừng ở bước 2: form có thêm mục "Hành khách"), `a2-smoke-order` (dừng "form mở lại đơn"), `a2-smoke-sheet` (7 ✓ rồi dừng "đóng bảng + banner đã lưu").
- **Bản nền** (`git archive df6bc864`, `npm ci`, `build:web`, cùng Chrome, cùng `AXE_JS`): 7 kịch bản trên đỏ **GIỐNG HỆT từng dòng** (bộ so `so-nen.mjs` ở thư mục tạm của phiên) ⇒ lỗi có sẵn, không do luồng L. Giới hạn: những kịch bản dừng sớm không phủ được phần đã sửa phía sau điểm dừng; phần lớp vé có `lop-ve-smoke` phủ riêng.
- `lop-ve-smoke.mjs` (mới): 6/6.

## Kiểm độc lập vòng 2 — ĐÃ GIAO (2026-10-02, commit `a0d02168`)
- Người kiểm `nguoi-kiem-doc-lap`, chỉ đọc, bản sao `git archive` riêng. Chờ báo cáo; CHƯA báo ĐẠT.

## Việc phải làm LÚC GỘP (ghi trước để khỏi quên)
- **Migration:** đo lại 2026-10-02 sau L14 — luồng Q (`worktree-dot-0-luong-q`) đã lấy `0075_tin_tai_khoan.sql`; luồng L giữ `0074`. Không trùng. Đo lại lần nữa ngay trước day-len.
- **Đụng luồng Q:** cả hai nhánh sửa `src/modules/accounts/index.ts` (L: `Location` ở tạo tài khoản / passkey; Q: cổng quyền tiền ở reset-pin, roles, tạo tài khoản). Nhánh gộp SAU phải chạy lại H2 (số cứng 129 route ghi có đăng nhập ở `src/lan-gui-phu-route.test.ts`), H5 (e2e đủ bộ — route mới của Q có ghi nhiều lần không), H7 (route 201 mới của Q phải có `Location`).
- **Số phiên bản:** `1.71` ở `src/shared/changelog.ts` + bài ghim `src/shared/app-info.test.ts` là TẠM — nhánh khác (`trang-chu-quan-tri`) đang giữ `1.73`; đánh lại lúc gộp.
- **Nhánh mang theo** các commit kế hoạch + gia hạn TNV-G1 của `gia-han-tnv-g1` (tách từ `main` cục bộ `df6bc864`, chưa có trên `origin/main`).

## Sửa kiểm kiểu đỏ (2026-10-02, cổng xanh bắt)
- `tsc -p web` ĐỎ từ L9 (`web/api.ts` import `lan-gui-luat.ts`, mà tệp đó khai `LanGuiNoi` bằng kiểu D1/Env của Worker — giao diện không có). **Lỗi đo của người thi công:** từ L9 tôi kiểm bằng `grep -c "error TS"` trên đầu ra có mã màu ⇒ luôn 0 ⇒ báo "kiểm kiểu sạch" SAI ở các mục L9–L14 của sổ này. Commit `a0d02168` giao vòng 2 cũng mang lỗi này.
- Sửa: chuyển `LanGuiNoi` sang `src/shared/router.ts` (chỉ chạy trong Worker); `lan-gui-luat.ts` thuần. Từ đây kiểm bằng MÃ THOÁT của `npm run typecheck`: **0**. `npm test` 2886/2886 + bài đo giờ; `build:web` 0.

## Kiểm độc lập vòng 2 — lần 1: **KHÔNG ĐẠT** (2026-10-02, trên `b604a937`)
- Số liệu người kiểm (bản sao riêng): typecheck `b604a937` thoát 0 (`a0d02168` đỏ — xác nhận lỗi đo ở mục trên); `npm test` 2886/2885 (1 đỏ `.gitattributes`, do bản sao không có `.git`); e2e đủ bộ **45/45** (391 giây; nhóm 3 "đụng vé 1" = **N2 thấy trên D1 local thật** qua log); Chrome `lop-ve-smoke` 6/6; **15 phép đột biến** H1(i)(ii), (l), T17 ×3, H2 ×2, H3, H4 ×2, H5, H6, H7, H9, cổng khoá, N1 — đều đỏ đúng.
- **CHẶN 1 — PIN lộ ra localStorage (T16):** `POST /api/account/passkeys/options` nhận `{pin}` mà thiếu ở `BI_MAT` ⇒ mất mạng / 5xx / 401 (giữ vé) ⇒ `lg:<staff>` lưu sha256(thân), dò 10^6 ra PIN. **Sửa:** thêm route vào `BI_MAT`; thay "dựa vào kỷ luật" bằng bài QUÉT `src/shared/lan-gui-ve.test.ts` "T16: route ghi đọc PIN hoặc số giấy tờ trong thân ⇒ phải nằm trong BI_MAT" — viết TRƯỚC, đỏ đúng 1 route (`not ok 13 … POST /api/account/passkeys/options`) ⇒ sửa ⇒ 13/13. Dòng mới ở `docs/SO-HANG-RAO.md`.
- **NÊN SỬA 2** (đo typecheck bằng mã thoát): đã làm từ `b604a937`.
- **NÊN SỬA 3** SYSTEM-DESIGN lạc hậu: sửa đoạn "Lớp chống ghi trùng" bước 4 (NGOAI_VE nay 4 chỗ) và bước 8 (nhánh ném đụng vé ⇒ tra lại / 409 `dang_xu_ly`).
- **NÊN SỬA 4** `limitChallenge`, `checkPasskeyAssertion` chỉ canh tĩnh: ghi rõ ở cột "không chặn" dòng T17 sổ hàng rào (không thêm bài hành vi lượt này).
- **GỢI Ý 5** chú thích lặp ở `web/api.ts`: xoá. **GỢI Ý 6** (`parseSecretNames` gặp banner có `[`), **7** (H5 ngưỡng ≥ 1 sự kiện), **8** (sha256 thân route thường): ghi nhận, CHƯA làm — 6 dừng an toàn (không bỏ qua), chủ là người chạy thật đầu tiên; 7 thực tế log có dữ liệu; 8 đã khai ở đặc tả.
- Nghi vấn e2e `dispatch` 500 một lần khi máy bận (người kiểm chạy song song đột biến), không tái hiện — để mắt.
- Sau sửa: `npm run typecheck` thoát 0; `npm test` thoát 0 (2887/2887 + bài đo giờ 1/1); `build:web` 0; Chrome `passkey-smoke.mjs` (theo `web/CLAUDE.md` cho luồng Face ID) **9/9** — bước c "nhập PIN, bấm Bật" đi đúng route vừa đổi. (Lần chạy đầu 4 bước ✗ vì thư mục ảnh `OUT` tôi chỉ định chưa tạo — ENOENT, không phải lỗi giao diện; tạo thư mục, chạy lại 9/9.) e2e không chạy lại: phần đổi chỉ là danh sách phía máy khách + tài liệu.
