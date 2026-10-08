# ADR-0104 (số tạm, chốt khi gộp) — Điều chỉnh khẩn cấp sát giờ và Đồng bộ chuyến theo đơn

> **Trạng thái:** **proposed**, bản nháp vòng 2 của người soạn ngày 2026-10-08, đã sửa theo phiếu kiểm độc lập. Chủ chưa duyệt; AI không tự duyệt (Hiến pháp N3, Điều 7.2). Chủ duyệt rồi người điều phối mới chép vào `docs/adr/`.
> **Số tạm 0104, chốt khi gộp.** Số 0103 đã có nhánh `claude/ticket-sales-qr-payment-cf8e18` dùng ở commit `dd8fdbdd` (đề xuất VietQR). Đầu nhánh đó nay ghi số tạm `00xx`, nhưng người điều phối đã chốt 0104 cho tệp này. Kiểm ngày 8/10 sau `git fetch --all`: `git grep -E "ADR-010[3-9]"` trong `docs/` trên 24 nhánh cục bộ và `origin/main` chỉ gặp chính các tệp của thư mục này. Không sửa `docs/adr/README.md`.
> **Thay đề xuất ADR-0091** ("Bán hàng phá lệ mốc 6 giờ, nhãn 'Ngoại lệ 6 giờ'", `docs/superpowers/specs/2026-10-02-luot-duyet-3-pin-tam-va-ngoai-le-6-gio.md`, chưa từng được duyệt) **ở phần xếp xe**. Phần đặt gấp phía đơn chuyển sang tệp 05 (lượt 8b). ADR-0093 trong cùng tệp đó không bị đụng.
> **Mốc đo mã:** mọi `tệp:dòng` đo trên nhánh `claude/van-chuyen-goi-a-c` @ `809918d5`, trừ chỗ ghi rõ nhánh khác.
> **Lời chủ (nguyên văn phần liên quan):**
> - Nhiệm vụ gốc: *"Cơ chế điều chỉnh khẩn cấp sát giờ: KHÔNG dùng khái niệm 'Xin phá lệ'. Áp dụng phân quyền vai trò (Role-based): Cho phép Điều phối viên (Dispatcher) và Quản trị thực hiện điều động/rút khách sát giờ qua chức năng 'Điều chỉnh khẩn cấp' (bắt buộc chọn/nhập lý do nghiệp vụ và tự động ghi nhật ký audit_log). Xây dựng lệnh máy tự động 'Đồng bộ chuyến theo đơn' (lenhCapNhatKhach) để tự giải phóng/mở lại suất khi Bán hàng hủy/bớt khách trên đơn mà không bị vướng mốc khóa."*
> - Chat 2026-10-08: *"Bán hàng và Quản trị"* (ai được Điều chỉnh khẩn cấp). Nền tảng không có vai "Điều phối viên"; người giữ ô xếp xe `trip.dispatch` là Bán hàng, Quản trị, Toàn quyền (`src/shared/permissions.ts:188`).
> - Lời chủ 2026-10-02 (câu 5, lượt 3): *"cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"*.
> **Nguồn phân tích:** `docs/superpowers/specs/2026-10-07-danh-gia-erp-van-chuyen-ban-hang.md`: C03, C04, C05, C06, N2 và Gói B (B1, B2).

## Cho chủ dự án

Hôm nay, trong 6 giờ trước giờ xe chạy, Bán hàng không tự xếp, rút hay dời khách được mà phải nhờ Quản trị. Thêm vào đó, khi đơn bị huỷ hay bớt khách, chuyến xe không tự đổi theo, nên có lúc cả xe ghép không xuất bến được cho tới khi có Quản trị. Văn bản này làm hai việc theo lời bạn. Việc thứ nhất là "Điều chỉnh khẩn cấp": Bán hàng và Quản trị tự làm các việc với khách sát giờ, bắt buộc chọn lý do, máy ghi nhật ký, và không có bước "xin phá lệ". Việc thứ hai là "Đồng bộ chuyến theo đơn": khi đơn bị huỷ hay bớt khách, máy tự trả ghế trên xe chưa chạy mà không vướng mốc 6 giờ. Bạn cần trả lời hai câu ở cuối rồi duyệt.

**Việc 1 — Điều chỉnh khẩn cấp.** Trong 6 giờ trước giờ chạy, Bán hàng, Quản trị và Toàn quyền tự xếp khách lên xe, rút khách, dời khách sang xe khác, hay thêm khách vào xe đang chạy. Bán hàng làm được cho mọi đơn, vì người trực đêm phải lo cả đơn của người khác; còn Kế toán, hướng dẫn viên, đối tác, thực tập và tài xế thì không làm được. Mỗi lần bấm, người làm phải chọn một lý do trong danh sách do Quản trị quản lý ở màn "Lý do". Mục "Khác" không có ô gõ chữ, vì ngày 29/9 bạn đã chọn chưa làm ô chữ tự do trong chuyến xe.

Máy ghi nhật ký gồm ai làm, lúc nào, lệnh gì, mã chuyến, mã đơn, số khách, lý do và còn bao nhiêu phút tới giờ chạy, nhưng không ghi tên, năm sinh hay số điện thoại của khách. Chuyến có thay đổi khách kiểu này mang nhãn riêng "Điều chỉnh khẩn cấp" trên lịch xe và trang chuyến, đúng ý bạn ngày 2/10 là phải có nhãn để nhận ra; tài xế không thấy nhãn này. Tài xế đang được xếp lái chuyến đó sẽ nhận tin "khách trên xe vừa thay đổi", điều mà hôm nay chưa có. Giới hạn vẫn giữ: không ai được chở quá số chỗ của xe, kể cả Toàn quyền, và con số 6 giờ không đổi.

Những việc nặng hơn như đổi xe, đổi tài xế, huỷ chuyến còn khách, bỏ qua khoảng nghỉ hay cam kết xe riêng vẫn chỉ Quản trị và Toàn quyền làm, và trên màn hình vẫn gọi là "Phá lệ" (nếu bạn chọn Q-1 a). Điều này không trái lời bạn "không dùng xin phá lệ", vì không có nút xin, không có bước chờ duyệt: Quản trị tự làm bằng quyền của vai mình, đúng tinh thần "phân quyền theo vai".

