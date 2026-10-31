# Trang ghép — Lượt B «Đóng bán» (30/10/2026)

> Theo `CLAUDE.md` §9 «Bước ghép khi duyệt»: lượt này có 7 điều (Đ1–Đ7), trong đó 3 điều chạm quyền/dữ liệu theo cách đếm của người soạn, 4 theo tiền lệ ADR-0146 (mục 0); một bảng mới của `catalog` nhận một loại dữ liệu mới.
> Đọc cùng `DE-XUAT-ADR.md` cùng thư mục. Tên tệp, route, hàm, dòng đúng tại HEAD `a129d3d` (worktree `tinh-trang-ban`, trùng `main` trong máy ngày 30/10).
> Người kiểm độc lập (chỉ đọc) đã soát bản đầu ngày 30/10 (`../KIEM-A-B/BAO-CAO.md`, mục B-…). Bản này đã sửa theo B-1 … B-9; vòng 2 ĐẠT, đã sửa thêm R2B-1 … R2B-4; phần sửa vòng 2 chưa được soát lại.

## 0. Đếm và chia lượt

- Đếm theo **điều**, như trang ghép 25/10 và 28/10. Điều chỉ về hiển thị, luật tính thuần, hàng rào thì không tính.
- **Chắc chắn chạm quyền/dữ liệu: Đ1 (bảng), Đ3 (cổng ở đường ghi đơn), Đ5 (hai ô quyền) = 3.** Chạm tiền: 0.
- **Đ4 (danh mục hiện mờ kèm lý do): tuỳ câu C6.** Người soạn không tính (ai thấy dịch vụ nào không đổi, cùng DTO cho văn phòng và Đối tác). Nhưng **tiền lệ ADR-0146 có tính** Đ4 «Danh mục cho form» («Bốn điều chạm quyền / dữ liệu: Đ1, Đ3, Đ4 và Đ5»), và Đ4 ở đây đưa lý do chữ tự do ra Đối tác, Thực tập. Theo tiền lệ thì lượt này **4 điều — vượt trần**.
- **Nếu tính 4 — phương án tách (khuyến nghị ở C6):** *B-lõi* = Đ1, Đ3, Đ5 (kèm Đ2, Đ7 không tính) — 3 điều; *B-hiển thị* = Đ4 (kèm Đ6 không tính) — 1 điều, duyệt ngay sau, phát hành **cùng** B-lõi. Phương án khác: xin phép vượt trần một lần như ADR-0146 (25/10, 28/10).
- Đ6 cũng thành một điều nếu chủ chọn gõ cửa màn hình khoá (câu C3, phải ghi nhật ký theo đơn và dựng lại view).
- **Không gộp** với Lượt A (sửa ADR-0146: đặc điểm dịch vụ, 3 điều) hay Lượt C, D. Lượt B không phụ thuộc Lượt A để duyệt hay thi công; nếu ADR-0146 thi công trước thì hàm cổng chung có sẵn bước luật bán, nếu sau thì thêm vào.

## 1. Bảng bị chạm chứa những loại thực thể nào

