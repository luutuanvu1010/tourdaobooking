# Rà soát bản nháp phân hệ Vận chuyển — tổng hợp ba người rà độc lập

- **Ngày:** 2026-09-27.
- **Vật rà:** `docs/superpowers/specs/2026-09-27-van-chuyen-design.md` @ 9e5f557.
- **Vai:** phiên điều phối tổng hợp; ba người rà **độc lập, chỉ đọc**, mỗi người một lăng kính:
  - (A) phá thử logic;
  - (B) Hiến pháp + Hiến chương + ADR đã duyệt;
  - (C) triết lý Oracle (tệp gốc của chủ).
- **Bản tổng hợp này chưa có người kiểm độc lập.** Báo cáo gốc ở Phụ lục A–C.

## 1. Kết luận

Hướng đúng: phân hệ mới, dữ liệu thuộc người, luật thuộc phân hệ, điều kiện xuất bến là chính sách có ngày hiệu lực được chụp lúc xuất bến.

**Chưa sẵn sàng soạn ADR**, vì phân hệ đứng trên ba nền mà nền chưa có:
1. **Số khách hiện hành một nguồn.** Sau khi xác nhận, số khách sửa nằm trong `order_money_adjustment.after_json`, chỉ một hàm đọc được (`orders/money-adjustment.ts`:39-60). Cùng gốc với H3/T1 của gói "dọn nền" (chủ duyệt 27/9).
2. **"Chặng đưa đón" và danh sách hành khách là dữ liệu mới của `orders`** (module LEGACY, tiền tố `ord_` chờ ADR-0031).
3. **Tour Đảo là hồ sơ tổ chức** (T2b).

## 2. Phát hiện hội tụ (≥ 2 người rà) → sửa

| # | Phát hiện | Người rà | Sửa |
|---|---|---|---|
| H1 | Số khách hiện hành không đọc được qua view; bản nháp đọc qua view sẽ kiểm sức chứa bằng số cũ | A0, B N-1, C1 | `orders` công bố MỘT hàm/nguồn có kiểu "số khách hiệu lực". Luật sức chứa giữ ở máy chủ, khai "lệch có chủ ý 5.1" phạm vi hẹp (tiền lệ ADR-0029/0030). Ghi "xây trên lỗ đang hở" tới khi có hàm này. |
| H2 | Nhu cầu đưa đón chưa là thực thể: một ô giờ + một ô chữ; không nơi trả, không chiều về, thiếu cờ "có hẹn đón" (ADR-0006 điều 6); đơn sân bay qua nửa đêm | A14/A-câu 3, B-QT2, C2 | `orders` sở hữu **chặng đưa đón**: chiều, nơi đón, nơi trả, ngày giờ hẹn, số người. Vận chuyển chỉ phân bổ (giữ ADR-0006 điều 5). |
| H3 | Không biết ai đi xe nào: danh sách gắn đơn nhưng không nối người ↔ chuyến; nhóm tách hai xe; HDV/phụ xe không có chỗ; L9 không chụp danh sách | A5/A17, B-QT9, C3/C4 | Bảng **phân bổ người vào chuyến** (từng khách + người đi kèm gắn hồ sơ), là thực thể có vòng đời. Bất biến "tổng phân bổ ≤ nhu cầu". **Danh sách có phiên bản chốt lúc xuất bến**, lưu 3 năm, không đổi theo lần sửa sau. |
| H4 | Vai và quyền tài xế bị lẫn. Đưa DRIVER vào nhóm nội bộ thì lượt 2 hết chỗ; lấy vai làm cổng chọn người là trái ADR-0001:21 | A0, B N-2/N-3, C7 | Hai vai **Tài xế công ty / Tài xế đối tác** (tiền lệ GUIDE_INTERNAL/FREELANCE, `0024`:10-11), `handles: "never"`. **Quyền app "Tài xế"** riêng. Đủ điều kiện lái xét bằng **giấy tờ còn hạn, đúng hạng**, không xét bằng vai. Tài xế ↔ nhà xe là quan hệ có hiệu lực. |
| H5 | Giấy tờ sửa đè được; ai sửa hạn là mở khoá xuất bến; chưa có ô quyền cho giấy tờ | A8, B N-3, C6 | Giấy đã dùng thì bất biến; gia hạn = dòng mới. Sửa có lý do, trước→sau, ảnh giấy. **Ô quyền riêng** cho người ghi giấy tờ, tách khỏi người điều xe. Xuất bến chụp **giá trị** (biển số, sức chứa, hạng, hạn), không chỉ tham chiếu. |
| H6 | Bản nháp bỏ lớp CSDL. Thật ra Hiến chương 5.3 cho trigger đọc view công bố | A8, B N-1, C4 | Đưa xuống CSDL: trùng giờ + nghỉ (chỉ dữ liệu `vc_`); unique "một chuyến đang chạy mỗi xe"; máy trạng thái chỉ đi tiến; trigger chặn "Đã xuất bến" khi thiếu dòng chụp đạt; kiểm giấy tờ qua view `v_pty_*`. |
| H7 | Cột "xe của công ty" là lệch mới cùng loại nợ 2.1 | B-QT3, C5 | Làm T2b trước, hoặc ghi lệch có chủ ý có hạn. Chủ xe / bên khai thác là khoá tới hồ sơ, có hiệu lực. |
| H8 | Dữ liệu cá nhân trong nhật ký, Bảng tin, hàng đợi ngoại tuyến | A4, B-QT4 | Nhật ký không chứa số CCCD/GPLX, tên, năm sinh, chữ tự do. DTO danh sách trắng cho tài xế. Che số CCCD; "xem đủ" ghi nhật ký. Mỗi thứ có hàng rào + dòng sổ (P16). |
| H9 | Giờ: giờ dân sự VN và UTC; chuyến qua nửa đêm; tài xế mất sóng | A13/A18, B-QT10, C10 | Một hàm đổi có test. Mốc so sánh số học lưu INTEGER (Phần II). Lưu cả giờ máy tài xế báo và giờ máy chủ nhận. Mã chống trùng unique, cùng lô với bước chuyển. |

