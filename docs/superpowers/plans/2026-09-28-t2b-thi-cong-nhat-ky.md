# Nhật ký thi công T2b — Tour Đảo là hồ sơ tổ chức (ADR-0024 điều 6)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-28-t2b-ho-so-tour-dao.md` (vai lập kế hoạch, 2026-09-28).
- **Nguồn chuẩn tắc:**
  - ADR-0024 (accepted phần điều 6, kèm 6.1–6.6; chủ duyệt "duyệt T2b" 2026-09-28);
  - đề xuất `docs/superpowers/specs/2026-09-27-de-xuat-t2b-ho-so-tour-dao.md`;
  - ADR-0038 điều 7.
- **Nhánh thi công:** _(điền)_. Tạo từ `main` @ _(điền mã commit)_, sau khi `main` có nhánh ADR-0038 và nhánh `dac-ta-van-chuyen`.
- **Cách thi công:** _(điền: subagent-driven-development / executing-plans; ai thi công task nào)_.
- **Trạng thái:** CHƯA BẮT ĐẦU. Chưa push, chưa gộp, chưa lên production.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả của người kiểm độc lập ghi ở mục 8.

## 1. Mốc ban đầu (Task 0)

| Mục | Kết quả |
|---|---|
| Bước 1: ADR-0024 (accepted phần điều 6) và ADR-0038 có trên `main` | _(điền)_ |
| Bước 2: ô `company.legal.write` đã có trên `main`? (kế hoạch dự kiến: CHƯA → Task 7 thêm) | _(điền)_ |
| Bước 3: `docs/quyen-hoan.json` → `phat_hien` | _(điền)_ |
| Bước 4: số migration lớn nhất trên `main`; kết quả quét mọi nhánh; số dùng cho T2b | _(điền; kế hoạch dự kiến 0028)_ |
| Bước 5: `npm test` (số test) / `npm run typecheck` | _(điền)_ |
| Bước 6: `npm run test:e2e` đủ bộ — kịch bản đỏ sẵn có | _(điền)_ |
| Bước 7: Chrome trên `main` (`v1-dang-nhap`, `dot-c-smoke`, `dot-a-smoke`, `vai-smoke`, `v1-xac-nhan-png`) — số ✓/✗, ảnh gốc màn đăng nhập | _(điền)_ |
| Bước 8: số dòng trích dẫn lệch so với kế hoạch (đo trên `5dc4732`) | _(điền)_ |
| Bước 9: khẳng định "đúng số lượng / đúng danh sách" tìm thêm được | _(điền)_ |

**Đỏ sẵn có trên `main`** (không phải lỗi của T2b): _(điền)_

## 2. Câu trả lời của chủ dự án

| Câu | Nội dung | Trả lời (nguyên văn, ngày) | Ảnh hưởng |
|---|---|---|---|
| 6.5 | A (giữ trigger cấm đóng) hay B (bỏ trigger) | _(điền)_ | Task 3 |
| Câu 2 (điều phối) | Quan hệ "Người liên hệ của Tour Đảo": giữ Quản trị hay khoá chỉ Toàn quyền | _(điền)_ | Task 9 |
| Q1 | Chặn thêm bốn cách lách bằng SQL tay (chuyển hồ sơ, đổi mã, xoá, chèn dòng đã đóng) | _(điền)_ | Task 3 bước 7 |
| Q2 | Sửa chữ địa chỉ tĩnh: chỉ "Tỉnh" (mặc định (a), đúng phần đã duyệt) hay cả ba chỗ lệch ((b), khuyến nghị) | _(điền)_ | Task 11 bước 3 |
| Q3 | Chân trang hiện tên gọi (giữ bản thiết kế) hay tên pháp lý (chữ HOA) | _(điền)_ | Task 5, 6, 11 |
| Đề xuất luật | Duyệt `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` | _(điền)_ | Task 17 |
| Truy vấn chỉ đọc trước phát hành (mục 7 bước 2 của kế hoạch) | Kết quả (chỉ độ dài/cờ) | _(điền)_ | Task 17 |

## 3. Bảng từng task

Cột "Đột biến P16": sửa cố ý → đỏ → hoàn nguyên → xanh. Chép **nguyên văn** dòng đỏ, kèm ngày.