**Việc 2 — Đồng bộ chuyến theo đơn.** Máy chạy ngay trong lần bấm của người vừa huỷ đơn, bớt khách, đổi danh sách khách hay bỏ một chặng đưa đón, và ghi chung một lần với việc sửa đơn, chứ không có việc chạy ngầm về sau. Trên xe chưa chạy, máy trả ghế của khách không còn đi mà không cần Quản trị và không vướng mốc 6 giờ, vì máy chỉ làm theo đơn. Máy trả ghế chưa gắn tên trước; nếu mọi ghế còn lại đều mang tên người vẫn còn trong đơn thì máy không đoán, mà giữ xe và báo người xếp xe sửa tên trên đơn. Khi đơn thêm khách thì tuỳ câu Q-2; nếu bạn chọn Q-2 a thì cả lúc hướng dẫn viên sửa số khách ở "Việc của tôi", máy cũng tự mở thêm ghế trên xe.

Trên xe đang chạy, máy không ghi gì vào chuyến, vì luật xe đang chạy chỉ cho văn phòng bấm "Báo huỷ" từng khách. Máy chỉ nhắc: người vừa huỷ đơn thấy câu "đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ", và màn "Xe đang chạy" hiện dòng nhắc tương tự, để văn phòng bấm như hôm nay.

Nhật ký của máy ghi tên người đã sửa đơn, vì máy chạy trong chính lệnh của người đó, và tài xế cũng nhận tin. Máy chỉ tự xử lý một lượng ghế vừa phải mỗi lần; đơn đoàn rất lớn thì máy chỉ báo, và người xếp xe bấm nút "Cập nhật khách theo đơn" cho từng xe. Khi hai người cùng đụng một chuyến đúng lúc đó, phần sửa đơn vẫn được lưu, chỉ phần chuyến bị bỏ qua và chuyến bị giữ như hôm nay, nút "Cập nhật khách theo đơn" vẫn còn để bấm tay.

**Điều bạn cần biết (nói một lần — Hiến pháp P18).** Văn bản này đảo hai lựa chọn cũ của bạn: ngày 29/9 bạn chọn chỉ Quản trị, Toàn quyền được vượt mốc 6 giờ, và ngày 29–30/9 bạn chọn "giữ chuyến, có nút cập nhật" thay vì để máy tự sửa chuyến. Tôi cho máy chạy trong lệnh của người và ghi tên người đó, vì một việc tự chạy ngầm mà không có tài khoản riêng là đúng loại lỗ đang có hạn vá trong sổ. Hệ quả là khi hướng dẫn viên hay đối tác huỷ hoặc bớt khách, máy cũng trả ghế trên xe dù họ không có quyền xếp xe; máy chỉ chạm ghế của đúng đơn đó. Để ghi chung một lần, một bài kiểm tự động về thứ tự ghi phải được nới có tên cho đúng kiểu ghi này, nên câu duyệt có ghi điều đó. Việc cho Bán hàng tự duyệt đơn đặt sát giờ đã chuyển sang lượt sau (tệp 05).

**Hai câu hỏi.**
- **Q-1.** Ngoài việc với khách, Bán hàng có được Điều chỉnh khẩn cấp các việc sau sát giờ không: đổi xe, đổi tài xế, huỷ chuyến còn khách, bỏ qua khoảng nghỉ giữa hai chuyến, bỏ qua cam kết xe riêng?
  - (a) **Không, vẫn chỉ Quản trị, Toàn quyền (khuyến nghị).** Lời bạn nói "điều động/rút khách"; đổi xe hay tài xế sát giờ là việc nặng hơn.
  - (b) Có.
- **Q-2.** Khi đơn thêm khách, máy có tự thêm ghế trên cùng xe nếu xe còn chỗ không?
  - (a) **Có (khuyến nghị):** chỉ thêm đúng số khách vừa thêm trên đơn, trên đúng xe đó, cùng điểm đón, khi xe còn chỗ và không phạm cam kết xe riêng. Không đủ chỗ thì giữ xe và báo người xếp xe.
  - (b) Không: máy chỉ tự trả ghế; thêm ghế do người xếp xe làm (dùng Điều chỉnh khẩn cấp nếu đã sát giờ).

**Câu duyệt gợi ý:** "Duyệt ADR-0104: Điều chỉnh khẩn cấp cho Bán hàng, Quản trị (xếp, rút, dời, thêm khách sát giờ; lý do chọn từ danh sách; tài xế nhận tin; chữ 'Phá lệ' giữ cho việc riêng của Quản trị) và Đồng bộ chuyến theo đơn (máy trả ghế trên xe chưa chạy khi đơn huỷ hoặc bớt khách, ghi chung một lần với lệnh sửa đơn; xe đang chạy chỉ nhắc văn phòng Báo huỷ); Q-1 a, Q-2 a; đồng ý nới có tên bài kiểm thứ tự ghi cho kiểu ghi chung đơn và chuyến; bỏ đề xuất ADR-0091 (phần đặt gấp hỏi ở lượt sau)."

---

## Phần kỹ thuật

