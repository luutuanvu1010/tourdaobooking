# ADR-0131 — Thu hẹp đọc nhật ký: kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người không qua ô `audit.view` thấy lịch sử đơn và thông báo **không có tên / mã người làm**, theo danh sách cho phép đóng mặc định; Toàn quyền thấy đủ như hôm nay.

**Architecture:** Thêm một tệp thuần `src/shared/lich-su-noi-bo.ts` (khuôn D-1 của `lich-su-doi-tac.ts`) cho lớp nội bộ; route `GET /api/orders/:id` chọn một trong ba lớp (Đối tác / đầy đủ / nội bộ). Thông báo đổi điều kiện "có tên" ở `src/shared/thong-bao.ts` sang `audit.view && !holdsPartner`. Không ô quyền nào đổi giá trị, không migration.

**Tech Stack:** TypeScript, Cloudflare Worker, D1/SQLite, `node --test` (chạy `.ts` trực tiếp), khung thử `tests/audit/*.mjs`, e2e `tests/e2e/*.mjs`.

**Spec:** `docs/adr/ADR-0131-nhat-ky-kiem-toan-chi-toan-quyen-doc-du.md` (accepted 2026-10-18) + trang ghép `docs/superpowers/specs/2026-10-18-thu-hep-doc-nhat-ky/TRANG-GHEP.md` (mục 4 = bảng mã hành động và cách giữ chữ — nguồn của danh sách nội bộ).

## Global Constraints
- Không migration. **Không đổi giá trị ô nào** trong `MATRIX` (`src/shared/permissions.ts`); `src/shared/permissions.test.ts` phải xanh không sửa.
- Danh sách Đối tác (`LICH_SU_DOI_TAC_CHO_PHEP`, tập giá trị `LICH_SU_DOI_TAC_AN`) **không đổi**; chỉ thêm việc bỏ tên.
- Lớp rút gọn (nội bộ và Đối tác): mọi dòng `staffId: null`, `staffName: ""` (chuỗi rỗng — **không** `null`, để giao diện cũ còn lưu trên máy không in "null"). Đây là nhãn trung tính ADR đ2a giao người thi công chọn: **kế hoạch chọn chuỗi rỗng**.
- Chữ người dùng thấy: tiếng Việt có dấu; gọi hệ thống là "Nền tảng".
- `src/shared/*` import nhau **kèm đuôi `.ts`**; `web/` không import `src/modules/`; không `innerHTML`.
- Sửa hành vi: bài kiểm **đỏ trước, xanh sau**. Commit nhỏ, thông điệp tiếng Việt (tiêu đề nói việc, thân nói vì sao), kèm dòng đồng tác giả của môi trường. **Không `git push`**, không merge.
- Máy đang rất tải (load ~140, nhiều phiên khác): chạy từng tệp bằng `node --test <tệp>`; `npm run typecheck` sau mỗi task; `npm test` toàn bộ **một lần** ở cuối mỗi task, không chạy song song với lần chạy khác.

## Review Focus
1. Tài khoản lai **Bán hàng + Đối tác**: phải nhận lớp Đối tác không tên (không phải lớp nội bộ) — bài ở Task 2.
2. Tài khoản lai **Toàn quyền + Đối tác**: lịch sử đơn = lớp Đối tác không tên; thông báo **không** tên — bài ở Task 2 và Task 3.
3. Dòng do **hệ thống** làm (`staff_id` NULL → "Hệ thống (tự động)"): ở lớp rút gọn cũng `staffName: ""` (không trường hợp riêng) — bài ở Task 1.
4. **Giao diện cũ** còn lưu: mọi dòng lớp rút gọn có `typeof staffName === "string"` — bài ở Task 2.
5. Người xem **là người lập / người phụ trách**: tên người lập vẫn ở `order.staffName` (đầu trang), tên người phụ trách vẫn ở chữ dòng "đổi người phụ trách" — đúng ADR, không phải rò; bài quét tên độc nhất dùng **người thứ ba** — Task 2.

---

### Task 1: Lớp nội bộ thuần + Đối tác bỏ tên