| Bảng | Chủ | Hôm nay | Sau lượt này |
|---|---|---|---|
| `ctl_sale_suspension` (mới, tên tạm) | catalog | — | **lần đóng bán**: phạm vi (`CHECK`: `SERVICE` mã dịch vụ / `GROUP` mã nhóm) × khoảng ngày đi (trống = mọi ngày) × khoảng hiệu lực theo thời điểm (trống cuối = tới khi mở lại) × lý do bắt buộc × người/lúc đóng × người/lúc mở lại. Chỉ có nghĩa «chặn»; chỉ thêm; mở lại một lần — được mở lần đóng chưa bắt đầu (thành lần đóng rỗng), **không** mở được lần đóng đã quá kết thúc dự kiến (409); không chèn được dòng «sinh ra đã mở lại» (trigger `BEFORE INSERT`) |
| `catalog_item` | catalog (đồng bộ Sheet ghi) | dịch vụ | không đổi; trigger của bảng mới đọc để kiểm mã (cùng phân hệ) |
| `ctl_group`, `ctl_service_group` | catalog | nhóm, nhóm hiện hành của dịch vụ | không đổi; làm khoá cho lần đóng theo nhóm (nhóm **hiện hành** lúc thao tác) |
| `catalog_override` | catalog | ghi đè giá + cờ **ẩn** (một dòng mỗi mã, xoá cứng được) | **không đổi** — cờ ẩn giữ nguyên nghĩa, khác hẳn đóng bán |
| `ord_service_confirm_flag` | orders | cờ «cần xác nhận» theo dịch vụ/nhóm (ADR-0136) | không đổi; đóng bán xét **trước** nó |
| `order_service` | orders | dòng dịch vụ, `depart_date` theo dòng | không đổi cột; cổng đọc mã + ngày đi để xét |
| `ord_confirm_request` | orders | yêu cầu xác nhận | không đổi; Còn vé có thêm một cổng (đơn chờ trúng đóng bán chỉ còn Hết vé / Huỷ) |
| `prc_sales_block` (ADR-0146, chưa có) | pricing | — | không chạm; hàm cổng chung gọi luật bán **trước** đóng bán |
| `audit_log` | audit | — | thêm 2 hành động `catalog_sale_suspended`, `catalog_sale_resumed` (không gắn đơn; không chép lý do) |
| `ntf_read_mark` | thongbao | mốc đã đọc mỗi người | không đổi; tin «Tạm ngừng bán» là hình chiếu dùng chung mốc này |

## 2. Dòng bản đồ quyền chạm các bảng này → áp cho loại nào

| Ô / luật | Giá trị | Hôm nay | Sau lượt này |
|---|---|---|---|
| `catalog.sale.suspend` (mới, tên tạm) | SALES, ADMIN, SUPER_ADMIN `any`; còn lại `none` | — | thêm lần đóng (mọi phạm vi) |
| `catalog.sale.resume` (mới, tên tạm) | ADMIN, SUPER_ADMIN `any`; còn lại `none` | — | mở lại một lần đóng (B2) |
| đọc danh sách lần đóng đầy đủ (kèm người đóng/mở) | giữ một trong hai ô trên | — | trang «Tình trạng bán» (cổng `office`) |
| `order.create` + `money.view` | không đổi | danh mục lập đơn | + DTO có trường `tamNgung` (khoảng, lý do, kết thúc; không tên người đóng) cho **mọi** người lập đơn, kể cả Đối tác, Thực tập |
| `admin.manage` | không đổi (ADMIN, SUPER_ADMIN) | cờ ẩn, ghi đè giá, nhóm, gán nhóm, đưa đón | không dùng cho đóng bán. Gán nhóm **đổi kết quả** của lần đóng theo nhóm → màn gán nhóm cảnh báo (chấp nhận, như ADR-0146 Đ3) |
| `settings.ops` | không đổi (Toàn quyền) | cờ cần xác nhận | không dùng cho đóng bán |
| `order.modify`, `order.trip.edit`, `order.submit`, `order.confirm.review` | không đổi | các cửa ghi đơn | + mỗi cửa có cổng `sale_suspended` 409; không đổi ai được bấm |
| hộp thông báo (`locHopThongBao`) | không đổi luật nhận | tin từ nhật ký đơn | + tin «Tạm ngừng bán» chỉ cho **người lập** của nháp / đơn chờ chứa dịch vụ trúng — đúng người đã xem được đơn đó (ADR-0135) |
| `OFFICE_GATE` | SALES, ACCOUNTING, ADMIN, SUPER_ADMIN | — | ba route đóng/mở/đọc đặt sau cổng này (Bán hàng không qua cổng `admin`); Kế toán qua cổng nhưng `can()` trả 403 |

Không thêm mã quyền. Vai/loại hồ sơ **không** là đầu vào của đóng bán (khác ADR-0146).

## 3. Cổng nào canh cửa nào

