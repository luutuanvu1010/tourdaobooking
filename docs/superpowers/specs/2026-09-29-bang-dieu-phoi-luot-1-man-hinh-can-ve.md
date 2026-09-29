# Bảng điều phối chung, lượt 1 — các màn cần vẽ trên Claude Design

- **Ngày:** 2026-09-29.
- **Trạng thái:** **bổ sung 29/9 theo ADR-0050.** Không thêm màn mới (vẫn 8 màn); thêm sáu thành phần hiển thị vào các màn đã có — mục "Bổ sung 29/9 theo ADR-0050" ở dưới, và mục 9 của đoạn yêu cầu dán vào Claude Design.
- **Căn cứ:**
  - đề xuất ADR-0049 (`docs/superpowers/specs/2026-09-29-de-xuat-adr-bang-dieu-phoi-luot-1.md`);
  - bản thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` §4 (khung chữ từng màn) và §4.8 (danh sách V1–V15).
  - Lượt 1 cần vẽ **8 màn**: V1, V2, V3, V5, V6, V7, V12 (phần mốc 6 giờ), V13.
  - **Bổ sung 29/9:** ADR-0050 (`docs/adr/ADR-0050-van-chuyen-kernel-luot-1.md` — chủ duyệt 29/9: "Sửa được giờ thật", "Giữ chuyến tới khi cập nhật", "Kiểm định + Bảo hiểm") và kế hoạch thi công ADR-0049 mục 7 (`docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md`).
- **Cách dùng:**
  - Chủ vẽ từng màn trên Claude Design ở hai cỡ: điện thoại (rộng 390) và máy tính (rộng 1040).
  - Vẽ xong gửi link, rồi thi công làm đúng bản vẽ (tiền lệ trang Đăng nhập, Vận chuyển 1a).
  - Phần máy chủ làm trước trong lúc chờ bản vẽ.
- **Ai thấy gì:**
  - Mục **"Điều phối xe"** trên menu:
    - Bán hàng, Quản trị, Toàn quyền: thấy và thao tác được;
    - **Kế toán:** chỉ xem, không có nút thao tác.
  - Mục "Xe" (danh sách xe, giấy tờ — lượt 1a) vẫn chỉ Quản trị, Toàn quyền.
  - **Tài xế công ty:** trang đầu thành **"Cuốc của tôi"**. Tài xế tự bấm thì **không** có ô khai giờ (máy lấy giờ lúc bấm) — ô này chỉ có khi văn phòng bấm thay (bổ sung A).
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
   - *Bổ sung ADR-0050:* A (khi bấm thay từ màn này), B, C, D, E.
2. **V2 — Chi tiết chuyến**
   - Tiêu đề: mã chuyến, biển số (số chỗ), tài xế, giờ, trạng thái.
   - Bảng điểm dừng: thứ tự, đón/trả, nơi, giờ hẹn, giờ xe tới, số suất, trạng thái.
   - Tải hiện tại.
   - "Điều kiện xuất bến": danh sách đạt / chưa đạt; sau xuất bến là bản chụp.
   - Nhật ký chuyến: ai làm, lúc nào; việc máy làm ghi "máy".
   - Nút theo trạng thái:
     - lên kế hoạch: sửa, huỷ (lý do), xuất bến bấm thay;
     - đang chạy: bấm tiến độ thay tài xế, "Kết thúc gián đoạn".
   - *Bổ sung ADR-0050:* A, B, C, D, E.
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
   - *Bổ sung ADR-0050:* B, E.
5. **V6 — Chuyến đang chạy** (tài xế; văn phòng bấm thay dùng cùng màn)
   - Từng điểm theo thứ tự, nút "Đã tới".
   - Trong điểm, từng khách: họ tên + năm sinh (chỉ trong ngày chạy), nút "Đã đón" / "Vắng" / "Khách đã huỷ".
   - SĐT người liên hệ của đơn (chỉ trong ngày chạy).
   - Kéo đổi thứ tự các điểm chưa tới.
   - Điểm trả: "Đã trả".
   - Cuối màn: "Kết thúc chuyến", "Kết thúc gián đoạn" (chọn lý do).
   - Mất mạng: báo "chưa gửi được — bấm lại", không mất thao tác.
   - *Bổ sung ADR-0050:* A (chỉ khi văn phòng bấm thay), B.
6. **V7 — Xuất bến**
   - Danh sách điều kiện đạt / chưa đạt, mỗi dòng ghi "ai xử lý":
     - giấy tờ xe;
     - giấy phép lái xe (hạng, hạn);
     - đủ tên khách;
     - không có đơn đã huỷ;
     - đủ chỗ;
     - đủ giờ nghỉ.
   - Nút "Xuất bến" chỉ bấm được khi đạt hết.
   - *Bổ sung ADR-0050:* A (chỉ khi văn phòng bấm thay), C, E.
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
   - *Bổ sung ADR-0050:* F.

## Bổ sung 29/9 theo ADR-0050 — thành phần mới trên các màn đã có

Chỉ ghi **màn nào, thành phần nào, trạng thái nào cần vẽ**. Chỗ đặt, kiểu hiện, màu do chủ quyết khi vẽ; người thi công không tự nghĩ kiểu hiện.

**A. Ô khai "xảy ra lúc" khi văn phòng bấm thay** (V1, V2, V6, V7 — ở mọi chỗ văn phòng bấm thay tài xế)
- **Nút có ô này:** Xuất bến, Đã tới, Đã đón, Vắng, Khách đã huỷ, Đã trả, Kết thúc chuyến, Kết thúc gián đoạn. **Không** có ở "đổi thứ tự điểm".
- **Ai thấy:** Bán hàng, Quản trị, Toàn quyền khi bấm thay. Tài xế tự bấm: **không** có ô. Kế toán: không có nút.
- **Trạng thái cần vẽ:**
  1. **Để nguyên** (mặc định): hiểu là "lúc bấm"; máy ghi giờ của máy chủ.
  2. **Đã đổi giờ** — ví dụ tài xế gọi "đón xong lúc 07:31", 07:45 văn phòng mới bấm và sửa ô thành 07:31.
  3. **Giờ sớm nhất được khai** hiện kèm ô (làm tròn lên phút kế), ví dụ "Sớm nhất: 07:11". Mức lùi tối đa lấy từ chính sách (bổ sung F), mặc định 3 giờ.
  4. **Bị từ chối** — một câu lời thường cho từng trường hợp:
     - giờ ở tương lai (sau lúc bấm);
     - lùi quá mức cho phép (quá 3 giờ trước lúc bấm);
     - sai thứ tự các bước của chuyến (ví dụ "đã đón" sớm hơn "đã tới điểm", "kết thúc" sớm hơn bước đã có);
     - xuất bến trước khi chuyến trước của cùng xe hoặc cùng tài xế kết thúc;
     - xuất bến sớm hơn lần sửa lịch chuyến cuối cùng (ví dụ 07:10 đổi tài xế thì xuất bến sớm nhất là 07:10);
     - "đã tới điểm" sớm hơn lần đổi thứ tự điểm cuối cùng;
     - đón / vắng / huỷ / trả của một khách sớm hơn lúc khách đó được xếp lên xe.
  5. Mất mạng: như khuôn "chưa gửi được — bấm lại"; bấm lại giữ đúng giờ đã khai.

**B. Hai giờ "07:31 · ghi lúc 07:45 — Hoa"** (V1 lịch chung, V2 chi tiết chuyến và nhật ký chuyến, V5 Cuốc của tôi, V6 chuyến đang chạy)
- **Áp cho** mỗi mốc tiến độ: xuất bến, đã tới, đã đón, vắng, khách đã huỷ, đã trả, kết thúc.
- **Trạng thái cần vẽ:**
  1. Tài xế tự bấm, hoặc văn phòng bấm mà không đổi giờ: **một** giờ.
  2. Văn phòng khai giờ khác lúc bấm: **hai** giờ + tên người văn phòng bấm, và dấu hiệu "giờ do văn phòng khai" (ADR-0050 yêu cầu màn chuyến hiện rõ điều này).
- **Tên người bấm:** chỉ tên hiển thị của nhân viên (ví dụ "Hoa"), **không** số điện thoại. Có ở cả màn của tài xế (điều phối đã duyệt).
- Nhật ký chuyến (V2) có thêm dòng "Đổi điểm đón / trả theo đơn" (bổ sung C).

**C. Lý do giữ "Nơi đón / trả đã đổi — cập nhật điểm" + nút "Cập nhật điểm theo đơn"** (V1 — khối chuyến bị giữ và cột "Cần xử lý"; V2; V7 — dòng trong danh sách điều kiện)
- **Khi nào:** khách đổi nơi đón hoặc nơi trả trên đơn **sau khi** đã được xếp xe.
- **Ai xử lý:** người xếp xe (Bán hàng, Quản trị, Toàn quyền). **Không** cần Quản trị phá lệ, kể cả trong 6 giờ trước giờ xuất bến. Kế toán thấy lý do, không có nút.
- **Trạng thái cần vẽ:**
  1. Chuyến **lên kế hoạch** bị giữ: lý do + "ai xử lý" + nút; nút "Xuất bến" khoá.
  2. **Sau khi bấm thành công:** hết giữ; điểm mới xuất hiện trong bảng điểm dừng; điểm cũ không còn khách hiện "bỏ qua — không còn khách".
  3. **Bấm khi không còn gì lệch** (ví dụ người khác vừa cập nhật): báo "không có điểm nào cần cập nhật", không đổi gì.
  4. Chuyến **đang chạy:** **không** có nút; chỉ có cảnh báo ở bổ sung D ("xe đang chạy thì chỉ báo đỏ trên bảng để văn phòng gọi tài xế" — ý của ADR-0050).
- **Cùng danh sách lý do giữ** (điều phối đã duyệt 29/9 — không hiện câu chung chung): "đơn đã huỷ", "chặng đã bỏ" (đơn bỏ chặng sau khi xếp), "giờ hẹn nằm ngoài chuyến" (ngày đón bị dời xa).

**D. Hai cảnh báo mới ở cột "Cần xử lý"** (V1; V2 nếu chủ muốn hiện trong chi tiết chuyến)
- **"Nơi hẹn khác điểm xe":** khách có nơi đón / trả trên đơn khác điểm của xe. Áp cho mọi chuyến chưa kết thúc.
  - Chuyến lên kế hoạch: đi kèm lý do giữ ở bổ sung C.
  - Chuyến đang chạy: chỉ cảnh báo, không nút — văn phòng gọi tài xế.
- **"Giờ xe tới muộn hơn giờ hẹn":** điểm đón có giờ xe tới (đã chỉnh tay) muộn hơn giờ hẹn sớm nhất của khách đón ở đó. Chỉ cảnh báo, không giữ chuyến.
- **Trạng thái cần vẽ:** mỗi loại một mẫu; một chuyến có cả hai; chuyến đang chạy có cảnh báo "nơi hẹn khác điểm xe".

**E. Lý do giữ "Thiếu giấy tờ xe: <biển số>"** (V7 danh sách điều kiện; V1 khối chuyến + "Cần xử lý"; V2 "Điều kiện xuất bến"; V5 dòng "Chưa đủ điều kiện xuất bến")
- **Khi nào:** xe (của công ty hoặc nhà xe) thiếu **Kiểm định** hoặc **Bảo hiểm trách nhiệm dân sự**, hoặc giấy không còn hạn tới hết chuyến.
- **Ai xử lý:** **Quản trị** — nhập giấy ở màn Xe (đã có từ bản 1.37). Có lối tắt sang màn Xe hay không: chủ quyết khi vẽ.
- **Trạng thái cần vẽ:**
  1. Thiếu hẳn một loại giấy (ghi rõ loại nào);
  2. Giấy đã hết hạn;
  3. Giấy còn hạn hôm nay nhưng hết trước giờ kết thúc dự kiến của chuyến;
  4. Thiếu cả hai loại;
  5. Trên màn tài xế (V5): chỉ tên điều kiện, cùng kiểu dòng "(văn phòng lo)" như "thiếu 2 tên"; **không** hiện hạn chi tiết (trạng thái 1–4 là của màn văn phòng).

**F. Ô "Khai lùi tối đa (phút)" ở Chính sách điều phối** (V13 — chỉ Toàn quyền)
- Giá trị từ 1 đến 1440 phút; bản gieo sẵn **180** (3 giờ). Lưu là một bản chính sách mới như các ô khác; lịch sử các bản có cột này.
- **Trạng thái cần vẽ:** giá trị hợp lệ; giá trị ngoài 1–1440 (báo lỗi bằng lời); lịch sử có hai bản khác nhau ở ô này.
- **Danh sách điều kiện xuất bến** (khuôn sẵn): từ ngày phát hành đã có sẵn hai dòng "Kiểm định — mọi xe" và "Bảo hiểm trách nhiệm dân sự — mọi xe". Toàn quyền thêm giấy khác (phù hiệu, giám sát hành trình, camera…) hoặc đóng dòng như mọi điều kiện.

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
> 9. Bổ sung trên các màn trên (không phải màn mới):
> (a) Khi văn phòng bấm thay tài xế (Xuất bến, Đã tới, Đã đón, Vắng, Khách đã huỷ, Đã trả, Kết thúc, Kết thúc gián đoạn — không có ở đổi thứ tự điểm), có ô "xảy ra lúc": để nguyên là lúc bấm; sửa được về trước, kèm dòng "Sớm nhất: 07:11". Vẽ các câu từ chối bằng lời: giờ ở tương lai; lùi quá 3 giờ; sai thứ tự các bước; xuất bến trước khi chuyến trước của cùng xe / tài xế kết thúc; xuất bến sớm hơn lần sửa lịch chuyến cuối. Tài xế tự bấm thì không có ô này.
> (b) Ở lịch chung, chi tiết chuyến, Cuốc của tôi, Chuyến đang chạy: mốc do văn phòng khai hiện hai giờ "07:31 · ghi lúc 07:45 — Hoa" và dấu "giờ do văn phòng khai"; tài xế tự bấm chỉ một giờ; chỉ tên người bấm, không số điện thoại.
> (c) Chuyến CX-3009-07 bị giữ vì khách đổi khách sạn từ Amiana sang Novotel sau khi đã xếp: lý do "Nơi đón / trả đã đổi — cập nhật điểm", ai xử lý "người xếp xe", nút "Cập nhật điểm theo đơn" (không cần phá lệ, kể cả trong 6 giờ). Sau khi bấm: điểm Novotel thêm vào, điểm Amiana "bỏ qua — không còn khách". Bấm khi không còn gì lệch thì báo "không có điểm nào cần cập nhật". Xe đang chạy thì không có nút, chỉ cảnh báo.
> (d) Cột "Cần xử lý" có thêm hai cảnh báo: "Nơi hẹn khác điểm xe" (cả chuyến đang chạy — để văn phòng gọi tài xế) và "Giờ xe tới muộn hơn giờ hẹn".
> (e) Xe B 79B-678.90 thiếu Bảo hiểm trách nhiệm dân sự: chuyến bị giữ "Thiếu giấy tờ xe: 79B-678.90", ai xử lý "Quản trị". Vẽ thêm trường hợp giấy đã hết hạn và giấy hết hạn trước giờ kết thúc chuyến; màn tài xế hiện "(văn phòng lo)".
> (f) Chính sách điều phối có thêm ô "Khai lùi tối đa (phút)" (1–1440, mặc định 180); danh sách điều kiện xuất bến có sẵn hai dòng "Kiểm định — mọi xe" và "Bảo hiểm trách nhiệm dân sự — mọi xe".

## Lưu ý khi vẽ

- Giữ bảng màu, cỡ chữ, khoảng cách của app hiện tại (token ở đầu `public/app.css`). Ô gõ cỡ chữ 16px để iPhone không phóng to.
- Mọi chữ tiếng Việt có dấu, không lộ mã kỹ thuật (không hiện "RUNNING", "vc_trip", "PHA_LE").
- Tên, năm sinh, số điện thoại khách **chỉ** xuất hiện ở màn của tài xế trong ngày chạy và ở màn văn phòng; không đưa vào thông báo, không đưa vào nhật ký.
- **Bổ sung 29/9:** tên người văn phòng bấm thay chỉ là tên hiển thị, không số điện thoại. Không hiện chữ kỹ thuật của ADR-0050 (không "VAN_PHONG_KHAI", "NOI_HEN_DOI", "STOP_CHANGED", không chuỗi khoá nơi kiểu "L:…" / "T:…").