**Files:**
- Create: `src/shared/lich-su-noi-bo.ts`, `src/shared/lich-su-noi-bo.test.ts`
- Modify: `src/shared/lich-su-doi-tac.ts` (xuất `giuChiTiet`, thêm `anNguoiLam`, `lichSuChoDoiTac` bỏ tên; sửa chú thích đầu tệp "Tên người làm GIỮ NGUYÊN…" → bỏ theo ADR-0131)
- Modify: `src/lich-su-don-doi-tac.test.ts` (chỉ phần khẳng định của **Đối tác / tài khoản lai Đối tác**: tên người làm nay `""`, mã `null`; phần người nội bộ để Task 2)

**Interfaces:**
- Produces (`src/shared/lich-su-doi-tac.ts`):
  - `export function giuChiTiet(cach: CachGiuChiTiet, detail: string | null): string | null` (hàm sẵn có, nay xuất ra)
  - `export function anNguoiLam(e: AuditEntryDto): AuditEntryDto` → `{ ...e, staffId: null, staffName: "" }` (dòng mới, không sửa đầu vào)
  - `lichSuChoDoiTac(history, xemNhapKeToan)` giữ chữ ký; mọi dòng trả ra đã qua `anNguoiLam`.
- Produces (`src/shared/lich-su-noi-bo.ts`):
  - `export const LICH_SU_NOI_BO_CHO_PHEP` — `as const satisfies Partial<Record<AuditAction, CachGiuChiTiet>>`; giá trị đúng bảng trang ghép mục 4: mọi mã nhóm "Đơn đổi gì" và "Tiền của đơn trong sổ" = `"giu"`, riêng `order_claimed: "bo"`.
  - `export const LICH_SU_NOI_BO_AN` — `as const satisfies readonly AuditAction[]`: `exported_png`, `exported_pdf`, `order_accounting_entry_marked`, `order_accounting_entry_unmarked` (hiện qua ngoại lệ ô, như D-1), và mọi hành động không gắn đơn (gồm `ledger_settlement`, `ledger_period_closed`, `prc_*`). Được ghép từ hằng chung nếu người thi công tách ra từ D-1, miễn tập giá trị `LICH_SU_DOI_TAC_AN` không đổi.
  - `export const _phanLoaiNoiBoDay` — hàng rào kiểu: `Exclude<AuditAction, keyof typeof LICH_SU_NOI_BO_CHO_PHEP | (typeof LICH_SU_NOI_BO_AN)[number]>` khác `never` ⇒ không biên dịch.
  - `export const daPhanLoaiChoNoiBo = (action: string): boolean`
  - `export function lichSuNoiBo(history: readonly AuditEntryDto[], xemNhapKeToan: boolean): AuditEntryDto[]` — dòng nhập kế toán nguyên chữ khi `xemNhapKeToan`; dòng ngoài `CHO_PHEP` bỏ; dòng trong `CHO_PHEP` → `giuChiTiet`; **mọi** dòng ra qua `anNguoiLam`. Gọi SAU `lichSuTheoVai`.

