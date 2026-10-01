# Nhật ký thi công — Trợ lý Hỗ trợ thông minh hơn (ADR-0073, lượt 1)

- **Kế hoạch:** `docs/superpowers/plans/2026-10-01-tro-ly-thong-minh-thi-cong.md`. **Nhánh:** `tro-ly-thong-minh`. **Mốc:** main `fd77987a` (1.51).
- **Lời duyệt (nguyên văn, 2026-10-01):** chủ dự án "duyệt, lập kế hoạch đi" sau khi AI trình ADR-0073 + đặc tả; duyệt gồm (a) bỏ hàng rào "luật lõi luôn đứng trước phần tuỳ chỉnh" (`docs/SO-HANG-RAO.md` dòng 285 + ca `src/shared/tro-ly-bang-dieu-khien.test.ts:93`, `src/modules/tro-ly/bang-dieu-khien-route.test.ts:153`), (b) cập nhật bảng thi hành Hiến chương 5.15 trong `docs/ARCHITECTURE.md` từ "dựa vào kỷ luật" sang có cơ chế máy (lọc số tiền). Thi công: chủ "đồng ý, bắt đầu thi công đi" (cách "làm từng phần", subagent-driven).
- **Ruling bề mặt của người lập kế hoạch:** R1–R7 ở đầu kế hoạch.
- **Ghi chú 2026-10-01:** `CLAUDE.md` của main đã có thêm vai `HR` (ADR-0071) và luật trang ghép phải nêu cả chỗ giao diện ẩn/hiện ⇒ đã bổ sung §8 đặc tả; trước khi `day-len` phải gộp main mới.

## Tra cứu OpenAI (Task 2 bước 1)

Ngày tra: 2026-10-01 (WebFetch, trang chính thức OpenAI).
- Giá USD / 1 triệu token (vào / vào đã đệm / ra), ĐÃ XÁC NHẬN trên trang:
  - `https://developers.openai.com/api/docs/models/gpt-5-nano`: 0,05 / 0,005 / 0,40.
  - `https://developers.openai.com/api/docs/models/gpt-5-mini`: 0,25 / 0,025 / 2.
  - `https://developers.openai.com/api/docs/models/gpt-5`: 1,25 / 0,125 / 10.
  - Ba trang đều ghi mẫu đã/ sắp bị mẫu đời sau thay thế (gpt-5 "superseded"); giá vẫn hiện hành. Chưa có dấu hiệu bị ngừng.
- Mức suy nghĩ: ba trang mẫu KHÔNG liệt kê. Cookbook `https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_new_params_and_tools` chỉ nêu rõ `minimal` và "mặc định medium", không liệt kê đủ. Theo phán quyết D1 dùng `minimal / low / medium / high` cho cả ba mẫu (CHƯA kiểm từng mẫu bằng trang chính thức; Task 7 "Thử key" nên bắt lỗi 400 nếu mức bị từ chối).
- `text.verbosity`: cookbook nêu giá trị `low`, `medium` (mặc định), `high` — đã kiểm.
- `input` nhiều lượt cùng `instructions`: chưa có câu nói rõ trên trang đã mở ⇒ CHƯA KIỂM (báo điều phối trước Task 7).

## Đột biến hàng rào (sửa cố ý → đỏ → hoàn nguyên → xanh)

(điền theo từng task: lệnh, đột biến, thông báo đỏ nguyên văn, xác nhận hoàn nguyên bằng `git diff --stat`)

## Kiểm

(điền ở Task 18)
