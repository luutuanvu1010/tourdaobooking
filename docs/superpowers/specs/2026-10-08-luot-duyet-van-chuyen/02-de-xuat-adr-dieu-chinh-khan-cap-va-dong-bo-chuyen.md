# ADR-0103 (số tạm) — Điều chỉnh khẩn cấp sát giờ và Đồng bộ chuyến theo đơn

> **Trạng thái:** **proposed**, bản nháp của người soạn ngày 2026-10-08. Chủ chưa duyệt; AI không tự duyệt (Hiến pháp N3, Điều 7.2). Chủ duyệt rồi người điều phối mới chép vào `docs/adr/`.
> **Số tạm 0103** = số lớn nhất trong `docs/adr/` (0102) + 1. Ngày 8/10 đã kiểm `docs/adr/` của mọi nhánh trong `git branch -a` (lớn nhất 0102) và `git grep "ADR-0103"` trên từng nhánh (không có). Hai số 0091 và 0093 đang giữ cho đề xuất lượt 3.
> **Thay đề xuất ADR-0091** ("Bán hàng phá lệ mốc 6 giờ, nhãn 'Ngoại lệ 6 giờ'", `docs/superpowers/specs/2026-10-02-luot-duyet-3-pin-tam-va-ngoai-le-6-gio.md`, chưa từng được duyệt). ADR-0093 trong cùng tệp đó không bị đụng.
> **Mốc đo mã:** mọi `tệp:dòng` đo trên nhánh `claude/van-chuyen-goi-a-c` @ `809918d5`.
> **Lời chủ (nguyên văn phần liên quan):**
> - Nhiệm vụ gốc: *"Cơ chế điều chỉnh khẩn cấp sát giờ: KHÔNG dùng khái niệm 'Xin phá lệ'. Áp dụng phân quyền vai trò (Role-based): Cho phép Điều phối viên (Dispatcher) và Quản trị thực hiện điều động/rút khách sát giờ qua chức năng 'Điều chỉnh khẩn cấp' (bắt buộc chọn/nhập lý do nghiệp vụ và tự động ghi nhật ký audit_log). Xây dựng lệnh máy tự động 'Đồng bộ chuyến theo đơn' (lenhCapNhatKhach) để tự giải phóng/mở lại suất khi Bán hàng hủy/bớt khách trên đơn mà không bị vướng mốc khóa."*
> - Chat 2026-10-08: *"Bán hàng và Quản trị"* (ai được Điều chỉnh khẩn cấp). Nền tảng không có vai "Điều phối viên"; người giữ ô xếp xe `trip.dispatch` là Bán hàng, Quản trị, Toàn quyền (`src/shared/permissions.ts:188`).
> - Lời chủ 2026-10-02 (câu 5, lượt 3): *"cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"*.
> **Nguồn phân tích:** `docs/superpowers/specs/2026-10-07-danh-gia-erp-van-chuyen-ban-hang.md`: C03, C04, C05, C06, N2 và Gói B (B1, B2). Bằng chứng ở `docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/du-lieu/verify.json`.

## Cho chủ dự án

Hôm nay, trong 6 giờ trước giờ xe chạy, Bán hàng không tự xếp, rút hay dời khách được mà phải nhờ Quản trị. Thêm vào đó, khi đơn bị huỷ hay bớt khách, chuyến xe không tự đổi theo, nên có lúc cả xe ghép không xuất bến được cho tới khi có Quản trị. Văn bản này làm hai việc theo lời bạn. Việc thứ nhất là "Điều chỉnh khẩn cấp": Bán hàng và Quản trị tự làm các việc với khách sát giờ, bắt buộc chọn lý do, máy ghi nhật ký, và không còn khái niệm "xin phá lệ". Việc thứ hai là "Đồng bộ chuyến theo đơn": khi đơn bị huỷ hay bớt khách, máy tự trả ghế trên xe chưa chạy mà không vướng mốc 6 giờ. Bạn cần trả lời ba câu ở cuối phần này rồi duyệt.

**Việc 1 — Điều chỉnh khẩn cấp.** Trong 6 giờ trước giờ chạy, Bán hàng, Quản trị và Toàn quyền tự xếp khách lên xe, rút khách, dời khách sang xe khác, hay thêm khách vào xe đang chạy. Bán hàng làm được cho mọi đơn, vì người trực đêm phải lo cả đơn của người khác; còn Kế toán, hướng dẫn viên, đối tác, thực tập và tài xế thì không làm được. Mỗi lần bấm, người làm phải chọn một lý do trong danh sách do Quản trị quản lý ở màn "Lý do". Mục "Khác" không có ô gõ chữ, vì ngày 29/9 bạn đã chọn chưa làm ô chữ tự do trong chuyến xe.

Máy ghi nhật ký gồm ai làm, lúc nào, lệnh gì, mã chuyến, mã đơn, số khách, lý do và còn bao nhiêu phút tới giờ chạy, nhưng không ghi tên, năm sinh hay số điện thoại của khách. Chuyến và đơn mang nhãn riêng "Điều chỉnh khẩn cấp", đúng ý bạn ngày 2/10 là phải có nhãn để nhận ra; tài xế không thấy nhãn này. Tài xế đang được xếp lái chuyến đó sẽ nhận tin "khách trên xe vừa thay đổi", điều mà hôm nay chưa có. Giới hạn vẫn giữ: không ai được chở quá số chỗ của xe, kể cả Toàn quyền, và con số 6 giờ không đổi.