### Bối cảnh mã (đo @ `809918d5`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Bảy lệnh khoá theo mốc | `XEP, RUT, DOI_DI, DOI_DEN, DOI_XE, DOI_TAI_XE, HUY_CO_KHACH` | `src/shared/moc-toi-thieu.ts:65`; lệnh không khoá `DOI_DIEM_THEO_CHANG`, `DOI_KHACH_THEO_DON` `:56-62` |
| Dấu đặt gấp miễn mốc lúc xếp | chỉ `XEP`, `DOI_DEN` | `moc-toi-thieu.ts:67, :104` |
| Luật được phá lệ | `MOC_TOI_THIEU`, `KHOANG_NGHI`, `CAM_KET` | `src/shared/dieu-phoi-kieu.ts:85` |
| Một ô canh cả ba luật | các route hỏi `(phaLe ‖ nghiPhaLe ‖ camKetPhaLe) && !can(trip.override)` | `src/modules/van-chuyen/index.ts:1124, 1197, 1230, 1277, 1325, 1348, 1373` |
| Ô | `trip.dispatch` SALES/ADMIN/SA `any`; `trip.override` ADMIN/SA `any` | `src/shared/permissions.ts:188, 189` |
| Xe đang chạy luôn trong mốc | — | `src/shared/dieu-phoi-kiem.ts:277` |
| Phá lệ được lưu | `vc_trip_event.override_rule_code`, `override_reason_code` | `migrations/0042_chuyen_xe.sql:164-165, :175` |
| Lý do phá lệ | nhóm `PHA_LE` của `vc_reason` (dữ liệu, Quản trị sửa — `admin.manage`); gieo "Sự cố vận hành", "Đơn đặt gấp", "Khác" | `migrations/0041_chinh_sach_dieu_phoi.sql:119-122` |
| Lệnh "Cập nhật khách theo đơn" | chỉ chuyến `PLANNED`; chỉ suất mang khoá người không còn trong đơn; **bỏ qua** đơn huỷ / chặng đóng; không đóng suất thừa chưa tên | `src/modules/van-chuyen/dieu-phoi-lenh.ts:602-654` (bỏ qua ở `:619`); `src/shared/dieu-phoi-kiem.ts:174, :179, :198` |
| Lô của lệnh đó | cổng → nhật ký → **một** sự kiện → đóng / mở suất → bỏ điểm → cam kết | `src/modules/van-chuyen/dieu-phoi.ts:465-477`; sự kiện lấy id = mã lệnh (`:78-82`) |
| Giữ khi đơn huỷ / thiếu / thừa suất | `DON_DA_HUY`, `THIEU_SUAT`, `THUA_SUAT` | `dieu-phoi-kiem.ts:405, :424, :425` |
| Tin chuyến cho tài xế | danh sách đóng, **không** có xếp / rút / dời khách; có `trip_allocation_office_cancelled` | `src/shared/tin-chuyen.ts:8-12` |
| Mã đóng suất | `CHECK` tập đóng 7 giá trị | `migrations/0042_chuyen_xe.sql:133` |
| Báo huỷ trên xe đang chạy | trigger chỉ cho đặt cờ `office_cancel_*` khi lệnh cuối của chuyến là sự kiện `ALLOCATION_OFFICE_CANCELLED` của **đúng suất đó** | `migrations/0076_xe_dang_chay.sql:46-54`; bài `src/modules/van-chuyen/xe-dang-chay-csdl.test.ts:297` ("lô không phải báo huỷ" bị chặn) |
| Cổng thắng của lệnh đơn | `wonGuard` = `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`; thua thì mọi câu sau lặng lẽ không chạy | `src/modules/orders/repository.ts:769, :944` |
| Bài thứ tự lô | câu cổng đứng đầu; ngoại lệ có tên `GHI_NGOAI` cho câu do module khác cấp | `src/modules/van-chuyen/thu-tu-lo.test.ts:3-13` |
| Hàm tiêm từ gốc lắp ráp | `isAssigned`, `mocToiThieu`, `baoThayDoiChuyen` | `src/index.ts:64, :104, :158-159` |
| Không module nào import `van-chuyen` | — | `src/architecture.test.ts:58-63` |

### Đ1. Điều chỉnh khẩn cấp (thay "phá lệ mốc" ở lệnh khách và phần xếp xe của đề xuất ADR-0091)

1. **Ô mới `trip.urgent_adjust`** (tên đề xuất; nhãn giao diện "Điều chỉnh khẩn cấp"):
   - SALES `any`, ADMIN `any`, SUPER_ADMIN `any`; mọi cột khác `none`.
   - Bài ghim: ô này không rộng hơn `trip.dispatch` ở mọi cột (khuôn bài ghim của `trip.call_ack`, `permissions.ts:198-201`).
   - Không thêm mã quyền, nên `EXTERNAL_PERMISSIONS` và trigger LC-1 không đổi.
   - Thi công **phải sửa** hai bài sẵn có: `src/shared/permissions.test.ts:95` (bảng ADR trong bài phải có hàng ô mới) và `src/shared/tro-ly-cau-truc.test.ts:38-39` (mọi ô phải có tên trong `TEN_THAO_TAC` của `src/shared/tro-ly-cau-truc-ten.ts`). Đây là thêm hàng, không phải nới.
2. **Một hàm thuần xếp lệnh vào lớp** (đặt ở `src/shared/moc-toi-thieu.ts`, tên đề xuất `lopVuotMoc(lenh)`, trả `"KHAN_CAP"` hoặc `"QUAN_TRI"`):
   - `XEP`, `RUT`, `DOI_DI`, `DOI_DEN` và lệnh thêm khách khi xe chạy (xét mốc như `XEP`, `dieu-phoi-kiem.ts:279`) → `"KHAN_CAP"`;
   - `DOI_XE`, `DOI_TAI_XE`, `HUY_CO_KHACH` → `"QUAN_TRI"` (Q-1 = a).
   - Các route ở bảng trên tách cờ `phaLe` (luật mốc) khỏi `nghiPhaLe` / `camKetPhaLe`. Luật mốc hỏi `lopVuotMoc(lenh) === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")`. Khoảng nghỉ và cam kết vẫn hỏi `trip.override`.
   - Tên ô phải viết **tường minh** trong `src/modules/`: hàng rào "mỗi ô phải được máy chủ hỏi" chỉ đếm chuỗi ô viết thẳng (`src/permission-enforcement.test.ts:14`). Vì thế hàm thuần trả lớp, không trả tên ô.
   - `PUT /chuyen/:id` (đổi xe, tài xế, giờ) giữ `trip.override` cho mốc.
3. **Lý do bắt buộc:**
   - Dùng nhóm `PHA_LE` của `vc_reason`. Mã nhóm giữ nguyên (`0041:133-137` cấm đổi mã). Nhãn nhóm trên giao diện (`src/shared/dieu-phoi-kieu.ts:19`) đổi thành "Điều chỉnh khẩn cấp, phá lệ", vì cùng một danh mục dùng cho cả hai.
   - Danh sách lý do là dữ liệu. Gợi ý cho Quản trị thêm: "Khách đổi kế hoạch sát giờ", "Gộp hoặc tách xe sát giờ".
   - "Khác" không kèm ô chữ (BL-GHI-CHU-CHUYEN, `docs/BACKLOG.md:186`).
