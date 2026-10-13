# Sửa số khách (ADR-0114) — Kế hoạch thi công

> **Dành cho người thi công:** dùng superpowers:subagent-driven-development hoặc executing-plans, làm từng task, mỗi bước đánh dấu `- [ ]`. **Chưa được bắt đầu** cho tới khi chủ duyệt ADR-0114 (điều kiện ở Task 0).

**Mục tiêu:** thi hành ba quyết định D1–D3 của ADR-0114: nhắc giảm giá khi bớt khách, lịch sử số khách đủ dòng, mỗi đơn có người lớn; cập nhật sổ vàng `sua-so-khach-van-phong.json` theo đó (vẫn chờ xác nhận).

**Kiến trúc:** ba hàm thuần mới trong `src/shared/` (một nguồn cho máy chủ và giao diện); máy chủ nối vào đúng ba điểm đã có (`validateOrder`, chuyển trạng thái xác nhận, `planMoneyEdit` — một luật cho cả đường hướng dẫn viên và văn phòng) và thêm hai khoá vào phản hồi; giao diện chỉ hiển thị. Không bảng, không cột, không migration.

**Công nghệ:** TypeScript, `node --test`, giao diện thuần `h()`. **Đặc tả:** `docs/superpowers/specs/2026-10-13-sua-so-khach-adr-0114/01-de-xuat-adr-0114.md` và `00-trang-ghep.md`.

## Ràng buộc chung
- Tiếng Việt có dấu mọi chữ hiện ra; gọi "Nền tảng"; ô gõ 16px; không `innerHTML`; giá trị màu đi vào token (`public/app.css`).
- Tiền chỉ tính ở máy chủ; không đổi cách tính phải thu (ADR-0109 giữ nguyên). D1 chỉ là cảnh báo.
- Nhật ký không ghi SĐT, email, MST. Câu cảnh báo mới không có chữ số.
- Ca sổ vàng chỉ `cho_xac_nhan`; AI không tự đánh dấu `da_xac_nhan`.
- Hàng rào siết (cờ `tamTinh0` → cờ từ chối) cần chủ đã duyệt trong ADR; không nới.
- Việc lớn (tiền, luật đơn): thi công xong phải có người kiểm độc lập chỉ đọc (`nguoi-kiem-doc-lap`); người thi công không tự nghiệm thu.

## Điểm cần canh (Review Focus)
1. Đơn gồm dịch vụ theo nhóm hoặc nhập tay (ô "số khách" ở `adult`): không được bị từ chối oan.
2. Đơn cũ đã xác nhận có 0 người lớn: sửa số khách không làm đơn tệ hơn thì phải qua; chỉ chặn khi đưa từ ≥ 1 xuống 0.
3. Đơn toàn người cao tuổi lập được (điều khoản 1 của D3).
4. Tăng khách sau khi đã bớt (10 → 2 → 3): D1 vẫn nhắc vì so với lúc xác nhận.
5. Người xem không có `order.history.view` không nhận `lichSuSoKhach` (null), không lộ qua khoá mới.

## Task 0: Điều kiện
- [ ] Chủ trả lời duyệt ADR-0114 (hoặc nêu điều khoản đổi). Chủ (hoặc AI qua công cụ sửa tệp để chủ được hỏi) tạo `docs/adr/ADR-0114-…md` từ văn bản trình duyệt và thêm một dòng vào `docs/adr/README.md`. Kiểm lại số 0114 chưa bị nhánh nào lấy (`git log --all --name-only --format= -- "docs/adr/ADR-0114*"`).
- [ ] Tạo worktree và nhánh mới từ `main` mới nhất; ghi sổ điều phối `docs/superpowers/plans/2026-10-13-sua-so-khach-adr-0114-thi-cong-nhat-ky.md`.