**Việc 2 — Đồng bộ chuyến theo đơn.** Máy chạy ngay trong lần bấm của người vừa huỷ đơn, bớt khách, đổi danh sách khách hay bỏ một chặng đưa đón, chứ không có việc chạy ngầm về sau. Trên xe chưa chạy, máy trả ghế của khách không còn đi mà không cần Quản trị và không vướng mốc 6 giờ, vì máy chỉ làm theo đơn. Máy trả ghế chưa gắn tên trước; nếu mọi ghế còn lại đều mang tên người vẫn còn trong đơn thì máy không đoán, mà giữ xe và báo người xếp xe sửa tên trên đơn. Trên xe đang chạy, máy không rút ghế vì luật xe đang chạy cấm việc đó; máy chỉ đánh dấu "văn phòng báo huỷ" cho khách của đơn bị huỷ và báo tài xế, rồi tài xế vẫn tới điểm và bấm "Khách đã huỷ". Việc đơn thêm khách thì tuỳ câu Q-2.

Nhật ký của máy ghi tên người đã sửa đơn, vì máy chạy trong chính lệnh của người đó, và tài xế cũng nhận tin. Khi máy không làm được, ví dụ hai người cùng sửa một chuyến đúng lúc đó, chuyến bị giữ như hôm nay và nút "Cập nhật khách theo đơn" vẫn còn để bấm tay.

**Điều bạn cần biết (nói một lần — Hiến pháp P18).** Văn bản này đảo hai lựa chọn cũ của bạn: ngày 29/9 bạn chọn chỉ Quản trị, Toàn quyền được vượt mốc 6 giờ, và ngày 29–30/9 bạn chọn "giữ chuyến, có nút cập nhật" thay vì để máy tự sửa chuyến. Tôi cho máy chạy trong lệnh của người và ghi tên người đó, vì một việc tự chạy ngầm mà không có tài khoản riêng là đúng loại lỗ đang có hạn vá trong sổ. Hệ quả là khi hướng dẫn viên hay đối tác huỷ hoặc bớt khách, máy cũng trả ghế trên xe dù họ không có quyền xếp xe; máy chỉ chạm ghế của đúng đơn đó. Ngoài ra, lượt duyệt hôm nay có bốn quyết định đụng quyền hoặc dữ liệu, trong khi luật chỉ cho tối đa ba, nên cách chia lượt nằm ở trang ghép (tệp 00).

**Ba câu hỏi.**
- **Q-1.** Ngoài việc với khách, Bán hàng có được Điều chỉnh khẩn cấp các việc sau sát giờ không: đổi xe, đổi tài xế, huỷ chuyến còn khách, bỏ qua khoảng nghỉ giữa hai chuyến, bỏ qua cam kết xe riêng?
  - (a) **Không, vẫn chỉ Quản trị, Toàn quyền (khuyến nghị).** Lời bạn nói "điều động/rút khách"; đổi xe hay tài xế sát giờ là việc nặng hơn.
  - (b) Có.
- **Q-2.** Khi đơn thêm khách, máy có tự thêm ghế trên cùng xe nếu xe còn chỗ không?
  - (a) **Có (khuyến nghị):** chỉ thêm đúng số khách vừa thêm trên đơn, trên đúng xe đó, cùng điểm đón, khi xe còn chỗ và không phạm cam kết xe riêng. Không đủ chỗ thì giữ xe và báo người xếp xe.
  - (b) Không: máy chỉ tự trả ghế; thêm ghế do người xếp xe làm (dùng Điều chỉnh khẩn cấp nếu đã sát giờ).
- **Q-3.** Xác nhận một đơn đặt sát giờ (hôm nay cần Quản trị bấm "Đặt gấp") — Bán hàng có tự làm bằng Điều chỉnh khẩn cấp không?
  - (a) **Có, cùng danh sách lý do và cùng nhãn (khuyến nghị).** Bạn đã cho phép điều này ngày 2/10; nếu không mở thì đơn sát giờ vẫn kẹt khi vắng Quản trị.
  - (b) Không, giữ Quản trị duyệt.

**Câu duyệt gợi ý:** "Duyệt ADR-0103: Điều chỉnh khẩn cấp cho Bán hàng, Quản trị (xếp, rút, dời khách sát giờ; lý do chọn từ danh sách; tài xế nhận tin) và Đồng bộ chuyến theo đơn (máy trả ghế khi đơn huỷ hoặc bớt khách, chạy trong lệnh của người sửa đơn); Q-1 a, Q-2 a, Q-3 a; bỏ đề xuất ADR-0091."

---

## Phần kỹ thuật