4. **Lưu và nhật ký:**
   - Lưu ở cột sẵn có `override_rule_code = 'MOC_TOI_THIEU'`, `override_reason_code` của sự kiện (`0042:164-165`); không thêm cột.
   - Nhật ký dùng hành động hiện có của từng lệnh. Đuôi `detail` đổi chữ "phá lệ" thành "điều chỉnh khẩn cấp" **chỉ với lớp `KHAN_CAP`** (`dieu-phoi-route.ts:223`), cộng số phút còn lại tới giờ xuất bến.
   - Chỉ mã chuyến, mã đơn, số khách, nhãn lý do (LC-18).
5. **Nhãn "Điều chỉnh khẩn cấp":**
   - Tính lúc đọc, **chỉ** từ sự kiện lệnh khách: loại `ALLOCATED`, `ALLOCATION_REMOVED`, `ALLOCATION_MOVED`, `STOP_ADDED_RUNNING` (`src/shared/dieu-phoi-kieu.ts:38-42`) mang `override_rule_code = 'MOC_TOI_THIEU'`.
   - Sự kiện `UPDATED` / `CANCELLED` có phá lệ (đổi xe, đổi tài xế, huỷ chuyến còn khách của Quản trị) giữ cách hiện "phá lệ: <lý do>" như hôm nay (`src/shared/dieu-phoi-man.ts:335`), **không** dán nhãn khẩn cấp.
   - Hiện ở lịch chung và chi tiết chuyến văn phòng. Trang đơn **không** hiện ở lượt này, vì `orders` phải đọc qua một view công bố mới của `van-chuyen`; để sau nếu chủ cần.
   - **Không** vào DTO tài xế (danh sách trắng `src/modules/van-chuyen/tai-xe-dto.ts`).
   - Không tin cho Quản trị, không ô đếm trên Trang chủ (khác ADR-0091 đ6–đ7).
6. **Tin cho tài xế:**
   - Lệnh lớp `KHAN_CAP` trên chuyến đã có dòng lái mở → tin tới tài xế đang lái (tin không tên, không SĐT).
   - Cờ dấu cấp qua `ctx.chuyenChoTin` từ cột `override_rule_code` và loại sự kiện; `thongbao` không đọc `detail`.
   - Thêm vào `HANH_DONG_TIN_CHUYEN` (`tin-chuyen.ts:8-12`), kèm điều kiện có dấu.
7. **Phía đơn (đặt gấp): không thuộc ADR này** — tệp `05-ban-hang-xac-nhan-don-sat-gio.md`, lượt 8b.
8. **Không đổi:**
   - luật lõi LC-01…LC-21 (không ai vượt, kể cả Toàn quyền — `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:119`), đặc biệt LC-02 sức chứa;
   - con số `min_lead_minutes`; Toàn quyền `any` mọi ô (ADR-0014 điều 2).
9. **Chỗ giao diện đổi nghĩa:** danh sách đủ ở tệp 00 mục 4, tách "ẩn/hiện" và "chỉ đổi chữ".

### Đ2. Đồng bộ chuyến theo đơn

1. **Nơi chạy — câu chưa chạy, CÙNG một lô với lệnh đơn** (Hiến chương 1.2 "một lô ghi nguyên khối" `docs/ARCHITECTURE.md:25`; 5.3 "câu lệnh chưa chạy do module chủ cấp" `:95`):
   - Hàm công bố mới của `van-chuyen` (tên đề xuất `cauDongBoChuyen(db, { orderId, actor, auditIdDon, bayGioMs, sau, tangTheoChang })`) **trả danh sách câu chưa chạy**, không tự ghi.
   - `sau` = trạng thái đơn **sau** lệnh, do route đơn lấy từ bản kế hoạch của chính nó: đơn huỷ hay không, chặng nào đóng, số người và khoá người theo chặng. `tangTheoChang` = số người lệnh này tăng ở từng chặng; vắng = không tăng.
   - Gốc lắp ráp tiêm `ctx.dongBoChuyen(env, actor, {…})` theo khuôn `mocToiThieu` (`src/index.ts:158-159`). `orders` và `dispatch` không import `van-chuyen`.
   - **Tiền lệ:** tạo đơn gộp câu "người phụ trách" của `dispatch` vào cùng `db.batch` (`src/modules/orders/index.ts:730-734`; `src/modules/dispatch/service.ts:42-45`).
2. **Điều kiện "cổng đơn đã thắng" — ĐÃ CHỌN phương án (a): view công bố hẹp của `audit`.**
   - Các route sửa đơn **thua lặng lẽ**: câu cổng đơn không khớp thì nhật ký không chèn, mọi câu sau mang `wonGuard` không chạy (`src/modules/orders/repository.ts:769, :944`). Câu chuyến vì vậy phải hỏi đúng dấu đó, nếu không đơn thua mà ghế vẫn bị đóng.
   - **View mới `v_aud_order_cmd`** (tên đề xuất; module `audit`): `SELECT id, order_id, action FROM audit_log WHERE order_id IS NOT NULL AND action IN ('cancelled', 'order_cancelled_by_field', 'order_money_adjusted', 'order_money_adjusted_by_field', 'order_passenger_changed', 'order_leg_updated', 'order_leg_closed')`. Chỉ khoá và nhãn, không `detail`, không người, không giờ.
   - Câu cổng mỗi chuyến: `UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd WHERE id = :T AND version = :v AND status = 'PLANNED' AND EXISTS (SELECT 1 FROM v_aud_order_cmd WHERE id = :auditIdDon)`.
   - **Vì sao tạo view mới, không mở rộng `v_aud_order_event`:**
     - `v_aud_order_event` (`migrations/0025_thong_bao.sql:52-56`) là danh sách cho phép của hộp thông báo (`src/shared/audit-actions.ts:42`); thêm hành động vào đó sẽ sinh tin mới cho người dùng;
     - nó còn mang `staff_id`, `created_at` mà `van-chuyen` không cần.
   - **Không dùng `v_aud_order_change`** (gói A3, nhánh `a3-tin-don-doi`): view đó có `detail` và chỉ `thongbao` được đọc.
   - Phiếu người kiểm ghi: đọc `v_aud_order_event` từ `van-chuyen` thì bài kiến trúc xanh (45/45), đọc thẳng `audit_log` thì đỏ. Người soạn **chưa tự chạy** thử nghiệm đó.
   - **Mỗi điểm gọi phải lộ mã nhật ký của câu cổng đơn** để truyền vào `auditIdDon`. `cancelOrder` hôm nay chưa truyền mã nhật ký rõ: `auditStatement` ở `src/modules/orders/repository.ts:1040` không có `id`. Vì vậy hàm này (và `cancelOrderByHandler` mà `dispatch` gọi, `src/modules/dispatch/index.ts:233`) phải sửa, để sinh `auditId` trước và nhận thêm câu ngoài, như `createOrder` nhận `handler?.statements` (`src/modules/orders/index.ts:734`). Các hàm ghi của năm điểm gọi còn lại: người lập kế hoạch kiểm từng hàm.
