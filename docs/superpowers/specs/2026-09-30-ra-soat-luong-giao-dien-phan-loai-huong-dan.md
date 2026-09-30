# Rà soát luồng làm việc, giao diện, phân loại dịch vụ, hướng dẫn theo vai (2026-09-30, sau bản 1.38)

- **Loại:** báo cáo rà soát + đề xuất (tài liệu MÔ TẢ, chưa phải quyết định). Chủ dự án giao 30/9: (1) rà luồng làm việc tìm điểm bất hợp lý ("Bán hàng nhập điểm đón mà tài xế không thấy"); (2) đánh giá giao diện ("thiếu hiển thị đã chọn mấy dịch vụ", "Thông tin chuyến nên thu gọn mặc định"); (3) phân loại dịch vụ (danh mục, thẻ) làm bộ lọc ("HDV thường chỉ chọn Thể thao biển"); (4) hướng dẫn đơn giản theo vai, tự cập nhật theo mã và sơ đồ kiến trúc.
- **Cách làm:** bốn người rà soát độc lập, chỉ đọc, song song (phiên điều phối chung giao). Mọi phát hiện có tệp:dòng trong báo cáo gốc; ở đây chỉ giữ kết luận. Rà giao diện có chụp 15 ảnh trên D1 tạm (ngoài repo, `~/.claude/jobs/9b4860df/tmp/ui-audit/anh/` — mất khi job bị xoá).
- **Chưa kiểm:** iPhone / Safari thật; dữ liệu production (ngoài các số đã có ở `docs/HANDOFF-N1.md` mục 1.38); các màn quản trị văn phòng chưa rà kỹ.

## 1. Luồng làm việc giữa các vai

**Trả lời ví dụ của chủ:** trên 1.38 tài xế **không bao giờ** thấy điểm đón: (1) điểm đón chỉ tới tài xế khi văn phòng tạo chuyến và xếp chặng — chủ đã quyết chưa dùng Điều phối cho chuyến thật; (2) có chuyến rồi, màn tài xế trước Xuất bến chỉ vẽ biển số, giờ, số khách, điều kiện xuất bến — máy chủ **có gửi** danh sách điểm nhưng màn không vẽ (`web/cuoc-chuyen.ts:78`, `:215-237`; `src/modules/van-chuyen/tai-xe-dto.ts:61-63`); (3) Xuất bến luôn bị giữ (chưa nhập được tên khách, đơn mới không có nơi trả); (4) đổi nơi đón khi xe đang chạy thì tài xế vẫn thấy nơi cũ (đã có kế hoạch ADR-0052).

| Mã | Mức | Phát hiện | Loại việc | Đã có kế hoạch? |
|---|---|---|---|---|
| C1 | CAO | HDV **không được báo** khi giờ / nơi đón / số khách đổi sau xác nhận (thông báo chỉ có lập, nhận, giao, xác nhận, huỷ — `src/shared/thong-bao.ts:7`, `src/shared/bang-tin.ts:106-111`); chiều ngược lại (HDV sửa số khách) người lập cũng không được báo | máy chủ + quyết định chủ (ADR-0045 "chỉ báo khi xác nhận") | **Chưa** — ADR-0052 D6 chỉ tin chuyến, loại HDV |
| C2 | CAO | Sau xác nhận, **chỉ HDV phụ trách + Toàn quyền** sửa được số khách; Bán hàng lập đơn, Quản trị, Kế toán không sửa được; không đưa về nháp được (`src/modules/dispatch/index.ts:238-239`; bảng quyền `order.money.edit` đã có ô nhưng route chưa làm) | ADR (chạm tiền) | Gắn Sổ tiền lượt 1 (chưa thi công) |
| C3 | CAO | Tài xế không thấy điểm đón / giờ hẹn **trước Xuất bến** (dữ liệu có, màn không vẽ) | giao diện; bản vẽ 6b/6c của chủ nên xem lại | Chưa |
| C4 | CAO | Đơn mới không có nơi trả + không màn nào nhập tên khách → chuyến không bao giờ xuất bến | — | **ADR-0047 Phần B** (chờ chủ vẽ) |
| V1 | VỪA | Thẻ "Việc của tôi" của HDV không hiện ghi chú dịch vụ, giờ khởi hành, check-in (dữ liệu **đã gửi**, màn không vẽ); không có liên kết sang trang đơn | giao diện nhỏ | — |
| V2 | VỪA | Ghi chú **đơn** không có trong dữ liệu gửi HDV | máy chủ nhỏ, chủ gật (mở thêm dữ liệu cho HDV) | — |
| V3 | VỪA | Ghi chú dịch vụ, giờ check-in không lên Bảng điều phối và tài xế (cố ý, ruling R-P11) | ADR (đổi dữ liệu được phép) | BACKLOG mục 5 (chủ gác) |
| V4 | VỪA | "Nơi check-in" và "nơi trả" cùng thông tin, hai chỗ, không nối | quyết định chủ khi vẽ Phần B | Gắn ADR-0047 Phần B |
| V5 | VỪA | Trang đơn không hiện "đã xếp xe nào, tài xế nào" | máy chủ + giao diện; chủ quyết cho Đối tác | — |
| V6 | VỪA | HDV và tài xế không biết nhau (người đi kèm máy chủ nhận nhưng không màn nào gửi) | ADR (quyền) | Chủ từng trả lời Q1 "HDV không thấy lịch xe" |
| V7 | VỪA | Sửa giờ / nơi đón sau xác nhận: Đối tác, Thực tập (tự lập đơn), HDV hiện trường, Bán hàng khác không sửa được — dồn về Quản trị | ADR (quyền) | — |
| V8 | VỪA | Không có chỗ ghi đã thu tiền → "Còn thu" đứng yên | — | **Sổ tiền lượt 1** |
| V9 | VỪA | Tài xế không được báo gì về chuyến (xếp, đổi giờ, gỡ, huỷ) | — | **ADR-0052 D5, D6** |
| T1–T5 | THẤP | Không có ô ngày đón riêng (Phần B); giờ đón lệch khung chuyến chỉ cảnh báo (ADR-0052 D6); nơi đón gõ tự do thành nhiều điểm (Phần B); Kế toán xem tên khách chuyến (nhất quán quyền hiện có); Bán hàng xếp mọi chuyến (đúng lời chủ Q1) | — | phần lớn đã có kế hoạch |

