# Trả sau: làm hết nợ và gộp với ADR-0170, 0171 — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đóng bảy mục nợ và các việc chưa làm của Trả sau, gộp đúng với luật vé mới, làm phần cài đặt của ADR-0172, luật vận hành của ADR-0173, rồi đưa lệnh phát hành.

**Architecture:** Mọi việc thi hành ADR đã duyệt. Số «chưa về công ty» chỉ còn một hàm dùng chung. Cổng Trả sau đổi từ «tin bài quét chữ» sang «trình biên dịch buộc qua cổng» và bảng bài chạy thật.

**Tech Stack:** TypeScript, Cloudflare Worker, D1, `node --test`, khung thử `tests/audit/harness.mjs`, e2e `tests/e2e/`.

**Spec:** `docs/adr/ADR-0168-thanh-toan-tra-sau-va-han-muc.md` và `docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md` (đang ở nhánh Trả sau), `docs/adr/ADR-0170-doi-tac-xem-va-gui-ve-cua-don-minh.md`, `docs/adr/ADR-0171-siet-tien-va-ve-sau-kiem-doc-lap-0170.md`; nợ ở `docs/superpowers/plans/2026-11-05-tra-sau-thi-cong-nhat-ky.md` (nhánh Trả sau).

**Xây trên lỗ đang hở:** `TRA-SAU-NO-MOT-PHAN` (`docs/quyen-hoan.json`); chỉ thi công Task 2 trở đi sau khi bản sửa lỗi này đã lên production.

**Nhánh thi công:** nhánh mới từ `origin/main` sau khi ADR-0170, 0171 đã nhập. Đính chính 5/11: Trả sau đã lên `main` từ 15:28 nhưng `0141` đã áp production từ bản 2.67 (kiểm 5/11 bằng lệnh chỉ đọc) — Trả sau đã chạy trên production, lỗi tính nợ có trên bản đó; phần nối của Task 1 Step 1 đã làm trên nhánh ADR-0170 (`b7d759af`).

## Global Constraints

- **Diễn tập khôi phục `HC-5.19` dời tới 2026-12-31, không hỏi lại.** Theo ADR-0172, Trả sau lên khi xong và người kiểm độc lập đạt, không chờ diễn tập. Việc của `docs/adr/ADR-0172-cai-dat-cong-no-theo-gio-va-an-han.md` nằm ở Task 4.
- Task 1 đã làm trên nhánh `claude/adr-0170-doi-tac-xem-ve` (nối bản chính 5/11, nơi ADR-0170, 0171 đang nằm) vì ADR-0170, 0171 chưa lên `origin/main`; khi nhập nhánh này vào `main` thì Task 1 thành có trên `main`. Task 2 trở đi chỉ bắt đầu sau khi nhánh này đã nhập.
- `0141_tra_sau_han_muc` đã trên `main`: không sửa. Task 4, Task 4b đổi cấu trúc bằng một migration mới theo số kế tiếp, kể cả `term_days` sang giờ và `credit_due_date` sang hai mốc giờ. Giữ cảnh báo đụng trigger `orders_delivered_lock` ở `docs/HANDOFF-N1.md`.
- AI không `git push`, không nhập `main`, không triển khai. Không sửa `docs/adr/`.
- Tiền là `INTEGER` VNĐ, chỉ tính ở máy chủ. Câu người dùng thấy bằng tiếng Việt có dấu; tên nút tra `docs/BANG-THAM-CHIEU.md`.
- `orders` không import `billing`, không đọc `bil_`, `vdt_`.
- Bộ kiểm dài (`npm test`, `npm run test:e2e`, Chrome) chạy một lần ở Task 5, kiểm `ps` trước.
- Giả định ghi sổ, không hỏi lại: mục nợ 5 và 6 đúng với ADR nên giữ cách làm, chỉ thêm bài ghim (xem Task 3).

## Review Focus

Mỗi dòng đã có bài ở task sở hữu.

