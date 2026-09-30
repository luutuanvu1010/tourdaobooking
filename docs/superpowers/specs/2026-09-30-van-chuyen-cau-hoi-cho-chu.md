# Vận chuyển — mọi câu đang chờ chủ, gom một lượt (2026-09-30)

> **Ghi chú gộp 2026-09-30:** "Trả lời lần 16–22" trong tệp này là số cũ; nay là **lần 19–25** (bảng đối chiếu cuối sổ hỏi đáp Vận chuyển). GA-59: lời sau của chủ (sửa khớp ADR-0051, lần 16 mới) thắng "Chấp nhận lệch".

- **Loại:** tài liệu MÔ TẢ (không chuẩn tắc). Chủ yêu cầu 30/9: "gom câu hỏi cho chủ". Chỉ GOM lại câu đã có trong các tài liệu; không thêm câu mới, không tự trả lời.
- **Nguồn:** trích bằng một trợ lý chỉ đọc sáng 30/9. Bản mới nhất nằm ở nhánh chưa gộp: `@GT` = nhánh `ghi-trang-thai-1-37`, `@GD` = nhánh `giao-dien-dieu-phoi-luot-1`. Mỗi câu có dẫn nguồn; câu hỏi và phương án xem nguyên văn ở nguồn.
- **Cách trả lời:** ghi mã + chữ cái, ví dụ "ĐP4 a, ĐP5 a…". Câu nào chưa muốn trả lời thì bỏ qua — chỉ phần đó chờ.
- **Đã loại:** mọi câu đã trả lời tới lần 15 (sổ `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md@GT`), và việc đã xếp vào `docs/BACKLOG.md` mục 5, 6, 7.

## 1. Gấp — chặn gộp và phát hành Bảng điều phối lượt 1

| # | Việc | Khuyến nghị / ghi chú | Nguồn |
|---|---|---|---|
| 1.1 | Duyệt **đề xuất sửa luật ADR-0049**, mục 0–3 và 5–8: 0 = bảy ô quyền mới; 1 = cho `van-chuyen` đọc `orders`, `locations`; 2 = nới bài ghim quyền Tài xế; 3 = nới nghĩa hàng rào "tên khách không lọt"; 5–8 = cập nhật tệp luật (7c = bài đo tốc độ chạy riêng, theo lời bạn lần 15). Mục nào không duyệt thì hoàn nguyên phần mã đó. | Điều phối trình lúc gộp | `docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md:17, :52-60@GD` |
| 1.2 | **GA-59**: nút "Bỏ đánh dấu gọi báo" bấm lặp chỉ khớp lần đầu khi giờ hẹn không đổi thêm. Chấp nhận là "lệch có chủ ý", hay thêm cột (đổi bảng `0043`)? | Điều phối đề nghị chấp nhận; bạn phản đối được | `hoi-dap:205, :226@GT` |
| 1.3 | **Cho phép lệnh gộp** trên nhánh giao diện (`git merge --no-ff d9b884b`) — bị bộ duyệt quyền từ chối. Đây là cấp quyền, không phải quyết định. | — | `adr-0049-giao-dien-nhat-ky.md:489@GD` |
| 1.4 | **Góp ý ảnh** hai nút "Rút khỏi xe" / "Chuyển sang xe khác" (thợ tự đặt theo lần 15). Không phải điều kiện gộp. | — | `hoi-dap:233@GT` |

## 2. Mở lượt 2 của Bảng điều phối (chuyển điểm đón giữa xe, thay đổi khi xe chạy)

Lượt này **chưa trình ADR**; trả lời trước giúp điều phối soạn nhanh. Còn cần bạn vẽ V4, V8–V11 và xác nhận bộ ca mẫu (`design:695-702, :1232@GT`).

| Mã | Câu (ngắn) | Khuyến nghị | Nguồn |
|---|---|---|---|
| ĐP4 | Tài xế xe kia đã bấm "Nhận" nhưng máy thấy thiếu khoảng nghỉ — văn phòng được duyệt thay không? (a) Có, Quản trị / Toàn quyền duyệt kèm lý do · (b) Không, dừng | **a** | `bang-dieu-phoi-chung-design.md:1099-1102@GT` |
| ĐP5 | Xe hỏng giữa đường, khách trên xe: ai chuyển khách sang xe cứu hộ? (a) Tài xế gửi đề nghị, xe cứu hộ nhận; văn phòng bấm thay được · (b) Văn phòng làm hết · (c) Chỉ tài xế | **a** | `design:1104-1108@GT` |
| ĐP9 | Tài xế chọn xe để nhờ đón thì thấy gì về xe khác? (a) Mã chuyến, tên tài xế, chỗ trống, điểm sắp tới — không thấy khách · (b) Chỉ tên tài xế · (c) Như văn phòng | **a** | `design:1133-1137@GT` |
| ĐP13 | Bán hàng được bổ sung tên khách ngay trên màn chuyến, cả đơn người khác? (a) Không, nhập ở màn đơn như hôm nay · (b) Có | **a** | `design:1157-1160@GT` |

