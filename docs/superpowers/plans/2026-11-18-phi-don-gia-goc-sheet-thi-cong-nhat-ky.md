# Nhật ký thi công — Phí đưa đón từ giá gốc Sheet (ADR-0218), Đợt 1

Kế hoạch: `2026-11-18-phi-don-gia-goc-sheet.md`. Nhánh `claude/redesign-pricing-subsystem-50496b`. Đợt 2 (Task 6–11) CHƯA làm: sổ vàng `golden/phi-dua-don-gia-goc.json` chưa có ca `da_xac_nhan`.

## Việc đã làm (Đợt 1)
- Task 1: migration `0178_phi_don_gia_goc` (số 0178 kiểm còn trống 18/11 trên mọi nhánh); năm bảng + view, dictionary sinh lại. Bài `src/migrations-phi-don-gia-goc.test.ts`.
- Task 2: đồng bộ hai cột Sheet; `kePhiDonGoc`; `catalog/phi-don-goc-repo.ts` (nửa nghiêm); `giaGocPhiDon`, `dichVuDuaDonChuaCoGiaGoc` ở `catalog/index.ts`.
- Task 3: mức giảm theo cấp (`pricing/giam-phi-don-*`), khối ở `web/cap-dai-ly.ts` qua `web/giam-phi-don.ts`.
- Task 4: chương trình miễn phí (`pricing/chuong-trinh-phi-don-*`), khối ở `web/phi-don.ts` qua `web/chuong-trinh-phi-don.ts`.
- Task 5: công tắc biên nhận, danh sách dịch vụ chưa có giá, bảng tham chiếu (`cho-chon`).

## Lệch so với kế hoạch (mã thật thắng, bề mặt)
1. Migration 0178: kiến trúc (ADR-0003) đòi đủ cột kiểm toán ở bảng mới nên thêm `created_by/updated_at/updated_by` (giá gốc), `updated_at/updated_by` (chương trình, công tắc), bốn cột kiểm toán (phạm vi). Khoá chống trùng của bảng phạm vi là chỉ mục biểu thức `COALESCE` vì khoá chính có cột NULL không chặn trùng trong SQLite.
2. Bài migration dùng `node:sqlite` trực tiếp (khuôn `migrations-cong-tac-gio-don.test.ts`), không dùng `world()`.
3. `kePhiDonGoc` nhận `parse.phiDon` (không nhận cả `parse`); vấn đề trả theo dạng `VanDeDongBo` (`row`, `code?`, `message`); vấn đề «cột không còn» mang `row = 0` nên `web/catalog.ts` hiện không kèm «Dòng 0».
4. Mức giảm: kết thúc = đóng tới hết HÔM NAY; mức chưa tới ngày bắt đầu không kết thúc được (CSDL cấm đóng sớm hơn ngày bắt đầu, trả 400) — chỉ thay được bằng mức bắt đầu muộn hơn. GET trả thêm `cap` (cấp đang bật) và `doiDuoc`.
5. Chương trình: kết thúc ghi `ended_at` = lúc bấm, không nhận ngày; GET trả chương trình còn hiệu lực + đã kết thúc trong 30 ngày.
6. Bài chương trình ở Task 4 (đọc sổ vàng) bỏ qua ca không có đáp án lượt (GG-16, GG-19).
7. Bước «chạy thấy đỏ» của Task 5 chỉ làm gián tiếp (bài viết trước, mã chưa có nên đỏ do thiếu route/hàm); không chụp riêng dòng FAIL.
8. Số route trong `route-access.test.ts`: 565 → 574 (3 + 3 + 3).

## Nợ / chưa làm
- Kịch bản Chrome cho `web/cap-dai-ly.ts`, `web/phi-don.ts`, `web/account.ts`: xem báo cáo cuối về việc đã chạy hay chưa.
- Cập nhật `docs/gia/README.md` của kho tourdaovn (13 → 15 cột): kho khác, việc sau.
- Đợt 2 (Task 6–11).