3. **Thứ tự lô chung:**
   - câu ghi đơn (cổng đơn đứng đầu như hôm nay, không đổi);
   - với mỗi chuyến bị chạm, **mã lệnh riêng** (sự kiện lấy id = mã lệnh, `dieu-phoi.ts:78-82`): câu cổng chuyến ở mục 2 → nhật ký `changes() > 0` → **một** sự kiện → các câu suất / bỏ điểm / cam kết mang `EXISTS (… last_cmd_id = :cmd)` (ADR-0049 `:98-108`).
   - Bài `src/modules/van-chuyen/thu-tu-lo.test.ts` hôm nay đòi câu cổng đứng đầu lô (luật 1, `:4`). Lô chung cần một **ngoại lệ có tên** kiểu `GHI_NGOAI` (`:12-13`): phần đầu là câu của `orders`, sau đó từng khúc chuyến phải tự đúng bốn luật. Đây là **nới hàng rào** (Hiến pháp Điều 9.4), nên nằm trong câu duyệt.
4. **Điểm gọi** — `await` trong request, không `waitUntil`, không hàng đợi (ĐP8, ADR-0049 `:364`):
   - `orders`: `POST /api/orders/:id/status` (huỷ, `src/modules/orders/index.ts:1018`), `POST …/legs/:legId/close` (`:909`), `PUT …/legs/:legId` (`:891`), `POST …/passengers` (`:973`; một route cho thêm, sửa, huỷ dòng khách), route văn phòng sửa số khách của ADR-0063 D1;
   - **C14** `POST /api/orders/:id/legs/:legId/replace` (nhánh `c14-thay-chang`, `src/modules/orders/index.ts:935` ở nhánh đó; lô ghi `order_leg_closed` có `auditId` rồi `order_leg_added`, `src/modules/orders/repository.ts:1355-1361` ở nhánh đó);
   - `dispatch`: `handler-cancel` (`src/modules/dispatch/index.ts:218`), `handler-money-edit` (`:247`).
   - Không cần hook (đã đối chiếu mọi khai báo route ghi của hai module): `POST /api/orders` (`:705`), `PUT /api/orders/:id` (`:766`, chỉ đơn nháp), `PUT …/trip` (`:823`), `POST …/legs` (`:866`, chặng mới chưa có suất), `short-notice` (`:930`), `booker` (`:994`), `cancel-reason` (`:1085`), `PUT …/handler` (`dispatch :157`). Đổi giờ / nơi vẫn theo VK1-B (giữ + nút).
   - Route tài xế ghi tên khách (`src/modules/van-chuyen/index.ts:1691`) nằm trong `van-chuyen`: lệnh này có tự gắn suất hay phải gọi luật đồng bộ thì **chưa kiểm**.
   - Bài tĩnh mới: mọi route trong danh sách trên phải gọi hook (khuôn `src/bang-tin-guard.test.ts`).
5. **Phạm vi và trần:**
   - Chỉ các chuyến có suất mở của chặng thuộc **đúng đơn đó**.
   - Lệnh mới `DONG_BO_THEO_DON` có trong `LENH_XEP`, **ngoài** `LENH_KHOA_THEO_MOC` (khuôn `DOI_KHACH_THEO_DON`, `moc-toi-thieu.ts:60-61`). **Không** miễn luật lõi (LC-01, 02, 09, 10, 15).
   - **Trần: phần chuyến của một lô tối đa 74 câu** (bằng lô lớn nhất đang có, `updateDraftOrder`, `docs/SYSTEM-DESIGN.md:1154`). Hàm tính trước khi gộp; vượt thì **không gộp câu chuyến nào**, phản hồi lệnh đơn báo "chuyến cần cập nhật tay", chuyến giữ như hôm nay. Đếm câu ở mục "Đếm câu" bên dưới.
6. **Luật trên chuyến `PLANNED`.** Một hàm thuần ở `src/shared/`, mở rộng `suatKhachDaDoi` / `moLaiSauDoiKhach`, dùng chung cho máy và cho nút tay:
   - (i) Đơn huỷ, chặng đóng, đơn không còn xác nhận → đóng mọi suất mở của chặng trên chuyến, mã `REMOVED`.
   - (ii) Khoá người không còn trong đơn → đóng `PASSENGER_CHANGED` rồi mở lại theo `moLaiSauDoiKhach` (như lệnh hôm nay).
   - (iii) Suất mở của chặng (đếm trên mọi chuyến, như `kiemXep`) nhiều hơn số người → đóng phần thừa **trên chuyến này**: suất chưa tên trước (theo thứ tự mã suất). Nếu còn thừa mà mọi suất còn lại mang tên người vẫn trong đơn → **không đoán**, giữ `THUA_SUAT`. Chặng có suất mở trên hơn một chuyến → không đoán, giữ.
   - (iv) **Chỉ khi Q-2 = a, và chỉ khi lệnh đơn này vừa tăng người ở chặng đó** (kể cả HDV qua `handler-money-edit`): chặng chỉ nằm trên đúng chuyến này → mở thêm **tối đa số người vừa tăng** (`tangTheoChang`), không lấp phần thiếu có sẵn từ trước. Suất mới cùng điểm lên/xuống của suất hiện có, gắn khoá rảnh (`khoaNguoiRanh`, `dieu-phoi-kiem.ts:188`). Điều kiện: LC-02 còn chỗ và `kiemCamKet` không vi phạm; không đạt thì giữ `THIEU_SUAT`. Chặng đã có mốc giờ hẹn `XEP` từ lần xếp đầu nên **không chụp lại** (bẫy "tái mốc", `migrations/0043_nhac_goi_bao.sql:5`); trigger `vc_trip_allocation_needs_appt` (`:79-81`) là lưới.
   - Điểm hết khách → `SKIPPED` mã `BO_QUA_KHONG_CON_KHACH`; cam kết xe riêng xét lại sau giảm (`camKetSauGiam`). Cả hai theo khuôn `lenhCapNhatKhach`.
