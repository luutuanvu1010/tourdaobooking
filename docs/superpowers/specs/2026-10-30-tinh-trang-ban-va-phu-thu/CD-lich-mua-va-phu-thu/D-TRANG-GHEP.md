# Trang ghép — Lượt D: Phụ thu mùa vụ (đề xuất 30/10, bản sửa 2)

Trang ghép theo `CLAUDE.md` §9.
- Lượt D có năm điều chạm quyền/dữ liệu/tiền. Đề xuất tách hai lượt duyệt:
  - **D1** = Đ1, Đ2, Đ3: 3 điều, đúng trần;
  - **D2** = Đ4, Đ5: 2 điều.
- **Hai lượt bắt buộc phát hành cùng lúc.**
- Bảng dùng chung `order_item` **nhận thêm một loại dữ liệu mới** (dòng phụ thu).
- Trang này ghép **cả hai lượt**; dòng nào chỉ thuộc D2 ghi «(D2)».

Tên tệp, hàm, route đúng ở HEAD `a129d3d`. Tên của lượt B, C lấy từ bản 30/10 của chúng. Tên mới là **tên tạm**.

## 1. Bảng nào chứa loại thực thể nào

| Bảng | Chủ | Hôm nay chứa | Sau lượt D | Mới? |
|---|---|---|---|---|
| `prc_surcharge_rule` | `pricing` | — | **quy tắc phụ thu**: mùa × (dịch vụ \| nhóm) × phương pháp (`MOI_KHACH` / `MOI_DON_VI` / `PHAN_TRAM`) × hiệu lực; chỉ thêm. (D2) + đích loại đối tác (khoá ngoại `prc_beneficiary_role`) hoặc hồ sơ; phương pháp `MIEN` | **mới** |
| `order_item` | `orders` | **dòng tiền của dịch vụ** | + **dòng phụ thu** (`line_kind = PHU_THU`, `surcharge_rule_id`, `catalog_price` NULL, gắn `service_id` của dịch vụ được phụ thu, cùng `pax_code`). Sẽ nhận cả dòng phí đưa đón của ADR-0147 — **một** cột `line_kind` | **loại dữ liệu mới** |
| DTO đơn (`OrderServiceDto`), `StoredService`, `SubtotalServiceInput` | `orders` / `src/shared/contracts.ts` | `items` = mọi dòng của dịch vụ | `items` = **chỉ dòng dịch vụ**; trường mới `phuThu[]` = dòng phụ thu. Tách ở **một** chỗ: ba câu SQL đọc dòng của `repository.ts` | đổi hợp đồng (thêm trường; `items` hẹp lại) |
| `orders` | `orders` | tạm tính = Σ dòng | tạm tính **gồm** phụ thu (trigger không đổi) | không đổi cấu trúc |
| `order_money_adjustment` | `orders` | số khách hiện hành | không đổi; phụ thu tính lại từ đơn giá đã chụp | không đổi |
| `ord_service_terms` | `orders` | bản chụp hoa hồng / người bán theo dịch vụ | không đổi | không đổi |
| `bil_posting.gross_snapshot` | `billing` | Σ thành tiền **dịch vụ** lúc «Đã giao» | (D2/Đ5) Σ **dịch vụ + phụ thu** | **đổi nghĩa cột sổ** |
| `bil_debt_line` | `billing` | giữ hộ / nộp / hoàn / hoa hồng / giảm giá bên đặt / giá vốn | không loại mới; phụ thu đi vào giữ hộ, không vào hoa hồng / giá vốn | không đổi |
| `lm_season`, `lm_season_range` (lượt C1) | `lich-mua` | — | `pricing` đọc qua `v_lm_season_day_range` (cạnh `pricing → lich-mua`, duyệt ở C1) | của C1 |
| `prc_beneficiary_role`, `v_pty_open_role` | `pricing`, `parties` | loại đối tác cho hoa hồng / luật bán | (D2) đầu vào chọn quy tắc phụ thu theo bên đặt — mọi dòng, **bất kể** cờ «được hưởng» | không đổi |
| `audit_log` | `audit` | — | + `surcharge_rule_added`, `surcharge_rule_ended`; câu cảnh báo phụ thu trong nhật ký đổi ngày / (D2) đổi bên đặt | thêm hành động |

