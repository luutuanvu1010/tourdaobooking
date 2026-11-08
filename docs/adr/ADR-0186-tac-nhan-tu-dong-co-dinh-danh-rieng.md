# ADR-0186 — Tác nhân tự động có định danh riêng: tự đồng bộ danh mục đi qua cùng cổng quyền

- **Trạng thái:** **proposed** 2026-11-08 — chờ chủ dự án duyệt. Chưa có hiệu lực; luật ADR-0010 điều 3 (chừa Cron đồng bộ danh mục) vẫn áp tới khi ADR này được duyệt và mã mới qua tiêu chí nghiệm thu.
- **Ngày:** 2026-11-08. **Loại:** việc lớn (quyền, nhật ký, migration) — thi công xong cần người kiểm độc lập chỉ đọc (`CLAUDE.md` §3).
- **Cửa:** hai chiều về hành vi (bỏ định danh thì về như cũ); một chiều ở chỗ cột mới của nhật ký và các dòng nhật ký đã ghi ở lại (nhật ký chỉ-thêm).
- **Thay / sửa:** thay câu «Ngoại lệ đã có, giữ nguyên» của ADR-0010 điều 3, **chỉ cho** tự đồng bộ danh mục và đồng bộ lần đầu. Không sửa nguyên văn ADR-0010.
- **Liên quan:** Hiến chương 5.11, 5.12, 5.15 (Phần I `docs/ARCHITECTURE.md`; bản chung ở kho luật gốc); ADR-0007, ADR-0019 (bản đồ quyền, `can()`); mục `HC-5.11` trong `docs/quyen-hoan.json`; đặc tả `docs/superpowers/specs/2026-11-08-tac-nhan-dong-bo-danh-muc.md`; trang ghép `docs/superpowers/specs/2026-11-08-trang-ghep-tac-nhan-nhat-ky.md`.
- **Xây trên lỗ đang hở:** không (đã đọc các mục còn mở của sổ: `TNV-G1`, `HC-4.2`, `HC-5.19` và các ô hoãn — không mục nào thuộc vùng định danh, nhật ký).
- **Số quyết định chủ cần chốt:** 2 — D1 (duyệt cách làm dưới đây), D2 (hai Cron còn lại làm sau hay làm luôn).

## Bối cảnh

Cron mỗi 15 phút gọi `syncCatalog(env, null)`: ghi `catalog_item` không qua `can()`, nhật ký `catalog_synced` có `staff_id` rỗng. Đồng bộ lần đầu (`bootstrapIfNeverSynced`) cũng vậy. Hiến chương 5.11 không chừa tác nhân nào; ADR-0010 điều 3 chừa riêng Cron này từ 2026-09-21. Chủ dự án đưa lỗ này vào sổ dừng dây chuyền ngày 2026-10-05 (hạn 2026-11-15) và ngày 2026-11-08 chọn sửa thay vì gia hạn.

## Quyết định

