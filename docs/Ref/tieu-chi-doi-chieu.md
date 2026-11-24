# Tiêu chí đối chiếu: Oracle, Kernel 18, MWG

> **Tài liệu sống, giữ trong một trang.** Quyết định: ADR-0160. `CLAUDE.md` §2 giữ bản rút; bảng đủ và mẫu viết ở đây. Nguồn: `docs/Ref/Oracle-crm-triet-ly-va-checklist.md` (Oracle 1–6 là sáu nguyên lý mục I), `docs/Ref/MWG-5-tru-cot.md` (T1–T5). Viết tắt: HC = Hiến chương `docs/ARCHITECTURE.md` Phần I.
>
> **Lời chủ dự án:** «tham chiếu đó cần được AI cân nhắc và coi như là điều kiện, tiêu chí để ra những lời khuyên hoặc phân tích».

## Vị trí

Đây là **tiêu chí để soi một đề xuất, không phải tầng luật mới**. Thứ tự vẫn theo Hiến pháp Điều 3.1. Khi lệch: Hiến pháp, Hiến chương đã duyệt, ADR đã duyệt thắng; lệch thật thì nêu cho chủ dự án quyết, không tự hoà giải. Tiêu chí đã trả lời được nguyên tắc vẫn không thay việc dừng và hỏi khi chạm dữ liệu, quyền, tiền, hợp đồng (Hiến pháp P8).

## Mẫu đoạn Đối chiếu

Mỗi ADR, đặc tả có một mục `## Đối chiếu`; lời khuyên có chọn lựa thì gói trong vài câu. Chỉ viết tiêu chí liên quan, không viết cho đủ. Không chạm gì thì một câu «không chạm».

- **Theo Oracle:** nên làm thế nào.
- **Theo MWG:** nên làm thế nào.
- **Theo Anthropic** (chỉ khi việc là cách làm với AI: `CLAUDE.md`, hook, trợ lý con): nên làm thế nào. Dữ kiện đã kiểm: `RANG_BUOC_NGOAI.md` mục 6.
- **Kernel 18:** chạm dòng nào của `docs/kernel-18.md`; tờ khai có phải sửa không.
- **Chọn:** cách nào, vì sao vừa đúng triết lý vừa hợp quy mô Tour Đảo; lệch tiêu chí nào thì nói rõ kèm điều luật.

## Bảng tiêu chí

| # | Câu phải trả lời | Từ đâu | Luật đang có |
|---|---|---|---|
| C1 | Màn hình, báo cáo chỉ là cửa nhìn vào sự thật, không phải nơi tạo ra sự thật, không tính tiền? | MWG T1 | HC 1.1, 1.4 |
| C2 | Đối tượng có đúng một nơi sinh ra (hồ sơ, trạng thái, tiền), hay đang có hai đường? | MWG T2 | HC 5.4; P6 |
| C3 | Một người hay tổ chức là một hồ sơ, vai đứng sau; không mỗi vai một bảng? | Oracle 1; MWG T2 | HC 2.1, 2.3; ADR-0001, ADR-0018 |
| C4 | Đổi trạng thái qua một lệnh có kiểm luật và quyền, một lô ghi; mọi kênh chỉ phát lệnh? | Oracle 2 | HC 1.2, K7, K8 |
| C5 | Luật phải luôn đúng nằm ở cơ sở dữ liệu lẫn máy chủ, máy chặn ngay tại nguồn, không chỉ ở giao diện? | Oracle 3; MWG T3 | HC 5.1; P21 |
| C6 | Quyền xét đủ ai × thao tác × phạm vi dữ liệu, ở máy chủ (đối tác chỉ thấy của mình)? | Oracle 4; MWG T5 | HC K4, 5.8; ADR-0019 |
| C7 | Điều hay đổi là dữ liệu có kiểu, có ngày hiệu lực, không sửa lõi? | Oracle 5 | HC 2.2, 5.2; ADR-0003 |
| C8 | Có dấu vết cùng lô: ai, làm gì, lúc nào, lý do khi luật đòi, trước→sau khi có? Số tiền truy ngược được về chứng từ? | Oracle checklist vết kiểm toán, liên kết hai chiều | HC 4.1, 4.2, 5.12 |
| C9 | AI hay tác vụ tự động có định danh riêng, đi qua cổng như người, không phải nguồn sự thật, không tự ra số tiền? | Oracle 6 | HC 5.11, 5.15 |
| C10 | AI có đang tự viết, tự kiểm, tự duyệt, tự triển khai? Quyết định chạm tiền, pháp lý, khách thật đã về tay chủ? | Báo cáo MWG Phần V, hai nguyên tắc của chính báo cáo, không phải thực hành của MWG | N3, N8, P7, P9 |
| C11 | Quy trình ngoài đời đã thống nhất bằng văn bản chưa? Chưa thì chưa viết mã. Có đang đi từng bước nhỏ, nền trước tính năng? | MWG T4 | HC 5.13; vế «quy trình trước» chưa phải luật |
| C12 | Lõi nghiệp vụ tự xây, thứ phổ thông thì mua? | MWG T4 | chưa phải luật |
| C13 | Mỗi bảng, mỗi năng lực dùng chung có một chủ; lý do nằm trong ADR, Git để người khác tiếp quản được? | MWG T5 | HC 5.3; P5, P9 |
| C14 | Có đơn giản nhất mà vẫn giữ kỷ luật không (~30 nhân viên, ~1000 đối tác, một người cùng AI)? Thêm thành phần hay thủ tục thì chặn được lỗi thật nào đã xảy ra? | MWG điều không sao chép; vế «lỗi thật» từ lời chủ 2026-10-05, MWG không nói | ADR-0014 về quy mô; vế «lỗi thật» chưa phải luật |
| C15 | Đề xuất chạm dòng nào của Kernel 18; làm tờ khai sai thì đã sửa tờ khai cùng lần lưu chưa? | Kernel 18 | ADR-0160 Đ3 (đề xuất, chưa duyệt); nền: `KERNEL-18.md` mục 4 ở kho luật gốc, dòng chỉ đường |

## Chỗ các nguồn lệch nhau đã biết

| Chuyện | Nguồn nói | Luật Tour Đảo | Xử lý |
|---|---|---|---|
| Trường mở rộng | Oracle 5 và checklist: Flexfields, thuộc tính JSON | HC 5.2 cấm trường tự do; ADR-0152 là lệch hẹp có chủ ý | HC thắng; muốn lệch phải có ADR |
| Lan truyền thay đổi | MWG T3 và nguyên lý gốc «event-driven propagation» | HC 4.1 không dựng event sourcing; HC 5.10 thông báo không kích hoạt tiền | HC thắng; lấy ý «không sai lệch giữa đường» |
| Phân quyền | Oracle 4 đòi phạm vi dữ liệu; MWG chỉ nêu phân quyền | HC K4 | Theo Oracle, vì có ~1000 đối tác chỉ được thấy của mình |
| Quy mô thủ tục | Oracle và MWG đều ở quy mô tập đoàn | Một người cùng AI | Lấy ý tưởng, không chép quy mô thủ tục |
| Cỡ `CLAUDE.md` | `playbook/FRAMEWORK.md` §4.6 đòi dưới 4 KB và nạp bằng dòng nhập; Anthropic: dòng nhập không giảm ngữ cảnh | ADR-0160 Đ6 ngoại lệ có hạn | Theo ngoại lệ tới hạn; chi tiết đưa sang tệp được trỏ tới |
