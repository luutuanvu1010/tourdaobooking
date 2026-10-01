# Đối chiếu phiếu ý kiến của Giám đốc với kế hoạch thi công (2026-10-01)

> **Loại tài liệu:** mô tả / rà soát. **Không** sửa ADR, đặc tả hay lộ trình nào. Phiếu của Giám đốc là **ý kiến đầu vào**; chủ dự án là người quyết định cuối (CLAUDE.md §3, Hiến pháp P7). ADR đã duyệt và lời chủ ở `2026-09-30-van-chuyen-cau-hoi-cho-chu.md` §10 **vẫn có hiệu lực** cho tới khi chủ quyết khác.
>
> **Nguồn phiếu:** Google Form "Phiếu hỏi ý kiến, phản hồi phần mềm Tour Đảo Booking", Giám đốc trả lời 2026-09-30 19:03 (GMT+7); tệp CSV xuất ra Desktop của chủ (không đưa vào repo). Tệp CSV chỉ có tiêu đề câu và phương án Giám đốc chọn — **không có các phương án còn lại**, nên nghĩa một số câu (A5, B4, B9) là suy ra. Phiếu nhắc "Phần D (iPad)" nhưng CSV **không có câu nào của Phần D** (chưa kiểm vì sao).
>
> **Cách làm:** ba người đọc độc lập (chỉ đọc) đối chiếu từng câu với `docs/adr/`, lộ trình Vận chuyển, `docs/VAN-CHUYEN.md`, sổ câu hỏi chủ §10, phân tích góp ý, `docs/BACKLOG.md`, `docs/HANDOFF-N1.md` và mã trên `main` @35448ab3; người điều phối tự kiểm lại các khẳng định chính bằng mã (`migrations/0041_chinh_sach_dieu_phoi.sql:16, :61-67`, `src/shared/permissions.ts:161`, nhánh `canh-bao-don-trung` đặc tả :5, `docs/adr/ADR-0055*:34, :86`).

## 1. Kết luận

Kế hoạch hiện tại **chưa bao phủ hết** phiếu. Phân loại (một câu nhiều vế có thể nằm ở nhiều nhóm):

| Nhóm | Số câu | Câu |
|---|---|---|
| Khớp — đã làm | 17 | A2, A3, A5, A6b, B8, B10, C1, C3, C6, C7, C8, E1, E2, E4, E6 (đơn xác nhận), mức phù hợp 4/5, A6 (phần xe + nhà xe) |
| Khớp — đã có trong kế hoạch, chưa làm | 4 | C11, C12a (lịch xưởng), C12b (số hiệu chuyến bay), C12c (xe riêng VIP) |
| Khớp một phần | 10 | A1, A4 (giá riêng đại lý), A7, B1, B2, B9, C4, C9, E5, E7 |
| **Trái ADR đã duyệt** | 5 | **B4, B6, B7, C2, C5** |
| **Mâu thuẫn trong chính phiếu** | 3 cặp | **B3 ↔ A8 (chiều về)**, **C10 ↔ A8 (xe đang chạy)**, **B6 ↔ E6 (đặt gấp)** |
| **Trái lời chủ §10** | 1 | **A8 "Tiền thuê xe nhà xe = Để sau"** ↔ chủ chọn Tiền Q1 "Làm trước" |
| **Chưa có trong kế hoạch** | 7 | **A4 trần giảm giá nội bộ, A4 giá theo mùa, B5 chặn đơn trùng, C12d nhiên liệu + số km, E3 ba màu, E6 báo "Đặt gấp cần duyệt", A8 trang bị iPad** |

Nhãn trạng thái IT ghi trong phiếu có chỗ **sai**: A3, B8, B10 ghi "Đang làm" nhưng đã chạy trên production; A7 ghi "Đang làm: tự xếp thứ tự điểm đón" nhưng mã chỉ gắn điểm mới **vào cuối** (`src/modules/van-chuyen/dieu-phoi-route.ts:107`); C12 ghi "đã thiết kế" nhưng nhiên liệu/số km không có thiết kế nào.

## 2. Tín hiệu ưu tiên rõ nhất của Giám đốc