## 3. Phát hiện riêng đáng giữ

- **(A)** Khuôn ghi nguyên tử cho: xếp xe, xếp tài xế, xuất bến, đã đón, kết thúc. Máy trạng thái chuyến / điểm dừng / khách, gồm "kết thúc gián đoạn", "chuyển xe", "vắng → đón muộn".
- **(A)** "Khách bị bỏ quên" (đơn có hẹn đón chưa lên chuyến nào trước N giờ) → câu kiểm định kỳ.
- **(B)** Trạng thái là `CHECK` đóng → định trọn tập ngay từ đầu (có sự cố), khỏi dựng lại bảng.
- **(B)** Lý do huỷ chuyến là danh sách đóng (ADR-0030 điều 2).
- **(B)** "Giữ" (5.7) áp lần đầu → một chỗ sống duy nhất cho K9, để Hoàn tất dùng lại.
- **(C)** **Hợp đồng vận chuyển là thực thể** (số, bên vận chuyển, bên thuê, điểm được phép); danh sách hành khách ghi số hợp đồng; việc gửi (từ 2028) đi qua hộp thư đi.
- **(C)** Điểm dừng tại khách sạn / sân bay / ga / bến bắt buộc là `loc_location`; nhà riêng giữ chữ.
- **(C)** Xe định danh bằng số khung. Vòng đời xe riêng (hoạt động / bảo dưỡng / ngừng). Khung "không sẵn sàng" dùng chung cho xe và người (lượt 2 dùng lại cho "báo bận").
- **(C)** Lượt 3: chụp bên vận chuyển, loại xe, tuyến, mốc huỷ lúc xuất bến, để sau này hình chiếu chi phí có nguồn.

## 4. Câu ADR phải thay (bảng của người rà B, rút gọn)

| Nguồn | Hướng |
|---|---|
| ADR-0002 (tiền tố, đồ thị, bảng sở hữu) | bổ sung module `van-chuyen`, `vc_` |
| ADR-0006 điều 15, 17, 18, 20 (PICKUP/DROPOFF, "tài xế đón…", "đã đón" ở `dsp_assignment`) | xe đường bộ → Chuyến; PICKUP/DROPOFF tắt hoặc cấm trùng; BOAT giữ |
| ADR-0001:42, :48 (`order_traveller` đã loại; câu 7 thuộc `dispatch`) | mở lại, có lý do; chốt nguồn thật khi số khách lệch danh sách |
| ADR-0018:25, :31, :39 (11 vai; LC-1; bên ngoài là bên đặt) | thêm hai vai tài xế; lượt 2 sửa LC-1 |
| ADR-0019:26-36, :50, :61 (cổng; `contact.view`; `task.progress`) | cổng tài xế; ô mới có tên |
| ADR-0013:21 (`party.staff.write`) | giấy tờ theo ô nào |
| Hiến chương 2.1, 5.1 | lệch có chủ ý, phạm vi hẹp, có hạn |

## 5. Điều kiện nền và thứ tự đề xuất

1. Gộp lượt 1 ADR-0030 (đang chờ bản vẽ giao diện HDV của chủ).
2. **Nền (trong gói "dọn nền" đã duyệt, mở rộng thêm):**
   - "số khách hiệu lực" một nguồn;
   - ADR-0031 + T3b (`ord_`);
   - T2b (Tour Đảo là hồ sơ).
3. **Vận chuyển.** Tối đa 3 quyết định mỗi lượt duyệt, kèm trang ghép:
   - **Lượt A:** module + Chuyến + phân bổ + trạng thái + "giữ" + thay ADR-0006; hợp đồng đọc dữ liệu + lệch 5.1; cấu hình + mã giấy tờ cố định.
   - **Lượt B:** vai/quyền/cổng tài xế; ô quyền của chuyến; giấy tờ (ai ghi, CCCD, hàng rào nhật ký).
   - **Lượt C** (phía `orders`): chặng đưa đón; danh sách hành khách; bản chốt lúc xuất bến.
4. Thi công.

**Cách rút ngắn đường găng** (đề xuất cho chủ): tách **lượt 1a** gồm hồ sơ xe, giấy tờ xe, tài xế, giấy tờ người, cấu hình, nhắc hạn. Phần này không phụ thuộc Đơn hàng, làm được ngay sau lượt duyệt A/B. Phần chuyến xe (1b) làm khi nền xong.

## 6. Chủ đã quyết

