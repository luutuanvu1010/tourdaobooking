# ADR-0107 — Bán hàng tự đóng dấu đặt gấp cho đơn sát giờ; dấu chỉ đóng được khi chặng đang dưới mốc

- **Trạng thái:** **accepted** 2026-10-08 — chủ dự án trả lời lượt duyệt 8b qua câu hỏi chọn phương án; nhãn đã chọn nguyên văn: **"Duyệt cả hai ý (Recommended)"**, tức **Q-3 = a**: (i) Bán hàng tự đóng dấu đặt gấp; (ii) ở mọi chỗ đóng dấu, dấu chỉ đóng được khi chặng đang dưới mốc lúc gửi, áp cho mọi người kể cả Quản trị. Vì ADR-0104 đã accepted ở lượt 8a, dấu mang nhãn **"Điều chỉnh khẩn cấp"** (đúng chữ tệp 05 và sổ thi công). Câu hỏi đã ghép hệ quả của lượt 8a vào Q-3: trong 6 giờ Bán hàng làm được trọn đặt gấp mọi đơn, xếp / rút / dời khách, đổi xe, đổi tài xế, huỷ chuyến còn khách, bỏ qua khoảng nghỉ và cam kết. Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8b" (nhánh `claude/van-chuyen-goi-a-c` @ `19de847a`). Người soạn không có nguyên văn câu hỏi; nội dung theo sổ thi công. AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-08.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/05-ban-hang-xac-nhan-don-sat-gio.md`; trang ghép `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/00-trang-ghep.md` (hai hồ sơ có ngày, đóng băng).
- **Thay:** **phần đặt gấp** của đề xuất ADR-0091 (`docs/superpowers/specs/2026-10-02-luot-duyet-3-pin-tam-va-ngoai-le-6-gio.md`, chưa từng được duyệt). Phần xếp xe của đề xuất đó đã bị ADR-0104 thay. ADR-0093 trong cùng tệp không bị đụng.
- **Sửa:** ADR-0049 (`:30`, `:161`, `:201`, `:266` — câu thay ADR-0047 A1, `:303`, `:339`); qua đó ADR-0047 A1 (`:85`). Từng câu ở mục "Câu ADR bị thay".
- **Mốc đo mã:** mọi `tệp:dòng` đo lại trên `claude/van-chuyen-goi-a-c` @ `19de847a` (văn bản trình duyệt đo @ `809918d5`; chỗ lệch ở mục "Chỗ văn bản trình duyệt lệch mã HEAD").
- **Xây trên lỗ đang hở:** không.
- **Cửa:** hai chiều (ô, điều kiện trong `xetDatGapSua`, chữ); không migration.

## Lời chủ dự án

- 2026-10-02 (câu 5, lượt 3): *"cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"*.
- Lượt duyệt 8b (2026-10-08): **"Duyệt cả hai ý (Recommended)"** (xem dòng Trạng thái).
- Câu duyệt gợi ý của tệp 05: *"Duyệt ADR-0107: (i) Bán hàng tự đóng dấu đặt gấp, chọn một trong bốn lý do đặt gấp hiện có, kể cả khi sửa giờ, nơi đón hoặc thêm chặng cho đơn đã xác nhận sát giờ (đơn mình lập hoặc mình phụ trách); (ii) ở mọi chỗ đóng dấu, dấu chỉ đóng được khi chặng đang dưới mốc lúc bấm (khi sửa giờ thì xét giờ sớm hơn giữa cũ và mới), áp cho mọi người kể cả Quản trị; nhãn 'Điều chỉnh khẩn cấp' nếu ADR-0104 được duyệt, không thì giữ 'Đặt gấp'; Q-3 a."*