### 2.1. "Ba điều Giám đốc muốn sửa nhất"

| Điều | Hạng mục đáp ứng | Trạng thái | Còn thiếu |
|---|---|---|---|
| (a) Xếp xe cho đơn hàng nhanh và gọn | ADR-0049 (đã lên 1.38, xếp bằng bấm chọn — khớp E2); ADR-0047 Phần B | Khớp một phần | Mọi chuyến vẫn bị **giữ** vì thiếu tên khách + nơi trả (`docs/VAN-CHUYEN.md` §2.3) cho tới khi có ADR-0047 Phần B; Phần B đang chờ chủ vẽ 5 màn. Máy chưa tự xếp thứ tự điểm đón (A7). |
| (b) Thông tin đón khách cho lái xe đầy đủ | 1.40/1.42 (điểm đón, giờ hẹn, số khách, liên hệ trong ngày chạy); ADR-0055 (số hiệu chuyến bay, chưa làm); ADR-0047 Phần B | Khớp một phần | Thiếu tên khách và nơi trả (Phần B), số hiệu chuyến bay (ADR-0055), ô ghi chú cho tài xế (BACKLOG mục 5, đang gác). |
| (c) Điểm đón nội thành Nha Trang, điểm trả theo gói dịch vụ | ADR-0047 Phần B (chọn nơi từ danh mục Địa điểm); ADR-0054 `vc_leg_template` | **Chưa có trong kế hoạch** (phần nơi trả mặc định) | Phần B chỉ cho **chọn tay**; bảng mẫu chặng của ADR-0054 chỉ có số chiều + giờ về gợi ý, **không có cột nơi trả**; "vùng nội thành Nha Trang" chưa có ở đâu. Trùng ý với B2. |

### 2.2. Thứ tự A8 (Giám đốc) so với lộ trình hiện tại

| Việc | Giám đốc | Kế hoạch hiện tại (`2026-09-29-van-chuyen-lo-trinh.md:31-39`, `HANDOFF-N1.md:18`) | Đánh giá |
|---|---|---|---|
| Màn nhập tên hành khách + nơi trả (ADR-0047 Phần B) | **Làm ngay** | Bước 1 của lộ trình, nhưng tắc vì chờ bản vẽ; việc "kế tiếp" ghi trong HANDOFF lại là ADR-0062 | Cùng hướng, nhưng đang tắc — cần đẩy lên đầu |
| Tài xế nhà xe đối tác dùng app (ADR-0053 A-2) | Tháng tới | Chỉ sau ADR-0057 T2 (`lo-trinh.md:36`, `ADR-0053:129`) | Phụ thuộc tiền xe thuê (xem dưới) |
| Xử lý khi xe đang chạy (ADR-0052) | Tháng tới | A-1b sau T2; A-1 "xếp theo điều phối" | Mâu thuẫn với C10 "hiếm, điện thoại là đủ" |
| Chiều về tự tạo (ADR-0054) | Tháng tới | "Xếp theo điều phối" | Mâu thuẫn với B3 "nhân viên tự ghi lượt về" |
| Tiền thuê xe nhà xe (ADR-0057) | **Để sau** | Bước 2, **điều kiện trước** của A-2 và A-1b; chủ chọn "Làm trước" | **Trái lời chủ §10** và làm A-2 "tháng tới" không khả thi nếu giữ ràng buộc |
| Sổ tiền, công nợ | Tháng tới | Lượt 1 **đã lên** 1.42; lượt 2 (đối tác, hoa hồng) chưa có kế hoạch | Lượt 1 sớm hơn mong muốn; lượt 2 thiếu kế hoạch (xem A1/B9) |
| Trang bị iPad cho điều phối (Phần D) | Tháng tới | Không có hạng mục | Chưa có trong kế hoạch |

## 3. Xung đột cần chủ quyết

### 3.1. Trái ADR đã duyệt (đã chạy thật hoặc đã chốt)