- [ ] **Step 1: Viết bài đỏ `src/shared/lich-su-noi-bo.test.ts`**
  - `"mọi hành động của AUDIT_ACTIONS nằm ở ĐÚNG MỘT danh sách nội bộ"`: với mỗi khoá `AUDIT_ACTIONS`, `daPhanLoaiChoNoiBo(a) === true`; không khoá nào vừa ở `CHO_PHEP` vừa ở `AN`.
  - `"nội bộ thấy ít nhất mọi thứ Đối tác thấy"`: mọi khoá `LICH_SU_DOI_TAC_CHO_PHEP` có trong `LICH_SU_NOI_BO_CHO_PHEP`.
  - `"danh sách cho phép khớp bản chủ duyệt"`: `assert.deepEqual(LICH_SU_NOI_BO_CHO_PHEP, DUYET)` với `DUYET` chép tay trong bài từ trang ghép mục 4 (đổi danh sách = đổi bài cùng lúc).
  - `"lichSuNoiBo bỏ tên và mã người làm ở mọi dòng, kể cả dòng hệ thống"`: đầu vào gồm dòng `updated` (`staffId: "u1"`, `staffName: "Tên Độc Nhất 7391"`), dòng hệ thống (`staffId: null`, `staffName: "Hệ thống (tự động)"`); mọi dòng ra `staffId === null && staffName === ""`; `JSON.stringify(ra)` không chứa `"Tên Độc Nhất 7391"` và `"u1"`.
  - `"order_claimed giữ dòng, bỏ chữ"`: `{ action: "order_claimed", detail: "từ chưa có người phụ trách sang Tên Độc Nhất 7391" }` → một dòng, `detail === null`.
  - `"exported_png bị ẩn; dòng nhập kế toán chỉ khi có ô"`: `exported_png` → không có dòng; `order_accounting_entry_marked` → có khi `xemNhapKeToan=true`, không có khi `false`.
  - `"chữ giữ nguyên ở dòng cho thấy"`: `trip_updated` với `detail: "Tour đảo: giờ đi 08:00 → 09:00"` → `detail` y nguyên.
  - Trong `src/lich-su-don-doi-tac.test.ts` (hoặc bài thuần cạnh `lich-su-doi-tac.ts` nếu có): khẳng định dòng trả cho Đối tác có `staffId === null && staffName === ""`.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/lich-su-noi-bo.test.ts` → FAIL (không tìm thấy mô-đun).
- [ ] **Step 3: Viết `lich-su-noi-bo.ts` và sửa `lich-su-doi-tac.ts`** theo Interfaces.
- [ ] **Step 4: Chạy xanh** — `node --test src/shared/lich-su-noi-bo.test.ts src/lich-su-don-doi-tac.test.ts` → PASS (phần người nội bộ của bài D-1 chưa đổi vẫn phải xanh vì route chưa nối).
- [ ] **Step 5: Quan sát hàng rào chặn thật (P16)** — thêm tạm một khoá giả vào `AUDIT_ACTIONS` và vào CẢ HAI danh sách Đối tác (để chỉ hàng rào nội bộ còn kêu), `npm run typecheck` → ĐỎ ở `_phanLoaiNoiBoDay`; ghi ngày + câu lỗi vào báo cáo task; hoàn nguyên; typecheck xanh.
- [ ] **Step 6: `npm run typecheck` (0 lỗi) rồi `npm test` một lần; commit** — `git add src/shared/lich-su-noi-bo.ts src/shared/lich-su-noi-bo.test.ts src/shared/lich-su-doi-tac.ts src/lich-su-don-doi-tac.test.ts`.

### Task 2: Nối lớp vào `GET /api/orders/:id` + giao diện

**Files:**
- Modify: `src/modules/orders/index.ts` (khối ráp `history` trong route `GET /api/orders/:id`)
- Modify: `web/order.ts` (khối "Lịch sử": dòng in `· ${e.staffName}`)
- Modify: `src/shared/permissions.ts` (chỉ **chú thích** cạnh ô `audit.view` và `order.history.view`)
- Modify: `src/lich-su-don-doi-tac.test.ts` (bài D-1 (c): người nội bộ), `src/modules/orders/dat-gap-hien-thi.test.ts`
- Create: `src/lich-su-don-khong-ten.test.ts`

**Interfaces:**
- Consumes: `lichSuNoiBo`, `lichSuChoDoiTac` (Task 1); sẵn có `lichSuTheoVai`, `xemDuDatGap`, `laDongNhapKeToan`, `holdsPartner`, `can`.
- Produces: `history` theo luật: `!can(order.history.view, scope)` → `[]`; `holdsPartner` → lớp Đối tác (không đổi nhánh, nay không tên); `can(staff, "audit.view")` → đầy đủ như hôm nay (`lichSuTheoVai(raw, xemDuDatGap(staff))` lọc dòng nhập kế toán theo ô); còn lại → `lichSuNoiBo(lichSuTheoVai(raw, xemDuDatGap(staff)), xemNhapKeToan)`. `lichSuSoKhach` không đổi.

- [ ] **Step 1: Viết bài đỏ `src/lich-su-don-khong-ten.test.ts`** (khung `tests/audit/dieu-phoi-khung.mjs` như bài D-1; gieo thẳng `audit_log`):
  - Gieo một nhân viên thứ ba `seedStaff(… name: "Người Làm Độc Nhất 5821")`, không lập, không phụ trách đơn. Gieo cho họ các dòng gắn đơn: `trip_updated`, `order_money_adjusted`, `order_claimed` (chữ "từ chưa có người phụ trách sang Người Làm Độc Nhất 5821"), `exported_png`.
  - `"ADR-0131 TC1: sáu vai không thấy tên / mã người làm ở bất kỳ đâu"`: với SALES (đơn của mình), ACC, ADM, FIELD (đơn đang phụ trách), PARTNER (đơn của mình), INTERN (đơn của mình): `GET /api/orders/:id` 200; `history.length > 0`; `r.text` không chứa `"Người Làm Độc Nhất 5821"` và không chứa id nhân viên đó; mọi dòng `typeof staffName === "string"` và `staffId === null`.
  - `"TC2: Toàn quyền thấy đủ, có tên"`: SUP → có dòng `trip_updated` với `staffName === "Người Làm Độc Nhất 5821"`, có `exported_png`, dòng `order_claimed` giữ chữ.
  - `"TC3: order_claimed không chữ, exported_png không tới người không qua audit.view"` (ACC).
  - `"Review Focus 1–2: tài khoản lai SALES+PARTNER và SUPER_ADMIN+PARTNER nhận lớp Đối tác không tên"`: tập hành động = lớp Đối tác; không tên.
- [ ] **Step 2: Sửa bài cũ cho đúng luật mới (đỏ trước khi sửa mã):** bài D-1 (c) — ACC/ADM/SALES: tập hành động = khoá `LICH_SU_NOI_BO_CHO_PHEP` (+ dòng nhập kế toán khi có ô), `staffName === ""`, chữ theo `giuChiTiet`; SUP: tất cả, `staffName === "Kế Toán"`. `dat-gap-hien-thi.test.ts`: dòng 122 ("Quản trị") và 138/144 (`TEN_DUYET`) — người không qua `audit.view` nay `staffName === ""`; khẳng định tên người duyệt chuyển sang SUP.
- [ ] **Step 3: Chạy, thấy đỏ** — `node --test src/lich-su-don-khong-ten.test.ts src/lich-su-don-doi-tac.test.ts src/modules/orders/dat-gap-hien-thi.test.ts` → FAIL ở các khẳng định không tên.
- [ ] **Step 4: Sửa route** theo Produces; sửa chú thích dòng "ADR-0007/0009: nhật ký/lịch sử sửa đơn…" trong route và chú thích hai ô ở `permissions.ts` (ghi ADR-0131: `audit.view` = đọc nhật ký kiểm toán đầy đủ; `order.history.view` = mở khối lịch sử, lớp rút gọn).
- [ ] **Step 5: Sửa `web/order.ts`** — in `` ` · ${e.staffName}` `` chỉ khi `e.staffName` khác chuỗi rỗng; sửa chú thích khối ("D6: SALES không thấy nhật ký…") cho đúng ADR-0131.
- [ ] **Step 6: Chạy xanh** — ba tệp ở Step 3 + `node --test src/modules/orders/xem-don-theo-quyen.test.ts src/modules/orders/lich-su-so-khach-route.test.ts src/so-la-doi-tac.test.ts` → PASS.
- [ ] **Step 7: `npm run build:web`, `npm run typecheck`, `npm test` một lần; commit.**

### Task 3: Thông báo — tên người làm chỉ cho Toàn quyền

**Files:**
- Modify: `src/shared/thong-bao.ts` (hai chỗ `coTen`, `CAU_DIEU_CHINH`, nhánh `dieu_chinh` trong `locHopThongBao`)
- Modify: `src/shared/thong-bao.test.ts` (bài "K1"), `src/shared/thong-bao-giao.test.ts`, `src/shared/thong-bao-doi.test.ts`, `src/shared/web-push.test.ts` (chỗ nào mong có tên với người không phải Toàn quyền)
- Create hoặc mở rộng: bài route thật theo khuôn `src/modules/thongbao/tin-giao-don-hop.test.ts`

**Interfaces:**
- Produces: `const xemTenNguoiLam = (staff: PermissionHolder): boolean => can(staff, "audit.view") && !holdsPartner(staff)` (không xuất, trong `thong-bao.ts`). Tin đơn và tin đổi: `coTen = d.tenNguoiLam !== null && xemTenNguoiLam(staff)`. Tin điều chỉnh: `CAU_DIEU_CHINH` thành `Record<string, { coTen: (ten: string, ma: string) => string; khongTen: (ma: string) => string }>`; câu không tên (chữ cố định):
  - `ledger_adjustment_requested`: `Có yêu cầu điều chỉnh công nợ đơn ${m} — chờ bạn duyệt`
  - `ledger_adjustment_withdrawn`: `Yêu cầu điều chỉnh công nợ đơn ${m} đã được rút`
  - `ledger_adjustment_approved`: `Yêu cầu điều chỉnh công nợ đơn ${m} của bạn đã được duyệt`
  - `ledger_adjustment_rejected`: `Yêu cầu điều chỉnh công nợ đơn ${m} của bạn bị từ chối`
  - `ledger_adjustment_affected`: giữ `Số dư của bạn trên đơn ${m} vừa được điều chỉnh` (cả hai nhánh)
  - câu có tên giữ nguyên chữ hôm nay; dùng khi `d.tenNguoiLam !== null && xemTenNguoiLam(staff)`.
- Tin tài khoản (`tai_khoan`, chỉ Toàn quyền) và tin chuyến: không đổi.

- [ ] **Step 1: Sửa bài cho luật mới (đỏ):**
  - `thong-bao.test.ts` "K1" → đổi tên thành "ADR-0131: tên chỉ cho Toàn quyền không giữ quyền Đối tác": MAI (ACC) → `"Có đơn mới TD-20260927-0001"`, JSON không chứa "Hùng"; TAM (FIELD, đang phụ trách) → thấy tin, không tên; LAN với đơn của mình → `"Đơn … "` dạng không tên tương ứng (`CAU.xac_nhan.khongTen`); thêm SUP (`ai("sup","SUPER_ADMIN")`) → `"Hùng vừa lập đơn mới TD-20260927-0001"`; SUP+PARTNER → không tên.
  - `thong-bao-giao.test.ts`: (a) TAM → `"Đơn TD-20260927-0001 vừa được giao cho bạn phụ trách"`; (c) LAN, MAI → câu không tên của loại giao (`CAU.giao.khongTen`); thêm SUP đang phụ trách → `"Hùng vừa giao đơn TD-20260927-0001 cho bạn phụ trách"`.
  - Bài mới cho tin điều chỉnh: ACC (có `ledger.adjust.approve`) nhận `"Có yêu cầu điều chỉnh công nợ đơn … — chờ bạn duyệt"`; SUP nhận câu có tên.
  - Bài route thật: `GET /api/thong-bao/moi-nhat` và `GET /api/thong-bao` của một Kế toán sau khi một nhân viên tên độc nhất giao đơn → phản hồi không chứa tên đó.
- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/shared/thong-bao.test.ts src/shared/thong-bao-giao.test.ts src/shared/thong-bao-doi.test.ts src/shared/web-push.test.ts <bài route>` → FAIL ở các câu có tên.
- [ ] **Step 3: Sửa `thong-bao.ts`** theo Interfaces; sửa chú thích "ADR-0115 … chỉ tên người làm + mã đơn" cho đúng ADR-0131.
- [ ] **Step 4: Chạy xanh** cùng lệnh Step 2 → PASS.
- [ ] **Step 5: `npm run typecheck`, `npm test` một lần; commit.**

