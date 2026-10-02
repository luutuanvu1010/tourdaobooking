# Đợt 0 — luồng L (ADR-0094, bản mở rộng): sổ thi công

> **Vai:** thi công (Hiến pháp P15). Không lập kế hoạch lại, không tự nghiệm thu (N8). Kế hoạch: `2026-10-02-khac-phuc-audit-01-dot-0-chong-ghi-trung-quyen-tien.md` §7.
> **Nhánh / worktree:** `worktree-dot-0-luong-l` ở `.claude/worktrees/dot-0-luong-l`, tách từ `main` cục bộ `df6bc864` (chưa lên `origin/main`: nhánh mang theo cả các commit kế hoạch + gia hạn TNV-G1 của `gia-han-tnv-g1`).
> **Xây trên lỗ đang hở: F-02** (HIGH, hạn 2026-10-15, `docs/quyen-hoan.json`). Lớp này là cách vá. Nếu tới 12/10 kiểm độc lập vòng 2 chưa ĐẠT → báo chủ ngay.

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