| Câu | Giám đốc chọn | Quyết định đang có hiệu lực | Bằng chứng |
|---|---|---|---|
| **B6** | Bỏ quy tắc 6 giờ | Chủ trả lời lần 9 (29/9) "Không cho tắt — muốn nới thì giảm con số"; CSDL chặn | `migrations/0041_chinh_sach_dieu_phoi.sql:16` `CHECK (min_lead_minutes BETWEEN 1 AND 2880)`; ADR-0049 D2; ADR-0050:73 |
| **C5** | Khoá 6 giờ quá chặt: trưởng ca điều phối tự đổi tài xế, không cần Quản trị | ADR-0049 ĐP3: phá lệ `trip.override` chỉ Quản trị + Toàn quyền; **không có vai "trưởng ca"** | `src/shared/permissions.ts:161`; ADR-0049:29, :162, :365 |
| **C2** | Chỉ "Kiểm định" bắt buộc | ADR-0050 VK1-C (chủ chọn Q-L1-3 "Kiểm định + Bảo hiểm"); mã chặn xuất bến khi thiếu một trong hai. Bảo hiểm TNDS là **bắt buộc theo luật** (bản tra 27/9, chưa có người chuyên môn xác nhận). Toàn quyền **đóng được** điều kiện Bảo hiểm trong app — không nên đóng trước khi chủ quyết | `migrations/0041_chinh_sach_dieu_phoi.sql:61-67` |
| **B4** | Mọi đơn do một bạn trực điều phối phụ trách | Người phụ trách = người bấm "Nhận"/được giao (ADR-0018, ADR-0020, ADR-0025); gắn với quyền sửa đơn, thu tiền, "Đã giao". Không có vai "trực điều phối" | `docs/adr/README.md:24, :26` |
| **B7** | Huỷ đơn khi xe đã xếp: máy tự rút khách, báo tài xế | ADR-0049 LC-09: chuyến bị **giữ**, người xếp gỡ tay; xe đang chạy: tài xế hoàn thành điểm đón (ADR-0052 D5.2). Vế "báo tài xế" khớp ADR-0052 D6 (chưa làm) | `ADR-0049:129`; `ADR-0052:102-105, :148-160` |

### 3.2. Mâu thuẫn trong chính phiếu (nên hỏi lại Giám đốc bằng ví dụ cụ thể)

- **B3 ↔ A8 — chiều về:** B3 "nhân viên tự ghi lượt về khi khách có nhu cầu", nhưng A8 xếp "Chiều về tự tạo (tour 4 đảo → máy tự tạo lượt đón về 15:30)" vào Tháng tới. ADR-0054 hoà được hai ý: dịch vụ cài "một chiều" thì máy không tạo sẵn.
- **C10 ↔ A8 — xe hỏng giữa đường:** C10 "hiếm, điện thoại là đủ", nhưng A8 xếp "Xử lý khi xe đang chạy" vào Tháng tới. Lưu ý: đường "gọi điện" của lượt 1 vẫn cần **Quản trị phá lệ 6 giờ** mỗi lần xếp khách lên xe cứu hộ (`src/shared/dieu-phoi-kiem.ts:219`) — dính với C5.
- **B6 ↔ E6 — đặt gấp:** B6 bỏ quy tắc 6 giờ, nhưng E6 muốn nhận thông báo "Có yêu cầu Đặt gấp cần duyệt" — bỏ quy tắc thì không còn "Đặt gấp".

### 3.3. Trái lời chủ §10

- **A8 "Tiền thuê xe nhà xe = Để sau"** ↔ chủ chọn Tiền Q1 **"Làm trước"** (`2026-09-30-van-chuyen-cau-hoi-cho-chu.md:130`; ADR-0057:11). Thứ tự đã chốt buộc ADR-0057 T2 đi trước ADR-0053 A-2 (tài xế đối tác) và ADR-0052 A-1b (cứu hộ).

## 4. Yêu cầu chưa có trong kế hoạch nào

