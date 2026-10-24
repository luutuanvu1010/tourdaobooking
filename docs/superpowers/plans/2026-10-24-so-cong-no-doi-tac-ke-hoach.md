# Sổ công nợ theo đối tác — Kế hoạch thi công (ba phần đã duyệt chưa dựng)

> **Vai của tệp:** kế hoạch (người lập kế hoạch, phiên 2026-10-24/25, worktree `so-cong-no-kiem-718026`). **Không thi công** trong phiên này. Hồ sơ có ngày: viết xong là đóng băng, có gì mới thì viết bản mới trỏ về đây.
> **Nguồn:** `docs/superpowers/specs/2026-10-24-phan-tich-gop-y-ho-tro-ke-hoach.md` mục 7.3, 7.4, 8; `docs/adr/ADR-0081-doi-tac-xem-so.md` (accepted 2026-10-01); `docs/adr/ADR-0116-phan-dinh-trach-nhiem-va-hoan-tien-sau-da-giao.md` (accepted 2026-10-13) và phụ lục `docs/superpowers/specs/2026-10-13-de-xuat-adr-hc-4-2-va-adr-0088-d9/de-xuat-adr-0088-d9.md`.
> **Việc lớn** (tiền, quyền, dữ liệu): cả ba phần cần **người kiểm độc lập chỉ đọc** sau thi công (CLAUDE.md §3, Hiến pháp N8). Người thi công không tự nghiệm thu.
> **Mốc đo mã:** nhánh `claude/so-cong-no-kiem-718026`, commit `1ea824a0` (bài khoá bất biến sổ). Số dòng/tên hàm người thi công kiểm lại lúc bắt đầu.

## 0. Điều đã có (đừng làm lại)

- Bài khoá **«số dư theo bên = tổng dòng nợ»**: `src/modules/billing/so-du-bang-tong-dong-no.test.ts` (6 bài; phá thử `SUM`→`MAX` ở `balancesWithOwner` làm ca nhiều đơn cùng đại lý đỏ). Mọi phần dưới đây phải giữ bài này xanh.
- Route đọc cho Kế toán: `GET /api/ledger` (`soCongNo` → `soDu[]`, `choXacNhan[]`, `chuaRo[]`), `GET /api/ledger/ky`, `GET /api/ledger/coc*`. Chưa có **trang** nào dùng `soDu[]` làm màn «Sổ công nợ».
- Hàm một nguồn: `phaiThuLucGiao` / `conLai` (billing), `soDuTheoBen` (`rules.ts`), view `v_bil_party_balance`.

## 1. Xây trên lỗ đang hở

Đối chiếu `docs/quyen-hoan.json` (đọc 2026-10-24): mục `phat_hien` còn mở **TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2**. Đặc tả/kế hoạch này chạm vùng sổ công nợ nên phải ghi:

| Phần | Xây trên lỗ | Ghi chú |
|---|---|---|
| P1 Màn Sổ công nợ | **TNV-G4** (phần còn chờ Đ5d, Đ6a), **HC-4.2** (ADR-0115 đã giải phần lớn; chờ người kiểm đối chiếu rồi xoá mục) | Màn chỉ ĐỌC; không thêm đường ghi nên không làm lỗ rộng thêm. Cần chủ duyệt «xây trên lỗ» có ghi lý do hoặc chờ vá. |
| P2 ADR-0081 | **TNV-G3**, **TNV-G4** | Đọc sổ; số dư phía đối tác bám đúng các dòng đã được trigger bảo vệ. |
| P3 ADR-0116 | **TNV-G3** (chính nó — chốt đóng), **TNV-G4** (Đ5d tin báo cùng hạ tầng) | Phần này là cái VÁ lỗ G3. Hạn mục G3 trong sổ: 2026-11-30 (đã gia hạn 17/10); nếu không kịp, chủ gia hạn bằng diff có lý do. |

Hạn 2026-11-30 của G1/G3/G4/HC-4.2 và 2026-11-05 của HC-5.19 là **hạn thật** — quá hạn thì `npm test` đỏ. Kế hoạch này nên xong P3 trước 11-30 hoặc xin gia hạn sớm.

