# ADR-0034 — Thông báo hệ thống: hộp thông báo là hình chiếu của sổ nhật ký; tin thủ công chỉ Toàn quyền gửi, có loại quan trọng

- **Trạng thái:** **accepted** — chủ dự án trả lời *"Duyệt"* trong chat 2026-09-27 cho câu "duyệt lượt 1 (đặc tả + ADR-0034)", sau hai vòng kiểm độc lập và một vòng trợ lý đọc hộ chủ. AI ghi lại, không tự quyết (tiền lệ ADR-0021, ADR-0027, ADR-0033). Soạn theo các câu chủ trả lời cùng ngày (đặc tả `docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md` §2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới. Chưa thi công; giao diện chờ bản mẫu được chủ duyệt (đặc tả E1). **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): điều 1 — tin về chuyến — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052.
- **Ngày:** 2026-09-27   **Loại:** cửa **một chiều** về dữ liệu (bảng tin thủ công, xác nhận "Đã hiểu" — dữ liệu tích luỹ, chỉ-thêm); **hai chiều** về quyền (một ô mới) và về hình chiếu (gỡ hộp thông báo không mất dữ liệu nghiệp vụ nào).
- **Liên quan:**
  - **Hiến chương** (`docs/ARCHITECTURE.md` Phần I, đã duyệt): 1.4 (hình chiếu không tạo sự thật), 4.1 (sự thật = trạng thái + nhật ký cùng lô), K16 (thông báo là hình chiếu), 5.10 (thông báo không kích hoạt tiền), 5.12 (nhật ký không chứa SĐT/email/MST), 5.13 (thứ tự xây — chủ chọn làm ngay, đặc tả §2 N2). ADR này **theo** các điều đó, không lệch.
  - **ADR-0022** (Bảng tin, accepted): **không sửa**. Dùng lại `nhanSuKien`, `nhanKetNoi`; điều kiện bên trong `thongBaoNoi` được **tách** thành hàm dùng chung (không đổi hành vi thông báo nổi).
  - **ADR-0002 / ADR-0008** (đồ thị module): **bổ sung** module `thongbao` và các cạnh đi ra của nó.
  - **ADR-0014 điều 12**: giữ — Đối tác/Thực tập không nhận tin về đơn; chỉ nhận tin thủ công khi nhóm của họ được chọn.
  - **ADR-0036** (proposed, cùng ngày): thông báo màn hình khoá — lượt duyệt riêng.
  - Số 0030–0032 dành cho Đơn tự do, 0033 đã dùng → 0034.

## Bối cảnh

Thông báo nổi (ADR-0022) chỉ tới màn hình đang mở, không lưu. Không có kênh để chủ gửi tin cho mọi người. Chủ chọn chuông + hộp thông báo xem lại được, tin tự động về đơn đổi trạng thái **kèm tên người làm**, tin thủ công do Toàn quyền gửi toàn công ty (chỉ nội bộ) hoặc theo nhóm quyền, có loại **quan trọng** bắt bấm "Đã hiểu".

Khi hỏi nguồn của tin về đơn, AI trình hai phương án: (a) **đọc lại từ sổ nhật ký** — một nguồn sự thật, không ghi thêm, không thể lệch, có sẵn tên người làm; mất một chút: người vừa bị chuyển khỏi đơn không còn thấy tin về đơn đó; (b) sổ thông báo riêng ghi cùng lô — lọc nhanh hơn nhưng cùng một việc ghi hai nơi, phải sửa lô ghi của đơn. Chủ chọn (a).

## Quyết định

