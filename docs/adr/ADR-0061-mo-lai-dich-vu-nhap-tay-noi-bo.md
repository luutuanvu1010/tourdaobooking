# ADR-0061 — Mở lại "Dịch vụ nhập tay" cho nội bộ, có công tắc của Toàn quyền (mặc định TẮT); tài khoản có quyền Đối tác luôn bị chặn (sửa một phần ADR-0021, ADR-0027; thu hẹp lệch 5.1 của ADR-0029)

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 (hộp hỏi gom; điều phối chuyển lại nguyên văn): *"Duyệt cả ba, kèm 14 điểm chi tiết"* (ADR-0059, ADR-0060, ADR-0061 cùng điểm A-1…A-14 của hồ sơ trình); Q-1 *"Giữ quyền sẵn, chờ việc C2"*; Q-2 *"Không"*. Nguyên tắc chủ đã chốt trước đó (góp ý người dùng, T1 lượt 2): *"Hiện lại 'Dịch vụ nhập tay' cho nội bộ công ty (đối tác không dùng được); công tắc bật/tắt ở màn của Toàn quyền"*; lượt 3: *"Bán hàng, Kế toán, Quản trị, Toàn quyền. Không: HDV, Thực tập sinh, Đối tác, Tài xế"*. Hồ sơ trình + trang ghép: `docs/superpowers/specs/2026-09-30-de-xuat-adr-gop-y-d1-d3.md` (D3). Người kiểm độc lập chỉ-đọc hai vòng: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo cả hai vòng (bản sửa vòng 2 chưa được kiểm lại). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-30.
- **Loại:** **một chiều** ở phần bảng chính sách (tiền tố `ord_`, bảng chỉ-thêm); luật mở/đóng là hai chiều (tắt công tắc).
- **Sửa ADR:** sửa **một phần** ADR-0021 điều 2 và ADR-0027 điều 1; sửa điều kiện gỡ lệch 5.1 của ADR-0029 (bảng "Câu bị thay"). **Nội dung ba ADR cũ không bị sửa** (đã accepted — chỉ ADR này ghi câu thay thế); người đọc ADR-0021, ADR-0027, ADR-0029 phải đọc kèm ADR này.
- **Nới hàng rào đã duyệt (Điều 9.4):** dòng `docs/SO-HANG-RAO.md:27` — chủ duyệt ADR này là duyệt việc nới (xem "Hệ quả").
- **Hiến chương áp:** 5.1 (lệch thu hẹp), 5.2, 5.4, 5.5, 5.7, 5.17.
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` `phat_hien` = `[]`, kiểm 30/9).
- **Mã đo** trên `main` @ `836c8247` (bản 1.38).
- **Điểm chi tiết do AI thêm, chủ đã duyệt kèm:** A-8 (bảng chính sách rỗng coi như TẮT), A-9 (kiểm định kỳ `R-ORD-NT1`), A-14 (dòng nhập tay thiếu giá vốn thì giữ đơn, không lấy 0).

## Tóm tắt (lời thường)
"Dịch vụ nhập tay" có công tắc do Toàn quyền bật/tắt, **mặc định TẮT**. Khi bật: Bán hàng, Quản trị, Toàn quyền thêm được dịch vụ gõ tên + giá tay (Kế toán có quyền sẵn, dùng được khi có chỗ sửa đơn sau xác nhận). Tài khoản có quyền Đối tác **luôn bị máy chủ chặn**, kể cả tài khoản lai. Khi tắt: đơn cũ có dịch vụ nhập tay vẫn đọc được, giữ nguyên như hôm nay.

## Bối cảnh
- ADR-0021 ẩn nút "+ Dịch vụ nhập tay" (còn phần tử ẩn: `public/order-form.html:18`, `web/order-form.ts:46`). ADR-0027 điều 1 (vá DK-T3-01: Đối tác tự gõ giá lên phiếu mang MST Tour Đảo) chặn ở máy chủ **cho mọi tài khoản**: `manualFreezeViolation` (`src/modules/orders/price-guards.ts:61`) gọi trong `priceGuard` (`src/modules/orders/index.ts:113-120`) ở `POST /api/orders` (`:495`) và `PUT /api/orders/:id` (`:548`). Chủ khi đó nói *"Sẽ mở lại khi cần thiết"*.
- Máy chủ vẫn phân tích dịch vụ nhập tay (`manualService`, `src/modules/orders/service-rules.ts:231-255`); dịch vụ nhập tay có `catalog_code` NULL, `catalog_price` NULL.
- Luật giá Đối tác R2 (`retailPricesOnly`) và R3 (trần giảm giá) chạy ở lập, sửa **và** xác nhận (`src/modules/orders/index.ts:806-807`) — dòng nhập tay (không giá danh mục) tự trượt R2.
- **Rủi ro "tài khoản lai":** `can()` là **hợp** các ô của mọi quyền (`permissions.ts:191`); `permissions.ts:232-237` ghi đường quản trị cũ vẫn gán được PARTNER cùng quyền nội bộ. Một ô mới SALES = any sẽ cho tài khoản SALES + PARTNER qua nếu chỉ hỏi `can()`.
- **Kế toán hôm nay không lập, không sửa đơn:** `order.create` và `order.modify` của ACCOUNTING = `none` (`permissions.ts:76-77`).

## Quyết định
1. **Bảng chính sách mới** (tên tạm) `ord_manual_service_policy` — module `orders` (tiền tố `ord_`), khuôn `vc_dispatch_policy` (`migrations/0041_chinh_sach_dieu_phoi.sql:14-35`):
   - `id` TEXT PK; `enabled` INTEGER NOT NULL `CHECK (enabled IN (0, 1))`; `valid_from_at` TEXT NOT NULL UNIQUE; 4 cột dấu vết;
   - trigger cấm `UPDATE`, cấm `DELETE` (chỉ-thêm); đổi = thêm dòng mới, máy chủ đặt `valid_from_at` = lúc ghi, không lùi;
   - **gieo một dòng `enabled = 0`** trong migration (mặc định TẮT);
   - dòng hiệu lực = `valid_from_at` lớn nhất ≤ bây giờ. Bảng rỗng (không thể xảy ra sau migration) ⇒ coi như TẮT (A-8; 5.7: không đoán "bật").
   - Câu SQL mới đặt ở tệp nửa nghiêm của `orders` (`defineSql`, hằng `NUA_NGHIEM` — `docs/ARCHITECTURE.md` Phần II).
2. **Ô quyền mới** (tên tạm) `order.service.manual`: SALES any, ACCOUNTING any, ADMIN any, SUPER_ADMIN any; FIELD, PARTNER, INTERN, DRIVER, DRIVER_PARTNER none. **Không có phạm vi đơn**: phạm vi (đơn nào được lập/sửa) vẫn do `order.create` / `order.modify` quyết.
3. **Luật máy chủ — một hàm thuần duy nhất** (tên tạm `duocNhapTay(staff, chinhSachBat)` trong `price-guards.ts`):
   `duocNhapTay = chinhSachBat && can(staff, "order.service.manual") && !holdsPartner(staff)`.
   - Thứ tự trong `priceGuard`: **Đối tác trước** (`holdsPartner` ⇒ luôn áp R1 đóng băng như hôm nay, bất kể công tắc và ô), rồi công tắc, rồi ô.
   - `duocNhapTay` đúng ⇒ bỏ qua `manualFreezeViolation` (thêm mới, sửa tên/giá dịch vụ nhập tay được). Sai ⇒ R1 đóng băng như hôm nay (giữ nguyên dịch vụ nhập tay đã lưu, không thêm, không sửa tên/giá; bỏ khỏi đơn nháp thì được).
   - R2, R3 **không đổi** (lớp chặn thứ hai cho Đối tác, cả ở xác nhận).
   - `priceGuard` đọc dòng chính sách **một lần mỗi request**.
4. **Khi TẮT:** đơn cũ có dịch vụ nhập tay vẫn đọc, in biên nhận, xác nhận được như hôm nay; không ai thêm mới (đúng hành vi bản 1.38). Tắt sau một thời gian bật ⇒ các dòng đã thêm trở thành "đóng băng", không mất.
5. **Mọi đường ghi dịch vụ đều qua cùng hàm:** hôm nay chỉ `POST /api/orders` và `PUT /api/orders/:id` (nháp) ghi `order_service`/`order_item`. `POST /api/orders/:id/handler-money-edit` (`src/modules/dispatch/index.ts:229`) chỉ ghi **dòng điều chỉnh**, từ chối dịch vụ thừa (chú thích `:226-228`). Route sửa sau xác nhận tương lai (C2) **phải** gọi `duocNhapTay` — bài tĩnh dưới đây canh.
6. **Công tắc:** `GET /api/cai-dat/nhap-tay` (cổng `orders`, trả `{ batNhapTay, duocDung }` với `duocDung = duocNhapTay(người gọi, …)` để form biết hiện nút) và `POST /api/cai-dat/nhap-tay` (cổng `admin`, `can(settings.ops)` — hôm nay chỉ Toàn quyền, `permissions.ts:109`), nhật ký `manual_service_policy_changed` (không gắn đơn). Nút bật/tắt đặt ở màn cài đặt của Toàn quyền.
   - Hai route thuộc module `orders` nhưng **cố ý không** nằm dưới `/api/orders`: đổi chính sách không phải thay đổi một đơn, nên không thuộc bài "mọi route ghi `/api/orders*` phải gọi `baoThayDoi`" (`src/bang-tin-guard.test.ts:6-11`, `MIEN` rỗng) — không xin miễn trừ ở đó; đồng thời tránh bẫy router `:id` (`src/modules/orders/index.ts:422-451`).
   - **Bài NT-F7 / Task 6e của sổ tiền** (`docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md:65`, `:253`: mọi route ghi của module `orders`/`dispatch` từ chối sớm sau "Đã giao"; có danh sách miễn trừ có tên + lý do): `POST /api/cai-dat/nhap-tay` **ghi một miễn trừ có tên** — lý do "đổi chính sách nhập tay toàn hệ thống, không ghi đơn nào, không có đơn để khoá". Không dời route sang module khác: bảng thuộc `orders`, chỉ module chủ được ghi (ADR-0002 điều 3, Hiến chương 5.3). D3 thi công sau sổ tiền ⇒ người thi công thêm mục miễn trừ cùng commit với route; trước sổ tiền ⇒ người thi công sổ tiền thêm khi dựng bài.
7. **Tiền nhập tay đi qua sổ tiền như dịch vụ danh mục:** dòng nhập tay là `order_item` bình thường ⇒ "phải thu", "Đã giao", biên nhận, sổ công nợ tính như mọi dòng (một hàm tính — 5.4). **Sổ vàng (5.17):** thêm ca có dòng nhập tay vào bộ ca của sổ tiền, chủ/Kế toán xác nhận từng đồng. Khi có giá vốn/chiết khấu theo danh mục (`pricing`, lượt sau): dòng nhập tay **không có nguồn giá vốn** ⇒ đơn bị **giữ** ở bước cần giá vốn, hiện lý do và ai xử lý (A-14; 5.7), **không bao giờ lấy 0**.
8. **Lệch 5.1 (ADR-0029) — thu hẹp, không tự hết:** ADR mở **có điều kiện**, nên luật "không nhập tay khi tắt / khi không có ô / khi có quyền Đối tác" **vẫn chỉ ở mã**. Không thêm trigger được vì:
   - lưu nháp **xoá rồi chèn lại** toàn bộ `order_service`/`order_item` (`src/modules/orders/repository.ts:918-920`) — trigger không phân biệt dòng nhập tay cũ được giữ với dòng mới;
   - `order_service` không có cột người tạo/lúc tạo riêng dòng; "người gọi có quyền Đối tác" không thuộc dữ liệu của bảng.
   - **Lớp bù:** kiểm định kỳ `R-ORD-NT1` (A-9; mức `warn`, `scripts/audit-checks.mjs`): đơn có dịch vụ nhập tay mà người lập (`orders.staff_id`) đang giữ quyền PARTNER và đơn tạo **sau** mốc phát hành ADR này. Điều kiện gỡ lệch mới: khi có cột người/lúc tạo cho từng dòng dịch vụ (hoặc bỏ xoá–chèn ở lưu nháp) ⇒ ADR mới thêm trigger.

## Bảng quyền (9 quyền app)

| Quyền | `order.service.manual` (mới) | Thực tế khi công tắc BẬT |
|---|---|---|
| SALES | any | Thêm/sửa dịch vụ nhập tay trên đơn mình lập/sửa được |
| ACCOUNTING | any | **Chưa có tác dụng** — Kế toán không lập/sửa đơn; chủ chọn Q-1 "Giữ quyền sẵn, chờ việc C2" |
| ADMIN | any | Được |
| SUPER_ADMIN | any | Được |
| FIELD (HDV) | none | Không |
| PARTNER | none | **Không, kể cả tài khoản lai** (`holdsPartner` chặn trước) |
| INTERN | none | Không (vẫn lập đơn bằng danh mục) |
| DRIVER | none | Không |
| DRIVER_PARTNER | none | Không |

Ghi công tắc: `settings.ops` (chỉ Toàn quyền — không đổi ô).

## Câu bị thay (ADR cũ giữ nguyên văn bản; câu dưới là câu có hiệu lực từ nay)

| ADR | Câu cũ | Câu mới |
|---|---|---|
| ADR-0021 điều 2 | "Ẩn nút '+ Dịch vụ nhập tay' trong mọi trường hợp" | "Ẩn nút, **trừ khi** công tắc nhập tay đang BẬT và người dùng được nhập tay (ADR-0061)." |
| ADR-0027 điều 1 | "Ngừng dịch vụ nhập tay — ở máy chủ, cho mọi tài khoản." | "Ngừng dịch vụ nhập tay ở máy chủ **khi công tắc TẮT, với người không có ô `order.service.manual`, và luôn luôn với tài khoản có quyền Đối tác** (ADR-0061). Phần đóng băng dịch vụ nhập tay đã lưu giữ nguyên cho các trường hợp đó." |
| ADR-0029 "Khi nào gỡ lệch" 5.1 | "nếu chủ **mở lại** nhập tay thì gỡ luật, lệch tự hết" | "ADR-0061 mở lại **có điều kiện**: lệch 5.1 thu hẹp còn luật 'khi tắt / không có ô / có quyền Đối tác', lớp bù `R-ORD-NT1`; gỡ khi dòng dịch vụ có dấu vết riêng (ADR mới)." |

## Phương án bị loại
- **Công tắc bằng biến môi trường / hằng trong mã:** Toàn quyền không tự bật được; trái 5.2.
- **Công tắc là JSON trong một bảng "cài đặt chung":** trái 5.2.
- **Chỉ hỏi `can(order.service.manual)`, không `holdsPartner`:** tài khoản lai SALES + PARTNER lọt — lặp lại lỗi người kiểm độc lập đã chứng minh 26/9 (`permissions.ts:232-236`).
- **Mở cho mọi người lập đơn rồi dựa R2 chặn Đối tác ở xác nhận:** Đối tác vẫn lưu nháp được giá tự gõ; trái lời chủ; mất lớp chặn thứ nhất.
- **Cấp `order.create` cho Kế toán để dùng nhập tay:** nở quyền lập đơn — chủ chọn Q-1 "Giữ quyền sẵn, chờ việc C2".

## Hệ quả — migration, route, test, hàng rào
- **Migration** (một tệp; số lấy lúc thi công, sau `0044`/`0045` của sổ tiền và sau số của ADR-0058; kiểm mọi nhánh chưa gộp): bảng + hai trigger chỉ-thêm + dòng gieo `enabled = 0`. `docs/data-dictionary.json` + `npm run dict`.
- **Mã:** `price-guards.ts` (hàm `duocNhapTay`, sửa chú thích R1), `orders/index.ts` (`priceGuard` nhận chính sách), hai route công tắc, `web/order-form.ts` (hiện nút theo `duocDung`; câu lỗi `MANUAL_FROZEN_MESSAGE` đổi thành câu nói rõ "chưa bật / tài khoản không được nhập tay"), màn cài đặt của Toàn quyền, `src/shared/audit-actions.ts`.
- **Test (đỏ trước, xanh sau):**
  - `price-guards.test.ts`: bảng ca đủ tổ hợp (công tắc bật/tắt × 9 quyền × lai SALES+PARTNER, PARTNER+FIELD, ADMIN+PARTNER) — mọi tài khoản có PARTNER luôn bị chặn.
  - Bài tĩnh mới: "mọi route gọi `validateOrder` đều gọi `priceGuard`" (khuôn `src/route-access.test.ts`).
  - Sửa `tests/e2e/nhap-tay-va-gia-doi-tac.mjs`: công tắc tắt ⇒ hành vi cũ; bật ⇒ Bán hàng lập đơn nhập tay 201, Đối tác 400; tắt lại ⇒ đơn đó vẫn mở, xác nhận được, không sửa được giá dòng nhập tay.
  - Migration: `UPDATE`/`DELETE` bảng chính sách bị chặn; sau migration dòng hiệu lực là `enabled = 0`.
  - Sổ vàng: ca dòng nhập tay (ở sổ tiền). Kịch bản Chrome form đơn (nút hiện/ẩn theo tài khoản).
- **Đơn nháp của Đối tác có dòng nhập tay do nội bộ thêm:** Bán hàng đang phụ trách (hoặc Quản trị) thêm dòng nhập tay vào đơn nháp do Đối tác lập ⇒ **Đối tác không xác nhận được** đơn đó (R2 ở nhánh xác nhận, `src/modules/orders/index.ts:806`) và nhận 403 "Tài khoản đối tác dùng đúng giá bán lẻ theo danh mục…". Người nội bộ xác nhận thay. Hệ quả có chủ ý, ghi vào hướng dẫn cho văn phòng.
- **NỚI hàng rào đã duyệt (Điều 9.4):** dòng `docs/SO-HANG-RAO.md:27` (`tests/e2e/nhap-tay-va-gia-doi-tac.mjs` + `src/modules/orders/price-guards.test.ts`, "R1: dịch vụ nhập tay mới … (mọi tài khoản) → 400", đã thấy chặn thật từ 2026-09-26) bị **thu hẹp** thành "khi công tắc TẮT / không có ô / có quyền Đối tác". Các ca R1 "mọi tài khoản" trong hai tệp test **đổi kỳ vọng** (ghi lý do trỏ ADR này); ca Đối tác giữ nguyên.
- **Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md`:** (a) `holdsPartner` đứng trước trong `duocNhapTay` (bài ca lai); (b) bài tĩnh "route ghi dịch vụ gọi `priceGuard`"; (c) trigger chỉ-thêm `ord_manual_service_policy`; (d) `R-ORD-NT1`; (e) miễn trừ có tên ở bài NT-F7 — mọi dòng ghi "chưa quan sát chặn" tới khi thi công sửa cố ý → đỏ → hoàn nguyên.
- **Ô có giá trị nhưng chưa có tác dụng:** ô `order.service.manual` của ACCOUNTING = `any` mà máy chủ chưa hỏi ở đường nào Kế toán đi được (bài học 24/9: giá trị trong bản đồ ≠ bản đồ đang được thi hành). Ghi rõ ở chú thích ô trong `permissions.ts` và ở sổ hàng rào: "Kế toán — chưa có tác dụng, chờ route C2".
- Tài liệu: `docs/SYSTEM-DESIGN.md` §16 (dòng lệch ADR-0029 cập nhật), `docs/CHANGE-GUIDE.md` (công thức "bật/tắt nhập tay").