## Bối cảnh mã (đo @ `19de847a`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Ô | `order.leg.short_notice` = ADMIN, SUPER_ADMIN `any`, còn lại `none`; `order.trip.edit` SALES `ownOrAssigned`; `order.view` SALES `any`; ô xem đủ dấu `order.leg.short_notice.view` SALES, ACCOUNTING, ADMIN, SUPER_ADMIN `any` | `src/shared/permissions.ts:83`, `:80`, `:74`, `:87` |
| Lý do đặt gấp | bốn lý do cố định trong mã `LY_DO_DAT_GAP` | `src/shared/chang-dua-don.ts:33-38` |
| Hàm `xetDatGapSua` | thân **vắng** `datGap`: dưới mốc → 409 `short_notice_required`, không thì không dấu (`:106`); thân **có** `datGap`: hỏi ô (`:107`, 403) → đọc lý do (400) → ghi dấu mới, **không** xét mốc | `src/modules/orders/index.ts:102-111` |
| Câu lỗi | 403 "Chỉ Quản trị hoặc Toàn quyền được đặt gấp chặng đưa đón." `:91`; 409 "… chỉ Quản trị hoặc Toàn quyền sửa được, kèm lý do đặt gấp." `:95-96`; lúc xác nhận "… cần Quản trị hoặc Toàn quyền đặt gấp trước khi xác nhận." `:1178` | `src/modules/orders/index.ts` |
| Dưới mốc khi sửa | `duoiMocKhiSua(cu, moi)` = cũ **hoặc** mới dưới mốc; chặng chưa chốt giờ không xét | `src/shared/moc-toi-thieu.ts:58-62` (chuyển từ `orders/dat-gap.ts` ngày 2026-10-08) |
| Dấu miễn mốc lúc xếp | chỉ `XEP`, `DOI_DEN` | `src/shared/moc-toi-thieu.ts:79`, `:116` |
| Ghi dấu ở `PUT …/trip` | `duoi` = **có ít nhất một** chặng đổi / thêm dưới mốc (`:892`); kho ghi dấu mới lên **mọi** chặng đổi / thêm của lệnh | `src/modules/orders/index.ts:883-896`; `src/modules/orders/repository.ts:1271`, `:1291-1293` |
| Nhật ký | đuôi " · đặt gấp: <nhãn lý do>" (`ghiDatGapNhatKy`); lịch sử đơn của người không có ô xem đủ: thay bằng " · Đặt gấp — Quản trị đã duyệt", người làm hiện "Quản trị" | `src/shared/chang-dua-don.ts:46`; `src/modules/orders/dat-gap.ts:85`, `:91-98` |

**Năm cửa đóng dấu** (đều trên HEAD):

| Cửa | Route | Ô trước | Chỗ gọi |
|---|---|---|---|
| nút Đặt gấp | `POST /api/orders/:id/legs/:legId/short-notice` | chỉ `order.leg.short_notice` (hỏi đầu thân) | `src/modules/orders/index.ts:1003-1029`; hôm nay **không** đi qua `xetDatGapSua` |
| sửa chặng | `PUT /api/orders/:id/legs/:legId` | `order.trip.edit` | `:934`; `lenhSuaChang` `:154-174`, gọi hàm ở `:169`, ép `!plan.value.chiOPhu &&` ở `:169`, nhánh giữ dấu `:164` |
| sửa thông tin chuyến | `PUT /api/orders/:id/trip` | `order.trip.edit` | `:866`, gọi hàm ở `:893` (chỉ đơn đã xác nhận) |
| thêm chặng | `POST /api/orders/:id/legs` | `order.trip.edit` | `:909`, gọi hàm ở `:924` |
| thay chặng (C14) | `POST /api/orders/:id/legs/:legId/replace` | `order.trip.edit` | `:977`, gọi hàm ở `:993` |

**Đường chép dấu cũ của đơn nháp (không phải cửa đóng dấu):** lưu lại đơn nháp xoá–chèn lại chặng; chặng mới khớp đúng một chặng cũ đã đặt gấp (cùng dịch vụ, chiều, ngày, giờ, nơi) thì mang lại năm cột dấu lấy từ dòng cũ trong CSDL, không bao giờ từ thân trình duyệt (`chepDatGapNhap`, `src/modules/orders/dat-gap.ts:30-55`; gọi ở `src/modules/orders/index.ts:851`; ghi qua `src/modules/orders/repository.ts:873-875`, `:960`, `:994`). Đường này không hỏi ô và không tạo dấu mới; người lưu nháp có thể là Đối tác, Thực tập.

**Giao diện:** `web/trip-sheet.ts:134` và `web/sheet-dua-don.ts:132` gửi `datGap` chỉ sau khi máy chủ trả 409 `short_notice_required` (`web/trip-sheet.ts:150`, `web/sheet-dua-don.ts:141`), và chuỗi lệnh của bảng "Sửa đưa đón" chỉ gắn `datGap` cho lệnh đầu của lần gửi lại (`web/sheet-dua-don.ts:132`). Người không có ô bị chặn sẵn ở trình duyệt (`web/sheet-dua-don.ts:164`, câu `src/shared/thay-chang.ts:106`).