## 2. Giao diện

**Hai ví dụ của chủ — XÁC NHẬN:**
- **Đếm dịch vụ đã chọn (CAO):** tiêu đề khối chỉ "Dịch vụ", tóm tắt và thanh đáy không có số; chọn xong thẻ mới gắn cuối, ô tìm đóng — trên điện thoại sau 3 lần chọn chỉ thấy một khúc thẻ; chọn trùng được, danh sách kết quả không đánh dấu mục đã chọn. Đề xuất (bề mặt): "Dịch vụ (3)"; dòng "3 dịch vụ" ở Tóm tắt; thanh đáy gộp một dòng "3 dịch vụ · Tổng …" ("Còn lại" chỉ hiện khi có thanh toán trước); báo ngắn "Đã thêm … — đơn có 3 dịch vụ"; nhãn "đã chọn" trong kết quả tìm (không chặn chọn trùng — chủ quyết).
- **"Thông tin chuyến" thu gọn (CAO):** điện thoại **đã** thu gọn; máy tính **mở sẵn** theo quyết định Q2 (19/9, [GIẢ ĐỊNH]) — chủ nay yêu cầu thu gọn mặc định ⇒ áp cho cả máy tính (giữ tự mở đúng thẻ khi đi từ cảnh báo "thiếu thông tin chuyến"). Dòng tóm tắt bị cắt mất nơi đón trên điện thoại và lặp ngày (cả đơn một ngày từ ADR-0021) ⇒ đổi thành "Đón 07:30 · KS Mường Thanh Luxury · Check-in 08:15", cho xuống dòng, thiếu thì "Chưa có giờ / nơi đón" kiểu cảnh báo.

**Phát hiện khác (tóm tắt; (i) = sửa bề mặt làm ngay được, (ii) = đổi bố cục, chủ duyệt / vẽ, (iii) = cần dữ liệu / máy chủ):**

