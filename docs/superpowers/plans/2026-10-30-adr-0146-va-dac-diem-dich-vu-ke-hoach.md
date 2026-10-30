# Kế hoạch thi công — ADR-0146 (luật «không bán» theo loại đối tác) + Lượt A (khung «Đặc điểm dịch vụ», phạm vi `ATTRIBUTE`) — một đợt

> Người lập: AI vai **lập kế hoạch** (không thi công, không tự duyệt — Hiến pháp N3, P15). Ngày 2026-10-30. Worktree `.claude/worktrees/tinh-trang-ban`, nhánh `claude/tinh-trang-ban-va-phu-thu`, HEAD `417c1fe` (mã nguồn trùng `main@a129d3d`; commit `417c1fe` chỉ thêm tài liệu đề xuất).
> Việc lớn: **dữ liệu** (bốn bảng mới, hai view, trigger), **quyền** (hai ô mới), **luật** (cổng 409 ở bảy cửa ghi đơn). Không chạm tiền. Mỗi điểm dừng có **người kiểm độc lập, chỉ đọc** (`CLAUDE.md` §3).
> Không ước lượng thời gian. Số migration **không gán cố định** — cách lấy ở mục 2.4.

## 0. Nguồn và thứ tự thắng

| Nguồn | Trạng thái | Ghi chú |
|---|---|---|
| `docs/adr/ADR-0146-chinh-sach-ban-theo-loai-doi-tac.md` | accepted 28/10, **chưa có dòng mã nào** (đã kiểm, mục 1.1) | Đ1–Đ6, «Việc bắt buộc trước khi đặt luật đầu tiên», tiêu chí 1–13 |
| `docs/adr/ADR-0151-dac-diem-dich-vu-va-luat-ban-theo-dac-diem.md` (bổ sung ADR-0146, Lượt A; gọi tắt **A**) | accepted 30/10, đã chép (commit `16466c3`) | **Nguồn chính của Lượt A.** Người kiểm kế hoạch đã đối chiếu: số điều Đ1–Đ6 và tiêu chí 1–20, 10b, 12b, 17b (dòng 294–328) khớp bản đề xuất; ADR-0151 đã có bản sửa R3-1 (CV-4 là bộ dữ liệu thay cho CV-3, dòng 283). Bản đề xuất `…/A-dac-diem-dich-vu/DE-XUAT-ADR.md` + `TRANG-GHEP.md` chỉ còn là hồ sơ (trang ghép vẫn dùng để tra mục 3b) |
| `…/00-dau-vao/PHIEU-CHOT-TINH-TRANG-BAN-2026-10-30.md` mục C | hai lệnh đếm chỉ đọc | dùng ở runbook (mục 9) — xem R-9 về một chỗ lệch |
| `…/B-dong-ban/` (Đóng bán) | **chờ chủ duyệt** | kế hoạch này **không phụ thuộc**; chỗ nối ở mục 7 |
| `…/KIEM-A-B/BAO-CAO.md` | báo cáo người kiểm | R3-3 chốt ở R-1 dưới đây |

Thứ tự thắng khi lệch (`CLAUDE.md` §2): Hiến chương → ADR-0146 → ADR-0151 (A) → kế hoạch này → mã. Kế hoạch lệch ADR là lỗi của kế hoạch: dừng, báo, không tự hoà giải.

**Mục tiêu (một câu):** người giữ ô mới nhập trên Nền tảng quy tắc «loại đối tác `L` không được đặt [dịch vụ | nhóm | dịch vụ mang đặc điểm `X = x`, kèm nhóm tuỳ chọn] từ ngày … đến ngày …»; máy chủ trả 409 `sales_blocked` ở mọi cửa ghi đơn liên quan, danh mục lập đơn của Đối tác bỏ các dịch vụ đó; Quản trị định nghĩa đặc điểm, Bán hàng gắn giá trị cho từng vé.

---

## 1. Đã kiểm trong mã (sự thật, tách khỏi suy luận)

Mọi dòng dưới đây người lập kế hoạch đã mở tệp hoặc chạy lệnh ngày 30/10 trên worktree này.

### 1.1 Hiện trạng
- `grep` `prc_sales_block|sales_blocked|sales.block` trong `src/ migrations/ web/ tests/`: rỗng (A ghi; người lập kế hoạch không thấy tệp nào nhắc — khớp).
- `ls migrations`: lớn nhất `0127_dua_don_theo_dich_vu.sql`. `git worktree list`: chỉ checkout gốc (`main@a129d3d`) và worktree này. `git branch -a --no-merged main`: chỉ nhánh này. Nhánh trên máy chủ git: **chưa kiểm** (không `fetch`).
- Bảng hiệu lực của `pricing`: `prc_commission_rule` (`0090:39–69`, dựng lại `0097:14–36`) và `prc_role_tier` (`0096:20–49`) dùng `valid_from_date`, `valid_to_date` kiểu `TEXT` ngày `YYYY-MM-DD`, `CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date)`, trigger `*_no_delete`, `*_close_only` (chỉ đặt ngày kết thúc **một lần**). Hiệu lực xét **gồm cả hai đầu**: `hieuLuc` = `validFrom <= ngay && (validTo === null || validTo >= ngay)` (`src/modules/pricing/rules.ts:58`); SQL `valid_from_date <= ?1 AND (valid_to_date IS NULL OR valid_to_date >= ?1)` (`pricing/repository.ts:32, 66`). «Ngừng tới hôm qua» là cách làm thôi áp **từ hôm nay** (bài `pricing/doi-chinh-sach.test.ts:199`, `doi-muc-route.test.ts:40`).
- `prc_beneficiary_role(role_type_code PK → pty_role_type, active)` (`0090:19–36`); trigger mẫu «loại phải được hưởng và đang bật» lúc chèn: `prc_role_tier_role_ok` (`0096:44–46`).
- Tắt loại: `POST /api/pricing/loai-doi-tac/:code/tat` (`pricing/index.ts:368`), thân chung `doiTrangThaiLoai` (`:151–163`), ô `partner.commission.write` = Kế toán, Quản trị, Toàn quyền (`permissions.ts:162`). Mọi route `pricing` hỏi `!can(…) || holdsPartner(staff)` (ví dụ `:255`, `:399`).
- Loại đang mang của hồ sơ: view `v_pty_open_role` = dòng vai có `valid_to_date IS NULL` (`0090:6–9`); câu `open_roles_of` (`pricing/repository.ts:75–76`). Bên đặt bị ép cho Đối tác: `benDatCuaToi` ở `src/index.ts:184` (điều kiện `holdsPartner` + hồ sơ mang loại trong `prc_beneficiary_role` đang bật — câu `beneficiary_of_party`, `pricing/repository.ts:88–90`); kiểu ở `src/shared/router.ts:205, 358, 494`. Nút «Kết thúc» vai nhận ngày **tương lai** (`parties/loai-doi-tac-noi-bo.test.ts:189`), và dòng vai có ngày kết thúc thì rời `v_pty_open_role` ngay.
- Nhóm: `ctl_group` (`0055:10–22`, tên duy nhất giữa nhóm đang dùng: `ctl_group_name_active`), `v_ctl_service_group` (`0090:12`), mã nhóm `maNhomMoi` = `g` + 12 hex (`catalog/nhom-repo.ts:179`). `catalog_item.code` là khoá chính (`0006:25–26`).
- Danh mục for-order: `GET /api/catalog/for-order` (`catalog/index.ts:167–171`) → `catalogForOrderForm` (`:126–146`): lọc `visible` rồi `nhomChoForm` (nhóm chỉ hiện khi còn ≥ 1 dịch vụ) — lọc thêm ở `visible` thì nhóm rỗng tự biến mất.
- Route catalog: mọi route ghi cổng `admin` + `admin.manage` (`catalog/index.ts:176–413`); `dem-xung-dot` ghi chú «Khai TRƯỚC mọi route `/api/catalog/:code…`» (`:174–175`).
- Cổng: `ADMIN_GATE` = ADMIN, SUPER_ADMIN (`permissions.ts:376`), router chặn ở `router.ts:441`; `OFFICE_GATE` = SALES, ACCOUNTING, ADMIN, SUPER_ADMIN (`permissions.ts:387`). Thứ tự cột `row()` (`permissions.ts:44–48`): SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR.
- Cửa ghi đơn (đã mở thân route):
  - `POST /api/orders` `orders/index.ts:1110` — `priceGuard` (`:1123`) → `benDatCuaTaiKhoan` (`:1131`) → `resolveBooker` (`:1133`) → `tranGiamGiaNhap` (`:1135`) → mốc (`const coChang` `:1137`) → ghi.
  - `PUT /api/orders/:id` `:1225` — cùng chuỗi, `noBookerKeys` (`:1258`), bên đặt qua `benDatCuaTaiKhoan` (`:1260`), nhánh «thân cũ không có khoá bên đặt» giữ bên đặt đang lưu (`:1262–1264`).
  - `PUT /api/orders/:id/booker` `:1595` — `chanBenDatDoiTac` (`:1610`) → `resolveBooker` (`:1612`) → không đổi gì thì trả sớm (`:1616`) → nhánh đơn đã xác nhận chụp lại mức (`:1621`).
  - `POST /api/orders/:id/status` `:1664` — `tinhCanXacNhan` (`:1702`) **trước** `kiemCongXacNhan` (`:1703`).
  - `kiemCongXacNhan` `orders/xac-nhan-chung.ts:83`: R2 giá (`:91`) → người lớn → nhóm tắt đưa đón (`:96`) → chọn đón → mốc → chụp mức → R3. Dùng ở Còn vé (`xac-nhan-route.ts:309`, sau chốt nhóm tắt `:296` và kiểm mốc), Gửi đơn (`:150`, ghi chú «Cổng luật bán: chưa có — chỗ móc: ngay trước phân nhánh» `:131–133`), `/status`.
  - Gửi xác nhận `xac-nhan-route.ts:100` — **không** qua `kiemCongXacNhan`: `tinhCanXacNhan` (`:116`) → `confirm_not_required` nếu không cần (`:117`) → chốt riêng nhóm tắt `congNhomTatDuaDon` (`:118`) → chọn đón → khoản thu → mở yêu cầu.
- ADR-0147 (phí đón) **chưa có mã** (`grep` rỗng trong `orders`) ⇒ tiêu chí 12 của ADR-0146 không dựng được nguyên văn (xem R-7).
- Hàng rào sẵn có liên quan: `src/orders-khong-doc-nhom-truc-tiep.test.ts` (quét `ctl_group|ctl_service_group|ctl_service_transfer_rule` trong `orders`, có bài tự kiểm bộ quét); bài khoá ngoại xuyên module `src/architecture.test.ts:334–353` (mọi khoá ngoại phải trỏ khoá chính một cột); `NUA_NGHIEM` (`:160–174`); `STRICT` liệt kê **từng tệp** (`:79–106`, dòng `pricing` `:96` chỉ có `repository.ts`).
- Thêm ô quyền chạm (đã đếm chỗ của ô `order.submit`): bảng `ADR` `src/shared/permissions.test.ts:27–28`; ba bài ghim hàng DRIVER (`:364`, dòng ô `:371`), DRIVER_PARTNER (`:415`, `:422`), HR (`:472`, `:476`); ghim hàng PARTNER `src/modules/orders/xem-don-theo-quyen.test.ts:305–306`; `TEN_THAO_TAC` `src/shared/tro-ly-cau-truc-ten.ts:75–76` (bài `src/shared/tro-ly-cau-truc.test.ts:38–39` đòi khoá bằng `MATRIX`); bài «mỗi ô được máy chủ hỏi» `src/permission-enforcement.test.ts` (đòi chuỗi ô viết thẳng trong `can(` ở `src/modules/**`); e2e `tests/e2e/permissions.mjs`. `ADMIN_NONE_OPS` (`permissions.test.ts:281`) **không** chạm (hai ô mới Quản trị = `any`).
- Điều hướng: bảng `TRANG` (`src/shared/muc-giao-dien.ts:58–122`, mục «Dịch vụ & giá» `:71` chỉ `admin.manage`), `THANH_BEN` nhóm THIẾT LẬP (`:197–211`), `GOI_CHINH` (`src/shared/muc-giao-dien-goi.ts`, `satisfies Record<KhoaTrang,…>`), `PAGES`/`PRECACHE` (`src/shared/sw-policy.ts:18, 26–32`), bài đặc tả hiện trạng `src/muc-giao-dien-hien-trang.test.ts` (mục MỚI được bỏ qua), rào `src/muc-hien-mo-duoc-{1,2,3}.test.ts`.
- Lời gọi `CHECK (b IS NULL OR b >= date(a,'-1 day'))` chạy được và chặn đúng trên `node:sqlite` (người lập kế hoạch thử 30/10). **Trên D1 thật: chưa thử** (bẫy D1 khác `node:sqlite`, `CHANGE-GUIDE` d).
- Câu đếm sửa ở R-9 chạy được trên CSDL dựng từ toàn bộ migration bằng `node:sqlite` (thử 30/10, kết quả 0 dòng vì CSDL rỗng). **Chưa chạy trên dữ liệu thật.**

### 1.2 `docs/quyen-hoan.json` (đối chiếu 30/10)
- `phat_hien`: TNV-G1, TNV-G3, TNV-G4 (sổ tiền, hạn 30/11), HC-4.2 (bút toán điều chỉnh, 30/11), HC-5.11 (Cron đồng bộ danh mục không định danh, 15/11), HC-5.19 (chưa diễn tập khôi phục, **hạn 05/11**).
- Kế hoạch này không chạm tiền, sổ, bút toán; không thêm câu ghi vào đường đồng bộ Sheet (danh sách «chưa khai» tính lúc đọc); migration chỉ thêm bảng/view/trigger. ⇒ **Không xây trên lỗ đang hở** (khớp A mục «Xây trên lỗ đang hở» và trang ghép mục 4).
- **Hệ quả thực tế (không phải lỗ, nhưng chặn cả thi công lẫn phát hành):** mục quá hạn làm `npm test` đỏ (`src/phat-hien-han.test.ts:36–38`: đỏ khi `han < hôm nay` giờ VN). HC-5.19 hạn **05/11** ⇒ từ **06/11** mọi bước «`npm test` xanh» của T1–T15 và ba điểm dừng KĐL đều đỏ, cho tới khi chủ diễn tập khôi phục hoặc gia hạn bằng diff vào `docs/quyen-hoan.json` — câu Q-5 ở mục 3.
- `thao_tac` (bốn ô giữ chỗ) và `cua_ghi` (route tự phục vụ): kế hoạch không thêm mục nào. Hai ô mới phải có lời gọi `can()` thật; route ghi mới phải hỏi bảng trong thân.

---

## 2. Quyết định của người lập kế hoạch (đảo được; chủ sửa nếu sai)

