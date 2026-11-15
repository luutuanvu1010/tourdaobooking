# Đối tác xem và gửi vé của đơn mình lập: kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tài khoản giữ quyền Đối tác xem, gửi được vé của đơn mình lập khi tiền đã về công ty, và không tự huỷ được đơn đã mở vé.

**Architecture:** Luật tiền nằm ở `billing` (hàm thuần trong `rules.ts`, `tienDonVe` trả thêm số), `ve-dien-tu` không đọc `bil_`. Chặn huỷ do gốc lắp ráp tiêm hàm hỏi «đơn có vé đã mở không» vào `orders` và `dispatch`. Quyền mở sau cùng: Task 1, 2 chặn trước, Task 3 mới mở cửa, nên không có lúc nào đối tác mở được vé bằng lời tự ghi.

**Tech Stack:** TypeScript, Cloudflare Worker, D1, giao diện thuần `h()`, `node --test`.

**Spec:** `docs/adr/ADR-0170-doi-tac-xem-va-gui-ve-cua-don-minh.md`, `docs/superpowers/specs/2026-11-05-trang-ghep-doi-tac-xem-ve.md`. Mọi `node`/`npm` mở đầu bằng `export PATH=~/.nvm/versions/node/v22.22.2/bin:$PATH;`.

## Global Constraints

- Không migration, không bảng mới, không đổi nghĩa `thuDu`, không đổi số «đã thu» hiển thị ở nơi khác.
- `ve.kho.manage` không đổi; đối tác không vào kho.
- Tiêu chí Đ2 là tình trạng tiền; không dùng `bil_payment_receipt.created_by`.
- Câu cho đối tác: «Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.» Câu huỷ: «Đơn đã mở vé nên bạn không tự huỷ được. Liên hệ văn phòng.» Câu thiếu vé: «Còn thiếu vé. Bấm Cấp vé; nếu vẫn thiếu, báo văn phòng.»
- Chữ mới vào `docs/BANG-THAM-CHIEU.md` qua `src/shared/bang-tham-chieu*.ts` theo công thức z34; không đổi tên nút có sẵn.
- Đ1, Đ2, Đ3 lên cùng một bản. Mã vé không vào nhật ký, phản hồi, câu lỗi (`src/giay-to-khong-lo-so.test.ts` là khuôn bài).
- AI không chạy `git push`, không merge vào `main`, không deploy.

## Review Focus

1. Đối tác trả một phần qua Kế toán, phần còn lại tự ghi: chưa mở tới khi phần tự ghi về công ty; không được tính hai lần làm khoá sau khi đã nộp đủ.
2. Tài khoản đã thôi quyền Đối tác, đơn cũ của họ còn khoản giữ hộ: xét theo quyền hiện tại, khoản đó thôi bị trừ; nhân viên vẫn thấy dòng nợ ở sổ.
3. Đơn có vé đã mở, hai lần gọi huỷ song song của đối tác: cả hai 409, sổ và đơn không đổi.
4. Đối tác mở trang đơn khi kho thiếu một phần vé: thấy số giữ/cần, câu riêng, bấm Cấp vé không báo lỗi.
5. Không đọc được hồ sơ công ty hay quyền người lập: vé không mở, không ném lỗi 500.

---

### Task 0: Chốt nền và kiểm phiên song song

- [ ] **Step 1:** `git fetch origin`; làm trên nhánh `claude/adr-0170-doi-tac-xem-ve`, đưa lên đỉnh `origin/main` bằng `git merge --ff-only origin/main`. Nếu không tiến thẳng được thì dừng, báo chủ.
- [ ] **Step 2:** Xem nhánh `claude/partner-type-ta-oracle-18-efd687` (ADR-0168) đã nhập chưa: `git merge-base --is-ancestor claude/partner-type-ta-oracle-18-efd687 origin/main`. Đã nhập: cổng là `veMoDuoc` / `moVeDuoc`, hàm chặn huỷ `veDaMoCuaDon` và `ctx.veDaMoCuaDon` đã có, dùng lại, bỏ phần «thêm» ở Task 2. Chưa nhập: làm theo đúng chữ dưới đây và ghi vào sổ thi công việc nhánh kia phải gộp khi nhập (mục cuối).
- [ ] **Step 3:** Mở sổ `docs/superpowers/plans/2026-11-05-doi-tac-xem-ve-thi-cong-nhat-ky.md`, ghi nền đã chọn.