| Câu | Yêu cầu | Đã tìm ở | Ghi chú |
|---|---|---|---|
| A4 vế 1 | Nhân viên giảm giá trong trần (vd 10%), vượt trần thì Quản trị duyệt | `docs/adr`, `docs/superpowers/specs`, `docs/BACKLOG.md` | Hiện chỉ Đối tác có trần (tạm 0, ADR-0027:19); nội bộ giảm tự do (ADR-0029:24). Chạm **tiền + quyền** |
| A4 vế 3 | Giá theo mùa (cao điểm / thấp điểm) | như trên | Hai đặc tả cũ xếp "theo mùa" **ngoài phạm vi** (`2026-09-24-mo-hinh-nguoi-vai-quyen-design.md:373`; `2026-09-25-hoan-tat-phan-bien-tong-hop.md:71`). Chạm **tiền + dữ liệu**; danh mục bị Sheet ghi đè (ADR-0024:89) |
| B5 | Máy **chặn** đơn trùng, Quản trị duyệt mới lưu | nhánh `canh-bao-don-trung` (chưa gộp, chưa có mã) | Chủ đã chọn 22/9: "cảnh báo, hỏi lại, **vẫn cho lưu**"; chặn cứng ghi ngoài phạm vi. Đặc tả cảnh báo cũng **chưa có trong lộ trình thi công** |
| C12d | Theo dõi nhiên liệu, số km | ADR-0040..0057, BACKLOG, VAN-CHUYEN, lộ trình, mã | ADR-0057:240 ghi "chi phí xe công ty; giá theo giờ/km = Không"; chủ Tiền Q8 "không thuộc" |
| E3 | Màu trạng thái chuyến chỉ 3 màu đỏ / vàng / xanh | `web/dieu-phoi.ts:200, :281` | Hiện **5 màu** (Lên kế hoạch, Đang chạy, Xong, Bị giữ = đỏ, Chưa có tài xế = vàng) + Huỷ xám. Bề mặt, nhưng cần chủ chốt màu nào gộp vào đâu |
| E6 vế 2 | Thông báo "Có yêu cầu Đặt gấp cần duyệt" | `src/shared/thong-bao.ts:7`; `web/dieu-phoi.ts:108` | Chỉ có con số "chờ duyệt đặt gấp" trên Bảng điều phối. Chạm luật ADR-0045 (chỉ báo khi xác nhận) |
| A8 | Trang bị iPad cho điều phối (Phần D) | toàn `docs/` | Không có hạng mục; có thể gộp với việc "thử thiết bị thật" đang treo (iPhone thật cũng chưa thử) |

Ngoài ra, một số câu **khớp một phần** có phần còn thiếu đáng chú ý:

- **A1 + B9 — đơn của đại lý (rủi ro tiền lớn nhất):** Giám đốc nói phần lớn khách đến qua đại lý và đại lý trả ngay từng đơn, nhưng mã hiện **chặn "Đã giao" với đơn đối tác** cho tới khi có phần hoa hồng (`src/modules/billing/rules.ts:155-182`); sổ tiền lượt 2 (chiết khấu theo đối tác, dòng "mua giá đại lý") **chưa có kế hoạch** (`docs/superpowers/plans/` chỉ có lượt 1).
- **A4 vế 2 — giá riêng từng đại lý:** đã duyệt dạng **chiết khấu riêng theo đối tác × dịch vụ** trên giá bán lẻ (ADR-0018 §11, ADR-0024 `pricing` lượt 2), chưa có kế hoạch. Nếu Giám đốc muốn **giá bán cho khách** khác nhau theo đại lý thì trái ADR-0027 ("giá luôn là giá công bố").
- **A7 — tự xếp thứ tự điểm đón:** chưa có trong mã; là việc mới cần đặc tả. Trước khi ghép thật trên xe hợp đồng vẫn phải hỏi pháp lý (NĐ 158/2024, `cau-hoi-cho-chu.md` mục 6).
- **B1 — bổ sung tên chậm nhất trước giờ đón vài giờ:** hiện thiếu tên chỉ bị chặn **lúc xuất bến**, không có hạn "trước X giờ" và không có nhắc; màn nhập tên (Phần B) chưa làm.
- **B2 — nơi trả tự điền theo dịch vụ** (vd tour đảo → "Cảng Cầu Đá"): như mục 2.1(c).
- **C4 — giới hạn giờ lái/ngày 10 giờ:** ADR-0055 đã có nhưng **480 phút (8 giờ), chỉ cảnh báo** (chủ Q-L2-2), cộng thời lượng chuyến chứ không phải giờ lái thuần. Theo bản tra 27/9, mức tham chiếu nay là 8 giờ — con số của Giám đốc cao hơn.
- **C9 — nút "Nhận / Từ chối" cho tài xế đối tác:** ADR-0053 có Từ chối (tới 12 giờ trước) + Báo bận, **không có nút "Nhận"** riêng. Không bắt buộc hỏi; nếu muốn "Nhận" thì đụng mốc tài xế đối tác thấy thông tin khách (cửa một chiều).
- **E5 — thẻ đơn cần thấy 7 mục:** đã có tên, ngày giờ đón, số khách, trạng thái; **mã đơn và tổng tiền** chỉ ở phần xổ xuống; **biển số không có trên thẻ** (ADR-0059 chỉ đưa lên chi tiết đơn, cho người có `trip.view`). Đưa biển số lên danh sách là đổi hợp đồng dữ liệu → cần ADR.
- **E7 — iPad giống máy tính:** menu dọc có từ 641px (iPad đứng đã có), nhưng Bảng điều phối chỉ chia 3 cột từ 900px → iPad dựng đứng vẫn thấy dạng điện thoại.