1. **Định danh tác nhân.** Mỗi tác nhân tự động có một mã cố định, khai ở **một** nơi trong mã nguồn kèm tên lời thường. Tác nhân đầu tiên: `DONG_BO_DANH_MUC` (tự đồng bộ danh mục từ Google Sheet). Tác nhân không phải tài khoản đăng nhập: không số điện thoại, không PIN, không phiên, không hiện ở danh sách tài khoản, không có đường đăng nhập nào.
2. **Quyền riêng, cổng chung.** Thêm ô `catalog.sync` vào bản đồ quyền. Với người, ô này cho Quản trị và Toàn quyền, đúng bằng ai bấm được «Đồng bộ ngay» hôm nay; không ai được thêm hay mất quyền. Mỗi tác nhân có danh sách ô riêng trong `src/shared/permissions.ts`; `DONG_BO_DANH_MUC` chỉ có `catalog.sync`. `can()` là cổng chung cho cả người lẫn tác nhân. Tác nhân không bao giờ giữ ô ghi tiền (`O_GHI_TIEN`), không giữ `admin.manage`; bài kiểm chặn cả hai.
3. **Cùng đường.** Một hàm lệnh «đồng bộ danh mục» dùng chung cho nút «Đồng bộ ngay» (route `POST /api/catalog/sync`), Cron và đồng bộ lần đầu. Hàm hỏi `can(người phát lệnh, "catalog.sync")` trước khi ghi. Route giữ nguyên lời hỏi `admin.manage` đứng trước như hôm nay.
4. **Nhật ký.** Migration `0148` thêm cột `audit_log.agent_code` (chữ, rỗng được). Dòng do tác nhân ghi có mã tác nhân ở cột này và `staff_id` rỗng; mã lạ hoặc dòng có cả hai thì máy chủ từ chối dựng câu ghi. Màn Nhật ký vẫn hiện «Hệ thống (tự động)»; mã tác nhân không vào dữ liệu trả về trình duyệt.
5. **Lỗi không ném ra.** Tác nhân bị từ chối hay đồng bộ hỏng thì ghi vào trạng thái đồng bộ (`catalog_sync`), như các lỗi đồng bộ hôm nay.
6. **Chế độ bảo trì** không chặn tác nhân (giữ như hôm nay; chế độ bảo trì chặn theo số điện thoại đăng nhập, tác nhân không đăng nhập).
7. **Phần còn nợ, có tên.** Cron nhắc hạn trả sau (ADR-0173: ghi `bil_credit_reminder`, nhật ký `staff_id` rỗng) và Cron dọn ảnh vé (ADR-0156: ghi `vdt_ticket.r2_deleted_at`, không nhật ký) chưa có định danh. Theo D2, mặc định làm ở đợt sau; ghi ở dòng 1 tờ khai `docs/kernel-18.md`.
8. **Bước siết ở lần phát hành sau.** Sau khi bản này đã lên production: trigger cơ sở dữ liệu từ chối dòng `catalog_synced` mới thiếu người làm (expand–contract; không làm ở đợt này vì Worker cũ vẫn ghi rỗng).

**Cách hiểu Hiến chương 5.11 (chủ duyệt cùng ADR này).** «Có tài khoản riêng» được hiểu là có **định danh riêng có quyền riêng**, đúng chữ của bản Hiến chương chung (kho luật gốc), không bắt một tài khoản đăng nhập. «Gọi qua route có kiểm quyền như người» được hiểu, với tác nhân chạy ngay trong Worker, là gọi **đúng hàm lệnh mà route gọi**, qua cùng cổng `can()`.

## Lý do

Ba thuộc tính 5.11 cần (biết ai làm, quyền tối thiểu, không có lối tắt quanh cổng) đạt được mà không mở đường đăng nhập mới cho máy. Nút «Đồng bộ ngay» và Cron dùng chung một hàm, nên sau này ai sửa luật đồng bộ đều sửa một chỗ.

## Phương án bị loại

- **Tài khoản `staff` riêng cho Cron:** bảng `staff` bắt buộc số điện thoại duy nhất và mã PIN, nên phải bịa cả hai; tài khoản này hiện ra ở danh sách tài khoản, hộp chọn, số đếm; thêm một bề mặt đăng nhập.
- **Chỉ ghi chữ «Cron» vào nhật ký, không qua cổng:** không đạt «quyền riêng» và «cùng đường» của 5.11.
- **Cron gọi route HTTP thật bằng phiên máy:** phải dựng đường xác thực mới không qua Turnstile (ADR-0010 hệ quả (i)); thêm rủi ro, không thêm an toàn.
- **Cho tác nhân ô `admin.manage`:** thừa quyền.

## Hệ quả

- Thêm một ô quyền (`catalog.sync`), một cột nhật ký, một danh sách tác nhân; không đổi quyền của người nào, không có chữ mới trên màn hình.
- Xoá mục `HC-5.11` khỏi `docs/quyen-hoan.json` trong cùng lần sửa; cập nhật dòng 1 `docs/kernel-18.md`, dòng 5.11 bảng thi hành Hiến chương, `docs/SO-HANG-RAO.md`.
- Khi ADR này được duyệt, dòng Trạng thái của ADR-0010 thêm trỏ: «điều 3, câu ngoại lệ Cron: thay bởi ADR-0186».
- Tiêu chí nghiệm thu: mục 4 của đặc tả.
