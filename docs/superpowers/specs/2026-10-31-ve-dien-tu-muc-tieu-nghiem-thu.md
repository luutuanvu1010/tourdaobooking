# Vé điện tử: Mục tiêu cần đạt và căn cứ nghiệm thu

Trạng thái: **bản nháp chờ chủ duyệt**. Tệp này viết **trước khi thi công** (CLAUDE.md §3: viết tiêu chí nghiệm thu trước khi làm, P20). Sau khi thi công xong, **một phiên độc lập khác với phiên thi công** đối chiếu sản phẩm thật với tệp này; người thi công không tự nghiệm thu (N8).

Đặc tả: `2026-10-31-ve-dien-tu-design.md`. Kế hoạch: `docs/superpowers/plans/2026-10-31-ve-dien-tu.md`.

## 1. Mục tiêu cuối (nói bằng việc nhân viên và khách trải nghiệm)

Nhân viên **không còn phải tải ảnh vé về, lưu vào Zalo rồi tự chọn vé cho từng đơn**. Một người nhập lô vé vào Nền tảng một lần; từ đó mỗi đơn có vé đúng loại, đúng nhóm khách, còn dùng được vào ngày khách đi, **không bao giờ trùng với đơn khác**, và chỉ xem/giao được khi đơn đã thu đủ.

## 2. Tiêu chí nghiệm thu (đúng/sai kiểm được)

### A. Chính xác (không cấp sai)
- A1. Không có vé nào thuộc hai đơn/dòng dịch vụ cùng lúc (kể cả hai người bấm cùng lúc).
- A2. Mỗi dòng dịch vụ có đúng số vé theo số khách hiệu lực từng nhóm (người lớn, trẻ em, cao tuổi); em bé không có vé.
- A3. Vé cấp ra luôn đúng dịch vụ (mã tour), đúng nhóm khách, khoảng ngày dùng được chứa ngày đi; vé một ngày chỉ khớp đúng ngày; vé hết hạn không bao giờ được chọn.
- A4. Trong cùng loại, vé hết hạn sớm nhất được dùng trước.
- A5. Chạy cấp vé lặp lại cho cùng một đơn không cấp thừa.
- A6. Số vé trong đơn đổi theo đúng khi sửa số khách (tăng thì cấp thêm, giảm thì trả bớt, ưu tiên vé chưa giao).
- A7. Đơn huỷ (cả ba đường huỷ) trả vé về kho (còn hạn → có thể cấp lại; hết hạn → vô hiệu); huỷ lặp không trả hai lần.

### B. Không làm hỏng việc đang chạy
- B1. Đơn **luôn xác nhận được** dù kho thiếu vé; đơn hiện nhãn "thiếu vé" cùng số thiếu theo nhóm, có nút **Cấp vé** bấm lại được.
- B2. Nhập lô mới vào kho thì đơn đang thiếu được cấp bù tự động (ngày đi gần trước, xác nhận sớm trước).
- B3. Mọi chức năng đơn hiện có (lập, xác nhận, huỷ, sửa tiền, đưa đón, hoa hồng) giữ nguyên hành vi; bộ `npm test`, `npm run typecheck`, `npm run test:e2e` xanh.

### C. Bảo mật và riêng tư
- C1. Mã vé (`TA.…`/S/N), nội dung QR, khoá kho **không xuất hiện** trong nhật ký, phản hồi lệnh ghi, câu báo lỗi, URL (có bài khoá, mỗi route mới thêm một ca).
- C2. Đơn **chưa thu đủ**: không đọc được ảnh vé, không thấy mã; thu đủ mới mở (kể cả đơn đại lý trả sau). "Thu đủ" = số đã thu ròng ≥ số phải thu của đơn và số phải thu > 0 (mặc định, chủ có thể đổi ở ADR).
- C2b. Vé đã mở khoá/đã lộ (`revealed_at`) **không bao giờ về lại kho** kể cả khi đơn huỷ hoặc khoản thu bị đảo; hiện cảnh báo trên đơn. (Máy chủ hiện chưa chặn huỷ đơn đã thu, nên đây là chốt phòng thủ.)
- C3. Kho tệp riêng, không URL ký sẵn; tải qua Worker; kiểm quyền → ghi nhật ký → mới đọc kho.
- C4. Đường dẫn khách: token ngẫu nhiên không đoán được, chỉ lưu băm, có hạn, thu hồi được; sai/hết hạn/thu hồi trả cùng một kiểu 404; trang chỉ có ảnh vé, nhãn nhóm khách, khoảng ngày.
- C5. Mọi route mới khai `access`; vai không có quyền nhận 403; quyền kho vé: Toàn quyền, Quản trị, Bán hàng; có bài ghim cả hàng quyền.

