# Nhật ký thi công — Gộp hồ sơ cá nhân trùng (ADR-0068)

Kế hoạch: `docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong.md`. Nhánh: `worktree-gop-ho-so`. Cách thi công: subagent-driven (chủ chọn "làm từng phần").

## Lời duyệt

- 2026-09-30: chủ chọn "1, làm chức năng gộp hồ sơ"; hộp hỏi gom: "Gộp tay + danh sách gợi ý", "Không có nút hoàn tác", "Quản trị + Toàn quyền", "Làm luôn, phần nhỏ"; đồng ý thiết kế trình trong trò chuyện ("đồng ý, viết đặc tả và ADR đi").
- 2026-09-30: sau khi AI trình ADR + đặc tả, chủ trả lời "lập đi" → AI lập kế hoạch (AI KHÔNG tự ghi "accepted" từ câu này — máy phân loại chặn, đúng).
- **2026-10-01, hộp hỏi gom (nguyên văn lựa chọn):**
  - "Bạn duyệt bản quyết định gộp hồ sơ (ADR-0068) chưa, và thi công theo cách nào?" → **"Duyệt, làm từng phần (Recommended)"**.

## Trả lời Q1–Q5 (2026-10-01)

- Q2 "Hồ sơ phụ là nhà xe cá nhân đang đứng tên xe thì sao?" → **"Từ chối gộp (Recommended)"**.
- Q5 "Hồ sơ phụ có công việc/quan hệ bắt đầu từ ngày trong tương lai thì sao?" → **"Từ chối gộp (Recommended)"**.
- Q1 + Q3 + Q4 "Đồng ý 3 điểm kỹ thuật nhỏ theo khuyến nghị không? (số migration tạm 0054; thêm 2 hàm đọc nội bộ cho vận chuyển + công nợ; thêm 1 đường đọc để ô Thêm tài khoản hiện hồ sơ khớp ngay khi gõ)" → **"Đồng ý cả ba (Recommended)"**.

## Ruling / nợ

- Task 0 do điều phối làm trực tiếp (chỉ tài liệu; ghi `docs/adr/**` bật hộp hỏi quyền của chủ — trợ lý phụ sẽ kẹt ở hộp hỏi).
- Ruling: migration số tạm **0055_gop_ho_so.sql** theo luật 1.46 của `docs/adr/README.md` (không giữ chỗ; số lớn nhất main + 1 = 0055; nhánh gộp sau đổi tên — `0055_nhom_dich_vu` của nhánh thi-cong-luot-1 cũng đang dùng 0055, ai gộp sau đổi) — nếu sai: đổi tên tệp, test tìm theo đuôi.

## Task 9 — giao diện (2026-10-01)

- Làm: hộp gộp (xem trước ba cột, gõ lại tên, nút Gộp tắt khi có lý do chặn), dải "Đã gộp vào …" + ẩn mọi nút sửa trên hồ sơ đã gộp, mục "Hồ sơ đã gộp vào đây", màn "Hồ sơ nghi trùng", khối C1 ở Thêm tài khoản (tra khi gõ, 300 ms; bắt 409 `party_match_exists`).
- Lệch khỏi brief (có chủ đích): Q4 = đồng ý → GIỮ tra-khi-gõ; F14 → ô tích dùng lớp `o-tick` (CSS token ở cuối `public/app.css`) thay chuỗi style; F18 → submit giữ `showError(errorEl, null)` + `fail(err)`; chống kết quả cũ đè mới (bộ đếm lần tra/xem trước); gộp thất bại → xem trước lại (vì `act()` mở lại nút); màn nghi trùng là DANH SÁCH, không bảng (`.table-wrap` ẩn dưới 900px → ở 390 sẽ không thấy cặp nào); kịch bản thêm `dem.xong()`.
- `src/shared/so-do-trang.ts` sinh lại (`node scripts/sinh-so-do-trang.mjs`) — bài sơ đồ trang đỏ vì nút mới.
- Kịch bản Chrome (D1 tạm, axe-core 4.13.0 tải về `.superpowers/axe/`): `gop-ho-so-smoke.mjs` 5/5 ✓ (kèm axe); `vai-smoke.mjs` OK (đã sửa: helper `guiThem` tick "Vẫn tạo hồ sơ mới" khi có khối; C2 bấm "Dùng hồ sơ này" trong `#add-khop`); `t2b-danh-ba-smoke.mjs` OK; `giay-to-nguoi-smoke.mjs` OK (7); `nha-xe-danh-ba-smoke.mjs` OK (5); `va3-smoke.mjs` OK; `passkey-smoke.mjs` OK; `dot-a-smoke.mjs` 8 ✓ rồi đỏ ở "nhat-ky: thẻ đã dựng xong" — ĐỎ SẴN đã ghi ở `web/CLAUDE.md` (ADR-0038), các bước nhân viên + hồ sơ đều ✓.
- Nợ nhỏ: hồ sơ đã gộp vẫn hiện câu giấy tờ "Tài khoản cấp trên: chỉ xem" (lý do sai, dải "Đã gộp vào" đã nói đúng). Kịch bản Task 8 Step 7 (cuoc-smoke, dp-lib, nhap-ke-toan-smoke, doi-tac-lap-don-smoke, danh-muc-lap-don-smoke) CHƯA chạy lại ở Task 9.