### Bối cảnh mã (đo @ `809918d5`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Bảy lệnh khoá theo mốc | `XEP, RUT, DOI_DI, DOI_DEN, DOI_XE, DOI_TAI_XE, HUY_CO_KHACH` | `src/shared/moc-toi-thieu.ts:65`; lệnh không khoá `DOI_DIEM_THEO_CHANG`, `DOI_KHACH_THEO_DON` `:56-62` |
| Dấu đặt gấp miễn mốc lúc xếp | chỉ `XEP`, `DOI_DEN` | `moc-toi-thieu.ts:67, :104` |
| Luật được phá lệ | `MOC_TOI_THIEU`, `KHOANG_NGHI`, `CAM_KET` | `src/shared/dieu-phoi-kieu.ts:85` |
| Một ô canh cả ba luật | các route hỏi `(phaLe ‖ nghiPhaLe ‖ camKetPhaLe) && !can(trip.override)` | `src/modules/van-chuyen/index.ts:1124, 1197, 1230, 1277, 1325, 1348, 1373` |
| Ô | `trip.dispatch` SALES/ADMIN/SA `any`; `trip.override` ADMIN/SA `any`; `order.leg.short_notice` ADMIN/SA `any` | `src/shared/permissions.ts:188, 189, 83` |
| Xe đang chạy luôn trong mốc | — | `src/shared/dieu-phoi-kiem.ts:277` |
| Phá lệ được lưu | `vc_trip_event.override_rule_code`, `override_reason_code` | `migrations/0042_chuyen_xe.sql:164-165, :175` |
| Lý do phá lệ | nhóm `PHA_LE` của `vc_reason` (dữ liệu, Quản trị sửa — `admin.manage`); gieo "Sự cố vận hành", "Đơn đặt gấp", "Khác" | `migrations/0041_chinh_sach_dieu_phoi.sql:119-122` |
| Lý do đặt gấp (phía đơn) | hằng `LY_DO_DAT_GAP` | `src/shared/chang-dua-don.ts:32-37` |
| Route đặt gấp | hỏi ô, **không** kiểm chặng đang dưới mốc | `src/modules/orders/index.ts:930-958` |
| Chữ "cần Quản trị" | `MOC_TOI_THIEU` có `aiXuLy: "QUAN_TRI"`; `canQuyen` = `can(trip.override)`; dòng "Cần Quản trị phá lệ" | `src/shared/ly-do-giu.ts:58-59`; `src/modules/van-chuyen/dieu-phoi-route.ts:96`; `src/shared/dieu-phoi-man.ts:118, :212`; `src/shared/dat-gap-hien-thi.ts:28, :59` |
| Lệnh "Cập nhật khách theo đơn" | chỉ chuyến `PLANNED`; chỉ suất mang khoá người không còn trong đơn; **bỏ qua** đơn huỷ / chặng đóng (`changXetTheoDon`); không đóng suất thừa chưa tên | `src/modules/van-chuyen/dieu-phoi-lenh.ts:602-654` (bỏ qua ở `:619`); `src/shared/dieu-phoi-kiem.ts:174, :179, :198` |
| Giữ khi đơn huỷ / thiếu / thừa suất | `DON_DA_HUY`, `THIEU_SUAT`, `THUA_SUAT` | `dieu-phoi-kiem.ts:405, :424, :425` |
| Tin chuyến cho tài xế | danh sách đóng, **không** có xếp / rút / dời khách | `src/shared/tin-chuyen.ts:8-12` |
| Mã đóng suất | `CHECK` tập đóng 7 giá trị | `migrations/0042_chuyen_xe.sql:133` |
| Xe đang chạy (LC-15 mới) | trigger chặn mở / đóng suất ngoài bốn đường; báo huỷ chỉ đặt cờ `office_cancel_*` cho suất `WAITING`, lý do nhóm `BAO_HUY_DIEM` | `migrations/0076_xe_dang_chay.sql:23-26, :46-54, :58-80` |
| Hàm tiêm từ gốc lắp ráp | `isAssigned`, `mocToiThieu`, `baoThayDoiChuyen` | `src/index.ts:64, :104, :158-159` |
| Không module nào import `van-chuyen` | — | `src/architecture.test.ts:58-63` |

### Đ1. Điều chỉnh khẩn cấp (thay "phá lệ mốc" và đề xuất ADR-0091)

1. **Ô mới `trip.urgent_adjust`** (tên đề xuất; nhãn giao diện "Điều chỉnh khẩn cấp"):
   - SALES `any`, ADMIN `any`, SUPER_ADMIN `any`; mọi cột khác `none`.
   - Bài ghim: ô này không rộng hơn `trip.dispatch` ở mọi cột (khuôn bài ghim của `trip.call_ack`, `permissions.ts:198-201`).
   - Không thêm mã quyền, nên `EXTERNAL_PERMISSIONS` và trigger LC-1 không đổi.
2. **Một hàm thuần xếp lệnh vào lớp** (đặt ở `src/shared/moc-toi-thieu.ts`, tên đề xuất `lopVuotMoc(lenh)`, trả `"KHAN_CAP"` hoặc `"QUAN_TRI"`):
   - `XEP`, `RUT`, `DOI_DI`, `DOI_DEN` và lệnh thêm khách khi xe chạy (xét mốc như `XEP`, `dieu-phoi-kiem.ts:279`) → `"KHAN_CAP"`;
   - `DOI_XE`, `DOI_TAI_XE`, `HUY_CO_KHACH` → `"QUAN_TRI"` (Q-1 = a).
   - Các route ở bảng trên tách cờ `phaLe` (luật mốc) khỏi `nghiPhaLe` / `camKetPhaLe`. Luật mốc hỏi `lopVuotMoc(lenh) === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")`. Khoảng nghỉ và cam kết vẫn hỏi `trip.override`.
   - Tên ô phải viết **tường minh** trong `src/modules/`: hàng rào "mỗi ô phải được máy chủ hỏi" chỉ đếm chuỗi ô viết thẳng, không đếm ô truyền qua biến (`src/permission-enforcement.test.ts:14`). Vì thế hàm thuần trả lớp, không trả tên ô.
   - `PUT /chuyen/:id` (đổi xe, tài xế, giờ) giữ `trip.override` cho mốc.
