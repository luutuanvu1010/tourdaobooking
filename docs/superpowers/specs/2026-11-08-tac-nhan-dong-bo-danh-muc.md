# Đặc tả — Tác vụ tự động có định danh riêng (đóng HC-5.11)

> **Trạng thái:** đề xuất 2026-11-08 (bản sửa lần 1 theo hai câu trả lời của chủ, ghi nguyên văn ở ADR-0186), chờ chủ duyệt ADR-0186. Chưa thi công phần chạm mã chạy thật. Hồ sơ có ngày: duyệt xong thì không sửa lại cho khớp hiện trạng.
> **Nguồn việc:** mục `HC-5.11` (mức HIGH, hạn 2026-11-15) trong `docs/quyen-hoan.json`. Chủ dự án 2026-11-08 chọn «Sửa trước hạn», rồi chọn làm luôn hai tác vụ tự động còn lại và cho Quản lý bán hàng bấm được nút đồng bộ.
> **Đi kèm:** `docs/adr/ADR-0186-tac-nhan-tu-dong-co-dinh-danh-rieng.md` (quyết định), `2026-11-08-trang-ghep-tac-nhan-nhat-ky.md` (trang ghép, `CLAUDE.md` §9).

## 1. Vì sao

Mỗi 15 phút máy chạy ba việc ghi dữ liệu mà không có định danh, không qua cổng kiểm quyền: đồng bộ bảng giá từ Google Sheet (`syncCatalog(env, null)`, nhật ký người làm rỗng), nhắc hạn trả sau (nhật ký người làm rỗng), dọn ảnh vé của lô đã huỷ (không nhật ký). Hiến chương 5.11 đòi mỗi tác nhân tự động có định danh riêng, quyền riêng, và phát lệnh qua cùng đường có kiểm quyền như người. ADR-0010 điều 3 đang chừa riêng việc đồng bộ ra, nên phải có ADR mới (ADR-0186).

## 2. Kiểm kê mọi tác vụ tự động (đọc từ mã ngày 2026-11-08)

| Tác vụ | Chạy khi | Ghi gì | Người làm trong nhật ký | Đợt này |
|---|---|---|---|---|
| Tự đồng bộ danh mục | Cron 15 phút (`wrangler.jsonc` `triggers.crons`), `runScheduledSync` | `catalog_item`, `catalog_sync`; nhật ký `catalog_synced` khi có thay đổi | rỗng | làm — `DONG_BO_DANH_MUC` |
| Đồng bộ lần đầu | lần đọc danh mục đầu tiên khi cơ sở dữ liệu chưa từng đồng bộ (`bootstrapIfNeverSynced`) | như trên | rỗng | làm — `DONG_BO_DANH_MUC` |
| Nhắc hạn trả sau (ADR-0173) | cùng Cron, `nhacHanTraSauAnToan` | `bil_credit_reminder`; nhật ký `credit_due_soon_reminded`, `credit_overdue_reminded` | rỗng | làm — `NHAC_HAN_TRA_SAU` |
| Dọn ảnh vé chờ xoá (ADR-0156) | cùng Cron, `donHangChoXoaVe` | xoá ảnh trong kho R2, ghi `vdt_ticket.r2_deleted_at` | không ghi nhật ký | làm — `DON_ANH_VE`, thêm một dòng nhật ký mỗi lượt có xoá |
| Trợ lý Mai | khi người dùng hỏi | chỉ bảng của trợ lý (`tl_*`), mã người là người hỏi; bộ nhớ đệm `tl_van_nghia` không có người | — | không phải tác nhân ghi dữ liệu nghiệp vụ |
| Trợ lý máy chạy thử (ADR-0145) | do chủ chạy tay | đọc gói mã nguồn ngoài hệ thống | — | không chạm hệ thống thật |

## 3. Cách làm (chi tiết, lý do ở ADR-0186)

