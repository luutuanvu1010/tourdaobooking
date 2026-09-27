# ADR-0034 — Thông báo hệ thống: hộp thông báo lưu lại, tin về đơn ghi cùng lô, tin thủ công chỉ Toàn quyền gửi

- **Trạng thái:** **proposed** — AI soạn 2026-09-27 theo các câu chủ trả lời trong chat cùng ngày (H1–H4, Q1–Q3, ghi ở đặc tả `docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md` §2). Chờ chủ duyệt; chưa thi công.
- **Ngày:** 2026-09-27   **Loại:** cửa **một chiều** về dữ liệu (bảng mới, dữ liệu tích luỹ — gỡ tính năng thì bảng ở lại); **hai chiều** về quyền (một ô mới, gỡ bằng một commit).
- **Liên quan:**
  - **ADR-0022** (Bảng tin, accepted): **không sửa**. Sự kiện Bảng tin giữ đúng 5 khoá; thông báo nổi giữ nguyên. ADR này **dùng lại** hai hàm `nhanSuKien`, `nhanKetNoi` và điều kiện của `thongBaoNoi` (tách thành hàm dùng chung, không đổi hành vi) để quyết "ai thấy tin về đơn", không đặt luật quyền mới.
  - **ADR-0002 / ADR-0008** (đồ thị module): **bổ sung** module `thongbao` và các cạnh của nó (cơ chế ở đặc tả §6.1, **chưa chốt**).
  - **ADR-0014 điều 12** (Đối tác chỉ có chấm đếm, không thông báo nổi): giữ — Đối tác/Thực tập không nhận tin về đơn trong hộp; chỉ nhận tin thủ công khi Toàn quyền chọn nhóm của họ.
  - **ADR-0018** (lộ trình vai): Web Push ở "giai đoạn 6" được chủ đưa lên sớm (H4) — thuộc **lượt 2**, ADR riêng (dự kiến ADR-0035); ADR này không quyết gì về Web Push.
  - Ghi chú ADR-0025 (proposed) dòng 79 "không dùng sự kiện Bảng tin để kích hoạt ghi": ADR này tuân theo — tin về đơn ghi trong lô của thao tác, không từ Bảng tin.
  - Số 0030–0032 dành cho Đơn tự do, 0033 đã dùng → lấy 0034.

## Bối cảnh

Thông báo nổi (ADR-0022) chỉ tới màn hình đang mở và không lưu: tắt app là lỡ, không xem lại được. Không có kênh để chủ gửi một tin cho mọi người. Chủ chọn: chuông + hộp thông báo xem lại được (H1), tin thủ công gửi toàn công ty hoặc theo nhóm quyền (H2), tin về đơn theo đúng luật "ai thấy" hiện nay (H3), chỉ Toàn quyền gửi tin thủ công (Q1), tin về đơn là tin đổi trạng thái và **kèm tên người thao tác** (Q2, chủ trả lời 2026-09-27), ghi tin về đơn chắc chắn — cùng lô với thao tác (Q3).

Phương án đã trình (lời thường): (A) lưu mỗi tin một lần kèm nhãn người nhận, lúc đọc tính lại theo quyền hiện tại — **khuyến nghị**; (B) lưu một bản cho từng người nhận; (C) dựng từ nhật ký hệ thống. Chủ đi tiếp với A (trả lời các câu hỏi theo A, không phản đối).

## Quyết định