7. **Chuyến `RUNNING`: máy không ghi gì vào chuyến.**
   - Lý do: trigger `0076:46-54` chỉ cho đặt cờ báo huỷ khi lệnh cuối của chuyến là sự kiện `ALLOCATION_OFFICE_CANCELLED` của đúng suất đó (bài `xe-dang-chay-csdl.test.ts:297`). Lô đồng bộ mang sự kiện khác nên không đặt được cờ, và mỗi lệnh báo huỷ chỉ phủ một suất.
   - Máy chỉ nhắc, không ghi:
     - phản hồi của lệnh đơn kèm câu "Đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ";
     - màn "Xe đang chạy" hiện dòng nhắc tính lúc đọc, cùng nguồn trạng thái đơn mà lý do giữ `DON_DA_HUY` đang dùng (`dieu-phoi-kiem.ts:405`).
   - Tài xế nhận tin khi văn phòng bấm "Báo huỷ", như hôm nay (`trip_allocation_office_cancelled` đã có trong `tin-chuyen.ts:8-12`). ADR-0052 D5.2 không đổi.
8. **Chuyến đã kết thúc hoặc huỷ:** không làm gì (LC-06).
9. **Người ghi và nhật ký:**
   - `created_by` của sự kiện và `staff_id` của nhật ký = **người vừa sửa đơn**.
   - Hành động nhật ký mới (tên đề xuất `trip_order_synced`, nhãn "Máy cập nhật chuyến theo đơn") và loại sự kiện mới `ALLOCATION_ORDER_SYNCED` (danh sách mở, `0042:157`).
   - `detail`: mã chuyến, mã đơn, số ghế trả / thêm, nguyên nhân dạng nhãn cố định (đơn huỷ / bớt khách / đổi người / bỏ chặng). Không tên, không SĐT (LC-18).
10. **Tin:** hành động mới vào `HANH_DONG_TIN_CHUYEN` khi chuyến có dòng lái mở; Bảng tin như mọi lệnh chuyến (`baoThayDoiChuyen`, `src/index.ts:104`).
11. **Nút tay "Cập nhật khách theo đơn"** (`POST …/cap-nhat-khach`, `src/modules/van-chuyen/index.ts:1423`):
    - Dùng **cùng** hàm thuần, nên bấm tay gỡ được cả `DON_DA_HUY`, `CHANG_DA_DONG`, `THUA_SUAT` (hôm nay bỏ qua, `dieu-phoi-lenh.ts:619`). Ô `trip.dispatch` giữ nguyên; lô riêng của từng chuyến như hôm nay, không chịu trần 74.
    - Cách này gỡ **N2**: "đổi theo đơn → miễn mốc; đổi theo ý người (rút một khách vẫn còn trong đơn) → Điều chỉnh khẩn cấp".
12. **Thua đua:**
    - chuyến thua câu cổng (đổi `version` hay trạng thái) → phần chuyến không ghi, chuyến giữ như hôm nay, lệnh đơn vẫn thành công;
    - đơn thua cổng → không câu nào ghi (câu chuyến hỏi `v_aud_order_cmd`);
    - không thử lại tự động. Trigger lõi chặn → cả lô hỏng, lệnh đơn trả 409; vì cổng chuyến đã kèm trạng thái, ca này chỉ xảy ra khi mã có lỗi.
13. **Ngoại lệ có tên (quyền ghép):** người không có `trip.dispatch` vẫn làm máy ghi suất trên chuyến, gồm HDV (`handler-cancel`, `handler-money-edit`), Đối tác và Thực tập (huỷ đơn, sửa khách của mình). Giới hạn:
    - chỉ suất `PASSENGER` của chặng thuộc đúng đơn họ vừa sửa; không đụng suất `CREW`;
    - chỉ đóng, hoặc (Q-2 a) mở trong giới hạn số người lệnh vừa tăng và số chỗ của xe;
    - không bao giờ đổi xe, tài xế hay giờ;
    - không trả dữ liệu chuyến về cho người gọi.

### Đếm câu (phiếu M8)
- Mỗi chuyến bị chạm: 3 câu đầu (cổng, nhật ký, sự kiện) + 1 câu mỗi suất đóng + 1 câu mỗi suất mở + 1 câu mỗi điểm bỏ qua + tối đa 1 câu cam kết (`dieu-phoi.ts:100-101`).
- Đơn thường (1 dịch vụ, chặng đi và về, 10 khách, mỗi chặng một xe), huỷ đơn: 2 × (3 + 10 + 2 + 1) = **32** câu chuyến + khoảng 3 câu đơn.
- Đơn 30 khách cùng dạng: 2 × (3 + 30 + 2 + 1) = **72**, vừa dưới trần.
- Đoàn 45 khách cùng dạng: 2 × (3 + 45 + 2 + 1) = **102**, vượt trần: máy chỉ báo, người xếp xe bấm nút tay cho từng xe (mỗi lô 51 câu).
- **Tệ nhất theo hằng số, nếu không có trần:**
  - 20 dịch vụ (`src/shared/trip-rules.ts:6`) × 10 chặng mỗi dịch vụ (`src/shared/chang-dua-don.ts:50`) = 200 chặng;
  - mỗi chặng tối đa 50 suất (`src/shared/order-lines.ts:16`) → tới 10 000 câu đóng suất cộng 4 câu mỗi chuyến;
  - so với 74 câu của lô lớn nhất hôm nay (`docs/SYSTEM-DESIGN.md:1154-1158`), nên trần là bắt buộc.
- Phần đơn của route `passengers` có thể dài; tổng tệ nhất của lô = phần đơn + 74. Giới hạn số câu mỗi lần gọi D1 theo gói hiện hành: **chưa kiểm** (người thi công đối chiếu trang giới hạn của Cloudflare).