## 5. Bảng đầy đủ từng câu

Trạng thái: **Đ** = khớp, đã làm; **K** = khớp, có trong kế hoạch chưa làm; **P** = khớp một phần; **C** = chưa có trong kế hoạch; **T-ADR** = trái ADR đã duyệt; **T-§10** = trái lời chủ §10; **M** = mâu thuẫn trong phiếu.

| Câu | Giám đốc chọn | Đối chiếu | TT |
|---|---|---|---|
| A1 | Khách chủ yếu qua đại lý / đối tác | ADR-0018 §9, ADR-0026 M1; `billing/rules.ts:182` | P |
| A2 | Khách nhiều ngày → nhiều đơn | ADR-0021 | Đ |
| A3 | Bán hàng, Quản trị, đại lý có tài khoản lập đơn | ADR-0014, ADR-0018 đ9, ADR-0027 | Đ |
| A4 | Trần giảm giá + Quản trị duyệt; giá riêng đại lý; giá theo mùa | ADR-0027, ADR-0029:24, ADR-0018 §11, ADR-0024 | C / P / C |
| A5 | Các bước của đơn đủ và đúng | ADR-0025 (1.42) | Đ |
| A6 | Xe công ty + xe thuê nhà xe | ADR-0040, 0048 (đã lên); ADR-0057 (chưa làm) | Đ / K |
| A6b | 10 xe / 3 nhà xe sau 3 năm | không giới hạn số lượng | Đ |
| A7 | Ghép hằng ngày, máy tự xếp thứ tự điểm đón | ADR-0049; `dieu-phoi-route.ts:107` | P |
| A8 | Xem §2.2 | lộ trình | M / T-§10 / C |
| B1 | Xác nhận trước, bổ sung tên trước giờ đón vài giờ | ADR-0047:110, ADR-0049 L-B1 | P |
| B2 | Nơi trả tự điền theo dịch vụ, sửa được | ADR-0047 Phần B, ADR-0054 D10.1 | P |
| B3 | Nhân viên tự ghi lượt về | ADR-0054 D10.2 | M |
| B4 | Một bạn trực điều phối phụ trách mọi đơn | ADR-0018, 0020, 0025 | T-ADR |
| B5 | Chặn đơn trùng, Quản trị duyệt | đặc tả 22/9 (chưa gộp) | C (trái lời chủ 22/9) |
| B6 | Bỏ quy tắc 6 giờ | ADR-0049 D2, migration 0041:16 | T-ADR, M |
| B7 | Huỷ đơn đã xếp: máy tự rút khách, báo tài xế | ADR-0049 LC-09, ADR-0052 D5.2/D6 | T-ADR |
| B8 | Giờ đón đổi: gọi tay | ADR-0051 (1.38) | Đ |
| B9 | Đại lý trả ngay từng đơn | ADR-0026 đ5; sổ lượt 2 chưa kế hoạch | P |
| B10 | Biên nhận đủ rồi | ADR-0026 đ11 (1.42) | Đ |
| C1 | Định nghĩa chuyến đúng | ADR-0049 | Đ |
| C2 | Chỉ Kiểm định | ADR-0050 VK1-C, migration 0041:61-67 | T-ADR |
| C3 | Bảng hạng bằng đúng | ADR-0049, migration 0041:92-101 | Đ |
| C4 | Giới hạn tổng giờ lái/ngày (vd 10 giờ) | ADR-0055 VK2-B (480 phút, chỉ cảnh báo) | P |
| C5 | Trưởng ca tự đổi tài xế, không cần Quản trị | ADR-0049 ĐP3, `permissions.ts:161` | T-ADR |
| C6 | Chia đoàn đông nhiều xe ổn | ADR-0049 suất | Đ |
| C7 | Tài xế xem thông tin khách: đúng | ADR-0049, ADR-0053 D7.2 | Đ |
| C8 | Tài xế bấm tiến độ: đúng | ADR-0049 | Đ |
| C9 | Tài xế đối tác dùng app, nút Nhận / Từ chối | ADR-0053 (chưa làm; không có "Nhận") | P |
| C10 | Xe hỏng hiếm, điện thoại đủ | ADR-0049 lượt 1; ADR-0052 A-1b | M |
| C11 | Giá thuê xe cố định theo chuyến | ADR-0057 PER_TRIP theo tuyến + cỡ xe | K |
| C12 | Lịch xưởng; số hiệu chuyến bay; xe riêng VIP; nhiên liệu + km | ADR-0055 VK2-A/C; ADR-0056; — | K / K / K / C |
| E1 | Bảng điều phối dễ nhìn | ADR-0049 | Đ |
| E2 | Bấm chọn, không kéo thả | `web/dieu-phoi.ts:158, :171` | Đ |
| E3 | 3 màu đỏ / vàng / xanh | `web/dieu-phoi.ts:200, :281` (5 màu) | C |
| E4 | App tài xế đủ rồi | 1.40, 1.42 | Đ |
| E5 | Thẻ đơn: mã, tên, ngày giờ, số khách, tổng tiền, biển số, trạng thái | `web/order-card.ts:99-181`; ADR-0059 | P |
| E6 | Báo khi đơn xác nhận; báo "Đặt gấp cần duyệt" | ADR-0045 (đã có); — | Đ / C |
| E7 | iPad như máy tính, menu dọc, bảng rộng | `public/app.css:1907-1911` | P |
| Mức phù hợp | 4 | — | — |
| Ba điều muốn sửa | Xem §2.1 | — | P / P / C |
| Ghi chú A, B, C, E; câu muốn bàn trực tiếp | bỏ trống | — | — |