### R-1 — «Ngày kết thúc» của luật bán là **ngày dân sự tính trọn** (trả lời R3-3)
- **Chốt:** `prc_sales_block` dùng `valid_from_date` / `valid_to_date` kiểu `YYYY-MM-DD`, giờ Việt Nam, hiệu lực **gồm cả hai đầu**, đúng khuôn `prc_commission_rule` / `prc_role_tier` (mục 1.1). Luật hiệu lực ở ngày `d` ⇔ `valid_from_date ≤ d ≤ valid_to_date` (hoặc `valid_to_date` trống). `d` = `vnToday(new Date())` lúc thao tác (ADR-0146 Đ2), truyền làm tham số SQL, không `date('now')`.
- **«Kết thúc ngay»** (tiêu chí 5 ADR-0146, CV-7, 12b của A) = đặt `valid_to_date = max(hôm qua, valid_from_date − 1 ngày)`. Như vậy luật thôi chặn **từ hôm nay**, đúng chữ «đặt lại được ngay», và giữ cùng nghĩa «ngừng tới hôm qua» mà màn Hoa hồng đang dùng. Hẹn kết thúc tương lai: thân gửi `denNgay ≥ max(hôm qua, valid_from_date − 1)`.
- **CHECK** của bảng: `valid_to_date IS NULL OR valid_to_date >= date(valid_from_date, '-1 day')` — cho đúng một ca «khoảng rỗng» (luật bắt đầu hôm nay hoặc ngày mai mà kết thúc ngay ⇒ không bao giờ chặn). Khác `prc_commission_rule` một chỗ: bảng mức dùng cột `voided_at` («huỷ») cho dòng chưa từng áp; luật bán không có cột huỷ (ADR-0146 Đ1: chỉ «đặt ngày kết thúc một lần»), nên khoảng rỗng thay cho huỷ.
- **Lý do không chọn mốc giờ (`valid_to_at`):** mọi bảng hiệu lực của `pricing` theo ngày; ADR-0146 Đ1 viết «ngày bắt đầu; ngày kết thúc»; trộn hai kiểu trong một phân hệ là bẫy so sánh. **Lý do không chọn «ngày kết thúc không tính trọn»:** ngược nghĩa với `hieuLuc` của cùng phân hệ — người đọc màn Luật bán cạnh màn Hoa hồng sẽ hiểu sai một ngày.
- **Ngày bắt đầu** [người lập kế hoạch]: mặc định hôm nay, không nhận ngày trong quá khứ (400). Lý do: luật không xét lại đơn cũ (ADR-0146 Đ3), ngày quá khứ chỉ làm nhật ký khó đọc.
- Bất biến cần thử trên D1 (`date()` trong `CHECK`): e2e T14 chèn và kết thúc một luật bắt đầu hôm nay.
- **Hệ quả phải nói ở giao diện và Trợ giúp** (K-7): hẹn kết thúc «đến hôm nay» thì luật **vẫn chặn tới hết hôm nay**; chỉ nút «Kết thúc ngay» thôi chặn từ bây giờ (T11, T15). Luật đã chặn đơn sáng nay rồi bị «Kết thúc ngay» hiện «đến hôm qua» — tra bằng nhật ký kết thúc luật.

### R-2 — Một hàm cổng ở `orders`, mọi cửa gọi nó (chỗ để Lượt B bọc vào)
- `src/modules/orders/cong-ban.ts` (tệp mới, tên tạm) xuất **một** hàm `congLuatBan(db, { bookerPartyId, dong: { catalogCode, ten }[] }): Promise<Response | null>`: gọi hàm công bố của `pricing` (`kiemLuatBan`, R-3), trúng thì trả 409 `sales_blocked` (câu tiếng Việt), không trúng trả `null`. **Không ghi gì.**
- Bảy cửa (ADR-0146 Đ3) gọi **chính hàm này**, không gọi thẳng `pricing`. Bài lưới văn bản (T8) bắt cửa nào gọi `kiemLuatBan` ngoài `cong-ban.ts`.
- Lý do: Lượt B đề xuất hàm `congBanDuoc` ở `orders` chạy (1) luật bán → (2) đóng bán. Khi B được duyệt, người thi công B **thêm bước (2) vào trong `cong-ban.ts`** (đổi tên hàm nếu muốn) — các điểm gọi không dời. Mục 7 ghi chi tiết.

### R-3 — `pricing` xét, `catalog` cho tên
- `pricing/index.ts` công bố `kiemLuatBan(db, { bookerPartyId, catalogCodes, ngay })` → `{ catalogCode, roleTypeCode, scope, attributeCode, valueCode, tenDacDiem?, tenGiaTri? }[]` (danh sách trúng; rỗng = không chặn). Phép xét là **luật thuần** `chanBan(...)` ở `pricing/luat-ban-rules.ts` (không I/O); SQL ở **một** tệp `pricing/luat-ban-repo.ts` (hàng rào (a) của ADR-0146 Đ6 cho phép đúng tệp này nhắc bảng).
- Tên đặc điểm / giá trị cho câu 409 lấy qua **hàm công bố hẹp** của `catalog` (`tenDacDiemTheoMa(db, valueCodes)` ở `catalog/index.ts`, khuôn `tenNhomHienHanh`), cạnh `pricing → catalog` đã có. Hai view công bố **chỉ khoá** (A Đ1, (l2)).
- Bộ lọc for-order (ADR-0146 Đ4) gọi `kiemLuatBan` qua **hàm tiêm của gốc lắp ráp** (tên tạm `dichVuBiChanChoToi`), cùng điều kiện `benDatCuaToi`. Thiếu hàm tiêm ⇒ không lọc (tập rỗng): bộ lọc chỉ để giao diện gọn, chốt thật là cổng ở `orders` (ADR-0146 Đ4 gạch cuối). [người lập kế hoạch — khác các hàm tiêm «từ chối kín» như mốc 6 giờ; lý do: lọc thiếu không mở cửa nào]

### R-4 — Chỗ đặt cổng: **đúng chữ ADR-0146 Đ3**; C5 của B không được giả định
| Cửa | Chỗ đặt trong kế hoạch này | Câu ADR-0146 làm căn cứ |
|---|---|---|
| Lập đơn `POST /api/orders` | ngay sau `resolveBooker` (`index.ts:1133`), **trước** `tranGiamGiaNhap` (`:1135`) — đặt theo **thứ tự hàm**, số dòng chỉ để tìm (dòng sẽ trôi khi sửa) | Đ3 gạch 1; bên đặt cuối cùng chỉ biết sau `resolveBooker` (Đối tác bị ép bên đặt ở `benDatCuaTaiKhoan`) |
| Lưu nháp `PUT /api/orders/:id` | sau khi có bên đặt cuối (sau `benDatCuaTaiKhoan` `:1260` / nhánh giữ bên đặt `:1262–1264` và `resolveBooker`), **trước** `tranGiamGiaNhap`; xét **mọi** dòng có mã của thân | Đ3 gạch 1 + «Nháp cũ chứa dịch vụ nay bị chặn sẽ bị chặn khi lưu» |
| Đổi bên đặt `PUT …/booker` | sau `resolveBooker` (`:1612`), chỉ khi bên đặt **thật sự đổi**, trước nhánh chụp lại mức; nháp và đã xác nhận | Đ3 gạch 2 |
| `kiemCongXacNhan` (Còn vé, Gửi đơn, `/status`) | **dòng đầu** hàm, trước R2 (`xac-nhan-chung.ts:91`) | Đ3 bổ sung 28/10 gạch 2 |
| Gửi xác nhận | chốt riêng **ngay sau** `if (!canXN.can) …` (`xac-nhan-route.ts:117`), **trước** `congNhomTatDuaDon` (`:118`) | Đ3 bổ sung gạch 3 («như ADR-0118 đã làm với nhóm tắt đưa đón» — chốt đó đứng sau `tinhCanXacNhan`) |
- Hệ quả đã biết (giữ đúng ADR): ở `/status`, đơn vừa thuộc diện cần xác nhận vừa dính luật bán nhận `confirm_request_required` trước; bấm Gửi xác nhận mới nhận `sales_blocked`. Còn vé: luật bán chạy sau kiểm mốc và chốt nhóm tắt của route Còn vé (vì nằm trong `kiemCongXacNhan`).
- **Nếu chủ chọn C5 = (a)** (mục 7): thêm **một** lời gọi `congLuatBan` trước `tinhCanXacNhan` ở `/status` (`index.ts:1702`) và dời chốt Gửi xác nhận lên trước `tinhCanXacNhan` (`xac-nhan-route.ts:116`); lời gọi ở đầu `kiemCongXacNhan` giữ (lặp, vô hại). Đổi đúng một ca kỳ vọng của bài T8 (ca «cần xác nhận + bị chặn» ở `/status`).

### R-5 — Hai migration, cùng một lần phát hành
- Migration **M1** `NNNN_dac_diem_dich_vu.sql` (catalog: ba bảng, hai view, trigger) và **M2** `NNNN+1_luat_ban.sql` (pricing: `prc_sales_block` **đã có** phạm vi `ATTRIBUTE` và hai cột đặc điểm). Không có migration «thêm phạm vi» thứ hai (A Đ2 Hệ quả). Tách hai tệp để T1 và T3 làm đỏ→xanh độc lập, và để D1 local đã áp M1 không phải dựng lại khi T3 sửa M2. Hai tệp **phải** vào cùng một lần phát hành (khoá ngoại của M2 trỏ bảng của M1).

### R-6 — Cấu trúc tên tạm (người thi công giữ, hoặc đổi và ghi sổ)
- Ô: `sales.block.write` (ADR-0146 Đ5), `catalog.attribute.assign` (A Đ3). Mã lỗi: `sales_blocked`, `attribute_in_use`, `stale`, `loai_con_luat_ban` (409 tắt loại còn luật — tên mới của kế hoạch), `sales_block_value_inactive` (409 thêm luật trỏ giá trị tắt / lệch đặc điểm).
- Trang: `/luat-ban` («Luật bán»), `/dac-diem-dich-vu` («Đặc điểm dịch vụ»).
- Route (tên tạm; mọi route `catalog` mới **khai trước** các route `/api/catalog/:code…`):

| Route | Cổng | Ô hỏi trong thân | Việc |
|---|---|---|---|
| `GET /api/pricing/luat-ban` | office | `sales.block.write` (+ chặn tài khoản lai — Q-2) | danh sách luật (Đang áp dụng / Sắp áp dụng / Đã kết thúc), kèm tên loại, nhóm, dịch vụ, đặc điểm |
| `POST /api/pricing/luat-ban` | office | `sales.block.write` | thêm luật (201) |
| `POST /api/pricing/luat-ban/:id/ket-thuc` | office | `sales.block.write` | đặt ngày kết thúc một lần (200; 409 `stale` nếu đã kết thúc) |
| `POST /api/pricing/loai-doi-tac/:code/tat` (có sẵn) | office | `partner.commission.write` (có sẵn) | thêm 409 `loai_con_luat_ban` |
| `GET /api/catalog/dac-diem` | office | `catalog.attribute.assign` **hoặc** `admin.manage` | đặc điểm, giá trị, giá trị hiệu lực từng dịch vụ (kèm nguồn), giá trị theo nhóm, danh sách «chưa khai», «mới, đang theo nhóm» |
| `GET /api/catalog/dac-diem/dem-chua-khai` | office | như trên | số đếm cho huy hiệu menu (khuôn `dem-xung-dot`) |
| `POST /api/catalog/dac-diem` | admin | `admin.manage` | tạo đặc điểm kèm ≥ 1 giá trị |
| `PATCH /api/catalog/dac-diem/:code` | admin | `admin.manage` | đổi tên / thứ tự / tắt (409 `attribute_in_use`) / bật lại |
| `POST /api/catalog/dac-diem/:code/gia-tri` | admin | `admin.manage` | thêm giá trị |
| `PATCH /api/catalog/dac-diem/gia-tri/:code` | admin | `admin.manage` | đổi tên / thứ tự / tắt / bật lại giá trị |
| `PUT /api/catalog/groups/:code/dac-diem/:attr` | admin | `admin.manage` | gắn / đổi / bỏ giá trị **theo nhóm**; thân `{ giaTri, dangThay }` |
| `PUT /api/catalog/:code/dac-diem/:attr` | office | `catalog.attribute.assign` | gắn / đổi / bỏ giá trị **cho một dịch vụ**; khoá lạc quan theo `dangThay` (409 `stale`) |

### R-7 — Tiêu chí 12 của ADR-0146 (luật bán + thiếu phí đón) dựng bằng cổng có sẵn
ADR-0147 chưa có mã. Đây là đổi **cách thử**, không đổi tiêu chí — báo chủ ở Q-8. Bài T8 kiểm «luật bán đứng đầu» bằng đơn vừa dính luật bán vừa dính **từng** cổng hiện có của `kiemCongXacNhan` (R2 giá với Đối tác, thiếu người lớn, nhóm tắt đưa đón, chưa chọn Đón/Không đón) ⇒ luôn nhận `sales_blocked`. Ghi vào sổ thi công: kế hoạch ADR-0147 sau này phải thêm ca «thiếu phí đón» vào đúng bài này.

### R-8 — Hai lớp ở chỗ A chỉ ghi một lớp (chỉ siết)
- Tắt đặc điểm / giá trị còn dòng gắn mở: A ghi 409 ở route; kế hoạch thêm **trigger** `BEFORE UPDATE … WHEN NEW.active = 0 AND EXISTS (dòng gắn mở)` (cùng module, không phụ thuộc ngày) ⇒ hết khe đua giữa kiểm và ghi.
- Bất biến ADR-0146 Đ1 «luật còn hiệu lực chỉ trỏ loại đang bật»: thêm luật ⇒ trigger chèn (khuôn `prc_role_tier_role_ok`); tắt loại ⇒ chỉ kiểm ở route (trigger không biết «hôm nay» nếu không dùng `date('now')`, mà luật dự án cấm). Khe đua còn lại được **kiểm định kỳ** `R-PRC-8` (T3) bắt. Dòng gắn đặc điểm mở trỏ đặc điểm / giá trị / nhóm đang tắt: kiểm định kỳ mới **`R-CTL-2`** (T1). **Không** dùng tên `R-CTL-1`: mã đó đã có (`scripts/audit-checks.mjs:1891–1895`, ADR-0058 NT-A11 — cảnh báo «dịch vụ đang hiện chưa phân nhóm», mức `warn`), production từng báo khác 0 (`docs/HANDOFF-N1.md:85`).
- Có thể bỏ cả hai mà không trái ADR; giữ vì rẻ và chỉ siết.

### R-9 — Lệnh đếm của phiếu chốt lệch một điểm với cách máy xét
Lệnh 1 ở `PHIEU-CHOT…` mục C coi hồ sơ «có loại» khi dòng vai có `valid_to_date IS NULL OR valid_to_date >= hôm nay` và loại có `is_partner_label = 1`. Máy xét luật bán (và ép bên đặt — `benDatCuaToi`) theo `v_pty_open_role` (`valid_to_date IS NULL`) **và** loại nằm trong `prc_beneficiary_role` đang bật. Hồ sơ có loại hẹn kết thúc tương lai, hoặc loại không được hưởng, bị lệnh 1 đếm là «có loại» trong khi máy coi là «không loại» ⇒ không bị luật nào chặn. Runbook (mục 9) dùng **bản sửa** khớp máy (đã thử cú pháp, mục 1.1), giữ lệnh 2 nguyên văn. Phiếu chốt không sửa (hồ sơ có ngày).