## Task 1: D3 — mỗi đơn có người lớn
**Tệp:** tạo `src/shared/nguoi-di-kem.ts` và `src/shared/nguoi-di-kem.test.ts`; sửa `src/modules/orders/rules.ts` (`validateOrder`), `src/modules/orders/index.ts` (chuyển trạng thái sang xác nhận), `src/modules/orders/money-adjustment.ts` (`planMoneyEdit`), `src/shared/service-form.ts` (báo sớm); thêm ca vào `src/modules/orders/money-edit-plan.test.ts` và bài route của `validateOrder`.
**Giao ra:** `soNguoiDiKem`, `donThieuNguoiLon`, `CAU_THIEU_NGUOI_LON`.
- [ ] **Bước 1 — bài đỏ:** `nguoi-di-kem.test.ts`: `soNguoiDiKem({adult:0,child:2,senior:0,infant:1})` = 0; `{adult:0,senior:2}` = 2; `donThieuNguoiLon([{adult:0,child:3},{adult:0}])` = true; `[{adult:0,child:3},{adult:1}]` = false. Chạy `node --test src/shared/nguoi-di-kem.test.ts` → đỏ (chưa có tệp).
- [ ] **Bước 2 — cài hàm:**
```ts
// ADR-0114 D3: người đi kèm trẻ em = người lớn + người cao tuổi. Dịch vụ theo nhóm / nhập tay chỉ có ô số khách ở `adult`.
import type { PaxCode } from "./order-lines.ts";
type Pax = Partial<Record<PaxCode, number>>;
export const soNguoiDiKem = (pax: Pax): number => (pax.adult ?? 0) + (pax.senior ?? 0);
export const donThieuNguoiLon = (dichVu: readonly Pax[]): boolean => dichVu.reduce((n, p) => n + soNguoiDiKem(p), 0) < 1;
export const CAU_THIEU_NGUOI_LON = "Đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình.";
```
- [ ] **Bước 3 — nối máy chủ (mỗi chỗ một bài đỏ trước):** `validateOrder` trả `fail(CAU_THIEU_NGUOI_LON)` khi `donThieuNguoiLon` trên các dịch vụ; cổng chuyển sang `confirmed` đọc số khách đã lưu và trả 409 `thieu_nguoi_lon`; `planMoneyEdit` trả `{ ok: false, code: "thieu_nguoi_lon", message }` **chỉ khi** tổng người đi kèm trước ≥ 1 và sau = 0.
- [ ] **Bước 4:** báo sớm ở `service-form.ts` cạnh thông báo `no_paying_guests`; gửi cùng câu `CAU_THIEU_NGUOI_LON`. Chạy `npm run typecheck`, `node --test src/shared/nguoi-di-kem.test.ts src/modules/orders/money-edit-plan.test.ts`.
- [ ] **Bước 5:** `npm test`; ghi lại các bài đỏ vì dùng đơn 0 người lớn (nếu có) và sửa dữ liệu thử của chúng, không nới luật. Commit.

## Task 2: D1 — nhắc giảm giá khi bớt khách
**Tệp:** sửa `src/shared/so-khach-van-phong.ts` (+ `so-khach-van-phong.test.ts`), `src/shared/contracts.ts` (`MoneyEditResponse`, `OrderDetailResponse`), `src/modules/orders/index.ts` (hai điểm trả `MoneyEditResponse` và route chi tiết đơn; đường hướng dẫn viên qua `editMoneyAsHandler`).
- [ ] **Bước 1 — bài đỏ:** `canhBaoKhuyenMai({discount:50000}, 10, 2)` ≠ null; `({discount:0},10,2)` = null; `({discount:50000},10,10)` = null; `({discount:50000},10,12)` = null; chuỗi trả về không chứa chữ số (`/\d/`).
- [ ] **Bước 2 — cài hàm** (số khách = người lớn + trẻ em + người cao tuổi, cộng mọi dịch vụ danh mục, qua `payingGuests`):
```ts
export const CAU_KHUYEN_MAI_KHI_BOT_KHACH = "Đơn có giảm giá nhưng số khách đã giảm so với lúc xác nhận, giảm giá vẫn giữ nguyên. Kế toán xem lại khuyến mại.";
export const canhBaoKhuyenMai = (don: { discount: number }, khachLucXacNhan: number, khachHienHanh: number): string | null =>
  don.discount > 0 && khachHienHanh < khachLucXacNhan ? CAU_KHUYEN_MAI_KHI_BOT_KHACH : null;
```
- [ ] **Bước 3:** máy chủ tính `khachLucXacNhan` từ số khách đã chụp (`getStoredServices`) và `khachHienHanh` từ đơn sau điều chỉnh; thêm khoá `canhBaoKhuyenMai: string | null` vào `MoneyEditResponse` và `OrderDetailResponse`. Bài route: sửa số khách qua cả hai đường, kiểm khoá.
- [ ] **Bước 4:** `npm run typecheck`, các bài vừa viết, `npm test`. Commit.

## Task 3: D2 — lịch sử số khách đủ dòng
**Tệp:** `src/shared/so-khach-van-phong.ts` hoặc tệp thuần mới `src/shared/lich-su-so-khach.ts` (+ test); `src/shared/contracts.ts` (khoá `lichSuSoKhach: DongLichSuSoKhachDto[] | null` ở `OrderDetailResponse`); `src/modules/orders/index.ts` (route chi tiết đơn).
- [ ] **Bước 1 — bài đỏ:** hàm thuần `dungLichSuSoKhach(goc, cacLanSua)` trả `[khoi_tao, …dieu_chinh, hien_hanh]`, mỗi dòng có số khách theo dịch vụ và tạm tính. Ca SV-SK-07: gốc 4 người lớn (2.000.000), lần sửa trước 3 (1.500.000), lần này 5 (2.500.000) ⇒ 3 dòng. Đơn chưa sửa lần nào ⇒ `khoi_tao` + `hien_hanh` trùng số. Tên dịch vụ nhập tay không vào dòng (dùng nhãn "dịch vụ nhập tay" như `doanSoKhach`).
- [ ] **Bước 2:** cài hàm; nguồn dữ liệu: số khách đã chụp + các dòng `order_money_adjustment` theo `seq` (giờ và người từ `audit_log` qua id chung). Không đọc chữ nhật ký, không migration.
- [ ] **Bước 3:** route chi tiết đơn trả `lichSuSoKhach` chỉ khi `can(staff, "order.history.view", …)`, ngược lại `null`. Bài route cho hai trường hợp (có / không có quyền).
- [ ] **Bước 4:** `npm run typecheck`, `npm test`. Commit.

