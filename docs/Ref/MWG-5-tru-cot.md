# Năm trụ cột triết lý MWG (bản chụp trong kho)

> **Hồ sơ có ngày:** chụp 2026-11-03 từ `AI-Handbook/DNA-nen-tang-MWG.md` (báo cáo lập 27/08/2026), tệp đó nằm ngoài kho. Chép nguyên văn phần được nêu để phiên làm việc và người tiếp quản đọc được ngay trong kho; riêng tiêu đề «Giới hạn của nguồn» là nhãn của người chụp, gom các gạch ở Phần V. Hai nguyên tắc là của chính báo cáo («của toàn hệ thống»), không phải thực hành của MWG. Nguồn đổi thì chụp bản mới, không sửa bản này. Cách dùng: `docs/Ref/tieu-chi-doi-chieu.md`.

## T1 · Nền tảng là doanh nghiệp — giao diện chỉ là cánh cửa

Giá trị không nằm ở website, cửa hàng hay app; chúng chỉ là các "ống kính" nhìn vào cùng một hệ thần kinh trung ương. Đầu tư lớn nhất phải rót vào năng lực lõi vô hình: dữ liệu, quy trình, phần mềm khớp nghiệp vụ — thứ đối thủ không nhìn thấy và không mua được.

## T2 · Một sự thật — đích danh từng thực thể

Mọi thực thể nghiệp vụ quan trọng có định danh và lịch sử riêng; mọi con số quy về một nơi duy nhất. Dữ liệu là hạ tầng, không phải sản phẩm phụ của ứng dụng. Lãnh đạo ra quyết định trên số liệu hệ thống đẩy về hằng ngày, không trên báo cáo tay.

## T3 · Kiểm soát bằng thiết kế, không bằng lòng tin

Quy tắc nghiệp vụ sống trong hệ thống, không trong trí nhớ hay thiện chí của con người. Hệ thống chặn tiêu cực ngay tại nguồn thay vì phát hiện sau. Một thay đổi hợp lệ tự lan tỏa khắp tổ chức — nhanh và không thể làm sai lệch giữa đường.

## T4 · Chuẩn hóa trước — tự động hóa sau — tiến hóa từng bước

Không tự động hóa sự hỗn loạn. Quy trình phải được chuẩn hóa thành văn bản trước, phần mềm hóa sau, và hệ thống lớn lên từng phân hệ theo nhu cầu thật — không big-bang. Build khi nghiệp vụ là đặc thù cạnh tranh; buy khi là commodity.

## T5 · Chủ sở hữu rõ ràng — nền tảng tách khỏi sản phẩm

Mỗi mảng nghiệp vụ có ranh giới và người chịu trách nhiệm đích danh. Năng lực dùng chung (định danh, phân quyền, văn phòng điện tử) xây một lần, mọi mảng tái dùng — đó là đòn bẩy cho phép thêm ngành hàng mới mà không xây lại nền.

## Hai nguyên tắc bất di bất dịch của toàn hệ thống

**AI không được tự viết → tự review → tự phê duyệt → tự deploy.**

**Con người giữ độc quyền mọi quyết định chạm đến tiền, pháp lý và khách hàng thật.**

## Những gì tuyệt đối không sao chép

Kiến trúc của MWG là **hệ quả của quy mô** 60.000 người và hàng nghìn cửa hàng — không phải nguyên nhân thành công. Kỷ luật enterprise ≠ độ phức tạp enterprise:

| MWG dùng (đúng với quy mô họ) | Bạn dùng (cùng nguyên lý, không cùng chi phí) |
|---|---|
| Microservices phân tán, nhiều team | **Modular monolith**: ranh giới domain rõ trong một deploy duy nhất |
| Hạ tầng big-data (Hadoop/Kafka cluster) | SQL + queue nhẹ + báo cáo đơn giản; nâng cấp khi có dữ liệu thật |
| Kubernetes, đội vận hành hạ tầng riêng | Serverless/edge managed — không tự vận hành hạ tầng |
| Tổ chức nhiều tầng, hàng chục team IT | 1 người + AI workforce có ranh giới trách nhiệm và quality gate |

**Hàm ý trực tiếp cho doanh nghiệp của bạn:** phần đáng tự xây là domain lõi (nghiệp vụ kế toán, nghiệp vụ tour) — nơi độ khớp tạo lợi thế; phần nên mua là commodity (hóa đơn điện tử, cổng thanh toán, email) — nơi độ khớp không ai trả tiền cho.

## Giới hạn của nguồn

- **Không thờ phụng ai.** Không thờ MWG (kiến trúc của họ hợp quy mô của họ), không thờ stack (React/Astro/Cloudflare/Claude Code đều thay được ở tầng kiến trúc). Giữ domain sạch chính là giữ quyền rời đi.
- **Phần lớn kiến trúc nội bộ MWG là UNKNOWN.** Java/Spring Boot có nguồn từ tin tuyển dụng; Kafka, DDD, chi tiết microservices không có nguồn xác nhận. Báo cáo này chỉ dùng nguyên lý đã kiểm chứng, không suy đoán thành dữ kiện.
- **Nguồn phỏng vấn ERP phản ánh bối cảnh ~2011–2012** (~200 cửa hàng). Dùng để rút nguyên lý, không dùng làm số liệu hiện thời.
- **Bus factor = 1 là rủi ro sống còn.** Mọi tư duy, lý do kiến trúc (ADR), quy tắc nghiệp vụ phải nằm trong Git — để một người khác, hoặc AI, tiếp quản được từ artifact chứ không từ trí nhớ của bạn.
- **Pháp lý Việt Nam là ràng buộc chuyển động.** NĐ 123/2020 → NĐ 70/2025 (hiệu lực 01/06/2025, sửa 40/61 điều) → TT 32/2025; chính sách du lịch, xuất nhập cảnh cũng đổi theo mùa. Kiểm tra hiệu lực tại thời điểm triển khai — và đây chính là lý do domain phải độc lập để hấp thụ thay đổi.
- **AI không tự nâng chất lượng.** DORA 2024: tác động của AI lên độ tin cậy là "mixed". Chất lượng đến từ quality gate được cưỡng chế bằng hooks + CI + phê duyệt của con người.