### Câu ADR bị thay (nguyên văn → mới; không sửa tệp ADR cũ)

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 `:29` (tóm tắt, ý 4) | "**Chỉ Quản trị, Toàn quyền phá lệ**, kèm lý do." | "Bán hàng, Quản trị, Toàn quyền **điều chỉnh khẩn cấp** xếp / rút / dời / thêm khách, kèm lý do; đổi xe, đổi tài xế, huỷ chuyến còn khách: Quản trị, Toàn quyền phá lệ (ADR-0104 Đ1)." |
| ADR-0049 `:129` (LC-09) | "Đơn huỷ sau khi xếp → **giữ**" | "Đơn huỷ sau khi xếp → máy rút suất trên chuyến chưa chạy trong cùng lô huỷ đơn (ADR-0104 Đ2); xe đang chạy: nhắc văn phòng Báo huỷ; máy chưa làm được thì **giữ**" |
| ADR-0049 `:162` (dòng **Xếp**, cột "Ai phá lệ") | "**chỉ Quản trị, Toàn quyền** (ô mới `trip.override`), kèm lý do nhóm `PHA_LE`" | "lệnh khách: Bán hàng, Quản trị, Toàn quyền (ô `trip.urgent_adjust`); đổi xe, đổi tài xế, huỷ chuyến còn khách: Quản trị, Toàn quyền (`trip.override`); lý do nhóm `PHA_LE`. Lệnh máy 'Đồng bộ chuyến theo đơn' không khoá theo mốc." |
| ADR-0049 `:200` (bảng ô) | "`trip.override` — phá lệ mốc lúc xếp, khoảng nghỉ" | "`trip.override` — vượt mốc khi đổi xe, đổi tài xế, huỷ chuyến còn khách; khoảng nghỉ (cam kết: ADR-0056)"; thêm dòng `trip.urgent_adjust` |
| ADR-0049 `:365` (phương án bị loại) | "**Bán hàng tự phá lệ mốc 6 giờ:** chủ chọn chỉ Quản trị, Toàn quyền (ĐP3)." | "Chủ đảo ngày 2026-10-08 (*"Bán hàng và Quản trị"*), cho lệnh khách; phạm vi ở ADR-0104 Đ1." |
| ADR-0050 `:219-221` | "**Vì sao không để máy tự dời khi đơn đổi:** … một việc chạy nền tự sửa chuyến là **tác nhân tự động** (Hiến chương 5.11, K1): cần tài khoản riêng + ADR riêng" | "Đổi **nơi** vẫn giữ chuyến + nút (VK1-B). Huỷ đơn, bớt / thêm khách, đổi người, bỏ chặng: máy đồng bộ **trong cùng lô lệnh sửa đơn của người**, ghi tên người đó, không chạy nền (ADR-0104 Đ2) — không phải tác nhân tự động theo 5.11." |
| ADR-0050 `:361` | "**Máy tự dời suất khi đơn đổi:** xem VK1-B." | "… trừ ADR-0104 Đ2." |
| ADR-0052 `:98` (D5.1, mốc) | "mọi chặng khác … → **chỉ Quản trị, Toàn quyền phá lệ** (`trip.override`) kèm lý do" | "→ Bán hàng, Quản trị, Toàn quyền **điều chỉnh khẩn cấp** (`trip.urgent_adjust`) kèm lý do" |
| ADR-0052 `:148` (D6.1, danh sách hành động sinh tin — một chiều) | (danh sách đóng) | "+ đồng bộ chuyến theo đơn; + xếp / rút / dời / thêm khách lớp điều chỉnh khẩn cấp — chỉ chuyến có tài xế" |
| ADR-0007 điều 4(b) | khuôn hàm tiêm | "+ `ctx.dongBoChuyen` (trả câu chưa chạy)" |
| Sổ hỏi đáp Vận chuyển lần 16, R-P29 (không phải ADR) | "Giữ xe + nút cập nhật" | máy đồng bộ trước; nút giữ làm đường tay |
| Đề xuất ADR-0091 (chưa duyệt) | toàn văn | bỏ phần xếp xe; phần đặt gấp hỏi ở tệp 05; giữ ý "nhãn riêng" của lời chủ 2/10 |

ADR-0052 D5.2 (báo huỷ trên xe đang chạy) **không** bị thay.

### Cửa một chiều / hai chiều
- **Một chiều (nhẹ):**
  - tên hành động nhật ký, loại sự kiện mới và các trường `detail` (chốt trước dòng đầu);
  - phần thêm vào danh sách tin chuyến (ADR-0052 D6.1 tự ghi danh sách này là một chiều);
  - view công bố `v_aud_order_cmd` là hợp đồng giữa `audit` và `van-chuyen` (gỡ phải theo expand–contract);
  - mỗi suất máy đã đóng (chỉ-thêm, lịch sử giữ nguyên).
- **Hai chiều:** ô mới và các ô đổi (gỡ bằng một commit); tập lệnh mỗi lớp; luật thuần; danh mục lý do (dữ liệu); hàm tiêm; trần 74; chữ giao diện.
- **Tránh một chiều nặng:** **không** thêm giá trị `close_reason`, vì đổi `CHECK` ở `0042:133` nghĩa là phải dựng lại bảng `vc_trip_allocation` (ADR-0049 `:325-326`).

### Migration
- Đ1: không cần. Ô nằm ở mã; lý do là dữ liệu Quản trị tự thêm.
- Đ2: **một migration chỉ `CREATE VIEW v_aud_order_cmd`** (khuôn view chỉ-khoá của `migrations/0070_tin_chuyen.sql:1-6`, `0075`).
  - Cập nhật `docs/data-dictionary.json` (mục view, chủ sở hữu `audit`; view đã được liệt kê ở đó, ví dụ `:591`) rồi `npm run dict`; bảng view ở `docs/SYSTEM-DESIGN.md:258`.
  - Số = số lớn nhất trong `migrations/` + 1 lúc thi công (hôm nay lớn nhất `0083`); quét mọi nhánh chưa gộp, nhất là `a3-tin-don-doi` (đang tạo `v_aud_order_change`).
- Không còn migration thêm mã lý do (bỏ cùng nhánh xe đang chạy, phiếu C1).

### Bài kiểm / hàng rào
Mỗi rào phải quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày.
1. **Quyền:**
   - Bán hàng xếp / rút / dời / thêm khi chạy trong mốc kèm lý do → 200; thiếu lý do → 400.
   - Bán hàng đổi xe, đổi tài xế, huỷ chuyến còn khách trong mốc → 403 (Q-1 a); Bán hàng bỏ qua khoảng nghỉ hoặc cam kết → 403.
   - Kế toán → 403; Quản trị → 200 mọi lệnh.
