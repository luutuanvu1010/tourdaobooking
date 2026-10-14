# Đợt 2: giá đưa đón, bật/tắt đưa đón theo nhóm, điểm chọn nhanh (đặc tả đề xuất, 2026-10-14)

> Hồ sơ có ngày. **Đề xuất, chờ chủ duyệt; chưa sửa mã, chưa có ADR, chưa có kế hoạch thi công.** Căn cứ: bảng việc `2026-10-13-bang-viec-truoc-su-dung.md` §5 (chủ đã chốt phụ thu **theo người, theo chặng, theo vùng**, do Quản trị đặt; giảm giá là chính sách riêng, **không nằm trong đợt này**) và các yêu cầu 1, 6, 9. Mọi chỗ đọc mã dưới đây là đọc ở `main` ngày 14/10.

## Tóm tắt cho chủ (lời thường)

Đợt 2 gồm ba phần. Phần **2A** là chuyện tiền: mỗi chặng đưa đón có thể thu một khoản phụ thu theo đầu người, mức phụ thu tuỳ vùng của điểm đón (ví dụ chủ nêu: 20.000 hoặc 30.000 một người). Phần **2B** cho Quản trị bật hoặc tắt đưa đón theo từng nhóm dịch vụ (nhóm tắt thì form không hiện khối đưa đón và máy chủ không nhận chặng). Phần **2C** cho Quản trị đánh dấu vài địa điểm là "chọn nhanh" (Cảng Vinpearl, Bến tàu du lịch Nha Trang) để nhân viên bấm một nút thay vì gõ.

Hôm nay chặng đưa đón **không mang tiền** (đó là luật gốc của chặng, ADR-0047). Muốn thu phụ thu thì phải sửa luật này bằng một quyết định kiến trúc mới do chủ duyệt, và vì là tiền nên cần Kế toán xác nhận các ca vàng và một người kiểm độc lập. Vì vậy tôi đề nghị **tách làm hai lượt thi công**: lượt 1 làm 2B và 2C (không đụng tiền), lượt 2 làm 2A (tiền).

### Ba điều cần chủ quyết (khuyến nghị đứng đầu)

1. **Vùng lấy từ đâu, và điểm tự gõ thì tính sao.** Đề xuất: Quản trị tạo danh sách vùng, gán mỗi địa điểm trong danh mục vào một vùng. Nơi đón do nhân viên **tự gõ chữ** (không chọn từ danh mục) thì không biết vùng: **(A, khuyến nghị)** tính theo mức "ngoài vùng" do Quản trị đặt, và nếu Quản trị chưa đặt mức này thì máy chủ **không cho xác nhận** đơn có chặng như vậy (không để thu thiếu âm thầm); (B) coi như không phụ thu; (C) bắt nhân viên chọn vùng bằng tay mỗi lần.
2. **Phụ thu hiện thế nào và có tính hoa hồng đại lý không.** Đề xuất: mỗi chặng thành **một dòng tiền riêng** trong đơn ("Phụ thu đưa đón, khu A, 4 người × 20.000"), máy chủ tính, chụp lại mức tại lúc xác nhận để đổi bảng giá sau này không làm đổi đơn cũ. **(A, khuyến nghị)** phụ thu **không** tính hoa hồng đại lý và không có giá vốn; (B) tính hoa hồng như dịch vụ. Đây là câu về tiền, nên Kế toán nên đọc trước khi chủ chốt.
3. **Thứ tự thi công.** **(A, khuyến nghị)** lượt 1 = 2B + 2C trước (an toàn, thấy ngay lợi ích cho nhân viên), lượt 2 = 2A sau khi Kế toán xác nhận khoảng tám ca vàng phụ thu; (B) làm cả ba trong một lượt.

Nếu chủ không có ý kiến khác thì tôi hiểu là chọn **A cả ba**. Không câu nào ở trên được tự áp: cả ba chạm tiền, dữ liệu hoặc thứ tự việc, nên đang chờ chủ.

---

## Phụ lục cho người thi công (đọc khi đã duyệt)

### 1. Hiện trạng đã kiểm trong mã