1. Đơn Trả sau 1.000.000 ₫, đối tác ghi «Công ty thu» đủ rồi nộp 1.000 ₫: nợ phải là 999.000 ₫, hạn mức không trống ra (lỗi nộp một phần của ADR-0170 có cùng gốc ở `noTheoDon`). Task 1.
2. Đường dẫn khách của đơn Trả sau trong hạn: thấy đủ vé dù chưa thu; quá hạn còn nợ: vé chưa mở không hiện, vé đã mở vẫn xem. Task 1.
3. Văn phòng huỷ đơn Trả sau còn nợ đúng lúc vé vừa mở: bị chặn, đơn và sổ không đổi. Task 2.
4. Đơn đã thu một phần, sửa tăng số khách trong phần hạn mức còn lại: được; vượt: 409. Task 3.
5. Đọc nợ lỗi khi gộp hồ sơ: lệnh gộp không chạy. Task 3.

---

### Task 1: Nối nền, gộp luật vé và số nợ

**Files:**
- Modify: `src/modules/billing/tra-sau.ts`, `src/modules/ve-dien-tu/index.ts`, `src/index.ts`, `src/shared/router.ts`, `web/ve-don.ts`, `migrations/0141_*` (chỉ đổi số nếu trùng), sổ thi công Trả sau
- Test: `src/tra-sau-ve.test.ts`, `src/modules/billing/tra-sau.test.ts`

**Interfaces:**
- Consumes (từ `main`): `soChuaVeCongTy({ receipts, lines, doiChieu, nguoiLapPartyId, congTyId, khaiThem? }): { nguoiLapGiu, choXacNhan }`; `tienDonVe` trả `choXacNhan`, `nguoiXemLaDoiTac`; `ctx.veDaMoCuaDon`; cổng đường dẫn khách của ADR-0171 Đ2.
- Produces: một `veDaMoCuaDon` duy nhất; `moVeDuoc` đứng ở mọi chỗ trên `main` đang gọi `thuDu` để mở vé, gồm cả hai route đường dẫn khách.

- [x] **Step 1: Nối.** `git merge origin/main` (làm 5/11, commit b7d759af; ghép theo đoạn «Ghép với ADR-0168» ở mục chờ phát hành của `docs/HANDOFF-N1.md`). Sau bước này chỉ còn một `veDaMoCuaDon`, kiểu `tienDonVe` có cả `traSau` và `choXacNhan`.
- [x] **Step 2: Bài đỏ.** Ở `tra-sau.test.ts`, tên «nợ đơn Trả sau theo tiền đã về công ty»: `cong_ty` 1.000.000 nộp 1.000 → `no === 999_000`; nộp đủ → 0; `toi` 200.000 + khai 100.000 do người khác → nợ tính đủ cả hai; đại lý khác giữ «Bên kia đã nhận» → còn nợ tới khi nộp. Ở `tra-sau-ve.test.ts`: đường dẫn khách, trong hạn thấy đủ vé; quá hạn còn nợ không trả ảnh vé chưa mở và không đóng dấu; vé đã mở vẫn trả; đơn Trả sau của tài khoản giữ quyền Đối tác: đối tác tự mở trong hạn (ADR-0170 Đ2 mục 6). (Thực tế: bài nằm ở `src/tra-sau-no-doi-tac.test.ts` chứ không ở `tra-sau.test.ts`, vì cần khung thử có đối tác và vé; thêm ca khoản chuyển từ đơn huỷ của đối tác khác ở mục I-2.)
- [x] **Step 3: Chạy, đỏ.** `node --test src/modules/billing/tra-sau.test.ts src/tra-sau-ve.test.ts`. (Đã thấy đỏ: trả `tra-sau.ts` về bản cũ ⇒ đỏ bài C-A.)
- [x] **Step 4: Viết** (đã làm 5/11, commit 66618a26). `noTheoDon` lấy `dangDoiChieu`, `benDatDangGiu` từ `soChuaVeCongTy` với `nguoiLapPartyId` = bên đặt, bỏ phép tính riêng; `noMotDon` giữ chữ ký. Cổng đường dẫn khách đổi sang `moVeDuoc`.
- [x] **Step 5: Chạy, xanh** gồm `src/modules/billing/*.test.ts`, `src/modules/ve-dien-tu/*.test.ts`, `src/tra-sau-*.test.ts`, `src/architecture.test.ts`, `npm run typecheck`. Commit. (Đã chạy xanh 5/11, commit 66618a26 và các commit sau trên nhánh.)

