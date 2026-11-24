---
paths:
  - "src/modules/auth/**"
  - "src/modules/accounts/**"
  - "src/modules/staff/**"
  - "src/modules/maintenance/**"
  - "web/login.ts"
  - "web/sessions.ts"
  - ".dev.vars.example"
---

<!-- BẢN NHÁP (đề xuất 2026-11-03-rut-gon-claude-md, bước 2): chữ cắt nguyên văn từ mục 10 của CLAUDE.md; chưa có hiệu lực. -->

- Turnstile ở đăng nhập: bật khi có `TURNSTILE_SECRET_KEY`, **tắt** khi vắng; kiểm TRƯỚC bộ chống dò PIN; 403 vẫn có một dòng log (`turnstile_failed`, chỉ mã lý do). Khi deploy: khoá site (`vars`) đi cùng mã, `wrangler secret put TURNSTILE_SECRET_KEY` đặt **SAU** khi nhân viên đã mở app một lần (service worker cache `login.js` cũ). `npm run types` khi thiếu `.dev.vars` làm mất `SESSION_SECRET` khỏi `Env`. Chi tiết: `docs/CHANGE-GUIDE.md` công thức l.
- Face ID (passkey, ADR-0016): `PASSKEY_RP_ID` phải **đúng** `booking.tourdao.vn` (không phải domain phụ, không có `https://`) — production đọc từ `vars` của `wrangler.jsonc`, **không** phải bí mật. Local/thử LAN phải ghi đè bằng giá trị `localhost`/IP nội bộ trong `.dev.vars` (mẫu `.dev.vars.example`); thiếu ghi đè thì nút Face ID hiện nhưng luôn gọi thất bại (rpId không khớp origin đang mở) — dễ nhầm là lỗi mã. Chi tiết: `docs/CHANGE-GUIDE.md` công thức r.
- Chế độ bảo trì (`mnt_setting`): **chỉ chủ dùng được**; bật thì **máy chủ** chặn mọi SĐT ngoài `allowed_phones` (kể cả phiên đang mở); chỉ bật khi chủ quyết, sau khi cột "Đăng nhập gần nhất" cho thấy mọi người đã đăng nhập bằng bản mới; chủ bị khoá thì tắt bằng SQL ở `docs/HANDOFF-N1.md`; `last_login_at` ghi ở đăng nhập PIN VÀ đăng nhập Face ID (công thức q, r).
- Cột chết `staff.role` (hằng `'sales'`) và `staff.full_name` (hằng `''`): đọc quyền/tên từ `stf_permission`/hồ sơ.