## 2. Dòng bản đồ quyền chạm các bảng này → áp cho loại nào

| Ô / luật | Giá trị | Hôm nay | Sau lượt D |
|---|---|---|---|
| `pricing.surcharge.write` (**mới**, thao tác) | ACCOUNTING, ADMIN, SUPER_ADMIN `any` | — | ghi / kết thúc quy tắc phụ thu; (D2) theo loại, hồ sơ, Miễn |
| `partner.commission.view` (`permissions.ts:161`) | SALES, ACCOUNTING, ADMIN, SUPER_ADMIN | xem mức hoa hồng | + đọc **danh sách quy tắc phụ thu** và «Thử tính» của màn quy tắc (**đổi nghĩa ô** — D-Q9) |
| `order.create` (`permissions.ts:92`) | SALES, ADMIN, PARTNER, SUPER_ADMIN, INTERN | lập đơn, danh mục lập đơn | + **xem trước phụ thu của chính đơn đang lập** (route mới). Chỉ trả dòng của đầu vào, không mã quy tắc, không danh sách. Đối tác bị ép bên đặt là chính mình (`benDatCuaToi`) |
| `order.modify` / lưu nháp | không đổi | — | lưu nháp **sinh** dòng phụ thu; **không ô nào cho phép đặt số phụ thu** |
| `order.submit`, `order.confirm.review`, `order.modify` (xác nhận) | không đổi | Gửi đơn / Còn vé / xác nhận | + cổng phụ thu 409 `surcharge_changed`; Còn vé kèm `ngayDi` xét theo ngày mới |
| `order.trip.edit` | không đổi | đổi ngày (`PUT …/trip`) | + cảnh báo phụ thu khi đơn đã xác nhận; không đổi tiền |
| `order.money.edit` (+ route HDV) | không đổi | sửa số khách | phụ thu tính lại theo đơn giá đã chụp — không thêm đường ghi, không thêm người |
| `holdsPartner` / `chiGiaDanhMuc` (R1, R2, R3) | không đổi | Đối tác, Thực tập: giá niêm yết, không nhập tay, trần giảm giá | R2 xét `items` (đã tách, **chỉ dòng dịch vụ**); dòng phụ thu có cổng riêng cho **mọi** tài khoản; R3 trần = hoa hồng không gồm phụ thu |
| `money.view`, `order.view` | không đổi | xem tiền đơn | dòng phụ thu hiện với cùng điều kiện xem tiền |
| `PUT …/booker` (D2) | không đổi | đổi bên đặt | đơn đã xác nhận: giữ phụ thu + cảnh báo |
| `payment.receive`, `ledger.*` | không đổi | thu, sổ | «Còn thu» tự gồm phụ thu |

## 3. Cổng nào canh cửa nào