### Task 2: Huỷ đơn và đường làm nợ tăng — THI CÔNG XONG 2026-11-06, CHỜ KIỂM ĐỘC LẬP (nhánh `claude/festive-payne-7371a2`, commit 93176bfb và bản sửa thứ tự câu gác ở lô huỷ)

Đóng nợ 1, 2, 4.

**Files:**
- Modify: `src/modules/orders/tra-sau-cong.ts`, `src/modules/orders/index.ts`, `src/modules/orders/repository.ts`, `src/modules/dispatch/index.ts`, `src/index.ts`, `src/modules/billing/phan-dinh.ts`, `src/modules/billing/coc.ts`
- Test: `src/tra-sau-duong-ghi.test.ts`

**Interfaces:**
- Produces: `congHuyTraSau(...)` trả `{ loi: Response } | { qua: QuaCongHuy }`, trong đó `qua.chanVeDaMo: boolean` và `qua.kem: (at) => D1PreparedStatement[]`. Tương tự `QuaCongDoiBen`, `QuaCongSuaTang`. Ba kiểu mang nhãn riêng (`unique symbol`), chỉ cổng tạo được.
- `soanHuyDon`, `changeBooker`, `soanSuaSoKhach` bắt buộc nhận kiểu nhãn tương ứng ở tham số. Câu chặn vé trong lô dùng lại `soanTraVeKhiHuy({ chanVeDaMo })`, cờ = `holdsPartner(actor) || qua.chanVeDaMo`.

- [x] **Step 1: Bài đỏ:** «vé mở chen giữa lúc kiểm và lúc huỷ, đơn Trả sau còn nợ, người bấm là văn phòng» ở cả `/status` và `handler-cancel`, dùng `chenTruocLo`: 409 `tra_sau_con_no_da_mo_ve`, đơn còn `confirmed`, số dòng `bil_*`, `audit_log` không đổi. Bảng bài `DUONG_GHI` chạy thật, mỗi dòng khẳng định phiên bản bên đặt tăng đúng 1: hoàn tiền, đảo khoản, sửa khoản, huỷ dòng giữ hộ, huỷ dòng nộp, chuyển cọc sang đơn Trả sau, ghi theo phân định, đảo khoản phân định.
- [x] **Step 2: Chạy, đỏ.** (3 bài đua đỏ: đơn bị huỷ 200; bảng đỏ ở chuyển cọc, ghi theo phân định, và đường bảng tự tìm ra: duyệt điều chỉnh sổ.)
- [x] **Step 3: Viết.** Nối `cauTangChoDon` vào lô `ghiChuyen`, `ghiTheoPhanDinh`, `daoKhoan`. Đổi chữ ký ba hàm sang kiểu nhãn; huỷ khi hết nợ cũng gác phiên bản qua `qua.kem`. Câu bảo vệ thắng trong lô thì dịch ra cùng câu `CAU_HUY_CON_NO`. (Thực tế: thêm `duyetYeuCau` và nhánh đổi bên chịu; `daoKhoan` đã tăng qua `chuanBiLoThay` nên không nối thêm. Kiểu nhãn đặt ở `insertMoneyAdjustment` — câu ghi duy nhất của `soanSuaSoKhach` — vì tổng mới chỉ biết bên trong hàm đó; `cancelOrder` xoá.)
- [x] **Step 4: Xoá ba bài `QUÉT` đọc chữ** cho `soanHuyDon`, `changeBooker`, `soanSuaSoKhach` vì `npm run typecheck` đã buộc; xoá bài đếm `cauTangChoDon` vì bảng đã chạy thật. Thử phá: gọi `soanHuyDon` không kiểu nhãn thì typecheck đỏ; bỏ `cauTangChoDon` ở `ghiChuyen` thì bảng đỏ; hoàn nguyên. Ghi `docs/SO-HANG-RAO.md`.
- [x] **Step 5: Chạy, xanh** gồm `src/tra-sau-*.test.ts`, `npm run typecheck`. Commit.

### Task 3: Cổng sửa tăng, gộp hồ sơ, hai mục ghim — THI CÔNG XONG 2026-11-06, CHỜ KIỂM ĐỘC LẬP (commit c3725654; chặn gộp hồ sơ còn nợ đã có ở Task 4b)

Đóng nợ 3, 5, 6, 7.