## Quyết định

### Ý (i) — Bán hàng tự đóng dấu

1. **Ô** `order.leg.short_notice`: SALES `none` → **`any`** (`src/shared/permissions.ts:83`). Các cột khác không đổi.
   - Nút Đặt gấp: mọi chặng còn mở của mọi đơn (nháp hoặc đã xác nhận), như Quản trị hôm nay; Bán hàng vốn xem được mọi đơn (`order.view` `any`).
   - Bốn lệnh sửa / thêm / thay chặng và `PUT …/trip`: route còn hỏi `order.trip.edit` trước (SALES `ownOrAssigned`), nên Bán hàng chỉ kèm dấu cho đơn mình lập hoặc mình phụ trách.
   - Không thêm mã quyền: `EXTERNAL_PERMISSIONS`, trigger LC-1 không đổi.
2. **Lý do:** giữ `LY_DO_DAT_GAP` (bốn lý do cố định trong mã), **khác** nhóm `PHA_LE` của `vc_reason` mà ADR-0104 dùng.

### Ý (ii) — dấu chỉ đóng được khi chặng đang dưới mốc (mọi người)

3. **Bất biến:** dấu đặt gấp chỉ được ghi lên một chặng khi chính chặng đó đang dưới mốc tối thiểu lúc máy chủ nhận lệnh; với lệnh sửa / thay chặng, "dưới mốc" xét theo giờ sớm hơn giữa cũ và mới (`duoiMocKhiSua`). Áp cho Bán hàng, Quản trị, Toàn quyền.
4. **Hướng A (điều phối chốt trước lượt duyệt):** điều kiện đặt trong **chính** `xetDatGapSua`; nút Đặt gấp đi qua **cùng** hàm (với `duoiMoc` tính trên giờ hiện tại của chặng, tức `duoiMocKhiSua(null, chặng)`). Một chỗ canh cả năm cửa, mỗi cửa một bài kiểm. Thứ tự trong hàm khi thân có `datGap`: ô (403) → lý do hợp lệ (400) → `duoiMoc` sai → **409 mã mới `short_notice_not_needed`**, câu "Chặng chưa dưới mốc tối thiểu, không cần đặt gấp." → ghi dấu.
   - Chặng chưa chốt giờ không bao giờ "dưới mốc" (`duoiMocKhiSua` trả sai), nên nút Đặt gấp trên chặng đó trả 409, kể cả với Quản trị; xác nhận đơn cũng không đòi đặt gấp cho chặng đó (luật I13 hôm nay).
   - **"Năm cửa" chỉ là năm chỗ đóng dấu MỚI.** Đường chép dấu cũ khi lưu lại đơn nháp (`chepDatGapNhap`, mục "Bối cảnh mã") **giữ nguyên**: không đi qua `xetDatGapSua`, không hỏi ô, không xét mốc — nó chỉ mang lại dấu đã được đóng hợp lệ trước đó cho đúng chặng không đổi giờ, nơi. Nếu cho đường này đi qua `xetDatGapSua` thì Đối tác, Thực tập lưu lại nháp của mình sẽ bị 403 hoặc làm mất dấu Bán hàng, Quản trị vừa đóng. Ngoại lệ có tên này phải có trong bài kiểm 7.
5. **Bỏ ép `!plan.value.chiOPhu &&`** ở `src/modules/orders/index.ts:169`: hôm nay vô hại vì nhánh có `datGap` không đọc cờ, còn lệnh chỉ đổi ô phụ mà vắng `datGap` không gọi hàm (`:164`, giữ dấu cũ); khi cờ thành điều kiện thì phải tính trên giờ thật của chặng.
6. **`PUT …/trip` nhiều chặng — chỗ mã hôm nay chưa khớp bất biến mục 3 (★, ngoài văn bản trình duyệt):** cờ `duoi` của route là "có ít nhất một chặng dưới mốc" (`index.ts:892`), còn kho ghi dấu mới lên **mọi** chặng đổi / thêm của lệnh (`repository.ts:1271`). Nếu chỉ đặt điều kiện vào `xetDatGapSua` như Hướng A, một lệnh đổi hai chặng — một chặng dưới mốc, một chặng còn xa — kèm `datGap` sẽ trả 200 và chặng xa cũng nhận dấu, tức đóng dấu cho chặng không dưới mốc. Văn bản trình duyệt (bài kiểm "`PUT …/trip`: có chặng dưới mốc kèm `datGap` → 200") không nêu ca này. Mã phải giữ bất biến mục 3 bằng một trong hai cách; **điều phối chọn** khi giao lập kế hoạch:
   - (a) chỉ chặng nào tự nó dưới mốc nhận dấu mới; chặng khác trong cùng lệnh xử như lệnh không có `datGap` (dấu cũ bỏ theo I16). Người soạn nghiêng về cách này vì giao diện gửi `datGap` cho cả lệnh `PUT …/trip` sau một lần 409 (`web/trip-sheet.ts:150`);
   - (b) lệnh có `datGap` mà có chặng đổi / thêm không dưới mốc → 409 `short_notice_not_needed`, người dùng tách lệnh.
   Cả hai đều chỉ siết so với hôm nay; bài kiểm hai chặng ở mục "Bài kiểm" bắt buộc.
