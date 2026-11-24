# src/modules/auth/CLAUDE.md — bẫy đăng nhập

> Chỉ thêm ràng buộc cho vùng này, không nới `CLAUDE.md` gốc. Cắt nguyên văn từ `CLAUDE.md` §10 (ADR-0160).

- Turnstile ở đăng nhập: bật khi có `TURNSTILE_SECRET_KEY`, **tắt** khi vắng; kiểm TRƯỚC bộ chống dò PIN; 403 vẫn có một dòng log (`turnstile_failed`, chỉ mã lý do). Khi deploy: khoá site (`vars`) đi cùng mã, `wrangler secret put TURNSTILE_SECRET_KEY` đặt **SAU** khi nhân viên đã mở app một lần (service worker cache `login.js` cũ). `npm run types` khi thiếu `.dev.vars` làm mất `SESSION_SECRET` khỏi `Env`. Chi tiết: `docs/CHANGE-GUIDE.md` công thức l.
- Face ID (passkey, ADR-0016): `PASSKEY_RP_ID` phải **đúng** `booking.tourdao.vn` (không phải domain phụ, không có `https://`) — production đọc từ `vars` của `wrangler.jsonc`, **không** phải bí mật. Local/thử LAN phải ghi đè bằng giá trị `localhost`/IP nội bộ trong `.dev.vars` (mẫu `.dev.vars.example`); thiếu ghi đè thì nút Face ID hiện nhưng luôn gọi thất bại (rpId không khớp origin đang mở) — dễ nhầm là lỗi mã. Chi tiết: `docs/CHANGE-GUIDE.md` công thức r.
