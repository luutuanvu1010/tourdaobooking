# ADR-0064 — Hướng dẫn viên thấy ghi chú đơn ở "Việc của tôi", và thấy biển số + tên tài xế của đơn mình phụ trách (bổ sung ADR-0059)

- **Trạng thái:** **proposed** (bản nháp của người soạn, 2026-09-30). Các lần sửa:
  - lần 1 theo báo cáo người kiểm độc lập;
  - lần 2 theo điều phối: đổi số từ nháp "0061" sang 0064 (0059–0061 đã được phiên khác dùng, chủ đã duyệt); bỏ route xe riêng của bản nháp vì đã có ADR-0059 accepted;
  - lần 3 theo lời chủ chốt 30/9 (hộp hỏi của phiên điều phối chung): **"Thêm HDV phụ trách, làm sau ADR-0059"** ⇒ D2 là **bổ sung ADR-0059**, không lặp route.
  - AI không tự duyệt (Hiến pháp N3, Điều 7.2). Bản sửa lần 2–3 **chưa có người kiểm độc lập** đọc.
- **Ngày:** 2026-09-30.
- **Thuộc gói:** lượt duyệt **2b** (cùng ADR-0065). ADR này có **2** quyết định chạm quyền/dữ liệu: D1 (thêm trường vào DTO của HDV), D2 (mở route xe của ADR-0059 cho HDV phụ trách — một ô quyền mới). Trang ghép: `trang-ghep-luot-2.md` phần 2b. ADR-0063 là lượt 2a, duyệt riêng.
- **Mốc đo mã:** `824193f1` (= `origin/main` bản 1.38 + commit giao diện 1.39; các tệp máy chủ trích dẫn không khác `1db777f4`). ADR-0059 đọc ở nhánh `worktree-phan-tich-gop-y` (`4f1507a1`).
- **Nguồn (lời chủ — không hỏi lại):**
  - V2 (báo cáo rà soát `docs/superpowers/specs/2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md` §1, §6.1): ghi chú **đơn** tới HDV — **HDV phụ trách mặc định được biết; tài xế KHÔNG**.
  - V5 (§6.1): "Trang đơn có thể hiện xe và tài xế đã xếp (nhưng ghi chú nhỏ là có thể thay đổi)"; làm rõ: văn phòng + HDV phụ trách, Đối tác chưa.
  - **Lời chốt xung đột 30/9:** ADR-0059 (accepted, phiên góp ý) loại HDV; chủ chốt **"Thêm HDV phụ trách, làm sau ADR-0059"**.
- **ADR liên quan:** **ADR-0059** (accepted — bị **bổ sung**, xem "Câu thay"), ADR-0017/ADR-0030 S23-1…S23-5 (HDV xem đơn đang phụ trách), ADR-0019 (cổng router), ADR-0022 (Bảng tin), ADR-0049 (tóm tắt điểm 6 "Hướng dẫn viên, Đối tác không thấy" lịch xe; D3 danh sách trường cho tài xế), ADR-0052 (`:165`).
- **Hiến chương áp dụng:** 4.4 (hình chiếu dựng từ danh sách trường được phép), 5.3 (không đọc bảng module khác, không vòng), 5.12 (không SĐT).
- **Xây trên lỗ đang hở:** **không có** (`docs/quyen-hoan.json:63` `phat_hien` = `[]`).
- **Xây trên nền chưa có (5.13):** D2 thi công **sau** ADR-0059 (route `xe-cua-don` chưa có trên `main`).
- **Không cần migration.**

---

## Tóm tắt cho chủ (lời thường)

1. Thẻ "Việc của tôi" của HDV hiện thêm **ghi chú của đơn**. Tài xế vẫn không bao giờ thấy.
2. HDV **đang phụ trách một đơn** mở đơn đó thấy **biển số xe và tên tài xế** đã xếp, kèm dòng nhỏ "Có thể thay đổi". Không số điện thoại tài xế, không lịch xe chung, không chuyến khác, không khách khác.
3. Dùng lại đúng chỗ đã làm ở ADR-0059 (bạn đã duyệt), chỉ mở thêm cho HDV phụ trách; làm **sau** ADR-0059.

