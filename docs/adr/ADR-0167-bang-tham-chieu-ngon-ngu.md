# ADR-0167 — Bảng tham chiếu ngôn ngữ: mỗi khái niệm một tên, mỗi tên một nghĩa, tra từ một nguồn

- **Trạng thái:** **accepted** — chủ dự án trả lời câu hỏi duyệt đặc tả `docs/superpowers/specs/2026-11-04-bang-tham-chieu-ngon-ngu-design.md` ngày 2026-11-04, nguyên văn: *«Duyệt»*. Phạm vi chủ chọn trước đó, nguyên văn: *«A : Như bạn khuyên»* (ghi các việc quan trọng, trạng thái đơn và từ chuyên ngành, không ghi cả 874 nút). AI soạn và ghi lại, không tự duyệt (Hiến pháp N3, N9).
- **Ngày:** 2026-11-04. **Số:** 0167 (0166 là số lớn nhất ở mọi nhánh lúc soạn).
- **Kế hoạch:** `docs/superpowers/plans/2026-11-04-bang-tham-chieu-ngon-ngu.md`.
- **Thay câu của:** không thay quyết định nào. ADR-0130 giữ nguyên: bảng từ vẫn là nơi ghi chữ đã loại, luật «chủ chọn tên, AI đưa 2–3 tên» vẫn dùng. `docs/SYSTEM-DESIGN.md` §15 là tài liệu mô tả, thành chỗ trỏ về bảng mới.

## Bối cảnh

Chủ dự án, nguyên văn: *«tạo và cố định 1 bảng tham chiếu ngôn ngữ chuẩn, cả từ chuyên ngành cũng như các nút lệnh, giải thích, các khái niệm để toàn hệ thống nhìn vào đó, và AI khi viết, đọc , sửa giao diện không bị nhầm lẫn hoặc suy diễn (Nguyen tắc sự thật duy nhất); giống như lấy giá từ 1 nguồn, lấy từ vựng từ 1 nguồn, có giảng hoặc chú thích ngữ nghĩa»*.

Rà soát nút bấm 4/11 thấy một lệnh mang ba tên, một tên chỉ nhiều việc, và AI chép lại chữ cũ từ các quyết định cũ. Bảng từ chỉ nói chữ nào cấm, chưa nói chữ nào nghĩa gì.

## Quyết định

1. **Một bảng trong mã, cạnh bảng từ.** Ba phần: khái niệm (có giải nghĩa), việc quan trọng (tên nút, việc thật sự làm, nơi đặt nút), chữ dùng chung. Giao diện không nạp bảng, nên không trang nào nặng thêm. Bản đọc cho người do máy sinh.
2. **Máy so từng nút với bảng, không viết lại 874 nút để đọc chữ từ bảng.** Chữ lệch là `npm test` đỏ, nên không nhập được vào bản chính. Điều kiện đỏ và tiêu chí nghiệm thu giữ nguyên như đặc tả.
3. **Thêm hay đổi tên chỉ khi chủ đã chọn.** Nút mới chưa có tên chốt thì khai dòng *chờ chọn* để không chặn việc; danh sách chờ được trình chủ ở lần kế tiếp.
4. **Tệp bảng vào danh sách hỏi quyền** như `docs/adr/`: sửa bằng công cụ thì chủ được hỏi, sửa bằng dòng lệnh thì bị chặn. Máy không biết chủ có chọn thật hay không, nên phần này vẫn dựa vào kỷ luật.
5. **Điều Hiến chương mới, phần riêng Tour Đảo:** ***5.27 Mỗi khái niệm một tên, mỗi tên một nghĩa, tra từ một nguồn.*** Điều này ghi vào `docs/ARCHITECTURE.md` trong cùng lần lưu với dòng thi hành của nó, sau khi đã quan sát máy canh chặn thật, để không có luật nào đứng trước hàng rào của nó (Hiến pháp P16). Có tốt thì đề nghị đưa lên kho luật gốc sau.

## Giới hạn phải nói thẳng

Máy kiểm tên có nhất quán, không kiểm tên có đúng sự thật. Cột «thật sự làm gì» dựa vào người đọc mã. Lời AI trả lời chủ trong trò chuyện thì máy không canh được.

## Hệ quả

- Bước đầu chỉ dựng bảng và máy canh, không đổi thêm tên nào, không đổi mã nội bộ, không migration, không đụng `playbook/` và kho luật gốc.
- Chủ chỉ đọc phần giải nghĩa khái niệm và danh sách chỗ lệch, trình một lần; 298 việc thì không phải đọc.
- Các tên còn «chưa rõ» trình theo lô ở đợt 2. Trang giải nghĩa cho nhân viên và Trợ lý Mai đọc bảng để sau.