3. **Lý do bắt buộc:**
   - Dùng nhóm `PHA_LE` của `vc_reason`. Mã nhóm giữ nguyên vì không hiện ra người dùng (`0041:133-137` cấm đổi mã); nhãn nhóm trên giao diện đổi thành "Điều chỉnh khẩn cấp".
   - Danh sách lý do là dữ liệu. Gợi ý cho Quản trị thêm: "Khách đổi kế hoạch sát giờ", "Gộp hoặc tách xe sát giờ" (cạnh "Sự cố vận hành", "Đơn đặt gấp", "Khác" đã gieo).
   - "Khác" không kèm ô chữ (BL-GHI-CHU-CHUYEN — chủ chọn "Chưa làm" 29/9, `docs/BACKLOG.md`).
4. **Lưu và nhật ký:**
   - Lưu ở cột sẵn có `override_rule_code = 'MOC_TOI_THIEU'`, `override_reason_code` của sự kiện (`0042:164-165`); không thêm cột.
   - Nhật ký dùng hành động hiện có của từng lệnh. Đuôi `detail` đổi chữ "phá lệ" thành "điều chỉnh khẩn cấp" (`dieu-phoi-route.ts:223`), cộng số phút còn lại tới giờ xuất bến.
   - Chỉ mã chuyến, mã đơn, số khách, nhãn lý do (LC-18).
5. **Nhãn "Điều chỉnh khẩn cấp":**
   - Tính lúc đọc từ sự kiện mang `override_rule_code = 'MOC_TOI_THIEU'`.
   - Hiện ở lịch chung, chi tiết chuyến văn phòng, trang đơn.
   - **Không** vào DTO tài xế (danh sách trắng `src/modules/van-chuyen/tai-xe-dto.ts`).
   - Không tin cho Quản trị và không ô đếm trên Trang chủ: khác ADR-0091 đ6–đ7, nên không đổi ADR-0034 điều 4. Quản trị xem bằng nhãn và nhật ký.
6. **Tin cho tài xế:**
   - Lệnh xếp, rút, dời khách mang dấu điều chỉnh khẩn cấp trên chuyến đã có dòng lái mở → tin tới tài xế đang lái (tin không tên, không SĐT).
   - Cờ dấu cấp qua `ctx.chuyenChoTin` từ cột `override_rule_code`; `thongbao` không đọc `detail`.
   - Thêm vào `HANH_DONG_TIN_CHUYEN` (`tin-chuyen.ts:8-12`), kèm điều kiện có dấu.
7. **(Chỉ khi Q-3 = a) Phía đơn:**
   - `order.leg.short_notice` SALES `none` → `any` (`permissions.ts:83`).
   - Route đặt gấp thêm kiểm "chặng đang dưới mốc lúc gửi" cho **mọi** người (siết cả Quản trị). Lý do: dấu đặt gấp miễn mốc lúc xếp (`moc-toi-thieu.ts:104`), nếu đóng dấu trước vài ngày được thì bỏ qua mốc hoàn toàn (ADR-0091 đ2).
   - Lý do giữ `LY_DO_DAT_GAP`.
   - Nhãn "Đặt gấp — Quản trị đã duyệt" (`dat-gap-hien-thi.ts:28`) đổi thành "Điều chỉnh khẩn cấp"; với người chỉ thấy cờ (Đối tác, HDV, Thực tập) là "Điều chỉnh khẩn cấp (văn phòng)".
8. **Không đổi:**
   - luật lõi LC-01…LC-21 (không ai vượt, kể cả Toàn quyền — `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:119`), đặc biệt LC-02 sức chứa;
   - con số `min_lead_minutes`; Toàn quyền `any` mọi ô (ADR-0014 điều 2).

### Đ2. Đồng bộ chuyến theo đơn

1. **Nơi chạy — câu chưa chạy, CÙNG một lô với lệnh đơn** (Hiến chương 1.2 "một lô ghi nguyên khối" `docs/ARCHITECTURE.md:25`; 5.3 "câu lệnh chưa chạy do module chủ cấp" `:95`):
   - Hàm công bố mới của `van-chuyen` (tên đề xuất `cauDongBoChuyen(db, { orderId, actor, cmdId, bayGioMs, sau, tangTheoChang })`) **trả danh sách câu chưa chạy**, không tự ghi.
   - `sau` = trạng thái đơn **sau** lệnh, do route đơn lấy từ bản kế hoạch của chính nó: đơn huỷ hay không, chặng nào đóng, số người và khoá người theo chặng. `tangTheoChang` = số người lệnh này tăng ở từng chặng; vắng = không tăng.
   - Gốc lắp ráp tiêm `ctx.dongBoChuyen(env, actor, {…})` theo khuôn `mocToiThieu` (`src/index.ts:158-159`). `orders` và `dispatch` không import `van-chuyen`.
   - **Tiền lệ đã có:** tạo đơn gộp câu "người phụ trách" của `dispatch` vào cùng `db.batch` (`src/modules/orders/index.ts:730-734`; `src/modules/dispatch/service.ts:42-45`).