> **CHỦ ĐÃ QUYẾT 2026-09-27 (phiên điều phối), nguyên văn: `1b, 2i`.**
> - **1b — đường đi:** làm ngay **lượt 1a** (hồ sơ xe, giấy tờ xe, tài xế, giấy tờ người, cấu hình, nhắc hạn). Phần điều xe và chuyến xe (**1b**) làm sau khi nền xong (số khách hiệu lực; chặng đưa đón + danh sách hành khách ở `orders`; tiền tố `ord_`).
> - **2i — chủ xe công ty:** làm **T2b trước** (Tour Đảo là hồ sơ tổ chức, theo ADR-0024 điều 6 đang proposed). Không dùng cờ tạm "xe của công ty".
> - Việc áp dụng (điều phối ghi, chủ không phản đối):
>   - đủ tên cho số khách đã đặt lúc xuất bến; tài xế sửa/bổ sung lúc đón;
>   - phân bổ từng người vào chuyến;
>   - chặng có ngày + giờ hẹn riêng;
>   - giấy tờ không sửa đè;
>   - hai vai tài xế + một quyền app;
>   - đủ điều kiện lái xét bằng giấy tờ.
> - Còn chờ chủ: một nơi giữ tên/MST/địa chỉ Tour Đảo (T2b).

---

## Phụ lục A — Người phá thử (nguyên văn)

Tầng giữ luật: CSDL (trigger/unique/check) · MC (máy chủ lúc ghi) · ĐỌC (kiểm lại khi đọc) · ĐK (kiểm định kỳ). [L1] = lượt 1.

### 0. Mìn đã có trong repo
- ADR-0006 (đã duyệt), điều 7, đặt "đã đón" ở `dsp_assignment`. Vận chuyển tự ghi thì thành nguồn thứ hai ⇒ cần ADR thay.
- Số khách hiện hành = `pax_*` + lớp phủ `order_money_adjustment`. Chỉ đọc qua MỘT hàm của `orders`; không tự đọc `after_json` (lỗi Đợt E).
- ADR-0018 chưa có vai Tài xế nội bộ. `TAXI_DRIVER` là vai ngoài; LC-1 chỉ cấp quyền Đối tác ⇒ tài xế đối tác ở lượt 2 bị vướng. Vai không cấp quyền; điều kiện được lái xét bằng giấy tờ.

### 1. Máy trạng thái (trigger chỉ đi tiến, như 0017)

**Chuyến** (một chiều; chiều về là một chuyến riêng):
- KẾ HOẠCH → ĐANG CHẠY → KẾT THÚC; hoặc KẾ HOẠCH → HUỶ.
- Chỉ sửa được khi còn KẾ HOẠCH (người điều xe).
- Xuất bến và Kết thúc: tài xế được giao bấm, hoặc văn phòng bấm thay (có ghi). Sai điều kiện → 409.
- Khi ĐANG CHẠY: cấm huỷ; chỉ được "kết thúc gián đoạn" kèm lý do.
- Kết thúc thường bị chặn khi còn điểm CHỜ.
- KẾT THÚC và HUỶ: trigger cấm sửa và xoá.

**Điểm dừng:**
- CHỜ → ĐÃ XONG | BỎ QUA (có lý do).
- Chỉ khi chuyến đang chạy; tài xế đang mở hoặc văn phòng bấm thay; được đi lệch thứ tự.

**Khách trên chuyến** (dịch vụ × chiều, có điểm lên và điểm xuống):
- CHỜ → ĐÃ LÊN | VẮNG.
- CHỜ hoặc ĐÃ LÊN → CHUYỂN XE.
- VẮNG → ĐÃ LÊN (đón muộn) là bước lùi duy nhất.
- Rút khỏi chuyến trước xuất bến = đóng dòng.
- Vắng không tự huỷ đơn.
- Số người lên = số tên được đánh dấu.

### 2. Tình huống → luật → tầng

1. **Xếp chồng giờ xe/tài xế.** Điều kiện chồng lịch nằm TRONG câu ghi, không dựa vào "không đổi từ lúc đọc"; thêm trigger INSERT/UPDATE làm lưới [CSDL+MC][L1]. Unique `(xe) WHERE đang chạy`: chuyến trước chưa kết thúc thì không xuất bến chuyến sau [CSDL][L1].
2. **Sức chứa từng đoạn.** Σ người có điểm lên ≤ k < điểm xuống, kể cả HDV, ≤ số chỗ. Một hàm, chạy khi sửa, khi xuất bến, khi đón [MC][L1]. Hai người cùng thêm khách → mọi lần sửa tăng `phiên_bản` của chuyến (`WHERE phiên_bản=?`) [CSDL][L1].
3. **Đơn đổi số khách, ngày/giờ đón (`PUT /trip`) hoặc bị huỷ sau khi xếp.**
   - Chụp số người vào dòng. Mỗi lần đọc so với số hiện hành; lệch thì GIỮ chuyến (5.7), chờ người điều xe xác nhận [ĐỌC+MC][L1].
   - Văn phòng vẫn huỷ đơn được sau khi xuất bến: không chặn (5.9); dòng giữ lại kèm cờ [ĐK][L1].
