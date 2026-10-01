# Kiểm lại sau vòng sửa + gộp main (nhánh tro-ly-mai, HEAD 70c3ae69)

**Kết luận: ĐẠT.** Không có Critical/Important. 3 mục Minor (số 0064 cũ còn sót trong chú thích; ảnh bằng chứng cũ bị chụp lại; không kiểm 7403/e2e vì ngoài phạm vi).

## Bằng chứng
- `npm run typecheck`: 0 lỗi. `node --test` (migrations-pty-person-gender, xung-ho, tro-ly/*, architecture, app-info, changelog): 155/155 xanh.
- Migration `migrations/0066_pty_person_gender.sql`: câu chào có `{ten}`/`{xung}`; INSERT còn `WHERE h.id = 'gieo-0054'` (đột biến sang `WHERE 1=1` trên bản sao tạm => bài migration đỏ 1/5); bài tìm tệp theo đuôi `_pty_person_gender.sql`, đúng một tệp. `git ls-tree origin/main migrations/` lớn nhất 0065, không có 0066.
- `src/shared/xung-ho.ts`: `thayTen` thay cả `{ten}` và `{xung}`, viết hoa đầu câu; `xungHo(null,null)` = bạn/mình; NAM/NU = anh/chị + em (đúng Đ2). Đột biến regex bỏ `xung` => bài xung-ho.test đỏ.
- Bài T-1 (`van-nghia-route.test.ts`): bản sao tạm `git archive HEAD`. Gốc 11/11 xanh. Đột biến index.ts:223 (route hỏi) và :408 (ô thử) dùng `xungHo(null,null)` thay `nguoi` => cả hai lần bài T-1 đỏ (10/11). Bài canh thật cả hai đường.
- Gộp: origin/main (fe3d73f4) là tổ tiên của HEAD nên `git diff origin/main..HEAD` chỉ là phần nhánh này. README ADR: 0074, 0075, 0083, 0084 đủ, dòng "kế tiếp 0085", cột đúng thứ tự. changelog.ts: 1.59 trên 1.58 (mục 1.58 của main không có dòng xoá/sửa trong diff). app-info.test.ts ghi 1.59. SYSTEM-DESIGN: dòng 0066 (l.396) ngay sau 0065 (l.395).

## Phát hiện
- Minor-1: còn nhắc "0064" cũ: `migrations/0066_pty_person_gender.sql:1` ("Số 0064 là TẠM"), `src/migrations-pty-person-gender.test.ts:1`, `docs/SYSTEM-DESIGN.md:207,209,215`. Chỉ chú thích/tài liệu, dễ gây nhầm. Đề xuất đổi thành 0066.
- Minor-2: diff so main có ảnh bằng chứng của các đợt cũ (2026-09-22, 09-28, 09-29, 09-30) bị chụp lại + `a2-cdp.mjs` đổi, `t2b-danh-ba-smoke.mjs` thêm — do commit f66183c5/25aec69b (kịch bản Chrome chạy lại), đã nằm trong phạm vi lần kiểm trước. Ồn nhưng vô hại.
- Không kiểm: e2e, `npm test` toàn bộ (điều phối đã chạy), giao diện Chrome.