2. **Điểm gọi:** route đơn gọi hook **trước** khi ghi, rồi gộp câu trả về vào **cùng** `db.batch` với câu ghi đơn; `await` trong request (không `waitUntil`, không hàng đợi — ĐP8, ADR-0049 `:364`).
   - Thứ tự lô: câu ghi đơn (cổng của đơn đứng đầu như hôm nay) → với mỗi chuyến bị chạm: câu cổng chuyến (`version`, trạng thái chuyến như lúc đọc, **và** điều kiện "cổng đơn đã thắng") → nhật ký `changes() > 0` → các câu suất / sự kiện mang `EXISTS (… last_cmd_id = :cmd)` (ADR-0049 `:98-108`).
   - Thua cổng chuyến → các câu của chuyến đó không làm gì, câu ghi đơn vẫn ghi, chuyến giữ như hôm nay. Thua cổng đơn → không câu nào ghi.
   - Danh sách điểm gọi:
   - `orders`: `POST /api/orders/:id/status` (huỷ, `src/modules/orders/index.ts:1018`), `POST …/legs/:legId/close` (`:909`), `PUT …/legs/:legId` (`:891`, số người chặng), `POST …/passengers` (`:973`), route văn phòng sửa số khách của ADR-0063 D1;
   - `dispatch`: `handler-cancel` (`src/modules/dispatch/index.ts:218`), `handler-money-edit` (`:247`).
   - Bài tĩnh mới: route ghi đơn đã xác nhận mà đổi trạng thái, số người, danh sách khách hay đóng chặng phải gọi hook (khuôn hàng rào Bảng tin `src/bang-tin-guard.test.ts`).
   - Danh sách trên đã đối chiếu với **mọi** khai báo `route("POST"|"PUT"…)` của `src/modules/orders/index.ts` và `src/modules/dispatch/index.ts`. Không cần hook:
     - `POST /api/orders` (`:705`) và `PUT /api/orders/:id` (`:766`, chỉ đơn nháp — `NOT_EDITABLE` khi khác `draft`), vì đơn nháp không có suất;
     - `PUT …/trip` (`:823`) và `POST …/legs` (`:866`), vì chặng mới chưa có suất; đổi giờ / nơi giữ VK1-B (giữ + nút);
     - `short-notice` (`:930`), `booker` (`:994`), `cancel-reason` (`:1085`), `PUT …/handler` (`dispatch :157`).
   - `POST …/passengers` (`:973`) là **một** route cho cả thêm, sửa, huỷ dòng khách (`planPassengerChange`).
   - Route tài xế ghi tên khách `POST /api/van-chuyen/cuoc-cua-toi/:id/hanh-khach` (`src/modules/van-chuyen/index.ts:1691`) nằm trong `van-chuyen`. Lệnh này có tự gắn suất hay phải gọi luật đồng bộ: **chưa kiểm**, người lập kế hoạch xác định.
3. **Phạm vi:**
   - Chỉ các chuyến có suất mở của chặng thuộc **đúng đơn đó**; mỗi chuyến một câu cổng riêng trong lô chung.
   - Lệnh mới `DONG_BO_THEO_DON` có trong `LENH_XEP`, **ngoài** `LENH_KHOA_THEO_MOC` (khuôn `DOI_KHACH_THEO_DON`, `moc-toi-thieu.ts:60-61`).
   - **Không** miễn luật lõi (LC-01, 02, 09, 10, 15).
4. **Luật trên chuyến `PLANNED`.** Một hàm thuần ở `src/shared/`, mở rộng `suatKhachDaDoi` / `moLaiSauDoiKhach`, dùng chung cho máy và cho nút tay:
   - (i) Đơn huỷ, chặng đóng, đơn không còn xác nhận → đóng mọi suất mở của chặng trên chuyến, mã `REMOVED`.
   - (ii) Khoá người không còn trong đơn → đóng `PASSENGER_CHANGED` rồi mở lại theo `moLaiSauDoiKhach` (như lệnh hôm nay).
   - (iii) Suất mở của chặng (đếm trên mọi chuyến, như `kiemXep`) nhiều hơn số người → đóng phần thừa **trên chuyến này**: suất chưa tên trước (theo thứ tự mã suất). Nếu còn thừa mà mọi suất còn lại mang tên người vẫn trong đơn → **không đoán**, giữ `THUA_SUAT`. Chặng có suất mở trên hơn một chuyến → không đoán, giữ.
   - (iv) **Chỉ khi Q-2 = a, và chỉ khi lệnh đơn này vừa tăng người ở chặng đó:** chặng chỉ nằm trên đúng chuyến này → mở thêm **tối đa số người vừa tăng** (`tangTheoChang`), không lấp phần thiếu có sẵn từ trước (ví dụ người xếp xe vừa rút một khách bằng Điều chỉnh khẩn cấp thì máy không tự xếp lại khách đó). Suất mới cùng điểm lên/xuống của suất hiện có, gắn khoá rảnh (`khoaNguoiRanh`, `dieu-phoi-kiem.ts:188`). Điều kiện: LC-02 còn chỗ và `kiemCamKet` không vi phạm; không đạt thì giữ `THIEU_SUAT`.
   - Điểm hết khách → `SKIPPED` mã `BO_QUA_KHONG_CON_KHACH`; cam kết xe riêng xét lại sau giảm (`camKetSauGiam`). Cả hai theo khuôn `lenhCapNhatKhach`.