### R-10 — Không chặn luật trùng
Hai luật cùng (loại, phạm vi) chồng ngày: cho thêm, không 409 (ADR không đòi; kết quả «chặn thắng» không đổi). Màn Luật bán sắp theo loại để người đọc thấy trùng. [người lập kế hoạch]

---

## 3. Câu cần chủ trả lời — gom một lần (kèm khuyến nghị)

Kế hoạch chạy được với mặc định ghi ở cột cuối; chỉ phần việc ghi ở cột «Chặn» chờ câu trả lời.

| # | Câu (lời thường) | Phương án | Khuyến nghị | Chặn | Mặc định nếu chưa trả lời |
|---|---|---|---|---|---|
| Q-1 | (Câu C5 của đề xuất Đóng bán) Đơn vừa có dịch vụ «cần xác nhận» vừa có dịch vụ bị luật bán chặn: bấm Xác nhận thì báo gì trước? | (a) Báo «không bán» ngay · (b) Báo «hãy Gửi xác nhận» trước, bấm Gửi mới báo «không bán» (đúng chữ ADR-0146 hôm nay) | **(a)**: người dùng không phải bấm hai lần; đổi hai dòng mã (R-4) | T8 ca «cần xác nhận + bị chặn» | (b) — đúng chữ ADR-0146; đổi sau là hai dòng + một ca kiểm |
| Q-2 | Tài khoản **lai** (Bán hàng + Đối tác) có được đặt / gỡ luật bán và gắn đặc điểm cho vé không? Nếu được, họ tự gỡ được luật đang chặn chính mình | (a) Chặn tài khoản lai ở các route mới (như mọi route Hoa hồng hôm nay) · (b) Cho như Bán hàng thường | **(a)** | T6, T7 (một điều kiện mỗi route) | (a) — chiều siết, đảo bằng xoá một điều kiện |
| Q-3 | Chủ có chấp nhận cách hiểu «ngày kết thúc» ở R-1 (tính trọn ngày; «Kết thúc ngay» = thôi chặn từ hôm nay, ghi ngày kết thúc là hôm qua) không? | (a) Đồng ý · (b) Muốn mốc giờ chính xác | **(a)** — giống màn Hoa hồng | T3 | (a) |
| Q-4 | Đề xuất Đóng bán (B) có được duyệt **trước** khi thi công T8 không? | — | Không cần chờ: kế hoạch để sẵn chỗ (R-2) | không | thi công độc lập |
| Q-5 | Lỗ HC-5.19 (chưa diễn tập khôi phục dữ liệu) hạn **05/11**: ngày 05/11 bộ kiểm còn xanh, **từ 06/11** `npm test` đỏ ở **mọi** task và mọi điểm kiểm độc lập, không riêng phát hành (`src/phat-hien-han.test.ts:36–38`) | (a) Diễn tập trước · (b) Gia hạn có lý do · (c) Thi công xong và phát hành **trước hoặc trong ngày** 05/11 | (a) nếu kịp; không thì (b) | thi công sau 05/11 **và** phát hành | — (bắt buộc chủ quyết; trong lúc chờ: xem ghi chú dưới bảng) |
| Q-6 | Duyệt đề xuất thêm dòng vào bảng kịch bản Chrome của `web/CLAUDE.md` và dòng «ngoại lệ chỉ siết thứ hai» vào `src/CLAUDE.md` (ADR-0146 Hệ quả + A trang ghép mục 7) | duyệt / sửa chữ / không | duyệt | T15 (tệp luật — AI chỉ đề xuất, N9) | để ở dạng đề xuất trong sổ thi công |
| Q-7 | Danh sách vé và loại đối tác cần chặn (phiếu chốt A3), giá trị đặc điểm của từng vé | — | gửi sau phát hành; là dữ liệu nhập trên màn | không | — |
| Q-8 | (Báo để chủ biết, đổi **cách thử**, không đổi tiêu chí) Tiêu chí 12 của ADR-0146 nói «đơn vừa dính luật bán vừa thiếu phí đón thì báo luật bán». Phí đón (ADR-0147) chưa làm, nên kế hoạch thử bằng bốn bước kiểm có sẵn (giá danh mục, thiếu người lớn, nhóm tắt đưa đón, chưa chọn Đón/Không đón) — R-7; khi làm phí đón sẽ thêm ca «thiếu phí đón» | (a) Đồng ý · (b) Chờ làm phí đón rồi mới nghiệm thu tiêu chí 12 | **(a)** | không | (a) |

**Trong lúc chờ Q-5 (nếu thi công kéo sang 06/11):** bài `src/phat-hien-han.test.ts` đỏ **chỉ vì** mục HC-5.19 quá hạn thì không tính là đỏ của task; người thi công ghi vào sổ thi công (tên bài, câu đỏ, «chỉ HC-5.19»), mọi bài khác phải xanh. Người kiểm độc lập ở KĐL-1/2/3 phải ghi rõ điều này trong báo cáo. Phát hành vẫn bị chặn tới khi chủ quyết Q-5.

---

## 4. Bản đồ tiêu chí nghiệm thu → task

### 4.1 ADR-0146
| Tiêu chí | Nội dung rút gọn | Task (bài) |
|---|---|---|
| 1 | Đối tác loại X: for-order thiếu nhóm Y; lập đơn thẳng 409, không ghi | T9 (route), T8 (409), T14 e2e |
| 2 | Văn phòng lập hộ bên đặt X: 409; bên đặt khác: 201 | T8, T14 |
| 3 | Đổi bên đặt sang X: 409 cả nháp lẫn đã xác nhận | T8, T14 |
| 4 | Luật một dịch vụ: chỉ dịch vụ đó vắng | T4 (thuần), T9, T14 |
| 5 | Kết thúc luật: đặt lại được ngay; dòng cũ còn | T4 (`ngayKetThucLuat`), T6, T14 |
| 6 | CSDL từ chối xoá / sửa cột khác / kết thúc lần hai | T3 |
| 7 | Hồ sơ hai loại, một loại có luật: chặn; không loại: không chặn | T4, T8 |
| 8 | Tắt loại còn luật: 409; kết thúc rồi tắt: 200 | T6, T14 |
| 9 | Gộp hồ sơ không loại vào hồ sơ X: nháp 409 ở lần gửi kế; đã xác nhận không đổi | T8 (bài route gộp + gửi) |
| 10 | Bán hàng thêm 201, kết thúc 200, có nhật ký; Kế toán, Đối tác, Thực tập, Nhân sự 403 | T6, T14 (`permissions.mjs`) |
| 11 | Luật chặn một dịch vụ cho X: Đối tác X không thấy; Gửi đơn thẳng 409, đơn vẫn nháp; dịch vụ khác đặt được | T8, T9, T14 |
| 12 | Vừa luật bán vừa thiếu phí đón ⇒ `sales_blocked` | T8 theo R-7 |
| 13 | Gửi xác nhận trên nháp bị chặn: 409, không mở yêu cầu | T8, T14 |
| Đ6 (a) | ngoài tệp luật bán, không tệp nhắc bảng | T6 (bài quét) |
| Đ6 (b) | bảng không cột / giá trị nào ngoài nghĩa chặn | T3 |
| Đ6 (c) | e2e mỗi đường ghi Đ3 → 409; tắt loại còn luật → 409 | T14 |
| Đ6 (d) | e2e for-order Đối tác thiếu đúng dịch vụ; văn phòng không thiếu | T14 |
| Đ5 | Ô `sales.block.write`, cổng văn phòng, màn trong menu văn phòng, nhật ký | T5, T6, T11 |
| «Việc bắt buộc…» | gắn loại cho hồ sơ mọi tài khoản Đối tác; đếm chỉ đọc | Runbook mục 9 bước 6 |
| Hệ quả | cảnh báo ở màn gán nhóm; Trợ giúp Bán hàng, Quản trị | T13, T15 |

### 4.2 Lượt A (A, tiêu chí 1–20)
| Tiêu chí | Task |
|---|---|
| 1 tạo đặc điểm 201 + hai nhật ký; năm vai khác 403 | T7 |
| 2 Bán hàng gắn cho dịch vụ 200 + nhật ký; bốn vai 403; Bán hàng gắn theo nhóm 403 | T7 |
| 3 riêng thắng chung qua view | T1 (bài view), T7 (đường thật) |
| 4 hai lệnh cùng gắn: một 200, một 409 `stale`, đúng một dòng mở | T7 |
| 5 CSDL từ chối (6 ca) | T1 |
| 6 tắt giá trị còn dùng 409; đóng hết rồi tắt 200 | T1 (trigger, R-8), T7 |
| 7 đồng bộ Sheet không đổi dòng `ctl_attribute*` | T7 (bài route sync) |
| 8 luật `ATTRIBUTE(X=x1)`: Đối tác không thấy; lập đơn 409 không ghi; `x2` đặt được | T4, T8, T9 |
| 9 luật kèm nhóm: `x1` ngoài `G` đặt được | T4, T8 |
| 10 CV-3 | T4, T8 |
| 10b CV-4, CV-5 (+ R3-2: bên đặt mang cả `L` và `L2`) | T4 |
| 11 văn phòng lập hộ 409; Gửi xác nhận 409 không mở yêu cầu; Còn vé sau đổi giá trị 409 | T8 |
| 12 chưa khai không bị chặn; có trong danh sách | T4, T7 |
| 12b kết thúc luật đặt lại ngay (nghĩa R-1) | T4, T6 |
| 13 luật trỏ giá trị tắt / lệch đặc điểm: máy chủ 409; chèn thẳng: trigger; kiểu lạ: CHECK | T3, T6 |
| 14 CSDL từ chối `ATTRIBUTE` thiếu giá trị / kèm dịch vụ; `SERVICE` kèm đặc điểm | T3 |
| 15 đơn đã xác nhận không đổi khi đổi giá trị; sửa số khách vẫn 200 | T8 |
| 16 nháp có `D`, đổi `D` sang `x1` ⇒ lần lưu kế 409 | T8 |
| 17 cảnh báo đổi giá trị (Chrome) | T12, Chrome `dac-diem-smoke` |
| 17b tắt → bật lại → gắn lại ⇒ chặn lại; cảnh báo «còn 1 luật» (Chrome) | T7 (đường thật), T12 |
| 18 dịch vụ mới vào danh sách chưa khai, đếm tăng; ẩn / rời Sheet không vào | T7 |
| 19 dịch vụ mới thuộc nhóm có giá trị ⇒ ở «mới, đang theo nhóm» | T7 |
| 20 mỗi hàng rào (e)–(j), (l1), (l2) quan sát đỏ thật, ghi sổ | T1, T2, T3, T5, T7, T8, T10 (từng bài) |

### 4.3 Hàng rào máy (ghi `docs/SO-HANG-RAO.md` sau khi thấy đỏ thật)
| Hàng rào | Nguồn | Task | Cách quan sát đỏ |
|---|---|---|---|
| (a) chỉ `pricing/luat-ban-repo.ts` nhắc `prc_sales_block` | ADR-0146 Đ6 | T6 | thêm `"prc_sales_block"` vào một chuỗi ở `orders/cong-ban.ts` → đỏ → gỡ |
| (b) không cột / giá trị «cho phép» | ADR-0146 Đ6 | T3 | bài đọc `PRAGMA table_info` + câu `CHECK`; thêm cột `allow` vào bản sao migration trong bài → đỏ |
| (e) `orders` không nhắc `ctl_attribute*` | A Đ6 | T8 | thêm chữ `ctl_attribute_assignment` vào `orders/cong-ban.ts` → đỏ |
| (f) ngoài tệp nửa nghiêm mới của `catalog`, mã chạy không nhắc ba bảng | A Đ6 | T2 | nhắc `ctl_attribute` ở `catalog/repository.ts` → đỏ |
| (g) lược đồ `prc_sales_block` (CHECK ba kiểu, trigger giá trị thuộc đặc điểm) | A Đ6 | T3 | bỏ vế `ATTRIBUTE` khỏi CHECK trong bản dựng thử → đỏ |
| (h) bảng chân trị của view | A Đ6 | T1 | đổi `COALESCE(s…, g…)` thành `COALESCE(g…, s…)` → đỏ |
| (i) `catalog.attribute.assign` ⊆ `sales.block.write`; `admin.manage` ⊆ `sales.block.write` | A Đ6 | T5 | đặt `sales.block.write` của ADMIN = none → đỏ |
| (j) migration không `INSERT` vào `ctl_attribute*` | A Đ6 | T1 | thêm một câu gieo → đỏ |
| (l1) không chuỗi hằng dạng mã đặc điểm / giá trị trong mã chạy | A Đ6 | T2 | cài `"a0123456789ab"` vào `web/` → đỏ |
| (l2) SQL của `pricing`/`orders` không đọc `name` của `ctl_attribute*`; view không cột tên | A Đ6 | T2/T6 | thêm cột `name` vào `v_ctl_service_attribute` trong bản dựng thử → bài (l2) **và** bài sổ «cột view đúng sổ» cùng đỏ. Ghi sổ: vế «SQL không đọc `name`» chồng với 8(b), (e), (f) (bài xanh ngay từ đầu vì chưa có câu nào); lớp riêng của (l2) là canh view không thêm cột tên |
| (l3) không rẽ nhánh theo `name` | A Đ6 | — | **dựa vào kỷ luật**; người kiểm độc lập soát (KĐL-2) |
| (k) e2e tự tạo đặc điểm, loại; dọn cuối bài | A Đ6 | T14 | — (cách làm bài, không phải hàng rào) |
| Lưới «mọi cửa ghi đơn gọi `congLuatBan`» | R-2 (kế hoạch) | T8 | bỏ lời gọi ở `PUT …/booker` → đỏ |
| `R-PRC-8`, `R-CTL-2` kiểm định kỳ (mới; `R-CTL-1` là cảnh báo cũ, không đổi) | R-8 (kế hoạch) | T3, T1 | bài `audit-invariants.test.ts` ca đỏ |

---

## 5. Thứ tự và điểm dừng

