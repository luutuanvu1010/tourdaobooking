# Đề xuất sửa bảng kịch bản Chrome ở `web/CLAUDE.md` (chờ chủ duyệt)

`web/CLAUDE.md` là tệp luật nên AI không tự sửa. Xin thay dòng `web/help.ts, web/help-seen.ts, public/help.html…` bằng:

| Sửa | Chạy |
|---|---|
| Hỗ trợ › Hướng dẫn và Nhật ký thay đổi: `web/huong-dan.ts`, `public/huong-dan.html`, `web/help.ts`, `web/help-seen.ts`, `public/help.html`, `src/shared/huong-dan-bai*.ts`, `src/shared/huong-dan-xep.ts`, `src/shared/changelog.ts`, khối `.hd-*`, `.nk-*` của `public/app.css`, chấm đỏ ở `web/shell.ts`/`web/account.ts` | `huong-dan-smoke.mjs` ở `docs/evidence/2026-11-03-huong-dan/kich-ban/` (8 bước, 390 + 1040, cần `AXE_JS`, không cần mạng ngoài; thay `help-smoke.mjs`) |

Dòng khung chung đợt 0 cũng bỏ `help-smoke.mjs` khỏi danh sách bản chép.