7. **Lý do siết:** dấu đặt gấp miễn mốc lúc xếp cho `XEP`, `DOI_DEN` (`moc-toi-thieu.ts:79`, `:116`); hôm nay đóng dấu trước nhiều ngày được nên bỏ qua mốc hoàn toàn (ADR-0091 đ2). Sau ADR này, dấu chỉ có trên chặng từng thật sự dưới mốc lúc đóng.

### Nhãn và chữ

8. **Nhãn của dấu** (ADR-0104 đã duyệt nên dùng "Điều chỉnh khẩn cấp"):
   - người xem đủ dấu (ô `order.leg.short_notice.view`): "Đặt gấp — <lý do> — <người> duyệt <giờ>" (`src/shared/dat-gap-hien-thi.ts:26-30`) → "Điều chỉnh khẩn cấp — <lý do> — <người> <giờ>" (bỏ chữ "duyệt": người đóng dấu có thể là chính Bán hàng lập đơn) — **giả định bề mặt của người soạn**, tệp 05 chỉ nêu nhãn rút gọn;
   - người chỉ thấy cờ (Đối tác, HDV, Thực tập): "Đặt gấp — Quản trị đã duyệt" (`dat-gap-hien-thi.ts:28`) → **"Điều chỉnh khẩn cấp (văn phòng)"** (đúng chữ tệp 05);
   - lịch sử đơn của người chỉ thấy cờ: đuôi " · Đặt gấp — Quản trị đã duyệt" và người làm "Quản trị" (`src/modules/orders/dat-gap.ts:85`, `:97`) → đuôi " · Điều chỉnh khẩn cấp (văn phòng)", người làm "Văn phòng" (★ — sau ADR này chữ "Quản trị" ở đó sai sự thật khi Bán hàng đóng dấu);
   - ★ thẻ chặng trên lịch chung "Đặt gấp" (`src/shared/dieu-phoi-man.ts:45`): tệp 05 **không** nêu chỗ này; **điều phối chọn** (bề mặt, đảo ngược được). Đổi sang "Điều chỉnh khẩn cấp" thì thẻ chặng và nhãn chuyến của ADR-0104 Đ1 mục 5 mang cùng chữ trên cùng màn lịch chung, dù nghĩa khác (thẻ chặng: chặng được miễn mốc khi xếp; nhãn chuyến: chuyến đã có lệnh vượt mốc). Giữ "Đặt gấp" thì cùng một dấu mang hai tên ở trang đơn và lịch chung. Người soạn không chọn.
   - Nhãn chặng và nhãn chuyến "Điều chỉnh khẩn cấp" của ADR-0104 Đ1 mục 5 **cùng chữ nhưng khác nguồn**: nhãn chặng đọc từ cột `short_notice_*` của `ord_transfer_leg`; nhãn chuyến đọc từ sự kiện chuyến mang `override_rule_code = 'MOC_TOI_THIEU'`. Câu "Trang đơn **không** hiện nhãn [chuyến] ở lượt này" của ADR-0104 Đ1 mục 5 vẫn đúng: trang đơn chỉ hiện nhãn chặng. Trên lịch chung hai nhãn có thể đứng cạnh nhau (xem gạch trên).
   - **Đuôi nhật ký " · đặt gấp: <nhãn lý do>"** (`ghiDatGapNhatKy`, `chang-dua-don.ts:46`) **không đổi**: đó là khuôn `detail` mà hàm đọc tin của ADR-0062 bóc ra (hợp đồng một chiều nhẹ).
   - **Tên nút "Đặt gấp"** giữ nguyên (đúng chữ chủ đọc trong câu hỏi "đặt gấp mọi đơn"); mã route, mã lỗi, tên ô không đổi. Giả định bề mặt; điều phối đổi được.
