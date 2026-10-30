# Trang ghép — Lượt A: luật bán theo loại đối tác là khả năng chung (dịch vụ / nhóm / đặc điểm) + «Đặc điểm dịch vụ» là dữ liệu (sửa ADR-0146), 30/10/2026

> Theo `CLAUDE.md` §9 «Bước ghép khi duyệt»: lượt này có ba quyết định chạm quyền / dữ liệu (Đ1, Đ2, Đ3 của `DE-XUAT-ADR.md`), **và** bảng `prc_sales_block` (đã duyệt ở ADR-0146, chưa xây) nhận thêm một loại dữ liệu mới (luật theo đặc điểm).
> Trạng thái: chủ **duyệt về nội dung** 30/10 (lượt 4, `../00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-4-LUAT-BAN-CHUNG.md`). Bản này viết lại phần trình bày theo khả năng chung; không đổi bảng, trigger, quyền, cổng hay số đếm so với bản đã qua người kiểm vòng 2.
> Khả năng chung: «loại đối tác `L` không được đặt [một dịch vụ | một nhóm | dịch vụ mang đặc điểm `X = x`, kèm nhóm tuỳ chọn] trong [hiệu lực]», chỉ có quy tắc «không cho phép» (L4-1), theo loại đối tác (L4-3). Ví dụ cụ thể ở mục «Ca vàng» của `DE-XUAT-ADR.md`.
> Thứ tự đọc: `DE-XUAT-ADR.md` (mục «Tóm tắt cho chủ», «Chỗ dễ nhầm») → trang này → ADR-0146 (`docs/adr/ADR-0146-chinh-sach-ban-theo-loai-doi-tac.md`).
> Tên tệp, route, hàm, dòng: đúng tại HEAD `a129d3d` (cùng `main`). Tên mới (bảng, view, ô, mã lỗi) là tên tạm.

## 0. Đếm và chia lượt

| Điều | Chạm | Tính vào trần 3? |
|---|---|---|
| Đ1 — ba bảng `ctl_attribute*` + hai view công bố | dữ liệu | có |
| Đ2 — `prc_sales_block` thêm phạm vi `ATTRIBUTE` (hai cột đặc điểm, `CHECK` kiểu phạm vi ở CSDL, trigger), cách xét mới | dữ liệu, luật | có |
| Đ3 — ô mới `catalog.attribute.assign`; route ở cổng văn phòng | quyền | có |
| Đ4 — cửa đổi kết quả luật: cảnh báo + nhật ký, cổng giữ nguyên | không bảng / cột / ô | không |
| Đ5 — danh sách chưa khai | chỉ đọc | không |
| Đ6 — hàng rào | chỉ siết | không |
| Lệch có chủ ý, hẹp, điều 5.2 Hiến chương (A-C4) | không thêm dữ liệu ngoài Đ1 | không — **mục chủ duyệt thêm** (Điều 6.1), **đã duyệt 30/10** |

**3 / 3 — đúng trần, không cần tách.** Đếm theo **điều**, như trang ghép 24/10 và 25/10. Bốn điều của ADR-0146 gốc đã duyệt 28/10 (kèm phép vượt trần), không duyệt lại ở lượt này. Ngoài 3 quyết định, chủ duyệt thêm **một mục**: lệch có chủ ý điều 5.2 — đã duyệt (A-C4). Khoá ngoại sửa theo báo cáo kiểm A-1 bằng trigger, không nới hàng rào, nên không thêm mục. Chủ chọn A-C2 = (a), nên không có trường hợp vượt trần.

**Không gộp** với Lượt B (Đóng bán) hay C, D: hai người soạn khác đang viết riêng; chỗ đụng nhau ghi ở mục 5.

## 1. Bảng bị chạm chứa những loại thực thể nào