## 3. Mở lượt 3 (tài xế đối tác dùng app, Từ chối chuyến, Báo bận)

Nên trả lời theo thứ tự **Q2 → Q1 → ĐP12** (câu sau phụ thuộc câu trước). **ĐP12 là cửa một chiều**: số khách đã đưa người ngoài xem thì không rút lại được.

| Mã | Câu (ngắn) | Khuyến nghị | Nguồn |
|---|---|---|---|
| Q2 cũ | Tài xế được Từ chối chuyến tới lúc nào? (a) Tới 12 giờ trước giờ chạy, bạn đổi được con số · (b) Như hướng dẫn viên · (c) Lúc nào cũng được trước xuất bến | **a** | `2026-09-28-de-xuat-adr-van-chuyen-luot-2.md:540-544@GT` |
| Q1 cũ | Tài xế đối tác thấy tên, năm sinh, SĐT khách từ lúc nào? (a) Từ lúc hết hạn Từ chối tới hết ngày chạy · (b) Ngay khi được xếp · (c) Không bao giờ thấy SĐT | **a** | `luot-2:534-538@GT` |
| ĐP12 | Cho tài xế nhà xe đối tác dùng app cho chuyến không? (a) Có, cùng luật tài xế công ty · (b) Có, nhưng không SĐT khách · (c) Không, văn phòng bấm thay | **a** (chỉ áp khi bạn trả lời) | `design:1151-1155@GT` |
| ĐP11 | Tài xế công ty và tài xế đối tác nhờ nhau đón được không? (a) Được, như nhau · (b) Chỉ cùng chủ xe. Chỉ có nghĩa nếu ĐP12 ≠ c | **a** | `design:1146-1149@GT` |
| Q3 cũ | Tài xế công ty có được Từ chối và Báo bận không? (a) Có cả hai · (b) Chỉ Báo bận · (c) Không, chỉ tài xế đối tác | **c** (gọn nhất; mở sau chỉ đổi một ô quyền) | `luot-2:546-550@GT` |
| Q7 cũ | Lịch bận của tài xế lưu ở đâu? (a) Trong Vận chuyển · (b) Ở hồ sơ người, dùng chung. Cửa một chiều | **a** | `luot-2:567-570@GT` |

## 4. Mở lượt 4 (chiều về theo dịch vụ — độc lập, trình lúc nào cũng được)

| Mã | Câu (ngắn) | Khuyến nghị | Nguồn |
|---|---|---|---|
| ĐP1 | Chiều về được ít người hơn chiều đi? (a) Có, văn phòng sửa số người chặng về · (b) Không, ai không về thì bấm "vắng" | **a** | `design:1064-1067@GT` |
| ĐP10 | Cài "dịch vụ đưa đón mấy chiều" ở đâu? (a) Trong app, màn Danh mục, có lịch sử · (b) Cột mới trong Google Sheet | **a** | `design:1141-1144@GT` |

## 5. Kernel lượt 2 (khung bận của xe, giờ lái tối đa, số chuyến bay) — trả lời một lần cả ba

| Mã | Câu (ngắn) | Khuyến nghị | Nguồn |
|---|---|---|---|
| Q-L2-1 | Ghi lịch xe vào xưởng trùng chuyến đã xếp: (a) Không cho ghi, dời chuyến trước · (b) Cho ghi, chuyến bị giữ đỏ | **a** | `2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-2.md:275-277@GT` |
| Q-L2-2 | Tài xế vượt 8 giờ lái / ngày: (a) Chỉ cảnh báo · (b) Chặn, Quản trị cho phép · (c) Chặn hẳn. Con số luật chưa có người chuyên môn kiểm | **a** | `kernel-luot-2:279-282@GT` |
| Q-L2-3 | Số hiệu chuyến bay: (a) Một ô số hiệu, tài xế tự tra · (b) Thêm giờ hạ cánh dự kiến · (c) Để sau | **a** | `kernel-luot-2:284-287@GT` |

