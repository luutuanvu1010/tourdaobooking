# ADR-0199 — Chi tiết dịch vụ: Sheet giữ gốc, Nền tảng giữ mô tả, ảnh và tên ghi đè (đợt 1)

- **Trạng thái:** **proposed** 2026-11-13. Chủ dự án yêu cầu trong chat (phiên `claude/fix-receipt-service-edit-4f4aae`), nguyên ý: màn sửa chi tiết mọi trường của dịch vụ trong «Dịch vụ và Giá» (mã, tên, mô tả, cách tính giá, ảnh, các cờ, giá theo mùa). Trang trình `docs/superpowers/specs/2026-11-13-trinh-chu-sua-chi-tiet-dich-vu.md`; chủ bấm **«A: Sheet + ghi đè»** cho câu 1. Câu 2 (không sửa mã) và câu 3 (thứ tự đợt) chủ không trả lời: dùng **khuyến nghị** của trang trình, ghi ở đây; chủ nói khác thì sửa. Lời chọn A là đồng ý **hướng soạn**, chưa phải duyệt văn bản này (Hiến pháp N3).
- **Loại:** việc lớn (dữ liệu: bảng mới, kho ảnh mới). **Cửa:** hai chiều mềm (bảng chỉ thêm và kho mới; bỏ được mà không mất dữ liệu đơn).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1–Đ3). Trang ghép ở cuối tệp.
- **Xây trên lỗi an toàn chưa sửa:** không.
- **Quan hệ với ADR cũ:** **giữ** ADR-0152 (không thêm cột vào bảng chép Sheet — văn bản này dùng bảng riêng); **giữ** ADR-0146, ADR-0174, ADR-0136, ADR-0058 (công tắc Bán, Có vé, Cần kiểm vé, nhóm: chỉ gom về một chỗ trên màn, không đổi luật hay quyền). Đóng một phần BACKLOG §45 `BL-GOPY-HT-SAN-PHAM-DONG-MO` (công tắc từng dịch vụ đã có từ ADR-0146; nay hiện ở khối Bán).

## Bối cảnh
Danh mục chép từ Google Sheet; mỗi lần đồng bộ ghi đè mã, tên, đơn vị, giá. Chỉnh sửa trong Nền tảng sống được nhờ lớp ghi đè riêng (giá, ẩn). Mô tả, ảnh chưa có chỗ chứa. Dòng dịch vụ trong đơn chụp tên lúc lập (`order_service.name`), nên đổi tên không làm đổi đơn cũ.

## Đ1 — Sheet giữ gốc; Nền tảng giữ lớp «chi tiết»
1. Sheet vẫn là nguồn của **mã, tên gốc, đơn vị (cách tính), giá gốc**. Thêm dịch vụ mới vẫn thêm ở Sheet.
2. Bảng mới chỉ thêm `ctl_service_detail` (module `catalog`, tệp nửa nghiêm `defineSql`): mã dịch vụ, **tên hiển thị** (để trống = dùng tên Sheet), **mô tả** (≤ 2.000 ký tự, chữ thuần), **khoá ảnh**, `valid_from/to`, người ghi. Sửa = đóng dòng cũ, chèn dòng mới. Đồng bộ Sheet **không chạm** bảng này.
3. Mọi chỗ đọc tên dịch vụ từ danh mục (ô chọn dịch vụ, danh sách) dùng tên hiển thị nếu có. Đơn đã lập giữ tên đã chụp.
4. Sheet đổi tên của dịch vụ đang có tên hiển thị: màn hiện cả hai tên kèm câu «Tên trên Sheet đã đổi thành …», không tự bỏ tên hiển thị.

## Đ2 — Không sửa mã dịch vụ
Mã chỉ đọc trên màn (đơn, vé, hoa hồng đều trỏ theo mã). Ô «mã hiển thị» cho khách: chưa làm, ghi BACKLOG.

## Đ3 — Ảnh đại diện ở kho riêng
1. Kho R2 mới `ANH_DICH_VU`, chỉ module `catalog` dùng. Nhận JPEG/PNG/WebP; trình duyệt thu nhỏ trước khi gửi (dùng lại `web/thu-nho-anh.ts`), máy chủ nhận ≤ 1 MB và kiểm chữ ký tệp.
2. Xem ảnh qua Worker, cùng cổng `office` với route danh mục (ảnh không phải dữ liệu riêng tư). Ảnh cũ không xoá khỏi kho (lịch sử theo dòng `ctl_service_detail`).
3. Chủ tự chạy một lệnh tạo kho khi triển khai (runbook ghi lệnh).

## Quyền
Ghi tên hiển thị, mô tả, ảnh: thao tác hiện có `admin.manage` (Quản trị, Toàn quyền — cùng người đang sửa giá ghi đè). Không thêm mã thao tác mới. Các công tắc ở khối Bán giữ đúng quyền riêng của từng công tắc.

## Ngoài phạm vi (đợt sau, mỗi đợt một ADR)
Giá «trọn lượt» và em bé 0 ₫ (đổi cách tính tiền đơn); giá theo mùa (tính theo ngày đi, chạm hoa hồng).

## Trang ghép (CLAUDE.md §9)
1. **Bảng `ctl_service_detail` chứa:** chỉ chi tiết hiển thị của dịch vụ danh mục (một loại thực thể). Không tiền, không dữ liệu người.
2. **Bản đồ quyền chạm bảng:** ghi — `admin.manage`; đọc — tài khoản văn phòng qua route danh mục sẵn có (cổng `office`, ADR-0033). Đối tác, Thực tập không gọi route danh mục hôm nay; văn bản này không mở thêm cho họ (tên hiển thị chỉ tới họ qua tên chụp trong đơn).
3. **Cổng:** route ghi mới ở `catalog/index.ts` khai `access: "office"` + `can(staff, "admin.manage")`; giao diện ẩn khối sửa khi `can` sai (máy chủ kiểm lại). Kho `ANH_DICH_VU` chỉ đọc/ghi qua route của `catalog`. Không chỗ ẩn/hiện nào hiện có bị đổi nghĩa.

## Hệ quả
- Một migration bảng chỉ thêm; `docs/data-dictionary.json` + `npm run dict`.
- Màn «Dịch vụ và Giá»: bảng trượt «Chi tiết dịch vụ» bốn khối (Thông tin, Giá, Bán, Giá theo mùa — khối cuối để trống tới đợt sau).
- Bài kiểm: đồng bộ Sheet không chạm tên hiển thị; tên hiển thị thắng tên Sheet ở ô chọn; đơn cũ giữ tên chụp; ảnh sai loại/quá cỡ bị từ chối; không có `admin.manage` ⇒ 403.
