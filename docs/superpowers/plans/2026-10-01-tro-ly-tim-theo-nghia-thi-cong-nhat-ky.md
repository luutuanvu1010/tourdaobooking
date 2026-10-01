# Nhật ký thi công — Trợ lý Hỗ trợ tìm theo nghĩa (ADR-0082, lượt 2)

- **Kế hoạch:** `docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong.md`. **Nhánh:** `tro-ly-tim-theo-nghia`. **Mốc:** origin/main `c62ffc6d` (production 1.54).
- **Lời duyệt (nguyên văn, 2026-10-01):** ADR-0082 + đặc tả — chủ "duyệt, lập kế hoạch đi"; thi công — chủ "đồng ý, bắt đầu thi công đi" (cách "làm từng phần", subagent-driven).
- **Hộp hỏi gom 2026-10-01:** "OpenAI"; "Trộn cả hai"; "Không, đặt sẵn".

## Tra cứu OpenAI (Task 1)

Ngày tra: 2026-10-01 (người thi công mở lại bằng WebFetch; khớp số kỳ vọng).
- `https://developers.openai.com/api/docs/models/text-embedding-3-small`: giá 0,02 USD / 1 triệu token (không phân biệt batch) ⇒ `GIA_NHUNG` = 20.000 micro-USD.
- `https://developers.openai.com/api/reference/resources/embeddings/methods/create`: mảng `input` ≤ 2048 phần tử; ≤ 8192 token mỗi đầu vào; ≤ 300.000 token tổng mỗi yêu cầu; không nhận chuỗi rỗng; `dimensions` chỉ có ở `text-embedding-3` trở lên; `encoding_format` `float` | `base64`; phản hồi `data[].index` + `embedding`, `usage.prompt_tokens`.

## Đột biến hàng rào (sửa cố ý → đỏ → hoàn nguyên → xanh)

(điền theo từng task)

## Kiểm

(điền ở Task 9)
- Đổi số ADR 0076 → 0082 ngày 2026-10-01 (main đã dùng 0076–0081); nội dung đã duyệt không đổi.
