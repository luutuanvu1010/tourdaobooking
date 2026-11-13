# Trình chủ: màn sửa chi tiết dịch vụ (Dịch vụ và Giá) — 2026-11-13

> Trạng thái: **bản nháp chờ chủ chọn 3 câu**. Chưa thi công. Sau khi chủ chọn: viết ADR + đặc tả đủ (kèm trang ghép vì chạm dữ liệu, tiền, quyền — CLAUDE.md §9), rồi kế hoạch.

## Yêu cầu của chủ (13/11, nguyên ý)
Màn hình sửa chi tiết **mọi trường** của một dịch vụ trong trang «Dịch vụ và Giá»: mã nhận dạng, tên, mô tả, cách tính giá (theo lượt; theo người — người lớn, trẻ em, cao tuổi, em bé mặc định giá 0), ảnh đại diện, các ghi chú/cờ (Cần kiểm vé, Đưa đón, Có vé, Đang bán / Tạm ngưng bán, giá theo mùa…).

## Hiện trạng (đã kiểm mã 13/11)
- Danh mục **chép từ Google Sheet**; mỗi lần đồng bộ ghi đè mã, tên, đơn vị, giá (`catalog/sheet.ts`, `syncCatalog`). Thứ sửa trong Nền tảng sống được là vì nằm ở **lớp ghi đè** riêng (giá ghi đè, ẩn dịch vụ).
- Đã sửa được trong Nền tảng nhưng **rải ở nhiều chỗ** trên trang: giá từng loại khách (ghi đè), Ngưng bán/Bán lại, nhóm, Đưa đón (luôn/không), Có vé + nguồn vé, Cần kiểm vé.
- **Chưa có**: mô tả, ảnh, sửa mã/tên, giá «theo lượt» trọn gói (hiện chỉ có «mỗi khách» và «nhóm N khách»), giá theo mùa. Em bé không giá hiện nghĩa là «không bán cho em bé», chưa phải «miễn phí».
- Đã có văn bản nói Sheet là nguồn gốc (ADR-0152 từ chối thêm cột vào bảng chép Sheet; BACKLOG §45 `BL-GOPY-HT-SAN-PHAM-DONG-MO` chờ chủ quyết).

## Bố cục màn đề xuất (giống nhau cho cả 3 phương án câu 1)
Bấm một dịch vụ trong danh sách → mở **bảng trượt «Chi tiết dịch vụ»** (máy tính: bảng bên phải; iPhone: toàn màn), chia 4 khối, mỗi khối một nút lưu riêng:
1. **Thông tin**: mã (chỉ đọc), tên, mô tả, ảnh đại diện (chọn ảnh, máy tự thu nhỏ).
2. **Giá**: cách tính (Mỗi khách / Nhóm N khách / Trọn lượt), bảng giá 4 loại khách; em bé để trống ⇒ hiện câu rõ «0 ₫ — miễn phí» hay «không bán».
3. **Bán**: Đang bán ↔ Tạm ngưng bán, nhóm, Có vé + nguồn vé, Cần kiểm vé, Đưa đón.
4. **Giá theo mùa** (đợt sau): danh sách khoảng ngày + giá.
Khối 3 chỉ **gom các công tắc đã có** về một chỗ (không đổi luật, không đổi quyền) — làm được ngay, rủi ro thấp.

## Ba câu chủ cần chọn

**Câu 1 — Ai là nguồn của tên, giá, mã?**
- **A (khuyến nghị):** Sheet vẫn là nguồn của mã, tên, giá gốc; Nền tảng giữ thêm mô tả, ảnh, cờ, và **ghi đè** tên/giá như giá đang làm (đồng bộ không xoá chỉnh sửa, có cảnh báo khi Sheet đổi). Được: không phá quy trình Sheet hiện tại. Mất: thêm dịch vụ mới vẫn phải thêm ở Sheet.
- **B:** Chuyển hẳn danh mục vào Nền tảng, ngưng đồng bộ Sheet; tạo dịch vụ mới ngay trên Nền tảng. Được: một chỗ duy nhất. Mất: đổi lớn (một chiều), người đang sửa Sheet phải đổi thói quen.
- **C:** Giữ Sheet, chỉ thêm cột mô tả/ảnh/cờ vào Sheet. Được: ít việc. Mất: không sửa được trên iPhone, ảnh trong Sheet khó.

**Câu 2 — Mã nhận dạng có được sửa không?**
- **Khuyến nghị: không sửa mã của dịch vụ đã có** (đơn cũ, vé, hoa hồng đều trỏ theo mã; đổi mã làm gãy lịch sử). Nếu chủ cần «mã đẹp» để hiện cho khách, thêm ô **«mã hiển thị»** sửa được, mã gốc giữ nguyên.

**Câu 3 — Làm phần nào trước?**
- **Khuyến nghị:** Đợt 1 = khối Thông tin (tên ghi đè, mô tả, ảnh) + gom khối Bán. Đợt 2 = giá Trọn lượt + em bé 0 ₫ (đổi cách tính tiền đơn ⇒ cần ADR riêng, bài kiểm tiền). Đợt 3 = giá theo mùa (đổi cách tính tiền theo ngày đi, ảnh hưởng hoa hồng ⇒ ADR riêng).
- Ảnh đại diện cần một kho ảnh mới (kho R2 riêng cho danh mục) — chủ phải tự chạy một lệnh tạo kho khi triển khai.

## Điều chưa chắc
- Chưa hỏi người đang quản lý Sheet: họ có còn muốn sửa giá ở Sheet không (quyết câu 1).
- «Theo lượt» có nghĩa trọn gói một xe/một thuyền bất kể số khách, hay khác? Cần chủ xác nhận khi làm đợt 2.

## Chủ chọn (13/11)
- Câu 1: **A — Sheet + ghi đè** (chủ bấm nút). Câu 2, câu 3: chủ không trả lời, dùng khuyến nghị. Văn bản soạn tiếp: `docs/adr/ADR-0199-chi-tiet-dich-vu-sheet-va-ghi-de.md` (proposed).