| Task | Việc | Commit | `npm test` sau | Dòng ĐỎ trước (đã thấy) | Đột biến P16 (ngày · đột biến · dòng đỏ) | Người kiểm |
|---|---|---|---|---|---|---|
| 0 | Điều kiện trước, mốc | — | _(điền)_ | — | — | — |
| 1 | `src/shared/cong-ty-chu.ts` | _(điền)_ | _(điền)_ | _(điền)_ | — | _(điền)_ |
| 2 | Migration 0028 (chưa trigger) + test | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: chỉ mục; số viết tay)_ | _(điền)_ |
| 3 | Trigger cấm đóng (phụ thuộc 6.5) | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| 4 | `R-PTY-1` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: `>= 1`; sai mã)_ | _(điền)_ |
| 5 | `ownerCompany`; `GET /api/company`; module company thôi đọc cột pháp lý | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: FIND_LOGO; route đọc lại company_profile)_ | _(điền)_ |
| 6 | `GET /api/auth/config` thêm tên + MST | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: bỏ `.catch`)_ | _(điền)_ |
| 7 | Ô `company.legal.write`; PUT/contacts; `editable` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ba route)_ | _(điền)_ |
| 8 | Lớp (i) hai route vai; ánh xạ lỗi; e2e quyền | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: thêm vai; kết thúc; ánh xạ)_ | _(điền)_ |
| 9 | Khoá quan hệ (phụ thuộc câu 2) | _(điền hoặc "không làm")_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| 10 | Danh bạ (`web/parties.ts`) + Chrome | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| 11 | Trang đăng nhập + bài so khớp + Chrome | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| 12 | Sổ hàng rào | _(điền)_ | — | — | — | _(điền)_ |
| 13 | Tài liệu + sổ dữ liệu + đề xuất diff luật | _(điền)_ | _(điền)_ | — | — | _(điền)_ |
| 14 | Kiểm toàn bộ (tự khai) | — | _(điền)_ | — | — | — |
| 15 | Nhật ký thay đổi (số bản chốt lúc gộp) | _(điền)_ | _(điền)_ | — | — | _(điền)_ |

## 4. Phán quyết của điều phối trong lúc thi công (Ruling) — kèm giá nếu sai

Ruling đã có trong kế hoạch:
- **R1:** module `company` giữ một câu `logo_url` chưa nơi nào gọi, để không nới hàng rào "module nghiêm có ít nhất một câu SQL". Người kiểm độc lập phán quyết ở Task 16.

Ruling mới:
- _(điền: số hiệu, nội dung, vì sao, giá nếu sai)_

## 5. Sự cố

- _(điền)_

## 6. Nợ còn lại (không chặn gộp)

- Gộp hồ sơ (N2, chưa có mã) khi xây phải từ chối hồ sơ công ty chủ (ADR-0024 6.4).
- Thu hồi cột pháp lý của `company_profile` theo expand–contract ở lần phát hành sau (6.3). `findLogoUrl` chờ lượt đó quyết.
- Lượt 1 Hoàn tất đơn: trang ghép gọi bất biến này là `R-BIL-7` — phải dùng lại `R-PTY-1`, không thêm kiểm trùng.
- Địa chỉ ở chân trang đăng nhập vẫn là chữ tĩnh (6.2 duyệt hai trường).
- _(điền thêm)_

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

- `npm test`: _(điền)_ · `npm run typecheck`: _(điền)_ · `npm run build:web`: _(điền)_
- `npm run test:e2e` đủ bộ + `audit-invariants --strict` (có `R-PTY-1`): _(điền)_
- `node scripts/audit-invariants.mjs --db local`: _(điền)_
- `node --test "tests/audit/*.test.mjs"`: _(điền)_
- Chrome: `v1-dang-nhap` _(điền)_ · `dot-c-smoke` _(điền)_ · `dot-a-smoke` _(điền)_ · `vai-smoke` _(điền)_ · `t2b-danh-ba-smoke` _(điền)_ · `v1-xac-nhan-png` _(điền)_
- So ảnh màn đăng nhập 390×844 và 1040×800 với ảnh gốc: _(điền)_

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc) — Task 16

- **Kết luận:** _(điền: ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, ngày, trên mã commit nào)_
- **Phép đột biến người kiểm tự làm:** _(điền)_
- **Phán quyết Ruling R1:** _(điền)_
- **Phát hiện và cách xử lý:** _(điền)_

## 9. Chưa kiểm (lúc viết mục này)

- _(điền: ví dụ iPhone thật, tài khoản thật trên production)_

## 10. Phát hành (chủ dự án tự chạy — Task 17)

- `npm run day-len -- <nhánh>`: _(điền: ngày giờ, kết quả)_
- `npm run trien-khai` (có migration 0028): _(điền: số phiên bản, Worker, mốc lùi, `audit-invariants --db remote`, cổng phiên bản sau deploy)_
- AI kiểm bằng GET công khai sau triển khai: _(điền)_
