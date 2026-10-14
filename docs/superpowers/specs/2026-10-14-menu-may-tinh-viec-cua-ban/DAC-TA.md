# Thiết kế lại menu máy tính và khối "Việc của bạn" ở Trang chủ

> Trạng thái: **chủ đã duyệt 3 điểm ngày 2026-10-14** (xem §7); chờ dựng mô phỏng. Phạm vi lần này: đặc tả + bản mô phỏng trên Claude Design. **Chưa sửa mã.** Điện thoại không đổi.
> Số liệu bên dưới đọc từ mã thật ngày 14/10 (hàm `thanhBen()`, `web/home.ts`, các route); không có số giả.

## 1. Vấn đề (đo được)

| Vai | Số mục menu hôm nay | Ghi chú |
|---|---|---|
| Quản trị | 24 (+1 dòng cha "Vận chuyển") | cụm Vận chuyển 11 mục con chiếm nửa menu |
| Toàn quyền | 31 | |
| Kế toán | 14 | trộn lẫn mục hằng ngày với mục tháng/quý |
| Bán hàng | 10 | gọn nhất trong nhóm văn phòng |
| Tài xế / Hướng dẫn viên / Đối tác / Thực tập / Nhân sự | 3–6 | đã gọn; riêng hướng dẫn viên đang thiếu mục Đơn hàng (lệch ADR-0017) |

Hai nguyên nhân: (1) menu xếp theo **tên trang**, không theo **việc người ta làm**; (2) mục hằng ngày và mục cài đặt ít dùng nằm chung một danh sách. Trang chủ có số liệu nhưng chưa trả lời "việc dang dở của tôi là gì, bấm đâu để làm tiếp".

## 2. Mục tiêu và tiêu chí nghiệm thu (hành vi kiểm được)

1. Mọi vai nhìn Trang chủ trong **5 giây** nói được: có việc gì chờ mình, việc nào gấp nhất, bấm đâu để làm.
2. Mục hiện sẵn trong menu (chưa mở "Thiết lập") **tối đa 10** cho mọi vai; Quản trị/Toàn quyền giảm từ 24/31 xuống ≤ 10 hiện sẵn.
3. Không mục nào mất đường vào: mục nào hôm nay một vai thấy thì sau đổi vẫn tới được trong **≤ 2 lần bấm** (kể cả mở "Thiết lập").
4. Không vai nào thấy thêm mục mà hôm nay không thấy; quyền vẫn do `can()` quyết, cùng bảng với máy chủ.
5. Mọi con số trên Trang chủ có **nguồn thật** (bảng §5). Việc chưa có nguồn đếm thì **không vẽ số**.
6. Tab bar và giao diện điện thoại giữ nguyên.

## 3. Nguyên tắc UX (kiểu Anthropic: yên tĩnh, ít chữ, một ưu tiên mỗi lúc)

- **Một việc chính mỗi màn.** Trang chủ có đúng một khối nổi bật "Việc của bạn"; phần còn lại lùi xuống.
- **Việc trước, nơi chốn sau.** Menu đặt tên theo việc ("Đơn hàng", "Vận chuyển", "Tiền"), không theo kỹ thuật.
- **Ít mà đủ.** Hằng ngày hiện sẵn; ít dùng gom một nhóm "Thiết lập" mặc định đóng, nhớ trạng thái mở/đóng theo máy.
- **Số chỉ khi có việc.** Không có việc thì không hiện huy hiệu, không hiện thẻ trống; trạng thái rỗng nói rõ "Hôm nay không có việc chờ bạn".
- **Mỗi thẻ có đúng một bước tiếp theo** (một nút), nhãn là động từ: "Xác nhận đơn", "Ghi thu", "Duyệt".
- **Màu có nghĩa:** san hô chỉ cho hành động chốt; cát cho "cần để ý"; xanh chủ đạo cho điều hướng. Không dùng màu làm trang trí. Giữ token hiện có (`public/app.css`, Be Vietnam Pro).
- Chữ tối thiểu 14px trong menu, 16px ô gõ; vùng chạm ≥ 36px; tương phản đạt AA; thao tác được bằng bàn phím (thứ tự Tab, `aria-current`, nhóm thu gọn dùng `aria-expanded`).

## 4. Cấu trúc menu đề xuất (máy tính ≥ 900px)

Menu chia theo **việc**, tiêu đề nhóm chữ nhỏ, nhóm rỗng ẩn cả tiêu đề (giữ luật hiện nay).