| Màn | Mức | Phát hiện | Loại |
|---|---|---|---|
| Form đơn | VỪA | Mỗi thẻ dịch vụ ~700px (4 bộ đếm + dòng tiền luôn hiện) — form 3 dịch vụ hơn 4 màn hình | ii (gập thẻ đã điền) |
| Form đơn | THẤP | Chữ "nhập tay" còn trong ô tìm dù dịch vụ nhập tay đã bỏ | i |
| Trang đơn | CAO | Hàng nút đầu trang: hai nút nổi bật cạnh tranh; "Huỷ đơn" sát "Xác nhận đơn" | ii |
| Trang đơn | VỪA | Tên, SĐT, tiền lặp giữa dải đầu và thẻ Khách hàng / Thanh toán | ii |
| Trang đơn | VỪA | "Số khách" dải đầu **cộng dồn mọi dịch vụ** (2 NL tour + 2 NL motor = "4 NL") — dễ hiểu sai số người thật | iii (chủ định nghĩa "số khách của đơn") |
| Trang đơn | VỪA | Viết tắt NL / TE / EB; mỗi dịch vụ lặp "Khởi hành"; HDV thấy hai câu khoá mâu thuẫn | i |
| Danh sách đơn | CAO | Ở 390px tên khách bị cắt còn 2–3 chữ | ii (mẫu thẻ Đợt E đã duyệt) |
| Danh sách đơn | VỪA | Không lọc theo ngày đi (hôm nay / ngày mai) | iii hoặc i (chưa kiểm API) |
| Việc của tôi (HDV) | CAO | Không hiện ghi chú dịch vụ, check-in; không có liên kết "Xem đơn" (= V1) | i |
| Việc của tôi (HDV) | VỪA | Nhãn tiền "Đã cọc / Còn thu" khác mọi màn khác ("Thanh toán trước / Còn lại") dù chủ đã đổi; tên HDV lặp 3 lần; dòng nhỏ còn tên app cũ | i |
| Tài xế | VỪA | Lúc đang chạy "Kết thúc gián đoạn" là nút đỏ to nhất; điểm đón không có "Chỉ đường" | i |
| Khung chung | VỪA | Cùng mục khác tên giữa tab điện thoại và thanh bên ("Tôi"/"Của tôi", "Dịch vụ"/"Dịch vụ & giá", "Chờ nhận"/"Chưa phụ trách") | i |
| Khung chung | THẤP | Nút dạng chữ vùng bấm ~28px (< 44px); trang đăng nhập ghi "Tour Đảo Booking" còn tên app là "Island Booking System" | i |

## 3. Phân loại dịch vụ

- **Sheet hiện có 109 dịch vụ** (không phải ~34), mã **không** theo tiền tố nhóm (TT / TTB / TB đè nhau; ZIP, ATV, SM1… không tiền tố) ⇒ không suy nhóm từ mã được.
- **Sheet đã có cột phân 15 nhóm** (Tour đảo 11, Long Phú 5, Hòn Tằm 4, Harbour 3, Vinwonders 7, Du thuyền 6, **Thể thao biển 23**, I Resort 10, Kong Forest 3+1, Trăm trứng 6, Nhà hát Đó 6, Tháp Bà 13, Thuê xe 6, Buýt City Tour 6) nhưng nằm ở cột "Ghi chú nội bộ" mà đặc tả đã duyệt **cấm app đọc** (`docs/SPEC-tourdao-sales.md:156,166`); cột đã có lỗi (ATV ghi "Kong Forest" mà mã nhóm của Tháp Bà). Sheet dùng chung với website `tourdaovn`.
- **HDV hôm nay không chọn dịch vụ ở đâu** (quyền FIELD không lập / sửa đơn; ADR-0019 điều 3 cấm HDV đọc bảng giá cho form) ⇒ ví dụ "HDV lọc Thể thao biển" cần mở quyền riêng (ADR-0023 điều 3 còn proposed).
- **Khuyến nghị:** nhóm quản lý **trong app** (như chủ chọn cho ô "Đưa đón" ở ADR-0054), **gieo sẵn 15 nhóm** theo Sheet hôm nay (sửa ATV, chủ xác nhận tên nhóm), Quản trị sửa sau; mỗi dịch vụ một nhóm (thẻ nhiều-nhiều để sau); chip nhóm + "Chưa phân loại" trên ô chọn dịch vụ ở form đơn, có nhãn "Đang lọc: … — N dịch vụ", nhớ lựa chọn theo từng người trên máy (không mặc định theo vai). Cần **ADR-0058** (tiền tố bảng mới cho `catalog`, hai bảng có lịch sử, bổ sung DTO của ADR-0033/0028, quyền ghi = `admin.manage`), giữ chỗ số migration (0044–0045 đã giữ cho sổ tiền), người kiểm độc lập sau thi công.

## 4. Hướng dẫn theo vai, tự cập nhật