| Cửa | Cổng (thứ tự) |
|---|---|
| `POST /api/orders`, `PUT /api/orders/:id` (nháp) | `validateOrder` → `priceGuard` (R1, R2 trên dòng `buildLines`, `orders/index.ts:284-290`) → `congBanDuoc` (luật bán, đóng bán — B) → biết bên đặt → **đọc quy tắc + mùa → sinh dòng phụ thu (một hàm)** → (D2) xung đột ⇒ 409 `surcharge_conflict` → R3 → ghi một lô |
| `POST /api/orders/xem-truoc-phu-thu` (mới, cổng `orders`) | `order.create` → kiểm dạng → bên đặt (Đối tác: ép là chính mình) → cùng hàm chọn + sinh dòng → trả dòng dự kiến; không ghi |
| `PUT /api/orders/:id/trip` | như hôm nay. Nháp: không đụng tiền (dòng có thể cũ — bắt ở cổng xác nhận). Đã xác nhận: + khối cảnh báo phụ thu + nhật ký |
| `kiemCongXacNhan` (`xac-nhan-chung.ts:83`) — `POST …/status`, `…/gui-don`, `…/quyet-dinh` không đổi ngày | `congBanDuoc` (B) → R2 trên `items` (đã tách) → **`kiemPhuThu` theo ngày đã lưu ⇒ 409 `surcharge_changed`** → người lớn → nhóm tắt đưa đón → chọn Đón → mốc → chụp hoa hồng (`tienChoHoaHong` trên `items`) → R3 |
| `POST …/quyet-dinh` **kèm `ngayDi`** (`xac-nhan-route.ts:263-316`) — thứ tự sửa theo R2-D1 | kiểm thân (ngày, giờ) → **`congBanDuoc` của B, cả hai ngày** (trước nhóm tắt và mốc, đúng B) → nhóm tắt (`:296`) → **`kiemPhuThu(order, ngayDi mới)` ⇒ 409, câu cho người xét duyệt** ([người soạn] đặt trước mốc, cùng lý do B) → mốc (`:304`) → `kiemCongXacNhan` (`:309`, không xét lại phụ thu theo ngày cũ) → lô xác nhận đổi ngày (`:313-316`) |
| `POST …/gui-xac-nhan` (không qua hàm chung, `xac-nhan-route.ts:100-134`) | `congBanDuoc` (B, chốt riêng) → **`kiemPhuThu` chốt riêng** → như hôm nay |
| `POST …/money-edit`, `…/handler-money-edit` | như hôm nay; tiền hiệu lực = dịch vụ (`items`) + phụ thu (`phuThu`, đơn giá đã chụp) — `money-adjustment.ts:186-199` |
| `PUT …/booker` (D2) | như hôm nay; đã xác nhận: giữ + cảnh báo |
| «Đã giao» (`billing/service.ts:539-`) (D2/Đ5) | `thuongMaiCuaDon` dùng `gross` = dịch vụ + phụ thu (`:334-339`, `:578`, `:587`); trigger 0112 (iii), (iv) giữ nguyên chữ |
| biên nhận (`receipt/rules.ts`) | danh sách trắng dòng (`:117`) — D1; chia phần: phụ thu → phần Tour Đảo, trước khi trừ giảm giá (`:45`) — D2/Đ5; cùng phép với `nhaCungCapCuaDon` (`billing/rules.ts:533`) |
| route quy tắc (mới, cổng `office`) | đọc: `partner.commission.view`; ghi / kết thúc: `pricing.surcharge.write` → hình dạng → không trùng ô → ghi + nhật ký |
| kiểm định kỳ (`npm run trien-khai` → `audit-invariants --db remote`) | `scripts/audit-checks.mjs:121-127` `COT_DICH_VU` chỉ dòng dịch vụ; `scripts/audit-thuong-mai.mjs:45-53`; kiểm mới cho dòng `PHU_THU` và (Đ5) `gross_snapshot` |

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa

- **Form lập đơn** (`web/order-form.ts`, `web/service-card.ts`, luật chung `src/shared/service-form.ts`):
  - thêm dòng «Phụ thu <mùa> (dự kiến)» dưới dịch vụ cho **mọi** người lập, kể cả Đối tác, Thực tập; số từ route xem trước;
  - «Tạm tính» tự cộng ở trình duyệt (`service-form.ts:290`) **đổi nghĩa**: ghi «chưa gồm phụ thu» cho tới khi có số máy chủ;
  - mở lại nháp: `draftFromDto` đọc `items` đã tách — **không** thấy dòng phụ thu (bài khẳng định).
- **Trang đơn `src/shared/order-view.ts:54-64` → `web/order-services.ts`**: dựng dòng và tạm tính từng dịch vụ từ `items`. Sau khi tách ở tầng đọc, phải cộng `phuThu` vào `lines` và `subtotal`, nếu không dòng phụ thu **biến khỏi trang đơn im lặng** (R2-D3).
- **Trang đơn, biên nhận, ảnh xác nhận** (`src/shared/order-confirmation.ts:201-208`, `web/confirmation-image.ts`, lệch 1.4):
  - dòng riêng «Phụ thu …» dưới dịch vụ;
  - tạm tính từng dịch vụ tách «dịch vụ / phụ thu»;
  - (D2/Đ5) phần Tour Đảo gồm phụ thu.