2. **LC-02:** Bán hàng điều chỉnh khẩn cấp xếp vượt số chỗ → 409, và SQL tay bị trigger `lc02_capacity` chặn.
3. **Một hàm xếp lớp:** bài quét — mọi chỗ hỏi ô cho luật mốc đều đi qua `lopVuotMoc`; ô `trip.urgent_adjust` có lời gọi `can(` tường minh.
4. **Nhãn:** Quản trị đổi xe trong mốc → chuyến **không** mang nhãn "Điều chỉnh khẩn cấp".
5. **Đồng bộ:**
   - Huỷ đơn trong mốc (chuyến `PLANNED`) → suất đóng `REMOVED` trong cùng lô, chuyến hết `DON_DA_HUY`, nhật ký mang `staff_id` người huỷ, tài xế nhận tin.
   - HDV huỷ qua `handler-cancel` → như trên, và HDV gọi route xếp vẫn 403.
   - Chuyến `RUNNING` → không suất, không cờ nào đổi; phản hồi có câu nhắc Báo huỷ.
   - Bớt khách khi có suất chưa tên → đóng suất chưa tên; mọi suất mang tên người còn trong đơn → giữ `THUA_SUAT`; chặng trên hai chuyến → giữ.
   - Thua cổng chuyến → chuyến giữ, lệnh đơn 200; thua cổng đơn → không suất nào đổi.
   - Vượt trần 74 → không câu chuyến nào, phản hồi báo cập nhật tay.
6. **Bài tĩnh điểm gọi hook:** bỏ một lời gọi → đỏ.
7. **Bài thứ tự lô:** ngoại lệ có tên cho lô chung; một hàm khác dùng nhãn đó → đỏ.
8. **View:** `van-chuyen` đọc `v_aud_order_cmd` → bài kiến trúc xanh; đọc thẳng `audit_log` → đỏ.
9. **LC-18:** bài quét nhật ký hiện có phủ hành động mới.
10. **Bộ kiểm chung:** `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.

### Phương án bị loại
- **Đổi ô `trip.override` của Bán hàng thành `any`:** các route hỏi chung một ô cho cả ba luật (`van-chuyen/index.ts:1197, :1230` …), nên sẽ mở luôn khoảng nghỉ và cam kết.
- **Nút "Xin phá lệ" và tin cho Quản trị** (báo cáo ERP C04 (iii), ADR-0091 đ7): chủ bác khái niệm này ngày 8/10.
- **Đồng bộ chạy nền, Cron hay hàng đợi:** là tác nhân tự động không định danh, tức xây trên lỗ đang hở HC-5.11; trái ĐP8 (ADR-0049 `:364`).
- **Hai lô (ghi đơn xong rồi mới ghi chuyến):** lệch Hiến chương 1.2 và ngược tiền lệ gộp lô của tạo đơn.
- **Đặt cờ báo huỷ trên xe đang chạy trong lô đồng bộ:** trigger `0076:46-54` không cho (phiếu C1).
- **Cổng đơn đã thắng, phương án (b) — `orders` cấp sẵn biểu thức điều kiện:** biểu thức vẫn là `EXISTS (… audit_log …)` nằm trong câu của `van-chuyen`, tức module nghiêm đọc thẳng bảng của module khác; phiếu người kiểm ghi cách đọc thẳng `audit_log` làm bài kiến trúc đỏ.
- **Phương án (c) — cổng đơn ở các route đổi sang làm hỏng lô khi thua:** đổi cách xử lý tranh chấp của tám route đang chạy (hôm nay thua lặng lẽ rồi trả 409 riêng như `HANDLER_RACED`), phạm vi rộng hơn nhiều so với một view.
- **Phương án (d) — gác bằng dấu thời gian mới của đơn** (`orders.updated_at = :at` mà lô đơn vừa ghi, đọc qua một view `v_ord_*`): **chưa thử**; còn phải chứng minh dấu đó duy nhất cho mỗi lệnh, và phải lộ thêm cột giờ của đơn ra view.
- **Mã đóng mới cho đồng bộ:** phải dựng lại bảng (xem Cửa một chiều).
- **Hạ con số mốc cho cả hệ thống:** áp cả lúc đặt đơn, cộng lỗi N3 (báo cáo ERP Gói 0 mục 3).

### Sổ dừng dây chuyền (`docs/quyen-hoan.json`)
- **HC-5.11** (HIGH, hạn 2026-11-15, tác vụ tự động không định danh): **không xây trên lỗ này**, với điều kiện Đ2 chạy trong lô lệnh của người và ghi `staff_id` người đó (bài kiểm 5). Nếu sau này chuyển sang chạy nền thì phải ghi "xây trên lỗ đang hở: HC-5.11" và dừng chờ chủ.
- Các mục HIGH khác (TNV-G1, G3, G4, HC-5.19, HC-4.2) thuộc sổ tiền và sao lưu; Đ1 và Đ2 không ghi bảng `bil_*`.
- Ô hoãn `thao_tac` (`task.progress`, `dispatch.guides.view`, `invoice.*`) không được dùng.

### Chưa kiểm
- Số lần phá lệ thật trên production, ai xếp xe ban đêm, giá trị mốc thật.
- Lệnh huỷ đơn chậm thêm bao nhiêu; giới hạn số câu mỗi lần gọi D1 theo gói hiện hành.
- Thử nghiệm "đọc `v_aud_*` từ `van-chuyen` thì xanh" là của người kiểm; người soạn chưa tự chạy.
- Năm điểm gọi ngoài `cancelOrder` và C14 đã lộ mã nhật ký của cổng đơn hay chưa; mỗi route có sẵn trạng thái `sau` hay phải đọc thêm (người soạn chỉ đọc phần đầu route huỷ đơn và route khách).
- Route tài xế ghi tên khách có cần luật đồng bộ hay không.
- Nguồn đọc trạng thái đơn cho dòng nhắc trên màn "Xe đang chạy" (dự kiến cùng nguồn với `DON_DA_HUY`, chưa lần tới hàm đọc).
- Bảng tin và tin điện thoại tới máy thật; tranh chấp đồng thời thật trên D1.
- Thân ADR-0096, ADR-0097 (đón trước trả, cửa sổ xuất bến, sự kiện `CORRECTION`) chưa đối chiếu với Đ2.