**Vùng Mức TA (ADR-0117 lần 2, `prc_*`)** — chỗ còn hở/dựa vào kỷ luật, ghi lại để P1–P3 không vô tình đạp lên:
1. «MỘT hàm chọn mức» (`chonMuc`) chỉ canh bằng kỷ luật/grep — `hoa-hong-mot-nguon.test.ts` canh nơi TÍNH TIỀN, không đếm số hàm chọn mức (`docs/SO-HANG-RAO.md`, dòng «`chonMuc` chín bậc»).
2. Lớp lọc ngày trong câu SQL `role_tiers_on` không có bài nào đỏ khi bỏ riêng nó (đột biến M2b xanh).
3. `can(view)` ở các route GET mới của Mức TA chỉ canh bằng hàng rào tĩnh `route-write-guard`, không bằng bài hành vi.
4. Chờ chủ: Danh bạ lộ TÊN LOẠI cho tài khoản lai (`BL-ADR0117-DANH-BA-TEN-LOAI`).
5. Nhánh `claude/user-feedback-analysis-3be3a7` đã mang migration `0118_muc_ta_gan_rieng` (ADR-0138 nháp, chờ duyệt) — xem §6 về số migration.
6. Hàng rào B-5(b) ADR-0078 (`ben-kia.test.ts`): trần của riêng quầy chưa trừ phần Tour Đảo thu dư — ghim hiện trạng, **chờ chủ quyết**; chạm thẳng tiền phía nhà cung cấp, nên P2 không được hiển thị số «còn lại tại quầy» cho đến khi chủ quyết.
7. `R-BIL-2` chưa cộng phiếu điều chỉnh (chờ duyệt ADR-0137 Đ2) — bất biến kiểm định kỳ chưa phủ vùng điều chỉnh; bài mới ở §0 phủ phần dòng nợ nhưng **không** thay `R-BIL-2`.

## 2. Thứ tự và phụ thuộc

`P1 Màn Sổ công nợ → P2 ADR-0081 → P3 ADR-0116`

- P1 trước: chỉ đọc, không quyền mới, không migration; cho Kế toán nhìn thấy số thật để rồi P2/P3 có chỗ đối chiếu.
- P2 sau P1: dùng lại cách dựng số dư và bài bất biến, thêm **một ô quyền** (`ledger.partner.view`) và DTO riêng.
- P3 cuối: nặng nhất (bảng mới + đổi ba trigger của luật I1 + ô quyền + tin báo). ADR-0116 ghi «thi công sau ADR-0115 đợt công nợ» (cùng bảng `bil_posting`).
- Không song song hai phần cùng ghi `permissions.ts` hoặc `billing/index.ts` (hai người ghi không đụng cùng tệp).

**Người kiểm độc lập:** bắt buộc cả ba. P1 nhẹ nhất (một lượt, tập trung vào «màn chỉ đọc không lộ quyền, không ghi»); P2 và P3 mỗi phần một lượt riêng, P3 nên hai vòng (đụng trigger).

## 3. Điểm cần chủ — chặn trước khi bắt đầu

| # | Cần chủ | Chặn phần nào |
|---|---|---|
| C1 | **Ảnh phác màn «Sổ công nợ theo đối tác» (Kế toán/Quản trị)** vẽ trên Claude Design. Chưa có ảnh thì **không viết `web/`** (`web/CLAUDE.md`, Bài học Đợt D: thứ nhìn thấy phải hỏi). | P1 phần giao diện |
| C2 | **Ảnh phác màn «Sổ của tôi» cho Đối tác** (tên màn, vị trí trong menu Đối tác — ADR-0081 «Điều chưa chắc»). | P2 phần giao diện |
| C3 | **Câu C9 của ADR-0081:** có hiện mức % của chính đối tác không (mặc định ẩn). | P2 DTO |
| C4 | **Xác nhận ca vàng mới** của ADR-0116 (`SV-PD-01…06`, số do AI đề xuất, cần Kế toán hoặc chủ xác nhận). | P3 nghiệm thu |
| C5 | Duyệt «xây trên lỗ đang hở» cho P1–P3 (§1) hoặc xác nhận vá lỗ trước. | cả ba |
| C6 | **Số migration**: kiểm lại ở **mọi nhánh** lúc bắt đầu (§6). Lúc viết: `main` cao nhất `0117`, nhánh `claude/user-feedback-analysis-3be3a7` có `0118`. | P3 |
| C7 | Chạy `node scripts/audit-invariants.mjs --db remote` (chỉ đọc) để có bằng chứng thật cho `R-BIL-*` — chủ tự chạy (CLAUDE.md §8). | nghiệm thu P1–P3 |

## 4. Các task

### P1 — Màn «Sổ công nợ theo đối tác» (Kế toán, Quản trị)

**Quyền:** dùng ô `ledger.view` hiện có (Kế toán `any`); **không ô mới, không migration**. Route `GET /api/ledger` đã có; cho phép thêm route đọc chi tiết theo bên **nếu cần** (cổng `office`, cùng ô) — hỏi chủ nếu thêm hợp đồng.

