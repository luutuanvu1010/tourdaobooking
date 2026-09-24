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

## Sau GĐ1 (2026-09-24)

**Bản kiểm:** nhánh `va-lo-ho-so-gd1` (worktree `hang-rao-quyen`, sau Task 1–7 của `docs/superpowers/plans/2026-09-24-gd1-adr-0013-thi-cong-nhat-ky.md`, commit `e52ba31`).

**Cách chạy — hai lượt, cùng kịch bản `kich-ban/lo-hong.mjs`, không sửa cây làm việc thật:**

1. Mã hiện tại trên nhánh (không `AUDIT_ROOT`) — chạy thẳng từ gốc worktree:
   ```bash
   node docs/evidence/2026-09-24-lo-hong-ho-so/kich-ban/lo-hong.mjs
   ```
2. Bản sao đổi ĐÚNG MỘT Ô (`order.view` của FIELD: `none` → `any`, đúng điều ADR-0017 điều 4 sẽ cần) — lấy bằng `git archive` (không phải `cp -a`, tránh bẫy đã ghi ở bài học Đợt D) rồi sửa bản sao, KHÔNG commit, KHÔNG đụng cây thật:
   ```bash
   mkdir -p /tmp/l2-copy && git archive --format=tar -o /tmp/l2-copy.tar HEAD && tar -xf /tmp/l2-copy.tar -C /tmp/l2-copy
   ln -s "$PWD/node_modules" /tmp/l2-copy/node_modules
   sed -i '' 's|"order.view": row("any", "any", "any", "none", "own", "any"), // xem đơn|"order.view": row("any", "any", "any", "any", "own", "any"), // xem đơn|' /tmp/l2-copy/src/shared/permissions.ts
   AUDIT_ROOT=/tmp/l2-copy node /tmp/l2-copy/docs/evidence/2026-09-24-lo-hong-ho-so/kich-ban/lo-hong.mjs
   rm -rf /tmp/l2-copy /tmp/l2-copy.tar   # dọn ngay sau khi đọc kết quả
   ```

**Kết quả đã quan sát (2026-09-24, sau GĐ1):**

| Ca | Mã GĐ1 (nhánh) | Bản sao: FIELD có `order.view = any` |
|---|---|---|
| H2 SALES thêm SĐT vào hồ sơ ADMIN | **403** `forbidden` — "Tài khoản này không được sửa hồ sơ này." (trước GĐ1: 201) | 403 (giống bên trái) |
| H3a FIELD xem hồ sơ ADMIN (`GET /api/parties/:id`) | 403 (chặn ở cổng office — FIELD không qua `isOffice`) | **403** — chặn ở `can(staff, "party.view")` trong thân handler (`party.view` vẫn `none` cho FIELD trong `MATRIX`), KHÔNG còn phụ thuộc cổng `office`/`order.view` nữa |
| H3b FIELD đổi tên ADMIN (`PUT /api/parties/:id`) | không tới được (bị chặn ở H3a) | **403** — kịch bản vẫn gọi được route (cổng `office` đã mở vì `order.view = any`), nhưng `can(staff, "party.write"/"party.staff.write")` trong thân handler vẫn `none` cho FIELD trong `MATRIX` |
| H3c FIELD thêm SĐT vào hồ sơ ADMIN | không tới được | **403** — cùng lý do H3b (`POST …/contacts` cũng hỏi thẳng ô trong thân handler) |
| H7 (ngoài phạm vi GĐ1 — GĐ2) | 200 / 400 / như cũ | như cũ |

**Nhận định:**
- Đạt đúng kỳ vọng của tiêu chí nghiệm thu 11: FIELD nhận 403 ở `PUT /api/parties/:id` và `POST …/contacts` kể cả khi bị đổi `order.view` thành `any` trong bản sao — vì Task 3 đã đổi các route Hồ sơ từ chỉ dựa cổng `office` sang hỏi thẳng `can(staff, "party.view"/"party.write"/"party.staff.write")` trong thân handler; ba ô này KHÔNG đổi theo `order.view`.
- Bằng chứng còn cho thấy nhiều hơn kỳ vọng: ngay cả **H3a (GET, chỉ xem)** — vốn trước GĐ1 sẽ thành 200 khi `order.view = any` (xem bảng "Sau GĐ1" so với bảng gốc phía trên: trước GĐ1, H3a từ 403 chuyển 200 khi đổi ô) — nay vẫn 403, vì `GET /api/parties/:id` cũng đã có `can(staff, "party.view")` riêng (Task 3), không còn chỉ dựa cổng.
- Đây **chỉ là bằng chứng thêm cho GĐ1**, KHÔNG thay việc của GĐ2: cổng `office` (hàm `isOffice`) vẫn được **suy ra** từ `order.view` (`src/shared/permissions.ts:111`) — khi ADR-0017 thật sự mở `order.view` cho FIELD, FIELD sẽ qua được cổng `office` và tới được các route Hồ sơ (không còn bị chặn ở cổng như H3a hôm nay), nhưng dừng đúng ở `can(staff, "party.view"/"party.staff.write")` bên trong — vẫn đúng theo thiết kế. Việc tách cổng `office` ra khỏi `order.view` (Q3 trong bài học mô hình 11 vai) là việc khác, chưa làm ở đây.
- Không sửa `src/shared/permissions.ts` của cây làm việc thật; bản sao `/tmp/l2-copy` đã xoá sau khi đọc kết quả (không commit).
