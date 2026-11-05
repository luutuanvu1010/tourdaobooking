# Trả sau: làm hết nợ và gộp với ADR-0170, 0171 — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đóng bảy mục nợ và các việc chưa làm của Trả sau, gộp đúng với luật vé mới, để nhánh sẵn sàng phát hành ngay khi có diễn tập khôi phục.

**Architecture:** Không có luật mới; mọi việc thi hành ADR đã duyệt. Số «chưa về công ty» chỉ còn một hàm dùng chung. Cổng Trả sau đổi từ «tin bài quét chữ» sang «trình biên dịch buộc qua cổng» và bảng bài chạy thật.

**Tech Stack:** TypeScript, Cloudflare Worker, D1, `node --test`, khung thử `tests/audit/harness.mjs`, e2e `tests/e2e/`.

**Spec:** `docs/adr/ADR-0168-thanh-toan-tra-sau-va-han-muc.md` và `docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md` (đang ở nhánh Trả sau), `docs/adr/ADR-0170-doi-tac-xem-va-gui-ve-cua-don-minh.md`, `docs/adr/ADR-0171-siet-tien-va-ve-sau-kiem-doc-lap-0170.md`; nợ ở `docs/superpowers/plans/2026-11-05-tra-sau-thi-cong-nhat-ky.md` (nhánh Trả sau).

**Nhánh thi công:** `claude/partner-type-ta-oracle-18-efd687`. Kế hoạch này nằm trên nhánh ADR-0170, tới nhánh Trả sau khi nối `main` ở Task 1.

## Global Constraints

- **Diễn tập khôi phục `HC-5.19` chủ để sau (5/11, «Diễn tập sau»).** Điều kiện của ADR-0168 không đổi: chưa diễn tập thì không nhập `main`, không triển khai. Kế hoạch này dừng ở «nhánh sẵn sàng».
- Task 1 chỉ bắt đầu khi ADR-0170, 0171 đã trên `origin/main`. Chưa có thì dừng trước Task 1, không chép mã từ nhánh kia.
- Không migration mới, trừ khi đổi số tệp `0141_tra_sau_han_muc` theo số lớn nhất trên `main` lúc nối. Giữ cảnh báo đụng trigger `orders_delivered_lock` ở `docs/HANDOFF-N1.md`.
- AI không `git push`, không nhập `main`, không triển khai. Không sửa `docs/adr/`.
- Tiền là `INTEGER` VNĐ, chỉ tính ở máy chủ. Câu người dùng thấy bằng tiếng Việt có dấu; tên nút tra `docs/BANG-THAM-CHIEU.md`.
- `orders` không import `billing`, không đọc `bil_`, `vdt_`.
- Bộ kiểm dài (`npm test`, `npm run test:e2e`, Chrome) chạy một lần ở Task 4, kiểm `ps` trước.
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

- [ ] **Step 1: Nối.** `git merge origin/main`. Xử lý theo mục «người nhập ADR-0168» ở `docs/HANDOFF-N1.md`. Sau bước này chỉ còn một `veDaMoCuaDon`, kiểu `tienDonVe` có cả `traSau` và `choXacNhan`.
- [ ] **Step 2: Bài đỏ.** Ở `tra-sau.test.ts`, tên «nợ đơn Trả sau theo tiền đã về công ty»: `cong_ty` 1.000.000 nộp 1.000 → `no === 999_000`; nộp đủ → 0; `toi` 200.000 + khai 100.000 do người khác → nợ tính đủ cả hai; đại lý khác giữ «Bên kia đã nhận» → còn nợ tới khi nộp. Ở `tra-sau-ve.test.ts`: đường dẫn khách, trong hạn thấy đủ vé; quá hạn còn nợ không trả ảnh vé chưa mở và không đóng dấu; vé đã mở vẫn trả; đơn Trả sau của tài khoản giữ quyền Đối tác: đối tác tự mở trong hạn (ADR-0170 Đ2 mục 6).
- [ ] **Step 3: Chạy, đỏ.** `node --test src/modules/billing/tra-sau.test.ts src/tra-sau-ve.test.ts`.
- [ ] **Step 4: Viết.** `noTheoDon` lấy `dangDoiChieu`, `benDatDangGiu` từ `soChuaVeCongTy` với `nguoiLapPartyId` = bên đặt, bỏ phép tính riêng; `noMotDon` giữ chữ ký. Cổng đường dẫn khách đổi sang `moVeDuoc`.
- [ ] **Step 5: Chạy, xanh** gồm `src/modules/billing/*.test.ts`, `src/modules/ve-dien-tu/*.test.ts`, `src/tra-sau-*.test.ts`, `src/architecture.test.ts`, `npm run typecheck`. Commit.