4. **Khách bị bỏ quên:** đơn có hẹn đón mà chưa lên chuyến nào, trước giờ đón N giờ [ĐK][L1].
5. **Một nhóm trên hai chuyến** → unique `(order_service_id, chiều)` trên dòng mở [CSDL][L1]. Nhưng như vậy cấm luôn việc tách 20 khách ra hai xe.
6. **Chỉ đơn đã xác nhận.** Câu thêm dòng mang `EXISTS(đơn đã xác nhận, qua view)` [CSDL+MC][L1]. Dòng trỏ vào đơn nháp sẽ làm hỏng việc lưu nháp (xoá–tạo lại dịch vụ, ADR-0006 điều 1).
7. **Giấy tờ hết hạn giữa chuyến** → hạn phải ≥ ngày KẾT THÚC dự kiến; báo sớm ngay lúc xếp [MC][L1].
8. **Giấy tờ tài xế (ở `parties`) bị sửa hoặc hết hạn sau khi xếp.**
   - Gắn cờ mỗi lần đọc. Câu xuất bến đọc lại view `v_pty_*` ngay trong WHERE (tiền lệ `BOOKER_VALUE`). ĐK: chuyến trong 48 giờ tới hoặc đang chạy mà không đạt [ĐỌC+MC+ĐK][L1].
   - Khác chỉ thị: Hiến chương 5.3 cho phép trigger trên bảng của Vận chuyển đọc view công bố — điều phối chốt.
   - `parties` nên lưu bản mới, không sửa đè. Xuất bến chụp id giấy tờ, hạng, hạn (5.6).
9. **Hạng GPLX so với số chỗ ĐĂNG KÝ của xe**, không so khách thực tế. Hạng là mã; bảng hạng có hiệu lực (hạng cũ và mới cùng tồn tại). Mã lạ hoặc đã ngưng → CHẶN [MC][L1].
10. **Bộ điều kiện cấu hình rỗng** → sàn cứng trong mã (có xe, có tài xế, hạng đủ). Cấm đặt hiệu lực lùi ngày [MC][L1].
11. **Đổi tài xế giữa chuyến** → đóng dòng cũ, mở dòng mới cùng mốc, trong một lô; unique một tài xế mở mỗi chuyến; kiểm người mới [CSDL+MC][L1].
12. **Xe hỏng** → kết thúc gián đoạn + một chuyến cứu hộ mới (đi qua cổng xuất bến). Cùng lô: đóng dòng cũ (CHUYỂN XE), mở dòng mới — không vướng unique ở mục 5. Khách vắng được xếp lại cũng theo cách này [MC][L1].
13. **Mất sóng, bấm lặp** → mã yêu cầu sinh lúc bấm, gửi lại y nguyên, unique; bấm lặp trả lại kết quả cũ [CSDL][L1]. Giờ thật là giờ máy chủ; giờ máy tài xế chỉ để tham khảo; hàng đợi gửi đúng thứ tự [MC][L1].
14. **Giờ hẹn khách ≠ giờ điểm dừng** → không chép sang nhau (ADR-0006 điều 5). Xe tới SAU giờ hẹn thì cảnh báo [ĐỌC]. Giờ các điểm không giảm; điểm lên đứng trước điểm xuống [MC+CSDL][L1].
15. **Khoảng nghỉ đổi giá trị** → chụp vào chuyến; khi so dùng max(nghỉ đã chụp ở chuyến cũ, giá trị mới) [CSDL+MC][L1].
16. **Ngưng xe hoặc giảm số chỗ khi còn chuyến chưa xong** → 409 kèm danh sách các chuyến đó [MC][L1].
17. **Thiếu tên** → tài xế thêm tại chỗ; "Đã đón" không nhận người không tên. Số tên được đánh dấu > số khách của đơn → gắn cờ cho văn phòng [MC+ĐK][L1].
18. **Qua nửa đêm** → mốc lưu bằng số nguyên giây UTC (so chuỗi `datetime()` với dạng có chữ `T` sẽ sai). CHECK: kết thúc > bắt đầu, và không quá 24 giờ [CSDL][L1].
19. **[SAU]:** một người trên hai chuyến do đơn trùng (so tên + năm sinh); thời gian di chuyển giữa các điểm; giờ lái tối đa (cần xác nhận luật).

### 3. Khuôn ghi

Mỗi thao tác là một `db.batch()`. Câu chốt có điều kiện; các câu sau và nhật ký mang `wonGuard`. `changes()=0` ⇒ đọc lại, trả 409 đúng lý do.
- **Xếp xe:** `UPDATE chuyến WHERE KẾ HOẠCH AND phiên_bản=? AND NOT EXISTS(chồng lịch)`.
- **Xếp tài xế:** `INSERT…SELECT WHERE NOT EXISTS(dòng mở, chồng lịch) AND EXISTS(view giấy tờ đạt)`; lỗi unique → 409.
- **Xuất bến:** cổng MC, rồi `UPDATE WHERE KẾ HOẠCH AND phiên_bản=? AND giấy tờ xe + tài xế (view) đạt AND NOT EXISTS(đơn huỷ)` → ghi bản chụp. Số khách (nằm trong JSON) không ép được bằng SQL: bù bằng ĐỌC.
- **Đã đón:** chèn sự kiện (kèm mã yêu cầu) → `UPDATE điểm WHERE CHỜ AND chuyến đang chạy AND người gọi hợp lệ`.
- **Kết thúc:** `UPDATE WHERE đang chạy AND NOT EXISTS(điểm CHỜ)` → đóng dòng tài xế. Kết thúc gián đoạn: cùng lô, chuyển các điểm CHỜ sang BỎ QUA trước.