**Files:**
- Modify: `src/modules/orders/tra-sau-cong.ts`, `src/shared/router.ts`, `src/modules/parties/index.ts`, `src/index.ts`
- Test: `src/tra-sau-duong-ghi.test.ts`, `src/shared/han-muc-tra-sau-hien-thi.test.ts`

**Interfaces:**
- Consumes: `traSauCuaDon(orderId): { no, hanTra, benDat, version } | null`.
- Produces: `GopHoSoNoi.conNoTraSau` thành bắt buộc, không còn dấu `?`.

- [x] **Step 1: Bài đỏ.**
  - Hạn mức 500.000, đơn 600.000 đã về công ty 400.000 (nợ 200.000), sửa tăng lên 800.000: 200 (nợ mới 400.000). Tăng lên 1.000.000: 409 `vuot_han_muc`, câu nói đúng phần còn được dùng.
  - Đọc nợ trả `null` khi sửa tăng: 503 `tra_sau_chua_dung_duoc`.
  - Gộp: `conNoTraSau` ném lỗi thì xem trước và lệnh gộp không ghi; hồ sơ giữ nguyên.
  - Ghim nợ 6: tài khoản giữ quyền Đối tác gửi `benDat` của người khác vẫn nhận số của mình; `FIELD` 403; phản hồi chỉ có đúng ba khoá `coHanMuc`, `conDuocDung`, `coDonQuaHan`.
  - Ghim nợ 5: hạ hạn mức xuống dưới số đang nợ thì màn danh sách trả đúng cảnh báo và đơn mới bị chặn; đơn cũ không đổi.
- [x] **Step 2: Chạy, đỏ.** Hai mục ghim có thể xanh ngay: ghi rõ trong sổ là bài ghim, không phải sửa lỗi. (Đỏ: bài 500.000/600.000/400.000, bài 503, câu báo bài văn phòng. Xanh ngay = bài ghim: nợ 5, nợ 6, gộp hồ sơ lỗi đọc nợ.)
- [x] **Step 3: Viết.** `congSuaTangTraSau` đọc `traSauCuaDon`, gọi `kiemDon` với `total = no + tongMoi − order.total`. (Thực tế: gửi PHẦN TĂNG, không `boQuaDon` — cùng bất đẳng thức, câu 409 nói đúng «đang nợ» gồm nợ của đơn; gác phiên bản bằng số `traSauCuaDon` đọc trước.) Bỏ `?.` và `?? Promise.resolve([])` ở `parties/index.ts`, `router.ts`; sửa khung thử nếu chưa tiêm.
- [x] **Step 4: Thử phá** công thức tăng và đường gộp, đỏ rồi hoàn nguyên. Ghi sổ hàng rào: R-CRD-3 «chỉ cảnh báo, dựa vào người xem», có lý do từ `scripts/audit-checks.mjs`.
- [x] **Step 5: Chạy, xanh.** Commit.

### Task 4: Cài đặt công nợ theo ADR-0172 — XONG 2026-11-06 (nhánh `claude/cong-no-0172-0173-372c0c`, kiểm độc lập ĐẠT)

**Files:**
- Create: migration theo số kế tiếp
- Modify: `docs/data-dictionary.json`, `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/shared/tra-sau.ts`, `src/modules/billing/tra-sau.ts`, `src/modules/billing/tra-sau-repo.ts`, `src/modules/billing/index.ts`, `src/modules/orders/tra-sau-cong.ts`, `web/cap-dai-ly.ts`, `web/han-muc-tra-sau.ts`, `src/shared/han-muc-tra-sau-hien-thi.ts`
- Create: `web/o-cong-no.ts`
- Test: `src/shared/tra-sau.test.ts`, `src/modules/billing/tra-sau-csdl.test.ts`, `src/tra-sau-duong-ghi.test.ts`

**Interfaces:**
- Produces: `hanTraTu(xacNhanLuc: string, gio: number): string` và `hetAnHanTu(hanTra: string, gioAnHan: number): string` trả ISO UTC; `trangThaiHan(i: { hanTra: string | null; hetAnHan: string | null; bayGio: string; no: number }): "trong_han" | "an_han" | "qua_han"`; `quaHan` đổi thành `trangThaiHan(...) === "qua_han"`. Cột `bil_credit_limit.term_hours`, `grace_hours`; `orders.credit_due_at`, `orders.credit_grace_until` thay `credit_due_date`.
- `moVeDuoc` nhận `bayGio` thay `homNay`. Mọi nơi đang truyền ngày đổi theo.

