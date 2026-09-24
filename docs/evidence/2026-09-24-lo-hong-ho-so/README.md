# Bằng chứng 2026-09-24 — lỗ hổng sửa hồ sơ nhân viên và lỗ tiềm ẩn khi thi công ADR-0017

- **Bản kiểm:** `main` @ `45e0365` (worktree `hang-rao-quyen`).
- **Cách chạy:** CSDL SQLite trong bộ nhớ qua `tests/audit/harness.mjs` (không mạng, không đụng D1 local/remote). Từ gốc repo:

```bash
# (1) mã hiện tại
node docs/evidence/2026-09-24-lo-hong-ho-so/kich-ban/lo-hong.mjs
# (2) bản sao tạm chỉ đổi ĐÚNG MỘT Ô: order.view của FIELD none → any (điều ADR-0017 điều 43 yêu cầu qua isOffice)
E=/tmp/tourdao-exp && rm -rf "$E" && mkdir -p "$E" && cp -R src migrations "$E"/ \
  && sed -i '' 's|"order.view": row("any", "any", "any", "none", "own", "any")|"order.view": row("any", "any", "any", "any", "own", "any")|' "$E/src/shared/permissions.ts" \
  && AUDIT_ROOT="$E" node docs/evidence/2026-09-24-lo-hong-ho-so/kich-ban/lo-hong.mjs
```

## Kết quả đã quan sát (2026-09-24)

| Ca | Mã hiện tại (main) | Bản sao: FIELD có `order.view = any` |
|---|---|---|
| H2 SALES thêm SĐT vào hồ sơ ADMIN (`POST /api/parties/pty-<admin>/contacts`) | **201** — đã thêm | 201 |
| H3a FIELD xem hồ sơ ADMIN (`GET /api/parties/pty-<admin>`) | 403 (chặn ở cổng office) | **200** |
| H3b FIELD đổi tên ADMIN (`PUT /api/parties/pty-<admin>`) | không tới được | **200** — nhãn tài khoản ADMIN thành "HDV Mạo Danh" |
| H3c FIELD thêm SĐT vào hồ sơ ADMIN | không tới được | **201** |
| H7 SALES B ngưng hồ sơ KHÁCH đang là người đặt của đồng nghiệp A | 200 | 200 |
| H7 A sửa đơn nháp của chính mình sau đó | **400** "Hồ sơ khách không còn dùng được, hãy chọn lại." | 400 |
| H7 nhật ký ghi gì khi B ngưng hồ sơ | `party_updated` / "cá nhân" (không nói việc ngưng) | như trên |

Kết luận: (1) lỗ F-01 còn nguyên trên `main` và rộng hơn kiểm toán 22/9 ghi (thêm liên hệ); (2) ADR-0017 nói "chỉ mở quyền XEM" (điều 4) nhưng thi công bằng cách cho FIELD qua `isOffice` sẽ mở cả ghi Hồ sơ — vì các route Hồ sơ không hỏi bảng quyền; (3) cờ "ngưng" của hồ sơ khách lan sang đơn của người khác mà nhật ký không ghi rõ.

Các ca R3c (H2) và R3d (H7) được đưa vào `tests/audit/redteam.test.mjs` theo khuôn FINDING của tệp đó; H3 chỉ tái hiện được bằng bản sao đổi ô (kịch bản ở đây).

## Kiểm trên dữ liệu thật (production, 2026-09-24, chủ dự án tự chạy `kich-ban/truy-van-production-chi-doc.sql` dạng `--command`)

| Câu | Kết quả | Nhận định của chủ dự án |
|---|---|---|
| (A) thao tác trên hồ sơ có tài khoản do người không giữ ADMIN/SUPER_ADMIN lúc đó | **có dòng** (AI không thấy nội dung) | "Phản ánh đúng thực tế, admin đã sửa thông tin người dùng" → không sửa dữ liệu. GĐ1 đối chiếu một dòng với lịch sử `stf_permission` của người làm để xác nhận câu truy vấn (quyền cấp sau lần sửa, hay tài khoản khác). |
| (B) tài khoản đang hoạt động mà hồ sơ đã ngưng | **0 dòng** | Bất biến một chiều đang đúng; GĐ1 thêm vào `audit-invariants` mức `fail`. |

Bẫy khi chạy: `--file` với `--remote` đi cổng `/import`, bị "Authentication error [code: 10000]" với đăng nhập OAuth — dùng `--command` từng câu (xem đầu tệp SQL).