9. **Chữ phải sửa vì sai sự thật sau ADR này** (mọi câu nói "chỉ / cần Quản trị (hoặc Toàn quyền) đặt gấp"):
   - máy chủ: `src/modules/orders/index.ts:91` → "Bạn không có quyền đặt gấp chặng đưa đón."; `:95-96` → "Chặng dưới mốc tối thiểu trước giờ đón — cần kèm lý do đặt gấp."; ★ `:1178` → "… cần đặt gấp trước khi xác nhận.";
   - dùng chung: `src/shared/dat-gap-hien-thi.ts:59`; `src/shared/order-errors.ts:90` (và thêm banner cho 409 `short_notice_not_needed`); ★ `src/shared/thay-chang.ts:106`; `src/shared/tro-ly-cau-truc-ten.ts:75`; ★ `src/shared/dieu-phoi-lich-chung.ts:67`, `src/shared/dieu-phoi-man.ts:201`, `:214`;
   - giao diện: `web/dat-gap-ui.ts:101`; ★ `web/dieu-phoi.ts:112`;
   - hướng dẫn: `src/shared/huong-dan-ban-hang.ts:154-164`, ★ `:199`, ★ `:216`; `src/shared/huong-dan-doi-tac.ts:92`, ★ `:138`, ★ `:147`;
   - chú thích mã (không lộ ra người dùng, sửa cùng lần): `src/shared/permissions.ts:81-82`, `src/shared/chang-dua-don.ts:30`, `web/trip-sheet.ts:26`.
   Người lập kế hoạch rà thêm bằng tìm chữ "Quản trị" cạnh "đặt gấp" trước khi thi công; danh sách trên đo @ `19de847a`.
10. **Giao diện — ẩn / hiện đổi nghĩa** (bước ghép, `CLAUDE.md` §9):
    - nút Đặt gấp hiện cho Bán hàng: `web/order-form.ts:599`, `web/order.ts:262`, `:941`, `:1103` (điều kiện `can(staff, "order.leg.short_notice")`); vẫn chỉ bật khi chặng đang dưới mốc (`web/order.ts:940`);
    - ★ bảng "Sửa đưa đón" `web/sheet-dua-don.ts:164`: hôm nay người không có ô bị chặn sẵn ở trình duyệt với câu "cần Quản trị duyệt đặt gấp; chưa lưu gì". Sau ADR này Bán hàng có ô, nên lệnh đi tới máy chủ, nhận 409 và khung đặt gấp mở như Quản trị. Nhánh chặn sẵn chỉ còn cho người có `order.trip.edit` mà không có ô đặt gấp — hôm nay không có mã quyền nào như vậy.

### Ghép với ADR-0104 (accepted 2026-10-08, Q-1 b)

11. Sau ADR này, trong 6 giờ trước giờ chạy Bán hàng làm được trọn các việc chủ đã được nói trong câu hỏi (sổ thi công, mục "Lượt duyệt 8b"; người soạn không có nguyên văn câu hỏi):
    - **phía đơn (ADR này):** đặt gấp mọi chặng của mọi đơn bằng nút; sửa giờ, nơi đón, thêm, thay chặng của đơn mình lập hoặc phụ trách kèm lý do đặt gấp; xác nhận đơn có chặng đã đặt gấp (ô `order.modify` không đổi);
    - **phía chuyến (ADR-0104 Đ1, ô `trip.urgent_adjust`):** xếp, rút, dời khách, thêm khách khi xe chạy, đổi xe, đổi tài xế, huỷ chuyến còn khách; bỏ qua khoảng nghỉ và cam kết khi chuyến dưới mốc.
12. Hai đường đều đòi lý do nhưng **hai danh sách khác nhau**: đặt gấp dùng `LY_DO_DAT_GAP` cố định trong mã; điều chỉnh khẩn cấp dùng nhóm `PHA_LE` của `vc_reason` (Quản trị sửa được, `src/shared/dieu-phoi-kieu.ts:13-14`). Không mở thêm quyền ngoài phạm vi chủ đã cho.
13. Xếp chặng đã đặt gấp vào chuyến dưới mốc vẫn không phải ghi lý do lần nữa (`moc-toi-thieu.ts:116`); dấu đặt gấp không làm chuyến thôi "dưới mốc" cho luật khoảng nghỉ, cam kết (ADR-0104 Đ1 mục 0).