### Task 1: Đ2 — tiền đã về công ty

**Files:**
- Modify: `src/modules/billing/rules.ts`, `src/modules/billing/dat-coc.ts`, `src/shared/router.ts` (kiểu `tienDonVe`), `src/modules/ve-dien-tu/rules.ts`, `src/modules/ve-dien-tu/index.ts`, `web/ve-don.ts`, `src/shared/bang-tham-chieu*.ts`
- Test: `src/modules/billing/rules.test.ts`, `src/modules/ve-dien-tu/xem-giao-ve.test.ts`, tệp mới `src/modules/ve-dien-tu/doi-tac-mo-ve.test.ts`

**Interfaces:**
- Produces: `soChuaVeCongTy(i: { receipts; lines; doiChieu; nguoiLapPartyId: string; congTyId: string }): { nguoiLapGiu: number; choXacNhan: number }` trong `billing/rules.ts`. `tienDonVe` trả thêm `choXacNhan: number`; `daThu` đã trừ cả hai phần, chỉ khi người lập hiện giữ quyền Đối tác.
- Consumes: `khoanChoXacNhan`, `soKhaiChuaNop` (giữ nguyên chữ ký), view `v_stf_quyen_mo` (khuôn câu SQL ở `orders/xac-nhan-repo.ts`, `billing` tự khai câu của mình), `hoSoNhanVien`.

- [ ] **Step 1: Bài thuần đỏ** trong `billing/rules.test.ts`: `soChuaVeCongTy` với 600.000 ₫:
  - `toi` có dòng giữ hộ 600.000 trên người lập → `nguoiLapGiu: 600000`.
  - `cong_ty` tiền mặt, dòng giữ hộ trên người lập → `choXacNhan: 600000`.
  - `cong_ty` chuyển khoản, dấu `DECLARED` chưa `CONFIRMED` → `choXacNhan: 600000`; có `CONFIRMED` → 0.
  - lời khai `BOOKER` có `DECLARED` không dòng nợ → `choXacNhan: 600000`.
  - 250.000 `toi` + 350.000 `cong_ty` tiền mặt: sau khi dòng giữ hộ 350.000 bị đảo → tổng hai phần = 250.000.
  - Kế toán ghi `COMPANY` → cả hai 0.
  - khoản `toi` của nhân viên khác (người thu khác người lập) → cả hai 0.
- [ ] **Step 2:** `node --test src/modules/billing/rules.test.ts`. Đỏ vì chưa có hàm.
- [ ] **Step 3: Viết hàm.** Không cộng trùng: một khoản đã ở `khoanChoXacNhan` thì không tính vào `nguoiLapGiu`, và tổng hai phần không vượt tổng khoản còn hiệu lực.
- [ ] **Step 4:** Chạy lại, xanh.
- [ ] **Step 5: Bài route đỏ** ở `doi-tac-mo-ve.test.ts` (khung `tests/audit/xac-nhan-khung.mjs`, đối tác có dòng `pty_party_role` `TRAVEL_AGENCY` như đầu `src/modules/billing/dat-coc-route.test.ts`). Bảng ca, `thuDu` đọc bằng ADM qua `GET /api/ve/don/:orderId`:

```ts
// đối tác tự ghi (tiền đủ) → thuDu false, ảnh 403 với ADM
for (const [hinhThuc, nguoiThu] of [["CASH","toi"],["CASH","cong_ty"],["CASH","ben_dat"],["OTHER","cong_ty"],["BANK_TRANSFER","cong_ty"],["BANK_TRANSFER","toi"]]) { /* … */ }
// Kế toán sửa khoản `toi` giữ nguyên người thu → vẫn false
// Kế toán sửa `toi` → `cong_ty` → true
// ADM ghi `ben_dat` trên đơn đối tác (lời khai) → false; Kế toán bấm «Bên kia đã nhận» → false tới khi đối tác nộp
// Kế toán xác nhận «Công ty đã nhận» → true
// Bán hàng lập đơn, tự ghi `toi` → true (không đổi)
// Tài khoản thôi quyền Đối tác (UPDATE stf_permission đóng valid_to_at) → khoản giữ hộ thôi bị trừ
```

