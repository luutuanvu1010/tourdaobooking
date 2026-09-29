# Bảng điều phối chung, lượt 1 — các màn cần vẽ trên Claude Design

- **Ngày:** 2026-09-29.
- **Căn cứ:**
  - đề xuất ADR-0049 (`docs/superpowers/specs/2026-09-29-de-xuat-adr-bang-dieu-phoi-luot-1.md`);
  - bản thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` §4 (khung chữ từng màn) và §4.8 (danh sách V1–V15).
  - Lượt 1 cần vẽ **8 màn**: V1, V2, V3, V5, V6, V7, V12 (phần mốc 6 giờ), V13.
- **Cách dùng:**
  - Chủ vẽ từng màn trên Claude Design ở hai cỡ: điện thoại (rộng 390) và máy tính (rộng 1040).
  - Vẽ xong gửi link, rồi thi công làm đúng bản vẽ (tiền lệ trang Đăng nhập, Vận chuyển 1a).
  - Phần máy chủ làm trước trong lúc chờ bản vẽ.
- **Ai thấy gì:**
  - Mục **"Điều phối xe"** trên menu:
    - Bán hàng, Quản trị, Toàn quyền: thấy và thao tác được;
    - **Kế toán:** chỉ xem, không có nút thao tác.
  - Mục "Xe" (danh sách xe, giấy tờ — lượt 1a) vẫn chỉ Quản trị, Toàn quyền.
  - **Tài xế công ty:** trang đầu thành **"Cuốc của tôi"**.
  - Tài xế đối tác, Hướng dẫn viên, Đối tác, Thực tập: **không** thấy gì của điều phối ở lượt này.
- **Chưa vẽ ở lượt này (lượt sau):**
  - V4 "Dòng dữ liệu";
  - V8–V11: chuyển điểm giữa hai xe, đề nghị gửi tới tôi, duyệt đề nghị leo thang, thêm hoặc báo huỷ điểm khi xe đang chạy;
  - nút "Gợi ý xếp";
  - tài xế tự thêm tên khách;
  - V14, V15.

## Màn cần vẽ

1. **V1 — Điều phối xe ngày D** (máy tính + điện thoại)
   - **Đầu màn:**
     - chọn ngày, nút "+ Chuyến mới";
     - dòng số liệu: số chặng, đã xếp, chưa xếp (sát mốc, quá mốc), số chuyến, số việc cần xử lý, số đơn nháp có hẹn đón.
   - **Cột trái "Chưa xếp":**
     - mỗi chặng: giờ hẹn, nơi đón → nơi trả, mã đơn, số người, số người đã có tên;
     - nhãn "sát mốc" (vàng), "quá mốc" (đỏ), "đặt gấp", "thiếu tên";
     - kéo chặng vào một chuyến; tách đoàn thì hỏi số người.
   - **Giữa "Dòng thời gian theo xe":**
     - mỗi xe một hàng, nhóm xe công ty trước, rồi từng nhà xe;
     - mỗi chuyến một khối từ giờ bắt đầu tới giờ kết thúc dự kiến, ghi mã chuyến, tải "12/15", dãy điểm đón ► điểm trả;
     - màu theo trạng thái: lên kế hoạch / đang chạy / xong / bị giữ;
     - hai vạch dọc: "bây giờ" và "mốc 6 giờ".
   - **Cột phải "Cần xử lý":**
     - chuyến bị giữ (lý do + ai xử lý);
     - chặng quá mốc;
     - chuyến chưa có tài xế;
     - "giờ hẹn đổi — gọi báo khách";
     - riêng Quản trị: **"Đơn nháp chờ duyệt đặt gấp"**.
   - **Trong 6 giờ trước giờ xuất bến:**
     - khối chuyến hiện khoá phần "ai đi xe nào", đổi xe, đổi tài xế;
     - Bán hàng thấy dòng "Cần Quản trị phá lệ";
     - Quản trị, Toàn quyền thấy nút **"Phá lệ"** (hộp chọn lý do);
     - đổi thứ tự điểm, giờ xe tới vẫn làm được.
   - **Xe đang chạy:** chỉ có nút bấm tiến độ thay tài xế; không có nút kế hoạch.
   - **Điện thoại:** ba thẻ trượt "Chưa xếp / Xe / Cần xử lý"; dòng thời gian thành danh sách chuyến theo giờ.
2. **V2 — Chi tiết chuyến**
   - Tiêu đề: mã chuyến, biển số (số chỗ), tài xế, giờ, trạng thái.
   - Bảng điểm dừng: thứ tự, đón/trả, nơi, giờ hẹn, giờ xe tới, số suất, trạng thái.
   - Tải hiện tại.
   - "Điều kiện xuất bến": danh sách đạt / chưa đạt; sau xuất bến là bản chụp.
   - Nhật ký chuyến: ai làm, lúc nào; việc máy làm ghi "máy".
   - Nút theo trạng thái:
     - lên kế hoạch: sửa, huỷ (lý do), xuất bến bấm thay;
     - đang chạy: bấm tiến độ thay tài xế, "Kết thúc gián đoạn".
3. **V3 — Tạo / sửa chuyến**
   - Chọn xe (hiện số chỗ; xe đang bảo dưỡng không chọn được), tài xế, giờ bắt đầu, giờ kết thúc.
   - Lỗi hiện ngay, bằng lời:
     - "Tài xế bằng B không chở được xe 15 chỗ";
     - "Xe trùng giờ chuyến CX-…";
     - "Chưa đủ 30 phút nghỉ sau chuyến CX-…";
     - "Trong 6 giờ — cần Quản trị phá lệ".
   - Huỷ chuyến: chọn lý do.
4. **V5 — Cuốc của tôi** (tài xế công ty, điện thoại là chính)
   - Hôm nay / ngày mai: danh sách chuyến (mã, giờ, biển số, số khách, trạng thái).
   - Chuyến chưa đủ điều kiện hiện dòng "Chưa đủ điều kiện xuất bến: thiếu 2 tên (văn phòng lo)".
5. **V6 — Chuyến đang chạy** (tài xế; văn phòng bấm thay dùng cùng màn)
   - Từng điểm theo thứ tự, nút "Đã tới".
   - Trong điểm, từng khách: họ tên + năm sinh (chỉ trong ngày chạy), nút "Đã đón" / "Vắng" / "Khách đã huỷ".
   - SĐT người liên hệ của đơn (chỉ trong ngày chạy).
   - Kéo đổi thứ tự các điểm chưa tới.
   - Điểm trả: "Đã trả".
   - Cuối màn: "Kết thúc chuyến", "Kết thúc gián đoạn" (chọn lý do).
   - Mất mạng: báo "chưa gửi được — bấm lại", không mất thao tác.
6. **V7 — Xuất bến**
   - Danh sách điều kiện đạt / chưa đạt, mỗi dòng ghi "ai xử lý":
     - giấy tờ xe;
     - giấy phép lái xe (hạng, hạn);
     - đủ tên khách;
     - không có đơn đã huỷ;
     - đủ chỗ;
     - đủ giờ nghỉ.
   - Nút "Xuất bến" chỉ bấm được khi đạt hết.
7. **V12 — Biểu mẫu đơn: phần mốc 6 giờ và đặt gấp** (trong phần "chặng" của biểu mẫu đơn — ADR-0047)
   - Dưới chặng có giờ đón dưới 6 giờ: cảnh báo "Giờ đón cách bây giờ 4 giờ 10 phút — dưới mốc 6 giờ".
   - Quản trị, Toàn quyền: nút **"Đặt gấp"** (chọn lý do + ghi chú ngắn).
   - Bán hàng, Thực tập, Đối tác:
     - vẫn lưu nháp được (ĐP2(v), chủ chọn 29/9: "Cho lưu nháp, chặn ở Xác nhận");
     - nút "Xác nhận" khoá, kèm câu "Cần Quản trị duyệt đặt gấp".
   - Chặng đã đặt gấp: nhãn "Đặt gấp — lý do — người duyệt".
8. **V13 — Chính sách điều phối** (Toàn quyền) **và Danh mục lý do** (Quản trị)
   - **Chính sách điều phối:**
     - mốc tối thiểu (giờ);
     - cảnh báo sát mốc (giờ);
     - khoảng nghỉ (phút);
     - "phải đủ danh sách khách" (bật);
     - "phải có hợp đồng" (khoá tắt).
     - Mỗi lần lưu là một bản mới có ngày hiệu lực; xem lịch sử các bản.
   - **Danh mục lý do:** theo nhóm (phá lệ, huỷ chuyến, kết thúc gián đoạn, bỏ qua điểm, đổi giờ xe); thêm, sửa, ngưng.

## Dùng khuôn sẵn (không cần vẽ, trừ khi chủ muốn)

- Điều kiện xuất bến theo cỡ xe; bảng hạng bằng → số khách: theo khuôn màn Danh mục / Địa điểm hiện có.
- Hộp chọn lý do: theo khuôn hộp "Huỷ đơn — chọn lý do" hiện có.

## Nơi vẽ và đoạn yêu cầu dán vào Claude Design

- Vẽ trong dự án Claude Design **"Tour Đảo Booking Design System"** (`https://claude.ai/design/p/34f284df-c97a-4672-bb66-d7df03a0d97a`) — cùng nơi đã vẽ Vận chuyển 1a.
- Đoạn yêu cầu (chép nguyên văn):

