# Xoá một lần dữ liệu thử (ADR-0158)

Chỉ chủ dự án chạy, sau khi ADR-0158 được duyệt. Đứng ở thư mục có nhánh `claude/don-du-lieu-thu` (thư mục này không có ở bản chính). Đừng đặt `CI=1`, vì wrangler sẽ tự trả lời «yes».

1. Đếm bằng lệnh AI đưa, rồi AI đặt trần vào tệp xoá bằng `sinh-tep-xoa.mjs` theo đúng số đếm được. Trước khi sinh, AI kiểm bản chính có migration mới sau `0134` không; có thì cập nhật nhánh, đổi mốc `0135` trong tệp sinh và bài kiểm, rồi mới sinh. Từ lúc này đừng tạo đơn, mức hoa hồng hay cấp.
2. Lấy điểm khôi phục, ghi lại mã in ra:
   `npx wrangler d1 time-travel info tourdao-sales-db`
3. Chạy xoá, kiểm kỹ tên tệp ở câu hỏi của wrangler trước khi trả lời:
   `npx wrangler d1 migrations apply tourdao-sales-db --remote --config scripts/don-du-lieu-thu/wrangler.jsonc`
4. Kiểm dữ liệu:
   `node scripts/audit-invariants.mjs --db remote`

**Lỗi `CHECK constraint failed: so <= tran`:** chốt chặn đã dừng trước câu xoá đầu tiên, nghĩa là có dữ liệu mới sau lần đếm. **Không khôi phục**, vì khôi phục sẽ mất chính dữ liệu đó. Đếm lại và xem dữ liệu mới là gì.

**Lỗi khác ở bước 3:** không chạy lại; đưa cả cơ sở dữ liệu về điểm ở bước 2:
`npx wrangler d1 time-travel restore tourdao-sales-db --bookmark=<mã ở bước 2>`

Thử trên dữ liệu mẫu: `CI=1 E2E_GIU_D1=1 npm run test:e2e -- <kịch bản>` giữ lại thư mục `tourdao-e2e-*` trong thư mục tạm; dùng tệp xoá có trần lớn, chạy `wrangler d1 migrations apply --local --persist-to <thư mục> --config scripts/don-du-lieu-thu/wrangler.jsonc`, rồi `audit-invariants --db local --persist-to <thư mục>`.