- **Chặng không mang tiền**: `migrations/0034_chang_dua_don.sql` (bảng `ord_transfer_leg`, ADR-0047). Mỗi dịch vụ có tối đa một chặng đi và một chặng về còn hiệu lực; nơi đón/trả là điểm danh mục (`loc_location`) **hoặc chữ tự do**.
- **Dòng tiền chỉ sinh ở một hàm**: `buildLines` trong `src/shared/order-lines.ts`. Hàng rào `src/buildlines-guard.test.ts` (chỉ vài chỗ được gọi, đối số thứ ba bắt buộc), `src/thanh-tien-mot-ham.test.ts` (một công thức thành tiền), `src/hoa-hong-mot-nguon.test.ts` (một nguồn tính hoa hồng). Thêm một loại dòng tiền mới = sửa cả ba bài này có chủ đích.
- **Danh mục không có khái niệm vùng** (đã tìm trong migration và `locations`). Nhóm dịch vụ: bảng `ctl_group`, `ctl_service_group` (migration 0055, ADR-0058); gán nhóm chỉ trong ứng dụng, mỗi dịch vụ đúng một nhóm, dịch vụ chưa gán ở "Chưa phân loại".
- **Địa điểm**: `loc_location`, `loc_location_type` (migration 0010, 0034 thêm HOTEL/AIRPORT/CABLE_CAR; 0091 thêm địa chỉ). Chưa có cờ "chọn nhanh".
- Khách tính tiền đã có sẵn: `payingGuests` (mọi loại trừ em bé).

### 2. Thiết kế đề xuất

**2A, phụ thu (tiền, cần ADR riêng + sổ vàng)**
- Bảng mới `ctl_` hay `ord_` (ADR quyết tiền tố theo module chủ): vùng; địa điểm thuộc vùng (tối đa một); mức phụ thu = (vùng hoặc "ngoài vùng", chiều đi/về/cả hai, số đồng mỗi người, hiệu lực từ–đến, không xoá cứng, khuôn bảng giá hiện có).
- Vùng của chặng: chặng đi lấy **nơi đón**; chặng về lấy **nơi trả** (đầu khách sạn). Giả định của người soạn, chủ xác nhận khi duyệt.
- Số người = `payingGuests` của dịch vụ có chặng (em bé miễn). Mức = mức còn hiệu lực lúc **xác nhận**; đơn nháp hiện "dự kiến".
- Dòng phụ thu sinh ở máy chủ cùng lô với dòng dịch vụ, mã danh mục dành riêng; người dùng không sửa được giá dòng này (kể cả Đối tác / Thực tập theo ADR-0100). Đổi chặng sau xác nhận đi qua lệnh thay chặng hiện có (một lô) và chụp lại dòng phụ thu cùng lô.
- Nhóm đã **tắt đưa đón** (2B) thì không có chặng nên không có phụ thu.

**2B, bật/tắt đưa đón theo nhóm (dữ liệu)**: thêm cờ trên `ctl_group` (mặc định bật). Nhóm tắt: form ẩn khối đưa đón, máy chủ **từ chối** thêm/sửa chặng cho dịch vụ thuộc nhóm đó (lưu nháp, xác nhận, sửa chuyến, thay chặng đều qua cùng luật), đơn đã có chặng giữ nguyên (không xoá cứng). Đổi cờ ghi nhật ký theo khuôn gán nhóm. "Chưa phân loại" luôn cho phép.

**2C, điểm chọn nhanh (dữ liệu nhỏ)**: thêm cờ và thứ tự trên `loc_location`, Quản trị đặt ở màn Địa điểm; form Tạo đơn hiện hàng nút ở **Nơi trả** (và ô "Khách có mặt tại" khi có), bấm điền điểm danh mục. Gieo cờ cho Cảng Vinpearl và Bến tàu du lịch Nha Trang nếu đã có trong danh mục (kiểm lúc thi công, không đoán).

### 3. Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| Bảng dùng chung nhận thêm loại gì | `order_item` nhận thêm **dòng phụ thu đưa đón** (không phải dịch vụ danh mục). |
| Dòng bản đồ quyền nào chạm | Ghi bảng phụ thu / vùng: Quản trị, Toàn quyền (dùng ô có sẵn, ADR quyết; thêm ô mới thì nhân đôi mọi bài tập con quyền). Ghi cờ nhóm và cờ điểm: ô `admin.manage` hiện có. |
| Cổng nào canh cửa nào | Máy chủ chặn chặng cho nhóm tắt; máy chủ tính phụ thu (không tin số tiền từ trình duyệt); giao diện chỉ ẩn/hiện khối đưa đón và hiện nút chọn nhanh, **không phải cổng**. |