| Nhóm | Mục (hiện nếu `can()` cho phép như hôm nay) |
|---|---|
| (không tiêu đề) | Trang chủ · Đơn hàng *(huy hiệu: đơn nháp)* · Tạo đơn *(nút nổi bật)* · Danh bạ |
| VẬN CHUYỂN *(người có `trip.view`)* | Điều phối xe · Xe đang chạy · Đề nghị chuyển khách · **Xe & giấy tờ** *(mục gộp → trang Xe, kèm Lịch xe bận, Sắp hết hạn; huy hiệu: giấy sắp hết hạn)* · **Giá & chi phí** *(Bảng giá thuê xe, Bảng kê chi phí xe)* |
| TIỀN *(người có quyền sổ)* | Điều chỉnh công nợ · Khoá sổ tháng · Hoa hồng đối tác · Người bán dịch vụ |
| THIẾT LẬP *(mặc định đóng)* | Dịch vụ & giá · Địa điểm · Loại giấy tờ cá nhân · Loại giấy tờ xe · Lý do điều phối · Chính sách điều phối · Quản lý tài khoản · Phiên đăng nhập · Nhật ký · Gửi thông báo · Trợ lý Hỗ trợ · Giao diện |
| Chân menu (luôn hiện) | Của tôi · Góp ý / Báo lỗi · Trợ giúp · avatar + đăng xuất |

Hệ quả đếm (chưa mở Thiết lập): Bán hàng ≈ 4 + 3 (Vận chuyển) + Hoa hồng/Người bán = tối đa 10; Kế toán ≈ 3 + 5 + 4 = 12 → cần cắt "Người bán dịch vụ" và "Hoa hồng đối tác" xuống Thiết lập để đạt ≤ 10 (**điểm chủ quyết 2**); Quản trị/Toàn quyền ≈ 4 + 5 = 9, phần còn lại trong Thiết lập.

"Xe & giấy tờ" và "Giá & chi phí" là mục gộp: bấm vào ra trang gốc có thẻ chuyển nhanh sang các trang anh em (trang đã có sẵn, không viết lại).

## 5. Trang chủ máy tính: khối "Việc của bạn"

Đặt trên cùng, ngay dưới lời chào. Tối đa **4 thẻ**, xếp theo độ gấp. Mỗi thẻ: nhãn việc · số · một dòng giải thích · một nút. Chỉ hiện thẻ có số > 0; không có thẻ nào thì hiện dòng "Hôm nay không có việc chờ bạn" + nút Tạo đơn.

Thẻ theo vai, **chỉ dùng nguồn đã có**:

| Vai | Thẻ (nút) | Nguồn số hiện có |
|---|---|---|
| Bán hàng | Đơn nháp chờ xác nhận *(Xem đơn nháp)* · Đơn chưa có người phụ trách *(Nhận / giao)* · Còn thiếu tiền *(Xem đơn)* · Chuyến đón hôm nay *(Mở lịch)* | `draftCount`, `unassignedCount`, `unpaid-summary`, `today` |
| Kế toán | Còn thiếu tiền *(Ghi thu)* · Đề nghị điều chỉnh chờ duyệt *(Duyệt)* · Cọc cần chi hoàn *(Xem cọc)* · Đơn nháp *(Xem)* | `unpaid-summary`, `adjustment-requests.choDuyetChoToi`, `GET /api/ledger/coc/dem` |
| Quản trị | Cần xem lại (giấy tờ sắp hết hạn · dịch vụ lệch giá) *(Xử lý)* · Đề nghị chuyển khách *(Duyệt)* · Đơn nháp · Chưa phụ trách | `dashboard-review`, `demSapHetHan`, `dem-xung-dot`, `draftCount`, `unassignedCount` |
| Toàn quyền | như Quản trị + Góp ý chưa xử lý | + `feedback/badge` |
| Tài xế (công ty/đối tác) | Cuốc hôm nay *(Mở cuốc)* · Giấy tờ sắp hết hạn *(Xem)* | `cuoc-cua-toi`, `documents/mine` |
| Hướng dẫn viên | Đơn tự do chờ nhận *(Nhận đơn)* · Đơn của tôi còn thu tiền *(Ghi thu)*; menu có mục **Đơn hàng** (đơn tự do + đơn mình phụ trách) | `orders/pool`, `dispatch/mine` + `ledger/balances` |
| Đối tác / Thực tập | Chưa có số đếm riêng → trang hiện chỉ hai lối: "Tạo đơn" và "Đơn của tôi" | — |
| Nhân sự | Chưa có số đếm riêng → lối vào "Quản lý tài khoản" | — |

Phần dưới "Việc của bạn" giữ nguyên các khối đã duyệt (Chuyến đón theo ngày, Doanh thu tuần, Lối tắt), chỉ thu gọn Lối tắt vì menu đã gọn.