Thứ tự trong **hàm cổng chung** (`orders`, tên tạm `congBanDuoc`): luật bán ADR-0146 (khi đã thi công) → **đóng bán**. Cờ ẩn xét sớm hơn ở `validateOrder` (dòng thêm mới và dòng đã lưu đổi số khách); «cần xác nhận» xét **sau**. Hàm chung được gọi ở **8 cửa** (hợp 7 cửa của ADR-0146 Đ3 với cửa sửa chuyến); cột «Bước» ghi bước nào của hàm chạy ở cửa đó.

| Cửa | Bước (luật bán / đóng bán) | Cổng (thứ tự, phần liên quan) | Ngày đi xét đóng bán |
|---|---|---|---|
| `POST /api/orders` | có / có | `order.create` → `validateOrder` (**ẩn**: 400 `catalog_unavailable`) → luật giá → **hàm cổng chung** → … → ghi | ngày trong thân |
| `PUT /api/orders/:id` (nháp) | có / có | 404 nháp người khác → khoá khi chờ → `order.modify` → `validateOrder` (ẩn: dòng mới, dòng đổi số khách) → luật giá → **hàm cổng chung (mọi dòng có mã)** → ghi | ngày trong thân |
| `PUT /api/orders/:id/trip` (nháp và đã xác nhận) | **không** / có | … → `order.trip.edit` → `validateTripUpdate` → **hàm cổng chung, chỉ dòng đổi ngày** → chốt nhóm tắt đưa đón (sửa chặng) → mốc (đã xác nhận) → ghi | ngày **mới** |
| `PUT /api/orders/:id/booker` (nháp và đã xác nhận) | có / **không** | `order.trip.edit` → K1 (`chanBenDatDoiTac`) → **hàm cổng chung, chỉ bước luật bán, với bên đặt mới** (ADR-0146 Đ3) → ghi | — |
| `POST /api/orders/:id/status` → `confirmed` | có / có | `order.modify` → `partner_submit_required` → **hàm cổng chung** → `tinhCanXacNhan` (`confirm_request_required`) → `kiemCongXacNhan` [có lại hàm cổng chung ở đầu, theo ADR-0146; lặp lại, vô hại] → lô xác nhận | ngày đã lưu |
| `POST …/gui-xac-nhan` (không qua `kiemCongXacNhan`) | có / có | … → `partner_submit_required` → đơn nháp, chưa yêu cầu mở → mốc phải có → **hàm cổng chung** → `tinhCanXacNhan` → chốt nhóm tắt → chọn đón → khoản thu → mở yêu cầu | ngày đã lưu |
| `POST …/gui-don` | có / có | `order.submit` → … → `kiemCongXacNhan` (**hàm cổng chung ở đầu**) → phân nhánh A/B. Dính chặn ⇒ ở lại nháp | ngày đã lưu |
| `POST …/quyet-dinh` `CON_VE` | có / có | `order.confirm.review` → `duocQuyetDinh` → khoá lạc quan → kiểm thân `ngayDi`/`gioDon` → **hàm cổng chung** (trúng ⇒ 409, chỉ còn Hết vé / Huỷ — B4) → chốt nhóm tắt → mốc → `kiemCongXacNhan` (hàm chung ở đầu, ngày đã lưu; lặp lại, vô hại) → lô | ngày đã lưu; có `ngayDi` thì xét **thêm** ngày mới (không đổi ngày vào khoảng đóng được) |
| `POST …/quyet-dinh` `HET_VE` / `HUY` | không / không | không cổng (đây là lối ra duy nhất của đơn chờ trúng đóng bán) | — |
| `POST …/money-edit`, `…/thuong-mai/:serviceId`, `…/legs*`, `…/passengers`, `…/rut-xac-nhan`, `…/chup-bu`, huỷ | không / không | không thêm dịch vụ, không đổi ngày đi, không đổi bên đặt | — |
| `GET /api/catalog`, `GET /api/catalog/for-order` | — | ô sẵn có → **không lọc** dịch vụ đang đóng; thêm `tamNgung` | — |
| `GET /api/orders/cho-xac-nhan` | — | `order.confirm.review` → thêm cờ «có dịch vụ đang tạm ngừng» mỗi đơn | ngày đã lưu |
| Đọc / đóng / mở lại lần đóng (route mới của `catalog`) | — | cổng `office` → `can(catalog.sale.suspend)` hoặc `can(catalog.sale.resume)` dòng đầu → kiểm thân (lý do, mã, nhóm đang bật, khoảng ngày, «chỉ hôm nay» không trượt ngày) → một lô (câu ghi + nhật ký) | — |
| `PUT /api/catalog/group-assignments` | — | `admin.manage` như hôm nay; **không** thêm cổng; màn gán nhóm cảnh báo khi nhóm cũ/mới có lần đóng | — |
| Hộp thông báo (`thongbao`) | — | ô hiện có của route → gọi hàm hình chiếu của `orders` (chỉ đơn của chính người hỏi) → `orders` gọi `catalog` | ngày đã lưu |
| Cạnh phụ thuộc | — | **không đổi**: `catalog: ["audit"]`; `orders` → `catalog` có sẵn; `thongbao` → `orders` có sẵn | — |

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa

- **Thẻ dịch vụ trong form lập đơn** (`web/order-form.ts`, bộ chọn `web/catalog-picker.ts`): thêm trạng thái **mờ, không chọn được** theo ngày đi đang chọn, nhãn «Tạm ngừng bán…». Hôm nay một dịch vụ hiện trong danh mục nghĩa là «chọn được»; sau lượt này **không còn đúng** — hiện ≠ đặt được. Mọi chỗ khác dùng `GET /api/catalog` để suy «đang bán» phải đọc thêm `tamNgung` (người thi công rà).
- **Trạng thái danh mục của dòng trên đơn nháp/chờ** (`catalogStatusOf` → `CatalogStatus`): thêm giá trị «tạm ngừng bán»; trang đơn (`web/order.ts`) hiện nhãn đỏ trên đúng dịch vụ.
- **Nút «Còn vé»** trên trang đơn chờ và danh sách chờ (`web/cho-xac-nhan.ts`): mờ kèm lý do khi đơn có dịch vụ đang đóng ở ngày đã lưu; chỉ còn Hết vé và Huỷ (B4; máy chủ vẫn 409, kể cả khi người xét duyệt đổi ngày).
- **Nút «Lưu», «Gửi xác nhận», «Gửi đơn», «Xác nhận đơn»**: không ẩn; bấm thì nhận câu `sale_suspended` (để người dùng biết vì sao và làm gì).
- **Menu văn phòng**: mục mới «Tình trạng bán» hiện khi giữ `catalog.sale.suspend` hoặc `catalog.sale.resume` (Bán hàng, Quản trị, Toàn quyền). Trên trang: nút **Mở lại** chỉ hiện với ô `catalog.sale.resume`.
- **Màn `/catalog`** (Quản trị, Toàn quyền): khối «Tình trạng bán» của dịch vụ; **màn gán nhóm**: cảnh báo khi nhóm có lần đóng.
- **Hộp thông báo** (giao diện hộp thư): loại tin mới «Tạm ngừng bán», mở thẳng trang đơn.
- **Trang chủ** Bán hàng, Quản trị: một dòng «N dịch vụ đang tạm ngừng bán».
- **Trợ giúp** Bán hàng, Quản trị, Toàn quyền, và Trợ giúp Đối tác (`src/shared/huong-dan-doi-tac.ts`): một đoạn «Dịch vụ mờ, ghi Tạm ngừng bán nghĩa là gì».

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, kiểm 30/10)

- **TNV-G1, TNV-G3, TNV-G4, HC-4.2:** không chạm (không tiền, không sổ). Hết vé trên đơn chờ là đường huỷ có sẵn; đơn chờ không có khoản thu (`chanKhoanThu`, `xac-nhan-route.ts:123,154`).
- **HC-5.11** (tác vụ tự động không định danh — Cron đồng bộ danh mục): **không** thêm Cron; «sau X giờ» là phép so với giờ request.
- **HC-5.19** (chưa diễn tập khôi phục): migration chỉ thêm bảng; hạn giữ nguyên.
- Kết luận: **không xây trên lỗ đang hở.**

## 5. Các quyết định đụng nhau ở đâu