### 4. Dữ liệu cá nhân, lưu trữ
- View của `parties` cho Vận chuyển chỉ có: loại, hạng, hạn, trạng thái — không có số CCCD/GPLX.
- Số CCCD: Quản trị, Toàn quyền và chính người đó được xem. Mặc định che số; lần "xem đủ" được ghi nhật ký.
- Danh sách khách: văn phòng có `contact.view`; tài xế chỉ thấy chuyến của mình, tới hết ngày kết thúc. Phải thử lỗ IDOR (đổi id để xem chuyến người khác).
- Nhật ký và Bảng tin: chỉ ghi số lượng, không ghi tên hay năm sinh.
- Hàng đợi ngoại tuyến chỉ giữ lệnh, không giữ danh sách khách (giữ bất biến "không cache `/api/*`").
- Lưu ≥ 3 năm: trigger cấm xoá/sửa danh sách đã chốt. D1 Time Travel chỉ giữ ~30 ngày ⇒ cần xuất bản sao định kỳ [SAU].

### 5. Phân lượt
[SAU] gồm mục 2.19, sao lưu, và các việc lượt 2; còn lại là [L1].

### Câu cần chủ trả lời
1. Danh sách đủ tên bắt buộc lúc xuất bến hay lúc đón? (đề xuất: lúc đón)
2. Lượt 1 có cần tách một nhóm lên hai xe không?
3. Đơn sân bay (bay 00:40, đón 22:30 hôm trước) có cần thêm "ngày giờ đón" không?
4. ADR cần có:
   - vai/quyền Tài xế (sửa ADR-0018);
   - "đã đón" (thay ADR-0006 điều 7);
   - view trạng thái đơn: `v_ord_order_label` chỉ có id, mã — dùng `v_ord_order_state` của ADR-0024 (chưa duyệt)?

### Năm luật quan trọng nhất
1. Chồng lịch chặn ngay trong câu ghi + trigger + unique một chuyến đang chạy mỗi xe.
2. Xuất bến là cổng: sàn cứng; giấy tờ còn hạn tới giờ kết thúc; kiểm lại ngay trong câu ghi.
3. Sức chứa từng đoạn: một hàm; khoá phiên bản chuyến.
4. Lệnh của tài xế: mã chống trùng, giờ máy chủ, chuyển trạng thái có điều kiện.
5. Dữ liệu của module khác: kiểm lại khi đọc và khi xuất bến; lệch thì giữ chuyến.

## Phụ lục B — Người rà Hiến pháp/Hiến chương/ADR (nguyên văn)

### Nghiêm trọng

**N-1 (chặn lượt A). Đọc dữ liệu đơn qua view.**
- Số khách hiện hành sau khi xác nhận nằm trong JSON `order_money_adjustment.after_json`, và chỉ có một hàm đọc (`orders/money-adjustment.ts:39-60`).
- View chỉ được chứa khoá + nhãn + cờ (ADR-0002 điều 3; Phần II quy tắc 4). `v_ord_order_label` chỉ có `id, order_code`.
- Sửa:
  - L1, L5 đọc qua hàm công bố của `orders`, kèm khai "lệch có chủ ý 5.1" ở phạm vi hẹp nhất (tiền lệ ADR-0029/0030).
  - L3, L4, L6 có lớp CSDL qua view chỉ gồm khoá + cờ (như `v_ord_order_state` đề xuất ở ADR-0024).
  - Thêm trigger chặn chuyển sang "Đã xuất bến" khi thiếu dòng chụp L9 đạt.
- §3 của bản nháp sai: Hiến chương 5.3 CHO PHÉP trigger đọc view công bố (`0024:75-79`).
- P21: [MC] và [ĐL] dùng chung một hàm nên không phải hai lớp độc lập; L5 chỉ có một lớp.

**N-2 (chặn lượt B). Vai và quyền Tài xế bị lẫn.**
- ADR-0005:14 tách quyền app khỏi vai, nhưng bản nháp gọi cả hai là DRIVER.
- ADR-0018:25 chốt 11 vai; `roles.ts:7-9` không có DRIVER.
- `role_group` gắn theo loại vai: đưa DRIVER sang nội bộ thì lượt 2 hết chỗ cho tài xế đối tác.
- Tiền lệ `0024:10-11`: GUIDE đã được tách thành hai vai nội bộ / độc lập.
- ADR-0001:21 cấm lấy vai làm cổng chọn người, trừ khi khai thành luật cứng như LC-2 (ADR-0018:31).

**N-3 (chặn lượt B). "Văn phòng lập hồ sơ tài xế (vai, tài khoản) + giấy tờ".**
- Gán vai hồ sơ cần `admin.manage` + cấp bậc (ADR-0019:45). Nếu DRIVER vào nhóm nội bộ, màn Hồ sơ trả 409 `role_via_account` (`parties/index.ts:54`).
- Hồ sơ gắn tài khoản chỉ quản trị cấp trên được sửa (ADR-0013:21-23).
- Chưa định: giấy tờ thuộc ô quyền nào, ai ghi, tài xế có tự sửa được không.
- Hậu quả: phải nới quyền văn phòng, mở lại kiểu lỗ F-01. Ai sửa được hạn GPLX là mở khoá được xuất bến.

### Quan trọng