## 6. Câu hỏi cho chủ dự án (gom một lượt)

Mỗi câu: phương án khuyến nghị đứng đầu. Câu chạm tiền / quyền / dữ liệu / pháp lý **không được tự chọn**.

**Thứ tự thi công**

1. **Tiền xe thuê:** (a) *Khuyến nghị* — giữ "Làm trước" (lời chủ §10), báo lại Giám đốc lý do: xe thuê chạy mà chưa có đường nhập giá thì sổ nợ nhà xe sai; (b) theo Giám đốc để sau → phải sửa lộ trình + ADR-0053:129 để tài xế đối tác làm trước, ghi nợ có hạn.
2. **Màn nhập tên khách + nơi trả (Làm ngay):** (a) *Khuyến nghị* — đưa ADR-0047 Phần B lên **trước** ADR-0062; chủ vẽ 5 màn sớm nhất (theo bài học Đợt D: thứ nhìn thấy phải do chủ duyệt hình); (b) cho thợ dựng theo đặc tả `2026-09-29-adr-0047-man-hinh-can-ve.md`, chủ góp ý sau.
3. **Xe đang chạy (C10 vs A8):** (a) *Khuyến nghị* — lùi ADR-0052 A-1b xuống cuối, dùng đường gọi điện của lượt 1; (b) giữ "Tháng tới".