- [ ] **Step 6:** Chạy, đỏ đúng các ca trên.
- [ ] **Step 7:** Sửa `tienDonVe`: đọc quyền người lập, hồ sơ người lập; lỗi đọc → trả `null`. Người lập không giữ quyền Đối tác thì đi nhánh cũ nguyên vẹn. Thêm `choXacNhan` vào kiểu `ctx.tienDonVe`.
- [ ] **Step 8:** `choDoiTacNop` ở `ve-dien-tu/rules.ts` tính cả `choXacNhan`. `GET /api/ve/don/:orderId` trả thêm `laNguoiLapDoiTac: holdsPartner(staff)`. `CHUA_THU_DU` nhận người xem; người giữ quyền Đối tác nhận câu riêng. `web/ve-don.ts` chọn câu theo trường đó. Thêm chữ vào bảng tham chiếu.
- [ ] **Step 9:** `node --test src/modules/ve-dien-tu/ src/modules/billing/`. Xanh.
- [ ] **Step 10:** Thử phá: bỏ phần `choXacNhan` → bài đỏ → hoàn nguyên. Ghi dòng vào `docs/SO-HANG-RAO.md` kèm ngày quan sát. Commit.

### Task 2: Đ3 — đối tác không tự huỷ đơn đã mở vé

**Files:**
- Modify: `src/modules/ve-dien-tu/repository.ts`, `src/modules/ve-dien-tu/index.ts` (xuất `veDaMoCuaDon`), `src/index.ts`, `src/shared/router.ts`, `src/modules/orders/index.ts`, `src/modules/dispatch/index.ts`, `web/order.ts`
- Test: `src/modules/ve-dien-tu/doi-tac-mo-ve.test.ts`, `src/route-write-guard.test.ts` nếu đếm đường huỷ

**Interfaces:**
- Produces: `ctx.veDaMoCuaDon: (orderId: string) => Promise<boolean | null>` đúng chữ ký ở nhánh ADR-0168; `chanDoiTacHuy(staff, orderId, veDaMoCuaDon): Promise<Response | null>` ở `src/shared/` để hai route dùng chung; DTO đơn thêm `coVeDaMo: boolean`.

- [ ] **Step 1: Bài đỏ:**
  - Đối tác đơn đã mở vé `POST /status` `cancelled` → 409 đúng câu, đơn còn `confirmed`, số dòng `bil_*` và `audit_log` không đổi. Gọi song song hai lần: cả hai 409.
  - `handler-cancel` với tài khoản lai `PARTNER + FIELD` đang phụ trách → 409.
  - Đối tác đơn chưa mở vé → 200.
  - Quản trị đơn đã mở vé → 200.
  - `ctx.veDaMoCuaDon` trả `null` → 409, không huỷ.
- [ ] **Step 2:** Chạy, đỏ.
- [ ] **Step 3:** Viết. Câu chặn đứng sau kiểm `can`, trước khi soạn lô huỷ. `orders`, `dispatch` không đọc `vdt_` (bài `architecture.test.ts` canh).
- [ ] **Step 4:** Chạy, xanh. `GET /api/orders/:id` trả `coVeDaMo` chỉ khi người xem giữ quyền Đối tác; `web/order.ts` ẩn nút huỷ theo cờ đó.
- [ ] **Step 5:** Thử phá: gỡ câu chặn ở `handler-cancel` → đỏ → hoàn nguyên. Ghi sổ hàng rào. Commit.

### Task 3: Đ1 — mở quyền và giao diện