1. **Với ADR-0146 (luật bán, chưa thi công) và Lượt A (sửa ADR-0146):**
   - Cùng một hàm cổng chung ở **8 cửa** (hợp 7 cửa ADR-0146 Đ3 với cửa sửa chuyến): `booker` chỉ chạy bước luật bán; `PUT …/trip` chỉ chạy bước đóng bán; 6 cửa còn lại chạy cả hai. Luật bán trước, đóng bán sau. Một đơn dính cả hai: trả `sales_blocked`.
   - Danh mục: luật bán **bỏ** dịch vụ khỏi danh mục của Đối tác bị chặn; đóng bán **làm mờ** cho mọi người. Dịch vụ dính cả hai: vắng (luật bán thắng).
   - ADR-0146 không canh `PUT …/trip` và Còn vé-đổi-ngày vì luật bán không phụ thuộc ngày; đóng bán canh hai cửa này. Hàm chung nhận ngày đi theo quy ước của Đ3 (a): ở cửa lưu/sửa (lập đơn, lưu nháp, sửa chuyến) là ngày **sau khi áp lệnh**; ở cửa gửi và xác nhận (`/status`, Gửi xác nhận, Gửi đơn) là ngày **đã lưu**; ở Còn vé có thân `ngayDi` là **cả** ngày đã lưu lẫn ngày mới (trúng một trong hai là 409). Nhờ vậy một hàm phục vụ cả luật bán (không phụ thuộc ngày) lẫn đóng bán.
   - Chỗ gọi thêm trước `tinhCanXacNhan` ở `/status` và Gửi xác nhận (câu C5) cũng áp cho luật bán — phải ghi vào kế hoạch thi công ADR-0146 để không đặt hai chỗ.
   - Lượt A thêm phạm vi theo **đặc điểm**; đóng bán lượt này chỉ có dịch vụ, nhóm (câu C2). Nếu sau này thêm, tập phạm vi đổi bằng ADR.
2. **Với ADR-0136 (bước xác nhận):** đóng bán xét **trước** «cần xác nhận». Đơn chờ bị khoá sửa sẵn; đơn chờ trúng đóng bán ở ngày đã lưu thì người xét duyệt chỉ còn **Hết vé** hoặc **Huỷ** (B4 đã chốt); Còn vé kèm đổi ngày cũng 409, và Còn vé không được đổi ngày **vào** khoảng đang đóng. Người lập muốn giữ đơn thì Rút lại, sửa nháp, gửi lại. Gửi xác nhận không qua `kiemCongXacNhan` nên có chốt riêng (bài hàng rào canh).
3. **Với ADR-0118 / ADR-0149 (đưa đón theo nhóm/dịch vụ):** cổng đóng bán đứng **trước** chốt nhóm tắt đưa đón ở mọi cửa xác nhận và ở Còn vé — dịch vụ đã không bán được thì việc bỏ lượt đón hay đặt gấp không còn nghĩa.
4. **Với cờ ẩn (`catalog_override.hidden`):** ẩn = ngừng kinh doanh hẳn, chặn dòng thêm mới và dòng đã lưu đổi số khách, nháp giữ nguyên dòng đã lưu vẫn đi tiếp, không lý do, không thời hạn, chỉ Quản trị. Đóng bán = tạm thời, có lý do, có thời hạn, chặn cả nháp đã có. Một dịch vụ vừa ẩn vừa đóng: không hiện trong danh mục (ẩn lọc trước); nháp cũ chứa nó vẫn bị đóng bán chặn. Hai cơ chế **không** gộp trong lượt này.
5. **Với gán nhóm (ADR-0058):** lần đóng theo nhóm đi theo nhóm hiện hành. Cùng một thao tác gán nhóm nay đổi kết quả của ba thứ: luật bán theo nhóm, cờ cần xác nhận theo nhóm, lần đóng theo nhóm → một cảnh báo chung trên màn gán nhóm.
6. **Với Lượt C (lịch mùa, khả dụng theo mùa/thứ/đặt trước):** Lượt C sẽ thêm điều kiện «chặn bán» theo mùa. Đề xuất Lượt C dùng **cùng** hàm cổng chung và **cùng** bộ câu báo (thêm một bước sau đóng bán), không mở cổng thứ ba. Chưa đối chiếu với bản nháp Lượt C (đang soạn cùng lúc).
7. **Với thông báo (ADR-0034, ADR-0135):** tin «Tạm ngừng bán» là hình chiếu; người nhận = người lập của nháp riêng tư / đơn chờ — không mở thêm người nhận.