---

## Bối cảnh (hiện trạng)

| Việc | Hiện trạng | Nguồn |
|---|---|---|
| HDV xem đơn đang phụ trách | `order.view`, `contact.view` của FIELD = `assigned` ⇒ trang đơn đã có `customerNote` | `src/shared/permissions.ts:72`, `:75`; `src/shared/contracts.ts:197` |
| Dữ liệu "Việc của tôi" | `MyAssignmentDto` **không** có ghi chú đơn; **đã có** `customerPhone` | `src/shared/contracts.ts:585-599`; dựng ở `src/modules/orders/index.ts:377-413`; route `GET /api/dispatch/mine` `src/modules/dispatch/index.ts:129-135` |
| Tài xế không thấy ghi chú đơn | ADR-0049 D3 "Không bao giờ: … ghi chú đơn"; bài khoá DTO tài xế | `docs/adr/ADR-0049-*.md:238`; `src/modules/van-chuyen/tai-xe-dto.test.ts:15` |
| Xe + tài xế trên chi tiết đơn (ADR-0059, accepted) | route `GET /api/van-chuyen/xe-cua-don/:orderId`, **cổng `office`**; trong thân hỏi `can(trip.view)` + `can(order.view)` **không ngữ cảnh** ⇒ chỉ Bán hàng, Kế toán, Quản trị, Toàn quyền; FIELD **Không**. DTO `{ chang: [{ legId, xe: [{ bienSo, tenTaiXe \| null, soKhach, trangThai }] }] }`; suất nối đơn qua `v_ord_leg_key` | `git show worktree-phan-tich-gop-y:docs/adr/ADR-0059-bien-so-xe-tren-chi-tiet-don.md` (Quyết định 1–4, bảng quyền) |
| Cổng router | `OFFICE_GATE` = SALES, ACCOUNTING, ADMIN, SUPER_ADMIN (không FIELD); `ORDERS_GATE` = SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN | `src/shared/permissions.ts:205`, `:210` |
| Ô `trip.view` | SALES/ACC/ADMIN/SA `any`, DRIVER `assigned` (= "đang lái chuyến"), còn lại `none` | `src/shared/permissions.ts:136` |
| `van-chuyen` biết "đang phụ trách" | đã gọi `ctx.isAssigned(orderId)` (ô `trip.call_ack`) | `src/modules/van-chuyen/index.ts:76-79` |

---

## Quyết định

### D1. Ghi chú đơn tới HDV phụ trách (V2)

1. `MyAssignmentDto` thêm **một** trường `customerNote: string | null` (= `OrderDto.customerNote` của đơn). Dựng trong `getMyAssignments` (`orders/index.ts:377`), khuôn danh sách trường tường minh (4.4).
2. **Không thêm ô.** Route `GET /api/dispatch/mine` đã hỏi `contact.view` và `money.view` phạm vi `assigned` (`dispatch/index.ts:130-131`); HDV đã đọc được trường này ở trang đơn.
3. **Không che số** trong ghi chú ở màn này: cùng thẻ đã trả `customerPhone` đầy đủ; HDV phụ trách đã thấy ghi chú nguyên văn ở trang đơn. Che chỉ áp nơi người xem **không** có `contact.view` (hàng chờ `pool.ts`).
4. **Không đổi:** hàng chờ nhận (`pool.ts`) không thêm ghi chú đơn; DTO tài xế không thêm (bài khoá `:15`); tin Bảng tin / màn hình khoá không mang ghi chú (ADR-0022 điều 4).
5. `paymentNote` (ghi chú thanh toán) **không** thêm (ngoài lời chủ).
6. **Thứ tự với Sổ tiền lượt 1:** Task 7 của Sổ tiền cũng sửa `MyAssignmentDto` (bỏ `depositAmount`/`remainingAmount`) và `getMyAssignments` (kế hoạch `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md:98`, `:260-261`, nhánh `worktree-agent-aa1fab0316112d404`). **Khuyến nghị:** thi công D1 sau khi Sổ tiền gộp `main`.

