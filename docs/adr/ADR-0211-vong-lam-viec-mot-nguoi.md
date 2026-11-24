# ADR-0211 — Vòng làm việc một người: mỗi việc chủ duyệt hai lần, tối đa ba việc mở, ADR chỉ cho quyết định khó quay lại, phát hành theo chuyến

- **Trạng thái:** **đề xuất** 2026-11-15 — soạn theo lệnh `/goal` của chủ dự án, nguyên văn «hoàn tất kế hoạch, ngoại trừ việc tắt chia sẻ Google Sheet». Chưa có lời duyệt; nhập vào bản chính KHÔNG phải là duyệt văn bản này. Có hiệu lực khi chủ nói «Duyệt ADR-0211».
- **Loại:** luật làm việc của AI (Hiến pháp N3, N9). **Cửa:** hai chiều; bỏ bằng một ADR mới.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 0.** Không đổi mã chạy trên máy chủ, không đổi dữ liệu.
- **Xây trên lỗi an toàn chưa sửa:** không.
- **Quan hệ với văn bản khác:** thi hành đặc tả `docs/superpowers/specs/2026-11-15-kiem-toan-harness-va-cach-thi-cong-mot-nguoi.md` mục I.4. Giữ nguyên Hiến pháp, mọi điều cấm, CLAUDE.md §3 (việc chạm dữ liệu, quyền, tiền, hợp đồng, bất biến vẫn dừng và hỏi chủ; việc lớn vẫn có người kiểm độc lập).

## Bối cảnh

Kiểm toán 15/11 đo được: chủ duyệt trung bình gần 3 ADR mỗi ngày (có ngày 8), mỗi ngày có phát hành thì khoảng 4 số phiên bản, 21 bản làm việc riêng cùng mở, và các tệp sổ chung (sổ hàng rào, nhật ký phiên bản, mục lục ADR) bị nhiều phiên cùng sửa. Tài liệu chính thức của Anthropic khuyên con người duyệt ý định và kết quả cuối, máy giữ các luật không được sai, và chạy song song có giới hạn.

## Đ1 — Mỗi việc chủ duyệt hai lần

1. **Trước khi làm:** AI đọc mã và luật, hỏi chủ một lần (tối đa ba câu, chỉ câu chủ thật sự phải quyết), rồi viết đặc tả ngắn theo mẫu `docs/superpowers/specs/MAU-DAC-TA-NGAN.md`. Chủ duyệt đặc tả.
2. **Sau khi làm:** AI trình báo cáo theo mẫu `docs/superpowers/specs/MAU-BAO-CAO-KET-QUA.md` (ảnh thật hoặc bản thử để bấm, máy đã kiểm gì, điều chưa kiểm). Chủ nói «phát hành» hoặc «sửa».
3. Giữa hai lần duyệt, AI không hỏi, trừ khi lộ ra một quyết định mới chạm tiền, quyền, dữ liệu hoặc trái đặc tả đã duyệt.

## Đ2 — Tối đa ba việc mở cùng lúc

Một việc lớn và hai việc nhỏ. «Việc mở» là việc có bản làm việc riêng chưa nhập bản chính. Việc thứ tư chờ, hoặc chủ chọn việc nào dừng. Việc mở quá 7 ngày phải có quyết định làm tiếp hay bỏ. Trang trạng thái do máy sinh lúc mở phiên liệt kê các bản làm việc riêng để nhìn thấy con số này.

## Đ3 — ADR chỉ cho quyết định khó quay lại

ADR chỉ viết cho: mô hình dữ liệu và migration phá vỡ, ranh giới giữa các phần, bản đồ quyền, luật tiền, hợp đồng với bên ngoài, luật làm việc của AI. Quyết định hành vi của một tính năng (chữ nút, bố cục, tuỳ chọn hiển thị) ghi trong đặc tả ngắn và chủ duyệt ngay ở đó. Việc chạm tiền, quyền, dữ liệu vẫn dừng hỏi chủ như CLAUDE.md §3; nếu là quyết định khó quay lại thì vẫn qua ADR.

## Đ4 — Phát hành theo chuyến

Mặc định mỗi ngày một chuyến phát hành, gom các việc chủ đã nói «phát hành». Việc gấp (lỗi đang làm hỏng việc của nhân viên, an ninh) đi riêng được. Mục nhật ký phiên bản ghi theo chuyến.

## Hệ quả

- **Được:** số lần chủ phải đọc văn bản kỹ thuật giảm; số lần lệnh nhập bản chính và triển khai giảm (mỗi lần khoảng 10 phút máy kiểm); ít phiên cùng sửa sổ chung.
- **Mất:** tính năng nhỏ có thể phải chờ chuyến phát hành của ngày; việc thứ tư phải chờ.
- **Máy canh:** Đ2 nhìn thấy qua trang trạng thái lúc mở phiên (chưa chặn cứng; dựa vào kỷ luật). Đ1, Đ3, Đ4 dựa vào kỷ luật cho tới khi có bài kiểm.

## Câu duyệt mẫu

«Duyệt ADR-0211» — áp cả bốn điều. Muốn bỏ điều nào thì nói tên điều đó.