**Trái ADR đã duyệt**

4. **Quy tắc 6 giờ (B6, E6):** (a) *Khuyến nghị* — giữ quy tắc, Toàn quyền **giảm con số** nếu thấy chặt (1–2880 phút), báo nhân viên về luật; (b) ADR mới cho tắt hẳn + migration dựng lại ràng buộc CSDL.
5. **Thông báo "Đặt gấp cần duyệt" (E6):** (a) *Khuyến nghị* — thêm thông báo cho Quản trị/Toàn quyền khi có yêu cầu đặt gấp (ADR nhỏ bổ sung ADR-0045); (b) giữ chỉ con số trên Bảng điều phối.
6. **Trưởng ca đổi tài xế trong 6 giờ (C5):** (a) *Khuyến nghị* — ADR mới: một quyền hẹp "chỉ đổi tài xế trong 6 giờ" (không đổi xe hay khách, bắt ghi lý do, có nhật ký) cho một vai "Trưởng ca điều phối" mới; (b) giữ chỉ Quản trị + Toàn quyền. *(Thêm một mã quyền là nhân đôi các bài "tập con quyền" — CLAUDE.md §10.)*
7. **Giấy tờ xe bắt buộc (C2, pháp lý):** (a) *Khuyến nghị* — giữ Kiểm định + Bảo hiểm; dặn **không ai đóng** điều kiện Bảo hiểm trong app; báo Giám đốc lý do pháp lý; (b) đóng điều kiện Bảo hiểm theo Giám đốc.
8. **Người phụ trách đơn (B4):** (a) *Khuyến nghị* — giữ mô hình "Nhận"/giao; "trực điều phối" là vai trên chuyến xe, không phải người phụ trách đơn; hỏi lại Giám đốc bằng ví dụ; (b) ADR mới: một người trực phụ trách mọi đơn (đổi quyền sửa đơn, thu tiền, "Đã giao" của HDV).
9. **Huỷ đơn khi đã xếp xe (B7):** (a) *Khuyến nghị* — ADR mới: xe **chưa chạy** thì máy tự đóng suất của đơn huỷ và báo tài xế; xe đang chạy giữ lời chủ (tài xế hoàn thành điểm đón); (b) giữ LC-09 (chuyến bị giữ, gỡ tay) + báo tài xế theo ADR-0052 D6.

**Tiền và giá (chưa có kế hoạch)**

10. **Đơn đại lý bị chặn "Đã giao" (A1 + B9):** (a) *Khuyến nghị* — lập kế hoạch sổ tiền lượt 2 ngay (chiết khấu theo đối tác, dòng "mua giá đại lý"); (b) ADR tạm cho "Đã giao" với hoa hồng 0 (ADR-0026 đã loại cách này).
11. **Trần giảm giá cho nhân viên (A4):** (a) *Khuyến nghị* — ADR mới: trần % có ngày hiệu lực, vượt trần thì Quản trị/Toàn quyền duyệt kèm lý do, gộp vào lượt `pricing`; (b) giữ giảm tự do có nhật ký.
12. **"Giá riêng từng đại lý" nghĩa là gì (A4):** (a) *Khuyến nghị* — chiết khấu riêng theo đại lý trên giá bán lẻ (ADR-0018 §11 đã duyệt); (b) giá bán cho khách khác nhau theo đại lý (trái ADR-0027, cần ADR mới).
13. **Giá theo mùa (A4):** (a) *Khuyến nghị* — quy tắc giá có hiệu lực theo ngày trong module `pricing`; (b) cột mùa trên Google Sheet danh mục. Cần kiểm cách đồng bộ giá trước khi chốt.

**Dữ liệu / vận hành**