**Tiêu chí nghiệm thu (viết trước khi làm):**
1. Tổng các dòng `soDu[]` trên màn **bằng** tổng tính độc lập từ `bil_debt_line` (bài §0 giữ xanh; thêm một ca e2e chạm trang thật).
2. Mỗi bên bấm vào thấy **danh sách đơn** của bên đó, tổng các đơn **bằng** số dư của bên (đẳng thức hiển thị được trên màn: «Σ đơn = số dư»).
3. Dấu nhất quán với `balancesWithOwner`: dương = bên đó đang giữ/nợ công ty; âm = công ty nợ bên đó. Nhãn tiếng Việt, không mã trạng thái thô.
4. Người không có `ledger.view any` (Bán hàng, HDV, Đối tác…) gọi route/mở trang → 403 / không thấy mục menu (**cả chỗ ẩn/hiện giao diện**, Bước ghép khi duyệt).
5. Không dòng giá vốn/tỷ lệ nào lộ cho vai không được biết (Kế toán được biết; Quản trị: giữ như `ledger.view` hôm nay).
6. Màn chỉ ĐỌC: không nút ghi, không route POST mới.
7. `npm run typecheck`, `npm test`, kịch bản Chrome tương ứng (`web/CLAUDE.md`, có `AXE_JS`) xanh; trang mới khai `PAGES` (`src/shared/sw-policy.ts`) và `build:web`.

**Tasks:** (a) bài e2e/hợp đồng trước (đỏ) → (b) trang `public/so-cong-no.html` + `web/so-cong-no.ts` (**sau khi có ảnh phác C1**) → (c) mục menu theo quyền + `docs/SYSTEM-DESIGN.md`/`CHANGE-GUIDE.md` → (d) dòng ở `docs/SO-HANG-RAO.md` (bài bất biến §0, ngày thấy chặn thật 2026-10-25 — đã có, ghi lại).
**Người kiểm độc lập:** có (1 lượt).

### P2 — ADR-0081: Đối tác xem sổ của chính mình

**Quyền:** **một ô mới** `ledger.partner.view` (PARTNER `own`, SUPER `any`, còn lại `none`); `ledger.view` cột PARTNER **giữ** `none`. Route `GET /api/ledger/doi-tac` (cổng `orders`, module `billing`). DTO mới `SoDoiTacResponse` dựng từng trường theo danh sách trắng (khuôn `ReceiptDto`). Thêm ô ⇒ bài «tập con quyền» nhân đôi (512 → 1024) — kiểm thời gian chạy. Không migration (ADR chưa ghi cột mới; nếu thi công cần chỉ số thì hỏi chủ).

**Tiêu chí nghiệm thu** (nguyên văn ADR-0081 «Tiêu chí nghiệm thu» + bổ sung):
1. Ví dụ E-1, E-2, E-3 thành test route, khớp từng đồng.
2. Bốn hàng rào của ADR, mỗi cái **thấy đỏ một lần** rồi hoàn nguyên: bài số lạ sổ đối tác (gieo `480.017`, `470.019`…), khoá tên trường `SoDoiTacResponse`, không chọn được bên (gửi `?partyId=` vẫn trả sổ của chính mình), ghim hàng `ledger.partner.view` + `ledger.view` PARTNER.
3. Tài khoản chỉ-PARTNER không gắn hồ sơ ⇒ sổ rỗng; tài khoản chung công ty ⇒ sổ của hồ sơ công ty.
4. `SALES, ACCOUNTING, ADMIN, FIELD, INTERN, DRIVER, DRIVER_PARTNER` gọi `/api/ledger/doi-tac` ⇒ 403. Chỉ-PARTNER gọi `/api/ledger/mine` ⇒ 403 như hôm nay.
5. **Bổ sung:** bài `conLai` của mỗi đơn = tổng có dấu các dòng được tính (`HELD, HOA_HONG, GIAM_GIA_BEN_DAT, SETTLEMENT, REFUND`, KHÔNG `GIA_VON`), và `tong` = Σ `conLai` các đơn liệt kê — tính độc lập từ `bil_debt_line`, cùng khuôn bài §0, ca hồ sơ hai vai (vừa đặt vừa là nhà cung cấp) không lộ giá vốn.
6. Hiển thị: mọi chỗ giao diện ẩn/hiện theo `ledger.partner.view` (menu Đối tác) khớp cổng route.

