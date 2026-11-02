# Xoá một lần dữ liệu thử (ADR-0158)

Chỉ chủ dự án chạy, sau khi ADR-0158 được duyệt. Đứng ở gốc kho.

1. Đếm, rồi đặt trần vào tệp xoá bằng `sinh-tep-xoa.mjs` với đúng số đếm được. Từ lúc này đừng tạo đơn, mức hoa hồng hay cấp.
2. Lấy điểm khôi phục, ghi lại mã in ra:
   `npx wrangler d1 time-travel info tourdao-sales-db`
3. Chạy xoá, kiểm kỹ tên tệp ở câu hỏi của wrangler trước khi trả lời:
   `npx wrangler d1 migrations apply tourdao-sales-db --remote --config scripts/don-du-lieu-thu/wrangler.jsonc`
4. Kiểm dữ liệu:
   `node scripts/audit-invariants.mjs --db remote`

Có lỗi giữa chừng thì không chạy lại; đưa cả cơ sở dữ liệu về điểm ở bước 2:
`npx wrangler d1 time-travel restore tourdao-sales-db --bookmark=<mã ở bước 2>`

Thử trên dữ liệu mẫu: `CI=1 E2E_GIU_D1=1 npm run test:e2e -- <kịch bản>` giữ lại thư mục `tourdao-e2e-*` trong thư mục tạm; dùng tệp xoá có trần lớn, chạy `wrangler d1 migrations apply --local --persist-to <thư mục> --config scripts/don-du-lieu-thu/wrangler.jsonc`, rồi `audit-invariants --db local --persist-to <thư mục>`.