- **Hiện trạng:** trang Trợ giúp trong app chỉ có phiên bản + nhật ký thay đổi + Góp ý; hướng dẫn nằm rải rác trong `docs/` viết tay; chỉ sổ dữ liệu và nhật ký thay đổi có cơ chế tự động; không test nào canh menu hay đối chiếu tài liệu với mã.
- **Nói thật "tự cập nhật":** máy **sinh** được menu theo vai, danh sách trang, bảng quyền (cần nhãn lời thường mỗi ô), các con số và sơ đồ tầng trong sơ đồ kiến trúc; máy **canh** được bằng test (tên nút trong hướng dẫn phải còn trong mã; trang mới phải có hướng dẫn; con số sơ đồ khớp mã) — `day-len` / `trien-khai` đã chạy `npm test` nên tự thành cổng; máy **không viết được** các bước và lý do — AI soạn ở bước phát hành, chủ đọc lướt (đúng định nghĩa "tự động" chủ chốt 23/9 cho nhật ký thay đổi). Giới hạn: test tên nút chỉ biết "chữ còn tồn tại", không biết "vai này có thấy nút đó" (vd "+ Dịch vụ nhập tay" còn trong mã nhưng bị ẩn).
- **Khuyến nghị:** một nguồn dữ liệu (`src/shared/huong-dan.ts`, như `changelog.ts`) hiện ở trang Trợ giúp theo quyền người đăng nhập + sinh bản đọc ngoài app `docs/HUONG-DAN-THEO-VAI.md` có test khớp. Lượt 1 nhỏ: Bán hàng + HDV, ba test canh (quan sát chặn thật, ghi sổ hàng rào). Lượt 2: tách mô hình menu khỏi `web/shell.ts`, sinh "Menu của bạn", thêm vai. Lượt 3: vai còn lại, sinh khối sơ đồ kiến trúc; hai trang HTML sơ đồ giữ làm ảnh chụp có ngày.
- **Câu quyền cần chủ:** mọi tệp chạy của app đã nạp sẵn vào mọi máy (ADR-0035) ⇒ lọc theo quyền trong trình duyệt chỉ là ẩn, chữ hướng dẫn của Quản trị nằm trên máy Đối tác. Khuyến nghị chấp nhận, với luật viết "chỉ tên nút và cách làm, không giá, không số liệu nhạy cảm".

## 5. Thứ tự đề nghị (điều phối)

1. **Làm ngay (bề mặt, đảo ngược được, chủ đã yêu cầu):** đếm dịch vụ; "Thông tin chuyến" thu gọn mặc định cả máy tính + dòng tóm tắt mới; thẻ HDV hiện ghi chú dịch vụ / check-in + "Xem đơn"; thống nhất nhãn tiền và tên mục; các sửa (i) nhỏ khác. Một bản phát hành, chạy lại kịch bản Chrome liên quan.
2. **Cần chủ quyết rồi mới làm:** C1 (báo đổi giờ tới HDV / người lập), C2 + V7 (ai sửa số khách, giờ / nơi đón sau xác nhận), C3 (tài xế thấy điểm trước xuất bến), V2 / V3 / V5 / V6, định nghĩa "số khách của đơn", phân loại dịch vụ (ADR-0058), hướng dẫn theo vai (đặc tả + câu quyền).
3. **Đã có kế hoạch, không làm trùng:** ADR-0047 Phần B (C4, V4, T1, T3 — chủ vẽ, nhớ có **ô nơi trả**), Sổ tiền lượt 1 (V8, một phần C2), ADR-0052 D5/D6 (V9, T2).

## 6. Chủ dự án trả lời (2026-09-30, hộp hỏi của phiên điều phối chung — nguyên văn lựa chọn)

| Câu | Lựa chọn của chủ | Việc kéo theo |
|---|---|---|
| Sau xác nhận, đổi giờ / nơi đón / số khách thì ai được báo (tin trong app + màn hình khoá)? | **"Báo HDV + người lập đơn"** — HDV phụ trách và người lập / phụ trách đơn nhận tin; tài xế được báo riêng ở ADR-0052 D6 | C1: cần ADR mới (thay câu "chỉ báo khi xác nhận" của ADR-0045 cho loại tin này) |
| Sau xác nhận, ai được sửa số khách (kéo theo tiền)? | **"Thêm Quản trị + Kế toán + người lập đơn"** — mỗi lần sửa ghi lịch sử tiền; làm chung với Sổ tiền lượt 1 | C2: ADR / gắn kế hoạch Sổ tiền lượt 1 (chạm tiền, quyền) |
| Phân loại dịch vụ quản lý ở đâu? | **"Trong app, gieo sẵn 15 nhóm"** — một lần từ Sheet (sửa nhóm của ATV), Quản trị sửa sau; mỗi dịch vụ một nhóm, thẻ để sau | §3: ADR-0058 + kế hoạch; giữ chỗ số migration |
| Hướng dẫn theo vai làm thế nào? | **"Trong app + bản đọc ngoài, từ 1 nguồn"** — lượt 1 Bán hàng + HDV, có bài kiểm lệch | §4: đặc tả mới + câu quyền "chữ hướng dẫn nằm trên mọi máy" (còn hỏi) |

Còn chờ chủ (chưa hỏi, không chặn phần đang làm): C3 tài xế thấy điểm trước xuất bến; V2 ghi chú đơn tới HDV; V3 ghi chú tới điều phối / tài xế; V5 trang đơn hiện xe / tài xế; V6 HDV ↔ tài xế thấy nhau; V7 ai sửa giờ / nơi đón sau xác nhận; định nghĩa "số khách của đơn"; câu quyền của hướng dẫn trong app; các đổi bố cục loại (ii).