1. **Danh sách khách đặt vào `orders` (LEGACY).**
   - Module này không có kiểm EXPLAIN, không có R-N1-9, chưa có tiền tố `ord_` ⇒ thêm một lệch mới cùng loại (6.3).
   - Cần ADR-0031 + T3b + trigger chặn xoá.
   - Theo mục 0.11, lượt A không phát hành được trước lượt C.
2. **Cờ "có hẹn đón"** mà ADR-0006:19 đòi vẫn chưa có (`0008`); chiều về không có chỗ ghi ⇒ sót khách mà không phát hiện được.
3. **Cột "xe của công ty"** lặp lại nợ 2.1 (6.3) ⇒ thêm một chỗ phải di trú sau T2b. Phần "lỗ đang hở" chỉ soi `phat_hien`, bỏ sót 5.13 (T2b, "giữ", ADR-0031, cờ đón).
4. **Nhật ký chỉ-thêm ⇒ lỡ ghi thì không gỡ được.**
   - 5.12 chưa nêu CCCD; được siết thêm (9.7) nhưng cần hàng rào.
   - Phải phủ cả số GPLX, tên và năm sinh, chữ tự do; phần "trước→sau" không chép số.
   - Lý do huỷ chuyến phải là danh sách đóng (ADR-0030 điều 2).
5. **L2 chỉ dùng dữ liệu `vc_`** ⇒ làm được bằng trigger (đúng tinh thần ADR-0003 điều 7). Thiếu trigger thì đường sửa giờ hoặc đổi xe có thể lách câu ghi có điều kiện.
6. **Trạng thái chuyến/khách là `CHECK` đóng** mà phần "sự cố" còn bỏ ngỏ ⇒ thêm trạng thái về sau phải dựng lại bảng.
7. **Tài xế xem SĐT, nơi đón:** ADR-0019:50 đòi `contact.view` theo phạm vi đơn ⇒ cần một ô quyền mới có tên. Dùng lại `task.progress` (ADR-0019:61) hay nới `settings.ops` đều là đổi nghĩa ô đã duyệt ⇒ phải ghi vào ADR.
8. **"Giữ" (5.7) được áp lần đầu:** K9 cần đúng một chỗ sống (Điều 3), nếu không Hoàn tất sẽ làm bản thứ hai. Thiếu dòng chính sách thì giữ, không đoán.
9. **5.2/5.6:** L9 đạt. ADR phải ghi mốc chụp là lúc xuất bến, chụp cả số chỗ, hạng bằng và danh sách khách; nếu không, bản lưu 3 năm sẽ đổi theo các lần sửa sau.
10. **Giờ:** giờ dự kiến là giờ dân sự VN, giờ thật là UTC (Phần II dòng 213-214) ⇒ cần một hàm đổi có test, tránh lỗi khung 00:00–07:00.
11. **Lượt 2** (phải đưa vào trang ghép):
    - ADR-0018:39 "bên ngoài là bên đặt";
    - LC-1 (`roles.ts:44`);
    - ADR-0034 điều 6 (nhánh chưa gộp) coi "nội bộ" = có quyền khác PARTNER ⇒ tài xế ngoài sẽ nhận tin nội bộ;
    - hàng rào Bảng tin chỉ thấy `/api/orders*`.

### Hàng rào cần dòng sổ + ngày thấy chặn (P16)
- Cần có:
  - trigger L7;
  - L9 chỉ-thêm;
  - trigger chặn xoá danh sách khách;
  - L2;
  - DTO danh sách trắng cho tài xế;
  - che số CCCD;
  - bài "nhật ký không chứa số";
  - sửa bài khoá cổng.
- [ĐL] "kiểm mỗi lần đọc" KHÔNG phải hàng rào.
- R-N1-12 không bắt được cổng vai đi qua view.

### Nhỏ
- `orders/pool.ts` mới chỉ có ở nhánh chưa gộp.
- ADR-0037 và migration 0026 còn trống.
- Thiếu dòng "Hiến chương áp" (6.1) và phần khai cửa một chiều/hai chiều (7.2).
- "Khách trên chuyến" là thực thể, không phải vai.
- Trang ghép còn thiếu `pty_role_type`, `stf_permission_type`, `order_service` và ba danh sách cổng.

### ADR-0001 mục 7
- Không trái điều 7 (ADR-0001:26: danh sách này không phải hồ sơ).
- Nhưng nó mở lại phương án đã loại (ADR-0001:42 "order_traveller… không tên… chưa ai cần").
- ADR mới phải nêu rõ câu đó, và chốt bên nào là nguồn thật khi số khách lệch với danh sách (N7).

### Câu ADR phải thay

| Nguồn | Câu cũ | Hướng |
|---|---|---|
| ADR-0002:15, :27-49 | tiền tố; đồ thị; bảng sở hữu | bổ sung |
| ADR-0006:15, :17, :18, :20 | `PICKUP`/`DROPOFF`; "tài xế đón ở khách sạn"; "tài xế đón mấy giờ" đọc `PICKUP`; "đã đón" ở `dsp_assignment` | đường bộ → Chuyến; `PICKUP`/`DROPOFF` tắt hoặc cấm trùng |
| ADR-0001:42, :48 | loại `order_traveller`; câu 7 thuộc `dispatch` | mở lại; chuyển → Vận chuyển |
| ADR-0018:25, :31, :39 | 11 vai; LC-1; bên ngoài là bên đặt | thêm vai/quyền; lượt 2 sửa |
| ADR-0019:26-36, :50, :61 | cổng; `contact.view`; `task.progress` | cổng tài xế; ô mới |
| ADR-0013:21 | `party.staff.write` = tên, liên hệ | giấy tờ theo ô nào |
| Hiến chương 2.1, 5.1 | — | lệch có chủ ý |

