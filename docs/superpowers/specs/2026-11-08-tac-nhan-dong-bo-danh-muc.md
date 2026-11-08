# Đặc tả — Tác vụ tự đồng bộ danh mục có định danh riêng (đóng HC-5.11)

> **Trạng thái:** đề xuất 2026-11-08, chờ chủ duyệt ADR-0186. Chưa thi công phần chạm mã chạy thật. Hồ sơ có ngày: duyệt xong thì không sửa lại cho khớp hiện trạng.
> **Nguồn việc:** mục `HC-5.11` (mức HIGH, hạn 2026-11-15) trong `docs/quyen-hoan.json`. Chủ dự án 2026-11-08 chọn «Sửa trước hạn» (không gia hạn).
> **Đi kèm:** `docs/adr/ADR-0186-tac-nhan-tu-dong-co-dinh-danh-rieng.md` (quyết định), `2026-11-08-trang-ghep-tac-nhan-nhat-ky.md` (trang ghép, `CLAUDE.md` §9).

## 1. Vì sao

Mỗi 15 phút máy tự kéo bảng giá từ Google Sheet vào danh mục. Việc này ghi dữ liệu bằng `syncCatalog(env, null)`: không qua cổng kiểm quyền, và dòng nhật ký `catalog_synced` có người làm rỗng. Hiến chương 5.11 (Phần I `docs/ARCHITECTURE.md`, và bản chung ở kho luật gốc) đòi mỗi tác nhân tự động có định danh riêng, quyền riêng, và phát lệnh qua cùng đường có kiểm quyền như người. ADR-0010 điều 3 đang chừa riêng Cron này ra, nên muốn sửa phải có ADR mới (ADR-0186).

## 2. Kiểm kê mọi tác vụ tự động (đọc từ mã ngày 2026-11-08)

| Tác vụ | Chạy khi | Ghi gì | Người làm trong nhật ký | Đợt này |
|---|---|---|---|---|
| Tự đồng bộ danh mục | Cron 15 phút (`wrangler.jsonc` `triggers.crons`), `runScheduledSync` | `catalog_item`, `catalog_sync`; nhật ký `catalog_synced` khi có thay đổi | rỗng | **làm** |
| Đồng bộ lần đầu | lần đọc danh mục đầu tiên khi cơ sở dữ liệu chưa từng đồng bộ (`bootstrapIfNeverSynced`) | như trên | rỗng | **làm** (cùng hàm, cùng lỗi) |
| Nhắc hạn trả sau (ADR-0173) | cùng Cron 15 phút, `nhacHanTraSauAnToan` | `bil_credit_reminder`; nhật ký `credit_due_soon_reminded`, `credit_overdue_reminded` | rỗng | để sau (chờ chủ, D2) |
| Dọn ảnh vé chờ xoá (ADR-0156) | cùng Cron 15 phút, `donHangChoXoaVe` | xoá ảnh trong kho R2, ghi `vdt_ticket.r2_deleted_at` | không ghi nhật ký | để sau (chờ chủ, D2) |
| Trợ lý Mai | khi người dùng hỏi | chỉ bảng của trợ lý (`tl_*`), mã người là người hỏi; bộ nhớ đệm `tl_van_nghia` không có người | — | không phải tác nhân ghi dữ liệu nghiệp vụ |
| Trợ lý máy chạy thử (ADR-0145) | do chủ chạy tay | đọc gói mã nguồn ngoài hệ thống | — | không chạm hệ thống thật |

## 3. Cách làm (chi tiết và lý do ở ADR-0186)