## Task 4: Giao diện, Trợ giúp, nhật ký thay đổi
**Tệp:** `web/order.ts` (khối Thanh toán và banner `baoSauLenh`; khối "Lịch sử"), `web/sheet-so-khach.ts`, `public/app.css` (token màu nguy hiểm đã có thì dùng lại), `src/shared/huong-dan-*.ts` (đọc `src/shared/huong-dan.test.ts` trước: nhóm Bán hàng đang sát trần 30 phút, thêm chữ phải cắt chỗ khác), `src/shared/changelog.ts` + `app-info.test.ts` (số phiên bản mới hơn production, hỏi chủ số).
- [ ] Hiện `canhBaoKhuyenMai` màu đỏ cạnh câu vàng cũ (`data-canh-bao="khuyen-mai"`); hiện dòng lịch sử mới trong khối "Lịch sử" bằng `h()`; hiện báo sớm D3 ở bảng "Sửa số khách" và form lập đơn.
- [ ] Chạy lại kịch bản Chrome tương ứng ở bảng `web/CLAUDE.md` (cần `AXE_JS`, nếu không thì kiểm màu bị bỏ qua và không được báo xanh). Ghi mục nhật ký thay đổi. Commit.

## Task 5: Sổ vàng `golden/sua-so-khach-van-phong.json` (vẫn `cho_xac_nhan`)
**Tệp:** `golden/sua-so-khach-van-phong.json`, `src/so-vang-sua-so-khach.test.ts`, `golden/README.md` nếu có đổi khuôn.
- [ ] Thêm vào `dap_an` của mọi ca hai khoá `canh_bao_khuyen_mai` (boolean) và `lich_su_so_khach` (mảng dòng như D2). LỚP 1 tự cân bằng số học viết tay; LỚP 2 gọi hàm thật. Ca có giảm giá và bớt khách (SV-SK-04, 08, 09, 11) ⇒ `canh_bao_khuyen_mai` true.
- [ ] SV-SK-07: đáp án 3 dòng. SV-SK-10: đổi thành ca bị từ chối (`dap_an.tu_choi = { ma: "thieu_nguoi_lon" }`, không có tiền). Thêm SV-SK-12: 10 người lớn × 500.000, giảm giá 50.000, bớt còn 2 ⇒ tạm tính 1.000.000, phải thu 950.000, `canh_bao_khuyen_mai` true, `canh_bao_tong_am` false.
- [ ] Thay cờ bắt buộc `tamTinh0` trong bài bằng cờ `tuChoiKhongNguoiLon` (theo ADR); giữ tên cờ còn lại. Chạy `node --test src/so-vang-sua-so-khach.test.ts` (chờ xác nhận vẫn đỏ nếu lệch mã). Commit.
- [ ] Sau khi xanh: xin chủ / Kế toán xác nhận **từng mã** theo danh sách trong đề xuất. Chỉ khi nhận được từng câu trả lời mới đổi `trang_thai` kèm người và ngày.

## Task 6: Bất biến dữ liệu và hàng rào
**Tệp:** `scripts/audit-checks.mjs` (mã mới, mức **cảnh báo**), `src/audit-invariants.test.ts`, `docs/SO-HANG-RAO.md`.
- [ ] Bất biến: đơn đã xác nhận có tổng người đi kèm = 0 ⇒ cảnh báo (thoát 0), in số đơn. Bài kiểm trên D1 local tạm.
- [ ] Phép phá P16 cho luật D3 và D1: sửa cố ý (bỏ điều kiện) ⇒ bài đỏ ⇒ hoàn nguyên (`cp` + `cmp`); ghi ngày quan sát vào `docs/SO-HANG-RAO.md`. Chưa có ngày thì coi là lời khuyên.

## Task 7: Kiểm độc lập và đóng việc
- [ ] Cập nhật tài liệu mô tả cùng commit: `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/DATA-DICTIONARY.md` chỉ nếu đổi cấu trúc (hiện không).
- [ ] `npm run typecheck`, `npm test`, `npm run test:e2e` (cần mạng; một người chạy một lúc), `node scripts/audit-invariants.mjs --db local`.
- [ ] Gọi `nguoi-kiem-doc-lap` (chỉ đọc) kiểm tiền, luật đơn, quyền lịch sử; chỉ báo "đạt" theo báo cáo đó.
- [ ] Báo chủ: gộp bằng `npm run day-len -- <nhánh>`, **cần** `npm run trien-khai` (đổi mã máy chủ và giao diện).