## Tiêu chí nghiệm thu
1. Sau migration, không ai (kể cả Toàn quyền) thêm được dịch vụ nhập tay — máy chủ trả 400 như bản 1.38; nút ẩn.
2. Toàn quyền bật công tắc ⇒ Bán hàng, Quản trị thấy nút và lập đơn có dịch vụ nhập tay ⇒ 201; tổng tiền tính ở máy chủ.
3. Công tắc BẬT, gửi đơn có dịch vụ nhập tay mới qua `POST /api/orders`; nút không hiện với mọi ca dưới:
   - chỉ-HDV (FIELD): **403 `forbidden`** (không có `order.create`, chặn trước `priceGuard`);
   - Thực tập (INTERN): **400 `invalid_input`** (câu đóng băng R1 — không có ô);
   - Đối tác (PARTNER): **400 `invalid_input`** (R1, `holdsPartner` chặn trước);
   - lai Đối tác + Bán hàng: **400 `invalid_input`** (dù ô SALES = any);
   - lai Đối tác + HDV: **400 `invalid_input`**;
   - `PUT /api/orders/:id` (sửa nháp): cùng mã như trên với người có `order.modify`.
   (Mã lỗi theo thứ tự kiểm của `priceGuard` hôm nay — `src/modules/orders/index.ts:113-120`; câu chữ R1 mới chốt ở kế hoạch.)
4. Quản trị gọi `POST /api/cai-dat/nhap-tay` ⇒ 403 `forbidden`; Toàn quyền ⇒ 200, có dòng nhật ký.
5. Toàn quyền tắt ⇒ đơn đã có dịch vụ nhập tay vẫn mở, xác nhận được; sửa tên/giá dòng đó ⇒ 400.
6. Kế toán nhận biên nhận/sổ tiền của đơn có dòng nhập tay đúng từng đồng theo ca sổ vàng.
