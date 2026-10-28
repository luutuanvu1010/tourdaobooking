# ADR-0118 — Bật/tắt đưa đón theo nhóm dịch vụ và điểm chọn nhanh (văn bản đề xuất)

- **Trạng thái:** **đề xuất, chờ chủ đọc và duyệt văn bản.** Chủ đã duyệt HƯỚNG ngày 14/10 ("ok theo khuyến nghị": lượt 1 không đụng tiền, lượt 2 mới là lớp giá); chủ chưa đọc văn bản này. Khi duyệt, người soạn chuyển vào `docs/adr/` bằng công cụ sửa tệp (N9) và chỉ sửa dòng trạng thái.
- **Ngày:** 2026-10-14. **Số ADR:** 0118 (kiểm lại lúc chuyển: `docs/adr/` hiện dừng ở 0117, không nhánh nào giữ 0118).
- **Thuộc gói:** Đợt 2, **lượt 1**. Lớp giá đưa đón (phụ thu, xe riêng, giảm giá) là ADR riêng ở lượt 2, xem `2026-10-14-dot-2-gia-dua-don.md`.
- **Nguồn (lời chủ, không hỏi lại):** bảng việc `2026-10-13-bang-viec-truoc-su-dung.md` yêu cầu 6 ("bật/tắt đưa đón theo nhóm dịch vụ") và 9 ("nơi trả chọn nhanh Cảng Vinpearl / Bến tàu du lịch, admin thêm điểm"); trả lời 14/10 chọn thứ tự "không tiền trước, tiền sau".
- **ADR liên quan:** ADR-0002 (sở hữu bảng, chỉ đọc xuyên module qua view `v_<tiền tố>_*`), ADR-0003 (không xoá cứng, nhật ký), ADR-0047 (chặng đưa đón), ADR-0058 (nhóm dịch vụ).
- **Xây trên lỗ đang hở:** **không có.** Đọc `docs/quyen-hoan.json` ngày 2026-10-14: lượt này không ghi tiền, không đụng sổ, không đụng `billing`.

## Tóm tắt cho chủ (lời thường)

1. Mỗi **nhóm dịch vụ** có thêm một công tắc **"Có đưa đón"**, mặc định bật. Quản trị bật/tắt ở màn Danh mục, mỗi lần đổi có nhật ký.
2. Nhóm đã tắt thì form **không hiện** khối đưa đón cho dịch vụ thuộc nhóm đó, và **máy chủ cũng từ chối** nếu có ai cố ghi chặng cho dịch vụ đó. Đơn cũ đã có chặng vẫn mở và xem được; muốn sửa chặng thì chỉ **đóng** được, không thêm hay sửa.
3. Mỗi **địa điểm** có thêm "Chọn nhanh" (có số thứ tự). Địa điểm nào được đánh dấu sẽ hiện thành nút bấm dưới ô Nơi trả (chiều đi) và Nơi đón (chiều về). Lúc đầu gieo cho **Bến cảng Vinpearl** và **Bến tàu du lịch Nha Trang**; Quản trị thêm hoặc bỏ sau, không cần sửa mã.
4. Không có tiền, không có ô quyền mới: dùng ô Quản trị đã có (`admin.manage`).

## Bối cảnh (đã kiểm trong mã, `main` ngày 14/10)

- Nhóm: `ctl_group` (migration 0055) không có cột nào về đưa đón; Quản trị sửa nhóm qua `PATCH /api/catalog/groups/:code` (cổng `admin` + `admin.manage`, khoá lạc quan theo `expectedUpdatedAt`, nhật ký `catalog_group_updated`).
- Nhóm hiện hành của dịch vụ đã có view `v_ctl_service_group` (migration 0090); view này **chưa** mang cờ đưa đón và `pricing` đang đọc nó, nên không sửa nó.
- Chặng: máy chủ nhận chặng ở bốn cửa — lập/sửa đơn (`orders/rules.ts`), thêm chặng, sửa chặng, thay chặng (`orders/service.ts`) — cùng hàm `kiemChang`; điểm danh mục được kiểm "đang dùng" ở `resolveLegPlaces` (R7).
- Địa điểm: `loc_location` (migration 0010) đã gieo sẵn `CANG_VINPEARL` ("Bến cảng Vinpearl") và `BEN_TAU_NHA_TRANG` ("Bến tàu du lịch Nha Trang"); `GET /api/locations` mở cho mọi tài khoản đăng nhập; ghi qua `POST/PUT /api/locations` (cổng `admin` + `admin.manage`).

## Quyết định