### 4. Tiêu chí nghiệm thu (hành vi kiểm được, viết trước khi làm)

1. Đơn 4 khách, chặng đi ở điểm thuộc vùng 20.000: tổng tăng đúng 80.000, một dòng phụ thu riêng, máy chủ tính; gửi số tiền khác từ trình duyệt vẫn ra 80.000.
2. Em bé không tính; điểm tự gõ không có vùng: đúng theo quyết định 1 (A: dùng mức ngoài vùng, thiếu mức thì xác nhận 409).
3. Đổi bảng mức sau khi xác nhận: đơn cũ giữ nguyên số tiền; đơn nháp mới theo mức mới.
4. Nhóm tắt đưa đón: form không hiện khối; POST/PUT đơn có chặng cho dịch vụ nhóm đó trả lỗi tiếng Việt; đơn cũ có chặng vẫn mở được.
5. Bán hàng / Đối tác / Thực tập ghi bảng phụ thu, cờ nhóm, cờ điểm: 403; Quản trị, Toàn quyền: được, có nhật ký, nhật ký không ghi tên khách.
6. Ba hàng rào tiền (`buildlines-guard`, `thanh-tien-mot-ham`, `hoa-hong-mot-nguon`) vẫn xanh sau khi cập nhật có chủ đích; hàng rào **mới** chặn mã tự cộng phụ thu ngoài hàm duy nhất (đỏ khi cố ý lách, quan sát một lần, ghi `docs/SO-HANG-RAO.md`).
7. Sổ vàng mới `golden/phu-thu-dua-don.json` (ca chờ Kế toán, `test.todo`): khoảng tám ca gồm một vùng, hai chặng, em bé, điểm tự gõ, đổi mức, nhóm tắt, đại lý có hoa hồng.

### 5. Chia thi công (mỗi việc một phiên, người thi công khác người kiểm)

- **Lượt 1** (2B + 2C): một migration thêm cờ, ADR nhỏ, test đỏ trước; việc lớn vì chạm dữ liệu nên có người kiểm độc lập chỉ đọc; kịch bản Chrome cho form (ẩn khối, nút chọn nhanh).
- **Lượt 2** (2A): ADR riêng sửa luật "chặng không mang tiền", migration bảng mới, sổ vàng cho Kế toán đọc **trước khi viết mã** (khuôn tờ đối chiếu đã làm cho 25 ca), người kiểm độc lập, cần `npm run trien-khai` do chủ chạy.
- Mỗi lượt duyệt tối đa ba quyết định chạm quyền/dữ liệu (CLAUDE.md §9): hai ADR là hai lượt duyệt riêng.

### 6. Điều chưa kiểm và rủi ro

- **Xây trên lỗ đang hở:** không có mã nào trong `docs/quyen-hoan.json` nằm trên đường mã của Đợt 2 (đường tính dòng tiền và chặng), nhưng lượt 2 chạm sổ tiền ở dòng đơn nên người thi công **phải đọc lại sổ hoãn** (TNV-G1, G3, G4, HC-4.2 đang mở, hạn 31/10) lúc bắt đầu và ghi kết luận vào nhật ký thi công; năm mục hạn 31/10 làm `npm test` đỏ mọi nhánh từ 1/11.
- Số migration kế tiếp và số ADR kế tiếp phải kiểm lại lúc thi công: `main` đã có migration 0095, ADR gắn vai 0117 lần 2 và các nhánh chưa gộp có thể giữ số.
- Chưa hỏi Kế toán về hoa hồng/giá vốn trên phụ thu; chưa xem dữ liệu thật để biết điểm đón nào hiện là chữ tự gõ (cần một câu đếm chỉ-đọc trước khi chủ chọn A hay B ở quyết định 1).
- Mức 20.000 / 30.000 là ví dụ chủ nêu, **không phải** hằng số trong mã; mọi mức do Quản trị đặt.