### Quyết định cần chủ (≤3 mỗi lượt, kèm trang ghép)
- **Lượt 0:**
  - ADR-0031 + T3b;
  - cờ "có hẹn đón" + chiều về;
  - làm T2b trước, hay nhận cờ "xe công ty" có hạn.
- **Lượt A:**
  - module + Chuyến + thay ADR-0006 + trạng thái + "giữ";
  - hợp đồng đọc dữ liệu + lệch 5.1;
  - cấu hình + mã giấy tờ cố định (GPLX, CCCD).
- **Lượt B:**
  - vai/quyền/cổng cho tài xế;
  - ô quyền của chuyến (ai điều xe, tài xế thấy gì);
  - giấy tờ (ai ghi, CCCD, hàng rào nhật ký).
- **Lượt C:** danh sách khách — nguồn thật, bản chụp lúc xuất bến, đường tài xế ghi vào `orders`.
- **Thứ tự:** gộp ADR-0030 lượt 1 → lượt 0 → A → B → C → thi công.

### Không kiểm được
- Production: đã có hồ sơ nào mang vai DRIVER chưa.
- D1 remote.
- Pháp lý.
- Chưa chạy `npm test`, typecheck, e2e.

## Phụ lục C — Người rà theo triết lý Oracle (nguyên văn)

OR: tệp Oracle; HC: `docs/ARCHITECTURE.md` Phần I.

### Nghiêm trọng

