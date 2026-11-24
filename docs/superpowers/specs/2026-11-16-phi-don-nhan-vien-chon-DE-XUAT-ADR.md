# Đề xuất ADR-0214 (số tạm) — Phí đưa đón do nhân viên văn phòng chọn trên đơn

- **Trạng thái:** đề xuất, chờ chủ duyệt. AI soạn, không tự duyệt (Hiến pháp N3). Số 0214 kiểm còn trống ngày 16/11 (lớn nhất đang có ở mọi nhánh: 0213); kiểm lại khi chép vào `docs/adr/`.
- **Ngày:** 2026-11-16. **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** hai chiều mềm — bảng phí theo khu vực không bị xoá, quay lại được bằng một ADR khác.
- **Nguồn:** đặc tả ngắn `2026-11-16-phi-don-nhan-vien-chon.md`, chủ duyệt 16/11 («Duyệt theo khuyến nghị»).
- **Quan hệ với ADR cũ:** **thay** ADR-0147 Đ1 (vùng không còn dùng để tính tiền), Đ2 (bảng phí ngưng dùng cho đơn) và câu «máy tính, nhân viên không sửa số» của Đ3; **thay** ADR-0203 ĐB1, ĐB2 (chọn mức theo cấp, dịch vụ; chụp mã cấp). **Giữ** ADR-0147 Đ3 phần còn lại, ADR-0203 ĐB3, ADR-0047 (chặng không mang tiền).

## Tóm tắt cho chủ (lời thường)
1. Mỗi lượt đón có ô «Phí đưa đón»: Miễn phí, 5.000, 10.000, 15.000, 20.000, 30.000, 50.000, 100.000 đ hoặc Số khác (tối đa 5.000.000 đ).
2. Đi chung tính theo mỗi khách (không đếm em bé), xe riêng tính cả chuyến.
3. Chỉ nhân viên văn phòng chọn. Đối tác không chọn; văn phòng chọn lúc xác nhận đơn của Đối tác.
4. Chưa chọn thì không xác nhận được. Máy không bao giờ tự lấy 0 đồng.
5. Sau xác nhận phí không đổi, trừ khi sửa số khách (tính lại theo mức mỗi khách đã chọn).
6. Phí vào số đại lý nợ, in trên biên nhận phần Tour Đảo, không tính hoa hồng, giảm giá không trừ vào phí — như Đợt C.

## Quyết định
**Đ1 — Danh sách và cách tính.** Danh sách cố định ở một hằng số trong `src/shared/` (dùng chung máy chủ và giao diện): `0, 5000, 10000, 15000, 20000, 30000, 50000, 100000` và «Số khác» (số nguyên 1–5.000.000). Máy chủ kiểm lại; số trình duyệt gửi chỉ được nhận nếu thuộc danh sách hoặc là «Số khác» hợp lệ. Tiền = đơn giá × số khách tính tiền (đi chung; chiều về có số người riêng thì lấy số nhỏ hơn) hoặc × 1 (xe riêng). Dòng tiền vẫn sinh ở máy chủ, một chỗ.

**Đ2 — Ai chọn, lưu ở đâu.** Mức chọn chỉ nằm trong dòng phí `order_item` (loại `TRANSFER_FEE` của Đợt C), không thêm cột tiền vào chặng (giữ ADR-0047). Đơn nháp: dòng phí xoá–chèn lại mỗi lần lưu như mọi dòng tiền của nháp. Người được chọn: người ghi được đơn nháp trong văn phòng (ô `order.modify`) và người xác nhận ở cửa Còn vé. Tài khoản Đối tác gửi mức phí thì máy chủ từ chối (400), không lặng lẽ bỏ qua. Nhật ký đơn ghi lượt đón nào, mức nào, ai chọn (không ghi tên khách).

**Đ3 — Cổng xác nhận và nhánh của Đối tác.** Lượt đón còn mở chưa có dòng phí ⇒ `/status`, Gửi xác nhận, Còn vé trả 409 `transfer_fee_missing` («Chọn phí đưa đón cho lượt đón …»). Gửi đơn của Đối tác có lượt đón chưa chọn phí ⇒ đi nhánh A («chờ xác nhận», cờ `transfer_fee_missing` của Đợt C). «Ngày bắt đầu áp» giữ làm công tắc: trước ngày đó ô chọn không hiện, không cổng nào chặn.

## Điều chủ cần biết
- **Mọi đơn Đối tác có lượt đón sẽ vào «chờ xác nhận»** sau ngày bật, vì Đối tác không chọn được phí. Văn phòng sẽ có thêm việc xác nhận các đơn này.
- Bảng phí theo khu vực, màn «Phí đưa đón» của Quản trị và «Thử tra» để nguyên nhưng không còn tác dụng với đơn. Gỡ màn đó là việc sau.
- Mất cái được của cách cũ: hai nhân viên có thể chọn hai mức khác nhau cho cùng một chỗ đón; Kế toán đối chiếu bằng nhật ký và báo cáo, không bằng bảng giá.
- Sổ vàng `golden/phi-dua-don.json` phải viết lại theo luật mới và được chủ xác nhận trước khi viết mã (Hiến chương 5.17).
- Một lượt duyệt này gồm ba quyết định chạm tiền/dữ liệu (đúng trần 3). Bảng `order_item` không nhận loại dòng mới (vẫn loại phí của Đợt C), nên không cần trang ghép mới; trang ghép 2026-10-28 §2 đổi một dòng: người ghi phí là nhân viên văn phòng thay cho máy.
