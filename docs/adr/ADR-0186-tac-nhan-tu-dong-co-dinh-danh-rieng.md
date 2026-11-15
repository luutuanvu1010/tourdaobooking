# ADR-0186 — Tác nhân tự động có định danh riêng, đi qua cùng cổng quyền; Quản lý bán hàng được đồng bộ danh mục

- **Trạng thái:** **accepted** 2026-11-08 — chủ dự án duyệt trong hộp hỏi, nguyên văn: «Duyệt ADR-0186», trả lời câu «Tôi đã sửa ADR-0186 đúng theo hai câu trả lời của bạn … Bạn có duyệt bản sửa này không?» (bản sửa lần 1). Tên dòng nhật ký ở Đ4, chủ chọn cùng lượt: «Xoá ảnh vé hết hạn lưu». Luật cũ (ADR-0010 điều 3 chừa Cron đồng bộ danh mục; ADR-0169 Đ4 màn hẹp không đồng bộ) còn áp tới khi mã mới qua tiêu chí nghiệm thu. (Trước đó: proposed 2026-11-08, bản đầu và bản sửa lần 1.)
- **Chủ đã chọn (hộp hỏi 2026-11-08, nguyên văn):** câu «duyệt ADR-0186?» — «Để cho nút Đồng Bộ hiển thị và hoạt động với Quản lý bán hàng, Quản trị và Toàn quyền. Để khi cần thì chủ động đồng bộ bảng giá từ Sheet»; câu «hai tác vụ còn lại làm luôn hay để sau?» — «Làm luôn trong đợt này». Đây là câu trả lời, chưa phải lệnh «Duyệt». AI hiểu như sau (chủ sửa nếu sai): (1) Quản lý bán hàng bấm được «Đồng bộ ngay từ Google Sheet» ở màn hẹp, nút làm y như của Quản trị, kể cả hộp hỏi khi Sheet sắp làm ẩn hơn nửa dịch vụ; (2) đợt này làm cả ba tác vụ tự động.
- **Ngày:** 2026-11-08. **Loại:** việc lớn (quyền, nhật ký, migration, giao diện) — thi công xong cần người kiểm độc lập chỉ đọc (`CLAUDE.md` §3).
- **Cửa:** hai chiều về hành vi; một chiều ở chỗ cột mới của nhật ký và các dòng nhật ký đã ghi ở lại (nhật ký chỉ-thêm).
- **Thay / sửa:** câu «Ngoại lệ đã có, giữ nguyên» của ADR-0010 điều 3; chữ «đồng bộ» trong câu «Không có giá ghi đè, đồng bộ, sửa nhóm» của ADR-0169 Đ4; câu «route `POST /api/catalog/sync` hỏi `admin.manage`» (hiện trạng mã). Không sửa nguyên văn các ADR đó.
- **Liên quan:** Hiến chương 5.11, 5.12, 5.15 (Phần I `docs/ARCHITECTURE.md`; bản chung ở kho luật gốc); ADR-0007, ADR-0014 điều 2, ADR-0019, ADR-0156, ADR-0169, ADR-0173; mục `HC-5.11` của `docs/quyen-hoan.json`; đặc tả và trang ghép cùng ngày ở `docs/superpowers/specs/`.
- **Xây trên lỗ đang hở:** không. Các mục còn mở (`TNV-G1`, `HC-4.2`, `HC-5.19`, các ô hoãn) không thuộc vùng định danh, nhật ký; tác vụ nhắc hạn chỉ đổi người làm trong nhật ký, không đổi cách tính nợ.
- **Số quyết định chủ cần chốt:** 2 — duyệt bản sửa này; chọn tên dòng nhật ký mới của việc dọn ảnh vé (Đ4). **Đã chốt cả hai** (xem dòng Trạng thái).

## Bối cảnh

Cron mỗi 15 phút chạy ba việc ghi dữ liệu không có định danh: đồng bộ danh mục (`syncCatalog(env, null)`, nhật ký `staff_id` rỗng), nhắc hạn trả sau (nhật ký `staff_id` rỗng), dọn ảnh vé của lô đã huỷ (không nhật ký). Đồng bộ lần đầu khi danh mục chưa từng đồng bộ cũng ghi rỗng. Không việc nào qua `can()`. Hiến chương 5.11 không chừa tác nhân nào.

## Quyết định

1. **Định danh tác nhân.** Mỗi tác nhân có một mã cố định khai ở `src/shared/permissions.ts`: `DONG_BO_DANH_MUC` (đồng bộ danh mục, kể cả lần đầu), `NHAC_HAN_TRA_SAU` (nhắc hạn trả sau), `DON_ANH_VE` (xoá ảnh vé hết hạn lưu). Tác nhân không phải tài khoản đăng nhập: không số điện thoại, không PIN, không phiên, không hiện ở danh sách tài khoản. Chỉ mã định giờ (và đồng bộ lần đầu) được dùng tác nhân; bài kiểm canh chỗ dùng.
2. **Quyền riêng, cổng chung.** Ba ô mới trong bản đồ quyền, mỗi tác nhân giữ đúng một ô:
   - `catalog.sync` — người: Quản lý bán hàng, Quản trị, Toàn quyền; tác nhân `DONG_BO_DANH_MUC`.
   - `credit.due.remind` — tác nhân `NHAC_HAN_TRA_SAU`; với người chỉ Toàn quyền có trên bảng (ADR-0014 điều 2 bắt Toàn quyền có mọi ô), không có nút hay route nào cho người.
   - `ve.kho.purge` — tác nhân `DON_ANH_VE`; như trên.
   `can()` là cổng chung cho người lẫn tác nhân. Tác nhân không giữ mã quyền nào của người, nên mọi cổng router đều từ chối nó. Tác nhân không bao giờ giữ ô ghi tiền (`O_GHI_TIEN`) hay `admin.manage`; bài kiểm chặn.