## 6. Bài kiểm dự kiến phải sửa / thêm (chưa đo số bài đỏ)

**Sửa vì thêm hai ô quyền và ba route** (danh sách tệp theo tiền lệ trang ghép 25/10 mục 6; số bài đỏ **chưa đo** cho ô này):
- `src/shared/permissions.test.ts` (bảng khớp từng ô; bài ghim hàng DRIVER / DRIVER_PARTNER / HR);
- `src/shared/tro-ly-cau-truc.test.ts` + `src/shared/tro-ly-cau-truc-ten.ts` (tên thao tác cho trợ lý);
- `src/permission-enforcement.test.ts` (mỗi ô phải có `can(…, "<ô>")` nguyên văn trong `src/modules`);
- `src/route-access.test.ts`, `src/route-write-guard.test.ts` (ảnh chụp route);
- `src/shared/audit-actions.ts` và bài nhãn nhật ký nếu có;
- `src/shared/sw-policy.ts` `PAGES` và script `build:web` cho trang mới.

**Không dự kiến đỏ** (bảng rỗng thì không gì bị chặn): các bài route lập/gửi/xác nhận đơn hiện có. Chưa chạy để xác nhận.

**Bài mới:**
- luật thuần `src/shared/dong-ban.test.ts` (bảng ca Đ2.1);
- bài migration: trigger (Đ1 tiêu chí 1–3), bài lược đồ (Đ1.4);
- bài route `catalog` đóng/mở (Đ5);
- bài route `orders` cho các cửa ở mục 3 (8 cửa; đóng bán ở 7), dùng `mock.timers` cho «sau X giờ» và ca biên mở lại (Đ1 tiêu chí 1b, 1c; Đ3 tiêu chí 1–14, 9b);
- hàng rào văn bản thứ tự cổng (Đ3 tiêu chí 15), mở rộng bài (A) của `src/orders-khong-doc-nhom-truc-tiep.test.ts`;
- bài so khớp form ↔ máy chủ (Đ4.2);
- bài hình chiếu thông báo (Đ6) — luật thuần ở `src/shared/thong-bao.ts` có bài cạnh tệp;
- e2e mới (dịch vụ/nhóm do bài chọn, mở lại mọi lần đóng bài tạo); kịch bản Chrome form lập đơn và trang đơn chờ.
- Bài R-N1-12 và bài «vai không là điều kiện cho phép» **không đổi**: đóng bán không đọc vai.

**Sổ hàng rào:** mỗi hàng rào mới ghi `docs/SO-HANG-RAO.md` sau khi quan sát chặn thật một lần.

## 7. Việc khi chép sang `docs/adr/` (sau khi chủ duyệt)

- Lấy số ADR trống kế tiếp lúc chép (kiểm mọi nhánh/worktree chưa gộp, như ADR-0146 làm 28/10).
- Chép kèm câu trả lời C1–C6; câu nào chủ không nói riêng thì ghi là duyệt theo khuyến nghị **theo cách ghi của người chép**, không phải lời chủ.
- Đề xuất dòng thêm vào `src/CLAUDE.md` sau khi chủ duyệt (N9: AI không tự sửa): «Đóng bán (ADR-…): bảng `ctl_sale_suspension` của `catalog`, chỉ thêm, mở lại một lần; `orders` xét qua hàm công bố của `catalog` trong **một** hàm cổng chung với luật bán ADR-0146, gọi ở mọi cửa thêm dịch vụ / đổi ngày đi / gửi / xác nhận; giờ đọc một lần mỗi request.»
- Cập nhật `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/data-dictionary.json` trong commit thi công.