## 6. Kernel lượt 3 (xe riêng / cỡ xe tối thiểu; mỗi loại giấy tờ xe một bản)

| Mã | Câu (ngắn) | Khuyến nghị | Nguồn |
|---|---|---|---|
| Q-L3-1 | Khách mua "xe riêng" mà bị xếp ghép / xe nhỏ hơn: (a) Chặn, Quản trị cho phép kèm lý do · (b) Chỉ cảnh báo · (c) Chặn hẳn | **a** | `kernel-luot-3:214-217@GT` |
| Q-L3-2 | "Hạng xe hứa với khách" là: (a) Số chỗ tối thiểu · (b) Danh sách loại xe (Limousine…) | **a** | `kernel-luot-3:219-221@GT` |
| Q-L3-3 | Xe đã có Kiểm định, người nhập bấm "Thêm" thay vì "Gia hạn": (a) Không cho, bảo dùng Gia hạn · (b) Cho, chỉ cảnh báo | **a** | `kernel-luot-3:223-225@GT` |

Việc kèm: hỏi người chuyên môn pháp lý về ghép khách nhiều đơn trên một xe hợp đồng, trước khi chạy chuyến ghép thật (`kernel-luot-3:21-23@GT`).

## 7. Tiền xe thuê (đề xuất chưa có người kiểm độc lập — trả lời xong vẫn cần kiểm)

| Mã | Câu (ngắn) | Khuyến nghị | Nguồn |
|---|---|---|---|
| Q1 | Làm giá + chi phí xe TRƯỚC, không chờ sổ công nợ? (a) Làm trước · (b) Chờ sổ. **Lưu ý:** (b) là điều bạn đã nói trước đây — câu này hỏi bạn có đổi ý không | **a** | `2026-09-28-de-xuat-adr-van-chuyen-luot-3.md:261-264@GT` |
| Q2 | Bảng giá thuê xe đặt ở đâu? (a) Vận chuyển · (b) Phân hệ giá (chưa xây). Cửa một chiều | **a** | `luot-3:266-268@GT` |
| Q3 | Nhà xe có cả giá theo tuyến và theo loại xe: (a) Theo tuyến thắng · (b) Theo loại xe thắng | **a** | `luot-3:270-272@GT` |
| Q4 | Chụp giá vào chuyến lúc nào? (a) Lúc giao chuyến cho nhà xe · (b) Lúc xuất bến · (c) Lúc kết thúc | **a** | `luot-3:274-277@GT` |
| Q5 | Ai nhập giá, ai sửa tiền chuyến? (a) Quản trị + Toàn quyền nhập giá; Kế toán + Toàn quyền sửa tiền · (b) Kế toán cả hai · (c) Quản trị cả hai | **a** | `luot-3:279-282@GT` |
| Q6 | Chuyến chưa có giá: (a) Cho chạy, hiện "thiếu giá" · (b) Không cho xuất bến | **a** | `luot-3:284-286@GT` |
| Q7 | Phí huỷ với nhà xe: ghi tay trước, làm bảng mốc huỷ sau? | **Đồng ý** | `luot-3:288-289@GT` |
| Q8 | Chi phí xe của công ty (xăng, lương, bảo dưỡng) không thuộc lượt này? | **Đồng ý (không thuộc)** | `luot-3:291-292@GT` |
| Q9 | Tiền xe thuê: (a) Chỉ tính theo chuyến, chưa chia vào đơn · (b) Chia ngay theo số người | **a** | `luot-3:294-296@GT` |
| Q10 | Sửa đề xuất sổ công nợ để dòng nợ gắn được với chuyến (không chỉ với đơn), trước khi duyệt? | **Đồng ý** | `luot-3:298-299@GT` |

Để lúc trình sổ công nợ: Q11, Q12 (`luot-3:301-307@GT`); cùng hai "lệch có chủ ý" LCY-1, LCY-2 và việc sửa ADR-0040 D1 / ADR-0004 (`luot-3:7-9, :225-239@GT`).

## 8. Việc vẽ (Claude Design, cỡ 390 và 1040)