**Đ1 (dữ liệu, module `catalog`).** Thêm cột `ctl_group.transfer_enabled INTEGER NOT NULL DEFAULT 1 CHECK (transfer_enabled IN (0, 1))`. `PATCH /api/catalog/groups/:code` nhận thêm `transferEnabled` (boolean) cùng khoá lạc quan sẵn có; đổi cờ ghi `catalog_group_updated` với chữ "đưa đón: bật → tắt" (không dùng hành động nhật ký mới). Nhóm đang tắt dùng (`active = 0`) không đổi nghĩa. "Chưa phân loại" và dịch vụ nhập tay (không mã danh mục) **luôn cho đưa đón**.

**Đ2 (hợp đồng giữa module, ADR-0002).** `catalog` công bố view MỚI `v_ctl_service_transfer(catalog_code, transfer_enabled)`: với mỗi mã dịch vụ, `transfer_enabled` = cờ của nhóm hiện hành, hoặc `1` khi chưa phân loại. `orders` chỉ đọc view này (không đọc `ctl_group`). Không sửa `v_ctl_service_group`.

**Đ3 (luật máy chủ, module `orders`).** Dịch vụ có `transfer_enabled = 0`:
- (a) **từ chối** mọi lệnh GHI chặng cho dịch vụ đó: lập đơn, lưu nháp, sửa đơn, thêm chặng, sửa chặng, thay chặng — mã lỗi `transfer_disabled`, câu tiếng Việt nêu tên dịch vụ và tên nhóm, nói cách sửa;
- (b) **chặn xác nhận** đơn nháp còn chặng mở thuộc dịch vụ như vậy (cùng mã lỗi);
- (c) **cho phép đóng chặng** (lệnh giảm), cho phép xem; đơn đã xác nhận có chặng từ trước **không bị động đến** khi sửa số khách, ghi chú, huỷ.
Chốt chặn nằm ở MỘT hàm dùng chung gọi từ bốn cửa ghi chặng và cửa xác nhận, cạnh R7; giao diện chỉ ẩn/hiện, **không phải cổng**.

**Đ4 (dữ liệu, module `locations`).** Thêm cột `loc_location.quick_pick_order INTEGER CHECK (quick_pick_order IS NULL OR quick_pick_order BETWEEN 1 AND 99)`; `NULL` = không chọn nhanh. `PUT /api/locations/:id` nhận `quickPickOrder` (số hoặc `null`) trong khuôn kiểm sẵn của địa điểm; DTO danh sách địa điểm có thêm `quickPickOrder`. Migration gieo: `UPDATE loc_location SET quick_pick_order = 1 WHERE code = 'CANG_VINPEARL'` và `= 2 WHERE code = 'BEN_TAU_NHA_TRANG'` (chạm 0 dòng nếu mã không tồn tại; kiểm lại dữ liệu thật bằng một câu đếm chỉ-đọc trước phát hành).

**Đ5 (giao diện, chỉ ẩn/hiện).** Form Tạo đơn: khối đưa đón của dịch vụ thuộc nhóm tắt **không hiện**; chuyển dịch vụ sang nhóm tắt thì bỏ chặng đã nhập kèm một dòng báo; nhóm bật thì như cũ. Hàng nút chọn nhanh: dưới **Nơi trả** của chặng chiều đi và **Nơi đón** của chặng chiều về, xếp theo `quickPickOrder`; bấm nút = chọn điểm danh mục đó (không gõ chữ). Màn Danh mục: công tắc "Có đưa đón" mỗi nhóm; màn Địa điểm: cột "Chọn nhanh" sửa được.

**Đ6 (quyền).** Không ô quyền mới. Ghi cờ nhóm và cờ điểm: ô `admin.manage` (Quản trị, Toàn quyền). Đọc cờ: mọi tài khoản đã đăng nhập (đã có đường đọc). Nhật ký không ghi tên hay SĐT khách.

## Hệ quả và cái KHÔNG làm

- Hai migration cột/view chỉ **thêm** (một lần phát hành, hoàn tác bằng migration sau: bỏ view, bỏ dùng cột; D1 không có "down").
- Không đổi `ord_transfer_leg`, không đổi `buildLines`, không có tiền: **không** là phần của ADR này.
- Chưa có "chọn nhanh" cho ô **Khách có mặt tại** (ô chữ tự do trên dịch vụ, không phải điểm danh mục); để quyết riêng nếu chủ muốn.
- Nhóm bật/tắt **chưa** làm theo vai (đó là Đợt 3).

## Điều chưa kiểm

- Chưa chạy câu đếm dữ liệu thật: có dịch vụ nào đang thuộc nhóm mà chủ muốn tắt đưa đón và hiện đã có chặng mở; chưa biết hai mã địa điểm gieo còn tồn tại và còn đang dùng trên production.
- Chưa kiểm cửa xác nhận đơn nằm ở route nào cho đủ (kế hoạch Task 3 liệt kê và có bài cho từng cửa).
