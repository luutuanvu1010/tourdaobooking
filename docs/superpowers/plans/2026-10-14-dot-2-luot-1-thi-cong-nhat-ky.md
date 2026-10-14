# Đợt 2 lượt 1 — Bật/tắt đưa đón theo nhóm và điểm chọn nhanh: Nhật ký thi công

> Sổ điều phối của người thi công (CLAUDE.md §9). Kế hoạch: `docs/superpowers/plans/2026-10-14-dot-2-luot-1-ke-hoach.md`; quyết định: `docs/adr/ADR-0118-bat-tat-dua-don-theo-nhom-va-diem-chon-nhanh.md` (accepted 2026-10-14 — thắng khi lệch). Người thi công KHÔNG tự nghiệm thu: Task 7 do người kiểm độc lập (phiên khác, chỉ đọc).

## Task 0 — Điều kiện (14/10/2026)
- **Chủ đã duyệt ADR-0118** (chat 2026-10-14: «duyệt ADR-0118», phương án A cả ba quyết định Đợt 2). ADR đã ở `docs/adr/` và `docs/adr/README.md` đã có dòng mục lục 0118 — không cần thêm.
- **Nhánh:** worktree `agent-a5efc1907cfeb6e57`, dựng trên commit `4c38b7e5` (= `main` bản 1.96 + ADR-0118 + kế hoạch).
- **Nền xanh trước khi sửa:** `npm run typecheck` 0 lỗi. `npm test` bước 1 (bộ kiểm chính, 513 tệp) **xanh: 4711 đạt, 0 đỏ**. Bước 2 (bài đo giờ của hook `src/claude-guard-thoi-gian.test.ts`) **đỏ giả**: «quá chậm: lần nhanh nhất 2099 ms CPU» — máy đang chạy nhiều phiên song song; không nới ngưỡng, chạy lại khi máy rảnh (kết quả ghi ở mục «Chạy lại cuối» bên dưới).
- **Số migration = 0098.** `ls migrations` dừng ở `0095`; quét mọi nhánh (`git log --all --name-only -- migrations/`) thấy lớn nhất là `0096_muc_ta_bang_moi.sql` (nhánh `claude/phan-loai-dai-ly-hoa-hong-66d076`); `0096`–`0097` đã giữ cho ADR-0117 lần 2 ⇒ lấy **0098**: `migrations/0098_dua_don_theo_nhom_va_diem_nhanh.sql`. Phiên phát hành kiểm lại số này (nếu ADR-0117 lần 2 hoặc nhánh khác lên `main` trước) trước khi áp.
- **Xây trên lỗ đang hở:** đọc `docs/quyen-hoan.json` ngày 2026-10-14: TNV-G1/G3/G4, HC-4.2, HC-5.19 (hạn 2026-10-31), HC-5.11 (hạn 2026-11-15). Lượt này **không ghi tiền, không đụng `billing`/`hoan-tat-repo.ts`, không tạo bút toán, không đụng Cron** ⇒ **không xây trên lỗ nào**. Cần người kiểm xác nhận bằng diff (không thấy tệp nào của các vùng đó trong danh sách tệp đổi).
- **Câu đếm chỉ-đọc trên D1 thật: KHÔNG chạy** (lệnh `wrangler d1 execute --remote` bị cấm với AI). **Chủ chạy trước phát hành** (xem lệnh ở báo cáo cuối). Migration gieo bằng `UPDATE … WHERE code = …` nên an toàn nếu thiếu mã (bài N-3 đã kiểm).

## Ruling (người thi công tự ra; chủ đọc khi duyệt)

