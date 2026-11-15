# Bảng ví dụ tính phí đón — trang để chủ dự án và Kế toán xác nhận

> Hồ sơ có ngày 2026-11-14. Nguồn số: `golden/phi-dua-don.json` (28 ca `SV-PD-01…28`). Luật: ADR-0147, ADR-0203. AI soạn, chủ hoặc Kế toán xác nhận; AI không tự xác nhận.

## Cách đọc

Các ví dụ dưới đây dùng chung **một bảng phí mẫu**. Tên khu vực, tên cấp và số tiền chỉ là ví dụ để kiểm cách tính, **không phải bảng giá thật**: bảng giá thật do Quản trị đặt sau. Điều cần bạn xác nhận là **cách máy chọn mức và cách nhân tiền**, không phải con số 100.000 hay 50.000.

Với mỗi ví dụ, bạn trả lời «đúng» hoặc «sai chỗ…». Có thể trả lời gộp: «đúng hết», hoặc «đúng hết trừ ca 10».

## Bảng phí mẫu

Phí đón bắt đầu áp từ 01/12/2026. Đi chung thì tính theo mỗi khách, xe riêng thì tính theo mỗi chuyến.

| Khu vực | Mức chung (khách lẻ, đại lý chưa có cấp) | Mức riêng |
|---|---|---|
| Trung tâm Nha Trang | 0 đ (miễn phí) | Xe riêng: 200.000 đ/chuyến |
| Bắc Nha Trang | 30.000 đ/khách | Đại lý cấp 1: 0 đ. Chưa có mức xe riêng |
| Bãi Dài – Cam Ranh | 100.000 đ/khách tới 31/12/2026; 110.000 đ/khách từ 01/01/2027 | Đại lý cấp 1: 50.000 đ. Đại lý cấp 3: 80.000 đ. Nhóm Hòn Tằm: 70.000 đ. Cấp 1 + nhóm Hòn Tằm: 40.000 đ. Tour 3 đảo: 0 đ (chương trình tháng 12, hết 31/12). Chiều về: 120.000 đ. Xe riêng: 500.000 đ/chuyến; xe riêng của cấp 1: 400.000 đ/chuyến |
| Ngoài vùng (nơi đón gõ tay) | 150.000 đ/khách | — |

Đại lý cấp 1 là cấp cao nhất, cấp 3 là cấp thấp nhất. Ngày xác nhận đơn là 10/12/2026 nếu ví dụ không nói khác.

## A. Cách tính cơ bản

1. **Ca 01 — đón miễn phí ở trung tâm.** Khách lẻ, 2 người lớn, đón ở trung tâm: 0 đ. Biên nhận vẫn in dòng «Phí đưa đón — Miễn phí».
2. **Ca 02 — xa trung tâm thì trả phí.** Khách lẻ, 2 người lớn + 1 trẻ em, đón ở Bãi Dài: 100.000 × 3 = 300.000 đ.
3. **Ca 03 — đón đi và đưa về.** Khách lẻ, 2 người lớn, Bãi Dài: chiều đi 100.000 × 2 = 200.000 đ, chiều về (có mức riêng) 120.000 × 2 = 240.000 đ. Tổng 440.000 đ, hai dòng phí.
4. **Ca 04 — em bé không tính.** Khách lẻ, 2 người lớn + 1 em bé, Bắc Nha Trang: 30.000 × 2 = 60.000 đ.
5. **Ca 05 — nơi đón gõ tay.** Nhân viên gõ tay tên một homestay không có trong danh mục, 2 người lớn: tính «Ngoài vùng», 150.000 × 2 = 300.000 đ.

## B. Theo cấp độ đại lý

6. **Ca 06 — đại lý cấp 1.** Đón 2 người lớn ở Bãi Dài: 50.000 × 2 = 100.000 đ (khách lẻ cùng chỗ trả 200.000 đ).
7. **Ca 07 — đại lý cấp 3.** Cùng khách sạn, cùng tour: 80.000 × 2 = 160.000 đ.
8. **Ca 13 — đại lý chưa được gán cấp.** Trả mức chung như khách lẻ: 100.000 × 2 = 200.000 đ. Đơn không bị chặn.
9. **Ca 14 — đại lý mang hai vai trò, hai cấp khác nhau.** Máy không tự chọn cấp. Văn phòng bấm xác nhận thì bị từ chối với câu báo «cần gán cấp riêng cho đối tác …». Đối tác tự gửi đơn thì đơn vào «chờ xác nhận». Kế toán gán cấp riêng xong thì tính như ca 06 hoặc 07.

## C. Theo dịch vụ và nhóm dịch vụ