**ADR-0047 — chặng đưa đón + danh sách khách: chưa vẽ màn nào; đang chặn giao diện phần này** (`adr-0047-man-hinh-can-ve.md:25-48@GD`):
1. Form đơn — phần "Đưa đón" trong từng dịch vụ (chặng đi / về, ngày, giờ, nơi đón, nơi trả; Thêm chiều về / Thêm chặng / Bỏ chặng).
2. Form đơn — phần "Hành khách" (họ tên, năm sinh, loại; "3/4 khách đã có tên").
3. Trang chi tiết đơn — khối "Đưa đón" và "Hành khách".
4. Bảng trượt "Sửa đưa đón" cho đơn đã xác nhận (bỏ chặng phải chọn lý do).
5. Bảng trượt "Sửa danh sách hành khách" (không xoá hẳn, giữ bản cũ).
6. (Tuỳ chọn) "Việc của tôi" của hướng dẫn viên thêm chiều về — muốn thì phải hỏi lại trước khi làm.

**Lưu ý:** tài liệu màn ADR-0047 còn dặn "đừng vẽ Đặt gấp / dưới 6 giờ" (`:17-21, :78@GD`) — câu viết trước khi ADR-0049 được duyệt; phần đó nay đã có ở bản vẽ 07. Nên hỏi điều phối cách ghép trước khi vẽ.

Các lượt sau cũng cần vẽ khi mở: lượt 2 (V4, V8–V11), lượt 3 (V15), lượt 4 (V12 phần tự tạo chặng, V14), Kernel 2 và 3 (vài ô, nhãn — `kernel-luot-2:253-261`, `kernel-luot-3:194-200@GT`).

## 9. Hai chỗ tài liệu đã cũ (không cần trả lời — để điều phối sửa)

- `2026-09-29-van-chuyen-lo-trinh.md:21@GT` còn ghi "chủ vẽ 8 màn cho phần 4" — 8 màn đã vẽ xong tối 29/9.
- Mục 8 lưu ý ở trên (dặn không vẽ Đặt gấp).

## 10. Chủ đã trả lời (2026-09-30, trực tiếp trong phiên — hộp chọn, mỗi câu hiện phương án khuyến nghị đầu tiên)

Ghi nguyên văn nhãn chủ chọn. Đây là lời chủ cho CÂU HỎI; các lượt vẫn phải qua bước soạn ADR / người kiểm / duyệt ADR như thường lệ (ghi vào sổ hỏi đáp là việc của điều phối).

| Mã | Chủ chọn |
|---|---|
| 1.1 Luật ADR-0049 | **"Xem từng mục lúc gộp"** (không duyệt gộp một lần — điều phối trình từng mục lúc gộp như kế hoạch) |
| 1.2 GA-59 | **"Chấp nhận lệch"** |
| ĐP4 | **a** — "Có, kèm lý do" |
| ĐP5 | **a** — "Tài xế đề nghị" |
| ĐP9 | **a** — "Mã, tài xế, chỗ trống" |
| ĐP13 | **a** — "Không" |
| ĐP1 | **a** — "Có" |
| ĐP10 | **a** — "Trong app" |
| Q2 cũ | **a** — "Tới 12 giờ trước" |
| Q1 cũ | **a** — "Từ lúc hết hạn Từ chối" |
| ĐP12 | **a** — "Có, như tài xế công ty" (cửa một chiều — chủ chọn khi đã được báo) |
| ĐP11 | **a** — "Được, như nhau" |
| Q3 cũ | **c** — "Không, chỉ đối tác" |
| Q7 cũ | **a** — "Trong Vận chuyển" |
| Q-L2-1 | **a** — "Không cho ghi" |
| Q-L2-2 | **a** — "Chỉ cảnh báo" |
| Q-L2-3 | **a** — "Một ô số hiệu" |
| Q-L3-1 | **a** — "Chặn, Quản trị cho phép" |
| Q-L3-2 | **a** — "Số chỗ tối thiểu" |
| Q-L3-3 | **a** — "Không cho, dùng Gia hạn" |
| Tiền Q1 | **a** — "Làm trước" (đổi so với lời cũ "để sau, đi cùng sổ công nợ") |
| Tiền Q2 | **a** — "Trong Vận chuyển" |
| Tiền Q3 | **a** — "Theo tuyến thắng" |
| Tiền Q4 | **a** — "Lúc giao cho nhà xe" |
| Tiền Q5 | **a** — "Chia hai vai" |
| Tiền Q6 | **a** — "Cho chạy, hiện 'thiếu giá'" |
| Tiền Q9 | **a** — "Chỉ tính theo chuyến" |
| Tiền Q7, Q8, Q10 | **"Đồng ý cả ba"** |

**Chưa hỏi / còn lại:** 1.3 (cấp quyền lệnh gộp — việc của chủ), 1.4 (góp ý ảnh), Q11–Q12 tiền (để lúc trình sổ công nợ), việc vẽ (mục 8), hỏi pháp lý ghép khách (mục 6).