**Chưa có nguồn đếm → KHÔNG vẽ số** (làm sau, mỗi mục cần quyết định riêng vì chạm hợp đồng API): đơn "của tôi cần làm" cho Bán hàng; đơn sắp đi chưa có xe; chuyến chưa xếp xe; đơn đã giao chờ Kế toán "Hoàn thành"; lần thu giữ hộ chờ Kế toán xác nhận; đề nghị chuyển khách chờ duyệt không theo ngày.

## 6. Luồng mô phỏng theo vai (kịch bản bản mô phỏng phải vẽ được)

1. **Bán hàng, sáng thứ Hai:** vào Trang chủ → thấy "3 đơn nháp chờ xác nhận" → bấm → danh sách đơn nháp → mở đơn → xác nhận → quay Trang chủ, số còn 2.
2. **Bán hàng, khách gọi đặt tour:** bấm "Tạo đơn" (luôn nổi bật, không cần tìm) → 4 bước lập đơn đã có.
3. **Kế toán, cuối ngày:** Trang chủ → "5 đơn còn thiếu tiền" → Ghi thu; "1 đề nghị điều chỉnh chờ duyệt" → Duyệt; cuối tháng → Tiền › Khoá sổ tháng.
4. **Quản trị, đầu giờ:** "Cần xem lại: 2 giấy tờ xe sắp hết hạn, 1 dịch vụ lệch giá" → xử lý; "Đề nghị chuyển khách" → Duyệt; việc cài đặt (tài khoản, địa điểm) mở Thiết lập khi cần.
5. **Điều phối xe:** Vận chuyển › Điều phối xe → xếp xe cho chuyến → Xe đang chạy theo dõi.
6. **Tài xế:** vào thẳng trang đầu tài xế → "Cuốc hôm nay" → Mở cuốc.
7. **Hướng dẫn viên:** "Đơn chờ nhận" → Nhận đơn → sau tour ghi thu → Hoàn tất.
8. **Toàn quyền:** như Quản trị + Góp ý chưa xử lý; Nhật ký/Phiên/Chính sách trong Thiết lập.
9. **Trạng thái rỗng, lỗi mạng, bảo trì:** thẻ lỗi nguồn hiện "—" và nút "Thử lại" (như ô tiền hôm nay), không làm sập cả khối.

## 7. Quyết định của chủ (14/10, đã chốt)

1. **Duyệt cấu trúc §4–§5:** đồng ý. Cho phép dựng mô phỏng trên Claude Design.
2. **Kế toán:** chuyển "Hoa hồng đối tác" và "Người bán dịch vụ" vào Thiết lập: đồng ý.
3. **Hướng dẫn viên luôn thấy mục Đơn hàng**, gồm **đơn tự do** (chưa có hướng dẫn viên nào phụ trách) và **đơn của chính mình**. Đây là đúng ADR-0017 (đã duyệt: "Mục Đơn hàng xuất hiện trong thanh điều hướng của FIELD"); mã đang lệch vì `coMucDonHang` (`src/shared/start-page.ts`) chỉ xét "xem mọi đơn hoặc lập được đơn". Theo luật dự án, mã lệch tài liệu đã duyệt là lỗi → **sửa mã**, không cần ADR mới. Hệ quả: menu hướng dẫn viên từ 3 thành **4 mục** (Đơn hàng + chân menu), và bài smoke đang ghim "đúng 3 mục" phải sửa theo. Điều cần kiểm khi làm mã: trang `/orders` của hướng dẫn viên có hiện cả đơn tự do lẫn đơn của mình (hiện route `GET /api/orders/pool` và `GET /api/dispatch/mine` đã có; chưa kiểm trang `/orders` gộp cả hai).

## 8. Điểm chạm khi làm mã (giai đoạn sau, sau khi chủ duyệt mô phỏng)

- Việc chính là đổi bảng `THANH_BEN`/`CHA_THANH_BEN` ở `src/shared/muc-giao-dien.ts` (thêm nhóm TIỀN, THIẾT LẬP đóng-mở, mục gộp), `web/shell.ts` (nhóm thu gọn), `web/home.ts` + `src/shared/` (khối "Việc của bạn" theo vai).
- Sẽ đỏ và phải chụp lại / sửa: `src/muc-giao-dien-hien-trang.test.ts` (+ `.json`), `src/muc-hien-mo-duoc-{1,2,3}.test.ts`, `src/shared/trang-chu-o.test.ts`, `trang-chu-smoke.mjs` (`ADMIN_NAV` 25 mục), `dieu-chinh-smoke.mjs`, khoảng 18 kịch bản smoke có `sidebar-item`.
- Thẻ "Việc của bạn" cần `can()` cho ẩn/hiện (không dùng `hasPermission`), luật `web/CLAUDE.md`.
- Đây là việc lớn theo CLAUDE.md §3 chỉ ở phần quyền ẩn/hiện: sau thi công cần người kiểm độc lập.
