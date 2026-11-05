# Trả sau theo hạn mức: kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toàn quyền cấp hạn mức trả sau riêng từng đối tác; đơn Trả sau mở vé trước khi thu, bị chặn khi vượt hạn mức hoặc quá hạn.

**Architecture:** `billing` giữ hạn mức, cách tính nợ và dòng phiên bản. `orders` giữ hình thức và hạn trả, gọi `billing` qua hàm do `src/index.ts` tiêm vào `ctx`, theo đúng khuôn `cauCocKhiXacNhan`. Luật nằm ở một tệp thuần dùng chung. Không sinh dòng sổ.

**Tech Stack:** TypeScript, Cloudflare Worker, D1, giao diện thuần `h()`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md`, `docs/adr/ADR-0168-thanh-toan-tra-sau-va-han-muc.md`. Mọi `node`/`npm` mở đầu bằng `export PATH=~/.nvm/versions/node/v22.22.2/bin:$PATH;`.

## Global Constraints

- Tiền `INTEGER` VNĐ; tính ở máy chủ; ngày dân sự theo `vnToday`.
- Migration mới bắt đầu từ `0138`; kiểm lại số trên mọi nhánh trước khi đặt. Bảng và cột mới vào `docs/data-dictionary.json` rồi `npm run dict`.
- Module chỉ import nhau qua `index.ts`; chỉ module chủ ghi bảng của mình; đọc xuyên module qua view `v_<tiền tố>_*`.
- Nhật ký không có SĐT, email, MST. Không xoá cứng. Không chữ Anh lộ ra; chữ trên giao diện tiếng Việt có dấu.
- Không `git push`, không merge `main`, không deploy, không ghi D1 remote. Không sửa `playbook/`, `CLAUDE.md`, `.claude/`, ADR đã duyệt khác.
- Mỗi task đỏ trước, xanh sau. Bộ kiểm dài (`npm test`, e2e, Chrome) chỉ chạy một lần ở Task 6; giữa chừng chạy đúng tệp liên quan và `npm run typecheck`.
- Chữ «Đã giao» sẽ được đổi ở việc riêng; câu mới trong kế hoạch này dùng từ một hằng để việc đó đổi được một nơi.

## Review Focus

- Đối tác tự ghi «Tôi thu» rồi đặt tiếp: hạn mức không được trống ra (Task 2).
- Hai lệnh cùng lúc, kể cả lệnh sửa tăng tiền chen với lệnh xác nhận: chỉ một lệnh qua (Task 3, Task 4).
- Đơn đã «Đã giao» mà tiền còn ở tay đối tác vẫn tính nợ, còn nợ nháp và đơn huỷ chưa mở vé thì không (Task 2).
- Đúng ngày hạn trả chưa quá hạn, tính theo giờ Việt Nam lúc 23:30 và 00:30 (Task 1).
- Bên đặt không có hồ sơ, hoặc hạn mức hết hiệu lực giữa lúc lưu và lúc xác nhận: báo rõ, không cho qua (Task 3).

---

### Task 1: Dữ liệu, ô quyền, luật thuần

**Files:**
- Create: `migrations/0138_tra_sau_han_muc.sql`, `src/shared/tra-sau.ts`, `src/shared/tra-sau.test.ts`
- Modify: `src/shared/permissions.ts`, `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md`, các bài khoá bản đồ quyền

**Interfaces:**
- Produces, trong `src/shared/tra-sau.ts`:
  - `type HinhThucThanhToan = "PREPAID" | "CREDIT"`; `NHAN_HINH_THUC: Record<HinhThucThanhToan, string>` («Trả trước», «Trả sau»)
  - `interface HanMucHieuLuc { hanMuc: number; soNgay: number; tuNgay: string; denNgay: string | null }`
  - `noMotDon(i: { daHuy: boolean; phaiThu: number; daThuRong: number; dangDoiChieu: number; benDatDangGiu: number }): number`
  - `quaHan(hanTra: string | null, homNay: string, no: number): boolean`
  - `lyDoKhongTraSau(i: { hanMuc: HanMucHieuLuc | null; noHienTai: number; soTienDon: number; coDonQuaHan: boolean }): { ma: "khong_co_han_muc" | "vuot_han_muc" | "co_don_qua_han"; cau: string } | null`
  - `hanTraTu(ngayXacNhan: string, soNgay: number): string`
  - `moVeDuoc(i: { thuDu: boolean; traSau: { hanTra: string | null; no: number } | null; veDaMo: boolean; homNay: string }): boolean`
- Ô quyền: `credit.limit.write` chỉ `SUPER_ADMIN`; `credit.limit.view` `ACCOUNTING`, `SUPER_ADMIN`.

- [ ] **Step 1: Viết bài đỏ** `src/shared/tra-sau.test.ts`:

```ts
assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 150, dangDoiChieu: 0, benDatDangGiu: 0 }), 0); // trả dư kẹp 0
assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 100, dangDoiChieu: 0, benDatDangGiu: 100 }), 100); // tự ghi «Tôi thu»
assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 60, dangDoiChieu: 10, benDatDangGiu: 0 }), 50);
assert.equal(noMotDon({ daHuy: true, phaiThu: 100, daThuRong: 0, dangDoiChieu: 0, benDatDangGiu: 0 }), 0);
assert.equal(quaHan("2026-11-10", "2026-11-10", 5), false);
assert.equal(quaHan("2026-11-10", "2026-11-11", 5), true);
assert.equal(quaHan("2026-11-10", "2026-11-11", 0), false);
assert.equal(lyDoKhongTraSau({ hanMuc: H50, noHienTai: 45_000_000, soTienDon: 5_000_000, coDonQuaHan: false }), null);
assert.equal(lyDoKhongTraSau({ hanMuc: H50, noHienTai: 45_000_000, soTienDon: 5_000_001, coDonQuaHan: false })?.ma, "vuot_han_muc");
assert.equal(lyDoKhongTraSau({ hanMuc: null, noHienTai: 0, soTienDon: 1, coDonQuaHan: false })?.ma, "khong_co_han_muc");
assert.equal(lyDoKhongTraSau({ hanMuc: H50, noHienTai: 0, soTienDon: 1, coDonQuaHan: true })?.ma, "co_don_qua_han");
assert.equal(hanTraTu("2026-12-30", 3), "2027-01-02");
assert.equal(moVeDuoc({ thuDu: false, traSau: null, veDaMo: false, homNay: "2026-11-05" }), false);
assert.equal(moVeDuoc({ thuDu: false, traSau: { hanTra: "2026-11-30", no: 9 }, veDaMo: false, homNay: "2026-11-05" }), true);
assert.equal(moVeDuoc({ thuDu: false, traSau: { hanTra: "2026-11-01", no: 9 }, veDaMo: false, homNay: "2026-11-05" }), false);
assert.equal(moVeDuoc({ thuDu: false, traSau: { hanTra: "2026-11-01", no: 9 }, veDaMo: true, homNay: "2026-11-05" }), true);
```

Câu trong `lyDoKhongTraSau` có số tiền theo định dạng `dong()` sẵn có: ca vượt nêu số còn được dùng và số tiền đơn; ca quá hạn nói «còn đơn trả sau quá hạn chưa thanh toán».

- [ ] **Step 2: Chạy, xác nhận đỏ:** `node --test src/shared/tra-sau.test.ts`
- [ ] **Step 3: Viết `src/shared/tra-sau.ts` và migration.** Migration gồm:
  - `bil_credit_limit` chỉ-thêm: `id`, `party_id`, `limit_amount` `CHECK > 0`, `term_days` `CHECK BETWEEN 1 AND 365`, `valid_from_date`, `valid_to_date`, `created_by`, `created_at`, `reason`; trigger chặn hai dòng chồng ngày cùng hồ sơ, chặn `DELETE`, chỉ cho `UPDATE` đóng `valid_to_date` (theo khuôn `prc_party_tier` ở `migrations/0118_muc_ta_gan_rieng.sql`, `0126`).
  - `bil_credit_guard`: `party_id` khoá chính, `version INTEGER NOT NULL`; trigger `BEFORE UPDATE WHEN NEW.version <> OLD.version + 1` thì `RAISE(ABORT, 'credit_version_stale: ...')`.
  - `orders`: `payment_term TEXT NOT NULL DEFAULT 'PREPAID' CHECK (payment_term IN ('PREPAID','CREDIT'))`, `credit_due_date TEXT`.
  - Tạo lại `orders_delivered_lock` từ bản ở `0136`, thêm hai cột mới vào danh sách đóng băng.
  - View `v_ord_don_tra_sau`: `id`, `order_code`, `booker_party_id`, `status`, `delivered_at`, `credit_due_date`, chỉ đơn `CREDIT`.
- [ ] **Step 4: Thêm ô quyền, sửa bài khoá bản đồ quyền, cập nhật từ điển dữ liệu.**
- [ ] **Step 5: Chạy** `node --test src/shared/tra-sau.test.ts src/permission-enforcement.test.ts src/migrations-n1.test.ts` và `npm run db:migrate:local`, `npm run typecheck`: xanh. Thử cố ý: cập nhật `bil_credit_guard` sai phiên bản phải bị từ chối; sửa `payment_term` đơn đã «Đã giao» phải bị từ chối (bài có sẵn khung SQLite, viết trong `src/modules/billing/tra-sau-csdl.test.ts`).
- [ ] **Step 6: Commit** «Trả sau: dữ liệu, ô quyền và luật thuần».

### Task 2: Hạn mức và số nợ ở `billing`

**Files:**
- Create: `src/modules/billing/tra-sau.ts`, `src/modules/billing/tra-sau-repo.ts`, `src/modules/billing/tra-sau.test.ts`
- Modify: `src/modules/billing/index.ts`, `src/shared/contracts.ts`, `scripts/audit-checks.mjs`

**Interfaces:**
- Consumes: Task 1.
- Produces, xuất qua `billing/index.ts`:
  - `noCuaBenDat(db, partyId: string): Promise<{ tong: number; don: { orderId: string; maDon: string; hanTra: string | null; no: number }[]; coDonQuaHan: boolean }>`; không truy vấn lặp theo từng đơn, dùng `tienNhieuDon` và đọc dòng giữ hộ theo danh sách
  - `traSauCuaDon(db, orderId: string): Promise<{ hanTra: string | null; no: number } | null>`; `null` nghĩa đơn không phải Trả sau
  - `hanMucHieuLuc(db, partyId: string, ngay: string): Promise<HanMucHieuLuc | null>`
  - `kiemTraSau(db, i: { benDat: string; soTienDon: number; boQuaDon?: string }): Promise<{ ok: true; hanMuc: HanMucHieuLuc; version: number } | { ok: false; ma: string; cau: string }>`
  - `cauGacPhienBan(db, partyId: string, version: number): D1PreparedStatement[]`: chèn dòng phiên bản nếu chưa có, rồi `UPDATE ... SET version = ?version + 1`
  - `cauTangPhienBan(db, partyId: string): D1PreparedStatement[]`
- Route:
  - `GET /api/tra-sau/han-muc` (`credit.limit.view`): danh sách hồ sơ mang loại đối tác được hưởng có hạn mức, kèm nợ
  - `GET /api/tra-sau/han-muc/:partyId/don` (`credit.limit.view`)
  - `POST /api/tra-sau/han-muc` (`credit.limit.write`), thân `{ partyId, hanMuc, soNgay, lyDo }`; có dòng hiệu lực thì đóng dòng cũ và thêm dòng mới trong một lô, kèm nhật ký `credit_limit_set`
  - `POST /api/tra-sau/han-muc/:partyId/ngung` (`credit.limit.write`), nhật ký `credit_limit_stopped`
  - `GET /api/tra-sau/con-duoc-dung?benDat=` (mọi tài khoản đăng nhập): Đối tác luôn bị ép về hồ sơ của phiên, bỏ qua `benDat`; tài khoản không có quyền lập đơn nhận 403. Trả `{ coHanMuc, conDuocDung, coDonQuaHan }`, không kèm danh sách đơn.

- [ ] **Step 1: Bài đỏ trên khung route có sẵn** (`so-cong-no-ben.test.ts` là mẫu):
  - Đối tác tự ghi khoản thu đủ đơn A: `noCuaBenDat.tong` vẫn bằng phải thu; Kế toán ghi đối tác đã nộp: nợ giảm đúng số.
  - Khoản đang đối chiếu không làm giảm nợ; xác nhận đối chiếu xong thì giảm.
  - Đơn đã «Đã giao» còn dòng giữ hộ của bên đặt vẫn tính; đơn nháp không tính; đơn huỷ không tính.
  - Khách trả dư đơn A không giảm nợ đơn B.
  - Đặt hạn mức cho hồ sơ nội bộ 409; `Bán hàng`, `Quản trị`, `Nhân sự`, `Đối tác`, `Tài xế đối tác` đặt hạn mức 403; `Kế toán` đọc được, đặt 403.
  - Đối tác gọi `con-duoc-dung?benDat=<hồ sơ khác>` nhận số của chính mình.
  - Nhật ký đặt hạn mức không có SĐT, email, MST.
  - Bài đếm: số câu truy vấn của `noCuaBenDat` không tăng theo số đơn (mẫu tiêu chí 6 của `2026-11-04-man-cap-dai-ly.md`).
- [ ] **Step 2: Chạy, xác nhận đỏ.**
- [ ] **Step 3: Thi công.** `dangDoiChieu` lấy theo `khoanChoXacNhan`/`khoanMoiDoiChieu`; `benDatDangGiu` lấy từ dòng nợ giữ hộ theo đơn, cùng nguồn với `soKhaiChuaNop`. Đọc hình thức và hạn trả qua `v_ord_don_tra_sau`.
- [ ] **Step 4: Thêm phép kiểm dữ liệu:** `R-CRD-1` đơn Trả sau đã xác nhận thiếu hạn trả (lỗi), `R-CRD-2` đơn Trả trước có hạn trả (lỗi), `R-CRD-3` hồ sơ nợ vượt hạn mức hiện hành (cảnh báo).
- [ ] **Step 5: Chạy** `node --test src/modules/billing/tra-sau.test.ts`, `npm run typecheck`: xanh.
- [ ] **Step 6: Commit** «Trả sau: hạn mức, số nợ và đường đọc».

### Task 3: Hình thức trên đơn và cổng xác nhận

**Files:**
- Create: `src/modules/orders/tra-sau-cong.ts`, `src/modules/orders/tra-sau-cong.test.ts`
- Modify: `src/shared/router.ts`, `src/index.ts`, `src/modules/orders/rules.ts`, `repository.ts`, `index.ts`, `xac-nhan-chung.ts`, `xac-nhan-route.ts`, `src/shared/contracts.ts`

**Interfaces:**
- Consumes: Task 1; `kiemTraSau`, `cauGacPhienBan` của Task 2.
- Produces:
  - `ctx.kiemTraSau`, `ctx.cauGacPhienBanTraSau`, `ctx.traSauCuaDon`, tiêm ở `src/index.ts` theo khuôn `cauCocKhiXacNhan`. Khung thử không tiêm thì mặc định từ chối đơn `CREDIT`, không cho qua.
  - `type KemTraSau = (i: { at: string; auditId: string }) => D1PreparedStatement[]`; `KHONG_TRA_SAU: KemTraSau`
  - `soanXacNhan` nhận thêm tham số **bắt buộc** `traSau: KemTraSau`, đặt câu của nó sau `coc`, để cả ba nơi gọi đều phải truyền.
  - Thân đơn và DTO thêm `paymentTerm?: HinhThucThanhToan`, DTO thêm `hanTra: string | null`.

- [ ] **Step 1: Bài đỏ:**
  - Tiêu chí 1, 2 và 6 của đặc tả trên **cả ba đường**: `POST /status`, `quyet-dinh` Còn vé, `gui-don` nhánh Đối tác; lặp theo mảng ba đường.
  - Tiêu chí 3: dựng hai lô với cùng phiên bản đã đọc, chạy lần lượt; lô thứ hai ném `credit_version_stale`, đơn thứ hai vẫn nháp, không có dòng bản chụp hay nhật ký.
  - Lô thua được dịch trong `dichLoiXacNhan` thành 409 câu «Hạn mức vừa thay đổi, mở lại đơn rồi thử lại».
  - Hạn trả = ngày xác nhận + số ngày đang áp; đổi số ngày sau đó, hạn đơn cũ giữ nguyên.
  - Đơn Trả sau có `declaredDeposit > 0` lúc lưu và lúc xác nhận: 409 mã `tra_sau_khong_nhan_coc`.
  - Đơn đã xác nhận gửi `paymentTerm` khác: 409. Đơn Trả trước đi đường cũ, không chèn dòng `bil_credit_guard`, không đổi số câu lô.
  - Đơn cũ sau migration đọc ra `PREPAID`, sổ không đổi.
- [ ] **Step 2: Chạy, xác nhận đỏ.**
- [ ] **Step 3: Thi công.** Đặt kiểm trong `kiemCongXacNhan`, ngay sau cổng luật bán, để cả ba đường dùng chung; kết quả (`version`, `hanMuc`) trả về cùng `chup`. Câu `credit_due_date` nằm trong `traSau`, gác bằng id nhật ký `confirmed` như câu cọc. Lưu đơn chỉ kiểm để báo sớm.
- [ ] **Step 4: Chạy** `node --test src/modules/orders/tra-sau-cong.test.ts src/modules/orders/thu-tu-lo.test.ts` (và các bài lô xác nhận bị đổi chữ ký), `npm run typecheck`: xanh.
- [ ] **Step 5: Commit** «Trả sau: chọn trên đơn và chốt hạn mức lúc xác nhận».

### Task 4: Các đường làm tăng hoặc trượt nợ

**Files:**
- Modify: `src/modules/orders/index.ts`, `src/modules/orders/money-adjustment.ts`, `src/modules/orders/xac-nhan-route.ts`, `src/modules/orders/repository.ts`, `src/modules/orders/nguoi-dat-gop-repo.ts`, `src/modules/dispatch/index.ts`, `src/modules/billing/service.ts`, `src/modules/ve-dien-tu/index.ts`, `src/shared/router.ts`, `src/index.ts`
- Create: `src/tra-sau-duong-ghi.test.ts`

**Interfaces:**
- Consumes: Task 2, Task 3.
- Produces: `congSuaTangTraSau(ctx, order, tongMoi): Promise<{ loi: Response } | { kem: D1PreparedStatement[] }>` dùng chung cho `money-edit` và `handler-money-edit`; `ctx.veDaMoCuaDon(orderId): Promise<boolean>`, xuất từ `ve-dien-tu`.

- [ ] **Step 1: Bài đỏ:**
  - Tiêu chí 9: `money-edit` và `handler-money-edit` vượt hạn mức 409, giảm tiền được, không đổi tiền thì không gác; cả hai nằm chung một hàm.
  - Tiêu chí 10: đổi bên đặt của đơn Trả sau đã xác nhận còn nợ 409; hết nợ thì được. Gộp hồ sơ giữ đơn đó: `donCuaNguoiDat` báo và lệnh gộp 409.
  - Tiêu chí 11: huỷ đơn Trả sau còn nợ đã mở vé 409 trên **cả bốn nơi gọi** `soanHuyDon` (`index.ts` hai nơi, `xac-nhan-route.ts`, huỷ để lập lại); chưa mở vé thì huỷ được, nợ về 0.
  - Đảo khoản thu, sửa khoản thu trên đơn Trả sau: không bị chặn, nợ tăng đúng số, phiên bản tăng.
  - `src/tra-sau-duong-ghi.test.ts`: bài quét mã nguồn theo khuôn bài quét `soanXacNhan`; mọi nơi gọi `soanHuyDon`, `changeBooker`, câu đổi tiền sau xác nhận phải qua cổng. Quan sát đỏ một lần bằng cách bỏ cổng một nơi rồi hoàn nguyên, ghi vào `docs/SO-HANG-RAO.md`.
- [ ] **Step 2: Chạy, xác nhận đỏ.**
- [ ] **Step 3: Thi công.** Liệt kê mọi câu đảo hoặc sửa khoản thu trong `billing` (`git grep 'bil_payment_receipt'`), thêm `cauTangPhienBan` vào đúng lô của từng đường; chỉ thêm khi đơn là `CREDIT`.
- [ ] **Step 4: Chạy** đúng các tệp đã đổi và `npm run typecheck`: xanh.
- [ ] **Step 5: Commit** «Trả sau: chặn các đường làm nợ vượt hoặc trượt đi».

### Task 5: Vé và bước «Đã giao»

**Files:**
- Modify: `src/modules/ve-dien-tu/index.ts`, `src/modules/billing/dat-coc.ts`, `src/modules/billing/rules.ts`, `src/modules/billing/service.ts`, `web/ve-don.ts`, bài vé có sẵn

**Interfaces:**
- Consumes: `moVeDuoc` Task 1; `traSauCuaDon` Task 2.
- Produces: `ctx.tienDonVe` trả thêm `traSau: { hanTra: string | null; no: number } | null`, chỉ thêm trường; `thuDu` không đổi. `lyDoChuaGiaoDuoc` nhận thêm `traSau: boolean`.

- [ ] **Step 1: Bài đỏ:**
  - Tiêu chí 7 trên `GET /api/ve/anh/:id`, `POST /api/ve/giao`, `POST /api/ve/duong-dan`, `GET /api/ve/don/:orderId`. Bài ca vé đã mở trên đơn quá hạn: ảnh xem được, vé chưa mở bị chặn.
  - Đơn Trả trước chưa thu: cả bốn đường như cũ; bài cũ của ADR-0159 Đ2 về số khai chưa nộp vẫn xanh.
  - Tiêu chí 8: `lyDoChuaGiaoDuoc` với `traSau: true`, `conLai > 0` trả mã `underpaid`, `aiXuLy: "Kế toán"`, câu `Đơn trả sau còn nợ <số> — chờ đối tác thanh toán.`; `traSau: false` giữ nguyên câu cũ từng chữ. Sau khi thu đủ thì «Đã giao» và «Hoàn thành» qua như đơn thường.
  - Đường dẫn khách của đơn bị huỷ: kiểm hành vi thật, ghi kết quả vào sổ thi công; nếu chưa tự thu hồi thì báo người điều phối, không tự mở rộng phạm vi.
- [ ] **Step 2: Chạy, xác nhận đỏ.**
- [ ] **Step 3: Thi công.** Bốn route và `web/ve-don.ts` chỉ gọi `moVeDuoc`. Câu giữ dùng hằng trong `src/shared/tra-sau.ts`.
- [ ] **Step 4: Chạy** đúng các bài vé, bài `billing` liên quan, `npm run typecheck`: xanh.
- [ ] **Step 5: Commit** «Trả sau: mở vé trước, giữ bước Đã giao».

### Task 6: Giao diện, tài liệu, kiểm toàn bộ

**Files:**
- Create: `web/han-muc-tra-sau.ts`, `src/shared/han-muc-tra-sau-hien-thi.ts` và bài của nó, `tests/e2e/tra-sau.mjs`, kịch bản Chrome `tra-sau-smoke`
- Modify: `web/order-form.ts`, `web/order.ts`, `src/shared/sw-policy.ts`, `src/shared/muc-giao-dien.ts`, `src/shared/so-do-trang.ts`, `package.json` (`build:web`), `src/modules/billing/index.ts` (route trang), các bảng tham chiếu ngôn ngữ (chỉ bằng công cụ Edit), `src/goi-trang-nhe.test.ts` nếu phải đổi trần thì dừng hỏi, `web/CLAUDE.md` chỉ đề xuất, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, mục Hướng dẫn, `src/shared/changelog.ts`, `docs/superpowers/plans/2026-11-05-tra-sau-thi-cong-nhat-ky.md`

- [ ] **Step 1: Bài đỏ** cho luật hiển thị và `tests/e2e/tra-sau.mjs`: cấp hạn mức 50.000.000, đặt đơn, chặn vượt, thu tiền, mở lại; ba đường xác nhận; vé; huỷ; cuối bài chạy `audit-invariants`.
- [ ] **Step 2: Màn «Hạn mức trả sau»** ở trang `/han-muc-tra-sau`: danh sách hồ sơ; mỗi dòng có hạn mức, số ngày, đang nợ, còn được dùng, số đơn quá hạn; bấm mở danh sách đơn còn nợ; Toàn quyền có «Đặt hạn mức», «Ngừng hạn mức», Kế toán không có nút. Điện thoại dạng thẻ. Theo `web/CLAUDE.md`: `h()`, không `innerHTML`, ô gõ 16px, giá trị vào token.
- [ ] **Step 3: Khối Thanh toán trên màn đặt đơn:** hỏi `con-duoc-dung`, có hạn mức mới hiện hai lựa chọn «Trả trước» (chọn sẵn), «Trả sau» kèm «Còn được dùng …»; chọn Trả sau thì ẩn ô «Khách đặt cọc trước»; có đơn quá hạn thì Trả sau bị khoá kèm lý do. Chi tiết đơn có nhãn hình thức và hạn trả; thẻ đơn quá hạn có nhãn.
- [ ] **Step 4: Tài liệu:** `SYSTEM-DESIGN`, `CHANGE-GUIDE`, Hướng dẫn, mục nhật ký thay đổi của bản phát hành kế tiếp, sổ thi công.
- [ ] **Step 5: Chạy một lần:** `npm test`; `npm run typecheck`; `npm run test:e2e -- tra-sau` rồi cả bộ e2e; kịch bản Chrome đúng theo `web/CLAUDE.md` ở khổ 390 và 1440, kèm `AXE_JS`. Đọc kết quả cuối, báo trung thực từng bài đỏ.
- [ ] **Step 6: Commit** «Trả sau: màn hạn mức, ô chọn trên đơn, tài liệu».

## Sau Task 6

Người kiểm độc lập đọc toàn nhánh theo đặc tả, chạy lại lệnh, tự thử phá. Phát hành chỉ sau diễn tập khôi phục `HC-5.19`; chủ chạy `day-len` và `trien-khai`.