10. **Ca 08 — dịch vụ thắng cấp.** Tháng 12 có chương trình «Tour 3 đảo miễn phí đón ở Bãi Dài». Đại lý cấp 3 đặt Tour 3 đảo: 0 đ, dù bình thường cấp 3 trả 80.000 đ/khách.
11. **Ca 09 — hết chương trình.** Cũng đơn đó nhưng xác nhận ngày 05/01/2027: về lại mức cấp 3, 80.000 × 2 = 160.000 đ.
12. **Ca 12 — vé có đón.** Khách lẻ mua Vé Hòn Tằm có đón, 2 người lớn, Bãi Dài: theo nhóm Hòn Tằm, 70.000 × 2 = 140.000 đ.
13. **Ca 10 — cấp thắng nhóm. Cần bạn đọc kỹ.** Đại lý cấp 3 đặt Tắm bùn Hòn Tằm ở Bãi Dài. Có hai mức khớp: «nhóm Hòn Tằm 70.000 đ» và «cấp 3: 80.000 đ». Theo thứ tự đã duyệt (dịch vụ, rồi cấp, rồi nhóm), máy lấy mức theo cấp: 80.000 × 2 = 160.000 đ. Hệ quả: ở ví dụ này **đại lý cấp 3 trả cao hơn khách lẻ** (khách lẻ trả 70.000 đ/khách ở ca 12). Đây là do cách đặt bảng mẫu, không phải máy tính sai: muốn cấp 3 cũng được 70.000 đ thì Quản trị đặt thêm một dòng «cấp 3 + nhóm Hòn Tằm». Nút Thử tra sẽ cho thấy điều này trước khi lưu.
14. **Ca 11 — dòng nêu cả cấp lẫn nhóm.** Đại lý cấp 1 đặt Tắm bùn Hòn Tằm: ba mức khớp (cấp 1: 50.000; nhóm Hòn Tằm: 70.000; cấp 1 + nhóm Hòn Tằm: 40.000). Máy lấy dòng cụ thể nhất: 40.000 × 2 = 80.000 đ.
15. **Ca 27 — một đơn hai dịch vụ.** Đại lý cấp 1, 2 người lớn, đón ở Bãi Dài cho Tour 3 đảo (miễn phí) và cho Tắm bùn Hòn Tằm (40.000 đ/khách): 0 + 80.000 = 80.000 đ. Mỗi lượt đón tính theo dịch vụ của nó.

## D. Xe riêng và thiếu mức

16. **Ca 15 — xe riêng.** Khách lẻ thuê xe riêng đón 4 người ở Bãi Dài: 500.000 đ cho cả chuyến, không nhân số khách.
17. **Ca 16 — xe riêng của đại lý cấp 1.** 400.000 đ một chuyến. Máy không lấy mức đi chung 50.000 đ/khách.
18. **Ca 17 — thiếu mức thì không tính 0.** Khách lẻ đặt xe riêng ở Bắc Nha Trang, nơi chưa có mức xe riêng: máy báo thiếu mức, văn phòng không xác nhận được cho tới khi Quản trị đặt mức. Máy không lấy 0 đ, cũng không lấy mức đi chung.

## E. Số người ở chiều về

19. **Ca 18 — chiều về ghi nhiều hơn số khách tính tiền.** 2 người lớn + 1 em bé, Bắc Nha Trang. Chiều đi 30.000 × 2 = 60.000 đ. Chiều về nhân viên ghi «3 người» (tính cả em bé): máy vẫn chỉ tính 2 khách, 60.000 đ. Tổng 120.000 đ.
20. **Ca 19 — chiều về ít người hơn.** 3 người lớn, chiều đi 30.000 × 3 = 90.000 đ; chiều về chỉ 1 người đi xe, 30.000 đ. Tổng 120.000 đ.

## F. Sau khi đơn đã xác nhận

21. **Ca 20 — đổi bảng phí không đổi đơn cũ.** Đơn xác nhận 28/12/2026, Bãi Dài, 2 người lớn: 200.000 đ. Từ 01/01/2027 mức tăng lên 110.000 đ. Đơn này vẫn 200.000 đ.
22. **Ca 21 — đơn xác nhận sau ngày đổi mức.** Xác nhận 02/01/2027: 110.000 × 2 = 220.000 đ.
23. **Ca 22 — đại lý đổi cấp sau khi đơn đã xác nhận.** Đại lý cấp 3 xác nhận đơn 160.000 đ, hôm sau được nâng lên cấp 1. Đơn cũ vẫn 160.000 đ và vẫn ghi «cấp 3». Đơn mới mới tính theo cấp 1.
24. **Ca 23 — thêm lượt đón sau khi đã xác nhận.** Đơn 300.000 đ đã xác nhận, khách xin thêm chiều về. Máy thêm lượt đón nhưng **không tự cộng tiền**. Muốn thu thêm, văn phòng ghi điều chỉnh công nợ có người thứ hai duyệt.
25. **Ca 24 — sửa số khách sau khi đã xác nhận.** Đơn ca 20 (100.000 đ/khách, 2 người). Ngày 03/01/2027 người có quyền sửa tiền sửa thành 3 người: tính lại theo mức đã ghi lúc xác nhận, 100.000 × 3 = 300.000 đ, không theo mức mới 110.000 đ.
26. **Ca 28 — trước ngày bật.** Đơn xác nhận 25/11/2026, trước ngày bắt đầu áp 01/12: không có dòng phí đón nào, đơn chạy như hôm nay.

## G. Tiền đi đâu (Kế toán nên đọc)

27. **Ca 25 — phí đón trong số đại lý nợ công ty.** Đại lý cấp 3, đơn trả sau. Tour lặn biển 600.000 × 2 = 1.200.000 đ; hoa hồng 10% = 120.000 đ; phí đón 80.000 × 2 = 160.000 đ.
    - Khách trả tổng cộng: 1.360.000 đ.
    - Đại lý nợ công ty: 1.200.000 − 120.000 + 160.000 = **1.240.000 đ**.
    - Hoa hồng vẫn 120.000 đ, không tính trên phí đón.
28. **Ca 26 — phí đón thuộc phần của Tour Đảo.** Khách lẻ, Tắm bùn Hòn Tằm (do Hòn Tằm bán) 500.000 × 2 = 1.000.000 đ; phí đón 70.000 × 2 = 140.000 đ. Trên biên nhận: phần của Hòn Tằm 1.000.000 đ, phần của Tour Đảo 140.000 đ, tổng 1.140.000 đ.

## Sau khi bạn xác nhận

Ca nào bạn trả lời «đúng» thì được ghi là đã xác nhận, kèm tên và ngày. Ca nào bạn nói sai thì sửa luật hoặc sửa ca trước, rồi hỏi lại riêng ca đó. Mã phí đón chỉ được viết sau bước này.
