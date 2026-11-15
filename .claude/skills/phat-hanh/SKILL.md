---
name: phat-hanh
description: Chuẩn bị một lần nhập bản chính (npm run day-len) hoặc phát hành lên bản chạy thật (npm run trien-khai) cho tourdao-sales, rồi đưa chủ dự án đúng lệnh. Chỉ chủ gọi.
disable-model-invocation: true
---

# Chuẩn bị nhập bản chính và phát hành

AI KHÔNG chạy `day-len`, `trien-khai`, `git push`, `wrangler deploy` (CLAUDE.md §8; lớp chặn từ chối). AI làm hết phần chuẩn bị, kiểm, rồi đưa chủ nguyên lệnh MỘT lần. Quy trình đầy đủ: `docs/QUY-TRINH-PHAT-HANH.md`.

## Trước khi đưa lệnh `day-len`
1. `git fetch origin`; nếu nhánh đi sau `origin/main` thì `git merge origin/main` vào nhánh, sửa xung đột (số mục sổ, số ADR, số migration trùng thì cộng số kế tiếp).
2. Sẽ triển khai thì thêm mục nhật ký phiên bản ngay trong lượt này (`src/shared/changelog.ts`, bước A.0).
3. Chạy đủ `npm test` một lần ở máy (nền, ghi ra tệp) và `npm run typecheck`. Đỏ thì không đưa lệnh.
4. Đổi API hoặc migration thì chạy cả `npm run test:e2e`.
5. Việc lớn: đã có báo cáo người kiểm độc lập «Sẵn sàng trình chủ? Có».

## Lệnh đưa chủ (chạy ở THƯ MỤC GỐC, không phải bản làm việc riêng)
```bash
cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales && npm run day-len -- <tên-nhánh>
```
Báo trước cho chủ: lệnh chờ máy kiểm GitHub khoảng 10 phút; có thể đòi gõ lý do khi tệp điều khiển việc kiểm hoặc tệp luật đổi; cuối cùng hỏi `c/k`. Nói rõ «không cần triển khai» hoặc đưa thêm `npm run trien-khai` (cùng thư mục) — một lần, không nhắc lại.

## Trục trặc đã biết
- «phải đứng ở nhánh main»: chủ đang ở bản làm việc riêng — đưa lại lệnh có `cd` ở trên.
- «không tiến thẳng được»: bản chính vừa có lần nhập khác. Nhập `origin/main` vào nhánh rồi đưa lại lệnh.
- Phần e2e đỏ: gõ `r` chạy lại phần đỏ một lần. Đỏ lần hai cùng chỗ thì dừng (`d`), tìm lỗi thật, đừng chạy lại nữa.
- Lỗi Cloudflare 7403 ở lời gọi đầu của `trien-khai`: chạy lại là qua (`docs/QUY-TRINH-PHAT-HANH.md`, mục 7403). Đừng đoán «chưa đăng nhập».
- Sau `trien-khai`: ghi trạng thái vào đầu `docs/HANDOFF-N1.md` theo khối máy in ra; kiểm bằng `curl -s https://booking.tourdao.vn/api/auth/config` (chạy riêng, không kèm lệnh khác).