1. **Định danh tác nhân** `DONG_BO_DANH_MUC`, khai một nơi trong mã. Không phải tài khoản đăng nhập: không số điện thoại, không PIN, không phiên, không hiện trong danh sách tài khoản.
2. **Quyền riêng:** thêm ô `catalog.sync` vào bản đồ quyền. Với người, ô này cho Quản trị và Toàn quyền, đúng như hôm nay ai bấm được «Đồng bộ ngay». Tác nhân chỉ giữ đúng ô này. `can()` là cổng chung cho cả người lẫn tác nhân.
3. **Cùng đường:** một hàm lệnh «đồng bộ danh mục» dùng chung cho nút «Đồng bộ ngay», Cron và lần đồng bộ đầu; hàm hỏi `can(người phát lệnh, "catalog.sync")` trước khi ghi.
4. **Nhật ký:** migration `0148` thêm cột rỗng được `audit_log.agent_code`. Dòng do tác nhân ghi có mã tác nhân ở cột này, `staff_id` rỗng; không dòng nào có cả hai. Màn Nhật ký vẫn hiện «Hệ thống (tự động)»; mã tác nhân không gửi về trình duyệt.
5. **Lỗi không ném ra:** tác nhân bị từ chối thì ghi vào trạng thái đồng bộ (`catalog_sync.last_error`) như các lỗi đồng bộ hôm nay.

## 4. Tiêu chí nghiệm thu (viết trước khi làm, kiểm được bằng máy)

- **N1.** Gọi đúng `runScheduledSync` trên khung thử SQLite (Sheet giả): dòng `catalog_synced` mới có `agent_code = 'DONG_BO_DANH_MUC'`, `staff_id` rỗng.
- **N2.** Danh mục trống, một tài khoản đọc danh mục lần đầu: dòng `catalog_synced` mang mã tác nhân, không mang mã người đọc.
- **N3.** Bỏ ô `catalog.sync` khỏi tác nhân thì Cron không ghi `catalog_item`, ghi lỗi vào `catalog_sync`, không ném ra.
- **N4.** Nút «Đồng bộ ngay» không đổi với người: Quản trị, Toàn quyền làm được, dòng nhật ký mang mã người, `agent_code` rỗng; Bán hàng, Kế toán vẫn bị từ chối.
- **N5.** Bài kiểm bản đồ quyền: mỗi ô của tác nhân có trong bản đồ; tác nhân không giữ ô ghi tiền nào; `can(tác nhân, ô khác)` luôn sai.
- **N6.** Kịch bản e2e `tests/e2e/catalog.mjs`, đoạn Cron: đọc cột `agent_code` bằng `sql()`, đúng mã tác nhân; màn Nhật ký vẫn hiện «Hệ thống (tự động)».
- **N7.** `npm test`, `npm run typecheck`, `npm run test:e2e` xanh; hàng rào N1/N3 đã thấy chặn thật một lần (cố ý làm sai → đỏ → hoàn nguyên), có dòng ở `docs/SO-HANG-RAO.md`; người kiểm độc lập báo đạt.

## 5. Triển khai, hoàn tác, phần còn lại

- **Cần triển khai** (có migration): `npm run trien-khai` áp `0148` rồi deploy ngay. Mục HC-5.11 được xoá khỏi sổ trong cùng lần sửa nên bộ kiểm xanh ngay khi nhập; nhưng bản thật chỉ hết ghi rỗng **sau khi triển khai**, nên cần triển khai trước 15/11.
- **Hoàn tác:** quay về Worker cũ thì Cron lại ghi rỗng như trước; cột mới vô hại, giữ lại. Đợt này **không** thêm trigger chặn dòng thiếu người làm, vì Worker cũ (khoảng giữa áp migration và deploy, hoặc khi quay lui) vẫn ghi rỗng và sẽ hỏng (expand–contract).
- **Để sau:** (a) trigger chặn dòng `catalog_synced` mới thiếu người làm, sau khi bản này đã lên production; (b) hai Cron còn lại (D2); hai việc ghi ở dòng 1 tờ khai `docs/kernel-18.md`.
- **Xây trên lỗ đang hở:** không. Ba mục còn mở (`TNV-G1`, `HC-4.2`, `HC-5.19`) và các ô hoãn của sổ không thuộc vùng định danh hay nhật ký.
- **Chưa kiểm:** dung lượng gói trang (`src/goi-trang-nhe.test.ts`) sau khi `permissions.ts` thêm ô và danh sách tác nhân; kiểm khi thi công.