14. **Nơi trả mặc định theo dịch vụ + điểm đón nội thành (B2, điều muốn sửa (c)):** (a) *Khuyến nghị* — ADR bổ sung: thêm cột "nơi trả mặc định" vào mẫu chặng theo dịch vụ (ADR-0054), Quản trị cài trong app, làm cùng Phần B; (b) chỉ chọn tay như Phần B.
15. **Chiều về (B3 vs A8):** (a) *Khuyến nghị* — giữ ADR-0054, dịch vụ nào không cần xe về thì cài "một chiều"; hỏi lại Giám đốc; (b) bỏ việc tạo sẵn chiều về.
16. **Đơn trùng (B5):** (a) *Khuyến nghị* — làm theo lời chủ 22/9 (cảnh báo, "Vẫn lưu", có nhật ký) và đưa vào lộ trình, thêm báo Quản trị về đơn đã "Vẫn lưu"; (b) chặn cứng, Quản trị duyệt (đảo lời chủ 22/9, cần hàng chờ duyệt + ô quyền).
17. **Hạn bổ sung tên khách (B1):** (a) *Khuyến nghị* — giữ chặn lúc xuất bến, thêm nhắc khi còn X giờ mà thiếu tên (X cấu hình); (b) chặn cứng tại mốc X giờ. Cần Phần B trước.
18. **Giờ lái tối đa/ngày (C4, pháp lý):** (a) *Khuyến nghị* — giữ ADR-0055: 8 giờ, chỉ cảnh báo, chờ người chuyên môn xác nhận; (b) 10 giờ theo Giám đốc, hoặc chuyển sang chặn (cần ADR mới).
19. **Nhiên liệu + số km (C12d):** (a) *Khuyến nghị* — ghi vào `docs/BACKLOG.md`, gộp với "chi phí xe công ty" sau; (b) soạn ADR mới ngay.
20. **Tự xếp thứ tự điểm đón (A7):** (a) *Khuyến nghị* — ghi BACKLOG, soạn đặc tả sau Phần B; (b) làm ngay. Vẫn chờ hỏi pháp lý ghép khách trên xe hợp đồng.

**Giao diện (bề mặt, trừ biển số)**

21. **Thẻ đơn + màu + iPad (E3, E5, E7):** (a) *Khuyến nghị* — một đợt giao diện nhỏ: đưa mã đơn + tổng tiền lên phần luôn thấy, gộp màu chuyến về 3 màu (chủ chốt "Chưa có tài xế", "Bị giữ" vào màu nào), hạ ngưỡng 3 cột Bảng điều phối cho iPad đứng; **biển số trên thẻ danh sách** để ADR riêng (mở rộng ADR-0059); (b) làm cả biển số cùng lúc (cần ADR trước).
22. **Trang bị iPad (Phần D):** (a) *Khuyến nghị* — hạng mục riêng: chọn máy, tài khoản điều phối, thử trên iPad thật, gộp với đợt thử thiết bị thật đang treo; (b) coi như xong nhờ câu 21.

> Theo CLAUDE.md §9: khi trình **ADR**, mỗi lượt duyệt tối đa 3 quyết định chạm quyền/dữ liệu, kèm trang ghép. Các câu trên là **câu hỏi định hướng**, chưa phải lượt duyệt ADR.

## 7. Đề xuất điều chỉnh kế hoạch (chưa áp — chờ chủ trả lời mục 6)

Nếu chủ chọn theo khuyến nghị:

1. ADR-0047 Phần B (tên khách + nơi trả) lên **đầu** — kèm nơi trả mặc định theo dịch vụ (câu 14) và nhắc thiếu tên (câu 17).
2. ADR-0057 tiền xe thuê T1/T2 giữ vị trí thứ 2 (câu 1), rồi ADR-0053 A-2 tài xế đối tác.
3. Lập kế hoạch sổ tiền lượt 2 cho đơn đại lý (câu 10–13) — song song với Vận chuyển vì khác phân hệ.
4. ADR nhỏ: thông báo đặt gấp (5), quyền trưởng ca (6), huỷ đơn đã xếp (9) — trình theo lượt ≤ 3 quyết định.
5. Đợt giao diện nhỏ (21) + thử iPad thật (22).
6. Lùi ADR-0052 A-1b (3); ADR-0054, 0055, 0056 giữ "xếp theo điều phối".
7. BACKLOG: nhiên liệu + số km (19), tự xếp thứ tự điểm đón (20), đơn trùng vào lộ trình (16).