| # | Quyết gì | Vì sao | Giá phải trả nếu sai |
|---|---|---|---|
| R-A | Số migration **0098** | 0096–0097 giữ cho ADR-0117 lần 2 (lời điều phối) | Đổi tên tệp + sửa một dòng ở bài migration; chưa áp remote nên rẻ |
| R-B | View `v_ctl_service_transfer` coi **nhóm đã ngưng dùng (`active = 0`) như Chưa phân loại → 1**, CÙNG luật với `nhomChoForm` (form) | Nếu view chỉ `COALESCE(g.transfer_enabled, 1)` thì dịch vụ ở nhóm ngưng dùng + cờ 0 làm máy chủ chặn trong khi form (đã coi là Chưa phân loại) vẫn hiện khối đưa đón ⇒ người dùng bị chặn oan. Luật ADR-0058 cấm tắt nhóm còn dịch vụ nên tình huống chỉ xảy ra với dữ liệu sửa tay; đáp án rõ ràng cho cả hai nơi | Nếu chủ muốn nhóm ngưng dùng vẫn giữ cờ: sửa một dòng CASE của view bằng migration sau + một dòng ở `choPhepDuaDon` |
| R-C | Tên nhóm trong câu lỗi lấy qua **hàm công bố của `catalog`** (`tenNhomHienHanh`, qua `catalog/index.ts`), còn **cổng** (có chặn hay không) đọc từ view đúng ADR Đ2 | ADR chốt view chỉ hai cột `(catalog_code, transfer_enabled)`; thêm cột tên nhóm là lệch ADR đã duyệt. `orders → catalog` là cạnh được phép sẵn | Nếu chủ muốn view mang tên nhóm: ADR mới + migration thêm cột (view chỉ thêm, đảo được) |
| R-D | Mã lỗi `transfer_disabled` trả **HTTP 409** | Là xung đột với cấu hình hiện hành, không phải lỗi đầu vào; khớp tiền lệ `use_order_form`, `short_notice_required`. Thêm vào `LOI_409_KHONG_CU` để màn hình không đổi thành nút «Tải lại đơn» (tải lại sẽ xoá chữ đang gõ; câu máy chủ đã nói đủ việc cần làm) | Đổi 409 → 400: sửa một hằng + một dòng test |
| R-T | **Cửa ghi chặng thứ sáu: `PUT /api/orders/:id/trip`** cũng bị chốt chặn: thao tác `insert` / `update` chặng của dịch vụ nhóm tắt → 409 `transfer_disabled`; thao tác `close` và thân không đụng chặng (ghi chú, giờ khởi hành, nơi khách có mặt) vẫn qua | `keHoachChangTrip` sinh thao tác chặng (thêm chặng chiều đi, dời ngày đón khi đổi ngày đi) nên đây là đường ghi chặng; ADR Đ3(a) nói «mọi lệnh GHI chặng». Hệ quả: đơn đã xác nhận có chặng cũ ở nhóm tắt thì **đổi ngày đi** (làm dời chặng) cũng phải đóng chặng trước — đúng chữ «muốn sửa chặng thì chỉ đóng được» của ADR. **Đây là điểm cần chủ biết**: ADR liệt kê «bốn cửa» nhưng mã có thêm cửa này | Nếu chủ muốn đổi ngày đi vẫn qua: miễn trừ thao tác `update` chỉ-dời-ngày (một điều kiện ở `kiemNhomChoPhepDuaDon` + một bài) |
| R-E | **Nhánh nháp của `PUT /legs/:legId`** (`lenhSoNguoiVeNhap` — sửa số người chiều về của chặng ở đơn nháp) cũng bị chốt chặn | Vẫn là «sửa chặng» của dịch vụ nhóm tắt; để hở thì có đường ghi chặng không qua chốt | Nhẹ: người dùng nháp phải bỏ chặng trước |
| R-F | Chốt chặn XÁC NHẬN đọc cờ **trước** lô xác nhận, không nằm trong câu `UPDATE` | Đặt vào câu cần JOIN view của module khác trong `repository.ts` cũ (LEGACY, SQL thô) — nới ranh giới kiến trúc. Khe đua rất hẹp: Quản trị tắt nhóm đúng giữa lúc đọc và lúc ghi, đơn vẫn xác nhận với chặng cũ — hậu quả bằng đơn đã xác nhận có chặng cũ (vốn được phép, ADR Đ3(c)) | Siết sau bằng cờ trong câu `confirmOrder` nếu chủ muốn |
| R-G | `PUT /api/locations/:id`: khoá `quickPickOrder` **vắng = giữ giá trị đang lưu; `null` = bỏ** | `web/locations.js` cũ trong bộ nhớ đệm PWA chưa biết khoá này; nếu vắng = bỏ thì lần lưu bất kỳ sẽ lặng lẽ xoá hai điểm chọn nhanh đã gieo | Không có (hành vi chặt hơn ADR không nói) |
| R-H | Giao diện: `transferEnabled` **KHÔNG** thêm vào `CatalogService` / `ServiceDraft`; form giữ bảng `mã dịch vụ → cờ` từ `GET /api/catalog/for-order` | Tránh đụng ~mọi chỗ dựng thẻ dịch vụ / bản chụp đơn nháp; dịch vụ không còn trong danh mục (ẩn) không có cờ → mặc định cho đưa đón, máy chủ vẫn là cổng thật | Thêm cờ vào DTO bản chụp nếu sau này cần |

## Tiến độ (cập nhật theo từng commit)
| # | Việc | Trạng thái |
|---|---|---|
| 0 | Điều kiện, nền xanh, số migration, sổ điều phối | xong (commit đầu) |
| 1 | Migration + từ điển dữ liệu + bài migration | đang làm |
| 2–6 | (cập nhật dần) | |

## Chạy lại cuối
(điền khi kết thúc)