### Task 4: Chữ hướng dẫn, kịch bản kiểm thật, sổ hàng rào, tài liệu mô tả, nhật ký thay đổi

**Files:**
- Modify: `src/shared/huong-dan-ke-toan.ts` (dòng "Khối **Lịch sử** ở cuối trang ghi ai đã làm gì…", dòng "Khối **Lịch sử** của đơn cho biết ai huỷ, lúc nào.")
- Modify: `src/shared/tro-ly-kien-truc.ts` (câu "…ghi vào lịch sử của đơn: ai sửa, lúc nào.")
- Modify: `tests/e2e/orders.mjs`, `tests/e2e/trip.mjs`, `tests/e2e/dispatch.mjs` (các khẳng định `staffName` của lịch sử đơn khi đọc bằng tài khoản không phải Toàn quyền)
- Modify: `docs/SO-HANG-RAO.md` (dòng mới), `docs/CHANGE-GUIDE.md` (công thức thêm hành động nhật ký: bước 7 D-1 → thêm bước "xếp cả vào danh sách nội bộ `lich-su-noi-bo.ts`"), `docs/SYSTEM-DESIGN.md` (dòng ô `order.history.view` ở bảng ô → route, và dòng `GET /api/orders/:id`: ghi ba lớp theo ADR-0131)
- Modify: `src/shared/changelog.ts` (mục mới ĐẦU mảng), `src/shared/app-info.test.ts`