```
T0 chuẩn bị
T1 M1 catalog (bảng, view, trigger) ── T2 tệp SQL nửa nghiêm + luật thuần catalog
T3 M2 prc_sales_block ── T4 luật thuần luật bán
   ▼ ĐIỂM DỪNG KĐL-1 (dữ liệu + luật thuần)
T5 hai ô quyền ── T6 route pricing ── T7 route catalog ── T8 cổng orders ── T9 lọc for-order ── T10 rà sổ hàng rào
   ▼ ĐIỂM DỪNG KĐL-2 (quyền + cổng + hàng rào)
T11 màn Luật bán ── T12 màn Đặc điểm dịch vụ ── T13 cảnh báo màn gán nhóm ── T14 e2e ── T15 tài liệu
   ▼ ĐIỂM DỪNG KĐL-3 (toàn bộ, trước khi trình chủ phát hành)
Mục 9: runbook chủ tự chạy
```
- T1 trước T3 (khoá ngoại). T4 không cần T3 (thuần) nhưng làm sau để dùng chung kiểu dòng.
- T5 làm `npm test` **đỏ có chủ đích** ở `permission-enforcement` cho tới khi T6 (`sales.block.write`) và T7 (`catalog.attribute.assign`) có lời gọi `can()`; ghi trong commit T5. Muốn tránh trạng thái đỏ thì gộp T5 vào T6+T7 (người thi công chọn, ghi sổ).
- Mỗi điểm dừng: người thi công **không** tự nghiệm thu; giao một subagent `nguoi-kiem-doc-lap` chỉ đọc, đọc mã thật, chạy lại lệnh, chỉ báo cáo. Chỉ đi tiếp khi báo cáo «đạt» hoặc mọi mục CHẶN đã vá và kiểm lại.

---

## 6. Ràng buộc chung (mọi task)

- Tiếng Việt có dấu ở giao diện, câu lỗi, nhật ký, commit; gọi hệ thống là «Nền tảng»; không lộ mã thô (`SERVICE`, `ATTRIBUTE`, mã đặc điểm, mã loại) ra người dùng.
- Mỗi task: **viết bài đỏ trước**, chạy thấy FAIL đúng lý do, rồi cài đặt, rồi xanh. Commit nhỏ, tiêu đề nói việc, thân nói vì sao.
- Lệnh kiểm theo `docs/CHANGE-GUIDE.md` §3: luật thuần `node --test <tệp>` → `npm test` → `npm run typecheck`; migration thêm `npm run db:migrate:local` và e2e **đủ bộ** trước KĐL-3; `docs/data-dictionary.json` → `npm run dict` → `npm test`; giao diện `npm run build:web` + kịch bản Chrome đúng bảng `web/CLAUDE.md`.
- `npm run typecheck` không phủ `*.test.ts`, `tests/`, `scripts/` — tự đọc lại.
- `pricing` là module nghiêm: SQL qua `defineSql`; tệp mới `pricing/luat-ban-repo.ts` **thêm vào `STRICT`** (`src/architecture.test.ts:79–106`). SQL mới của `catalog` chỉ ở tệp nửa nghiêm mới `catalog/dac-diem-repo.ts`, **thêm vào `NUA_NGHIEM`** (`:160–174`). `orders` không có SQL mới (chỉ gọi `pricing`).
- Không cạnh phụ thuộc mới: `catalog: ["audit"]`, `pricing: ["parties","catalog","audit"]`, `orders → pricing, catalog` đều có sẵn (`src/architecture.test.ts:33, 54, 57`).
- Hành động nhật ký mới: `src/shared/audit-actions.ts` + xếp vào `src/shared/lich-su-doi-tac.ts` (`LICH_SU_DOI_TAC_AN`) **và** `src/shared/lich-su-noi-bo.ts` (`LICH_SU_NOI_BO_AN`) — `CHANGE-GUIDE` f bước 7, 7b. Không ghi SĐT/email/MST; nhật ký luật bán ghi mã loại, phạm vi, ngày (ADR-0146 Đ5); nhật ký đặc điểm ghi tên đặc điểm, giá trị cũ → mới, mã dịch vụ / tên nhóm (A Đ1).
- Bảng/cột mới: `docs/data-dictionary.json` (bảng, view, `hangDuLieu` từng cột — công thức z19; bài `src/hang-du-lieu.test.ts`) → `npm run dict`.
- CẤM AI chạy: `git push`, merge, `wrangler deploy`, migration / ghi D1 remote, `d1 execute --remote`. Lệnh đếm remote ở runbook là **chủ chạy**.
- Không sửa `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`; dòng cần thêm ở các tệp đó ghi thành đề xuất trong sổ thi công (Q-6).
- Sổ thi công: `docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-thi-cong-nhat-ky.md` (người thi công tạo ở T0) — ruling, nợ, kết quả đo, ngày quan sát hàng rào.

---

## 7. Chỗ nối với Lượt B (Đóng bán) — không phụ thuộc, nhưng không phải dời

- **Hàm cổng:** B đề xuất `congBanDuoc` ở `orders` = (1) luật bán → (2) đóng bán. Kế hoạch này đặt `congLuatBan` ở `orders/cong-ban.ts` (R-2) và mọi cửa gọi nó. B thi công sau: thêm bước (2) **trong cùng tệp** (có thể đổi tên thành `congBanDuoc`, nhận thêm ngày đi và «bước nào cần xét»), giữ (1) gọi `pricing.kiemLuatBan` — không xét lại luật bán (A Đ2 «Hệ quả cho kế hoạch thi công»).
- **Tập cửa:** kế hoạch này phủ 7 cửa của ADR-0146 Đ3. B thêm cửa thứ 8 (sửa chuyến `PUT …/trip`, chỉ bước đóng bán) và bỏ bước luật bán ở «đổi bên đặt» cho đóng bán. Bài lưới văn bản của T8 khai danh sách cửa bằng **một hằng** (cửa → bước) để B sửa một chỗ.
- **C5 (Q-1):** nếu (a): hai chỗ ở R-4 + một ca kiểm. Nếu B được duyệt kèm C5 = (a) **trước** khi T8 bắt đầu, người thi công T8 đặt luôn theo (a) và ghi sổ.
- **Còn vé:** B muốn gọi cổng **trước** chốt nhóm tắt và kiểm mốc ở route Còn vé (B Đ3 (c) cửa 8). Kế hoạch này để luật bán trong `kiemCongXacNhan` (đúng ADR-0146); B thêm lời gọi sớm khi thi công, lời gọi trong `kiemCongXacNhan` giữ.
- **Phạm vi theo đặc điểm cho đóng bán:** nếu B dùng, đọc cùng `v_ctl_service_attribute`, không dựng nguồn thứ hai.
- **Ngày đi:** luật bán **không** phụ thuộc ngày đi (ADR-0146 Đ2: xét ngày thao tác). Hàm `congLuatBan` không nhận ngày đi; B thêm tham số cho bước (2).

---

## 8. Các task

### T0 — Chuẩn bị (không đổi hành vi)

- [ ] Đọc ADR-0151; ghi vào sổ thi công rằng số điều / tiêu chí dùng trong kế hoạch là số của ADR-0151 (đã khớp — báo cáo kiểm kế hoạch K-4).
- [ ] Tạo sổ thi công (mục 6). Ghi câu trả lời Q-1…Q-7 nếu đã có.
- [ ] Đo nền: `npm test` và `npm run typecheck` trên HEAD, ghi số bài đỏ sẵn (nếu có) để không nhận nhầm.
- [ ] **Lấy số migration** (chưa tạo tệp ở bước này): `ls migrations | tail -3`; `git worktree list` rồi `ls <worktree>/migrations | tail -3` cho từng worktree (kể cả tệp chưa commit); `git branch -a --no-merged main` rồi `git ls-tree --name-only <nhánh> migrations/ | tail -3` cho từng nhánh. M1 = lớn nhất toàn bộ + 1, M2 = M1 + 1. Ghi vào sổ kèm giờ kiểm. Bài kiểm migration tìm tệp theo **đuôi tên** (`_dac_diem_dich_vu.sql`, `_luat_ban.sql`) để đổi số lúc gộp chỉ đổi tên tệp.

### T1 — M1: ba bảng `ctl_attribute*`, hai view, trigger (A Đ1)

**Files**
- Create: `migrations/<M1>_dac_diem_dich_vu.sql`, `src/migrations-dac-diem-dich-vu.test.ts`
- Modify: `docs/data-dictionary.json` (3 bảng module `catalog`, 2 view, `hangDuLieu`), chạy `npm run dict`; `scripts/audit-checks.mjs` + `src/audit-invariants.test.ts` (`R-CTL-2`, R-8)

**Lược đồ (theo A Đ1; mẫu `0055:10–22`, `0127:7–26`)**
- `ctl_attribute(code TEXT PK, name TEXT NOT NULL CHECK length 1–40, sort_order INTEGER NOT NULL, active INTEGER NOT NULL CHECK IN (0,1), created_at, created_by, updated_at, updated_by)`; chỉ mục duy nhất một phần `(name) WHERE active = 1`; trigger cấm xoá; trigger cấm đổi `code`, `created_*`.
- `ctl_attribute_value(code TEXT PK, attribute_code TEXT NOT NULL REFERENCES ctl_attribute(code), name … 1–40, sort_order, active, dấu vết)`; duy nhất một phần `(attribute_code, name) WHERE active = 1` [người lập kế hoạch: tên trùng chỉ cấm trong cùng đặc điểm]; cấm xoá; cấm đổi `code`, `attribute_code`, `created_*`.
- `ctl_attribute_assignment(id TEXT PK, service_code TEXT REFERENCES catalog_item(code), group_code TEXT REFERENCES ctl_group(code), attribute_code TEXT NOT NULL REFERENCES ctl_attribute(code), value_code TEXT NOT NULL REFERENCES ctl_attribute_value(code), valid_from_at TEXT NOT NULL, valid_to_at TEXT, dấu vết, CHECK ((service_code IS NULL) <> (group_code IS NULL)))`; hai chỉ mục duy nhất một phần `(service_code, attribute_code) WHERE valid_to_at IS NULL AND service_code IS NOT NULL` và tương tự cho `group_code`.
- Trigger của bảng gắn: `BEFORE INSERT` — `value_code` phải thuộc `attribute_code` (đọc `ctl_attribute_value`), đặc điểm / giá trị / nhóm (nếu có) đang bật; cấm xoá; `BEFORE UPDATE` chỉ cho `valid_to_at` từ NULL sang có giá trị (+ `updated_*`), mọi cột khác giữ.
- R-8: trigger `BEFORE UPDATE OF active ON ctl_attribute` / `ctl_attribute_value` `WHEN NEW.active = 0 AND OLD.active = 1 AND EXISTS (dòng gắn mở dùng nó)` → `RAISE(ABORT, 'ctl_attribute_in_use: …')`.
- `v_ctl_service_attribute(catalog_code, attribute_code, value_code, source)`: mỗi `catalog_item` × đặc điểm: dòng mở của dịch vụ (`SERVICE`), không thì dòng mở của **nhóm hiện hành đang bật** qua `v_ctl_service_group` + `ctl_group.active = 1` (`GROUP`), không thì không có dòng. Chỉ khoá.
- `v_ctl_attribute_value(attribute_code, code, active)`.
- **Không** `INSERT` nào vào ba bảng (A-C3, hàng rào (j)).

**Bước**
- [ ] Bài đỏ `src/migrations-dac-diem-dich-vu.test.ts` (khuôn `src/migrations-dua-don-dich-vu.test.ts`, dựng CSDL bằng `node:sqlite` từ `migrations/*.sql`):
  - A tiêu chí 5: xoá dòng gắn; sửa cột khác ngoài đóng; đóng dòng đã đóng; chèn giá trị thuộc đặc điểm khác (trigger — khẳng định **không** có khoá ngoại nhiều cột: đọc `PRAGMA foreign_key_list`); chèn khi đặc điểm / giá trị / nhóm đang tắt; dòng có cả hai mã; hai dòng mở cùng (dịch vụ, đặc điểm).
  - A tiêu chí 6 (lớp CSDL, R-8): tắt giá trị còn dòng mở → trigger từ chối; đóng dòng rồi tắt → được.
  - (h) bảng chân trị viết tay: {dịch vụ có / không dòng riêng} × {nhóm có / không dòng chung} × {nhóm đang dùng / tắt / Chưa phân loại} ⇒ `value_code`, `source` đúng từng ô (12 ca). A tiêu chí 3 ở mức view.
  - (j) đọc văn bản migration lượt này: không có `INSERT INTO ctl_attribute`.
- [ ] Chạy `node --test src/migrations-dac-diem-dich-vu.test.ts` → FAIL (chưa có tệp migration).
- [ ] Viết migration; `docs/data-dictionary.json`; `npm run dict`.
- [ ] `R-CTL-2` (mức `fail`; mã mới — `R-CTL-1` là cảnh báo cũ «chưa phân nhóm», không đụng): dòng gắn mở trỏ đặc điểm / giá trị / nhóm đang tắt. Bài trong `src/audit-invariants.test.ts`: ca xanh, ca đỏ, «dữ liệu khoẻ ⇒ 0».
- [ ] `node --test src/migrations-dac-diem-dich-vu.test.ts src/architecture.test.ts src/audit-invariants.test.ts src/hang-du-lieu.test.ts` → PASS; `npm test`; `npm run typecheck`; `npm run db:migrate:local`.
- [ ] Quan sát đỏ thật (h), (j) (mục 4.3) → hoàn nguyên → ghi dòng `docs/SO-HANG-RAO.md` (ngày, đột biến, câu đỏ).
- [ ] Commit `Migration đặc điểm dịch vụ: ba bảng ctl_attribute*, hai view công bố, trigger (ADR-0151 Đ1)`.

**Nghiệm thu:** A tiêu chí 3 (mức view), 5, 6 (lớp CSDL); hàng rào (h), (j) có dòng sổ.

### T2 — SQL nửa nghiêm và luật thuần của `catalog` cho đặc điểm (A Đ1, Đ5, Đ6 (f), (l1), (l2))

**Files**
- Create: `src/modules/catalog/dac-diem-repo.ts` (mọi câu `ctl_attribute*` qua `defineSql`), `src/modules/catalog/dac-diem-rules.ts` + `.test.ts` (kiểm tên, sinh mã, «chưa khai», «mới, đang theo nhóm»), `src/dac-diem-khong-lo-ma.test.ts` (l1), `src/dac-diem-chi-mot-tep.test.ts` (f)
- Modify: `src/architecture.test.ts` (`NUA_NGHIEM` thêm `modules/catalog/dac-diem-repo.ts`), `src/modules/catalog/index.ts` (xuất `tenDacDiemTheoMa` — hàm hẹp R-3)

**Interfaces — Produces**
- `maDacDiemMoi()` = `a` + 12 hex; `maGiaTriMoi()` = `v` + 12 hex (khác tiền tố `g` của `maNhomMoi`, (l1)).
- `chuaKhai(dichVu, hieuLuc, attributeCode)` thuần: dịch vụ `in_sheet = 1`, không ẩn, không có dòng hiệu lực cho đặc điểm.
- `moiTheoNhom(dichVu, hieuLuc, homNay)`: `first_seen_at` trong 14 ngày (hằng hiển thị, A Đ5 mục 2) và `source = 'GROUP'`.
- `tenDacDiemTheoMa(db, valueCodes) → Map<valueCode, { dacDiem, giaTri }>` — câu duy nhất ngoài `catalog` dùng được tên (qua import `catalog/index.ts`).