> Dùng hệ thiết kế của dự án này: màu, chữ, và các thành phần Card, Button, Chip, Badge, Field, Sheet, Sidebar, TabBar, Banner. Vẽ phần "Điều phối xe" của phân hệ Vận chuyển cho app Tour Đảo Booking. Mỗi màn vẽ hai cỡ: điện thoại rộng 390 (có TabBar) và máy tính rộng 1040 (có Sidebar, thêm mục "Điều phối xe"). Chữ tiếng Việt có dấu; không hiện mã kỹ thuật; ô nhập cỡ chữ 16px. Dữ liệu mẫu: ngày 30/09; xe A 79B-123.45 (15 chỗ, tài xế Nguyễn Văn An) chạy chuyến CX-3009-07 đón Sheraton → Amiana → Mường Thanh rồi trả Cảng Vinpearl và Bến Tàu Du lịch; xe B 79B-678.90 (29 chỗ, tài xế Trần Văn Tuấn) chạy CX-3009-04 đón InterContinental → AB Square → Alibu; một xe của nhà xe Minh Phát 79B-555.66 (45 chỗ). Mốc tối thiểu 6 giờ.
> 1. Điều phối xe ngày D: đầu màn chọn ngày, nút "+ Chuyến mới", dòng số liệu (chặng, đã xếp, chưa xếp — sát mốc, quá mốc — số chuyến, cần xử lý, đơn nháp). Ba cột: "Chưa xếp" (mỗi chặng: giờ hẹn, nơi đón → nơi trả, mã đơn, số người, nhãn sát mốc vàng / quá mốc đỏ / đặt gấp / thiếu tên; kéo vào chuyến); "Dòng thời gian theo xe" (mỗi xe một hàng, nhóm xe công ty rồi từng nhà xe; mỗi chuyến một khối có mã, tải 12/15, dãy điểm đón ► điểm trả; màu lên kế hoạch / đang chạy / xong / bị giữ; vạch "bây giờ" và vạch "mốc 6 giờ"); "Cần xử lý" (chuyến bị giữ kèm lý do và ai xử lý, chặng quá mốc, chuyến chưa có tài xế, "giờ hẹn đổi — gọi báo khách", và với Quản trị: "Đơn nháp chờ duyệt đặt gấp"). Chuyến trong 6 giờ trước giờ xuất bến: khoá phần xếp khách, đổi xe, đổi tài xế; Bán hàng thấy "Cần Quản trị phá lệ", Quản trị thấy nút "Phá lệ" (hộp chọn lý do). Kế toán xem cùng màn nhưng không có nút. Điện thoại: ba thẻ trượt Chưa xếp / Xe / Cần xử lý.
> 2. Chi tiết chuyến: mã, biển số, tài xế, giờ, trạng thái; bảng điểm dừng (thứ tự, đón/trả, nơi, giờ hẹn, giờ xe tới, số khách, trạng thái); tải hiện tại; "Điều kiện xuất bến" đạt/chưa đạt; nhật ký chuyến (việc máy làm ghi "máy"); nút sửa, huỷ (lý do), xuất bến bấm thay, "Kết thúc gián đoạn".
> 3. Tạo / sửa chuyến: chọn xe (hiện số chỗ), tài xế, giờ bắt đầu, giờ kết thúc; lỗi bằng lời ngay dưới ô: "Tài xế bằng B không chở được xe 15 chỗ", "Xe trùng giờ chuyến CX-3009-11", "Chưa đủ 30 phút nghỉ", "Trong 6 giờ — cần Quản trị phá lệ".
> 4. Cuốc của tôi (tài xế, điện thoại): hôm nay và ngày mai, mỗi chuyến: mã, giờ, biển số, số khách, trạng thái; dòng "Chưa đủ điều kiện xuất bến: thiếu 2 tên (văn phòng lo)".
> 5. Chuyến đang chạy (tài xế): từng điểm theo thứ tự với nút "Đã tới"; trong điểm, từng khách họ tên + năm sinh (ví dụ Nguyễn Thị Lan, 1990) với nút "Đã đón" / "Vắng" / "Khách đã huỷ"; số điện thoại người liên hệ; kéo đổi thứ tự điểm chưa tới; điểm trả có "Đã trả"; cuối màn "Kết thúc chuyến" và "Kết thúc gián đoạn" (chọn lý do); trạng thái mất mạng "chưa gửi được — bấm lại".
> 6. Xuất bến: danh sách điều kiện đạt/chưa đạt, mỗi dòng ghi ai xử lý (giấy tờ xe, giấy phép lái xe hạng và hạn, đủ tên khách, không đơn đã huỷ, đủ chỗ, đủ giờ nghỉ); nút "Xuất bến" chỉ bấm được khi đạt hết.
> 7. Biểu mẫu đơn — phần chặng đón: cảnh báo "Giờ đón cách bây giờ 4 giờ 10 phút — dưới mốc 6 giờ"; Quản trị thấy nút "Đặt gấp" (chọn lý do + ghi chú ngắn); Bán hàng thấy "Lưu nháp" bình thường nhưng nút "Xác nhận" khoá với câu "Cần Quản trị duyệt đặt gấp"; chặng đã đặt gấp có nhãn "Đặt gấp — lý do — người duyệt".
> 8. Chính sách điều phối (Toàn quyền): mốc tối thiểu, cảnh báo sát mốc, khoảng nghỉ, "phải đủ danh sách khách", "phải có hợp đồng" (khoá tắt); mỗi lần lưu là một bản mới có ngày hiệu lực, xem lịch sử. Danh mục lý do (Quản trị): theo nhóm, thêm / sửa / ngưng.

## Lưu ý khi vẽ

- Giữ bảng màu, cỡ chữ, khoảng cách của app hiện tại (token ở đầu `public/app.css`). Ô gõ cỡ chữ 16px để iPhone không phóng to.
- Mọi chữ tiếng Việt có dấu, không lộ mã kỹ thuật (không hiện "RUNNING", "vc_trip", "PHA_LE").
- Tên, năm sinh, số điện thoại khách **chỉ** xuất hiện ở màn của tài xế trong ngày chạy và ở màn văn phòng; không đưa vào thông báo, không đưa vào nhật ký.