- [ ] **Step 1: Bài đỏ** theo sáu tiêu chí nghiệm thu của ADR-0172, đúng các số trong đó. Thêm ca chặn tự đặt: tài khoản Quản trị đồng thời là hồ sơ đại lý đặt cho chính mình: 403. Thêm ca: `SALES_MANAGER`, `HR`: 403. Bài gợi ý: bật không gửi số: 400; đổi số gợi ý: công nợ đã bật không đổi.
- [ ] **Step 2: Chạy, đỏ.**
- [ ] **Step 3: Dữ liệu.** Trong migration mới: `term_hours INTEGER CHECK (term_hours BETWEEN 1 AND 8760)`, `grace_hours INTEGER NOT NULL DEFAULT 0 CHECK (grace_hours BETWEEN 0 AND 8760)`; bảng `bil_credit_tier_default` theo khuôn `updated_at`, `updated_by` của `src/architecture.test.ts`; hai cột giờ trên `orders`; sửa các trigger, view đang nhắc `credit_due_date`, `term_days`. `npm run dict`.
- [ ] **Step 4: Máy chủ.** Cổng theo giờ; lô xác nhận chụp hai mốc từ một mốc giờ máy chủ duy nhất của request. Thêm cột `ADMIN` vào ô ghi hạn mức, ghim ở `permissions.test.ts`. Route đặt số gợi ý theo cấp. Đọc cấp qua view của `pricing`, không đọc bảng.
- [ ] **Step 5: Giao diện.** `web/o-cong-no.ts` theo khuôn `web/cot-cap-dai-ly.ts`, không `innerHTML`, ô gõ 16px; `/han-muc-tra-sau` bỏ phần ghi; nút điều hướng tới `/cap-dai-ly`. Đo `src/goi-trang-nhe.test.ts`. Trang màn đơn hiện hạn trả có giờ.
- [ ] **Step 6: Thử phá** từng luật giờ và ô quyền, đỏ rồi hoàn nguyên; dòng sổ hàng rào. Chạy các tệp bài bị đụng, `npm run typecheck`, `npm run build:web`. Commit.

### Task 4b: Luật vận hành theo ADR-0173 — XONG 2026-11-06 (cùng nhánh)

**Files:**
- Modify: `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/modules/billing/tra-sau.ts`, `src/modules/billing/tra-sau-repo.ts`, `src/modules/billing/index.ts`, `src/modules/parties/index.ts`, `src/index.ts`, migration mới của Task 4, `web/o-cong-no.ts`, `web/order.ts`, chỗ tính kỳ trả hoa hồng (tra `docs/CHANGE-GUIDE.md`), chỗ gửi tin Nền tảng hiện có
- Create: `web/cong-no-cua-toi.ts`, kèm khai `PAGES` và `build:web`
- Test: `src/tra-sau-van-hanh.test.ts`, `tests/e2e/tra-sau.mjs`

- [ ] **Step 1: Bài đỏ** đúng chín tiêu chí nghiệm thu của ADR-0173, với đúng các số trong đó.
- [ ] **Step 2: Chạy, đỏ.**
- [ ] **Step 3: Đ1.** Bảng trần, so trần ở máy chủ; route nới hạn `POST /api/tra-sau/don/:orderId/noi-han`, thân `{ hanMoi, lyDo }`, ghi nhật ký trong cùng lô, gác phiên bản bên đặt.
- [ ] **Step 4: Đ3.** Kiểm trước cách kỳ trả hoa hồng đang chọn đơn; thêm điều kiện còn nợ bằng 0. Nhắc nợ gắn vào lịch chạy định kỳ hiện có, khoá chống lặp theo đơn và mốc; chưa có lịch chạy thì dừng báo điều phối vì đây là cấu hình triển khai. Đường đại lý xem lấy `partyId` từ phiên. Luật ngừng hồ sơ đi qua hàm tiêm bắt buộc, lỗi thì chặn.
- [ ] **Step 5: Thử phá** từng điều, đỏ rồi hoàn nguyên, ghi sổ hàng rào. Chạy các tệp bài bị đụng, `npm run typecheck`, `npm run build:web`. Commit.