**Bước**
- [ ] Bài đỏ `dac-diem-rules.test.ts`: tên rỗng / > 40 ký tự / chỉ khoảng trắng → lỗi tiếng Việt; mã sinh đúng dạng; `chuaKhai` loại dịch vụ ẩn, đã rời Sheet; `moiTheoNhom` biên 14 ngày.
- [ ] Bài đỏ (f): quét `src/**/*.ts` (bỏ `*.test.ts`, che chú thích) — ngoài `catalog/dac-diem-repo.ts`, không tệp nào khớp `\bctl_attribute(_value|_assignment)?\b` (view `v_ctl_…` không khớp vì `_` là ký tự chữ; kèm bài tự kiểm bộ quét như `orders-khong-doc-nhom-truc-tiep.test.ts`).
- [ ] Bài đỏ (l1): quét `src/**/*.ts` (trừ test) và `web/**/*.ts` đã che chú thích, đỏ khi có chuỗi hằng `["'\`][av][0-9a-f]{12}["'\`]`.
- [ ] Bài đỏ (l2): duyệt sổ `registeredSql()` — câu của module `pricing`, `orders` không chứa `ctl_attribute` kèm `name`; khẳng định cột hai view đúng sổ (`v_ctl_service_attribute` không có cột tên). Bài sổ dữ liệu «cột của view đúng sổ» (`src/architecture.test.ts:355`) đã canh phần view.
- [ ] Cài đặt; `node --test src/modules/catalog/dac-diem-rules.test.ts src/dac-diem-khong-lo-ma.test.ts src/dac-diem-chi-mot-tep.test.ts src/architecture.test.ts` → PASS (bài EXPLAIN của `NUA_NGHIEM` chạy mọi câu mới); `npm test`; `npm run typecheck`.
- [ ] Quan sát đỏ thật (f), (l1), (l2) → hoàn nguyên → sổ hàng rào. (l2): đột biến = thêm cột `name` vào view `v_ctl_service_attribute` trong bản dựng thử (không phải thêm `name` vào câu của `pricing` — đột biến đó chỉ làm đỏ bài 8(b)). Thêm ca tự kiểm bộ quét (a)/(f): tên hành động nhật ký `prc_sales_block_added`, `ctl_attribute_created` không bị bắt nhầm.
- [ ] Commit.

### T3 — M2: `prc_sales_block` có sẵn phạm vi `ATTRIBUTE` (ADR-0146 Đ1, A Đ2)

**Files**
- Create: `migrations/<M2>_luat_ban.sql`, `src/migrations-luat-ban.test.ts`
- Modify: `docs/data-dictionary.json` (+ `npm run dict`), `scripts/audit-checks.mjs` + `src/audit-invariants.test.ts` (`R-PRC-8`)

**Lược đồ**
```
prc_sales_block(
  id TEXT PRIMARY KEY,
  role_type_code TEXT NOT NULL REFERENCES prc_beneficiary_role(role_type_code),
  scope TEXT NOT NULL CHECK (scope IN ('SERVICE','GROUP','ATTRIBUTE')),
  catalog_code TEXT,                                   -- không khoá ngoại, như prc_commission_rule; route kiểm có trong danh mục
  group_code TEXT REFERENCES ctl_group(code),
  attribute_code TEXT REFERENCES ctl_attribute(code),
  value_code TEXT REFERENCES ctl_attribute_value(code),
  valid_from_date TEXT NOT NULL,
  valid_to_date TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= date(valid_from_date, '-1 day')),   -- R-1
  note TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at TEXT NOT NULL, created_by TEXT, updated_at TEXT NOT NULL, updated_by TEXT,
  CHECK ((scope = 'SERVICE'   AND catalog_code IS NOT NULL AND group_code IS NULL AND attribute_code IS NULL AND value_code IS NULL)
      OR (scope = 'GROUP'     AND group_code IS NOT NULL AND catalog_code IS NULL AND attribute_code IS NULL AND value_code IS NULL)
      OR (scope = 'ATTRIBUTE' AND attribute_code IS NOT NULL AND value_code IS NOT NULL AND catalog_code IS NULL))   -- nhóm tuỳ chọn
)
```
- Trigger: `prc_sales_block_no_delete`; `prc_sales_block_close_only` (khuôn `prc_commission_rule_close_only`: chỉ `valid_to_date` NULL → giá trị, một lần, + `updated_*`); `prc_sales_block_role_ok` (loại trong `prc_beneficiary_role` đang bật — khuôn `0096:44–46`); `prc_sales_block_value_ok` `BEFORE INSERT WHEN NEW.scope = 'ATTRIBUTE' AND NOT EXISTS (SELECT 1 FROM v_ctl_attribute_value v WHERE v.code = NEW.value_code AND v.attribute_code = NEW.attribute_code AND v.active = 1)` (đọc view công bố của module được phép — bài `src/architecture.test.ts:1335`).
- Chỉ mục: `(role_type_code)`, `(scope, catalog_code)`, `(group_code)`, `(value_code)`.

**Bước**
- [ ] Bài đỏ `src/migrations-luat-ban.test.ts`:
  - ADR-0146 tiêu chí 6: xoá → từ chối; sửa `scope` / `role_type_code` / `note` → từ chối; đặt `valid_to_date` lần hai → từ chối.
  - A tiêu chí 14: `ATTRIBUTE` thiếu `value_code`; `ATTRIBUTE` kèm `catalog_code`; `SERVICE` kèm `attribute_code` → CHECK.
  - A tiêu chí 13 (CSDL): giá trị thuộc đặc điểm khác → trigger; giá trị đang tắt → trigger; `scope = 'ALL'` hay kiểu lạ → CHECK.
  - ADR-0146 Đ1 bất biến (lớp CSDL): loại không trong `prc_beneficiary_role` hoặc đang tắt → trigger.
  - R-1: `valid_to_date = valid_from_date − 1` được; `− 2` → CHECK.
  - (b), (g): `PRAGMA table_info` đúng tập cột; không cột nào tên chứa `allow|cho_phep|permit`; câu `CHECK` của `scope` đúng ba giá trị; mọi khoá ngoại một cột trỏ khoá chính (bài `architecture.test.ts:334–353` cũng canh).
- [ ] FAIL → viết migration → PASS. `docs/data-dictionary.json` (module `pricing`) + `npm run dict`.
- [ ] `R-PRC-8` (`fail`): luật còn hiệu lực ở ngày chạy kiểm trỏ loại đang tắt (ngày truyền như các kiểm `R-PRC-*` có sẵn). Bài ca xanh / đỏ / khoẻ.
- [ ] `node --test src/migrations-luat-ban.test.ts src/architecture.test.ts src/audit-invariants.test.ts src/hang-du-lieu.test.ts`; `npm test`; `npm run typecheck`; `npm run db:migrate:local`.
- [ ] Quan sát đỏ thật (b), (g) → sổ hàng rào. Commit `Migration luật bán theo loại đối tác: prc_sales_block ba phạm vi (ADR-0146 Đ1, ADR-0151 Đ2)`.

### T4 — Luật thuần luật bán (ADR-0146 Đ2, A Đ2, R-1)

**Files**
- Create: `src/modules/pricing/luat-ban-rules.ts`, `src/modules/pricing/luat-ban-rules.test.ts`

**Interfaces — Produces**
- `DongLuatBan { id, roleTypeCode, scope: "SERVICE"|"GROUP"|"ATTRIBUTE", catalogCode, groupCode, attributeCode, valueCode, validFrom, validTo }`.
- `chanBan({ vaiBenDat: readonly string[], luat: readonly DongLuatBan[], dichVu: readonly { code: string; nhom: string | null; giaTri: ReadonlyMap<string, string> }[], ngay }) → TrungLuat[]` — luật hiệu lực ở `ngay` (dùng **chung** `hieuLuc` của `pricing/rules.ts:58`, không viết phép thứ hai), loại thuộc `vaiBenDat`, khớp một trong ba vế của A Đ2.
- `ngayKetThucLuat({ homNay, validFrom, denNgay? }) → { ok, value } | { ok: false, message }` (R-1).
- `kiemThanLuatBan(raw, homNay)` — kiểm thân `POST /api/pricing/luat-ban` (kiểu phạm vi, mã, ngày ≥ hôm nay, ghi chú ≤ 200).
- `cauBiChan({ tenDichVu, tenDacDiem?, tenGiaTri? })` — câu 409 tiếng Việt, ví dụ «Dịch vụ «…» không bán cho loại đối tác của bên đặt này (Vận chuyển cảng–đảo: Không gồm).» — chữ đặc điểm lấy từ dữ liệu.

**Bước**
- [ ] Bài đỏ, dựng bằng dữ liệu tự tạo (tên ví dụ trong chú thích, mã ngẫu nhiên):
  - ADR-0146 tiêu chí 4 (một dịch vụ, khác cùng nhóm không bị), 7 (hai loại một có luật ⇒ chặn; không loại ⇒ không), CV-1, CV-2.
  - A tiêu chí 8, 9, 10 (CV-3), 10b (CV-4, CV-5, và R3-2: bên đặt mang cả `L` và `L2` ⇒ chặn cả `x1`, `x2`, `x3`), 12 (chưa khai ⇒ không chặn — CV-6).
  - Hiệu lực R-1: luật `validTo = hôm qua` không chặn hôm nay; `validTo = hôm nay` còn chặn; luật tương lai chưa chặn; khoảng rỗng không bao giờ chặn. ADR-0146 tiêu chí 5 / A 12b ở mức thuần.
  - `ngayKetThucLuat`: luật bắt đầu tuần trước ⇒ hôm qua; bắt đầu hôm nay ⇒ hôm qua (= from − 1); bắt đầu tuần sau ⇒ from − 1; `denNgay` sớm hơn biên ⇒ lỗi.
  - Không có thứ tự ưu tiên: hai luật cùng trúng ⇒ trả cả hai, câu báo dùng trúng đầu tiên theo thứ tự dòng đơn.
- [ ] FAIL → cài → `node --test src/modules/pricing/luat-ban-rules.test.ts` PASS → `npm test` → `npm run typecheck`. Commit.

### ▼ ĐIỂM DỪNG KĐL-1 — người kiểm độc lập, chỉ đọc

Giao subagent `nguoi-kiem-doc-lap` (chỉ đọc, không sửa). Phạm vi: T1–T4. Việc của người kiểm:
- Đọc hai migration với A Đ1, Đ2 và ADR-0146 Đ1 từng câu; xác nhận không có khoá ngoại nhiều cột, không `INSERT` gieo, không cột «cho phép», CHECK ba kiểu, trigger đủ.
- Chạy lại: `node --test src/migrations-dac-diem-dich-vu.test.ts src/migrations-luat-ban.test.ts src/modules/pricing/luat-ban-rules.test.ts src/modules/catalog/dac-diem-rules.test.ts src/architecture.test.ts src/audit-invariants.test.ts`, `npm test`, `npm run typecheck`, `npm run db:migrate:local` trên D1 local tạm.
- Đọc bảng chân trị (h) và ca R-1 — tự tính lại vài ô.
- Đối chiếu dòng mới ở `docs/SO-HANG-RAO.md` có ngày và đột biến thật.
- Báo cáo: CHẶN / NÊN SỬA / GHI NHẬN, tệp:dòng.

### T5 — Hai ô quyền (ADR-0146 Đ5, A Đ3, hàng rào (i))

**Files — Modify**
- `src/shared/permissions.ts`: thêm
  - `"sales.block.write": row("any", "none", "any", "none", "none", "any", "none", "none", "none", "none")`
  - `"catalog.attribute.assign": row("any", "none", "any", "none", "none", "any", "none", "none", "none", "none")`
  (chú thích dẫn ADR-0146 Đ5 / ADR-0151 Đ3).
- `src/shared/permissions.test.ts`: bảng `ADR` (hai dòng); ba bài ghim hàng DRIVER / DRIVER_PARTNER / HR (thêm hai ô `none`); bài mới (i) «mọi cột: `catalog.attribute.assign` ≠ none ⇒ `sales.block.write` ≠ none; `admin.manage` ≠ none ⇒ `sales.block.write` ≠ none» (khuôn bài «⊆ từng cột» `:572`).
- `src/modules/orders/xem-don-theo-quyen.test.ts`: ghim hàng PARTNER (hai ô `none`).
- `src/shared/tro-ly-cau-truc-ten.ts`: `TEN_THAO_TAC` hai mục (ví dụ «đặt và kết thúc luật bán theo loại đối tác», «gắn đặc điểm cho dịch vụ»); rồi `node scripts/sinh-so-do-trang.mjs` (hoặc `npm test` tự sinh — commit tệp sinh).
- Không chạm: `ADMIN_NONE_OPS`, `PERMISSION_CODES`, cổng, bài 1024 tập con (ô mới không phải mã quyền mới).

**Bước**
- [ ] Sửa `permissions.test.ts` + `xem-don-theo-quyen.test.ts` + bài (i) **trước** → `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc.test.ts` → FAIL (đếm số bài đỏ, ghi sổ — A ghi «chưa đo»; ước 4–5 tệp).
- [ ] Thêm hai ô + `TEN_THAO_TAC` → PASS. `npm run typecheck`.
- [ ] `npm test`: **đỏ có chủ đích** ở `src/permission-enforcement.test.ts` (chưa có `can(…, "<ô>")`) cho tới T6/T7 — ghi trong commit; không thêm mục hoãn vào `docs/quyen-hoan.json`.
- [ ] Quan sát đỏ thật (i): đặt `sales.block.write` của ADMIN = `none` → đỏ → hoàn nguyên → sổ hàng rào.
- [ ] Commit `Hai ô quyền sales.block.write và catalog.attribute.assign (ADR-0146 Đ5, ADR-0151 Đ3) — permission-enforcement đỏ tới khi có route`.

### T6 — Route luật bán ở `pricing` + 409 tắt loại (ADR-0146 Đ1, Đ3 hàm, Đ5, Đ6 (a); A Đ2)

**Files**
- Create: `src/modules/pricing/luat-ban-repo.ts` (mọi câu `prc_sales_block`, đọc `v_ctl_service_attribute`, `v_ctl_attribute_value`, `v_ctl_service_group`, `v_pty_open_role`); `src/modules/pricing/luat-ban-route.test.ts`; `src/luat-ban-mot-tep.test.ts` (hàng rào (a))
- Modify: `src/modules/pricing/index.ts` (ba route, `kiemLuatBan` công bố, 409 trong `doiTrangThaiLoai`, dịch lỗi trigger trong `loiBang`), `src/architecture.test.ts` (`STRICT` thêm `modules/pricing/luat-ban-repo.ts`), `src/shared/contracts.ts` (DTO `LuatBanDto`, `LuatBanListResponse`…), `src/shared/audit-actions.ts` (`prc_sales_block_added`, `prc_sales_block_ended`, nhóm như `prc_commission_rule_added`), `lich-su-doi-tac.ts`, `lich-su-noi-bo.ts`, `src/route-access.test.ts` (ảnh chụp ba route mới)

