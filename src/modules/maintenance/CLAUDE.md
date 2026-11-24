# src/modules/maintenance/CLAUDE.md — bẫy chế độ bảo trì

> Chỉ thêm ràng buộc cho vùng này, không nới `CLAUDE.md` gốc. Cắt nguyên văn từ `CLAUDE.md` §10 (ADR-0160).

- Chế độ bảo trì (`mnt_setting`): **chỉ chủ dùng được**; bật thì **máy chủ** chặn mọi SĐT ngoài `allowed_phones` (kể cả phiên đang mở); chỉ bật khi chủ quyết, sau khi cột "Đăng nhập gần nhất" cho thấy mọi người đã đăng nhập bằng bản mới; chủ bị khoá thì tắt bằng SQL ở `docs/HANDOFF-N1.md`; `last_login_at` ghi ở đăng nhập PIN VÀ đăng nhập Face ID (công thức q, r).
