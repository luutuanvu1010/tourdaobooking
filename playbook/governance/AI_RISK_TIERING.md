# AI RISK TIERING & HUMAN OVERSIGHT

> Phân loại mỗi use case AI theo mức ảnh hưởng, rồi gán mức giám sát con người tương ứng. Đây là phần MANAGE chi tiết của AI Governance.

## Phân tier
| Tier | Mô tả | Ví dụ |
|------|-------|-------|
| T0 | Nội bộ, không xuất bản | brainstorm, nháp, gợi ý code chưa merge |
| T1 | Công khai, không nhạy cảm | blog mô tả, caption mạng xã hội |
| T2 | Ảnh hưởng quyết định người dùng | giá, lịch trình, an toàn, chatbot tư vấn |
| T3 | Không đảo ngược / pháp lý / tài chính | điều khoản, cam kết, giao dịch |

## Ma trận giám sát con người
| Tier | Mức giám sát bắt buộc |
|------|----------------------|
| T0 | AI tự do; người xem khi cần |
| T1 | Người duyệt trước khi xuất bản |
| T2 | Người duyệt bắt buộc + nguồn kiểm chứng (last_verified) + có fallback an toàn |
| T3 | AI KHÔNG được tự thực hiện; chỉ đề xuất, con người ra quyết định cuối |

## Khi nào cần thêm
- Data lineage (ghi nguồn dữ liệu cho output AI) bắt buộc từ T2 trở lên.
- Evaluation framework (cách đo chất lượng output) chỉ dựng khi một use case AI lên T2/T3 và chạy thường xuyên. Trước đó là nợ thừa.