**Files:**
- Modify: `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/modules/ve-dien-tu/index.ts`, `src/route-access.test.ts`, `src/modules/ve-dien-tu/xem-giao-ve.test.ts`, `web/ve-don.ts`, `src/goi-trang-nhe.test.ts`, `src/shared/bang-tham-chieu*.ts`, `tests/e2e/ve-dien-tu.mjs`

- [ ] **Step 1: Bài đỏ** ở `doi-tac-mo-ve.test.ts`:
  - Đối tác, đơn tự lập, Kế toán ghi đủ: `GET /api/ve/don/:orderId` 200 có `veXem`; `/anh` 200 và `revealed_at` có dấu; `/giao` ghi một dòng; `/duong-dan` tạo được; `/thu-hoi` được; `/cap` 200.
  - Đơn của đối tác khác, đơn văn phòng lập: sáu route 404 hoặc 403, không đọc kho, không dấu lộ.
  - `FIELD` đang phụ trách, `INTERN` có đơn của mình: `GET /api/ve/don/:orderId` 403, như trước.
  - `/api/ve/kho`, `/api/ve/lo`, `/api/ve/cai-dat` với đối tác: 403.
  - Đơn Trả sau trong hạn (khi ADR-0168 đã có): đối tác tự mở được; quá hạn còn nợ: 403.
  - Quét khoá: mã vé `BI.MAT` không có trong mọi phản hồi của đối tác.
- [ ] **Step 2:** Chạy, đỏ.
- [ ] **Step 3:** `"ve.cap.send"` cột `PARTNER` thành `"own"`; sáu route sang `"orders"`; `GET /api/ve/don/:orderId` thêm `isOffice(staff) || can(staff, "ve.cap.send", { ownerId: chu, assigned })`, sai thì 403. Sửa có chủ ý: hàng ghim ở `permissions.test.ts`, sáu dòng và số đếm ở `route-access.test.ts`, ca `PARTNER` 403 ở `xem-giao-ve.test.ts:83` (nay là đơn của đối tác khác).
- [ ] **Step 4:** `web/ve-don.ts`: câu thiếu vé riêng cho đối tác. Mở trần: đo `npm run build:web`, đặt `TRAN_ORDERS` = số đo + đệm 100 byte, ghi chú thích theo khuôn tệp, dẫn lời duyệt ADR-0170, báo con số trong sổ.
- [ ] **Step 5:** Thêm kịch bản e2e đối tác vào `tests/e2e/ve-dien-tu.mjs`. Chạy bài của Task này, xanh. Commit.

### Task 4: Kiểm tổng, tài liệu, người kiểm

- [ ] **Step 1:** Cập nhật `docs/CHANGE-GUIDE.md`, `docs/SYSTEM-DESIGN.md` §8 ma trận, hướng dẫn cho vai Đối tác (máy canh mục Hướng dẫn), `docs/HANDOFF-N1.md`. Mục nhật ký thay đổi để lúc phát hành.
- [ ] **Step 2:** Một lần duy nhất ở cuối, máy rảnh: `npm test`, `npm run typecheck`, `npm run test:e2e`. Kết quả ghi sổ.
- [ ] **Step 3:** Kịch bản Chrome trang đơn bằng tài khoản đối tác, hai khổ, ảnh ở `docs/evidence/2026-11-05-doi-tac-xem-ve/`: chưa về tiền, đã về tiền, thiếu vé, đã mở vé không có nút huỷ.
- [ ] **Step 4:** Gọi `nguoi-kiem-doc-lap` đối chiếu từng tiêu chí nghiệm thu ADR-0170 với mã thật và chạy lại. Chỉ báo «đạt» theo báo cáo đó.
- [ ] **Step 5:** Việc của chủ: thử iPhone thật bằng tài khoản đối tác, gửi nhiều ảnh sang Zalo.

### Khi nhánh ADR-0168 nhập sau bản này

Người nhập phải: đưa `veMoDuoc` vào đúng chỗ đang gọi `thuDu`, giữ `choXacNhan` trong kiểu `tienDonVe`; dùng chung `soChuaVeCongTy` với «số đã về công ty» của `noMotDon`, không để hai bản; `veDaMoCuaDon` chỉ còn một; thêm ca Trả sau ở Task 3 Step 1.
