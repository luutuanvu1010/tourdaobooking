# RACI — Ma trận vai trò (bản canonical)

> Đây là nguồn sự thật duy nhất cho phân công thực hiện công việc: bảng này trả lời "ai làm gì".
> Quyền quyết định ("ai quyết gì") sống ở GOVERNANCE.md mục 3, không lặp ở đây. Hai bảng hai chức năng.
> R = làm, A = chịu trách nhiệm cuối (DRI), C = được hỏi ý, I = được thông báo.

| Hoạt động | Chủ dự án | Orchestrator (Cowork) | Design | Code | QA |
|-----------|-----------|------------------------|--------|------|----|
| Định vị, chiến lược | A/R | C | I | I | I |
| Mô hình nội dung, kiến trúc | A | R | I | C | I |
| Chốt stack (ADR) | A | R | I | C | I |
| Luật, schema, binding | A | R | C | C | C |
| Thiết kế bề mặt | A | C | R | I | I |
| Thực thi, đưa ra sản phẩm | A | C | I | R | I |
| Kiểm soát chất lượng (QA1, QA2) | A | C | C | C | R |
| Xử lý sự cố, postmortem | A | R | C | C | C |
| Sửa hiến pháp | A/R | C | I | I | I |

## DRI
Mọi hàng phải có đúng một DRI (người mang vai A). Quy mô một người khiến DRI hầu hết là chủ dự án; điều quan trọng là không việc nào mồ côi trách nhiệm. Mỗi hệ AI vận hành (chatbot, agent sinh nội dung, agent code, agent QA) cũng phải có một DRI là con người.
