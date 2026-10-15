# Đề xuất sửa luật — Gói 1 (đăng nhập hai lớp, Phần B)

> Hồ sơ có ngày (2026-10-15), soạn ở Task 8 của kế hoạch `docs/superpowers/plans/2026-10-01-dang-nhap-b-hai-lop-ung-dung-xac-thuc.md` (nhánh `worktree-hai-lop-dang-nhap`). **Chỉ là đề xuất**: các tệp dưới đây là tệp luật (CLAUDE.md §3, N9) — AI không tự sửa; chủ duyệt thì người sửa chép đúng đoạn vào tệp đích bằng công cụ sửa tệp (để chủ được hỏi).

## Đề xuất 1 — `web/CLAUDE.md`, bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào": thêm một dòng

Vì sao: Phần B thêm tệp giao diện mới `web/hai-lop-ui.ts` và phần hai lớp ở bốn tệp có sẵn, cùng kịch bản Chrome `docs/evidence/2026-10-01-dang-nhap-b/kich-ban/hai-lop.mjs` (9 bước). Bảng hiện không có dòng nào trỏ tới kịch bản này, nên người sửa sau không biết phải chạy nó. Dải nhắc ở `web/shell.ts` hiện trên MỌI trang của tài khoản nội bộ chưa bật, nên các kịch bản cũ đếm bố cục cũng bị ảnh hưởng.

Dòng thêm (đặt ngay sau dòng "Đăng nhập bằng Face ID (ADR-0016) …"):

```
| Bảo mật hai lớp (ADR-0074 Phần B): `web/hai-lop-ui.ts`, `src/shared/hai-lop-hien-thi.ts`, phần hai lớp của `web/login.ts` (bước nhập mã, bật lại khi đăng nhập), `web/account.ts` (khối "Bảo mật đăng nhập" `#mfa`), `web/staff.ts` (nhãn "Hai lớp", nút "Tắt bảo mật hai lớp"), dải nhắc `#mfa-strip` của `web/shell.ts`, khối `.mfa-*` / `.login-mfa*` và token `--w-mfa-qr` của `public/app.css` | `hai-lop.mjs` ở `docs/evidence/2026-10-01-dang-nhap-b/kich-ban/` (9 bước, 390 + 1040 + 320, không cần mạng ngoài; kịch bản tự sinh `MFA_ENCRYPTION_KEY` cho máy tạm; cần `AXE_JS`) + `dot-c-smoke.mjs` (thứ tự khối trang Tôi có `mfa`) + `quyen-thieu-quan-tri-smoke.mjs` (trang Tôi không có dòng báo lỗi — lời nhắc dùng `.mfa-note`, không `.alert`) + `v1-dang-nhap.mjs` nếu chạm form PIN + `trang-chu-smoke.mjs` nếu chạm dải nhắc |
```

## Đề xuất 2 — `web/CLAUDE.md`, câu dẫn của cùng bảng: ghim phiên bản axe-core

Vì sao: câu hiện tại chỉ nói "Cần Chrome + axe-core **ngoài repo**", không nói phiên bản. Task 7 chạy bằng axe **4.13.0** và thấy quy tắc `meta-viewport` báo lỗi ở MỌI trang (thẻ `user-scalable=no` có sẵn từ đầu) — kịch bản `v1-bao-tri.mjs`, `v1-dang-nhap.mjs` đỏ y hệt trên commit gốc. Hai người chạy hai bản axe khác nhau sẽ thấy kết quả "đỏ sẵn" khác nhau và dễ đổ lỗi nhầm cho việc của mình.

Câu thay (đoạn "Chạy `npm run build:web` trước. Cần Chrome + axe-core **ngoài repo** …"):

```
Chạy `npm run build:web` trước. Cần Chrome + axe-core **ngoài repo**, **bản 4.13.x** (`npm pack axe-core@4.13` ở một thư mục ngoài repo, rồi trỏ `AXE_JS` tới `package/axe.min.js`); bản khác thì ghi số bản vào kết quả. Với 4.13, quy tắc `meta-viewport` (thẻ `user-scalable=no` sẵn có) đỏ ở mọi trang — đỏ SẴN, không do việc đang làm. Cách chạy `tests/e2e/README.md`. Các trang dùng **chung kho cookie**: trang của tài khoản nào phải mở **sau cùng**.
```

## Đề xuất 3 (tuỳ chọn) — `CLAUDE.md` gốc §10 "Bẫy hay dính": một dòng trỏ

Vì sao: bí mật mới `MFA_ENCRYPTION_KEY` là điều kiện TRƯỚC triển khai và không đổi được về sau (đổi khoá = mọi người bật lại). §10 đã có dòng cho Turnstile và Face ID cùng loại.

```
- **Bảo mật hai lớp** (ADR-0074 Phần B, migration `0101`): bí mật `MFA_ENCRYPTION_KEY` (32 byte base64) chủ đặt TRƯỚC lần triển khai đầu (`docs/HANDOFF-N1.md`); KHÔNG đổi / làm mất về sau (khoá ứng dụng xác thực đã lưu không giải được). Ân hạn 14 ngày tính từ lúc migration áp. Cấp phiên chỉ ở bốn route (`src/modules/auth/cap-phien-bon-cua.test.ts`). Chi tiết: `docs/CHANGE-GUIDE.md` công thức z18, bẫy 77.
```