### D2. HDV phụ trách thấy xe của đơn mình — bổ sung ADR-0059 (V5, lời chốt 30/9)

1. **Không route mới.** Dùng lại `GET /api/van-chuyen/xe-cua-don/:orderId` của ADR-0059.
2. **Ô quyền mới** `order.vehicle.view` (tên đề xuất) — thay cặp "`trip.view` + `order.view` không ngữ cảnh" của ADR-0059 bằng **một** ô có phạm vi, để bảng quyền nói thẳng ai thấy xe trên đơn:

   | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_PARTNER |
   |---|---|---|---|---|---|---|---|---|
   | any | any | any | **assigned** | none | any | none | none | none |

   - Bốn ô `any` **trùng đúng** tập người ADR-0059 đã duyệt (kể cả hệ quả "tài khoản lai SALES + PARTNER cũng thấy" mà ADR-0059 đã chấp nhận có chủ ý). Mới duy nhất: FIELD `assigned`.
   - **Không** mở `trip.view` cho FIELD: `assigned` của `trip.view` nghĩa là "đang lái chuyến" (`permissions.ts:136`); mở ô đó là mở lịch chung, trái luật ADR-0049.
   - Không thêm mã quyền ⇒ không đụng `EXTERNAL_PERMISSIONS`/trigger LC-1; bài "tập con quyền" và bài ghim cột DRIVER/DRIVER_PARTNER/PARTNER chạy lại với ô mới.
3. **Cổng:** đổi route từ `office` sang **`orders`** (cổng có FIELD, `permissions.ts:210`). Cổng chỉ lọc thô; PARTNER, INTERN qua cổng nhưng bị chặn trong thân (ô `none`).
4. **Thứ tự trong thân** (trước mọi truy vấn `vc_*`):
   1. `orderId` sai dạng → 404;
   2. đơn qua hàm công bố `findOrderOwner` của `orders` (cạnh `van-chuyen → orders` có sẵn), không có → 404;
   3. `assigned = await ctx.isAssigned(orderId)`;
   4. `can(staff, "order.view", { ownerId, assigned })` sai → **404** (không lộ đơn tồn tại — khuôn chi tiết đơn);
   5. `can(staff, "order.vehicle.view", { assigned })` sai → 403. **Không truyền `ownerId`**: ô không có phạm vi `own`, và Đối tác lập đơn không được qua;
   6. truy vấn như ADR-0059 (đọc `v_ord_leg_key` lọc `order_id`, `vc_trip_allocation`, `vc_trip`, `vc_vehicle`, `vc_trip_driver`, nhãn hồ sơ tài xế).
5. **Danh sách trường theo người xem (4.4, dựng mới từng khoá):**
   - người qua bằng ô `any` (văn phòng): **đúng** DTO của ADR-0059, không đổi;
   - người chỉ qua bằng phạm vi `assigned` (HDV phụ trách): **DTO hẹp** `{ chang: [{ legId, xe: [{ bienSo, tenTaiXe | null }] }] }` — đúng lời chủ "biển số và tên tài xế". **Không** `soKhach`, **không** `trangThai` chuyến; và như ADR-0059: không SĐT tài xế, không khách khác, không `place_key`, không mã chuyến, không tiền.
   - Chọn DTO nào do **máy chủ** quyết theo nhánh quyền đã qua ở bước 4.5 (hàm thuần một nơi), không theo tham số trình duyệt.
   - *Giả định người soạn (đảo được):* bỏ `soKhach`/`trangThai` cho HDV vì lời chủ chỉ nói "biển số và tên tài xế". Muốn HDV thấy thêm thì nới danh sách trường, không đổi quyền.