3. **Cùng đường.** Đồng bộ danh mục: một hàm lệnh dùng chung cho nút, Cron và đồng bộ lần đầu, hỏi `can(người phát lệnh, "catalog.sync")` trước khi ghi. Route `POST /api/catalog/sync` chuyển từ cổng `admin` sang `office` và hỏi `catalog.sync` thay cho `admin.manage`, để Quản lý bán hàng qua được; Bán hàng thường, Kế toán vẫn bị từ chối. Nhắc hạn và dọn ảnh chỉ máy làm: hàm của mỗi việc hỏi `can(tác nhân, ô)` trước khi ghi.
4. **Nhật ký.** Migration `0148` thêm cột `audit_log.agent_code` (chữ, rỗng được). Dòng do tác nhân ghi có mã tác nhân ở cột này, `staff_id` rỗng; mã lạ hoặc dòng có cả hai thì máy chủ từ chối dựng câu ghi. Đồng bộ và nhắc hạn giữ nguyên các dòng nhật ký hôm nay, chỉ thêm mã tác nhân. Dọn ảnh vé thêm **một** dòng nhật ký mới mỗi lượt có xoá (chỉ số ảnh, không mã vé, không khoá kho); tên dòng do chủ chọn. Màn Nhật ký vẫn hiện «Hệ thống (tự động)» ở cột người làm; mã tác nhân không gửi về trình duyệt.
5. **Màn hẹp của Quản lý bán hàng** có nút «Đồng bộ ngay từ Google Sheet» (cùng tên, cùng câu báo kết quả, cùng hộp hỏi như màn của Quản trị). Bài hướng dẫn của Quản lý bán hàng sửa câu «không đồng bộ danh mục».
6. **Lỗi không ném ra.** Đồng bộ bị từ chối hay hỏng thì ghi vào trạng thái đồng bộ (`catalog_sync`); nhắc hạn và dọn ảnh bị từ chối thì chỉ ghi một dòng log máy chủ, như lỗi của hai việc này hôm nay.
7. **Chế độ bảo trì** không chặn tác nhân (giữ như hôm nay; bảo trì chặn theo số điện thoại đăng nhập).
8. **Bước siết ở lần phát hành sau.** Khi bản này đã lên production và một lệnh chỉ đọc cho thấy không còn dòng nhật ký mới nào thiếu người làm, thêm trigger từ chối mọi dòng nhật ký mới thiếu cả `staff_id` lẫn `agent_code` (expand–contract; đợt này chưa làm vì Worker cũ vẫn ghi rỗng).

**Cách hiểu Hiến chương 5.11 (chủ duyệt cùng ADR này).** «Có tài khoản riêng» = có **định danh riêng có quyền riêng**, đúng chữ bản Hiến chương chung, không bắt tài khoản đăng nhập. «Gọi qua route có kiểm quyền như người», với tác nhân chạy ngay trong Worker = gọi **đúng hàm lệnh mà route gọi** (việc có nút) hoặc hàm lệnh duy nhất của việc (việc chỉ máy làm), qua cùng cổng `can()`.

## Lý do

Đạt ba điều 5.11 cần (biết ai làm, quyền tối thiểu, không lối tắt quanh cổng) mà không mở đường đăng nhập mới cho máy. Nút và Cron dùng chung một hàm, sửa luật đồng bộ chỉ sửa một chỗ.

## Phương án bị loại

- **Tài khoản `staff` riêng cho Cron:** bảng `staff` bắt buộc số điện thoại duy nhất và PIN, phải bịa cả hai; tài khoản hiện ra ở danh sách, hộp chọn, số đếm; thêm bề mặt đăng nhập.
- **Chỉ ghi chữ «Cron» vào nhật ký, không qua cổng:** không đạt «quyền riêng», «cùng đường».
- **Cron gọi route HTTP bằng phiên máy:** phải dựng đường xác thực mới không qua Turnstile (ADR-0010 hệ quả (i)).
- **Cho tác nhân ô sẵn có rộng hơn (`admin.manage`, `ve.kho.manage`):** thừa quyền.

## Hệ quả

- Ba ô quyền, một cột nhật ký, một danh sách tác nhân, một dòng nhật ký mới; quyền người đổi đúng một chỗ: Quản lý bán hàng được đồng bộ danh mục. Gói trang Đơn hàng nhúng bản đồ quyền nên trần dung lượng nới đúng số đo (`src/goi-trang-nhe.test.ts`).
- Xoá mục `HC-5.11` khỏi `docs/quyen-hoan.json` trong cùng lần sửa; cập nhật dòng 1 `docs/kernel-18.md`, dòng 5.11 bảng thi hành Hiến chương, `docs/SO-HANG-RAO.md`, bảng tham chiếu cho nút ở màn hẹp.
- Khi ADR này được duyệt: dòng Trạng thái của ADR-0010 và ADR-0169 thêm trỏ về ADR-0186.
- Tiêu chí nghiệm thu: mục 4 của đặc tả.