### Task 2: Huỷ đơn và đường làm nợ tăng

Đóng nợ 1, 2, 4.

**Files:**
- Modify: `src/modules/orders/tra-sau-cong.ts`, `src/modules/orders/index.ts`, `src/modules/orders/repository.ts`, `src/modules/dispatch/index.ts`, `src/index.ts`, `src/modules/billing/phan-dinh.ts`, `src/modules/billing/coc.ts`
- Test: `src/tra-sau-duong-ghi.test.ts`

**Interfaces:**
- Produces: `congHuyTraSau(...)` trả `{ loi: Response } | { qua: QuaCongHuy }`, trong đó `qua.chanVeDaMo: boolean` và `qua.kem: (at) => D1PreparedStatement[]`. Tương tự `QuaCongDoiBen`, `QuaCongSuaTang`. Ba kiểu mang nhãn riêng (`unique symbol`), chỉ cổng tạo được.
- `soanHuyDon`, `changeBooker`, `soanSuaSoKhach` bắt buộc nhận kiểu nhãn tương ứng ở tham số. Câu chặn vé trong lô dùng lại `soanTraVeKhiHuy({ chanVeDaMo })`, cờ = `holdsPartner(actor) || qua.chanVeDaMo`.

- [ ] **Step 1: Bài đỏ:** «vé mở chen giữa lúc kiểm và lúc huỷ, đơn Trả sau còn nợ, người bấm là văn phòng» ở cả `/status` và `handler-cancel`, dùng `chenTruocLo`: 409 `tra_sau_con_no_da_mo_ve`, đơn còn `confirmed`, số dòng `bil_*`, `audit_log` không đổi. Bảng bài `DUONG_GHI` chạy thật, mỗi dòng khẳng định phiên bản bên đặt tăng đúng 1: hoàn tiền, đảo khoản, sửa khoản, huỷ dòng giữ hộ, huỷ dòng nộp, chuyển cọc sang đơn Trả sau, ghi theo phân định, đảo khoản phân định.
- [ ] **Step 2: Chạy, đỏ.**
- [ ] **Step 3: Viết.** Nối `cauTangChoDon` vào lô `ghiChuyen`, `ghiTheoPhanDinh`, `daoKhoan`. Đổi chữ ký ba hàm sang kiểu nhãn; huỷ khi hết nợ cũng gác phiên bản qua `qua.kem`. Câu bảo vệ thắng trong lô thì dịch ra cùng câu `CAU_HUY_CON_NO`.
- [ ] **Step 4: Xoá ba bài `QUÉT` đọc chữ** cho `soanHuyDon`, `changeBooker`, `soanSuaSoKhach` vì `npm run typecheck` đã buộc; xoá bài đếm `cauTangChoDon` vì bảng đã chạy thật. Thử phá: gọi `soanHuyDon` không kiểu nhãn thì typecheck đỏ; bỏ `cauTangChoDon` ở `ghiChuyen` thì bảng đỏ; hoàn nguyên. Ghi `docs/SO-HANG-RAO.md`.
- [ ] **Step 5: Chạy, xanh** gồm `src/tra-sau-*.test.ts`, `npm run typecheck`. Commit.

### Task 3: Cổng sửa tăng, gộp hồ sơ, hai mục ghim

Đóng nợ 3, 5, 6, 7.

**Files:**
- Modify: `src/modules/orders/tra-sau-cong.ts`, `src/shared/router.ts`, `src/modules/parties/index.ts`, `src/index.ts`
- Test: `src/tra-sau-duong-ghi.test.ts`, `src/shared/han-muc-tra-sau-hien-thi.test.ts`

**Interfaces:**
- Consumes: `traSauCuaDon(orderId): { no, hanTra, benDat, version } | null`.
- Produces: `GopHoSoNoi.conNoTraSau` thành bắt buộc, không còn dấu `?`.