**1. Số khách hiện hành sống hai nơi** (§3, L1, L5, §4.8).
- Vì: sau khi xác nhận, trigger khoá `order_service.pax_*` (`migrations/0008`:60-65). Số sửa sau đó chỉ nằm trong `order_money_adjustment.after_json`, đọc bằng một hàm (`src/modules/orders/money-adjustment.ts`:39).
- View trên `order_service` sẽ đưa số cũ vào kiểm sức chứa; hoặc phải chép lại cách đọc JSON (OR:100, HC 5.4; #15 của `2026-09-27-ra-soat-cau-truc-du-an-theo-oracle.md`).
- Sửa: ghi "xây trên lỗ đang hở" (HC 5.13); `orders` công bố một nguồn có kiểu "số khách hiệu lực".

**2. Nhu cầu đưa đón chưa là thực thể** (§2, §4.2, 0.13).
- Vì:
  - chỉ có một `pickup_time` / `pickup_place` chữ tự do (0008:19-20);
  - không có nơi trả của chặng xe (`checkin_place` là nơi tập trung tại điểm dịch vụ);
  - không có chiều về;
  - cờ "có hẹn đón" mà ADR-0006 điều 6 đòi vẫn chưa có.
- Suy nhu cầu từ trường tuỳ chọn là bỏ qua lớp đối tượng (HC 1.4, OR:56): dễ sót khách.
- Sửa: `orders` sở hữu "chặng đưa đón" (chiều, nơi đón, nơi trả, giờ hẹn, số người); Vận chuyển chỉ phân bổ (giữ ADR-0006 điều 5).

**3. Danh sách hành khách của chuyến không dựng lại được** (§2, L5, L9).
- Vì:
  - danh sách gắn đơn (0.11, giữ) nhưng không nối người ↔ chặng/chuyến, nên đơn nhiều dịch vụ hay nhóm tách hai xe thì không biết ai đi xe nào;
  - L9 không chụp danh sách, nên sửa tên về sau sẽ đổi chứng từ đã dùng (OR:57, HC 5.6);
  - HDV / phụ xe mà L1 đếm không có chỗ ghi.
- Sửa:
  - bảng phân bổ người vào chuyến (khách của đơn + vai đi kèm gắn hồ sơ);
  - chốt danh sách có phiên bản lúc xuất bến (biển số, tài xế, số hợp đồng, điểm dừng);
  - chủ chốt bản pháp lý.

### Quan trọng

**4. "Khách trên chuyến" là thực thể phân bổ, không phải vai** (§2, L7, §3).
- Vì:
  - nó có số người, điểm, trạng thái, vòng đời (HC 2.2);
  - thiếu bất biến "tổng phân bổ ≤ nhu cầu";
  - L7 chỉ canh chuyến;
  - tài xế gắn thẳng vào chuyến thì đổi người sẽ ghi đè "ai lái";
  - §3 bỏ lớp CSDL, trong khi HC 5.3 cho trigger đọc view công bố (LC-1, `migrations/0024`:75-77).
- Sửa: giữ ở CSDL các bất biến, máy trạng thái phân bổ/điểm dừng và bước xuất bến (OR:100). Đổi xe hay tài xế sau khi xuất bến = đóng chặng + mở chặng mới có xuất bến riêng.

**5. Xe: chủ, bên khai thác, vòng đời** (§2, §9).
- Vì:
  - cột "xe của công ty" là một lệch mới cùng loại với nợ "Tour Đảo chưa có hồ sơ" (HC 6.3, 2.1); T2b đã duyệt;
  - chủ xe và bên khai thác có thể khác nhau và đổi theo thời gian (OR:29-32);
  - xe có vòng đời riêng (hoạt động / bảo dưỡng / ngừng), bản nháp chỉ có hiệu lực.
- Sửa:
  - làm T2b trước, hoặc ghi lệch có chủ ý;
  - chủ và bên khai thác là khoá tới hồ sơ, có hiệu lực;
  - khung "không sẵn sàng" dùng chung cho xe và người;
  - định danh xe bằng số khung.

**6. Giấy tờ: bằng chứng sửa tại chỗ được** (§2, §4.1, §6, L4, L9).
- Vì:
  - giấy tờ là Thực thể do bên ngoài cấp, không phải Chứng từ (K6 là thứ ta phát ra); cột Oracle ghi "Identity" là sai (OR:47 là đăng nhập);
  - L9 chỉ lưu tham chiếu, nên sửa hạn về sau sẽ đổi cả quá khứ (HC 5.6, OR:113);
  - văn phòng vừa nhập giấy tài xế vừa điều xe, không có cổng duyệt (OR:61).
- Sửa:
  - giấy đã dùng thì bất biến; gia hạn = thêm dòng mới;
  - L9 chụp giá trị (biển số, sức chứa, hạng, hạn);
  - sửa phải có lý do, trước→sau, ảnh giấy;
  - tách số CCCD (mỗi số một hồ sơ, OR:32) khỏi tấm thẻ;
  - bảng "hạng → số khách" thuộc bộ điều kiện của Toàn quyền (0.10).

**7. Quyền trên dữ liệu khách; thiếu loại "Quan hệ"** (§3, §7).
- Vì:
  - SĐT, tên, năm sinh khách thuộc `orders`; tiền lệ `pool.ts` dựng phần hẹp ngay trong `orders`, sau ô quyền của nó;
  - Vận chuyển tự dựng từ view là một cổng thứ hai (K4), vượt luật "view chỉ chứa nhãn" (`docs/ARCHITECTURE.md`:185);
  - thiếu ô "xem khách" và "tài xế bổ sung tên".
- Sửa:
  - `orders` cấp hàm phần hẹp + ô quyền riêng, phạm vi "đang lái chuyến chứa dòng này" do gốc lắp ráp tiêm vào;
  - hai mã vai nội bộ / đối tác như ADR-0018, `handles: "never"`;
  - tài xế ↔ nhà xe là quan hệ có hiệu lực;
  - nhà xe có thể là cá nhân.

**8. Hợp đồng vận chuyển là thực thể, không phải hình chiếu** (§2, §6).
- Vì: thoả thuận có số, có các điểm được phép, giữa bên vận chuyển (Tour Đảo hoặc nhà xe) và bên thuê; chỉ bản in mới là chứng từ (OR:56-57). Danh sách hành khách ghi số hợp đồng; từ 2028 phải gửi trước chuyến.
- Sửa:
  - bảng hợp đồng thuộc Vận chuyển, có hai khoá vai tới hồ sơ;
  - công tắc ở §6 kiểm bảng này;
  - việc gửi đi qua hộp thư đi (HC 5.16, K14).

**9. Nơi đón chữ tự do** (§2, §3).
- Vì: hoãn Party Sites vẫn đúng (ADR-0010 điều 2 về địa chỉ hoá đơn), nhưng trên chữ tự do thì không làm được: gom lượt, tính tải từng đoạn (L1), điểm theo hợp đồng, giá theo tuyến. Chữ tự do còn có thể lộ SĐT.
- Sửa: điểm dừng tại khách sạn / sân bay / ga / bến bắt buộc là `loc_location`; nhà riêng giữ chữ (dữ liệu cá nhân).

**10. Hình chiếu kế toán lượt 3 chưa có nguồn** (§2, L8).
- Vì:
  - chỉ bảng "xe đang chạy" dẫn xuất được từ sự kiện của chuyến; chứng từ (mục 3) và chi phí thì chưa (OR:76, 86; HC 4.2);
  - thiếu bên vận chuyển, loại xe, tuyến, mốc huỷ;
  - giờ máy chủ khi tài xế mất sóng sẽ lệch giờ thật (EOS I.2.3).
- Sửa:
  - chụp bên vận chuyển và loại xe lúc xuất bến;
  - lưu cả giờ máy tài xế báo và giờ máy chủ nhận;
  - mã chống trùng (L8) lưu duy nhất, cùng lô với bước chuyển trạng thái (K8, K14).

### Đánh giá chung

**Xếp loại đúng:** Tài xế, Nhà xe (vai); Chính sách; Luật tính; Lệnh → Sự kiện; Chi phí; Điểm dừng.

**Điểm làm tốt:**
1. Dữ liệu thuộc người, luật thuộc phân hệ (OR:29-32).
2. Điều kiện xuất bến là chính sách có hiệu lực, chụp lúc xuất bến, không JSON (HC 5.2, 5.6).

**Không kiểm được:**
- văn bản pháp lý gốc (biển số theo chủ xe — TT 24/2023/TT-BCA, theo hiểu biết người rà; NĐ 158);
- `pool.ts` mới chỉ có ở nhánh chưa gộp (dcba739);
- không chạy test.

**3 sửa quan trọng nhất:**
1. Số khách hiện hành có một nguồn.
2. "Chặng đưa đón" thuộc `orders`.
3. Phân bổ người vào chuyến + danh sách có phiên bản.
