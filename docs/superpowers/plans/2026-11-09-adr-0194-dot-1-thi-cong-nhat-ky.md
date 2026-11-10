# Nhật ký thi công ADR-0194 đợt 1 (hiện / ẩn / bắt buộc theo màn × trường × quyền)

Căn cứ: `docs/adr/ADR-0194-bang-dieu-khien-giao-dien-toan-quyen.md` (accepted 9/11); kế hoạch `docs/superpowers/plans/2026-11-09-adr-0194-dot-1-ke-hoach.md`. Người thi công ghi; người kiểm độc lập (N8) kiểm sau.

## Việc đã làm (nhánh `claude/vigilant-euler-751c3a`, mỗi nhiệm vụ test đỏ trước, xanh sau)
1. Danh mục + luật thuần: `src/shared/ui-truong.ts` (`DANH_MUC_UI`, `giaiChinhSach`, `laCheDoHopLe`, `traCuuChinhSach`, tên màn / trường / chế độ); bài `src/shared/ui-truong.test.ts`.
2. Migration `0154_chinh_sach_giao_dien.sql` (bảng `gd_field_policy`, chỉ-thêm, RỖNG khi phát hành); bài `src/migrations-chinh-sach-giao-dien.test.ts`; `docs/data-dictionary.json` + `npm run dict`.
3. Module `giao-dien` + route: `GET /api/cai-dat/giao-dien` (staff), `GET …/tat-ca`, `POST …`, `POST …/khoi-phuc` (admin, `settings.ops`); nhật ký `ui_policy_changed`; bài `src/modules/giao-dien/chinh-sach-route.test.ts`; cập nhật ảnh chụp route (`route-access.test.ts`: 480).
4. Máy chủ áp ở Tạo đơn: `src/modules/orders/an-truong-giao-dien.ts`, nối `POST /api/orders`, `PUT /api/orders/:id`; chính sách tới `orders` qua `ctx.chinhSachGiaoDien` (tiêm ở `src/index.ts`); bài `an-truong-giao-dien.test.ts`, `chinh-sach-giao-dien-route.test.ts`.
5. Giao diện: `web/chinh-sach-giao-dien.ts` (đọc chung), `web/order-form.ts`, `web/catalog.ts`, `web/staff.ts`, `web/parties.ts`, khối chỉnh `web/bang-dieu-khien-truong.ts` đặt trong trang Giao diện.
6. Tài liệu: `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (công thức z38), `docs/SO-HANG-RAO.md` (ba dòng), nhật ký này.

## Giả định và quyết định của người thi công (đảo ngược được trước khi phát hành; chủ xem lại)
- **Tên bảng `gd_field_policy` thay vì `ui_field_policy`** (kế hoạch / ADR ghi `ui_`): `src/architecture.test.ts` chưa khai tiền tố `ui_`, nới là việc của chủ; module `giao-dien` đã có tiền tố `gd_` và là nơi tự nhiên. Chưa phát hành nên đổi tên còn rẻ.
- **Khối chỉnh nằm TRONG trang Giao diện** (`/giao-dien`, đã ở khu Thiết lập, ô `settings.ops`), KHÔNG tạo trang mới: trang mới kéo theo thêm mục vào `muc-giao-dien.ts` (`TRANG`, `THANH_BEN`, `TRANG_TOI`), `PAGES`, bài hiện trang, và làm gói trang Đơn hàng vượt trần dung lượng (`src/goi-trang-nhe.test.ts` — nới trần là việc của chủ). Chủ muốn trang riêng thì làm ở lượt sau.
- **Đọc chính sách của chính mình dùng cổng `orders`** (văn phòng hoặc Đối tác) kèm kiểm một trong bốn ô `order.create`, `admin.manage`, `account.view`, `party.view` (mở bốn màn); người khác 403 và giao diện của họ rơi về mặc định đầy đủ. KHÔNG thêm mục nào vào hàng rào `TU_PHUC_VU_STAFF` (đã thử, người kiểm tư vấn bỏ). Hệ quả: tài khoản chỉ giữ Nhân sự (nếu không qua cổng `orders`) chưa nhận được chính sách ở màn Danh sách tài khoản — vẫn thấy đầy đủ (an toàn); ghi nợ.
- **Chế độ và ý nghĩa:** `HIEN` = mặc định; `AN` chỉ khi mục `anDuoc`; `BAT_BUOC` chỉ cho ô nhập tuỳ chọn mà chủ coi là phụ (mục `anDuoc` và `nhap`); `TUY_CHON` (bỏ bắt buộc) chỉ cho mục `boBatBuocDuoc` — đợt 1 KHÔNG có mục nào (customerName / customerPhone do máy chủ bắt buộc), nên chưa dùng. Cộng gộp nhiều quyền: ẩn chỉ khi MỌI quyền ẩn; trường mặc định tuỳ chọn chỉ bắt buộc khi MỌI quyền đòi; trường mặc định bắt buộc chỉ được bỏ khi MỌI quyền bỏ (khớp ADR Đợt 1).
- **Ba màn còn lại chỉ có cột phụ kiểu «xem»** (ẩn ở giao diện, dữ liệu vẫn theo quyền xem; máy chủ không phải bỏ gì): Danh sách dịch vụ: Nhóm, Đơn vị; Danh sách tài khoản: Tạo lúc, Đăng nhập gần nhất; Quản lý đối tác: Công việc hôm nay. Mọi ô nhập, tiền, mã, tên, trạng thái, SĐT: «không được ẩn» theo nguyên tắc nghi ngờ thì để không.
- **Giao diện luôn gửi giá trị của ô email / ghi chú dù đang ẩn** (ô đã nạp giá trị đang lưu): máy chủ quyết; nhờ vậy chủ bỏ ẩn giữa chừng thì lưu nháp không xoá mất giá trị.
- **Ẩn trường lúc SỬA nháp:** email / ghi chú khách / ghi chú thanh toán giữ giá trị ĐANG LƯU (máy chủ đọc thêm `orders` một câu, chỉ khi có trường ẩn thuộc diện này); `passengers` bỏ khoá ⇒ danh sách giữ nguyên. Lúc LẬP: các trường chữ ẩn thành rỗng, hành khách không có.
- **Bắt buộc `passengers`:** lúc sửa nháp mà không gửi khoá thì tính theo số khách đang lưu (một câu đếm ở `chang-hanh-khach-repo.ts`).
- **Công tắc ADR-0154 đang áp cho tài khoản ⇒ chính sách giao diện KHÔNG chen vào** (một nơi quyết mỗi trường lúc chuyển; việc chuyển công tắc vào bảng mới là phát hành sau).
- **Lỗi đọc chính sách:** máy chủ và giao diện đều rơi về mặc định đầy đủ (không ẩn, không bắt buộc thêm); máy chủ ghi một dòng log `chinh_sach_giao_dien_doc_loi`.
- **Xem trước:** khối chỉnh tính trước bằng chính luật thuần của máy chủ cho «người chỉ giữ nhóm quyền đang chọn». CHƯA nối với «Xem như vai trò khác» (ADR-0180; chế độ đó đổi phiên đăng nhập, không phải bản nháp chưa lưu) — ghi nợ.

## Tên tạm — chờ chủ chọn (bảng tham chiếu đã khai `cho-chon`, KHÔNG sửa tên đã chốt)
- Nút ghi: «Lưu cho màn này» (phương án: «Lưu màn này», «Lưu cài đặt màn»); «Khôi phục mặc định» (chữ do ADR nêu; phương án: «Về mặc định», «Đặt lại màn này»).
- Tên khối: «Hiển thị trường theo màn hình» (phương án: «Trường hiện trên từng màn», «Ẩn / hiện trường»). Tên chế độ: Hiện · Ẩn · Bắt buộc · «Không bắt buộc» (chưa dùng ở đợt 1).
- Nhãn hành động nhật ký: «Đổi cài đặt hiển thị trường» (tránh chữ «chính sách» vì bài `bang-tu-giao-dien` cấm trong tệp nhật ký).
- Câu báo thiếu (máy chủ, 400): «Cần nhập «Email khách».» / «Ghi chú khách» / «Ghi chú thanh toán» / «Danh sách khách»; câu ở form: «Nhập email khách.», «Nhập ghi chú khách.», «Nhập ghi chú thanh toán.», «Thêm ít nhất một khách vào danh sách khách.».

## Hàng rào quan sát chặn thật (2026-11-09, sửa cố ý → đỏ → hoàn nguyên)
- Bài (a) danh mục ↔ `contracts.ts`: thêm mục `truongKhongCoTrongHopDong` ⇒ đỏ «danh mục tao-don/truongKhongCoTrongHopDong: interface OrderInput không có trường này»; hoàn nguyên xanh.
- Bài (b) «bắt buộc ∈ danh mục»: bật `anDuoc` của `customerName` ⇒ đỏ «tao-don/customerName không được ẩn» (cùng với (c5)); bớt `customerPhone` khỏi danh mục ⇒ đỏ «danh mục thiếu tao-don/customerPhone»; hoàn nguyên xanh.
- Dòng tương ứng ở `docs/SO-HANG-RAO.md`.

## Nợ / việc chưa làm
- Chưa chạy kịch bản Chrome / thử iPhone cho form Tạo đơn, ba danh sách và khối chỉnh (cần Chrome + axe ngoài repo). Giao diện mới chỉ qua typecheck, bài tĩnh và logic thuần.
- Danh sách khai tay «máy chủ bắt buộc» trong bài (b): trường bắt buộc mới ở máy chủ mà quên thêm vào đó thì không bị bắt (dựa vào kỷ luật — ghi ở sổ hàng rào).
- Trường nhập của ba màn còn lại (ghi chú, email phụ, địa chỉ phụ) chưa khai: cần máy chủ bỏ khoá ở module `parties` / `accounts` / `catalog` — đợt sau nếu chủ muốn.
- Chuyển công tắc ADR-0154 / ADR-0193 vào bảng mới: phát hành sau (expand–contract), đợt 2–4 chưa mở.
- Trần dung lượng gói: không đổi (đã né nới).
- Bài hướng dẫn «Đổi giao diện công ty» chưa nói về khối mới (đã đọc lại bài và ghi dấu vân `huong-dan:xem-lai`, vì bài chỉ nói về màu): nên thêm mục sau khi chủ chọn tên nút.

## Câu hỏi gộp một lần cho chủ
1. Giữ khối chỉnh trong trang Giao diện (không trang mới) hay muốn trang riêng ở khu Thiết lập (kèm nới trần dung lượng gói Đơn hàng)?
2. Đổi tên bảng về `ui_field_policy` (cần khai tiền tố `ui_` ở bài kiến trúc) hay giữ `gd_field_policy`?
3. Chọn tên cho hai nút, tên khối và câu báo thiếu ở mục «Tên tạm».
4. Bảng `gd_field_policy` lệch tên so với ADR-0194 (`ui_field_policy`) — đã ghi ở `docs/SYSTEM-DESIGN.md` §16, chờ chủ.

## Chủ đã trả lời (2026-11-09)
- Câu 1: chủ chọn «Giữ trong trang Giao diện» (nguyên văn). Không làm trang riêng, không nới trần gói Đơn hàng.
- Câu 2, 3: chưa trả lời; đang giữ `gd_field_policy` và tên tạm theo khuyến nghị, chờ chủ.
