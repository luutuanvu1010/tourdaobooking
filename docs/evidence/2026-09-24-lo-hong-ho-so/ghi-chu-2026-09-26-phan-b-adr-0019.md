# Thí nghiệm B-11 sau phần B của ADR-0019 (2026-09-26)

- **Bản kiểm:** nhánh `gd2-cong-va-bang`, commit `6d8f2f4` (sau B1–B7b).
- **Kịch bản:** `kich-ban/lo-hong.mjs` (không sửa) trên CSDL SQLite trong bộ nhớ (`tests/audit/harness.mjs`; không mạng, không đụng D1).
- **Bản sao, không phải cây làm việc:** `git archive HEAD` ra thư mục tạm ngoài repo, liên kết `node_modules`, rồi chỉ đổi ĐÚNG MỘT ô trong bản sao (`src/shared/permissions.ts`): `order.view` của `FIELD` từ `none` thành `any` (điều ADR-0017 sẽ cần ở phần C). Không commit, không sửa gì trong worktree; thư mục tạm bỏ sau khi đọc kết quả.
- Cách chạy bản sao: `AUDIT_ROOT=<bản sao> node <bản sao>/docs/evidence/2026-09-24-lo-hong-ho-so/kich-ban/lo-hong.mjs`.

## Kết quả

| Ca | Mã hiện tại (đối chứng) | Bản sao: FIELD có `order.view = any` |
|---|---|---|
| H2 SALES thêm SĐT vào hồ sơ ADMIN | 403 ("Tài khoản này không được sửa hồ sơ này…") | 403 (giống) |
| H3a FIELD xem hồ sơ ADMIN (`GET /api/parties/pty-<admin>`) | 403 | **403** |
| H3b, H3c FIELD đổi tên / thêm SĐT vào hồ sơ ADMIN | "không tới được (bị chặn ở cổng)" | "không tới được (bị chặn ở cổng)" |
| H7 (ngoài phạm vi phần B) | 200 / 400 như cũ | như cũ |

**Điều khác so với lần đo sau GĐ1 (24/9):** khi đó, đổi `order.view` của FIELD thành `any` làm FIELD qua được cổng `office` và dừng ở `can(party.*)` trong thân handler (403 do thân xử lý). Nay cổng `office` là danh sách mã quyền viết thẳng (`OFFICE_GATE`, ADR-0019 B1), không suy ra từ `order.view` nữa: FIELD **không tới được** thân handler, bị chặn ngay ở cổng. Kịch bản gốc chỉ in mã trạng thái nên thêm một kịch bản phụ (chỉ nằm ở bản sao, không commit) in nguyên văn lời báo:

```
GET  /api/parties/pty-<admin>            → 403 {"error":{"code":"forbidden","message":"Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này."}}
GET  /api/parties                        → 403 (cùng lời báo)
PUT  /api/parties/pty-<admin>            → 403 (cùng lời báo)
POST /api/parties/pty-<admin>/contacts   → 403 (cùng lời báo)
POST /api/parties                        → 403 (cùng lời báo)
GET  /api/parties/meta                   → 403 (cùng lời báo)
```

Lời báo trên là lời của **cổng** `office` (`src/shared/router.ts`), không phải lời của thân handler (lời của thân là "Tài khoản này không được sửa hồ sơ này…"). Đạt tiêu chí B-11: hướng dẫn viên nhận 403 ở cổng tại `/api/parties*` kể cả khi ô `order.view` của họ bị đổi thành `any`.

## Chưa chạy / giới hạn

- Thí nghiệm chỉ tái hiện ở CSDL trong bộ nhớ, không phải e2e trên D1 local hay production.
- Việc FIELD thật sự vào cổng `orders` (phần C của kế hoạch) chưa làm; thí nghiệm này chỉ chứng minh cổng `office` không còn đi theo `order.view`.