| Bảng / view | Chủ | Hôm nay | Sau lượt này |
|---|---|---|---|
| `ctl_attribute` (mới) | catalog | — | **đặc điểm** dịch vụ (tên, thứ tự, đang dùng / tắt). Chỉ dữ liệu do Quản trị nhập; mã không biết tên nào |
| `ctl_attribute_value` (mới) | catalog | — | **lựa chọn** của một đặc điểm (tên, thứ tự, đang dùng / tắt). Khoá chính `code` duy nhất toàn bảng; mọi khoá ngoại tới bảng này là **một cột** (bài `src/architecture.test.ts:334–353`) |
| `ctl_attribute_assignment` (mới) | catalog | — | **giá trị gắn cho một dịch vụ HOẶC một nhóm** — hai loại thực thể đích trong cùng bảng, phân biệt bằng cột nào khác NULL (đúng một). Chỉ thêm, dòng mở = hiệu lực, tối đa một dòng mở mỗi (đích, đặc điểm). «Giá trị thuộc đúng đặc điểm» canh bằng trigger cùng module |
| `v_ctl_service_attribute` (view mới) | catalog | — | giá trị **hiệu lực** mỗi dịch vụ × đặc điểm: riêng thắng chung; chỉ khoá + nguồn (`SERVICE` / `GROUP`) |
| `v_ctl_attribute_value` (view mới) | catalog | — | khoá giá trị + cờ đang dùng, cho trigger và route của `pricing` |
| `prc_sales_block` (đã duyệt, chưa có) | pricing | — (ADR-0146: loại × nhóm hoặc dịch vụ) | + loại × **(đặc điểm = giá trị) [× nhóm tuỳ chọn]**. Kiểu phạm vi `CHECK` ở CSDL (thống nhất với Lượt B). «Giá trị thuộc đúng đặc điểm, đang dùng» canh bằng trigger đọc `v_ctl_attribute_value`. Vẫn chỉ có dòng chặn, chỉ thêm, không «mọi dịch vụ» |
| `ctl_group` | catalog | nhóm, cờ đưa đón (0121) | **không đổi cột**; nay còn là **đích** của dòng gắn đặc điểm |
| `ctl_service_group` / `v_ctl_service_group` | catalog | lịch sử gán nhóm / nhóm hiện hành | không đổi; nay quyết định giá trị thừa hưởng và vế «nhóm» của luật `ATTRIBUTE` |
| `catalog_item` | catalog (đồng bộ Sheet ghi) | dịch vụ | **không đổi**; đồng bộ không đụng bảng `ctl_*` (`catalog/repository.ts:112–132`) |
| `ctl_service_transfer_rule`, `v_ctl_service_transfer` | catalog | đưa đón khách sạn ↔ cảng (ADR-0118, ADR-0149) | **không đọc, không sửa** — đặc điểm dịch vụ (ví dụ ca vàng «vận chuyển cảng–đảo») khác nghĩa đưa đón (Đ-1) |
| `prc_beneficiary_role` | pricing | loại được hưởng | không đổi (bất biến «loại còn luật thì không tắt được» của ADR-0146 Đ1 phủ cả luật theo đặc điểm) |
| `audit_log` | audit | — | + hành động: tạo / sửa / tắt đặc điểm; tạo / sửa / tắt giá trị; đổi giá trị của dịch vụ; đổi giá trị của nhóm. Luật theo đặc điểm dùng hai hành động thêm / kết thúc luật của ADR-0146. Không thông tin cá nhân |

## 2. Dòng bản đồ quyền chạm các bảng này → áp cho loại nào