5. **Chuyến `RUNNING` (LC-15, trigger `0076:58-80`):**
   - Không đóng, không mở suất.
   - Đơn huỷ → đặt `office_cancel_*` cho suất `WAITING` của đơn, theo khuôn D5.2 của ADR-0052 (trigger `0076:46-54`), lý do là một **mã hệ thống mới** nhóm `BAO_HUY_DIEM` ("Đơn đã huỷ").
   - Suất đã `BOARDED`, hoặc việc bớt khách / đổi người trên xe đang chạy → không tự làm, chỉ báo (Bảng tin chuyến, tin tài xế).
6. **Chuyến đã kết thúc hoặc huỷ:** không làm gì (LC-06).
7. **Người ghi và nhật ký:**
   - `created_by` của sự kiện và `staff_id` của nhật ký = **người vừa sửa đơn**.
   - Hành động nhật ký mới (tên đề xuất `trip_order_synced`, nhãn "Máy cập nhật chuyến theo đơn") và loại sự kiện mới `ALLOCATION_ORDER_SYNCED` (danh sách mở, `0042:157`).
   - `detail`: mã chuyến, mã đơn, số ghế trả / thêm, nguyên nhân dạng nhãn cố định (đơn huỷ / bớt khách / đổi người / bỏ chặng). Không tên, không SĐT (LC-18).
8. **Tin:**
   - Hành động mới vào `HANH_DONG_TIN_CHUYEN` khi chuyến có dòng lái mở.
   - Bảng tin như mọi lệnh chuyến (`baoThayDoiChuyen`, `src/index.ts:104`).
9. **Nút tay "Cập nhật khách theo đơn"** (`POST …/cap-nhat-khach`, `src/modules/van-chuyen/index.ts:1423`):
   - Dùng **cùng** hàm thuần, nên bấm tay gỡ được cả `DON_DA_HUY`, `CHANG_DA_DONG`, `THUA_SUAT` (hôm nay bỏ qua, `dieu-phoi-lenh.ts:619`). Ô `trip.dispatch` giữ nguyên.
   - Cách này gỡ **N2**: một nguyên tắc là "đổi theo đơn → miễn mốc; đổi theo ý người (rút một khách vẫn còn trong đơn) → Điều chỉnh khẩn cấp".
10. **Thua đua:** chuyến thua câu cổng thì phần chuyến không ghi, chuyến giữ như hôm nay, lệnh đơn vẫn thành công (mục 2). Không thử lại tự động. Trigger lõi (LC-02, LC-15) chặn → cả lô hỏng, lệnh đơn trả 409 để người bấm lại; vì cổng chuyến đã kèm trạng thái chuyến, ca này chỉ xảy ra khi mã có lỗi.
11. **Ngoại lệ có tên (quyền ghép):** người không có `trip.dispatch` vẫn làm máy ghi suất trên chuyến, gồm HDV (`handler-cancel`, `handler-money-edit`), Đối tác và Thực tập (huỷ đơn của mình qua `order.modify`). Giới hạn:
    - chỉ suất của chặng thuộc đúng đơn họ vừa sửa;
    - chỉ đóng, hoặc (Q-2 a) mở trong giới hạn số người đơn đã khai và số chỗ của xe;
    - không bao giờ đổi xe, tài xế hay giờ;
    - không trả dữ liệu chuyến về cho người gọi.