## Task 10 — bất biến R-PTY-MERGE-1..5 + quan sát chặn thật (2026-10-01)
- Đỏ đầu tiên: `node --test src/audit-invariants.test.ts` → bài danh sách kiểm đỏ ở deepEqual (chưa có kiểm R-PTY-MERGE nào). Xanh sau khi thêm 5 kiểm: pass 90.
- R-PTY-MERGE-4 thêm vế "đang đứng tên xe" (`vc_vehicle.status <> 'retired'`) cùng luật `viecXeCuaNguoi`; chú thích "sửa một nơi thì sửa nơi kia" ở cả hai nơi.
- D1 local TRƯỚC khi gieo: `R-N1-5` đã vi phạm (không có quản trị viên đang hoạt động trên D1 local — có sẵn, không do việc này).
- Lần in 1 (đã gieo hồ sơ gộp + `pty_person` + liên hệ mở): `✗ R-PTY-MERGE-2 … — 1 vi phạm`, thoát 1 (kèm `R-N1-3` 2 vi phạm do hồ sơ gieo có display_name lệch họ-tên: lỗi của dữ liệu gieo, không phải hàng rào).
- Lần in 2 (đã đóng liên hệ): `✓ R-PTY-MERGE-2`; còn `R-N1-3` (gieo) và `R-N1-5` (có sẵn). Sau đó khôi phục tệp sqlite local từ bản sao trước gieo → chỉ còn `R-N1-5`, 0 hồ sơ `pty-thu-gop*`.
- Bước 6: `if (false)` ở đường vai của `POST /api/staff` → `tao-trung.test.ts` đỏ `expected: 409 / actual: 201` (pass 3, fail 3) → hoàn nguyên → pass 6.

## Vòng sửa cuối + gộp main 1.49 (2026-10-01)

- Sau kiểm độc lập: thêm bài cấp bậc bên thứ ba (403, đỏ khi bỏ cổng), bài vế `from_party_id` của câu lật (Sửa 2), nhánh catch của lô chỉ trả `merge_lost_race` khi A vừa gộp vào ĐÚNG hồ sơ chính (khác → `merge_inactive`); ghi các lần quan sát chặn thật vào `docs/SO-HANG-RAO.md`.
- Gộp `main` 35448ab3 (bản 1.49). Migration đổi tên `0055_gop_ho_so.sql` → **`0056_gop_ho_so.sql`** (`0055_nhom_dich_vu` của main đã lên production; không thấy `0056` ở nhánh nào lúc gộp). Nhật ký phiên bản: mục của nhánh nay là **1.51** (nhánh `phat-hanh-1-50` đã nhận 1.50 — ai gộp sau đánh lại số). Số route: 196 (main) + 4 của nhánh = **200**. Backlog: mục của nhánh đánh lại 10–14 (main đã có mục 9).

## Đề xuất sửa luật — chờ chủ duyệt (N9: AI không tự sửa)

Thêm một dòng vào bảng Chrome của `web/CLAUDE.md`:

```markdown
| Gộp hồ sơ, hồ sơ nghi trùng, khối hồ sơ khớp khi Thêm tài khoản (ADR-0068): hộp gộp / dải "đã gộp" / màn nghi trùng của `web/parties.ts`, `#merge` / `#dups` / `#dup-btn` của `public/parties.html`, khối `#add-khop` của `web/staff.ts`, `src/shared/ho-so-trung.ts` | `gop-ho-so-smoke.mjs` ở `docs/evidence/2026-09-30-gop-ho-so/kich-ban/` (5 bước, 1040 + 390) + `t2b-danh-ba-smoke.mjs` + `vai-smoke.mjs` |
```

