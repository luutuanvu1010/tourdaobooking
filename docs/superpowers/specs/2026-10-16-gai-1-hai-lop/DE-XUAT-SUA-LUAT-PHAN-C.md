# Đề xuất sửa tệp luật — Phần C (mã đăng nhập qua email, ADR-0074)

Ngày 2026-10-16. Người soạn: người thi công Task 4 của kế hoạch `docs/superpowers/plans/2026-10-01-dang-nhap-c-hai-lop-email.md`. Đây chỉ là **đề xuất**: AI không tự sửa `web/CLAUDE.md` (CLAUDE.md §3, Hiến pháp N9). Chủ dự án duyệt thì chép nguyên dòng dưới vào bảng.

## 1. `web/CLAUDE.md` — bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào"

Bảng hiện chưa có dòng nào cho bảo mật hai lớp (kịch bản Phần B `hai-lop.mjs` cũng chưa có dòng). Thêm một dòng, ở cuối bảng:

```
| Bảo mật hai lớp (ADR-0074): `web/hai-lop-ui.ts`, khối "Bảo mật đăng nhập" của `web/account.ts`, bước "Nhập mã xác thực" của `web/login.ts`, nhãn "Hai lớp" + nút "Tắt bảo mật hai lớp" của `web/staff.ts`, dải nhắc ở `web/shell.ts`, `src/shared/hai-lop-hien-thi.ts` | `hai-lop.mjs` ở `docs/evidence/2026-10-01-dang-nhap-b/kich-ban/` (ứng dụng xác thực) + `hai-lop-email.mjs` ở `docs/evidence/2026-10-01-dang-nhap-c/kich-ban/` (mã qua email: 14 bước, 390 + 1040 + 320, không cần mạng ngoài; tự dựng máy chủ THỨ HAI không có người gửi để thấy 502 thật; mã email lấy bằng cách gieo dòng băm vào D1 tạm). Cả hai cần `AXE_JS` (axe 4.13) và tự sinh `MFA_ENCRYPTION_KEY` cho máy tạm. Đụng phần đăng nhập thì chạy thêm `v1-dang-nhap.mjs`; đụng bố cục trang Tôi thì thêm `dot-c-smoke.mjs` |
```

Lý do: hai kịch bản này là nơi duy nhất thấy các đường giao diện của hai lớp chạy thật (bật, đổi, gỡ, 409, 429, 502, người chỉ có email). Không có dòng trong bảng thì người sửa `web/account.ts` / `web/login.ts` dễ quên chạy lại.

## 2. Không đề xuất đổi gì khác

- `CLAUDE.md` gốc: mục §10 "Bẫy" có thể thêm một dòng trỏ tới `docs/CHANGE-GUIDE.md` z18b (dòng EMAIL lệch của vai lớn phải lọc qua `allowedFactors` ở mọi chỗ đọc), nhưng tài liệu mô tả đã đủ — chỉ thêm nếu chủ muốn.
- `src/CLAUDE.md`, `.claude/`, `playbook/`, ADR: không cần sửa.