1. **Ba định danh tác nhân** khai ở `src/shared/permissions.ts`; không phải tài khoản đăng nhập. Chỉ ba hàm định giờ (và đồng bộ lần đầu) dùng chúng.
2. **Ba ô quyền mới**, mỗi tác nhân giữ đúng một ô: `catalog.sync` (người: Quản lý bán hàng, Quản trị, Toàn quyền), `credit.due.remind`, `ve.kho.purge` (người: chỉ Toàn quyền trên bảng theo ADR-0014 điều 2, không có nút). `can()` là cổng chung.
3. **Cùng đường:** một hàm lệnh đồng bộ cho nút, Cron, đồng bộ lần đầu; route `POST /api/catalog/sync` chuyển sang cổng `office` và hỏi `catalog.sync`. Hai việc chỉ máy làm hỏi `can(tác nhân, ô)` trong chính hàm của việc.
4. **Nhật ký:** migration `0148` thêm cột rỗng được `audit_log.agent_code`. Dòng của tác nhân mang mã tác nhân, `staff_id` rỗng; không dòng nào có cả hai. Dọn ảnh vé thêm một dòng mỗi lượt có xoá (số ảnh, không mã vé). Màn Nhật ký vẫn hiện «Hệ thống (tự động)».
5. **Màn hẹp của Quản lý bán hàng** có nút «Đồng bộ ngay từ Google Sheet», y như màn của Quản trị; sửa bài hướng dẫn của Quản lý bán hàng.
6. **Lỗi không ném ra:** đồng bộ ghi lỗi vào `catalog_sync`; hai việc kia ghi một dòng log máy chủ như hôm nay.

## 4. Tiêu chí nghiệm thu (viết trước khi làm, kiểm được bằng máy)

- **N1.** Gọi đúng `runScheduledSync` trên khung thử SQLite (Sheet giả): dòng `catalog_synced` mới có `agent_code = 'DONG_BO_DANH_MUC'`, `staff_id` rỗng.
- **N2.** Danh mục trống, một tài khoản đọc danh mục lần đầu: dòng `catalog_synced` mang mã tác nhân, không mang mã người đọc.
- **N3.** Bỏ ô của tác nhân thì việc của nó không ghi gì vào dữ liệu nghiệp vụ và không ném ra (đồng bộ: ghi lỗi vào `catalog_sync`).
- **N4.** Nút đồng bộ với người: Quản lý bán hàng, Quản trị, Toàn quyền làm được, dòng nhật ký mang mã người, `agent_code` rỗng; Bán hàng thường, Kế toán nhận 403 và không ghi gì.
- **N5.** Nhắc hạn trả sau qua tác nhân: dòng nhật ký nhắc mang `agent_code = 'NHAC_HAN_TRA_SAU'`; tin nhắc vẫn tới đúng người như hôm nay.
- **N6.** Dọn ảnh vé qua tác nhân: ảnh hết hạn được xoá như hôm nay; có đúng một dòng nhật ký mới mang `agent_code = 'DON_ANH_VE'`, chi tiết không chứa mã vé.
- **N7.** Bài kiểm bản đồ quyền: mỗi ô của tác nhân có trong bản đồ; không tác nhân nào giữ ô ghi tiền hay `admin.manage`; `can(tác nhân, ô khác)` luôn sai; chỉ ba hàm định giờ (và đồng bộ lần đầu) dùng tác nhân.
- **N8.** Màn hẹp của Quản lý bán hàng hiện nút và đồng bộ được (kịch bản Chrome); màn của Bán hàng thường không có nút.
- **N9.** Kịch bản e2e `tests/e2e/catalog.mjs`, đoạn Cron: đọc `agent_code` bằng `sql()`, đúng mã tác nhân; màn Nhật ký vẫn hiện «Hệ thống (tự động)».
- **N10.** `npm test`, `npm run typecheck`, `npm run test:e2e` xanh; hàng rào N1, N3, N7 đã thấy chặn thật một lần (cố ý làm sai → đỏ → hoàn nguyên), có dòng ở `docs/SO-HANG-RAO.md`; người kiểm độc lập báo đạt.

## 5. Triển khai, hoàn tác, phần còn lại

- **Cần triển khai** (có migration): `npm run trien-khai` áp `0148` rồi deploy ngay. Mục HC-5.11 được xoá khỏi sổ trong cùng lần sửa nên bộ kiểm xanh ngay khi nhập; nhưng bản thật chỉ hết ghi rỗng **sau khi triển khai**, nên cần triển khai trước 15/11.
- **Hoàn tác:** quay về Worker cũ thì ba việc lại ghi rỗng như trước, Quản lý bán hàng mất nút; cột mới vô hại, giữ lại. Đợt này **không** thêm trigger chặn dòng thiếu người làm (Worker cũ vẫn ghi rỗng; expand–contract).
- **Để sau:** trigger từ chối mọi dòng nhật ký mới thiếu người làm, sau khi bản này đã lên production và lệnh chỉ đọc xác nhận không còn dòng mới thiếu người làm (ghi ở dòng 1 `docs/kernel-18.md`).
- **Xây trên lỗ đang hở:** không (xem ADR-0186).
- **Chưa kiểm:** số byte gói trang Đơn hàng sau khi thêm ba ô quyền (nới trần đúng số đo, có lý do ở commit).