6. **Giao diện:** chi tiết đơn gọi route khi `can(me, "order.vehicle.view", { assigned: true })` đúng phía trình duyệt (HDV chỉ mở được đơn mình phụ trách nên đơn đang mở là đơn phụ trách; máy chủ vẫn là chốt thật). Khối hiện "Xe 79B-123.45 · Tài xế Nguyễn Văn A" + dòng nhỏ **"Có thể thay đổi"**; chặng chưa xếp: "Chưa xếp xe". Lỗi / 403 ⇒ ẩn khối, không hỏng trang.
7. **Nhật ký chuyến vẫn không gắn đơn** (ADR-0059 Quyết định 5 giữ): HDV không thấy xe qua lịch sử đơn.
8. **Quan hệ với V6** ("HDV và tài xế liên lạc"): ADR này chỉ cho HDV **biết tên** tài xế và biển số. SĐT hai chiều vẫn là câu V6 còn mở.
9. **Thứ tự:** thi công **sau** ADR-0059 (sửa route đã có); nếu cùng một lát thì làm ADR-0059 trước rồi bổ sung, mỗi phần một commit.

---

## Hệ quả

- **Mã:** `src/shared/contracts.ts` (`customerNote` vào `MyAssignmentDto`; DTO hẹp cho HDV cạnh DTO của ADR-0059); `src/modules/orders/index.ts:377-413`; `src/shared/permissions.ts` (ô `order.vehicle.view` + chú thích); route `xe-cua-don` trong `src/modules/van-chuyen/` (đổi cổng, đổi lần hỏi quyền, thêm nhánh DTO hẹp); `web/viec-cua-toi.ts` (ghi chú), trang chi tiết đơn (điều kiện gọi route + dòng "Có thể thay đổi").
- **Ô quyền:** thêm **một** ô; hàng rào 1 (`src/permission-enforcement.test.ts`) đòi route hỏi ô; ảnh chụp `src/route-access.test.ts` đổi cổng của route (`office` → `orders`) — **không** mở mục hoãn.
- **Không migration, không bảng/view mới.**
- **Việc lớn** (quyền) ⇒ người kiểm độc lập chỉ-đọc sau thi công.

## Bài kiểm / hàng rào (sửa cố ý → đỏ → hoàn nguyên; dòng `docs/SO-HANG-RAO.md` kèm ngày)

1. **V2 (e2e):** HDV phụ trách gọi `/api/dispatch/mine` → có `customerNote` đúng; bài khoá khoá của `MyAssignmentDto` (liệt kê chính xác) — thêm tạm một khoá lạ → đỏ.
2. **V2 không lan:** `tai-xe-dto.test.ts` vẫn xanh; bài mới "DTO hàng chờ không có `customerNote`" (thêm tạm → đỏ).
3. **D2 quyền (e2e):** Bán hàng, Kế toán, Quản trị, Toàn quyền → 200 (DTO đầy đủ của ADR-0059, không đổi so với trước); HDV **đang phụ trách** → 200 (DTO hẹp); HDV **không** phụ trách → 404; Đối tác (đơn tự lập), Thực tập (đơn tự lập) → 403; Tài xế → chặn ở cổng.
4. **D2 danh sách trường:** bài liệt kê khoá chính xác của **cả hai** DTO; DTO của HDV không có `soKhach`, `trangThai`; số lạ đặt vào SĐT tài xế và tên khách cùng chuyến **không** xuất hiện trong JSON (khuôn số lạ của Sổ tiền NT-B1).
5. **D2 không mở lịch:** HDV gọi `/api/van-chuyen/lich`, `…/chuyen/:id` vẫn 403 (ô `trip.view` không đổi).
6. **Hàng rào 1:** bỏ tạm câu `can(order.vehicle.view…)` khỏi route → `src/permission-enforcement.test.ts` đỏ.
7. Các bài của ADR-0059 vẫn xanh cho bốn quyền văn phòng.
8. `npm test`, `npm run typecheck`, `npm run test:e2e`; kịch bản Chrome trang đơn (văn phòng + HDV) + "Việc của tôi" (bảng `web/CLAUDE.md`; nhớ: trang của tài khoản nào mở SAU CÙNG).

## Phương án bị loại