**Tasks:** (a) bài hợp đồng + số lạ (đỏ) → (b) ô quyền + `permissions.test.ts` → (c) hàm số dư phía đối tác (MỘT hàm, `billing`) + route + DTO → (d) giao diện «Sổ của tôi» (**sau ảnh phác C2, quyết C3**) → (e) tài liệu + dòng sổ hàng rào (4 dòng, mỗi cái có ngày thấy chặn thật).
**Người kiểm độc lập:** có (1–2 lượt; trọng tâm: không lộ giá vốn/tỷ lệ/bên khác qua `tong`, `conLai`, tham số).

### P3 — ADR-0116: Phân định trách nhiệm và hoàn tiền sau «Đã giao»

**Quyền:** **hai ô mới** `attribution.request` (Kế toán, Quản trị, Toàn quyền) và `attribution.decide` (Quản trị, Toàn quyền); ghi sổ dùng `ledger.write` (+ `payment.refund` nếu có tiền ra). **Một migration** (bảng `bil_attribution` + trigger chỉ-thêm; dựng lại ba trigger của `0083`). Số: xem §6. Cập nhật `docs/data-dictionary.json` + `npm run dict`.

**Tiêu chí nghiệm thu:** mười một mục §3 của `de-xuat-adr-0088-d9.md` (nguyên văn), tóm tắt: I1 giữ mọi lúc; T4 không tiền ra; người ghi ≠ người phân định (máy chủ **và** trigger); trần cộng dồn; trả khách sau Đã giao cần `attribution_id` hợp lệ; bên chịu không là khách; tháng đã khoá; ba nhóm quyền; T11 quá 7 ngày hiện đỏ; đảo; và dọn chỗ giả định «giảm trừ = 0» (`thay-lan-thu.ts`, `service.ts`, R-BIL-1, các bài cũ). **Bổ sung:** (i) bài §0 xanh với đơn có giảm trừ (số dư theo bên = tổng dòng nợ kể cả dòng nợ của bên chịu); (ii) mỗi trigger dựng lại **thấy đỏ một lần** (tắt `WHEN 0` hoặc khoá giá trị) rồi hoàn nguyên, ghi `docs/SO-HANG-RAO.md`; (iii) `docs/quyen-hoan.json`: sửa mục TNV-G3 (xoá hoặc nêu phần còn hở) — **chủ sửa/duyệt**, không tự sửa.

**Tasks:** (a) ca vàng `SV-PD-01…06` vào `golden/` ở trạng thái `cho_xac_nhan` + bài lớp 2 (đỏ) → (b) migration + trigger + bài `migrations-*` → (c) luật thuần phân định (`rules.ts`) + một hàm «phải thu hiện hành» → (d) lệnh ba bước ở `service.ts` (một `db.batch`, thứ tự cổng → nhật ký → câu có dấu lệnh → trạng thái cuối) + ba route → (e) tin báo người thu cũ/mới + ô đếm → (f) giao diện «Phân định trách nhiệm» (**cần ảnh phác — chưa có, hỏi chủ**) → (g) sổ hàng rào, `SYSTEM-DESIGN` §16, dictionary.
**Người kiểm độc lập:** có, **hai vòng**; một vòng chỉ đọc trigger/dữ liệu, một vòng ở hành vi + quyền. Đây là phần duy nhất bắt buộc chủ xác nhận ca vàng trước khi gọi «xong».

## 5. Chưa kiểm / không làm trong kế hoạch này

- Chưa chạy `audit-invariants` (cả local lẫn remote); chưa đo trên dữ liệu production.
- Chưa dựng hoặc chốt giao diện nào; không đoán hình hai màn sổ.
- Không đụng nút Từ chối/hạn mức, không đụng ADR-0138 (Mức TA riêng).
- YC-0013 «lọc còn công nợ» ở danh sách đơn thuộc Lượt A, phiên khác.

## 6. Số migration (CLAUDE.md §10)

Kiểm lúc viết (`git ls-tree migrations/` trên mọi nhánh cục bộ): `main` và các nhánh khác cao nhất `0117_han_muc_tu_choi.sql`; nhánh `claude/user-feedback-analysis-3be3a7` có thêm `0118_muc_ta_gan_rieng.sql`. P3 cần **một** migration ⇒ số kế tiếp ≥ `0119` **nếu** `0118` đó vào `main` trước, hoặc `0118` nếu P3 vào trước — **phải kiểm lại lúc thi công** (`ls migrations` + liệt kê mọi nhánh/worktree chưa gộp). P1 và P2 không dùng số.