### Câu ADR bị thay (nguyên văn → mới; không sửa tệp ADR cũ)

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 `:29` (tóm tắt, ý 4) | "**Chỉ Quản trị, Toàn quyền phá lệ**, kèm lý do." | "Bán hàng, Quản trị, Toàn quyền **điều chỉnh khẩn cấp** xếp / rút / dời khách, kèm lý do; đổi xe, đổi tài xế, huỷ chuyến còn khách: Quản trị, Toàn quyền (ADR-0103 Đ1)." |
| ADR-0049 `:129` (LC-09) | "Đơn huỷ sau khi xếp → **giữ**" | "Đơn huỷ sau khi xếp → máy rút suất trên chuyến chưa chạy, đặt cờ báo huỷ trên chuyến đang chạy (ADR-0103 Đ2); máy chưa làm được thì **giữ**" |
| ADR-0049 `:162` (dòng **Xếp**, cột "Ai phá lệ") | "**chỉ Quản trị, Toàn quyền** (ô mới `trip.override`), kèm lý do nhóm `PHA_LE`" | "lệnh khách: Bán hàng, Quản trị, Toàn quyền (ô `trip.urgent_adjust`); đổi xe, đổi tài xế, huỷ chuyến còn khách: Quản trị, Toàn quyền (`trip.override`); lý do nhóm `PHA_LE`. Lệnh máy 'Đồng bộ chuyến theo đơn' không khoá theo mốc." |
| ADR-0049 `:161` (dòng **Đặt**) — chỉ khi Q-3 = a | "**chỉ Quản trị, Toàn quyền** (ô mới `order.leg.short_notice`), kèm lý do" | "Bán hàng, Quản trị, Toàn quyền, kèm lý do, **chỉ khi chặng đang dưới mốc lúc gửi**" |
| ADR-0049 `:200` (bảng ô) | "`trip.override` — phá lệ mốc lúc xếp, khoảng nghỉ" | "`trip.override` — vượt mốc khi đổi xe, đổi tài xế, huỷ chuyến còn khách; khoảng nghỉ (cam kết: ADR-0056)"; thêm dòng `trip.urgent_adjust` |
| ADR-0049 `:365` (phương án bị loại) | "**Bán hàng tự phá lệ mốc 6 giờ:** chủ chọn chỉ Quản trị, Toàn quyền (ĐP3)." | "Chủ đảo ngày 2026-10-08 (*"Bán hàng và Quản trị"*); phạm vi ở ADR-0103 Đ1." |
| ADR-0050 `:219-221` | "**Vì sao không để máy tự dời khi đơn đổi:** … một việc chạy nền tự sửa chuyến là **tác nhân tự động** (Hiến chương 5.11, K1): cần tài khoản riêng + ADR riêng" | "Đổi **nơi** vẫn giữ chuyến + nút (VK1-B). Huỷ đơn, bớt khách, đổi người, bỏ chặng: máy đồng bộ **trong chính lệnh sửa đơn của người**, ghi tên người đó, không chạy nền (ADR-0103 Đ2) — không phải tác nhân tự động theo 5.11." |
| ADR-0050 `:361` | "**Máy tự dời suất khi đơn đổi:** xem VK1-B." | "… trừ ADR-0103 Đ2." |
| ADR-0052 `:98` (D5.1, mốc) | "mọi chặng khác … → **chỉ Quản trị, Toàn quyền phá lệ** (`trip.override`) kèm lý do" | "→ Bán hàng, Quản trị, Toàn quyền **điều chỉnh khẩn cấp** (`trip.urgent_adjust`) kèm lý do" |
| ADR-0052 `:148` (D6.1, danh sách hành động sinh tin — một chiều) | (danh sách đóng) | "+ đồng bộ chuyến theo đơn; + xếp / rút / dời khách mang dấu điều chỉnh khẩn cấp — chỉ chuyến có tài xế" |
| ADR-0007 điều 4(b) | khuôn hàm tiêm | "+ `ctx.dongBoChuyen`" |
| Sổ hỏi đáp Vận chuyển lần 16, R-P29 (không phải ADR) | "Giữ xe + nút cập nhật" | máy đồng bộ trước; nút giữ làm đường tay |
| Đề xuất ADR-0091 (chưa duyệt) | toàn văn | bỏ; giữ ý "nhãn riêng" của lời chủ 2/10 |

### Cửa một chiều / hai chiều
- **Một chiều (nhẹ):**
  - tên hành động nhật ký, loại sự kiện mới và các trường `detail` (chốt trước dòng đầu);
  - phần thêm vào danh sách tin chuyến (ADR-0052 D6.1 tự ghi danh sách này là một chiều);
  - mã lý do hệ thống mới (không xoá được, chỉ ngưng dùng — `0041:133`);
  - mỗi suất máy đã đóng (chỉ-thêm, lịch sử giữ nguyên).
- **Hai chiều:** ô mới và các ô đổi (gỡ bằng một commit); tập lệnh mỗi ô; luật thuần; danh mục lý do (dữ liệu); hàm tiêm; chữ giao diện.
- **Tránh một chiều nặng:** **không** thêm giá trị `close_reason`, vì đổi `CHECK` ở `0042:133` nghĩa là phải dựng lại bảng `vc_trip_allocation` (ADR-0049 `:325-326`).

### Migration
- Đ1: không cần. Ô nằm ở mã; lý do là dữ liệu Quản trị tự thêm. Nếu chủ muốn gieo sẵn lý do thì đi chung migration của Đ2.
- Đ2: **một migration chỉ thêm một dòng** `vc_reason` (mã hệ thống nhóm `BAO_HUY_DIEM`, nhãn "Đơn đã huỷ").
  - Số = số lớn nhất trong `migrations/` + 1 lúc thi công. Hôm nay lớn nhất là `0083` trên `main` và các nhánh `c14-thay-chang`, `vc-c5-nho`; phải quét lại mọi nhánh lúc thi công.
  - `docs/data-dictionary.json` không đổi cột.

### Bài kiểm / hàng rào
Mỗi rào phải quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày.
1. **Quyền:**
   - Bán hàng xếp / rút / dời trong mốc kèm lý do → 200; thiếu lý do → 400.
   - Bán hàng đổi xe, đổi tài xế, huỷ chuyến còn khách trong mốc → 403 (Q-1 a); Bán hàng bỏ qua khoảng nghỉ hoặc cam kết → 403.
   - Kế toán → 403; Quản trị → 200 mọi lệnh.
