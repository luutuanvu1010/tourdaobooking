# Phác đặc tả — HC-4.2 phần còn hở: duyệt hai người cho điều chỉnh chi phí xe thuê (đợt 2 của ADR-0115)

> Hồ sơ có ngày 9/11/2026, **bản phác, chưa duyệt, chưa thi công**. Phiên Đợt 4 soạn (kế hoạch `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần VII mục 4.2). Nguồn phát hiện: người kiểm độc lập 9/11 (tóm tắt ở `docs/superpowers/plans/2026-11-09-dot-4-thi-cong-nhat-ky.md` mục 4.2). Xây trên lỗ đang hở: **HC-4.2** — đặc tả này là để ĐÓNG lỗ đó, không nới luật nào.

## 1. Vì sao HC-4.2 chưa đóng

ADR-0115 (đã duyệt 13/10) chốt nguyên tắc: điều chỉnh số tiền phải có người thứ hai duyệt, làm hai đợt nối nhau (điều 3) — công nợ trước, chi phí chuyến xe sau. **Đợt 1 (công nợ) đã lên production ở bản 1.92** và có hàng rào hai lớp: máy chủ và trigger CSDL, bài kiểm tháo từng trigger, dòng sổ hàng rào ngày 13/10. **Đợt 2 chưa làm gì:** lệnh «Điều chỉnh chi phí xe thuê» (`POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh`, ô `transport.cost.adjust` — Kế toán, Quản trị, Toàn quyền) vẫn một người ghi ngay, trần 1 tỷ mỗi lệnh, không trần cộng dồn, có nhật ký nhưng không tin báo. Bảng yêu cầu `vc_trip_cost_request` chưa có ở migration nào.

Vì nguyên tắc đã được duyệt ở ADR-0115, đợt 2 **không cần ADR mới về nguyên tắc**; chỉ cần kế hoạch thi công và các ca vàng do Kế toán/chủ xác nhận.

## 2. Đợt 2 làm gì (theo khuôn đợt 1, không sáng tạo thêm)

1. Bảng mới `vc_trip_cost_request` (phân hệ `van-chuyen`, chỉ-thêm, trigger cấm sửa/xoá) giữ yêu cầu điều chỉnh và quyết định: chuyến, số tiền (khác 0, ≤ trần mỗi lệnh hiện có), lý do (danh mục sẵn có), người tạo, hạn 7 ngày, quyết định (duyệt / từ chối / rút / hết hạn), người quyết.
2. `POST …/chi-phi/dieu-chinh` đổi nghĩa thành **tạo yêu cầu** (không ghi dòng chi phí). Thêm route duyệt, từ chối, rút — dùng lại ô `ledger.adjust.approve` đã có (Kế toán, Quản trị, Toàn quyền), «khác người tạo» kiểm theo tài khoản.
3. Trigger: người quyết ≠ người tạo; dòng `ADJUSTMENT` của `vc_trip_cost_line` chỉ chèn được khi có yêu cầu đã duyệt, khớp số và chuyến (khuôn `bil_posting_adjustment_approved`, `bil_debt_line_adjustment_match` của migration `0094`).
4. Duyệt kiểm lại lúc duyệt: chuyến còn là xe thuê, tổng chi phí không âm, tháng còn mở.
5. Tin báo cho người tạo và người duyệt (khuôn ADR-0034 như đợt 1). Giao diện: danh sách «chờ duyệt» dùng chung màn điều chỉnh đợt 1 nếu được; tên nút tra bảng tham chiếu, chưa có thì đưa chủ chọn.
6. Migration: số kế tiếp **lúc làm** (hôm nay `main` tới `0150`; liệt kê mọi nhánh chưa gộp trước khi đặt). Cập nhật `docs/data-dictionary.json`.
7. Việc lớn (tiền, quyền, dữ liệu): người kiểm độc lập; quan sát mỗi trigger chặn thật một lần rồi ghi dòng vào `docs/SO-HANG-RAO.md`.

**Tiêu chí nghiệm thu (đặt trước):** (a) cùng tài khoản tạo rồi duyệt ⇒ 409 ở máy chủ và bị trigger chặn khi chèn thẳng; (b) chèn dòng `ADJUSTMENT` không có yêu cầu đã duyệt ⇒ trigger chặn; (c) yêu cầu quá 7 ngày không duyệt được; (d) đảo dòng, chụp lại, giá thoả thuận không đổi hành vi (ngoài phạm vi theo ADR-0115 điều 3); (e) ca vàng mới xanh sau khi Kế toán/chủ xác nhận.

**Ước lượng:** một đợt thi công cỡ đợt 1 (bảng, ba route, ba trigger, giao diện danh sách, ca vàng, e2e), cộng một vòng kiểm độc lập. Khó kịp 30/11 nếu còn chờ xác nhận ca vàng; hợp lý là tháng 12.

## 3. Ba chỗ ngoài ADR-0115 — cần chủ quyết riêng, không thuộc đợt 2

ADR-0115 điều 3 chủ ý để các lệnh sinh dòng bằng luật cố định (huỷ khoản thu, huỷ dòng sổ, sửa khoản thu đã ghi, đảo/chụp lại chi phí chuyến, giá thoả thuận) cho một người làm, ghi là «dựa vào kỷ luật». Người kiểm 9/11 nêu ba chỗ sát ranh giới, đáng một ADR riêng nếu chủ muốn siết:

1. **«Huỷ dòng sổ» trên dòng của một điều chỉnh đã được người thứ hai duyệt** (loại không thương mại), hoặc trên dòng «đã nộp về công ty»: một Kế toán gỡ được điều chỉnh đã duyệt mà không ai duyệt việc gỡ. Đây là chỗ sát «bút toán điều chỉnh» nhất.
2. **Cổng chặn huỷ dòng hoa hồng / giảm giá bên đặt / giá vốn** (`commercial_line_needs_approval`) chỉ có ở máy chủ, không có trigger.
3. **«Giá thoả thuận» của chuyến xe thuê** là số nhập tay tới 1 tỷ, một người, chỉ trước khi xe chạy.

Bài dò 8/11 nêu «Huỷ khoản thu» một người làm: đúng, nhưng đó là quyết định có chủ ý của ADR-0115 điều 3, không phải phần chưa làm. Siết nó cũng cần ADR mới.
