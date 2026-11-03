<!-- BẢN NHÁP: các gạch SẼ Ở LẠI trong CLAUDE.md gốc sau khi rút (mục 10); cắt nguyên văn. -->

- `public/js/` và `public/sw.js` không có trong git: quên `npm run build:web` thì trang cũ/hỏng (`wrangler dev`/`deploy` tự build).
- E2E cần mạng; nhiều `wrangler dev` mồ côi gây "database is locked" — tắt trước khi chạy.
- Kịch bản Chrome: các trang dùng CHUNG kho cookie — trang của tài khoản nào phải mở SAU CÙNG.
- Hiện trạng production, số test, id Worker **không** ghi ở đây (đổi liên tục): xem `docs/HANDOFF-N1.md` và kiểm bằng lệnh.