- **Route thứ hai cho HDV** (bản nháp trước `GET /api/van-chuyen/don/:orderId/xe`): hai route cho một dữ liệu; lời chủ "làm sau ADR-0059" = bổ sung, không lặp.
- **Giữ cặp `trip.view` + `order.view` rồi thêm nhánh "FIELD + `ctx.isAssigned`" viết tay trong route:** luật quyền nằm ngoài bảng quyền (hàng rào 1 không thấy), dễ lọt tài khoản lai.
- **Mở `trip.view` cho FIELD `assigned`:** đổi nghĩa ô, mở lịch chung.
- **Cho HDV dùng DTO đầy đủ của ADR-0059:** thêm số khách trên xe / trạng thái chuyến ngoài lời chủ; nới sau được nếu chủ muốn.
- **Che số trong ghi chú đơn ở "Việc của tôi":** không bớt lộ gì (SĐT đã có cùng thẻ).

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0059 Quyết định 1 | "`GET /api/van-chuyen/xe-cua-don/:orderId`, cổng `office`." | "…, cổng **`orders`** (ADR-0064 D2.3)." |
| ADR-0059 Quyết định 2 | "**Hai lần hỏi quyền trong thân route** …: `can(staff, "trip.view")` **không truyền ngữ cảnh** … `can(staff, "order.view")` **không truyền ngữ cảnh** … Sai một trong hai ⇒ 403. Đơn không tồn tại ⇒ 404." | "Đơn không tồn tại hoặc `can(order.view, { ownerId, assigned })` sai ⇒ 404; `can(order.vehicle.view, { assigned })` sai ⇒ 403 (ADR-0064 D2.2, D2.4)." |
| ADR-0059 Quyết định 3 (danh sách trường) | "`{ chang: [{ legId, xe: [{ bienSo, tenTaiXe \| null, soKhach, trangThai }] }] }`" | giữ cho người qua bằng ô `any`; thêm "HDV đang phụ trách: `{ chang: [{ legId, xe: [{ bienSo, tenTaiXe \| null }] }] }` (ADR-0064 D2.5)." |
| ADR-0059 Quyết định 4 (giao diện) | "chi tiết đơn gọi route **chỉ khi** `can(me, "trip.view")` và `can(me, "order.view")` đúng ở phía trình duyệt" | "… chỉ khi `can(me, "order.vehicle.view", { assigned: true })` đúng; thêm dòng nhỏ "Có thể thay đổi" (ADR-0064 D2.6)." |
| ADR-0059 bảng quyền, dòng FIELD | "\| FIELD (HDV) \| **Không** \| `trip.view` none — luật ADR-0049 \|" | "\| FIELD (HDV) \| **Chỉ đơn đang phụ trách**, chỉ biển số + tên tài xế \| `order.vehicle.view` = assigned (ADR-0064) \|" |
| ADR-0049 tóm tắt điểm 6 (`:31`) | "Hướng dẫn viên, Đối tác không thấy." | "… không thấy (ngoại lệ hẹp ADR-0064 D2: HDV đang phụ trách thấy biển số + tên tài xế của xe chở khách **đơn đó** trên trang đơn; vẫn không thấy lịch, chuyến, khách khác, SĐT tài xế)." |
| [HĐ] Q1 (`docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md:10`) — lời chủ | "HDV, Đối tác không thấy lịch xe" | **Giữ nguyên** (trang đơn không phải lịch xe); ngoại lệ như dòng trên. |
| ADR-0049 D3 danh sách trường cho tài xế (`:238`) | "Không bao giờ: … ghi chú đơn …" | **Không đổi** (lời chủ V2 "tài xế KHÔNG"). |
| ADR-0052 `:165` | "… Hướng dẫn viên … **không** nhận tin chuyến nào … đúng lời chủ Q1" | **Không đổi**: không gửi tin chuyến cho HDV. |

## Câu hỏi còn mở

Không còn câu mở cho chủ: phạm vi đã có lời chốt 30/9. Giả định bề mặt (DTO hẹp cho HDV) ghi ở D2.5.

## Chưa kiểm

- Mã của ADR-0059 chưa có trên `main`; D2 đo theo nội dung ADR-0059 (nhánh `worktree-phan-tich-gop-y`), chưa đo theo mã thi công.
- Sau khi chuyến kết thúc, suất có còn "mở" không (ADR-0059 chọn: chuyến đã kết thúc vẫn hiện) — chưa đọc luật đóng suất của `0042`.
- Bản sửa lần 2–3 chưa có người kiểm độc lập.