- [ ] **Step 1: Bài đỏ.**
  - Hạn mức 500.000, đơn 600.000 đã về công ty 400.000 (nợ 200.000), sửa tăng lên 800.000: 200 (nợ mới 400.000). Tăng lên 1.000.000: 409 `vuot_han_muc`, câu nói đúng phần còn được dùng.
  - Đọc nợ trả `null` khi sửa tăng: 503 `tra_sau_chua_dung_duoc`.
  - Gộp: `conNoTraSau` ném lỗi thì xem trước và lệnh gộp không ghi; hồ sơ giữ nguyên.
  - Ghim nợ 6: tài khoản giữ quyền Đối tác gửi `benDat` của người khác vẫn nhận số của mình; `FIELD` 403; phản hồi chỉ có đúng ba khoá `coHanMuc`, `conDuocDung`, `coDonQuaHan`.
  - Ghim nợ 5: hạ hạn mức xuống dưới số đang nợ thì màn danh sách trả đúng cảnh báo và đơn mới bị chặn; đơn cũ không đổi.
- [ ] **Step 2: Chạy, đỏ.** Hai mục ghim có thể xanh ngay: ghi rõ trong sổ là bài ghim, không phải sửa lỗi.
- [ ] **Step 3: Viết.** `congSuaTangTraSau` đọc `traSauCuaDon`, gọi `kiemDon` với `total = no + tongMoi − order.total`. Bỏ `?.` và `?? Promise.resolve([])` ở `parties/index.ts`, `router.ts`; sửa khung thử nếu chưa tiêm.
- [ ] **Step 4: Thử phá** công thức tăng và đường gộp, đỏ rồi hoàn nguyên. Ghi sổ hàng rào: R-CRD-3 «chỉ cảnh báo, dựa vào người xem», có lý do từ `scripts/audit-checks.mjs`.
- [ ] **Step 5: Chạy, xanh.** Commit.

### Task 4: Việc chưa làm, tên nút, kiểm tổng

**Files:**
- Modify: `tests/e2e/tra-sau.mjs`, `src/shared/bang-tham-chieu*.ts`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/HANDOFF-N1.md`, sổ thi công Trả sau

- [ ] **Step 1: e2e vé của đơn Trả sau**, gieo kho theo `moLo`, `themVe` ở `tests/e2e/ve-dien-tu.mjs`: xác nhận, đối tác mở và gửi; nộp một phần vẫn còn nợ; đường dẫn khách thấy đủ vé; không huỷ được khi còn nợ và đã mở; thu đủ rồi «Xong và đủ tiền». Bộ `run.mjs` đã chạy `audit-invariants` ở cuối nên đóng mục đó, không viết thêm.
- [ ] **Step 2: Lệch bảng từ.** Chạy `node --test src/bang-tham-chieu.test.ts`; còn đỏ ở `web/hoa-hong-cap.ts:149` thì xem có do nhánh này không, không phải thì ghi sổ nợ chung, không sửa ở đây.
- [ ] **Step 3: Tên nút.** Điều phối hỏi chủ MỘT lần về «Đặt hạn mức», «Ngừng hạn mức», «Hạn mức trả sau», «Còn được dùng»: mỗi tên kèm 2–3 phương án, có khuyến nghị. Ghi lời chủ vào nguồn bảng từ bằng Edit, `npm run tham-chieu`. Tên «Xong và đủ tiền» đã chốt, không hỏi lại.
- [ ] **Step 4: Tài liệu.** Sổ thi công: đánh dấu đóng từng mục nợ kèm commit. `HANDOFF-N1`: mục chờ phát hành nêu «chờ diễn tập khôi phục», migration, số bản đặt lúc phát hành.
- [ ] **Step 5: Một lần duy nhất:** `npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản `tra-sau-smoke` khổ 390 và 1440 kèm `AXE_JS`. Đọc đầu ra, ghi sổ.
- [ ] **Step 6: `nguoi-kiem-doc-lap`** đọc toàn nhánh theo ADR-0168, 0170, 0171, chạy lại, tự thử phá. Chỉ báo đạt theo báo cáo đó.
- [ ] **Step 7: Dừng.** Báo chủ nhánh sẵn sàng, còn diễn tập khôi phục; không đưa lệnh `day-len` trước khi diễn tập xong.