1. **Tin về đơn là hình chiếu của `audit_log`**, không có bảng riêng. Nguồn: các hành động `created`, `order_claimed` (mới — điều 2), `order_handler_changed`, `confirmed`, `cancelled`, `order_cancelled_by_field`, đọc qua **view công bố** của module `audit` trong 30 ngày gần nhất. Không sửa lô ghi nào của `orders`.
2. **Hành động nhật ký mới `order_claimed`**: `dispatch` ghi khi người làm tự đặt mình vào đơn chưa có người phụ trách (luật `thayDoiCuaHandler` sẵn có); còn lại vẫn `order_handler_changed`. Không migration.
3. **Ai thấy tin về đơn** — tính lúc đọc, theo **trạng thái hiện tại** của đơn (người lập, người phụ trách hiện tại) và **quyền hiện tại** của người xem: nhãn `nhanSuKien` ∩ `nhanKetNoi(người xem)`, cộng điều kiện "được thấy tin về đơn" tách từ `thongBaoNoi`, trừ tin do chính người xem làm. Tin kèm tên người làm (qua `v_stf_staff_label`) **chỉ khi** `can(người xem, "order.history.view", phạm vi của đơn)` đúng — cùng ranh giới route chi tiết đơn dùng để giấu lịch sử; sai thì máy chủ dựng câu không tên (chủ chọn 2026-09-27 sau phát hiện của người kiểm độc lập). Hướng dẫn viên hôm nay vì vậy không thấy tên kể cả đơn mình phụ trách — chủ chọn giữ đợt này.
4. **Hai ngăn**: "Của tôi" (tin thủ công của mình, đơn mình lập/phụ trách, đơn chờ nhận nếu nhận được) và "Tất cả" (thêm tin nhãn `tat-ca`). Số chưa đọc chỉ đếm "Của tôi"; số và danh sách qua **một** hàm lọc. Mở hộp = đặt mốc đã đọc.
5. **Module mới `thongbao`**, tiền tố `ntf_`, hạng nghiêm. Cạnh: `thongbao → audit, orders, dispatch, staff` (chỉ đọc view công bố + `auditStatement`). Không module nào import `thongbao` → không vòng. View công bố mới: sự kiện đơn (`audit`), người lập của đơn `v_ord_order_owner` (`orders`), và nếu cần mốc phụ trách đầu tiên (`dispatch`) — không sửa view đang có.
6. **Tin thủ công là thực thể**: bảng `ntf_notice` (tiêu đề, nội dung, quan trọng, thu hồi bằng `valid_to`), `ntf_notice_target` (`noi-bo` (= "Toàn công ty": tài khoản có ít nhất một quyền khác `PARTNER`; không tới tài khoản chỉ-Đối-tác — chủ chọn 2026-09-27) | `quyen:<MÃ>`, so với quyền **hiện có** lúc đọc), `ntf_ack` (chỉ-thêm: ai "Đã hiểu" tin quan trọng nào, lúc nào), `ntf_read_mark` (mốc đã đọc của mỗi tài khoản, chỉ chính tài khoản đặt). Migration `0025_thong_bao.sql`.
7. **Ô quyền mới `notice.send`** = chỉ `SUPER_ADMIN`. Route gửi / thu hồi / xem đã gửi / xem ai đã hiểu: cổng `admin` + `can(staff,"notice.send")` trước mọi truy vấn. Route đọc hộp / tóm tắt / đã đọc / đã hiểu: cổng `staff`. Ghi cần `Origin` cùng site.
8. **Tin quan trọng**: dải nhắc ở đầu mọi trang tới khi người nhận bấm "Đã hiểu"; không chặn thao tác; giữ quá 30 ngày nếu chưa "Đã hiểu".
9. **Nhật ký**: `notice_sent`, `notice_revoked`, `notice_acknowledged` — chỉ mã tin, **không** chép nội dung. Các dòng này hiện trong nhật ký chung `GET /api/audit` cho mọi ai có `admin.manage` (Quản trị + Toàn quyền) — chủ chấp nhận 2026-09-27; màn "ai đã/chưa hiểu" vẫn chỉ `notice.send`.
10. Bảng tin không thêm loại sự kiện; trình duyệt dùng tin Bảng tin sẵn có làm tín hiệu tải lại số chưa đọc.

## Sửa gì của quyết định cũ

- ADR-0002/0008: thêm một module và các cạnh đi ra (bổ sung). `src/architecture.test.ts` `ALLOWED_EDGES` cập nhật cùng commit mã.
- `MATRIX` (`src/shared/permissions.ts`): thêm dòng `notice.send`; không đổi ô nào đang có.
- `src/shared/audit-actions.ts`: thêm `order_claimed` (nhóm `order`), `notice_sent`, `notice_revoked`, `notice_acknowledged` (nhóm mới `notice`).
- Không sửa ADR-0022, ADR-0014, ADR-0018.

## Phương án bị loại

- **Sổ thông báo riêng ghi cùng lô** (bản nháp đầu của đặc tả): hai nơi ghi cùng một việc (trái P6/N7), buộc sửa lô ghi của `orders` trong khi `orders` không biết mã đơn trước lô và không biết người phụ trách.
- **Ghi tin từ điểm phát Bảng tin (bắn-và-quên)**: có thể mất tin; trái Q3.
- **Lưu một bản cho từng người nhận**: nhân bản dữ liệu; người bị rút quyền giữ tin cũ.
- **Cho Quản trị gửi tin thủ công**: chủ chọn chỉ Toàn quyền.

## Hệ quả

- Tin về đơn không bao giờ lệch với việc thật; gỡ hộp thông báo không mất dữ liệu.
- Người vừa bị chuyển khỏi đơn không còn thấy tin về đơn đó; người mới phụ trách thấy tin cũ (chủ đã nghe khi chọn).
- Dòng nhật ký cũ trước ngày phát hành không có `order_claimed` → tự nhận cũ hiện là "giao" (chỉ trong 30 ngày quanh lúc phát hành).
- Mỗi lần mở hộp lọc vài nghìn dòng nhật ký bằng JS — cần đo khi thi công; quá ngưỡng thì lọc sơ bằng SQL.
- Khi ADR-0017 cho Hướng dẫn viên `order.view = any`, họ thấy mọi tin về đơn ở ngăn "Tất cả" (ngăn "Của tôi" không đổi).
- Thêm loại tin về đơn về sau = thêm hành động vào view sự kiện + bảng câu (`CHANGE-GUIDE.md`).

## Trang ghép

Đặc tả §12: bảng/view chứa gì, ô quyền nào áp cho loại tin nào, cổng nào canh cửa nào.
