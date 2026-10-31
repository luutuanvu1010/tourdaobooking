# Quyết định của chủ dự án — lượt 4, ngày 30/10/2026: luật bán theo loại đối tác là khả năng chung

> Bản ghi có ngày, không sửa. Trỏ về `QUYET-DINH-CHU-2026-10-30-LUOT-3-PHU-THU-VA-DAC-DIEM.md`.

## Lời chủ (nguyên văn)

1. «không phải là chặn Hòn Tằm, đó hãy coi như là 1 ca vàng thôi, 1 ví dụ . Ý của tôi có thể hiểu rộng là : Cho phép đặt/không cho phép đặt dịch vụ cụ thể với vai trò cụ thể (ví dụ: lễ tân khách sạn không thể đặt dịch vụ nào của Hòn Tằm mà không gồm vận chuyển từ đất liền ra đảo và ngược lại ), bạn hiểu ý tôi chứ»
2. Trả lời ba câu người ghi hỏi, cùng bốn câu C1–C4 của đề xuất lượt A: «ôk tôi đồng ý»

## Cách hiểu và đã chốt

| Mã | Đã chốt |
|---|---|
| L4-0 | Hòn Tằm chỉ là **ca vàng / ví dụ**. Yêu cầu là khả năng chung: loại đối tác bất kỳ × dịch vụ / nhóm / đặc điểm (kèm nhóm tuỳ chọn) × hiệu lực, nhập trên bảng điều khiển. Văn bản đề xuất phải trình khả năng chung, ví dụ để ở mục ca vàng |
| L4-1 | «Cho phép / không cho phép» = phương án **(a)**: mặc định mọi loại đặt được mọi dịch vụ; chỉ có quy tắc «không cho phép»; muốn cho phép lại thì kết thúc quy tắc. Không làm danh sách trắng; không làm ngoại lệ «chặn nhóm trừ một vé» ở lượt này (giữ ADR-0146 Đ1) |
| L4-2 | «Và ngược lại»: chủ chưa chọn (i) chiều về đảo → đất liền / (ii) quy tắc ngược. Hai nghĩa đều là **dữ liệu**, mô hình không phụ thuộc lựa chọn. Bộ ca vàng phủ cả hai |
| L4-3 | Lượt A áp **theo loại đối tác**; theo từng hồ sơ đối tác cụ thể làm sau bằng ADR nhỏ |
| A-C1 | Đặt giá trị đặc điểm cho cả nhóm: chỉ Quản trị, Toàn quyền |
| A-C2 | Bán hàng đổi được giá trị của vé đang bị luật trỏ tới, có cảnh báo và nhật ký |
| A-C3 | Đặc điểm đầu tiên do Quản trị tự nhập trên màn; không gieo bằng migration |
| A-C4 | **Duyệt lệch có chủ ý, hẹp, Hiến chương điều 5.2**, kèm năm giới hạn ghi trong đề xuất |

## Hệ quả

- Đề xuất lượt A được **duyệt về nội dung**. Người soạn viết lại phần trình bày theo L4-0; không đổi quyết định nào. Người kiểm soát lại để chắc chắn bản viết lại không đổi nghĩa, rồi chép thành ADR và lập kế hoạch thi công ADR-0146 + lượt A.
- Không phải lệnh triển khai lên production.