| Ô / luật | Giá trị | Hôm nay áp cho | Sau lượt này |
|---|---|---|---|
| `admin.manage` (`permissions.ts:185`) | ADMIN, SUPER_ADMIN | danh mục: ghi đè giá, ẩn, nhóm, gán nhóm, đưa đón dịch vụ | + định nghĩa đặc điểm và giá trị; + gắn giá trị **theo nhóm**; gán nhóm nay đổi cả giá trị thừa hưởng (Đ4c) |
| `catalog.attribute.assign` (**mới**) | SALES, ADMIN, SUPER_ADMIN `any`; còn lại `none` | — | gắn / đổi / bỏ giá trị **cho một dịch vụ**; đọc đặc điểm, giá trị hiệu lực, danh sách chưa khai |
| `sales.block.write` (ADR-0146 Đ5, chưa có trong mã) | SALES, ADMIN, SUPER_ADMIN `any` | — | thêm / kết thúc luật **cả ba kiểu** phạm vi; ràng buộc mới: tập giữ `catalog.attribute.assign` ⊆ tập giữ ô này, và tập giữ `admin.manage` ⊆ tập giữ ô này (hàng rào Đ6-i) |
| `partner.commission.write` (`permissions.ts:162`) | ACCOUNTING, ADMIN, SUPER_ADMIN | thêm / tắt loại đối tác | không đổi; tắt loại còn luật (kể cả luật theo đặc điểm) vẫn 409 (ADR-0146 Đ1) |
| `order.create` / `money.view` (route for-order) | không đổi | danh mục for-order | Đối tác bị ép bên đặt: danh mục bỏ thêm dịch vụ bị chặn **theo đặc điểm** (cùng hàm của ADR-0146 Đ4) |
| `order.trip.edit` (đổi bên đặt) | không đổi | — | cổng luật bán (ADR-0146) nay xét cả đặc điểm |
| Đọc danh mục đã đăng nhập | — | DTO form | **không** thêm đặc điểm vào DTO form (Đ5, [người soạn]) |

Không mã quyền mới. Kế toán (cổng văn phòng) **không** có ô mới: vào trang đặc điểm nhận 403, mục menu không hiện.

## 3. Cổng nào canh cửa nào

| Cửa | Cổng (thứ tự) | Đổi gì |
|---|---|---|
| `POST/PATCH …` định nghĩa đặc điểm, giá trị (route mới của `catalog`) | cổng `admin` → `admin.manage` dòng đầu thân → kiểm tên / trùng → khoá lạc quan → lô dữ liệu + nhật ký | mới |
| Tắt đặc điểm / giá trị | như trên → còn dòng gắn mở: **409 `attribute_in_use`** | mới |
| **Bật lại** đặc điểm / giá trị đã tắt | như trên → ghi + nhật ký; **không** cổng luật bán (`catalog` không đọc `pricing`) | mới; cửa đổi kết quả luật (Đ4 (d)) — chỉ cảnh báo giao diện |
| Gắn giá trị **theo nhóm** (route mới) | cổng `admin` → `admin.manage` → nhóm đang dùng → giá trị đang dùng → khoá lạc quan → lô | mới |
| Gắn giá trị **cho dịch vụ** (route mới) | cổng `office` → `catalog.attribute.assign` → dịch vụ có trong danh mục → giá trị đang dùng → khoá lạc quan theo giá trị đang thấy (409 `stale`) → lô; trigger CSDL canh lần hai | mới |
| Đọc đặc điểm / giá trị hiệu lực / chưa khai (route mới) | cổng `office` → `catalog.attribute.assign` **hoặc** `admin.manage` | mới |
| Thêm luật bán (ADR-0146 Đ5) | cổng `office` → `sales.block.write` → kiểu phạm vi hợp lệ → **giá trị thuộc đúng đặc điểm và đang dùng (409)** → loại đang bật (ADR-0146 Đ1) → ghi; CSDL: `CHECK` kiểu phạm vi + trigger đọc `v_ctl_attribute_value` | thêm vế đặc điểm |
| `POST /api/orders`, `PUT /api/orders/:id`, `PUT /api/orders/:id/booker` | như ADR-0146 Đ3 | hàm luật bán đọc thêm `v_ctl_service_attribute` — **không thêm cổng** |
| `kiemCongXacNhan` (`orders/xac-nhan-chung.ts:83`: Còn vé, Gửi đơn, `/status`) | luật bán đứng đầu (ADR-0146 Đ3 bổ sung 28/10) | như trên |
| Gửi xác nhận (`orders/xac-nhan-route.ts:100`, chốt riêng như `congNhomTatDuaDon` dòng 118) | chốt luật bán riêng (ADR-0146) | như trên |
| `GET /api/catalog/for-order` (`catalog/index.ts:167`) | `order.create` → `money.view` → lọc bằng hàm tiêm (ADR-0146 Đ4) | như trên; `catalog` vẫn chỉ phụ thuộc `audit` |
| `PUT /api/catalog/group-assignments` (`catalog/index.ts:293`) | `admin.manage` như hôm nay; **không** thêm cổng luật bán | nay đổi thêm giá trị thừa hưởng → cảnh báo giao diện (Đ4) |
| `POST /api/catalog/sync` + Cron (`catalog/index.ts:362`, `runScheduledSync`) | không đổi | không ghi bảng `ctl_attribute*`; dịch vụ mới tự vào danh sách chưa khai lúc đọc |
| `PUT /api/catalog/:code/transfer-rule`, `PATCH /api/catalog/groups/:code` (cờ đưa đón) | không đổi | **không liên quan** đặc điểm |
| Cạnh phụ thuộc | `catalog: ["audit"]`, `pricing: ["parties", "catalog", "audit"]`, `orders` gọi `pricing` qua `index.ts` | **không cạnh mới** (`src/architecture.test.ts:33, 54, 57`) |

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa

- **Mục menu mới «Đặc điểm dịch vụ»** (nhóm THIẾT LẬP, trang mới khai `PAGES`): hiện khi `can(catalog.attribute.assign) || can(admin.manage)`. Bán hàng thấy mục này dù **không** thấy «Dịch vụ & giá» (`muc-giao-dien.ts:71` chỉ `admin.manage`) — đây là lần đầu Bán hàng có một màn thiết lập liên quan danh mục.
- **Trong trang đặc điểm:** khối «Định nghĩa đặc điểm / giá trị» và cột «Theo nhóm» chỉ hiện khi `can(admin.manage)`; Bán hàng chỉ thấy bảng dịch vụ × giá trị với ô chọn của từng dịch vụ. Máy chủ vẫn kiểm lại (403).
- **Số đếm «N chưa khai»** cạnh mục menu: chỉ cho người thấy mục.
- **Cảnh báo đổi giá trị** (Đ4): hiện khi giá trị cũ hoặc mới có luật bán hiệu lực. Màn gọi route đọc luật của `pricing`; người thấy màn luôn giữ `sales.block.write` (hàng rào Đ6-i), nên luôn đọc được. Nếu sau này hai ô lệch nhau, cảnh báo sẽ im lặng — đó là lý do hàng rào Đ6-i là bài kiểm, không phải lời khuyên.
- **Nút «Bật lại»** đặc điểm / giá trị (chỉ `admin.manage`): hiện cảnh báo «còn N luật bán trỏ tới giá trị này» trước khi lưu (Đ4 (d)). Máy chủ không ép. Cảnh báo đọc route luật của `pricing`, nên chỉ chạy khi người giữ `admin.manage` cũng giữ `sales.block.write` — hàng rào Đ6-i vế 2 canh.
- **Màn gán nhóm** (trong `/catalog`, chỉ Quản trị, Toàn quyền): cảnh báo của ADR-0146 Đ3 mở rộng thêm «đổi giá trị thừa hưởng của đặc điểm … ⇒ bắt đầu / thôi chặn cho …».
- **Màn «Luật bán»** (ADR-0146 Đ5): thêm kiểu «Theo đặc điểm» (chọn đặc điểm, giá trị, nhóm tuỳ chọn); dòng luật trỏ tới giá trị đã tắt hiện nhãn «không phủ dịch vụ nào».
- **Danh mục trong form lập đơn:** Đối tác bị chặn không thấy thêm các vé bị chặn theo đặc điểm; nhóm không còn vé nào thì chip nhóm không hiện (như ADR-0146). Văn phòng thấy đủ, bị 409 lúc lưu.
- **Trợ giúp** (Bán hàng, Quản trị): một đoạn về đặc điểm, danh sách chưa khai và việc đổi giá trị làm đổi luật bán.

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, kiểm 30/10)