**Hành vi**
- `kiemLuatBan(db, { bookerPartyId, catalogCodes, ngay })`: `bookerPartyId` null ⇒ `[]` không đọc gì; đọc vai mở của bên đặt, luật hiệu lực ở `ngay` của các loại đó (một câu), nhóm hiện hành + giá trị hiệu lực của các mã (`json_each`, như `groups_of`), rồi `chanBan`. Có trúng `ATTRIBUTE` thì lấy tên qua `catalog.tenDacDiemTheoMa`.
- `POST /api/pricing/luat-ban`: `can(staff, "sales.block.write")` (+ `holdsPartner` theo Q-2) → `kiemThanLuatBan` → `SERVICE`: dịch vụ có trong danh mục (`getEffectiveServices`); `GROUP`/`ATTRIBUTE` có nhóm: nhóm tồn tại; `ATTRIBUTE`: giá trị thuộc đặc điểm và đang bật (409 `sales_block_value_inactive`) → loại đang bật được hưởng (400/409 theo khuôn `prc_tier_target`) → lô: chèn + nhật ký → 201.
- `POST …/:id/ket-thuc`: `ngayKetThucLuat` → câu `UPDATE … WHERE id = ? AND valid_to_date IS NULL` + nhật ký `changes() > 0` → đã kết thúc ⇒ 409 `stale`.
- `GET /api/pricing/luat-ban`: mọi dòng (chỉ thêm), trạng thái Đang áp dụng / Sắp áp dụng / Đã kết thúc theo `vnToday`; dòng `ATTRIBUTE` trỏ giá trị đang tắt mang cờ «không phủ dịch vụ nào» (trang ghép 3b).
- Tắt loại (`doiTrangThaiLoai`, nhánh `bat = false`): đếm luật **còn hiệu lực hoặc sắp hiệu lực** (`valid_to_date IS NULL OR valid_to_date >= hôm nay`) của loại → > 0 ⇒ 409 `loai_con_luat_ban` «Loại này còn N luật bán đang hoặc sắp áp dụng — kết thúc các luật đó ở màn Luật bán trước.» (Kế toán không thấy màn Luật bán: câu nói rõ người làm được là Bán hàng, Quản trị, Toàn quyền). [người lập kế hoạch: tính cả luật sắp hiệu lực, vì tắt loại xong luật tương lai sẽ trỏ loại tắt]

**Bước**
- [ ] Bài đỏ `luat-ban-route.test.ts` (khung `world()` của `tests/audit/harness.mjs`, khuôn `pricing/route.test.ts` — có sẵn tài khoản lai `SP`, `KP`):
  - ADR-0146 tiêu chí 10: Bán hàng thêm 201 + một dòng nhật ký; kết thúc 200 + nhật ký; Kế toán, Đối tác, Thực tập, Nhân sự 403 (Hướng dẫn viên, tài xế không qua cổng văn phòng → 403 ở router); lai `SP` theo Q-2.
  - ADR-0146 tiêu chí 8: tắt loại còn luật 409; kết thúc rồi tắt 200; luật sắp hiệu lực cũng chặn tắt.
  - ADR-0146 tiêu chí 5 / A 12b (route): kết thúc rồi `kiemLuatBan` không còn trúng hôm nay; dòng cũ vẫn đọc được qua GET.
  - A tiêu chí 13 (máy chủ): giá trị tắt / lệch đặc điểm → 409 trước khi chạm CSDL.
  - Thêm luật cho loại đang tắt → từ chối (Đ1).
  - Kết thúc lần hai → 409 `stale`.
- [ ] Bài đỏ (a) `src/luat-ban-mot-tep.test.ts`: quét `src/**/*.ts`, `web/**/*.ts` (trừ test, che chú thích): chỉ `pricing/luat-ban-repo.ts` khớp `\bprc_sales_block\b`; miễn `migrations/`, `docs/`, `scripts/audit-checks.mjs` (ADR-0146 Đ6 (a) «kịch bản kiểm dữ liệu được miễn»). Có bài tự kiểm bộ quét.
- [ ] FAIL → cài → `node --test src/modules/pricing/luat-ban-route.test.ts src/luat-ban-mot-tep.test.ts src/modules/pricing/loai-doi-tac.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts src/architecture.test.ts src/shared/audit-actions.test.ts` → PASS (permission-enforcement còn đỏ cho `catalog.attribute.assign` tới T7). `npm run typecheck`.
- [ ] Quan sát đỏ thật (a) → sổ hàng rào. Commit.

### T7 — Route đặc điểm ở `catalog` (A Đ1, Đ3, Đ4 nhật ký, Đ5)

**Files**
- Modify: `src/modules/catalog/index.ts` (route ở R-6, khai **trước** `/api/catalog/:code…`), `src/modules/catalog/dac-diem-repo.ts` (câu ghi / đọc), `src/shared/contracts.ts` (DTO), `src/shared/audit-actions.ts` (nhóm `catalog`: `ctl_attribute_created`, `ctl_attribute_updated`, `ctl_attribute_off`, `ctl_attribute_on`, `ctl_attribute_value_created`, `ctl_attribute_value_updated`, `ctl_attribute_value_off`, `ctl_attribute_value_on`, `ctl_service_attribute_set`, `ctl_group_attribute_set`) + `lich-su-doi-tac.ts` + `lich-su-noi-bo.ts`, `src/route-access.test.ts`
- Create: `src/modules/catalog/dac-diem-route.test.ts`

**Hành vi**
- Ghi = một `db.batch`: câu đóng dòng mở cũ (khoá theo `dangThay`) → câu chèn dòng mới `WHERE changes() > 0` (khi có giá trị mới) → nhật ký `changes() > 0` (khuôn `transfer-rule`, `catalog/index.ts:335–360`; `nhom-repo.ts:170–176`). Thua khoá ⇒ 409 `stale`, không ghi.
- Tắt đặc điểm / giá trị: route kiểm còn dòng gắn mở ⇒ 409 `attribute_in_use` (trigger R-8 là lớp hai; dịch lỗi `ctl_attribute_in_use:` thành cùng câu).
- Bật lại: được, có nhật ký (A Đ1); không kiểm `pricing` (cảnh báo ở giao diện, T12).
- Gắn cho dịch vụ: dịch vụ có trong `catalog_item`; giá trị đang bật, thuộc đặc điểm.
- Danh sách «chưa khai», «mới, đang theo nhóm», số đếm: luật thuần T2 trên dữ liệu đọc từ view.

**Bước**
- [ ] Bài đỏ `dac-diem-route.test.ts` (`world()`):
  - A tiêu chí 1: Quản trị tạo đặc điểm hai giá trị → 201, đúng số dòng nhật ký (A ghi «hai dòng» — người thi công chốt cách đếm: một dòng tạo đặc điểm + một dòng mỗi giá trị, hay một dòng đặc điểm kèm danh sách giá trị; ghi sổ, giữ khớp chữ tiêu chí); Bán hàng, Kế toán, Đối tác, Thực tập, Nhân sự → 403.
  - A tiêu chí 2: Bán hàng gắn `X = x1` cho `D` → 200, nhật ký «`D`: chưa khai → x1»; Kế toán, Đối tác, Thực tập, Nhân sự → 403; Bán hàng gắn theo nhóm → 403 (cổng admin).
  - A tiêu chí 3 (đường thật), 4 (hai lệnh cùng `dangThay` → một 200, một 409 `stale`, đúng một dòng mở), 6 (409 rồi 200), 17b phần máy chủ (tắt → bật lại → gắn lại → `kiemLuatBan` trúng lại).
  - A tiêu chí 7: chạy route đồng bộ Sheet với Sheet giả (khuôn bài sync có sẵn) thêm / đổi / bỏ dịch vụ ⇒ số dòng ba bảng không đổi.
  - A tiêu chí 18, 19: dịch vụ mới không nhóm ⇒ trong «chưa khai» mọi đặc điểm, số đếm tăng; dịch vụ ẩn / `in_sheet = 0` không có; dịch vụ mới thuộc nhóm có giá trị ⇒ «mới, đang theo nhóm».
  - Đọc: Bán hàng, Quản trị, Toàn quyền 200; Kế toán 403.
- [ ] FAIL → cài → `node --test src/modules/catalog/dac-diem-route.test.ts src/permission-enforcement.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/architecture.test.ts src/shared/audit-actions.test.ts src/shared/lich-su-noi-bo.test.ts src/lich-su-don-doi-tac.test.ts` → PASS; `npm test` **xanh** (permission-enforcement hết đỏ); `npm run typecheck`.
- [ ] Commit.

### T8 — Cổng luật bán ở bảy cửa của `orders` (ADR-0146 Đ3; A Đ2 cổng, Đ4)

**Files**
- Create: `src/modules/orders/cong-ban.ts` (R-2), `src/modules/orders/luat-ban-cong-route.test.ts`, `src/luat-ban-moi-cua.test.ts` (lưới văn bản)
- Modify: `src/modules/orders/index.ts` (`POST /api/orders`, `PUT /api/orders/:id`, `PUT …/booker` — chỗ ở R-4), `src/modules/orders/xac-nhan-chung.ts` (dòng đầu `kiemCongXacNhan`), `src/modules/orders/xac-nhan-route.ts` (chốt riêng Gửi xác nhận; sửa ghi chú «Cổng luật bán: chưa có» ở `:131–133`), `src/orders-khong-doc-nhom-truc-tiep.test.ts` (hàng rào (e): thêm `ctl_attribute`, `ctl_attribute_value`, `ctl_attribute_assignment` vào mẫu quét và bài tự kiểm), `src/shared/order-errors.ts` (chỉ nếu nhánh mặc định không hiện nguyên câu máy chủ cho `sales_blocked` — người thi công kiểm, ghi sổ)

**Hành vi**
- `congLuatBan` lấy `dong` = các dòng **có mã** của đơn / thân; dòng nhập tay không mã bỏ qua (ADR-0146 «Điều chưa chắc»). Trúng ⇒ `error(409, "sales_blocked", cauBiChan(...))` với tên dịch vụ của dòng trúng đầu tiên.
- `POST /api/orders`: không ghi dòng nào khi 409 (tiêu chí 1).
- `PUT /api/orders/:id`: xét mọi dòng có mã của **thân** (gồm dòng đã lưu còn giữ) với bên đặt cuối.
- `PUT …/booker`: chỉ khi `benMoi !== meta.bookerPartyId`; đơn nháp và đã xác nhận (tiêu chí 3); dòng lấy từ `findOrder`.
- `kiemCongXacNhan`: dòng đầu, trước R2 ⇒ Còn vé, Gửi đơn (đơn ở lại nháp — tiêu chí 11), `/status`.
- Gửi xác nhận: chốt riêng sau `confirm_not_required`, trước `congNhomTatDuaDon` ⇒ 409, không mở yêu cầu (tiêu chí 13).
- **Không** thêm cổng ở: `money-edit`, thông tin thương mại theo dòng, chặng, hành khách, gán nhóm, gắn đặc điểm, gộp hồ sơ, kết thúc vai (ADR-0146 Đ3; A Đ4 mục 1).

**Bước**
- [ ] Bài đỏ `luat-ban-cong-route.test.ts` (`world()`; dựng loại, hồ sơ, luật, đặc điểm bằng **route thật** của T6, T7 — không chèn thẳng bảng của module khác):
  - ADR-0146 tiêu chí 1 (lập đơn 409, đếm `orders` không tăng), 2 (văn phòng lập hộ 409; bên đặt khác 201), 3 (đổi bên đặt nháp 409, đã xác nhận 409; đổi sang bên đặt không bị chặn 200), 7 (route), 9 (gộp hồ sơ không loại vào hồ sơ mang `X` qua `POST /api/parties/:id/merge` ⇒ nháp gửi kế tiếp 409; đơn đã xác nhận không đổi), 11 (Gửi đơn 409, đơn vẫn nháp, không yêu cầu mở), 12 theo R-7 (bốn ca «luật bán + cổng khác» đều `sales_blocked`), 13 (Gửi xác nhận 409, không dòng `ord_confirm_request`).
  - A tiêu chí 8 (route), 9, 10, 11 (văn phòng lập hộ 409; Gửi xác nhận 409; Còn vé trên đơn chờ có dịch vụ vừa đổi sang `x1` → 409), 15 (đơn đã xác nhận có `D`; đổi `D` sang `x1` ⇒ đơn không đổi, không nhật ký trên đơn, `money-edit` 200), 16 (nháp có `D`; đổi `D` sang `x1` ⇒ `PUT` kế tiếp 409 — CV-8; đổi ngược ⇒ 200).
  - R-4: `/status` trên đơn **cần xác nhận + bị chặn** ⇒ `confirm_request_required` (theo chữ ADR-0146; nếu Q-1 = (a) thì kỳ vọng `sales_blocked`); `/status` trên đơn không cần xác nhận + bị chặn ⇒ `sales_blocked`.
  - Đơn không bên đặt / bên đặt không loại ⇒ không chặn (Đ2).
- [ ] Bài đỏ lưới `src/luat-ban-moi-cua.test.ts` (khuôn phần (B) của `orders-khong-doc-nhom-truc-tiep.test.ts`): hằng `CUA_LUAT_BAN` liệt kê 7 cửa (route + tệp); mỗi thân route trong danh sách có `congLuatBan(` (riêng `/status`, Còn vé, Gửi đơn: qua `kiemCongXacNhan(`); không tệp nào của `orders` ngoài `cong-ban.ts` gọi `kiemLuatBan(`. Lưới văn bản rẻ — hành vi thật do bài route canh.
- [ ] Mở rộng (e) trong `orders-khong-doc-nhom-truc-tiep.test.ts` (đỏ trước bằng cách thêm ca tự kiểm bộ quét cho tên mới).
- [ ] FAIL → cài → `node --test src/modules/orders/luat-ban-cong-route.test.ts src/luat-ban-moi-cua.test.ts src/orders-khong-doc-nhom-truc-tiep.test.ts src/modules/orders/*.test.ts` → PASS; `npm test`; `npm run typecheck`.
- [ ] Quan sát đỏ thật: (e) và lưới mọi cửa (bỏ lời gọi ở `PUT …/booker`) → sổ hàng rào.
- [ ] Commit `Cổng luật bán ở bảy cửa ghi đơn qua một hàm congLuatBan (ADR-0146 Đ3)`.

### T9 — Danh mục for-order bỏ dịch vụ bị chặn cho Đối tác (ADR-0146 Đ4)

**Files**
- Modify: `src/shared/router.ts` (kiểu hàm tiêm `dichVuBiChanChoToi: (codes: readonly string[]) => Promise<ReadonlySet<string>>` ở ba chỗ như `benDatCuaToi` `:205, :358, :494`; vắng ⇒ tập rỗng — R-3), `src/index.ts` (nối: `holdsPartner(actor) && actor.partyId` ⇒ `nguoiHuongCuaHoSo` ⇒ có ⇒ `kiemLuatBan(env.DB, { bookerPartyId, catalogCodes, ngay: vnToday(new Date()) })` → tập mã), `src/modules/catalog/index.ts` (`catalogForOrderForm` nhận tập bỏ, lọc `visible` trước `nhomChoForm`)
- Modify/Create bài: `src/modules/catalog/danh-muc-lap-don.test.ts` (thêm ca) hoặc `src/modules/catalog/for-order-luat-ban.test.ts`