- **Bảng «Sửa số khách»**: xem trước tiền mới gồm phụ thu theo đơn giá đã chụp; HDV vẫn thấy ô sửa (đỏ trước: mất ô).
- **Khối «Hoa hồng / giá đại lý»**: ghi «không tính trên phụ thu».
- **Hộp Còn vé có ô đổi ngày** (người xét duyệt): khi máy chủ trả 409 `surcharge_changed`, hiện câu theo cửa, giữ hộp mở.
- **Màn «Quy tắc phụ thu»** (mới): menu khi `can(partner.commission.view)`; nút ghi khi `can(pricing.surcharge.write)`. Đối tác / Thực tập không có menu.
- **Cảnh báo sau đổi ngày / đổi bên đặt** (đơn đã xác nhận) cho người vừa đổi.
- Trợ giúp Đối tác (`src/shared/huong-dan-doi-tac.ts`): «phụ thu mùa do máy tính, không hưởng hoa hồng, xem số dự kiến trên form».

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, đọc 30/10)

- **Xây trên lỗ đang hở: TNV-G1** (đơn huỷ còn tiền, HIGH, hạn 30/11): dòng phụ thu vào tổng đơn và biên nhận. Mục chưa có `xay_tren_cho_phep` cho phụ thu.
- **Xây trên lỗ đang hở: TNV-G3** (sửa sai sau «Đã giao», HIGH, hạn 30/11): Đ5 đổi nghĩa `gross_snapshot` trên phiếu «Đã giao» — cùng phiếu lệnh Thay lần thu của lỗ xử lý. Không nới luật nào của lỗ, nhưng chạm cùng vùng.
- Hai mục trên: **không được duyệt** trước khi lỗ vá hoặc chủ ghi «cho xây» kèm lý do cho từng mã (D-Q8).
- **TNV-G4, HC-4.2**: không chạm. Muốn thu thêm / trả bớt phụ thu sau đổi ngày thì dùng điều chỉnh có người thứ hai duyệt sẵn có (ADR-0115).
- **HC-5.19** (diễn tập khôi phục): migration thêm bảng/cột, tạo lại trigger 0081 (chỉ siết). Đề nghị đặt điều kiện «phát hành sau diễn tập» vì Đ5 đổi nghĩa cột sổ (D-Q8).
- **HC-5.11**: không chạm (không Cron).

## 5. Các quyết định đụng nhau ở đâu

1. **D ↔ C.** D đọc «mùa thắng» bằng hàm của C. Quên xác nhận lịch ⇒ không phụ thu (có cảnh báo ở màn quy tắc, thẻ nhắc lịch). Cạnh `pricing → lich-mua` được duyệt ở C1 (tính vào trần của C1). D không phụ thuộc C2.
2. **D ↔ B** (thứ tự cổng):
   - `congBanDuoc` đứng trước cổng phụ thu ở **mọi** cửa, kể cả hai chỗ gọi thêm của B trước `tinhCanXacNhan` (`/status`, Gửi xác nhận).
   - Còn vé kèm `ngayDi`: B xét hai ngày cho đóng bán; D xét ngày mới cho phụ thu. Đơn bị đóng bán không bao giờ tới cổng phụ thu.
3. **D ↔ ADR-0147** (phí đưa đón):
   - cùng loại dòng mới trong `order_item`, cùng «không vào hoa hồng», cùng «phần Tour Đảo», cùng chụp lúc xác nhận;
   - **một** cột `line_kind`, **một** chỗ tách ở tầng đọc;
   - khác nhau: phí đón **thiếu mức** ⇒ giữ đơn (5.7); phụ thu **không quy tắc** ⇒ không phụ thu.
4. **D ↔ ADR-0148 Đ2/Đ3** (chưa thi công): giá gốc không đổi; người thi công 0148 đọc giá danh mục từ `items` đã tách.
5. **D ↔ sổ đại lý** (ADR-0079): hai số khác nhau, `PhanThuongMai` mang cả hai.
   - **thành tiền dịch vụ**: hoa hồng, giá đại lý, giá vốn, VUOT;
   - **tổng trước giảm của đơn**: `gross_snapshot`, giảm giá bên đặt chịu (Đ5).