- TNV-G1, TNV-G3, TNV-G4, HC-4.2: không chạm (không tiền, không sổ).
- HC-5.11 (Cron đồng bộ danh mục không có định danh, `catalog/index.ts` `runScheduledSync`): **không chạm** — lượt này không thêm câu ghi nào vào đường đồng bộ; danh sách chưa khai tính lúc đọc.
- HC-5.19 (chưa diễn tập khôi phục, hạn 5/11): migration chỉ thêm bảng và view, không ghi đè dữ liệu cũ.
- Bốn ô giữ chỗ ở mục `thao_tac` (task.progress, dispatch.guides.view, invoice.*): không liên quan.

**Kết luận: không xây trên lỗ đang hở.**

## 5. Các quyết định đụng nhau ở đâu

1. **ADR-0146 ↔ Đ2:** cùng bảng `prc_sales_block`, cùng một hàm ở `pricing`. Vì ADR-0146 chưa thi công, bảng được tạo **một lần** đã có cột đặc điểm. Đ1 phải lên cùng lần phát hành hoặc trước (khoá ngoại trỏ `ctl_attribute_value`). Kế hoạch thi công ADR-0146 viết sau khi lượt này duyệt, gộp cả phần sửa.
2. **ADR-0146 Đ3 (ba cửa đổi kết quả) ↔ Đ4:** thêm ba cửa mới (đổi giá trị của dịch vụ, của nhóm, **bật lại** giá trị đã tắt) và cửa gán nhóm có sẵn mang thêm nghĩa ⇒ sáu cửa, cùng cách «chấp nhận, cảnh báo, ghi nhật ký; đơn đã xác nhận không xét lại». Gán nhóm nay đổi kết quả qua **hai** đường (luật `GROUP` và giá trị thừa hưởng).
3. **ADR-0146 Đ5 ↔ Đ3:** hai ô khác nhau cùng giao cho Bán hàng, Quản trị, Toàn quyền. Ràng buộc ⊆ (Đ6-i) giữ chúng không lệch theo chiều nguy hiểm.
4. **ADR-0146 «Việc bắt buộc trước khi đặt luật đầu tiên» ↔ Đ5:** thêm bước: khai giá trị cho mọi vé của nhóm dùng trong luật theo đặc điểm, danh sách chưa khai của nhóm đó bằng 0.
5. **ADR-0118 / ADR-0149 (đưa đón):** **không đụng**. Giá trị đặc điểm của một vé (ví dụ ca vàng: «Vận chuyển cảng–đảo = Không gồm») độc lập với ô đưa đón của nó («Luôn đón» khách sạn ↔ cảng), và ngược lại. Hai trục độc lập; luật bán không đọc `v_ctl_service_transfer`, cổng ghi chặng không đọc đặc điểm.
6. **ADR-0136 (cờ cần xác nhận theo dịch vụ / nhóm):** không đổi; cờ không có phạm vi đặc điểm ở lượt này. Thứ tự cổng giữ: luật bán đứng đầu.
7. **Lượt B (Đóng bán, `../B-dong-ban/`):**
   - Phạm vi theo đặc điểm cho đóng bán: nếu có, đọc cùng view `v_ctl_service_attribute`, không dựng nguồn thứ hai. Lượt A không quyết thay.
   - **Lớp bọc cổng chung:** B đề xuất hàm cổng chung ở `orders` (tên tạm `congBanDuoc`) gọi (1) hàm luật bán của `pricing` → (2) đóng bán. Hàm bọc, không xét lại luật bán. Kế hoạch thi công ADR-0146 phải gọi luật bán qua lớp này nếu B được duyệt cùng hoặc trước.
   - **Câu C5 của B:** gọi cổng chặn (gồm luật bán) thêm một lần **trước `tinhCanXacNhan`** ở `/status` (`orders/index.ts:1702–1703`: hôm nay `tinhCanXacNhan` chạy trước `kiemCongXacNhan`) và Gửi xác nhận (`xac-nhan-route.ts:116`). C5 = (a) đổi chỗ người dùng gặp `sales_blocked` của ADR-0146 ở `/status`. **Kế hoạch thi công ADR-0146 phải theo câu trả lời C5 của chủ; Lượt A không quyết thay.**
   - Tập phạm vi: cả hai lượt dùng `CHECK` ở CSDL.
   - Danh sách cửa của A (theo ADR-0146 Đ3) và của B khác tập; hợp lại là 8 (báo cáo kiểm 30/10, B-3). Kế hoạch thi công dùng tập hợp.