**Bước**
- [ ] Bài đỏ: Đối tác bị ép bên đặt mang `X`, luật `GROUP = Y` ⇒ for-order không có dịch vụ nhóm `Y` và không có nhóm `Y` trong `groups`; luật `ATTRIBUTE` ⇒ bỏ đúng dịch vụ mang giá trị; Bán hàng, Thực tập, Quản trị thấy đủ; Đối tác không mang loại ⇒ đủ; tài khoản lai Bán hàng + Đối tác có hồ sơ được hưởng ⇒ bị lọc (cùng điều kiện `benDatCuaToi`). Thiếu hàm tiêm (khung thử) ⇒ không lọc, không lỗi.
- [ ] FAIL → cài → `node --test <bài> src/modules/catalog/*.test.ts src/architecture.test.ts src/shared/router.test.ts` → PASS; `npm test`; `npm run typecheck`. Commit.

### T10 — Rà sổ hàng rào trước KĐL-2 (không mã mới)
- [ ] Mỗi dòng của bảng 4.3 (trừ (k), (l3)), gồm `R-PRC-8` và `R-CTL-2`, có dòng trong `docs/SO-HANG-RAO.md` với: chặn gì, cơ chế (tệp bài), ngày quan sát đỏ thật, đột biến dùng, câu đỏ. Dòng (l3) ghi «dựa vào kỷ luật — người kiểm độc lập soát».
- [ ] `npm test`, `npm run typecheck`, `npm run db:migrate:local`, `node scripts/audit-invariants.mjs --db local` (thoát 0; `R-CTL-1` là cảnh báo cũ, không làm thoát 1).

### ▼ ĐIỂM DỪNG KĐL-2 — người kiểm độc lập, chỉ đọc

Phạm vi: T5–T10 (quyền, route, cổng, hàng rào). Việc của người kiểm:
- Đối chiếu hai hàng `MATRIX` với ADR-0146 Đ5 và A Đ3 từng cột; bài (i) đúng hai vế.
- Đọc thân **mọi** route mới: `can()` là dòng đầu sau kiểm tham số, đúng ô, đúng cổng (`office`/`admin`), điều kiện tài khoản lai theo Q-2; route ghi có khoá lạc quan + nhật ký cùng lô.
- Đọc bảy cửa của `orders`: đúng chỗ R-4, `congLuatBan` đứng trước mọi ghi, không ghi khi 409; không có cổng ở các cửa ADR nói «không cần cổng».
- Soát (l3): không chỗ nào so `name` của đặc điểm / giá trị với chuỗi hằng.
- Kiểm `kiemLuatBan` dùng `vnToday` truyền vào, không `date('now')`; dùng chung `hieuLuc`.
- Chạy lại: `npm test`, `npm run typecheck`, các bài route T6–T9, `node --test src/permission-enforcement.test.ts src/route-write-guard.test.ts src/route-access.test.ts`, `node scripts/audit-invariants.mjs --db local`.
- Thử lại hai đột biến bất kỳ trong bảng 4.3 để xác nhận hàng rào còn đỏ được.

### T11 — Màn «Luật bán» (ADR-0146 Đ5; A Đ2 kiểu «Theo đặc điểm»)

**Files**
- Create: `public/luat-ban.html` (`<head>` chép từ `public/locations.html`, giữ thẻ `/giao-dien.css` ngay sau `/app.css` — `CHANGE-GUIDE` c), `web/luat-ban.ts`, `src/shared/luat-ban-hien-thi.ts` + `.test.ts` (thuần: nhãn phạm vi, trạng thái, mô tả dòng — dùng chung bài kiểm)
- Modify: `package.json` (`build:web`), `src/shared/sw-policy.ts` (`PAGES`, `PRECACHE` + `/js/luat-ban.js`), `src/shared/muc-giao-dien.ts` (`TRANG.luatBan = { duong: "/luat-ban", hien: (s) => can(s, "sales.block.write") && !holdsPartner(s) }` — vế `holdsPartner` theo Q-2, phải **cùng điều kiện** route GET; một dòng `THANH_BEN` nhóm «THIẾT LẬP», đặt ngay sau «Hoa hồng đối tác»), `src/shared/muc-giao-dien-goi.ts` (`luatBan: "GET /api/pricing/luat-ban"`)

**Giao diện (luật `web/CLAUDE.md`)**
- Dựng bằng `h()`, không `innerHTML`; thành phần chung v2: `.the`, `.bang` (máy tính) → thẻ (điện thoại), `.tab-phu` ba thẻ «Đang áp dụng / Sắp áp dụng / Đã kết thúc» (cùng chữ màn Hoa hồng), `.huy-hieu`; «Thêm luật» mở `moBangTruot` (ô Loại đối tác; Phạm vi: «Một dịch vụ» / «Cả nhóm» / «Theo đặc điểm»; với «Theo đặc điểm»: Đặc điểm, Giá trị, Nhóm (tuỳ chọn); Từ ngày (mặc định hôm nay), Đến ngày (trống được), Ghi chú); «Kết thúc» hỏi bằng `hoiXacNhan` (không `confirm()` — trần `src/ratchet-confirm-alert.test.ts`); lỗi máy chủ qua `cauLoiMayChu`; toast `hienBaoNgan`.
- Dòng `ATTRIBUTE` trỏ giá trị tắt: nhãn «Không phủ dịch vụ nào» (trang ghép 3b).
- **Ngày kết thúc tính trọn ngày (R-1) phải nói rõ trên màn** (báo cáo kiểm kế hoạch K-7): nút «Kết thúc ngay» nói «Luật thôi chặn từ bây giờ»; ô «Đến ngày» (hẹn kết thúc) có dòng phụ «Luật vẫn chặn tới hết ngày này» — hẹn đến hôm nay thì **vẫn chặn tới hết hôm nay**. Luật đã «Kết thúc ngay» hiện «đến <hôm qua>»; dòng phụ hoặc Trợ giúp nói: muốn biết luật có chặn đơn sáng nay không thì xem nhật ký kết thúc luật. Chữ do hàm thuần ở `src/shared/luat-ban-hien-thi.ts` dựng, có ca trong `.test.ts`.
- Ô gõ 16px; CSS chỉ token, khối mới đặt sau dấu mốc PWA nếu cần; không màu mới.
- Ẩn/hiện chỉ bằng `can(staff, …)` (bài `src/giao-dien-hoi-bang-quyen.test.ts`).
- Lấy danh sách đặc điểm / giá trị từ `GET /api/catalog/dac-diem` (người giữ `sales.block.write` đều giữ `catalog.attribute.assign` hoặc `admin.manage` — hôm nay cùng ba vai; nếu lệch thì ô «Theo đặc điểm» ẩn và ghi lý do).

**Bước**
- [ ] Bài đỏ `luat-ban-hien-thi.test.ts`; `sw-policy.test.ts` đỏ khi thêm HTML trước `PAGES` (tự có); `src/muc-giao-dien-goi.test.ts`, `src/muc-hien-mo-duoc-{1,2,3}.test.ts` (mục hiện ⇔ trang mở được trên 1024 tập quyền).
- [ ] Cài → `npm test` (gồm tự sinh `so-do-trang.ts` — commit tệp sinh), `npm run typecheck`, `npm run build:web`, `npm run test:e2e -- pwa`.
- [ ] Kịch bản Chrome (mục 8.1). Commit.

### T12 — Màn «Đặc điểm dịch vụ» (A Đ1, Đ3, Đ4 cảnh báo, Đ5; trang ghép 3b)

**Files**
- Create: `public/dac-diem-dich-vu.html`, `web/dac-diem-dich-vu.ts`, `src/shared/dac-diem-hien-thi.ts` + `.test.ts` (thuần: `canhBaoDoiGiaTri({ cu, moi, luat, tenDichVu })` → câu «Đổi giá trị này sẽ [bỏ chặn / bắt đầu chặn] … cho: …» hoặc null; `canhBaoBatLai`; `canhBaoDoiTen`)
- Modify: `package.json`, `src/shared/sw-policy.ts`, `src/shared/muc-giao-dien.ts` (`TRANG.dacDiem = { duong: "/dac-diem-dich-vu", hien: (s) => (can(s, "catalog.attribute.assign") || can(s, "admin.manage")) && !holdsPartner(s) }` — vế `holdsPartner` theo Q-2; `THANH_BEN` THIẾT LẬP ngay sau «Dịch vụ & giá»; huy hiệu số «chưa khai» khuôn huy hiệu «Dịch vụ & giá»), `src/shared/muc-giao-dien-goi.ts` (`dacDiem: "GET /api/catalog/dac-diem"`), `web/shell.ts` chỉ nếu huy hiệu cần một nhánh nạp số (khuôn `dem-xung-dot`)

**Giao diện**
- `.tab-phu`: «Gắn cho dịch vụ» (mọi người thấy mục) · «Chưa khai (N)» · «Mới, đang theo nhóm» · «Theo nhóm» (chỉ `can(admin.manage)`) · «Định nghĩa» (chỉ `can(admin.manage)`: thêm / đổi tên / sắp xếp / tắt / bật lại đặc điểm và giá trị).
- Bảng dịch vụ × đặc điểm: mỗi ô là ô chọn (giá trị đang bật + «Theo nhóm (…)»); hiện nguồn «riêng» / «theo nhóm». Lưu: nếu `canhBaoDoiGiaTri` khác null ⇒ `hoiXacNhan({ tieuDe, hauQua })` trước khi gửi; danh sách luật lấy từ `GET /api/pricing/luat-ban` (người thấy màn giữ `sales.block.write` nhờ bài (i)). Đây là **giao diện, máy chủ không ép** (A Đ4 mục 2).
- «Bật lại»: cảnh báo «còn N luật bán trỏ tới giá trị này, sẽ chặn [các loại] khi giá trị được gắn lại» (A Đ4 (d)). «Đổi tên» giá trị có luật trỏ tới: cảnh báo (A Đ4 mục 4).
- 409 `stale` ⇒ toast «Vừa có người đổi — đã tải lại.» và tải lại dòng; 409 `attribute_in_use` ⇒ câu máy chủ.

**Bước**
- [ ] Bài đỏ `dac-diem-hien-thi.test.ts` (CV-8: «sẽ bỏ chặn H2 cho …»; đổi giữa hai giá trị đều không có luật ⇒ null; theo nhóm ⇒ nêu số dịch vụ thừa hưởng); rào điều hướng như T11.
- [ ] Cài → `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e -- pwa`. Kịch bản Chrome (mục 8.1). Commit.

### T13 — Cảnh báo ở màn gán nhóm (ADR-0146 Đ3 «Màn gán nhóm phải cảnh báo»; A Đ4 (c))

**Files — Modify:** `web/catalog.ts` (trước «Chuyển N dịch vụ»: gọi `GET /api/pricing/luat-ban` và `GET /api/catalog/dac-diem`, dựng câu bằng hàm thuần ở `src/shared/dac-diem-hien-thi.ts` (thêm `canhBaoDoiNhom`) — luật `GROUP` của nhóm cũ / mới và giá trị thừa hưởng đổi), `src/shared/dac-diem-hien-thi.test.ts`
- [ ] Bài đỏ cho `canhBaoDoiNhom` (nhóm cũ có luật ⇒ «thôi chặn»; nhóm mới có luật ⇒ «bắt đầu chặn»; giá trị thừa hưởng đổi ⇒ nêu đặc điểm). Cờ «cần xác nhận» (ADR-0136) đã có trên màn thì giữ nguyên chữ cũ — **chưa kiểm** màn hôm nay có cảnh báo cờ đó chưa; nếu chưa có, ghi nợ, không mở rộng phạm vi.
- [ ] `npm run typecheck`, `npm run build:web`, Chrome `danh-muc-nhom-smoke.mjs` + `dot-a-smoke.mjs` (bảng `web/CLAUDE.md`). Commit.

### T14 — e2e (ADR-0146 Đ6 (c), (d); A (k))

**Files**
- Create: `tests/e2e/luat-ban.mjs`; Modify: `tests/e2e/run.mjs` (`ALL` thêm `"luat-ban"` sau `"catalog"`), `tests/e2e/permissions.mjs` (hai ô: Bán hàng 201 thêm luật / 200 gắn đặc điểm dịch vụ; Kế toán, Đối tác, Thực tập, Nhân sự 403; Bán hàng gắn theo nhóm 403; chưa đăng nhập 401)

**Nội dung `luat-ban.mjs`** (D1 local tạm, đăng nhập qua `login()`/`session()` của `tests/e2e/lib.mjs`):
- Tự tạo loại đối tác (tên kèm dấu thời gian), gắn cho hồ sơ một tài khoản Đối tác thử; tự tạo đặc điểm, giá trị; luật `GROUP`, `SERVICE`, `ATTRIBUTE` (kèm và không kèm nhóm).
- Mỗi cửa của ADR-0146 Đ3 → 409 `sales_blocked`: lập đơn, lưu nháp, đổi bên đặt (nháp, đã xác nhận), `/status`, Gửi xác nhận, Còn vé, Gửi đơn (Đ6 (c)). Tắt loại còn luật → 409 (Đ6 (c)).
- for-order của Đối tác thiếu đúng dịch vụ bị chặn, nhóm rỗng không hiện; của Bán hàng không thiếu (Đ6 (d)). `tests/e2e/catalog.mjs` (Đối tác thấy đúng danh sách nhóm như Bán hàng) phải **vẫn xanh** — chạy cạnh.
- R-1 trên D1 thật: luật bắt đầu hôm nay, «Kết thúc ngay» → 200 (CHECK `date()` chạy trên D1) → lập đơn 201.
- Dọn (A (k)): cuối bài kết thúc mọi luật, đóng mọi dòng gắn, tắt đặc điểm, tắt loại thử.
- [ ] Viết bài, chạy trên nhánh **trước** T8/T9 (nếu thứ tự cho phép) để thấy đỏ; không thì quan sát đỏ bằng đột biến (bỏ `congLuatBan` ở Gửi xác nhận → bài đỏ) → hoàn nguyên.
- [ ] Tắt mọi `wrangler dev` mồ côi; `npm run test:e2e -- luat-ban catalog permissions xac-nhan-don gui-don loai-doi-tac` → PASS; trước KĐL-3: `npm run test:e2e` **đủ bộ** (đuôi `audit-invariants --strict`). Cần mạng.
- [ ] Commit.

### T15 — Tài liệu, nhật ký thay đổi, Trợ giúp, đề xuất tệp luật