1. **Module mới `thongbao`**, tiền tố bảng `ntf_`, hạng nghiêm (SQL đăng ký qua `defineSql`). Chỉ `thongbao` ghi bảng `ntf_*`. Không vòng phụ thuộc. **Cơ chế nối với `orders`/`dispatch` chưa chốt** (đặc tả §6.1 — người lập kế hoạch xác minh): khuyến nghị gốc lắp ráp tiêm câu lệnh ghi tin qua `ctx` (mẫu `defaultHandlerStatement`), `orders`/`dispatch` không import `thongbao`; `thongbao` đọc view công bố của `orders` (cần thêm người lập vào view — đổi view) và `dispatch`. Phải sửa thành quyết định cụ thể trước khi ADR chuyển accepted.
2. **Bảng** (migration `0025_thong_bao.sql`): `ntf_item` (một dòng mỗi tin; `kind` = `don` | `thu_cong`; tin về đơn chỉ có mã đơn, mã loại thay đổi, mã người thao tác — tên hiển thị lúc đọc qua `v_stf_staff_label`; không tiền, không SĐT), `ntf_item_tag` (nhãn người nhận), `ntf_read_mark` (mốc đã đọc mỗi tài khoản). Không xoá cứng: tin thủ công thu hồi bằng `valid_to`.
3. **Tin về đơn ghi cùng lô** với thao tác đơn: câu lệnh chưa chạy (điều 1) được gộp vào `db.batch()` của thao tác, sau câu ghi đơn/người phụ trách, kèm điều kiện `onlyIf` khi thao tác có chặn tranh chấp; dòng tin chụp mã đơn, người lập, người phụ trách trước/sau. Sáu loại vào hộp: `tao`, `tao_cho_nhan`, `nhan`, `giao`, `xac_nhan`, `huy`. Thao tác đơn mới về sau muốn có tin trong hộp phải gọi hàm này (ghi ở `CHANGE-GUIDE.md`).
4. **Ai thấy tin về đơn:** nhãn = `nhanSuKien` áp lên ảnh chụp lúc sự kiện; lúc đọc, tài khoản thấy tin khi có nhãn chung với `nhanKetNoi(tài khoản)` **tính theo quyền hiện tại** và qua điều kiện "được thấy tin về đơn" tách từ `thongBaoNoi` (văn phòng hoặc Hướng dẫn viên; `tao_cho_nhan` cần `dispatch.claim`). Hệ quả có chủ ý: bị rút quyền thì tin cũ ẩn; khi ADR-0017 cho Hướng dẫn viên `order.view` = `any`, họ thấy mọi tin về đơn.
5. **Tin thủ công:** ô mới `notice.send` = chỉ `SUPER_ADMIN` (`row("none","none","none","none","none","any","none")`). Người nhận: `moi-nguoi` hoặc một/nhiều `quyen:<MÃ>`; lúc đọc so với mã quyền **hiện có** của tài khoản. Không sửa sau khi gửi; thu hồi được. Nhật ký `notice_sent`/`notice_revoked` không chép nội dung.
6. **Đã đọc** = một mốc thời gian mỗi tài khoản; mở hộp đặt mốc = giờ máy chủ; tài khoản chỉ ghi mốc của chính mình (id lấy từ phiên).
7. **Route:** đọc hộp/chưa đọc/đã đọc ở cổng `staff`; gửi/xem đã gửi/thu hồi ở cổng `admin` + `can(staff,"notice.send")` trong thân trước mọi truy vấn. Mọi route ghi cần `Origin` cùng site.
8. Bảng tin (ADR-0022) không thêm loại sự kiện; trình duyệt dùng tin Bảng tin sẵn có làm tín hiệu tải lại số chưa đọc.

## Sửa gì của quyết định cũ

- ADR-0002/0008: thêm một module và các cạnh của nó (bổ sung, không thay nội dung cũ). `src/architecture.test.ts` `ALLOWED_EDGES` cập nhật cùng commit mã.
- `MATRIX` (`src/shared/permissions.ts`): thêm một dòng `notice.send`; không đổi ô nào đang có.
- Không sửa ADR-0022, ADR-0014, ADR-0018.

## Phương án bị loại

- **Lưu một bản cho từng người nhận:** mỗi đơn mới ghi ~30 dòng; người bị rút quyền vẫn giữ tin cũ (lộ mã đơn họ không còn được thấy).
- **Dựng từ `audit_log`:** nhật ký không lưu người phụ trách trước/sau nên không tính được nhãn; buộc module thông báo đọc bảng của `audit` và giải nghĩa mã hành động — trộn trách nhiệm.
- **Ghi tin từ điểm phát Bảng tin (bắn-và-quên):** ít sửa mã hơn nhưng có thể mất tin; chủ chọn chắc chắn (Q3).
- **Cho Quản trị gửi tin thủ công:** chủ chọn chỉ Toàn quyền (Q1).

## Hệ quả

- Lô ghi của hai module đơn (`orders`, `dispatch`) chứa thêm câu ghi tin; lỗi ghi tin làm hỏng cả thao tác đơn (cùng lô) — đổi lấy tính chắc chắn. Câu lệnh ghi tin phải đơn giản (INSERT thuần) để không thành điểm hỏng mới.
- Bảng `ntf_item` lớn dần (ước ~100 dòng/ngày, chưa đo); không xoá cứng. Truy vấn hộp giới hạn 30 ngày / 100 tin, có chỉ mục.
- Tài khoản có nhiều quyền thấy hợp các tin của mọi quyền.
- Tên người thao tác chỉ hiện cho người vốn được thấy tin (điều 4); không ghi vào sự kiện Bảng tin (ADR-0022 giữ 5 khoá).

## Trang ghép

Xem đặc tả §12 (`docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md`): bảng chứa gì, ô quyền nào áp cho loại tin nào, cổng nào canh cửa nào.