8. **Lượt D (Phụ thu, đang soạn ở thư mục `CD-…`):** nếu dùng đặc điểm làm điều kiện **tiền**, Bán hàng gắn giá trị sẽ đổi tiền ⇒ lượt D phải xét lại ô `catalog.attribute.assign`, chụp giá trị vào đơn (Hiến chương 5.6) và có ca vàng (5.17). Lượt này ghi rõ: đặc điểm **chưa** được dùng cho tiền.

## 6. Bài kiểm dự kiến phải sửa / thêm (ước, chưa đo)

- **Ô mới `catalog.attribute.assign`:** theo lần đo ô `order.submit` ngày 25/10 (trang ghép 25/10 mục 6), dự kiến đỏ ở `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts` (nếu bài ghim cả hàng), `src/shared/tro-ly-cau-truc.test.ts` (thêm `TEN_THAO_TAC`, sinh lại sơ đồ trang), `src/permission-enforcement.test.ts` (cần lời gọi `can(…, "catalog.attribute.assign")` trong `src/modules`). **Chưa đo** — người thi công đo trên bản sao.
- **Route mới:** thêm dòng ở `src/route-access.test.ts`; đưa route ghi vào `route-write-guard`.
- **Trang mới:** `src/shared/sw-policy.ts` (`PAGES` và danh sách `/js/…`), script `build:web`, `src/shared/so-do-trang.ts` (sinh), kịch bản Chrome cho Bán hàng và Quản trị (Bán hàng mở SAU CÙNG — `CLAUDE.md` §10).
- **Kiến trúc:** tệp nửa nghiêm mới của `catalog` vào `NUA_NGHIEM` (`src/architecture.test.ts:160–174`); bảng / view mới vào `docs/data-dictionary.json`.
- **Bài mới:** Đ6 (e)–(l); bài hành vi cho tiêu chí 1–19 (kể cả 17b) của `DE-XUAT-ADR.md`; e2e luật bán theo đặc điểm dùng đặc điểm và loại do bài tự tạo (`tests/e2e/catalog.mjs` đang khẳng định Đối tác thấy đúng danh sách nhóm như Bán hàng — không được làm lệch).
- **Sổ hàng rào:** mỗi bài mới có dòng ở `docs/SO-HANG-RAO.md` sau khi quan sát đỏ thật.

## 7. Việc khi chép sang `docs/adr/` (sau khi chủ duyệt)

- Lấy số ADR trống kế tiếp lúc chép (kiểm mọi nhánh chưa gộp).
- `docs/adr/README.md`: thêm dòng ADR mới; dòng ADR-0146 ghi «Đ1, Đ2, Đ3, Đ6 bị sửa một phần bởi ADR-<số>» ở cột trạng thái. Không sửa tệp ADR-0146.
- `src/CLAUDE.md` (đề xuất, chủ duyệt — N9): nối câu về đặc điểm vào dòng ngoại lệ mà ADR-0146 đề xuất, ví dụ «luật bán có thể khoanh theo đặc điểm dịch vụ (dữ liệu của `catalog`, đọc qua `v_ctl_service_attribute`); đặc điểm không phải điều kiện cho phép, không dùng cho tiền khi chưa có ADR».