2. **LC-02:** Bán hàng điều chỉnh khẩn cấp xếp vượt số chỗ → 409, và SQL tay bị trigger `lc02_capacity` chặn.
3. **Một hàm xếp lớp:** bài quét — mọi chỗ hỏi ô cho luật mốc đều đi qua `lopVuotMoc`; ô `trip.urgent_adjust` có lời gọi `can(` tường minh (hàng rào `src/permission-enforcement.test.ts` xanh mà không khai hoãn).
4. **Đồng bộ:**
   - Huỷ đơn trong mốc (chuyến `PLANNED`) → suất đóng `REMOVED`, chuyến hết `DON_DA_HUY`, xuất bến được, nhật ký mang `staff_id` người huỷ, tài xế nhận tin.
   - HDV huỷ qua `handler-cancel` → như trên, và HDV gọi route xếp vẫn 403.
   - Chuyến `RUNNING` → cờ báo huỷ, không đóng suất.
   - Bớt khách khi có suất chưa tên → đóng suất chưa tên; mọi suất mang tên người còn trong đơn → giữ `THUA_SUAT`; chặng trên hai chuyến → giữ.
   - Thua cổng chuyến → chuyến giữ, lệnh đơn vẫn 200; thua cổng đơn → không suất nào đổi (lô chung).
5. **Bài tĩnh điểm gọi hook:** bỏ một lời gọi → đỏ.
6. **LC-18:** bài quét nhật ký hiện có phủ hành động mới.
7. **Bộ kiểm chung:** `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.

### Phương án bị loại
- **Đổi ô `trip.override` của Bán hàng thành `any`:** các route hỏi chung một ô cho cả ba luật (`van-chuyen/index.ts:1197, :1230` …), nên sẽ mở luôn khoảng nghỉ và cam kết.
- **Nút "Xin phá lệ" và tin cho Quản trị** (báo cáo ERP C04 (iii), ADR-0091 đ7): chủ bác khái niệm này ngày 8/10.
- **Đồng bộ chạy nền, Cron hay hàng đợi:**
  - là tác nhân tự động không định danh, tức xây trên lỗ đang hở HC-5.11;
  - trái ĐP8 (ADR-0049 `:364`).
- **Hai lô: ghi đơn xong rồi mới gọi máy ghi chuyến** (bản nháp đầu của người soạn):
  - đơn giản hơn, vì `van-chuyen` đọc trạng thái đơn đã ghi;
  - nhưng một lệnh thành hai lô, lệch Hiến chương 1.2, và ngược tiền lệ gộp lô của tạo đơn (mục 1);
  - lỗi giữa hai lô để lại đơn đã đổi mà chuyến chưa đổi (vẫn an toàn nhờ "giữ", nhưng hai sự thật lệch nhau).
  - Giá của phương án được chọn: route đơn phải đưa `sau` cho hook, và bảy điểm gọi phải gộp lô. **Người kiểm soi** việc route tính `sau` đúng ở cả bảy điểm.
- **Mã đóng mới cho đồng bộ:** phải dựng lại bảng (xem Cửa một chiều).
- **Hạ con số mốc cho cả hệ thống:** áp cả lúc đặt đơn, cộng lỗi N3 (báo cáo ERP Gói 0 mục 3).

### Sổ dừng dây chuyền (`docs/quyen-hoan.json`)
- **HC-5.11** (HIGH, hạn 2026-11-15, tác vụ tự động không định danh): **không xây trên lỗ này**, với điều kiện Đ2 chạy trong lệnh của người và ghi `staff_id` người đó (bài kiểm 4). Nếu sau này chuyển sang chạy nền thì phải ghi "xây trên lỗ đang hở: HC-5.11" và dừng chờ chủ.
- Các mục HIGH khác (TNV-G1, G3, G4, HC-5.19, HC-4.2) thuộc sổ tiền và sao lưu; Đ1 và Đ2 không ghi bảng `bil_*`.
- Ô hoãn `thao_tac` (`task.progress`, `dispatch.guides.view`, `invoice.*`) không được dùng.

### Chưa kiểm
- Số lần phá lệ thật trên production, ai xếp xe ban đêm, giá trị mốc thật (báo cáo ERP Phần 8 cũng chưa biết).
- Lệnh huỷ đơn chậm thêm bao nhiêu khi phải chờ đồng bộ chuyến; giới hạn số câu trong một `db.batch` của D1 khi một đơn có khách trên nhiều chuyến.
- Mỗi route trong bảy điểm gọi có sẵn đủ trạng thái `sau` trong bản kế hoạch của nó hay phải đọc thêm (người soạn chỉ đọc phần đầu route huỷ đơn và route khách, chưa đọc thân đầy đủ của route nào).
- Bảng tin và tin điện thoại tới máy thật.
- Tranh chấp đồng thời thật trên D1.
- Thân ADR-0096, ADR-0097 (người soạn chưa đọc): luật mới đón trước trả, cửa sổ xuất bến, sự kiện `CORRECTION` có thể chạm hàm đồng bộ, nên người lập kế hoạch phải đối chiếu.