## Hệ quả và rủi ro

- **Quyền rộng hơn sát giờ:** Bán hàng đóng dấu được cho mọi đơn (kể cả đơn đối tác) khi chặng dưới mốc. Lớp bù: lý do bắt buộc, nhật ký ghi người và lý do, nhãn "Điều chỉnh khẩn cấp" trên chặng.
- **Đường né mốc còn lại, nói thẳng:** dời một chặng đang dưới mốc ra xa kèm `datGap` vẫn được (giờ cũ dưới mốc), và dấu mới nằm trên chặng đã ở xa; vài ngày sau, khi chặng lại vào trong 6 giờ, xếp chặng đó vẫn được miễn mốc nhờ dấu. Đây là hệ quả của luật "giờ sớm hơn giữa cũ và mới" chủ đã duyệt; dấu vẫn có lý do và người đóng trong nhật ký.
- **Bài ghim bị nới có tên** (Điều 9.4, chủ đã duyệt bằng Q-3 a): `src/shared/permissions.test.ts:24` (bảng ADR trong bài) và `:468-472` ("ô `order.leg.short_notice` CHỈ ADMIN + SUPER_ADMIN"); `src/modules/orders/dat-gap.test.ts:50` (TC-22: Bán hàng → 403).
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` (§6, §7, bảng ô), `docs/CHANGE-GUIDE.md`, hướng dẫn Bán hàng và Đối tác, nhật ký thay đổi lời thường.
- **Việc lớn** (quyền): kế hoạch riêng, mỗi task đỏ → xanh, người kiểm độc lập chỉ-đọc.

## Câu ADR bị thay (nguyên văn → mới; không sửa thân ADR cũ)

Dòng có dấu ★ là thêm so với văn bản trình duyệt (tệp 05), vì thiếu thì ADR-0049 đã duyệt tự mâu thuẫn với ADR này. Dòng trỏ ở dòng Trạng thái của từng ADR cũ: `dong-tro-adr-cu-8b.md` cùng thư mục.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ★ ADR-0049 `:30` (tóm tắt, ý 5) | "**Đặt gấp:** Bán hàng vẫn lưu nháp đơn sát giờ, nhưng không xác nhận được → nhờ Quản trị/Toàn quyền bấm "Đặt gấp" có lý do → xác nhận. Xếp chặng đó lên xe không phải phá lệ lần nữa." | "**Đặt gấp:** Bán hàng vẫn lưu nháp đơn sát giờ, nhưng không xác nhận được → Bán hàng, Quản trị, Toàn quyền bấm "Đặt gấp" có lý do, chỉ khi chặng đang dưới mốc → xác nhận. Xếp chặng đó lên xe không phải phá lệ lần nữa (ADR-0107)." |
| ADR-0049 `:161` (dòng **Đặt**, cột "Ai phá lệ") | "**chỉ Quản trị, Toàn quyền** (ô mới `order.leg.short_notice`), kèm lý do" | "Bán hàng, Quản trị, Toàn quyền (ô `order.leg.short_notice`), kèm lý do, **chỉ khi chặng đang dưới mốc lúc gửi** (lệnh sửa: giờ sớm hơn của cũ và mới), ở mọi cửa đóng dấu (ADR-0107)" |
| ★ ADR-0049 `:201` (bảng ô mới) | "\| `order.leg.short_notice` — đặt gấp \| none \| none \| any \| none \| none \| any \| none \| none \| none \|" | "\| `order.leg.short_notice` — đặt gấp \| **any** \| none \| any \| none \| none \| any \| none \| none \| none \|" (ADR-0107) |
| ADR-0049 `:266` (câu thay cho ADR-0047 A1) | "… **sửa** trường vận hành được; **khi giờ hẹn đã dưới mốc tối thiểu** (ADR-0049 D2) chỉ Quản trị, Toàn quyền sửa, kèm lý do đặt gấp. **Xác nhận** đơn có chặng dưới mốc cũng đòi đặt gấp." | "… **sửa** trường vận hành được; **khi giờ hẹn cũ hoặc mới dưới mốc tối thiểu** (ADR-0049 D2) người sửa được chặng (Bán hàng: đơn mình lập hoặc phụ trách; Quản trị, Toàn quyền: mọi đơn) sửa, kèm lý do đặt gấp; kèm lý do đặt gấp mà cả giờ cũ lẫn giờ mới đều trên mốc → 409 (ADR-0107). **Xác nhận** đơn có chặng dưới mốc cũng đòi đặt gấp." |
| ADR-0049 `:303` (bảng ô ↔ dữ liệu) | "chỉ Quản trị, Toàn quyền; mọi đơn" | "Bán hàng, Quản trị, Toàn quyền; mọi đơn; chỉ ghi khi chặng đang dưới mốc (ADR-0107)" |
| ★ ADR-0049 `:339` (hàng rào mới) | "bài ghim `order.leg.short_notice`, `trip.override` chỉ Quản trị + Toàn quyền;" | "bài ghim `trip.override` chỉ Quản trị + Toàn quyền; bài ghim `order.leg.short_notice` Bán hàng, Quản trị, Toàn quyền (nới có tên — ADR-0107);" |
| Đề xuất ADR-0091 (chưa duyệt) | phần đặt gấp | thay bằng ADR này; giữ ý "nhãn riêng" của lời chủ 2/10 bằng nhãn "Điều chỉnh khẩn cấp" |

**Không đổi:** ADR-0049 `:306` ("Sửa chặng dưới mốc thêm điều kiện 'đã đặt gấp'") và `:316` (bảng cổng: "Đặt gấp; xác nhận và sửa chặng dưới mốc" — ô `order.leg.short_notice`; `order.modify` / `order.trip.edit` + điều kiện mốc) vẫn đúng; ADR-0062 (khuôn đuôi " · đặt gấp: …" của `detail`); ADR-0055 `:172` (sửa số hiệu chuyến bay trong 6 giờ không cần đặt gấp — lệnh chỉ đổi ô phụ, vắng `datGap`, giữ dấu cũ).

## Bài kiểm / hàng rào

Mỗi rào quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày.

1. **Nút Đặt gấp:** Bán hàng, chặng dưới mốc → 200, kể cả đơn người khác lập; chặng còn trên mốc → 409 `short_notice_not_needed` cho cả Quản trị, Toàn quyền; chặng chưa chốt giờ → 409; Kế toán, HDV, Đối tác, Thực tập → 403.
2. **Sửa chặng `PUT …/legs/:legId`:** Bán hàng (đơn mình lập) dời giờ vào dưới mốc kèm `datGap` → 200; giờ cũ và mới đều trên mốc kèm `datGap` → 409; dời chặng đang dưới mốc ra xa kèm `datGap` → 200; chỉ đổi ô phụ trên chặng dưới mốc kèm `datGap` → 200, trên mốc → 409; chỉ đổi ô phụ, vắng `datGap` → giữ dấu cũ (không đổi).
3. **`PUT …/trip`:** có chặng dưới mốc kèm `datGap` → 200; không chặng nào dưới mốc kèm `datGap` → 409; ★ **hai chặng đổi, một dưới mốc, một xa, kèm `datGap`** → theo cách điều phối chọn ở Quyết định mục 6: (a) 200 và chỉ chặng dưới mốc mang dấu, chặng xa không mang dấu; hoặc (b) 409 và không ghi gì.
4. **Thêm chặng `POST …/legs`:** chặng mới dưới mốc kèm `datGap` → 200; trên mốc kèm `datGap` → 409.
5. **Thay chặng `POST …/legs/:legId/replace`:** như sửa chặng (cũ hoặc mới dưới mốc → 200; cả hai trên mốc → 409; bị chặn thì chặng cũ không bị đóng).
6. **Phạm vi:** Bán hàng sửa chặng của đơn người khác mà không phụ trách → 403 (ô `order.trip.edit`, không đổi).
7. **Một chỗ canh:** bài tĩnh — mọi chỗ ghi dấu **mới** (`legShortNotice`, tham số dấu của `changeLeg`, `addLeg`, `replaceLeg`, `updateTrip`) chỉ nhận giá trị trả về từ `xetDatGapSua`. **Ngoại lệ có tên:** tham số `datGapNhap` của lưu lại đơn nháp chỉ nhận giá trị từ `chepDatGapNhap` (chép dấu cũ từ CSDL). Kèm bài hành vi: Đối tác (hoặc Thực tập) lưu lại đơn nháp của mình có chặng Bán hàng đã đặt gấp, không đổi giờ, nơi → 200 và dấu còn nguyên.
8. **Bài ghim ô:** sửa `src/shared/permissions.test.ts:24`, `:468-472`; sửa TC-22 `src/modules/orders/dat-gap.test.ts:50`.
9. **Nhãn:** người chỉ thấy cờ thấy "Điều chỉnh khẩn cấp (văn phòng)" trên chặng và trong lịch sử đơn, người làm "Văn phòng", không tên; đuôi nhật ký " · đặt gấp: …" không đổi (bài khứ hồi của ADR-0062 xanh).
10. **Kịch bản Chrome:** `dua-don-smoke`; `dat-gap-smoke` đang đỏ sẵn từ 1.80 (`BL-VC-SMOKE-CU`) — sửa kịch bản cùng lần hoặc ghi rõ chưa chạy được.
11. `npm test`, `npm run typecheck`, `npm run test:e2e`.

## Phương án bị loại

- **Q-3 b (chỉ siết, không mở cho Bán hàng)** và **Q-3 c (giữ như hôm nay):** chủ chọn a ngày 2026-10-08.
- **Chỉ mở cho Bán hàng mà không siết:** không có trong câu hỏi, vì Bán hàng cũng có thêm đường né mốc như Quản trị hôm nay.
- **Dùng chung danh sách lý do với điều chỉnh khẩn cấp (`PHA_LE`):** `orders` không được đọc bảng `vc_` (ADR-0049 `:166`); đổi là quyết định riêng.
- **Hướng B — đặt điều kiện ở từng route thay vì trong `xetDatGapSua`:** năm chỗ canh, dễ sót một cửa; điều phối chốt Hướng A.

## Sổ dừng dây chuyền (`docs/quyen-hoan.json`, đọc 2026-10-08)

Không mục HIGH nào thuộc vùng chặng đưa đón hay ô đặt gấp. Không xây trên lỗ đang hở.

## Chỗ văn bản trình duyệt lệch mã HEAD (đo @ `19de847a`)

- `src/modules/orders/index.ts`: tệp 05 ghi `xetDatGapSua` `:94-103` (ô `:99`, nhánh vắng `:98`), câu lỗi `:83`, `:88`, gọi trong `lenhSuaChang` `:161`, nhánh `chiOPhu` `:156`, `PUT …/trip` `:850`, `POST …/legs` `:881`, nút Đặt gấp `:930-958`; nay lần lượt `:102-111` (`:107`, `:106`), `:91`, `:95-96`, `:169`, `:164`, `:893`, `:924`, `:1003-1029`.
- Route thay chặng `POST …/legs/:legId/replace` **đã có trên HEAD** (`:977`, gọi hàm `:993`), không còn chỉ ở nhánh khác như tệp 05 viết.
- `duoiMocKhiSua` đã chuyển sang `src/shared/moc-toi-thieu.ts:58-62` (tệp 05 ghi `src/modules/orders/dat-gap.ts:58, :61-65`).
- `LY_DO_DAT_GAP` ở `src/shared/chang-dua-don.ts:33-38` (tệp 05 ghi `:32-37`); dấu miễn mốc lúc xếp ở `moc-toi-thieu.ts:79`, `:116` (tệp 05 ghi `:67`, `:104`).
- Giao diện: tệp 05 ghi `web/order.ts:257, :930, :1065`, `web/sheet-dua-don.ts:93, :96, :110, :119`; nay `web/order.ts:262, :941, :1103`, `web/sheet-dua-don.ts:103, :115, :118` (gắn `datGap`), `:132`, `:141`.
- Hướng dẫn: tệp 05 ghi `huong-dan-ban-hang.ts:152-155`; nay mục "Đơn sát giờ — Đặt gấp" ở `:154-164`, thêm `:199`, `:216`; `huong-dan-doi-tac.ts` thêm `:138`, `:147`.
- Tệp 05 Hướng A chưa nêu ca `PUT …/trip` nhiều chặng (Quyết định mục 6), đường chép dấu cũ của đơn nháp (Quyết định mục 4, gạch cuối) và các chữ ★ ở mục 8, 9, 10.

## Chưa kiểm

- Số lần Quản trị đã đóng dấu đặt gấp trước nhiều ngày trên production (đường né mốc có đang được dùng hay không).
- Ca `PUT …/trip` nhiều chặng (Quyết định mục 6): người soạn chỉ đọc mã, chưa chạy thử.
- Nguyên văn câu hỏi Q-3 của lượt 8b.
