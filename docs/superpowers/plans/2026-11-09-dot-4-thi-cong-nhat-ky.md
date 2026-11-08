# Đợt 4 (đường găng 30/11) — nhật ký thi công

> Kế hoạch: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần VII (chủ duyệt 9/11). Phiên Đợt 4, worktree `modest-lovelace-09b5ba`, nhánh `claude/dot-4-han-30-11-7d0bdb`. Trang hỏi chủ: `docs/superpowers/specs/2026-11-09-dot-4-hoi-chu.md`.

## Mốc đầu phiên (9/11)

- `main` = `origin/main` = `fa3fd859a`. Nhánh này cắt từ nhánh prompt rà soát nên mang theo 24 lần lưu chưa có trên `main`: hồ sơ rà soát trước ngày dùng thật lần 2 (nhánh `claude/kind-wu-98f2cd`), prompt rà soát, kế hoạch sửa sau rà soát và lời duyệt 9/11 (`4ec5e1965`, `2c6b7e70c`). Toàn là tài liệu và một kịch bản Chrome (`52fd54557`); khi chủ `day-len` nhánh này thì các lần lưu đó vào `main` cùng lúc.
- Production (kiểm chỉ đọc 9/11): `GET /api/auth/config` → `version 2.80`; `wrangler d1 migrations list tourdao-sales-db --remote` → «No migrations to apply!» (đã áp tới `0150`).
- Số migration lớn nhất trên `main`: `0150`. Đợt này **không thêm migration**.

## 4.1 TNV-G1

- **Tiền đề của lời giao đã cũ.** Nhánh `claude/nostalgic-aryabhata-066936` không còn (không có ở máy, không có trên GitHub): reflog `main@{90}` ghi «merge claude/nostalgic-aryabhata-066936: Fast-forward», `195e9d3ef` là tổ tiên của `main`, `migrations/0125_tin_duyet_hoan_thu_truoc.sql` có trên `main`; `src/shared/changelog.ts` ghi «29/10 chủ triển khai 2.42 từ main 195e9d3e». Production áp hết migration (trên). Vậy phần «gộp main vào bản sao nhánh, soát số migration» không còn việc; câu «CHƯA gộp, CHƯA triển khai» trong mục TNV-G1 của `docs/quyen-hoan.json` là trạng thái 28/10.
- **Đối chiếu năm điều kiện đóng** (§6 kế hoạch `2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md`):
  1. Lên production + `audit-invariants --db remote` đạt: mã đã lên (trên). `audit-invariants --db remote` đọc D1 thật — AI không chạy (phiên 28/10 được thoát 2); đưa chủ lệnh ở trang hỏi.
  2. Nhãn tiền, ảnh thông báo huỷ, ô đếm Trang chủ: đã lên ở 2.42.
  3. Người kiểm độc lập: ĐẠT 28/10 (ghi ở sổ).
  4. Sổ vàng: `node --test src/so-vang-don-huy.test.ts` 9/11 xanh; 7 ca đã xác nhận khớp từng đồng; 6 ca chờ (01, 02, 04, 07, 08, 13) đều «khớp mã». Ca 07 còn vướng đặc tả phiếu chi (bản nháp 28/10, chưa duyệt).
  5. Chạy lại tám tình huống G1 trên `main` hiện tại: giao trợ lý chạy nền (bản chép kịch bản 28/10 đã mất, dựng lại từ bản gốc ngoài kho). Kết quả: _(điền khi có)_.

## 4.2 HC-4.2

- Giao `nguoi-kiem-doc-lap` (chỉ đọc) đối chiếu ADR-0115, ADR-0092 với mã: _(điền khi có)_.

## 4.3 Hai ô quyền chưa có route (`task.progress`, `dispatch.guides.view`)

- **Không thi công — dừng hỏi chủ.** Kế hoạch 9/11 khuyến nghị bỏ, nhưng không nhắc rằng việc bỏ đúng hai ô này đã được trình một lần: ADR-0086 (1/10) bị chủ **bác** («giữ lại đi, tiếp»), và ADR-0019 điều 5 (đã duyệt) chủ ý giữ hai ô. Bỏ ô bây giờ là đổi nghĩa một ADR đã duyệt, nên cần ADR mới chủ duyệt (CLAUDE.md §2 «không tự hoà giải»; N3). Lời duyệt kế hoạch tự ghi «không thay cho duyệt từng ADR». Đưa vào câu hỏi gom: gia hạn (giữ đúng quyết định 1/10) hoặc soạn ADR mới thay ADR-0086.
- Đã dò phạm vi nếu bỏ: `src/shared/permissions.ts` (hai dòng + chú thích), `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.test.ts`, chú thích `src/modules/dispatch/rules.ts`, `docs/quyen-hoan.json`, `docs/SYSTEM-DESIGN.md`. Không migration, không trigger, không chỗ giao diện ẩn/hiện, không có trong bảng tham chiếu.