- [ ] `docs/SYSTEM-DESIGN.md` §5 (bảng, view, migration M1/M2), §7 (route), §8 (hai ô, cổng); §16 nếu có lệch có chủ ý (R-1 khoảng rỗng là lựa chọn kế hoạch, không phải lệch ADR).
- [ ] `docs/CHANGE-GUIDE.md`: công thức mới (số `z` kế tiếp, kiểm lúc viết) «Luật bán theo loại đối tác và đặc điểm dịch vụ»: thêm cửa ghi đơn mới ⇒ gọi `congLuatBan` + thêm vào `CUA_LUAT_BAN`; thêm kiểu phạm vi = ADR + migration dựng lại CHECK; dùng đặc điểm cho việc khác = ADR (giới hạn 3 của lệch 5.2); một dòng ở ma trận §3; bẫy «ngày kết thúc tính trọn — Kết thúc ngay = hôm qua».
- [ ] `docs/data-dictionary.json` đã làm ở T1, T3 — `npm run dict` lần cuối.
- [ ] `src/shared/changelog.ts` mục mới đầu mảng (số = mục đầu của `main` + 1 lúc gộp), `node --test src/shared/changelog.test.ts`; Trợ giúp `src/shared/huong-dan-ban-hang.ts`, `src/shared/huong-dan-quan-tri.ts` (đặc điểm, danh sách chưa khai, đổi giá trị làm đổi luật bán; «Kết thúc ngay» khác «hẹn kết thúc đến ngày …» — hẹn đến hôm nay vẫn chặn tới hết hôm nay (R-1); ADR-0146 Hệ quả), `node --test src/shared/huong-dan.test.ts`; Chrome `help-smoke.mjs` (bản chép ở `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/`).
- [ ] `docs/HANDOFF-N1.md`: mục runbook mới theo mục 9 của kế hoạch này (trạng thái «CHƯA gộp, CHƯA lên production»).
- [ ] **Đề xuất, không tự sửa** (Q-6; N9): (1) dòng mới cho bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào» của `web/CLAUDE.md` (hai trang mới → hai kịch bản mục 8.1); (2) dòng «ngoại lệ chỉ siết thứ hai» của ADR-0146 Hệ quả + câu đặc điểm của A trang ghép mục 7 cho `src/CLAUDE.md`; (3) dòng bảng thi hành lệch 5.2 ở `docs/ARCHITECTURE.md` (việc của chủ — A «Điều chưa chắc»); (4) dòng trạng thái ADR-0146 ở `docs/adr/README.md`: «Đ1, Đ2, Đ3, Đ6 bị sửa một phần bởi ADR-0151» (việc của người chép ADR). Ghi nguyên văn đề xuất vào sổ thi công; sửa tệp luật chỉ bằng công cụ sửa tệp khi chủ đồng ý.
- [ ] Commit.

### ▼ ĐIỂM DỪNG KĐL-3 — người kiểm độc lập, chỉ đọc (trước khi trình chủ phát hành)

- Chạy lại toàn bộ: `npm test`, `npm run typecheck`, `npm run build:web`, `npm run db:migrate:local`, `npm run test:e2e` đủ bộ, `node scripts/audit-invariants.mjs --db local`.
- Đọc bằng chứng Chrome (ảnh, log ✓/✗) của mục 8.1 cho cả 390 và 1040; xác nhận không chữ Anh / mã thô lộ ra.
- Đối chiếu bảng 4.1, 4.2: mỗi tiêu chí có bài tên rõ, bài xanh, và đã thấy đỏ trước (log trong sổ thi công).
- Đọc runbook ở `docs/HANDOFF-N1.md` với mục 9: lệnh chép-dán chạy được, đúng thư mục, không lệnh ghi remote nào AI phải chạy.
- Báo cáo; người thi công chỉ báo «đạt» theo báo cáo này + test (CLAUDE.md §3).

---

## 8.1 Kịch bản Chrome (giao diện mới và giao diện bị chạm)

Chạy `npm run build:web` trước; Chrome + axe ngoài repo (`tests/e2e/README.md`, đặt `AXE_JS`); D1 local tạm. **Các trang dùng chung kho cookie — trang của tài khoản nào phải mở sau cùng** (`CLAUDE.md` §10): thứ tự mở Toàn quyền → Quản trị → Đối tác → Bán hàng.

| Kịch bản | Thư mục | Bước chính | Vì sao |
|---|---|---|---|
| `luat-ban-smoke.mjs` (**mới**) | `docs/evidence/<ngày thi công>-luat-ban-dac-diem/kich-ban/` | 390 + 1040: Kế toán không thấy mục, mở thẳng `/luat-ban` bị từ chối bằng câu tiếng Việt; Quản trị thêm luật ba kiểu (bảng trượt), dòng hiện ở «Đang áp dụng»; «Kết thúc» qua hộp xác nhận → dòng sang «Đã kết thúc»; luật trỏ giá trị tắt hiện «Không phủ dịch vụ nào»; Bán hàng thêm / kết thúc được; axe 0 lỗi nghiêm trọng | T11 |
| `dac-diem-smoke.mjs` (**mới**) | cùng thư mục | 390 + 1040: Quản trị định nghĩa đặc điểm hai giá trị, gắn theo nhóm, tắt giá trị còn dùng → câu 409, bật lại → cảnh báo «còn 1 luật» (A tiêu chí 17b); Bán hàng thấy mục, **không** thấy thẻ «Định nghĩa», «Theo nhóm»; đổi giá trị vé đang bị luật trỏ tới → hộp cảnh báo «sẽ bỏ chặn …» (A tiêu chí 17, CV-8), lưu được; huy hiệu «chưa khai» đổi số; Kế toán không thấy mục | T12 |
| `danh-muc-nhom-smoke.mjs` + `dot-a-smoke.mjs` | `docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/`, `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/` | thêm bước cảnh báo gán nhóm nếu kịch bản đủ chỗ; không thì thử tay và ghi | T13 chạm `web/catalog.ts` (bước `nhat-ky` của `dot-a-smoke` đỏ sẵn từ ADR-0038) |
| `dot-0-smoke.mjs`, `trang-chu-smoke.mjs`, `quyen-thieu-quan-tri-smoke.mjs` (bản chép) | `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/` | số mục / thứ tự thanh bên của Quản trị, Toàn quyền, Bán hàng tăng hai mục; tài khoản chỉ Toàn quyền thấy giống Quản trị + Toàn quyền; tài khoản chỉ Nhân sự không thấy hai mục | T11, T12 chạm `src/shared/muc-giao-dien.ts` — sửa số đếm trong kịch bản khi đổi có chủ ý |
| `doi-tac-lap-don-smoke.mjs`, `chip-nhom-smoke.mjs`, `danh-muc-lap-don-smoke.mjs` | `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/`, `docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/`, `docs/evidence/2026-09-27-danh-muc-lap-don/kich-ban/` | không có luật ⇒ giống hệt trước; thêm (nếu kịch bản đủ chỗ) một bước Đối tác bị luật không thấy dịch vụ / chip nhóm | T9 đổi dữ liệu form của Đối tác |
| `xac-nhan-smoke.mjs` + `a2-smoke-form.mjs` | `docs/evidence/2026-10-26-xac-nhan-don/kich-ban/`, `docs/evidence/2026-09-20-a2/kich-ban/` | câu `sales_blocked` hiện đúng chữ máy chủ ở form và nút Gửi đơn / Gửi xác nhận | T8 (và `src/shared/order-errors.ts` nếu chạm) |
| `help-smoke.mjs` (bản chép) | `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/` | đoạn Trợ giúp mới | T15 |

Kịch bản mới phải được chứng minh còn đỏ được bằng một sửa cố ý (P16), ghi `docs/SO-HANG-RAO.md` nếu dùng làm hàng rào (khuôn dòng `hoa-hong-smoke.mjs`).

---

## 9. Runbook phát hành — **chủ tự chạy** (khuôn `docs/HANDOFF-N1.md`)

> AI không chạy bước nào có `--remote`, `day-len`, `trien-khai`. Người thi công đưa nguyên lệnh; chủ chạy ở **thư mục gốc dự án** `tourdaobooking` (checkout gốc, không phải worktree), trong Terminal.

**0. Điều kiện trước** (chủ):
- KĐL-3 «đạt»; Q-6 đã trả lời (hoặc để đề xuất).
- Nếu ngày phát hành từ **06/11** trở đi: mục HC-5.19 đã diễn tập hoặc gia hạn (Q-5), không thì `npm test` đỏ và `trien-khai` dừng.
- Không trong «cửa sổ đóng băng» (`docs/HANDOFF-N1.md`, phần Hoàn tác).

**1. Số migration lúc gộp** (người thi công làm, báo chủ): lặp lại bước lấy số của T0 trên `main` mới nhất và mọi nhánh / worktree chưa gộp; M1, M2 đã bị dùng ⇒ đổi tên tệp sang hai số kế tiếp liền nhau, M1 trước M2 (bài tìm theo đuôi tên; sửa dòng số ở `docs/SYSTEM-DESIGN.md` §5). Số nhật ký thay đổi = mục đầu của `main` + 1.

**2. Đẩy và triển khai:**
```
npm run day-len -- claude/tinh-trang-ban-va-phu-thu
```
```
npm run trien-khai
```
(Có migration ⇒ `trien-khai` lấy điểm Time Travel **trước** khi áp — chép lại lệnh khôi phục nó in ra; e2e đủ bộ chạy trước; deploy ngay sau migration. Lỗi Cloudflare 7403: xem mục cùng tên ở `docs/QUY-TRINH-PHAT-HANH.md`.)

**3. Ngay sau deploy:**
```
node scripts/audit-invariants.mjs --db remote
```
Thoát 0 = sạch; 1 = vi phạm; **2 = không chạy được** (không phải sạch). `R-CTL-2`, `R-PRC-8` phải 0 (bảng mới rỗng). `R-CTL-1` (cảnh báo «dịch vụ chưa phân nhóm», có từ ADR-0058) giữ như trước — có thể khác 0 trên production, **không** phải lỗi của lần phát hành này.

**4. Kiểm nhanh trên Nền tảng** (chủ, tài khoản Toàn quyền): mục «Luật bán» và «Đặc điểm dịch vụ» hiện trong Thiết lập; danh sách luật rỗng; «Chưa khai» bằng số dịch vụ đang bán (chưa ai khai).

**5. Đường lùi:** `wrangler rollback` chỉ lùi Worker; bốn bảng mới ở lại (chỉ thêm, bản cũ không đọc) — vô hại; luật đã đặt **không** có tác dụng khi chạy bản cũ (bản cũ không có cổng). Không xoá bảng.

**6. Việc bắt buộc trước khi đặt luật đầu tiên** (ADR-0146 mục cùng tên; A Đ5 mục 5) — **chưa đặt luật nào trước khi xong**:
1. Chủ chạy lệnh đếm 1 **bản sửa** (R-9; chỉ đọc; đã thử cú pháp trên CSDL dựng từ migration, chưa chạy trên dữ liệu thật). Hai cột cuối nên bằng 0:
```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(*) AS tai_khoan_doi_tac, SUM(s.party_id IS NULL) AS chua_gan_ho_so, SUM(s.party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1 WHERE r.party_id = s.party_id)) AS ho_so_chua_mang_loai_duoc_huong FROM staff s WHERE s.active = 1 AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.permission_type_code = 'PARTNER' AND p.valid_to_at IS NULL)"
```
2. Chủ chạy lệnh đếm 2 nguyên văn từ `00-dau-vao/PHIEU-CHOT-TINH-TRANG-BAN-2026-10-30.md` mục C (loại đối tác hiện có, số hồ sơ mỗi loại; xem đã có «Lễ tân khách sạn», «Tài xế taxi» chưa).
3. Khác 0 ở bước 1 ⇒ Toàn quyền gắn hồ sơ cá nhân và loại (đang bật, được hưởng) cho từng tài khoản Đối tác ở Danh bạ (ADR-0117), **trên hồ sơ cá nhân**, không phải hồ sơ công ty (ADR-0146 «Điều chưa chắc»). Chạy lại bước 1 tới khi bằng 0. Tài khoản còn sót **không bị luật nào chặn**.
4. Thiếu loại cần chặn ⇒ thêm ở màn «Hoa hồng đối tác» → Loại đối tác (ADR-0117).
5. Trước luật **theo đặc điểm** đầu tiên: Quản trị tạo đặc điểm và giá trị ở màn «Đặc điểm dịch vụ» (không có gieo sẵn — A-C3); gắn giá trị cho mọi vé của nhóm sẽ dùng trong luật (theo nhóm hoặc từng vé); thẻ «Chưa khai» của đặc điểm đó bằng 0 cho nhóm đó. Nhóm không liên quan: gắn theo nhóm một giá trị như «Không áp dụng» (dữ liệu, không phải tính năng — A Đ5 mục 4).
6. Rồi mới đặt luật ở màn «Luật bán». Ca vàng CV-1…CV-8 của A là ví dụ nhập liệu.

**7. Ghi trạng thái:** người thi công cập nhật mục «TRẠNG THÁI TRIỂN KHAI» ở đầu `docs/HANDOFF-N1.md` theo kết quả chủ báo (số phiên bản, giờ, migration đã áp — kiểm bằng `npx wrangler d1 migrations list tourdao-sales-db --remote`, lệnh chỉ đọc, chủ chạy).

---

## 10. Điều chưa chắc / chưa kiểm

- **Nhánh khác trên máy chủ git** có migration số ≥ 0128 hay đang thi công ADR-0146: chưa kiểm (không `fetch`). T0 và runbook bước 1 kiểm lại.
- **`date()` trong `CHECK` trên D1 thật:** chạy được trên `node:sqlite`, chưa thử trên D1; e2e T14 bắt. Nếu D1 từ chối: bỏ vế `date()` khỏi CHECK, giữ bất biến ở route + trigger `BEFORE INSERT/UPDATE` (trigger cũng dùng `date(NEW.valid_from_date,'-1 day')` — cùng rủi ro; khi đó dừng, báo điều phối).
- **Số bài đỏ khi thêm hai ô:** chưa đo (ước 4–5 tệp). T5 đo, ghi sổ.
- **Màn gán nhóm hôm nay đã cảnh báo cờ «cần xác nhận» chưa:** chưa kiểm (T13).
- **`src/shared/order-errors.ts` hiện câu máy chủ cho mã 409 lạ:** chưa kiểm nhánh mặc định (T8).
- **Nhóm thanh bên của Bán hàng:** Bán hàng hôm nay có những mục THIẾT LẬP nào — chưa đếm; kịch bản `dot-0-smoke` / `trang-chu-smoke` báo số đúng sau khi chạy.
- **Tiêu chí 1 của A «hai dòng nhật ký»:** cách đếm (một dòng mỗi giá trị hay một dòng đặc điểm + một dòng giá trị) chưa chốt chữ — người thi công chọn cách khớp «hai dòng» với ví dụ hai giá trị và ghi sổ.
- **Dữ liệu thật** (vé nào gồm / không gồm vận chuyển cảng–đảo; tài khoản Đối tác chưa sẵn sàng): chưa kiểm — AI không đọc D1 thật (runbook bước 6).
- **ADR-0147 (phí đón)** chưa thi công: tiêu chí 12 của ADR-0146 kiểm theo R-7; kế hoạch ADR-0147 phải thêm ca.
- Dịch vụ nhập tay (không mã) không bị luật nào phủ — giữ như ADR-0146.