6. **D1 ↔ D2.** D1 tạo bảng không có cột đích; D2 thêm bằng `ALTER TABLE ADD COLUMN`. D2 thêm bước «đối tượng» **bên trong** mùa thắng; định nghĩa «áp được» (Đ3.3) đã gồm vế đối tượng để mùa cao chỉ có quy tắc cho loại khác không chặn mùa thấp. **Phát hành cùng lúc** (P-4; Đ5 cần cho sổ đúng).
7. **D2 ↔ ADR-0146.** Cùng đọc loại đối tác của bên đặt, cùng khoá ngoại `prc_beneficiary_role`. 0146 dùng để **chặn** (ngoại lệ có tên); D2 dùng làm **đầu vào giá** (ADR-0001 mục 4). D2 không xét cờ «được hưởng»; 0146 Đ1 lại cấm tắt loại còn luật bán. Tắt «được hưởng» của một loại **không** làm mất miễn phụ thu [người soạn] — ghi để chủ biết.
8. **D ↔ A** (đặc điểm): không giao — D không dùng đặc điểm làm phạm vi.

## 6. Bài kiểm dự kiến phải thêm / sửa

- **Sổ vàng**: `golden/phu-thu-mua-vu.json` (từ `D-CA-VANG-DE-XUAT.md`, chủ xác nhận) + bài chạy riêng (khuôn `src/so-vang-so-dai-ly.test.ts`). Ca PT-04b, PT-16 chạy qua `billing/rules.ts`.
- **Hàng rào** — chỉ **siết**, không nới:
  - `src/hoa-hong-mot-nguon.test.ts`: thêm `phuThuMoiDonVi` (hàm mới trong tệp `NGUON`) vào `GOI_HAM`, chỉ `src/shared/phu-thu.ts` được gọi; `PHAN_VAN_DA_RA` **không** đổi.
  - Quét mới:
    - chỉ một tệp chèn dòng `PHU_THU`;
    - mọi câu SQL đọc `order_item` ngoài ba chỗ của `repository.ts` + `scripts/audit-checks.mjs` phải lọc `line_kind`.
- **Bài đỏ trước** (theo tiêu chí D):
  - R2 + Gửi đơn Đối tác (tiêu chí 3);
  - sửa số khách bị từ chối (10a);
  - `draftFromDto` hạ đơn giá (10b);
  - Còn vé kèm `ngayDi` (7);
  - kiểm định kỳ báo giả (17);
  - `gross_snapshot` (24).
- **Quyền**: `src/shared/permissions.test.ts` (thao tác mới), `src/permission-enforcement.test.ts`, `src/route-access.test.ts`, `src/route-write-guard.test.ts`, `src/shared/tro-ly-cau-truc.test.ts`.
- **e2e**:
  - Đối tác Gửi đơn có phụ thu;
  - Đối tác xem trước;
  - đổi ngày nháp / đã xác nhận;
  - Còn vé kèm `ngayDi`;
  - quyền ghi quy tắc;
  - (D2) miễn theo loại.

  Dùng loại / mùa / quy tắc do bài tự tạo rồi kết thúc (CSDL D1 cục bộ dùng chung, bảng chỉ thêm).
- **Kiểm định kỳ** `scripts/audit-checks.mjs`, `scripts/audit-thuong-mai.mjs` (kể cả `:177` giảm giá hiệu lực cộng phụ thu) + `src/audit-invariants.test.ts`: ca phụ thu.
- **Bài quét SQL** (D-Đ2.12): danh sách cho phép theo tên hằng (`ITEM_SELECT`, câu `getServicesForSubtotal`, `COT_DICH_VU` phải chọn `line_kind`; hai câu `SUM(line_total)` của `audit-checks.mjs:655-664` được phép không lọc); bài đơn vị cho `groupItems`, `getStoredServices`, `buildSubtotalServices`; giới hạn ghi rõ; quan sát chặn thật một lần.
- Mỗi hàng rào mới: quan sát chặn thật một lần, ghi `docs/SO-HANG-RAO.md` (P16).