- [ ] **Step 1: Chữ hướng dẫn** (chữ cố định):
  - Kế toán: `4. Khối **Lịch sử** ở cuối trang ghi đơn đã đổi gì, lúc nào (tên người làm chỉ tài khoản Toàn quyền xem được). Khi số khách được sửa, lý do cũng hiện ở đây.`
  - Kế toán: `Khối **Lịch sử** của đơn cho biết đơn huỷ lúc nào và vì lý do gì.`
  - Trợ lý: `Mỗi lần sửa đơn đều được ghi vào lịch sử của đơn: đổi gì, lúc nào; tên người sửa chỉ người phụ trách hệ thống xem được.`
  - Chạy `node --test src/shared/huong-dan.test.ts` → PASS.
- [ ] **Step 2: e2e** — mỗi chỗ đang khẳng định `staffName` của lịch sử đơn bằng tài khoản không phải Toàn quyền (`orders.mjs` các khẳng định "nhật ký ghi đúng người…", `trip.mjs` "nhật ký ghi đúng người phụ trách", `dispatch.mjs` khẳng định `ch[0].staffName`): đọc lại cùng đơn bằng phiên Toàn quyền của `tests/e2e/lib.mjs` để giữ ý "ghi đúng người", và thêm một khẳng định phiên không phải Toàn quyền thấy `staffName === ""`. Chạy `npm run test:e2e -- orders trip dispatch` (cần mạng); không chạy được thì ghi rõ "chưa chạy e2e" kèm lý do.
- [ ] **Step 3: Sổ hàng rào** — một dòng: *Lớp nội bộ lịch sử đơn — danh sách cho phép (ADR-0131)* | chặn: hành động nhật ký mới tự lộ cho nhân viên nội bộ; tên / mã người làm tới người không qua `audit.view` (lịch sử đơn, thông báo) | cơ chế: kiểu `_phanLoaiNoiBoDay` (`npm run typecheck`) + `src/shared/lich-su-noi-bo.test.ts` + `src/lich-su-don-khong-ten.test.ts` + bài thông báo | ngày quan sát chặn thật: ngày ở Task 1 Step 5.
- [ ] **Step 4: Tài liệu mô tả** — `CHANGE-GUIDE.md`, `SYSTEM-DESIGN.md` như mục Files (tài liệu mô tả thua mã: sửa cùng commit).
- [ ] **Step 5: Nhật ký thay đổi** — mục `version: "2.18"` (số TẠM = 2.17 + 1; chú thích ghi "phiên phát hành kiểm lại số ở bước A.0 của docs/HANDOFF-N1.md"), `date: "2026-10-18"`, một mục `{ kind: "doi", text: "Khối Lịch sử của đơn và các thông báo về đơn không còn ghi tên người đã làm; chỉ tài khoản Toàn quyền xem được đầy đủ ai làm gì." }`; `app-info.test.ts` → `"Phiên bản 2.18 · ngày 18 tháng 10 năm 2026"`. Chạy `node --test src/shared/changelog.test.ts src/shared/app-info.test.ts` → PASS.
- [ ] **Step 6: Kịch bản Chrome** (luật `web/CLAUDE.md` cho `web/order.ts`): `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs` và `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` sau `npm run build:web` (cách chạy: `tests/e2e/README.md`). Không có Chrome + axe ngoài repo thì ghi "chưa chạy kịch bản Chrome" kèm lý do.
- [ ] **Step 7: `npm run typecheck`, `npm test` một lần; commit.**