### D. Nhập lô và kho
- D1. Một lô = một dịch vụ + một nhóm khách chọn một lần; lô lẫn tên sản phẩm in trên vé, hoặc nhóm khách trên ảnh khác nhóm đã chọn, **không** vào kho nếu chưa được xử lý.
- D2. Vé trùng mã bị loại ngay, không vào kho hai lần.
- D3. Ảnh chụp màn hình điện thoại (thanh trạng thái, tỷ lệ khác) đọc được hoặc báo "cần sửa tay"; không bao giờ báo thành công sai.
- D4. Tệp không phải ảnh/PDF hợp lệ bị từ chối; giới hạn cỡ như kho tệp hiện có.
- D5. Có màn thống kê kho (route `GET /api/ve/kho` + màn hình): theo từng dịch vụ và nhóm khách, số vé còn trong kho, số sắp hết hạn trong 7 ngày, số đã giữ chỗ, số đã giao.
- D6. Cấp vé an toàn khi tiến trình chết giữa chừng: đơn đã xác nhận mà chưa có vé vẫn hiện "thiếu vé" và được cấp bù (nhập lô mới, thu đủ, nút Cấp vé, quét định kỳ).
- D7. Khi giảm số khách mà vé đã giao còn thừa, đơn hiện cảnh báo "vé đã giao còn thừa"; hệ thống không tự thu hồi vé khách đang giữ.

### E. Giao vé
- E1. Nhân viên gửi vé của **đúng đơn đang mở** sang Zalo trên iPhone thật (chia sẻ nhiều ảnh), hoặc dùng dự phòng "Tải ảnh về / Sao chép đường dẫn". Mỗi lần giao ghi lại ai, lúc nào (thay dấu "like").
- E2. Khách mở đường dẫn riêng xem và tải được đúng vé của đơn mình.
- E3. Có thông báo cho người giữ quyền kho khi vé một loại cạn; không gửi lặp.

### F. Kiểm soát thay đổi
- F1. Migration chỉ thêm tệp mới, số đã đối chiếu với mọi nhánh chưa gộp; `docs/data-dictionary.json` + `npm run dict` đã cập nhật.
- F2. `src/architecture.test.ts` xanh: `orders` không import module mới; module mới đọc qua view công bố.
- F3. Hàng rào mới (chỉ mục duy nhất, trigger một chiều, khoá lộ mã vé, hàng rào tĩnh kho) đều có dòng trong `docs/SO-HANG-RAO.md` kèm ngày **đã quan sát chặn thật** (sửa cố ý → đỏ → hoàn nguyên).
- F4. Tài liệu sống đã cập nhật: `SYSTEM-DESIGN.md`, `CHANGE-GUIDE.md`, nhật ký thay đổi, `HANDOFF-N1.md`.
- F5. ADR kho vé + đường dẫn khách + quyền do chủ duyệt **trước** khi thi công phần chạm luật.

## 3. Chỉ số kết quả (đo ở môi trường thật sau triển khai, số mục tiêu do chủ chốt)

Các số dưới đây là **đề xuất**, chủ sửa. Chưa có số đo hiện tại, nên bước đầu tiên là đo.

| Chỉ số | Hiện tại | Mục tiêu đề xuất |
|---|---|---|
| Thời gian nhân viên xử lý vé cho một đơn (từ đơn thu đủ đến khách nhận vé) | chủ đo thử 5 đơn trước khi triển khai | giảm còn thao tác gửi (không tìm vé, không tự gắn) |
| Vé trùng giữa hai khách | không đo được | 0 (kiểm bằng bất biến `audit-invariants`) |
| Đơn đủ vé ngay khi xác nhận, khi kho đủ | không đo được | 100% |
| Vé gửi nhầm/không khớp ngày | không đo được | 0 theo bất biến + người kiểm thử mẫu |
| Số lần mã vé xuất hiện trong nhật ký | n/a | 0 |

## 4. Cách đánh giá lại sau khi thi công (phiên độc lập)

Người đánh giá **khác người thi công**, chỉ đọc mã và chạy lệnh:

1. Đọc tệp này, đặc tả, kế hoạch; đối chiếu từng tiêu chí A–F với mã thật và test (tệp:dòng), không dựa vào báo cáo của người thi công.
2. Chạy `npm run typecheck`, `npm test`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.
3. Quan sát lại hàng rào mới: cố ý phá (bỏ chỉ mục duy nhất, ghi mã vào nhật ký) → thấy đỏ → hoàn nguyên.
4. Thử thật trên bản chạy local: nhập một lô mẫu (các ảnh mẫu đã dùng khi thiết kế: bảy vé VinWonders, kể cả hai ảnh chụp màn hình), lập đơn có em bé + nhiều nhóm, xác nhận, thu đủ, xem, gửi, huỷ.
5. Báo cáo từng tiêu chí: Đạt / Không đạt / Chưa kiểm được, kèm bằng chứng; điều không đạt trả về phiên thi công.
6. Chủ ký nhận sau khi (a) thử iPhone thật với một lô thật, (b) đo lại chỉ số §3.

## 5. Không nằm trong mục tiêu lượt này

Tự gửi Zalo cho khách; mua vé tự động trên trang nhà cung cấp; nhà cung cấp vé khác ngoài VinWonders/Vinpearl; đối soát tiền mua vé; hoàn tiền khi vé đã giao (luật chủ: đơn chỉ huỷ khi chưa thanh toán).