### Task 5: Việc chưa làm, tên nút, kiểm tổng — MỘT PHẦN (tên nút «Ân hạn», «Trả sau», «Mức tối đa Quản trị được cấp», «Trả sau của tôi» chủ chọn 6/11; kiểm tổng của Task 4/4b đã chạy)

**Files:**
- Modify: `tests/e2e/tra-sau.mjs`, `src/shared/bang-tham-chieu*.ts`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/HANDOFF-N1.md`, sổ thi công Trả sau

- [ ] **Step 1: e2e vé của đơn Trả sau**, gieo kho theo `moLo`, `themVe` ở `tests/e2e/ve-dien-tu.mjs`: xác nhận, đối tác mở và gửi; nộp một phần vẫn còn nợ; đường dẫn khách thấy đủ vé; không huỷ được khi còn nợ và đã mở; thu đủ rồi «Xong và đủ tiền». Bộ `run.mjs` đã chạy `audit-invariants` ở cuối nên đóng mục đó, không viết thêm.
- [x] **Bài còn thiếu từ Task 1 (người kiểm 5/11):** (XONG 2026-11-06, commit 30bbb103, bài ghim; «đại lý khác» làm bằng quầy nhà cung cấp cầm tiền.) thêm vào `src/tra-sau-no-doi-tac.test.ts` hai ca: đại lý khác giữ tiền «Bên kia đã nhận» thì vẫn còn nợ; khoản `toi` cùng khoản khai của người khác. Task 1 Step 2 đánh dấu xong trước khi có hai bài này.
- [ ] **Step 2: Lệch bảng từ.** Chạy `node --test src/bang-tham-chieu.test.ts`; còn đỏ ở `web/hoa-hong-cap.ts:149` thì xem có do nhánh này không, không phải thì ghi sổ nợ chung, không sửa ở đây.
- [ ] **Step 3: Tên nút.** Điều phối hỏi chủ MỘT lần về «Đặt hạn mức», «Ngừng hạn mức», «Hạn mức trả sau», «Còn được dùng» và tên ô công nợ (chữ «Công nợ» đang trùng «Sổ công nợ»), kèm hai chữ «Thời hạn trả», «Ân hạn»: mỗi tên kèm 2–3 phương án, có khuyến nghị. Ghi lời chủ vào nguồn bảng từ bằng Edit, `npm run tham-chieu`. Tên «Xong và đủ tiền» đã chốt, không hỏi lại.
- [ ] **Step 4: Tài liệu.** Sổ thi công: đánh dấu đóng từng mục nợ kèm commit. `HANDOFF-N1`: mục chờ phát hành nêu migration, «không chờ diễn tập theo ADR-0172», số bản đặt lúc phát hành. Hướng dẫn bài «Cấp hạn mức trả sau cho đối tác» đổi theo màn mới.
- [ ] **Step 5: Một lần duy nhất:** `npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản `tra-sau-smoke` khổ 390 và 1440 kèm `AXE_JS`. Đọc đầu ra, ghi sổ.
- [ ] **Step 6: `nguoi-kiem-doc-lap`** đọc toàn nhánh theo ADR-0168, 0170, 0171, 0172, 0173, chạy lại, tự thử phá. Chỉ báo đạt theo báo cáo đó.
- [ ] **Step 7: Đưa lệnh.** Đạt thì đưa chủ lệnh `npm run day-len` và `npm run trien-khai`, kèm câu cần thử trên iPhone thật. Không tự chạy.

---

## Đối chiếu ADR-0172, ADR-0173 (phiên thi công 2026-11-06)

ADR thắng kế hoạch khi lệch. Các điểm đã chốt trước khi viết mã:

1. **Migration `0143`** (`0142` đã thuộc nhánh «Có vé» chưa nhập). Chỉ mở rộng: thêm `term_hours`, `grace_hours` (`bil_credit_limit`), `credit_due_at`, `credit_grace_until` (`orders`); GIỮ và vẫn ghi `term_days` (= trần giờ/24, kẹp 1..365) và `credit_due_date` (= ngày Việt Nam của `credit_due_at`) để lùi về 2.68 vẫn an toàn và luật `audit-checks` cũ vẫn xanh. Bỏ hai cột cũ để lần phát hành sau (ghi `HANDOFF-N1`). Dựng lại `bil_credit_limit_close_only`, `v_ord_don_tra_sau`, `orders_delivered_lock`. Trigger mới: hai mốc giờ của đơn chỉ đi về sau, khoảng ân hạn giữ nguyên. Bảng mới: `bil_credit_setting` (mức tối đa Quản trị được cấp, chỉ thêm), `bil_credit_tier_default` (số gợi ý theo cấp), `bil_credit_reminder` (chống gửi lặp tin nhắc, khoá đơn + loại + mốc).
2. **Giờ.** Hai mốc tính trong lô xác nhận từ CHÍNH `at` của lô (bằng `confirmed_at`), không dùng `today`. So chuỗi chỉ đúng khi cả hai bên là `toISOString()`. Nới hạn: hết ân hạn mới = hạn mới + (hết ân hạn cũ − hạn cũ) của chính đơn.
3. **Hai nghĩa «quá hạn».** Trong ân hạn: chỉ báo. Hết ân hạn: chặn đơn Trả sau mới và vé chưa mở. `coDonQuaHan` = hết ân hạn. Đường hẹp `con-duoc-dung` giữ đúng ba khoá.
4. **Lệch kế hoạch theo ADR.** (a) Nới hạn ghi cột của `orders` nên route nằm ở `orders` (SQL ở tệp nửa nghiêm), không ở `billing`. (b) Đại lý xem nợ: ADR nói «mục nhỏ trong trang của đối tác» nên là một mục trong trang có sẵn, không tạo `web/cong-no-cua-toi.ts`. (c) Đã có Cron 15 phút nên tin nhắc gắn vào `scheduled()`; bỏ câu «chưa có lịch chạy thì dừng». «Lúc quá hạn» = lúc tới hạn trả (ADR-0172 gọi khoảng ân hạn là quá hạn). Đại lý chưa có tài khoản thì không có người nhận tin (giả định, ghi lại).
5. **Hoa hồng (ADR-0173 Đ3.1).** Dòng hoa hồng chỉ sinh ở bước «Xong và đủ tiền», mà đơn Trả sau còn nợ bị giữ ở bước đó (ADR-0168 Đ3 mục 2) nên điều này đã có sẵn theo cấu trúc: làm bài ghim + thử phá, không dựng cơ chế mới.
6. **Ngừng hồ sơ còn nợ.** Phủ mọi đường kết thúc đại lý: gỡ vai được hưởng cuối cùng, ngưng tài khoản / bỏ quyền Đối tác, gộp hồ sơ, phiếu xoá. `conNoTraSau` thành bắt buộc (đóng mục nợ của Task 3), lỗi thì chặn.
7. **Quyền.** `credit.limit.write` → Quản trị + Toàn quyền; `credit.limit.view` thêm Quản trị (ADR-0172 trang ghép (2) ghi người xem gồm Quản trị; bảng cũ thiếu). Ô mới: `credit.ceiling.write` (chỉ Toàn quyền), `credit.due.extend` (Quản trị, Toàn quyền), `credit.own.view` (Đối tác, phạm vi `own`). Tự đặt cho chính hồ sơ mình: 403. Quản trị vượt mức tối đa hoặc chưa có mức tối đa: 403.
8. **Tên (chủ chọn 2026-11-06 trong hộp hỏi):** ô ở màn Cấp độ đại lý «Trả sau»; nút lùi hạn trả «Ân hạn» (lưu ý: trùng chữ với số giờ ân hạn, đã báo chủ một lần); con số giới hạn «Mức tối đa Quản trị được cấp»; mục của đại lý «Trả sau của tôi». «Thời hạn trả», «Ân hạn» (số giờ) dùng nguyên chữ của ADR.
9. **Điều kiện «xây trên lỗ đang hở».** Bản sửa nộp một phần (Task 1) đã nằm trong lịch sử của nhánh này nên không thể lên production thiếu nó; không chặn.
10. **Thứ tự:** Task 4 → 4b, rồi Task 2, 3 nếu còn sức; phần chưa làm ghi rõ ở báo cáo.
